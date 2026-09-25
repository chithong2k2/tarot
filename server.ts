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
          date_preset: "today",
          access_token: accessToken,
        },
      }
    );

    const insights = response.data.data;
    const spend = insights.length > 0 ? parseFloat(insights[0].spend) : 0;
    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // We also need revenue and operating costs to keep the history record consistent
    // For the automated update, we'll try to fetch the latest known values or just update the spend
    // Since we're on the server, we can query Firestore
    
    // 1. Get current sales to calculate revenue and commission for TODAY only
    const salesSnap = await getDocs(query(collection(db, 'sales'), where('date', '==', todayStr)));
    let totalRevenue = 0;
    let totalCommission = 0;
    salesSnap.forEach(doc => {
      const data = doc.data();
      totalRevenue += (Number(data.amount) || 0) + (Number(data.tip) || 0);
      // Note: we need to ensure reader_commission and sale_commission are calculated or stored
      // For now, we'll use a simplified calculation if they aren't in the doc
      const amount = Number(data.amount) || 0;
      const rComm = Number(data.reader_commission) || (amount * 0.3); // fallback to 30%
      const sComm = Number(data.sale_commission) || (amount * 0.1);   // fallback to 10%
      totalCommission += rComm + sComm;
    });

    // 2. Get operating costs for TODAY only
    const costsSnap = await getDocs(query(collection(db, 'operating_costs'), where('date', '==', todayStr)));
    let totalOperatingCosts = 0;
    costsSnap.forEach(doc => {
      totalOperatingCosts += Number(doc.data().amount) || 0;
    });

    // 3. Save to ad_history
    await setDoc(doc(db, 'ad_history', todayStr), {
      date: todayStr,
      spend: spend,
      revenue: totalRevenue,
      operating_costs: totalOperatingCosts,
      commission: totalCommission,
      net_profit: totalRevenue - spend - totalOperatingCosts - totalCommission,
      updated_at: new Date().toISOString()
    }, { merge: true });

    console.log(`[Cron] Successfully updated ad spend for ${todayStr}: ${spend}`);
  } catch (error: any) {
    console.error("[Cron] Error updating ad spend:", error.response?.data || error.message);
  }
}

// Schedule the task to run every 5 minutes for "real-time" updates
cron.schedule("*/5 * * * *", () => {
  console.log("[Cron] Running frequent ad spend update...");
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
