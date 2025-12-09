

import { Fund, FundType, ChartDataPoint, PatchRule, ClientPortfolio, AccountType, LiquidityTier, Holding, RedemptionRule, PortfolioHistoryPoint, ProposalAsset } from '../types';

// Helper to get a date string for X days ago
const getDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

// Top 10 A-share ETFs by approximate AUM (representative list)
export const MOCK_FUNDS: Fund[] = [
  {
    id: '1',
    code: '510300',
    name: '华泰柏瑞沪深300ETF',
    manager: '柳军',
    type: FundType.BROAD_MARKET,
    nav: 4.023,
    dayChange: 0.85,
    ytdReturn: 4.5,
    riskLevel: 3,
    inceptionDate: '2012-05-04',
    description: 'A股市场规模最大的权益类ETF，紧密跟踪沪深300指数，覆盖A股核心资产。'
  },
  {
    id: '2',
    code: '510310',
    name: '易方达沪深300ETF',
    manager: '余海燕',
    type: FundType.BROAD_MARKET,
    nav: 1.985,
    dayChange: 0.82,
    ytdReturn: 4.3,
    riskLevel: 3,
    inceptionDate: '2013-03-06',
    description: '费率低廉，跟踪误差小，是机构投资者配置沪深300指数的重要工具。'
  },
  {
    id: '3',
    code: '588000',
    name: '华夏上证科创板50ETF',
    manager: '张弘弢',
    type: FundType.SECTOR,
    nav: 0.892,
    dayChange: 1.56,
    ytdReturn: -5.2,
    riskLevel: 5,
    inceptionDate: '2020-09-28',
    description: '紧密跟踪科创50指数，聚焦科创板核心科技企业，具有高弹性特征。'
  },
  {
    id: '4',
    code: '510050',
    name: '华夏上证50ETF',
    manager: '张弘弢',
    type: FundType.BROAD_MARKET,
    nav: 2.856,
    dayChange: 0.45,
    ytdReturn: 6.8,
    riskLevel: 3,
    inceptionDate: '2004-12-30',
    description: '国内首只ETF，跟踪上证50指数，代表上海证券市场最具代表性的超大盘蓝筹股。'
  },
  {
    id: '5',
    code: '159919',
    name: '嘉实沪深300ETF',
    manager: '何如',
    type: FundType.BROAD_MARKET,
    nav: 4.102,
    dayChange: 0.84,
    ytdReturn: 4.4,
    riskLevel: 3,
    inceptionDate: '2012-05-07',
    description: '深市规模领先的沪深300ETF，流动性良好，适合长期配置。'
  },
  {
    id: '6',
    code: '510500',
    name: '南方中证500ETF',
    manager: '罗文杰',
    type: FundType.BROAD_MARKET,
    nav: 5.670,
    dayChange: 1.10,
    ytdReturn: 2.1,
    riskLevel: 4,
    inceptionDate: '2013-02-06',
    description: '跟踪中证500指数，代表A股市场中盘成长股风格，行业分布均衡。'
  },
  {
    id: '7',
    code: '159915',
    name: '易方达创业板ETF',
    manager: '成曦',
    type: FundType.SECTOR,
    nav: 2.340,
    dayChange: 1.85,
    ytdReturn: -2.5,
    riskLevel: 5,
    inceptionDate: '2011-09-20',
    description: '跟踪创业板指，聚焦新兴产业和高新技术企业，成长性强但波动较大。'
  },
  {
    id: '8',
    code: '510330',
    name: '华夏沪深300ETF',
    manager: '赵宗庭',
    type: FundType.BROAD_MARKET,
    nav: 3.950,
    dayChange: 0.83,
    ytdReturn: 4.2,
    riskLevel: 3,
    inceptionDate: '2012-12-25',
    description: '华夏基金旗下的沪深300ETF，管理经验丰富，跟踪效果稳定。'
  },
  {
    id: '9',
    code: '512880',
    name: '国泰中证全指证券公司ETF',
    manager: '艾小军',
    type: FundType.SECTOR,
    nav: 1.050,
    dayChange: 2.10,
    ytdReturn: 8.5,
    riskLevel: 5,
    inceptionDate: '2016-07-26',
    description: '跟踪证券公司指数，被誉为“牛市旗手”，是博取市场贝塔收益的利器。'
  },
  {
    id: '10',
    code: '513180',
    name: '华夏恒生科技ETF(QDII)',
    manager: '徐猛',
    type: FundType.CROSS_BORDER,
    nav: 0.650,
    dayChange: 3.20,
    ytdReturn: 12.5,
    riskLevel: 5,
    inceptionDate: '2024-05-18', // Recent inception to demonstrate patching
    description: '投资于港股恒生科技指数，覆盖互联网巨头及新兴科技企业。'
  },
  {
    id: 'demo-1',
    code: 'DEMO001',
    name: '多源补齐演示ETF',
    manager: '演示账号',
    type: FundType.STRATEGY,
    nav: 1.000,
    dayChange: 0.05,
    ytdReturn: 0.5,
    riskLevel: 3,
    inceptionDate: getDaysAgo(30), // Founded 30 days ago
    description: '这是一个用于演示多源数据补齐功能的虚拟基金。成立仅30天，查看近3月数据时会自动展示补齐效果。'
  }
];

