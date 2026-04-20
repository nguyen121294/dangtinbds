'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Wallet, ArrowUpRight, Users, Clock, AlertCircle, Loader2, X } from 'lucide-react';

interface CommissionRecord {
  id: string;
  sourceEmail: string;
  tier: number;
  rate: number;
  amount: number;
  status: string;
  createdAt: string;
}

export default function ReferralPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', phone: '', bankAccount: '', bankName: '' });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/referral')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawLoading(true);
    setWithdrawMsg(null);
    try {
      const res = await fetch('/api/referral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawForm.amount),
          phone: withdrawForm.phone,
          bankAccount: withdrawForm.bankAccount,
          bankName: withdrawForm.bankName,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setWithdrawMsg({ type: 'success', text: result.message });
        setWithdrawForm({ amount: '', phone: '', bankAccount: '', bankName: '' });
        // Refresh data
        const refreshed = await fetch('/api/referral').then(r => r.json());
        setData(refreshed);
      } else {
        setWithdrawMsg({ type: 'error', text: result.error || 'Đã xảy ra lỗi.' });
      }
    } catch {
      setWithdrawMsg({ type: 'error', text: 'Đã xảy ra lỗi kết nối.' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data?.success) {
    return <div className="p-8 text-red-600">Không thể tải dữ liệu hoa hồng.</div>;
  }

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/login?ref=${data.referralCode}`
    : '';

  const tierLabel = (tier: number) => {
    if (tier === 1) return 'F1 (Trực tiếp)';
    if (tier === 2) return 'F2 (Gián tiếp)';
    return 'F3 (Tầng 3)';
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-sm font-medium">Đã duyệt</span>;
    if (status === 'rejected') return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-sm font-medium">Từ chối</span>;
    return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-sm font-medium">Chờ duyệt</span>;
  };

  return (
    <div className="p-8 w-full">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Hoa hồng Giới thiệu</h1>
          <p className="text-sm text-gray-500">Chia sẻ link giới thiệu và nhận hoa hồng khi bạn bè mua gói.</p>
        </div>

        {/* Referral Code & Link */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-[#E03C31]" />
            Mã giới thiệu của bạn
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-xl font-bold text-gray-900 tracking-widest text-center">
              {data.referralCode}
            </div>
            <button
              onClick={() => copyToClipboard(data.referralCode)}
              className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Copy mã"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-gray-500" />}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Link giới thiệu</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono"
              />
              <button
                onClick={() => copyToClipboard(referralLink)}
                className="px-4 py-2 bg-[#E03C31] hover:bg-[#c9362c] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Copy link
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>Bạn đã giới thiệu <strong className="text-gray-900">{data.f1Count}</strong> người (F1)</span>
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Ví hoa hồng
          </h2>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Số dư hiện tại</p>
              <p className="text-3xl font-bold text-gray-900">
                {(data.balance || 0).toLocaleString('vi-VN')}
                <span className="text-base font-normal text-gray-500 ml-1">đ</span>
              </p>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!data.canWithdraw}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              Yêu cầu rút tiền
            </button>
          </div>

          {!data.canWithdraw && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {data.balance < data.minWithdrawal && (
                  <p>Số dư tối thiểu để rút: <strong>{data.minWithdrawal.toLocaleString('vi-VN')}đ</strong></p>
                )}
                {!data.isActive && (
                  <p>Bạn cần có gói trả phí đang hoạt động để rút tiền.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Commission History */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Lịch sử hoa hồng (3 tháng)
            </h2>
          </div>

          {data.history && data.history.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {data.history.map((h: CommissionRecord) => (
                <div key={h.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      +{h.amount.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tierLabel(h.tier)} • {h.rate}% • từ {h.sourceEmail}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {statusBadge(h.status)}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-sm">
              Chưa có hoa hồng nào. Chia sẻ link giới thiệu để bắt đầu!
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Yêu cầu rút tiền</h3>
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawMsg(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {withdrawMsg && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${withdrawMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {withdrawMsg.text}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền rút (VNĐ)</label>
                <input
                  type="number"
                  required
                  min={data.minWithdrawal}
                  max={data.balance}
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31]"
                  placeholder={`Tối thiểu ${data.minWithdrawal.toLocaleString('vi-VN')}đ`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={withdrawForm.phone}
                  onChange={e => setWithdrawForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31]"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng</label>
                <input
                  type="text"
                  required
                  value={withdrawForm.bankName}
                  onChange={e => setWithdrawForm(f => ({ ...f, bankName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31]"
                  placeholder="VD: Vietcombank, MB Bank..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  required
                  value={withdrawForm.bankAccount}
                  onChange={e => setWithdrawForm(f => ({ ...f, bankAccount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31]"
                  placeholder="Số tài khoản ngân hàng"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
              >
                {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                {withdrawLoading ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
