import React from 'react';

export const SettingsView = ({ user, onUpdateUser, systemSettings, onUpdateSettings, onSyncToSheets }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="bg-white p-4 rounded shadow">
        <p>Settings view.</p>
        <button onClick={onSyncToSheets} className="mt-4 bg-green-500 text-white px-4 py-2 rounded">Sync to Sheets</button>
      </div>
    </div>
  );
};
