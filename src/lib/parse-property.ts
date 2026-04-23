/**
 * Parse bài đăng ngắn AI thành object có cấu trúc.
 * Sử dụng regex để trích xuất từng trường từ output text.
 */

interface PropertyData {
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
}

const FIELD_MAP: { key: keyof PropertyData; pattern: RegExp }[] = [
  { key: 'title', pattern: /📌\s*Tiêu đề:\s*(.+)/i },
  { key: 'propertyType', pattern: /🏠\s*Loại BĐS:\s*(.+)/i },
  { key: 'location', pattern: /📍\s*Vị trí:\s*(.+)/i },
  { key: 'permit', pattern: /📜\s*Thông tin cấp phép:\s*(.+)/i },
  { key: 'usageForm', pattern: /🏷️?\s*Hình thức sử dụng[^:]*:\s*(.+)/i },
  { key: 'suitableFor', pattern: /🎯\s*Phù hợp:\s*(.+)/i },
  { key: 'price', pattern: /💰\s*Giá bán:\s*(.+)/i },
  { key: 'strengths', pattern: /✅\s*Điểm mạnh:\s*(.+)/i },
  { key: 'area', pattern: /📐\s*Diện tích:\s*(.+)/i },
  { key: 'length', pattern: /📏\s*Chiều dài:\s*(.+)/i },
  { key: 'width', pattern: /↔️?\s*Chiều rộng:\s*(.+)/i },
  { key: 'shape', pattern: /🔷\s*Hình dạng:\s*(.+)/i },
  { key: 'direction', pattern: /🧭\s*Hướng:\s*(.+)/i },
  { key: 'structure', pattern: /🏗️?\s*Kết cấu:\s*(.+)/i },
  { key: 'currentUsage', pattern: /🏚️?\s*Hiện trạng đang sử dụng:\s*(.+)/i },
  { key: 'frontage', pattern: /🚪\s*Mặt tiền tiếp giáp:\s*(.+)/i },
  { key: 'roadWidth', pattern: /🛣️?\s*Độ rộng đường[^:]*:\s*(.+)/i },
  { key: 'roadStructure', pattern: /🧱\s*Kết cấu đường:\s*(.+)/i },
  { key: 'planning', pattern: /📋\s*Dự kiến quy hoạch:\s*(.+)/i },
  { key: 'distanceToMainRoad', pattern: /📍\s*Khoảng cách ra đường chính:\s*(.+)/i },
  { key: 'vehicleAccess', pattern: /🚗\s*Lối vào phương tiện:\s*(.+)/i },
  { key: 'transportConnections', pattern: /🔗\s*Kết nối giao thông:\s*(.+)/i },
];

export function parsePropertyFromShortPost(text: string): PropertyData {
  const result: PropertyData = {
    title: null, propertyType: null, location: null, permit: null,
    usageForm: null, suitableFor: null, price: null, strengths: null,
    area: null, length: null, width: null, shape: null, direction: null,
    structure: null, currentUsage: null, frontage: null, roadWidth: null,
    roadStructure: null, planning: null, distanceToMainRoad: null,
    vehicleAccess: null, transportConnections: null,
  };

  // Tách phần bài đăng ngắn (sau marker ===BÀI ĐĂNG NGẮN===)
  const shortPostMarker = '===BÀI ĐĂNG NGẮN===';
  const shortPostIdx = text.indexOf(shortPostMarker);
  const shortPostText = shortPostIdx !== -1
    ? text.substring(shortPostIdx + shortPostMarker.length)
    : text;

  for (const { key, pattern } of FIELD_MAP) {
    const match = shortPostText.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value && !value.match(/^(Chưa có thông tin|N\/A|Không có|-)$/i)) {
        result[key] = value;
      }
    }
  }

  return result;
}

export type { PropertyData };
