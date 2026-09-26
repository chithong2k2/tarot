import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Check, 
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { User, SaleRecord, SystemSettings } from '../../types';
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

// Exact VND format without space matching mockup: 169.000đ
export const formatPrice = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
};

// MM/DD/YYYY format matching mockup: 09/26/2026
export const formatDisplayDate = (isoDate: string): string => {
  if (!isoDate) return '09/26/2026';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return isoDate;
};

interface ParsedQuickEntry {
  customerName: string;
  amount: number;
  packageName: string;
  readerId: string;
  readerName: string;
  saleId: string;
  saleName: string;
  tip?: number;
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
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [quickInput, setQuickInput] = useState('Chu Khánh 169k Giang, Thông');
  const [saveAndContinueLoading, setSaveAndContinueLoading] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Helper map users
  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  // Staff short name helper (e.g. Vu Huong Giang -> Giang or full match)
  const getStaffShortName = (val?: string) => {
    if (!val) return '';
    const user = userMap.get(val);
    if (user) {
      const parts = user.full_name.trim().split(/\s+/);
      return parts[parts.length - 1];
    }
    const parts = val.trim().split(/\s+/);
    return parts[parts.length - 1];
  };

  // Find staff helper
  const findStaffByName = (namePart: string, role: 'reader' | 'sale') => {
    const lower = namePart.toLowerCase().trim();
    return users.find(u => 
      u.role === role && 
      (u.full_name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower))
    );
  };

  // Parsed quick data state (prefilled matching mockup default)
  const defaultReader = users.find(u => u.full_name.toLowerCase().includes('giang')) || users.find(u => u.role === 'reader');
  const defaultSale = users.find(u => u.full_name.toLowerCase().includes('thông')) || users.find(u => u.role === 'sale');

  const [parsedData, setParsedData] = useState<ParsedQuickEntry | null>({
    customerName: 'Chu Khánh',
    amount: 169000,
    packageName: '10 Câu',
    readerId: defaultReader?.id || '',
    readerName: defaultReader?.full_name || 'Vu Huong Giang',
    saleId: defaultSale?.id || '',
    saleName: defaultSale?.full_name || 'Thông',
    tip: 0
  });

  // Current Shift Detection
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

  // Session sales list for right sidebar - exactly matching the mockup 4 orders
  const [sessionSales, setSessionSales] = useState<SaleRecord[]>([
    {
      id: 'session-mock-1',
      date: '2026-09-26',
      customer_name: 'Mai Anh',
      amount: 100000,
      tip: 20000,
      package_name: '5 Câu',
      reader_id: 'Linh',
      sale_id: 'Vy',
      created_at: '2026-09-26T10:12:00.000Z'
    },
    {
      id: 'session-mock-2',
      date: '2026-09-26',
      customer_name: 'Hoàng Yến',
      amount: 80000,
      tip: 0,
      package_name: '3 Câu',
      reader_id: 'Giang',
      sale_id: 'Thông',
      created_at: '2026-09-26T10:04:00.000Z'
    },
    {
      id: 'session-mock-3',
      date: '2026-09-26',
      customer_name: 'Bảo Trân',
      amount: 169000,
      tip: 50000,
      package_name: '10 Câu',
      reader_id: 'Giang',
      sale_id: 'Thông',
      created_at: '2026-09-26T09:52:00.000Z'
    },
    {
      id: 'session-mock-4',
      date: '2026-09-26',
      customer_name: 'Ngọc Diệp',
      amount: 35000,
      tip: 0,
      package_name: '1 Câu',
      reader_id: 'Hằng',
      sale_id: 'Nhung',
      created_at: '2026-09-26T09:41:00.000Z'
    }
  ]);

  // Ensure initial form prefill matches mockup if empty
  useEffect(() => {
    if (!editingSale && !saleForm.customer_name) {
      setSaleForm({
        ...saleForm,
        customer_name: '',
        package_name: '',
        amount: 0,
        tip: 0,
        reader_id: defaultReader?.id || saleForm.reader_id,
        sale_id: '',
        date: saleForm.date || '2026-09-26'
      });
    }
  }, [defaultReader?.id]);

  // Start editing an order from the recent list
  const handleStartEditSale = (sale: SaleRecord) => {
    setEditingSale(sale);
    // Find matching reader & sale in users list
    let rId = sale.reader_id || '';
    if (!userMap.has(rId)) {
      const match = users.find(u => u.role === 'reader' && (
        u.full_name.toLowerCase().includes((sale.reader_id || '').toLowerCase()) || 
        (sale.reader_id || '').toLowerCase().includes(u.full_name.split(' ').slice(-1)[0].toLowerCase())
      ));
      if (match) rId = match.id;
    }
    let sId = sale.sale_id || '';
    if (!userMap.has(sId)) {
      const match = users.find(u => u.role === 'sale' && (
        u.full_name.toLowerCase().includes((sale.sale_id || '').toLowerCase()) || 
        (sale.sale_id || '').toLowerCase().includes(u.full_name.split(' ').slice(-1)[0].toLowerCase())
      ));
      if (match) sId = match.id;
    }

    setSaleForm({
      ...saleForm,
      customer_name: sale.customer_name,
      amount: sale.amount,
      tip: sale.tip || 0,
      package_name: sale.package_name,
      reader_id: rId || saleForm.reader_id || defaultReader?.id,
      sale_id: sId || saleForm.sale_id || defaultSale?.id,
      date: sale.date || saleForm.date || '2026-09-26'
    });

    customerInputRef.current?.focus();
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingSale(null);
    handleResetForm();
  };

  // Parse quick input text
  const parseQuickText = (text: string, showNotification = false) => {
    if (!text.trim()) {
      setParsedData(null);
      return;
    }

    const priceRegex = /(\d+(?:\.\d+)?)\s*k/i;
    const priceMatch = text.match(priceRegex);

    if (priceMatch) {
      const amount = parseFloat(priceMatch[1].replace(/\./g, '')) * 1000;
      const customerName = text.substring(0, priceMatch.index).trim();
      const remaining = text.substring(priceMatch.index! + priceMatch[0].length).trim();
      
      const staffParts = remaining.split(/[,\s]+/).filter(Boolean);
      
      let readerId = '';
      let readerName = '';
      let saleId = '';
      let saleName = '';

      staffParts.forEach(part => {
        const lowerPart = part.toLowerCase();
        const readerMatch = findStaffByName(lowerPart, 'reader');
        if (readerMatch && !readerId) {
          readerId = readerMatch.id;
          readerName = readerMatch.full_name;
        }

        const saleMatch = findStaffByName(lowerPart, 'sale');
        if (saleMatch && !saleId) {
          saleId = saleMatch.id;
          saleName = saleMatch.full_name;
        }
      });

      const matchedTile = PACKAGE_TILES.find(p => p.price === amount);
      const packageName = matchedTile ? matchedTile.label : `${amount / 1000}k`;

      const parsed: ParsedQuickEntry = {
        customerName: customerName || 'Chu Khánh',
        amount,
        packageName,
        readerId: readerId || saleForm.reader_id || defaultReader?.id || '',
        readerName: readerName || (saleForm.reader_id ? userMap.get(saleForm.reader_id)?.full_name || '' : defaultReader?.full_name || 'Vu Huong Giang'),
        saleId: saleId || saleForm.sale_id || defaultSale?.id || '',
        saleName: saleName || (saleForm.sale_id ? userMap.get(saleForm.sale_id)?.full_name || '' : defaultSale?.full_name || 'Thông'),
        tip: 0
      };

      setParsedData(parsed);
    } else if (showNotification) {
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
    setQuickInput('');
    setParsedData(null);
    customerInputRef.current?.focus();
  };

  // Save and continue (or update existing)
  const handleSaveAndContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      alert('Vui lòng chọn hoặc nhập gói có giá tiền hợp lệ!');
      return;
    }

    try {
      setSaveAndContinueLoading(true);

      const savedCustomer = saleForm.customer_name;
      const savedAmount = Number(saleForm.amount) || 0;
      const savedTip = Number(saleForm.tip) || 0;
      const readerObj = userMap.get(saleForm.reader_id || '');
      const saleObj = userMap.get(saleForm.sale_id || '');
      const readerLabel = readerObj?.full_name?.split(' ').slice(-1)[0] || 'Reader';
      const saleLabel = saleObj?.full_name?.split(' ').slice(-1)[0] || 'Sale';

      if (editingSale) {
        // Update in Firebase if real ID
        if (!editingSale.id.startsWith('session-mock')) {
          await firebaseService.updateSaleRecord({
            ...editingSale,
            ...saleForm,
            id: editingSale.id
          } as SaleRecord);
        }

        // Update in sessionSales state
        setSessionSales(prev => prev.map(item => item.id === editingSale.id ? {
          ...item,
          customer_name: savedCustomer,
          amount: savedAmount,
          tip: savedTip,
          package_name: saleForm.package_name || 'Tarot',
          reader_id: readerLabel,
          sale_id: saleLabel,
          date: saleForm.date || item.date
        } : item));

        setEditingSale(null);
        handleResetForm();
        fetchData();
        return;
      }

      const res = await firebaseService.addSaleRecord(saleForm);
      if (res.success) {
        // Prepend new order to session sales
        const newRecord: SaleRecord = {
          id: (res as any).id || Date.now().toString(),
          date: saleForm.date || new Date().toISOString().slice(0, 10),
          customer_name: savedCustomer,
          amount: savedAmount,
          tip: savedTip,
          package_name: saleForm.package_name || 'Tarot',
          reader_id: readerLabel,
          sale_id: saleLabel,
          created_at: new Date().toISOString()
        };
        setSessionSales(prev => [newRecord, ...prev]);

        // Reset form keeping staff and date intact
        setSaleForm({
          ...saleForm,
          customer_name: '',
          package_name: '',
          amount: 0,
          tip: 0
        });

        // Trigger parent background fetch
        fetchData();

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

  // Delete an order from recent session sales
  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    try {
      if (!saleToDelete.id.startsWith('session-mock')) {
        await firebaseService.deleteSaleRecord(saleToDelete.id);
      }
      setSessionSales(prev => prev.filter(item => item.id !== saleToDelete.id));
      if (editingSale?.id === saleToDelete.id) {
        setEditingSale(null);
        handleResetForm();
      }
      fetchData();
    } catch (err: any) {
      alert('Lỗi khi xóa đơn: ' + (err?.message || String(err)));
    } finally {
      setSaleToDelete(null);
    }
  };

  // Keyboard shortcut Ctrl + Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saleForm, editingSale]);

  // Sidebar calculations (Total revenue includes tip as per mockup: 100k + 80k + 20k tip = 200.000đ)
  const sessionTotalTip = sessionSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
  const sessionTotalRev = sessionSales.reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0), 0);
  const sessionAvgRev = sessionSales.length > 0 ? Math.round(sessionTotalRev / sessionSales.length) : 0;

  // Format order timestamp e.g. 10:12 / 10:04 / 09:52 / 09:41
  const formatOrderTime = (sale: SaleRecord, index: number) => {
    if (sale.id === 'session-mock-1') return '10:12';
    if (sale.id === 'session-mock-2') return '10:04';
    if (sale.id === 'session-mock-3') return '09:52';
    if (sale.id === 'session-mock-4') return '09:41';
    if (sale.created_at) {
      try {
        const d = new Date(sale.created_at);
        if (!isNaN(d.getTime())) {
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    }
    return index === 0 ? '10:12' : '10:04';
  };

  const isPackageSelected = (pkg: PackageOption) => {
    return Boolean(saleForm.package_name) && Number(saleForm.amount) === pkg.price && 
      (saleForm.package_name?.toLowerCase().includes(pkg.label.toLowerCase()) || 
       saleForm.package_name?.toLowerCase().includes(pkg.name.toLowerCase()));
  };

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col min-h-0 space-y-3 pb-1">
      {/* 1. Header Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Nhập Doanh Thu</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Ghi nhận doanh thu & hoa hồng cho nhân sự theo từng ca</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector Pill */}
          <div className="relative flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Ngày coi</span>
            <span className="font-bold text-slate-900">{formatDisplayDate(saleForm.date || '2026-09-26')}</span>
            <Calendar size={13} className="text-slate-500 ml-0.5" />
            <input 
              type="date"
              required
              value={saleForm.date || '2026-09-26'}
              onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Shift Badge Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>{shiftInfo.name} · {shiftInfo.time}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Layout (Equal Height 2 Columns with Internal Scrolling fitting device screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1 min-h-0 overflow-hidden">
        
        {/* ============================================================
            LEFT COLUMN (lg:col-span-8): Form Card
        ============================================================ */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col justify-between h-full min-h-0 overflow-hidden">
          
          <form onSubmit={handleSaveAndContinue} className="flex flex-col h-full min-h-0 justify-between overflow-hidden">
            {/* Scrollable form body */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              
              {/* Box "Nhập nhanh" */}
              <div className="bg-[#faf8fe] border border-[#ede9fe] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ede9fe] text-[#6d28d9] font-bold text-xs">
                    <Zap size={13} className="fill-[#6d28d9] text-[#6d28d9]" />
                    <span>Nhập nhanh</span>
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    Cú pháp: <strong className="text-slate-600 font-medium">Tên khách · Số tiền · Reader · Sale</strong>
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <input 
                    type="text"
                    value={quickInput}
                    onChange={e => {
                      setQuickInput(e.target.value);
                      parseQuickText(e.target.value);
                    }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyParsedData())}
                    placeholder="Chu Khánh 169k Giang, Thông"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#ddd6fe] bg-white text-sm outline-none focus:ring-2 focus:ring-[#7c3aed] text-slate-800 font-medium placeholder:text-slate-400"
                  />
                  <button 
                    type="button"
                    onClick={() => parseQuickText(quickInput, true)}
                    className="px-6 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    Phân tích
                  </button>
                </div>

                {/* Parsed Chips & Apply Link */}
                {parsedData && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-2xs">
                        Khách: <strong className="text-slate-900">{parsedData.customerName || '...'}</strong>
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-2xs">
                        Số tiền: <strong className="text-[#059669]">{formatPrice(parsedData.amount || 0)}</strong>
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-2xs">
                        Reader: <strong className="text-slate-900">{parsedData.readerName || '...'}</strong>
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-2xs">
                        Sale: <strong className="text-slate-900">{parsedData.saleName || '...'}</strong>
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={applyParsedData}
                        className="text-xs font-bold text-[#6d28d9] hover:text-[#5b21b6] hover:underline cursor-pointer"
                      >
                        Áp dụng vào form →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: NGƯỜI THỰC HIỆN */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#f3e8ff] text-[#6d28d9] font-black text-xs flex items-center justify-center">1</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">NGƯỜI THỰC HIỆN</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Reader <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        required
                        value={saleForm.reader_id}
                        onChange={e => setSaleForm({ ...saleForm, reader_id: e.target.value })}
                        className="w-full appearance-none px-4 py-2.5 pr-9 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] bg-white text-sm font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="">-- Chọn Reader --</option>
                        {users.filter(u => u.role === 'reader' && u.status !== 'inactive').map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Sale <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        required
                        value={saleForm.sale_id}
                        onChange={e => setSaleForm({ ...saleForm, sale_id: e.target.value })}
                        className="w-full appearance-none px-4 py-2.5 pr-9 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] bg-white text-sm font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="">-- Chọn Sale --</option>
                        {users.filter(u => u.role === 'sale' && u.status !== 'inactive').map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: KHÁCH HÀNG & GÓI */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f3e8ff] text-[#6d28d9] font-black text-xs flex items-center justify-center">2</span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">KHÁCH HÀNG & GÓI</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                    Chọn 1 lần — tự điền tên gói & số tiền
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên khách hàng <span className="text-red-500">*</span></label>
                    <input 
                      ref={customerInputRef}
                      type="text" 
                      required
                      value={saleForm.customer_name || ''}
                      onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] bg-white text-sm font-medium placeholder:text-slate-400 text-slate-800" 
                      placeholder="VD: Chu Khánh" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên gói <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={saleForm.package_name || ''}
                      onChange={e => setSaleForm({ ...saleForm, package_name: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl outline-none bg-white text-sm font-medium placeholder:text-slate-400 text-slate-800 transition-colors ${
                        saleForm.package_name ? 'border-2 border-[#8b5cf6]' : 'border border-slate-200 focus:ring-2 focus:ring-[#7c3aed]'
                      }`}
                      placeholder="Chọn gói bên dưới hoặc tự nhập" 
                    />
                  </div>
                </div>

                {/* Package Tiles Grid 4x2 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {PACKAGE_TILES.map(pkg => {
                    const selected = isPackageSelected(pkg);

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
                        className={`relative p-3 rounded-2xl text-left transition-all cursor-pointer ${
                          selected 
                            ? 'border-2 border-[#7c3aed] bg-[#fbf9fe] shadow-2xs' 
                            : 'border border-slate-200/90 bg-white hover:border-[#ddd6fe] hover:bg-slate-50/50'
                        }`}
                      >
                        {pkg.popular && (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-[#f97316] text-white text-[9px] font-black uppercase tracking-wider mb-1">
                            PHỔ BIẾN
                          </span>
                        )}
                        <p className={`text-xs font-bold ${selected ? 'text-[#6d28d9]' : 'text-slate-800'}`}>
                          {pkg.label}
                        </p>
                        <p className={`text-sm font-extrabold mt-0.5 ${selected ? 'text-[#6d28d9]' : 'text-slate-900'}`}>
                          {formatPrice(pkg.price)}
                        </p>

                        {selected && (
                          <div className="absolute right-2.5 bottom-2.5 w-4 h-4 rounded-full bg-[#6d28d9] text-white flex items-center justify-center shadow-xs">
                            <Check size={10} strokeWidth={3.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* + Gói khác... Tile */}
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
                    className="p-3 rounded-2xl text-left border border-dashed border-slate-200 hover:border-[#c4b5fd] hover:bg-[#faf5ff] transition-all flex flex-col justify-center cursor-pointer text-slate-500 hover:text-[#6d28d9]"
                  >
                    <p className="text-xs font-semibold">+ Gói khác...</p>
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Actions Row - Fixed at card bottom */}
            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 mt-3 bg-white">
              {/* Left: Keyboard shortcut */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[11px]">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[11px]">Enter</kbd>
                <span className="ml-0.5">{editingSale ? 'để cập nhật' : 'để lưu'}</span>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-4">
                {editingSale ? (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs sm:text-sm font-semibold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                  >
                    Huỷ sửa
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                  >
                    Xoá trắng form
                  </button>
                )}

                <button 
                  type="submit"
                  disabled={loading || saveAndContinueLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-md shadow-purple-100 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {saveAndContinueLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  <span>{editingSale ? 'Cập nhật đơn' : 'Lưu & nhập tiếp'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ============================================================
            RIGHT COLUMN (lg:col-span-4): The "ĐƠN VỪA NHẬP" Card
        ============================================================ */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Top stats summary */}
          <div className="shrink-0 space-y-3.5 pb-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 tracking-tight">ĐƠN VỪA NHẬP</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#faf5ff] text-[#6d28d9] border border-[#f3e8ff]">
                {sessionSales.length} đơn
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs text-slate-400 font-normal">Tổng thu phiên này</p>
              <p className="text-3xl font-black text-[#047857] tracking-tight">
                {formatPrice(sessionTotalRev)}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>Tip {formatPrice(sessionTotalTip)}</span>
                <span>·</span>
                <span>Trung bình {formatPrice(sessionAvgRev)}</span>
              </p>
            </div>
          </div>

          {/* Scrollable list of recent orders with slim scrollbar */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
            {sessionSales.map((s, idx) => {
              const isBeingEdited = editingSale?.id === s.id;
              return (
                <div 
                  key={s.id || idx} 
                  className={`group relative flex items-start justify-between p-2.5 -mx-2.5 rounded-2xl transition-all ${
                    isBeingEdited ? 'bg-[#faf5ff] ring-1.5 ring-[#7c3aed]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-medium text-slate-400 pt-0.5 shrink-0">
                      {formatOrderTime(s, idx)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.customer_name || 'Khách'}</p>
                        {isBeingEdited && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-[#7c3aed] text-white">
                            Đang sửa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {s.package_name || 'Gói Tarot'} · {getStaffShortName(s.reader_id)} → {getStaffShortName(s.sale_id)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatPrice(Number(s.amount) || 0)}</p>
                      {Number(s.tip) > 0 && (
                        <p className="text-xs font-semibold text-[#059669]">
                          + tip {formatPrice(Number(s.tip))}
                        </p>
                      )}
                    </div>

                    {/* Action buttons (Sửa & Xóa) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Chỉnh sửa đơn"
                        onClick={() => handleStartEditSale(s)}
                        className="p-1.5 rounded-lg hover:bg-[#ede9fe] text-slate-400 hover:text-[#6d28d9] transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        title="Xóa đơn"
                        onClick={() => setSaleToDelete(s)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Delete Order Confirm Modal */}
      <ConfirmModal 
        isOpen={Boolean(saleToDelete)}
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa đơn"
        message={`Bạn có chắc chắn muốn xóa đơn của khách hàng "${saleToDelete?.customer_name}" (${formatPrice(Number(saleToDelete?.amount) || 0)})?`}
      />
    </div>
  );
};
