"use client";

interface BankRow { name: string; rate: string; term: string; amount: string; }

interface SaleKitData {
  // Page 1 — Cover
  propertyType: string; address: string; ward: string; district: string; city: string;
  area: string; bedrooms: string; bathrooms: string; direction: string;
  heroImage: string | null; logoImage: string | null;
  // Page 2 — Overview
  price: string; loanStatus: string; transactionMethod: string;
  legalStatus: string; legalVerified: boolean; locationVerified: boolean; priceCompetitive: boolean;
  mapNumber: string; plotNumber: string; googleCoords: string;
  description: string;
  agentName: string; agentPhone: string; agentEmail: string;
  // Page 3 — Bank
  showBankPage: boolean; bankRows: BankRow[];
  // Page 4 — Land
  exteriorImages: string[];
  totalArea: string; length: string; width: string; shape: string;
  landUsageType: string; landDirection: string;
  residentialArea: string; planningCompliant: string; planningViolation: string;
  frontageCount: string; distanceToMainRoad: string; vehicleAccess: string;
  transportConnections: string; currentUsage: string; comparedToReality: string;
  roadFront: string; roadStructure: string; plannedUsage: string;
  sidewalkWidth: string; narrowestSection: string;
  // Page 5 — Building
  interiorImages: string[];
  buildingType: string; buildingGrade: string;
  bldBedrooms: string; bldBathrooms: string; bldLivingRooms: string; bldKitchens: string;
  totalFloorArea: string; floors: string; aboveGround: string; basement: string;
  buildingStructure: string; bldComparedToReality: string;
  yearBuilt: string; yearRenovated: string;
  kitchenSystem: string; airCon: string; rangeHood: string; airConType: string;
  hotWater: string; sanitary: string; cabinetSystem: string; elevator: string;
  pets: string; parking: string; garden: string; pool: string;
}

const BRAND = '#2563EB';
const BRAND_LIGHT = '#EFF6FF';

const pageStyle: React.CSSProperties = {
  width: '210mm', minHeight: '297mm', background: '#fff', fontFamily: "'Inter', sans-serif",
  color: '#1a1a1a', position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
  pageBreakAfter: 'always',
};

const Footer = () => (
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: BRAND, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
    <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, opacity: .8 }}>Sale Kit — Được tạo bởi Trợ lý AI BĐS</span>
  </div>
);

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 0' }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #e5e7eb', padding: '12px 0' }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

