'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Loader2, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

type LogEntry = {
  id: string;
  jobId: string;
  workspaceId: string;
  userId: string;
  userEmail: string | null;
  tool: string;
  creditsCharged: number | null;
  status: string;
  modelUsed: string | null;
  errorMessage: string | null;
  inputSummary: string | null;
  durationMs: number | null;
  qstashMessageId: string | null;
  createdAt: string;
  completedAt: string | null;
};

type Stats = {
  totalJobs: number;
  totalCredits: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  success: { label: 'Thành công', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  failed: { label: 'Thất bại', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  pending: { label: 'Đang xử lý', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  partial: { label: 'Một phần', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: AlertCircle },
};

const toolLabels: Record<string, string> = {
  v1_assistant: 'V1 — Form cơ bản',
  v2_assistant: 'V2 — AI + Ảnh',
  v3_assistant: 'V3 — AI nhanh',
};

export default function UsageLogsTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/usage-logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = search.trim().length === 0 ||
      (log.userEmail?.toLowerCase().includes(search.toLowerCase())) ||
      log.jobId.toLowerCase().includes(search.toLowerCase()) ||
      log.userId.toLowerCase().includes(search.toLowerCase()) ||
      (log.inputSummary?.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Job</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Credits đã trừ</p>
            <p className="text-2xl font-black text-[#E03C31] mt-1">{stats.totalCredits}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Thành công</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.successCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Thất bại</p>
            <p className="text-2xl font-black text-red-700 mt-1">{stats.failedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Đang chờ</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendingCount}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo email, job ID, hoặc nội dung..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30 focus:border-[#E03C31]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E03C31]/30"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="success">✅ Thành công</option>
          <option value="failed">❌ Thất bại</option>
          <option value="pending">⏳ Đang xử lý</option>
          <option value="partial">🔵 Một phần</option>
        </select>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E03C31] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#E03C31]" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Activity className="w-10 h-10 mb-3" />
            <p className="font-medium">Không có log nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Thời gian</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tool</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Credits</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Model</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Thời lượng</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const cfg = statusConfig[log.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isExpanded = expandedRow === log.id;

                  return (
                    <tr key={log.id} className="group">
                      <td colSpan={8} className="p-0">
                        <div
                          className={`grid grid-cols-[minmax(140px,1fr)_minmax(180px,1.5fr)_minmax(100px,1fr)_80px_120px_100px_80px_40px] items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition ${isExpanded ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        >
                          {/* Thời gian */}
                          <div className="text-xs text-gray-500">
                            {log.createdAt
                              ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })
                              : '—'}
                          </div>

                          {/* User */}
                          <div className="truncate">
                            <span className="text-gray-800 font-medium text-xs">{log.userEmail || '—'}</span>
                          </div>

                          {/* Tool */}
                          <div className="text-xs text-gray-600">
                            {toolLabels[log.tool] || log.tool}
                          </div>

                          {/* Credits */}
                          <div className="text-center font-bold text-gray-800">
                            {log.creditsCharged ?? 0}
                          </div>

                          {/* Status */}
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>

                          {/* Model */}
                          <div className="text-center text-xs text-gray-500 font-mono">
                            {log.modelUsed || '—'}
                          </div>

                          {/* Duration */}
                          <div className="text-center text-xs text-gray-500">
                            {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                          </div>

                          {/* Expand */}
                          <div className="text-center text-gray-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <span className="font-semibold text-gray-500 block mb-1">Job ID</span>
                                <span className="font-mono text-gray-700 break-all">{log.jobId}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-500 block mb-1">User ID</span>
                                <span className="font-mono text-gray-700 break-all">{log.userId}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-500 block mb-1">Workspace ID</span>
                                <span className="font-mono text-gray-700 break-all">{log.workspaceId}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-500 block mb-1">QStash Message</span>
                                <span className="font-mono text-gray-700 break-all">{log.qstashMessageId || '—'}</span>
                              </div>
                            </div>

                            {log.inputSummary && (
                              <div>
                                <span className="font-semibold text-gray-500 block mb-1">📝 Nội dung đầu vào (tóm tắt)</span>
                                <div className="bg-white rounded-lg border border-gray-200 p-3 text-gray-700 whitespace-pre-wrap">{log.inputSummary}</div>
                              </div>
                            )}

                            {log.errorMessage && (
                              <div>
                                <span className="font-semibold text-red-600 block mb-1">❌ Lỗi</span>
                                <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-red-700 whitespace-pre-wrap font-mono">{log.errorMessage}</div>
                              </div>
                            )}

                            <div className="flex gap-6 text-gray-500 pt-1">
                              <span>Tạo: {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</span>
                              <span>Hoàn thành: {log.completedAt ? new Date(log.completedAt).toLocaleString('vi-VN') : '—'}</span>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-medium">
          Hiển thị {filteredLogs.length} / {logs.length} bản ghi (tối đa 500 gần nhất)
        </div>
      </div>
    </div>
  );
}
