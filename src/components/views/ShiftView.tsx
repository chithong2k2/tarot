import React, { useState } from 'react';
import { 
  Clock,
  PlusCircle,
  Trash2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shift, ShiftRegistration, SystemSettings } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';

interface ShiftViewProps {
  user: User;
  view: string;
  shifts: Shift[];
  readerSchedule: ShiftRegistration[];
  saleSchedule: ShiftRegistration[];
  fetchData: () => void;
  handleShiftRegistration: (shiftId: string, day: string) => void;
  handleShiftUnregistration: (id: string, type?: 'reader' | 'sale') => void;
  loading: boolean;
  settings: SystemSettings;
  users: User[];
}

export const ShiftView: React.FC<ShiftViewProps> = ({
  user,
  view,
  shifts,
  readerSchedule,
  saleSchedule,
  fetchData,
  handleShiftRegistration,
  handleShiftUnregistration,
  loading,
  settings,
  users
}) => {
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[new Date().getDay()];
  });

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [unregistrationData, setUnregistrationData] = useState<{id: string, type?: 'reader' | 'sale'} | null>(null);
  const [manualAddData, setManualAddData] = useState<{shiftId: string, type: 'reader' | 'sale'} | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<Shift>>({
    shift_name: '',
    start_time: '',
    end_time: ''
  });

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await firebaseService.createShift(shiftForm);
    if (res.success) {
      setShowShiftForm(false);
      setShiftForm({ shift_name: '', start_time: '', end_time: '' });
      fetchData();
    }
  };

  const handleDeleteShift = async (id: string) => {
    const res = await firebaseService.deleteShift(id);
    if (res.success) fetchData();
  };

  const handleToggleLock = async () => {
    const res = await firebaseService.updateSettings({ is_locked: !settings.is_locked });
    if (res.success) fetchData();
  };

  const handleManualAdd = async (userId: string) => {
    if (!manualAddData) return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const registration = { 
      user_id: targetUser.id, 
      shift_id: manualAddData.shiftId, 
      day_of_week: selectedDay as any 
    };

    const res = manualAddData.type === 'reader' 
      ? await firebaseService.registerReaderShift(registration)
      : await firebaseService.registerSaleShift(registration);
    
    if (res.success) {
      setManualAddData(null);
      fetchData();
    } else {
      alert('Thêm thất bại');
    }
  };

  if (view === 'register_shift') {
    return (
      <motion.div 
        key="register_shift"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Đăng Ký Ca Làm Việc</h2>
            <p className="text-indigo-100 mt-1">Chọn ngày và ca trực phù hợp</p>
          </div>
          <div className="flex bg-indigo-500/30 p-1 rounded-xl">
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDay === day ? 'bg-white text-indigo-600 shadow-sm' : 'text-white hover:bg-indigo-500/50'}`}
              >
                {day.replace('Thứ ', 'T')}
              </button>
            ))}
          </div>
        </div>

        {settings.is_locked && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-amber-800">
            <X size={20} className="text-amber-600" />
            <p className="font-medium">Lịch trực đã được khóa. Bạn không thể đăng ký hoặc hủy đăng ký lúc này.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shifts.map(shift => {
            const isRegistered = (user.role === 'reader' ? readerSchedule : saleSchedule).some(r => r.shift_id === shift.id && r.user_id === user.id && r.day_of_week === selectedDay);
            const registration = (user.role === 'reader' ? readerSchedule : saleSchedule).find(r => r.shift_id === shift.id && r.user_id === user.id && r.day_of_week === selectedDay);

            return (
              <div key={shift.id} className={`bg-white p-6 rounded-2xl border ${isRegistered ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-100'} card-shadow transition-all`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${isRegistered ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'} rounded-xl flex items-center justify-center`}>
                    <Clock size={24} />
                  </div>
                  {isRegistered && <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Đã đăng ký {selectedDay}</span>}
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{shift.shift_name}</h3>
                <p className="text-slate-500 text-sm mb-6">{shift.start_time} - {shift.end_time}</p>
                
                {isRegistered ? (
                  <button 
                    onClick={() => setUnregistrationData({ id: registration!.id })}
                    disabled={loading || settings.is_locked}
                    className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Hủy Đăng Ký
                  </button>
                ) : (
                  <button 
                    onClick={() => handleShiftRegistration(shift.id, selectedDay)}
                    disabled={loading || settings.is_locked}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    Đăng Ký {selectedDay}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      key="shifts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quản Lý Ca Trực</h2>
            <p className="text-slate-500">Xem và quản lý lịch trực hàng tuần</p>
          </div>
          {settings.is_locked ? (
            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center space-x-1.5 border border-amber-200 animate-pulse">
              <Lock size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Đã Khóa</span>
            </div>
          ) : (
            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center space-x-1.5 border border-emerald-200">
              <Unlock size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Đang Mở</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'manager' && (
            <button 
              onClick={handleToggleLock}
              disabled={loading}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all border shadow-sm ${
                settings.is_locked 
                  ? 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50' 
                  : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : settings.is_locked ? (
                <Unlock size={18} />
              ) : (
                <Lock size={18} />
              )}
              <span>{settings.is_locked ? 'Mở Khóa Đăng Ký' : 'Khóa Đăng Ký Lịch'}</span>
            </button>
          )}
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDay === day ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {day}
              </button>
            ))}
          </div>
          {user.role === 'manager' && (
            <button 
              onClick={() => setShowShiftForm(true)}
              disabled={settings.is_locked}
              className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showShiftForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Thêm Ca Trực Mới</h3>
              <button onClick={() => setShowShiftForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                type="text" required placeholder="Tên ca (VD: Ca Sáng)"
                value={shiftForm.shift_name} onChange={e => setShiftForm({...shiftForm, shift_name: e.target.value})}
                className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input 
                type="time" required
                value={shiftForm.start_time} onChange={e => setShiftForm({...shiftForm, start_time: e.target.value})}
                className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <input 
                  type="time" required
                  value={shiftForm.end_time} onChange={e => setShiftForm({...shiftForm, end_time: e.target.value})}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                  Lưu
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reader Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex items-center justify-between">
            <h3 className="font-bold text-indigo-900 flex items-center space-x-2">
              <CalendarCheck size={20} />
              <span>Lịch Reader - {selectedDay}</span>
            </h3>
            {user.role === 'manager' && (
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Admin Mode</span>
            )}
          </div>
          <div className="p-6 space-y-4">
            {shifts.map(shift => (
              <div key={shift.id} className="flex items-start justify-between p-4 rounded-xl border border-slate-50 hover:border-slate-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-900">{shift.shift_name}</p>
                      {user.role === 'manager' && (
                        <button 
                          onClick={() => setManualAddData({ shiftId: shift.id, type: 'reader' })}
                          disabled={settings.is_locked}
                          className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-30"
                        >
                          <PlusCircle size={14} />
                        </button>
                      )}
                    </div>
                    {user.role === 'manager' && (
                      <button 
                        onClick={() => setDeletingShiftId(shift.id)} 
                        disabled={settings.is_locked}
                        className="text-slate-300 hover:text-red-600 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{shift.start_time} - {shift.end_time}</p>
                  <div className="flex flex-wrap gap-2">
                    {readerSchedule.filter(r => r.shift_id === shift.id && r.day_of_week === selectedDay).map(r => {
                      const regUser = users.find(u => u.id === r.user_id);
                      const regUserName = regUser?.full_name || 'Unknown';
                      return (
                        <div key={r.id} className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100">
                          <span>{regUserName}</span>
                          {user.role === 'manager' && (
                            <button 
                              onClick={() => setUnregistrationData({ id: r.id, type: 'reader' })} 
                              disabled={settings.is_locked}
                              className="hover:text-red-600 ml-1 disabled:opacity-30"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {readerSchedule.filter(r => r.shift_id === shift.id && r.day_of_week === selectedDay).length === 0 && (
                      <span className="text-xs text-slate-300 italic">Chưa có reader trực</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sale Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
            <h3 className="font-bold text-emerald-900 flex items-center space-x-2">
              <CalendarCheck size={20} />
              <span>Lịch Sale - {selectedDay}</span>
            </h3>
            {user.role === 'manager' && (
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Admin Mode</span>
            )}
          </div>
          <div className="p-6 space-y-4">
            {shifts.map(shift => (
              <div key={shift.id} className="flex items-start justify-between p-4 rounded-xl border border-slate-50 hover:border-slate-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-900">{shift.shift_name}</p>
                      {user.role === 'manager' && (
                        <button 
                          onClick={() => setManualAddData({ shiftId: shift.id, type: 'sale' })}
                          disabled={settings.is_locked}
                          className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-30"
                        >
                          <PlusCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{shift.start_time} - {shift.end_time}</p>
                  <div className="flex flex-wrap gap-2">
                    {saleSchedule.filter(r => r.shift_id === shift.id && r.day_of_week === selectedDay).map(r => {
                      const regUser = users.find(u => u.id === r.user_id);
                      const regUserName = regUser?.full_name || 'Unknown';
                      return (
                        <div key={r.id} className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                          <span>{regUserName}</span>
                          {user.role === 'manager' && (
                            <button 
                              onClick={() => setUnregistrationData({ id: r.id, type: 'sale' })} 
                              disabled={settings.is_locked}
                              className="hover:text-red-600 ml-1 disabled:opacity-30"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {saleSchedule.filter(r => r.shift_id === shift.id && r.day_of_week === selectedDay).length === 0 && (
                      <span className="text-xs text-slate-300 italic">Chưa có sale trực</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!deletingShiftId}
        onClose={() => setDeletingShiftId(null)}
        onConfirm={() => deletingShiftId && handleDeleteShift(deletingShiftId)}
        title="Xác nhận xóa ca trực"
        message="Bạn có chắc chắn muốn xóa ca trực này? Tất cả đăng ký liên quan sẽ bị ảnh hưởng."
      />
      <ConfirmModal 
        isOpen={!!unregistrationData}
        onClose={() => setUnregistrationData(null)}
        onConfirm={() => unregistrationData && handleShiftUnregistration(unregistrationData.id, unregistrationData.type)}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký ca trực này?"
      />

      {/* Manual Add Modal */}
      <AnimatePresence>
        {manualAddData && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className={`p-6 text-white ${manualAddData.type === 'reader' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                <h3 className="text-xl font-bold">Thêm {manualAddData.type === 'reader' ? 'Reader' : 'Sale'} Thủ Công</h3>
                <p className="text-white/80 text-sm mt-1">Chọn nhân viên để thêm vào ca trực</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {users.filter(u => u.role === manualAddData.type && u.status !== 'inactive').map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleManualAdd(u.id)}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500">@{u.username}</p>
                      </div>
                      <Plus size={18} className="text-slate-300 group-hover:text-indigo-600" />
                    </button>
                  ))}
                  {users.filter(u => u.role === manualAddData.type).length === 0 && (
                    <p className="text-center py-8 text-slate-400 italic">Không tìm thấy nhân viên phù hợp</p>
                  )}
                </div>
                <button 
                  onClick={() => setManualAddData(null)}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