// ====== PAGE 1: COVER ======
function Page1({ data }: { data: SaleKitData }) {
  const fullAddress = [data.ward, data.district, data.city].filter(Boolean).join(', ');
  return (
    <div style={pageStyle}>
      {data.logoImage && (
        <div style={{ padding: '28px 32px 0' }}>
          <img src={data.logoImage} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        </div>
      )}
      {/* Hero image in house clip */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 40px 0' }}>
        <div style={{ width: '100%', maxWidth: 520, aspectRatio: '4/3', background: '#dbeafe', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          {data.heroImage ? (
            <img src={data.heroImage} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 48 }}>🏠</div>
          )}
        </div>
      </div>
      {/* Property info */}
      <div style={{ padding: '32px 40px 0' }}>
        <div style={{ display: 'inline-block', background: BRAND, color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, marginBottom: 12 }}>
          🏠 {data.propertyType || 'Bất động sản'}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '8px 0 4px', lineHeight: 1.2 }}>{data.address || 'Địa chỉ tài sản'}</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{fullAddress}</p>
        <div style={{ borderTop: '2px solid #e5e7eb', marginTop: 24, display: 'flex' }}>
          <StatCard icon="📐" label="Diện tích" value={data.area ? `${data.area} m²` : '—'} />
          <StatCard icon="🛏️" label="Phòng ngủ" value={data.bedrooms} />
          <StatCard icon="🚿" label="Nhà vệ sinh" value={data.bathrooms} />
          <StatCard icon="🧭" label="Hướng nhà" value={data.direction} />
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ====== PAGE 2: OVERVIEW ======
function Page2({ data }: { data: SaleKitData }) {
  return (
    <div style={pageStyle}>
      <div style={{ padding: '32px 40px 60px', display: 'flex', gap: 32 }}>
        {/* Left col */}
        <div style={{ flex: 1.2 }}>
          <div style={{ display: 'inline-block', background: '#111827', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, marginBottom: 8 }}>📋 Niêm yết chính thức</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px' }}>{data.address || 'Địa chỉ'}</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{[data.ward, data.district, data.city].filter(Boolean).join(', ')}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: 10, color: '#6b7280' }}>Diện tích</div><div style={{ fontWeight: 700, fontSize: 13 }}>{data.area || '—'} m²</div></div>
            <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: 10, color: '#6b7280' }}>Pháp lý</div><div style={{ fontWeight: 700, fontSize: 13 }}>{data.legalStatus || '—'}</div></div>
            <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: 10, color: '#6b7280' }}>Hướng nhà</div><div style={{ fontWeight: 700, fontSize: 13 }}>{data.direction || '—'}</div></div>
          </div>
          {/* Price */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>💰 Giá rao bán</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>{data.price || '—'} đ</div>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Tài sản đang vay ngân hàng & hình thức giao dịch mong muốn</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontWeight: 500 }}>{data.loanStatus || 'Không nợ vay'}</span>
            <span style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${BRAND}`, color: BRAND, borderRadius: 4, fontWeight: 500 }}>{data.transactionMethod || 'Bằng tiền mặt'}</span>
          </div>
          {/* Legal checks */}
          <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Tài sản đã được khảo sát thực địa và xác thực các thông tin</div>
            {data.legalVerified && <div style={{ fontSize: 12, fontWeight: 600, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>📋 Giấy tờ pháp lý hoàn chỉnh</div>}
            {data.locationVerified && <div style={{ fontSize: 12, fontWeight: 600, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>✅ Đúng vị trí, đúng bản đồ quy hoạch</div>}
            {data.priceCompetitive && <div style={{ fontSize: 12, fontWeight: 600, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>💰 Giá bán cạnh tranh với đơn giá thị trường</div>}
          </div>
          {/* Map */}
          <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Số tờ, Số thửa</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{data.mapNumber && data.plotNumber ? `${data.mapNumber}, ${data.plotNumber}` : '—'}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Tọa độ Google</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: BRAND, marginTop: 2 }}>{data.googleCoords || '—'}</div>
          </div>
        </div>
        {/* Right col */}
        <div style={{ flex: 1 }}>
          {/* Agent card */}
          <div style={{ background: BRAND_LIGHT, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid #dbeafe` }}>
            <div style={{ fontSize: 11, color: BRAND, fontWeight: 600, marginBottom: 6 }}>✅ Agent tư vấn</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{data.agentName || '—'}</div>
            {data.agentPhone && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>📞 {data.agentPhone}</div>}
            {data.agentEmail && <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>✉️ {data.agentEmail}</div>}
          </div>
          {/* Description */}
          {data.description && (
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.description}</div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ====== PAGE 3: BANK ======
function Page3({ data }: { data: SaleKitData }) {
  return (
    <div style={pageStyle}>
      <div style={{ padding: '40px 40px 60px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Ngân hàng cho vay</h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 28 }}>Số tiền cho vay được hệ thống tự động mang tính chất tham khảo và có thể sai lệch.<br />Vui lòng liên hệ với Agent tư vấn để có thông tin vay chính xác.</p>
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', padding: '12px 0', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            <div style={{ flex: 2, paddingLeft: 8 }}>Ngân hàng</div>
            <div style={{ flex: 1 }}>Lãi suất</div>
            <div style={{ flex: 1 }}>Thời hạn</div>
            <div style={{ flex: 1.5, textAlign: 'right', paddingRight: 8 }}>Số tiền cho vay</div>
          </div>
          {data.bankRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '16px 8px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ flex: 2, fontWeight: 600, fontSize: 14 }}>{row.name || '—'}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{row.rate || '—'}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{row.term || '—'}</div>
              <div style={{ flex: 1.5, fontWeight: 700, fontSize: 14, textAlign: 'right' }}>{row.amount || '—'}</div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ====== PAGE 4: LAND ======
function Page4({ data }: { data: SaleKitData }) {
  return (
    <div style={pageStyle}>
      {/* Exterior images */}
      {data.exteriorImages.length > 0 && (
        <div style={{ display: 'flex', gap: 4, height: 240, overflow: 'hidden' }}>
          {data.exteriorImages.map((img, i) => (
            <div key={i} style={{ flex: 1, background: '#e5e7eb' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '24px 40px 60px', display: 'flex', gap: 32 }}>
        {/* Left — Land info */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: BRAND, marginBottom: 16 }}>Về thửa đất</h2>
          <InfoRow label="Tổng diện tích" value={data.totalArea} />
          <InfoRow label="Chiều dài" value={data.length} />
          <InfoRow label="Chiều rộng" value={data.width} />
          <InfoRow label="Hình dạng" value={data.shape} />
          <InfoRow label="Hình thức sử dụng" value={data.landUsageType} />
          <InfoRow label="Hướng nhà" value={data.landDirection} />
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              <div><div style={{ fontSize: 10, color: '#6b7280' }}>Diện tích đất ở</div><div style={{ fontWeight: 700, fontSize: 13 }}>{data.residentialArea || '—'}</div></div>
            </div>
            <InfoRow label="Phù hợp quy hoạch" value={data.planningCompliant} />
            <InfoRow label="Vi phạm quy hoạch" value={data.planningViolation} />
          </div>
        </div>
        {/* Right — Land status */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: BRAND, marginBottom: 16 }}>Hiện trạng thửa đất</h2>
          <InfoRow label="Mặt tiền tiếp giáp" value={data.frontageCount} />
          <InfoRow label="Khoảng cách ra đường chính" value={data.distanceToMainRoad} />
          <InfoRow label="Lối vào phương tiện" value={data.vehicleAccess} />
          <InfoRow label="Kết nối giao thông" value={data.transportConnections} />
          <InfoRow label="Hiện trạng sử dụng" value={data.currentUsage} />
          <InfoRow label="So sánh với thực tế" value={data.comparedToReality} />
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 16, border: '1px solid #e5e7eb' }}>
            <div><div style={{ fontSize: 10, color: '#6b7280' }}>Đường trước tài sản</div><div style={{ fontWeight: 700, fontSize: 16 }}>{data.roadFront || '—'}</div></div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}><InfoRow label="Kết cấu đường" value={data.roadStructure} /></div>
              <div style={{ flex: 1 }}><InfoRow label="Quy hoạch dự kiến" value={data.plannedUsage} /></div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}><InfoRow label="Độ rộng vỉa hè" value={data.sidewalkWidth} /></div>
              <div style={{ flex: 1 }}><InfoRow label="Đoạn nhỏ nhất" value={data.narrowestSection} /></div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ====== PAGE 5: BUILDING ======
function Page5({ data }: { data: SaleKitData }) {
  return (
    <div style={pageStyle}>
      {/* Interior images */}
      {data.interiorImages.length > 0 && (
        <div style={{ display: 'flex', gap: 4, height: 220, overflow: 'hidden' }}>
          {data.interiorImages.slice(0, 3).map((img, i) => (
            <div key={i} style={{ flex: i === 0 ? 2 : 1, background: '#e5e7eb' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '20px 40px 60px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Công trình xây dựng</h2>
        {/* Stats row */}
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
          <StatCard icon="🏠" label="Loại công trình" value={data.buildingType} />
          <StatCard icon="⭐" label="Cấp nhà" value={data.buildingGrade} />
          <StatCard icon="🛏️" label="Phòng ngủ" value={data.bldBedrooms} />
          <StatCard icon="🚿" label="Nhà vệ sinh" value={data.bldBathrooms} />
          <StatCard icon="🛋️" label="Phòng khách" value={data.bldLivingRooms} />
          <StatCard icon="🍳" label="Phòng bếp" value={data.bldKitchens} />
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
          {/* Left — Building details */}
          <div style={{ flex: 1 }}>
            <InfoRow label="Tổng diện tích" value={data.totalFloorArea} />
            <InfoRow label="Số tầng" value={data.floors} />
            <InfoRow label="Tầng nổi" value={data.aboveGround} />
            <InfoRow label="Tầng hầm" value={data.basement} />
            <InfoRow label="Kết cấu" value={data.buildingStructure} />
            <InfoRow label="So sánh với thực tế" value={data.bldComparedToReality} />
            <InfoRow label="Năm xây dựng" value={data.yearBuilt} />
            <InfoRow label="Năm sửa chữa" value={data.yearRenovated} />
          </div>
          {/* Right — Equipment & Amenities */}
          <div style={{ flex: 1 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Thiết bị nội thất</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                <InfoRow label="Hệ thống bếp" value={data.kitchenSystem} />
                <InfoRow label="Điều hòa" value={data.airCon} />
                <InfoRow label="Máy hút mùi" value={data.rangeHood} />
                <InfoRow label="Loại điều hòa" value={data.airConType} />
                <InfoRow label="Hệ thống nước nóng" value={data.hotWater} />
                <InfoRow label="Thiết bị vệ sinh" value={data.sanitary} />
                <InfoRow label="Hệ thống tủ" value={data.cabinetSystem} />
                <InfoRow label="Thang máy" value={data.elevator} />
              </div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tiện nghi</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                <InfoRow label="Nuôi thú cưng" value={data.pets} />
                <InfoRow label="Chỗ đậu Ôtô" value={data.parking} />
                <InfoRow label="Sân vườn" value={data.garden} />
                <InfoRow label="Hồ bơi riêng" value={data.pool} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export type { SaleKitData, BankRow };

export default function SaleKitPreview({ data }: { data: SaleKitData }) {
  return (
    <div id="sale-kit-preview" style={{ background: '#6b7280' }}>
      <Page1 data={data} />
      <Page2 data={data} />
      {data.showBankPage && data.bankRows.length > 0 && <Page3 data={data} />}
      <Page4 data={data} />
      <Page5 data={data} />
    </div>
  );
}
