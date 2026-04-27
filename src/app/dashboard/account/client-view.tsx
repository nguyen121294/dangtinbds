'use client';

import { useState, useTransition } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Save, ShieldCheck } from 'lucide-react';
import { updateProfile, deactivateAccount } from './actions';

interface Props {
  email: string;
  firstName: string;
  lastName: string;
  trialCredits: number;
  trialExpiresAt: Date | null;
  paidCredits: number;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  subscriptionId: string;
  planName: string;
}

export default function AccountClientView({
  email,
  firstName: initialFirstName,
  lastName: initialLastName,
  trialCredits,
  trialExpiresAt,
  paidCredits,
  subscriptionStatus,
  subscriptionExpiresAt,
  subscriptionId,
  planName
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  

  const [isPendingProfile, startTransitionProfile] = useTransition();
  const [profileMsg, setProfileMsg] = useState<{type: 'error'|'success', text: string} | null>(null);

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

        {/* Credit Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Trial Credits</div>
            <div className="text-2xl font-extrabold text-gray-900">{trialCredits}</div>
            <div className="text-xs text-gray-500 mt-1">
              {trialExpiresAt
                ? new Date(trialExpiresAt) > new Date()
                  ? `Hết hạn: ${new Date(trialExpiresAt).toLocaleDateString('vi-VN')}`
                  : '⚠️ Đã hết hạn'
                : 'Vô hạn'}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Paid Credits</div>
            <div className="text-2xl font-extrabold text-gray-900">{paidCredits}</div>
            <div className="text-xs text-gray-500 mt-1">
              {isSubscribed && subscriptionExpiresAt
                ? `Hết hạn: ${new Date(subscriptionExpiresAt).toLocaleDateString('vi-VN')}`
                : 'Chưa mua gói'}
            </div>
          </div>
        </div>

        {!isSubscribed && (
          <div className="mt-5">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 bg-[#E03C31] hover:bg-[#c9362c] text-white px-6 py-3 rounded-lg font-bold transition-all hover:-translate-y-0.5 shadow-md text-sm"
            >
              🚀 Nâng cấp tài khoản
            </a>
          </div>
        )}
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


      {/* 4. Vùng nguy hiểm — Ẩn để tránh tạo ấn tượng tiêu cực cho người dùng */}

    </div>
  );
}
