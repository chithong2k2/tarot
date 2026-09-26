import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import cron from "node-cron";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, where } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import Tesseract from "tesseract.js";
import { parseMenuTextToPackages } from "./src/utils/menuOcrParser";

dotenv.config();

// Firebase configuration for server-side use
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyA9avmK4ed3JDBzRCVh0-602BoLVU8Cgn8",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "tarot-5719b.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "tarot-5719b",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "tarot-5719b.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "30679561256",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:30679561256:web:392561ac7f849bbe2f311d",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function getMetaCredentials() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      const data = snap.data();
      const fbToken = data.fb_access_token?.trim();
      const fbAdId = data.fb_ad_account_id?.trim();
      if (fbToken && fbAdId) {
        return { accessToken: fbToken, adAccountId: fbAdId };
      }
    }
  } catch (err) {
    console.error("[Server] Error reading credentials from Firestore:", err);
  }
  return {
    accessToken: process.env.FB_ACCESS_TOKEN || '',
    adAccountId: process.env.FB_AD_ACCOUNT_ID || ''
  };
}

async function getGeminiApiKey(customKey?: string): Promise<string> {
  if (customKey && customKey.trim()) return customKey.trim();
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.gemini_api_key?.trim()) {
        return data.gemini_api_key.trim();
      }
    }
  } catch (err) {
    console.error("[Server] Error reading gemini_api_key from Firestore:", err);
  }
  return process.env.GEMINI_API_KEY || '';
}

