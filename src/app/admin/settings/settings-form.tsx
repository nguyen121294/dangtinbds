'use client';

import { useState } from 'react';
import { Save, Loader2, Gift, Clock, CheckCircle, DollarSign, Wallet } from 'lucide-react';

interface Props {
  initialTrialCredits: string;
  initialTrialDays: string;
  initialCommTier1: string;
  initialCommTier2: string;
  initialCommTier3: string;
  initialMinWithdrawal: string;
  initialCreditBaseV1: string;
  initialCreditBaseV2V3: string;
  initialCreditImageStandard: string;
  initialCreditImageBanana: string;
  initialCreditPosterStandard: string;
  initialCreditPosterBanana: string;
  initialCreditQwenImageEdit: string;
}

export default function SettingsForm({ 
  initialTrialCredits, initialTrialDays,
  initialCommTier1, initialCommTier2, initialCommTier3, initialMinWithdrawal,
  initialCreditBaseV1, initialCreditBaseV2V3, initialCreditImageStandard, initialCreditImageBanana,
  initialCreditPosterStandard, initialCreditPosterBanana, initialCreditQwenImageEdit
}: Props) {
  const [trialCredits, setTrialCredits] = useState(initialTrialCredits);
  const [trialDays, setTrialDays] = useState(initialTrialDays);
  const [commTier1, setCommTier1] = useState(initialCommTier1);
  const [commTier2, setCommTier2] = useState(initialCommTier2);
  const [commTier3, setCommTier3] = useState(initialCommTier3);
  const [minWithdrawal, setMinWithdrawal] = useState(initialMinWithdrawal);
  const [creditBaseV1, setCreditBaseV1] = useState(initialCreditBaseV1);
  const [creditBaseV2V3, setCreditBaseV2V3] = useState(initialCreditBaseV2V3);
  const [creditImageStandard, setCreditImageStandard] = useState(initialCreditImageStandard);
  const [creditImageBanana, setCreditImageBanana] = useState(initialCreditImageBanana);
  const [creditPosterStandard, setCreditPosterStandard] = useState(initialCreditPosterStandard);
  const [creditPosterBanana, setCreditPosterBanana] = useState(initialCreditPosterBanana);
  const [creditQwenImageEdit, setCreditQwenImageEdit] = useState(initialCreditQwenImageEdit);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trial_credits: trialCredits, 
          trial_days: trialDays,
          commission_tier1: commTier1,
          commission_tier2: commTier2,
          commission_tier3: commTier3,
          min_withdrawal: minWithdrawal,
          credit_base_v1: creditBaseV1,
          credit_base_v2v3: creditBaseV2V3,
          credit_image_standard: creditImageStandard,
          credit_image_banana: creditImageBanana,
          credit_poster_standard: creditPosterStandard,
          credit_poster_banana: creditPosterBanana,
          credit_qwen_image_edit: creditQwenImageEdit,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Lưu thất bại');
      }
    } catch {
      alert('Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      {/* Trial Credits */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-[#E03C31]" />
          Cấu hình Dùng thử (Trial)
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Các giá trị dưới đây sẽ <strong>áp dụng cho user mới đăng ký</strong> kể từ khi lưu. User cũ không bị ảnh hưởng.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số Credits tặng khi đăng ký
            </label>
            <input
              type="number"
              min="0"
              max="100000"
              value={trialCredits}
              onChange={(e) => setTrialCredits(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31] transition"
            />
            <p className="mt-1 text-xs text-gray-400">Hiện tại: {initialTrialCredits} credits / user mới</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1 text-orange-500" />
              Số ngày dùng thử
            </label>
            <input
              type="number"
              min="0"
              max="3650"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31] transition"
            />
            <p className="mt-1 text-xs text-gray-400">Hiện tại: {initialTrialDays} ngày / user mới</p>
          </div>
        </div>
      </div>

      {/* Commission Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Cấu hình Hoa hồng Giới thiệu
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Tỷ lệ % hoa hồng cho từng tầng giới thiệu. Áp dụng cho <strong>giao dịch mới</strong> kể từ khi lưu.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tầng 1 (F1) %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commTier1}
                onChange={(e) => setCommTier1(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Trực tiếp</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tầng 2 (F2) %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commTier2}
                onChange={(e) => setCommTier2(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Gián tiếp</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tầng 3 (F3) %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commTier3}
                onChange={(e) => setCommTier3(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Tầng 3</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Wallet className="w-4 h-4 inline mr-1 text-amber-500" />
              Ngưỡng rút tối thiểu (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              step="100000"
              value={minWithdrawal}
              onChange={(e) => setMinWithdrawal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
            />
            <p className="mt-1 text-xs text-gray-400">
              Hiện tại: {parseInt(initialMinWithdrawal).toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>
      </div>

      {/* Credit Pricing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-blue-600" />
          Bảng giá Credit theo Công cụ
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Cấu hình số credit <strong>trừ cho mỗi lần sử dụng</strong> công cụ AI. Áp dụng ngay lập tức.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                V1 - Bài đăng (Base)
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditBaseV1}
                onChange={(e) => setCreditBaseV1(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/bài (Tool V1)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                V2/V3 - Bài đăng (Base)
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditBaseV2V3}
                onChange={(e) => setCreditBaseV2V3(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/bài (Tool V2 & V3)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🟢 Ảnh OpenAI (Standard)
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditImageStandard}
                onChange={(e) => setCreditImageStandard(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/ảnh (GPT-Image)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🍌 Ảnh Banana (Premium)
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditImageBanana}
                onChange={(e) => setCreditImageBanana(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/ảnh (Gemini Flash)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎨 Poster Standard
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditPosterStandard}
                onChange={(e) => setCreditPosterStandard(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/poster (GPT-Image)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎨 Poster Premium
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditPosterBanana}
                onChange={(e) => setCreditPosterBanana(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/poster (Banana Premium)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ✨ AI Sáng Tạo (Premium Edit)
              </label>
              <input
                type="number" min="0" max="1000"
                value={creditQwenImageEdit}
                onChange={(e) => setCreditQwenImageEdit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-center">Credit/ảnh (Premium Edit)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#E03C31] hover:bg-[#c9362c] disabled:opacity-50 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg shadow-red-500/20 w-full"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {saved ? 'Đã lưu thành công!' : 'Lưu cài đặt'}
      </button>
    </form>
  );
}
