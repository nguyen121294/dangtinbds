"use client";
import { useState, useCallback, useRef } from "react";
import { X, Plus, Trash2, Download, Eye, EyeOff, ChevronDown, ChevronUp, Upload } from "lucide-react";
import SaleKitPreview from "./SaleKitPreview";
import type { SaleKitData, BankRow } from "./SaleKitPreview";

const EMPTY_BANK: BankRow = { name: "", rate: "", term: "", amount: "" };

const defaultData: SaleKitData = {
  propertyType: "Nhà phố", address: "", ward: "", district: "", city: "Hồ Chí Minh",
  area: "", bedrooms: "", bathrooms: "", direction: "",
  heroImage: null, logoImage: null,
  price: "", loanStatus: "Không nợ vay", transactionMethod: "Bằng tiền mặt",
  legalStatus: "Sổ hồng", legalVerified: true, locationVerified: true, priceCompetitive: true,
  mapNumber: "", plotNumber: "", googleCoords: "",
  description: "",
  agentName: "", agentPhone: "", agentEmail: "",
  showBankPage: true, bankRows: [{ ...EMPTY_BANK }],
  exteriorImages: [], totalArea: "", length: "", width: "", shape: "Vuông vức",
  landUsageType: "Riêng", landDirection: "",
  residentialArea: "", planningCompliant: "", planningViolation: "0 m²",
  frontageCount: "1 Mặt tiền", distanceToMainRoad: "", vehicleAccess: "",
  transportConnections: "", currentUsage: "", comparedToReality: "",
  roadFront: "", roadStructure: "Nhựa", plannedUsage: "",
  sidewalkWidth: "", narrowestSection: "",
  interiorImages: [], buildingType: "Nhà phố", buildingGrade: "IV",
  bldBedrooms: "", bldBathrooms: "", bldLivingRooms: "", bldKitchens: "",
  totalFloorArea: "", floors: "", aboveGround: "", basement: "0 m²",
  buildingStructure: "", bldComparedToReality: "",
  yearBuilt: "", yearRenovated: "",
  kitchenSystem: "", airCon: "", rangeHood: "", airConType: "",
  hotWater: "", sanitary: "", cabinetSystem: "", elevator: "Không",
  pets: "Có", parking: "Có", garden: "Có", pool: "Không",
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean;
}) {
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className={cls} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function ImageUploader({ images, onChange, label, max = 4 }: {
  images: string[]; onChange: (imgs: string[]) => void; label: string; max?: number;
}) {
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, max - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => onChange([...images, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }, [images, onChange, max]);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X size={12} /></button>
          </div>
        ))}
        {images.length < max && (
          <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
            <Upload size={20} className="text-gray-400" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function SaleKitForm({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<SaleKitData>(defaultData);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const set = useCallback((key: keyof SaleKitData, val: any) => {
    setData(prev => ({ ...prev, [key]: val }));
  }, []);

  const updateBank = (i: number, key: keyof BankRow, val: string) => {
    const rows = [...data.bankRows];
    rows[i] = { ...rows[i], [key]: val };
    set("bankRows", rows);
  };

  const handleLogoUpload = (files: FileList | null) => {
    if (!files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => set("logoImage", reader.result as string);
    reader.readAsDataURL(files[0]);
  };

  const handleHeroUpload = (files: FileList | null) => {
    if (!files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => set("heroImage", reader.result as string);
    reader.readAsDataURL(files[0]);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const el = document.getElementById("sale-kit-preview");
      if (!el) return;
      await html2pdf().set({
        margin: 0, filename: `SaleKit_${data.address || "export"}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"] },
      } as any).from(el).save();
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 Sale Kit Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo bộ tài liệu bán hàng chuyên nghiệp</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? "Ẩn xem trước" : "Xem trước"}
          </button>
          <button onClick={exportPdf} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Download size={16} /> {exporting ? "Đang xuất..." : "Xuất PDF"}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        {/* Form */}
        <div className="space-y-0">
          <Section title="🏷️ Thương hiệu & Logo">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Logo</label>
              {data.logoImage ? (
                <div className="flex items-center gap-3">
                  <img src={data.logoImage} alt="Logo" className="h-10 object-contain" />
                  <button onClick={() => set("logoImage", null)} className="text-red-500 text-xs">Xóa</button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 text-sm text-gray-500">
                  <Upload size={16} /> Tải logo lên
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e.target.files)} />
                </label>
              )}
            </div>
          </Section>

          <Section title="📍 Thông tin cơ bản">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại BĐS" value={data.propertyType} onChange={v => set("propertyType", v)} />
              <Field label="Hướng nhà" value={data.direction} onChange={v => set("direction", v)} />
            </div>
            <Field label="Địa chỉ" value={data.address} onChange={v => set("address", v)} placeholder="Số nhà, tên đường..." />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Phường/Xã" value={data.ward} onChange={v => set("ward", v)} />
              <Field label="Quận/Huyện" value={data.district} onChange={v => set("district", v)} />
              <Field label="Tỉnh/TP" value={data.city} onChange={v => set("city", v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Diện tích (m²)" value={data.area} onChange={v => set("area", v)} />
              <Field label="Phòng ngủ" value={data.bedrooms} onChange={v => set("bedrooms", v)} />
              <Field label="WC" value={data.bathrooms} onChange={v => set("bathrooms", v)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ảnh bìa</label>
              {data.heroImage ? (
                <div className="relative w-40 h-28 rounded-lg overflow-hidden border">
                  <img src={data.heroImage} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => set("heroImage", null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"><X size={12} /></button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 text-sm text-gray-500">
                  <Upload size={16} /> Tải ảnh bìa
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleHeroUpload(e.target.files)} />
                </label>
              )}
            </div>
          </Section>

          <Section title="💰 Giá & Pháp lý">
            <Field label="Giá rao bán" value={data.price} onChange={v => set("price", v)} placeholder="VD: 5.5 tỷ" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tình trạng vay" value={data.loanStatus} onChange={v => set("loanStatus", v)} />
              <Field label="Hình thức GD" value={data.transactionMethod} onChange={v => set("transactionMethod", v)} />
            </div>
            <Field label="Pháp lý" value={data.legalStatus} onChange={v => set("legalStatus", v)} />
            <div className="flex flex-wrap gap-4 mt-1">
              {[["legalVerified", "Pháp lý hoàn chỉnh"], ["locationVerified", "Đúng vị trí"], ["priceCompetitive", "Giá cạnh tranh"]].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(data as any)[key]} onChange={e => set(key as keyof SaleKitData, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Số tờ" value={data.mapNumber} onChange={v => set("mapNumber", v)} />
              <Field label="Số thửa" value={data.plotNumber} onChange={v => set("plotNumber", v)} />
              <Field label="Tọa độ Google" value={data.googleCoords} onChange={v => set("googleCoords", v)} />
            </div>
          </Section>

          <Section title="📝 Mô tả & Agent">
            <Field label="Mô tả tài sản" value={data.description} onChange={v => set("description", v)} textarea placeholder="Mô tả chi tiết..." />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tên Agent" value={data.agentName} onChange={v => set("agentName", v)} />
              <Field label="SĐT" value={data.agentPhone} onChange={v => set("agentPhone", v)} />
              <Field label="Email" value={data.agentEmail} onChange={v => set("agentEmail", v)} />
            </div>
          </Section>

          <Section title="🏦 Ngân hàng cho vay" defaultOpen={data.showBankPage}>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={data.showBankPage} onChange={e => set("showBankPage", e.target.checked)} className="rounded" />
              Hiện trang ngân hàng cho vay
            </label>
            {data.showBankPage && (
              <div className="space-y-3">
                {data.bankRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <Field label="Tên NH" value={row.name} onChange={v => updateBank(i, "name", v)} />
                    <Field label="Lãi suất" value={row.rate} onChange={v => updateBank(i, "rate", v)} />
                    <Field label="Thời hạn" value={row.term} onChange={v => updateBank(i, "term", v)} />
                    <Field label="Số tiền" value={row.amount} onChange={v => updateBank(i, "amount", v)} />
                    <button onClick={() => set("bankRows", data.bankRows.filter((_, j) => j !== i))} className="pb-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                ))}
                <button onClick={() => set("bankRows", [...data.bankRows, { ...EMPTY_BANK }])}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"><Plus size={14} /> Thêm ngân hàng</button>
              </div>
            )}
          </Section>

          <Section title="🌍 Thửa đất" defaultOpen={false}>
            <ImageUploader images={data.exteriorImages} onChange={imgs => set("exteriorImages", imgs)} label="Ảnh ngoại thất" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tổng DT" value={data.totalArea} onChange={v => set("totalArea", v)} />
              <Field label="Dài" value={data.length} onChange={v => set("length", v)} />
              <Field label="Rộng" value={data.width} onChange={v => set("width", v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Hình dạng" value={data.shape} onChange={v => set("shape", v)} />
              <Field label="Sử dụng" value={data.landUsageType} onChange={v => set("landUsageType", v)} />
              <Field label="Hướng" value={data.landDirection} onChange={v => set("landDirection", v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="DT đất ở" value={data.residentialArea} onChange={v => set("residentialArea", v)} />
              <Field label="Phù hợp QH" value={data.planningCompliant} onChange={v => set("planningCompliant", v)} />
              <Field label="Vi phạm QH" value={data.planningViolation} onChange={v => set("planningViolation", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mặt tiền" value={data.frontageCount} onChange={v => set("frontageCount", v)} />
              <Field label="Cách đường chính" value={data.distanceToMainRoad} onChange={v => set("distanceToMainRoad", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lối vào xe" value={data.vehicleAccess} onChange={v => set("vehicleAccess", v)} />
              <Field label="Giao thông" value={data.transportConnections} onChange={v => set("transportConnections", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hiện trạng SD" value={data.currentUsage} onChange={v => set("currentUsage", v)} />
              <Field label="So sánh thực tế" value={data.comparedToReality} onChange={v => set("comparedToReality", v)} />
            </div>
            <Field label="Đường trước TS" value={data.roadFront} onChange={v => set("roadFront", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kết cấu đường" value={data.roadStructure} onChange={v => set("roadStructure", v)} />
              <Field label="QH dự kiến" value={data.plannedUsage} onChange={v => set("plannedUsage", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rộng vỉa hè" value={data.sidewalkWidth} onChange={v => set("sidewalkWidth", v)} />
              <Field label="Đoạn nhỏ nhất" value={data.narrowestSection} onChange={v => set("narrowestSection", v)} />
            </div>
          </Section>

          <Section title="🏗️ Công trình xây dựng" defaultOpen={false}>
            <ImageUploader images={data.interiorImages} onChange={imgs => set("interiorImages", imgs)} label="Ảnh nội thất" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Loại CT" value={data.buildingType} onChange={v => set("buildingType", v)} />
              <Field label="Cấp nhà" value={data.buildingGrade} onChange={v => set("buildingGrade", v)} />
              <Field label="Số tầng" value={data.floors} onChange={v => set("floors", v)} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Field label="P.Ngủ" value={data.bldBedrooms} onChange={v => set("bldBedrooms", v)} />
              <Field label="WC" value={data.bldBathrooms} onChange={v => set("bldBathrooms", v)} />
              <Field label="P.Khách" value={data.bldLivingRooms} onChange={v => set("bldLivingRooms", v)} />
              <Field label="P.Bếp" value={data.bldKitchens} onChange={v => set("bldKitchens", v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tổng DT sàn" value={data.totalFloorArea} onChange={v => set("totalFloorArea", v)} />
              <Field label="Tầng nổi" value={data.aboveGround} onChange={v => set("aboveGround", v)} />
              <Field label="Tầng hầm" value={data.basement} onChange={v => set("basement", v)} />
            </div>
            <Field label="Kết cấu" value={data.buildingStructure} onChange={v => set("buildingStructure", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Năm xây" value={data.yearBuilt} onChange={v => set("yearBuilt", v)} />
              <Field label="Năm sửa" value={data.yearRenovated} onChange={v => set("yearRenovated", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hệ thống bếp" value={data.kitchenSystem} onChange={v => set("kitchenSystem", v)} />
              <Field label="Điều hòa" value={data.airCon} onChange={v => set("airCon", v)} />
              <Field label="Hút mùi" value={data.rangeHood} onChange={v => set("rangeHood", v)} />
              <Field label="Loại ĐH" value={data.airConType} onChange={v => set("airConType", v)} />
              <Field label="Nước nóng" value={data.hotWater} onChange={v => set("hotWater", v)} />
              <Field label="Vệ sinh" value={data.sanitary} onChange={v => set("sanitary", v)} />
              <Field label="Tủ" value={data.cabinetSystem} onChange={v => set("cabinetSystem", v)} />
              <Field label="Thang máy" value={data.elevator} onChange={v => set("elevator", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thú cưng" value={data.pets} onChange={v => set("pets", v)} />
              <Field label="Đỗ xe" value={data.parking} onChange={v => set("parking", v)} />
              <Field label="Sân vườn" value={data.garden} onChange={v => set("garden", v)} />
              <Field label="Hồ bơi" value={data.pool} onChange={v => set("pool", v)} />
            </div>
          </Section>
        </div>

        {/* Preview */}
        {showPreview && (
          <div ref={previewRef} className="overflow-auto max-h-[85vh] border rounded-xl shadow-inner bg-gray-100" style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}>
            <SaleKitPreview data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
