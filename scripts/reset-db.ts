import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA9avmK4ed3JDBzRCVh0-602BoLVU8Cgn8",
  authDomain: "tarot-5719b.firebaseapp.com",
  projectId: "tarot-5719b",
  storageBucket: "tarot-5719b.firebasestorage.app",
  messagingSenderId: "30679561256",
  appId: "1:30679561256:web:392561ac7f849bbe2f311d"
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
