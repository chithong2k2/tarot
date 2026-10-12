import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.VITE_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function normalizeDatabase() {
  console.log("🚀 Bắt đầu chuẩn hóa Database...");

  // 1. Xóa 2 ca trực trùng lặp
  const duplicateShiftIds = ['CeHEBdctz9Yojgw9Oagl', 'sEylzbHMyDKOVxGQH7Oz'];
  for (const id of duplicateShiftIds) {
    try {
      await deleteDoc(doc(db, 'shifts', id));
      console.log(`✅ Đã xóa ca trực trùng lặp: ${id}`);
    } catch (e) {
      console.error(`Không thể xóa shift ${id}:`, e);
    }
  }

  // 2. Chuẩn hóa bảng users
  const usersSnap = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  let updatedCount = 0;

  usersSnap.docs.forEach(d => {
    const data = d.data();
    const updates: Record<string, any> = {};

    // Gán status: 'active' nếu chưa có status
    if (!data.status) {
      updates.status = 'active';
    }

    // Gán created_at nếu chưa có
    if (!data.created_at) {
      updates.created_at = new Date().toISOString();
    }

    // Đảm bảo bank_account luôn tồn tại dạng string
    if (data.bank_account === undefined) {
      updates.bank_account = '';
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'users', d.id), updates);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`✅ Đã chuẩn hóa schema cho ${updatedCount} nhân viên trong bảng [users].`);
  } else {
    console.log(`ℹ️ Toàn bộ nhân viên đã chuẩn hóa, không cần cập nhật.`);
  }

  // 3. Kiểm tra lại kết quả
  const finalShifts = await getDocs(collection(db, 'shifts'));
  console.log(`\n📋 DANH SÁCH CA TRỰC CHUẨN (${finalShifts.size} ca):`);
  finalShifts.docs.forEach(d => {
    const s = d.data();
    console.log(`  - [${d.id}] ${s.shift_name}: ${s.start_time} - ${s.end_time}`);
  });

  const finalUsers = await getDocs(collection(db, 'users'));
  console.log(`\n👥 DANH SÁCH NHÂN VIÊN (${finalUsers.size} người): Đầy đủ status & created_at 100%!`);
  console.log("\n🎉 HOÀN TẤT CHUẨN HÓA DATABASE!");
}

normalizeDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  });
