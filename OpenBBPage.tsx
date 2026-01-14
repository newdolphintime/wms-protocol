import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface MockData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const OpenBBPage: React.FC = () => {
    const [symbol, setSymbol] = useState('');
    const [data, setData] = useState<MockData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!symbol) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:8001/api/openbb/stock/${symbol}`);
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Market Data (OpenBB)
            </h1>

            <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter Stock Symbol (e.g., 600519)"
                            className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    >
                        {loading ? 'Loading...' : 'Search'}
                    </button>
                </div>

                {/* Market Helper Chips */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Suffix Helpers:</span>
                    <button
                        onClick={() => !symbol.endsWith('.SS') && setSymbol(s => s.replace(/\..*$/, '') + '.SS')}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        Shanghai (.SS)
                    </button>
                    <button
                        onClick={() => !symbol.endsWith('.SZ') && setSymbol(s => s.replace(/\..*$/, '') + '.SZ')}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        Shenzhen (.SZ)
                    </button>
                    <button
                        onClick={() => setSymbol(s => s.replace(/\..*$/, ''))}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        US (No Suffix)
                    </button>
                    <span className="text-xs text-gray-400 ml-auto">
                        * A-Shares require .SS (Shanghai) or .SZ (Shenzhen) suffix
                    </span>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {data.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-semibold text-gray-600">Date</th>
                                <th className="p-4 font-semibold text-gray-600">Open</th>
                                <th className="p-4 font-semibold text-gray-600">High</th>
                                <th className="p-4 font-semibold text-gray-600">Low</th>
                                <th className="p-4 font-semibold text-gray-600">Close</th>
                                <th className="p-4 font-semibold text-gray-600">Volume</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-900">{row.date}</td>
                                    <td className="p-4 text-gray-600">{row.open.toFixed(2)}</td>
                                    <td className="p-4 text-gray-600">{row.high.toFixed(2)}</td>
                                    <td className="p-4 text-gray-600">{row.low.toFixed(2)}</td>
                                    <td className="p-4 font-medium text-gray-900">{row.close.toFixed(2)}</td>
                                    <td className="p-4 text-gray-500">{row.volume.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OpenBBPage;
