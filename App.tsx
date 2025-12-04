import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  TrendingUp, 
  List as ListIcon, 
  BarChart2, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Calculator,
  AlertTriangle,
  Link as LinkIcon,
  Settings,
  Plus,
  Trash2,
  X,
  Calendar,
  Wand2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Briefcase,
  PieChart as PieChartIcon,
  User,
  Users,
  Grid,
  Layers,
  Activity,
  Wallet,
  Droplet,
  Clock,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Edit2,
  Save,
  FileText,
  Repeat,
  Info,
  Unlock,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, AreaChart, Area, ComposedChart, ReferenceLine } from 'recharts';
import { MOCK_FUNDS, MOCK_PORTFOLIO, generateChartData, generateFundHistory, getLiquidityTier, getSettlementDays, calculateAvailabilityDate } from './services/dataService';
import { analyzeFunds } from './services/geminiService';
import ComparisonChart from './components/ComparisonChart';
import { Fund, AnalysisState, FundType, PatchRule, Account, AccountType, LiquidityTier, CashFlow, ClientPortfolio, Holding, RedemptionRule } from './types';
import ReactMarkdown from 'react-markdown';

// --- Shared Components ---

const Badge = ({ children, color = 'blue' }: { children?: React.ReactNode, color?: string }) => {
  const colorClasses: {[key: string]: string} = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/10',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/10',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorClasses[color] || colorClasses.gray}`}>
      {children}
    </span>
  );
};

const getFundTypeColor = (type: FundType): string => {
  switch (type) {
    case FundType.BROAD_MARKET: return 'blue';
    case FundType.SECTOR: return 'purple';
    case FundType.CROSS_BORDER: return 'yellow';
    case FundType.BOND: return 'green';
    case FundType.STRATEGY: return 'red';
    default: return 'gray';
  }
};

const CHART_COLORS = {
  blue: '#2563eb',   // Broad Market
  purple: '#9333ea', // Sector
  yellow: '#eab308', // Cross Border
  green: '#16a34a',  // Bond
  red: '#dc2626',    // Strategy
  gray: '#9ca3af',    // Other
  cyan: '#06b6d4'    // Cash
};

const getChartColorForType = (type: FundType | 'CASH'): string => {
    if (type === 'CASH') return CHART_COLORS.cyan;
    switch (type) {
        case FundType.BROAD_MARKET: return CHART_COLORS.blue;
        case FundType.SECTOR: return CHART_COLORS.purple;
        case FundType.CROSS_BORDER: return CHART_COLORS.yellow;
        case FundType.BOND: return CHART_COLORS.green;
        case FundType.STRATEGY: return CHART_COLORS.red;
        default: return CHART_COLORS.gray;
    }
};

const TIME_RANGES = [
  { label: '近1月', value: 30 },
  { label: '近3月', value: 90 },
  { label: '近6月', value: 180 },
  { label: '近1年', value: 365 },
  { label: '今年以来', value: 'YTD' },
  { label: '成立以来', value: 'SINCE_INCEPTION' }
];

const COMPACT_TIME_RANGES = [
    { label: '1月', value: 30 },
    { label: '6月', value: 180 },
    { label: '1年', value: 365 },
    { label: 'YTD', value: 'YTD' },
  ];

// --- Visualizers ---
const TimelineVisualizer: React.FC<{
    startDate: Date;
    endDate: Date;
    gapStart?: Date;
    gapEnd?: Date;
    patchRules: { start: Date, end: Date }[];
  }> = ({ startDate, endDate, gapStart, gapEnd, patchRules }) => {
    const totalDuration = endDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) return null;
  
    const getPercent = (date: Date) => {
      const val = (date.getTime() - startDate.getTime()) / totalDuration * 100;
      return Math.max(0, Math.min(100, val));
    };
  
    return (
      <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden border border-gray-200 w-full mt-2 select-none">
        <div className="absolute inset-0 bg-emerald-100 flex items-center justify-center">
            <span className="text-[10px] text-emerald-700 font-medium z-10">数据完整</span>
        </div>
        {gapStart && gapEnd && (
          <div 
            className="absolute top-0 bottom-0 bg-red-100 border-r border-red-200 flex items-center justify-center overflow-hidden"
            style={{ 
              left: `${getPercent(startDate)}%`, 
              width: `${getPercent(gapEnd) - getPercent(startDate)}%` 
            }}
          >
             <span className="text-[10px] text-red-700 font-medium whitespace-nowrap px-1">缺失</span>
          </div>
        )}
        {patchRules.map((rule, idx) => {
            const startP = getPercent(rule.start);
            const endP = getPercent(rule.end);
            return (
                <div 
                    key={idx}
                    className="absolute top-1 bottom-1 bg-indigo-500/30 border border-indigo-500/50 rounded-sm"
                    style={{ left: `${startP}%`, width: `${endP - startP}%` }}
                    title={`补齐: ${rule.start.toLocaleDateString()} - ${rule.end.toLocaleDateString()}`}
                />
            );
        })}
        <div className="absolute bottom-0 left-0 right-0 h-1 border-t border-gray-300 flex justify-between px-1">
             <div className="h-1 w-px bg-gray-400"></div>
             <div className="h-1 w-px bg-gray-400"></div>
             <div className="h-1 w-px bg-gray-400"></div>
             <div className="h-1 w-px bg-gray-400"></div>
             <div className="h-1 w-px bg-gray-400"></div>
        </div>
      </div>
    );
  };

// --- Single Fund Card for Grid View ---

const SingleFundPerformanceCard: React.FC<{
  fund: Fund;
  patchRules: PatchRule[];
  allFunds: Fund[];
}> = ({ fund, patchRules, allFunds }) => {
  const [range, setRange] = useState<number | string>(30); 

  const chartDataObj = useMemo(() => {
    let days = 30;
    if (typeof range === 'number') {
      days = range;
    } else if (range === 'YTD') {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    }

    return generateChartData([fund], days, patchRules, allFunds);
  }, [fund, range, patchRules, allFunds]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[280px]">
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 pr-2">
          <Link to={`/fund/${fund.id}`} className="hover:text-indigo-600 transition-colors">
             <h4 className="font-semibold text-gray-800 text-sm truncate" title={fund.name}>{fund.name}</h4>
          </Link>
          <div className="text-xs text-gray-500 font-mono">{fund.code}</div>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5 shrink-0">
          {COMPACT_TIME_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.value)}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm transition-all ${
                range === r.value 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
         <ComparisonChart 
            data={chartDataObj.chartData}
            funds={[fund]}
            patchRules={patchRules}
            allFunds={allFunds}
            metric="NAV"
            viewMode="OVERLAY"
            compact={true}
            hideTitle={true}
         />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-gray-50 border-dashed">
         <span className="text-gray-500">最新净值: <span className="font-mono text-gray-900 font-medium">{fund.nav.toFixed(3)}</span></span>
         <span className={`font-medium ${fund.dayChange >= 0 ? "text-red-500" : "text-green-500"}`}>
            {fund.dayChange >= 0 ? '+' : ''}{fund.dayChange}%
         </span>
      </div>
    </div>
  );
};

// --- Modal Components ---

const AddAssetModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    initialAccountId?: string;
    onAdd: (accountId: string, holding: Holding) => void;
}> = ({ isOpen, onClose, accounts, initialAccountId, onAdd }) => {
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');
    const [name, setName] = useState('');
    const [type, setType] = useState<FundType>(FundType.BROAD_MARKET);
    const [shares, setShares] = useState('');
    const [nav, setNav] = useState('');
    const [navDate, setNavDate] = useState(new Date().toISOString().split('T')[0]);
    const [avgCost, setAvgCost] = useState('');
    
    // Config for periodic products
    const [isPeriodic, setIsPeriodic] = useState(false);
    const [openDay, setOpenDay] = useState(15);
    const [settlementDays, setSettlementDays] = useState(10);

    useEffect(() => {
        if (isOpen && initialAccountId) {
            setAccountId(initialAccountId);
        } else if (isOpen && !initialAccountId && accounts.length > 0) {
            setAccountId(accounts[0].id);
        }
    }, [isOpen, initialAccountId, accounts]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (accountId && name && shares && nav) {
            let redemptionRule: RedemptionRule | undefined = undefined;
            if (isPeriodic) {
                redemptionRule = {
                    ruleType: 'MONTHLY',
                    openDay: openDay,
                    settlementDays: settlementDays
                };
            }

            onAdd(accountId, {
                isExternal: true,
                externalName: name,
                externalType: type,
                externalNav: Number(nav),
                externalNavDate: navDate,
                shares: Number(shares),
                avgCost: Number(avgCost) || Number(nav),
                redemptionRule
            });
            onClose();
            setName('');
            setShares('');
            setNav('');
            setAvgCost('');
            setIsPeriodic(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">录入外部资产</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">所属账户</label>
                        <select 
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md bg-gray-50"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">产品名称</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-sm border-gray-300 rounded-md" placeholder="例如: 某某私募一期"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">产品类型</label>
                        <select value={type} onChange={e => setType(e.target.value as FundType)} className="w-full text-sm border-gray-300 rounded-md">
                            {Object.values(FundType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">持有份额</label>
                            <input type="number" value={shares} onChange={e => setShares(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">持仓成本(元)</label>
                            <input type="number" value={avgCost} onChange={e => setAvgCost(e.target.value)} className="w-full text-sm border-gray-300 rounded-md" placeholder="选填"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">最新净值</label>
                            <input type="number" value={nav} onChange={e => setNav(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">净值日期</label>
                            <input type="date" value={navDate} onChange={e => setNavDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <input type="checkbox" id="isPeriodic" checked={isPeriodic} onChange={e => setIsPeriodic(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            <label htmlFor="isPeriodic" className="text-sm font-medium text-gray-700">配置定期开放规则 (如信托)</label>
                        </div>
                        {isPeriodic && (
                            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">每月</span>
                                    <input type="number" min={1} max={31} value={openDay} onChange={e => setOpenDay(parseInt(e.target.value))} className="w-16 text-sm border-gray-300 rounded-md"/>
                                    <span className="text-xs text-gray-600">日为开放日</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">赎回需</span>
                                    <input type="number" min={0} value={settlementDays} onChange={e => setSettlementDays(parseInt(e.target.value))} className="w-16 text-sm border-gray-300 rounded-md"/>
                                    <span className="text-xs text-gray-600">天到账 (T+N)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={!name || !shares || !nav}
                        className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                    >
                        确认录入
                    </button>
                </div>
            </div>
        </div>
    );
};

const LiquidityRuleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    holdingName: string;
    currentRule?: RedemptionRule;
    onSave: (rule: RedemptionRule) => void;
}> = ({ isOpen, onClose, holdingName, currentRule, onSave }) => {
    const [ruleType, setRuleType] = useState<'DAILY' | 'MONTHLY'>('DAILY');
    const [openDay, setOpenDay] = useState<number>(15);
    const [settlementDays, setSettlementDays] = useState<number>(3);

    useEffect(() => {
        if (isOpen) {
            setRuleType(currentRule?.ruleType || 'DAILY');
            setOpenDay(currentRule?.openDay || 15);
            setSettlementDays(currentRule?.settlementDays || 3);
        }
    }, [isOpen, currentRule]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ ruleType, openDay: ruleType === 'MONTHLY' ? openDay : undefined, settlementDays });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">配置流动性规则</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                    资产：<span className="font-medium text-gray-900">{holdingName}</span>
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">开放类型</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setRuleType('DAILY')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${ruleType === 'DAILY' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>每日开放 (标准)</button>
                            <button onClick={() => setRuleType('MONTHLY')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${ruleType === 'MONTHLY' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>定期开放 (信托)</button>
                        </div>
                    </div>
                    {ruleType === 'MONTHLY' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">每月开放日</label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">每月</span>
                                <input type="number" min={1} max={31} value={openDay} onChange={e => setOpenDay(parseInt(e.target.value))} className="w-20 text-sm border-gray-300 rounded-md"/>
                                <span className="text-sm text-gray-500">日</span>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">赎回结算周期 (T+N)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">T +</span>
                            <input type="number" min={0} value={settlementDays} onChange={e => setSettlementDays(parseInt(e.target.value))} className="w-20 text-sm border-gray-300 rounded-md"/>
                            <span className="text-sm text-gray-500">天到账</span>
                        </div>
                    </div>
                    <button onClick={handleSave} className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
};

const PatchConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patchRules: PatchRule[];
  onAddRule: (rule: PatchRule) => void;
  onRemoveRule: (id: string) => void;
  allFunds: Fund[];
  comparisonStartDate: string; 
}> = ({ isOpen, onClose, patchRules, onAddRule, onRemoveRule, allFunds, comparisonStartDate }) => {
  const [targetId, setTargetId] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const gapInfo = useMemo(() => {
    if (!targetId || !comparisonStartDate) return null;
    const fund = allFunds.find(f => f.id === targetId);
    if (!fund) return null;
    if (fund.inceptionDate > comparisonStartDate) {
        const inception = new Date(fund.inceptionDate);
        inception.setDate(inception.getDate() - 1);
        const end = inception.toISOString().split('T')[0];
        return { hasGap: true, gapStart: comparisonStartDate, gapEnd: end, fundInception: fund.inceptionDate };
    }
    return { hasGap: false };
  }, [targetId, comparisonStartDate, allFunds]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (targetId && proxyId && startDate && endDate) {
      onAddRule({
        id: Date.now().toString(),
        targetFundId: targetId,
        proxyFundId: proxyId,
        startDate,
        endDate
      });
      setProxyId('');
      setStartDate('');
      setEndDate('');
    }
  };

  const autoFillGap = () => {
      if (gapInfo?.hasGap) {
          setStartDate(gapInfo.gapStart);
          setEndDate(gapInfo.gapEnd);
      }
  };

  const getFundName = (id: string) => allFunds.find(f => f.id === id)?.name || id;

  const visStartDate = new Date(comparisonStartDate);
  const visEndDate = new Date(); 
  const visGapStart = gapInfo?.hasGap ? new Date(gapInfo.gapStart) : undefined;
  const visGapEnd = gapInfo?.hasGap ? new Date(gapInfo.gapEnd) : undefined;
  const relevantRules = patchRules.filter(r => r.targetFundId === targetId).map(r => ({
      start: new Date(r.startDate),
      end: new Date(r.endDate)
  }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                配置净值补齐
            </h3>
            <p className="text-sm text-gray-500 mt-1">为成立时间较短的基金补充历史业绩数据</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> 添加新规则</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">目标基金 (需补齐)</label>
                <select className="w-full text-sm border-gray-300 rounded-md" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">选择基金...</option>
                  {allFunds.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (成立: {f.inceptionDate})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">替补基金 (数据源)</label>
                <select className="w-full text-sm border-gray-300 rounded-md" value={proxyId} onChange={(e) => setProxyId(e.target.value)}>
                  <option value="">选择相似基金...</option>
                  {allFunds.filter(f => f.id !== targetId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
                <input type="date" className="w-full text-sm border-gray-300 rounded-md" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
                <input type="date" className="w-full text-sm border-gray-300 rounded-md" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {gapInfo?.hasGap && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start justify-between">
                    <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="text-xs text-orange-800">
                            <span className="font-bold">发现数据缺口:</span> 建议补齐 <span className="font-mono">{gapInfo.gapStart} ~ {gapInfo.gapEnd}</span>
                        </div>
                    </div>
                    <button onClick={autoFillGap} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 font-medium">一键填充</button>
                </div>
            )}
            {targetId && (
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">补齐覆盖预览</label>
                    <TimelineVisualizer startDate={visStartDate} endDate={visEndDate} gapStart={visGapStart} gapEnd={visGapEnd} patchRules={relevantRules} />
                </div>
            )}
            <button onClick={handleAdd} disabled={!targetId || !proxyId || !startDate || !endDate} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">添加规则</button>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">已配置规则</h4>
            {patchRules.length === 0 ? <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">暂无补齐规则</div> : 
              <div className="space-y-3">
                {patchRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <span className="font-medium">{getFundName(rule.targetFundId)}</span>
                        <ArrowLeft className="w-3 h-3 text-gray-400" />
                        <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs border border-indigo-100">{getFundName(rule.proxyFundId)}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{rule.startDate} 至 {rule.endDate}</div>
                    </div>
                    <button onClick={() => onRemoveRule(rule.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">完成配置</button>
        </div>
      </div>
    </div>
  );
};

// --- Page Components ---

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: '产品列表', icon: ListIcon },
    { path: '/comparison', label: '业绩对比', icon: BarChart2 },
    { path: '/portfolio', label: '持仓分析', icon: Briefcase },
    { path: '/liquidity', label: '流动性测算', icon: Droplet },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">FundInsight Pro</span>
            </div>
            <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors h-16 ${isActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <Icon className="w-4 h-4 mr-2" />{item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};

const FundListPage: React.FC = () => {
  const [selectedFunds, setSelectedFunds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggleFund = (id: string) => {
    const newSelected = new Set(selectedFunds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedFunds(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">基金产品列表</h1>
          <p className="mt-1 text-sm text-gray-500">A股市场规模领先的ETF基金，点击名称查看详情，或选择多只进行对比。</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 flex items-center text-sm text-gray-500 shadow-sm">
             <span className="font-medium text-indigo-600 mr-1">{selectedFunds.size}</span> 已选中
          </div>
          <button 
            onClick={() => navigate('/comparison', { state: { selectedIds: Array.from(selectedFunds) } })}
            disabled={selectedFunds.size < 1}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            开始对比
          </button>
        </div>
      </div>
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">选择</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基金代码/名称</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成立日期</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新净值</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日涨跌幅</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">今年以来</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {MOCK_FUNDS.map((fund) => (
              <tr key={fund.id} className={`hover:bg-gray-50 transition-colors ${selectedFunds.has(fund.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" checked={selectedFunds.has(fund.id)} onChange={() => toggleFund(fund.id)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"/>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <Link to={`/fund/${fund.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">{fund.name}</Link>
                    <span className="text-xs text-gray-500 font-mono">{fund.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{fund.inceptionDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{fund.nav.toFixed(4)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`font-medium ${fund.dayChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fund.dayChange > 0 ? '+' : ''}{fund.dayChange}%</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`font-medium ${fund.ytdReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fund.ytdReturn > 0 ? '+' : ''}{fund.ytdReturn}%</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/fund/${fund.id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"><Search className="w-3 h-3"/> 详情</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ComparisonPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
  const location = useLocation();
  const selectedIds = (location.state as { selectedIds: string[] })?.selectedIds || [];
  const funds = MOCK_FUNDS.filter(f => selectedIds.includes(f.id));
  const [selectedRange, setSelectedRange] = useState<number | string>(180);
  const [analysis, setAnalysis] = useState<AnalysisState>({ loading: false, content: null, error: null });
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [proxyMap, setProxyMap] = useState<{[key:string]: string}>({}); // Legacy, kept for typing compatibility if needed
  
  const proxyNames = useMemo(() => {
    const map: {[key:string]: string} = {};
    patchRules.forEach(r => {
        const proxy = MOCK_FUNDS.find(f => f.id === r.proxyFundId);
        if (proxy) map[r.targetFundId] = proxy.name;
    });
    return map;
  }, [patchRules]);

  const chartStartDate = useMemo(() => {
    let days = 30;
    if (typeof selectedRange === 'number') days = selectedRange;
    else if (selectedRange === 'YTD') days = 365; // Approx
    
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }, [selectedRange]);

  const chartDataObj = useMemo(() => {
    let daysToLoad = 30;
    if (typeof selectedRange === 'number') {
        daysToLoad = selectedRange;
    } else if (selectedRange === 'YTD') {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
        daysToLoad = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    } else if (selectedRange === 'SINCE_INCEPTION') {
        if (funds.length > 0) {
             // Find earliest inception
             const earliest = funds.reduce((min, f) => f.inceptionDate < min ? f.inceptionDate : min, funds[0].inceptionDate);
             const now = new Date();
             const start = new Date(earliest);
             const diff = Math.abs(now.getTime() - start.getTime());
             daysToLoad = Math.ceil(diff / (1000 * 60 * 60 * 24));
        } else {
            daysToLoad = 365;
        }
    }
    return generateChartData(funds, daysToLoad, patchRules, MOCK_FUNDS);
  }, [funds, selectedRange, patchRules]);

  const handleAnalyze = async () => {
    setAnalysis({ loading: true, content: null, error: null });
    const result = await analyzeFunds(funds);
    setAnalysis({ loading: false, content: result, error: null });
  };

  const PeriodSelector = (
      <div className="flex bg-gray-100 rounded-lg p-1">
        {TIME_RANGES.map(range => (
          <button
            key={range.label}
            onClick={() => setSelectedRange(range.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              selectedRange === range.value 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">业绩对比分析</h1>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsPatchModalOpen(true)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium"
            >
                <Wand2 className="w-4 h-4 mr-2 text-indigo-600" />
                配置净值补齐
            </button>
            <button 
                onClick={handleAnalyze}
                disabled={analysis.loading || funds.length === 0}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-medium disabled:opacity-50"
            >
                {analysis.loading ? <span className="animate-spin mr-2">⏳</span> : <Sparkles className="w-4 h-4 mr-2" />}
                AI 智能分析
            </button>
        </div>
      </div>

      <ComparisonChart 
        data={chartDataObj.chartData} 
        funds={funds} 
        periodSelector={PeriodSelector}
        patchRules={patchRules}
        allFunds={MOCK_FUNDS}
      />
      
      {/* Explanation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-indigo-600" />
                归一化净值说明
            </h3>
            <div className="prose prose-sm text-gray-600">
                <p>为了直观对比不同基金的业绩走势，我们将所有基金在<strong>统计起始日</strong>的净值统一换算为 <strong>100</strong>。</p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-xs my-3">
                    <div className="mb-1 text-gray-500">// 计算公式</div>
                    归一化净值(t) = ( 实际净值(t) / 起始日实际净值 ) × 100
                </div>
                <p>
                    例如：若某基金起始日净值为 1.50，当前净值为 1.65，则：<br/>
                    归一化净值 = (1.65 / 1.50) × 100 = <strong>110.00</strong><br/>
                    这表示该区间内上涨了 10%。
                </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI 分析报告
            </h3>
            <div className="bg-indigo-50/50 rounded-lg p-4 min-h-[160px]">
                {analysis.loading && <div className="text-gray-500 text-sm animate-pulse">正在生成分析报告...</div>}
                {!analysis.loading && !analysis.content && <div className="text-gray-400 text-sm">点击右上角“AI 智能分析”获取报告</div>}
                {analysis.content && <div className="prose prose-sm text-gray-800"><ReactMarkdown>{analysis.content}</ReactMarkdown></div>}
            </div>
          </div>
      </div>

      <PatchConfigModal 
        isOpen={isPatchModalOpen}
        onClose={() => setIsPatchModalOpen(false)}
        patchRules={patchRules}
        onAddRule={onAddPatchRule}
        onRemoveRule={onRemovePatchRule}
        allFunds={MOCK_FUNDS}
        comparisonStartDate={chartStartDate}
      />
    </div>
  );
};

const FundDetailPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
    const { id } = useParams<{ id: string }>();
    const fund = MOCK_FUNDS.find(f => f.id === id);
    const [range, setRange] = useState<number | string>(365);
    const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterPatched, setFilterPatched] = useState(false);
    const PAGE_SIZE = 10;
  
    if (!fund) return <div>Fund not found</div>;

    const historyData = useMemo(() => {
        let days = 365;
        if (typeof range === 'number') days = range;
        else if (range === 'YTD') {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            days = Math.ceil(Math.abs(now.getTime() - startOfYear.getTime()) / (86400000));
        }
        return generateFundHistory(fund, days, patchRules, MOCK_FUNDS);
    }, [fund, range, patchRules]);

    const filteredData = useMemo(() => {
        if (filterPatched) {
            return historyData.filter(d => d.isPatched);
        }
        return historyData;
    }, [historyData, filterPatched]);

    // Reset pagination when filter changes
    useEffect(() => setCurrentPage(1), [filterPatched, range]);

    const paginatedData = useMemo(() => {
        // Reverse for table (Newest first)
        const reversed = [...filteredData].reverse();
        const start = (currentPage - 1) * PAGE_SIZE;
        return reversed.slice(start, start + PAGE_SIZE);
    }, [filteredData, currentPage]);
  
    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {fund.name} <span className="text-base font-normal text-gray-500 font-mono">({fund.code})</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                             <Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge>
                             <span>基金经理: {fund.manager}</span>
                             <span>成立日期: {fund.inceptionDate}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setIsPatchModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium"
                >
                    <Wand2 className="w-4 h-4 mr-2 text-indigo-600" />
                    配置净值补齐
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-gray-800">单位净值走势</h3>
                         <div className="flex bg-gray-100 rounded-lg p-1">
                            {TIME_RANGES.filter(r => r.value !== 'SINCE_INCEPTION').map(r => (
                                <button key={r.label} onClick={() => setRange(r.value)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${range === r.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{r.label}</button>
                            ))}
                         </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={30}/>
                                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="nav_actual" name="真实净值" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls={false} />
                                <Line type="monotone" dataKey="nav_patched" name="补齐净值" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">日涨跌幅</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={30}/>
                                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                                <RechartsTooltip formatter={(val: number) => [`${val}%`, '涨跌幅']} />
                                <Bar dataKey="change">
                                    {historyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={(entry.change || 0) >= 0 ? '#ef4444' : '#22c55e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">历史净值明细</h3>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400"/>
                        <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer select-none">
                            {/* Fix: Use e.target.checked instead of e.target.value for boolean state */}
                            <input type="checkbox" checked={filterPatched} onChange={e => setFilterPatched(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            只看补齐数据
                        </label>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">单位净值</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日涨跌幅</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据来源</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{row.date}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                                    {(row.nav_actual || row.nav_patched)?.toFixed(4)}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm">
                                    <span className={`font-medium ${(row.change || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {(row.change || 0) > 0 ? '+' : ''}{row.change}%
                                    </span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm">
                                    {row.isPatched ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                            <Wand2 className="w-3 h-3"/> 补齐: {row.proxyName}
                                        </span>
                                    ) : (
                                        <span className="text-gray-500">真实数据</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                显示 <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> 到 <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, filteredData.length)}</span> 条，共 <span className="font-medium">{filteredData.length}</span> 条
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            <PatchConfigModal 
                isOpen={isPatchModalOpen}
                onClose={() => setIsPatchModalOpen(false)}
                patchRules={patchRules}
                onAddRule={onAddPatchRule}
                onRemoveRule={onRemovePatchRule}
                allFunds={MOCK_FUNDS}
                comparisonStartDate={new Date(new Date().setDate(new Date().getDate() - (typeof range === 'number' ? range : 365))).toISOString().split('T')[0]}
            />
        </div>
    );
};

const PortfolioPage: React.FC<{ 
    portfolio: ClientPortfolio, 
    patchRules: PatchRule[], 
    onAddExternalAsset: (accountId: string, holding: Holding) => void 
}> = ({ portfolio, patchRules, onAddExternalAsset }) => {
  const [metric, setMetric] = useState<'NAV' | 'CHANGE'>('NAV');
  const [chartView, setChartView] = useState<'OVERLAY' | 'GRID'>('OVERLAY');
  const [selectedRange, setSelectedRange] = useState<number | string>(180);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [addAssetTargetAccount, setAddAssetTargetAccount] = useState<string | undefined>(undefined);

  // Helper to find fund info (internal or external)
  const getHoldingValue = (h: Holding) => {
    if (h.isExternal) return (h.externalNav || 1) * h.shares;
    const f = MOCK_FUNDS.find(fund => fund.id === h.fundId);
    return f ? f.nav * h.shares : 0;
  };
  
  const getHoldingName = (h: Holding) => {
      if (h.isExternal) return h.externalName || 'Unknown Asset';
      return MOCK_FUNDS.find(f => f.id === h.fundId)?.name || 'Unknown Fund';
  };

  const getHoldingType = (h: Holding) => {
      if (h.isExternal) return h.externalType || FundType.STRATEGY;
      return MOCK_FUNDS.find(f => f.id === h.fundId)?.type || FundType.STRATEGY;
  };

  const totalAssets = portfolio.accounts.reduce((sum, acc) => 
    sum + (acc.cashBalance || 0) + acc.holdings.reduce((hSum, h) => hSum + getHoldingValue(h), 0)
  , 0);

  const getAssetAllocation = (holdings: Holding[], cash: number) => {
    const allocation: {[key: string]: number} = { 'CASH': cash };
    holdings.forEach(h => {
        const type = getHoldingType(h);
        const val = getHoldingValue(h);
        allocation[type] = (allocation[type] || 0) + val;
    });
    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
  };

  const totalAllocation = useMemo(() => {
     const allHoldings = portfolio.accounts.flatMap(a => a.holdings);
     const totalCash = portfolio.accounts.reduce((s, a) => s + (a.cashBalance || 0), 0);
     return getAssetAllocation(allHoldings, totalCash);
  }, [portfolio]);

  // Performance Logic
  const uniqueFundIds = useMemo(() => {
     const funds = new Set<string>();
     const accountsToScan = selectedAccountId === 'ALL' 
        ? portfolio.accounts 
        : portfolio.accounts.filter(a => a.id === selectedAccountId);
     
     accountsToScan.forEach(acc => {
         acc.holdings.forEach(h => {
             if (!h.isExternal && h.fundId) funds.add(h.fundId);
         });
     });
     return Array.from(funds);
  }, [portfolio, selectedAccountId]);

  const displayedFunds = MOCK_FUNDS.filter(f => uniqueFundIds.includes(f.id));

  const performanceChartDataObj = useMemo(() => {
      // Only for OVERLAY mode we generate combined data here. 
      // For GRID mode, each card generates its own.
      if (chartView === 'GRID') return { chartData: [], gaps: [] };

      let days = 180;
      if (typeof selectedRange === 'number') days = selectedRange;
      else if (selectedRange === 'YTD') days = 365; // Simple approx

      return generateChartData(displayedFunds, days, patchRules, MOCK_FUNDS);
  }, [displayedFunds, selectedRange, patchRules, chartView]);

  const openAddAsset = (accId?: string) => {
      setAddAssetTargetAccount(accId);
      setIsAddAssetOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">持仓分析</h1>
          <p className="mt-1 text-sm text-gray-500">客户 {portfolio.clientName} 的投资组合总览</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
             <span className="text-sm text-gray-500 mr-2">总资产</span>
             <span className="text-2xl font-bold text-indigo-600 font-mono">¥ {totalAssets.toLocaleString()}</span>
        </div>
      </div>

      {/* Total Asset Allocation (Horizontal Layout) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" /> 总体资产配置
             </h3>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={totalAllocation}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {totalAllocation.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getChartColorForType(entry.name as FundType | 'CASH')} />
                            ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: number) => `¥${val.toLocaleString()}`} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-full md:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {totalAllocation.map((item) => (
                    <div key={item.name} className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: getChartColorForType(item.name as FundType | 'CASH') }}></div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs text-gray-500 truncate">{item.name === 'CASH' ? '现金余额' : item.name}</span>
                            <span className="text-sm font-bold text-gray-900 truncate">¥{item.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400">{((item.value / totalAssets) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="space-y-6">
        {portfolio.accounts.map(account => {
            const accAllocation = getAssetAllocation(account.holdings, account.cashBalance || 0);
            const accTotal = (account.cashBalance || 0) + account.holdings.reduce((s, h) => s + getHoldingValue(h), 0);

            return (
                <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1.5 rounded-md shadow-sm border border-gray-100">
                                {account.type === AccountType.PERSONAL ? <User className="w-5 h-5 text-indigo-600"/> : <Users className="w-5 h-5 text-indigo-600"/>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{account.name}</h3>
                                <Badge color={account.type === AccountType.PERSONAL ? 'blue' : 'purple'}>{account.type}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="text-right">
                                <div className="text-xs text-gray-500">账户资产</div>
                                <div className="font-mono font-bold text-gray-900">¥ {accTotal.toLocaleString()}</div>
                             </div>
                             <button 
                                onClick={() => openAddAsset(account.id)}
                                className="p-2 hover:bg-gray-200 rounded-full text-indigo-600 transition-colors" title="录入外部资产"
                             >
                                <Plus className="w-5 h-5" />
                             </button>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                         {/* Left: Pie */}
                         <div className="lg:col-span-1 h-[200px] relative">
                            <h4 className="absolute top-0 left-0 text-xs font-semibold text-gray-500 z-10">配置分布</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={accAllocation} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                                        {accAllocation.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={getChartColorForType(entry.name as FundType | 'CASH')} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => `¥${val.toLocaleString()}`} />
                                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                         </div>
                         {/* Right: Table */}
                         <div className="lg:col-span-2 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">资产名称</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">市值</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">盈亏</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Cash Row */}
                                    <tr>
                                        <td className="px-3 py-2 text-sm text-gray-900 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div> 现金余额
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500">CASH</td>
                                        <td className="px-3 py-2 text-sm text-gray-900 font-mono text-right">¥{(account.cashBalance || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-sm text-gray-400 text-right">-</td>
                                    </tr>
                                    {account.holdings.map((h, idx) => {
                                        const val = getHoldingValue(h);
                                        const cost = h.avgCost * h.shares;
                                        const pl = val - cost;
                                        const plPercent = (pl / cost) * 100;
                                        return (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    {getHoldingName(h)}
                                                    {h.isExternal && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1 rounded">外部</span>}
                                                </td>
                                                <td className="px-3 py-2 text-xs"><Badge color={getFundTypeColor(getHoldingType(h))}>{getHoldingType(h)}</Badge></td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-mono text-right">¥{val.toLocaleString()}</td>
                                                <td className="px-3 py-2 text-sm font-mono text-right">
                                                    <span className={pl >= 0 ? 'text-red-600' : 'text-green-600'}>
                                                        {plPercent.toFixed(2)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                         </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Performance Insight */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> 业绩透视
             </h3>
             <div className="flex flex-wrap gap-3">
                 <select 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="text-xs border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
                 >
                     <option value="ALL">全部账户资产</option>
                     {portfolio.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
                 <div className="flex bg-gray-100 rounded-lg p-1">
                     <button onClick={() => setMetric('NAV')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${metric === 'NAV' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>净值走势</button>
                     <button onClick={() => setMetric('CHANGE')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${metric === 'CHANGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>日涨跌幅</button>
                 </div>
                 <div className="flex bg-gray-100 rounded-lg p-1">
                     <button onClick={() => setChartView('OVERLAY')} className={`p-1.5 rounded-md transition-all ${chartView === 'OVERLAY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`} title="合并展示"><Layers className="w-4 h-4"/></button>
                     <button onClick={() => setChartView('GRID')} className={`p-1.5 rounded-md transition-all ${chartView === 'GRID' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`} title="分图展示"><Grid className="w-4 h-4"/></button>
                 </div>
                 {chartView === 'OVERLAY' && (
                     <select value={selectedRange} onChange={e => setSelectedRange(e.target.value === 'YTD' ? 'YTD' : Number(e.target.value))} className="text-xs border-gray-300 rounded-md py-1.5">
                        {TIME_RANGES.filter(r => r.value !== 'SINCE_INCEPTION').map(r => <option key={r.label} value={r.value}>{r.label}</option>)}
                     </select>
                 )}
             </div>
         </div>
         
         {chartView === 'OVERLAY' ? (
             <ComparisonChart 
                data={performanceChartDataObj.chartData}
                funds={displayedFunds}
                patchRules={patchRules}
                allFunds={MOCK_FUNDS}
                metric={metric}
                viewMode="OVERLAY"
             />
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {displayedFunds.map(fund => (
                     <SingleFundPerformanceCard 
                        key={fund.id} 
                        fund={fund} 
                        patchRules={patchRules} 
                        allFunds={MOCK_FUNDS} 
                     />
                 ))}
             </div>
         )}
      </div>

      <AddAssetModal 
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        accounts={portfolio.accounts}
        initialAccountId={addAssetTargetAccount}
        onAdd={onAddExternalAsset}
      />
    </div>
  );
};

const LiquidityPage: React.FC<{ 
    portfolio: ClientPortfolio, 
    updateHoldingRule: (accId: string, holdingIdx: number, rule: RedemptionRule) => void,
    updateAccountCash: (accId: string, amount: number) => void
}> = ({ portfolio, updateHoldingRule, updateAccountCash }) => {
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([
      { id: '1', date: '2025-06-15', amount: 50000, description: '定期理财到期', type: 'INFLOW' },
      { id: '2', date: '2025-07-01', amount: 200000, description: '子女海外学费', type: 'OUTFLOW' }
  ]);
  const [targetDate, setTargetDate] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(50000); // Default expense baseline

  // Planning Form State
  const [planCategory, setPlanCategory] = useState<'GENERIC'|'REDEMPTION'|'DIVIDEND'|'INSURANCE'>('GENERIC');
  const [planAmount, setPlanAmount] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planType, setPlanType] = useState<'INFLOW'|'OUTFLOW'>('OUTFLOW');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [insuranceName, setInsuranceName] = useState('');

  // Rules Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleContext, setEditingRuleContext] = useState<{accId: string, hIdx: number, hName: string, rule?: RedemptionRule} | null>(null);

  // Cash Editing
  const [editingCashAccId, setEditingCashAccId] = useState<string | null>(null);
  const [tempCashVal, setTempCashVal] = useState('');

  const currentAccountHoldings = useMemo(() => {
    const accs = selectedAccountId === 'ALL' ? portfolio.accounts : portfolio.accounts.filter(a => a.id === selectedAccountId);
    return accs.flatMap(a => a.holdings.map(h => {
        const name = h.isExternal ? h.externalName : MOCK_FUNDS.find(f => f.id === h.fundId)?.name;
        return { ...h, displayName: name, accountId: a.id };
    }));
  }, [portfolio, selectedAccountId]);

  const liquidityData = useMemo(() => {
    const data = {
        [LiquidityTier.CASH]: 0,
        [LiquidityTier.HIGH]: 0,
        [LiquidityTier.MEDIUM]: 0,
        [LiquidityTier.LOW]: 0,
        'T30': 0,
        'Total': 0
    };
    const today = new Date();

    const accountsToAnalyze = selectedAccountId === 'ALL' 
        ? portfolio.accounts 
        : portfolio.accounts.filter(a => a.id === selectedAccountId);

    accountsToAnalyze.forEach(account => {
        const cash = account.cashBalance || 0;
        data[LiquidityTier.CASH] += cash;
        data['T30'] += cash;
        data['Total'] += cash;

        account.holdings.forEach(h => {
            let val = 0;
            let type = FundType.STRATEGY;

            if (h.isExternal) {
                val = (h.externalNav || 0) * h.shares;
                type = h.externalType || FundType.STRATEGY;
            } else {
                const f = MOCK_FUNDS.find(fund => fund.id === h.fundId);
                if (f) {
                    val = f.nav * h.shares;
                    type = f.type;
                }
            }

            const availableDate = calculateAvailabilityDate(today, h, type);
            const diffTime = availableDate.getTime() - today.getTime();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Classify based on actual availability days
            if (days <= 1) data[LiquidityTier.HIGH] += val;
            else if (days <= 3) data[LiquidityTier.MEDIUM] += val;
            else if (days <= 7) data[LiquidityTier.LOW] += val; // Using LOW bucket for T+7 approximation here
            
            if (days <= 30) data['T30'] += val;
            data['Total'] += val;
        });
    });
    return data;
  }, [portfolio, selectedAccountId]);

  const projectionData = useMemo(() => {
    const days = 365;
    const data = [];
    let today = new Date();
    
    // Initial Available Cash (Cash + T+0)
    let currentBaseAvailable = liquidityData[LiquidityTier.CASH]; 
    
    const accounts = selectedAccountId === 'ALL' ? portfolio.accounts : portfolio.accounts.filter(a => a.id === selectedAccountId);

    // Identify Periodic holdings vs Always Liquid holdings
    const holdings = accounts.flatMap(a => a.holdings.map(h => {
        let val = 0;
        let type = FundType.STRATEGY;
        let name = 'Asset';
        if (h.isExternal) {
            val = (h.externalNav || 0) * h.shares;
            type = h.externalType || FundType.STRATEGY;
            name = h.externalName || 'Asset';
        } else {
            const f = MOCK_FUNDS.find(fund => fund.id === h.fundId);
            if (f) { val = f.nav * h.shares; type = f.type; name = f.name; }
        }
        
        const isPeriodic = h.redemptionRule && h.redemptionRule.ruleType === 'MONTHLY';
        return { val, h, type, name, isPeriodic };
    }));

    // Pre-calculate Daily Fund availability (T+1/3/7)
    // These become available on a specific date and stay available
    const alwaysLiquidUnlocks = holdings.filter(item => !item.isPeriodic).map(item => ({
        val: item.val,
        date: calculateAvailabilityDate(today, item.h, item.type)
    }));

    // Calculate Periodic Redemption Windows
    // A periodic fund has multiple open days in a year.
    const periodicOpportunities: {dateStr: string, val: number, desc: string}[] = [];
    
    holdings.filter(item => item.isPeriodic).forEach(item => {
        // Iterate next 12 months for this holding
        const rule = item.h.redemptionRule!;
        if (!rule.openDay) return;

        let checkDate = new Date(today);
        // Find next 13 occurrences
        for(let m=0; m<13; m++) {
            let openDate = new Date(checkDate.getFullYear(), checkDate.getMonth() + m, rule.openDay);
            // If openDate < today, move to next
            if (openDate < today) continue;
            
            // It's an open date. Calculate settlement.
            // Actually, the prompt says "On Open Day... choose to redeem".
            // So the "Opportunity" is on the Open Day itself. The cash arrives later if chosen.
            // But visualizing the Open Day is more actionable. 
            // Let's show the bar ON the Open Day.
            const dateStr = openDate.toISOString().split('T')[0];
            periodicOpportunities.push({
                dateStr,
                val: item.val,
                desc: `${item.name}`
            });
        }
    });

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // 1. Check always-liquid holdings that become available (settled)
        const unlockedToday = alwaysLiquidUnlocks.filter(h => 
            h.date.getDate() === date.getDate() && 
            h.date.getMonth() === date.getMonth() &&
            h.date.getFullYear() === date.getFullYear()
        ).reduce((sum, h) => sum + h.val, 0);

        currentBaseAvailable += unlockedToday;

        // 2. Apply Cash Flows
        const flow = cashFlows.filter(f => f.date === dateStr).reduce((sum, f) => {
            return sum + (f.type === 'INFLOW' ? f.amount : -f.amount);
        }, 0);
        
        currentBaseAvailable += flow;

        // 3. Check for Redemption Opportunities on this day
        const opps = periodicOpportunities.filter(o => o.dateStr === dateStr);
        const oppVal = opps.reduce((sum, o) => sum + o.val, 0);
        const oppDesc = opps.map(o => o.desc).join(', ');

        data.push({
            date: dateStr, // For XAxis
            displayDate: `${date.getMonth()+1}-${date.getDate()}`, // Readable
            available: currentBaseAvailable,
            redemptionOpp: oppVal > 0 ? oppVal : null, // Only show if exists
            oppDesc: oppDesc
        });
    }
    return data;
  }, [portfolio, cashFlows, liquidityData, selectedAccountId]);

  const specificDateProjection = useMemo(() => {
      if (!targetDate) return null;
      return projectionData.find(p => p.date === targetDate);
  }, [targetDate, projectionData]);

  // --- Health Metrics Calculation ---
  const healthMetrics = useMemo(() => {
      const currentCash = liquidityData[LiquidityTier.CASH] + liquidityData[LiquidityTier.HIGH];
      const survivalMonths = monthlyExpenses > 0 ? (currentCash / monthlyExpenses).toFixed(1) : '∞';
      
      let minBalance = Infinity;
      const lowLiquidityDates: {start: string, end: string}[] = [];
      let inLow = false;
      let startLow = '';

      projectionData.forEach(p => {
          if (p.available < minBalance) minBalance = p.available;
          
          if (p.available < monthlyExpenses) {
              if (!inLow) { inLow = true; startLow = p.date; }
          } else {
              if (inLow) { inLow = false; lowLiquidityDates.push({start: startLow, end: p.date}); }
          }
      });
      if (inLow) lowLiquidityDates.push({start: startLow, end: 'Year End'});

      return { survivalMonths, minBalance, lowLiquidityDates };
  }, [liquidityData, monthlyExpenses, projectionData]);

  const addCashFlow = () => {
      if (!planAmount || !planDate) return;
      let finalDesc = planDesc;
      let finalType = planType;

      if (planCategory === 'REDEMPTION' && selectedProductId) {
          const product = currentAccountHoldings.find(p => (p.fundId === selectedProductId || (p.isExternal && p.externalName === selectedProductId))); // Simplified matching
          finalDesc = `[赎回] ${product?.displayName || '未知产品'}`;
          finalType = 'INFLOW';
      } else if (planCategory === 'DIVIDEND' && selectedProductId) {
          const product = currentAccountHoldings.find(p => (p.fundId === selectedProductId || (p.isExternal && p.externalName === selectedProductId)));
          finalDesc = `[分红] ${product?.displayName || '未知产品'}`;
          finalType = 'INFLOW';
      } else if (planCategory === 'INSURANCE') {
          finalDesc = `[保单] ${insuranceName}`;
          finalType = 'OUTFLOW';
      }

      setCashFlows([...cashFlows, {
          id: Date.now().toString(),
          date: planDate,
          amount: parseFloat(planAmount),
          description: finalDesc,
          type: finalType
      }]);
      // Reset
      setPlanAmount(''); setPlanDate(''); setPlanDesc(''); setInsuranceName(''); setSelectedProductId('');
  };

  const barData = [
    { name: 'T+1 (极速)', value: liquidityData[LiquidityTier.CASH] + liquidityData[LiquidityTier.HIGH] },
    { name: 'T+3 (一般)', value: liquidityData[LiquidityTier.CASH] + liquidityData[LiquidityTier.HIGH] + liquidityData[LiquidityTier.MEDIUM] },
    { name: 'T+7 (短期)', value: liquidityData[LiquidityTier.CASH] + liquidityData[LiquidityTier.HIGH] + liquidityData[LiquidityTier.MEDIUM] + liquidityData[LiquidityTier.LOW] },
    { name: 'T+30 (月度)', value: liquidityData['T30'] },
    { name: '全部 (一年)', value: liquidityData['Total'] },
  ];

  const openRuleModal = (accId: string, hIdx: number, h: Holding, name: string) => {
      setEditingRuleContext({ accId, hIdx, hName: name, rule: h.redemptionRule });
      setRuleModalOpen(true);
  };

  const handleCashEdit = (accId: string, currentVal: number) => {
      setEditingCashAccId(accId);
      setTempCashVal(currentVal.toString());
  };

  const saveCashEdit = (accId: string) => {
      updateAccountCash(accId, parseFloat(tempCashVal) || 0);
      setEditingCashAccId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">流动性测算</h1>
            <p className="mt-1 text-sm text-gray-500">资产变现能力与未来资金流压力测试</p>
        </div>
        <div className="w-48">
             <select 
                value={selectedAccountId} 
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
             >
                 <option value="ALL">全部账户资产</option>
                 {portfolio.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
             </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600"/> 资金回笼时间轴 (累积可用)
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{left: 30}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" tickFormatter={val => `¥${(val/10000).toFixed(0)}万`} />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}} />
                        <RechartsTooltip formatter={(val: number) => `¥${val.toLocaleString()}`} />
                        <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
          
          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-600"/> 持仓流动性明细
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[250px] p-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">资产</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">评级/到账</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">配置</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                         {portfolio.accounts.filter(a => selectedAccountId === 'ALL' || a.id === selectedAccountId).map(acc => (
                             <React.Fragment key={acc.id}>
                                <tr className="bg-gray-50/50">
                                    <td colSpan={3} className="px-4 py-1 text-xs font-bold text-gray-500">{acc.name}</td>
                                </tr>
                                {/* Cash Row */}
                                <tr>
                                    <td className="px-4 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div> 现金余额
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        <Badge color="green">T+0 实时</Badge>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {editingCashAccId === acc.id ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <input type="number" className="w-20 text-xs border rounded px-1" value={tempCashVal} onChange={e => setTempCashVal(e.target.value)} />
                                                <button onClick={() => saveCashEdit(acc.id)} className="text-green-600"><CheckCircle2 className="w-4 h-4"/></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleCashEdit(acc.id, acc.cashBalance || 0)} className="text-xs text-indigo-600 hover:underline">
                                                ¥{(acc.cashBalance||0).toLocaleString()} <Edit2 className="w-3 h-3 inline ml-1"/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {acc.holdings.map((h, idx) => {
                                    const name = h.isExternal ? h.externalName || 'Asset' : MOCK_FUNDS.find(f => f.id === h.fundId)?.name;
                                    const type = h.isExternal ? h.externalType || FundType.STRATEGY : MOCK_FUNDS.find(f => f.id === h.fundId)?.type;
                                    const tier = getLiquidityTier(type!);
                                    const today = new Date();
                                    const availDate = calculateAvailabilityDate(today, h, type);
                                    const days = Math.ceil((availDate.getTime() - today.getTime())/(86400000));
                                    
                                    return (
                                        <tr key={`${acc.id}-${idx}`}>
                                            <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-[120px]" title={name}>{name}</td>
                                            <td className="px-4 py-2 text-xs">
                                                <div className="flex flex-col">
                                                    <span>{tier}</span>
                                                    <span className="text-gray-400 font-mono">预计 {days} 天后</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => openRuleModal(acc.id, idx, h, name!)} className="text-gray-400 hover:text-indigo-600">
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                             </React.Fragment>
                         ))}
                    </tbody>
                </table>
            </div>
          </div>
      </div>

      {/* Health Monitor Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600"/> 流动性健康度监控 (压力测试)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-600 font-medium mb-1">预估月支出 (可编辑)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">¥</span>
                    <input 
                        type="number" 
                        value={monthlyExpenses} 
                        onChange={e => setMonthlyExpenses(parseFloat(e.target.value) || 0)} 
                        className="bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-600 w-24 font-mono font-bold text-lg text-indigo-900"
                    />
                  </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="text-xs text-emerald-600 font-medium mb-1">资金生存期 (现有现金)</div>
                  <div className="text-lg font-bold text-emerald-900 flex items-end gap-1">
                      {healthMetrics.survivalMonths} <span className="text-sm font-normal text-emerald-700 mb-0.5">个月</span>
                  </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium mb-1">未来一年最低水位</div>
                  <div className="text-lg font-bold text-blue-900">
                      ¥{(healthMetrics.minBalance / 10000).toFixed(1)}万
                  </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-xs text-red-600 font-medium mb-1">缺口预警 (低于警戒线)</div>
                  <div className="text-sm font-bold text-red-900">
                      {healthMetrics.lowLiquidityDates.length === 0 ? 
                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> 暂无风险</span> : 
                        <span className="flex items-center gap-1 text-red-600"><AlertOctagon className="w-4 h-4"/> {healthMetrics.lowLiquidityDates[0].start} 预警</span>
                      }
                  </div>
              </div>
          </div>

          <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600"/> 未来一年流动性趋势预测</h3>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500">指定日期测算:</span>
                  <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="text-xs border-none bg-transparent focus:ring-0 text-indigo-600 font-medium"/>
              </div>
          </div>

          <div className="h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionData}>
                      <defs>
                          <linearGradient id="colorAvail" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <XAxis dataKey="displayDate" tick={{fontSize: 10}} minTickGap={30} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={val => `${(val/10000).toFixed(0)}w`} tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                        labelFormatter={(label) => `日期: ${label}`}
                        formatter={(val: number, name: string, props: any) => {
                            if (name === 'available') return [`¥${val.toLocaleString()}`, '基础流动性 (确权可用)'];
                            if (name === 'redemptionOpp') return [`¥${val.toLocaleString()}`, `🔴 开放窗口 (可赎回)`];
                            return [val, name];
                        }}
                      />
                      {/* Safety Lines */}
                      <ReferenceLine y={monthlyExpenses} label={{ position: 'right', value: '月支出警戒线', fill: 'red', fontSize: 10 }} stroke="red" strokeDasharray="3 3" opacity={0.5}/>
                      <ReferenceLine y={monthlyExpenses * 6} label={{ position: 'right', value: '6个月安全垫', fill: 'green', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
                      
                      <Area type="monotone" dataKey="available" name="available" stroke="#4f46e5" fillOpacity={1} fill="url(#colorAvail)" />
                      <Bar dataKey="redemptionOpp" name="redemptionOpp" barSize={4} fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </ComposedChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* Planning Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-indigo-600"/> 资金计划录入 (未来收支)</h3>
             
             <div className="space-y-4 mb-6">
                <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">业务类型</label>
                     <select value={planCategory} onChange={e => setPlanCategory(e.target.value as any)} className="w-full text-sm border-gray-300 rounded-md">
                         <option value="GENERIC">通用收支</option>
                         <option value="REDEMPTION">基金赎回</option>
                         <option value="DIVIDEND">基金分红</option>
                         <option value="INSURANCE">保单缴费</option>
                     </select>
                </div>

                {(planCategory === 'REDEMPTION' || planCategory === 'DIVIDEND') && (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">关联持仓产品</label>
                        <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                            <option value="">请选择...</option>
                            {currentAccountHoldings.map((h, i) => (
                                <option key={i} value={h.fundId || h.externalName}>{h.displayName}</option>
                            ))}
                        </select>
                    </div>
                )}

                {planCategory === 'INSURANCE' && (
                     <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">保单名称</label>
                        <input type="text" value={insuranceName} onChange={e => setInsuranceName(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                     </div>
                )}
                
                {planCategory === 'GENERIC' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">流向</label>
                            <div className="flex bg-gray-100 rounded p-1">
                                <button onClick={() => setPlanType('INFLOW')} className={`flex-1 text-xs py-1 rounded ${planType === 'INFLOW' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>流入</button>
                                <button onClick={() => setPlanType('OUTFLOW')} className={`flex-1 text-xs py-1 rounded ${planType === 'OUTFLOW' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>流出</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                            <input type="text" value={planDesc} onChange={e => setPlanDesc(e.target.value)} className="w-full text-sm border-gray-300 rounded-md" placeholder="例如: 奖金"/>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">日期</label>
                        <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">金额 (元)</label>
                        <input type="number" value={planAmount} onChange={e => setPlanAmount(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                    </div>
                </div>

                <button onClick={addCashFlow} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">添加计划</button>
             </div>

             <div className="border-t border-gray-100 pt-4">
                 <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">已录入计划</h4>
                 <div className="space-y-2 max-h-[150px] overflow-y-auto">
                     {cashFlows.map(flow => (
                         <div key={flow.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100">
                             <div>
                                 <div className="font-medium text-gray-900">{flow.description}</div>
                                 <div className="text-gray-500">{flow.date}</div>
                             </div>
                             <div className="text-right">
                                 <div className={`font-mono font-medium ${flow.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                                     {flow.type === 'INFLOW' ? '+' : '-'}{flow.amount.toLocaleString()}
                                 </div>
                                 <button onClick={() => setCashFlows(cashFlows.filter(c => c.id !== flow.id))} className="text-gray-400 hover:text-red-500 mt-1"><Trash2 className="w-3 h-3"/></button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          </div>

      <LiquidityRuleModal 
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        holdingName={editingRuleContext?.hName || ''}
        currentRule={editingRuleContext?.rule}
        onSave={(rule) => editingRuleContext && updateHoldingRule(editingRuleContext.accId, editingRuleContext.hIdx, rule)}
      />
    </div>
  );
};

// --- App Component ---

const App = () => {
  const [patchRules, setPatchRules] = useState<PatchRule[]>([
      // Demo rules for multi-source patching visualization
      { id: 'demo-rule-1', targetFundId: 'demo-1', proxyFundId: '4', startDate: '2025-05-18', endDate: '2025-06-18' }, // Last month using ShangZheng 50
      { id: 'demo-rule-2', targetFundId: 'demo-1', proxyFundId: '7', startDate: '2025-04-18', endDate: '2025-05-17' }  // Month before using ChiNext
  ]);

  const [portfolio, setPortfolio] = useState<ClientPortfolio>(MOCK_PORTFOLIO);

  const addPatchRule = (rule: PatchRule) => setPatchRules([...patchRules, rule]);
  const removePatchRule = (id: string) => setPatchRules(patchRules.filter(r => r.id !== id));

  const addExternalAsset = (accountId: string, holding: Holding) => {
      const newPortfolio = { ...portfolio };
      const account = newPortfolio.accounts.find(a => a.id === accountId);
      if (account) {
          account.holdings.push(holding);
          setPortfolio(newPortfolio);
      }
  };

  const updateHoldingRule = (accId: string, hIdx: number, rule: RedemptionRule) => {
      const newPortfolio = { ...portfolio };
      const account = newPortfolio.accounts.find(a => a.id === accId);
      if (account && account.holdings[hIdx]) {
          account.holdings[hIdx].redemptionRule = rule;
          setPortfolio(newPortfolio);
      }
  };

  const updateAccountCash = (accId: string, amount: number) => {
      const newPortfolio = { ...portfolio };
      const account = newPortfolio.accounts.find(a => a.id === accId);
      if (account) {
          account.cashBalance = amount;
          setPortfolio(newPortfolio);
      }
  };

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<FundListPage />} />
          <Route path="/comparison" element={
            <ComparisonPage 
                patchRules={patchRules} 
                onAddPatchRule={addPatchRule} 
                onRemovePatchRule={removePatchRule} 
            />
          } />
          <Route path="/fund/:id" element={
            <FundDetailPage 
                patchRules={patchRules}
                onAddPatchRule={addPatchRule}
                onRemovePatchRule={removePatchRule}
            />
          } />
          <Route path="/portfolio" element={
            <PortfolioPage 
                portfolio={portfolio} 
                patchRules={patchRules}
                onAddExternalAsset={addExternalAsset}
            />
          } />
          <Route path="/liquidity" element={
            <LiquidityPage 
                portfolio={portfolio}
                updateHoldingRule={updateHoldingRule}
                updateAccountCash={updateAccountCash}
            />
          } />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;