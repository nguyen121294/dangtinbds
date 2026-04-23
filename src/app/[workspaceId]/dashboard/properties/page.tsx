"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Trash2, ChevronDown, ChevronUp, Search, ClipboardList, Loader2 } from "lucide-react";

interface PropertyRecord {
  id: string;
  sourceTool: string;
  title: string | null;
  propertyType: string | null;
  location: string | null;
  permit: string | null;
  usageForm: string | null;
  suitableFor: string | null;
  price: string | null;
  strengths: string | null;
  area: string | null;
  length: string | null;
  width: string | null;
  shape: string | null;
  direction: string | null;
  structure: string | null;
  currentUsage: string | null;
  frontage: string | null;
  roadWidth: string | null;
  roadStructure: string | null;
  planning: string | null;
  distanceToMainRoad: string | null;
  vehicleAccess: string | null;
  transportConnections: string | null;
  createdAt: string;
}

const FIELD_LABELS: { key: keyof PropertyRecord; label: string; group: string }[] = [
  { key: 'title', label: 'Tiêu đề', group: 'general' },
  { key: 'propertyType', label: 'Loại BĐS', group: 'general' },
  { key: 'location', label: 'Vị trí', group: 'general' },
  { key: 'permit', label: 'Cấp phép', group: 'general' },
  { key: 'usageForm', label: 'Hình thức SD', group: 'general' },
  { key: 'suitableFor', label: 'Phù hợp', group: 'general' },
  { key: 'price', label: 'Giá bán', group: 'general' },
  { key: 'strengths', label: 'Điểm mạnh', group: 'general' },
  { key: 'area', label: 'Diện tích', group: 'land' },
  { key: 'length', label: 'Chiều dài', group: 'land' },
  { key: 'width', label: 'Chiều rộng', group: 'land' },
  { key: 'shape', label: 'Hình dạng', group: 'land' },
  { key: 'direction', label: 'Hướng', group: 'land' },
  { key: 'structure', label: 'Kết cấu', group: 'status' },
  { key: 'currentUsage', label: 'Hiện trạng SD', group: 'status' },
  { key: 'frontage', label: 'Mặt tiền', group: 'status' },
  { key: 'roadWidth', label: 'Rộng đường', group: 'status' },
  { key: 'roadStructure', label: 'Kết cấu đường', group: 'status' },
  { key: 'planning', label: 'Quy hoạch', group: 'status' },
  { key: 'distanceToMainRoad', label: 'Cách đường chính', group: 'status' },
  { key: 'vehicleAccess', label: 'Lối vào PT', group: 'status' },
  { key: 'transportConnections', label: 'Kết nối GT', group: 'status' },
];

export default function PropertiesPage() {
  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.success) setRecords(data.records);
    } catch {
      console.error("Failed to fetch properties");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài sản này?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/properties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== id));
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch { alert("Lỗi kết nối."); }
    finally { setDeletingId(null); }
  };

  const filtered = records.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.propertyType?.toLowerCase().includes(q) ||
      r.price?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-[#E03C31]" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Danh sách Tài sản Ghi nhận</h1>
            <p className="text-sm text-gray-500">{records.length} tài sản đã ghi nhận</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, vị trí, giá..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#E03C31]/20 focus:border-[#E03C31] outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {searchQuery ? "Không tìm thấy tài sản phù hợp" : "Chưa có tài sản nào được ghi nhận"}
          </p>
          <p className="text-sm text-gray-400 mt-1">Tạo bài đăng bằng V2 hoặc V3 để tự động ghi nhận.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50/50 z-10">Ngày</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Nguồn</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tiêu đề</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Loại BĐS</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Vị trí</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Giá bán</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Diện tích</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Hướng</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Cấp phép</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Kết cấu</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Mặt tiền</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap sticky left-0 bg-white">
                        {record.createdAt ? new Date(record.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${record.sourceTool === 'v2' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {record.sourceTool}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{record.title || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.propertyType || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{record.location || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-[#E03C31] whitespace-nowrap">{record.price || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.area || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.direction || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.permit || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.structure || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.frontage || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={deletingId === record.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3">
            {filtered.map((record) => (
              <div key={record.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card Header — always visible */}
                <button
                  onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${record.sourceTool === 'v2' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {record.sourceTool}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {record.createdAt ? new Date(record.createdAt).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{record.title || 'Chưa có tiêu đề'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {record.propertyType && <span>{record.propertyType}</span>}
                      {record.price && <span className="font-semibold text-[#E03C31]">{record.price}</span>}
                    </div>
                    {record.location && <p className="text-xs text-gray-400 mt-0.5 truncate">{record.location}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                      disabled={deletingId === record.id}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      {deletingId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    {expandedId === record.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Card Body — expandable */}
                {expandedId === record.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                    {/* Thông tin chung */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Thông tin chung</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {FIELD_LABELS.filter(f => f.group === 'general').map(({ key, label }) => (
                          <div key={key}>
                            <span className="text-[11px] text-gray-400">{label}</span>
                            <p className="text-sm text-gray-800 font-medium">{(record as any)[key] || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Thông tin thửa đất */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Thông tin thửa đất</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {FIELD_LABELS.filter(f => f.group === 'land').map(({ key, label }) => (
                          <div key={key}>
                            <span className="text-[11px] text-gray-400">{label}</span>
                            <p className="text-sm text-gray-800 font-medium">{(record as any)[key] || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Thông tin hiện trạng */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Thông tin hiện trạng</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {FIELD_LABELS.filter(f => f.group === 'status').map(({ key, label }) => (
                          <div key={key}>
                            <span className="text-[11px] text-gray-400">{label}</span>
                            <p className="text-sm text-gray-800 font-medium">{(record as any)[key] || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
