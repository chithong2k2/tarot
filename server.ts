import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Initialize Firebase for the server
const firebaseConfig = {
  apiKey: "AIzaSyA9avmK4ed3JDBzRCVh0-602BoLVU8Cgn8",
  authDomain: "tarot-5719b.firebaseapp.com",
  projectId: "tarot-5719b",
  storageBucket: "tarot-5719b.firebasestorage.app",
  messagingSenderId: "30679561256",
  appId: "1:30679561256:web:392561ac7f849bbe2f311d",
  measurementId: "G-973ZSG8E6C",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Telegram Bot Logic ---
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (token) {
    const globalForTelegram = global as unknown as { telegramBot?: TelegramBot };
    
    if (globalForTelegram.telegramBot) {
      console.log("Stopping existing Telegram bot...");
      try {
        globalForTelegram.telegramBot.stopPolling();
      } catch (e) {
        console.error("Error stopping old bot:", e);
      }
    }

    const bot = new TelegramBot(token, { polling: true });
    globalForTelegram.telegramBot = bot;
    console.log("🤖 Telegram bot is running...");

    // Handle polling errors gracefully
    bot.on("polling_error", (error: any) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        console.warn("⚠️ Telegram polling conflict detected. This is normal during server restarts. Ignoring...");
      } else {
        console.error("Telegram polling error:", error);
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("Shutting down Telegram bot...");
      bot.stopPolling();
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text) return;

      if (text === "/start") {
        bot.sendMessage(
          chatId,
          "Xin chào! Hãy gửi tin nhắn theo 1 trong 2 cú pháp sau:\n\n1. `[tên khách] [giá] [tên gói], [tên reader], [tên sale]`\nVí dụ: `Thu 338k 2 gói 10 câu, Giang, Thông`\n\n2. `[tên khách] [giá], [tên reader], [tên sale]`\nVí dụ: `Ngọc Tiến 169k, Giang, Thông`",
          { parse_mode: "Markdown" }
        );
        return;
      }

      try {
        // Split by comma
        const parts = text.split(',').map(p => p.trim());
        
        if (parts.length !== 3) {
          bot.sendMessage(
            chatId,
            "❌ Sai cú pháp. Vui lòng nhập theo mẫu:\n`[tên khách] [giá] [tên gói], [tên reader], [tên sale]`\nhoặc\n`[tên khách] [giá], [tên reader], [tên sale]`",
            { parse_mode: "Markdown" }
          );
          return;
        }

        const firstPart = parts[0];
        const readerNameInput = parts[1].toLowerCase();
        const saleNameInput = parts[2].toLowerCase();

        // Parse first part: [tên khách] [giá] [tên gói (optional)]
        const match = firstPart.match(/^(.+?)\s+(\d+[kK]?)(?:\s+(.+))?$/);

        if (!match) {
          bot.sendMessage(
            chatId,
            "❌ Phần đầu tin nhắn sai cú pháp. Vui lòng đảm bảo có tên khách và giá tiền (VD: Thu 338k...).",
            { parse_mode: "Markdown" }
          );
          return;
        }

        const customerName = match[1].trim();
        const priceStr = match[2].toLowerCase();
        let packageName = match[3] ? match[3].trim() : "";

        // Convert price
        const amount = priceStr.endsWith("k")
          ? parseInt(priceStr) * 1000
          : parseInt(priceStr);

        // Infer package name if missing
        if (!packageName) {
          if (amount === 35000) packageName = "1 câu";
          else if (amount === 70000 || amount === 80000) packageName = "3 câu";
          else if (amount === 100000) packageName = "5 câu";
          else if (amount === 129000) packageName = "7 câu";
          else if (amount === 169000) packageName = "10 câu";
          else packageName = "Gói Custom";
        }

        // Fetch users to find matching reader and sale
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

        // Find best match for reader
        const reader = users.find(
          (u) =>
            (u.role === "reader" || u.role === "manager") &&
            (u.full_name.toLowerCase().includes(readerNameInput) ||
              u.username.toLowerCase().includes(readerNameInput))
        );

        // Find best match for sale
        const sale = users.find(
          (u) =>
            (u.role === "sale" || u.role === "manager") &&
            (u.full_name.toLowerCase().includes(saleNameInput) ||
              u.username.toLowerCase().includes(saleNameInput))
        );

        const readerId = reader ? reader.id : parts[1];
        const saleId = sale ? sale.id : parts[2];
        const readerDisplayName = reader ? reader.full_name : parts[1];
        const saleDisplayName = sale ? sale.full_name : parts[2];

        // Save to Firestore
        await addDoc(collection(db, "sales"), {
          customer_name: customerName,
          amount: amount,
          reader_id: readerId,
          sale_id: saleId,
          package_name: packageName,
          tip: 0,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        });

        bot.sendMessage(
          chatId,
          `✅ **Đã ghi nhận thành công!**\n\n👤 Khách: ${customerName}\n📦 Gói: ${packageName}\n💰 Giá: ${amount.toLocaleString(
            "vi-VN"
          )}đ\n🔮 Reader: ${readerDisplayName}\n🤝 Sale: ${saleDisplayName}`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Lỗi khi xử lý tin nhắn Telegram:", error);
        bot.sendMessage(
          chatId,
          "❌ Có lỗi xảy ra khi phân tích hoặc lưu dữ liệu. Vui lòng thử lại sau."
        );
      }
    });
  } else {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.");
  }

  // --- Vite Middleware ---
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
