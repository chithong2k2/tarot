import * as XLSX from 'xlsx';
import { SaleRecord, User, DashboardSummary, OperatingCost } from '../types';

export const exportToExcel = (sales: SaleRecord[], users: User[], summary: DashboardSummary) => {
  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  // --- 1. Prepare Sales Sheet (Grouped by Reader) ---
  const salesRows: any[][] = [
    ['Tên Reader', 'Tên Khách Hàng', 'Sale', 'Tên Gói', 'Giá Tiền', 'Tip']
  ];

  // Group sales by reader
  const groupedByReader: Record<string, SaleRecord[]> = {};
  sales.forEach(s => {
    const rId = s.reader_id || (s as any).reader_name || 'N/A';
    const reader = userMap.get(rId) || users.find(u => u.full_name === rId);
    const readerName = reader?.full_name || rId;
    if (!groupedByReader[readerName]) groupedByReader[readerName] = [];
    groupedByReader[readerName].push(s);
  });

  Object.entries(groupedByReader).forEach(([readerName, readerSales]) => {
    let readerTotalRevenue = 0;
    
    readerSales.forEach(s => {
      const sId = s.sale_id || (s as any).sale_name || 'N/A';
      const sale = userMap.get(sId) || users.find(u => u.full_name === sId);
      const saleName = sale?.full_name || sId;
      
      const amount = Number(s.amount) || 0;
      const tip = Number(s.tip) || 0;
      readerTotalRevenue += amount + tip;

      salesRows.push([
        readerName,
        s.customer_name,
        saleName,
        s.package_name,
        amount,
        tip
      ]);
    });

    // Add subtotal row for this reader
    salesRows.push([
      `TỔNG DOANH THU CỦA ${readerName.toUpperCase()}`,
      '',
      '',
      '',
      '',
      readerTotalRevenue
    ]);
    // Add an empty row for spacing
    salesRows.push([]);
  });

  // --- 2. Prepare Summary Sheet (Daily Breakdown) ---
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const dailyStats: Record<string, { revenue: number; salary: number; profit: number }> = {};
  days.forEach(d => dailyStats[d] = { revenue: 0, salary: 0, profit: 0 });

  sales.forEach(s => {
    let date: Date;
    try {
      date = new Date(s.date);
      if (isNaN(date.getTime())) {
        const parts = String(s.date).split('-');
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    } catch (e) {
      date = new Date();
    }
    
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[date.getDay()];
    
    if (dailyStats[dayName]) {
      const amount = Number(s.amount) || 0;
      const tip = Number(s.tip) || 0;
      const revenue = amount + tip;
      
      // Calculate commissions (salary)
      const rId = s.reader_id || (s as any).reader_name;
      const reader = userMap.get(rId) || users.find(u => u.full_name === rId);
      const rComm = reader ? ((amount + tip) * (Number(reader.commission_percent) / 100)) : 0;

      const sId = s.sale_id || (s as any).sale_name;
      let sComm = 0;
      if (sId && sId !== 'none') {
        const sale = userMap.get(sId) || users.find(u => u.full_name === sId);
        sComm = sale ? ((amount + tip) * (Number(sale.commission_percent) / 100)) : 0;
      }

      const salary = rComm + sComm;
      
      dailyStats[dayName].revenue += revenue;
      dailyStats[dayName].salary += salary;
      dailyStats[dayName].profit += (revenue - salary);
    }
  });

  const summaryRows: any[][] = [
    ['Thứ', 'Tổng doanh thu page', 'Tổng tiền lương phải trả', 'Lợi nhuận']
  ];

  let weeklyTotalRevenue = 0;
  let weeklyTotalSalary = 0;
  let weeklyTotalProfit = 0;

  days.forEach(d => {
    const stats = dailyStats[d];
    weeklyTotalRevenue += stats.revenue;
    weeklyTotalSalary += stats.salary;
    weeklyTotalProfit += stats.profit;

    summaryRows.push([
      d,
      stats.revenue,
      stats.salary,
      stats.profit
    ]);
  });

  // Add weekly total row
  summaryRows.push([
    'TỔNG CỘNG TUẦN',
    weeklyTotalRevenue,
    weeklyTotalSalary,
    weeklyTotalProfit
  ]);

  // --- 3. Prepare Staff Summary Sheet ---
  const readerSummary: Record<string, { revenue: number; tip: number; commission: number }> = {};
  const saleSummary: Record<string, { revenue: number; tip: number; commission: number }> = {};

  sales.forEach(s => {
    const amount = Number(s.amount) || 0;
    const tip = Number(s.tip) || 0;
    
    // Reader
    const rId = s.reader_id || (s as any).reader_name;
    const reader = userMap.get(rId) || users.find(u => u.full_name === rId);
    const rName = reader?.full_name || rId || 'N/A';
    if (!readerSummary[rName]) readerSummary[rName] = { revenue: 0, tip: 0, commission: 0 };
    readerSummary[rName].revenue += amount;
    readerSummary[rName].tip += tip;
    if (reader) readerSummary[rName].commission += ((amount + tip) * (Number(reader.commission_percent) / 100));

    // Sale
    const sId = s.sale_id || (s as any).sale_name;
    if (sId && sId !== 'none') {
      const sale = userMap.get(sId) || users.find(u => u.full_name === sId);
      const sName = sale?.full_name || sId;
      if (!saleSummary[sName]) saleSummary[sName] = { revenue: 0, tip: 0, commission: 0 };
      saleSummary[sName].revenue += amount;
      saleSummary[sName].tip += tip;
      if (sale) saleSummary[sName].commission += ((amount + tip) * (Number(sale.commission_percent) / 100));
    }
  });

  const staffRows: any[][] = [
    ['TỔNG KẾT READER'],
    ['Tên Reader', 'Doanh thu gói', 'Tip', 'Tổng doanh thu', 'Hoa hồng'],
  ];
  Object.entries(readerSummary).forEach(([name, stats]) => {
    staffRows.push([name, stats.revenue, stats.tip, stats.revenue + stats.tip, stats.commission]);
  });
  staffRows.push([]);
  staffRows.push(['TỔNG KẾT SALE']);
  staffRows.push(['Tên Sale', 'Doanh thu gói', 'Tip', 'Tổng doanh thu', 'Hoa hồng']);
  Object.entries(saleSummary).forEach(([name, stats]) => {
    staffRows.push([name, stats.revenue, stats.tip, stats.revenue + stats.tip, stats.commission]);
  });

  // --- 4. Create Workbook and Sheets ---
  const wb = XLSX.utils.book_new();
  
  const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Chi tiết doanh thu');

  const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);
  XLSX.utils.book_append_sheet(wb, wsStaff, 'Tổng kết nhân viên');

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng kết tuần');

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Bao_Cao_Tarot_${dateStr}.xlsx`;

  // Save File
  XLSX.writeFile(wb, fileName);
};
