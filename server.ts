import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Telegraf, Markup } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Firebase setup for server
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

// Telegram Bot Setup
const botToken = process.env.TELEGRAM_BOT_TOKEN;
let bot: Telegraf | null = null;

const pendingSales = new Map<string, { customerName: string, amount: number, saleName: string }>();

if (botToken) {
  bot = new Telegraf(botToken);

  bot.start((ctx) => ctx.reply('Chào bạn! Gửi tin nhắn theo cú pháp:\n[Tên Khách] [Số tiền]k\nVí dụ: Ngọc Tiến 169k\n\nHoặc cú pháp cũ:\n[Tên Khách] [Số tiền]k [Tên Reader], [Tên Sale]\nVí dụ: Ngọc Tiến 169k Hiển, Thông'));

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // Regex to match old syntax: Customer Name 169k Reader Name, Sale Name
    const oldRegex = /^(.*?)\s+(\d+)[kK]\s+(.*?),\s*(.*?)\s*$/;
    // Regex to match new syntax: Customer Name 169k
    const newRegex = /^(.*?)\s+(\d+)[kK]\s*$/;

    const oldMatch = text.match(oldRegex);
    const newMatch = text.match(newRegex);

    if (oldMatch) {
      const customerName = oldMatch[1].trim();
      const amount = parseInt(oldMatch[2]) * 1000;
      const readerName = oldMatch[3].trim();
      const saleName = oldMatch[4].trim();

      try {
        // Find reader and sale IDs from database
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        const reader = users.find(u => u.full_name.toLowerCase().includes(readerName.toLowerCase()) || u.username.toLowerCase() === readerName.toLowerCase());
        const sale = users.find(u => u.full_name.toLowerCase().includes(saleName.toLowerCase()) || u.username.toLowerCase() === saleName.toLowerCase());

        const readerId = reader ? reader.id : readerName;
        const saleId = sale ? sale.id : saleName;

        // Add sale record
        const saleRecord = {
          customer_name: customerName,
          amount: amount,
          reader_id: readerId,
          sale_id: saleId,
          package_name: 'Gói Tuỳ Chỉnh (Từ Bot)',
          tip: 0,
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };

        await addDoc(collection(db, 'sales'), saleRecord);

        ctx.reply(`✅ Đã thêm doanh thu thành công!\nKhách: ${customerName}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ\nReader: ${reader?.full_name || readerName}\nSale: ${sale?.full_name || saleName}`);
      } catch (error) {
        console.error('Error adding sale from bot:', error);
        ctx.reply('❌ Có lỗi xảy ra khi lưu vào database.');
      }
    } else if (newMatch) {
      const customerName = newMatch[1].trim();
      const amount = parseInt(newMatch[2]) * 1000;
      
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const readers = users.filter(u => u.role === 'reader' && u.status !== 'inactive');

        if (readers.length === 0) {
          return ctx.reply('❌ Không tìm thấy reader nào trong hệ thống.');
        }

        const pendingId = Math.random().toString(36).substring(2, 10);
        
        // Try to find if the telegram user is a sale in the system
        const telegramName = ctx.from.first_name || ctx.from.username || 'Bot User';
        const saleUser = users.find(u => u.role === 'sale' && (u.full_name.toLowerCase().includes(telegramName.toLowerCase()) || u.username.toLowerCase() === telegramName.toLowerCase()));
        const saleName = saleUser ? saleUser.id : telegramName;

        pendingSales.set(pendingId, { customerName, amount, saleName });

        // Create inline keyboard buttons for readers
        const buttons = [];
        for (let i = 0; i < readers.length; i += 2) {
          const row = [];
          row.push(Markup.button.callback(readers[i].full_name, `reader_${pendingId}_${readers[i].id}`));
          if (i + 1 < readers.length) {
            row.push(Markup.button.callback(readers[i + 1].full_name, `reader_${pendingId}_${readers[i + 1].id}`));
          }
          buttons.push(row);
        }

        ctx.reply(`Khách: ${customerName}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ\n\nVui lòng chọn Reader:`, Markup.inlineKeyboard(buttons));
      } catch (error) {
        console.error('Error fetching readers:', error);
        ctx.reply('❌ Có lỗi xảy ra khi lấy danh sách reader.');
      }
    } else {
      ctx.reply('❌ Sai cú pháp. Vui lòng nhập theo mẫu:\n[Tên Khách] [Số tiền]k\nVí dụ: Ngọc Tiến 169k');
    }
  });

  bot.action(/^reader_(.+)_(.+)$/, async (ctx) => {
    const pendingId = ctx.match[1];
    const readerId = ctx.match[2];

    const pendingSale = pendingSales.get(pendingId);
    if (!pendingSale) {
      return ctx.answerCbQuery('❌ Giao dịch này đã hết hạn hoặc không tồn tại.', { show_alert: true });
    }

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const reader = users.find(u => u.id === readerId);
      const sale = users.find(u => u.id === pendingSale.saleName);

      const saleRecord = {
        customer_name: pendingSale.customerName,
        amount: pendingSale.amount,
        reader_id: readerId,
        sale_id: pendingSale.saleName,
        package_name: 'Gói Tuỳ Chỉnh (Từ Bot)',
        tip: 0,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'sales'), saleRecord);
      pendingSales.delete(pendingId);

      // Edit the message to show success
      await ctx.editMessageText(`✅ Đã thêm doanh thu thành công!\nKhách: ${pendingSale.customerName}\nSố tiền: ${pendingSale.amount.toLocaleString('vi-VN')}đ\nReader: ${reader?.full_name || readerId}\nSale: ${sale?.full_name || pendingSale.saleName}`);
      
      ctx.answerCbQuery('Đã lưu doanh thu!');
    } catch (error) {
      console.error('Error adding sale from bot:', error);
      ctx.answerCbQuery('❌ Có lỗi xảy ra khi lưu vào database.', { show_alert: true });
    }
  });

  bot.launch().then(() => {
    console.log('Telegram bot is running...');
  }).catch(err => {
    console.error('Failed to launch Telegram bot:', err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
} else {
  console.log('TELEGRAM_BOT_TOKEN is not set. Bot is disabled.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bot_active: !!botToken });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