// --- MOCK PORTFOLIO DATA ---
export const MOCK_PORTFOLIO: ClientPortfolio = {
  id: 'client-001',
  clientName: '张伟 (Mr. Zhang Wei)',
  accounts: [
    {
      id: 'acc-01',
      name: '个人尊享理财账户',
      type: AccountType.PERSONAL,
      cashBalance: 500000, // 500k Cash
      holdings: [
        { fundId: '1', shares: 50000, avgCost: 3.65 }, // 华泰柏瑞沪深300ETF (Current ~4.023)
        { fundId: '3', shares: 100000, avgCost: 1.10 }, // 科创50 (Current ~0.892)
      ]
    },
    {
      id: 'acc-02',
      name: '张氏家族信托 - 稳健成长一号',
      type: AccountType.FAMILY_TRUST,
      cashBalance: 2000000, // 2M Cash
      holdings: [
        { fundId: '4', shares: 200000, avgCost: 2.60 }, // 上证50 (Current ~2.856)
        { fundId: '6', shares: 50000, avgCost: 5.50 }, // 中证500 (Current ~5.670)
      ]
    },
    {
      id: 'acc-03',
      name: '张氏家族信托 - 海外配置二号',
      type: AccountType.FAMILY_TRUST,
      cashBalance: 100000, // 100k Cash
      holdings: [
        { fundId: '10', shares: 150000, avgCost: 0.55 }, // 恒生科技 (Current ~0.650)
      ]
    }
  ]
};

// --- Liquidity Logic ---
export const getLiquidityTier = (fundType: FundType): LiquidityTier => {
    switch (fundType) {
        case FundType.BROAD_MARKET: return LiquidityTier.HIGH;
        case FundType.BOND: return LiquidityTier.HIGH;
        case FundType.SECTOR: return LiquidityTier.MEDIUM;
        case FundType.STRATEGY: return LiquidityTier.MEDIUM;
        case FundType.CROSS_BORDER: return LiquidityTier.LOW;
        default: return LiquidityTier.MEDIUM;
    }
};

export const getSettlementDays = (tier: LiquidityTier): number => {
    switch (tier) {
        case LiquidityTier.CASH: return 0;
        case LiquidityTier.HIGH: return 1;
        case LiquidityTier.MEDIUM: return 3;
        case LiquidityTier.LOW: return 5; // QDII/Cross-border usually longer
        default: return 3;
    }
};

export const calculateAvailabilityDate = (fromDate: Date, holding: Holding, fundType?: FundType): Date => {
    // Start with the basic "From Date"
    let baseDate = new Date(fromDate);
    baseDate.setHours(0,0,0,0);
    
    // 1. Custom Rule Priority
    if (holding.redemptionRule) {
        const { ruleType, openDay, settlementDays, lockupEndDate, maturityDate } = holding.redemptionRule;
        
        // Handle FIXED_TERM
        if (ruleType === 'FIXED_TERM' && maturityDate) {
             const mDate = new Date(maturityDate);
             mDate.setHours(0,0,0,0);
             const targetDate = new Date(mDate);
             targetDate.setDate(targetDate.getDate() + settlementDays);
             return targetDate;
        }

        // Handle Lock-up: If current date is before lockup end, we must wait until lockup ends.
        if (lockupEndDate) {
            const lockupDate = new Date(lockupEndDate);
            lockupDate.setHours(0,0,0,0);
            if (baseDate.getTime() < lockupDate.getTime()) {
                baseDate = new Date(lockupDate);
            }
        }
        
        if (ruleType === 'MONTHLY' && openDay) {
            // Find next open day AFTER the baseDate
            const targetDate = new Date(baseDate);
            
            // If today is past the open day, move to next month
            // Note: If today is strictly equal to open day, it counts as open.
            if (targetDate.getDate() > openDay) {
                targetDate.setMonth(targetDate.getMonth() + 1);
            }
            targetDate.setDate(openDay);
            
            // Add settlement days
            targetDate.setDate(targetDate.getDate() + settlementDays);
            return targetDate;
        } else {
             // Daily: Just add settlement to the baseDate
             const targetDate = new Date(baseDate);
             targetDate.setDate(targetDate.getDate() + settlementDays);
             return targetDate;
        }
    }

    // 2. Default Tier Logic (No Lockup support in default)
    const type = holding.isExternal ? (holding.externalType || FundType.STRATEGY) : fundType;
    const tier = type ? getLiquidityTier(type) : LiquidityTier.MEDIUM;
    const days = getSettlementDays(tier);
    
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate;
};

