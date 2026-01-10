import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Info,
    Wallet,
    Clock,
    ShieldCheck,
    AlertOctagon,
    Activity,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { getLiquidityTier, getSettlementDays, calculateAvailabilityDate } from './services/dataService';
import { Fund, FundType, CashFlow, ClientPortfolio, AccountType, LiquidityTier, Holding, RedemptionRule } from './types';

// Redefine locally to avoid extraction refactor risks
const CHART_COLORS = {
    blue: '#2563eb',   // Broad Market
    purple: '#9333ea', // Sector
    yellow: '#eab308', // Cross Border
    green: '#16a34a',  // Bond
    red: '#dc2626',    // Strategy
    gray: '#9ca3af',    // Other
    cyan: '#06b6d4'    // Cash
};

const LongTermForecastPage: React.FC<{ portfolio: ClientPortfolio | null, funds: Fund[] }> = ({ portfolio, funds }) => {
    const navigate = useNavigate();
    const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
    const [selectedRowData, setSelectedRowData] = useState<any>(null);

    useEffect(() => {
        fetch('/api/cash-flows')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                setCashFlows(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading cash flows:", err);
                setLoading(false);
            });
    }, []);

    const currentAccountHoldings = useMemo(() => {
        if (!portfolio) return [];
        const accs = selectedAccountId === 'ALL' ? portfolio.accounts : portfolio.accounts.filter(a => a.id === selectedAccountId);
        return accs.flatMap(a => a.holdings.map((h, index) => {
            const name = h.isExternal ? h.externalName : funds.find(f => f.id === h.fundId)?.name;
            return { ...h, displayName: name, accountId: a.id, originalIndex: index, uniqueKey: `${a.id}_${index}` };
        }));
    }, [portfolio, selectedAccountId, funds]);

    const liquidityData = useMemo(() => {
        if (!portfolio) return { [LiquidityTier.CASH]: 0, 'Total': 0 };
        const data: any = { [LiquidityTier.CASH]: 0, 'Total': 0 };
        const today = new Date();
        const accountsToAnalyze = selectedAccountId === 'ALL' ? portfolio.accounts : portfolio.accounts.filter(a => a.id === selectedAccountId);

        accountsToAnalyze.forEach(account => {
            const cash = account.cashBalance || 0;
            data[LiquidityTier.CASH] += cash;
            data['Total'] += cash;

            account.holdings.forEach(h => {
                let val = 0;
                if (h.isExternal) {
                    val = (h.externalNav || 0) * h.shares;
                } else {
                    const f = funds.find(fund => fund.id === h.fundId);
                    if (f) {
                        val = f.nav * h.shares;
                    }
                }
                data['Total'] += val;
            });
        });
        return data;
    }, [portfolio, selectedAccountId, funds]);

    const days = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        const timeDiff = endOfYear.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }, []);

    const projectionData = useMemo(() => {
        if (!portfolio) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data = [];
        let currentCash = liquidityData[LiquidityTier.CASH] || 0;
        const redeemedAmounts = new Map<string, number>();
        const sortedFlows = [...cashFlows].sort((a, b) => a.date.localeCompare(b.date));

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dateStr = date.toISOString().split('T')[0];
            const displayDate = `${date.getMonth() + 1}-${date.getDate()}`;

            const dailyFlows = sortedFlows.filter(f => f.date === dateStr);
            const inflow = dailyFlows.filter(f => f.type === 'INFLOW').reduce((sum, f) => sum + f.amount, 0);
            const outflowFlows = dailyFlows.filter(f => f.type === 'OUTFLOW');
            const outflow = outflowFlows.reduce((sum, f) => sum + f.amount, 0);

            const expenseBreakdown = outflowFlows.map(f => ({
                name: f.description || '未知支出',
                value: f.amount
            }));

            dailyFlows.forEach(f => {
                if (f.relatedHoldingKey && f.type === 'INFLOW') {
                    const currentRedeemed = redeemedAmounts.get(f.relatedHoldingKey) || 0;
                    redeemedAmounts.set(f.relatedHoldingKey, currentRedeemed + f.amount);
                }
            });

            currentCash = currentCash + inflow - outflow;

            let liquidAssetsFromHoldings = 0;
            let lockedAssets = 0;
            const liquidDetailsList: { name: string; value: number; reason: string }[] = [];
            const lockedDetailsList: { name: string; value: number; reason: string }[] = [];

            currentAccountHoldings.forEach(h => {
                let val = 0;
                let type = FundType.STRATEGY;

                if (h.isExternal) {
                    val = (h.externalNav || 0) * h.shares;
                    type = h.externalType || FundType.STRATEGY;
                } else {
                    const f = funds.find(fund => fund.id === h.fundId);
                    if (f) {
                        val = f.nav * h.shares;
                        type = f.type;
                    }
                }

                const redeemed = redeemedAmounts.get(h.uniqueKey) || 0;
                const remainingVal = Math.max(0, val - redeemed);

                if (remainingVal > 0) {
                    let isLiquid = false;
                    let reason = "";
                    let ruleType = 'DAILY';
                    let openDay = 15;
                    let settlementDays = 1;

                    if (h.redemptionRule) {
                        ruleType = h.redemptionRule.ruleType;
                        if (h.redemptionRule.openDay) openDay = h.redemptionRule.openDay;
                        if (h.redemptionRule.settlementDays) settlementDays = h.redemptionRule.settlementDays;
                    } else if (!h.isExternal) {
                        const f = funds.find(fund => fund.id === h.fundId);
                        if (f) {
                            if (f.liquidityRuleType) {
                                ruleType = f.liquidityRuleType;
                                if (f.openDay) openDay = f.openDay;
                                if (f.settlementDays) settlementDays = f.settlementDays;
                            } else {
                                settlementDays = getSettlementDays(getLiquidityTier(f.type));
                            }
                        }
                    } else {
                        settlementDays = getSettlementDays(h.externalType ? getLiquidityTier(h.externalType) : LiquidityTier.MEDIUM);
                    }

                    const initiationDate = new Date(date);
                    initiationDate.setDate(date.getDate() - settlementDays);
                    initiationDate.setHours(0, 0, 0, 0);

                    let lockedByRules = false;
                    if (h.redemptionRule?.lockupEndDate) {
                        const end = new Date(h.redemptionRule.lockupEndDate);
                        end.setHours(0, 0, 0, 0);
                        if (initiationDate.getTime() < end.getTime()) lockedByRules = true;
                    }

                    if (!lockedByRules && initiationDate.getTime() < today.getTime()) {
                        lockedByRules = true;
                    }

                    if (!lockedByRules) {
                        if (ruleType === 'DAILY') {
                            isLiquid = true;
                            reason = "每日开放";
                        } else if (ruleType === 'MONTHLY') {
                            if (initiationDate.getDate() === openDay && initiationDate.getTime() >= today.getTime()) {
                                isLiquid = true;
                                reason = "开放日到账";
                            } else {
                                isLiquid = false;
                                reason = `非到账日 (开放:${openDay}日)`;
                            }
                        } else if (ruleType === 'FIXED_TERM') {
                            let maturityDate = h.redemptionRule?.maturityDate;
                            if (!h.isExternal) {
                                const f = funds.find(fund => fund.id === h.fundId);
                                if (f?.maturityDate) maturityDate = f.maturityDate;
                            }
                            if (maturityDate) {
                                const mat = new Date(maturityDate); mat.setHours(0, 0, 0, 0);
                                const arrival = new Date(mat); arrival.setDate(mat.getDate() + settlementDays);
                                if (date.getTime() >= arrival.getTime()) {
                                    isLiquid = true;
                                    reason = "到期结算完成";
                                } else {
                                    isLiquid = false;
                                    reason = `未到期 (到期:${maturityDate})`;
                                }
                            }
                        }
                    } else if (ruleType === 'DAILY' && initiationDate.getTime() < today.getTime()) {
                        reason = `赎回结算中 (T+${settlementDays})`;
                    } else if (h.redemptionRule?.lockupEndDate) {
                        reason = `处于锁定期 (至${h.redemptionRule.lockupEndDate})`;
                    }

                    if (isLiquid) {
                        liquidAssetsFromHoldings += remainingVal;
                        liquidDetailsList.push({ name: h.displayName || '未知资产', value: remainingVal, reason: reason || '可赎回' });
                    } else {
                        lockedAssets += remainingVal;
                        lockedDetailsList.push({ name: h.displayName || '未知资产', value: remainingVal, reason: reason || '锁定中' });
                    }
                }
            });

            if (currentCash > 0) {
                liquidDetailsList.unshift({ name: '现金余额', value: currentCash, reason: '实时可用' });
            } else if (currentCash < 0) {
                liquidDetailsList.unshift({ name: '现金缺口', value: currentCash, reason: '资金不足' });
            }

            liquidDetailsList.sort((a, b) => b.value - a.value);
            lockedDetailsList.sort((a, b) => b.value - a.value);

            data.push({
                date: dateStr,
                displayDate: displayDate,
                liquid: currentCash + liquidAssetsFromHoldings,
                locked: lockedAssets,
                expense: -outflow,
                rawExpense: outflow,
                liquidBreakdown: liquidDetailsList,
                lockedBreakdown: lockedDetailsList,
                expenseBreakdown: expenseBreakdown
            });
        }
        return data;
    }, [portfolio, cashFlows, liquidityData, selectedAccountId, currentAccountHoldings, funds]);

    // Initialize selection with first row after data is ready
    useEffect(() => {
        if (projectionData.length > 0 && !selectedRowData) {
            setSelectedRowData(projectionData[0]);
        }
    }, [projectionData, selectedRowData]);

    if (!portfolio) return <div className="p-8 text-center text-gray-500">正在加载数据...</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/liquidity')}
                        className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl text-gray-600 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            超长时间流动性预测
                            <span className="text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                                {new Date().getFullYear()}年度
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>展示从今日起至本年底 ({new Date().getFullYear()}-12-31) 的资金流动性趋势</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Wallet className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={selectedAccountId}
                            onChange={e => setSelectedAccountId(e.target.value)}
                            className="pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-gray-300 min-w-[180px]"
                        >
                            <option value="ALL">全部账户资产</option>
                            {portfolio.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition-all">
                        <span>导出 Excel</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Table Section (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200/75 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                年度流动性详细报表
                            </h2>
                            <span className="text-xs text-gray-400 font-medium">共 {days} 天预测数据</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">日期</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">可用资金</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">锁定资产</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">预计支出</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">资产总额</th>
                                        <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {projectionData.map((row, idx) => {
                                        const total = row.liquid + row.locked;
                                        const isActive = selectedRowData?.date === row.date;
                                        return (
                                            <tr
                                                key={idx}
                                                onClick={() => setSelectedRowData(row)}
                                                className={`group transition-all duration-200 cursor-pointer border-l-2 ${isActive
                                                    ? 'bg-indigo-50/60 border-l-indigo-500'
                                                    : 'hover:bg-gray-50 border-l-transparent'
                                                    }`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-mono font-medium ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>{row.date}</span>
                                                        <span className="text-[10px] text-gray-400 mt-0.5">{row.displayDate}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className={`text-sm font-mono font-bold ${isActive ? 'text-indigo-700' : 'text-indigo-600'}`}>
                                                        ¥ {row.liquid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className="text-sm font-mono text-slate-500">
                                                        ¥ {row.locked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {row.rawExpense > 0 ? (
                                                        <span className="text-sm font-mono text-rose-500 font-medium">
                                                            - ¥ {row.rawExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className="text-sm font-mono text-gray-900 font-bold">
                                                        ¥ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {row.liquid >= 0 ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-500 group-hover:bg-green-100 transition-colors">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                                                            <AlertCircle className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Sticky Detail Panel (4 cols) */}
                <div className="lg:col-span-4 sticky top-6">
                    {selectedRowData ? (
                        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-300 overflow-hidden">
                            {/* Panel Header */}
                            <div className={`px-6 py-5 border-b border-gray-100 flex items-center justify-between ${selectedRowData.liquid >= 0 ? 'bg-gradient-to-r from-green-50/50 to-white' : 'bg-gradient-to-r from-red-50/50 to-white'
                                }`}>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">资金快照</span>
                                    <span className="font-bold text-xl text-gray-900 tracking-tight">{selectedRowData.date}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${selectedRowData.liquid >= 0
                                    ? 'bg-white border-green-100 text-green-700'
                                    : 'bg-white border-red-100 text-red-700'
                                    }`}>
                                    {selectedRowData.liquid >= 0
                                        ? <ShieldCheck className="w-4 h-4" />
                                        : <AlertOctagon className="w-4 h-4" />
                                    }
                                    <span className="text-xs font-bold">{selectedRowData.liquid >= 0 ? '流动性健康' : '存在缺口'}</span>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Liquid Section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                            可用流动性 (T+0)
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-indigo-600 tracking-tight">
                                            ¥{(selectedRowData.liquid / 10000).toFixed(2)}<span className="text-sm text-indigo-400 ml-1">万</span>
                                        </span>
                                    </div>

                                    {selectedRowData.liquidBreakdown && selectedRowData.liquidBreakdown.length > 0 ? (
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                                            {selectedRowData.liquidBreakdown.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-white hover:shadow-sm rounded-lg transition-all group/item">
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="text-sm font-medium text-gray-700 truncate group-hover/item:text-indigo-700 transition-colors">{item.name}</span>
                                                        <span className="text-[10px] text-gray-400 mt-0.5 font-medium bg-gray-100 w-fit px-1.5 py-0.5 rounded text-xs">{item.reason}</span>
                                                    </div>
                                                    <span className="font-mono text-sm font-bold text-gray-900 whitespace-nowrap">
                                                        ¥{(item.value / 10000).toFixed(1)}w
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-gray-400 text-sm italic bg-gray-50 rounded-lg">无可用资产</div>
                                    )}
                                </div>

                                {/* Locked Section */}
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                            <div className="w-1 h-4 bg-slate-400 rounded-full"></div>
                                            锁定中资产
                                        </div>
                                        <span className="font-mono font-bold text-base text-slate-500">
                                            ¥{(selectedRowData.locked / 10000).toFixed(2)}<span className="text-xs text-slate-400 ml-1">万</span>
                                        </span>
                                    </div>

                                    {selectedRowData.lockedBreakdown && selectedRowData.lockedBreakdown.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-100 p-1 max-h-[220px] overflow-y-auto custom-scrollbar shadow-sm">
                                            {selectedRowData.lockedBreakdown.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="text-sm font-medium text-gray-600 truncate">{item.name}</span>
                                                        <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                            {item.reason}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-sm text-gray-400 whitespace-nowrap">
                                                        ¥{(item.value / 10000).toFixed(1)}w
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Expense Section */}
                                {selectedRowData.rawExpense > 0 && (
                                    <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
                                        <div className="flex justify-between items-center bg-red-50/50 p-4 rounded-xl border border-red-100">
                                            <span className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                                                <div className="p-1 bg-rose-100 rounded text-rose-600"><Wallet className="w-3.5 h-3.5" /></div>
                                                当日预计支出
                                            </span>
                                            <span className="font-mono font-bold text-lg text-rose-600">
                                                - ¥ {selectedRowData.rawExpense.toLocaleString()}
                                            </span>
                                        </div>
                                        {selectedRowData.expenseBreakdown && selectedRowData.expenseBreakdown.length > 0 && (
                                            <div className="bg-rose-50/30 rounded-lg p-3 space-y-2 mt-3 border border-rose-100/50">
                                                {selectedRowData.expenseBreakdown.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-start gap-2">
                                                        <span className="text-sm font-medium text-rose-900 leading-tight">{item.name}</span>
                                                        <span className="font-mono text-sm text-rose-700 whitespace-nowrap font-bold">
                                                            - ¥{item.value.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/50 p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400 flex flex-col items-center justify-center h-[500px]">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Activity className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="font-medium text-gray-500">选择左侧日期</p>
                            <p className="text-sm mt-1">查看详细资金构成及流动性分析</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LongTermForecastPage;
