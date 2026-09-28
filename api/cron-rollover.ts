import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyA9avmK4ed3JDBzRCVh0-602BoLVU8Cgn8",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "tarot-5719b.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "tarot-5719b",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "tarot-5719b.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "30679561256",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:30679561256:web:392561ac7f849bbe2f311d",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req: any, res: any) {
  try {
    const nowVN = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const day = nowVN.getDay();
    const diff = nowVN.getDate() - day + (day === 0 ? -6 : 1);
    const currentMon = new Date(nowVN);
    currentMon.setDate(diff);
    currentMon.setHours(0, 0, 0, 0);

    const prevMon = new Date(currentMon);
    prevMon.setDate(currentMon.getDate() - 7);
    prevMon.setHours(0, 0, 0, 0);

    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);
    prevSun.setHours(23, 59, 59, 999);

    const formatYMD = (d: Date) => {
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    };

    const formatDM = (d: Date) => {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const startYMD = formatYMD(prevMon);
    const endYMD = formatYMD(prevSun);
    const periodId = `payroll_${startYMD}`;
    const periodTitle = `Tuần (${formatDM(prevMon)} - ${formatDM(prevSun)})`;

    console.log(`[Vercel Cron] 0:00 Monday auto-archive for week: ${periodTitle} (${startYMD} to ${endYMD})`);

    const existingSnap = await getDoc(doc(db, 'payrolls', periodId));
    let archived = false;

    if (!existingSnap.exists()) {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const salesSnap = await getDocs(collection(db, 'sales'));
      const allSales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const weekSales = allSales.filter(s => s.date >= startYMD && s.date <= endYMD);

      const adsSnap = await getDocs(collection(db, 'ad_history'));
      const allAds = adsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const weekAdSpend = allAds
        .filter(h => h.date >= startYMD && h.date <= endYMD)
        .reduce((sum, h) => sum + (parseFloat(h.spend) || 0), 0);

      const activeStaff = users.filter(u => u.status !== 'inactive' && u.role !== 'manager');
      const staffItems: any[] = [];

      for (const u of activeStaff) {
        const uId = String(u.id || '').trim().toLowerCase();
        const uName = String(u.full_name || '').trim().toLowerCase();

        const userSales = weekSales.filter(s => {
          const rId = String(s.reader_id || s.reader_name || '').trim().toLowerCase();
          const sId = String(s.sale_id || s.sale_name || '').trim().toLowerCase();
          if (u.role === 'reader') return rId === uId || rId === uName;
          if (u.role === 'sale') return sId === uId || sId === uName;
          return false;
        });

        const totalAmount = userSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const totalTip = u.role === 'reader' 
          ? userSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0)
          : 0;
        const commission = Math.round(totalAmount * (Number(u.commission_percent || 0) / 100));
        const netPayout = commission + totalTip;

        staffItems.push({
          user_id: u.id,
          user_name: u.full_name,
          role: u.role,
          bank_name: u.bank_name || 'MBBank',
          bank_account: u.bank_account || '',
          commission_percent: u.commission_percent || 0,
          total_amount: totalAmount,
          total_tip: totalTip,
          commission,
          net_payout: netPayout,
          is_paid: false
        });
      }

      const totalRevenue = weekSales.reduce(
        (sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0),
        0
      );
      const totalPayout = staffItems.reduce((sum, i) => sum + i.net_payout, 0);
      const ownerNetProfit = totalRevenue - totalPayout - weekAdSpend;

      await setDoc(doc(db, 'payrolls', periodId), {
        id: periodId,
        title: periodTitle,
        start_date: startYMD,
        end_date: endYMD,
        total_revenue: totalRevenue,
        total_payout: totalPayout,
        total_ad_spend: weekAdSpend,
        owner_net_profit: ownerNetProfit,
        items: staffItems,
        created_at: new Date().toISOString(),
        auto_archived: true
      });
      archived = true;
    }

    // Reset shift schedule for the fresh week
    const batch = writeBatch(db);
    const readerShifts = await getDocs(collection(db, 'reader_shifts'));
    readerShifts.forEach(d => batch.delete(d.ref));

    const saleShifts = await getDocs(collection(db, 'sale_shifts'));
    saleShifts.forEach(d => batch.delete(d.ref));
    await batch.commit();

    return res.status(200).json({
      success: true,
      message: `Tự động lưu kỳ lương ${periodId} và reset ca trực tuần mới thành công!`,
      archived,
      periodId
    });
  } catch (err: any) {
    console.error("[Vercel Cron Error]", err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
}
