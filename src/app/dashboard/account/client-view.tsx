'use client';

import { useState, useTransition } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Save, KeyRound, ShieldCheck } from 'lucide-react';
import { updateProfile, updatePassword, deactivateAccount } from './actions';

interface Props {
  email: string;
  firstName: string;
  lastName: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  subscriptionId: string;
  planName: string;
}

export default function AccountClientView({
  email,
  firstName: initialFirstName,
  lastName: initialLastName,
  subscriptionStatus,
  subscriptionExpiresAt,
  subscriptionId,
  planName
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isPendingProfile, startTransitionProfile] = useTransition();
  const [profileMsg, setProfileMsg] = useState<{type: 'error'|'success', text: string} | null>(null);

  const [isPendingPassword, startTransitionPassword] = useTransition();
  const [passwordMsg, setPasswordMsg] = useState<{type: 'error'|'success', text: string} | null>(null);

  const isSubscribed = subscriptionStatus === 'active' &&
    subscriptionExpiresAt &&
    new Date(subscriptionExpiresAt) > new Date() &&
    subscriptionId !== 'free' &&
    subscriptionId !== null &&
    subscriptionId !== '';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    startTransitionProfile(async () => {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      
      const result = await updateProfile(formData);
      if (result?.error) {
        setProfileMsg({ type: 'error', text: result.error });
      } else {
        setProfileMsg({ type: 'success', text: result.message || 'Thành công' });
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    startTransitionPassword(async () => {
      const formData = new FormData();
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmPassword', confirmPassword);
      
      const result = await updatePassword(formData);
      if (result?.error) {
        setPasswordMsg({ type: 'error', text: result.error });
      } else {
        setPasswordMsg({ type: 'success', text: result.message || 'Thành công' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    });
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Gói Cước Card */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Trạng thái Gói (Plan)</h2>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div>
            <div className="text-sm text-zinc-400 mb-1">Email tài khoản</div>
            <div className="font-medium">{email}</div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-zinc-800"></div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Gói hiện tại</div>
            <div className={`font-semibold ${isSubscribed ? 'text-emerald-400' : 'text-zinc-300'}`}>
              {isSubscribed ? planName : 'Free Tier'}
            </div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-zinc-800"></div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Hết hạn</div>
            <div className="font-medium text-zinc-300">
              {isSubscribed && subscriptionExpiresAt 
                ? new Date(subscriptionExpiresAt).toLocaleDateString()
                : 'Không giới hạn'}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cập nhật Thông tin cá nhân */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Thông tin cá nhân</h2>
        
        {profileMsg && (
          <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-sm border ${profileMsg.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
            {profileMsg.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <p>{profileMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Họ (First Name)</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nguyễn Văn"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Tên (Last Name)</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="A"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPendingProfile}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
            >
              {isPendingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </section>

      {/* 3. Thay đổi mật khẩu */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Đổi Mật khẩu</h2>
        </div>

        {passwordMsg && (
          <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-sm border ${passwordMsg.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
            {passwordMsg.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <p>{passwordMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Mật khẩu hiện tại</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Mật khẩu mới</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Từ 6 ký tự trở lên"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPendingPassword || newPassword !== confirmPassword || newPassword.length < 6}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 border border-zinc-700 hover:border-zinc-600"
            >
              {isPendingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Cập nhật Mật khẩu
            </button>
          </div>
        </form>
      </section>

      {/* 4. Vùng nguy hiểm */}
      <section className="rounded-2xl border border-red-900/30 bg-red-950/10 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-red-500">Vùng Nguỵ Hiểm</h2>
        </div>
        <p className="text-zinc-400 mb-6 text-sm">
          Vô hiệu hóa tài khoản sẽ đăng xuất bạn ra khỏi hệ thống và đóng băng mọi hoạt động. 
          Các hóa đơn và lịch sử của bạn vẫn được giữ nguyên. Cân nhắc kỹ trước khi thực hiện.
        </p>

        <form action={async () => {
          if (window.confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản này không? Mọi phiên đăng nhập sẽ bị tự động thoát ra.')) {
            await deactivateAccount()
          }
        }}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-500/30 px-6 py-3 text-sm font-bold text-red-500 transition hover:bg-red-600/20 active:scale-95"
          >
            Vô hiệu hóa Tài khoản
          </button>
        </form>
      </section>

    </div>
  );
}
