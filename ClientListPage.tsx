
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Phone,
    MessageSquare,
    Tag,
    User,
    TrendingUp,
    Shield,
    Clock,
    ChevronDown,
    X,
    Check
} from 'lucide-react';
import { Client, ClientStatus, getClients, ClientTag } from './services/clientService';

// --- Components ---

const StatusBadge = ({ status }: { status: ClientStatus }) => {
    const styles = {
        'ACTIVE': 'bg-green-100 text-green-700 ring-green-600/20',
        'POTENTIAL': 'bg-blue-100 text-blue-700 ring-blue-700/10',
        'INACTIVE': 'bg-gray-100 text-gray-600 ring-gray-500/10',
        'VIP': 'bg-purple-100 text-purple-700 ring-purple-600/20'
    };
    const labels = {
        'ACTIVE': '活跃',
        'POTENTIAL': '潜在',
        'INACTIVE': '流失',
        'VIP': '核心VIP'
    };
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

const TagBadge = ({ tag, onRemove }: { tag: ClientTag, onRemove?: () => void }) => {
    if (!tag) return null;
    const colorStyles: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        pink: 'bg-pink-50 text-pink-700 border-pink-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        gray: 'bg-gray-50 text-gray-700 border-gray-100',
    };
    const style = colorStyles[tag.color] || colorStyles.gray;

    return (
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium border ${style} transition-all hover:shadow-sm cursor-default`}>
            {tag.label}
            {onRemove && (
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    );
};

const ClientListPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ClientStatus | 'ALL'>('ALL');
    const [minAum, setMinAum] = useState<number>(0);

    // Interaction State
    const [showTagInputId, setShowTagInputId] = useState<string | null>(null);
    const [newTagLabel, setNewTagLabel] = useState('');

    useEffect(() => {
        getClients().then(data => {
            setClients(data);
            setLoading(false);
        });
    }, []);

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchesSearch = c.name.includes(searchTerm) || c.phone.includes(searchTerm) || c.tags.some(t => t.label.includes(searchTerm));
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
            const matchesAum = c.totalAum >= minAum;
            return matchesSearch && matchesStatus && matchesAum;
        });
    }, [clients, searchTerm, statusFilter, minAum]);

    const stats = useMemo(() => {
        const totalAum = clients.reduce((sum, c) => sum + c.totalAum, 0);
        const vipCount = clients.filter(c => c.status === 'VIP').length;
        return { totalClients: clients.length, totalAum, vipCount };
    }, [clients]);

    const handleAddTag = (clientId: string) => {
        if (!newTagLabel.trim()) return;
        const colors: ClientTag['color'][] = ['blue', 'green', 'purple', 'pink', 'indigo', 'yellow'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newTag: ClientTag = {
            id: Date.now().toString(),
            label: newTagLabel,
            color: randomColor
        };

        setClients(prev => prev.map(c => {
            if (c.id === clientId) {
                return { ...c, tags: [...c.tags, newTag] };
            }
            return c;
        }));
        setNewTagLabel('');
        setShowTagInputId(null);
    };

    const handleRemoveTag = (clientId: string, tagId: string) => {
        if (!window.confirm('确认移除该标签?')) return;
        setClients(prev => prev.map(c => {
            if (c.id === clientId) {
                return { ...c, tags: c.tags.filter(t => t.id !== tagId) };
            }
            return c;
        }));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm">加载客户数据...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">客户管理</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        共管理 {stats.totalClients} 位客户，总资产规模 ¥{(stats.totalAum / 100000000).toFixed(2)}亿
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-all font-medium text-sm">
                    <Plus className="w-4 h-4" />
                    录入新客户
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 sticky top-0 z-20 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between transition-all">
                <div className="flex items-center gap-4 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="搜索姓名、手机号或标签..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="appearance-none pl-3 pr-8 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <option value="ALL">所有状态</option>
                            <option value="VIP">核心 VIP</option>
                            <option value="ACTIVE">活跃客户</option>
                            <option value="POTENTIAL">潜在客户</option>
                            <option value="INACTIVE">流失客户</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* AUM Slider Placeholder (Simplified as Buttons for now) */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">资产筛选</span>
                    <button onClick={() => setMinAum(0)} className={`px-3 py-1.5 rounded-md transition-all ${minAum === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}>全部</button>
                    <button onClick={() => setMinAum(1000000)} className={`px-3 py-1.5 rounded-md transition-all ${minAum === 1000000 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}>&gt;100万</button>
                    <button onClick={() => setMinAum(5000000)} className={`px-3 py-1.5 rounded-md transition-all ${minAum === 5000000 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}>&gt;500万</button>
                    <button onClick={() => setMinAum(10000000)} className={`px-3 py-1.5 rounded-md transition-all ${minAum === 10000000 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}>&gt;1000万</button>
                </div>
            </div>

            {/* Content Table/Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50/50">
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4 first:rounded-tl-2xl">客户信息</th>
                            <th className="px-6 py-4">客户画像 (标签)</th>
                            <th className="px-6 py-4 text-right">资产规模 (AUM)</th>
                            <th className="px-6 py-4">风险偏好</th>
                            <th className="px-6 py-4">状态</th>
                            <th className="px-6 py-4 text-right last:rounded-tr-2xl">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredClients.map(client => (
                            <tr key={client.id} className="group hover:bg-gray-50/80 transition-all">
                                {/* Name & Contact */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner">
                                            {client.name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <Link to={`/portfolio/${client.id}`} className="hover:text-indigo-600 hover:underline transition-all">
                                                    {client.name}
                                                </Link>
                                                <span className={`w-1.5 h-1.5 rounded-full ${client.gender === 'F' ? 'bg-pink-400' : 'bg-blue-400'}`}></span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 font-mono flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {client.phone}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Tags */}
                                <td className="px-6 py-4 max-w-[300px]">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {client.tags.length > 0 ? (
                                            client.tags.map(tag => (
                                                <TagBadge key={tag.id} tag={tag} onRemove={() => handleRemoveTag(client.id, tag.id)} />
                                            ))
                                        ) : (
                                            <span className="text-gray-300 text-xs italic">暂无标签</span>
                                        )}

                                        {/* Add Tag Popover Trigger */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowTagInputId(showTagInputId === client.id ? null : client.id)}
                                                className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all opacity-0 group-hover:opacity-100 bg-white"
                                                title="添加标签"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>

                                            {/* Tag Input Popover */}
                                            {showTagInputId === client.id && (
                                                <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-xl border border-gray-100 p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-semibold text-gray-700">添加新标签</label>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            className="text-xs border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                            placeholder="输入标签名..."
                                                            value={newTagLabel}
                                                            onChange={e => setNewTagLabel(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(client.id); }}
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setShowTagInputId(null)} className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded">取消</button>
                                                            <button
                                                                onClick={() => handleAddTag(client.id)}
                                                                disabled={!newTagLabel}
                                                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                                                            >
                                                                添加
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* AUM */}
                                <td className="px-6 py-4 text-right">
                                    <div className="font-mono font-bold text-gray-900">
                                        ¥{(client.totalAum / 10000).toLocaleString()}<span className="text-xs text-gray-400 ml-0.5 font-normal">万</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                            style={{ width: `${Math.min(100, (client.totalAum / 50000000) * 100)}%` }}
                                        ></div>
                                    </div>
                                </td>

                                {/* Risk */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className={`w-3.5 h-3.5 ${client.riskLevel.includes('保守') ? 'text-green-500' : client.riskLevel.includes('稳健') ? 'text-blue-500' : client.riskLevel.includes('激进') ? 'text-red-500' : 'text-orange-500'}`} />
                                        <span className="text-sm text-gray-700">{client.riskLevel.split('-')[1]}</span>
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4">
                                    <StatusBadge status={client.status} />
                                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {client.lastContactDate}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors" title="发消息">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 hover:bg-gray-100 text-gray-600 rounded-full transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="w-8 h-8 text-gray-300" />
                                        <span>未找到匹配的客户</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Click outside listener to close popover could be added here overlay style, 
                for now we use simple focus/blur or specific close buttons */}
            {showTagInputId && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowTagInputId(null)}></div>
            )}
        </div>
    );
};

export default ClientListPage;
