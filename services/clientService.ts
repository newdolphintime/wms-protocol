
export interface ClientTag {
    id: string;
    label: string;
    color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo' | 'gray';
}

export type RiskLevel = 'C1-保守型' | 'C2-稳健型' | 'C3-平衡型' | 'C4-进取型' | 'C5-激进型';
export type ClientStatus = 'ACTIVE' | 'POTENTIAL' | 'INACTIVE' | 'VIP';

export interface Client {
    id: string;
    name: string;
    avatar?: string; // URL or empty for auto-initials
    phone: string;
    gender: 'M' | 'F';
    age: number;
    totalAum: number; // In RMB
    riskLevel: RiskLevel;
    tags: ClientTag[];
    status: ClientStatus;
    lastContactDate: string; // YYYY-MM-DD
    notes: string;
    managerId: string; // Advisor ID
}

const TAG_POOL: ClientTag[] = [
    { id: 't1', label: '高净值', color: 'indigo' },
    { id: 't2', label: '企业主', color: 'blue' },
    { id: 't3', label: '退休规划', color: 'green' },
    { id: 't4', label: '海外资产', color: 'purple' },
    { id: 't5', label: '风险厌恶', color: 'red' },
    { id: 't6', label: '长期定投', color: 'yellow' },
    { id: 't7', label: '信托客户', color: 'pink' },
    { id: 't8', label: '近期有资金', color: 'green' },
];

export const MOCK_CLIENTS: Client[] = [
    {
        id: 'c1', name: '王健林', gender: 'M', age: 65, phone: '13800138000',
        totalAum: 50000000, riskLevel: 'C4-进取型', status: 'VIP',
        lastContactDate: '2026-01-05', notes: '关注家族信托业务，近期有大额分红到账。',
        managerId: 'admin', tags: [TAG_POOL[0], TAG_POOL[1], TAG_POOL[6]]
    },
    {
        id: 'c2', name: '李晓华', gender: 'F', age: 42, phone: '13912345678',
        totalAum: 8500000, riskLevel: 'C3-平衡型', status: 'ACTIVE',
        lastContactDate: '2025-12-28', notes: '对医疗板块基金感兴趣。',
        managerId: 'admin', tags: [TAG_POOL[2], TAG_POOL[5]]
    },
    {
        id: 'c3', name: '陈志强', gender: 'M', age: 35, phone: '13666668888',
        totalAum: 1200000, riskLevel: 'C5-激进型', status: 'ACTIVE',
        lastContactDate: '2026-01-10', notes: '喜欢短线交易，ETF玩家。',
        managerId: 'admin', tags: [TAG_POOL[6], TAG_POOL[7]]
    },
    {
        id: 'c4', name: '张敏', gender: 'F', age: 29, phone: '15812341234',
        totalAum: 500000, riskLevel: 'C2-稳健型', status: 'POTENTIAL',
        lastContactDate: '2025-11-15', notes: '刚工作不久，寻求稳健理财。',
        managerId: 'admin', tags: [TAG_POOL[5]]
    },
    {
        id: 'c5', name: '刘强', gender: 'M', age: 50, phone: '18888889999',
        totalAum: 22000000, riskLevel: 'C3-平衡型', status: 'VIP',
        lastContactDate: '2026-01-08', notes: '包括海外房产配置需求。',
        managerId: 'admin', tags: [TAG_POOL[0], TAG_POOL[3], TAG_POOL[1]]
    },
    {
        id: 'c6', name: '赵丽', gender: 'F', age: 55, phone: '13777776666',
        totalAum: 15000000, riskLevel: 'C1-保守型', status: 'ACTIVE',
        lastContactDate: '2026-01-02', notes: '只做固收和国债，极度厌恶亏损。',
        managerId: 'admin', tags: [TAG_POOL[4], TAG_POOL[2]]
    },
    {
        id: 'c7', name: '孙伟', gender: 'M', age: 38, phone: '13555554444',
        totalAum: 3500000, riskLevel: 'C4-进取型', status: 'INACTIVE',
        lastContactDate: '2025-09-20', notes: '上次推荐亏损，情绪不佳，需安抚。',
        managerId: 'admin', tags: []
    },
    {
        id: 'c8', name: '周杰', gender: 'M', age: 45, phone: '13333332222',
        totalAum: 6000000, riskLevel: 'C3-平衡型', status: 'ACTIVE',
        lastContactDate: '2026-01-09', notes: '关注科技股定投。',
        managerId: 'admin', tags: [TAG_POOL[5], TAG_POOL[7]]
    },
    {
        id: 'c9', name: '吴芳', gender: 'F', age: 32, phone: '15999998888',
        totalAum: 2000000, riskLevel: 'C2-稳健型', status: 'POTENTIAL',
        lastContactDate: '2025-12-10', notes: '二胎妈妈，关注教育金储备。',
        managerId: 'admin', tags: [TAG_POOL[2]]
    },
    {
        id: 'c10', name: '郑华', gender: 'M', age: 60, phone: '13111112222',
        totalAum: 18000000, riskLevel: 'C2-稳健型', status: 'VIP',
        lastContactDate: '2026-01-04', notes: '即将退休，资金回笼。',
        managerId: 'admin', tags: [TAG_POOL[2], TAG_POOL[0], TAG_POOL[7]]
    },
    {
        id: 'c11', name: '林青', gender: 'F', age: 28, phone: '13900001111',
        totalAum: 800000, riskLevel: 'C4-进取型', status: 'ACTIVE',
        lastContactDate: '2026-01-11', notes: '对新能源感兴趣。',
        managerId: 'admin', tags: [TAG_POOL[7]]
    },
    {
        id: 'c12', name: '郭涛', gender: 'M', age: 48, phone: '13888887777',
        totalAum: 45000000, riskLevel: 'C3-平衡型', status: 'VIP',
        lastContactDate: '2025-12-30', notes: '企业上市前辅导，可能有大额资金进入。',
        managerId: 'admin', tags: [TAG_POOL[1], TAG_POOL[0], TAG_POOL[3]]
    },
    {
        id: 'c13', name: '何静', gender: 'F', age: 36, phone: '13612349876',
        totalAum: 1100000, riskLevel: 'C3-平衡型', status: 'ACTIVE',
        lastContactDate: '2026-01-07', notes: '',
        managerId: 'admin', tags: []
    },
    {
        id: 'c14', name: '马腾', gender: 'M', age: 41, phone: '13567891234',
        totalAum: 9200000, riskLevel: 'C5-激进型', status: 'ACTIVE',
        lastContactDate: '2026-01-06', notes: '私募老手。',
        managerId: 'admin', tags: [TAG_POOL[0]]
    },
    {
        id: 'c15', name: '罗红', gender: 'F', age: 52, phone: '13700005555',
        totalAum: 5500000, riskLevel: 'C2-稳健型', status: 'INACTIVE',
        lastContactDate: '2025-10-01', notes: '出国陪读中。',
        managerId: 'admin', tags: [TAG_POOL[3]]
    }
];

export const getClients = async (): Promise<Client[]> => {
    // Simulate network delay
    return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_CLIENTS), 600);
    });
};
