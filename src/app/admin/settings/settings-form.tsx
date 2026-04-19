'use client';

import { useState } from 'react';
import { Save, Loader2, Gift, Clock, CheckCircle } from 'lucide-react';

export default function SettingsForm({ initialTrialCredits, initialTrialDays }: { initialTrialCredits: string; initialTrialDays: string }) {
  const [trialCredits, setTrialCredits] = useState(initialTrialCredits);
  const [trialDays, setTrialDays] = useState(initialTrialDays);
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
        body: JSON.stringify({ trial_credits: trialCredits, trial_days: trialDays }),
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
