'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Loader2, Save } from 'lucide-react';
import { Plan } from '@/lib/plans';

export default function PlansTable({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = Array.from(new Set(plans.map(p => p.category)));
  const filteredPlans = categoryFilter === 'all' ? plans : plans.filter(p => p.category === categoryFilter);

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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${categoryFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tất cả ({plans.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 text-sm font-bold rounded-md transition capitalize ${categoryFilter === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {cat === 'personal' ? 'Cá nhân' : cat === 'business' ? 'Doanh nghiệp' : cat} ({plans.filter(p => p.category === cat).length})
            </button>
          ))}
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingPlan(emptyPlan); }}
          className="bg-[#E03C31] hover:bg-red-700 text-white px-5 py-3 md:py-2.5 rounded-lg md:rounded-sm font-bold flex items-center justify-center w-full sm:w-auto gap-2 transition active:scale-95 shadow-sm"
        >
          <Plus className="w-5 h-5 md:w-4 md:h-4" />
          Thêm Gói Mới
        </button>
      </div>

      {/* Desktop Matrix Table (Hidden on Mobile) */}
      <div className="hidden md:block w-full overflow-x-auto shadow-sm rounded-sm border border-gray-200 bg-white">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-4 px-6 font-extrabold text-gray-900 text-lg border-r border-gray-200 w-1/4">
                Credits \ Thời gian
              </th>
              {Array.from(new Set(filteredPlans.map(p => p.days))).sort((a,b) => a - b).map(days => (
                <th key={days} className="py-4 px-6 font-bold text-[#E03C31] text-lg text-center border-r border-gray-200 last:border-r-0 w-1/4">
                  {days} Ngày
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(filteredPlans.map(p => p.creditsOffered))).sort((a,b) => a - b).map((credits) => (
              <tr key={credits} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-gray-900 text-lg border-r border-gray-200">
                  {new Intl.NumberFormat('vi-VN').format(credits)} Credits
                </td>
                {Array.from(new Set(filteredPlans.map(p => p.days))).sort((a,b) => a - b).map(days => {
                  const plan = filteredPlans.find(p => p.creditsOffered === credits && p.days === days);
                  
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

      {/* Mobile Card Layout (Hidden on Desktop) */}
      <div className="md:hidden space-y-4">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">{plan.name || plan.id}</h4>
                <div className="flex items-center gap-2 mt-1.5">
                   <span className="text-[11px] font-bold px-2 py-0.5 bg-red-50 text-[#E03C31] border border-red-100 rounded-sm inline-block">
                     {plan.days} Ngày
                   </span>
                   {plan.id && (
                     <span className="text-[10px] uppercase font-semibold text-gray-400">ID: {plan.id}</span>
                   )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-[#E03C31]">
                  {new Intl.NumberFormat('vi-VN').format(plan.price)}đ
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex flex-col items-center justify-center">
                <span className="block text-[10px] uppercase text-gray-400 font-bold mb-0.5">Nạp Credits</span>
                <span className="font-bold text-amber-600 text-lg">{new Intl.NumberFormat('vi-VN').format(plan.creditsOffered)}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex flex-col items-center justify-center">
                <span className="block text-[10px] uppercase text-gray-400 font-bold mb-0.5">Tối đa Invites</span>
                <span className="font-bold text-blue-600 text-lg">{plan.maxInvites || 0}</span>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setEditingPlan(plan); setIsAdding(false); }}
                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-4 h-4" />
                Sửa gói
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xoá gói
              </button>
            </div>
          </div>
        ))}
        {filteredPlans.length === 0 && (
          <div className="text-center py-10 px-4 text-gray-500 bg-white border border-gray-200 rounded-xl border-dashed">
            Chưa có gói nào được tạo.
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex md:items-center justify-center bg-gray-900/60 md:backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white border-0 md:border md:border-gray-200 w-full md:max-w-2xl h-[100dvh] md:h-auto md:max-h-[90vh] md:rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom border-t md:border-t-0 md:slide-in-from-bottom-4 duration-300">
            {/* Header Sticky */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 shrink-0 bg-white md:rounded-t-xl shadow-sm z-10">
              <h3 className="text-xl font-bold text-gray-900">{isAdding ? 'Thêm gói mới' : 'Chỉnh sửa gói'}</h3>
              <button 
                onClick={() => setEditingPlan(null)}
                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="w-6 h-6 md:w-5 md:h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <form id="plan-form" onSubmit={handleSavePlan} className="p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="flex gap-4 p-4 md:p-6 border-t border-gray-200 bg-gray-50 md:rounded-b-xl shrink-0 mt-auto">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-3.5 md:py-3 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="plan-form"
                disabled={loading}
                className="flex-1 bg-[#E03C31] hover:bg-[#c9362c] disabled:opacity-50 text-white font-bold py-3.5 md:py-3 rounded-lg transition shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Lưu gói
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
