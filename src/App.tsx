import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { User, SaleRecord, DashboardSummary, Shift, ShiftRegistration, OperatingCost, SystemSettings } from './types';
import { firebaseService } from './services/firebaseService';
import { db } from './lib/firebase';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { StaffView } from './components/views/StaffView';
import { SaleEntryView } from './components/views/SaleEntryView';
import { ShiftView } from './components/views/ShiftView';
import { CostsView } from './components/views/CostsView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { calculateDashboardSummary, INITIAL_SUMMARY } from './utils/dashboard';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'staff' | 'staff_form' | 'entry' | 'shifts' | 'register_shift' | 'costs' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [costs, setCosts] = useState<OperatingCost[]>([]);
  const [readerSchedule, setReaderSchedule] = useState<ShiftRegistration[]>([]);
  const [saleSchedule, setSaleSchedule] = useState<ShiftRegistration[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ id: 'global', is_locked: false });
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[new Date().getDay()];
  });
  const [selectedReader, setSelectedReader] = useState<string>('All');

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

  const fetchData = async () => {
    if (!db) {
      setLoading(false);
      setError('Firebase chưa được cấu hình.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await firebaseService.getInitialData();
      
      if (res && res.status === 'ok' && res.data) {
        const { users, sales, shifts, readerShifts, saleShifts, costs, settings } = res.data;

        const safeUsers = Array.isArray(users) ? users : [];
        const safeSales = Array.isArray(sales) ? sales : [];
        const safeShifts = Array.isArray(shifts) ? shifts : [];
        const safeCosts = Array.isArray(costs) ? costs : [];
        const safeReaderShifts = (Array.isArray(readerShifts) ? readerShifts : []).map((r: any, i: number) => ({ ...r, id: r.id || `r-${i}` }));
        const safeSaleShifts = (Array.isArray(saleShifts) ? saleShifts : []).map((s: any, i: number) => ({ ...s, id: s.id || `s-${i}` }));
        const safeSettings = settings || { id: 'global', is_locked: false };

        // Filter sales based on permissions
        let filteredSales = safeSales;
        if (user && user.role === 'reader') {
          filteredSales = safeSales.filter(s => s.reader_id === user.id);
        } else if (user && user.role === 'sale') {
          filteredSales = safeSales.filter(s => s.sale_id === user.id);
        }

        setUsers(safeUsers);
        setSales(filteredSales);
        setShifts(safeShifts);
        setCosts(safeCosts);
        setReaderSchedule(safeReaderShifts);
        setSaleSchedule(safeSaleShifts);
        setSettings(safeSettings);
        
        const newSummary = calculateDashboardSummary(filteredSales, safeUsers, safeCosts);
        setSummary(newSummary);
      } else {
        setError(res.message || "Không thể bóc tách dữ liệu từ Firebase.");
        setSummary(INITIAL_SUMMARY);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Lỗi kết nối Firebase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('tarot_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Forms and Editing States
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userForm, setUserForm] = useState<Partial<User>>({
    username: '', password: '', role: 'reader', full_name: '', bank_account: '', commission_percent: 30
  });
  const [saleForm, setSaleForm] = useState<Partial<SaleRecord>>({
    reader_id: '', sale_id: '', customer_name: '', package_name: '', amount: 0, tip: 0, date: new Date().toISOString().split('T')[0]
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Sync forms with editing states
  useEffect(() => {
    if (editingSale) setSaleForm({ ...editingSale });
    else setSaleForm({ reader_id: '', sale_id: '', customer_name: '', package_name: '', amount: 0, tip: 0, date: new Date().toISOString().split('T')[0] });
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
      case 'costs':
        return (
          <CostsView 
            user={user}
            costs={costs}
            fetchData={fetchData}
            loading={loading}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            user={user}
            onUpdateUser={onUpdateUser}
          />
        );
      default:
        return (
          <DashboardView 
            user={user}
            summary={summary || INITIAL_SUMMARY}
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
