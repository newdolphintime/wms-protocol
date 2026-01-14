
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
    canEdit?: boolean;
}

export interface ClientCreate {
    name: string;
    phone?: string;
    gender?: 'M' | 'F';
    status?: ClientStatus;
    riskLevel?: string;
    lastContactDate?: string;
    tags?: ClientTag[];
}

export interface ClientResponse {
    id: string;
    message: string;
}

export const createClient = async (client: ClientCreate): Promise<ClientResponse> => {
    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(client),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create client');
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating client:", error);
        throw error;
    }
};

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

export const updateClient = async (id: string, client: Partial<ClientCreate>): Promise<ClientResponse> => {
    try {
        const response = await fetch(`/api/clients/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(client),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update client');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating client:", error);
        throw error;
    }
};
