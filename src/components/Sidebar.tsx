import React from 'react';

export const Sidebar = ({ user, view, setView, isSidebarOpen, setIsSidebarOpen, handleLogout, setEditingSale }: any) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Menu</h1>
      </div>
      <nav className="p-4 space-y-2">
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('dashboard')}>Dashboard</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('staff')}>Staff</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('entry')}>Sale Entry</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('shifts')}>Shifts</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('costs')}>Costs</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('settings')}>Settings</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded" onClick={() => setView('sales_history')}>Sales History</button>
        <button className="w-full text-left p-2 hover:bg-slate-100 rounded text-red-500" onClick={handleLogout}>Logout</button>
      </nav>
    </div>
  );
};
