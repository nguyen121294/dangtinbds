'use client';

import { useTransition, useState } from 'react';
import { Crown, Trash2, Loader2 } from 'lucide-react';
import { inviteMemberAction, transferOwnershipAction, removeMemberAction } from './actions';

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
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!quotaCanInvite || isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
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
