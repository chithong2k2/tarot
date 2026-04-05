export interface Revenue {
  id: string;
  amount: number;
  description: string;
  timestamp: any;
  telegramUserId: string;
  rawMessage: string;
}

export interface User {
  id: string;
  username?: string;
  password?: string;
  full_name: string;
  role: 'manager' | 'reader' | 'sale';
  active?: boolean;
}

export interface SaleRecord {
  id: string;
  reader_id: string;
  sale_id: string;
  reader_name?: string;
  sale_name?: string;
  amount: number;
  date: string;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalSales: number;
  totalCosts: number;
  netProfit: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface ShiftRegistration {
  id: string;
  userId: string;
  shiftId: string;
  date: string;
}

export interface OperatingCost {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface SystemSettings {
  id: string;
  is_locked: boolean;
}
