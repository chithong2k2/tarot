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
  const readerStats: Record<string, number> = {};
  const saleStats: Record<string, number> = {};

  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  sales.forEach(s => {
    totalAmount += Number(s.amount) || 0;
    totalTip += Number(s.tip) || 0;
    
    // Xử lý ngày tháng an toàn
    let date: Date;
    try {
      date = new Date(s.date);
      if (isNaN(date.getTime())) {
        // Nếu parse lỗi, thử split nếu là định dạng YYYY-MM-DD
        const parts = String(s.date).split('-');
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    } catch (e) {
      date = new Date();
    }

    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[date.getDay()];
    if (revenueByDay[dayName] !== undefined) {
      revenueByDay[dayName] += (Number(s.amount) || 0) + (Number(s.tip) || 0);
    }
    
    const rId = s.reader_id || (s as any).reader_name;
    const reader = userMap.get(rId) || users.find(u => u.full_name === rId);
    if (reader) {
      totalReaderCommission += (Number(s.amount) * (Number(reader.commission_percent) / 100));
      readerStats[reader.full_name] = (readerStats[reader.full_name] || 0) + (Number(s.amount) || 0);
    } else if (rId) {
      // Fallback for when user is not found but we have a name/ID
      readerStats[rId] = (readerStats[rId] || 0) + (Number(s.amount) || 0);
    }

    const sId = s.sale_id || (s as any).sale_name;
    if (sId && sId !== 'none') {
      const sale = userMap.get(sId) || users.find(u => u.full_name === sId);
      if (sale) {
        totalSaleCommission += (Number(s.amount) * (Number(sale.commission_percent) / 100));
        saleStats[sale.full_name] = (saleStats[sale.full_name] || 0) + (Number(s.amount) || 0);
      } else {
        saleStats[sId] = (saleStats[sId] || 0) + (Number(s.amount) || 0);
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
  topReader: { name: 'N/A', amount: 0 },
  topSale: { name: 'N/A', amount: 0 }
};
