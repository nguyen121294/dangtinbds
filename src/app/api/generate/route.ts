import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, area, price, location, condition, direction, purpose, contact, highlights, style, headings } = body;

    // Fixed System Prompt
    const systemPrompt = `Bạn là chuyên gia môi giới BĐS hàng đầu Việt Nam. Viết bài đăng Facebook/Zalo rao bán/cho thuê BĐS để chốt sale, độ dài 1/2 trang A4.
NGUYÊN TẮC: Dùng emoji NHIỀU và PHONG PHÚ xuyên suốt. KHÔNG BAO GIỜ viết nhãn cấu trúc (Tiêu đề:, Thân bài:, Kêu gọi hành động:). Bài viết tự nhiên, liền mạch, copy-paste trực tiếp lên Facebook. TUYỆT ĐỐI KHÔNG dùng markdown (**, ##, ~~, --). Chỉ dùng text thuần và emoji.
HASHTAG BẮT BUỘC: Cuối bài PHẢI có 15-25 hashtag viral (vị trí + loại BĐS + giá + hành động). Viết liền không dấu.`;

    // Dynamic User Prompt injected with the details
    const selectedHeadings = headings && headings.length > 0 ? headings.map((h: string) => `[x] ${h}`).join('\n') : 'Cung cấp đầy đủ thông tin có sẵn';
    
    const userPrompt = `Hãy viết một bài đăng bán/cho thuê bất động sản với thông tin sau:
- Loại hình: ${type}
- Vị trí: ${location}
- Thông số (DTCN, ngang dài): ${area}
- Hiện trạng/Kết cấu: ${condition}
- Hướng: ${direction}
- Mua để làm gì (Mục đích): ${purpose}
- Giá bán: ${price}
- Liên hệ: ${contact}
- Đặc điểm nổi bật: ${highlights}

**YẾU TỐ BẮT BUỘC (PHONG CÁCH):** Bài viết PHẢI được viết theo phong cách: "${style}". Giữ vững 100% phong cách này xuyên suốt bài.

**YẾU TỐ BẮT BUỘC (CÁC ĐẦU MỤC):** Trong bài viết PHẢI ĐỀ CẬP RÕ RÀNG đến các đầu mục sau đây (đừng bỏ sót):
${selectedHeadings}

Hãy làm bài viết thật hấp dẫn, không vòng vo, vào thẳng bài đăng!`;

    let responseText = "";
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    
    try {
      const output = await replicate.run("openai/gpt-5-nano", {
        input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
      });
      responseText = Array.isArray(output) ? output.join('') : String(output);
    } catch (modelError: any) {
      console.warn("GPT-5 Nano failed. Falling back to GPT-4.1 Nano...");
      try {
        const fallback = await replicate.run("openai/gpt-4.1-nano", {
          input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
        });
        responseText = Array.isArray(fallback) ? fallback.join('') : String(fallback);
      } catch (fallbackError: any) {
        throw fallbackError;
      }
    }

    return NextResponse.json({ success: true, text: responseText });
  } catch (error: any) {
    console.error("GenAI Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Hệ thống AI đang quá tải. Hãy thử lại sau ít giây nhé!" }, { status: 500 });
  }
}
