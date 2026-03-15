import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  UserCircle, 
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { firebaseService } from '../../services/firebaseService';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    avatar_url: user.avatar_url || ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

          // Max dimensions for avatar to keep it small
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
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.6 quality (very small size)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
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
        setFormData({ ...formData, avatar_url: compressedBase64 });
      } catch (err) {
        console.error("Image compression error:", err);
        setMessage({ type: 'error', text: 'Không thể xử lý ảnh này. Vui lòng thử ảnh khác.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await firebaseService.updateUserProfile(user.id, formData);
      if (res.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        onUpdateUser({ ...user, ...formData });
      } else {
        setMessage({ type: 'error', text: res.message || 'Cập nhật thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage(null);

    if (passwordData.current !== user.password) {
      setPassMessage({ type: 'error', text: 'Mật khẩu hiện tại không chính xác!' });
      setPassLoading(false);
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPassMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      setPassLoading(false);
      return;
    }

    try {
      const res = await firebaseService.updateUserProfile(user.id, { password: passwordData.new });
      if (res.success) {
        setPassMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        onUpdateUser({ ...user, password: passwordData.new });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordData({ current: '', new: '', confirm: '' });
          setPassMessage(null);
        }, 1500);
      } else {
        setPassMessage({ type: 'error', text: res.message || 'Đổi mật khẩu thất bại' });
      }
    } catch (err) {
      setPassMessage({ type: 'error', text: 'Đã có lỗi xảy ra' });
    } finally {
      setPassLoading(false);
    }
  };

  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Cài Đặt Tài Khoản</h2>
            <p className="text-indigo-100 mt-1">Quản lý thông tin cá nhân và bảo mật</p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <UserCircle size={120} />
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 p-4 rounded-2xl flex items-center space-x-3 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="font-medium">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Ảnh đại diện</label>
              <div className="flex flex-wrap gap-4">
                {avatarOptions.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar_url: url })}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${
                      formData.avatar_url === url ? 'border-indigo-600 scale-110 shadow-lg' : 'border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    <img src={url} alt="Avatar option" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {formData.avatar_url === url && (
                      <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                        <CheckCircle2 size={24} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
                <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-all overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  {formData.avatar_url && !avatarOptions.includes(formData.avatar_url) ? (
                    <img src={formData.avatar_url} alt="Uploaded" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Camera size={24} />
                  )}
                </label>
              </div>
              <p className="text-[10px] text-slate-400 italic">Mẹo: Bạn có thể chọn từ danh sách hoặc tải ảnh của riêng mình lên (tối đa 1MB).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <UserIcon size={20} className="text-indigo-600" />
                  <span>Thông tin cá nhân</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Họ và Tên</label>
                    <input 
                      type="text" 
                      required
                      value={formData.full_name}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Nhập họ tên đầy đủ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tên tài khoản</label>
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Nhập username"
                    />
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Lock size={20} className="text-indigo-600" />
                  <span>Bảo mật</span>
                </h3>
                
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                    <Lock size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Mật khẩu tài khoản</p>
                    <p className="text-xs text-slate-500 mt-1">Thay đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 transition-all"
                  >
                    Đổi Mật Khẩu
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </form>
        </div>
      </div>

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
                  <h3 className="text-xl font-bold">Đổi Mật Khẩu</h3>
                  <p className="text-indigo-100 text-xs mt-1">Vui lòng nhập đầy đủ thông tin</p>
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    required
                    value={passwordData.current}
                    onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="h-px bg-slate-100 my-2" />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    value={passwordData.new}
                    onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    value={passwordData.confirm}
                    onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {passLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Cập Nhật</span>
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
