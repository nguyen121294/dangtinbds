'use client';

import { useState } from 'react';
import { forceTransferOwnershipAction } from './actions';
import { Crown, AlertTriangle, ArrowRightCircle } from 'lucide-react';

type UserProfile = {
  id: string;
  email: string;
}

type WorkspaceInfo = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: Date | null;
};

export function WorkspacesTable({ initialData, users }: { initialData: WorkspaceInfo[], users: UserProfile[] }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>(initialData);
  const [selectedWs, setSelectedWs] = useState<WorkspaceInfo | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForceTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWs || !newOwnerId) return;
    
    if (!confirm(`CẢNH BÁO: BẠN ĐANG DÙNG QUYỀN ADMIN ĐỂ CHIẾM ĐOẠT PHÒNG "${selectedWs.name}". \n\nHành động này sẽ tước quyền của chủ cũ và trao cho ID mới bất chấp họ có phải là VIP hay không. Bạn có chắc chắn?`)) return;

    setIsSubmitting(true);
    const res = await forceTransferOwnershipAction(selectedWs.id, newOwnerId);
    if (res.error) {
       alert("Lỗi: " + res.error);
    } else {
       alert("Chuyển giao quyền lực thành công!");
       // Update UI state locally
       setWorkspaces(prev => prev.map(w => {
         if (w.id === selectedWs.id) {
           const newO = users.find(u => u.id === newOwnerId);
           return { ...w, ownerId: newOwnerId, ownerEmail: newO?.email || 'Unknown' };
         }
         return w;
       }));
       setSelectedWs(null);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="text-xs uppercase bg-zinc-950/50 border-b border-zinc-800 text-zinc-500">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Tên Không Gian</th>
              <th scope="col" className="px-6 py-4 font-semibold">Chủ Sở Hữu Hiện Tại</th>
              <th scope="col" className="px-6 py-4 font-semibold">Hành Động Khẩn Cấp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {workspaces.map((ws) => (
              <tr key={ws.id} className="hover:bg-zinc-800/30 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-bold text-white text-base flex items-center gap-2">
                     {ws.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">{ws.id}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700 font-medium">
                     {ws.ownerEmail}
                  </span>
                  <div className="text-xs text-zinc-600 mt-1 font-mono">ID: {ws.ownerId}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                     onClick={() => { setSelectedWs(ws); setNewOwnerId(''); }}
                     className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition text-xs"
                  >
                     <Crown className="w-4 h-4" /> Ép Đổi Chủ
                  </button>
                </td>
              </tr>
            ))}
            
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                  Chưa có phòng làm việc nào trong hệ thống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Đổi Chủ */}
      {selectedWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative">
             <button onClick={() => setSelectedWs(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">&times;</button>
             
             <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-rose-400">
               <AlertTriangle className="w-6 h-6" /> Quyền Admin Cấp Cao
             </h3>
             <p className="text-sm text-zinc-400 mb-6 border-b border-zinc-800 pb-4">
               Hành động này sẽ TƯỚC QUYỀN của chủ phòng <strong className="text-white">{selectedWs.ownerEmail}</strong> khỏi phòng <strong className="text-white">{selectedWs.name}</strong>.
             </p>

             <form onSubmit={handleForceTransfer} className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-zinc-300 mb-2">Chọn Chủ mới (Hành động Vượt Mặt Gói Cước):</label>
                   <select 
                     value={newOwnerId}
                     onChange={(e) => setNewOwnerId(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                     required
                   >
                     <option value="" disabled>-- Hãy chọn người kế nhiệm --</option>
                     {users.map(u => (
                       <option key={u.id} value={u.id}>{u.email}</option>
                     ))}
                   </select>
                </div>
                
                <div className="flex gap-3 justify-end pt-4">
                   <button type="button" onClick={() => setSelectedWs(null)} className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 transition">Hủy</button>
                   <button type="submit" disabled={isSubmitting || !newOwnerId} className="px-5 py-2.5 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-500 flex items-center gap-2 transition disabled:opacity-50">
                      Cưỡng Chế Đổi Quyền <ArrowRightCircle className="w-4 h-4" />
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
