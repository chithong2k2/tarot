import React from 'react';

export const CostsView = ({ user, costs, fetchData, loading }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Costs</h2>
      <div className="bg-white p-4 rounded shadow">
        <p>Costs management view.</p>
      </div>
    </div>
  );
};
