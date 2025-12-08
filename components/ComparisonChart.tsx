import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Fund, ChartDataPoint, PatchRule } from '../types';

interface ComparisonChartProps {
  data: ChartDataPoint[];
  funds: Fund[];
  patchRules?: PatchRule[];
  allFunds?: Fund[];
  periodSelector?: React.ReactNode;
  metric?: 'NAV' | 'CHANGE'; // 'NAV' (Normalized to 100) or 'CHANGE' (Daily % Change)
  viewMode?: 'OVERLAY' | 'GRID';
  compact?: boolean;
  hideTitle?: boolean;
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#0891b2', '#be185d', '#84cc16'];
// Lighter colors for patched segments
const PATCHED_COLORS = ['#93c5fd', '#86efac', '#fca5a5', '#fcd34d', '#d8b4fe', '#67e8f9', '#f9a8d4', '#bef264'];

const ComparisonChart: React.FC<ComparisonChartProps> = ({ 
    data, 
    funds, 
    patchRules = [], 
    allFunds = [], 
    periodSelector,
    metric = 'NAV',
    viewMode = 'OVERLAY',
    compact = false,
    hideTitle = false
}) => {
  if (!funds.length) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-400">
        未选择需要展示的基金
      </div>
    );
  }

  const getProxyNameForDate = (fundId: string, dateStr: string): string | null => {
    const rule = patchRules.find(r => 
        r.targetFundId === fundId && 
        dateStr >= r.startDate && 
        dateStr <= r.endDate
    );
    if (rule) {
        const proxy = allFunds.find(f => f.id === rule.proxyFundId);
        return proxy ? proxy.name : null;
    }
    return null;
  };

  // Helper for internal GRID mode (legacy use case if needed, though App.tsx handles grid now)
  const renderSingleChart = (fund: Fund, index: number, height: number | string = "100%", hideX = false) => {
    const color = COLORS[index % COLORS.length];
    
    return (
        <ResponsiveContainer width="100%" height={height as any}>
            <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 10, fill: '#6b7280'}} 
                    tickLine={false}
                    axisLine={{stroke: '#e5e7eb'}}
                    hide={hideX}
                />
                <YAxis 
                    tick={{fontSize: 10, fill: '#6b7280'}} 
                    tickLine={false}
                    axisLine={false}
                    domain={metric === 'NAV' ? ['auto', 'auto'] : [-4, 4]} 
                />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    labelFormatter={(label) => `日期: ${label}`}
                    formatter={(value: number, name: string, props: any) => {
                         if (metric === 'NAV') {
                            const dataKey = props.dataKey as string;
                            const isPatched = dataKey.endsWith('_patched');
                            const fundId = dataKey.split('_')[0];
                            const date = props.payload.date;
                            
                            let displayName = props.name;
                            if (isPatched) {
                                const proxyName = getProxyNameForDate(fundId, date);
                                displayName = `${props.name} (补齐)`;
                                if (proxyName) displayName += ` [源:${proxyName}]`;
                            }
                            return [value.toFixed(2), displayName];
                         } else {
                            return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, name];
                        }
                    }}
                />
                {metric === 'CHANGE' && <ReferenceLine y={0} stroke="#e5e7eb" />}
                
                {metric === 'NAV' ? (
                    <>
                        <Line
                            type="monotone"
                            dataKey={`${fund.id}_actual`}
                            name={fund.name}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls={false}
                        />
                        <Line
                            type="monotone"
                            dataKey={`${fund.id}_patched`}
                            name={fund.name}
                            stroke={color}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            connectNulls={false}
                        />
                    </>
                ) : (
                    <Line
                        type="monotone"
                        dataKey={`${fund.id}_change`}
                        name={fund.name}
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
  };

  const containerClass = compact 
    ? "w-full h-full min-h-0"
    : "bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]";

  return (
    <div className={containerClass}>
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">
                {metric === 'NAV' ? '业绩走势对比 (归一化净值 基准100)' : '日涨跌幅走势 (%)'}
            </h3>
            {periodSelector}
        </div>
      )}

      {viewMode === 'OVERLAY' ? (
        // OVERLAY MODE
        <div className={compact ? "h-full w-full" : "h-[400px]"}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                data={data}
                margin={{ top: 5, right: compact ? 10 : 30, left: compact ? 0 : 20, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 10, fill: '#6b7280'}} 
                    tickLine={false}
                    axisLine={{stroke: '#e5e7eb'}}
                    minTickGap={30}
                />
                <YAxis 
                    tick={{fontSize: 10, fill: '#6b7280'}} 
                    tickLine={false}
                    axisLine={false}
                    domain={metric === 'NAV' ? ['auto', 'auto'] : ['auto', 'auto']}
                    width={compact ? 30 : 40}
                />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                    labelFormatter={(label) => `日期: ${label}`}
                    formatter={(value: number, name: string, props: any) => {
                        if (metric === 'NAV') {
                            const dataKey = props.dataKey as string;
                            const isPatched = dataKey.endsWith('_patched');
                            const fundId = dataKey.split('_')[0]; 
                            const date = props.payload.date;
                            
                            let displayName = props.name;
                            if (isPatched) {
                                const proxyName = getProxyNameForDate(fundId, date);
                                displayName = `${props.name} (补齐)`;
                                if (proxyName) displayName += ` [源:${proxyName}]`;
                            }
                            return [value.toFixed(2), displayName];
                        } else {
                            return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, name];
                        }
                    }}
                />
                {!compact && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                {metric === 'CHANGE' && <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />}
                
                {funds.map((fund, index) => {
                    const color = COLORS[index % COLORS.length];
                    
                    if (metric === 'NAV') {
                        return (
                            <React.Fragment key={fund.id}>
                                <Line
                                    type="monotone"
                                    dataKey={`${fund.id}_actual`}
                                    name={fund.name}
                                    stroke={color}
                                    strokeWidth={compact ? 1.5 : 2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    connectNulls={false}
                                    isAnimationActive={!compact}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={`${fund.id}_patched`}
                                    name={fund.name}
                                    stroke={color}
                                    strokeWidth={compact ? 1.5 : 2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    legendType="none"
                                    connectNulls={false}
                                    isAnimationActive={!compact}
                                />
                            </React.Fragment>
                        );
                    } else {
                        // Change Metric (Overlay)
                        return (
                            <Line
                                key={fund.id}
                                type="monotone"
                                dataKey={`${fund.id}_change`}
                                name={fund.name}
                                stroke={color}
                                strokeWidth={1}
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={!compact}
                            />
                        );
                    }
                })}
                </LineChart>
            </ResponsiveContainer>
        </div>
      ) : (
        // GRID MODE (Legacy support inside component, or for reference)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funds.map((fund, index) => (
                <div key={fund.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2 truncate" title={fund.name}>{fund.name}</div>
                    <div className="h-40">
                        {renderSingleChart(fund, index, "100%", false)}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ComparisonChart;