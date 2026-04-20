'use client';

import { useState, useEffect } from 'react';
import { Check, X, Loader2, DollarSign, ArrowUpRight } from 'lucide-react';

interface Commission {
  id: string;
  beneficiaryEmail: string;
  sourceEmail: string;
  tier: number;
  rate: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  userEmail: string;
  amount: number;
  phone: string;
  bankAccount: string;
  bankName: string;
  status: string;
  createdAt: string;
}

export default function AdminCommissionsPage() {
  const [tab, setTab] = useState<'commissions' | 'withdrawals'>('commissions');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/commissions').then(r => r.json()),
      fetch('/api/admin/withdrawals').then(r => r.json()),
    ]).then(([c, w]) => {
      setCommissions(c.commissions || []);
      setWithdrawals(w.withdrawals || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCommissionAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' } : c));
      } else {
        alert(result.error || 'Lỗi');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setActionLoading(null); }
  };

  const handleWithdrawalAction = async (id: string, action: 'complete' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: action === 'complete' ? 'completed' : 'rejected' } : w));
      } else {
        alert(result.error || 'Lỗi');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setActionLoading(null); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700',
      approved: 'bg-emerald-50 text-emerald-700',
      completed: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-red-50 text-red-600',
    };
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      completed: 'Đã hoàn thành',
      rejected: 'Từ chối',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Hoa hồng</h1>
        <p className="text-zinc-400 mt-2">Duyệt hoa hồng và xử lý yêu cầu rút tiền</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('commissions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'commissions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <DollarSign className="w-4 h-4 inline mr-1" />
          Hoa hồng ({pendingCommissions.length} chờ)
        </button>
        <button
          onClick={() => setTab('withdrawals')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'withdrawals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ArrowUpRight className="w-4 h-4 inline mr-1" />
          Rút tiền ({pendingWithdrawals.length} chờ)
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'commissions' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Người nhận</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nguồn (Người mua)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tầng</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">% / Số tiền</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{c.beneficiaryEmail}</td>
                  <td className="px-4 py-3 text-gray-600">{c.sourceEmail}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">F{c.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {c.rate}% / {c.amount.toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.status === 'pending' && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleCommissionAction(c.id, 'approve')}
                          disabled={actionLoading === c.id}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition"
                          title="Duyệt"
                        >
                          {actionLoading === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCommissionAction(c.id, 'reject')}
                          disabled={actionLoading === c.id}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                          title="Từ chối"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {commissions.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Chưa có bản ghi hoa hồng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngân hàng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">STK</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SĐT</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{w.userEmail}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{w.amount.toLocaleString('vi-VN')}đ</td>
                  <td className="px-4 py-3 text-gray-600">{w.bankName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{w.bankAccount}</td>
                  <td className="px-4 py-3 text-gray-600">{w.phone}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(w.status)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {new Date(w.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {w.status === 'pending' && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleWithdrawalAction(w.id, 'complete')}
                          disabled={actionLoading === w.id}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition"
                          title="Hoàn thành"
                        >
                          {actionLoading === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleWithdrawalAction(w.id, 'reject')}
                          disabled={actionLoading === w.id}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                          title="Từ chối"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Chưa có yêu cầu rút tiền nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
