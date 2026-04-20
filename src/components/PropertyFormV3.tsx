"use client";
import { useState, useEffect } from "react";
import { Loader2, Sparkles, FolderOpen, X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { createClient } from '@/lib/supabase/client';
import useDrivePicker from 'react-google-drive-picker';

const DEFAULT_PROMPT = `Bạn là một chuyên gia môi giới bất động sản cực kỳ xuất sắc tại Việt Nam. 
Nhiệm vụ của bạn là viết một bài đăng Facebook (hoặc Zalo) rao bán/cho thuê bất động sản để chốt sale, độ dài 1/2 trang A4.
Ngôn từ thôi miên, cuốn hút, chuẩn SEO. Bạn phải tuân thủ nghiêm ngặt các nguyên tắc sau:
1. Luôn sử dụng emoji hợp lý, vừa phải để tạo điểm nhấn.
2. Bố cục bài đăng phải rõ ràng (Tiêu đề, Thân bài, Kêu gọi hành động).
3. Nhấn mạnh vào LỢI ÍCH (không gian sống, tiềm năng) chứ không chỉ liệt kê TÍNH NĂNG.
4. Trình bày tự nhiên, tạo cảm giác thân tín chứ không giống văn máy.
5. TUYỆT ĐỐI KHÔNG sử dụng ký hiệu markdown như **, ##, ~~. Chỉ dùng text thuần và emoji.`;

const styleOptions = [
  "Chuyên nghiệp ngắn gọn",
  "Chuyên nghiệp chỉnh chu",
  "Chuyên nghiệp tạo sự khan hiếm",
  "Chuyên nghiệp sang trọng đẳng cấp",
];

export default function PropertyFormV3({ workspaceId }: { workspaceId?: string }) {
  const [rawInfo, setRawInfo] = useState("");
  const [style, setStyle] = useState(styleOptions[0]);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [signature, setSignature] = useState("");
  const [availableSignatures, setAvailableSignatures] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [copied, setCopied] = useState<'long' | 'short' | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(null);
  const [openPicker] = useDrivePicker();
  const supabase = createClient();

  const totalCost = 2;

  const handleOpenPicker = () => {
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      viewId: 'DOCS',
      token: accessToken,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: false,
      setIncludeFolders: true,
      setSelectFolderEnabled: true,
      callbackFunction: (data) => {
        if (data.action === 'picked') {
          setSelectedDriveFolder({ id: data.docs[0].id, name: data.docs[0].name });
        }
      },
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
      if (session?.user) {
        fetch('/api/tool-settings')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              if (data.defaultDriveFolderId) {
                setSelectedDriveFolder({ id: data.defaultDriveFolderId, name: data.defaultDriveFolderName || "Thư mục tùy chỉnh" });
              }
              if (data.signatures?.length > 0) {
                setAvailableSignatures(data.signatures);
                setSignature(data.signatures[0]);
              }
              if (data.customPromptV2?.trim()) setCustomPrompt(data.customPromptV2);
            }
          }).catch(() => {});

        if (workspaceId) {
          fetch(`/api/workspace-credits?workspaceId=${workspaceId}`)
            .then(res => res.json())
            .then(d => { if (d.success) setUserCredits(d.credits); })
            .catch(() => {});
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
      else if (!session) setAccessToken("");
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const login = useGoogleLogin({
    onSuccess: (cr) => setAccessToken(cr.access_token),
    onError: (e) => console.log('Login Failed:', e),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly',
  });

  // Parse output
  const longPost = resultText.split('===BÀI ĐĂNG NGẮN===')[0]?.replace('===BÀI ĐĂNG DÀI===', '').trim() || '';
  const shortPost = resultText.split('===BÀI ĐĂNG NGẮN===')[1]?.trim() || '';

  const copyToClipboard = async (text: string, type: 'long' | 'short') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Vui lòng đăng nhập."); window.location.href = '/login'; return; }
    if (!accessToken) { login(); return; }

    setLoading(true);
    setResultText("");

    try {
      const res = await fetch("/api/generate-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInfo, style, customPrompt, signature,
          access_token: accessToken,
          workspaceId,
          driveFolderId: selectedDriveFolder?.id || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        setResultText(data.text);
        setUserCredits(prev => Math.max(0, prev - totalCost));
      } else {
        alert("Lỗi: " + (data.error || ""));
      }
    } catch { alert("Lỗi kết nối."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        {/* INPUT */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Thông tin BĐS</h2>
          <textarea required rows={6}
            placeholder={`Ví dụ:\nĐất nền 100m2 (5x20m) tại đường Nguyễn Duy Trinh, Q2.\nHướng Đông Nam, sổ riêng, thổ cư 100%.\nGần chợ, trường học. Giá 3.5 tỷ thương lượng.\nLH: 0909 xxx xxx`}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none resize-none text-sm leading-relaxed"
            value={rawInfo} onChange={e => setRawInfo(e.target.value)}
          />
        </div>

        {/* STYLE */}
        <div className="pt-2 space-y-5 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Tuỳ biến AI</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phong cách</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {styleOptions.map(s => (
                <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${style === s ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                  <input type="radio" name="styleV3" value={s} checked={style === s} onChange={e => setStyle(e.target.value)} className="text-blue-600 cursor-pointer" />
                  <span className="font-medium">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prompt editor */}
          <div>
            <button type="button" onClick={() => setShowPromptEditor(!showPromptEditor)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition">
              {showPromptEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Prompt AI tùy chỉnh (nâng cao)
            </button>
            {showPromptEditor && (
              <div className="mt-3 space-y-2">
                <textarea rows={6} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none resize-none text-sm" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCustomPrompt(DEFAULT_PROMPT)} className="text-xs text-gray-500 hover:text-blue-600 underline">Khôi phục mặc định</button>
                  <button type="button" onClick={async () => { try { await fetch('/api/tool-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customPromptV2: customPrompt }) }); alert('Đã lưu!'); } catch { alert('Lỗi.'); } }} className="text-xs text-blue-600 hover:text-blue-800 underline font-medium">Lưu vào Cài đặt</button>
                </div>
              </div>
            )}
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mẫu Chữ ký</label>
            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={signature} onChange={e => setSignature(e.target.value)}>
              <option value="">-- Không đính kèm chữ ký --</option>
              {availableSignatures.map((sig, idx) => (<option key={idx} value={sig}>{sig.length > 30 ? `${sig.substring(0, 30)}...` : sig}</option>))}
            </select>
          </div>
        </div>

        {/* DRIVE + COST */}
        <div className="pt-2 space-y-5 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Lưu trữ & Chi phí</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Thư mục Google Drive</label>
            <div className="flex items-center space-x-3">
              <button type="button" onClick={handleOpenPicker} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm">
                <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />{selectedDriveFolder ? 'Thay đổi' : 'Chọn thư mục'}
              </button>
              {selectedDriveFolder && (
                <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm">
                  <span className="truncate max-w-[200px] font-medium">{selectedDriveFolder.name}</span>
                  <button type="button" onClick={() => setSelectedDriveFolder(null)} className="ml-2 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <h4 className="font-bold text-gray-800">Chi phí</h4>
              <p className="text-sm text-gray-500 mt-0.5">2 bài đăng (dài + ngắn), không xử lý ảnh</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black ${userCredits >= totalCost ? 'text-gray-900' : 'text-red-500'}`}>{totalCost}</div>
              <div className="text-xs font-semibold text-gray-500">Số dư: {userCredits} {userCredits < totalCost && <span className="text-red-500 ml-1">(Không đủ)</span>}</div>
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="pt-4">
          <button disabled={loading || (accessToken.length > 0 && userCredits < totalCost)} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none ${accessToken && userCredits >= totalCost ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:-translate-y-0.5' : 'bg-red-600 hover:bg-red-700 shadow-md disabled:bg-gray-400'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "AI đang viết bài..." : (!accessToken ? "Uỷ quyền Google Drive" : (userCredits < totalCost ? "Không đủ Credit" : "Tạo bài ngay ⚡"))}</span>
          </button>
        </div>
      </form>

      {/* RESULT */}
      {resultText && (
        <div className="space-y-4">
          {longPost && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">📝 Bài đăng dài</h3>
                <button type="button" onClick={() => copyToClipboard(longPost, 'long')} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition">
                  {copied === 'long' ? <><Check className="w-4 h-4" /> Đã copy</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">{longPost}</div>
            </div>
          )}
          {shortPost && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">📋 Bài đăng ngắn</h3>
                <button type="button" onClick={() => copyToClipboard(shortPost, 'short')} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition">
                  {copied === 'short' ? <><Check className="w-4 h-4" /> Đã copy</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">{shortPost}</div>
            </div>
          )}
          <p className="text-xs text-center text-gray-400">Bài đăng đã được tự động lưu vào Google Drive của bạn.</p>
        </div>
      )}
    </div>
  );
}
