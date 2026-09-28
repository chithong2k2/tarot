import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Wallet, 
  RefreshCcw, 
  RefreshCw,
  Trophy,
  Calendar,
  User as UserIcon,
  Edit2,
  Trash2,
  FileDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Facebook,
  BarChart2,
  Sparkles,
  Layers,
  Target,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  Info,
  Search,
  PlusCircle,
  X,
  Clock,
  Package,
  Archive
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportReportPackage } from '../../utils/reportPackage';
import { 
  BarChart, 
  Bar, 
  Line,
  AreaChart,
  Area,
  ComposedChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine
} from 'recharts';
import { User, SaleRecord, DashboardSummary, AdHistoryRecord, OperatingCost, PayrollPeriod } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { apiService } from '../../services/api';
import { StatCard, formatVND } from '../DashboardComponents';
import { exportToExcel } from '../../utils/export';
import { calculateDashboardSummary } from '../../utils/dashboard';
import { getVNDayName, getVNMonday, getVNTime } from '../../utils/dateUtils';

import { ConfirmModal } from '../ConfirmModal';

export interface AvailableWeek {
  id: string;
  label: string;
  shortLabel: string;
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
  isCurrent: boolean;
}

interface DashboardViewProps {
  user: User;
  summary: DashboardSummary | null;
  adHistory: AdHistoryRecord[];
  costs?: OperatingCost[];
  payrollPeriods?: PayrollPeriod[];
  fetchData: () => void;
  sales: SaleRecord[];
  users: User[];
  selectedReader: string;
  setSelectedReader: (reader: string) => void;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  setEditingSale: (sale: SaleRecord | null) => void;
  setView: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  summary,
  adHistory = [],
  costs = [],
  payrollPeriods = [],
  fetchData,
  sales,
  users,
  selectedReader,
  setSelectedReader,
  selectedDay,
  setSelectedDay,
  setEditingSale,
  setView
}) => {
  const [staffType, setStaffType] = React.useState<'reader' | 'sale'>(user.role === 'sale' ? 'sale' : 'reader');
  const [showConfirmSeed, setShowConfirmSeed] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const [deletingSale, setDeletingSaleId] = React.useState<SaleRecord | null>(null);
  const [isReaderDropdownOpen, setIsReaderDropdownOpen] = React.useState(false);

  // Chart Customization State
  const [chartType, setChartType] = React.useState<'area' | 'bar'>('area');
  const [showRevenue, setShowRevenue] = React.useState(true);
  const [showProfit, setShowProfit] = React.useState(true);
  const [showAdSpend, setShowAdSpend] = React.useState(true);
  const [showCommission, setShowCommission] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [collapsedStaff, setCollapsedStaff] = React.useState<Record<string, boolean>>({});
  const [isSyncingAds, setIsSyncingAds] = React.useState(false);
  const [syncAdsSuccess, setSyncAdsSuccess] = React.useState<string | null>(null);

  // ZIP Report Package States
  const [showZipDropdown, setShowZipDropdown] = React.useState(false);
  const [isExportingZip, setIsExportingZip] = React.useState(false);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleWindowClick = () => setShowZipDropdown(false);
    if (showZipDropdown) {
      window.addEventListener('click', handleWindowClick);
    }
    return () => window.removeEventListener('click', handleWindowClick);
  }, [showZipDropdown]);

  const handleExportZip = async (mode: 'week' | 'month') => {
    setIsExportingZip(true);
    setShowZipDropdown(false);
    try {
      const res = await exportReportPackage({
        mode,
        sales: weekSales,
        users,
        adHistory: weekAdHistory,
        costs: weekCosts
      });
      if (res.success) {
        alert(res.message);
      } else {
        alert('Lỗi: ' + res.message);
      }
    } catch (err: any) {
      alert('Lỗi xuất gói báo cáo: ' + (err?.message || String(err)));
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleSyncFbAds = async () => {
    try {
      setIsSyncingAds(true);
      setSyncAdsSuccess(null);
      const res = await apiService.syncMetaAds();
      if (res?.success) {
        setSyncAdsSuccess('Đã cập nhật Ads realtime!');
        fetchData();
        setTimeout(() => setSyncAdsSuccess(null), 4000);
      } else {
        const errorMsg = res?.message || 'Không thể đồng bộ Ads';
        alert(`Không thể đồng bộ Ads: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("[FB Sync Error]", err);
      alert(`Lỗi đồng bộ Ads: ${err?.message || 'Không thể kết nối'}`);
    } finally {
      setIsSyncingAds(false);
    }
  };

  const toggleStaffCollapse = (staffId: string) => {
    setCollapsedStaff(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const formatSaleTime = (createdAt?: string) => {
    if (!createdAt) return '';
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);
    } catch {
      return '';
    }
  };

  const formatSaleDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T00:00:00+07:00`);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsReaderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDayName = (dateStr: string) => {
    try {
      const date = new Date(`${dateStr}T00:00:00+07:00`);
      if (isNaN(date.getTime())) return 'N/A';
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return days[date.getDay()];
    } catch (e) {
      return 'N/A';
    }
  };

  // Week Selector State
  const [selectedWeekId, setSelectedWeekId] = React.useState<string>('current');

  // Available Weeks - starts strictly from Current Week onwards (+ any closed payroll periods)
  const availableWeeks = React.useMemo<AvailableWeek[]>(() => {
    const weeks: AvailableWeek[] = [];
    const baseMonday = getVNMonday();
    baseMonday.setHours(0, 0, 0, 0);

    const formatDM = (d: Date) => {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const formatYMD = (d: Date) => {
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    };

    const currentSunday = new Date(baseMonday);
    currentSunday.setDate(baseMonday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    const currentStartStr = formatYMD(baseMonday);
    const currentEndStr = formatYMD(currentSunday);

    // 1. Current Week (Always starting from this week)
    weeks.push({
      id: 'current',
      label: `Tuần này (${formatDM(baseMonday)} - ${formatDM(currentSunday)})`,
      shortLabel: 'Tuần này',
      startDate: baseMonday,
      endDate: currentSunday,
      startStr: currentStartStr,
      endStr: currentEndStr,
      isCurrent: true
    });

    // 2. Only include past weeks that were saved in payrollPeriods
    (payrollPeriods || []).forEach(p => {
      if (p.start_date && p.end_date) {
        if (p.start_date !== currentStartStr) {
          const sDate = new Date(`${p.start_date}T00:00:00+07:00`);
          const eDate = new Date(`${p.end_date}T23:59:59+07:00`);
          if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
            weeks.push({
              id: p.id || `payroll_${p.start_date}`,
              label: `${p.title || `Tuần (${formatDM(sDate)} - ${formatDM(eDate)})`} 🔖`,
              shortLabel: p.title || `${formatDM(sDate)} - ${formatDM(eDate)}`,
              startDate: sDate,
              endDate: eDate,
              startStr: p.start_date,
              endStr: p.end_date,
              isCurrent: false
            });
          }
        }
      }
    });

    return weeks;
  }, [payrollPeriods]);

  const activeWeek = React.useMemo(() => {
    return availableWeeks.find(w => w.id === selectedWeekId) || availableWeeks[0];
  }, [availableWeeks, selectedWeekId]);

  const selectedWeekIndex = availableWeeks.findIndex(w => w.id === activeWeek.id);

  const handleOlderWeek = () => {
    if (selectedWeekIndex < availableWeeks.length - 1) {
      setSelectedWeekId(availableWeeks[selectedWeekIndex + 1].id);
      setSelectedDay('All');
    }
  };

  const handleNewerWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekId(availableWeeks[selectedWeekIndex - 1].id);
      setSelectedDay('All');
    }
  };

  // Filter Data for Selected Week
  const weekSales = React.useMemo(() => {
    return sales.filter(s => s.date >= activeWeek.startStr && s.date <= activeWeek.endStr);
  }, [sales, activeWeek]);

  const weekAdHistory = React.useMemo(() => {
    return (adHistory || []).filter(h => h.date >= activeWeek.startStr && h.date <= activeWeek.endStr);
  }, [adHistory, activeWeek]);

  const weekCosts = React.useMemo(() => {
    return (costs || []).filter(c => c.date >= activeWeek.startStr && c.date <= activeWeek.endStr);
  }, [costs, activeWeek]);

  const activeWeekSummary = React.useMemo(() => {
    return calculateDashboardSummary(
      weekSales,
      users,
      weekCosts,
      weekAdHistory,
      activeWeek.startDate,
      activeWeek.endDate
    );
  }, [weekSales, users, weekCosts, weekAdHistory, activeWeek]);

  // Generate Week Days for the active week (Thứ 2 -> Chủ nhật)
  const weekDays = React.useMemo(() => {
    const mon = new Date(activeWeek.startDate);
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const todayName = getVNDayName();

    return dayNames.map((name, idx) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + idx);
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = activeWeek.isCurrent && (name === todayName);
      return {
        key: name,
        name,
        dateFormatted,
        dateStr,
        isToday
      };
    });
  }, [activeWeek]);

  // Filtered Sales according to selectedDay within active week
  const filteredSalesByDay = React.useMemo(() => {
    if (selectedDay === 'All') return weekSales;
    return weekSales.filter(s => getDayName(s.date) === selectedDay);
  }, [weekSales, selectedDay]);

  // Dynamic Financial Metrics based on selectedDay & activeWeek
  const currentDayStats = React.useMemo(() => {
    if (selectedDay === 'All') {
      const rev = activeWeekSummary?.totalRevenue || 0;
      const profit = activeWeekSummary?.netProfit || 0;
      const adSpend = activeWeekSummary?.totalAdSpend || 0;
      const commission = (activeWeekSummary?.totalReaderCommission || 0) + (activeWeekSummary?.totalSaleCommission || 0);
      const salesCount = weekSales.length;
      const netMargin = rev > 0 ? (profit / rev) * 100 : 0;
      const roas = adSpend > 0 ? (rev / adSpend) : null;
      const cpa = (adSpend > 0 && salesCount > 0) ? (adSpend / salesCount) : null;

      return {
        title: activeWeek.isCurrent ? 'Cả Tuần Này' : activeWeek.label,
        revenue: rev,
        profit,
        adSpend,
        commission,
        salesCount,
        netMargin,
        roas,
        cpa
      };
    }

    const dayObj = weekDays.find(w => w.name === selectedDay);
    const dayStat = activeWeekSummary?.dailyStats?.find(d => d.name === selectedDay);
    const rev = dayStat?.revenue || 0;
    const profit = dayStat?.profit || 0;
    const adSpend = dayStat?.adSpend || 0;
    const commission = dayStat?.commission || 0;
    const salesCount = filteredSalesByDay.length;
    const netMargin = rev > 0 ? (profit / rev) * 100 : 0;
    const roas = adSpend > 0 ? (rev / adSpend) : null;
    const cpa = (adSpend > 0 && salesCount > 0) ? (adSpend / salesCount) : null;

    return {
      title: `${selectedDay} (${dayObj?.dateFormatted || ''})`,
      revenue: rev,
      profit,
      adSpend,
      commission,
      salesCount,
      netMargin,
      roas,
      cpa
    };
  }, [selectedDay, activeWeekSummary, weekSales, filteredSalesByDay, weekDays, activeWeek]);

  // Non-manager metrics for reader / sale
  const staffPersonalMetrics = React.useMemo(() => {
    if (user.role === 'manager') return null;

    const userSales = filteredSalesByDay;
    const amount = userSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const tip = userSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
    const commissionPercent = user.commission_percent || 0;
    const commission = (amount * commissionPercent) / 100;
    const totalPayout = commission + (user.role === 'reader' ? tip : 0);

    return {
      amount,
      tip,
      commission,
      totalPayout,
      count: userSales.length
    };
  }, [user, filteredSalesByDay]);

  // Personal daily chart data for reader / sale
  const staffDailyStats = React.useMemo(() => {
    if (user.role === 'manager') return activeWeekSummary?.dailyStats || [];

    return weekDays.map(d => {
      const daySales = weekSales.filter(s => getDayName(s.date) === d.name);
      const pkgAmount = daySales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const tipAmount = daySales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
      const revenue = pkgAmount + tipAmount;
      const commissionPercent = user.commission_percent || 0;
      const commission = (pkgAmount * commissionPercent) / 100 + (user.role === 'reader' ? tipAmount : 0);

      return {
        name: d.name,
        revenue,
        profit: commission,
        commission,
        adSpend: 0
      };
    });
  }, [user, activeWeekSummary, weekSales, weekDays]);

  const activeDailyStats = user.role === 'manager' ? (activeWeekSummary?.dailyStats || []) : staffDailyStats;

  // ROAS Badge Configuration
  const roasBadge = React.useMemo(() => {
    if (currentDayStats.roas === null) {
      return currentDayStats.adSpend > 0 
        ? { text: 'Chưa có đơn', variant: 'negative' as const }
        : { text: 'Không chạy Ads', variant: 'neutral' as const };
    }
    if (currentDayStats.roas >= 3.0) return { text: 'Siêu Lời (≥3x)', variant: 'positive' as const };
    if (currentDayStats.roas >= 2.0) return { text: 'Có Lãi (≥2x)', variant: 'positive' as const };
    if (currentDayStats.roas >= 1.0) return { text: 'Hòa Vốn (1-2x)', variant: 'info' as const };
    return { text: 'Lỗ Tiền Ads (<1x)', variant: 'negative' as const };
  }, [currentDayStats.roas, currentDayStats.adSpend]);

  // Smart Alerts
  const smartAlerts = React.useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'warning' | 'success' | 'info';
      icon: React.ReactNode;
      title: string;
      message: string;
      action?: { label: string; onClick: () => void };
    }> = [];

    if (user.role === 'manager') {
      // 1. Alert: Ad spend burning without sales
      if (currentDayStats.adSpend > 0 && currentDayStats.salesCount === 0) {
        alerts.push({
          id: 'ad-spend-no-sales',
          type: 'warning',
          icon: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
          title: 'Cảnh báo chi phí Ads',
          message: `${selectedDay === 'All' ? 'Tuần này' : selectedDay} đã chi ${formatVND(currentDayStats.adSpend)} cho Ads nhưng chưa có đơn chốt nào. Hãy kiểm tra inbox khách và nhắc ca trực!`
        });
      }

      // 2. Alert: Exceptional ROAS
      if (currentDayStats.roas !== null && currentDayStats.roas >= 2.5) {
        alerts.push({
          id: 'high-roas',
          type: 'success',
          icon: <Sparkles size={18} className="text-emerald-600 shrink-0" />,
          title: 'Hiệu quả quảng cáo xuất sắc!',
          message: `ROAS đạt ${currentDayStats.roas.toFixed(2)}x (${selectedDay === 'All' ? 'toàn tuần' : selectedDay}), doanh thu gấp ${currentDayStats.roas.toFixed(1)} lần tiền Ads. Chiến dịch đang sinh lời rất tốt!`
        });
      }

      // 3. Alert: Missing bank accounts
      const staffWithoutBank = users.filter(u => u.role !== 'manager' && (!u.bank_account || !u.bank_name));
      if (staffWithoutBank.length > 0) {
        alerts.push({
          id: 'missing-bank',
          type: 'info',
          icon: <CreditCard size={18} className="text-indigo-600 shrink-0" />,
          title: 'Thông tin VietQR nhân sự',
          message: `Có ${staffWithoutBank.length} nhân viên (${staffWithoutBank.map(u => u.full_name).join(', ')}) chưa cập nhật STK ngân hàng.`,
          action: {
            label: 'Cập nhật ngay',
            onClick: () => setView('users')
          }
        });
      }
    }

    return alerts;
  }, [user.role, currentDayStats, selectedDay, users, setView]);

  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tổng Quan Doanh Thu</h2>
          <p className="text-slate-500 text-sm mt-0.5">Dữ liệu tài chính, hiệu quả quảng cáo và hiệu suất làm việc</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
          {/* Week Selector Control */}
          <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl p-0.5 shadow-sm w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOlderWeek}
              disabled={selectedWeekIndex >= availableWeeks.length - 1}
              title="Tuần trước đó"
              className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="relative flex-1 text-center">
              <select
                value={selectedWeekId}
                onChange={(e) => {
                  setSelectedWeekId(e.target.value);
                  setSelectedDay('All');
                }}
                className="w-full text-center bg-transparent text-xs font-bold text-slate-800 pl-2 pr-6 py-1.5 outline-none cursor-pointer appearance-none"
              >
                {availableWeeks.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.isCurrent ? `📅 ${w.label} (Đang chạy)` : `📅 ${w.label}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={handleNewerWeek}
              disabled={selectedWeekIndex <= 0}
              title="Tuần sau đó"
              className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {user.role === 'manager' && (
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button 
                onClick={handleSyncFbAds}
                disabled={isSyncingAds}
                className="flex items-center justify-center space-x-1 sm:space-x-1.5 bg-blue-50 border border-blue-200 px-2 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors shadow-sm font-semibold text-[11px] sm:text-xs cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-[0.98]"
                title="Đồng bộ chi phí quảng cáo realtime từ Meta Graph API"
              >
                <RefreshCw size={13} className={isSyncingAds ? 'animate-spin shrink-0' : 'shrink-0'} />
                <span className="sm:hidden">{isSyncingAds ? 'Sync...' : (syncAdsSuccess ? 'Xong' : 'Đồng Bộ')}</span>
                <span className="hidden sm:inline">{isSyncingAds ? 'Đang đồng bộ...' : (syncAdsSuccess || 'Đồng Bộ Ads')}</span>
              </button>
              <button 
                onClick={() => {
                  exportToExcel(weekSales, users, activeWeekSummary, {
                    periodTitle: activeWeek.label,
                    adHistory: weekAdHistory,
                    operatingCosts: weekCosts,
                    startDateStr: activeWeek.startStr,
                    endDateStr: activeWeek.endStr
                  });
                }}
                className="flex items-center justify-center space-x-1 sm:space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2 sm:px-3.5 py-2.5 sm:py-2 rounded-xl transition-all shadow-sm font-semibold text-[11px] sm:text-xs cursor-pointer whitespace-nowrap active:scale-[0.98]"
                title={`Xuất file Excel đầy đủ 4 sheet báo cáo cho ${activeWeek.shortLabel || activeWeek.label}`}
              >
                <FileDown size={13} className="shrink-0" />
                <span>Xuất Excel</span>
              </button>

              {/* ZIP Report Package Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  disabled={isExportingZip}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowZipDropdown(!showZipDropdown);
                  }}
                  className="w-full flex items-center justify-center space-x-1 sm:space-x-1.5 bg-indigo-50 border border-indigo-200 px-2 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm font-semibold text-[11px] sm:text-xs cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-[0.98]"
                  title="Tải trọn bộ file báo cáo & sao lưu dạng thư mục ZIP"
                >
                  {isExportingZip ? <RefreshCw size={13} className="animate-spin shrink-0" /> : <Package size={13} className="shrink-0" />}
                  <span className="sm:hidden">{isExportingZip ? 'Nén...' : 'Gói .zip'}</span>
                  <span className="hidden sm:inline">{isExportingZip ? 'Đang nén...' : 'Gói Báo Cáo (.zip)'}</span>
                  <ChevronDown size={11} className={`transition-transform duration-200 ${showZipDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showZipDropdown && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chọn kỳ đóng gói (.zip)</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExportZip('week')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors mt-0.5 shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">Trọn Gói Tuần Này</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Doanh thu tuần, Bảng lương tuần, Tóm tắt Zalo & Bản backup</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportZip('month')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors mt-0.5 shrink-0">
                        <Archive size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">Trọn Gói Cả Tháng Này</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Tổng kết tháng, Lãi ròng, Bảng kê lương tháng & Bản backup</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Filter Toolbar (Day Buttons) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedDay('All')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
            selectedDay === 'All'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          <span>📅 {activeWeek.isCurrent ? 'Cả Tuần Này' : `Cả ${activeWeek.shortLabel || 'Tuần'}`}</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 shrink-0 my-auto mx-0.5" />

        {weekDays.map(d => {
          const isSelected = selectedDay === d.name;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedDay(d.name)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 border ${
                isSelected
                  ? 'bg-indigo-900 border-indigo-900 text-white shadow-md shadow-indigo-950/20'
                  : d.isToday
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{d.name}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                isSelected ? 'bg-indigo-800 text-indigo-100' : 'text-slate-400 bg-slate-100'
              }`}>
                {d.dateFormatted}
              </span>
              {d.isToday && (
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-indigo-600'} animate-pulse`} title="Hôm nay" />
              )}
            </button>
          );
        })}
      </div>

      {/* Smart Alerts Banner */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2.5">
          {smartAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 text-xs font-medium transition-all ${
                alert.type === 'warning' 
                  ? 'bg-amber-50/80 border-amber-200/80 text-amber-900' 
                  : alert.type === 'success' 
                    ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' 
                    : 'bg-indigo-50/80 border-indigo-200/80 text-indigo-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/80 shadow-sm shrink-0">
                  {alert.icon}
                </div>
                <div>
                  <h4 className="font-bold">{alert.title}</h4>
                  <p className="opacity-90">{alert.message}</p>
                </div>
              </div>
              {alert.action && (
                <button
                  type="button"
                  onClick={alert.action.onClick}
                  className="px-3 py-1.5 bg-white rounded-lg shadow-sm font-bold text-xs hover:bg-slate-50 transition-all shrink-0 cursor-pointer flex items-center space-x-1"
                >
                  <span>{alert.action.label}</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {user.role === 'manager' ? (
          <>
            <StatCard 
              title="Doanh Thu" 
              value={formatVND(currentDayStats.revenue)} 
              icon={<TrendingUp size={24} />} 
              color="bg-indigo-600"
              badge={{
                text: `${currentDayStats.salesCount} đơn chốt`,
                variant: currentDayStats.salesCount > 0 ? 'positive' : 'neutral'
              }}
              subtitle={
                <span>{selectedDay === 'All' ? 'Tổng doanh thu cả tuần' : `Doanh thu ngày ${selectedDay}`}</span>
              }
            />
            <StatCard 
              title="Lợi Nhuận Bỏ Túi" 
              value={formatVND(currentDayStats.profit)} 
              icon={<DollarSign size={24} />} 
              color={currentDayStats.profit >= 0 ? "bg-emerald-600" : "bg-rose-600"}
              badge={{
                text: `${currentDayStats.netMargin >= 0 ? '+' : ''}${currentDayStats.netMargin.toFixed(1)}% Biên LN`,
                variant: currentDayStats.netMargin >= 0 ? 'positive' : 'negative'
              }}
              subtitle={
                <span>Đã trừ hoa hồng NV & chi phí Ads</span>
              }
            />
            <StatCard 
              title="Chi Phí Ads Facebook" 
              value={formatVND(currentDayStats.adSpend)} 
              icon={<Facebook size={24} />} 
              color="bg-blue-600"
              badge={{
                text: currentDayStats.revenue > 0 && currentDayStats.adSpend > 0
                  ? `${((currentDayStats.adSpend / currentDayStats.revenue) * 100).toFixed(0)}% Doanh thu`
                  : currentDayStats.adSpend > 0 ? 'Đang chạy' : 'Không có chi phí',
                variant: currentDayStats.adSpend > 0 ? 'info' : 'neutral'
              }}
              subtitle={
                <span>Realtime Meta Graph API</span>
              }
            />
            <StatCard 
              title="Hiệu Quả Quảng Cáo" 
              value={currentDayStats.roas !== null ? `${currentDayStats.roas.toFixed(2)}x ROAS` : (currentDayStats.adSpend > 0 ? '0.00x ROAS' : 'Chưa chạy Ads')} 
              icon={<Target size={24} />} 
              color="bg-purple-600"
              badge={roasBadge}
              subtitle={
                currentDayStats.cpa !== null ? (
                  <span>CPA: <strong className="text-slate-700 font-semibold">{formatVND(Math.round(currentDayStats.cpa))}</strong> / đơn</span>
                ) : (
                  <span>{currentDayStats.adSpend > 0 ? 'Chưa phát sinh đơn' : 'Không có chi phí Ads'}</span>
                )
              }
            />
          </>
        ) : (
          <>
            <StatCard 
              title="Doanh Thu Đơn Hàng" 
              value={formatVND(staffPersonalMetrics?.amount || 0)} 
              icon={<TrendingUp size={24} />} 
              color="bg-indigo-600"
              badge={{
                text: `${staffPersonalMetrics?.count || 0} đơn`,
                variant: (staffPersonalMetrics?.count || 0) > 0 ? 'positive' : 'neutral'
              }}
              subtitle={<span>{selectedDay === 'All' ? 'Tổng cả tuần này' : `Dữ liệu ngày ${selectedDay}`}</span>}
            />
            <StatCard 
              title="Hoa Hồng Của Bạn" 
              value={formatVND(staffPersonalMetrics?.commission || 0)} 
              icon={<Wallet size={24} />} 
              color="bg-purple-600"
              badge={{
                text: `${user.commission_percent || 0}%`,
                variant: 'info'
              }}
              subtitle={<span>Tính theo % doanh thu gói</span>}
            />
            {user.role === 'reader' && (
              <StatCard 
                title="Tiền Tip Nhận Được" 
                value={formatVND(staffPersonalMetrics?.tip || 0)} 
                icon={<Sparkles size={24} />} 
                color="bg-amber-500"
                badge={{
                  text: '100% về bạn',
                  variant: 'positive'
                }}
                subtitle={<span>Khách hàng tip thêm</span>}
              />
            )}
            <StatCard 
              title="Tổng Thu Nhập Thực Nhận" 
              value={formatVND(staffPersonalMetrics?.totalPayout || 0)} 
              icon={<DollarSign size={24} />} 
              color="bg-emerald-600"
              badge={{
                text: selectedDay === 'All' ? 'Tuần này' : selectedDay,
                variant: 'positive'
              }}
              subtitle={<span>{user.role === 'reader' ? 'Hoa hồng + Tiền Tip' : 'Hoa hồng chốt đơn'}</span>}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Modern Chart (Recharts Pro) */}
        <div className={`${user.role === 'manager' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex flex-col justify-between`}>
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {user.role === 'manager' ? 'Biểu Đồ Tài Chính Tuần' : 'Biểu Đồ Doanh Thu & Hoa Hồng'}
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200/50 uppercase tracking-wider">
                  Recharts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.role === 'manager' 
                  ? 'Theo dõi doanh thu, chi phí Ads và lợi nhuận ròng từng ngày' 
                  : 'Theo dõi doanh thu và thu nhập hoa hồng của bạn'}
              </p>
            </div>

            {/* Toggle Dạng Biểu Đồ (Vùng Gradient vs Cột) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto border border-slate-200/50">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white text-indigo-600 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TrendingUp size={13} />
                <span>Vùng Gradient</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-indigo-600 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart2 size={13} />
                <span>Cột So Sánh</span>
              </button>
            </div>
          </div>

          {/* Metric Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => setShowRevenue(!showRevenue)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                showRevenue
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
              <span>Doanh thu</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfit(!showProfit)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                showProfit
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span>{user.role === 'manager' ? 'Lợi nhuận ròng' : 'Hoa hồng'}</span>
            </button>

            {user.role === 'manager' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAdSpend(!showAdSpend)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    showAdSpend
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span>Chi phí Ads FB</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommission(!showCommission)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    showCommission
                      ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <span>Hoa hồng NV</span>
                </button>
              </>
            )}
          </div>

          {/* Biểu đồ chính */}
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={activeDailyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorAdSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => {
                      if (val === 0) return '0';
                      if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      return `${val / 1000}k`;
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const isToday = label === getVNDayName();
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200/80 text-xs min-w-[210px] space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-600" />
                                <span>{label}</span>
                              </span>
                              {isToday && (
                                <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-indigo-200/50">
                                  Hôm nay
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              {payload.map((entry: any, index: number) => {
                                const labels: Record<string, { title: string; color: string }> = {
                                  revenue: { title: 'Doanh thu', color: '#6366f1' },
                                  profit: { title: user.role === 'manager' ? 'Lợi nhuận ròng' : 'Hoa hồng', color: '#10b981' },
                                  adSpend: { title: 'Chi phí Ads FB', color: '#f43f5e' },
                                  commission: { title: 'Hoa hồng NV', color: '#a855f7' }
                                };
                                const meta = labels[entry.dataKey] || { title: entry.name, color: entry.color || entry.fill };
                                const isNegative = Number(entry.value) < 0;

                                return (
                                  <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                                        style={{ backgroundColor: meta.color }} 
                                      />
                                      <span className="text-slate-500 font-medium">{meta.title}:</span>
                                    </div>
                                    <span className={`font-bold font-mono ${
                                      entry.dataKey === 'profit' 
                                        ? (isNegative ? 'text-rose-600' : 'text-emerald-600') 
                                        : 'text-slate-900'
                                    }`}>
                                      {formatVND(entry.value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showRevenue && (
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Doanh thu"
                      stroke="#6366f1" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    />
                  )}
                  {showProfit && (
                    <Area 
                      type="monotone" 
                      dataKey={user.role === 'manager' ? 'profit' : 'commission'} 
                      name={user.role === 'manager' ? 'Lợi nhuận ròng' : 'Hoa hồng'}
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    />
                  )}
                  {user.role === 'manager' && showAdSpend && (
                    <Area 
                      type="monotone" 
                      dataKey="adSpend" 
                      name="Chi phí Ads FB"
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1} 
                      fill="url(#colorAdSpend)" 
                      dot={{ r: 3, fill: '#f43f5e' }}
                      activeDot={{ r: 5, fill: '#f43f5e' }}
                    />
                  )}
                  {user.role === 'manager' && showCommission && (
                    <Area 
                      type="monotone" 
                      dataKey="commission" 
                      name="Hoa hồng NV"
                      stroke="#a855f7" 
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      fillOpacity={1} 
                      fill="url(#colorCommission)" 
                      dot={{ r: 3, fill: '#a855f7' }}
                      activeDot={{ r: 5, fill: '#a855f7' }}
                    />
                  )}
                  {selectedDay !== 'All' && (
                    <ReferenceLine 
                      x={selectedDay} 
                      stroke="#6366f1" 
                      strokeDasharray="4 4" 
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={activeDailyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => {
                      if (val === 0) return '0';
                      if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      return `${val / 1000}k`;
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const isToday = label === getVNDayName();
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200/80 text-xs min-w-[210px] space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-600" />
                                <span>{label}</span>
                              </span>
                              {isToday && (
                                <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-indigo-200/50">
                                  Hôm nay
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              {payload.map((entry: any, index: number) => {
                                const labels: Record<string, { title: string; color: string }> = {
                                  revenue: { title: 'Doanh thu', color: '#6366f1' },
                                  profit: { title: user.role === 'manager' ? 'Lợi nhuận ròng' : 'Hoa hồng', color: '#10b981' },
                                  adSpend: { title: 'Chi phí Ads FB', color: '#f43f5e' },
                                  commission: { title: 'Hoa hồng NV', color: '#a855f7' }
                                };
                                const meta = labels[entry.dataKey] || { title: entry.name, color: entry.color || entry.fill };
                                const isNegative = Number(entry.value) < 0;

                                return (
                                  <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                                        style={{ backgroundColor: meta.color }} 
                                      />
                                      <span className="text-slate-500 font-medium">{meta.title}:</span>
                                    </div>
                                    <span className={`font-bold font-mono ${
                                      entry.dataKey === 'profit' 
                                        ? (isNegative ? 'text-rose-600' : 'text-emerald-600') 
                                        : 'text-slate-900'
                                    }`}>
                                      {formatVND(entry.value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showRevenue && (
                    <Bar 
                      dataKey="revenue" 
                      name="Doanh thu"
                      fill="#6366f1" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={36}
                    >
                      {activeDailyStats.map((entry, index) => (
                        <Cell 
                          key={`bar-rev-${index}`} 
                          fill="#6366f1" 
                          opacity={selectedDay === 'All' || entry.name === selectedDay ? 1 : 0.35} 
                        />
                      ))}
                    </Bar>
                  )}
                  {showProfit && (
                    <Bar 
                      dataKey={user.role === 'manager' ? 'profit' : 'commission'} 
                      name={user.role === 'manager' ? 'Lợi nhuận ròng' : 'Hoa hồng'}
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={36}
                    >
                      {activeDailyStats.map((entry, index) => (
                        <Cell 
                          key={`bar-profit-${index}`} 
                          fill="#10b981" 
                          opacity={selectedDay === 'All' || entry.name === selectedDay ? 1 : 0.35} 
                        />
                      ))}
                    </Bar>
                  )}
                  {user.role === 'manager' && showAdSpend && (
                    <Bar 
                      dataKey="adSpend" 
                      name="Chi phí Ads FB"
                      fill="#f43f5e" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={36}
                    >
                      {activeDailyStats.map((entry, index) => (
                        <Cell 
                          key={`bar-ads-${index}`} 
                          fill="#f43f5e" 
                          opacity={selectedDay === 'All' || entry.name === selectedDay ? 1 : 0.35} 
                        />
                      ))}
                    </Bar>
                  )}
                  {user.role === 'manager' && showCommission && (
                    <Bar 
                      dataKey="commission" 
                      name="Hoa hồng NV"
                      fill="#a855f7" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={36}
                    >
                      {activeDailyStats.map((entry, index) => (
                        <Cell 
                          key={`bar-comm-${index}`} 
                          fill="#a855f7" 
                          opacity={selectedDay === 'All' || entry.name === selectedDay ? 1 : 0.35} 
                        />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        {user.role === 'manager' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Top Reader</h3>
                <Trophy className="text-amber-500" size={24} />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {activeWeekSummary?.topReader?.name ? activeWeekSummary.topReader.name.charAt(0) : '-'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{activeWeekSummary?.topReader?.name || 'Chưa có'}</p>
                  <p className="text-sm text-slate-500">{formatVND(activeWeekSummary?.topReader?.amount || 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Top Sale</h3>
                <Trophy className="text-slate-400" size={24} />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">
                  {activeWeekSummary?.topSale?.name ? activeWeekSummary.topSale.name.charAt(0) : '-'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{activeWeekSummary?.topSale?.name || 'Chưa có'}</p>
                  <p className="text-sm text-slate-500">{formatVND(activeWeekSummary?.topSale?.amount || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Table Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Header: Filters, Search & Action */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Chi Tiết Giao Dịch</h3>
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/50">
                    {selectedDay === 'All' ? 'Toàn Tuần' : selectedDay}
                  </span>
                </div>
                
                {user.role === 'manager' && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => {
                        setStaffType('reader');
                        setSelectedReader('All');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${staffType === 'reader' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Reader
                    </button>
                    <button 
                      onClick={() => {
                        setStaffType('sale');
                        setSelectedReader('All');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${staffType === 'sale' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Sale
                    </button>
                  </div>
                )}

                {user.role === 'manager' && (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsReaderDropdownOpen(!isReaderDropdownOpen)}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[170px] cursor-pointer transition-colors hover:bg-slate-100"
                    >
                      <span className="truncate">
                        {selectedReader === 'All' 
                          ? `Tất cả ${staffType === 'reader' ? 'Reader' : 'Sale'}` 
                          : users.find(u => u.id === selectedReader)?.full_name || selectedReader}
                      </span>
                      <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform ${isReaderDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isReaderDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={() => {
                            setSelectedReader('All');
                            setIsReaderDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-slate-50 ${selectedReader === 'All' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'}`}
                        >
                          Tất cả {staffType === 'reader' ? 'Reader' : 'Sale'}
                        </button>
                        {users.filter(u => u.role === staffType).map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedReader(u.id);
                              setIsReaderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-slate-50 ${selectedReader === u.id ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'}`}
                          >
                            {u.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Bar & Quick Add Button */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm khách, gói, nhân viên..."
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {user.role === 'manager' && (
                  <button
                    onClick={() => {
                      setEditingSale(null);
                      setView('entry');
                    }}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer shrink-0"
                  >
                    <PlusCircle size={15} />
                    <span className="hidden sm:inline">Thêm Đơn</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-100">
                  <th className="px-6 py-3.5">Thời Gian</th>
                  <th className="px-6 py-3.5">Khách Hàng</th>
                  <th className="px-6 py-3.5">Gói Dịch Vụ</th>
                  <th className="px-6 py-3.5">Cặp Đôi Trực Ca (Sale → Reader)</th>
                  <th className="px-6 py-3.5 text-right">Số Tiền</th>
                  <th className="px-6 py-3.5 text-right">Tiền Tip</th>
                  {user.role === 'manager' && <th className="px-6 py-3.5 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const effectiveStaffType = user.role === 'manager' ? staffType : user.role;
                  const query = searchQuery.trim().toLowerCase();

                  // Group sales by staff, with search and day filtering
                  const groupedSales = weekSales.reduce((acc: Record<string, SaleRecord[]>, sale) => {
                    const rawId = effectiveStaffType === 'reader' 
                      ? (sale.reader_id || (sale as any).reader_name)
                      : (sale.sale_id || (sale as any).sale_name);
                    
                    if (!rawId || rawId === 'none' || rawId === 'N/A') return acc;
                    
                    const staff = users.find(u => 
                      u.id.toLowerCase() === String(rawId).toLowerCase() || 
                      u.full_name.toLowerCase() === String(rawId).toLowerCase()
                    );
                    const sId = staff?.id || rawId;

                    if (selectedReader !== 'All' && sId !== selectedReader) return acc;
                    
                    // Day match
                    const matchDay = selectedDay === 'All' || getDayName(sale.date) === selectedDay;
                    if (!matchDay) return acc;

                    // Search match
                    if (query) {
                      const customer = (sale.customer_name || '').toLowerCase();
                      const pkg = (sale.package_name || '').toLowerCase();
                      const readerU = users.find(u => u.id === sale.reader_id);
                      const saleU = users.find(u => u.id === sale.sale_id);
                      const rName = (readerU?.full_name || (sale as any).reader_name || '').toLowerCase();
                      const sName = (saleU?.full_name || (sale as any).sale_name || '').toLowerCase();

                      const matches = customer.includes(query) || pkg.includes(query) || rName.includes(query) || sName.includes(query);
                      if (!matches) return acc;
                    }

                    if (!acc[sId]) acc[sId] = [];
                    acc[sId].push(sale);
                    return acc;
                  }, {});

                  const entries = Object.entries(groupedSales);

                  if (entries.length === 0) {
                    return (
                      <tr>
                        <td colSpan={user.role === 'manager' ? 7 : 6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Calendar size={42} className="mb-3 opacity-25" />
                            <p className="font-semibold text-slate-600 text-sm">
                              {searchQuery 
                                ? `Không tìm thấy giao dịch nào phù hợp với từ khóa "${searchQuery}"`
                                : `Không có giao dịch nào ${selectedDay === 'All' ? `trong ${activeWeek.label.toLowerCase()}` : `trong ngày ${selectedDay}`}`}
                            </p>
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                              >
                                Xóa tìm kiếm
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (entries as [string, SaleRecord[]][]).map(([staffId, staffSales]) => {
                    const staff = users.find(u => u.id === staffId || u.full_name === staffId);
                    const staffName = staff?.full_name || staffId || 'Không xác định';
                    const commissionPercent = staff?.commission_percent || 0;
                    const isCollapsed = !!collapsedStaff[staffId];

                    // Subtotal stats for this staff
                    const todayAmount = staffSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const todayTip = (staffSales as SaleRecord[]).reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
                    const todayRevenue = todayAmount + todayTip;
                    const todayCommission = (todayAmount * commissionPercent / 100);

                    // Weekly stats for this staff in selected week
                    const weeklySales = weekSales.filter(s => {
                      const rawId = effectiveStaffType === 'reader' 
                        ? (s.reader_id || (s as any).reader_name)
                        : (s.sale_id || (s as any).sale_name);
                      const sStaff = users.find(u => 
                        u.id.toLowerCase() === String(rawId).toLowerCase() || 
                        u.full_name.toLowerCase() === String(rawId).toLowerCase()
                      );
                      return (sStaff?.id || rawId) === staffId;
                    });
                    const weeklyAmount = weeklySales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const weeklyTip = weeklySales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
                    const weeklyRevenue = weeklyAmount + weeklyTip;
                    const weeklyCommission = (weeklyAmount * commissionPercent / 100);

                    return (
                      <React.Fragment key={staffId}>
                        {/* Group Header Row (Collapsible Accordion) */}
                        <tr 
                          onClick={() => toggleStaffCollapse(staffId)}
                          className="bg-slate-50/80 hover:bg-indigo-50/40 border-y border-slate-100 transition-colors cursor-pointer select-none"
                        >
                          <td colSpan={user.role === 'manager' ? 7 : 6} className="px-6 py-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-1 rounded-lg transition-transform text-slate-400 ${isCollapsed ? '' : 'rotate-90'}`}>
                                  <ChevronRight size={16} />
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  effectiveStaffType === 'reader' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {effectiveStaffType === 'reader' ? 'Reader' : 'Sale'}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  {staffName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  ({commissionPercent}% hoa hồng)
                                </span>
                              </div>

                              <div className="flex items-center space-x-4 text-xs">
                                <span className="text-slate-500 font-medium">
                                  <strong className="text-slate-800 font-bold">{staffSales.length}</strong> đơn
                                </span>
                                <span className="text-indigo-600 font-bold font-mono">
                                  {formatVND(todayRevenue)}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  {isCollapsed ? 'Mở xem' : 'Thu gọn'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Data Rows */}
                        {!isCollapsed && (staffSales as SaleRecord[]).map(s => {
                          const readerStaff = users.find(u => u.id === s.reader_id || u.full_name === s.reader_id || (s as any).reader_name === u.full_name);
                          const saleStaff = users.find(u => u.id === s.sale_id || u.full_name === s.sale_id || (s as any).sale_name === u.full_name);
                          const readerName = readerStaff?.full_name || (s as any).reader_name || 'Chưa gán';
                          const saleName = saleStaff?.full_name || (s as any).sale_name || 'Chưa gán';

                          const dateFormatted = formatSaleDate(s.date);
                          const timeFormatted = formatSaleTime(s.created_at);
                          const dayOfSale = getDayName(s.date);

                          return (
                            <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                              {/* Thời gian */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-slate-700">
                                    {selectedDay === 'All' ? `${dayOfSale}, ${dateFormatted}` : dateFormatted}
                                  </span>
                                  {timeFormatted && (
                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                      <Clock size={10} />
                                      {timeFormatted}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Khách hàng */}
                              <td className="px-6 py-4 font-bold text-slate-900">
                                {s.customer_name}
                              </td>

                              {/* Gói dịch vụ */}
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                                  {s.package_name}
                                </span>
                              </td>

                              {/* Cặp đôi trực ca (Sale -> Reader) */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5 text-xs">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100 text-[11px]" title="Sale chốt đơn">
                                    Sale: {saleName}
                                  </span>
                                  <span className="text-slate-300">→</span>
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-100 text-[11px]" title="Reader đọc bài">
                                    Reader: {readerName}
                                  </span>
                                </div>
                              </td>

                              {/* Số tiền */}
                              <td className="px-6 py-4 text-right font-black font-mono text-slate-900">
                                {formatVND(s.amount)}
                              </td>

                              {/* Tiền Tip */}
                              <td className="px-6 py-4 text-right font-bold font-mono text-emerald-600">
                                {s.tip > 0 ? `+${formatVND(s.tip)}` : '0đ'}
                              </td>

                              {/* Thao tác */}
                              {user.role === 'manager' && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setEditingSale(s);
                                        setView('entry');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                      title="Sửa"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button 
                                      onClick={() => setDeletingSaleId(s)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Staff Subtotal Bar */}
                        {!isCollapsed && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={user.role === 'manager' ? 7 : 6} className="px-6 py-4 border-t border-slate-100">
                              <div className="bg-white rounded-xl border border-slate-100 p-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-6">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                      Doanh Thu {selectedDay === 'All' ? 'Toàn Tuần' : selectedDay}
                                    </span>
                                    <span className="text-lg font-bold text-blue-600">{formatVND(todayRevenue)}</span>
                                  </div>
                                  {selectedDay !== 'All' && (
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Doanh Thu Cả Tuần</span>
                                      <span className="text-lg font-bold text-slate-900">{formatVND(weeklyRevenue)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-5 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-100/50 w-full md:w-auto">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-0.5">
                                      Hoa Hồng ({commissionPercent}%)
                                    </span>
                                    <span className="text-lg font-bold text-emerald-700">{formatVND(weeklyCommission)}</span>
                                    {selectedDay !== 'All' && (
                                      <span className="text-[9px] text-emerald-600/50 font-medium mt-0.5">{selectedDay}: {formatVND(todayCommission)}</span>
                                    )}
                                  </div>
                                  {effectiveStaffType === 'reader' && (
                                    <div className="flex flex-col border-l border-emerald-200/50 pl-5">
                                      <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-0.5">Tiền Tip (100%)</span>
                                      <span className="text-lg font-bold text-emerald-700">{formatVND(weeklyTip)}</span>
                                      {selectedDay !== 'All' && (
                                        <span className="text-[9px] text-emerald-600/50 font-medium mt-0.5">{selectedDay}: {formatVND(todayTip)}</span>
                                      )}
                                    </div>
                                  )}
                                  <div className="bg-emerald-100 p-2.5 rounded-full hidden sm:block">
                                    <Wallet className="text-emerald-600" size={20} />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
              {/* Grand Total Footer */}
              {(() => {
                const effectiveStaffType = user.role === 'manager' ? staffType : user.role;
                const query = searchQuery.trim().toLowerCase();

                const filtered = weekSales.filter(s => {
                  const rawId = effectiveStaffType === 'reader' 
                    ? (s.reader_id || (s as any).reader_name)
                    : (s.sale_id || (s as any).sale_name);
                  if (!rawId || rawId === 'none' || rawId === 'N/A') return false;

                  const staff = users.find(u => 
                    u.id.toLowerCase() === String(rawId).toLowerCase() || 
                    u.full_name.toLowerCase() === String(rawId).toLowerCase()
                  );
                  const sId = staff?.id || rawId;
                  if (selectedReader !== 'All' && sId !== selectedReader) return false;

                  const matchDay = selectedDay === 'All' || getDayName(s.date) === selectedDay;
                  if (!matchDay) return false;

                  if (query) {
                    const customer = (s.customer_name || '').toLowerCase();
                    const pkg = (s.package_name || '').toLowerCase();
                    const readerU = users.find(u => u.id === s.reader_id);
                    const saleU = users.find(u => u.id === s.sale_id);
                    const rName = (readerU?.full_name || (s as any).reader_name || '').toLowerCase();
                    const sName = (saleU?.full_name || (s as any).sale_name || '').toLowerCase();
                    return customer.includes(query) || pkg.includes(query) || rName.includes(query) || sName.includes(query);
                  }
                  return true;
                });

                if (filtered.length === 0) return null;

                const totalAmount = filtered.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                const totalTip = filtered.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);

                return (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-slate-800 text-xs">
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-black uppercase text-slate-700">Tổng Toàn Bảng</span>
                      </td>
                      <td className="px-6 py-4 text-indigo-700 font-bold">
                        {filtered.length} đơn chốt
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {searchQuery ? `Khớp với "${searchQuery}"` : ''}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {selectedDay === 'All' ? 'Tất cả các ngày' : selectedDay}
                      </td>
                      <td className="px-6 py-4 text-right font-black font-mono text-sm text-slate-900">
                        {formatVND(totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-black font-mono text-sm text-emerald-600">
                        {formatVND(totalTip)}
                      </td>
                      {user.role === 'manager' && <td className="px-6 py-4"></td>}
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!deletingSale}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={async () => {
          if (deletingSale) {
            const res = await firebaseService.deleteSaleRecord(deletingSale.id);
            if (res.success) fetchData();
            else alert(res.message || 'Xóa thất bại');
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${deletingSale?.customer_name}"? Hành động này không thể hoàn tác.`}
      />
    </motion.div>
  );
};
