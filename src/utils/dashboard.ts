import { SaleRecord, User, DashboardSummary, OperatingCost, AdHistoryRecord } from '../types';
import { getVNMonday } from './dateUtils';

export const calculateDashboardSummary = (
  sales: SaleRecord[], 
  users: User[], 
  operatingCosts: OperatingCost[] = [],
  adHistory: AdHistoryRecord[] = []
): DashboardSummary => {
  let totalAmount = 0;
  let totalTip = 0;
  let totalReaderCommission = 0;
  let totalSaleCommission = 0;
  let totalOperatingCosts = 0;
  let totalAdSpend = 0;

  const revenueByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const expensesByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const commissionByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const adSpendByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const readerCommissionByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const saleCommissionByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const readerStats: Record<string, number> = {};
  const saleStats: Record<string, number> = {};

  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  const getDayNameFromDate = (dateStr: string) => {
    try {
      // Use Vietnam timezone to ensure the day name is correct
      const date = new Date(`${dateStr}T00:00:00+07:00`);
      if (isNaN(date.getTime())) return 'N/A';
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return days[date.getDay()];
    } catch (e) {
      return 'N/A';
    }
  };

  operatingCosts.forEach(c => {
    const recordDate = new Date(`${c.date}T00:00:00+07:00`);
    if (recordDate < startOfWeek) return;

    const amount = Number(c.amount) || 0;
    totalOperatingCosts += amount;
    const dayName = getDayNameFromDate(c.date);
    if (expensesByDay[dayName] !== undefined) {
      expensesByDay[dayName] += amount;
    }
  });

  const startOfWeek = getVNMonday();
  startOfWeek.setHours(0, 0, 0, 0);

  adHistory.forEach(h => {
    // Use Vietnam timezone for comparison
    const recordDate = new Date(`${h.date}T00:00:00+07:00`);
    if (recordDate < startOfWeek) return;

    const amount = Number(h.spend) || 0;
    totalAdSpend += amount;
    const dayName = getDayNameFromDate(h.date);
    if (expensesByDay[dayName] !== undefined) {
      expensesByDay[dayName] += amount;
    }
    if (adSpendByDay[dayName] !== undefined) {
      adSpendByDay[dayName] += amount;
    }
  });

  sales.forEach(s => {
    const recordDate = new Date(`${s.date}T00:00:00+07:00`);
    if (recordDate < startOfWeek) return;

    const amount = Number(s.amount) || 0;
    const tip = Number(s.tip) || 0;
    totalAmount += amount;
    totalTip += tip;
    
    const dayName = getDayNameFromDate(s.date);
    if (revenueByDay[dayName] !== undefined) {
      revenueByDay[dayName] += amount + tip;
    }
    
    const rId = String(s.reader_id || (s as any).reader_name || '').trim();
    const reader = userMap.get(rId) || users.find(u => u.id === rId || u.full_name.toLowerCase() === rId.toLowerCase());
    if (reader) {
      // Reader commission: % of amount only. Tips go 100% to reader but are tracked separately.
      const commission = (amount * (Number(reader.commission_percent) / 100));
      totalReaderCommission += commission;
      readerStats[reader.full_name] = (readerStats[reader.full_name] || 0) + amount + tip;
      
      // For expenses, we count both commission and the full tip (since it's paid out)
      if (expensesByDay[dayName] !== undefined) {
        expensesByDay[dayName] += commission + tip;
      }
      if (commissionByDay[dayName] !== undefined) {
        commissionByDay[dayName] += commission;
      }
      if (readerCommissionByDay[dayName] !== undefined) {
        readerCommissionByDay[dayName] += commission;
      }
    } else if (rId && rId !== 'N/A') {
      readerStats[rId] = (readerStats[rId] || 0) + amount + tip;
    }

    const sId = String(s.sale_id || (s as any).sale_name || '').trim();
    if (sId && sId !== 'none' && sId !== 'N/A') {
      const sale = userMap.get(sId) || users.find(u => u.id === sId || u.full_name.toLowerCase() === sId.toLowerCase());
      if (sale) {
        // Sale commission: % of amount only
        const commission = (amount * (Number(sale.commission_percent) / 100));
        totalSaleCommission += commission;
        saleStats[sale.full_name] = (saleStats[sale.full_name] || 0) + amount;
        if (expensesByDay[dayName] !== undefined) {
          expensesByDay[dayName] += commission;
        }
        if (commissionByDay[dayName] !== undefined) {
          commissionByDay[dayName] += commission;
        }
        if (saleCommissionByDay[dayName] !== undefined) {
          saleCommissionByDay[dayName] += commission;
        }
      } else {
        saleStats[sId] = (saleStats[sId] || 0) + amount;
      }
    }
  });

  const topReaderEntry = Object.entries(readerStats).sort((a, b) => b[1] - a[1])[0];
  const topSaleEntry = Object.entries(saleStats).sort((a, b) => b[1] - a[1])[0];

  const totalRevenue = totalAmount + totalTip;
  // Total expenses = Reader Commission + Sale Commission + All Tips + Operating Costs + Ad Spend
  const totalExpenses = totalReaderCommission + totalSaleCommission + totalTip + totalOperatingCosts + totalAdSpend;
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalAmount,
    totalTip,
    totalReaderCommission,
    totalSaleCommission,
    totalExpenses,
    totalOperatingCosts,
    totalAdSpend,
    netProfit,
    revenueByDay: Object.entries(revenueByDay).map(([name, value]) => ({ name, value })),
    profitByDay: Object.entries(revenueByDay).map(([name, value]) => ({ 
      name, 
      value: value - (expensesByDay[name] || 0) 
    })),
    commissionByDay: Object.entries(commissionByDay).map(([name, value]) => ({ name, value })),
    readerCommissionByDay: Object.entries(readerCommissionByDay).map(([name, value]) => ({ name, value })),
    saleCommissionByDay: Object.entries(saleCommissionByDay).map(([name, value]) => ({ name, value })),
    topReader: { name: topReaderEntry ? topReaderEntry[0] : 'Chưa có', amount: topReaderEntry ? topReaderEntry[1] : 0 },
    topSale: { name: topSaleEntry ? topSaleEntry[0] : 'Chưa có', amount: topSaleEntry ? topSaleEntry[1] : 0 },
    dailyStats: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(day => ({
      name: day,
      revenue: revenueByDay[day] || 0,
      profit: (revenueByDay[day] || 0) - (expensesByDay[day] || 0),
      adSpend: adSpendByDay[day] || 0,
      commission: commissionByDay[day] || 0
    }))
  };
};

export const INITIAL_SUMMARY: DashboardSummary = {
  totalRevenue: 0,
  totalAmount: 0,
  totalTip: 0,
  totalReaderCommission: 0,
  totalSaleCommission: 0,
  totalExpenses: 0,
  totalOperatingCosts: 0,
  totalAdSpend: 0,
  netProfit: 0,
  revenueByDay: [],
  profitByDay: [],
  commissionByDay: [],
  readerCommissionByDay: [],
  saleCommissionByDay: [],
  topReader: { name: 'N/A', amount: 0 },
  topSale: { name: 'N/A', amount: 0 },
  dailyStats: []
};
