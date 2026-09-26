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
  Smartphone,
  Download,
  Upload,
  Archive,
  FileJson,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Package as PackageIcon,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, SystemSettings, PackageOption } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { apiService } from '../../services/api';
import { VIETNAM_BANKS, generateVietQRUrl } from '../../utils/vietqr';
import { usePrivacyMode } from '../../utils/privacy';
import { PACKAGE_TILES, formatPrice } from './SaleEntryView';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'admin' | 'packages' | 'notifications'>('profile');

  // Packages Management States
  const [packagesList, setPackagesList] = useState<PackageOption[]>(
    systemSettings?.packages && systemSettings.packages.length > 0 
      ? systemSettings.packages 
      : PACKAGE_TILES
  );
  const [packageSaveLoading, setPackageSaveLoading] = useState(false);
  const [packageSuccessMsg, setPackageSuccessMsg] = useState<string | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageFormData, setPackageFormData] = useState<{
    name: string;
    label: string;
    price: number;
    popular: boolean;
  }>({
    name: '',
    label: '',
    price: 50000,
    popular: false
  });
  const [packageToDelete, setPackageToDelete] = useState<PackageOption | null>(null);

  // AI Menu Scanner States
  const [showAiUploadModal, setShowAiUploadModal] = useState(false);
  const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(systemSettings?.gemini_api_key || localStorage.getItem('tarot_gemini_key') || '');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisMethod, setAiAnalysisMethod] = useState<'gemini' | 'ocr' | null>(null);
  const [aiDetectedPackages, setAiDetectedPackages] = useState<PackageOption[]>([]);
  const [aiRawText, setAiRawText] = useState<string | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Sync package list if settings update
  useEffect(() => {
    if (systemSettings?.packages && systemSettings.packages.length > 0) {
      setPackagesList(systemSettings.packages);
    }
  }, [systemSettings?.packages]);

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

  // Backup & Restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

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

  // Quick preset avatars (matching screenshot AD, MT, TH, LN, QV)
  const avatarPresets = [
    { 
      label: 'AD', 
      bg: 'bg-amber-100', 
      text: 'text-amber-900', 
      border: 'border-amber-300',
      url: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=fbbf24&textColor=78350f'
    },
    { 
      label: 'MT', 
      bg: 'bg-purple-100', 
      text: 'text-purple-900', 
      border: 'border-purple-300',
      url: 'https://api.dicebear.com/7.x/initials/svg?seed=MT&backgroundColor=c084fc&textColor=581c87'
    },
    { 
      label: 'TH', 
      bg: 'bg-emerald-100', 
      text: 'text-emerald-900', 
      border: 'border-emerald-300',
      url: 'https://api.dicebear.com/7.x/initials/svg?seed=TH&backgroundColor=6ee7b7&textColor=064e3b'
    },
    { 
      label: 'LN', 
      bg: 'bg-pink-100', 
      text: 'text-pink-900', 
      border: 'border-pink-300',
      url: 'https://api.dicebear.com/7.x/initials/svg?seed=LN&backgroundColor=f9a8d4&textColor=831843'
    },
    { 
      label: 'QV', 
      bg: 'bg-sky-100', 
      text: 'text-sky-900', 
      border: 'border-sky-300',
      url: 'https://api.dicebear.com/7.x/initials/svg?seed=QV&backgroundColor=7dd3fc&textColor=0c4a6e'
    },
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

  // --- Package Pricing Handlers ---
  const handleSavePackages = async (newPackages: PackageOption[]) => {
    setPackageSaveLoading(true);
    setPackageSuccessMsg(null);
    try {
      const updated: Partial<SystemSettings> = {
        packages: newPackages
      };
      await firebaseService.updateSettings(updated);
      if (systemSettings) {
        onUpdateSettings({
          ...systemSettings,
          packages: newPackages
        });
      }
      setPackagesList(newPackages);
      setPackageSuccessMsg('Đã lưu bảng giá gói dịch vụ thành công!');
      setTimeout(() => setPackageSuccessMsg(null), 3000);
    } catch (err: any) {
      alert('Lỗi khi lưu bảng giá: ' + (err?.message || String(err)));
    } finally {
      setPackageSaveLoading(false);
    }
  };

  const handleOpenAddPackage = () => {
    setEditingPackageId(null);
    setPackageFormData({
      name: '',
      label: '',
      price: 50000,
      popular: false
    });
    setShowPackageModal(true);
  };

  const handleOpenEditPackage = (pkg: PackageOption) => {
    setEditingPackageId(pkg.id);
    setPackageFormData({
      name: pkg.name,
      label: pkg.label,
      price: pkg.price,
      popular: !!pkg.popular
    });
    setShowPackageModal(true);
  };

  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name.trim()) {
      alert('Vui lòng nhập tên gói dịch vụ');
      return;
    }
    if (!packageFormData.price || Number(packageFormData.price) <= 0) {
      alert('Vui lòng nhập giá tiền hợp lệ (> 0đ)');
      return;
    }

    let updatedList: PackageOption[];
    if (editingPackageId) {
      updatedList = packagesList.map(p => p.id === editingPackageId ? {
        ...p,
        name: packageFormData.name.trim(),
        label: packageFormData.label.trim() || packageFormData.name.trim(),
        price: Number(packageFormData.price),
        popular: packageFormData.popular
      } : p);
    } else {
      const newPkg: PackageOption = {
        id: 'pkg_' + Date.now(),
        name: packageFormData.name.trim(),
        label: packageFormData.label.trim() || packageFormData.name.trim(),
        price: Number(packageFormData.price),
        popular: packageFormData.popular
      };
      updatedList = [...packagesList, newPkg];
    }

    setShowPackageModal(false);
    handleSavePackages(updatedList);
  };

  const handleDeletePackageConfirm = (pkgId: string) => {
    const updatedList = packagesList.filter(p => p.id !== pkgId);
    setPackageToDelete(null);
    handleSavePackages(updatedList);
  };

  const handleTogglePopular = (pkgId: string) => {
    const updatedList = packagesList.map(p => p.id === pkgId ? { ...p, popular: !p.popular } : p);
    handleSavePackages(updatedList);
  };

  const handleResetDefaultPackages = () => {
    if (window.confirm('Khôi phục danh sách các gói Tarot mặc định của shop?')) {
      handleSavePackages(PACKAGE_TILES);
    }
  };

  // --- AI Menu Scanner Handlers ---
  const handleMenuImageSelect = (file: File) => {
    setMenuImageFile(file);
    setAiErrorMsg(null);
    setAiDetectedPackages([]);
    setAiRawText(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMenuImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAiAnalysis = async () => {
    if (!menuImagePreview) {
      alert('Vui lòng chọn ảnh bảng giá!');
      return;
    }

    setAiAnalyzing(true);
    setAiErrorMsg(null);
    try {
      if (geminiApiKeyInput) {
        localStorage.setItem('tarot_gemini_key', geminiApiKeyInput);
      }
      const res = await apiService.analyzePriceMenu(
        menuImagePreview, 
        menuImageFile?.type || 'image/jpeg', 
        geminiApiKeyInput
      );

      if (res.success && Array.isArray(res.packages) && res.packages.length > 0) {
        setAiDetectedPackages(res.packages);
        setAiAnalysisMethod(res.method || 'gemini');
        setAiRawText(res.rawText || null);
      } else {
        setAiErrorMsg(res.message || 'Không tìm thấy gói giá rõ ràng trong ảnh.');
        if (res.rawText) setAiRawText(res.rawText);
      }
    } catch (err: any) {
      setAiErrorMsg('Lỗi phân tích: ' + (err?.message || String(err)));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleApplyAiPackages = async (mode: 'overwrite' | 'append') => {
    if (aiDetectedPackages.length === 0) return;

    let updatedList: PackageOption[];
    if (mode === 'overwrite') {
      updatedList = [...aiDetectedPackages];
    } else {
      const existingNames = new Set(packagesList.map(p => p.name.toLowerCase()));
      const toAdd = aiDetectedPackages.filter(p => !existingNames.has(p.name.toLowerCase()));
      updatedList = [...packagesList, ...toAdd];
    }

    await handleSavePackages(updatedList);
    setShowAiUploadModal(false);
    setMenuImagePreview(null);
    setMenuImageFile(null);
    setAiDetectedPackages([]);
  };

  const handleUpdateDetectedPackage = (index: number, field: keyof PackageOption, value: any) => {
    setAiDetectedPackages(prev => prev.map((p, idx) => idx === index ? { ...p, [field]: value } : p));
  };

  const handleRemoveDetectedPackage = (index: number) => {
    setAiDetectedPackages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddManualDetectedPackage = () => {
    const newPkg: PackageOption = {
      id: 'pkg_manual_' + Date.now(),
      name: 'gói mới',
      label: 'Gói Mới',
      price: 50000,
      popular: false
    };
    setAiDetectedPackages(prev => [...prev, newPkg]);
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

  // Export full JSON database backup
  const handleExportBackup = async () => {
    setBackupLoading(true);
    setMessage(null);
    try {
      const res = await firebaseService.exportFullBackup();
      if (res.success && res.backup) {
        const jsonStr = JSON.stringify(res.backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
        a.href = url;
        a.download = `tarot_backup_${dateStr}_${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ 
          type: 'success', 
          text: `Đã xuất file sao lưu hệ thống thành công! (${res.backup.stats?.total_sales || 0} đơn hàng, ${res.backup.stats?.total_users || 0} nhân sự)` 
        });
      } else {
        setMessage({ type: 'error', text: res.message || 'Lỗi khi trích xuất dữ liệu sao lưu' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra khi tạo bản sao lưu' });
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle JSON file selection for restore
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !parsed.collections) {
          setMessage({ type: 'error', text: 'File sao lưu không hợp lệ. Cần định dạng JSON đúng chuẩn của Tarot Shop.' });
          return;
        }
        setRestoreData(parsed);
        setShowRestoreModal(true);
      } catch (err) {
        setMessage({ type: 'error', text: 'Lỗi đọc file JSON. Vui lòng kiểm tra lại file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!restoreData) return;
    setRestoreLoading(true);
    try {
      const res = await firebaseService.restoreFullBackup(restoreData);
      if (res.success) {
        setMessage({ type: 'success', text: (res.message || 'Khôi phục dữ liệu thành công!') + ' Đang tải lại...' });
        setShowRestoreModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: res.message || 'Khôi phục dữ liệu thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra khi khôi phục dữ liệu' });
    } finally {
      setRestoreLoading(false);
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
      className="w-full space-y-6 pb-12"
    >
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-md bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0">
              {formData.avatar_url && formData.avatar_url.startsWith('data:image') ? (
                <img 
                  src={formData.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-black tracking-tight">
                  {user.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{user.full_name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 shadow-sm">
                  {roleLabels[user.role]?.title || user.role}
                </span>
              </div>
              <p className="text-purple-100 text-sm mt-1 flex items-center gap-2">
                <span>@{user.username}</span>
                <span>•</span>
                <span>Hoa hồng: <strong>{user.commission_percent || 0}%</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm">
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
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'profile' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserIcon size={18} />
          <span>Hồ Sơ & VietQR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'security' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield size={18} />
          <span>Bảo Mật</span>
        </button>

        {user.role === 'manager' && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'admin' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders size={18} />
            <span>Cấu Hình Hệ Thống</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              Admin
            </span>
          </button>
        )}

        {user.role === 'manager' && (
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'packages' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={18} />
            <span>Bảng Giá Dịch Vụ</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'packages' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              {packagesList.length} gói
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'notifications' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell size={18} />
          <span>Thông Báo</span>
        </button>
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
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== TAB 1: PROFILE & VIETQR ==================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 2 Cards */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Personal Info */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Thông Tin Cá Nhân & Tài Khoản</h3>
                    <p className="text-slate-400 text-xs">Cập nhật họ tên, ảnh đại diện và ghi chú làm việc.</p>
                  </div>
                </div>

                {/* Avatar Selector Presets */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Ảnh Đại Diện</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {avatarPresets.map((preset) => {
                      const isSelected = formData.avatar_url === preset.url || (!formData.avatar_url && preset.label === 'AD');
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar_url: preset.url })}
                          className={`relative w-12 h-12 rounded-2xl font-black text-sm transition-all flex items-center justify-center border-2 cursor-pointer ${preset.bg} ${preset.text} ${
                            isSelected 
                              ? `${preset.border} ring-2 ring-purple-500 ring-offset-2 scale-105 shadow-sm` 
                              : `${preset.border} hover:scale-105 opacity-80 hover:opacity-100`
                          }`}
                        >
                          <span>{preset.label}</span>
                          {isSelected && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-xs">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <label className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 bg-white hover:bg-purple-50/50 flex items-center justify-center text-slate-400 hover:text-purple-600 cursor-pointer transition-all shadow-2xs group">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">PNG hoặc JPG, tối đa 2MB. Ảnh vuông hiển thị đẹp nhất.</p>
                </div>

                {/* Name & Username Inputs */}
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium bg-white"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium bg-white"
                      placeholder="Username"
                    />
                  </div>
                </div>

                {/* Specialty / Bio Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi Chú Cá Nhân</label>
                  <textarea 
                    rows={2}
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none bg-white"
                    placeholder="Ghi chú thêm về vai trò của bạn"
                  />
                </div>
              </div>

              {/* Card 2: Bank Account Info */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Tài Khoản Nhận Lương</h3>
                    <p className="text-slate-400 text-xs">Dùng để tạo mã VietQR nhận lương. Kiểm tra kỹ trước khi lưu.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân Hàng Thụ Hưởng</label>
                  <select
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm font-semibold text-slate-800"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono font-bold tracking-wider bg-white"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono uppercase font-bold bg-white"
                      placeholder="NGUYEN VAN A"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center space-x-2 disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>Lưu Thông Tin Cá Nhân</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Dark Modern VietQR Card */}
            <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
              <div className="bg-[#18182f] rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden border border-indigo-900/40">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Sparkles size={16} />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">Thẻ Lương VietQR</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15">
                      {formData.bank_name || 'MB Bank'}
                    </span>
                  </div>

                  {/* QR Image Frame */}
                  <div className="bg-white p-4 rounded-3xl shadow-xl flex flex-col items-center justify-center mx-auto w-64 h-64 border border-white/20">
                    {livePersonalQRUrl ? (
                      <img 
                        src={livePersonalQRUrl} 
                        alt="Mã QR nhận lương" 
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <QrCode size={56} className="text-slate-300 mb-2" />
                        <span className="text-xs font-medium">Vui lòng nhập Số tài khoản để tạo mã VietQR</span>
                      </div>
                    )}
                  </div>

                  {!formData.bank_account && (
                    <p className="text-center text-xs text-slate-400">
                      Vui lòng nhập Số tài khoản để tạo mã VietQR
                    </p>
                  )}

                  {/* Card Details */}
                  <div className="space-y-2.5 pt-3 border-t border-white/10 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Chủ tài khoản</span>
                      <span className="font-mono font-black text-white tracking-wide text-xs sm:text-sm">
                        {formData.bank_account_name || formData.full_name?.toUpperCase() || 'ADMINISTRATOR'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Số tài khoản</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 tracking-wider text-sm">
                          {formData.bank_account || '•••• ••••'}
                        </span>
                        {formData.bank_account && (
                          <button
                            type="button"
                            onClick={handleCopyStk}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 transition-all text-white/80 cursor-pointer"
                            title="Sao chép STK"
                          >
                            {copiedStk ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Note Callout */}
                  <div className="bg-indigo-950/70 p-3.5 rounded-2xl border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 text-indigo-400 mt-0.5" />
                    <span>
                      Mã QR này hiển thị trực tiếp tại mục <strong>Bảng Lương</strong> để Admin quét khi trả lương.
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

          {/* 4. Full Database Backup & Restore */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Archive size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Trung Tâm Sao Lưu & Khôi Phục (Backup & Restore)</h3>
                  <p className="text-xs text-slate-400">Xuất bản sao lưu toàn vẹn hệ thống hoặc phục hồi dữ liệu từ file JSON an toàn</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                Offline Backup 1-Click
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Backup Card */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Download size={18} className="text-indigo-600" />
                    <span>Xuất Bản Sao Lưu Hệ Thống (.json)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Trích xuất 100% dữ liệu hiện có (Đơn hàng, Nhân sự, Ca làm, Bảng lương, Chi phí, Ads) thành file JSON lưu về máy tính của bạn.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={backupLoading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {backupLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>Tải Về File Sao Lưu (.json)</span>
                </button>
              </div>

              {/* Import / Restore Card */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Upload size={18} className="text-purple-600" />
                    <span>Khôi Phục Dữ Liệu Từ File (.json)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nạp lại dữ liệu từ một bản sao lưu JSON trước đó. Hệ thống sẽ kiểm tra và hiển thị bản tóm tắt trước khi phục hồi.
                  </p>
                </div>

                <label className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-100 flex items-center justify-center gap-2 text-sm cursor-pointer text-center">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFileSelected}
                    className="hidden"
                  />
                  <Upload size={18} />
                  <span>Chọn File JSON Để Khôi Phục</span>
                </label>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Khuyến nghị an toàn:</strong> Bạn nên định kỳ tải bản sao lưu về máy vào cuối tuần hoặc cuối mỗi kỳ lương để lưu trữ dài hạn và đảm bảo không bao giờ bị mất dữ liệu quan trọng.
              </span>
            </div>
          </div>

          {/* 5. Policy, Locking & Maintenance */}
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

      {/* ==================== TAB 4: PACKAGES PRICING CONFIG ==================== */}
      {activeTab === 'packages' && user.role === 'manager' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bảng Giá Gói Dịch Vụ Tarot</h3>
                  <p className="text-xs text-slate-400">Tùy biến tên gói, giá niêm yết (VNĐ) và gắn nhãn Phổ biến để tự động hiển thị trên form Nhập Doanh Thu</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetDefaultPackages}
                  disabled={packageSaveLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Khôi phục về 7 gói Tarot mặc định của shop"
                >
                  <RotateCcw size={14} />
                  <span>Khôi Phục Mặc Định</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAiUploadModal(true);
                    setAiErrorMsg(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md shadow-purple-200 text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Tự động phân tích ảnh bảng giá Tarot bằng AI & OCR"
                >
                  <Camera size={14} />
                  <span>Quét Bảng Giá Từ Ảnh (AI)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddPackage}
                  disabled={packageSaveLoading}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-md shadow-purple-200 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm Gói Mới</span>
                </button>
              </div>
            </div>

            {/* Notification message if saved */}
            {packageSuccessMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2"
              >
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{packageSuccessMsg}</span>
              </motion.div>
            )}

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {packagesList.map((pkg, idx) => (
                <div 
                  key={pkg.id || idx}
                  className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    pkg.popular 
                      ? 'border-purple-300 bg-purple-50/30 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {pkg.popular && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#f97316] text-white text-[9px] font-black uppercase tracking-wider mb-1.5 shadow-2xs">
                          ★ PHỔ BIẾN
                        </span>
                      )}
                      <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{pkg.label || pkg.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Mã gói: <span className="font-mono text-slate-600">{pkg.name}</span></p>
                    </div>

                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Giá Niêm Yết</p>
                    <p className="text-xl font-black text-purple-700 tracking-tight mt-0.5">
                      {formatPrice(pkg.price)}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(pkg.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        pkg.popular 
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title="Bật/Tắt huy hiệu phổ biến"
                    >
                      {pkg.popular ? '★ Đang phổ biến' : '☆ Đặt phổ biến'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa gói"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPackageToDelete(pkg)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa gói"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Helper callout */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <Sparkles size={18} className="text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Mẹo cho Tarot Shop:</p>
                <p className="mt-0.5 text-slate-500">
                  Gói được đánh dấu <strong>Phổ biến</strong> sẽ có nhãn cam nổi bật trên màn hình Nhập Doanh Thu, giúp Reader và Sale chốt nhanh với khách mà không cần gõ phím.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: NOTIFICATIONS CONFIG ==================== */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cài Đặt Thông Báo & Âm Thanh</h3>
              <p className="text-xs text-slate-400">Tùy chỉnh nhận thông báo đơn hàng mới, ca làm việc và tin nhắn hệ thống</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-800">Thông báo đơn hàng mới</p>
                <p className="text-xs text-slate-400 mt-0.5">Phát chuông khi nhân viên tạo đơn mới</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Bật</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-800">Thông báo nhắc ca làm</p>
                <p className="text-xs text-slate-400 mt-0.5">Nhắc nhở trước 15 phút khi đến ca trực</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Bật</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-800">Âm thanh chốt đơn tiền về</p>
                <p className="text-xs text-slate-400 mt-0.5">Hiệu ứng âm thanh ting ting khi ghi nhận doanh thu</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Bật</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-800">Đồng bộ tự động Meta Ads</p>
                <p className="text-xs text-slate-400 mt-0.5">Cập nhật chi phí ads mỗi 2 phút một lần</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">Tự động</span>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Package Modal */}
      <AnimatePresence>
        {showPackageModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {editingPackageId ? 'Chỉnh Sửa Gói Dịch Vụ' : 'Thêm Gói Dịch Vụ Mới'}
                    </h3>
                    <p className="text-purple-100 text-xs mt-0.5">Cập nhật bảng giá dịch vụ cho shop</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitPackage} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên gói (Mã hiển thị) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={packageFormData.name}
                    onChange={e => setPackageFormData({ 
                      ...packageFormData, 
                      name: e.target.value,
                      label: packageFormData.label ? packageFormData.label : e.target.value
                    })}
                    placeholder="VD: 5 câu hoặc Trọn gói 1h"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nhãn hiển thị trên nút chọn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={packageFormData.label}
                    onChange={e => setPackageFormData({ ...packageFormData, label: e.target.value })}
                    placeholder="VD: 5 Câu"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Giá tiền (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={packageFormData.price || ''}
                    onChange={e => setPackageFormData({ ...packageFormData, price: Number(e.target.value) || 0 })}
                    placeholder="VD: 100000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-purple-700"
                  />
                  {packageFormData.price > 0 && (
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Hiển thị: <strong className="text-purple-600">{formatPrice(packageFormData.price)}</strong>
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={packageFormData.popular}
                      onChange={e => setPackageFormData({ ...packageFormData, popular: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Đánh dấu là gói Phổ Biến</span>
                      <p className="text-[11px] text-slate-500">Hiển thị badge cam nổi bật để Sale & Reader ưu tiên tư vấn</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPackageModal(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    type="submit"
                    disabled={packageSaveLoading}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{editingPackageId ? 'Cập Nhật Gói' : 'Thêm Vào Bảng Giá'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Package Confirmation Modal */}
      <AnimatePresence>
        {packageToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xóa gói dịch vụ?</h3>
                <p className="text-xs text-slate-500">
                  Bạn có chắc muốn xóa gói <strong className="text-slate-800">"{packageToDelete.label}"</strong> ({formatPrice(packageToDelete.price)}) khỏi bảng giá?
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPackageToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-xs transition-colors"
                >
                  Giữ Lại
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePackageConfirm(packageToDelete.id)}
                  disabled={packageSaveLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm shadow-rose-200"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Menu Scanner & Upload Modal */}
      <AnimatePresence>
        {showAiUploadModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-5 sm:p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs">
                    <Sparkles size={22} className="text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <span>Quét & Tự Nhập Bảng Giá Từ Ảnh</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-purple-950 font-black tracking-wider uppercase">
                        AI Vision
                      </span>
                    </h3>
                    <p className="text-purple-100 text-xs mt-0.5">
                      Tải ảnh menu giá Tarot, hệ thống AI sẽ tự động phân tích và trích xuất bảng giá vào hệ thống
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiUploadModal(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700">
                {/* 1. Upload & Preview Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Tải Lên Ảnh Menu / Bảng Giá Dịch Vụ
                  </label>

                  {!menuImagePreview ? (
                    <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50/70 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMenuImageSelect(file);
                        }}
                        className="hidden"
                      />
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center text-purple-600 mb-3 border border-purple-100">
                        <Camera size={28} />
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        Nhấn để chọn ảnh hoặc kéo thả ảnh vào đây
                      </span>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Hỗ trợ định dạng PNG, JPG, JPEG, WEBP. Ảnh chụp bảng giá rõ chữ, poster Canva hoặc menu story.
                      </p>
                    </label>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-full sm:w-36 h-36 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                        <img
                          src={menuImagePreview}
                          alt="Menu Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {menuImageFile?.name || 'Ảnh bảng giá đã chọn'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {menuImageFile ? `${(menuImageFile.size / 1024).toFixed(1)} KB` : 'Đã tải lên'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <label className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMenuImageSelect(file);
                              }}
                              className="hidden"
                            />
                            <Camera size={13} />
                            <span>Đổi ảnh khác</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuImagePreview(null);
                              setMenuImageFile(null);
                              setAiDetectedPackages([]);
                              setAiRawText(null);
                              setAiErrorMsg(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Gemini API Key field */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Key size={14} className="text-indigo-600" />
                      <span>Google Gemini Vision API Key (Tùy chọn)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Có sẵn OCR offline dự phòng</span>
                  </div>
                  <input
                    type="password"
                    value={geminiApiKeyInput}
                    onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                    placeholder="AIzaSy... (Nếu không nhập, hệ thống sẽ dùng OCR nội bộ miễn phí)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    💡 Gemini 2.5 Flash Vision đọc được cả ảnh nghệ thuật, font thư pháp và poster phức tạp. Nếu không có key, hệ thống vẫn dùng OCR offline đọc bảng giá rõ nét.
                  </p>
                </div>

                {/* Analysis Action Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleStartAiAnalysis}
                    disabled={!menuImagePreview || aiAnalyzing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {aiAnalyzing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-amber-300" />
                        <span>Đang phân tích bảng giá bằng AI / OCR... Vui lòng đợi</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Bắt Đầu Phân Tích & Bóc Tách Bảng Giá</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {aiErrorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
                    <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Không thể bóc tách tự động</p>
                      <p className="mt-0.5 text-rose-700">{aiErrorMsg}</p>
                      <p className="mt-1 text-[11px] text-rose-600 italic">
                        Gợi ý: Bạn có thể nhập Gemini API Key hoặc bấm "+ Thêm gói" bên dưới để nhập nhanh.
                      </p>
                    </div>
                  </div>
                )}

                {/* Raw Text toggle if available */}
                {aiRawText && (
                  <details className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <summary className="font-semibold text-slate-600 cursor-pointer select-none">
                      Xem nội dung chữ OCR đọc được ({aiRawText.length} ký tự)
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded border border-slate-100 text-[11px] font-mono text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {aiRawText}
                    </pre>
                  </details>
                )}

                {/* 2. Detected Packages Preview & Edit */}
                {aiDetectedPackages.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>Các Gói Dịch Vụ Đã Nhận Diện ({aiDetectedPackages.length})</span>
                          {aiAnalysisMethod === 'gemini' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                              Gemini 2.5 Vision
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                              OCR Engine
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Kiểm tra và sửa trực tiếp tên gói hoặc giá tiền trước khi lưu vào hệ thống
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualDetectedPackage}
                        className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Thêm gói</span>
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {aiDetectedPackages.map((pkg, idx) => (
                        <div
                          key={pkg.id || idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <input
                                type="text"
                                value={pkg.label || pkg.name}
                                onChange={(e) => {
                                  handleUpdateDetectedPackage(idx, 'label', e.target.value);
                                  handleUpdateDetectedPackage(idx, 'name', e.target.value);
                                }}
                                placeholder="Tên gói (VD: 3 câu hỏi)"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="1000"
                                value={pkg.price || 0}
                                onChange={(e) => handleUpdateDetectedPackage(idx, 'price', Number(e.target.value) || 0)}
                                placeholder="Giá VNĐ"
                                className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">
                                {formatPrice(pkg.price)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateDetectedPackage(idx, 'popular', !pkg.popular)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                pkg.popular
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                              }`}
                              title="Gắn cờ gói phổ biến"
                            >
                              {pkg.popular ? '★ Phổ biến' : '☆ Đặt'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveDetectedPackage(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa gói này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAiUploadModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs transition-colors cursor-pointer text-center"
                >
                  Đóng
                </button>

                {aiDetectedPackages.length > 0 && (
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAiPackages('append')}
                      disabled={packageSaveLoading}
                      className="px-4 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Thêm Nối Tiếp (Giữ Gói Cũ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAiPackages('overwrite')}
                      disabled={packageSaveLoading}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md shadow-purple-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Ghi Đè Toàn Bộ Bảng Giá</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showRestoreModal && restoreData && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Archive size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Xác Nhận Khôi Phục Dữ Liệu</h3>
                    <p className="text-purple-100 text-xs mt-0.5">Kiểm tra thông tin bản sao lưu trước khi phục hồi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRestoreModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Thời gian tạo bản sao lưu:</span>
                    <strong className="text-slate-800 font-mono">
                      {restoreData.exported_at ? new Date(restoreData.exported_at).toLocaleString('vi-VN') : 'Không xác định'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Phiên bản file:</span>
                    <strong className="text-slate-800 font-mono">{restoreData.version || '1.0'}</strong>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="text-[10px] text-indigo-600 font-bold uppercase">Đơn Hàng</span>
                    <p className="text-lg font-black text-indigo-900 mt-1">
                      {restoreData.stats?.total_sales ?? restoreData.collections?.sales?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-600 font-bold uppercase">Nhân Sự</span>
                    <p className="text-lg font-black text-purple-900 mt-1">
                      {restoreData.stats?.total_users ?? restoreData.collections?.users?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Ca Làm</span>
                    <p className="text-lg font-black text-emerald-900 mt-1">
                      {restoreData.stats?.total_shifts ?? restoreData.collections?.shifts?.length ?? 0}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Cảnh báo:</strong> Quá trình khôi phục sẽ ghi đè và cập nhật các bản ghi trong hệ thống bằng dữ liệu từ file backup. Hãy chắc chắn bạn muốn thực hiện thao tác này.
                  </span>
                </div>

                <div className="pt-2 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(false)}
                    disabled={restoreLoading}
                    className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    disabled={restoreLoading}
                    className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {restoreLoading ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    <span>Bắt Đầu Khôi Phục</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
