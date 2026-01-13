import React, { useState, useEffect } from 'react';
import { Search, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { Client, getClients } from '../services/clientService';
import { useNavigate } from 'react-router-dom';

const ClientSearch: React.FC<{ onSelect?: (clientId: string) => void, targetPath?: string }> = ({ onSelect, targetPath = '/portfolio' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Debounced search or explicit search button? 
    // Let's do effect based on debounce for better UX
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                handleSearch(searchTerm);
            } else {
                setClients([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearch = async (term: string) => {
        setLoading(true);
        try {
            const results = await getClients(term);
            setClients(results);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (clientId: string) => {
        if (onSelect) {
            onSelect(clientId);
        } else {
            navigate(`${targetPath}/${clientId}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto w-full">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">查找客户</h2>
                <p className="text-gray-500 mt-2">请输入客户姓名、手机号或客户号查看持仓</p>
            </div>

            <div className="w-full relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-lg outline-none transition-all"
                    placeholder="搜索客户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    </div>
                )}
            </div>

            <div className="w-full space-y-3">
                {clients.map(client => (
                    <div
                        key={client.id}
                        onClick={() => handleSelect(client.id)}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                {client.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">{client.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> {client.phone}
                                    <span className="text-gray-300">|</span>
                                    <span className="font-mono text-xs">{client.id}</span>
                                </div>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                ))}

                {searchTerm && !loading && clients.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        未找到匹配的客户 "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientSearch;
