import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { User, SaleRecord, DashboardSummary, Shift, ShiftRegistration, OperatingCost, SystemSettings, AdHistoryRecord } from './types';
import { firebaseService } from './services/firebaseService';
import { onSnapshot, collection, query, orderBy, doc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { StaffView } from './components/views/StaffView';
import { SaleEntryView } from './components/views/SaleEntryView';
import { ShiftView } from './components/views/ShiftView';
import { CostsView } from './components/views/CostsView';
import { SettingsView } from './components/views/SettingsView';
import { SalesHistoryView } from './components/views/SalesHistoryView';
import { AdProfitView } from './components/views/AdProfitView';
import { PayrollView } from './components/views/PayrollView';
import { LoginView } from './components/views/LoginView';
import { calculateDashboardSummary, INITIAL_SUMMARY } from './utils/dashboard';
import { getVNDateStr, getVNDayName } from './utils/dateUtils';
import { apiService } from './services/api';
import { Menu, X } from 'lucide-react';
import { PayrollPeriod } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'staff' | 'staff_form' | 'entry' | 'shifts' | 'register_shift' | 'settings' | 'sales_history' | 'ad_profit' | 'payroll' | 'costs'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rawSales, setRawSales] = useState<SaleRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [costs, setCosts] = useState<OperatingCost[]>([]);
  const [adHistory, setAdHistory] = useState<AdHistoryRecord[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [readerSchedule, setReaderSchedule] = useState<ShiftRegistration[]>([]);
  const [saleSchedule, setSaleSchedule] = useState<ShiftRegistration[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ id: 'global', is_locked: false });
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>(() => getVNDayName());
  const [selectedReader, setSelectedReader] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('tarot_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role !== 'manager') return u.id;
      }
    } catch (e) {}
    return 'All';
  });

  // Safety timeout for loading state
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        console.warn("[App] Loading state timed out after 15s");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Real-time listeners
  useEffect(() => {
    if (!db || !user) return;

    console.log("[App] Setting up real-time listeners...");

    const unsubscribers: (() => void)[] = [];

    // 1. Users listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const updatedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(updatedUsers);
      
      // Sync current user
      const currentUserData = updatedUsers.find(u => u.id === user.id);
      if (currentUserData) {
        const activeUser = { ...user, ...currentUserData };
        if (JSON.stringify(activeUser) !== JSON.stringify(user)) {
          setUser(activeUser);
          localStorage.setItem('tarot_user', JSON.stringify(activeUser));
        }
      }
    });
    unsubscribers.push(unsubUsers);

    // 2. Sales listener
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('created_at', 'desc')), (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
      setRawSales(raw);
    });
    unsubscribers.push(unsubSales);

    // 3. Shifts listener
    const unsubShifts = onSnapshot(query(collection(db, 'shifts'), orderBy('start_time')), (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    });
    unsubscribers.push(unsubShifts);

    // 4. Costs listener
    const unsubCosts = onSnapshot(collection(db, 'operating_costs'), (snapshot) => {
      setCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperatingCost)));
    });
    unsubscribers.push(unsubCosts);

    // 5. Ad History listener
    const unsubAdHistory = onSnapshot(collection(db, 'ad_history'), (snapshot) => {
      setAdHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdHistoryRecord)));
    });
    unsubscribers.push(unsubAdHistory);

    // 6. Settings listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ id: snapshot.id, ...snapshot.data() } as SystemSettings);
      }
    });
    unsubscribers.push(unsubSettings);

    // 7. Reader Shifts listener
    const unsubReaderShifts = onSnapshot(collection(db, 'reader_shifts'), (snapshot) => {
      setReaderSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftRegistration)));
    });
    unsubscribers.push(unsubReaderShifts);

    // 8. Sale Shifts listener
    const unsubSaleShifts = onSnapshot(collection(db, 'sale_shifts'), (snapshot) => {
      setSaleSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftRegistration)));
    });
    unsubscribers.push(unsubSaleShifts);

    // 9. Payrolls listener
    const unsubPayrolls = onSnapshot(query(collection(db, 'payrolls'), orderBy('created_at', 'desc')), (snapshot) => {
      setPayrollPeriods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPeriod)));
    });
    unsubscribers.push(unsubPayrolls);

    return () => {
      console.log("[App] Cleaning up real-time listeners...");
      unsubscribers.forEach(unsub => unsub());
    };
  }, [db, user?.id]); // Re-run if user changes (e.g. login/logout)

  // 9. Enrich and filter sales whenever rawSales or users change
  useEffect(() => {
    if (!user) return;

    const enriched = rawSales.map(s => {
      const reader = users.find(u => u.id === s.reader_id || u.full_name === s.reader_id);
      const sale = users.find(u => u.id === s.sale_id || u.full_name === s.sale_id);
      return {
        ...s,
        reader_name: reader?.full_name || s.reader_id || 'N/A',
        sale_name: sale?.full_name || s.sale_id || 'N/A'
      };
    });

    let filtered = enriched;
    if (user.role === 'reader' || user.role === 'sale') {
      const userId = user.id.trim().toLowerCase();
      const userFullName = user.full_name.trim().toLowerCase();
      
      filtered = enriched.filter(s => {
        const readerId = String(s.reader_id || '').trim().toLowerCase();
        const saleId = String(s.sale_id || '').trim().toLowerCase();
        const readerName = String(s.reader_name || '').trim().toLowerCase();
        const saleName = String(s.sale_name || '').trim().toLowerCase();
        
        if (user.role === 'reader') return readerId === userId || readerName === userFullName;
        return saleId === userId || saleName === userFullName;
      });
    }

    setSales(filtered);
    setLoading(false); // Data is loaded
  }, [rawSales, users, user?.id]);

  // Update summary whenever relevant data changes
  useEffect(() => {
    const newSummary = calculateDashboardSummary(sales, users, costs, adHistory);
    setSummary(newSummary);
  }, [sales, users, costs, adHistory]);

  const fetchData = async () => {
    // Data is now handled by real-time listeners
    console.log("[App] fetchData called (real-time listeners are active)");
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('tarot_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role !== 'manager') {
        setSelectedReader(user.id);
      } else {
        setSelectedReader('All');
      }
      fetchData();
    }
  }, [user]);

  // Auto-sync Facebook Ads in background on load and periodically every 2 minutes
  useEffect(() => {
    if (user?.role === 'manager') {
      const syncAds = () => {
        fetch('/api/sync-fb-ads', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' } 
        })
          .then(r => r.json())
          .then(d => {
            if (d?.success) console.log('[AutoSync FB Ads] Realtime ads updated successfully');
          })
          .catch(() => {});
      };

      // Initial sync on mount
      syncAds();

      // Poll every 2 minutes while app is active
      const timer = setInterval(syncAds, 120000);
      return () => clearInterval(timer);
    }
  }, [user?.role]);

  // Log current user ID and their transactions as requested
  useEffect(() => {
    if (user) {
      console.log(`[Auth] Current User ID: ${user.id}`);
      console.log(`[Data] Transactions for ${user.full_name}:`, sales);
    }
  }, [user, sales]);

  // Forms and Editing States
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userForm, setUserForm] = useState<Partial<User>>({
    username: '', password: '', role: 'reader', full_name: '', bank_account: '', commission_percent: 30
  });

  const [saleForm, setSaleForm] = useState<Partial<SaleRecord>>({
    reader_id: '', sale_id: '', customer_name: '', package_name: '', amount: 0, tip: 0, date: getVNDateStr()
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Sync forms with editing states
  useEffect(() => {
    if (editingSale) setSaleForm({ ...editingSale });
    else setSaleForm({ reader_id: '', sale_id: '', customer_name: '', package_name: '', amount: 0, tip: 0, date: getVNDateStr() });
  }, [editingSale]);

  useEffect(() => {
    if (editingUser) setUserForm({ ...editingUser });
    else setUserForm({ username: '', password: '', role: 'reader', full_name: '', bank_account: '', commission_percent: 30 });
  }, [editingUser]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert('Hệ thống chưa kết nối được database. Vui lòng kiểm tra cấu hình Firebase.');
      return;
    }
    try {
      setLoading(true);
      console.log("[App] Login started...");
      const res = await firebaseService.login(loginForm.username, loginForm.password);
      console.log("[App] Login result:", res);
      
      if (res.success) {
        setUser(res.user);
        localStorage.setItem('tarot_user', JSON.stringify(res.user));
      } else {
        alert(res.message || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      console.error("[App] Login error:", err);
      alert('Lỗi kết nối: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tarot_user');
  };

  const onUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('tarot_user', JSON.stringify(updatedUser));
  };

  const onUpdateSettings = (updatedSettings: SystemSettings) => {
    setSettings(updatedSettings);
  };

  const handleSyncToSheets = async () => {
    try {
      // Gather all data for sync
      // Note: We use the full lists from state which are already fetched in fetchData
      const payload = {
        users: users,
        sales: sales.map(s => {
          const reader = users.find(u => u.id === s.reader_id);
          const sale = users.find(u => u.id === s.sale_id);
          return {
            ...s,
            reader_name: reader?.full_name || 'N/A',
            sale_name: sale?.full_name || 'N/A'
          };
        }),
        shifts: shifts,
        readerShifts: readerSchedule.map(r => {
          const staff = users.find(u => u.id === r.user_id);
          return { ...r, staff_name: staff?.full_name || 'N/A' };
        }),
        saleShifts: saleSchedule.map(s => {
          const staff = users.find(u => u.id === s.user_id);
          return { ...s, staff_name: staff?.full_name || 'N/A' };
        })
      };

      const res = await apiService.syncAllData(payload);
      return res;
    } catch (err) {
      console.error("Sync error:", err);
      return { success: false, message: 'Lỗi đồng bộ: ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = editingSale 
        ? await firebaseService.updateSaleRecord(saleForm as SaleRecord)
        : await firebaseService.addSaleRecord(saleForm);
      if (res.success) {
        setEditingSale(null);
        setView('dashboard');
        await fetchData();
      } else {
        alert(res.message || 'Thao tác thất bại');
      }
    } catch (err) {
      console.error("Sale submit error:", err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = editingUser 
        ? await firebaseService.updateUser(userForm as User)
        : await firebaseService.addUser(userForm);
      if (res.success) {
        setEditingUser(null);
        setView('staff');
        await fetchData();
      } else {
        alert(res.message || 'Thao tác thất bại');
      }
    } catch (err) {
      console.error("User submit error:", err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleUserDelete = async (id: string) => {
    try {
      setLoading(true);
      const res = await firebaseService.deactivateUser(id);
      if (res.success) await fetchData();
      else alert(res.message || 'Thao tác thất bại');
    } catch (err) {
      console.error("User delete error:", err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleShiftRegistration = async (shiftId: string, day: string) => {
    try {
      setLoading(true);
      const registration = { 
        user_id: user?.id || '', 
        shift_id: shiftId, 
        day_of_week: day as any 
      };
      const res = user?.role === 'reader' 
        ? await firebaseService.registerReaderShift(registration)
        : await firebaseService.registerSaleShift(registration);
      if (res.success) await fetchData();
      else alert('Đăng ký thất bại');
    } catch (err) {
      console.error("Shift registration error:", err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleShiftUnregistration = async (id: string, type?: 'reader' | 'sale') => {
    try {
      setLoading(true);
      const targetType = type || user?.role;
      const res = targetType === 'reader' ? await firebaseService.deleteReaderShift(id) : await firebaseService.deleteSaleShift(id);
      if (res.success) await fetchData();
      else alert('Hủy thất bại');
    } catch (err) {
      console.error("Shift unregistration error:", err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      console.log("Starting seedDatabase...");
      const res = await firebaseService.seedDatabase();
      console.log("seedDatabase result:", res);
      if (res.success) {
        alert('Khởi tạo dữ liệu hệ thống thành công!');
        await fetchData();
      } else {
        alert('Khởi tạo thất bại: ' + res.message);
      }
    } catch (err) {
      console.error("seedDatabase error:", err);
      alert('Lỗi khi khởi tạo: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <LoginView 
        loginForm={loginForm} 
        setLoginForm={setLoginForm} 
        handleLogin={handleLogin} 
        handleSeed={handleSeed}
        checkApi={() => alert('Firebase connected')}
        loading={loading}
      />
    );
  }

  const renderContent = () => {
    if (!user) return null; // Safety check

    switch (view) {
      case 'dashboard':
        return (
          <DashboardView 
            user={user}
            summary={summary || INITIAL_SUMMARY}
            adHistory={adHistory}
            fetchData={fetchData}
            sales={sales}
            users={users}
            selectedReader={selectedReader}
            setSelectedReader={setSelectedReader}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            setEditingSale={setEditingSale}
            setView={setView}
          />
        );
      case 'staff':
      case 'staff_form':
        return (
          <StaffView 
            users={users} view={view} setView={setView} 
            editingUser={editingUser} setEditingUser={setEditingUser}
            userForm={userForm} setUserForm={setUserForm}
            handleUserSubmit={handleUserSubmit} handleUserDelete={handleUserDelete}
            loading={loading}
          />
        );
      case 'entry':
        return (
          <SaleEntryView 
            editingSale={editingSale} setEditingSale={setEditingSale}
            saleForm={saleForm} setSaleForm={setSaleForm}
            handleSaleSubmit={handleSaleSubmit}
            users={users}
            fetchData={fetchData}
            setView={setView} loading={loading}
          />
        );
      case 'shifts':
      case 'register_shift':
        return (
          <ShiftView 
            user={user} view={view} shifts={shifts} 
            readerSchedule={readerSchedule} saleSchedule={saleSchedule}
            fetchData={fetchData} handleShiftRegistration={handleShiftRegistration}
            handleShiftUnregistration={handleShiftUnregistration} loading={loading}
            settings={settings}
            users={users}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            user={user}
            onUpdateUser={onUpdateUser}
            systemSettings={settings}
            onUpdateSettings={onUpdateSettings}
            onSyncToSheets={handleSyncToSheets}
          />
        );
      case 'sales_history':
        return (
          <SalesHistoryView 
            user={user}
            sales={sales}
            users={users}
            fetchData={fetchData}
            setEditingSale={setEditingSale}
            setView={setView}
          />
        );
      case 'ad_profit':
        return (
          <AdProfitView 
            summary={summary || INITIAL_SUMMARY}
            adHistory={adHistory}
            fetchData={fetchData}
          />
        );
      case 'payroll':
        return (
          <PayrollView 
            user={user}
            users={users}
            sales={sales}
            payrollPeriods={payrollPeriods}
            adHistory={adHistory}
            fetchData={fetchData}
            loading={loading}
          />
        );
      case 'costs':
        return (
          <CostsView 
            user={user}
            costs={costs}
            fetchData={fetchData}
            loading={loading}
          />
        );
      default:
        return (
          <DashboardView 
            user={user}
            summary={summary || INITIAL_SUMMARY}
            adHistory={adHistory}
            fetchData={fetchData}
            sales={sales}
            users={users}
            selectedReader={selectedReader}
            setSelectedReader={setSelectedReader}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            setEditingSale={setEditingSale}
            setView={setView}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        user={user} 
        view={view} 
        setView={setView} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        handleLogout={handleLogout} 
        setEditingSale={setEditingSale}
      />

      <main className="flex-1 min-w-0 overflow-auto lg:pl-64">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100">
              <img 
                src="https://i.imgur.com/6mEsD6k.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-slate-900">Tarot Manager</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
