import { User, SaleRecord, DashboardSummary, Shift, ShiftRegistration } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

  testMetaAds: async (token?: string, accountId?: string) => {
    // 1. Try backend server if running
    try {
      const response = await fetch('/api/test-fb-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, adAccountId: accountId })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Backend not reached, fall back to direct browser call
    }
    // 2. Direct browser fallback
    return await directTestMetaAds(token, accountId);
  },

  syncMetaAds: async () => {
    // 1. Try backend server if running
    try {
      const response = await fetch('/api/sync-fb-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Backend not reached, fall back to direct browser call
    }
    // 2. Direct browser fallback
    return await directSyncMetaAds();
  },

  analyzePriceMenu: async (imageBase64: string, mimeType?: string, geminiApiKey?: string) => {
    try {
      const response = await fetch('/api/analyze-price-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType, geminiApiKey })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { 
        success: false, 
        message: 'Lỗi gọi API phân tích ảnh: ' + (error instanceof Error ? error.message : String(error)) 
      };
    }
  }
};

async function getClientMetaCredentials(token?: string, accountId?: string) {
  let accessToken = token?.trim() || '';
  let adAccountId = accountId?.trim() || '';

  if (!accessToken || !adAccountId) {
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          if (!accessToken && data.fb_access_token) accessToken = data.fb_access_token.trim();
          if (!adAccountId && data.fb_ad_account_id) adAccountId = data.fb_ad_account_id.trim();
        }
      } catch (err) {
        console.warn("[Meta Ads] Error reading settings from Firestore:", err);
      }
    }
  }

  if (!accessToken && (import.meta as any).env?.VITE_FB_ACCESS_TOKEN) {
    accessToken = (import.meta as any).env.VITE_FB_ACCESS_TOKEN;
  }
  if (!adAccountId && (import.meta as any).env?.VITE_FB_AD_ACCOUNT_ID) {
    adAccountId = (import.meta as any).env.VITE_FB_AD_ACCOUNT_ID;
  }

  return { accessToken, adAccountId };
}

async function directSyncMetaAds(customToken?: string, customAccountId?: string) {
  const { accessToken, adAccountId } = await getClientMetaCredentials(customToken, customAccountId);

  if (!accessToken || !adAccountId) {
    return {
      success: false,
      message: 'Chưa cấu hình Facebook Access Token và Ad Account ID. Vui lòng vào Cài Đặt -> Cấu Hình Hệ Thống để lưu.'
    };
  }

  try {
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const fbUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights?fields=spend&date_preset=this_week_mon_today&time_increment=1&access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(fbUrl);
    const data = await res.json();

    if (!res.ok || data.error) {
      const fbMsg = data.error?.message || `Lỗi Facebook Graph API (${res.status})`;
      return { success: false, message: `Lỗi Meta: ${fbMsg}` };
    }

    const insights = data.data || [];
    const updatedDays: any[] = [];

    if (db) {
      for (const item of insights) {
        const dateStr = item.date_start;
        const spend = parseFloat(item.spend) || 0;

        await setDoc(doc(db, 'ad_history', dateStr), {
          date: dateStr,
          spend: spend,
          updated_at: new Date().toISOString()
        }, { merge: true });

        updatedDays.push({ date: dateStr, spend });
      }
    }

    return {
      success: true,
      message: `Đã đồng bộ chi phí Ads cho ${updatedDays.length} ngày thành công!`,
      days: updatedDays
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi đồng bộ trực tiếp: ' + (err?.message || String(err))
    };
  }
}

async function directTestMetaAds(token?: string, accountId?: string) {
  const { accessToken, adAccountId } = await getClientMetaCredentials(token, accountId);

  if (!accessToken || !adAccountId) {
    return {
      success: false,
      message: 'Vui lòng nhập đầy đủ Token và ID tài khoản quảng cáo.'
    };
  }

  try {
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const fbUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights?fields=spend&date_preset=today&access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(fbUrl);
    const data = await res.json();

    if (!res.ok || data.error) {
      const fbMsg = data.error?.message || `Lỗi Facebook Graph API (${res.status})`;
      return { success: false, message: `Lỗi Meta: ${fbMsg}` };
    }

    const insights = data.data;
    const spend = insights && insights.length > 0 ? parseFloat(insights[0].spend) : 0;
    return {
      success: true,
      message: `Kết nối thành công! Chi phí Ads hôm nay: ${new Intl.NumberFormat('vi-VN').format(spend)}đ`,
      spend
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kiểm tra trực tiếp: ' + (err?.message || String(err))
    };
  }
}
