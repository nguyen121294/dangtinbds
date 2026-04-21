"use client";
import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  success: { label: "Thành công", color: "text-green-700 bg-green-50", icon: <CheckCircle2 className="w-4 h-4" /> },
  partial: { label: "Một phần", color: "text-amber-700 bg-amber-50", icon: <AlertTriangle className="w-4 h-4" /> },
  failed: { label: "Thất bại", color: "text-red-700 bg-red-50", icon: <XCircle className="w-4 h-4" /> },
  pending: { label: "Đang xử lý", color: "text-blue-700 bg-blue-50", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
};

const TOOL_LABELS: Record<string, string> = {
  v2_assistant: "Trợ lý AI V2",
  v1_assistant: "Trợ lý AI V1",
  image_editor: "Chỉnh sửa Ảnh",
};

interface UsageLog {
  id: string;
  tool: string;
  creditsCharged: number;
  status: string;
  createdAt: string;
  // Admin fields (optional)
  modelUsed?: string;
  errorMessage?: string;
  durationMs?: number;
  inputSummary?: string;
  userId?: string;
}

export default function UsageLogTable({ workspaceId, isAdmin = false }: { workspaceId: string; isAdmin?: boolean }) {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `/api/usage-logs?workspaceId=${workspaceId}${isAdmin ? '&admin=true' : ''}&limit=50`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setLogs(data.logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Chưa có lịch sử sử dụng nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-3 px-3 font-medium">Thời gian</th>
            <th className="py-3 px-3 font-medium">Công cụ</th>
            <th className="py-3 px-3 font-medium text-center">Credit</th>
            <th className="py-3 px-3 font-medium">Trạng thái</th>
            {isAdmin && <th className="py-3 px-3 font-medium">Model</th>}
            {isAdmin && <th className="py-3 px-3 font-medium">Thời lượng</th>}
            {isAdmin && <th className="py-3 px-3 font-medium">Lỗi</th>}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const statusInfo = STATUS_MAP[log.status] || STATUS_MAP.pending;
            const toolLabel = TOOL_LABELS[log.tool] || log.tool;
            const date = new Date(log.createdAt);
            const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            return (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="text-gray-900 font-medium">{dateStr}</div>
                  <div className="text-xs text-gray-400">{timeStr}</div>
                </td>
                <td className="py-3 px-3 text-gray-700">{toolLabel}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`font-bold ${log.creditsCharged > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {log.creditsCharged > 0 ? `-${log.creditsCharged}` : '0'}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </td>
                {isAdmin && (
                  <td className="py-3 px-3 text-xs text-gray-500 font-mono">
                    {log.modelUsed || '—'}
                  </td>
                )}
                {isAdmin && (
                  <td className="py-3 px-3 text-xs text-gray-500">
                    {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                )}
                {isAdmin && (
                  <td className="py-3 px-3 text-xs text-red-500 max-w-[200px] truncate" title={log.errorMessage || ''}>
                    {log.errorMessage || '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
