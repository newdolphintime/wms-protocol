
import { ExternalProduct, LiquidityInfo } from '../types';

const API_BASE = '/api';

export const externalProductsService = {
    // Get all external products
    async getAll(): Promise<ExternalProduct[]> {
        const response = await fetch(`${API_BASE}/external-products`);
        if (!response.ok) throw new Error('Failed to fetch external products');
        return response.json();
    },

    // Create new product
    async create(product: Partial<ExternalProduct>): Promise<{ id: string, message: string }> {
        const response = await fetch(`${API_BASE}/external-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (!response.ok) throw new Error('Failed to create product');
        return response.json();
    }
};

export const liquidityService = {
    // Get effective liquidity info for a holding
    async getHoldingLiquidityInfo(holdingId: string): Promise<LiquidityInfo> {
        const response = await fetch(`${API_BASE}/holdings/${holdingId}/liquidity-info`);
        if (!response.ok) throw new Error('Failed to fetch liquidity info');
        return response.json();
    },

    // Update holding configuration (link to product or set custom config)
    async updateHolding(holdingId: string, updates: {
        externalProductId?: string | null,
        purchaseDate?: string,
        redemptionConfig?: any
    }): Promise<void> {
        const response = await fetch(`${API_BASE}/holdings/${holdingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update holding');
    }
};
