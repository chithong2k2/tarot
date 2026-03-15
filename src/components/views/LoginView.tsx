import React from 'react';
import { 
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  loginForm: any;
  setLoginForm: (form: any) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSeed: () => void;
  checkApi: () => void;
  loading: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginForm,
  setLoginForm,
  handleLogin,
  handleSeed,
  checkApi,
  loading
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <LayoutDashboard className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tarot Shop Manager</h1>
          <p className="text-slate-500 mt-2">Đăng nhập để quản lý doanh thu</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tên đăng nhập</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Nhập username"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Nhập password"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button 
              type="button"
              onClick={handleSeed}
              disabled={loading}
              className="w-full text-xs text-indigo-600 hover:underline transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Đang khởi tạo...' : 'Chưa có dữ liệu? Khởi tạo toàn bộ hệ thống (Admin, Gói, Cài đặt...)'}</span>
            </button>
            
            <button 
              type="button"
              onClick={checkApi}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Kiểm tra kết nối Firebase
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
