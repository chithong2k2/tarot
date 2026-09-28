import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc,
  getDoc,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, SaleRecord, Shift, ShiftRegistration, OperatingCost, SystemSettings, AdHistoryRecord, PayrollPeriod, PayrollStaffItem } from '../types';
import { getVNMonday, getVNTime } from '../utils/dateUtils';

// Helper to check if Firebase is configured
const isFirebaseReady = () => !!db;

export interface FirebaseResponse {
  success: boolean;
  message?: string;
  id?: string;
  user?: User;
  data?: any;
}

export const firebaseService = {
  // --- Initialization & Data Fetching ---
  getInitialData: async (): Promise<{ status: string; data?: any; message?: string }> => {
    if (!isFirebaseReady()) return { status: 'error', message: 'Firebase not configured' };
    
    try {
      const [
        usersSnap, 
        salesSnap, 
        shiftsSnap, 
        readerShiftsSnap, 
        saleShiftsSnap,
        costsSnap,
        settingsSnap,
        adHistorySnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'sales'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'shifts'), orderBy('start_time'))),
        getDocs(collection(db, 'reader_shifts')),
        getDocs(collection(db, 'sale_shifts')),
        getDocs(query(collection(db, 'operating_costs'), orderBy('date', 'desc'))),
        getDoc(doc(db, 'settings', 'global')),
        getDocs(query(collection(db, 'ad_history'), orderBy('date', 'desc')))
      ]);

      return {
        status: 'ok',
        data: {
          users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
          sales: salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SaleRecord)),
          shifts: shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)),
          readerShifts: readerShiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRegistration)),
          saleShifts: saleShiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRegistration)),
          costs: costsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OperatingCost)),
          settings: settingsSnap.exists() ? { id: settingsSnap.id, ...settingsSnap.data() } : { id: 'global', is_locked: false },
          adHistory: adHistorySnap.docs.map(d => ({ id: d.id, ...d.data() } as AdHistoryRecord))
        }
      };
    } catch (error) {
      console.error("Error fetching initial data:", error);
      throw error;
    }
  },

  // --- Auth ---
  login: async (username: string, password: string): Promise<FirebaseResponse> => {
    console.log("[FirebaseService] Login attempt for:", username);
    if (!isFirebaseReady()) {
      console.error("[FirebaseService] Firebase not ready");
      return { success: false, message: 'Hệ thống chưa kết nối được database' };
    }
    
    try {
      // First, check if users collection is empty to guide the user
      const allUsers = await getDocs(collection(db, 'users'));
      if (allUsers.empty) {
        console.warn("[FirebaseService] Users collection is empty");
        return { success: false, message: 'Database trống. Vui lòng nhấn "Khởi tạo hệ thống" ở phía dưới trước.' };
      }

      const q = query(
        collection(db, 'users'), 
        where('username', '==', username.trim()), 
        where('password', '==', password.trim())
      );
      
      const snap = await getDocs(q);
      console.log("[FirebaseService] Login query result empty:", snap.empty);
      
      if (!snap.empty) {
        const userData = snap.docs[0].data() as User;
        console.log("[FirebaseService] Login success for:", userData.full_name);
        return { success: true, user: { id: snap.docs[0].id, ...userData } };
      }
      
      return { success: false, message: 'Sai tài khoản hoặc mật khẩu (Lưu ý: Phân biệt chữ hoa/thường)' };
    } catch (error) {
      console.error("[FirebaseService] Login error:", error);
      return { success: false, message: 'Lỗi hệ thống: ' + (error instanceof Error ? error.message : String(error)) };
    }
  },

  // --- User Management ---
  getUsers: async () => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
  },

  addUser: async (userData: Partial<User>): Promise<FirebaseResponse> => {
    const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      created_at: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  },

  updateUser: async (userData: User): Promise<FirebaseResponse> => {
    const { id, ...data } = userData;
    await updateDoc(doc(db, 'users', id), data);
    return { success: true };
  },

  updateUserProfile: async (userId: string, data: Partial<User>): Promise<FirebaseResponse> => {
    try {
      if (!userId) throw new Error("User ID is required");
      await updateDoc(doc(db, 'users', userId), data);
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] updateUserProfile error:", error);
      let message = "Cập nhật thất bại";
      if (error instanceof Error) {
        if (error.message.includes("too large")) {
          message = "Dữ liệu quá lớn (Ảnh đại diện vượt quá giới hạn 1MB của database)";
        } else if (error.message.includes("permission-denied")) {
          message = "Bạn không có quyền cập nhật thông tin này";
        } else {
          message = error.message;
        }
      }
      return { success: false, message };
    }
  },

  deactivateUser: async (id: string): Promise<FirebaseResponse> => {
    await updateDoc(doc(db, 'users', id), { status: 'inactive' });
    return { success: true };
  },

  deleteUserPermanently: async (id: string): Promise<FirebaseResponse> => {
    const batch = writeBatch(db);
    
    // 1. Delete user document
    batch.delete(doc(db, 'users', id));
    
    // 2. Delete shift registrations
    const rShifts = await getDocs(query(collection(db, 'reader_shifts'), where('user_id', '==', id)));
    rShifts.forEach(d => batch.delete(d.ref));
    
    const sShifts = await getDocs(query(collection(db, 'sale_shifts'), where('user_id', '==', id)));
    sShifts.forEach(d => batch.delete(d.ref));
    
    await batch.commit();
    return { success: true };
  },

  // --- Sale Records ---
  addSaleRecord: async (record: Partial<SaleRecord>): Promise<FirebaseResponse> => {
    const docRef = await addDoc(collection(db, 'sales'), {
      ...record,
      created_at: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  },

  updateSaleRecord: async (record: SaleRecord): Promise<FirebaseResponse> => {
    const { id, ...data } = record;
    await updateDoc(doc(db, 'sales', id), data);
    return { success: true };
  },

  deleteSaleRecord: async (id: string): Promise<FirebaseResponse> => {
    try {
      console.log("[FirebaseService] Deleting sale record:", id);
      if (!id) throw new Error("ID is required for deletion");
      await deleteDoc(doc(db, 'sales', id));
      console.log("[FirebaseService] Sale record deleted successfully");
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] Delete sale record error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  // --- Operating Costs ---
  addOperatingCost: async (cost: Partial<OperatingCost>): Promise<FirebaseResponse> => {
    const docRef = await addDoc(collection(db, 'operating_costs'), {
      ...cost,
      created_at: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  },

  updateOperatingCost: async (cost: OperatingCost): Promise<FirebaseResponse> => {
    const { id, ...data } = cost;
    await updateDoc(doc(db, 'operating_costs', id), data);
    return { success: true };
  },

  deleteOperatingCost: async (id: string): Promise<FirebaseResponse> => {
    await deleteDoc(doc(db, 'operating_costs', id));
    return { success: true };
  },

  // --- Shift Management ---
  getShifts: async () => {
    const snap = await getDocs(query(collection(db, 'shifts'), orderBy('start_time')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  },

  createShift: async (shift: Partial<Shift>): Promise<FirebaseResponse> => {
    const docRef = await addDoc(collection(db, 'shifts'), shift);
    return { success: true, id: docRef.id };
  },

  updateShift: async (shift: Shift): Promise<FirebaseResponse> => {
    const { id, ...data } = shift;
    await updateDoc(doc(db, 'shifts', id), data);
    return { success: true };
  },

  deleteShift: async (id: string): Promise<FirebaseResponse> => {
    await deleteDoc(doc(db, 'shifts', id));
    return { success: true };
  },

  // --- Shift Registration ---
  registerReaderShift: async (registration: Partial<ShiftRegistration>): Promise<FirebaseResponse> => {
    // Unique ID to prevent double registration: day_shift_user
    const id = `${registration.day_of_week}_${registration.shift_id}_${registration.user_id}`;
    await setDoc(doc(db, 'reader_shifts', id), registration);
    return { success: true };
  },

  deleteReaderShift: async (id: string): Promise<FirebaseResponse> => {
    await deleteDoc(doc(db, 'reader_shifts', id));
    return { success: true };
  },

  registerSaleShift: async (registration: Partial<ShiftRegistration>): Promise<FirebaseResponse> => {
    const id = `${registration.day_of_week}_${registration.shift_id}_${registration.user_id}`;
    await setDoc(doc(db, 'sale_shifts', id), registration);
    return { success: true };
  },

  deleteSaleShift: async (id: string): Promise<FirebaseResponse> => {
    await deleteDoc(doc(db, 'sale_shifts', id));
    return { success: true };
  },

  // --- System Settings ---
  updateSettings: async (settings: Partial<SystemSettings>): Promise<FirebaseResponse> => {
    await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
    return { success: true };
  },

  // --- Seeding ---
  seedDatabase: async (): Promise<FirebaseResponse> => {
    console.log("[FirebaseService] seedDatabase started");
    if (!isFirebaseReady()) {
      console.error("[FirebaseService] Firebase not ready (db is null)");
      return { success: false, message: 'Firebase not configured' };
    }
    
    try {
      // 1. Clear existing data that might conflict or cause confusion
      const salesSnap = await getDocs(collection(db, 'sales'));
      const usersSnap = await getDocs(collection(db, 'users'));
      const rShiftsSnap = await getDocs(collection(db, 'reader_shifts'));
      const sShiftsSnap = await getDocs(collection(db, 'sale_shifts'));
      const settingsSnap = await getDocs(collection(db, 'settings'));
      
      const deleteBatch = writeBatch(db);
      salesSnap.forEach(d => deleteBatch.delete(d.ref));
      usersSnap.forEach(d => deleteBatch.delete(d.ref));
      rShiftsSnap.forEach(d => deleteBatch.delete(d.ref));
      sShiftsSnap.forEach(d => deleteBatch.delete(d.ref));
      settingsSnap.forEach(d => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
      console.log("[FirebaseService] Existing data cleared");

      const batch = writeBatch(db);
      console.log("[FirebaseService] Batch created for new data");
      
      // Global Settings
      const settingsRef = doc(db, 'settings', 'global');
      batch.set(settingsRef, { is_locked: false });

      // Default Admin
      const adminRef = doc(db, 'users', 'admin_default');
      batch.set(adminRef, {
        username: 'admin',
        password: 'admin',
        role: 'manager',
        full_name: 'Administrator',
        commission_percent: 0,
        status: 'active',
        created_at: new Date().toISOString()
      });
      console.log("[FirebaseService] Added admin to batch");

      // Default Sale User
      const saleRef = doc(db, 'users', 'sale_default');
      batch.set(saleRef, {
        username: 'sale',
        password: '123',
        role: 'sale',
        full_name: 'Nhân Viên Sale',
        commission_percent: 10,
        status: 'active',
        created_at: new Date().toISOString()
      });
      console.log("[FirebaseService] Added sale user to batch");

      // Default Reader User
      const readerRef = doc(db, 'users', 'reader_default');
      batch.set(readerRef, {
        username: 'reader',
        password: '123',
        role: 'reader',
        full_name: 'Nhân Viên Reader',
        commission_percent: 30,
        status: 'active',
        created_at: new Date().toISOString()
      });
      console.log("[FirebaseService] Added reader user to batch");

      // Default Shifts
      const shifts = [
        { id: 'shift_1', shift_name: 'Ca Sáng', start_time: '09:00', end_time: '13:00' },
        { id: 'shift_2', shift_name: 'Ca Chiều', start_time: '13:00', end_time: '17:00' },
        { id: 'shift_3', shift_name: 'Ca Tối', start_time: '17:00', end_time: '21:00' }
      ];

      shifts.forEach(s => {
        const ref = doc(db, 'shifts', s.id);
        batch.set(ref, s);
      });
      console.log("[FirebaseService] Added shifts to batch");

      // Mock Shift Registrations
      const days: ('Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật')[] = 
        ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      
      days.forEach(day => {
        // Register Reader
        const rId = `reader_${day.replace(' ', '_')}`;
        batch.set(doc(db, 'reader_shifts', rId), {
          user_id: 'reader_default',
          shift_id: 'shift_1',
          day_of_week: day
        });
        
        // Register Sale
        const sId = `sale_${day.replace(' ', '_')}`;
        batch.set(doc(db, 'sale_shifts', sId), {
          user_id: 'sale_default',
          shift_id: 'shift_1',
          day_of_week: day
        });
      });
      console.log("[FirebaseService] Added mock registrations to batch");

      // Mock 50 Sale Records
      const readerIds = ['reader_default', 'reader_a', 'reader_b'];
      const saleIds = ['sale_default', 'sale_x', 'sale_y'];
      const packages = [
        { name: 'Gói 1 câu hỏi', price: 50000 },
        { name: 'Gói 30 phút', price: 200000 },
        { name: 'Gói 60 phút', price: 350000 },
        { name: 'Gói Chuyên Sâu', price: 500000 }
      ];
      const customers = ['Anh Hoàng', 'Chị Lan', 'Minh Anh', 'Khánh Vy', 'Tuấn Kiệt', 'Bảo Ngọc', 'Gia Huy', 'Thanh Thảo'];

      // Add the extra users to match the names used in mock sales
      const extraUsers = [
        { id: 'reader_a', username: 'readera', password: '123', role: 'reader', full_name: 'Reader A', commission_percent: 30 },
        { id: 'reader_b', username: 'readerb', password: '123', role: 'reader', full_name: 'Reader B', commission_percent: 30 },
        { id: 'sale_x', username: 'salex', password: '123', role: 'sale', full_name: 'Sale X', commission_percent: 10 },
        { id: 'sale_y', username: 'saley', password: '123', role: 'sale', full_name: 'Sale Y', commission_percent: 10 },
      ];

      extraUsers.forEach(u => {
        batch.set(doc(db, 'users', u.id), {
          ...u,
          status: 'active',
          created_at: new Date().toISOString()
        });
      });

      for (let i = 0; i < 50; i++) {
        const readerId = readerIds[Math.floor(Math.random() * readerIds.length)];
        const saleId = saleIds[Math.floor(Math.random() * saleIds.length)];
        const pkg = packages[Math.floor(Math.random() * packages.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        // Random date in the last 7 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        const dateStr = date.toISOString().split('T')[0];

        const amount = pkg.price;
        const tip = Math.random() > 0.7 ? Math.floor(Math.random() * 5) * 10000 : 0;

        const saleRef = doc(collection(db, 'sales'));
        batch.set(saleRef, {
          reader_id: readerId,
          sale_id: saleId,
          customer_name: customer,
          package_name: pkg.name,
          amount: amount,
          tip: tip,
          date: dateStr,
          created_at: new Date().toISOString()
        });
      }
      console.log("[FirebaseService] Added 50 mock sale records to batch");

      console.log("[FirebaseService] Committing batch...");
      await batch.commit();
      console.log("[FirebaseService] Batch committed successfully");
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] seedDatabase error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  // --- Data Migration ---
  migrateData: async (): Promise<FirebaseResponse> => {
    try {
      const batch = writeBatch(db);
      let count = 0;

      // 1. Migrate Sales
      const salesSnap = await getDocs(collection(db, 'sales'));
      salesSnap.forEach(d => {
        const data = d.data();
        if (!data.created_at) {
          // Use the 'date' field as a fallback for created_at
          const fallbackDate = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
          batch.update(d.ref, { created_at: fallbackDate });
          count++;
        }
      });

      // 2. Migrate Operating Costs
      const costsSnap = await getDocs(collection(db, 'operating_costs'));
      costsSnap.forEach(d => {
        const data = d.data();
        if (!data.created_at) {
          const fallbackDate = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
          batch.update(d.ref, { created_at: fallbackDate });
          count++;
        }
      });

      // 3. Migrate Users
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        const data = d.data();
        if (!data.created_at) {
          batch.update(d.ref, { created_at: new Date().toISOString() });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
      
      return { success: true, message: `Đã cập nhật ${count} bản ghi.` };
    } catch (error) {
      console.error("[FirebaseService] Migration error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  // --- Ad History ---
  saveAdHistory: async (record: Omit<AdHistoryRecord, 'id'>): Promise<FirebaseResponse> => {
    try {
      // Use date as ID to ensure one record per day
      const id = record.date;
      await setDoc(doc(db, 'ad_history', id), {
        ...record,
        updated_at: new Date().toISOString()
      }, { merge: true });
      return { success: true, id };
    } catch (error) {
      console.error("[FirebaseService] saveAdHistory error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  getAdHistory: async (): Promise<AdHistoryRecord[]> => {
    const snap = await getDocs(query(collection(db, 'ad_history'), orderBy('date', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdHistoryRecord));
  },

  saveWeeklyAdCost: async (dayOfWeek: string, spend: number, date: string): Promise<FirebaseResponse> => {
    try {
      // Save to a specific collection for weekly tracking if needed
      // But also update the main ad_history for that date
      const id = `${date}_${dayOfWeek}`;
      await setDoc(doc(db, 'weekly_ad_costs', id), {
        dayOfWeek,
        spend,
        date,
        updated_at: new Date().toISOString()
      });

      // Also update ad_history to keep everything in sync
      await setDoc(doc(db, 'ad_history', date), {
        date,
        spend,
        updated_at: new Date().toISOString()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] saveWeeklyAdCost error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  getWeeklyAdCosts: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, 'weekly_ad_costs'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // --- System & Weekly Automation ---
  clearWeeklyShifts: async (): Promise<FirebaseResponse> => {
    if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
    try {
      const batch = writeBatch(db);
      const readerShifts = await getDocs(collection(db, 'reader_shifts'));
      readerShifts.forEach(d => batch.delete(d.ref));
      const saleShifts = await getDocs(collection(db, 'sale_shifts'));
      saleShifts.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.error("[FirebaseService] clearWeeklyShifts error:", err);
      return { success: false, message: err?.message || String(err) };
    }
  },

  checkAndAutoRolloverWeek: async (
    sales: SaleRecord[],
    users: User[],
    adHistory: AdHistoryRecord[],
    payrollPeriods: PayrollPeriod[],
    fetchData: () => Promise<void> | void
  ): Promise<boolean> => {
    try {
      const currentMonday = getVNMonday();
      currentMonday.setHours(0, 0, 0, 0);

      // Previous week Monday (00:00:00) and Sunday (23:59:59)
      const prevMonday = new Date(currentMonday);
      prevMonday.setDate(currentMonday.getDate() - 7);
      prevMonday.setHours(0, 0, 0, 0);

      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevMonday.getDate() + 6);
      prevSunday.setHours(23, 59, 59, 999);

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

      const startYMD = formatYMD(prevMonday);
      const endYMD = formatYMD(prevSunday);
      const periodId = `payroll_${startYMD}`;

      // Check if previous week was already archived in Firestore or processed locally
      const alreadySaved = payrollPeriods.some(p => p.id === periodId || (p.start_date === startYMD && p.end_date === endYMD));
      const lastArchivedKey = localStorage.getItem('tarot_last_auto_archive_week');

      if (alreadySaved && lastArchivedKey === startYMD) {
        return false;
      }

      // Filter sales and adHistory for that previous week
      const prevWeekSales = sales.filter(s => s.date >= startYMD && s.date <= endYMD);
      const prevWeekAds = (adHistory || []).filter(h => h.date >= startYMD && h.date <= endYMD);

      // If already saved or no activity at all from previous week, just mark local flag
      if (alreadySaved || (prevWeekSales.length === 0 && prevWeekAds.length === 0)) {
        if (lastArchivedKey !== startYMD) {
          await firebaseService.clearWeeklyShifts();
          try {
            localStorage.removeItem('tarot_current_payroll_paid');
          } catch {}
          localStorage.setItem('tarot_last_auto_archive_week', startYMD);
          await fetchData();
        }
        return false;
      }

      console.log(`[Auto-Rollover] 0:00 Monday auto-archive triggered for week: ${startYMD} - ${endYMD}`);

      const prevWeekTotalRevenue = prevWeekSales.reduce(
        (sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0),
        0
      );

      const prevWeekAdSpend = prevWeekAds.reduce(
        (sum, h) => sum + (Number(h.spend) || 0),
        0
      );

      const staffItems: PayrollStaffItem[] = [];
      users.filter(u => u.status !== 'inactive' && u.role !== 'manager').forEach(u => {
        const uId = u.id.trim().toLowerCase();
        const uName = u.full_name.trim().toLowerCase();

        const userSales = prevWeekSales.filter(s => {
          const rId = String(s.reader_id || (s as any).reader_name || '').trim().toLowerCase();
          const sId = String(s.sale_id || (s as any).sale_name || '').trim().toLowerCase();
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
          commission_percent: u.commission_percent,
          total_amount: totalAmount,
          total_tip: totalTip,
          commission,
          net_payout: netPayout,
          is_paid: false
        });
      });

      const totalPayout = staffItems.reduce((sum, i) => sum + i.net_payout, 0);
      const ownerNetProfit = prevWeekTotalRevenue - totalPayout - prevWeekAdSpend;
      const periodTitle = `Tuần (${formatDM(prevMonday)} - ${formatDM(prevSunday)})`;

      const newPeriod: PayrollPeriod = {
        id: periodId,
        title: periodTitle,
        start_date: startYMD,
        end_date: endYMD,
        total_revenue: prevWeekTotalRevenue,
        total_payout: totalPayout,
        total_ad_spend: prevWeekAdSpend,
        owner_net_profit: ownerNetProfit,
        items: staffItems,
        created_at: new Date().toISOString()
      };

      await firebaseService.savePayrollPeriod(newPeriod);
      await firebaseService.clearWeeklyShifts();

      try {
        localStorage.removeItem('tarot_current_payroll_paid');
      } catch {}
      localStorage.setItem('tarot_last_auto_archive_week', startYMD);

      console.log(`[Auto-Rollover] Archived previous week ${periodId} & reset shift schedule for new week.`);
      await fetchData();
      return true;
    } catch (err) {
      console.error("[Auto-Rollover] Error:", err);
      return false;
    }
  },

  resetWeek: async (): Promise<FirebaseResponse> => {
    // Kept for backward compatibility: safe clear of shift schedule
    return firebaseService.clearWeeklyShifts();
  },

  // --- Payroll Management ---
  savePayrollPeriod: async (period: PayrollPeriod): Promise<FirebaseResponse> => {
    try {
      if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
      const id = period.id || `period_${Date.now()}`;
      await setDoc(doc(db, 'payrolls', id), {
        ...period,
        id,
        created_at: period.created_at || new Date().toISOString()
      });
      return { success: true, id };
    } catch (error) {
      console.error("[FirebaseService] savePayrollPeriod error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  getPayrollPeriods: async (): Promise<PayrollPeriod[]> => {
    if (!isFirebaseReady()) return [];
    try {
      const snap = await getDocs(query(collection(db, 'payrolls'), orderBy('created_at', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollPeriod));
    } catch (error) {
      console.error("[FirebaseService] getPayrollPeriods error:", error);
      return [];
    }
  },

  deletePayrollPeriod: async (id: string): Promise<FirebaseResponse> => {
    try {
      if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
      await deleteDoc(doc(db, 'payrolls', id));
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] deletePayrollPeriod error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  updatePayrollItem: async (periodId: string, staffUserId: string, updates: Partial<PayrollStaffItem>): Promise<FirebaseResponse> => {
    try {
      if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
      const periodRef = doc(db, 'payrolls', periodId);
      const periodSnap = await getDoc(periodRef);
      if (!periodSnap.exists()) return { success: false, message: 'Kỳ lương không tồn tại' };

      const periodData = periodSnap.data() as PayrollPeriod;
      const updatedItems = periodData.items.map(item => {
        if (item.user_id === staffUserId) {
          return { ...item, ...updates };
        }
        return item;
      });

      await updateDoc(periodRef, { items: updatedItems });
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] updatePayrollItem error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  updateStaffBank: async (userId: string, bankName: string, bankAccount: string): Promise<FirebaseResponse> => {
    try {
      if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
      await updateDoc(doc(db, 'users', userId), {
        bank_name: bankName,
        bank_account: bankAccount
      });
      return { success: true };
    } catch (error) {
      console.error("[FirebaseService] updateStaffBank error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  // --- Full Database Backup & Restore ---
  exportFullBackup: async (): Promise<{ success: boolean; backup?: any; message?: string }> => {
    if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
    try {
      const [
        usersSnap, 
        salesSnap, 
        shiftsSnap, 
        readerShiftsSnap, 
        saleShiftsSnap,
        costsSnap,
        settingsSnap,
        adHistorySnap,
        payrollsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'shifts')),
        getDocs(collection(db, 'reader_shifts')),
        getDocs(collection(db, 'sale_shifts')),
        getDocs(collection(db, 'operating_costs')),
        getDoc(doc(db, 'settings', 'global')),
        getDocs(collection(db, 'ad_history')),
        getDocs(collection(db, 'payrolls'))
      ]);

      const backup = {
        app_name: 'Tarot Shop Management',
        version: '1.0',
        exported_at: new Date().toISOString(),
        collections: {
          users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          sales: salesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          shifts: shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          reader_shifts: readerShiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          sale_shifts: saleShiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          operating_costs: costsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          settings: settingsSnap.exists() ? settingsSnap.data() : null,
          ad_history: adHistorySnap.docs.map(d => ({ id: d.id, ...d.data() })),
          payrolls: payrollsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        },
        stats: {
          total_users: usersSnap.size,
          total_sales: salesSnap.size,
          total_shifts: shiftsSnap.size,
          total_costs: costsSnap.size,
          total_ad_days: adHistorySnap.size,
          total_payrolls: payrollsSnap.size
        }
      };

      return { success: true, backup };
    } catch (error) {
      console.error("[FirebaseService] exportFullBackup error:", error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },

  restoreFullBackup: async (backupData: any): Promise<FirebaseResponse> => {
    if (!isFirebaseReady()) return { success: false, message: 'Database chưa kết nối' };
    if (!backupData || !backupData.collections) {
      return { success: false, message: 'File sao lưu không hợp lệ hoặc thiếu dữ liệu' };
    }

    try {
      const collections = backupData.collections;

      const batchWriteCollection = async (collName: string, items: any[]) => {
        if (!items || !Array.isArray(items) || items.length === 0) return;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
          const chunk = items.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const { id, ...data } = item;
            if (id) {
              batch.set(doc(db, collName, id), data, { merge: true });
            } else {
              const newRef = doc(collection(db, collName));
              batch.set(newRef, data);
            }
          }
          await batch.commit();
        }
      };

      if (collections.users) await batchWriteCollection('users', collections.users);
      if (collections.sales) await batchWriteCollection('sales', collections.sales);
      if (collections.shifts) await batchWriteCollection('shifts', collections.shifts);
      if (collections.reader_shifts) await batchWriteCollection('reader_shifts', collections.reader_shifts);
      if (collections.sale_shifts) await batchWriteCollection('sale_shifts', collections.sale_shifts);
      if (collections.operating_costs) await batchWriteCollection('operating_costs', collections.operating_costs);
      if (collections.ad_history) await batchWriteCollection('ad_history', collections.ad_history);
      if (collections.payrolls) await batchWriteCollection('payrolls', collections.payrolls);

      if (collections.settings) {
        await setDoc(doc(db, 'settings', 'global'), collections.settings, { merge: true });
      }

      return { 
        success: true, 
        message: `Khôi phục thành công! (${backupData.stats?.total_sales || collections.sales?.length || 0} đơn hàng, ${backupData.stats?.total_users || collections.users?.length || 0} nhân sự)` 
      };
    } catch (error) {
      console.error("[FirebaseService] restoreFullBackup error:", error);
      return { success: false, message: 'Lỗi khôi phục: ' + (error instanceof Error ? error.message : String(error)) };
    }
  },

  // --- Real-time Listeners (Optional but recommended) ---
  subscribeToInitialData: (callback: (data: any) => void) => {
    if (!isFirebaseReady()) return () => {};

    // This is a complex listener, usually better to listen to specific collections
    // For simplicity in migration, we'll stick to manual fetch or simple listeners
    return onSnapshot(collection(db, 'sales'), () => {
      firebaseService.getInitialData().then(res => {
        if (res.status === 'ok') callback(res.data);
      });
    });
  }
};
