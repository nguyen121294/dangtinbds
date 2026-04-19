"use client";

import { useState, useEffect } from "react";
import useDrivePicker from "react-google-drive-picker";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FolderOpen, X, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/toast";

export default function ToolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<{id: string, name: string} | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);
  
  const [openPicker, authResponse] = useDrivePicker();
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
      }
    });
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/tool-settings');
      const data = await res.json();
      if (data.success) {
        if (data.defaultDriveFolderId) {
           setSelectedFolder({
              id: data.defaultDriveFolderId,
              name: data.defaultDriveFolderName || "Thư mục đã chọn"
           });
        }
        setSignatures(data.signatures || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handeSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           defaultDriveFolderId: selectedFolder?.id || null,
           defaultDriveFolderName: selectedFolder?.name || null,
           signatures: signatures.filter(s => s.trim() !== '')
        })
      });
      const data = await res.json();
      if (data.success) {
         showToast("success", "Lưu cấu hình thành công");
      } else {
         showToast("error", data.error || "Có lỗi xảy ra");
      }
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPicker = () => {
    if (!accessToken) {
       showToast("error", "Thiếu quyền truy cập vào Drive (Provider Token). Vui lòng đăng nhập lại bằng Google.");
       return;
    }
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      viewId: 'FOLDERS', // Only picking folders
      token: accessToken,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: false,
      setIncludeFolders: true,
      setSelectFolderEnabled: true,
      callbackFunction: (data: any) => {
        if (data.action === 'picked') {
          const doc = data.docs[0];
          setSelectedFolder({ id: doc.id, name: doc.name });
        }
      },
    });
  };

  const addSignature = () => setSignatures([...signatures, ""]);
  const updateSignature = (idx: number, value: string) => {
    const newSigs = [...signatures];
    newSigs[idx] = value;
    setSignatures(newSigs);
  };
  const deleteSignature = (idx: number) => {
    setSignatures(signatures.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt Công cụ AI</h1>
        <p className="text-gray-500 mt-1">Cấu hình thư mục lưu trữ và thiết lập các chữ ký mặc định để tiết kiệm thời gian.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">📂 Thư mục Google Drive Mặc định</h2>
        <p className="text-sm text-gray-600">Khi bạn tạo bài đăng mới, hệ thống sẽ tự động lưu ảnh và file Docs vào thư mục này thay vì tạo ở thư mục gốc.</p>
        
        <div className="flex items-center space-x-3 mt-4">
          <button 
            type="button" 
            onClick={handleOpenPicker} 
            className="flex items-center px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {selectedFolder ? 'Thay đổi thư mục' : 'Chọn thư mục Drive'}
          </button>
          
          {selectedFolder && (
            <div className="flex items-center bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 text-sm">
              <span className="font-medium mr-3">{selectedFolder.name}</span>
              <button onClick={() => setSelectedFolder(null)} className="text-gray-500 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
           <h2 className="text-lg font-bold text-gray-900">✍️ Quản lý Mẫu Chữ ký</h2>
           <button onClick={addSignature} className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition">
             <Plus className="w-4 h-4 mr-1.5" /> Thêm chữ ký
           </button>
        </div>
        <p className="text-sm text-gray-600">Những chữ ký này sẽ xuất hiện dưới dạng lựa chọn khi bạn đăng tin để tự động gắn vào cuối bài.</p>
        
        <div className="space-y-4 mt-4">
           {signatures.length === 0 ? (
             <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500 text-sm">
               Chưa có chữ ký nào. Bấm "Thêm chữ ký" để tạo mới.
             </div>
           ) : (
             signatures.map((sig, idx) => (
               <div key={idx} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Chữ ký {idx+1}</label>
                    <textarea 
                      value={sig}
                      onChange={(e) => updateSignature(idx, e.target.value)}
                      placeholder="Nguyễn Văn A - 090xxxxxxx"
                      className="w-full text-sm p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition min-h-[80px]"
                    />
                  </div>
                  <button onClick={() => deleteSignature(idx)} className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-md transition" title="Xóa chữ ký này">
                     <Trash2 className="w-5 h-5" />
                  </button>
               </div>
             ))
           )}
        </div>
      </div>

      <div className="flex justify-end">
         <button 
           onClick={handeSave}
           disabled={saving}
           className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
         >
           {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
           Lưu thay đổi cấu hình
         </button>
      </div>

    </div>
  );
}
