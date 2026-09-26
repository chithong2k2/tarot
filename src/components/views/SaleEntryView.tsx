import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  QrCode, 
  X, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  Zap, 
  ArrowRight,
  Check,
  Calendar,
  Clock
} from 'lucide-react';
import { User, SaleRecord, SystemSettings } from '../../types';
import { formatVND } from '../DashboardComponents';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';

export interface PackageOption {
  id: string;
  name: string;
  label: string;
  price: number;
  popular?: boolean;
}

export const PACKAGE_TILES: PackageOption[] = [
  { id: '1_cau', name: '1 câu', label: '1 Câu', price: 35000 },
  { id: '3_cau', name: '3 câu', label: '3 Câu', price: 80000 },
  { id: '5_cau', name: '5 câu', label: '5 Câu', price: 100000 },
  { id: '7_cau', name: '7 câu', label: '7 Câu', price: 129000 },
  { id: '10_cau', name: '10 câu', label: '10 Câu', price: 169000, popular: true },
  { id: '1h', name: 'Trọn gói 1h', label: 'Trọn gói 1h', price: 300000 },
  { id: 'nam', name: 'Gói Năm', label: 'Gói Năm', price: 500000 },
];

export const TIP_PRESETS = [
  { label: '0 ₫', value: 0 },
  { label: '+20.000 ₫', value: 20000 },
  { label: '+50.000 ₫', value: 50000 },
  { label: '+100.000 ₫', value: 100000 },
  { label: '+200.000 ₫', value: 200000 },
];

interface ParsedQuickEntry {
  customerName: string;
  amount: number;
  packageName: string;
  readerId: string;
  readerName: string;
  saleId: string;
  saleName: string;
}

interface SaleEntryViewProps {
  editingSale: SaleRecord | null;
  setEditingSale: (sale: SaleRecord | null) => void;
  saleForm: Partial<SaleRecord>;
  setSaleForm: (form: Partial<SaleRecord>) => void;
  handleSaleSubmit: (e: React.FormEvent) => void;
  users: User[];
  sales?: SaleRecord[];
  fetchData: () => Promise<void>;
  setView: (view: any) => void;
  loading: boolean;
  systemSettings?: SystemSettings;
}

