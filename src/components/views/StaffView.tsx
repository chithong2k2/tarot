import React from 'react';

export const StaffView = ({ users, view, setView, editingUser, setEditingUser, userForm, setUserForm, handleUserSubmit, handleUserDelete, loading }: any) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Staff Management</h2>
      <button onClick={() => setView('staff_form')} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Add Staff</button>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">{u.full_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{u.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => { setEditingUser(u); setUserForm(u); setView('staff_form'); }} className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                  <button onClick={() => handleUserDelete(u.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
