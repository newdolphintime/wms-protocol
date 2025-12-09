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
  AlertOctagon,
  Calendar as CalendarIcon,
  BookOpen
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, AreaChart, Area, ComposedChart, ReferenceLine } from 'recharts';
import { MOCK_FUNDS, MOCK_PORTFOLIO, generateChartData, generateFundHistory, getLiquidityTier, getSettlementDays, calculateAvailabilityDate } from './services/dataService';
import { analyzeFunds } from './services/geminiService';
import ComparisonChart from './components/ComparisonChart';
import { Fund, AnalysisState, FundType, PatchRule, Account, AccountType, LiquidityTier, CashFlow, ClientPortfolio, Holding, RedemptionRule, Frequency } from './types';
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

const FinancialCalendar: React.FC<{ cashFlows: CashFlow[], onDelete?: (id: string) => void }> = ({ cashFlows, onDelete }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weeks = [];
    let day = 1;
    for (let i = 0; i < 6; i++) {
        const week = [];
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < startOffset) {
                week.push(null);
            } else if (day > daysInMonth) {
                week.push(null);
            } else {
                week.push(day);
                day++;
            }
        }
        weeks.push(week);
        if (day > daysInMonth) break;
    }

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    const flowsForDate = (d: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return cashFlows.filter(f => f.date === dateStr);
    };

    const handleDateClick = (d: number) => {
        setSelectedDay(d);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        setSelectedDate(dateStr);
    };

    const selectedFlows = selectedDate ? cashFlows.filter(f => f.date === selectedDate) : [];

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4"/></button>
                <div className="text-sm font-bold text-gray-900">{year}年{month + 1}月</div>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="flex-1">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-7 h-8">
                        {week.map((d, dIdx) => {
                            if (!d) return <div key={dIdx} />;
                            const flows = flowsForDate(d);
                            const hasIn = flows.some(f => f.type === 'INFLOW');
                            const hasOut = flows.some(f => f.type === 'OUTFLOW');
                            const isSelected = selectedDay === d;
                            
                            return (
                                <div 
                                    key={dIdx} 
                                    onClick={() => handleDateClick(d)}
                                    className={`relative flex items-center justify-center cursor-pointer rounded-full hover:bg-gray-50 text-xs text-gray-700 ${isSelected ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-200' : ''}`}
                                >
                                    {d}
                                    <div className="absolute bottom-0.5 flex gap-0.5">
                                        {hasIn && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></div>}
                                        {hasOut && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`}></div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {selectedDate && (
                <div className="mt-3 border-t border-gray-100 pt-2">
                    <div className="text-xs font-bold text-gray-500 mb-1 flex justify-between items-center">
                        <span>{selectedDate} 资金明细</span>
                        <button onClick={() => { setSelectedDate(null); setSelectedDay(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3"/></button>
                    </div>
                    {selectedFlows.length === 0 ? (
                        <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded dashed border border-gray-200">无资金记录</div>
                    ) : (
                        <div className="space-y-1 max-h-[80px] overflow-y-auto">
                            {selectedFlows.map(f => (
                                <div key={f.id} className="flex justify-between items-center text-[10px] bg-gray-50 p-1.5 rounded group">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        {f.recurringRuleId && <Repeat className="w-3 h-3 text-indigo-500 shrink-0"/>}
                                        <span className="truncate max-w-[80px]" title={f.description}>{f.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={f.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}>
                                            {f.type === 'INFLOW' ? '+' : '-'}¥{(f.amount/10000).toFixed(1)}万
                                        </span>
                                        {onDelete && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(f.id); }} 
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="删除"
                                            >
                                                <Trash2 className="w-3 h-3"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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
    const [ruleType, setRuleType] = useState<'DAILY' | 'MONTHLY' | 'FIXED_TERM'>('DAILY');
    const [openDay, setOpenDay] = useState<number>(15);
    const [settlementDays, setSettlementDays] = useState<number>(3);
    const [hasLockup, setHasLockup] = useState(false);
    const [lockupEndDate, setLockupEndDate] = useState('');
    const [maturityDate, setMaturityDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setRuleType(currentRule?.ruleType || 'DAILY');
            setOpenDay(currentRule?.openDay || 15);
            setSettlementDays(currentRule?.settlementDays || 3);
            if (currentRule?.lockupEndDate) {
                setHasLockup(true);
                setLockupEndDate(currentRule.lockupEndDate);
            } else {
                setHasLockup(false);
                setLockupEndDate('');
            }
            if (currentRule?.maturityDate) {
                setMaturityDate(currentRule.maturityDate);
            } else {
                setMaturityDate('');
            }
        }
    }, [isOpen, currentRule]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ 
            ruleType, 
            openDay: ruleType === 'MONTHLY' ? openDay : undefined, 
            settlementDays,
            lockupEndDate: (hasLockup && ruleType !== 'FIXED_TERM') ? lockupEndDate : undefined,
            maturityDate: ruleType === 'FIXED_TERM' ? maturityDate : undefined
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
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
                        <div className="flex flex-col gap-1 bg-gray-100 p-1 rounded-lg">
                            <div className="flex gap-1">
                                <button onClick={() => setRuleType('DAILY')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${ruleType === 'DAILY' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>每日开放 (标准)</button>
                                <button onClick={() => setRuleType('MONTHLY')} className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${ruleType === 'MONTHLY' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>定期开放 (信托)</button>
                            </div>
                            <button onClick={() => setRuleType('FIXED_TERM')} className={`w-full text-xs py-1.5 font-medium rounded-md transition-all ${ruleType === 'FIXED_TERM' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>类信托/固收 (到期自动赎回)</button>
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
                    {ruleType === 'FIXED_TERM' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">到期/终止日</label>
                            <input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                            <p className="text-[10px] text-gray-500 mt-1">资金将在到期后自动赎回，无需手动操作。</p>
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

                    {ruleType !== 'FIXED_TERM' && (
                        <div className="border-t border-gray-100 pt-3">
                             <div className="flex items-center gap-2 mb-2">
                                 <input type="checkbox" id="lockupCheck" checked={hasLockup} onChange={e => setHasLockup(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                 <label htmlFor="lockupCheck" className="text-sm font-medium text-gray-700">配置锁定期 (如持有满N天才可赎回)</label>
                             </div>
                             {hasLockup && (
                                <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                    <label className="block text-xs font-medium text-amber-800 mb-1">锁定期截止日</label>
                                    <input type="date" value={lockupEndDate} onChange={e => setLockupEndDate(e.target.value)} className="w-full text-sm border-amber-200 rounded-md focus:ring-amber-500 focus:border-amber-500"/>
                                    <p className="text-[10px] text-amber-600 mt-1">在此日期前不支持赎回，之后按{ruleType === 'MONTHLY' ? '每月开放' : '每日开放'}规则执行。</p>
                                </div>
                             )}
                        </div>
                    )}

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

const LiquidityRulesCard: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600"/> 流动性测算规则说明
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">现金/活期</span>
                        <span>T+0 实时可用，直接计入可用资金。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="bg-green-100 text-green-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">标准资产</span>
                        <span>每日开放赎回，在 T+N 结算期结束后计入可用资金。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="bg-amber-100 text-amber-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">定期开放</span>
                        <span>
                            非开放期锁定。需在"现金流规划"中手动录入赎回计划，资金将于<span className="font-mono text-gray-800">计划日期 + 结算期</span>后计入可用。
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                        <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">固定期限</span>
                        <span>到期日自动赎回，资金于<span className="font-mono text-gray-800">到期日 + 结算期</span>后自动计入可用，无需手动操作。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="bg-red-100 text-red-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">锁定期</span>
                        <span>资产在锁定期截止前不可赎回，解禁后按其开放规则执行。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="bg-gray-100 text-gray-700 px-1.5 rounded text-xs font-medium whitespace-nowrap mt-0.5">赎回结算</span>
                        <span>所有赎回操作均考虑 T+N 资金在途时间，确保预测真实到账日期。</span>
                    </div>
                </div>
            </div>
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
              <tr key={fund.id} onClick={() => toggleFund(fund.id)} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedFunds.has(fund.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" checked={selectedFunds.has(fund.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleFund(fund.id)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"/>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <Link to={`/fund/${fund.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">{fund.name}</Link>
                    <span className="text-xs text-gray-500 font-mono">{fund.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{fund.inceptionDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{fund.nav.toFixed(4)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`font-medium ${fund.dayChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fund.dayChange > 0 ? '+' : ''}{fund.dayChange}%</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`font-medium ${fund.ytdReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fund.ytdReturn > 0 ? '+' : ''}{fund.ytdReturn}%</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/fund/${fund.id}`} onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"><Search className="w-3 h-3"/> 详情</Link>
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
  const [planShares, setPlanShares] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planType, setPlanType] = useState<'INFLOW'|'OUTFLOW'>('OUTFLOW');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [insuranceName, setInsuranceName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Recurring Settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [recurCount, setRecurCount] = useState<number>(12);

  // Rules Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleContext, setEditingRuleContext] = useState<{accId: string, hIdx: number, hName: string, rule?: RedemptionRule} | null>(null);

  // Cash Editing
  const [editingCashAccId, setEditingCashAccId] = useState<string | null>(null);
  const [tempCashVal, setTempCashVal] = useState('');

  const currentAccountHoldings = useMemo(() => {
    const accs = selectedAccountId === 'ALL' ? portfolio.accounts : portfolio.accounts.filter(a => a.id === selectedAccountId);
    return accs.flatMap(a => a.holdings.map((h, index) => {
        const name = h.isExternal ? h.externalName : MOCK_FUNDS.find(f => f.id === h.fundId)?.name;
        // IMPORTANT: We must track the original index in the account's holdings array to update it correctly
        return { 
            ...h, 
            displayName: name, 
            accountId: a.id, 
            originalIndex: index,
            uniqueKey: `${a.id}_${index}` // Unique key for linking cashflows
        };
    }));
  }, [portfolio, selectedAccountId]);

  // Helper for selected product details
  const selectedHoldingData = useMemo(() => {
    if (!selectedProductId) return null;
    const holding = currentAccountHoldings.find(h => h.uniqueKey === selectedProductId);
    if (!holding) return null;

    let nav = 0;
    let navDate = new Date().toISOString().split('T')[0]; // Default to today for internal

    if (holding.isExternal) {
        nav = holding.externalNav || 0;
        navDate = holding.externalNavDate || navDate;
    } else {
        const fund = MOCK_FUNDS.find(f => f.id === holding.fundId);
        nav = fund?.nav || 0;
    }
    
    return { ...holding, currentNav: nav, currentNavDate: navDate };
  }, [selectedProductId, currentAccountHoldings]);

  // Validation Logic for Redemption
  useEffect(() => {
    if (planCategory === 'REDEMPTION' && selectedProductId && planDate) {
        const holding = currentAccountHoldings.find(h => h.uniqueKey === selectedProductId);
        if (holding && holding.redemptionRule) {
             const dateObj = new Date(planDate);
             dateObj.setHours(0,0,0,0);
             
             // Check Lockup
             if (holding.redemptionRule.lockupEndDate && holding.redemptionRule.ruleType !== 'FIXED_TERM') {
                 const lockupEnd = new Date(holding.redemptionRule.lockupEndDate);
                 lockupEnd.setHours(0,0,0,0);
                 if (dateObj.getTime() < lockupEnd.getTime()) {
                     setValidationError(`产品处于锁定期（至${holding.redemptionRule.lockupEndDate}），无法赎回`);
                     return;
                 }
             }
             
             // Check Fixed Term (Should not manually redeem fixed term generally, but if forced?)
             // For now assume standard validation applies if they try.
             if (holding.redemptionRule.ruleType === 'FIXED_TERM' && holding.redemptionRule.maturityDate) {
                  const maturity = new Date(holding.redemptionRule.maturityDate);
                  maturity.setHours(0,0,0,0);
                  if (dateObj.getTime() < maturity.getTime()) {
                      setValidationError(`固定期限产品未到期（到期日${holding.redemptionRule.maturityDate}），无法提前赎回`);
                      return;
                  }
             }

             // Check Monthly Open Day
             if (holding.redemptionRule.ruleType === 'MONTHLY') {
                const day = dateObj.getDate();
                if (day !== holding.redemptionRule.openDay) {
                     setValidationError(`该产品仅在每月 ${holding.redemptionRule.openDay} 日开放赎回`);
                     return;
                }
             }
        }
    }
    setValidationError(null);
  }, [planCategory, selectedProductId, planDate, currentAccountHoldings]);

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
    const days = 30; // One month range
    const data = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Initial Cash
    let currentCash = liquidityData[LiquidityTier.CASH];
    
    // Create a map to track redemption cumulative amounts per holding
    // Map<uniqueKey, amount>
    const redeemedAmounts = new Map<string, number>();

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a,b) => a.date.localeCompare(b.date));

    // Pre-calculate the arrival date for all holdings relative to TODAY
    // This answers: "If I start the liquidation process NOW, when does the money arrive?"
    const holdingsWithArrival = currentAccountHoldings.map(h => {
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
        
        // Calculate arrival date based on TODAY
        const arrivalDate = calculateAvailabilityDate(today, h, type);
        arrivalDate.setHours(0,0,0,0);
        
        return { 
            ...h, 
            value: val, 
            arrivalDate: arrivalDate,
            uniqueKey: h.uniqueKey
        };
    });

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        date.setHours(0,0,0,0);
        
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = `${date.getMonth()+1}-${date.getDate()}`;

        // Process flows for this day
        const dailyFlows = sortedFlows.filter(f => f.date === dateStr);
        const inflow = dailyFlows.filter(f => f.type === 'INFLOW').reduce((sum, f) => sum + f.amount, 0);
        const outflow = dailyFlows.filter(f => f.type === 'OUTFLOW').reduce((sum, f) => sum + f.amount, 0);

        dailyFlows.forEach(f => {
            if (f.relatedHoldingKey && f.type === 'INFLOW') {
                const currentRedeemed = redeemedAmounts.get(f.relatedHoldingKey) || 0;
                redeemedAmounts.set(f.relatedHoldingKey, currentRedeemed + f.amount);
            }
        });

        currentCash = currentCash + inflow - outflow;

        // Determine Liquidity Status for each asset on this specific projection day
        let liquidAssetsFromHoldings = 0;
        let lockedAssets = 0;
        const lockedDetailsList: { name: string; value: number; reason: string }[] = [];

        holdingsWithArrival.forEach(h => {
            // Subtract redeemed amount
            const redeemed = redeemedAmounts.get(h.uniqueKey) || 0;
            const remainingVal = Math.max(0, h.value - redeemed);

            if (remainingVal > 0) {
                const isPeriodic = h.redemptionRule?.ruleType === 'MONTHLY';
                const hasLockup = !!h.redemptionRule?.lockupEndDate;
                const isFixedTerm = h.redemptionRule?.ruleType === 'FIXED_TERM';

                // Logic update: Periodic assets do not auto-unlock.
                // Fixed Term (Auto Redeem) should auto-unlock when arrival date passed.
                // Standard (Daily) should auto-unlock when arrival date passed.
                
                // So: Unlock if (NOT Periodic OR is Fixed Term) AND date >= arrival
                // Wait, Fixed Term behaves like Standard in that it has a definite arrival date.
                // Periodic is the one that stays locked indefinitely until plan.
                
                if (!isPeriodic && date.getTime() >= h.arrivalDate.getTime()) {
                    liquidAssetsFromHoldings += remainingVal;
                } else {
                    lockedAssets += remainingVal;
                    
                    let reason = "";
                    const diffTime = h.arrivalDate.getTime() - date.getTime();
                    const daysUntilArrival = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Specific Logic for Reason Text
                    if (isFixedTerm && h.redemptionRule?.maturityDate) {
                        reason = `持有至到期 (到期日: ${h.redemptionRule.maturityDate})`;
                    } else if (hasLockup) {
                        const lockupEnd = new Date(h.redemptionRule!.lockupEndDate!);
                        lockupEnd.setHours(0,0,0,0);
                        if (date.getTime() < lockupEnd.getTime()) {
                            reason = `处于锁定期 (至 ${h.redemptionRule!.lockupEndDate})`;
                        }
                    }

                    if (!reason) {
                        if (isPeriodic) {
                             const settlementDays = h.redemptionRule?.settlementDays || 0;
                             const openDate = new Date(h.arrivalDate);
                             openDate.setDate(openDate.getDate() - settlementDays);
                             
                             if (date.getTime() < openDate.getTime()) {
                                 // Before open date
                                 reason = `非开放期 (每月${h.redemptionRule?.openDay}日)`;
                             } else {
                                 // After open date, during settlement relative to TODAY's calculation
                                 reason = `赎回结算中 (T+${Math.max(0, daysUntilArrival)})`;
                             }
                        } else {
                            reason = `赎回结算中 (T+${Math.max(0, daysUntilArrival)})`;
                        }
                    }
    
                    lockedDetailsList.push({
                        name: h.displayName || '未知资产',
                        value: remainingVal,
                        reason: reason
                    });
                }
            }
        });

        // Sort details by value desc
        lockedDetailsList.sort((a, b) => b.value - a.value);

        data.push({
            date: dateStr, 
            displayDate: displayDate,
            liquid: currentCash + liquidAssetsFromHoldings, // Cash + Settled Assets
            locked: lockedAssets, // Assets still in waiting period
            expense: -outflow,
            rawExpense: outflow,
            lockedBreakdown: lockedDetailsList
        });
    }
    return data;
  }, [portfolio, cashFlows, liquidityData, selectedAccountId, currentAccountHoldings]);

  const lockedDetails = useMemo(() => {
    const list: { name: string; value: number; reason: string }[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const accountsToAnalyze =
      selectedAccountId === 'ALL'
        ? portfolio.accounts
        : portfolio.accounts.filter((a) => a.id === selectedAccountId);

    accountsToAnalyze.forEach((account) => {
      account.holdings.forEach((h) => {
        let val = 0;
        let type = FundType.STRATEGY;
        let name = '';

        if (h.isExternal) {
          val = (h.externalNav || 0) * h.shares;
          type = h.externalType || FundType.STRATEGY;
          name = h.externalName || '未命名资产';
        } else {
          const f = MOCK_FUNDS.find((fund) => fund.id === h.fundId);
          if (f) {
            val = f.nav * h.shares;
            type = f.type;
            name = f.name;
          }
        }

        // Calculate arrival based on TODAY
        const availableDate = calculateAvailabilityDate(today, h, type);
        availableDate.setHours(0,0,0,0);

        // If today is NOT >= availableDate, then it's Locked
        if (today.getTime() < availableDate.getTime()) {
             const diffTime = availableDate.getTime() - today.getTime();
             const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

             let reason = `预计T+${days}可用`;
             
             // Check Fixed Term
             if (h.redemptionRule?.ruleType === 'FIXED_TERM' && h.redemptionRule.maturityDate) {
                 reason = `到期自动赎回 (到期日: ${h.redemptionRule.maturityDate})`;
             }
             // Check Lockup First
             else if (h.redemptionRule?.lockupEndDate) {
                 const lockupEnd = new Date(h.redemptionRule.lockupEndDate);
                 lockupEnd.setHours(0,0,0,0);
                 if (today.getTime() < lockupEnd.getTime()) {
                     reason = `处于锁定期 (至 ${h.redemptionRule.lockupEndDate})`;
                 } else if (h.redemptionRule?.ruleType === 'MONTHLY') {
                     // Standard Monthly logic if lockup passed
                     const settlementDays = h.redemptionRule.settlementDays;
                     const openDate = new Date(availableDate);
                     openDate.setDate(openDate.getDate() - settlementDays);
                     
                     if (today.getTime() < openDate.getTime()) {
                         reason = `非开放期 (每月${h.redemptionRule.openDay}日开放)`;
                     } else {
                         reason = `赎回结算中 (T+${days})`;
                     }
                 }
             } else if (h.redemptionRule?.ruleType === 'MONTHLY') {
                 const settlementDays = h.redemptionRule.settlementDays;
                 const openDate = new Date(availableDate);
                 openDate.setDate(openDate.getDate() - settlementDays);
                 
                 if (today.getTime() < openDate.getTime()) {
                     reason = `非开放期 (每月${h.redemptionRule.openDay}日开放)`;
                 } else {
                     reason = `赎回结算中 (T+${days})`;
                 }
             }
             list.push({ name, value: val, reason });
        }
      });
    });
    return list.sort((a, b) => b.value - a.value);
  }, [portfolio, selectedAccountId]);

  // --- Health Metrics Calculation ---
  const healthMetrics = useMemo(() => {
      const currentCash = liquidityData[LiquidityTier.CASH] + liquidityData[LiquidityTier.HIGH];
      const survivalMonths = monthlyExpenses > 0 ? (currentCash / monthlyExpenses).toFixed(1) : '∞';
      
      let minBalance = Infinity;
      const lowLiquidityDates: {start: string, end: string}[] = [];
      let inLow = false;
      let startLow = '';

      projectionData.forEach(p => {
          if (p.liquid < minBalance) minBalance = p.liquid; // Compare against liquid assets
          
          if (p.liquid < monthlyExpenses) {
              if (!inLow) { inLow = true; startLow = p.date; }
          } else {
              if (inLow) { inLow = false; lowLiquidityDates.push({start: startLow, end: p.date}); }
          }
      });
      if (inLow) lowLiquidityDates.push({start: startLow, end: 'Period End'});

      return { survivalMonths, minBalance, lowLiquidityDates };
  }, [liquidityData, monthlyExpenses, projectionData]);

  const addCashFlow = () => {
      // Input Validation
      if (planCategory === 'REDEMPTION') {
        if (!planShares || !planDate) return;
      } else {
        if (!planAmount || !planDate) return;
      }
      if (validationError) return; // Block if error

      let finalAmount = 0;
      let finalDesc = planDesc;
      let finalType = planType;
      // Capture the selected product ID (uniqueKey) for linking
      const relatedKey = (planCategory === 'REDEMPTION' || planCategory === 'DIVIDEND') ? selectedProductId : undefined;

      // Settlement delay logic
      let settlementDays = 0;

      if (planCategory === 'REDEMPTION' && selectedHoldingData) {
          // Calculate amount based on shares and current nav
          finalAmount = Number(planShares) * selectedHoldingData.currentNav;
          finalDesc = `[赎回] ${selectedHoldingData.displayName} (${planShares}份)`;
          finalType = 'INFLOW';

          // Determine settlement days
          if (selectedHoldingData.redemptionRule) {
             settlementDays = selectedHoldingData.redemptionRule.settlementDays;
          } else {
             // Fallback default logic
             let type = FundType.STRATEGY;
             if (selectedHoldingData.isExternal) {
                 type = selectedHoldingData.externalType || FundType.STRATEGY;
             } else {
                 const f = MOCK_FUNDS.find(fund => fund.id === selectedHoldingData.fundId);
                 if (f) type = f.type;
             }
             const tier = getLiquidityTier(type);
             settlementDays = getSettlementDays(tier);
          }

      } else if (planCategory === 'DIVIDEND' && selectedHoldingData) {
          finalAmount = Number(planAmount);
          finalDesc = `[分红] ${selectedHoldingData.displayName}`;
          finalType = 'INFLOW';
      } else if (planCategory === 'INSURANCE') {
          finalAmount = Number(planAmount);
          finalDesc = `[保单] ${insuranceName}`;
          finalType = 'OUTFLOW';
      } else {
          finalAmount = Number(planAmount);
      }

      // Helper to shift date
      const shiftDate = (baseDateStr: string, days: number) => {
          if (days === 0) return baseDateStr;
          const d = new Date(baseDateStr);
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
      };
      
      const descriptionWithDelay = settlementDays > 0 ? `${finalDesc} (预计T+${settlementDays}到账)` : finalDesc;

      const newFlows: CashFlow[] = [];
      const ruleId = isRecurring ? Date.now().toString() : undefined;
      
      if (isRecurring) {
          // Generate multiple flows
          const [startYear, startMonth, startDay] = planDate.split('-').map(Number);
          
          for(let i = 0; i < recurCount; i++) {
              const current = new Date(startYear, startMonth - 1, startDay);
              
              if (recurFrequency === Frequency.MONTHLY) {
                  current.setMonth(current.getMonth() + i);
              } else if (recurFrequency === Frequency.QUARTERLY) {
                  current.setMonth(current.getMonth() + (i * 3));
              } else if (recurFrequency === Frequency.YEARLY) {
                  current.setFullYear(current.getFullYear() + i);
              }
              
              const baseDateStr = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
              // Apply settlement delay to effective cash flow date
              const effectiveDate = shiftDate(baseDateStr, settlementDays);

              newFlows.push({
                  id: `${ruleId}_${i}`,
                  date: effectiveDate,
                  amount: Number(finalAmount),
                  description: descriptionWithDelay,
                  type: finalType,
                  recurringRuleId: ruleId,
                  relatedHoldingKey: relatedKey
              });
          }
      } else {
          // Single
          // Apply settlement delay to effective cash flow date
          const effectiveDate = shiftDate(planDate, settlementDays);

          newFlows.push({
              id: Date.now().toString(),
              date: effectiveDate,
              amount: Number(finalAmount),
              description: descriptionWithDelay,
              type: finalType,
              relatedHoldingKey: relatedKey
          });
      }
      setCashFlows([...cashFlows, ...newFlows]);
      // Reset form
      setPlanAmount('');
      setPlanShares('');
      setPlanDate('');
      setPlanDesc('');
      setIsRecurring(false);
  };

  const handleDeleteCashFlow = (id: string) => {
      setCashFlows(current => current.filter(item => item.id !== id));
  };

  const openRuleModal = (accId: string, hIdx: number, hName: string, rule?: RedemptionRule) => {
      setEditingRuleContext({accId, hIdx, hName, rule});
      setRuleModalOpen(true);
  };

  const handleSaveRule = (rule: RedemptionRule) => {
      if (editingRuleContext) {
          updateHoldingRule(editingRuleContext.accId, editingRuleContext.hIdx, rule);
      }
  };

  // Derived values for summary cards
  const currentAvailable = liquidityData[LiquidityTier.CASH];
  const currentLocked = liquidityData['Total'] - currentAvailable;
  const totalProjectedExpense = useMemo(() => projectionData.reduce((sum, p) => sum + (p.rawExpense || 0), 0), [projectionData]);

  // Custom Tooltip Component for Chart
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const liquid = data.liquid;
      const locked = data.locked;
      const expense = Math.abs(data.rawExpense);
      const lockedBreakdown = data.lockedBreakdown || [];

      return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[280px] text-sm">
             <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                <span className="font-bold text-gray-900">{label} (日期)</span>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">预测详情</span>
            </div>
            <div className="space-y-3">
                 <div className="flex justify-between items-center">
                     <span className="text-gray-500 flex items-center gap-1"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div>可用流动性</span>
                     <span className="font-mono font-bold text-gray-900">¥ {liquid.toLocaleString()}</span>
                 </div>
                 
                 <div className="flex flex-col gap-1">
                     <div className="flex justify-between items-center">
                         <span className="text-gray-500 flex items-center gap-1"><div className="w-2 h-2 bg-slate-300 rounded-full"></div>锁定流动性</span>
                         <span className="font-mono font-medium text-gray-600">¥ {locked.toLocaleString()}</span>
                     </div>
                     {lockedBreakdown.length > 0 && (
                         <div className="bg-gray-50 rounded p-2 mt-1 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar border border-gray-100">
                             {lockedBreakdown.map((item: any, idx: number) => (
                                 <div key={idx} className="flex justify-between items-start text-xs">
                                     <span className="text-gray-600 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                     <div className="text-right">
                                         <div className="font-mono text-gray-700">¥{(item.value/10000).toFixed(1)}万</div>
                                         <div className="text-[10px] text-gray-400 scale-90 origin-right">{item.reason}</div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {expense > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-red-600">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div>当日支出</span>
                        <span className="font-mono font-bold">- ¥ {expense.toLocaleString()}</span>
                    </div>
                 )}
            </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">流动性测算</h1>
            <select 
                value={selectedAccountId} 
                onChange={e => setSelectedAccountId(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
            >
                <option value="ALL">全部账户资产</option>
                {portfolio.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative group cursor-help transition-shadow hover:shadow-md">
                <div>
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        当前现金储备 (T+0)
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 font-mono">¥ {currentAvailable.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-full text-green-600"><Wallet className="w-6 h-6"/></div>
                
                {/* Floating Detail Window */}
                <div className="absolute top-full left-0 mt-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-30 hidden group-hover:block">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                        <span className="font-bold text-sm text-gray-900">资金构成明细</span>
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">实时</span>
                    </div>
                    <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-gray-500">可用流动性</span>
                             <span className="font-mono font-bold text-gray-900">¥ {currentAvailable.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                             <div className="flex justify-between items-center text-sm">
                                 <span className="text-gray-500">锁定流动性</span>
                                 <span className="font-mono font-medium text-gray-600">¥ {currentLocked.toLocaleString()}</span>
                             </div>
                             {lockedDetails.length > 0 && (
                                 <div className="bg-gray-50 rounded p-2 mt-1 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                     {lockedDetails.map((item, idx) => (
                                         <div key={idx} className="flex justify-between items-start text-xs">
                                             <span className="text-gray-600 truncate max-w-[100px]" title={item.name}>{item.name}</span>
                                             <div className="text-right">
                                                 <div className="font-mono text-gray-700">¥{(item.value/10000).toFixed(1)}万</div>
                                                 <div className="text-[10px] text-gray-400 scale-90 origin-right">{item.reason}</div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                         <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50 text-red-600">
                             <span>预计支出 (30天)</span>
                             <span className="font-mono font-bold">- ¥ {totalProjectedExpense.toLocaleString()}</span>
                         </div>
                    </div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500 mb-1">生存期估算 (基于月支出)</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{healthMetrics.survivalMonths}</span>
                        <span className="text-sm text-gray-500">个月</span>
                    </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Clock className="w-6 h-6"/></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500 mb-1">流动性健康状态</div>
                    {healthMetrics.lowLiquidityDates.length === 0 ? (
                        <div className="flex items-center gap-1 text-green-600 font-bold"><ShieldCheck className="w-5 h-5"/> 健康</div>
                    ) : (
                        <div className="flex items-center gap-1 text-orange-600 font-bold"><AlertOctagon className="w-5 h-5"/> 有风险</div>
                    )}
                </div>
                <div className={`p-3 rounded-full ${healthMetrics.lowLiquidityDates.length === 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    <Activity className="w-6 h-6"/>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2 space-y-6">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            流动性趋势预测 (30天)
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-600 rounded-sm"></div> 可用资金</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> 锁定流动性</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> 预计支出</span>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectionData} margin={{top: 10, right: 10, left: 0, bottom: 0}} stackOffset="sign">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis dataKey="displayDate" tick={{fontSize: 10}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={30}/>
                                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    content={<CustomChartTooltip />}
                                />
                                <ReferenceLine y={0} stroke="#94a3b8" />
                                <Bar dataKey="liquid" stackId="a" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="locked" stackId="a" fill="#cbd5e1" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="expense" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Tools Panel */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-indigo-600"/> 现金流规划工具</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Left: Input Form */}
                         <div className="space-y-4">
                             <div className="flex bg-gray-100 p-1 rounded-lg">
                                 <button onClick={() => { setPlanCategory('GENERIC'); setPlanType('OUTFLOW'); }} className={`flex-1 text-xs py-2 font-medium rounded-md transition-all ${planCategory === 'GENERIC' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>通用收支</button>
                                 <button onClick={() => { setPlanCategory('REDEMPTION'); setPlanType('INFLOW'); }} className={`flex-1 text-xs py-2 font-medium rounded-md transition-all ${planCategory === 'REDEMPTION' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>产品赎回</button>
                                 <button onClick={() => { setPlanCategory('DIVIDEND'); setPlanType('INFLOW'); }} className={`flex-1 text-xs py-2 font-medium rounded-md transition-all ${planCategory === 'DIVIDEND' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>分红到账</button>
                             </div>

                             {planCategory === 'GENERIC' && (
                                 <div className="flex gap-2">
                                     <select value={planType} onChange={e => setPlanType(e.target.value as any)} className="w-1/3 text-sm border-gray-300 rounded-md">
                                         <option value="INFLOW">收入 (+)</option>
                                         <option value="OUTFLOW">支出 (-)</option>
                                     </select>
                                     <input type="text" placeholder="描述 (如: 年终奖)" value={planDesc} onChange={e => setPlanDesc(e.target.value)} className="w-2/3 text-sm border-gray-300 rounded-md"/>
                                 </div>
                             )}

                             {(planCategory === 'REDEMPTION' || planCategory === 'DIVIDEND') && (
                                 <div>
                                     <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                         <option value="">选择关联产品...</option>
                                         {currentAccountHoldings.map((h, i) => (
                                             <option key={h.uniqueKey} value={h.uniqueKey}>{h.displayName} ({h.shares}份)</option>
                                         ))}
                                     </select>
                                     {validationError && (
                                        <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {validationError}
                                        </div>
                                     )}
                                 </div>
                             )}
                             
                             {planCategory === 'REDEMPTION' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            赎回份额 <span className="text-gray-400">(持有: {selectedHoldingData?.shares ?? 0}份)</span>
                                        </label>
                                        <input 
                                            type="number" 
                                            value={planShares} 
                                            onChange={e => setPlanShares(e.target.value)} 
                                            className="w-full text-sm border-gray-300 rounded-md"
                                            placeholder="请输入份额"
                                        />
                                    </div>
                                    
                                    {selectedHoldingData && (
                                         <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg space-y-2">
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>最新净值 ({selectedHoldingData.currentNavDate})</span>
                                                <span className="font-mono font-medium">{selectedHoldingData.currentNav.toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-indigo-100 pt-2">
                                                <span className="text-xs font-bold text-indigo-900">预计赎回金额</span>
                                                <span className="text-sm font-bold text-indigo-700 font-mono">
                                                    ¥ {((Number(planShares) || 0) * selectedHoldingData.currentNav).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </span>
                                            </div>
                                         </div>
                                    )}

                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">发生日期</label>
                                        <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                    </div>
                                </div>
                             ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">金额</label>
                                        <input type="number" value={planAmount} onChange={e => setPlanAmount(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">发生日期</label>
                                        <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                    </div>
                                </div>
                             )}

                             <div className="border-t border-gray-100 pt-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" id="recurCheck" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                    <label htmlFor="recurCheck" className="text-sm text-gray-700">设为周期性事件</label>
                                </div>
                                {isRecurring && (
                                    <div className="flex gap-2 bg-gray-50 p-2 rounded-lg">
                                        <select value={recurFrequency} onChange={e => setRecurFrequency(e.target.value as Frequency)} className="text-xs border-gray-300 rounded-md">
                                            <option value={Frequency.MONTHLY}>每月</option>
                                            <option value={Frequency.QUARTERLY}>每季</option>
                                            <option value={Frequency.YEARLY}>每年</option>
                                        </select>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">共</span>
                                            <input type="number" value={recurCount} onChange={e => setRecurCount(Number(e.target.value))} className="w-12 text-xs border-gray-300 rounded-md"/>
                                            <span className="text-xs text-gray-500">次</span>
                                        </div>
                                    </div>
                                )}
                             </div>

                             <button 
                                onClick={addCashFlow} 
                                disabled={!!validationError}
                                className={`w-full text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${validationError ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                             >
                                 <Plus className="w-4 h-4"/> 添加至预测
                             </button>
                         </div>
                         {/* Right: Calendar View */}
                         <div className="bg-white rounded-lg border border-gray-200 h-[300px] p-2">
                             <FinancialCalendar cashFlows={cashFlows} onDelete={handleDeleteCashFlow} />
                         </div>
                     </div>

                     {/* Cash Flow List Table */}
                     <div className="mt-6 border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-gray-900">规划资金明细</h4>
                            <span className="text-xs text-gray-500">共 {cashFlows.length} 条记录</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                {cashFlows.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">
                                        暂无资金规划记录，请在上方添加
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">说明</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">金额</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {cashFlows.sort((a,b) => a.date.localeCompare(b.date)).map(flow => (
                                                <tr key={flow.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-4 py-2 text-xs text-gray-600 font-mono whitespace-nowrap">{flow.date}</td>
                                                    <td className="px-4 py-2 text-xs">
                                                        <span className={`px-1.5 py-0.5 rounded border ${flow.type === 'INFLOW' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                            {flow.type === 'INFLOW' ? '收入' : '支出'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-gray-900 max-w-[200px] truncate" title={flow.description}>{flow.description}</td>
                                                    <td className={`px-4 py-2 text-xs font-mono font-medium text-right ${flow.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {flow.type === 'INFLOW' ? '+' : '-'} {flow.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteCashFlow(flow.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                                                            title="删除"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                     </div>
                 </div>

                 {/* Liquidity Rules Explanation Card */}
                 <LiquidityRulesCard />
            </div>

            {/* Right Sidebar: Asset List & Config */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-bold text-gray-900">资产流动性配置</h3>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                        {currentAccountHoldings.map((h, idx) => {
                            let nav = 0;
                            let navDate = '';
                            
                            if (h.isExternal) {
                                nav = h.externalNav || 0;
                                navDate = h.externalNavDate || '未知日期';
                            } else {
                                const f = MOCK_FUNDS.find(fund => fund.id === h.fundId);
                                if (f) {
                                    nav = f.nav;
                                    navDate = new Date().toISOString().split('T')[0];
                                }
                            }
                            const amount = nav * h.shares;

                            return (
                                <div key={idx} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">{h.displayName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {h.isExternal ? '外部资产' : '公募基金'} · {h.redemptionRule ? (h.redemptionRule.ruleType === 'MONTHLY' ? '定期开放' : (h.redemptionRule.ruleType === 'FIXED_TERM' ? '到期自动赎回' : '每日开放')) : '默认规则'}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => openRuleModal(h.accountId, (h as any).originalIndex, h.displayName || '', h.redemptionRule)}
                                            className="text-indigo-600 hover:text-indigo-800 p-1 bg-indigo-50 rounded"
                                        >
                                            <Settings className="w-4 h-4"/>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2 bg-gray-50/50 p-2 rounded border border-gray-100">
                                        <div>
                                            <span className="text-gray-500 block">持有份额</span>
                                            <span className="font-mono text-gray-700">{h.shares.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">持仓金额</span>
                                            <span className="font-mono font-medium text-gray-900">¥{(amount/10000).toFixed(2)}万</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">最新净值</span>
                                            <span className="font-mono text-gray-700">{nav.toFixed(4)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">净值日期</span>
                                            <span className="font-mono text-gray-700">{navDate}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                            T+{h.redemptionRule?.settlementDays ?? getSettlementDays(h.isExternal ? (h.externalType ? getLiquidityTier(h.externalType) : LiquidityTier.MEDIUM) : (h.fundId ? getLiquidityTier(MOCK_FUNDS.find(f=>f.id===h.fundId)?.type!) : LiquidityTier.MEDIUM))}
                                        </span>
                                        {h.redemptionRule?.ruleType === 'MONTHLY' && (
                                            <span className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-700 border border-amber-100">
                                                每月{h.redemptionRule.openDay}日开放
                                            </span>
                                        )}
                                        {h.redemptionRule?.ruleType === 'FIXED_TERM' && (
                                            <span className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-700 border border-purple-100">
                                                {h.redemptionRule.maturityDate} 到期
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        <LiquidityRuleModal 
            isOpen={ruleModalOpen}
            onClose={() => setRuleModalOpen(false)}
            holdingName={editingRuleContext?.hName || ''}
            currentRule={editingRuleContext?.rule}
            onSave={handleSaveRule}
        />
    </div>
  );
};

const App: React.FC = () => {
  const [patchRules, setPatchRules] = useState<PatchRule[]>([]);
  const [portfolio, setPortfolio] = useState<ClientPortfolio>(MOCK_PORTFOLIO);

  const addPatchRule = (rule: PatchRule) => {
    setPatchRules([...patchRules, rule]);
  };

  const removePatchRule = (id: string) => {
    setPatchRules(patchRules.filter(r => r.id !== id));
  };

  const addExternalAsset = (accountId: string, holding: Holding) => {
      const newPortfolio = { ...portfolio };
      const account = newPortfolio.accounts.find(a => a.id === accountId);
      if (account) {
          // Clone account and holdings to trigger update
          const newAccount = { ...account, holdings: [...account.holdings, holding] };
          newPortfolio.accounts = newPortfolio.accounts.map(a => a.id === accountId ? newAccount : a);
          setPortfolio(newPortfolio);
      }
  };

  const updateHoldingRule = (accId: string, holdingIdx: number, rule: RedemptionRule) => {
      const newPortfolio = { ...portfolio };
      const account = newPortfolio.accounts.find(a => a.id === accId);
      if (account && account.holdings[holdingIdx]) {
          const newAccount = { ...account, holdings: [...account.holdings] };
          newAccount.holdings[holdingIdx] = { ...newAccount.holdings[holdingIdx], redemptionRule: rule };
           newPortfolio.accounts = newPortfolio.accounts.map(a => a.id === accId ? newAccount : a);
          setPortfolio(newPortfolio);
      }
  };
  
  const updateAccountCash = (accId: string, amount: number) => {
       const newPortfolio = { ...portfolio };
       const account = newPortfolio.accounts.find(a => a.id === accId);
       if (account) {
           const newAccount = { ...account, cashBalance: amount };
           newPortfolio.accounts = newPortfolio.accounts.map(a => a.id === accId ? newAccount : a);
           setPortfolio(newPortfolio);
       }
  };

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<FundListPage />} />
          <Route 
            path="/comparison" 
            element={
              <ComparisonPage 
                patchRules={patchRules} 
                onAddPatchRule={addPatchRule} 
                onRemovePatchRule={removePatchRule} 
              />
            } 
          />
          <Route 
            path="/fund/:id" 
            element={
              <FundDetailPage 
                patchRules={patchRules} 
                onAddPatchRule={addPatchRule} 
                onRemovePatchRule={removePatchRule} 
              />
            } 
          />
          <Route 
            path="/portfolio" 
            element={
              <PortfolioPage 
                portfolio={portfolio} 
                patchRules={patchRules}
                onAddExternalAsset={addExternalAsset}
              />
            } 
          />
          <Route 
            path="/liquidity" 
            element={
              <LiquidityPage 
                portfolio={portfolio}
                updateHoldingRule={updateHoldingRule}
                updateAccountCash={updateAccountCash}
              />
            } 
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;