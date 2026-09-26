import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  UserCircle, 
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  RefreshCw,
  ExternalLink,
  Link2,
  QrCode,
  Eye,
  EyeOff,
  Shield,
  CreditCard,
  Sparkles,
  Building2,
  Copy,
  Check,
  Facebook,
  Key,
  Activity,
  Sliders,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, SystemSettings } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { apiService } from '../../services/api';
import { VIETNAM_BANKS, generateVietQRUrl } from '../../utils/vietqr';
import { usePrivacyMode } from '../../utils/privacy';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  systemSettings: SystemSettings | null;
  onUpdateSettings: (settings: SystemSettings) => void;
  onSyncToSheets: () => Promise<{ success: boolean; message: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, 
  onUpdateUser,
  systemSettings,
  onUpdateSettings,
  onSyncToSheets
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'admin'>('profile');

  // User Form Data
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    avatar_url: user.avatar_url || '',
    bank_name: user.bank_name || 'MBBank',
    bank_account: user.bank_account || '',
    bank_account_name: user.bank_account_name || user.full_name?.toUpperCase() || '',
    specialty: user.specialty || ''
  });

  // Privacy Mode
  const [isPrivacy, setPrivacyMode] = usePrivacyMode();

  // Admin System Settings
  const [gasApiUrl, setGasApiUrl] = useState(systemSettings?.gas_api_url || '');
  const [shopBankName, setShopBankName] = useState(systemSettings?.bank_name || 'MBBank');
  const [shopBankAccountNo, setShopBankAccountNo] = useState(systemSettings?.bank_account_number || '');
  const [shopBankAccountName, setShopBankAccountName] = useState(systemSettings?.bank_account_name || '');
  const [fbAccessToken, setFbAccessToken] = useState(systemSettings?.fb_access_token || '');
  const [fbAdAccountId, setFbAdAccountId] = useState(systemSettings?.fb_ad_account_id || '');
  const [isLocked, setIsLocked] = useState(systemSettings?.is_locked || false);
  const [operatingCostRate, setOperatingCostRate] = useState<number>(systemSettings?.operating_cost_rate || 0);

  // Password Change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Meta Ads testing states
  const [showFbToken, setShowFbToken] = useState(false);
  const [fbTestLoading, setFbTestLoading] = useState(false);
  const [fbSyncLoading, setFbSyncLoading] = useState(false);
  const [fbAccountInfo, setFbAccountInfo] = useState<{
    id?: string;
    name?: string;
    currency?: string;
    status?: string;
    amount_spent?: string;
  } | null>(null);

  // Status & Loaders
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [copiedStk, setCopiedStk] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync form data when user prop changes
  useEffect(() => {
    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      avatar_url: user.avatar_url || '',
      bank_name: user.bank_name || 'MBBank',
      bank_account: user.bank_account || '',
      bank_account_name: user.bank_account_name || user.full_name?.toUpperCase() || '',
      specialty: user.specialty || ''
    });
  }, [user]);

  // Sync system settings
  useEffect(() => {
    if (systemSettings) {
      setGasApiUrl(systemSettings.gas_api_url || '');
      setShopBankName(systemSettings.bank_name || 'MBBank');
      setShopBankAccountNo(systemSettings.bank_account_number || '');
      setShopBankAccountName(systemSettings.bank_account_name || '');
      setFbAccessToken(systemSettings.fb_access_token || '');
      setFbAdAccountId(systemSettings.fb_ad_account_id || '');
      setIsLocked(systemSettings.is_locked || false);
      setOperatingCostRate(systemSettings.operating_cost_rate || 0);
    }
  }, [systemSettings]);

  // Quick preset avatars
  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  ];

  // Helper to get bank code for VietQR
  const getBankCode = (bankNameOrShort: string) => {
    const found = VIETNAM_BANKS.find(b => 
      b.shortName.toLowerCase() === bankNameOrShort?.toLowerCase() ||
      b.code.toLowerCase() === bankNameOrShort?.toLowerCase() ||
      b.name.toLowerCase().includes(bankNameOrShort?.toLowerCase() || '')
    );
    return found ? found.code : 'MB';
  };

  // Helper to format account holder name in uppercase without accents
  const formatAccountName = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase();
  };

  // Compress uploaded avatar image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 300;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setMessage(null);
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, avatar_url: compressedBase64 }));
      } catch (err) {
        console.error("Image compression error:", err);
        setMessage({ type: 'error', text: 'Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Submit User Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const updatedUser: User = {
        ...user,
        full_name: formData.full_name,
        username: formData.username,
        avatar_url: formData.avatar_url,
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        bank_account_name: formData.bank_account_name,
        specialty: formData.specialty
      };

      const res = await firebaseService.updateUserProfile(user.id, {
        full_name: formData.full_name,
        username: formData.username,
        avatar_url: formData.avatar_url,
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        bank_account_name: formData.bank_account_name,
        specialty: formData.specialty
      });

      if (res.success) {
        onUpdateUser(updatedUser);
        setMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân và tài khoản VietQR thành công!' });
      } else {
        setMessage({ type: 'error', text: res.message || 'Cập nhật thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra khi lưu thông tin' });
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Chưa nhập', color: 'bg-slate-200', score: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Yếu', color: 'bg-red-500', score: 25 };
    if (score === 2) return { label: 'Trung bình', color: 'bg-amber-500', score: 50 };
    if (score === 3) return { label: 'Khá', color: 'bg-blue-500', score: 75 };
    return { label: 'Rất an toàn', color: 'bg-emerald-500', score: 100 };
  };

  // Change Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage(null);

    if (user.password && passwordData.current !== user.password) {
      setPassMessage({ type: 'error', text: 'Mật khẩu hiện tại không chính xác!' });
      setPassLoading(false);
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPassMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
      setPassLoading(false);
      return;
    }

    if (passwordData.new.length < 6) {
      setPassMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      setPassLoading(false);
      return;
    }

    try {
      const res = await firebaseService.updateUserProfile(user.id, { password: passwordData.new });
      if (res.success) {
        onUpdateUser({ ...user, password: passwordData.new });
        setPassMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordData({ current: '', new: '', confirm: '' });
          setPassMessage(null);
        }, 1500);
      } else {
        setPassMessage({ type: 'error', text: res.message || 'Cập nhật mật khẩu thất bại' });
      }
    } catch (err) {
      setPassMessage({ type: 'error', text: 'Đã có lỗi xảy ra khi đổi mật khẩu' });
    } finally {
      setPassLoading(false);
    }
  };

  // Admin: Save System Settings
  const handleSaveSystemSettings = async () => {
    setSettingsLoading(true);
    setMessage(null);
    try {
      const newSettings: Partial<SystemSettings> = {
        gas_api_url: gasApiUrl.trim(),
        bank_name: shopBankName,
        bank_account_number: shopBankAccountNo.trim(),
        bank_account_name: shopBankAccountName.trim(),
        fb_access_token: fbAccessToken.trim(),
        fb_ad_account_id: fbAdAccountId.trim(),
        is_locked: isLocked,
        operating_cost_rate: Number(operatingCostRate) || 0
      };

      const res = await firebaseService.updateSettings(newSettings);
      if (res.success) {
        onUpdateSettings({
          ...systemSettings!,
          id: systemSettings?.id || 'global',
          ...newSettings
        } as SystemSettings);
        setMessage({ type: 'success', text: 'Đã lưu toàn bộ cấu hình hệ thống & thông số ứng dụng thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Lưu cấu hình thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra khi lưu cấu hình' });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Admin: Test Meta Ads Connection
  const handleTestMetaAds = async () => {
    setFbTestLoading(true);
    setMessage(null);
    setFbAccountInfo(null);
    try {
      const res = await apiService.testMetaAds(fbAccessToken.trim(), fbAdAccountId.trim());
      if (res.success && res.account) {
        setFbAccountInfo(res.account);
        setMessage({ type: 'success', text: res.message || 'Kết nối Meta Marketing API thành công!' });
      } else {
        setMessage({ type: 'error', text: res.message || 'Kiểm tra kết nối Facebook thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi gọi API kiểm tra Facebook' });
    } finally {
      setFbTestLoading(false);
    }
  };

  // Admin: Sync Meta Ads Now
  const handleSyncMetaAds = async () => {
    setFbSyncLoading(true);
    setMessage(null);
    try {
      const res = await apiService.syncMetaAds();
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Đồng bộ chi phí Meta Ads thành công!' });
      } else {
        setMessage({ type: 'error', text: res.message || 'Lỗi đồng bộ chi phí Meta Ads' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi đồng bộ chi phí' });
    } finally {
      setFbSyncLoading(false);
    }
  };

  // Admin: Test Google Sheets Connection
  const handleTestSheetsConnection = async () => {
    setTestLoading(true);
    setMessage(null);
    try {
      const res = await apiService.testConnection();
      if (res.success) {
        setMessage({ type: 'success', text: 'Kết nối đến Google Sheets thành công!' });
      } else {
        setMessage({ type: 'error', text: `Kết nối thất bại: ${res.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối đến Google Sheets API' });
    } finally {
      setTestLoading(false);
    }
  };

  // Admin: Sync full data to Google Sheets
  const handleSyncSheets = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đồng bộ toàn bộ dữ liệu từ Firestore sang Google Sheets? Thao tác này sẽ ghi đè dữ liệu trên Sheets.')) {
      return;
    }
    setSyncLoading(true);
    setMessage(null);
    try {
      const res = await onSyncToSheets();
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi đồng bộ dữ liệu sang Google Sheets' });
    } finally {
      setSyncLoading(false);
    }
  };

  // Copy personal account number
  const handleCopyStk = () => {
    if (!formData.bank_account) return;
    navigator.clipboard.writeText(formData.bank_account);
    setCopiedStk(true);
    setTimeout(() => setCopiedStk(false), 2000);
  };

  // Live personal VietQR url
  const livePersonalQRUrl = formData.bank_account ? generateVietQRUrl({
    bankCodeOrBin: getBankCode(formData.bank_name),
    accountNumber: formData.bank_account,
    accountName: formData.bank_account_name || formData.full_name,
    template: 'compact2'
  }) : '';

  // Live shop VietQR url
  const liveShopQRUrl = shopBankAccountNo ? generateVietQRUrl({
    bankCodeOrBin: getBankCode(shopBankName),
    accountNumber: shopBankAccountNo,
    accountName: shopBankAccountName,
    template: 'compact2'
  }) : '';

  const roleLabels: Record<string, { title: string, color: string }> = {
    manager: { title: 'Quản Lý Cấp Cao (Admin)', color: 'bg-amber-500 text-white' },
    reader: { title: 'Tarot Reader', color: 'bg-purple-600 text-white' },
    sale: { title: 'Nhân Viên Sale', color: 'bg-emerald-600 text-white' }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md bg-white/20 shrink-0">
              <img 
                src={formData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{user.full_name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${roleLabels[user.role]?.color || 'bg-slate-700'}`}>
                  {roleLabels[user.role]?.title || user.role}
                </span>
              </div>
              <p className="text-indigo-100 text-sm mt-1 flex items-center gap-2">
                <span>@{user.username}</span>
                <span>•</span>
                <span>Hoa hồng: <strong>{user.commission_percent || 0}%</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang hoạt động</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 ${
            activeTab === 'profile' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserIcon size={18} />
          <span>Hồ Sơ & VietQR Cá Nhân</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 ${
            activeTab === 'security' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield size={18} />
          <span>Bảo Mật & Chế Độ Riêng Tư</span>
        </button>

        {user.role === 'manager' && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 ${
              activeTab === 'admin' 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200' 
                : 'text-amber-800 hover:text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Sliders size={18} />
            <span>Cấu Hình Quản Trị Hệ Thống</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
              Admin
            </span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between space-x-3 shadow-sm border ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              {message.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
              <span className="font-semibold text-sm">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== TAB 1: PROFILE & VIETQR ==================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form: Profile info */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon size={20} className="text-indigo-600" />
                  <span>Thông Tin Cá Nhân & Tài Khoản</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">Cập nhật họ tên, ảnh đại diện và phong cách làm việc</p>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Ảnh Đại Diện</label>
                <div className="flex flex-wrap items-center gap-3">
                  {avatarOptions.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar_url: url })}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                        formData.avatar_url === url ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105' : 'border-slate-100 hover:border-indigo-200'
                      }`}
                    >
                      <img src={url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {formData.avatar_url === url && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-600 cursor-pointer transition-all">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <Camera size={18} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Họ và Tên</label>
                  <input 
                    type="text" 
                    required
                    value={formData.full_name}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ 
                        ...formData, 
                        full_name: val,
                        bank_account_name: formData.bank_account_name || formatAccountName(val)
                      });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Đăng Nhập</label>
                  <input 
                    type="text" 
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    placeholder="Username"
                  />
                </div>
              </div>

              {/* Reader Specialty or Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {user.role === 'reader' ? 'Phong Cách Xem / Bộ Bài Sở Trường' : 'Ghi Chú Cá Nhân'}
                </label>
                <input 
                  type="text" 
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder={user.role === 'reader' ? 'Ví dụ: Rider-Waite, Tarot Chữa Lành, Thần Số Học, Oracle' : 'Ghi chú thêm về vai trò của bạn'}
                />
              </div>

              <hr className="border-slate-100" />

              {/* Bank Account Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-600" />
                    <span>Tài Khoản Nhận Lương (VietQR Chuẩn)</span>
                  </h4>
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                    Napas 24/7
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân Hàng Thụ Hưởng</label>
                    <select
                      value={formData.bank_name}
                      onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-slate-800"
                    >
                      {VIETNAM_BANKS.map((b) => (
                        <option key={b.code} value={b.shortName}>
                          {b.shortName} - {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tài Khoản</label>
                      <input 
                        type="text" 
                        required
                        value={formData.bank_account}
                        onChange={e => setFormData({ ...formData, bank_account: e.target.value.replace(/\s+/g, '') })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold tracking-wider"
                        placeholder="Ví dụ: 0987654321"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Chủ Tài Khoản (In Hoa)</label>
                      <input 
                        type="text" 
                        required
                        value={formData.bank_account_name}
                        onChange={e => setFormData({ ...formData, bank_account_name: formatAccountName(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase font-bold"
                        placeholder="NGUYEN VAN A"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>Lưu Thông Tin Cá Nhân</span>
                </button>
              </div>
            </div>

            {/* Right Card: Live Personal VietQR Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <CreditCard size={140} />
                </div>

                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Thẻ Lương VietQR</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      {formData.bank_name || 'MBBank'}
                    </span>
                  </div>

                  {/* QR Image */}
                  <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center mx-auto w-56 h-56">
                    {livePersonalQRUrl ? (
                      <img 
                        src={livePersonalQRUrl} 
                        alt="Mã QR nhận lương" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <QrCode size={48} className="text-slate-300 mb-2" />
                        <span className="text-xs">Vui lòng nhập Số tài khoản để tạo mã VietQR</span>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2 pt-2 border-t border-white/10 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Chủ tài khoản:</span>
                      <span className="font-mono font-bold text-white tracking-wide">
                        {formData.bank_account_name || formData.full_name?.toUpperCase() || 'CHƯA CẬP NHẬT'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Số tài khoản:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 tracking-wider">
                          {formData.bank_account || '••••••••'}
                        </span>
                        {formData.bank_account && (
                          <button
                            type="button"
                            onClick={handleCopyStk}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 transition-all text-white/80"
                            title="Sao chép STK"
                          >
                            {copiedStk ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-200 flex items-start gap-2">
                    <Smartphone size={16} className="shrink-0 text-indigo-400 mt-0.5" />
                    <span>
                      Mã QR này sẽ hiển thị trực tiếp tại mục <strong>Bảng Lương</strong> để Admin quét thanh toán tự động cho bạn. Hãy mở app ngân hàng quét thử để kiểm tra tính chính xác!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ==================== TAB 2: SECURITY & PRIVACY ==================== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Privacy Mode Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <EyeOff size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Chế Độ Riêng Tư</h3>
                  <p className="text-xs text-slate-400">Ẩn / làm mờ số tiền doanh thu và lương ở nơi công cộng</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">Ẩn toàn bộ số tiền trên màn hình</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tránh khách hàng hoặc người ngoài nhìn thấy số tiền nhạy cảm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacyMode(!isPrivacy)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPrivacy ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isPrivacy ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Demo preview of masked amount */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Minh họa hiển thị:</span>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100">
                  <span className="text-xs text-slate-500 font-medium">Doanh thu ca hiện tại:</span>
                  <span className="font-bold font-mono text-base text-indigo-700">
                    {isPrivacy ? '•••••• ₫' : '1.850.000 ₫'}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Management Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Mật Khẩu Tài Khoản</h3>
                    <p className="text-xs text-slate-400">Bảo vệ quyền truy cập tài khoản</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Độ dài tối thiểu 6 ký tự
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Nên kết hợp chữ cái và số để an toàn hơn
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Key size={18} />
                <span>Thay Đổi Mật Khẩu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ADMIN SYSTEM CONFIG ==================== */}
      {activeTab === 'admin' && user.role === 'manager' && (
        <div className="space-y-8">
          {/* 1. Meta (Facebook) Marketing API Config */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Facebook size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Thiết Lập Meta Ads (Facebook Marketing API)</h3>
                  <p className="text-xs text-slate-400">Tự động đồng bộ chi phí quảng cáo Realtime vào Dashboard và Báo cáo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                  <Activity size={12} className="animate-pulse text-blue-600" />
                  Auto-sync: 2 phút / lần
                </span>
              </div>
            </div>

            {/* Inputs: Ad Account ID & Access Token */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ID Tài Khoản Quảng Cáo (Ad Account ID)
                  </label>
                  <span className="text-[10px] text-slate-400">act_xxxxxxxx</span>
                </div>
                <input 
                  type="text" 
                  value={fbAdAccountId}
                  onChange={e => setFbAdAccountId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white"
                  placeholder="act_1067215321520630 hoặc 1067215321520630"
                />
                <p className="text-[11px] text-slate-400 italic">Hệ thống sẽ tự động thêm tiền tố 'act_' nếu bạn nhập số thuần.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Meta Access Token
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowFbToken(!showFbToken)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    {showFbToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showFbToken ? 'Ẩn' : 'Hiện token'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showFbToken ? "text" : "password"}
                    value={fbAccessToken}
                    onChange={e => setFbAccessToken(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white pr-20"
                    placeholder="EAA..."
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setFbAccessToken(text);
                      } catch {
                        // ignore
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    Dán
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 italic">Cần quyền 'ads_read' hoặc 'ads_management'.</p>
              </div>
            </div>

            {/* Test result card if checked */}
            {fbAccountInfo && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="font-bold text-emerald-900 text-sm">{fbAccountInfo.name}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                      {fbAccountInfo.currency}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Trạng thái: <strong>{fbAccountInfo.status}</strong> • ID: <span className="font-mono">{fbAccountInfo.id}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Tổng chi tiêu:</span>
                  <p className="font-bold font-mono text-emerald-900 text-base">
                    {Number(fbAccountInfo.amount_spent || 0).toLocaleString('vi-VN')} {fbAccountInfo.currency}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Action buttons for Meta Ads */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestMetaAds}
                disabled={fbTestLoading || !fbAccessToken || !fbAdAccountId}
                className="px-5 py-3 rounded-xl border border-blue-200 text-blue-700 font-bold hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {fbTestLoading ? <RefreshCw size={16} className="animate-spin" /> : <Activity size={16} />}
                <span>Kiểm Tra Kết Nối</span>
              </button>

              <button
                type="button"
                onClick={handleSyncMetaAds}
                disabled={fbSyncLoading}
                className="px-5 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {fbSyncLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Đồng Bộ Realtime</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSystemSettings}
                disabled={settingsLoading}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {settingsLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                <span>Lưu Cấu Hình Ads</span>
              </button>
            </div>
          </div>

          {/* 2. Shop VietQR Receiving Configuration */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cấu Hình Tài Khoản Nhận Tiền Của Shop (VietQR Khách Quét)</h3>
                <p className="text-xs text-slate-400">Hiển thị khi khách hàng chọn chuyển khoản ngân hàng ở mục Tạo Đơn</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân Hàng Shop</label>
                <select
                  value={shopBankName}
                  onChange={e => setShopBankName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-slate-800"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tài Khoản Shop</label>
                <input 
                  type="text" 
                  value={shopBankAccountNo}
                  onChange={e => setShopBankAccountNo(e.target.value.replace(/\s+/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold bg-white"
                  placeholder="0123456789"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Chủ Tài Khoản Shop</label>
                <input 
                  type="text" 
                  value={shopBankAccountName}
                  onChange={e => setShopBankAccountName(formatAccountName(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase font-bold bg-white"
                  placeholder="TAROT SHOP"
                />
              </div>
            </div>

            {liveShopQRUrl && (
              <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="w-20 h-20 bg-white p-2 rounded-xl shadow-sm shrink-0">
                  <img src={liveShopQRUrl} alt="Shop QR" className="w-full h-full object-contain" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-900">Xem trước mã QR Shop:</span>
                  <p className="text-xs text-indigo-700 font-mono">
                    {shopBankName} • {shopBankAccountNo} ({shopBankAccountName})
                  </p>
                  <p className="text-[11px] text-slate-500">Mã QR này sẽ tự động gắn số tiền và mã đơn hàng khi khách thanh toán.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSystemSettings}
                disabled={settingsLoading}
                className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center space-x-2 disabled:opacity-50 text-sm"
              >
                {settingsLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                <span>Lưu Cấu Hình QR Shop</span>
              </button>
            </div>
          </div>

          {/* 3. Google Sheets Integration */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tích Hợp Google Sheets</h3>
                  <p className="text-xs text-slate-400">Sao lưu dữ liệu từ Firebase sang Google Sheets định kỳ</p>
                </div>
              </div>
              {gasApiUrl && (
                <a 
                  href={gasApiUrl.split('/exec')[0]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100"
                >
                  <span>Mở Apps Script</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center space-x-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <Link2 size={16} className="text-emerald-600" />
                <span>Google Apps Script Web App URL</span>
              </div>
              <input 
                type="text" 
                value={gasApiUrl}
                onChange={e => setGasApiUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm bg-white"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleTestSheetsConnection}
                disabled={testLoading || !gasApiUrl}
                className="flex-1 py-3.5 rounded-2xl border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {testLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                <span>Kiểm Tra Kết Nối Sheets</span>
              </button>
              
              <button
                type="button"
                onClick={handleSyncSheets}
                disabled={syncLoading || !gasApiUrl}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {syncLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                <span>Đồng Bộ Toàn Bộ Dữ Liệu Sang Sheets</span>
              </button>
            </div>
          </div>

          {/* 4. Policy, Locking & Maintenance */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield size={20} className="text-indigo-600" />
              <span>Chính Sách Vận Hành & Bảo Trì Dữ Liệu</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lock Records Switch */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">Khóa chỉnh sửa ca cũ & doanh thu</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ngăn chặn nhân viên tự ý sửa hoặc xóa bản ghi đã chốt sổ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isLocked ? 'bg-amber-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isLocked ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Operating Cost Rate % */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">Tỷ lệ Chi Phí Vận Hành (%)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Áp dụng ước tính khi không nhập chi phí cố định</p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={operatingCostRate}
                    onChange={e => setOperatingCostRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center font-bold text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Bổ sung trường thời gian created_at cho các bản ghi cũ?')) return;
                  setLoading(true);
                  try {
                    const res = await firebaseService.migrateData();
                    alert(res.message);
                  } catch {
                    alert('Lỗi bảo trì dữ liệu');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-amber-200 text-amber-800 font-bold hover:bg-amber-50 text-xs flex items-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Bổ Sung Thời Gian Cho Dữ Liệu Cũ</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSystemSettings}
                disabled={settingsLoading}
                className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {settingsLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                <span>Lưu Tất Cả Cấu Hình Quản Trị</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Thay Đổi Mật Khẩu</h3>
                  <p className="text-indigo-100 text-xs mt-1">Cập nhật mật khẩu định kỳ để bảo vệ tài khoản</p>
                </div>
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassMessage(null);
                  }} 
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                {passMessage && (
                  <div className={`p-4 rounded-xl flex items-center space-x-3 text-sm ${
                    passMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {passMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium">{passMessage.text}</span>
                  </div>
                )}

                {/* Current password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật Khẩu Hiện Tại</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPass ? "text" : "password"}
                      required
                      value={passwordData.current}
                      onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-2" />

                {/* New password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật Khẩu Mới</label>
                  <div className="relative">
                    <input 
                      type={showNewPass ? "text" : "password"}
                      required
                      value={passwordData.new}
                      onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-12"
                      placeholder="Ít nhất 6 ký tự"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {passwordData.new && (
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getPasswordStrength(passwordData.new).color}`}
                          style={{ width: `${getPasswordStrength(passwordData.new).score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Độ an toàn: <strong className="text-slate-700">{getPasswordStrength(passwordData.new).label}</strong></span>
                        <span>Tối thiểu 6 ký tự</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Xác Nhận Mật Khẩu Mới</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPass ? "text" : "password"}
                      required
                      value={passwordData.confirm}
                      onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-12"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
                  >
                    {passLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Cập Nhật Mật Khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
