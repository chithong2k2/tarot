import React from 'react';

export const SaleEntryView = ({ editingSale, setEditingSale, saleForm, setSaleForm, handleSaleSubmit, users, fetchData, setView, loading }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{editingSale ? 'Edit Sale' : 'New Sale'}</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleSaleSubmit(e); }} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-slate-700">Amount</label>
          <input type="number" value={saleForm.amount || ''} onChange={e => setSaleForm({...saleForm, amount: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Reader</label>
          <select value={saleForm.reader_id || ''} onChange={e => setSaleForm({...saleForm, reader_id: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
            <option value="">Select Reader</option>
            {users.filter((u: any) => u.role === 'reader').map((u: any) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sale</label>
          <select value={saleForm.sale_id || ''} onChange={e => setSaleForm({...saleForm, sale_id: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
            <option value="">Select Sale</option>
            {users.filter((u: any) => u.role === 'sale').map((u: any) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
          <button type="button" onClick={() => setView('dashboard')} className="bg-slate-200 text-slate-700 px-4 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
};
