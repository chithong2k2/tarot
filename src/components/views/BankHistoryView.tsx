import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  Search, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  FileDown,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BankTransaction } from '../../types';
import { bankService } from '../../services/bankService';
import { formatVND } from '../DashboardComponents';

export const BankHistoryView: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await bankService.getTransactionsByDay(selectedDay);
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedDay]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await bankService.syncTransactions();
      if (res.success) {
        setMessage({ type: 'success', text: `Đã đồng bộ thành công ${res.count} giao dịch mới!` });
        fetchTransactions();
      } else {
        setMessage({ type: 'error', text: 'Không tìm thấy giao dịch mới hoặc lỗi kết nối API ngân hàng.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi đồng bộ dữ liệu ngân hàng.' });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIn = filteredTransactions
    .filter(tx => tx.type === 'IN')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOut = filteredTransactions
    .filter(tx => tx.type === 'OUT')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lịch Sử Ngân Hàng (MBBank)</h2>
          <p className="text-slate-500">Kiểm tra giao dịch chuyển khoản thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="https://online.mbbank.com.vn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <ExternalLink size={18} />
            <span>MBBank Online</span>
          </a>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm
              ${syncing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
            `}
          >
            <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ PayOS (Free)'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl flex items-center space-x-3 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng Tiền Vào</p>
            <p className="text-xl font-bold text-emerald-600">{formatVND(totalIn)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center space-x-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng Tiền Ra</p>
            <p className="text-xl font-bold text-red-600">{formatVND(totalOut)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Số Dư Thay Đổi</p>
            <p className="text-xl font-bold text-indigo-600">{formatVND(totalIn - totalOut)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo nội dung hoặc mã giao dịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center space-x-3">
          <Calendar className="text-slate-400" size={18} />
          <input 
            type="date" 
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Nội dung chuyển khoản</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
                <th className="px-6 py-4">Mã giao dịch</th>
                <th className="px-6 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {new Date(tx.transaction_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(tx.transaction_date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 line-clamp-2 max-w-xs">{tx.description}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.type === 'IN' ? '+' : '-'}{formatVND(tx.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {tx.reference_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-emerald-600 font-medium">
                        <CheckCircle2 size={14} />
                        <span>Thành công</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <CreditCard size={24} />
                      </div>
                      <p className="text-slate-500">Không tìm thấy giao dịch nào trong ngày này.</p>
                    </div>
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
