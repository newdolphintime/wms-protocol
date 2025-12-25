
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProposalConfig, ProposalAsset } from '../types';
import { MOCK_FUNDS, calculatePortfolioHistory } from '../services/dataService';
import { generateProposalStrategy } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Printer, Sparkles, Plus, Trash2 } from 'lucide-react';

const ProposalGenerator: React.FC = () => {
  // State for the document
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
      aiAnalysis: '【配置思路】\n本方案构建了以宽基指数ETF为核心，辅以科创板高弹性资产的组合。大部分仓位配置于沪深300和中证500，确保了组合的基础收益与市场平均水平保持一致，有效控制了整体波动。少量仓位配置于科创50，旨在博取科技成长带来的超额收益。\n\n【市场展望】\n当前A股市场估值处于历史低位，具备较高的安全边际。随着宏观经济复苏政策的逐步落地，核心资产有望迎来估值修复。该组合攻守兼备，既能防守市场波动，又能捕捉反弹机会。\n\n【风险提示】\n投资有风险，入市需谨慎。'
  });

  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [config.aiAnalysis]);

  // Calculations
  const totalAssets = useMemo(() => config.assets.reduce((sum, a) => sum + a.amount, 0), [config.assets]);
  
  // Sync total amount
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
  const COLORS = ['#e11d21', '#f87171', '#fbbf24', '#34d399', '#60a5fa'];

  // Actions
  const handleAddAsset = () => {
      const available = MOCK_FUNDS.find(f => !config.assets.some(a => a.fundId === f.id));
      if (available) {
          setConfig(prev => ({ ...prev, assets: [...prev.assets, { fundId: available.id, amount: 100 }] }));
      }
  };

  const handleRemoveAsset = (idx: number) => {
      const newAssets = [...config.assets];
      newAssets.splice(idx, 1);
      setConfig(prev => ({ ...prev, assets: newAssets }));
  };

  const handleUpdateAsset = (idx: number, field: keyof ProposalAsset, value: any) => {
      const newAssets = [...config.assets];
      newAssets[idx] = { ...newAssets[idx], [field]: value };
      setConfig(prev => ({ ...prev, assets: newAssets }));
  };

  const handleGenerateAI = async () => {
      setGenerating(true);
      try {
          const text = await generateProposalStrategy(config);
          setConfig(prev => ({ ...prev, aiAnalysis: text }));
      } finally {
          setGenerating(false);
      }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-20 font-sans">
       {/* Toolbar */}
       <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm print:hidden">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-gray-800">建议书编辑</h2>
             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">所见即所得模式</span>
          </div>
          <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium">
                  <Printer className="w-4 h-4"/> 打印 / 导出PDF
              </button>
          </div>
       </div>

       {/* DOCUMENT CANVAS */}
       <div className="print:w-full print:max-w-none">
          
          {/* PAGE 1: COVER */}
          <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl my-8 relative flex flex-col p-16 print:shadow-none print:my-0 print:break-after-page overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gray-50 rounded-bl-full -z-10 opacity-50"></div>
             <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-tr from-[#e11d21] to-[#ff5252] -z-10" style={{clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)'}}></div>

             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[#e11d21] rotate-45"></div>
                 <div className="text-2xl font-bold tracking-widest text-gray-800">国投泰康信托</div>
                 <div className="text-[10px] text-gray-500 mt-1 self-end">SDIC TAIKANG TRUST</div>
             </div>

             <div className="text-center mt-32 flex flex-col items-center">
                 <h1 className="text-6xl font-bold text-gray-900 tracking-wider mb-12">投资规划建议书</h1>
                 <div className="text-2xl text-gray-700 font-medium mb-4 flex items-center justify-center">
                    敬呈 
                    <input 
                        type="text" 
                        value={config.clientName} 
                        onChange={e => setConfig({...config, clientName: e.target.value})}
                        className="text-3xl font-bold border-b-2 border-gray-900 pb-1 mx-2 text-center w-48 bg-transparent focus:outline-none focus:border-[#e11d21] placeholder-gray-300"
                        placeholder="客户姓名"
                    />
                    女士/先生
                 </div>
                 <div className="text-gray-500 mt-8 flex items-center gap-2">
                    理财经理：
                    <input 
                        type="text" 
                        value={config.managerName}
                        onChange={e => setConfig({...config, managerName: e.target.value})}
                        className="border-b border-gray-300 bg-transparent text-center focus:outline-none focus:border-[#e11d21] w-32"
                    />
                    <span className="mx-2">|</span>
                    <input 
                        type="date" 
                        value={config.date}
                        onChange={e => setConfig({...config, date: e.target.value})}
                        className="border-b border-gray-300 bg-transparent text-center focus:outline-none focus:border-[#e11d21] font-mono text-sm"
                    />
                 </div>
             </div>
             
             <div className="mt-auto mb-20 ml-20">
                <div className="text-white/80 text-xl font-light tracking-[0.2em] -rotate-45 origin-bottom-left absolute bottom-48 left-32">PROFESSIONALLY TAILORED FOR YOU</div>
             </div>
          </div>

          {/* PAGE 2: CONTENT */}
          <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl my-8 p-12 print:shadow-none print:my-0 print:break-after-page flex flex-col">
              <div className="flex justify-between items-end border-b-2 border-[#e11d21] pb-2 mb-8">
                   <h2 className="text-2xl font-bold text-gray-800">您本次的投资规划需求</h2>
                   <span className="text-gray-400 text-sm">PRIVATE WEALTH MANAGEMENT</span>
              </div>

              {/* Info Cards */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">{config.clientName?.[0]}</div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">{config.clientName} 贵宾</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                              本次规划类型：财富保值增值 &nbsp; | &nbsp; 配置日期：{config.date}
                          </p>
                      </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center divide-x divide-gray-200">
                       <div className="flex flex-col items-center">
                           <div className="text-sm text-gray-500 mb-1">风险等级</div>
                           <select 
                                value={config.riskLevel}
                                onChange={e => setConfig({...config, riskLevel: e.target.value})}
                                className="text-xl font-bold text-[#e11d21] bg-transparent border-none focus:ring-0 text-center cursor-pointer appearance-none p-0 w-full"
                           >
                                <option>保守型</option>
                                <option>稳健型</option>
                                <option>平衡型</option>
                                <option>积极型</option>
                                <option>激进型</option>
                           </select>
                           <div className="text-xs text-gray-400 mt-1">最大回撤不超过10%</div>
                       </div>
                       <div className="flex flex-col items-center">
                           <div className="text-sm text-gray-500 mb-1">投资期限</div>
                           <input 
                                value={config.investmentHorizon}
                                onChange={e => setConfig({...config, investmentHorizon: e.target.value})}
                                className="text-xl font-bold text-gray-800 bg-transparent border-none focus:ring-0 text-center w-full"
                           />
                       </div>
                       <div>
                           <div className="text-sm text-gray-500 mb-1">本次规划金额</div>
                           <div className="text-xl font-bold text-gray-800">{totalAssets.toLocaleString()} <span className="text-sm font-normal">万元</span></div>
                       </div>
                       <div>
                           <div className="text-sm text-gray-500 mb-1">规划类型</div>
                           <div className="text-xl font-bold text-[#e11d21]">组合配置</div>
                       </div>
                  </div>
              </div>

              {/* Allocation Section */}
              <div className="flex items-center justify-between mb-6 pl-4 border-l-4 border-[#e11d21]">
                  <h3 className="text-xl font-bold text-gray-800">资产配置建议</h3>
                  <button onClick={handleAddAsset} className="print:hidden text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 flex items-center gap-1">
                      <Plus className="w-3 h-3"/> 添加产品
                  </button>
              </div>

              <div className="flex gap-8 mb-8">
                  {/* Chart */}
                  <div className="w-1/3 h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                                  {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-sm text-gray-500">配置总额</span>
                          <span className="text-xl font-bold text-gray-800">{totalAssets.toLocaleString()}</span>
                      </div>
                  </div>

                  {/* Editable Table */}
                  <div className="w-2/3">
                       <table className="w-full text-sm">
                           <thead className="bg-gray-100 text-gray-600">
                               <tr>
                                   <th className="px-4 py-2 text-left rounded-l-lg">产品名称</th>
                                   <th className="px-4 py-2 text-center">类型</th>
                                   <th className="px-4 py-2 text-right">目标金额 (万元)</th>
                                   <th className="px-4 py-2 text-right">占比</th>
                                   <th className="w-8 rounded-r-lg print:hidden"></th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {config.assets.map((a, i) => {
                                   const f = MOCK_FUNDS.find(fund => fund.id === a.fundId);
                                   return (
                                       <tr key={i} className="group hover:bg-gray-50">
                                           <td className="px-2 py-2">
                                               <select 
                                                  value={a.fundId}
                                                  onChange={e => handleUpdateAsset(i, 'fundId', e.target.value)}
                                                  className="w-full text-sm border-none bg-transparent focus:ring-0 font-medium text-gray-800 truncate"
                                               >
                                                   {MOCK_FUNDS.map(fund => (
                                                       <option key={fund.id} value={fund.id}>{fund.name}</option>
                                                   ))}
                                               </select>
                                           </td>
                                           <td className="px-2 py-2 text-center">
                                               <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{f?.type || '-'}</span>
                                           </td>
                                           <td className="px-2 py-2 text-right">
                                               <input 
                                                   type="number"
                                                   value={a.amount}
                                                   onChange={e => handleUpdateAsset(i, 'amount', Number(e.target.value))}
                                                   className="w-24 text-right text-sm border-none bg-transparent focus:ring-0 font-mono"
                                               />
                                           </td>
                                           <td className="px-4 py-2 text-right text-gray-500">{totalAssets > 0 ? ((a.amount/totalAssets)*100).toFixed(2) : 0}%</td>
                                           <td className="px-1 py-2 print:hidden">
                                               <button onClick={() => handleRemoveAsset(i)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <Trash2 className="w-4 h-4"/>
                                               </button>
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                  </div>
              </div>

              {/* Strategy Text - Auto-Expanding */}
              <div className="relative group">
                  <div className="bg-[#fff5f5] border border-[#fed7d7] rounded-lg p-6">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-[#c53030] flex items-center gap-2">
                              <Sparkles className="w-4 h-4"/> 策略观点
                          </h4>
                          <button 
                            onClick={handleGenerateAI}
                            disabled={generating}
                            className="print:hidden text-xs bg-white border border-purple-200 text-purple-600 px-2 py-1 rounded hover:bg-purple-50 flex items-center gap-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <Sparkles className="w-3 h-3"/> {generating ? 'AI撰写中...' : 'AI 润色/生成'}
                          </button>
                      </div>
                      <textarea 
                          ref={textareaRef}
                          value={config.aiAnalysis}
                          onChange={e => setConfig({...config, aiAnalysis: e.target.value})}
                          className="w-full bg-transparent border-none focus:ring-0 text-gray-700 text-sm leading-relaxed resize-none overflow-hidden"
                          placeholder="请输入投资策略观点..."
                      />
                  </div>
              </div>
          </div>

          {/* PAGE 3: BACKTEST */}
          <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl my-8 p-12 print:shadow-none print:my-0 print:break-after-page flex flex-col">
              <div className="flex justify-between items-end border-b-2 border-[#e11d21] pb-2 mb-8">
                   <h2 className="text-2xl font-bold text-gray-800">历史业绩模拟回测</h2>
                   <span className="text-gray-400 text-sm">HISTORICAL PERFORMANCE</span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 h-[400px]">
                  <h4 className="text-sm text-gray-500 mb-4">组合净值走势 vs 模拟基准 (近1年)</h4>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                          <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={40}/>
                          <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                          <Legend />
                          <Line type="monotone" dataKey="value" name="建议组合" stroke="#e11d21" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="benchmark" name="业绩基准" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                  </ResponsiveContainer>
              </div>

              <div className="bg-[#fff9f9] border-l-4 border-[#e11d21] p-4 text-sm text-gray-600 mb-8">
                  <p className="font-bold text-gray-900 mb-1">特别说明：</p>
                  <p>根据建议的资产配置方案，我们对回测期间的历史真实数据进行了回测模拟。上图展示的资产配置组合收益率表现系基于回测期间组合净值得出，不代表历史真实分配的收益，也不构成对未来业绩的保证。</p>
              </div>
          </div>

          {/* PAGE 4: DISCLAIMER */}
          <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl my-8 p-12 print:shadow-none print:my-0 flex flex-col justify-center">
             <div className="border-t-4 border-[#e11d21] pt-12">
                  <h1 className="text-4xl font-bold text-gray-300 mb-8">声明</h1>
                  <h2 className="text-xl font-medium text-gray-400 mb-8 tracking-widest">DISCLAIMER</h2>
                  
                  <div className="text-xs text-gray-500 leading-relaxed space-y-4 text-justify columns-2 gap-8">
                      <p>风险揭示与特别声明：本方案不构成法律协议的一部分，不应视为对您的要约或者要约邀请。</p>
                      <p>本方案是以客户提供的基础信息为参考，由理财经理选取符合客户风险承受能力与投资偏好的本公司发行的信托产品及相关公募基金产品（如有）项下数据进行分析出具的资产配置建议，目的是为客户提供更好的资产配置安排。</p>
                      <p>本方案中包含的观点为理财经理迄今为止的判断，受理财经理对客户信息的理解、选取产品的理解不同的影响，不同理财经理也可能出具不同的资产配置建议，均不代表本公司观点。本资产配置建议仅供参考，最终投资决定由客户自行做出，投资损益也由客户自行承担。</p>
                      <p>客户需根据自身风险承受能力、财务水平进行投资，审慎选择投资产品、做出投资决定，本公司不做获利保证。投资损益也由客户自行承担。</p>
                      <p>需要说明的是，建议书内容对客户的适用性取决于多项因素，不排除基于市场、投资环境及政策变化的不确定性。据此，本建议书各项分析内容和建议仅供参考，不代表任何投资收益和投资安全性的保障或承诺，您应充分理解和知悉各项投资风险。</p>
                  </div>
             </div>
             
             <div className="mt-32 text-center">
                  <div className="inline-block border-b border-gray-300 pb-2 mb-2 px-12 text-gray-400">客户签字</div>
                  <div className="text-xs text-gray-400">请仔细阅读以上条款并签字确认</div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default ProposalGenerator;
