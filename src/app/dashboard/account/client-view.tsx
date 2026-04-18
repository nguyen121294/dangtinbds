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
    <div className="space-y-6">
      
      {/* 1. Gói Cước Card */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-[#E03C31]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Trạng thái Gói (Plan)</h2>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg bg-gray-50 border border-gray-200">
          <div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Email tài khoản</div>
            <div className="font-bold text-gray-900">{email}</div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-gray-200"></div>
          <div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Gói hiện tại</div>
            <div className={`font-extrabold ${isSubscribed ? 'text-[#E03C31]' : 'text-gray-600'}`}>
              {isSubscribed ? planName : 'Free Tier'}
            </div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-gray-200"></div>
          <div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Hết hạn</div>
            <div className="font-bold text-gray-700">
              {isSubscribed && subscriptionExpiresAt 
                ? new Date(subscriptionExpiresAt).toLocaleDateString()
                : 'Không giới hạn'}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cập nhật Thông tin cá nhân */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Thông tin cá nhân</h2>
        
        {profileMsg && (
          <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-sm font-medium border ${profileMsg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
            {profileMsg.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <p>{profileMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Họ (First Name)</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition hover:border-gray-400 focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                placeholder="Nguyễn Văn"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tên (Last Name)</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition hover:border-gray-400 focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                placeholder="A"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPendingProfile}
              className="flex items-center gap-2 rounded-lg bg-[#E03C31] px-8 py-3 text-sm font-bold text-white transition-transform hover:bg-[#c9362c] hover:-translate-y-0.5 shadow-[0_4px_14px_0_rgba(224,60,49,0.39)] disabled:opacity-50 disabled:transform-none"
            >
              {isPendingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </section>

      {/* 3. Thay đổi mật khẩu */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Đổi Mật khẩu</h2>
        </div>

        {passwordMsg && (
          <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-sm font-medium border ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
            {passwordMsg.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <p>{passwordMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Mật khẩu hiện tại</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition hover:border-gray-400 focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
              placeholder="••••••••"
            />
          </div>
          
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mật khẩu mới</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition hover:border-gray-400 focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                placeholder="Từ 6 ký tự trở lên"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition hover:border-gray-400 focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPendingPassword || newPassword !== confirmPassword || newPassword.length < 6}
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-8 py-3 text-sm font-bold text-white transition-transform hover:bg-gray-900 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none shadow-sm"
            >
              {isPendingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Cập nhật Mật khẩu
            </button>
          </div>
        </form>
      </section>

      {/* 4. Vùng nguy hiểm */}
      <section className="rounded-xl border border-red-200 bg-red-50/50 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-red-600">Vùng nguy hiểm</h2>
        </div>
        <p className="text-gray-600 mb-6 text-sm">
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
            className="flex items-center gap-2 rounded-lg bg-white border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 px-6 py-3 text-sm font-bold transition-all active:scale-95 shadow-sm"
          >
            Vô hiệu hóa Tài khoản
          </button>
        </form>
      </section>

    </div>
  );
}
