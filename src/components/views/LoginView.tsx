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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Mystical Moon */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full bg-[#fdfdfd] shadow-[0_0_100px_rgba(255,255,255,0.4)] z-0"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 opacity-90" />
        <div className="absolute inset-0 rounded-full shadow-[inset_-20px_-20px_50px_rgba(0,0,0,0.1)]" />
      </motion.div>

      {/* Floating Tarot Cards */}
      <motion.div
        initial={{ opacity: 0, x: -50, rotate: -10 }}
        animate={{ 
          opacity: 0.8, 
          x: 0, 
          y: [0, -15, 0],
          rotate: [-10, -12, -10] 
        }}
        transition={{ 
          opacity: { duration: 1.5 },
          x: { duration: 1.5 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute left-[5%] top-[25%] w-32 md:w-48 z-0 pointer-events-none hidden sm:block bg-[#0a0a0a] rounded-xl"
      >
        <img 
          src="https://i.imgur.com/6NDZG63.png" 
          alt="Tarot Card 1" 
          className="w-full h-auto rounded-xl shadow-2xl border border-white/10"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50, rotate: -5 }}
        animate={{ 
          opacity: 0.8, 
          y: 0, 
          x: [0, -10, 0],
          rotate: [-5, -7, -5] 
        }}
        transition={{ 
          opacity: { duration: 1.5 },
          y: { duration: 1.5 },
          x: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute left-[20%] bottom-[10%] w-28 md:w-40 z-0 pointer-events-none hidden sm:block bg-[#0a0a0a] rounded-xl"
      >
        <img 
          src="https://i.imgur.com/uCSlmPE.png" 
          alt="Tarot Card 3" 
          className="w-full h-auto rounded-xl shadow-2xl border border-white/10"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50, rotate: 10 }}
        animate={{ 
          opacity: 0.8, 
          x: 0, 
          y: [0, 15, 0],
          rotate: [10, 12, 10] 
        }}
        transition={{ 
          opacity: { duration: 1.5 },
          x: { duration: 1.5 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute right-[5%] bottom-[18%] w-32 md:w-48 z-10 pointer-events-none hidden sm:block bg-[#0a0a0a] rounded-xl"
      >
        <img 
          src="https://i.imgur.com/Aqob9mG.png" 
          alt="Tarot Card 2" 
          className="w-full h-auto rounded-xl shadow-2xl border border-white/10"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Atmospheric Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" 
      />

      {/* Floating Mystical Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: 0.1
          }}
          animate={{ 
            y: [null, Math.random() * -100 - 50],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.5, 1]
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
        />
      ))}

      {/* Floating Decorative Orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-[15%] w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full border border-white/5 backdrop-blur-3xl hidden md:block"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 border border-white/10 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 overflow-hidden">
            <img 
              src="https://i.imgur.com/6mEsD6k.png" 
              alt="Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tarot Shop</h1>
          <p className="text-slate-400 mt-2 font-medium">Hệ thống quản lý doanh thu</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
            <input 
              type="text" 
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Nhập username"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Nhập password"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          
          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-900/20 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-slate-600 text-xs font-medium tracking-widest uppercase">© 2026 Tarot Manager System</p>
      </div>
    </div>
  );
};
