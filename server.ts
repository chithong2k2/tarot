import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import cron from "node-cron";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, query, orderBy, limit, where } from "firebase/firestore";

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

async function fetchAndSaveAdSpend() {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const adAccountId = process.env.FB_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    console.error("[Cron] Missing Facebook credentials. Skipping update.");
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

  app.use(express.json());

  // API route to fetch Facebook Ads spend for today
  app.get("/api/fb-spend", async (req, res) => {
    const accessToken = process.env.FB_ACCESS_TOKEN;
    const adAccountId = process.env.FB_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ 
        error: "Missing Facebook credentials in .env file." 
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
      const spend = insights.length > 0 ? parseFloat(insights[0].spend) : 0;
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
    const accessToken = process.env.FB_ACCESS_TOKEN;
    const adAccountId = process.env.FB_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: "Chưa cấu hình FB_ACCESS_TOKEN và FB_AD_ACCOUNT_ID trong file .env" 
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
