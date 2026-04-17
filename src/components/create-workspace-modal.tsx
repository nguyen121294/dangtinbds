'use client';

import { useState } from 'react';
import { createWorkspaceAction } from '@/app/dashboard/actions';
import { X, Plus, Loader2 } from 'lucide-react';

export default function CreateWorkspaceModal({ canCreate, used, total }: { canCreate: boolean, used: number, total: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorText('');
    
    const formData = new FormData(e.currentTarget);
    const result = await createWorkspaceAction(formData);
    
    if (result && result.error) {
       setErrorText(result.error);
       setLoading(false);
    }
    // Nếu thành công thì action redirect sẽ tự chạy và đưa sang trang mới, không cần đóng popup.
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#E03C31] hover:bg-[#c9362c] text-white text-sm font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E03C31] focus-visible:ring-offset-2 shadow-sm"
      >
         <Plus className="w-4 h-4" />
         Tạo Tổ Chức mới
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 p-6 rounded-sm w-full max-w-md shadow-lg relative flex flex-col">
            <button 
               onClick={() => setIsOpen(false)}
               className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
               <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold mb-1 text-gray-900">Tạo Tổ Chức mới</h2>
            <p className="text-gray-500 mb-6 text-sm">
               Hạn mức gói: <strong className={canCreate ? 'text-green-600' : 'text-red-600'}>{used} / {total}</strong> phòng.
            </p>

            {canCreate ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên Tổ Chức (Workspace)</label>
                    <input 
                      type="text" 
                      name="name" 
                      required
                      placeholder="VD: Team Bán Hàng Quận 1..." 
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[#E03C31] focus:ring-1 focus:ring-[#E03C31] transition-shadow placeholder:text-gray-400"
                      autoFocus
                    />
                 </div>

                 {errorText && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-sm border border-red-200">
                      {errorText}
                    </div>
                 )}

                 <div className="mt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-sm text-sm transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                       type="submit" 
                       disabled={loading}
                       className="flex-1 py-2 bg-[#E03C31] hover:bg-[#c9362c] text-white font-medium rounded-sm text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                       {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                       Tạo Tổ Chức
                    </button>
                 </div>
              </form>
            ) : (
               <div className="text-center">
                  <div className="text-sm text-red-600 bg-red-50 p-4 rounded-sm border border-red-200 mb-6">
                    Bạn đã đạt giới hạn ({total} phòng). Vui lòng nâng cấp gói cước để tạo thêm.
                  </div>
                  <button 
                     onClick={() => setIsOpen(false)}
                      className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-sm text-sm transition-colors"
                  >
                     Đóng cửa sổ
                  </button>
               </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
