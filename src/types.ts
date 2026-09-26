export type UserRole = 'manager' | 'reader' | 'sale';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  specialty?: string;
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
  totalAdSpend: number;
  netProfit: number;
  revenueByDay: { name: string; value: number }[];
  profitByDay: { name: string; value: number }[];
  commissionByDay: { name: string; value: number }[];
  readerCommissionByDay: { name: string; value: number }[];
  saleCommissionByDay: { name: string; value: number }[];
  topReader: { name: string; amount: number };
  topSale: { name: string; amount: number };
  dailyStats: {
    name: string;
    revenue: number;
    profit: number;
    adSpend: number;
    commission: number;
  }[];
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
  gas_api_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  fb_access_token?: string;
  fb_ad_account_id?: string;
  operating_cost_rate?: number;
}

export interface AdProfitData {
  revenue: number;
  adSpend: number;
  operatingCosts: number;
  netProfit: number;
  date: string;
}

export interface AdHistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  spend: number;
  revenue: number;
  operating_costs: number;
  commission: number;
  net_profit: number;
  updated_at: string;
}

export interface PayrollStaffItem {
  user_id: string;
  user_name: string;
  role: UserRole;
  bank_name?: string;
  bank_account?: string;
  commission_percent: number;
  total_amount: number;
  total_tip: number;
  commission: number;
  net_payout: number; // commission + (role === 'reader' ? tip : 0)
  is_paid: boolean;
  paid_at?: string;
  payment_note?: string;
}

export interface PayrollPeriod {
  id: string; // e.g. "2026-W39" or timestamp
  title: string; // e.g. "Tuần 39 (21/09/2026 - 27/09/2026)"
  start_date: string;
  end_date: string;
  total_revenue: number; // Tổng tiền khách chuyển cho shop
  total_payout: number;  // Tổng tiền lương trả nhân viên (Hoa hồng + Tip)
  total_ad_spend: number; // Tổng tiền chạy Ads tuần
  owner_net_profit: number; // Lợi nhuận bạn thực nhận = total_revenue - total_payout - total_ad_spend
  items: PayrollStaffItem[];
  created_at: string;
}
