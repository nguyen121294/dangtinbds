'use client';

import { useTransition, useState } from 'react';
import { Crown, Trash2, Loader2 } from 'lucide-react';
import { inviteMemberAction, transferOwnershipAction, removeMemberAction, updateCreditLimitAction } from './actions';

export function UpdateCreditLimitForm({ workspaceId, userId, initialLimit, used }: { workspaceId: string, userId: string, initialLimit: number, used: number }) {
  const [isPending, startTransition] = useTransition();
  const [limit, setLimit] = useState(initialLimit.toString());
  const [editing, setEditing] = useState(false);

  const handleUpdate = () => {
    const val = parseInt(limit, 10);
    if (isNaN(val) || val < 0) return alert('Hạn mức không hợp lệ');

    startTransition(async () => {
      const res = await updateCreditLimitAction(workspaceId, userId, val);
      if (res?.error) {
        alert('Lỗi: ' + res.error);
      } else {
        setEditing(false);
      }
    });
  };

  if (!editing) {
     return (
        <div className="flex bg-[#F2F4F5] rounded-sm px-3 py-1.5 items-center gap-2 border border-gray-200">
           <span className="text-xs text-gray-500 font-medium uppercase min-w-max">Hạn mức</span>
           <span className="text-sm font-bold text-gray-900">{used} / {initialLimit === 0 ? "0 (Chặn)" : initialLimit}</span>
           <button onClick={() => setEditing(true)} className="ml-2 text-xs text-blue-600 hover:underline">Sửa</button>
        </div>
     );
  }

  return (
    <div className="flex bg-[#F2F4F5] rounded-sm px-2 py-1 items-center gap-2 border border-blue-500">
       <span className="text-xs text-gray-500 font-medium uppercase min-w-max">Cấp hạn mức:</span>
       <input 
         type="number" 
         min="0"
         value={limit} 
         onChange={e => setLimit(e.target.value)}
         className="w-16 px-1.5 py-0.5 text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded outline-none focus:border-blue-500"
       />
       <button onClick={handleUpdate} disabled={isPending} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Lưu</button>
       <button onClick={() => setEditing(false)} disabled={isPending} className="text-xs font-medium text-gray-500 hover:text-gray-700">Huỷ</button>
    </div>
  );
}

export function InviteMemberForm({ workspaceId, quotaCanInvite }: { workspaceId: string, quotaCanInvite: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !quotaCanInvite) return;
    
    setMsg(null);
    startTransition(async () => {
      const res = await inviteMemberAction(workspaceId, email);
      if (res?.error) {
        setMsg({ type: 'error', text: res.error as string });
      } else {
        setMsg({ type: 'success', text: 'Thêm thành viên thành công!' });
        setEmail('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex gap-4">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          placeholder="Nhập địa chỉ email của thành viên..." 
          className="flex-1 bg-white border border-gray-200 rounded-sm px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31] transition disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!quotaCanInvite || isPending}
          className="bg-[#E03C31] hover:bg-[#c9362c] text-white px-6 py-3 rounded-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi Lời Mời'}
        </button>
      </div>
      
      {!quotaCanInvite && !msg && (
         <p className="mt-2 text-sm text-rose-500">Bạn đã dùng hết hạn mức mời của gói. Vui lòng xoá bớt người cũ để thêm người mới.</p>
      )}

      {msg && (
        <p className={`mt-2 text-sm ${msg.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

export function TransferOwnershipButton({ workspaceId, userId }: { workspaceId: string, userId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleTransfer = () => {
    if (!confirm('Bạn có chắc chắn muốn chuyển quyền Chủ Sở Hữu (Owner) cho người này không? Bạn sẽ bị giáng cấp thành Thành viên thường!')) return;
    
    startTransition(async () => {
      const res = await transferOwnershipAction(workspaceId, userId);
      if (res?.error) {
         alert('Lỗi: ' + res.error);
      } else {
         alert('Bàn giao thành công! Bạn không còn là chủ phòng này nữa.');
      }
    });
  };

  return (
    <button 
      onClick={handleTransfer}
      disabled={isPending}
      title="Chuyển nhượng Căn phòng cho Tên này" 
      className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
    </button>
  );
}

export function RemoveMemberButton({ workspaceId, userId }: { workspaceId: string, userId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!confirm('Bạn có chắc chắn muốn đuổi người này khỏi phòng làm việc?')) return;
    
    startTransition(async () => {
      const res = await removeMemberAction(workspaceId, userId);
      if (res?.error) {
         alert('Lỗi: ' + res.error);
      }
    });
  };

  return (
    <button 
      onClick={handleRemove}
      disabled={isPending}
      title="Đuổi khỏi phòng" 
      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <Trash2 className="w-5 h-5" />}
    </button>
  );
}
