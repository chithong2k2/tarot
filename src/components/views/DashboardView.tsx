import React from 'react';

export const DashboardView = ({ user, summary, fetchData, sales, users, selectedReader, setSelectedReader, selectedDay, setSelectedDay, setEditingSale }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-slate-500">Total Revenue</h3>
          <p className="text-2xl font-bold">{summary.totalRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-slate-500">Total Sales</h3>
          <p className="text-2xl font-bold">{summary.totalSales}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-slate-500">Total Costs</h3>
          <p className="text-2xl font-bold">{summary.totalCosts}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-slate-500">Net Profit</h3>
          <p className="text-2xl font-bold">{summary.netProfit}</p>
        </div>
      </div>
    </div>
  );
};