// Helper to check if a date is within a patch rule range
const findActiveRule = (fundId: string, dateStr: string, rules: PatchRule[]): PatchRule | undefined => {
  return rules.find(rule => 
    rule.targetFundId === fundId && 
    dateStr >= rule.startDate && 
    dateStr <= rule.endDate
  );
};

// --- DATA GENERATION FOR COMPARISON CHART (Forward from Start Date) ---
export const generateChartData = (
  selectedFunds: Fund[], 
  days = 30,
  patchRules: PatchRule[] = [],
  allFunds: Fund[] = []
): { chartData: ChartDataPoint[], gaps: { fundId: string, fundName: string }[] } => {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  
  // Start from 'days' ago
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Identify gaps (funds starting after start date)
  const gaps: { fundId: string, fundName: string }[] = [];
  selectedFunds.forEach(f => {
    const inception = new Date(f.inceptionDate);
    if (inception > startDate) {
      gaps.push({ fundId: f.id, fundName: f.name });
    }
  });

  // Initialize all funds to 100 at start date (Theoretical base)
  const currentValues: { [key: string]: number } = {};
  selectedFunds.forEach(f => currentValues[f.id] = 100);

  // Push Start Point
  const startPointStr = startDate.toISOString().split('T')[0];
  const startPoint: ChartDataPoint = {
    date: startPointStr,
  };
  
  selectedFunds.forEach(fund => {
    const inceptionStr = fund.inceptionDate;
    const isGap = startPointStr < inceptionStr;
    const activeRule = findActiveRule(fund.id, startPointStr, patchRules);
    const isExactInception = startPointStr === inceptionStr;

    // Start change at 0
    startPoint[`${fund.id}_change`] = 0;

    if (isGap) {
        if (activeRule) {
            startPoint[`${fund.id}_patched`] = 100;
        }
    } else {
        startPoint[`${fund.id}_actual`] = 100;
        if (activeRule && isExactInception) {
            startPoint[`${fund.id}_patched`] = 100;
        }
    }
  });
  data.push(startPoint);

  // Generate subsequent days forward
  for (let i = 1; i <= days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const point: ChartDataPoint = { date: dateStr };
    
    selectedFunds.forEach(fund => {
      const inceptionStr = fund.inceptionDate;
      const isGap = dateStr < inceptionStr;
      const isExactInception = dateStr === inceptionStr;
      
      const activeRule = findActiveRule(fund.id, dateStr, patchRules);

      // Determine simulation source (self or proxy)
      let simulationFund = fund;
      if (isGap && activeRule) {
         const proxy = allFunds.find(f => f.id === activeRule.proxyFundId);
         if (proxy) simulationFund = proxy;
      }

      // Simulate volatility based on risk level
      const volatility = simulationFund.riskLevel * 0.008; 
      const marketTrend = Math.random() > 0.45 ? 1.001 : 0.999;
      const change = marketTrend + (Math.random() * volatility * 2 - volatility);
      
      // Update theoretical value
      currentValues[fund.id] = currentValues[fund.id] * change;
      const val = parseFloat(currentValues[fund.id].toFixed(2));
      const changePercent = parseFloat(((change - 1) * 100).toFixed(2));
      
      // Distribute to keys
      point[`${fund.id}_change`] = changePercent;

      if (isGap) {
        if (activeRule) {
            point[`${fund.id}_patched`] = val;
        }
      } else {
        point[`${fund.id}_actual`] = val;
        // CRITICAL: Overlap point (inception day) needs BOTH values to connect lines
        if (isExactInception) {
             point[`${fund.id}_patched`] = val;
        }
      }
    });

    data.push(point);
  }

  return { chartData: data, gaps };
};

