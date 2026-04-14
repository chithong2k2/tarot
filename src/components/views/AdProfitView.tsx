import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, History, Calendar, Facebook, TrendingDown, Wallet, Save, Edit3 } from 'lucide-react';
import { DashboardSummary, AdHistoryRecord } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { formatVNTime, getVNDateStr, getVNMonday } from '../../utils/dateUtils';

interface AdProfitViewProps {
  summary: DashboardSummary;
  adHistory: AdHistoryRecord[];
  fetchData: () => Promise<void>;
}

export const AdProfitView: React.FC<AdProfitViewProps> = ({ summary, adHistory, fetchData }) => {
  const [adSpend, setAdSpend] = useState<number>(0);
  const [error] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [weeklyInputs, setWeeklyInputs] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Calculate today's revenue and operating costs from summary or raw data
  const todayStr = getVNDateStr();
  
  // Find today's record in history if it exists
  const todayRecord = adHistory.find(h => h.date === todayStr);

  useEffect(() => {
    if (todayRecord) {
      setAdSpend(todayRecord.spend);
    }
  }, [todayRecord]);

  // Initialize weekly inputs from summary
  useEffect(() => {
    const inputs: Record<string, number> = {};
    summary.dailyStats.forEach(day => {
      inputs[day.name] = day.adSpend;
    });
    setWeeklyInputs(inputs);
  }, [summary]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleSaveWeeklyAds = async () => {
    setIsSaving(true);
    try {
      const monday = getVNMonday();
      const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const dateStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);

        const dayName = days[i];
        const spend = weeklyInputs[dayName] || 0;
        
        await firebaseService.saveWeeklyAdCost(dayName, spend, dateStr);
      }
      
      await fetchData();
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving weekly ads:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total ad spend for the week (Mon-Sun)
  const totalWeeklyAdSpend = summary.dailyStats.reduce((sum, day) => sum + day.adSpend, 0);

  // Get current week range for display and filtering
  const monday = getVNMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDateRange = (d: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  };

  const weekRangeStr = `${formatDateRange(monday)} - ${formatDateRange(sunday)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facebook Ads & Lợi Nhuận</h1>
          <p className="text-slate-500">Dữ liệu chi phí Ads được cập nhật tự động mỗi 5 phút hoặc nhập thủ công.</p>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all ${
            isEditing ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
          }`}
        >
          {isEditing ? <History size={18} /> : <Edit3 size={18} />}
          <span>{isEditing ? 'Hủy chỉnh sửa' : 'Nhập Ads Tuần Này'}</span>
        </button>
      </div>

      {isEditing && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="text-indigo-600" size={20} />
              <span>Cập Nhật Chi Phí Ads Theo Tuần</span>
            </h3>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Thứ 2 - Chủ Nhật</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((day) => (
              <div key={day} className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</label>
                <input 
                  type="number"
                  value={weeklyInputs[day] || ''}
                  onChange={(e) => setWeeklyInputs({ ...weeklyInputs, [day]: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSaveWeeklyAds}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Chi Phí Tuần'}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Summary Cards for Ads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-600 text-white">
            <Facebook size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ads Hôm Nay</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(adSpend)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-600 text-white">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tổng Ads Tuần Này</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalWeeklyAdSpend)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-600 text-white">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tổng Hoa Hồng Tuần</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency((summary.totalReaderCommission || 0) + (summary.totalSaleCommission || 0))}</h3>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold">Lưu ý về Facebook API</p>
            <p className="text-sm opacity-90">{error}</p>
            <p className="text-xs mt-2 italic">Dữ liệu sẽ được lưu vết lịch sử mỗi khi bạn cập nhật.</p>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <History size={20} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Chi Tiết Ads Theo Tuần</h3>
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {weekRangeStr}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thứ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Chi phí Ads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
                const rows = [];
                
                for (let i = 0; i < 7; i++) {
                  const date = new Date(monday);
                  date.setDate(monday.getDate() + i);
                  const dateStr = new Intl.DateTimeFormat('sv-SE', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).format(date);
                  
                  const record = adHistory.find(h => h.date === dateStr);
                  const dayName = days[i];
                  const formattedDate = dateStr.split('-').reverse().join('/');
                  
                  rows.push(
                    <tr key={dateStr} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          <span className="font-medium text-slate-700">{formattedDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          dayName === 'Chủ nhật' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {dayName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-bold ${record ? 'text-blue-600' : 'text-slate-300'}`}>
                            {formatCurrency(record ? record.spend : 0)}
                          </span>
                          {record?.updated_at && (
                            <span className="text-[9px] text-slate-400 font-medium">Cập nhật: {formatVNTime(record.updated_at).split(' ')[1]}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
