'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Info } from 'lucide-react';
import type { Plan } from '@/lib/plans';

export function MatrixPricingTable({ plans, isLoggedIn }: { plans: Plan[], isLoggedIn: boolean }) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Grouping logic
  const rowCredits = Array.from(new Set(plans.map(p => p.creditsOffered))).sort((a,b) => a - b);
  const colDays = Array.from(new Set(plans.map(p => p.days))).sort((a,b) => a - b);
  
  const getPlanAt = (credits: number, days: number) => {
    return plans.find(p => p.creditsOffered === credits && p.days === days);
  }

  const handleCheckout = async () => {
    if (!selectedPlanId) return;
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Có lỗi xảy ra khi tạo link thanh toán. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Không thể kết nối với máy chủ thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Login Prompt Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-sm shadow-xl max-w-sm w-full border border-gray-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <Info className="w-12 h-12 text-[#E03C31] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Bạn cần đăng nhập</h3>
            <p className="text-gray-600 mb-6">Xin lỗi, bạn cần phải đăng nhập tài khoản trước khi có thể tiến hành mua gói tính phí.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-2 px-4 rounded-sm border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <a 
                href="/login?returnTo=/pricing"
                className="flex-1 py-2 px-4 rounded-sm bg-[#E03C31] text-white font-bold hover:bg-[#c9362c] transition"
              >
                Đăng nhập
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Scrollable container on mobile */}
      <div className="w-full overflow-x-auto shadow-xl rounded-sm border border-gray-200 bg-white">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="py-4 px-6 font-extrabold text-gray-800 text-lg border-r border-gray-200 w-1/4">
                Credits \ Thời gian
              </th>
              {colDays.map(days => (
                <th key={days} className="py-4 px-6 font-bold text-[#E03C31] text-lg text-center border-r border-gray-200 last:border-r-0 w-1/4">
                  {days} Ngày
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowCredits.map((credits) => (
              <tr key={credits} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-bold text-[#0b1c30] text-lg border-r border-gray-200">
                  {new Intl.NumberFormat('vi-VN').format(credits)} Credits
                </td>
                {colDays.map(days => {
                  const plan = getPlanAt(credits, days);
                  const isSelected = selectedPlanId === plan?.id;
                  
                  return (
                    <td 
                      key={days} 
                      className={`p-2 border-r border-gray-200 last:border-r-0 transition-all ${!plan ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-red-50' : 'hover:bg-red-50/50'}`}
                      onClick={() => { if (plan) setSelectedPlanId(plan.id) }}
                    >
                      {plan ? (
                        <div className={`h-full w-full py-3 px-2 flex items-center justify-center rounded-sm border-2 transition-all ${isSelected ? 'border-[#E03C31] shadow-[0_0_10px_rgba(224,60,49,0.2)]' : 'border-transparent'}`}>
                           <span className={`text-xl font-extrabold ${isSelected ? 'text-[#E03C31]' : 'text-gray-900'}`}>
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(plan.price)}
                           </span>
                        </div>
                      ) : (
                        <div className="text-center text-gray-300 text-sm italic">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Action Bottom */}
      <div className="mt-8 flex flex-col items-center w-full max-w-2xl bg-white p-6 rounded-sm border border-gray-200 shadow-md">
         {selectedPlan ? (
           <div className="text-center w-full">
             <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-600">Gói đã chọn</h3>
                <p className="text-2xl font-extrabold text-[#0b1c30] mt-1">{selectedPlan.name}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                   {selectedPlan.features.map(f => (
                     <span key={f} className="bg-emerald-50 text-emerald-700 px-3 py-1 text-sm rounded-full font-medium border border-emerald-200">
                        {f}
                     </span>
                   ))}
                </div>
             </div>
             
             <button
               onClick={handleCheckout}
               disabled={loading}
               className="w-full flex items-center justify-center gap-2 rounded-sm bg-[#E03C31] hover:bg-[#c9362c] text-white px-8 py-4 text-xl font-bold shadow-lg transition disabled:opacity-50"
             >
               {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CreditCard className="h-6 w-6" />}
               Thanh toán {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(selectedPlan.price)}
             </button>
           </div>
         ) : (
           <div className="text-center py-6 text-gray-400 flex flex-col items-center w-full">
             <Info className="w-8 h-8 mb-2" />
             <p className="text-lg">Vui lòng bấm chọn một gói trên bảng để tiến hành tạo thanh toán PayOS.</p>
           </div>
         )}
      </div>
    </div>
  );
}
