import React from 'react';

export const SalesHistoryView = ({ user, sales, users, fetchData, setEditingSale, setView }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Sales History</h2>
      <div className="bg-white p-4 rounded shadow">
        <p>Sales History view.</p>
      </div>
    </div>
  );
};
