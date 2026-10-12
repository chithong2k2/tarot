import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
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

async function cleanDatabase() {
  console.log("🚀 Bắt đầu quá trình dọn dẹp Firebase Database...");

  // Collections to wipe completely
  const collectionsToClean = [
    'sales',
    'ad_history',
    'reader_shifts',
    'sale_shifts',
    'operating_costs',
    'weekly_ad_costs'
  ];

  let totalDeleted = 0;

  for (const collName of collectionsToClean) {
    const snap = await getDocs(collection(db, collName));
    if (snap.empty) {
      console.log(`ℹ️ Collection [${collName}] trống, bỏ qua.`);
      continue;
    }

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(doc(db, collName, d.id));
    });

    await batch.commit();
    console.log(`✅ Đã xóa sạch ${snap.size} bản ghi trong collection [${collName}].`);
    totalDeleted += snap.size;
  }

  // Verify users are safe
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`\n🛡️ KIỂM TRA BẢO TOÀN DỮ LIỆU:`);
  console.log(`✅ Collection [users]: Còn nguyên vẹn 100% (${usersSnap.size} nhân viên).`);
  
  // Verify shifts are safe
  const shiftsSnap = await getDocs(collection(db, 'shifts'));
  console.log(`✅ Collection [shifts]: Còn nguyên vẹn 100% (${shiftsSnap.size} ca trực).`);

  console.log(`\n🎉 HOÀN TẤT DỌN DẸP! Tổng cộng đã xóa: ${totalDeleted} bản ghi rác.`);
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Lỗi dọn dẹp:", err);
    process.exit(1);
  });
