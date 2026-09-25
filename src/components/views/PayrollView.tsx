import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  X, 
  Shuffle, 
  Edit2, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  FileDown,
  Building2,
  AlertCircle
} from 'lucide-react';
import { User, SaleRecord, PayrollPeriod, PayrollStaffItem, AdHistoryRecord } from '../../types';
import { formatVND } from '../DashboardComponents';
import { getVNMonday, getVNDateStr } from '../../utils/dateUtils';
import { VIETNAM_BANKS, generateVietQRUrl, getRandomTransferNote } from '../../utils/vietqr';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';
import { 
  TrendingUp, 
  Megaphone, 
  Sparkles, 
  RefreshCw,
  Copy,
  Check,
  Maximize2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PayrollViewProps {
  user: User;
  users: User[];
  sales: SaleRecord[];
  payrollPeriods: PayrollPeriod[];
  adHistory?: AdHistoryRecord[];
  fetchData: () => Promise<void>;
  loading: boolean;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  user,
  users,
  sales,
  payrollPeriods,
  adHistory = [],
  fetchData,
  loading
}) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current');
  const [activeStaffForQR, setActiveStaffForQR] = useState<PayrollStaffItem | null>(null);
  const [transferNote, setTransferNote] = useState<string>('');
  const [qrTemplate, setQrTemplate] = useState<'compact2' | 'qr_only'>('compact2');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingBankStaff, setEditingBankStaff] = useState<PayrollStaffItem | null>(null);
  const [bankFormData, setBankFormData] = useState({ bank_name: 'MBBank', bank_account: '' });
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);
  const [isSyncingAds, setIsSyncingAds] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [currentPaidMap, setCurrentPaidMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tarot_current_payroll_paid');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCurrentPaid = (userId: string) => {
    setCurrentPaidMap(prev => {
      const updated = { ...prev, [userId]: !prev[userId] };
      try {
        localStorage.setItem('tarot_current_payroll_paid', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Tính toán kỳ lương hiện tại (Tuần này từ Thứ 2 đến Chủ nhật)
  const currentWeekStart = getVNMonday();
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const formatDateStr = (d: Date) => {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  };

  const formatYMD = (d: Date) => {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  const startYMD = formatYMD(currentWeekStart);
  const endYMD = formatYMD(currentWeekEnd);
  const currentPeriodTitle = `Tuần này (${formatDateStr(currentWeekStart)} - ${formatDateStr(currentWeekEnd)})`;

  // Tính toán các mục lương cho tuần hiện tại
  const calculateCurrentWeekItems = (): PayrollStaffItem[] => {
    const items: PayrollStaffItem[] = [];

    users.filter(u => u.status !== 'inactive' && u.role !== 'manager').forEach(u => {
      // Lọc các đơn hàng trong tuần của user
      const userSales = sales.filter(s => {
        if (s.date < startYMD || s.date > endYMD) return false;

        const rId = String(s.reader_id || (s as any).reader_name || '').trim().toLowerCase();
        const sId = String(s.sale_id || (s as any).sale_name || '').trim().toLowerCase();
        const uId = u.id.trim().toLowerCase();
        const uName = u.full_name.trim().toLowerCase();

        if (u.role === 'reader') {
          return rId === uId || rId === uName;
        } else if (u.role === 'sale') {
          return sId === uId || sId === uName;
        }
        return false;
      });

      const totalAmount = userSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const totalTip = u.role === 'reader' 
        ? userSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0)
        : 0;

      const commission = Math.round(totalAmount * (Number(u.commission_percent || 0) / 100));
      const netPayout = commission + totalTip;

      items.push({
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
        is_paid: !!currentPaidMap[u.id]
      });
    });

    return items;
  };

  const currentItems = calculateCurrentWeekItems();

  // Doanh thu shop nhận trong tuần hiện tại (Tổng amount + tip từ các đơn hoàn thành trong tuần)
  const currentWeekSales = sales.filter(s => s.date >= startYMD && s.date <= endYMD);
  const currentWeekTotalRevenue = currentWeekSales.reduce(
    (sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0),
    0
  );

  // Chi phí chạy Ads Facebook trong tuần này (từ adHistory)
  const currentWeekAdSpend = (adHistory || []).reduce((sum, h) => {
    if (h.date >= startYMD && h.date <= endYMD) {
      return sum + (Number(h.spend) || 0);
    }
    return sum;
  }, 0);

  const currentWeekPayout = currentItems.reduce((sum, i) => sum + i.net_payout, 0);
  const currentWeekOwnerNetProfit = currentWeekTotalRevenue - currentWeekPayout - currentWeekAdSpend;

  // Kỳ lương đang chọn (hoặc kỳ hiện tại hoặc kỳ đã lưu trong Firestore)
  const selectedSavedPeriod = payrollPeriods.find(p => p.id === selectedPeriodId);
  const activeItems = selectedPeriodId === 'current' ? currentItems : (selectedSavedPeriod?.items || []);
  const activeTitle = selectedPeriodId === 'current' ? currentPeriodTitle : (selectedSavedPeriod?.title || '');

  const activeTotalRevenue = selectedPeriodId === 'current'
    ? currentWeekTotalRevenue
    : (selectedSavedPeriod?.total_revenue || 0);

  const activeTotalPayout = activeItems.reduce((sum, i) => sum + i.net_payout, 0);

  const activeAdSpend = selectedPeriodId === 'current'
    ? currentWeekAdSpend
    : (selectedSavedPeriod?.total_ad_spend || 0);

  const activeOwnerNetProfit = selectedPeriodId === 'current'
    ? currentWeekOwnerNetProfit
    : (selectedSavedPeriod?.owner_net_profit !== undefined
        ? selectedSavedPeriod.owner_net_profit
        : (activeTotalRevenue - activeTotalPayout - activeAdSpend));

  const totalPayout = activeTotalPayout;
  const paidCount = activeItems.filter(i => i.is_paid).length;
  const unpaidCount = activeItems.length - paidCount;

  // Gọi API cập nhật chi tiêu Facebook Ads hôm nay / tuần này theo thời gian thực
  const handleSyncFbAds = async () => {
    try {
      setIsSyncingAds(true);
      setSyncMessage(null);
      const res = await fetch('/api/sync-fb-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message || 'Đã đồng bộ tiền Ads hôm nay từ Facebook thành công!');
        await fetchData();
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        alert(data.message || 'Không thể đồng bộ Ads từ Facebook.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi kết nối tới máy chủ đồng bộ Ads.');
    } finally {
      setIsSyncingAds(false);
    }
  };

  // Xử lý mở Modal QR cho nhân viên
  const handleOpenQRModal = (staff: PayrollStaffItem) => {
    setActiveStaffForQR(staff);
    // Sinh nội dung chuyển khoản ngẫu nhiên, không dùng từ "lương"
    setTransferNote(getRandomTransferNote());
  };

  // Đổi ngẫu nhiên nội dung chuyển khoản
  const handleRandomizeNote = () => {
    setTransferNote(getRandomTransferNote());
  };

  // Đánh dấu đã thanh toán
  const handleTogglePaid = async (staff: PayrollStaffItem) => {
    if (selectedPeriodId === 'current') {
      toggleCurrentPaid(staff.user_id);
      return;
    }

    const newPaidStatus = !staff.is_paid;
    try {
      await firebaseService.updatePayrollItem(selectedPeriodId, staff.user_id, {
        is_paid: newPaidStatus,
        paid_at: newPaidStatus ? new Date().toISOString() : undefined,
        payment_note: transferNote || staff.payment_note
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật trạng thái');
    }
  };

  // Lưu kỳ lương hiện tại
  const handleSnapshotCurrentPeriod = async () => {
    if (currentItems.length === 0) {
      alert('Chưa có dữ liệu nhân viên để chốt lương.');
      return;
    }

    const confirmMsg = 
      `Xác nhận chốt và lưu Bảng Lương: "${currentPeriodTitle}"?\n\n` +
      `💰 Tổng Doanh Thu Shop Nhận: ${formatVND(currentWeekTotalRevenue)}\n` +
      `👥 Tổng Lương Nhân Viên: ${formatVND(currentWeekPayout)}\n` +
      `📢 Tiền Chạy Ads (Facebook): ${formatVND(currentWeekAdSpend)}\n` +
      `----------------------------------------\n` +
      `💵 LỢI NHUẬN BẠN THỰC NHẬN: ${formatVND(currentWeekOwnerNetProfit)}`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setIsSavingPeriod(true);
      const periodId = `payroll_${currentWeekStart.toISOString().split('T')[0]}`;
      const newPeriod: PayrollPeriod = {
        id: periodId,
        title: currentPeriodTitle,
        start_date: currentWeekStart.toISOString().split('T')[0],
        end_date: currentWeekEnd.toISOString().split('T')[0],
        total_revenue: currentWeekTotalRevenue,
        total_payout: currentWeekPayout,
        total_ad_spend: currentWeekAdSpend,
        owner_net_profit: currentWeekOwnerNetProfit,
        items: currentItems,
        created_at: new Date().toISOString()
      };

      const res = await firebaseService.savePayrollPeriod(newPeriod);
      if (res.success) {
        alert('Đã chốt và lưu Bảng Lương tuần thành công!');
        await fetchData();
        setSelectedPeriodId(periodId);
      } else {
        alert('Lưu kỳ lương thất bại: ' + res.message);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi hệ thống');
    } finally {
      setIsSavingPeriod(false);
    }
  };

  // Lưu thông tin ngân hàng cho nhân viên
  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankStaff) return;

    try {
      await firebaseService.updateStaffBank(
        editingBankStaff.user_id,
        bankFormData.bank_name,
        bankFormData.bank_account
      );

      // Nếu đang ở kỳ lương đã lưu, cập nhật luôn item trong kỳ
      if (selectedPeriodId !== 'current') {
        await firebaseService.updatePayrollItem(selectedPeriodId, editingBankStaff.user_id, {
          bank_name: bankFormData.bank_name,
          bank_account: bankFormData.bank_account
        });
      }

      setEditingBankStaff(null);
      await fetchData();
      alert('Đã cập nhật thông tin ngân hàng cho nhân viên!');
    } catch (err) {
      console.error(err);
      alert('Cập nhật thất bại');
    }
  };

  // Xuất Excel bảng lương kèm tổng kết tài chính Chủ Shop
  const handleExportPayrollExcel = () => {
    const rows = [
      [`BẢNG LƯƠNG & TỔNG KẾT TÀI CHÍNH - ${activeTitle.toUpperCase()}`],
      [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`],
      [],
      ['TỔNG KẾT TÀI CHÍNH SHOP (CHỦ SHOP THỰC NHẬN):'],
      ['1. Tổng Doanh Thu Shop Nhận (Gói + Tip)', activeTotalRevenue],
      ['2. Tổng Chi Trả Lương Nhân Viên (Hoa hồng + Tip)', activeTotalPayout],
      ['3. Chi Phí Chạy Quảng Cáo Facebook (Ads)', activeAdSpend],
      ['=> 4. LỢI NHUẬN BẠN THỰC NHẬN (BỎ TÚI)', activeOwnerNetProfit],
      [],
      ['CHI TIẾT LƯƠNG TỪNG NHÂN VIÊN:'],
      ['STT', 'Họ và Tên', 'Vai Trò', 'Doanh Thu Gói', 'Hoa Hồng (%)', 'Tiền Hoa Hồng', 'Tiền Tip (100%)', 'Thực Nhận', 'Ngân Hàng', 'Số Tài Khoản', 'Trạng Thái']
    ];

    activeItems.forEach((item, index) => {
      rows.push([
        index + 1,
        item.user_name,
        item.role.toUpperCase(),
        item.total_amount,
        `${item.commission_percent}%`,
        item.commission,
        item.total_tip,
        item.net_payout,
        item.bank_name || 'N/A',
        item.bank_account || 'N/A',
        item.is_paid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'
      ]);
    });

    rows.push([]);
    rows.push([
      'TỔNG CỘNG LƯƠNG NHÂN VIÊN', '', '', '', '', '', '', activeTotalPayout, '', '', `${paidCount}/${activeItems.length} đã thanh toán`
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Bang_Luong');
    XLSX.writeFile(wb, `Bang_Luong_Tarot_${selectedPeriodId}.xlsx`);
  };

  // Lấy mã ngân hàng theo tên
  const getBankCode = (bankName?: string) => {
    if (!bankName) return 'MB';
    const found = VIETNAM_BANKS.find(b => 
      b.shortName.toLowerCase() === bankName.toLowerCase() || 
      b.code.toLowerCase() === bankName.toLowerCase()
    );
    return found ? found.code : 'MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
            <span>Bảng Lương & Chi Trả Hoa Hồng</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold uppercase">
              1-Click VietQR
            </span>
          </h1>
          <p className="text-slate-500">Chốt kỳ lương tuần và quét mã VietQR chuyển tiền cho nhân viên không cần gõ STK</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bộ chọn kỳ lương */}
          <div className="relative">
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm pr-8 cursor-pointer"
            >
              <option value="current">📅 {currentPeriodTitle} (Đang chạy)</option>
              {payrollPeriods.map(p => (
                <option key={p.id} value={p.id}>
                  📁 {p.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportPayrollExcel}
            className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-colors shadow-sm text-sm cursor-pointer"
          >
            <FileDown size={18} />
            <span>Xuất Excel</span>
          </button>

          {selectedPeriodId === 'current' ? (
            <button
              onClick={handleSnapshotCurrentPeriod}
              disabled={isSavingPeriod}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 text-sm cursor-pointer"
            >
              <Wallet size={18} />
              <span>{isSavingPeriod ? 'Đang lưu...' : 'Chốt & Lưu Kỳ Lương Này'}</span>
            </button>
          ) : (
            <button
              onClick={() => setDeletingPeriodId(selectedPeriodId)}
              className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-colors shadow-sm text-sm cursor-pointer"
            >
              <Trash2 size={18} />
              <span>Xóa Kỳ Này</span>
            </button>
          )}
        </div>
      </div>

      {/* KHỐI 4 THẺ TÀI CHÍNH TỔNG QUAN SHOP & LỢI NHUẬN THỰC NHẬN */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-amber-500" size={20} />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Tài Chính Shop & Lợi Nhuận Thực Nhận Của Bạn
            </h2>
          </div>
          {selectedPeriodId === 'current' && (
            <button
              onClick={handleSyncFbAds}
              disabled={isSyncingAds}
              className="flex items-center space-x-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all border border-indigo-200 shadow-sm disabled:opacity-60 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw size={14} className={isSyncingAds ? 'animate-spin' : ''} />
              <span>{isSyncingAds ? 'Đang kéo Ads realtime...' : '⚡ Cập Nhật Ads Hôm Nay (Real-time)'}</span>
            </button>
          )}
        </div>

        {syncMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{syncMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Doanh Thu Shop */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">1. Tổng Doanh Thu Shop</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp size={18} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(activeTotalRevenue)}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Doanh thu gói + Tip khách trả</p>
            </div>
          </div>

          {/* Card 2: Lương Nhân Viên */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">2. Lương Nhân Viên</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Wallet size={18} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-indigo-600 tracking-tight">{formatVND(activeTotalPayout)}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Hoa hồng + Tip ({activeItems.length} NV)</p>
            </div>
          </div>

          {/* Card 3: Chi Phí Chạy Ads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">3. Tiền Chạy Ads (FB)</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Megaphone size={18} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600 tracking-tight">{formatVND(activeAdSpend)}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Meta Ads theo ngày (Tự động)</p>
            </div>
          </div>

          {/* Card 4: Lợi Nhuận Bạn Thực Nhận */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-md text-white flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="flex items-center justify-between opacity-95 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">4. Lợi Nhuận BẠN Thực Nhận</span>
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={18} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight">{formatVND(activeOwnerNetProfit)}</p>
              <p className="text-[11px] font-medium text-emerald-100 mt-1">
                = (1) Doanh thu - (2) Lương - (3) Ads
              </p>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái chi trả VietQR */}
        <div className="bg-slate-100/70 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-200/50">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700">Tiến độ chi trả lương VietQR:</span>
            <span className="text-emerald-700 font-bold flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Đã chuyển: {paidCount} / {activeItems.length} người</span>
            </span>
            <span className="text-amber-700 font-bold flex items-center space-x-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">
              <Clock size={14} className="text-amber-600" />
              <span>Chờ chuyển: {unpaidCount} người</span>
            </span>
          </div>
          <div className="text-slate-500 font-medium hidden md:block">
            💡 Quét VietQR tự động điền STK, số tiền & nội dung an toàn không có chữ "lương".
          </div>
        </div>
      </div>

      {/* Bảng chi tiết nhân viên */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg uppercase tracking-wide">
            Danh sách nhân viên — {activeTitle}
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {activeItems.length} nhân viên (Reader & Sale)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-100">
                <th className="px-6 py-4">Nhân Viên</th>
                <th className="px-6 py-4">Tài Khoản Nhận Tiền</th>
                <th className="px-6 py-4 text-right">Doanh Thu Gói</th>
                <th className="px-6 py-4 text-right">Hoa Hồng</th>
                <th className="px-6 py-4 text-right">Tiền Tip (100%)</th>
                <th className="px-6 py-4 text-right font-black text-indigo-600">Thực Nhận</th>
                <th className="px-6 py-4 text-center">Thanh Toán VietQR</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    Chưa có nhân viên nào trong kỳ lương này.
                  </td>
                </tr>
              ) : (
                activeItems.map((item) => {
                  const hasBank = !!item.bank_account && item.bank_account.trim().length > 0;
                  return (
                    <tr key={item.user_id} className={`hover:bg-slate-50/50 transition-colors ${item.is_paid ? 'bg-emerald-50/20' : ''}`}>
                      {/* Tên & Role */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{item.user_name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider inline-block w-fit px-2 py-0.5 rounded ${
                            item.role === 'reader' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {item.role} ({item.commission_percent}%)
                          </span>
                        </div>
                      </td>

                      {/* Ngân hàng & STK */}
                      <td className="px-6 py-4">
                        {hasBank ? (
                          <div className="flex items-center space-x-2 group">
                            <Building2 size={16} className="text-slate-400" />
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{item.bank_name || 'MBBank'}</p>
                              <p className="text-slate-500 font-mono text-xs">{item.bank_account}</p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingBankStaff(item);
                                setBankFormData({
                                  bank_name: item.bank_name || 'MBBank',
                                  bank_account: item.bank_account || ''
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                              title="Sửa tài khoản ngân hàng"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBankStaff(item);
                              setBankFormData({ bank_name: 'MBBank', bank_account: '' });
                            }}
                            className="inline-flex items-center space-x-1.5 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                          >
                            <AlertCircle size={14} />
                            <span>+ Thêm STK</span>
                          </button>
                        )}
                      </td>

                      {/* Doanh thu gói */}
                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        {formatVND(item.total_amount)}
                      </td>

                      {/* Hoa hồng */}
                      <td className="px-6 py-4 text-right font-medium text-slate-800">
                        {formatVND(item.commission)}
                      </td>

                      {/* Tip */}
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {formatVND(item.total_tip)}
                      </td>

                      {/* Thực nhận */}
                      <td className="px-6 py-4 text-right font-black text-indigo-600 text-base">
                        {formatVND(item.net_payout)}
                      </td>

                      {/* Nút VietQR */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenQRModal(item)}
                          className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
                        >
                          <QrCode size={15} />
                          <span>Mã VietQR</span>
                        </button>
                      </td>

                      {/* Trạng thái thanh toán */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleTogglePaid(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            item.is_paid 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.is_paid ? '✓ Đã chuyển' : 'Chưa chuyển'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal hiển thị mã VietQR động */}
      <AnimatePresence>
        {activeStaffForQR && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-auto flex flex-col max-h-[92vh]"
            >
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold flex items-center space-x-2">
                    <span>Thanh Toán VietQR 24/7</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Napas 247</span>
                  </h3>
                  <p className="text-indigo-100 text-xs">Quét bằng bất kỳ App Ngân Hàng nào</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQrTemplate(t => t === 'compact2' ? 'qr_only' : 'compact2')}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-sm"
                    title="Chuyển chế độ xem mã QR"
                  >
                    <Maximize2 size={13} />
                    <span>{qrTemplate === 'compact2' ? '🔍 QR Siêu To' : '📋 Mẫu Chuẩn'}</span>
                  </button>
                  <button
                    onClick={() => setActiveStaffForQR(null)}
                    className="p-1.5 text-white/80 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 md:p-6 overflow-y-auto">
                {/* Kiểm tra có STK hay chưa */}
                {!activeStaffForQR.bank_account ? (
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center space-y-3">
                    <AlertCircle size={36} className="text-amber-500 mx-auto" />
                    <div>
                      <h4 className="font-bold text-amber-900">Chưa có Số tài khoản!</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        Nhân viên <strong>{activeStaffForQR.user_name}</strong> chưa cập nhật thông tin ngân hàng.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingBankStaff(activeStaffForQR);
                        setBankFormData({ bank_name: 'MBBank', bank_account: '' });
                        setActiveStaffForQR(null);
                      }}
                      className="bg-amber-600 text-white text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Bổ sung STK ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Cột trái: Ảnh VietQR động (To, Rõ nét) */}
                    <div className="md:col-span-6 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center">
                      <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 w-full max-w-[290px] flex items-center justify-center">
                        <img
                          src={generateVietQRUrl({
                            bankCodeOrBin: getBankCode(activeStaffForQR.bank_name),
                            accountNumber: activeStaffForQR.bank_account,
                            amount: activeStaffForQR.net_payout,
                            note: transferNote,
                            accountName: activeStaffForQR.user_name,
                            template: qrTemplate
                          })}
                          alt="VietQR"
                          className={`w-full h-auto mx-auto object-contain transition-all ${
                            qrTemplate === 'qr_only' ? 'max-h-[280px] p-2' : 'max-h-[300px]'
                          }`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex items-center justify-between w-full max-w-[290px] mt-2.5 px-1">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {qrTemplate === 'qr_only' ? '⚡ QR phóng to không viền' : '✓ Tự điền STK & số tiền'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQrTemplate(t => t === 'compact2' ? 'qr_only' : 'compact2')}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          {qrTemplate === 'compact2' ? 'Phóng to QR ↗' : 'Mẫu có khung ↙'}
                        </button>
                      </div>
                    </div>

                    {/* Cột phải: Thông tin & Nội dung chuyển khoản */}
                    <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                      {/* Tùy chỉnh Nội dung chuyển khoản (Không dùng từ lương) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Nội dung chuyển khoản
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleCopyText(transferNote, 'note')}
                              className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                            >
                              {copiedField === 'note' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              <span>{copiedField === 'note' ? 'Đã copy' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRandomizeNote}
                              className="flex items-center space-x-1 text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors cursor-pointer"
                            >
                              <Shuffle size={13} />
                              <span>🎲 Đổi ngẫu nhiên</span>
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={transferNote}
                          onChange={e => setTransferNote(e.target.value)}
                          placeholder="Nhập nội dung chuyển tiền..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 italic">
                          * Nội dung tự nhiên, không ghi chữ "lương". Bạn có thể tự gõ nội dung tùy ý.
                        </p>
                      </div>

                      {/* Chi tiết người nhận */}
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs border border-slate-200/60">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Người nhận:</span>
                          <span className="font-bold text-slate-900 text-sm">{activeStaffForQR.user_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Ngân hàng:</span>
                          <span className="font-bold text-slate-900">{activeStaffForQR.bank_name || 'MBBank'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Số tài khoản:</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold font-mono text-slate-900 text-sm">{activeStaffForQR.bank_account}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(activeStaffForQR.bank_account || '', 'stk')}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Sao chép số tài khoản"
                            >
                              {copiedField === 'stk' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="text-slate-700 font-bold">Số tiền chuyển:</span>
                          <span className="font-black text-indigo-600 text-lg">{formatVND(activeStaffForQR.net_payout)}</span>
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="flex gap-2.5 pt-1 mt-auto">
                        <button
                          onClick={() => setActiveStaffForQR(null)}
                          className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs cursor-pointer"
                        >
                          Đóng
                        </button>
                        <button
                          onClick={async () => {
                            await handleTogglePaid(activeStaffForQR);
                            setActiveStaffForQR(null);
                          }}
                          className={`flex-1 py-3 font-bold rounded-xl transition-colors text-xs shadow-md cursor-pointer ${
                            (selectedPeriodId === 'current' ? !!currentPaidMap[activeStaffForQR.user_id] : activeStaffForQR.is_paid)
                              ? 'bg-amber-600 text-white hover:bg-amber-700' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                          }`}
                        >
                          {(selectedPeriodId === 'current' ? !!currentPaidMap[activeStaffForQR.user_id] : activeStaffForQR.is_paid)
                            ? 'Đánh dấu chưa chuyển' 
                            : '✓ Đánh dấu đã chuyển'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal cập nhật STK cho nhân viên */}
      <AnimatePresence>
        {editingBankStaff && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 my-auto max-h-[92vh] flex flex-col"
            >
              <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold">Cập Nhật Tài Khoản Ngân Hàng</h3>
                  <p className="text-indigo-100 text-xs mt-0.5">Nhân viên: {editingBankStaff.user_name}</p>
                </div>
                <button
                  onClick={() => setEditingBankStaff(null)}
                  className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveBankInfo} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn Ngân Hàng</label>
                  <select
                    value={bankFormData.bank_name}
                    onChange={e => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    {VIETNAM_BANKS.map(b => (
                      <option key={b.code} value={b.shortName}>
                        {b.shortName} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Số Tài Khoản</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.bank_account}
                    onChange={e => setBankFormData({ ...bankFormData, bank_account: e.target.value })}
                    placeholder="VD: 0987654321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    * Thông tin này sẽ được lưu cố định vào hồ sơ nhân viên để tự động tạo QR cho các tuần sau.
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingBankStaff(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm shadow-lg shadow-indigo-100"
                  >
                    Lưu Thông Tin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal xác nhận xóa kỳ lương */}
      <ConfirmModal
        isOpen={!!deletingPeriodId}
        onClose={() => setDeletingPeriodId(null)}
        onConfirm={async () => {
          if (deletingPeriodId) {
            const res = await firebaseService.deletePayrollPeriod(deletingPeriodId);
            if (res.success) {
              setSelectedPeriodId('current');
              await fetchData();
            } else {
              alert(res.message || 'Xóa kỳ lương thất bại');
            }
          }
        }}
        title="Xác nhận xóa Bảng Lương"
        message="Bạn có chắc chắn muốn xóa bản lưu của kỳ lương này? Dữ liệu lịch sử sẽ bị mất."
      />
    </motion.div>
  );
};
