export type UserRole = 'manager' | 'reader' | 'sale';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  bank_account?: string;
  commission_percent: number;
  status?: 'active' | 'inactive';
  created_at?: string;
}

export interface SaleRecord {
  id: string;
  reader_id: string;
  sale_id: string;
  customer_name: string;
  package_name: string;
  amount: number;
  tip: number;
  date: string;
  created_at?: string;
}

export interface OperatingCost {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at?: string;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalAmount: number;
  totalTip: number;
  totalReaderCommission: number;
  totalSaleCommission: number;
  totalExpenses: number;
  totalOperatingCosts: number;
  netProfit: number;
  revenueByDay: { name: string; value: number }[];
  profitByDay: { name: string; value: number }[];
  topReader: { name: string; amount: number };
  topSale: { name: string; amount: number };
}

export interface WeeklyRevenueItem {
  reader_name: string;
  total_amount: number;
  total_tip: number;
  total_revenue: number;
  commission: number;
}

export interface Shift {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
}

export interface ShiftRegistration {
  id: string;
  user_id: string;
  shift_id: string;
  day_of_week: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật';
}

export interface SystemSettings {
  id: string;
  is_locked: boolean;
}