export const SaleEntryView: React.FC<SaleEntryViewProps> = ({
  editingSale,
  setEditingSale,
  saleForm,
  setSaleForm,
  handleSaleSubmit,
  users,
  sales = [],
  fetchData,
  setView,
  loading,
  systemSettings
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedQuickEntry | null>(null);

  // Consecutive entry states
  const [saveAndContinueLoading, setSaveAndContinueLoading] = useState(false);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [sessionSales, setSessionSales] = useState<SaleRecord[]>([]);

  const customerInputRef = useRef<HTMLInputElement>(null);

  // Initialize session sales from today's orders
  useEffect(() => {
    const today = saleForm.date || new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(s => s.date === today);
    setSessionSales(todaySales.slice(0, 10));
  }, [sales, saleForm.date]);

  // Current shift detection
  const getShiftInfo = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 14) {
      return { name: 'Ca sáng', time: '08:00 – 14:00' };
    } else if (hour >= 14 && hour < 20) {
      return { name: 'Ca chiều', time: '14:00 – 20:00' };
    } else {
      return { name: 'Ca tối', time: '20:00 – 02:00' };
    }
  };
  const shiftInfo = getShiftInfo();

  // Helper map users
  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  // Quick entry parsing
  const handleQuickEntry = () => {
    if (!quickInput.trim()) return;

    // Regex to match price e.g. 169k, 169000, 169.000
    const priceRegex = /(\d+(?:\.\d+)?)\s*k/i;
    const priceMatch = quickInput.match(priceRegex);

    if (priceMatch) {
      const amount = parseFloat(priceMatch[1].replace(/\./g, '')) * 1000;
      const customerName = quickInput.substring(0, priceMatch.index).trim();
      const remaining = quickInput.substring(priceMatch.index! + priceMatch[0].length).trim();
      
      const staffParts = remaining.split(/[,\s]+/).filter(Boolean);
      
      let readerId = '';
      let readerName = '';
      let saleId = '';
      let saleName = '';

      staffParts.forEach(part => {
        const lowerPart = part.toLowerCase();
        const match = users.find(u => 
          u.full_name.toLowerCase().includes(lowerPart) || 
          u.username.toLowerCase().includes(lowerPart)
        );

        if (match) {
          if (match.role === 'reader' && !readerId) {
            readerId = match.id;
            readerName = match.full_name;
          }
          if (match.role === 'sale' && !saleId) {
            saleId = match.id;
            saleName = match.full_name;
          }
        }
      });

      // Map package name
      const matchedTile = PACKAGE_TILES.find(p => p.price === amount);
      const packageName = matchedTile ? matchedTile.label : `${amount / 1000}k`;

      setParsedData({
        customerName,
        amount,
        packageName,
        readerId: readerId || saleForm.reader_id || '',
        readerName: readerName || (saleForm.reader_id ? userMap.get(saleForm.reader_id)?.full_name || '' : 'Chưa chọn'),
        saleId: saleId || saleForm.sale_id || '',
        saleName: saleName || (saleForm.sale_id ? userMap.get(saleForm.sale_id)?.full_name || '' : 'Chưa chọn')
      });
    } else {
      alert('Không tìm thấy giá tiền (ví dụ: 169k) trong nội dung nhập nhanh.');
    }
  };

  // Apply parsed data to form
  const applyParsedData = () => {
    if (!parsedData) return;
    setSaleForm({
      ...saleForm,
      customer_name: parsedData.customerName,
      amount: parsedData.amount,
      package_name: parsedData.packageName,
      reader_id: parsedData.readerId || saleForm.reader_id,
      sale_id: parsedData.saleId || saleForm.sale_id
    });
    setParsedData(null);
    setQuickInput('');
  };

  // Save and continue for fast consecutive entries
  const handleSaveAndContinue = async () => {
    if (!saleForm.customer_name?.trim()) {
      alert('Vui lòng nhập tên khách hàng!');
      customerInputRef.current?.focus();
      return;
    }
    if (!saleForm.reader_id) {
      alert('Vui lòng chọn Reader phụ trách!');
      return;
    }
    if (!saleForm.amount || Number(saleForm.amount) <= 0) {
      alert('Vui lòng chọn hoặc nhập số tiền gói xem bài!');
      return;
    }

    try {
      setSaveAndContinueLoading(true);
      const res = await firebaseService.addSaleRecord(saleForm);
      if (res.success) {
        const savedCustomer = saleForm.customer_name;
        const savedAmount = formatVND(Number(saleForm.amount) || 0);
        const nextCount = consecutiveCount + 1;
        setConsecutiveCount(nextCount);

        // Prepend to session sales list on the right
        const newRecord: SaleRecord = {
          id: (res as any).id || Date.now().toString(),
          date: saleForm.date || new Date().toISOString().slice(0, 10),
          customer_name: savedCustomer,
          amount: Number(saleForm.amount) || 0,
          tip: Number(saleForm.tip) || 0,
          package_name: saleForm.package_name || 'Tarot',
          reader_id: saleForm.reader_id || '',
          sale_id: saleForm.sale_id || 'none',
          created_at: new Date().toISOString()
        };
        setSessionSales(prev => [newRecord, ...prev]);

        // Keep reader_id, sale_id, date intact for fast consecutive entry
        setSaleForm({
          ...saleForm,
          customer_name: '',
          package_name: '',
          amount: 0,
          tip: 0
        });
        setParsedData(null);

        setSuccessNotification(`Đã lưu đơn #${nextCount} của khách "${savedCustomer}" (${savedAmount})!`);
        setTimeout(() => setSuccessNotification(null), 4000);

        // Refresh background data
        fetchData();

        // Focus back to customer input
        setTimeout(() => {
          customerInputRef.current?.focus();
        }, 150);
      } else {
        alert(res.message || 'Lưu thất bại');
      }
    } catch (err: any) {
      alert('Lỗi khi lưu đơn: ' + (err?.message || String(err)));
    } finally {
      setSaveAndContinueLoading(false);
    }
  };

  // Reset form
  const handleResetForm = () => {
    setSaleForm({
      ...saleForm,
      customer_name: '',
      package_name: '',
      amount: 0,
      tip: 0
    });
    setParsedData(null);
    setQuickInput('');
    customerInputRef.current?.focus();
  };

  // Keyboard shortcut Ctrl + Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (editingSale) {
          const form = document.getElementById('sale-entry-form') as HTMLFormElement;
          form?.requestSubmit();
        } else {
          handleSaveAndContinue();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saleForm, editingSale]);

  // VietQR modal url
  const generateVietQR = () => {
    if (!systemSettings?.bank_account_number) return '';
    const bankId = systemSettings.bank_name === 'MBBank' ? 'MB' : '970422';
    const accountNo = systemSettings.bank_account_number;
    const amount = saleForm.amount || 0;
    const description = `THANH TOAN ${saleForm.customer_name?.toUpperCase() || 'KHACH HANG'}`;
    const accountName = systemSettings.bank_account_name || '';

    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
  };

  // Right sidebar calculations
  const sessionTotalRev = sessionSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const sessionTotalTip = sessionSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
  const sessionAvgRev = sessionSales.length > 0 ? Math.round(sessionTotalRev / sessionSales.length) : 0;

  // Format order time
  const formatOrderTime = (sale: SaleRecord) => {
    if (sale.created_at) {
      try {
        const d = new Date(sale.created_at);
        if (!isNaN(d.getTime())) {
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    }
    return '--:--';
  };

  return (
    <motion.div 
      key="entry"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="max-w-6xl mx-auto space-y-5 pb-12"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nhập Doanh Thu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ghi nhận doanh thu & hoa hồng cho nhân sự theo từng ca</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Ngày coi</span>
            <input 
              type="date"
              required
              value={saleForm.date}
              onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
              className="font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
            />
          </div>

          {/* Current Shift Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{shiftInfo.name} · {shiftInfo.time}</span>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================
            LEFT COLUMN (lg:col-span-8): The Form Card
        ============================================================ */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-3.5">
          
          {/* Feature 5: Consecutive entry success alert */}
          <AnimatePresence>
            {successNotification && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{successNotification}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setSuccessNotification(null)}
                  className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section: Nhập nhanh */}
          {!editingSale && (
            <div className="bg-purple-50/40 border border-purple-100/80 rounded-2xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">
                  <Zap size={12} className="fill-purple-600 text-purple-600" />
                  <span>Nhập nhanh</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Cú pháp: <strong className="text-slate-500 font-semibold">Tên khách · Số tiền · Reader · Sale</strong>
                </span>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text"
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickEntry())}
                  placeholder="Chu Khánh 169k Giang, Thông"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-sm outline-none focus:ring-2 focus:ring-purple-600 font-medium placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={handleQuickEntry}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-100 transition-colors cursor-pointer shrink-0"
                >
                  Phân tích
                </button>
              </div>

              {/* Parsed Result Preview */}
              {parsedData && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-purple-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                      Khách: <strong className="text-slate-900">{parsedData.customerName || '...'}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                      Số tiền: <strong className="text-emerald-600">{formatVND(parsedData.amount || 0)}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                      Reader: <strong className="text-slate-900">{parsedData.readerName || '...'}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                      Sale: <strong className="text-slate-900">{parsedData.saleName || '...'}</strong>
                    </span>
                  </div>

                  <button 
                    type="button"
                    onClick={applyParsedData}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Áp dụng vào form →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form id="sale-entry-form" onSubmit={handleSaleSubmit} className="space-y-3.5">
            
            {/* Section 1: NGƯỜI THỰC HIỆN */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center">1</span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">NGƯỜI THỰC HIỆN</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Reader *</label>
                  <select 
                    required
                    value={saleForm.reader_id}
                    onChange={e => setSaleForm({ ...saleForm, reader_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-600 bg-white text-sm font-medium text-slate-800"
                  >
                    <option value="">-- Chọn Reader --</option>
                    {users.filter(u => u.role === 'reader' && u.status !== 'inactive').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Sale *</label>
                  <select 
                    required
                    value={saleForm.sale_id}
                    onChange={e => setSaleForm({ ...saleForm, sale_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-600 bg-white text-sm font-medium text-slate-800"
                  >
                    <option value="">-- Chọn Sale --</option>
                    {users.filter(u => u.role === 'sale' && u.status !== 'inactive').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: KHÁCH HÀNG & GÓI */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center">2</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">KHÁCH HÀNG & GÓI</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Chọn 1 lần — tự điền tên gói & số tiền
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tên khách hàng *</label>
                  <input 
                    ref={customerInputRef}
                    type="text" 
                    required
                    value={saleForm.customer_name || ''}
                    onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-600 bg-white text-sm font-medium placeholder:text-slate-400" 
                    placeholder="Chu Khánh" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tên gói *</label>
                  <input 
                    type="text" 
                    required
                    value={saleForm.package_name || ''}
                    onChange={e => setSaleForm({ ...saleForm, package_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-600 bg-white text-sm font-medium placeholder:text-slate-400" 
                    placeholder="Gói Năm" 
                  />
                </div>
              </div>

              {/* Package Tiles Grid (4 cols x 2 rows) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {PACKAGE_TILES.map(pkg => {
                  const isSelected = Number(saleForm.amount) === pkg.price && 
                    (saleForm.package_name?.toLowerCase().includes(pkg.label.toLowerCase()) || 
                     saleForm.package_name?.toLowerCase().includes(pkg.name.toLowerCase()));
                  
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => {
                        setSaleForm({
                          ...saleForm,
                          package_name: pkg.label,
                          amount: pkg.price
                        });
                      }}
                      className={`relative p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                        isSelected 
                          ? 'border-2 border-purple-600 bg-purple-50/70 text-purple-950 shadow-sm' 
                          : 'border-slate-200/90 bg-white hover:border-purple-200 hover:bg-slate-50/60'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="inline-block px-1.5 py-0.2 rounded-sm bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider mb-0.5">
                          PHỔ BIẾN
                        </span>
                      )}
                      <p className="text-xs font-bold text-slate-800">{pkg.label}</p>
                      <p className={`text-xs font-black mt-0.5 ${isSelected ? 'text-purple-700' : 'text-slate-900'}`}>
                        {formatVND(pkg.price)}
                      </p>

                      {isSelected && (
                        <div className="absolute right-2 bottom-2 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Custom Package Tile */}
                <button
                  type="button"
                  onClick={() => {
                    const customPrice = prompt('Nhập số tiền gói khác (VNĐ):', '250000');
                    if (customPrice && !isNaN(Number(customPrice))) {
                      const num = Number(customPrice);
                      const customName = prompt('Nhập tên gói:', `${num / 1000}k`) || `${num / 1000}k`;
                      setSaleForm({
                        ...saleForm,
                        package_name: customName,
                        amount: num
                      });
                    }
                  }}
                  className="p-2.5 rounded-xl text-left border border-dashed border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col justify-center cursor-pointer text-slate-500 hover:text-purple-700"
                >
                  <p className="text-xs font-semibold">+ Gói khác...</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tùy chỉnh giá</p>
                </button>
              </div>

              {/* Tiền Tip & Quick Tip Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Heart size={12} className="text-pink-500 fill-pink-500" />
                    <span>Tiền Tip:</span>
                  </span>
                  <input 
                    type="number" 
                    value={saleForm.tip || ''}
                    onChange={e => setSaleForm({ ...saleForm, tip: Number(e.target.value) })}
                    placeholder="0"
                    className="w-24 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-pink-700 bg-white outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-xs text-slate-400">₫</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {TIP_PRESETS.map(preset => {
                    const isSelected = (Number(saleForm.tip) || 0) === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSaleForm({ ...saleForm, tip: preset.value })}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left: Shortcut & QR */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Enter</kbd>
                  <span className="ml-0.5">để lưu</span>
                </div>

                {systemSettings?.bank_account_number && (
                  <button 
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode size={14} />
                    <span>Mã QR</span>
                  </button>
                )}
              </div>

              {/* Right: Actions */}
              {editingSale ? (
                <div className="flex items-center gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 rounded-2xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Xóa</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingSale(null);
                      setView('dashboard');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md shadow-purple-200 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
                    <span>Cập nhật giao dịch</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={handleResetForm}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 cursor-pointer transition-colors"
                  >
                    Xoá trắng form
                  </button>

                  <button 
                    type="button"
                    disabled={loading || saveAndContinueLoading}
                    onClick={handleSaveAndContinue}
                    className="px-6 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md shadow-purple-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saveAndContinueLoading ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : null}
                    <span>Lưu & nhập tiếp</span>
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ============================================================
            RIGHT COLUMN (lg:col-span-4): The "ĐƠN VỪA NHẬP" Card
        ============================================================ */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 tracking-tight">ĐƠN VỪA NHẬP</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
              {sessionSales.length} đơn
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Tổng thu phiên này</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatVND(sessionTotalRev)}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>Tip {formatVND(sessionTotalTip)}</span>
              <span>·</span>
              <span>Trung bình {formatVND(sessionAvgRev)}</span>
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3" />

          {/* List of recent orders */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {sessionSales.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có đơn nào trong phiên này.<br />Hãy nhập đơn đầu tiên bên cạnh!
              </div>
            ) : (
              sessionSales.map(s => {
                const reader = userMap.get(s.reader_id) || users.find(u => u.id === s.reader_id || u.full_name === s.reader_id);
                const sale = userMap.get(s.sale_id) || users.find(u => u.id === s.sale_id || u.full_name === s.sale_id);
                const rName = reader?.full_name?.split(' ').slice(-1)[0] || s.reader_id || 'N/A';
                const sName = sale?.full_name?.split(' ').slice(-1)[0] || (s.sale_id === 'none' ? 'Không' : s.sale_id);

                return (
                  <div key={s.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-slate-400 pt-0.5 shrink-0">
                        {formatOrderTime(s)}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.customer_name || 'Khách vãng lai'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.package_name || 'Gói Tarot'} · {rName} → {sName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatVND(Number(s.amount) || 0)}</p>
                      {Number(s.tip) > 0 && (
                        <p className="text-xs font-semibold text-emerald-600">
                          + tip {formatVND(Number(s.tip))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (editingSale) {
            const res = await firebaseService.deleteSaleRecord(editingSale.id);
            if (res.success) {
              setEditingSale(null);
              setView('dashboard');
              await fetchData();
            } else {
              alert(res.message || 'Xóa thất bại');
            }
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${editingSale?.customer_name}"?`}
      />

      {/* VietQR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-purple-700 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Mã QR Thanh Toán</h3>
              <button onClick={() => setShowQR(false)} className="text-white/60 hover:text-white cursor-pointer">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                <img 
                  src={generateVietQR()} 
                  alt="VietQR" 
                  className="w-full max-w-[240px] h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Quét mã để thanh toán nhanh qua</p>
                <p className="text-lg font-bold text-slate-900">{systemSettings?.bank_name || 'Ngân hàng'}</p>
                <p className="text-xs text-slate-400 mt-1">{systemSettings?.bank_account_number}</p>
                <p className="text-xs text-slate-400">{systemSettings?.bank_account_name}</p>
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
