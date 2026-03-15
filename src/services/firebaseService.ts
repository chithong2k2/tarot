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
import { User, SaleRecord, Shift, ShiftRegistration, OperatingCost } from '../types';

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
        settingsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'sales'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'shifts'), orderBy('start_time'))),
        getDocs(collection(db, 'reader_shifts')),
        getDocs(collection(db, 'sale_shifts')),
        getDocs(query(collection(db, 'operating_costs'), orderBy('date', 'desc'))),
        getDoc(doc(db, 'settings', 'global'))
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
          settings: settingsSnap.exists() ? { id: settingsSnap.id, ...settingsSnap.data() } : { id: 'global', is_locked: false }
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
    const docRef = await addDoc(collection(db, 'users'), userData);
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
    const docRef = await addDoc(collection(db, 'sales'), record);
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
  updateSettings: async (settings: { is_locked: boolean }): Promise<FirebaseResponse> => {
    await setDoc(doc(db, 'settings', 'global'), settings);
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

  // --- System ---
  resetWeek: async (): Promise<FirebaseResponse> => {
    const batch = writeBatch(db);
    
    // 1. Clear shift registrations
    const readerShifts = await getDocs(collection(db, 'reader_shifts'));
    readerShifts.forEach(d => batch.delete(d.ref));
    
    const saleShifts = await getDocs(collection(db, 'sale_shifts'));
    saleShifts.forEach(d => batch.delete(d.ref));

    // 2. Clear sales records (as requested: "toàn bộ giao dịch của tuần đó sẽ biến mất")
    const sales = await getDocs(collection(db, 'sales'));
    sales.forEach(d => batch.delete(d.ref));

    // 3. Clear operating costs
    const costs = await getDocs(collection(db, 'operating_costs'));
    costs.forEach(d => batch.delete(d.ref));
    
    await batch.commit();
    return { success: true };
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
