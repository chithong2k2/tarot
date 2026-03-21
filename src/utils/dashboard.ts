import { SaleRecord, User, DashboardSummary, OperatingCost } from '../types';

export const calculateDashboardSummary = (sales: SaleRecord[], users: User[], operatingCosts: OperatingCost[] = []): DashboardSummary => {
  let totalAmount = 0;
  let totalTip = 0;
  let totalReaderCommission = 0;
  let totalSaleCommission = 0;
  let totalOperatingCosts = 0;

  operatingCosts.forEach(c => {
    totalOperatingCosts += Number(c.amount) || 0;
  });

  const revenueByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const expensesByDay: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  const commissionByDay: Record<string, number> = {
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
    let date: Date;
    try {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const parts = String(dateStr).split('-');
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    } catch (e) {
      date = new Date();
    }
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
  };

  operatingCosts.forEach(c => {
    const amount = Number(c.amount) || 0;
    totalOperatingCosts += amount;
    const dayName = getDayNameFromDate(c.date);
    if (expensesByDay[dayName] !== undefined) {
      expensesByDay[dayName] += amount;
    }
  });

  sales.forEach(s => {
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
      const commission = ((amount + tip) * (Number(reader.commission_percent) / 100));
      totalReaderCommission += commission;
      readerStats[reader.full_name] = (readerStats[reader.full_name] || 0) + amount + tip;
      if (expensesByDay[dayName] !== undefined) {
        expensesByDay[dayName] += commission;
      }
      if (commissionByDay[dayName] !== undefined) {
        commissionByDay[dayName] += commission;
      }
      if (readerCommissionByDay[dayName] !== undefined) {
        readerCommissionByDay[dayName] += commission;
      }
    } else if (rId && rId !== 'N/A') {
      readerStats[rId] = (readerStats[rId] || 0) + amount;
    }

    const sId = String(s.sale_id || (s as any).sale_name || '').trim();
    if (sId && sId !== 'none' && sId !== 'N/A') {
      const sale = userMap.get(sId) || users.find(u => u.id === sId || u.full_name.toLowerCase() === sId.toLowerCase());
      if (sale) {
        const commission = ((amount + tip) * (Number(sale.commission_percent) / 100));
        totalSaleCommission += commission;
        saleStats[sale.full_name] = (saleStats[sale.full_name] || 0) + amount + tip;
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
  const totalExpenses = totalReaderCommission + totalSaleCommission + totalOperatingCosts;
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalAmount,
    totalTip,
    totalReaderCommission,
    totalSaleCommission,
    totalExpenses,
    totalOperatingCosts,
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
    topSale: { name: topSaleEntry ? topSaleEntry[0] : 'Chưa có', amount: topSaleEntry ? topSaleEntry[1] : 0 }
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
  netProfit: 0,
  revenueByDay: [],
  profitByDay: [],
  commissionByDay: [],
  readerCommissionByDay: [],
  saleCommissionByDay: [],
  topReader: { name: 'N/A', amount: 0 },
  topSale: { name: 'N/A', amount: 0 }
};
