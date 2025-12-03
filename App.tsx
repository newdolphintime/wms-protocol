
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
  Save
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, AreaChart, Area } from 'recharts';
import { MOCK_FUNDS, MOCK_PORTFOLIO, generateChartData, generateFundHistory, getLiquidityTier, getSettlementDays } from './services/dataService';
import { analyzeFunds } from './services/geminiService';
import ComparisonChart from './components/ComparisonChart';
import { Fund, AnalysisState, FundType, PatchRule, Account, AccountType, LiquidityTier, CashFlow, ClientPortfolio } from './types';
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

// Helper to get badge color based on fund type
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
    // Total duration in ms
    const totalDuration = endDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) return null;
  
    const getPercent = (date: Date) => {
      const val = (date.getTime() - startDate.getTime()) / totalDuration * 100;
      return Math.max(0, Math.min(100, val));
    };
  
    return (
      <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden border border-gray-200 w-full mt-2 select-none">
        {/* Base: Green (Have Data) - Initially assume all green, then overlay red for gap */}
        <div className="absolute inset-0 bg-emerald-100 flex items-center justify-center">
            <span className="text-[10px] text-emerald-700 font-medium z-10">数据完整</span>
        </div>
        
        {/* Gap: Red */}
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
  
        {/* Patch Rules: Blue Overlay */}
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
  
        {/* Ticks */}
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
  const [range, setRange] = useState<number | string>(30); // Default 1 month

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
         {/* Use Overlay mode but for a single fund to get the detailed X-Axis */}
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

// --- Modal Component ---

const PatchConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patchRules: PatchRule[];
  onAddRule: (rule: PatchRule) => void;
  onRemoveRule: (id: string) => void;
  allFunds: Fund[];
  comparisonStartDate: string; // YYYY-MM-DD
}> = ({ isOpen, onClose, patchRules, onAddRule, onRemoveRule, allFunds, comparisonStartDate }) => {
  const [targetId, setTargetId] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Gap detection for the selected target fund
  const gapInfo = useMemo(() => {
    if (!targetId || !comparisonStartDate) return null;
    const fund = allFunds.find(f => f.id === targetId);
    if (!fund) return null;
    
    if (fund.inceptionDate > comparisonStartDate) {
        const inception = new Date(fund.inceptionDate);
        inception.setDate(inception.getDate() - 1);
        const end = inception.toISOString().split('T')[0];
        
        return {
            hasGap: true,
            gapStart: comparisonStartDate,
            gapEnd: end,
            fundInception: fund.inceptionDate
        };
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
  const visEndDate = new Date(); // Today
  
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
          {/* Add New Rule Form */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> 添加新规则
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">目标基金 (需补齐)</label>
                <select 
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">选择基金...</option>
                  {allFunds.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (成立: {f.inceptionDate})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">替补基金 (数据源)</label>
                <select 
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                  value={proxyId}
                  onChange={(e) => setProxyId(e.target.value)}
                >
                  <option value="">选择相似基金...</option>
                  {allFunds.filter(f => f.id !== targetId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
                <input 
                  type="date" 
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
                <input 
                  type="date" 
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Gap Warning & Auto-fill */}
            {gapInfo?.hasGap && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start justify-between">
                    <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="text-xs text-orange-800">
                            <span className="font-bold">发现数据缺口:</span> 目标基金成立于 {gapInfo.fundInception}，但对比开始于 {comparisonStartDate}。
                            建议补齐区间: <span className="font-mono">{gapInfo.gapStart} ~ {gapInfo.gapEnd}</span>
                        </div>
                    </div>
                    <button 
                        onClick={autoFillGap}
                        className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 font-medium transition-colors"
                    >
                        一键填充
                    </button>
                </div>
            )}
            
            {/* Visualizer */}
            {targetId && (
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">补齐覆盖预览 (当前视图范围)</label>
                    <TimelineVisualizer 
                        startDate={visStartDate} 
                        endDate={visEndDate}
                        gapStart={visGapStart}
                        gapEnd={visGapEnd}
                        patchRules={relevantRules}
                    />
                     <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                        <span>{comparisonStartDate}</span>
                        <span>今日</span>
                    </div>
                </div>
            )}

            <button 
              onClick={handleAdd}
              disabled={!targetId || !proxyId || !startDate || !endDate}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              添加规则
            </button>
          </div>

          {/* Rules List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">已配置规则</h4>
            {patchRules.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
                暂无补齐规则
              </div>
            ) : (
              <div className="space-y-3">
                {patchRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <span className="font-medium">{getFundName(rule.targetFundId)}</span>
                        <ArrowLeft className="w-3 h-3 text-gray-400" />
                        <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs border border-indigo-100">
                            {getFundName(rule.proxyFundId)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {rule.startDate} 至 {rule.endDate}
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveRule(rule.id)}
                      className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                完成配置
            </button>
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
              <div className="bg-indigo-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                FundInsight Pro
              </span>
            </div>
            <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors h-16 ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

const FundListPage: React.FC = () => {
  const [selectedFunds, setSelectedFunds] = useState<Set<string>>(new Set());

  const toggleFund = (id: string) => {
    const newSelected = new Set(selectedFunds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFunds(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">基金产品列表</h1>
          <p className="mt-1 text-sm text-gray-500">A股市场规模领先的ETF基金概览</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            已选择 <span className="font-bold text-indigo-600">{selectedFunds.size}</span> 只基金
          </div>
          <Link
            to="/comparison"
            state={{ selectedFundIds: Array.from(selectedFunds) }}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              selectedFunds.size < 2 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => selectedFunds.size < 2 && e.preventDefault()}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            开始对比
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  选择
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  代码/名称
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  单位净值
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日涨跌幅
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  今年以来
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  风险等级
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成立日期
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  基金经理
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MOCK_FUNDS.map((fund) => (
                <tr 
                  key={fund.id} 
                  className={`hover:bg-gray-50 transition-colors ${selectedFunds.has(fund.id) ? 'bg-indigo-50/30' : ''}`}
                  onClick={() => toggleFund(fund.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedFunds.has(fund.id)}
                        onChange={() => toggleFund(fund.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <Link 
                        to={`/fund/${fund.id}`} 
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {fund.name}
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </Link>
                      <span className="text-xs text-gray-500">{fund.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {fund.nav.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center text-sm font-medium ${
                      fund.dayChange >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {fund.dayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 transform rotate-180" />}
                      {Math.abs(fund.dayChange)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      fund.ytdReturn >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {fund.ytdReturn >= 0 ? '+' : ''}{fund.ytdReturn}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full mx-0.5 ${
                            i < fund.riskLevel ? 'bg-orange-500' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {fund.inceptionDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fund.manager}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ComparisonPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
  const location = useLocation();
  const [selectedRange, setSelectedRange] = useState<number | string>(30); // Default 1 month
  const [analysis, setAnalysis] = useState<AnalysisState>({ loading: false, content: null, error: null });
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);

  const selectedFundIds = (location.state as { selectedFundIds: string[] })?.selectedFundIds || [];
  const selectedFunds = MOCK_FUNDS.filter(f => selectedFundIds.includes(f.id));

  // Calculate dynamic days for variable ranges
  const daysToLoad = useMemo(() => {
    if (typeof selectedRange === 'number') return selectedRange;
    
    if (selectedRange === 'SINCE_INCEPTION') {
         // Find earliest inception date among selected funds
         if (selectedFunds.length === 0) return 365;
         const earliest = selectedFunds.reduce((min, p) => p.inceptionDate < min ? p.inceptionDate : min, selectedFunds[0].inceptionDate);
         const start = new Date(earliest);
         const now = new Date();
         const diffTime = Math.abs(now.getTime() - start.getTime());
         return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    }
    
    // YTD
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }, [selectedRange, selectedFunds]);

  const { chartData, gaps } = useMemo(() => 
    generateChartData(selectedFunds, daysToLoad, patchRules, MOCK_FUNDS), 
  [selectedFunds, daysToLoad, patchRules]);

  // Calculate Chart Start Date for Visualization
  const chartStartDate = useMemo(() => {
     const now = new Date();
     now.setDate(now.getDate() - daysToLoad);
     return now.toISOString().split('T')[0];
  }, [daysToLoad]);

  const handleAnalyze = async () => {
    setAnalysis({ loading: true, content: null, error: null });
    const result = await analyzeFunds(selectedFunds);
    setAnalysis({ loading: false, content: result, error: null });
  };

  if (selectedFunds.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900">未选择基金</h2>
        <p className="mt-2 text-gray-500">请先从列表中选择需要对比的基金。</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500 font-medium">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">业绩对比分析</h1>
          <p className="mt-1 text-sm text-gray-500">
             对比 {selectedFunds.length} 只基金的历史业绩走势
          </p>
        </div>
        <div className="flex gap-3">
            {gaps.length > 0 && (
                <button
                    onClick={() => setIsPatchModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-medium hover:bg-amber-100 transition-colors animate-pulse"
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    发现数据缺失 ({gaps.length}) - 点击补齐
                </button>
            )}
            {!gaps.length && (
                 <button
                    onClick={() => setIsPatchModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    配置净值补齐
                </button>
            )}
            <button
                onClick={handleAnalyze}
                disabled={analysis.loading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-md text-sm font-medium shadow-md hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
                {analysis.loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI 分析中...
                </>
                ) : (
                <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成 AI 分析报告
                </>
                )}
            </button>
        </div>
      </div>

      {/* Chart Section */}
      <ComparisonChart 
        data={chartData} 
        funds={selectedFunds} 
        patchRules={patchRules}
        allFunds={MOCK_FUNDS}
        periodSelector={
            <div className="flex bg-gray-100 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                    <button
                        key={range.label}
                        onClick={() => setSelectedRange(range.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            selectedRange === range.value 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {range.label}
                    </button>
                ))}
            </div>
        }
      />

      {/* Calculation Formula Explanation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
             <div className="bg-indigo-50 p-3 rounded-lg">
                 <Calculator className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">归一化净值计算说明</h3>
                 <p className="text-gray-600 text-sm mb-4">
                     为了在同一坐标系下直观对比不同基金的业绩走势，我们将所有基金在起始日期的净值统一标准化为 <span className="font-mono font-bold text-gray-800">100</span>。
                     后续日期的数值反映了相对于起始日的累计涨跌幅。
                 </p>
                 <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs sm:text-sm text-gray-700 border border-gray-200">
                     <div className="mb-2">
                         <span className="font-semibold text-indigo-600">公式：</span>
                         归一化净值(t) = ( 基金单位净值(t) / 基金单位净值(起始日) ) × 100
                     </div>
                     <div className="flex flex-col sm:flex-row gap-4 mt-3 pt-3 border-t border-gray-200">
                         <div>
                             <span className="text-gray-500 block mb-1">示例：基金A</span>
                             起始净值: 2.000 → <span className="font-bold">100.00</span><br/>
                             当前净值: 2.200 → <span className="font-bold">110.00</span> (+10%)
                         </div>
                         <div>
                             <span className="text-gray-500 block mb-1">示例：基金B</span>
                             起始净值: 5.000 → <span className="font-bold">100.00</span><br/>
                             当前净值: 4.500 → <span className="font-bold">90.00</span> (-10%)
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      </div>
      
      {/* Selected Funds Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 className="text-sm font-semibold text-gray-900">对比基金详情</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基金名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成立日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新净值</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">累计收益(YTD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据状态</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedFunds.map((fund) => {
                const isGap = gaps.find(g => g.fundId === fund.id);
                const isPatched = patchRules.some(r => r.targetFundId === fund.id);
                return (
                    <tr key={fund.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fund.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{fund.inceptionDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fund.nav.toFixed(4)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={fund.ytdReturn >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {fund.ytdReturn >= 0 ? '+' : ''}{fund.ytdReturn}%
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isGap && !isPatched ? (
                             <Badge color="red">缺失 (需补齐)</Badge>
                        ) : isPatched ? (
                            <Badge color="amber">已配置补齐</Badge>
                        ) : (
                            <Badge color="green">完整</Badge>
                        )}
                    </td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Analysis Result */}
      {analysis.content && (
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">AI 智能分析报告</h3>
          </div>
          <div className="prose prose-sm prose-indigo max-w-none text-gray-700">
            <ReactMarkdown>{analysis.content}</ReactMarkdown>
          </div>
        </div>
      )}

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

// --- Fund Detail Page ---

const FundDetailPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fund = MOCK_FUNDS.find(f => f.id === id);
    const [range, setRange] = useState<number | string>(365);
    const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
    
    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [filterPatched, setFilterPatched] = useState(false);
    const itemsPerPage = 10;
  
    if (!fund) return <div>Fund not found</div>;
  
    const daysToLoad = useMemo(() => {
       if (typeof range === 'number') return range;
       if (range === 'YTD') {
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const diff = Math.abs(now.getTime() - startOfYear.getTime());
          return Math.ceil(diff / (86400000));
       }
       return 365;
    }, [range]);
    
    // Generate history backwards from Today
    const historyData = useMemo(() => 
        generateFundHistory(fund, daysToLoad, patchRules, MOCK_FUNDS), 
    [fund, daysToLoad, patchRules]);

    // Derived Calculation for Filter & Pagination
    const filteredData = useMemo(() => {
        if (!filterPatched) return [...historyData].reverse(); // Show newest first for table
        return [...historyData].reverse().filter(d => d.isPatched);
    }, [historyData, filterPatched]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterPatched, range]);
  
    // Calculate visualization start date for Modal
    const chartStartDate = useMemo(() => {
        const now = new Date();
        now.setDate(now.getDate() - daysToLoad);
        return now.toISOString().split('T')[0];
    }, [daysToLoad]);

    return (
      <div className="space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回上一页
          </button>
  
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">{fund.name}</h1>
                      <Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge>
                      <span className="text-sm font-mono text-gray-400">{fund.code}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>成立日期: <span className="font-mono">{fund.inceptionDate}</span></span>
                      <span>基金经理: {fund.manager}</span>
                  </div>
              </div>
              <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 font-mono">{fund.nav.toFixed(4)}</div>
                  <div className={`text-sm font-medium mt-1 ${fund.dayChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fund.dayChange >= 0 ? '+' : ''}{fund.dayChange}% (最新变动)
                  </div>
              </div>
          </div>
  
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex gap-2">
                  {TIME_RANGES.filter(r => r.value !== 'SINCE_INCEPTION').map(r => (
                      <button
                          key={r.label}
                          onClick={() => setRange(r.value)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                              range === r.value 
                              ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                          {r.label}
                      </button>
                  ))}
              </div>
              <button
                  onClick={() => setIsPatchModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
              >
                  <Wand2 className="w-4 h-4" />
                  配置净值补齐
              </button>
          </div>
  
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* NAV Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">单位净值走势</h3>
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                              <YAxis domain={['auto', 'auto']} width={40} tick={{fontSize: 10}} />
                              <RechartsTooltip 
                                labelFormatter={(label) => `日期: ${label}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                              />
                              <Legend verticalAlign="top" height={36}/>
                              <Line 
                                type="monotone" 
                                dataKey="nav_actual" 
                                name="真实净值"
                                stroke="#4f46e5" 
                                strokeWidth={2.5} 
                                dot={false} 
                                activeDot={{r: 4}}
                                connectNulls={false}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="nav_patched" 
                                name="补齐净值"
                                stroke="#f59e0b" 
                                strokeWidth={2.5} 
                                strokeDasharray="5 5"
                                dot={false} 
                                activeDot={{r: 4}}
                                connectNulls={false}
                              />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
  
              {/* Daily Change Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">日涨跌幅 (%)</h3>
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                              <YAxis width={40} tick={{fontSize: 10}} />
                              <RechartsTooltip 
                                labelFormatter={(label) => `日期: ${label}`}
                                cursor={{fill: '#f3f4f6'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                              />
                              <Bar dataKey="change" name="涨跌幅" radius={[2, 2, 0, 0]}>
                                {historyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.change && entry.change >= 0 ? '#ef4444' : '#22c55e'} />
                                ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
  
          {/* Detailed Data Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">历史净值明细</h3>
                  <div className="flex items-center gap-2">
                       <Filter className="w-4 h-4 text-gray-500" />
                       <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer select-none">
                           <input 
                              type="checkbox" 
                              checked={filterPatched}
                              onChange={(e) => setFilterPatched(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                           />
                           只看补齐数据
                       </label>
                  </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位净值</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日涨跌幅</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据来源</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                    暂无符合筛选条件的数据
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{row.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                        {row.nav_patched ?? row.nav_actual ?? '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {row.change !== null ? (
                                            <span className={row.change >= 0 ? 'text-red-600' : 'text-green-600'}>
                                                {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {row.isPatched ? (
                                            <div className="flex flex-col items-start">
                                                <Badge color="amber">补齐</Badge>
                                                <span className="text-xs text-gray-400 mt-1">源: {row.proxyName}</span>
                                            </div>
                                        ) : (
                                            <Badge color="green">真实</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            显示第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到 <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> 条，
                            共 <span className="font-medium">{filteredData.length}</span> 条
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">上一页</span>
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">下一页</span>
                                <ChevronRight className="h-4 w-4" />
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
              comparisonStartDate={chartStartDate}
          />
      </div>
    );
};

// --- Portfolio Page ---

const PortfolioPage: React.FC<{ patchRules: PatchRule[], portfolio: ClientPortfolio }> = ({ patchRules, portfolio }) => {
  const [metric, setMetric] = useState<'NAV' | 'CHANGE'>('NAV');
  const [chartView, setChartView] = useState<'OVERLAY' | 'GRID'>('OVERLAY');
  const [perfRange, setPerfRange] = useState<number | string>(90);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // Calculate Asset Allocation & Totals
  const portfolioSummary = useMemo(() => {
    let totalAssets = 0;
    const allocation: { [key: string]: number } = {
       [FundType.BROAD_MARKET]: 0,
       [FundType.SECTOR]: 0,
       [FundType.STRATEGY]: 0,
       [FundType.CROSS_BORDER]: 0,
       [FundType.BOND]: 0,
       'CASH': 0 // Add Cash bucket
    };

    portfolio.accounts.forEach(acc => {
      // Add Cash
      const cash = acc.cashBalance || 0;
      totalAssets += cash;
      allocation['CASH'] += cash;

      // Add Holdings
      acc.holdings.forEach(h => {
        const fund = MOCK_FUNDS.find(f => f.id === h.fundId);
        if (fund) {
          const value = h.shares * fund.nav;
          totalAssets += value;
          allocation[fund.type] += value;
        }
      });
    });

    return { 
        totalAssets, 
        pieData: Object.entries(allocation)
            .filter(([_, val]) => val > 0)
            .map(([type, val]) => ({ name: type === 'CASH' ? '现金' : type, value: val, type: type === 'CASH' ? 'CASH' : type as FundType })) 
    };
  }, [portfolio]);

  const getAccountSummary = (account: Account) => {
    let accTotal = 0;
    const allocation: { [key: string]: number } = {
       [FundType.BROAD_MARKET]: 0,
       [FundType.SECTOR]: 0,
       [FundType.STRATEGY]: 0,
       [FundType.CROSS_BORDER]: 0,
       [FundType.BOND]: 0,
       'CASH': 0
    };

    // Cash
    const cash = account.cashBalance || 0;
    accTotal += cash;
    allocation['CASH'] += cash;

    // Holdings
    account.holdings.forEach(h => {
        const fund = MOCK_FUNDS.find(f => f.id === h.fundId);
        if (fund) {
          const value = h.shares * fund.nav;
          accTotal += value;
          allocation[fund.type] += value;
        }
    });
    
    return {
        total: accTotal,
        pieData: Object.entries(allocation)
            .filter(([_, val]) => val > 0)
            .map(([type, val]) => ({ name: type === 'CASH' ? '现金' : type, value: val, type: type === 'CASH' ? 'CASH' : type as FundType }))
    };
  };

  // Performance Insight Data
  const displayedFunds = useMemo(() => {
    const funds = new Set<string>();
    portfolio.accounts.forEach(acc => {
      if (selectedAccountId === 'ALL' || acc.id === selectedAccountId) {
        acc.holdings.forEach(h => funds.add(h.fundId));
      }
    });
    return MOCK_FUNDS.filter(f => funds.has(f.id));
  }, [selectedAccountId, portfolio]);

  const chartDataObj = useMemo(() => {
      if (chartView === 'OVERLAY') {
        return generateChartData(displayedFunds, typeof perfRange === 'number' ? perfRange : 90, patchRules, MOCK_FUNDS);
      }
      return { chartData: [], gaps: [] }; // Grid mode handles its own data in SingleFundPerformanceCard
  }, [displayedFunds, perfRange, patchRules, chartView]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">客户持仓分析</h1>
           <p className="mt-1 text-sm text-gray-500">客户：{portfolio.clientName}</p>
        </div>
        <div className="text-right">
           <div className="text-sm text-gray-500">总资产规模 (含现金)</div>
           <div className="text-3xl font-bold text-indigo-600 font-mono">
             ¥ {(portfolioSummary.totalAssets / 10000).toFixed(2)} 万
           </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                 <PieChartIcon className="w-5 h-5 text-indigo-600" />
                 总体资产配置
             </h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                           data={portfolioSummary.pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                            {portfolioSummary.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getChartColorForType(entry.type as FundType | 'CASH')} />
                            ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: number) => `¥${(val/10000).toFixed(2)}万`} />
                        <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
          
          <div className="col-span-2 space-y-6">
             {portfolio.accounts.map(account => {
                 const summary = getAccountSummary(account);
                 return (
                     <div key={account.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                {account.type === AccountType.PERSONAL ? (
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
                                ) : (
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Users className="w-5 h-5" /></div>
                                )}
                                <div>
                                    <h4 className="font-bold text-gray-900">{account.name}</h4>
                                    <Badge color={account.type === AccountType.PERSONAL ? 'blue' : 'purple'}>{account.type}</Badge>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-gray-500">账户总资产:</span>
                                <span className="ml-2 font-mono font-bold text-gray-800">¥ {(summary.total / 10000).toFixed(2)} 万</span>
                            </div>
                        </div>

                        {/* Holdings Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">持仓项目</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">持有份额/数量</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">持仓成本</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">最新市值</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">盈亏</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* Cash Row */}
                                    <tr className="bg-cyan-50/30">
                                        <td className="px-4 py-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 flex items-center gap-1"><Coins className="w-3 h-3 text-cyan-600"/> 账户现金余额</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-600 font-mono">-</td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-600 font-mono">-</td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-900 font-mono font-medium">¥{((account.cashBalance || 0)/10000).toFixed(2)}万</td>
                                        <td className="px-4 py-2 text-right text-sm font-mono text-gray-400">-</td>
                                    </tr>
                                    {/* Funds Rows */}
                                    {account.holdings.map(h => {
                                        const fund = MOCK_FUNDS.find(f => f.id === h.fundId);
                                        if (!fund) return null;
                                        const marketVal = h.shares * fund.nav;
                                        const costVal = h.shares * h.avgCost;
                                        const pnl = marketVal - costVal;
                                        const pnlPercent = (pnl / costVal) * 100;
                                        
                                        return (
                                            <tr key={h.fundId}>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900">{fund.name}</span>
                                                        <span className="text-xs text-gray-500">{fund.code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right text-sm text-gray-600 font-mono">{h.shares.toLocaleString()}</td>
                                                <td className="px-4 py-2 text-right text-sm text-gray-600 font-mono">{h.avgCost.toFixed(3)}</td>
                                                <td className="px-4 py-2 text-right text-sm text-gray-900 font-mono font-medium">{(marketVal/10000).toFixed(2)}万</td>
                                                <td className="px-4 py-2 text-right text-sm font-mono">
                                                    <span className={pnl >= 0 ? 'text-red-600' : 'text-green-600'}>
                                                        {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                     </div>
                 );
             })}
          </div>
      </div>

      {/* Performance Insight */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Activity className="w-5 h-5" /></div>
                 <h3 className="text-xl font-bold text-gray-900">持仓产品业绩透视</h3>
             </div>
             
             {/* Controls */}
             <div className="flex flex-wrap items-center gap-3">
                 {/* Account Filter */}
                 <div className="relative">
                    <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="pl-3 pr-8 py-1.5 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="ALL">全部账户</option>
                        {portfolio.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                 </div>

                 {/* View Mode Toggle */}
                 <div className="flex bg-gray-100 rounded-md p-1">
                     <button
                        onClick={() => setChartView('OVERLAY')}
                        className={`p-1.5 rounded-sm transition-all ${chartView === 'OVERLAY' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        title="合并展示"
                     >
                         <Layers className="w-4 h-4" />
                     </button>
                     <button
                        onClick={() => setChartView('GRID')}
                        className={`p-1.5 rounded-sm transition-all ${chartView === 'GRID' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        title="分图展示"
                     >
                         <Grid className="w-4 h-4" />
                     </button>
                 </div>
                 
                 <div className="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>

                 {/* Metric Toggle */}
                 <div className="flex bg-gray-100 rounded-md p-1">
                     <button
                        onClick={() => setMetric('NAV')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${metric === 'NAV' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                     >
                         净值走势
                     </button>
                     <button
                        onClick={() => setMetric('CHANGE')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${metric === 'CHANGE' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                     >
                         涨跌幅
                     </button>
                 </div>
                 
                 {/* Time Range (Only for Overlay) */}
                 {chartView === 'OVERLAY' && (
                    <select 
                        className="text-sm border-gray-300 rounded-md py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
                        value={perfRange}
                        onChange={(e) => setPerfRange(e.target.value === 'YTD' ? 'YTD' : Number(e.target.value))}
                    >
                        {TIME_RANGES.filter(r => r.value !== 'SINCE_INCEPTION').map(r => (
                            <option key={r.label} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                 )}
             </div>
        </div>

        {/* Chart Area */}
        {chartView === 'OVERLAY' ? (
             <ComparisonChart 
                data={chartDataObj.chartData}
                funds={displayedFunds}
                patchRules={patchRules}
                allFunds={MOCK_FUNDS}
                metric={metric}
                viewMode="OVERLAY"
             />
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    </div>
  );
};

// --- Liquidity Page ---

const LiquidityPage: React.FC<{ portfolio: ClientPortfolio, onUpdateCash: (accountId: string, amount: number) => void }> = ({ portfolio, onUpdateCash }) => {
    const [cashFlows, setCashFlows] = useState<CashFlow[]>([
        { id: '1', date: '2025-06-20', amount: 500000, description: '企业季度分红', type: 'INFLOW' },
        { id: '2', date: '2025-06-25', amount: 200000, description: '家族信托管理费', type: 'OUTFLOW' },
    ]);
    const [targetDate, setTargetDate] = useState<string>('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
    
    // Cash editing state
    const [editingCashId, setEditingCashId] = useState<string | null>(null);
    const [editCashValue, setEditCashValue] = useState<string>('');

    // 1. Calculate holdings liquidity based on account filter
    const liquidityData = useMemo(() => {
        let total = 0;
        const tiers = {
            [LiquidityTier.CASH]: 0,
            [LiquidityTier.HIGH]: 0,
            [LiquidityTier.MEDIUM]: 0,
            [LiquidityTier.LOW]: 0,
        };
        const availability = {
            T0: 0,
            T1: 0,
            T3: 0,
            T7: 0
        };

        const holdingsDetail: { fundName: string, value: number, tier: LiquidityTier, days: number, accountName: string, isCash: boolean }[] = [];

        portfolio.accounts.forEach(acc => {
            if (selectedAccountId === 'ALL' || acc.id === selectedAccountId) {
                // Add Cash
                const cash = acc.cashBalance || 0;
                total += cash;
                tiers[LiquidityTier.CASH] += cash;
                availability.T0 += cash;
                availability.T1 += cash; // Cumulative
                availability.T3 += cash;
                availability.T7 += cash;
                
                if (cash > 0) {
                    holdingsDetail.push({
                        fundName: '现金余额',
                        value: cash,
                        tier: LiquidityTier.CASH,
                        days: 0,
                        accountName: acc.name,
                        isCash: true
                    });
                }

                // Add Holdings
                acc.holdings.forEach(h => {
                    const fund = MOCK_FUNDS.find(f => f.id === h.fundId);
                    if (fund) {
                        const val = h.shares * fund.nav;
                        const tier = getLiquidityTier(fund.type);
                        const days = getSettlementDays(tier);

                        total += val;
                        tiers[tier] += val;
                        
                        if (days <= 1) availability.T1 += val;
                        if (days <= 3) availability.T3 += val;
                        if (days <= 7) availability.T7 += val; // Cumulative

                        holdingsDetail.push({
                            fundName: fund.name,
                            value: val,
                            tier,
                            days,
                            accountName: acc.name,
                            isCash: false
                        });
                    }
                });
            }
        });

        // Ensure cumulative logic
        availability.T3 = Math.max(availability.T3, availability.T1); // Should already be covered but safe check
        availability.T7 = total; // Assume everything is available by T+7 for simplicity

        return { total, tiers, availability, holdingsDetail };
    }, [selectedAccountId, portfolio]);

    // 2. Cash Flow Management
    const addCashFlow = (flow: Omit<CashFlow, 'id'>) => {
        const newFlow = { ...flow, id: Date.now().toString() };
        setCashFlows([...cashFlows, newFlow].sort((a,b) => a.date.localeCompare(b.date)));
    };

    const removeCashFlow = (id: string) => {
        setCashFlows(cashFlows.filter(c => c.id !== id));
    };

    // 3. Future Projection Data
    const projectionData = useMemo(() => {
        const data = [];
        const today = new Date();
        
        // Project for 30 days
        let cumulativeCashFlow = 0;

        for (let i = 0; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // 1. Asset Availability (T+N logic)
            // T0 Cash is available immediately (i>=0)
            // T1 Assets available at i>=1, etc.
            let assetAvailable = liquidityData.availability.T0; // Start with T0 Cash
            if (i >= 1) assetAvailable = liquidityData.availability.T1;
            if (i >= 3) assetAvailable = liquidityData.availability.T3;
            if (i >= 5) assetAvailable = liquidityData.total; // Remaining
            
            // 2. Cash Flows
            const daysFlows = cashFlows.filter(c => c.date === dateStr);
            daysFlows.forEach(c => {
                if (c.type === 'INFLOW') cumulativeCashFlow += c.amount;
                else cumulativeCashFlow -= c.amount;
            });

            const totalLiquidity = assetAvailable + cumulativeCashFlow;

            data.push({
                date: dateStr,
                assetLiquidity: assetAvailable,
                cashBalance: cumulativeCashFlow,
                total: totalLiquidity
            });
        }
        return data;
    }, [liquidityData, cashFlows]);

    const pieData = Object.entries(liquidityData.tiers).map(([name, value]) => ({ name, value }));
    const barData = [
        { name: 'T+0 (现金)', value: liquidityData.availability.T0 },
        { name: 'T+1 (极速)', value: liquidityData.availability.T1 },
        { name: 'T+3 (标准)', value: liquidityData.availability.T3 },
        { name: 'T+7 (完全)', value: liquidityData.availability.T7 },
    ];

    const specificDateProjection = useMemo(() => {
        if(!targetDate) return null;
        return projectionData.find(d => d.date === targetDate);
    }, [targetDate, projectionData]);

    // Simple form state
    const [newFlowDate, setNewFlowDate] = useState('');
    const [newFlowAmount, setNewFlowAmount] = useState('');
    const [newFlowDesc, setNewFlowDesc] = useState('');
    const [newFlowType, setNewFlowType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');

    const handleCashEdit = (acc: Account) => {
        setEditingCashId(acc.id);
        setEditCashValue((acc.cashBalance || 0).toString());
    };

    const saveCashEdit = (accId: string) => {
        const val = parseFloat(editCashValue);
        if (!isNaN(val) && val >= 0) {
            onUpdateCash(accId, val);
        }
        setEditingCashId(null);
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">资产流动性测算</h1>
                    <p className="mt-1 text-sm text-gray-500">评估资产变现能力及未来资金流充裕度</p>
                </div>
                {/* Account Filter */}
                <div className="w-64">
                    <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="ALL">全部账户资产</option>
                        {portfolio.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Account Cash Management Panel */}
            {selectedAccountId !== 'ALL' && (
                <div className="bg-gradient-to-r from-cyan-50 to-white p-4 rounded-xl border border-cyan-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600"><Coins className="w-6 h-6"/></div>
                         <div>
                             <h4 className="font-semibold text-gray-900">当前账户现金余额</h4>
                             <p className="text-xs text-gray-500">T+0 实时可用流动性</p>
                         </div>
                     </div>
                     <div className="flex items-center gap-4">
                        {editingCashId === selectedAccountId ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    className="block w-32 sm:text-sm border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                                    value={editCashValue}
                                    onChange={e => setEditCashValue(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={() => saveCashEdit(selectedAccountId)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><CheckCircle2 className="w-4 h-4"/></button>
                                <button onClick={() => setEditingCashId(null)} className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"><X className="w-4 h-4"/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-mono font-bold text-cyan-700">
                                    ¥{portfolio.accounts.find(a => a.id === selectedAccountId)?.cashBalance?.toLocaleString()}
                                </span>
                                <button onClick={() => handleCashEdit(portfolio.accounts.find(a => a.id === selectedAccountId)!)} className="p-1.5 text-gray-400 hover:text-cyan-600 rounded-full hover:bg-cyan-50 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                     </div>
                </div>
            )}


            {/* Analysis Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Liquidity Tier Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-indigo-600" />
                        资产变现能力分布
                    </h3>
                    <div className="h-64 flex items-center">
                        <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                        <Cell fill="#06b6d4" /> {/* Cash */}
                                        <Cell fill="#22c55e" /> {/* High */}
                                        <Cell fill="#f59e0b" /> {/* Med */}
                                        <Cell fill="#ef4444" /> {/* Low */}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => `¥${(val/10000).toFixed(2)}万`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-3">
                            {pieData.map((entry, idx) => {
                                let colorClass = '';
                                if (entry.name === LiquidityTier.CASH) colorClass = 'bg-cyan-500';
                                else if (entry.name === LiquidityTier.HIGH) colorClass = 'bg-green-500';
                                else if (entry.name === LiquidityTier.MEDIUM) colorClass = 'bg-amber-500';
                                else colorClass = 'bg-red-500';
                                
                                return (
                                    <div key={entry.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                                            <span className="text-gray-600 text-xs">{entry.name}</span>
                                        </div>
                                        <span className="font-mono font-medium text-xs">¥{(entry.value/10000).toFixed(0)}万</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Capital Recovery Timeline */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        资金回笼时间轴 (累积)
                    </h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={barData} layout="vertical" margin={{left: 20}}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                 <XAxis type="number" hide />
                                 <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                 <RechartsTooltip formatter={(val: number) => `¥${(val/10000).toFixed(2)}万`} />
                                 <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    <Cell fill="#22d3ee" /> {/* T+0 */}
                                    <Cell fill="#86efac" /> {/* T+1 */}
                                    <Cell fill="#4ade80" /> {/* T+3 */}
                                    <Cell fill="#22c55e" /> {/* T+7 */}
                                 </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Cash Flow Planning */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Input */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-indigo-600" />
                        资金计划管理
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">日期</label>
                            <input type="date" value={newFlowDate} onChange={e => setNewFlowDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">类型</label>
                                <select value={newFlowType} onChange={(e: any) => setNewFlowType(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    <option value="INFLOW">流入 (+)</option>
                                    <option value="OUTFLOW">流出 (-)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">金额 (元)</label>
                                <input type="number" value={newFlowAmount} onChange={e => setNewFlowAmount(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">说明</label>
                            <input type="text" value={newFlowDesc} onChange={e => setNewFlowDesc(e.target.value)} className="w-full text-sm border-gray-300 rounded-md" placeholder="例如: 支付购房首付"/>
                        </div>
                        <button 
                            onClick={() => {
                                if(newFlowDate && newFlowAmount) {
                                    addCashFlow({ date: newFlowDate, amount: Number(newFlowAmount), description: newFlowDesc || '未命名款项', type: newFlowType });
                                    setNewFlowAmount(''); setNewFlowDesc('');
                                }
                            }}
                            className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-md hover:bg-indigo-100 transition-colors text-sm"
                        >
                            添加计划
                        </button>
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">已录入计划</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {cashFlows.length === 0 && <p className="text-xs text-gray-400 text-center py-4">暂无资金计划</p>}
                            {cashFlows.map(flow => (
                                <div key={flow.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs border border-gray-100">
                                    <div>
                                        <div className="font-medium text-gray-900">{flow.date}</div>
                                        <div className="text-gray-500 truncate max-w-[120px]">{flow.description}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-bold ${flow.type === 'INFLOW' ? 'text-red-600' : 'text-green-600'}`}>
                                            {flow.type === 'INFLOW' ? '+' : '-'}{flow.amount.toLocaleString()}
                                        </div>
                                        <button onClick={() => removeCashFlow(flow.id)} className="text-gray-400 hover:text-red-500 mt-1">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Future Projection Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                             <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                未来30天流动性趋势预测
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">结合资产变现周期 (T+N) 与 计划资金流测算</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <Target className="w-4 h-4 text-gray-500" />
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-xs p-0 focus:ring-0 text-gray-700 font-medium"
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                            />
                            {specificDateProjection && (
                                <div className="text-xs pl-2 border-l border-gray-300">
                                    <span className="text-gray-500">预计可用: </span>
                                    <span className={`font-mono font-bold ${specificDateProjection.total < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                                        ¥{(specificDateProjection.total/10000).toFixed(2)}万
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                                <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                                <YAxis tick={{fontSize: 10}} width={60} />
                                <RechartsTooltip formatter={(val: number) => `¥${val.toLocaleString()}`} />
                                <Legend />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    name="预计可用余额" 
                                    stroke="#4f46e5" 
                                    fillOpacity={1} 
                                    fill="url(#colorTotal)" 
                                    strokeWidth={2}
                                />
                                <Area 
                                    type="step" 
                                    dataKey="assetLiquidity" 
                                    name="资产累计变现" 
                                    stroke="#22c55e" 
                                    fill="none" 
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Holding Detail List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">持仓流动性明细</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">基金名称</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">所属账户</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">市值</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">流动性评级</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预估到账</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {liquidityData.holdingsDetail.map((h, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                        {h.isCash ? <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-cyan-600"/>{h.fundName}</span> : h.fundName}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{h.accountName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-mono text-right">¥{h.value.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={h.tier === LiquidityTier.CASH ? 'blue' : h.tier === LiquidityTier.HIGH ? 'green' : h.tier === LiquidityTier.MEDIUM ? 'yellow' : 'red'}>
                                            {h.tier}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{h.days === 0 ? '实时' : `T+${h.days}日`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---

const App: React.FC = () => {
    // Initial patch rules for demo-1 fund
    const [patchRules, setPatchRules] = useState<PatchRule[]>([
        { id: 'rule-demo-1', targetFundId: 'demo-1', proxyFundId: '4', startDate: '2025-05-20', endDate: '2025-06-20' }, // Patch recent past with ShangZheng 50
        { id: 'rule-demo-2', targetFundId: 'demo-1', proxyFundId: '7', startDate: '2025-04-20', endDate: '2025-05-19' }, // Patch older past with ChiNext
    ]);

    // Lifted Portfolio State
    const [portfolio, setPortfolio] = useState<ClientPortfolio>(MOCK_PORTFOLIO);

    const addPatchRule = (rule: PatchRule) => {
        setPatchRules(prev => [...prev, rule]);
    };

    const removePatchRule = (id: string) => {
        setPatchRules(prev => prev.filter(r => r.id !== id));
    };
    
    // Handler to update cash
    const updateAccountCash = (accountId: string, newAmount: number) => {
        setPortfolio(prev => ({
            ...prev,
            accounts: prev.accounts.map(acc => 
                acc.id === accountId ? { ...acc, cashBalance: newAmount } : acc
            )
        }));
    };

    return (
        <HashRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<FundListPage />} />
                    <Route path="/fund/:id" element={
                        <FundDetailPage 
                            patchRules={patchRules} 
                            onAddPatchRule={addPatchRule} 
                            onRemovePatchRule={removePatchRule} 
                        />
                    } />
                    <Route path="/comparison" element={
                        <ComparisonPage 
                            patchRules={patchRules} 
                            onAddPatchRule={addPatchRule} 
                            onRemovePatchRule={removePatchRule} 
                        />
                    } />
                    <Route path="/portfolio" element={
                        <PortfolioPage 
                            patchRules={patchRules} 
                            portfolio={portfolio}
                        />
                    } />
                    <Route path="/liquidity" element={
                        <LiquidityPage 
                            portfolio={portfolio}
                            onUpdateCash={updateAccountCash}
                        />
                    } />
                </Routes>
            </Layout>
        </HashRouter>
    );
};

export default App;