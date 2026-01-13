
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
    age?: number; // Optional in DB for now
    totalAum: number; // In RMB
    riskLevel: RiskLevel;
    tags: ClientTag[];
    status: ClientStatus;
    lastContactDate: string; // YYYY-MM-DD
    notes?: string;
    managerId?: string; // Advisor ID
}

export const getClients = async (keyword?: string): Promise<Client[]> => {
    try {
        const url = keyword ? `/api/clients?keyword=${encodeURIComponent(keyword)}` : '/api/clients';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch clients');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
    }
};