async function fetchAndSaveAdSpend() {
  const { accessToken, adAccountId } = await getMetaCredentials();

  if (!accessToken || !adAccountId) {
    console.error("[Cron] Missing Facebook credentials (neither in Firestore nor .env). Skipping update.");
    return;
  }

  try {
    const formattedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${formattedId}/insights`,
      {
        params: {
          fields: "spend",
          date_preset: "this_week_mon_today",
          time_increment: 1,
          access_token: accessToken,
        },
      }
    );

    const insights = response.data.data || [];
    for (const item of insights) {
      const dateStr = item.date_start;
      const spend = parseFloat(item.spend) || 0;

      await setDoc(doc(db, 'ad_history', dateStr), {
        date: dateStr,
        spend: spend,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    console.log(`[Cron] Synced ${insights.length} days of ad spend into ad_history`);
  } catch (error: any) {
    console.error("[Cron] Error updating ad spend:", error.response?.data || error.message);
  }
}

// Schedule the task to run every 2 minutes for real-time background sync
cron.schedule("*/2 * * * *", () => {
  console.log("[Cron] Running frequent ad spend update (every 2 minutes)...");
  fetchAndSaveAdSpend();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Schedule the task to run at 23:59 every day for final chốt số
cron.schedule("59 23 * * *", () => {
  console.log("[Cron] Running end-of-day ad spend update...");
  fetchAndSaveAdSpend();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initial fetch on server start
  fetchAndSaveAdSpend();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API route to fetch Facebook Ads spend for today
  app.get("/api/fb-spend", async (req, res) => {
    const { accessToken, adAccountId } = await getMetaCredentials();

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ 
        error: "Chưa cấu hình thông tin Facebook Ads (Token hoặc ID tài khoản)." 
      });
    }

    try {
      const formattedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${formattedId}/insights`,
        {
          params: {
            fields: "spend",
            date_preset: "today",
            access_token: accessToken,
          },
        }
      );

      const insights = response.data.data;
      const spend = insights && insights.length > 0 ? parseFloat(insights[0].spend) : 0;
      res.json({ spend });
    } catch (error: any) {
      console.error("Facebook API Error:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to fetch data from Facebook", 
        details: error.response?.data?.error?.message || error.message 
      });
    }
  });

  // API route to sync realtime daily Facebook Ads spend into Firestore
  app.post("/api/sync-fb-ads", async (req, res) => {
    const { accessToken, adAccountId } = await getMetaCredentials();

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: "Chưa cấu hình FB_ACCESS_TOKEN và FB_AD_ACCOUNT_ID (trong Cài Đặt hoặc file .env)" 
      });
    }

    try {
      const formattedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${formattedId}/insights`,
        {
          params: {
            fields: "spend",
            date_preset: "this_week_mon_today",
            time_increment: 1,
            access_token: accessToken,
          },
        }
      );

      const insights = response.data.data || [];
      const updatedDays: any[] = [];

      for (const item of insights) {
        const dateStr = item.date_start;
        const spend = parseFloat(item.spend) || 0;

        await setDoc(doc(db, 'ad_history', dateStr), {
          date: dateStr,
          spend: spend,
          updated_at: new Date().toISOString()
        }, { merge: true });

        updatedDays.push({ date: dateStr, spend });
      }

      console.log(`[FB Sync] Synced ${updatedDays.length} days of ad spend into ad_history`);
      res.json({ 
        success: true, 
        message: `Đã cập nhật chi phí Ads cho ${updatedDays.length} ngày thành công!`,
        days: updatedDays 
      });
    } catch (error: any) {
      console.error("Facebook Sync Error:", error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi kéo dữ liệu từ Facebook: " + (error.response?.data?.error?.message || error.message)
      });
    }
  });

  // API route to test Facebook Ads connection with live account info
  app.post("/api/test-fb-ads", async (req, res) => {
    const { accessToken: reqToken, adAccountId: reqAccountId } = req.body || {};
    const stored = await getMetaCredentials();
    const accessToken = reqToken?.trim() || stored.accessToken;
    const adAccountId = reqAccountId?.trim() || stored.adAccountId;

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: "Chưa có Access Token hoặc ID Tài khoản Quảng cáo. Vui lòng nhập và thử lại." 
      });
    }

    try {
      const formattedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${formattedId}`,
        {
          params: {
            fields: "name,account_status,currency,amount_spent,timezone_name",
            access_token: accessToken,
          },
        }
      );

      const data = response.data;
      const statusMap: Record<number, string> = {
        1: "Hoạt động bình thường (ACTIVE)",
        2: "Bị vô hiệu hóa (DISABLED)",
        3: "Chưa thanh toán (UNSETTLED)",
        7: "Đang chờ xem xét (PENDING_REVIEW)",
        9: "Đang gia hạn (IN_GRACE_PERIOD)",
        100: "Đang chờ thanh toán đóng (PENDING_CLOSURE)",
        101: "Đã đóng (CLOSED)"
      };
      const statusText = statusMap[data.account_status] || `Trạng thái: ${data.account_status}`;

      return res.json({
        success: true,
        account: {
          id: data.id,
          name: data.name,
          currency: data.currency,
          status: statusText,
          amount_spent: data.amount_spent,
          timezone: data.timezone_name
        },
        message: `Kết nối thành công tới tài khoản "${data.name}" (${data.currency}) - ${statusText}`
      });
    } catch (error: any) {
      console.error("[Test FB] Error:", error.response?.data || error.message);
      const fbError = error.response?.data?.error?.message || error.message;
      return res.status(400).json({
        success: false,
        message: `Lỗi kết nối Facebook: ${fbError}`
      });
    }
  });

  // API route to analyze Tarot price menu image via Gemini Vision & OCR
  app.post("/api/analyze-price-menu", async (req, res) => {
    const { imageBase64, mimeType = "image/jpeg", geminiApiKey } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp dữ liệu hình ảnh (imageBase64)."
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const geminiKey = await getGeminiApiKey(geminiApiKey);

    // 1. Try Google Gemini Vision if API key is configured
    if (geminiKey) {
      try {
        console.log(`[AI Menu] Analyzing price menu with Google Gemini Vision (key: ${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)})...`);
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        // Try candidate models in order of best vision performance, stability & availability
        const candidateModels = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
        let response: any = null;
        let lastErr: any = null;

        for (const modelName of candidateModels) {
          try {
            console.log(`[AI Menu] Trying model: ${modelName}...`);
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                  }
                },
                {
                  text: `Bạn là chuyên gia OCR và trích xuất dữ liệu bảng giá/dịch vụ từ hình ảnh.

Nhiệm vụ:
Đọc chính xác nội dung hiển thị trên hình ảnh và trích xuất toàn bộ danh mục gói dịch vụ, gói câu hỏi, gói thời gian kèm theo giá tiền tương ứng.

Quy tắc chuẩn hóa dữ liệu:
1. Quy đổi giá tiền sang số nguyên VNĐ:
   - Các hậu tố viết tắt: "k", "K", "cành", "nghìn", "ngàn" -> nhân với 1.000 (Ví dụ: 35k -> 35000, 129k -> 129000, 1.5k -> 1500).
   - "tr", "Tr", "triệu", "củ" -> nhân với 1.000.000 (Ví dụ: 1tr -> 1000000, 1.2tr -> 1200000).
   - Nếu đã ghi đầy đủ số (ví dụ: 50.000, 50,000) -> chuyển về dạng số nguyên không dấu ngăn cách (50000).
   - Nếu không có giá hoặc miễn phí -> ghi 0.
2. Thông tin gói:
   - "name": Tên vắn tắt đại diện gói (ví dụ: "1 câu", "3 câu", "30p", "1h", "gói năm").
   - "label": Tên hiển thị đầy đủ, rõ ràng và có ngữ cảnh chuẩn trên menu (ví dụ: "1 Câu", "30 Phút (1 Chủ Đề)", "Trọn Gói 1 Giờ").
   - "popular": Đánh dấu true nếu gói có gắn nhãn nổi bật/hot/bán chạy/khuyên dùng (hoặc có icon ngôi sao, viền nổi bật), nếu không có thì false.
3. Độ chính xác:
   - Bám sát từng dòng chữ, số phút, số câu xuất hiện trên ảnh.
   - Không tự ý thêm bớt các gói không tồn tại trong hình ảnh.`
                }
              ],
              config: {
                temperature: 0,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: 'Tên ngắn gọn, ví dụ: 1 câu, 3 câu, 30p' },
                      label: { type: Type.STRING, description: 'Tên hiển thị đầy đủ trên menu' },
                      price: { type: Type.INTEGER, description: 'Mức giá quy đổi thành số nguyên VNĐ' },
                      popular: { type: Type.BOOLEAN, description: 'True nếu có gắn nhãn nổi bật, ngược lại false' }
                    },
                    required: ['name', 'label', 'price', 'popular']
                  }
                }
              }
            });
            if (response && response.text) {
              console.log(`[AI Menu] Successfully generated with model ${modelName}`);
              break;
            }
          } catch (mErr: any) {
            console.warn(`[AI Menu] Model ${modelName} failed:`, mErr?.message || mErr);
            lastErr = mErr;
          }
        }

        if (!response) {
          throw lastErr || new Error("All Gemini models failed");
        }

        const rawText = response.text || '';
        console.log("[AI Menu] Gemini structured response:", rawText.slice(0, 150));

        // Parse JSON array
        let parsed: any[] = [];
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const jsonMatch = rawText.match(/\[[\s\S]*\]/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((p: any, idx: number) => ({
            id: 'pkg_ai_' + Date.now() + '_' + idx,
            name: String(p.name || `Gói ${idx + 1}`).trim(),
            label: String(p.label || p.name || `Gói ${idx + 1}`).trim(),
            price: Number(p.price) || 0,
            popular: Boolean(p.popular)
          })).filter((p: any) => p.price > 0);

          if (formatted.length > 0) {
            return res.json({
              success: true,
              method: 'gemini',
              packages: formatted,
              message: `AI Gemini đã nhận diện thành công ${formatted.length} gói dịch vụ từ ảnh!`
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn("[AI Menu] Gemini Vision failed, falling back to local OCR:", geminiErr?.message || geminiErr);
      }
    }

    // 2. Fallback to Tesseract OCR (works 100% offline & without API key)
    try {
      console.log("[AI Menu] Running local Tesseract OCR on menu image...");
      const buffer = Buffer.from(cleanBase64, 'base64');
      const { data: { text } } = await Tesseract.recognize(buffer, 'vie+eng');
      console.log("[AI Menu] OCR extracted text length:", text.length, "Preview:", text.slice(0, 80));

      const parsedPackages = parseMenuTextToPackages(text);
      if (parsedPackages.length > 0) {
        return res.json({
          success: true,
          method: 'ocr',
          rawText: text,
          packages: parsedPackages,
          message: `Hệ thống OCR đã phân tích và tìm thấy ${parsedPackages.length} gói dịch vụ từ ảnh!`
        });
      }

      return res.json({
        success: false,
        rawText: text,
        packages: [],
        message: "Không tìm thấy thông tin gói dịch vụ rõ ràng từ ảnh. Bạn có thể nhập Gemini API Key để nhận diện tốt hơn với font chữ thiết kế nghệ thuật."
      });
    } catch (ocrErr: any) {
      console.error("[AI Menu] OCR Error:", ocrErr);
      return res.status(500).json({
        success: false,
        message: "Lỗi xử lý hình ảnh: " + (ocrErr?.message || String(ocrErr))
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