// --- DATA GENERATION FOR DETAIL PAGE (Backward from Today) ---
export interface FundHistoryPoint {
    date: string;
    nav_actual: number | null;
    nav_patched: number | null;
    change: number | null;
    isPatched: boolean;
    proxyName?: string;
}

export const generateFundHistory = (
    targetFund: Fund,
    days = 365,
    patchRules: PatchRule[] = [],
    allFunds: Fund[] = []
  ): FundHistoryPoint[] => {
    const history: FundHistoryPoint[] = [];
    let currentNav = targetFund.nav;
    const now = new Date();
  
    // We generate backwards from Today
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // Local YYYY-MM-DD
  
      const inceptionDate = targetFund.inceptionDate;
      const isGap = dateStr < inceptionDate;
      const isExactInception = dateStr === inceptionDate;
      
      const activeRule = findActiveRule(targetFund.id, dateStr, patchRules);
      
      let isPatched = false;
      let proxyName = undefined;
      let simulateFund = targetFund;
      let hasData = true;
  
      if (isGap) {
          if (activeRule) {
               const proxy = allFunds.find(f => f.id === activeRule.proxyFundId);
               if (proxy) {
                   simulateFund = proxy;
                   isPatched = true;
                   proxyName = proxy.name;
               } else {
                   hasData = false;
               }
          } else {
              hasData = false;
          }
      }
  
      // Calculate the daily change that resulted in 'currentNav'
      let changePercent = 0;
      if (hasData) {
        if (i === 0) {
            changePercent = targetFund.dayChange;
        } else {
            // Simulate random change
            const volatility = simulateFund.riskLevel * 0.008; 
            const trend = 0.0002; 
            changePercent = (Math.random() * volatility * 2 - volatility + trend) * 100;
        }
      }

      const navVal = hasData ? Number(currentNav.toFixed(4)) : null;

      // Assign to split fields for colored chart lines
      let navActual = null;
      let navPatched = null;

      if (hasData) {
          if (isPatched) {
              navPatched = navVal;
          } else {
              navActual = navVal;
              // On the exact inception day, we give this value to patched as well 
              // IF there is a patch rule connecting to it immediately before.
              if (isExactInception) {
                  navPatched = navVal;
              }
          }
      }

      history.push({
          date: dateStr,
          nav_actual: navActual,
          nav_patched: navPatched,
          change: hasData ? Number(changePercent.toFixed(2)) : null,
          isPatched,
          proxyName
      });
  
      if (hasData) {
        // Reverse calculate Previous Day's NAV
        currentNav = currentNav / (1 + changePercent / 100);
      }
    }
  
    // Return chronological (oldest to newest) for charts
    return history.reverse();
  };

// --- SIMULATED PORTFOLIO BACKTEST FOR PROPOSAL ---
export const calculatePortfolioHistory = (assets: ProposalAsset[], days = 365): PortfolioHistoryPoint[] => {
    // 1. Calculate total portfolio weight base
    const totalAmount = assets.reduce((sum, a) => sum + a.amount, 0);
    if (totalAmount === 0) return [];

    // 2. Prepare individual fund histories (normalized to 1.0 at START of period)
    // We reuse generateChartData logic but for each fund individually then combine
    const funds = assets.map(a => MOCK_FUNDS.find(f => f.id === a.fundId)).filter(f => !!f) as Fund[];
    
    // We want the chart to start at 1.0 (or 100) "days" ago.
    // generateChartData starts at 100.
    const { chartData } = generateChartData(funds, days, [], MOCK_FUNDS);

    // 3. Combine
    return chartData.map(point => {
        let weightedSum = 0;
        let validWeight = 0;

        assets.forEach(asset => {
            const fund = MOCK_FUNDS.find(f => f.id === asset.fundId);
            if (fund) {
                // key is `${fund.id}_actual` (ignoring patches for simplicity in this demo function, or assuming standard)
                // generateChartData returns "actual" or "patched". We prefer actual, fall back to patched.
                const val = (point[`${fund.id}_actual`] as number) ?? (point[`${fund.id}_patched`] as number) ?? 100;
                
                const weight = asset.amount / totalAmount;
                weightedSum += val * weight;
                validWeight += weight;
            }
        });

        // Benchmark: A simple steady growth + some noise
        const dateIdx = chartData.indexOf(point);
        const benchmarkVal = 100 * (1 + (dateIdx * 0.0003)) + (Math.sin(dateIdx * 0.1) * 2);

        return {
            date: point.date,
            value: Number(weightedSum.toFixed(2)),
            benchmark: Number(benchmarkVal.toFixed(2))
        };
    });
};