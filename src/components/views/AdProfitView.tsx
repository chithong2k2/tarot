import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, History, Calendar, Facebook, TrendingDown, Wallet } from 'lucide-react';
import { DashboardSummary, AdHistoryRecord } from '../../types';

interface AdProfitViewProps {
  summary: DashboardSummary;
  adHistory: AdHistoryRecord[];
}

export const AdProfitView: React.FC<AdProfitViewProps> = ({ summary, adHistory }) => {
  const [adSpend, setAdSpend] = useState<number>(0);
  const [error] = useState<string | null>(null);

  // Calculate today's revenue and operating costs from summary or raw data
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Find today's record in history if it exists
  const todayRecord = adHistory.find(h => h.date === todayStr);

  useEffect(() => {
    if (todayRecord) {
      setAdSpend(todayRecord.spend);
    }
  }, [todayRecord]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Calculate total ad spend for the week (Mon-Sun)
  const totalWeeklyAdSpend = summary.dailyStats.reduce((sum, day) => sum + day.adSpend, 0);

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
          <p className="text-slate-500">Dữ liệu chi phí Ads được cập nhật tự động mỗi 5 phút.</p>
        </div>
      </div>

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
            Thứ 2 - Chủ Nhật
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
              {adHistory.length > 0 ? (
                adHistory.map((record) => {
                  const dateObj = new Date(record.date);
                  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                  const dayName = days[dateObj.getDay()];
                  const formattedDate = record.date.split('-').reverse().join('/');

                  return (
                    <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
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
                      <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">{formatCurrency(record.spend)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">
                    Đang chờ dữ liệu cập nhật tự động từ Facebook...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
