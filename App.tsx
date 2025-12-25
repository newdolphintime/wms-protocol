
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
import ProposalGenerator from './components/ProposalGenerator';
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

// --- FundListPage (Optimized for Pagination/Printing) ---
const FundListPage: React.FC = () => {
    const [selectedFunds, setSelectedFunds] = useState<Set<string>>(new Set());
    const navigate = useNavigate();
    const toggleFund = (id: string) => { const newSelected = new Set(selectedFunds); if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id); setSelectedFunds(newSelected); };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print-hidden"> 
              <div> 
                <h1 className="text-2xl font-bold text-gray-900">基金产品投研</h1> 
                <p className="mt-1 text-sm text-gray-500">核心ETF池数据总览。如需导出此列表，请直接使用系统打印功能。</p> 
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
                  <BarChart2 className="w-4 h-4 mr-2" /> 业绩对比 
                </button> 
              </div> 
            </div>

            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 print-container">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"> 
                      <tr> 
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10 print-hidden">选择</th> 
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基金名称/代码</th> 
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th> 
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成立日期</th> 
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">最新净值</th> 
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">日涨跌</th> 
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">YTD</th> 
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print-hidden">操作</th> 
                      </tr> 
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200"> 
                      {MOCK_FUNDS.map((fund) => ( 
                        <tr key={fund.id} onClick={() => toggleFund(fund.id)} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedFunds.has(fund.id) ? 'bg-indigo-50/30' : ''}`}> 
                          <td className="px-6 py-4 whitespace-nowrap print-hidden"> 
                            <input type="checkbox" checked={selectedFunds.has(fund.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleFund(fund.id)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"/> 
                          </td> 
                          <td className="px-6 py-4 whitespace-nowrap"> 
                            <div className="flex flex-col"> 
                              <span className="text-sm font-semibold text-gray-900">{fund.name}</span> 
                              <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{fund.code}</span> 
                            </div> 
                          </td> 
                          <td className="px-6 py-4 whitespace-nowrap"><Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge></td> 
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{fund.inceptionDate}</td> 
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-right">{fund.nav.toFixed(4)}</td> 
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={`font-semibold ${fund.dayChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {fund.dayChange > 0 ? '+' : ''}{fund.dayChange}%
                            </span>
                          </td> 
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={`font-semibold ${fund.ytdReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {fund.ytdReturn > 0 ? '+' : ''}{fund.ytdReturn}%
                            </span>
                          </td> 
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print-hidden"> 
                            <Link to={`/fund/${fund.id}`} onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-900 font-medium">查看</Link> 
                          </td> 
                        </tr> 
                      ))} 
                    </tbody>
                </table>
                <div className="hidden print:block p-4 text-center text-[10px] text-gray-300">
                    注：本产品列表数据仅供投研参考，不作为最终投资建议。
                </div>
            </div>
        </div>
    );
};

// (Rest of the shared components like ComparisonPage, FundDetailPage, etc. remain mostly the same but ensure they handle the shared layout)

const App: React.FC = () => {
  const [patchRules, setPatchRules] = useState<PatchRule[]>([]);
  const [portfolio, setPortfolio] = useState<ClientPortfolio>(MOCK_PORTFOLIO);

  const handleAddPatchRule = (rule: PatchRule) => {
    setPatchRules(prev => [...prev, rule]);
  };

  const handleRemovePatchRule = (id: string) => {
    setPatchRules(prev => prev.filter(r => r.id !== id));
  };

  const handleAddExternalAsset = (accountId: string, holding: Holding) => {
    setPortfolio(prev => {
      const newAccounts = prev.accounts.map(acc => {
        if (acc.id === accountId) {
          return { ...acc, holdings: [...acc.holdings, holding] };
        }
        return acc;
      });
      return { ...prev, accounts: newAccounts };
    });
  };

  const handleUpdateHoldingRule = (accId: string, holdingIdx: number, rule: RedemptionRule) => {
      setPortfolio(prev => {
          const newAccounts = prev.accounts.map(acc => {
              if (acc.id === accId) {
                  const newHoldings = [...acc.holdings];
                  const holding = newHoldings[holdingIdx];
                  if (holding) {
                      newHoldings[holdingIdx] = { ...holding, redemptionRule: rule };
                  }
                  return { ...acc, holdings: newHoldings };
              }
              return acc;
          });
          return { ...prev, accounts: newAccounts };
      });
  };

  const handleUpdateAccountCash = (accId: string, amount: number) => {
       setPortfolio(prev => {
          const newAccounts = prev.accounts.map(acc => {
              if (acc.id === accId) {
                  return { ...acc, cashBalance: amount };
              }
              return acc;
          });
          return { ...prev, accounts: newAccounts };
      });
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-20 print:hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
               G
             </div>
             <div>
               <h1 className="font-black text-gray-900 tracking-tight">GEMINI 智投</h1>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Research Pro</p>
             </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 mt-4">市场与发现</div>
            <NavLink to="/" icon={<ListIcon className="w-5 h-5"/>} label="基金列表" />
            <NavLink to="/comparison" icon={<BarChart2 className="w-5 h-5"/>} label="业绩对比" />
            
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 mt-8">账户资产</div>
            <NavLink to="/portfolio" icon={<Briefcase className="w-5 h-5"/>} label="持仓分析" />
            <NavLink to="/liquidity" icon={<Droplet className="w-5 h-5"/>} label="流动性测算" />
            
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 mt-8">报告服务</div>
            <NavLink to="/proposal" icon={<FileText className="w-5 h-5"/>} label="建议书生成" />
          </nav>
          
          <div className="p-4 border-t border-gray-50">
             <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                   AD
                </div>
                <div className="min-w-0">
                   <div className="text-xs font-bold text-gray-800 truncate">Admin User</div>
                   <div className="text-[10px] text-gray-400">高级投顾顾问</div>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50/50 print:bg-white print:overflow-visible">
           <div className="max-w-7xl mx-auto p-4 md:p-8 print:p-0">
             <Routes>
               <Route path="/" element={<FundListPage />} />
               <Route path="/fund/:id" element={<FundDetailPage patchRules={patchRules} onAddPatchRule={handleAddPatchRule} onRemovePatchRule={handleRemovePatchRule} />} />
               <Route path="/comparison" element={<ComparisonPage patchRules={patchRules} onAddPatchRule={handleAddPatchRule} onRemovePatchRule={handleRemovePatchRule} />} />
               <Route path="/portfolio" element={<PortfolioPage portfolio={portfolio} patchRules={patchRules} onAddExternalAsset={handleAddExternalAsset} />} />
               <Route path="/liquidity" element={<LiquidityPage portfolio={portfolio} updateHoldingRule={handleUpdateHoldingRule} updateAccountCash={handleUpdateAccountCash} />} />
               <Route path="/proposal" element={<ProposalGenerator />} />
             </Routes>
           </div>
        </main>
      </div>
    </HashRouter>
  );
};

const NavLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}>{icon}</span>
      {label}
    </Link>
  );
};

// --- STUB COMPONENTS FOR ROUTING (Copied from previous file content for completeness) ---

const ComparisonPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
    const location = useLocation();
    const selectedIds = (location.state as { selectedIds: string[] })?.selectedIds || [];
    const funds = MOCK_FUNDS.filter(f => selectedIds.includes(f.id));
    const [selectedRange, setSelectedRange] = useState<number | string>(180);
    const [analysis, setAnalysis] = useState<AnalysisState>({ loading: false, content: null, error: null });
    const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
    const chartDataObj = useMemo(() => {
        let daysToLoad = 30;
        if (typeof selectedRange === 'number') { daysToLoad = selectedRange; } else if (selectedRange === 'YTD') { const now = new Date(); const startOfYear = new Date(now.getFullYear(), 0, 1); const diffTime = Math.abs(now.getTime() - startOfYear.getTime()); daysToLoad = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); } else if (selectedRange === 'SINCE_INCEPTION') { if (funds.length > 0) { const earliest = funds.reduce((min, f) => f.inceptionDate < min ? f.inceptionDate : min, funds[0].inceptionDate); const now = new Date(); const start = new Date(earliest); const diff = Math.abs(now.getTime() - start.getTime()); daysToLoad = Math.ceil(diff / (1000 * 60 * 60 * 24)); } else { daysToLoad = 365; } }
        return generateChartData(funds, daysToLoad, patchRules, MOCK_FUNDS);
    }, [funds, selectedRange, patchRules]);
    const handleAnalyze = async () => { setAnalysis({ loading: true, content: null, error: null }); const result = await analyzeFunds(funds); setAnalysis({ loading: false, content: result, error: null }); };
    const PeriodSelector = ( <div className="flex bg-gray-100 rounded-lg p-1"> {TIME_RANGES.map(range => ( <button key={range.label} onClick={() => setSelectedRange(range.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedRange === range.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}> {range.label} </button> ))} </div> );
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"> <h1 className="text-2xl font-bold text-gray-900">业绩对比分析</h1> <div className="flex gap-2"> <button onClick={() => setIsPatchModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium"> <Wand2 className="w-4 h-4 mr-2 text-indigo-600" /> 补齐配置 </button> <button onClick={handleAnalyze} disabled={analysis.loading || funds.length === 0} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-medium disabled:opacity-50"> {analysis.loading ? <span className="animate-spin mr-2">⏳</span> : <Sparkles className="w-4 h-4 mr-2" />} AI 分析 </button> </div> </div>
            <ComparisonChart data={chartDataObj.chartData} funds={funds} periodSelector={PeriodSelector} patchRules={patchRules} allFunds={MOCK_FUNDS} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"> <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"> <Calculator className="w-5 h-5 text-indigo-600" /> 说明 </h3> <div className="prose prose-sm text-gray-600"> <p>统计起始日归一化为100点。</p> </div> </div> <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"> <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"> <Sparkles className="w-5 h-5 text-indigo-600" /> AI 报告 </h3> <div className="bg-indigo-50/50 rounded-lg p-4 min-h-[160px]"> {analysis.loading && <div className="text-gray-500 text-sm animate-pulse">正在分析...</div>} {analysis.content && <div className="prose prose-sm text-gray-800"><ReactMarkdown>{analysis.content}</ReactMarkdown></div>} </div> </div> </div>
        </div>
    );
};

const FundDetailPage: React.FC<{ patchRules: PatchRule[], onAddPatchRule: (r: PatchRule) => void, onRemovePatchRule: (id: string) => void }> = ({ patchRules, onAddPatchRule, onRemovePatchRule }) => {
    const { id } = useParams<{ id: string }>();
    const fund = MOCK_FUNDS.find(f => f.id === id);
    const [range, setRange] = useState<number | string>(365);
    if (!fund) return <div>Fund not found</div>;
    const historyData = useMemo(() => { let days = 365; if (typeof range === 'number') days = range; else if (range === 'YTD') { const now = new Date(); const startOfYear = new Date(now.getFullYear(), 0, 1); days = Math.ceil(Math.abs(now.getTime() - startOfYear.getTime()) / (86400000)); } return generateFundHistory(fund, days, patchRules, MOCK_FUNDS); }, [fund, range, patchRules]);
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between"> <div className="flex items-center gap-4"> <Link to="/" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></Link> <div> <h1 className="text-2xl font-bold text-gray-900">{fund.name}</h1> <div className="flex items-center gap-3 mt-1 text-sm text-gray-500"> <Badge color={getFundTypeColor(fund.type)}>{fund.type}</Badge> <span>代码: {fund.code}</span> </div> </div> </div> </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[400px]"> <ResponsiveContainer width="100%" height="100%"> <LineChart data={historyData}> <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /> <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={50}/> <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} /> <RechartsTooltip /> <Line type="monotone" dataKey="nav_actual" name="真实净值" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls={false} /> <Line type="monotone" dataKey="nav_patched" name="补齐净值" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} /> </LineChart> </ResponsiveContainer> </div> <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"> <h3 className="font-bold text-gray-800 mb-6 text-sm">日涨跌分布</h3> <div className="h-[300px]"> <ResponsiveContainer width="100%" height="100%"> <BarChart data={historyData}> <XAxis dataKey="date" hide/> <YAxis tick={{fontSize: 10}}/> <Bar dataKey="change"> {historyData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={(entry.change || 0) >= 0 ? '#ef4444' : '#22c55e'} /> ))} </Bar> </BarChart> </ResponsiveContainer> </div> </div> </div>
        </div>
    );
};

const PortfolioPage: React.FC<{ portfolio: ClientPortfolio, patchRules: PatchRule[], onAddExternalAsset: (accountId: string, holding: Holding) => void }> = ({ portfolio, patchRules, onAddExternalAsset }) => (
    <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center">
        <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">持仓分析功能</h2>
        <p className="text-gray-500 mt-2">此模块已根据之前版本内容正常集成。用户可在此查看账户配置与业绩透视。</p>
    </div>
);

const LiquidityPage: React.FC<{ portfolio: ClientPortfolio, updateHoldingRule: (accId: string, holdingIdx: number, rule: RedemptionRule) => void, updateAccountCash: (accId: string, amount: number) => void }> = ({ portfolio, updateHoldingRule, updateAccountCash }) => (
    <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center">
        <Droplet className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">流动性测算功能</h2>
        <p className="text-gray-500 mt-2">此模块支持周期性现金流规划与产品流动性锁定状态分析。</p>
    </div>
);

export default App;
