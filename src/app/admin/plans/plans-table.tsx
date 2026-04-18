'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Loader2, Save } from 'lucide-react';
import { Plan } from '@/lib/plans';

export default function PlansTable({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const emptyPlan: Plan = {
    id: '',
    name: '',
    category: 'personal',
    price: 0,
    days: 30,
    creditsOffered: 10,
    description: '',
    features: [],
    maxWorkspaces: 1,
    maxInvites: 5,
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan),
      });

      if (res.ok) {
        if (isAdding) {
          setPlans([...plans, editingPlan]);
        } else {
          setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
        }
        setEditingPlan(null);
        setIsAdding(false);
      } else {
        alert('Lưu thất bại');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa gói này?')) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/plans/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setPlans(plans.filter(p => p.id !== id));
      } else {
        alert('Xóa thất bại');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-end mb-6">
        <button 
          onClick={() => { setIsAdding(true); setEditingPlan(emptyPlan); }}
          className="bg-[#E03C31] hover:bg-red-700 text-white px-5 py-2.5 rounded-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm Mốc Khác
        </button>
      </div>

      <div className="w-full overflow-x-auto shadow-sm rounded-sm border border-gray-200 bg-white">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-4 px-6 font-extrabold text-gray-900 text-lg border-r border-gray-200 w-1/4">
                Credits \ Thời gian
              </th>
              {Array.from(new Set(plans.map(p => p.days))).sort((a,b) => a - b).map(days => (
                <th key={days} className="py-4 px-6 font-bold text-[#E03C31] text-lg text-center border-r border-gray-200 last:border-r-0 w-1/4">
                  {days} Ngày
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(plans.map(p => p.creditsOffered))).sort((a,b) => a - b).map((credits) => (
              <tr key={credits} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-gray-900 text-lg border-r border-gray-200">
                  {new Intl.NumberFormat('vi-VN').format(credits)} Credits
                </td>
                {Array.from(new Set(plans.map(p => p.days))).sort((a,b) => a - b).map(days => {
                  const plan = plans.find(p => p.creditsOffered === credits && p.days === days);
                  
                  return (
                    <td 
                      key={days} 
                      className="p-3 border-r border-gray-200 last:border-r-0 text-center"
                    >
                      {plan ? (
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-xl font-extrabold text-gray-900">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(plan.price)}
                           </span>
                           <div className="flex gap-2">
                             <button
                               onClick={() => { setEditingPlan(plan); setIsAdding(false); }}
                               className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                             >
                               Chỉnh sửa
                             </button>
                             <button
                               onClick={() => handleDeletePlan(plan.id)}
                               className="text-xs text-red-500 hover:text-red-700 font-semibold"
                             >
                               Xoá
                             </button>
                           </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { 
                            setIsAdding(true); 
                            setEditingPlan({ ...emptyPlan, days, creditsOffered: credits }); 
                          }}
                          className="w-full h-full py-4 text-gray-400 hover:text-[#E03C31] flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 hover:border-[#E03C31] rounded-sm transition font-medium"
                        >
                          <Plus className="w-5 h-5 mr-1" /> Thêm Mới Giá
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">{isAdding ? 'Thêm gói mới' : 'Chỉnh sửa gói'}</h3>
              <button 
                onClick={() => setEditingPlan(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ID (Dùng để định danh gán cho user)</label>
                  <input 
                    type="text"
                    disabled={!isAdding}
                    value={editingPlan.id}
                    onChange={(e) => setEditingPlan({...editingPlan, id: e.target.value})}
                    placeholder="vd: plus, pro, master"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50 disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tên hiển thị</label>
                  <input 
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Giá tiền (VND)</label>
                  <input 
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Thời gian (Ngày)</label>
                  <input 
                    type="number"
                    value={editingPlan.days}
                    onChange={(e) => setEditingPlan({...editingPlan, days: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số Credits (Tokens) sẽ nạp</label>
                  <input 
                    type="number"
                    min="0"
                    value={editingPlan.creditsOffered}
                    onChange={(e) => setEditingPlan({...editingPlan, creditsOffered: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-bold text-amber-600"
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng Không gian (Workspaces) tối đa cho phép</label>
                  <input 
                    type="number"
                    min="1"
                    value={editingPlan.maxWorkspaces || 1}
                    onChange={(e) => setEditingPlan({...editingPlan, maxWorkspaces: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50 font-bold text-emerald-600"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Ví dụ: Mặc định đặt là 1 (nghĩa là user được tạo 1 phòng). VIP đặt 999.</p>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng Người được Mời (Max Invites limit) cho mỗi Chủ phòng</label>
                  <input 
                    type="number"
                    min="0"
                    value={editingPlan.maxInvites ?? 0}
                    onChange={(e) => setEditingPlan({...editingPlan, maxInvites: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-blue-600"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Ví dụ: Gói Free = 0, Gói Pro = 5 (mời đc 5 dân mạng vào xài ké).</p>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả ngắn</label>
                  <textarea 
                    value={editingPlan.description || ''}
                    onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tính năng / Chìa Khoá Mở Khoá (Feature Keys) - Mỗi dòng một tính năng
                  </label>
                  <textarea 
                    value={editingPlan.features?.join('\n') || ''}
                    onChange={(e) => setEditingPlan({...editingPlan, features: e.target.value.split('\n').filter(f => f.trim())})}
                    rows={5}
                    placeholder="Truy cập VIP&#10;Hỗ trợ 24/7&#10;export_pdf&#10;ai_model"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/50"
                  />
                  <p className="text-xs text-gray-500 mt-2">Dùng chữ thường như "export_pdf", "ai_bot" để dev có thể khóa/mở bằng code.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky shadow-[0_-10px_10px_-5px_rgba(255,255,255,1)]">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#E03C31] hover:bg-[#c9362c] disabled:opacity-50 text-white font-bold py-3 rounded-lg transition shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Lưu gói
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
