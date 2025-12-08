
export enum FundType {
  BROAD_MARKET = '宽基指数ETF',
  SECTOR = '行业主题ETF',
  STRATEGY = '策略ETF',
  CROSS_BORDER = '跨境ETF',
  BOND = '债券ETF'
}

export interface Fund {
  id: string;
  code: string;
  name: string;
  manager: string;
  type: FundType;
  nav: number; // Net Asset Value
  dayChange: number; // Percentage
  ytdReturn: number; // Year to Date return percentage
  riskLevel: number; // 1-5
  inceptionDate: string;
  description: string;
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string | null | undefined; // Dynamic keys for fund names, allowing null/undefined for gaps
}

export interface AnalysisState {
  loading: boolean;
  content: string | null;
  error: string | null;
}

export interface PatchRule {
  id: string;
  targetFundId: string;
  proxyFundId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// --- Portfolio Types ---

export enum AccountType {
  PERSONAL = '个人自有账户',
  FAMILY_TRUST = '家族信托账户',
}

export interface RedemptionRule {
  ruleType: 'DAILY' | 'MONTHLY';
  openDay?: number; // 1-31 for MONTHLY
  settlementDays: number; // T+N
}

export interface Holding {
  // If internal fund
  fundId?: string;
  
  // If external asset
  isExternal?: boolean;
  externalName?: string;
  externalType?: FundType;
  externalNav?: number;
  externalNavDate?: string;

  shares: number;   // Number of shares/units held
  avgCost: number;  // Average cost per share

  // Liquidity Config
  redemptionRule?: RedemptionRule;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  cashBalance?: number; // Available cash in the account
  holdings: Holding[];
}

export interface ClientPortfolio {
  id: string;
  clientName: string;
  accounts: Account[];
}

// --- Liquidity Types ---

export enum LiquidityTier {
  CASH = '现金 (T+0)',
  HIGH = '高流动性 (T+1)',
  MEDIUM = '一般流动性 (T+3)',
  LOW = '较低流动性 (T+5/QDII)',
}

export enum Frequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export interface RecurringRule {
  id: string;
  frequency: Frequency;
  count: number;
}

export interface CashFlow {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  type: 'INFLOW' | 'OUTFLOW';
  recurringRuleId?: string; // Optional linkage to a recurring rule
  relatedHoldingKey?: string; // composite key "accountId_index" to identify the specific holding reduced
}