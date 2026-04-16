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
        className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-700/50 rounded-2xl hover:bg-zinc-800/20 hover:border-zinc-500 transition cursor-pointer text-zinc-400 hover:text-white"
      >
         <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <Plus className="w-6 h-6" />
         </div>
         <span className="font-semibold">Tạo Workspace mới</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col">
            <button 
               onClick={() => setIsOpen(false)}
               className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"
            >
               <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-2">Tạo Workspace mới</h2>
            <p className="text-zinc-400 mb-6 text-sm">
               Hạn mức gói của bạn: <strong className={canCreate ? 'text-emerald-400' : 'text-rose-400'}>{used} / {total}</strong> phòng.
            </p>

            {canCreate ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                 <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Tên Workspace</label>
                    <input 
                      type="text" 
                      name="name" 
                      required
                      placeholder="VD: Dự án Red Team 2026..." 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      autoFocus
                    />
                 </div>

                 {errorText && (
                    <div className="text-sm text-rose-500 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      {errorText}
                    </div>
                 )}

                 <div className="mt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition"
                    >
                      Hủy báo
                    </button>
                    <button 
                       type="submit" 
                       disabled={loading}
                       className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2"
                    >
                       {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                       Tạo Ngay
                    </button>
                 </div>
              </form>
            ) : (
               <div className="text-center">
                  <div className="text-sm text-rose-500 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 mb-6">
                    Bạn không thể tạo thêm Workspace vì đã đạt giới hạn của Đăng ký hiện tại. Vui lòng nâng cấp gói cước để tạo thêm phòng.
                  </div>
                  <button 
                     onClick={() => setIsOpen(false)}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition"
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
