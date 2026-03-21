import { User, SaleRecord, DashboardSummary, Shift, ShiftRegistration } from '../types';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzE6ESQ7feEaw8RSwZAW0QJ6ODqviqec9qAppQhqT1rEKjezIlP5H4D__cQ7vQwRoA1AQ/exec'

async function callApi(action: string, payload: any = {}) {
  if (!GAS_API_URL) {
    return { success: false, message: 'API URL chưa được cấu hình', notConfigured: true };
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Phản hồi từ API không đúng định dạng JSON');
    }
  } catch (error) {
    console.error('API Error:', error);
    const isFailedToFetch = String(error).includes('Failed to fetch');
    
    return { 
      success: false, 
      message: isFailedToFetch 
        ? 'Không thể kết nối đến Google Apps Script. Vui lòng kiểm tra:\n1. Bạn đã Deploy Script là "Web App".\n2. Quyền truy cập (Who has access) là "Anyone".\n3. URL Script trong biến VITE_GAS_API_URL đã chính xác.'
        : `Lỗi API: ${String(error)}`,
      error: String(error),
      isConfigError: isFailedToFetch
    };
  }
}

export const apiService = {
  getInitialData: () => 
    callApi('getInitialData'),

  login: (username: string, password: string) => 
    callApi('login', { username, password }),
    
  getUsers: () => 
    callApi('getUsers'),
    
  addUser: (user: Partial<User>) => 
    callApi('addUser', { user }),
    
  updateUser: (user: User) => 
    callApi('updateUser', { user }),
    
  deleteUser: (id: string) => 
    callApi('deleteUser', { id }),
    
  addSaleRecord: (record: Partial<SaleRecord>) => 
    callApi('addSaleRecord', { record }),
    
  getSales: (role: string, name: string) => 
    callApi('getSales', { role, name }),
    
  getDashboardSummary: () => 
    callApi('getDashboardSummary'),
    
  resetWeek: () => 
    callApi('resetWeek'),

  updateSaleRecord: (record: SaleRecord) =>
    callApi('updateSaleRecord', { record }),

  deleteSaleRecord: (id: string) =>
    callApi('deleteSaleRecord', { id }),

  // Shift Management APIs
  getShifts: () => 
    callApi('getShifts'),
    
  createShift: (shift: Partial<Shift>) => 
    callApi('createShift', { shift }),
    
  updateShift: (shift: Shift) => 
    callApi('updateShift', { shift }),
    
  deleteShift: (id: string) => 
    callApi('deleteShift', { id }),
    
  getReaderShiftSchedule: () => 
    callApi('getReaderShiftSchedule'),
    
  getSaleShiftSchedule: () => 
    callApi('getSaleShiftSchedule'),
    
  registerReaderShift: (registration: Partial<ShiftRegistration>) => 
    callApi('registerReaderShift', { registration }),
    
  deleteReaderShift: (id: string) => 
    callApi('deleteReaderShift', { id }),
    
  registerSaleShift: (registration: Partial<ShiftRegistration>) => 
    callApi('registerSaleShift', { registration }),

  deleteSaleShift: (id: string) => 
    callApi('deleteSaleShift', { id }),
    
  syncAllData: (payload: any) =>
    callApi('syncAllData', { payload }),
    
  testConnection: async () => {
    if (!GAS_API_URL) return { success: false, message: 'URL chưa cấu hình' };
    try {
      const response = await fetch(GAS_API_URL, { method: 'GET', mode: 'cors' });
      if (response.ok) return { success: true, message: 'Kết nối thành công (GET)' };
      return { success: false, message: `Lỗi HTTP: ${response.status}` };
    } catch (error) {
      return { success: false, message: 'Không thể kết nối (Failed to fetch)', error: String(error) };
    }
  },
};
