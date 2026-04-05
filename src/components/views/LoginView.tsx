import React from 'react';

export const LoginView = ({ loginForm, setLoginForm, handleLogin, handleSeed, checkApi, loading }: any) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(e); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" value={loginForm.username || ''} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={loginForm.password || ''} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white px-4 py-2 rounded">Login</button>
        </form>
      </div>
    </div>
  );
};
