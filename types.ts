
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
  [key: string]: number | string | null | undefined;
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
  startDate: string;
  endDate: string;
}

// --- Portfolio Types ---

export enum AccountType {
  PERSONAL = '个人自有账户',
  FAMILY_TRUST = '家族信托账户',
}

// Added LiquidityTier enum for asset liquidity classification
export enum LiquidityTier {
    CASH = 'CASH',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

export interface RedemptionRule {
  ruleType: 'DAILY' | 'MONTHLY' | 'FIXED_TERM';
  openDay?: number;
  settlementDays: number;
  lockupEndDate?: string;
  maturityDate?: string;
}

export interface Holding {
  fundId?: string;
  isExternal?: boolean;
  externalName?: string;
  externalType?: FundType;
  externalNav?: number;
  externalNavDate?: string;
  shares: number;
  avgCost: number;
  redemptionRule?: RedemptionRule;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  cashBalance?: number;
  holdings: Holding[];
}

export interface ClientPortfolio {
  id: string;
  clientName: string;
  accounts: Account[];
}

// Added CashFlow interface and Frequency enum for liquidity planning
export enum Frequency {
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY'
}

export interface CashFlow {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'INFLOW' | 'OUTFLOW';
  recurringRuleId?: string;
  relatedHoldingKey?: string;
}

// --- Proposal Generation Types ---

export type SectionType = 'COVER' | 'DEMAND_ALLOCATION' | 'STRATEGY' | 'BACKTEST' | 'DISCLAIMER' | 'PAGE_BREAK' | 'CUSTOM_TEXT';

export interface DocumentSection {
    id: string;
    type: SectionType;
    title?: string;
    content?: string;
}

export interface ProposalAsset {
    fundId: string;
    amount: number;
}

export interface ProposalConfig {
    clientName: string;
    managerName: string;
    date: string;
    riskLevel: string;
    investmentHorizon: string;
    totalAmount: number;
    assets: ProposalAsset[];
    sections: DocumentSection[];
}

export interface PortfolioHistoryPoint {
    date: string;
    value: number;
    benchmark: number;
}
