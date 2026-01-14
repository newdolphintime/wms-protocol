import React, { useState } from 'react';
import { X, Loader2, User, Phone, Tag } from 'lucide-react';
import { createClient, updateClient, Client, ClientCreate, ClientStatus } from '../services/clientService';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (client: any) => void;
    initialData?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<ClientCreate>({
        name: '',
        phone: '',
        gender: 'M',
        status: 'POTENTIAL',
        riskLevel: 'C1-保守型',
        lastContactDate: new Date().toISOString().split('T')[0],
        tags: []
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name,
                phone: initialData.phone,
                gender: initialData.gender,
                status: initialData.status,
                riskLevel: initialData.riskLevel,
                lastContactDate: initialData.lastContactDate || new Date().toISOString().split('T')[0],
                tags: initialData.tags || []
            });
        } else if (isOpen) {
            setFormData({
                name: '',
                phone: '',
                gender: 'M',
                status: 'POTENTIAL',
                riskLevel: 'C1-保守型',
                lastContactDate: new Date().toISOString().split('T')[0],
                tags: []
            });
        }
    }, [isOpen, initialData]);

    const [tagInput, setTagInput] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Process tags if any pending input
            const finalTags = [...(formData.tags || [])];
            if (tagInput.trim()) {
                finalTags.push({
                    id: Date.now().toString(),
                    label: tagInput.trim(),
                    color: 'blue' // Default color
                });
            }

            const payload = { ...formData, tags: finalTags };

            if (initialData?.id) {
                await updateClient(initialData.id, payload);
            } else {
                await createClient(payload);
            }

            onSuccess(payload);
            setFormData({
                name: '',
                phone: '',
                gender: 'M',
                status: 'POTENTIAL',
                riskLevel: 'C1-保守型',
                lastContactDate: new Date().toISOString().split('T')[0],
                tags: []
            });
            onClose();
        } catch (err: any) {
            setError(err.message || (initialData ? '更新客户失败' : '创建客户失败'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            tags: [...(prev.tags || []), { id: Date.now().toString(), label: tagInput.trim(), color: 'blue' }]
        }));
        setTagInput('');
    };

    const handleRemoveTag = (tagId: string) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(t => t.id !== tagId)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">{initialData ? '编辑客户信息' : '录入新客户'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                <User className="w-3.5 h-3.5" /> 姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="请输入姓名"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> 手机号
                            </label>
                            <input
                                type="tel"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="请输入手机号"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600">性别</label>
                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="M"
                                        checked={formData.gender === 'M'}
                                        onChange={() => setFormData({ ...formData, gender: 'M' })}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>男士</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="F"
                                        checked={formData.gender === 'F'}
                                        onChange={() => setFormData({ ...formData, gender: 'F' })}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>女士</span>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600">客户状态</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                            >
                                <option value="POTENTIAL">潜在</option>
                                <option value="ACTIVE">活跃</option>
                                <option value="VIP">核心VIP</option>
                                <option value="INACTIVE">流失</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">风险偏好</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            value={formData.riskLevel}
                            onChange={e => setFormData({ ...formData, riskLevel: e.target.value })}
                        >
                            <option value="C1-保守型">C1-保守型 (低风险)</option>
                            <option value="C2-稳健型">C2-稳健型 (中低风险)</option>
                            <option value="C3-平衡型">C3-平衡型 (中风险)</option>
                            <option value="C4-进取型">C4-进取型 (中高风险)</option>
                            <option value="C5-激进型">C5-激进型 (高风险)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> 初始标签 (可选)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                placeholder="输入标签按回车添加..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 font-medium"
                            >
                                添加
                            </button>
                        </div>
                        {formData.tags && formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.tags.map(tag => (
                                    <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
                                        {tag.label}
                                        <button type="button" onClick={() => handleRemoveTag(tag.id)} className="hover:text-indigo-900">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            保存客户
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
