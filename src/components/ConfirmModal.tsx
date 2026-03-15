import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  type = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  type === 'danger' ? 'bg-red-50 text-red-600' : 
                  type === 'warning' ? 'bg-amber-50 text-amber-600' : 
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 leading-relaxed">{message}</p>
            </div>

            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                  type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 
                  type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 
                  'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
