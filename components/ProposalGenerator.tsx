
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProposalConfig, ProposalAsset, DocumentSection, SectionType } from '../types';
import { MOCK_FUNDS, calculatePortfolioHistory } from '../services/dataService';
import { generateProposalStrategy } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { 
  Printer, 
  Sparkles, 
  Plus, 
  Trash2, 
  Quote, 
  MoveUp, 
  MoveDown, 
  Copy,
  ChevronDown,
  FileText,
  Layout,
  TrendingUp,
  Info,
  ZoomIn,
  ZoomOut,
  Layers,
  Search,
  CheckCircle2
} from 'lucide-react';

const COLORS = ['#e11d21', '#f87171', '#fbbf24', '#34d399', '#60a5fa'];

// --- SHARED PAGE CONTENT COMPONENT ---
// This ensures 100% visual consistency between main view and thumbnails
const RenderPageContent: React.FC<{ 
  section: DocumentSection; 
  config: ProposalConfig; 
  totalAssets: number; 
  pieData: any[]; 
  backtestData: any[];
  isThumbnail?: boolean;
  onUpdateSection?: (id: string, updates: Partial<DocumentSection>) => void;
  onUpdateConfig?: (updates: Partial<ProposalConfig>) => void;
  generatingId?: string | null;
  onGenerateAI?: (id: string) => void;
}> = ({ 
  section, config, totalAssets, pieData, backtestData, isThumbnail = false, 
  onUpdateSection, onUpdateConfig, generatingId, onGenerateAI 
}) => {
  
  const PageHeader = ({ title, sub }: { title: string, sub: string }) => (
    <div className="flex justify-between items-end border-b-2 border-[#e11d21] pb-2 mb-8">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <span className="text-gray-400 text-sm uppercase tracking-wider font-light">{sub}</span>
    </div>
  );

  return (
    <div className={`flex flex-col h-full flex-1 ${isThumbnail ? 'select-none pointer-events-none' : ''}`}>
      {section.type === 'COVER' && (
          <div className="flex flex-col h-full -m-[20mm] p-[30mm] relative overflow-hidden flex-1">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gray-50 rounded-bl-full -z-10 opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-full h-[400px] bg-gradient-to-tr from-[#e11d21] to-[#ff5252] -z-10" style={{clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)'}}></div>
              
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#e11d21] rotate-45 flex items-center justify-center shadow-lg shadow-red-200"><div className="w-6 h-6 border-2 border-white -rotate-45"></div></div>
                  <div className="text-3xl font-black tracking-widest text-gray-800 uppercase italic">SDIC Trust</div>
              </div>

              <div className="text-center mt-48 flex flex-col items-center">
                  <h1 className="text-7xl font-black text-gray-900 tracking-tighter mb-16 leading-[0.9]">
                    投资规划建议书
                  </h1>
                  <div className="h-1.5 w-40 bg-[#e11d21] mb-12 rounded-full"></div>
                  
                  <div className="text-3xl text-gray-700 font-medium mb-4 flex items-center justify-center">
                      敬呈 
                      {!isThumbnail ? (
                        <input 
                          type="text" 
                          value={config.clientName} 
                          onChange={e => onUpdateConfig?.({ clientName: e.target.value })} 
                          className="text-4xl font-black border-b-4 border-gray-900 pb-2 mx-4 text-center w-64 bg-transparent focus:outline-none focus:border-[#e11d21] placeholder-gray-100 transition-colors"
                          placeholder="客户姓名"
                        />
                      ) : (
                        <div className="text-4xl font-black border-b-4 border-gray-900 pb-2 mx-4 text-center w-64 text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis px-2 h-[50px] flex items-center justify-center">
                           {config.clientName || '客户姓名'}
                        </div>
                      )}
                      女士/先生
                  </div>
              </div>

              <div className="mt-auto mb-12 flex justify-between items-end">
                  <div className="text-white/90">
                      <div className="text-sm font-bold uppercase tracking-[0.4em] mb-1 opacity-70">Privilege & Professional</div>
                      <div className="text-xl font-black italic tracking-wider">WEALTH MANAGEMENT SOLUTIONS</div>
                  </div>
                  <div className="text-right text-white/80 space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60">Authorized Manager</div>
                      <div className="font-black text-lg">{config.managerName}</div>
                      <div className="text-xs font-mono font-bold">{config.date}</div>
                  </div>
              </div>
          </div>
      )}

      {section.type === 'DEMAND_ALLOCATION' && (
          <div className="flex flex-col h-full flex-1">
              <PageHeader title="一、配置模型与资产全景" sub="Global Asset Allocation" />
              
              <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="bg-gray-50 rounded-[30px] p-8 border border-gray-100 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center gap-5 mb-8">
                          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">{config.clientName?.[0] || 'C'}</div>
                          <div>
                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Target Profile</div>
                              <h3 className="text-2xl font-black text-gray-900 leading-tight">{config.clientName} 贵宾客户</h3>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Search className="w-3 h-3"/> 风险承受</div>
                              {!isThumbnail ? (
                                <select 
                                  value={config.riskLevel} 
                                  onChange={e => onUpdateConfig?.({ riskLevel: e.target.value })} 
                                  className="w-full text-lg font-black text-[#e11d21] bg-transparent border-none p-0 focus:ring-0 appearance-none cursor-pointer"
                                >
                                  <option>保守型</option><option>稳健型</option><option>平衡型</option><option>积极型</option><option>激进型</option>
                                </select>
                              ) : (
                                <div className="text-lg font-black text-[#e11d21]">{config.riskLevel}</div>
                              )}
                          </div>
                          <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Info className="w-3 h-3"/> 投资期限</div>
                              {!isThumbnail ? (
                                <input 
                                  value={config.investmentHorizon} 
                                  onChange={e => onUpdateConfig?.({ investmentHorizon: e.target.value })} 
                                  className="w-full text-lg font-black text-gray-800 bg-transparent border-none p-0 focus:ring-0"
                                />
                              ) : (
                                <div className="text-lg font-black text-gray-800 truncate">{config.investmentHorizon}</div>
                              )}
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-[#fff9f9] rounded-[30px] p-8 border border-[#fed7d7] flex flex-col justify-center items-center relative overflow-hidden shadow-inner">
                      <div className="text-xs text-[#e11d21] font-black uppercase tracking-[0.3em] mb-3 z-10 opacity-70">Total Portfolio Value</div>
                      <div className="text-5xl font-black text-gray-900 font-mono z-10 tracking-tighter">
                          ¥{totalAssets.toLocaleString()} <span className="text-xl font-medium">万</span>
                      </div>
                      <div className="absolute -bottom-8 -right-8 p-2 opacity-5"><Layout className="w-48 h-48 rotate-12"/></div>
                  </div>
              </div>

              <div className="flex-1 flex gap-12">
                  <div className="w-1/2 flex flex-col">
                      <h4 className="text-sm font-black text-gray-800 mb-8 flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-[#e11d21] rounded-full"></div> 组合权重分析
                      </h4>
                      <div className="h-[350px] w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={6} dataKey="value" stroke="none" isAnimationActive={!isThumbnail}>
                                      {pieData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                  </Pie>
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[10px] text-gray-400 font-black tracking-[0.2em] mb-1">TOTAL CAP</span>
                              <span className="text-3xl font-black text-gray-900 font-mono tracking-tighter">100%</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="w-1/2">
                      <h4 className="text-sm font-black text-gray-800 mb-8 flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-[#e11d21] rounded-full"></div> 配置清单详情
                      </h4>
                      <div className="space-y-4">
                          {config.assets.map((a, i) => {
                              const f = MOCK_FUNDS.find(fund => fund.id === a.fundId);
                              return (
                                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-gray-50 group hover:border-indigo-100 transition-all shadow-sm">
                                      <div className="flex flex-col min-w-0 pr-2 flex-1">
                                          {!isThumbnail ? (
                                            <select 
                                                value={a.fundId} 
                                                onChange={e => {
                                                    const n = [...config.assets]; n[i] = {...n[i], fundId: e.target.value}; onUpdateConfig?.({ assets: n });
                                                }} 
                                                className="text-sm font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 truncate cursor-pointer print:appearance-none print:pointer-events-none w-full"
                                            >
                                                {MOCK_FUNDS.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
                                            </select>
                                          ) : (
                                            <div className="text-sm font-black text-gray-900 truncate">{f?.name || '未选择基金'}</div>
                                          )}
                                          <span className="text-[10px] text-gray-400 font-mono font-bold mt-1 tracking-wider uppercase">{f?.code || '---'}</span>
                                      </div>
                                      <div className="flex items-center gap-4 shrink-0">
                                          <div className="text-right">
                                              <div className="flex items-center gap-1 justify-end">
                                                  {!isThumbnail ? (
                                                    <input 
                                                      type="number" 
                                                      value={a.amount} 
                                                      onChange={e => {
                                                          const n = [...config.assets]; n[i] = {...n[i], amount: Number(e.target.value)}; onUpdateConfig?.({ assets: n });
                                                      }} 
                                                      className="w-20 text-right text-base font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 font-mono"
                                                    />
                                                  ) : (
                                                    <span className="text-base font-black text-gray-900 font-mono">{a.amount}</span>
                                                  )}
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase">万</span>
                                              </div>
                                              <div className="text-[11px] font-black font-mono text-indigo-600/60">{totalAssets > 0 ? ((a.amount/totalAssets)*100).toFixed(1) : 0}%</div>
                                          </div>
                                          {!isThumbnail && (
                                            <button onClick={() => {
                                                const n = [...config.assets]; n.splice(i, 1); onUpdateConfig?.({ assets: n });
                                            }} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 print:hidden active:scale-90">
                                                <Trash2 className="w-4.5 h-4.5"/>
                                            </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                          {!isThumbnail && (
                            <button onClick={() => onUpdateConfig?.({ assets: [...config.assets, {fundId: '1', amount: 100}] })} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs font-black hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 print:hidden uppercase tracking-widest">
                                <Plus className="w-4 h-4"/> 插入资产项
                            </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {(section.type === 'STRATEGY' || section.type === 'CUSTOM_TEXT') && (
          <div className="flex flex-col h-full flex-1">
              <PageHeader 
                  title={section.type === 'STRATEGY' ? "二、投研观点与市场解读" : section.title || '自定义章节'} 
                  sub={section.type === 'STRATEGY' ? "Strategy Insights" : "Customized Content"} 
              />
              
              {section.type === 'CUSTOM_TEXT' && (
                 !isThumbnail ? (
                  <input 
                    value={section.title} 
                    onChange={e => onUpdateSection?.(section.id, { title: e.target.value })} 
                    className="text-3xl font-black text-indigo-600 mb-8 border-none focus:ring-0 p-0 w-full placeholder-gray-100 print:hidden"
                    placeholder="页面主标题..."
                  />
                 ) : (
                  <div className="text-3xl font-black text-indigo-600 mb-8 truncate">{section.title || '自定义章节'}</div>
                 )
              )}

              <div className="bg-[#fff9f9] border-2 border-[#fed7d7] rounded-[40px] p-16 min-h-[500px] flex-1 relative overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-10 relative z-10">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#e11d21] rounded-2xl flex items-center justify-center shadow-xl shadow-red-100">
                              <Quote className="w-6 h-6 text-white"/>
                          </div>
                          <h4 className="font-black text-2xl text-gray-900 tracking-tighter">
                              {section.type === 'STRATEGY' ? '核心投研结论' : '补充内容'}
                          </h4>
                      </div>
                      {section.type === 'STRATEGY' && !isThumbnail && (
                          <button onClick={() => onGenerateAI?.(section.id)} disabled={generatingId === section.id} className="print:hidden bg-white border-2 border-red-100 text-[#e11d21] px-6 py-2.5 rounded-2xl hover:bg-red-50 flex items-center gap-3 text-sm font-black shadow-sm transition-all active:scale-95">
                             {generatingId === section.id ? <div className="w-4 h-4 border-3 border-red-500 border-t-transparent animate-spin rounded-full"></div> : <Sparkles className="w-4.5 h-4.5"/>}
                             {generatingId === section.id ? '深度构思中...' : 'AI 专家撰写'}
                          </button>
                      )}
                  </div>
                  
                  {!isThumbnail ? (
                    <textarea 
                        value={section.content}
                        onChange={e => onUpdateSection?.(section.id, { content: e.target.value })}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-700 text-xl leading-[2.2] resize-none overflow-hidden placeholder-red-200 text-justify print:hidden font-light p-0"
                        placeholder="在此撰写或由AI生成专业的投资逻辑与观点阐述..."
                        style={{ minHeight: '400px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                  ) : (
                    <div className="text-gray-700 text-xl leading-[2.2] text-justify whitespace-pre-wrap relative z-10 font-light p-0">
                        {section.content?.split('\n').map((line, i) => (
                            <div key={i} className={line.trim() === '' ? 'h-10' : 'mb-6'}>{line}</div>
                        ))}
                    </div>
                  )}
                  {/* Hidden print block for main view to support printing correctly */}
                  {!isThumbnail && (
                     <div className="hidden print:block text-gray-700 text-xl leading-[2.2] text-justify whitespace-pre-wrap relative z-10 font-light p-0">
                        {section.content?.split('\n').map((line, i) => (
                            <div key={i} className={line.trim() === '' ? 'h-10' : 'mb-6'}>{line}</div>
                        ))}
                     </div>
                  )}

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                      <div className="w-[700px] h-[700px] bg-[#e11d21] rotate-45 flex items-center justify-center">
                          <span className="text-white text-[200px] font-black -rotate-45 tracking-[0.5em] italic">TRUST</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {section.type === 'BACKTEST' && (
          <div className="flex flex-col h-full flex-1">
              <PageHeader title="三、模拟组合业绩追溯" sub="Historical Backtest" />
              
              <div className="bg-white border border-gray-100 rounded-[50px] p-12 mb-12 h-[550px] shadow-sm flex flex-col relative overflow-hidden group/chart">
                  <div className="flex items-center justify-between mb-12 relative z-10">
                      <div>
                          <h4 className="text-2xl font-black text-gray-900 tracking-tighter">累计收益率对比 (Normalized)</h4>
                          <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-[0.4em]">Performance Trailing (Last 12 Months)</p>
                      </div>
                      <div className="flex items-center gap-8 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3"><div className="w-6 h-2 bg-[#e11d21] rounded-full"></div><span className="text-xs font-black text-gray-600 uppercase tracking-widest">建议组合</span></div>
                          <div className="flex items-center gap-3"><div className="w-6 h-2 bg-gray-300 rounded-full border-dashed"></div><span className="text-xs font-black text-gray-600 uppercase tracking-widest">市场基准</span></div>
                      </div>
                  </div>
                  <div className="flex-1 relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={backtestData} margin={{top: 0, right: 10, left: 0, bottom: 0}}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5"/>
                              <XAxis dataKey="date" tick={{fontSize: 10, fill: '#bbb', fontWeight: 700}} tickLine={false} axisLine={{stroke: '#eee'}} minTickGap={60}/>
                              <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#bbb', fontWeight: 700}} tickLine={false} axisLine={false} />
                              <Line type="monotone" dataKey="value" stroke="#e11d21" strokeWidth={5} dot={false} animationDuration={2500} strokeLinecap="round" isAnimationActive={!isThumbnail} />
                              <Line type="monotone" dataKey="benchmark" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="10 10" dot={false} strokeLinecap="round" isAnimationActive={!isThumbnail} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] -z-0"><TrendingUp className="w-64 h-64 rotate-6 text-gray-300"/></div>
              </div>

              <div className="bg-[#fff9f9] border-l-[12px] border-[#e11d21] p-10 rounded-[30px] shadow-sm relative overflow-hidden">
                  <h5 className="font-black text-gray-900 mb-4 flex items-center gap-3 text-lg uppercase tracking-tight"><Info className="w-6 h-6 text-[#e11d21]"/> 模拟计算模型说明</h5>
                  <p className="text-base text-gray-600 leading-relaxed text-justify font-light relative z-10">
                      本演示回测系统基于各配置产品的历史净值数据进行加权算力模拟。数据源自交易所公开披露信息，按当日收盘价（或最新NAV）进行归一化（Base=100）对标。回测旨在揭示该组合方案在特定市场周期下的波动特征与抗风险能力，不预示其未来收益路径。投资活动受宏观政策、市场情绪等多重复杂因素影响，客户需在持有期内动态关注组合风险波动。
                  </p>
              </div>
          </div>
      )}

      {section.type === 'DISCLAIMER' && (
          <div className="flex flex-col h-full flex-1">
            <div className="border-t-[12px] border-[#e11d21] pt-20 flex-1">
                  <div className="flex justify-between items-baseline mb-20">
                      <h1 className="text-6xl font-black text-gray-100 tracking-tighter italic uppercase select-none">Disclaimer & Legal</h1>
                      <span className="text-xs text-gray-300 font-mono font-black tracking-widest uppercase">DOC-STT-AIST-2025</span>
                  </div>
                  
                  <div className="text-[13px] text-gray-400 leading-[2.4] space-y-10 text-justify columns-2 gap-20">
                      <p className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">I. Legal Statement</p>
                      <p>本建议书所载的一切资产配置建议、投研观点及数据分析结论均旨在为您提供专业决策参考。其内容基于当前市场环境下的公开信息及逻辑推演，并不构成具备法律约束力的产品承诺或保本承诺。私人理财经理提供的建议应结合您的实际财务状况与风险偏好进行审慎评估。</p>
                      <p className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">II. Risk Disclosure</p>
                      <p>资本市场投资具有原生不确定性。本方案涉及的各类标的（如宽基指数ETF、跨境ETF等）均受宏观流动性、行业基本面及政策波动等因素影响。建议书中展示的历史模拟回测结果不代表未来。投资者应充分认知“买者自负”原则，在签署协议前完成必要的合格投资者认证及风险测评。</p>
                      <p>本建议书的时效性受市场瞬息万变之特征限制，逾期或遇重大政策变动时，建议您及时联络专属理财顾问获取最新修定方案。</p>
                  </div>
            </div>
            
            <div className="mt-40 grid grid-cols-2 gap-40 pb-16">
                  <div className="text-center group/sign cursor-pointer">
                      <div className="h-24 flex flex-col justify-end items-center border-b-2 border-gray-100 group-hover/sign:border-indigo-600 transition-all duration-500 pb-4">
                          <span className="text-gray-300 font-serif italic mb-2 opacity-0 group-hover/sign:opacity-100 transform translate-y-2 group-hover/sign:translate-y-0 transition-all">Digital Signature Secured</span>
                      </div>
                      <div className="text-[11px] text-gray-500 uppercase tracking-[0.5em] mt-6 font-black">Authorized Advisor</div>
                  </div>
                  <div className="text-center group/sign cursor-pointer">
                      <div className="h-24 flex flex-col justify-end items-center border-b-2 border-gray-100 group-hover/sign:border-[#e11d21] transition-all duration-500 pb-4">
                          <span className="text-gray-300 font-serif italic mb-2 opacity-0 group-hover/sign:opacity-100 transform translate-y-2 group-hover/sign:translate-y-0 transition-all">Client Hand Signature</span>
                      </div>
                      <div className="text-[11px] text-gray-500 uppercase tracking-[0.5em] mt-6 font-black">Acknowledgement Signature</div>
                  </div>
            </div>
          </div>
      )}
    </div>
  );
};

const ProposalGenerator: React.FC = () => {
  const [config, setConfig] = useState<ProposalConfig>({
      clientName: '何芬',
      managerName: '何雅婷',
      date: new Date().toISOString().split('T')[0],
      riskLevel: '积极型',
      investmentHorizon: '小于1年',
      totalAmount: 1846.23,
      assets: [
          { fundId: '1', amount: 523.38 }, 
          { fundId: '3', amount: 10.00 },  
          { fundId: '6', amount: 1312.85 } 
      ],
      sections: [
          { id: 'sec-1', type: 'COVER' },
          { id: 'sec-2', type: 'DEMAND_ALLOCATION' },
          { id: 'sec-3', type: 'STRATEGY', content: '【配置思路】\n本方案构建了以宽基指数ETF为核心，辅以科创板高弹性资产的组合。大部分仓位配置于沪深300和中证500指数基金，确保了组合的基础收益与市场平均水平保持一致。\n\n【市场展望】\n当前A股市场估值处于历史相对低位区间。' },
          { id: 'sec-4', type: 'BACKTEST' },
          { id: 'sec-5', type: 'DISCLAIMER' }
      ]
  });

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  
  const pageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Calculations
  const totalAssets = useMemo(() => config.assets.reduce((sum, a) => sum + a.amount, 0), [config.assets]);
  
  useEffect(() => {
      if (Math.abs(totalAssets - config.totalAmount) > 0.01) {
          setConfig(p => ({ ...p, totalAmount: Number(totalAssets.toFixed(2)) }));
      }
  }, [totalAssets]);

  const pieData = useMemo(() => {
      const typeMap: {[key: string]: number} = {};
      config.assets.forEach(a => {
          const f = MOCK_FUNDS.find(fund => fund.id === a.fundId);
          const type = f ? f.type : '其他';
          typeMap[type] = (typeMap[type] || 0) + a.amount;
      });
      return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [config.assets]);

  const backtestData = useMemo(() => calculatePortfolioHistory(config.assets, 365), [config.assets]);

  // --- ACTIONS ---
  
  const handleAddSection = (index: number, type: SectionType) => {
      const newId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newSection: DocumentSection = {
          id: newId,
          type,
          title: type === 'CUSTOM_TEXT' ? '补充说明' : undefined,
          content: (type === 'CUSTOM_TEXT' || type === 'STRATEGY') ? '' : undefined
      };
      const newSections = [...config.sections];
      newSections.splice(index + 1, 0, newSection);
      setConfig({ ...config, sections: newSections });
      setOpenDropdownIndex(null);
      setTimeout(() => scrollToPage(newId), 100);
  };

  const handleRemoveSection = (id: string) => {
      if (config.sections.length <= 1) return;
      setConfig({ ...config, sections: config.sections.filter(s => s.id !== id) });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
      const newSections = [...config.sections];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSections.length) return;
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setConfig({ ...config, sections: newSections });
  };

  const updateSection = (id: string, updates: Partial<DocumentSection>) => {
      setConfig({
          ...config,
          sections: config.sections.map(s => s.id === id ? { ...s, ...updates } : s)
      });
  };

  const handleGenerateAI = async (id: string) => {
      setGeneratingId(id);
      try {
          const text = await generateProposalStrategy(config);
          updateSection(id, { content: text });
      } finally {
          setGeneratingId(null);
      }
  };

  const handleDuplicateSection = (index: number) => {
      const original = config.sections[index];
      const newId = `sec-copy-${Date.now()}`;
      const copy = { ...original, id: newId };
      const newSections = [...config.sections];
      newSections.splice(index + 1, 0, copy);
      setConfig({ ...config, sections: newSections });
      setTimeout(() => scrollToPage(newId), 100);
  };

  const scrollToPage = (id: string) => {
      setActivePageId(id);
      pageRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- RENDERING HELPERS ---

  const AddSectionTrigger = ({ index }: { index: number }) => {
    const isOpen = openDropdownIndex === index;
    
    return (
      <div className={`relative h-12 flex items-center justify-center transition-all z-40 print:hidden ${isOpen ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-gray-300"></div></div>
          <div className="relative flex gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-1.5 ring-4 ring-gray-100/50">
              <button 
                onClick={() => handleAddSection(index, 'CUSTOM_TEXT')} 
                className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-indigo-600 transition-colors"
              >
                  <Plus className="w-4 h-4"/> 插入新页
              </button>
              <div className="w-px h-3 bg-gray-200 self-center"></div>
              <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownIndex(isOpen ? null : index);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isOpen ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'}`}
                  >
                      更多模块 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                  </button>
                  
                  {isOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownIndex(null)}></div>
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 min-w-[140px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <button onClick={() => handleAddSection(index, 'STRATEGY')} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors">
                            <Quote className="w-4 h-4 opacity-70"/> 策略观点页
                          </button>
                          <button onClick={() => handleAddSection(index, 'BACKTEST')} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors">
                            <TrendingUp className="w-4 h-4 opacity-70"/> 历史回测页
                          </button>
                          <button onClick={() => handleAddSection(index, 'DEMAND_ALLOCATION')} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors">
                            <Layout className="w-4 h-4 opacity-70"/> 资产配置页
                          </button>
                          <div className="h-px bg-gray-100 my-1 mx-2"></div>
                          <button onClick={() => handleAddSection(index, 'COVER')} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors">
                            <FileText className="w-4 h-4 opacity-70"/> 封面页
                          </button>
                      </div>
                    </>
                  )}
              </div>
          </div>
      </div>
    );
  };

  const SectionControls = ({ section, index }: { section: DocumentSection, index: number }) => (
    <div className="absolute -right-20 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden sticky top-32 z-30">
        <button onClick={() => handleRemoveSection(section.id)} className="p-3 bg-white text-gray-400 hover:text-red-500 rounded-2xl shadow-xl border border-gray-100 transition-all hover:scale-110 active:scale-95" title="删除当前页">
            <Trash2 className="w-5 h-5"/>
        </button>
        <button onClick={() => handleDuplicateSection(index)} className="p-3 bg-white text-gray-400 hover:text-indigo-500 rounded-2xl shadow-xl border border-gray-100 transition-all hover:scale-110 active:scale-95" title="复制当前页">
            <Copy className="w-5 h-5"/>
        </button>
        <div className="w-full h-px bg-gray-100 my-1"></div>
        <button onClick={() => handleMoveSection(index, 'up')} disabled={index === 0} className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl shadow-xl border border-gray-100 disabled:opacity-30 transition-all" title="上移">
            <MoveUp className="w-5 h-5"/>
        </button>
        <button onClick={() => handleMoveSection(index, 'down')} disabled={index === config.sections.length - 1} className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl shadow-xl border border-gray-100 disabled:opacity-30 transition-all" title="下移">
            <MoveDown className="w-5 h-5"/>
        </button>
    </div>
  );

  return (
    <div className="bg-gray-100 h-screen flex flex-col font-sans overflow-hidden">
       {/* TOOLBAR */}
       <div className="z-50 bg-white border-b border-gray-200 px-8 py-3.5 flex justify-between items-center shadow-sm print:hidden shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"><FileText className="w-5 h-5"/></div>
                 <div>
                    <h2 className="text-lg font-bold text-gray-800 leading-tight">建议书设计中心</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Workspace v2.0</p>
                 </div>
             </div>
             <div className="h-8 w-px bg-gray-200 mx-2"></div>
             {/* ZOOM CONTROLS */}
             <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                 <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-all"><ZoomOut className="w-4 h-4"/></button>
                 <span className="text-xs font-black text-gray-700 w-12 text-center font-mono">{zoomLevel}%</span>
                 <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-all"><ZoomIn className="w-4 h-4"/></button>
             </div>
          </div>

          <div className="flex gap-4">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#e11d21] text-white px-6 py-2.5 rounded-xl hover:bg-[#c53030] text-sm font-semibold transition-all shadow-lg shadow-red-200">
                  <Printer className="w-4 h-4"/> 导出 / 预览 PDF
              </button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR PREVIEW - DYNAMIC CONTENT SYNCED WITH 100% VISUAL CONSISTENCY */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 print:hidden shadow-inner">
             <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5"/> 页面大纲 (预览)
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{config.sections.length} P</span>
             </div>
             <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-gray-50/30">
                {config.sections.map((section, idx) => (
                    <div 
                        key={section.id} 
                        onClick={() => scrollToPage(section.id)}
                        className={`group cursor-pointer relative transition-all duration-300 ${activePageId === section.id ? 'scale-[1.05] z-10' : 'hover:scale-[1.02]'}`}
                    >
                        <div className={`rounded-xl border-2 transition-all flex flex-col overflow-hidden shadow-sm ${activePageId === section.id ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl' : 'border-gray-200 bg-white group-hover:border-gray-300'}`}>
                            
                            {/* MINI PREVIEW CONTENT - THE ACTUAL PAGE CONTENT SCALED DOWN */}
                            <div className="w-full aspect-[210/297] relative overflow-hidden bg-gray-200 border-b border-gray-300">
                                <div 
                                    className="absolute top-0 left-1/2 bg-white shadow-lg origin-top"
                                    style={{ 
                                        width: '210mm', 
                                        height: '297mm', 
                                        transform: 'translateX(-50%) scale(0.30)', 
                                        padding: '20mm',
                                        pointerEvents: 'none',
                                        userSelect: 'none'
                                    }}
                                >
                                    <RenderPageContent 
                                      section={section}
                                      config={config}
                                      totalAssets={totalAssets}
                                      pieData={pieData}
                                      backtestData={backtestData}
                                      isThumbnail={true}
                                    />
                                </div>
                            </div>
                            
                            <div className={`px-2.5 py-2 text-[10px] font-black transition-colors flex items-center justify-between ${activePageId === section.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                                <span className="truncate pr-2 uppercase tracking-tighter">
                                  {idx + 1}. {section.title || (section.type === 'COVER' ? '建议书封面' : section.type === 'DEMAND_ALLOCATION' ? '资产配置' : section.type === 'BACKTEST' ? '业绩回测' : section.type === 'STRATEGY' ? '策略观点' : '补充内容')}
                                </span>
                                {activePageId === section.id && <CheckCircle2 className="w-2.5 h-2.5"/>}
                            </div>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* MAIN DOCUMENT CANVAS */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8 custom-scrollbar scroll-smooth">
             <div 
                className="flex flex-col items-center origin-top transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel / 100})` }}
             >
                <AddSectionTrigger index={-1} />

                {config.sections.map((section, index) => (
                    <React.Fragment key={section.id}>
                        <div 
                            ref={el => pageRefs.current[section.id] = el}
                            className="group relative flex justify-center w-full"
                        >
                            <SectionControls section={section} index={index} />

                            <div className={`w-[210mm] mx-auto bg-white shadow-2xl my-6 print:shadow-none print:my-0 flex flex-col relative transition-all duration-500 print:break-after-page ${section.type === 'PAGE_BREAK' ? 'min-h-0 p-0' : 'min-h-[297mm] h-auto p-[20mm]'}`}>
                                <RenderPageContent 
                                  section={section}
                                  config={config}
                                  totalAssets={totalAssets}
                                  pieData={pieData}
                                  backtestData={backtestData}
                                  onUpdateSection={updateSection}
                                  onUpdateConfig={(updates) => setConfig({ ...config, ...updates })}
                                  generatingId={generatingId}
                                  onGenerateAI={handleGenerateAI}
                                />
                            </div>
                        </div>

                        <AddSectionTrigger index={index} />
                    </React.Fragment>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default ProposalGenerator;
