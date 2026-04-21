import UsageLogsTable from './usage-logs-table';

export default function UsageLogsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Audit Log — Lịch sử AI</h1>
        <p className="text-gray-500 mt-2">Theo dõi toàn bộ hoạt động sử dụng công cụ AI trên hệ thống</p>
      </div>
      <UsageLogsTable />
    </div>
  );
}
