import * as XLSX from 'xlsx';
import { SaleRecord, User, DashboardSummary, OperatingCost, AdHistoryRecord } from '../types';

export interface ExportExcelOptions {
  periodTitle?: string;
  adHistory?: AdHistoryRecord[];
  operatingCosts?: OperatingCost[];
  startDateStr?: string;
  endDateStr?: string;
}

export const exportToExcel = (
  sales: SaleRecord[], 
  users: User[], 
  summary: DashboardSummary,
  options?: ExportExcelOptions
) => {
  const userMap = new Map<string, User>();
  users.forEach(u => userMap.set(u.id, u));

  const periodTitle = options?.periodTitle || 'Tuần Này';
  const adHistory = options?.adHistory || [];
  const operatingCosts = options?.operatingCosts || [];

  // Helper format currency
  const formatNumber = (num: number) => Math.round(num);

  // ==========================================
  // SHEET 1: TỔNG QUAN TÀI CHÍNH (SUMMARY & KPIS)
  // ==========================================
  const netMargin = summary.totalRevenue > 0 
    ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) + '%' 
    : '0%';
  const roas = summary.totalAdSpend > 0 
    ? (summary.totalRevenue / summary.totalAdSpend).toFixed(2) + 'x' 
    : 'N/A';
  const cpa = summary.totalAdSpend > 0 && sales.length > 0 
    ? formatNumber(summary.totalAdSpend / sales.length) 
    : 0;
  const aov = sales.length > 0 
    ? formatNumber(summary.totalRevenue / sales.length) 
    : 0;

  const summaryRows: any[][] = [
    ['BÁO CÁO DOANH THU & TÀI CHÍNH - TAROT SHOP'],
    ['Kỳ Báo Cáo:', periodTitle],
    ['Thời Gian Xuất:', new Date().toLocaleString('vi-VN')],
    [],
    ['I. CÁC CHỈ SỐ TÀI CHÍNH TRỌNG YẾU (KEY FINANCIAL METRICS)'],
    ['STT', 'Chỉ Số', 'Giá Trị', 'Đơn Vị', 'Ghi Chú'],
    [1, 'Tổng Doanh Thu (gồm cả Tip)', formatNumber(summary.totalRevenue), 'VNĐ', 'Tổng thu từ tất cả gói dịch vụ và tiền tip'],
    [2, 'Chi Phí Chạy Quảng Cáo Meta Ads', formatNumber(summary.totalAdSpend), 'VNĐ', 'Đồng bộ từ Meta Graph API'],
    [3, 'Tổng Hoa Hồng Trả Reader', formatNumber(summary.totalReaderCommission), 'VNĐ', 'Chi trả cho Reader theo % cấu hình'],
    [4, 'Tổng Hoa Hồng Trả Sale', formatNumber(summary.totalSaleCommission), 'VNĐ', 'Chi trả cho Sale theo % cấu hình'],
    [5, 'Tổng Tiền Tip Của Khách', formatNumber(summary.totalTip), 'VNĐ', 'Chuyển 100% cho Reader phụ trách'],
    [6, 'Tổng Chi Phí Vận Hành Khác', formatNumber(summary.totalOperatingCosts), 'VNĐ', 'Tiền thuê mặt bằng, điện nước, chi phí phụ'],
    [7, 'Tổng Chi Phí Hoạt Động Cả Shop', formatNumber(summary.totalExpenses), 'VNĐ', 'Ads + Lương hoa hồng + Tip + Vận hành'],
    [8, 'LỢI NHUẬN RÒNG THỰC TẾ (NET PROFIT)', formatNumber(summary.netProfit), 'VNĐ', 'Doanh thu - Tất cả chi phí'],
    [9, 'Tỷ Suất Lợi Nhuận Ròng (Net Margin)', netMargin, '%', 'Lợi nhuận ròng / Tổng doanh thu'],
    [10, 'Hiệu Quả Doanh Thu Trên Ads (ROAS)', roas, 'Lần', 'Doanh thu / Chi phí Ads'],
    [11, 'Chi Phí Trên 1 Đơn Hàng (CPA)', cpa, 'VNĐ/đơn', 'Chi phí Ads / Số lượng đơn hàng'],
    [12, 'Tổng Số Lượng Đơn Hàng Hoàn Thành', sales.length, 'Đơn', 'Số đơn chốt và hoàn thành trong kỳ'],
    [13, 'Giá Trị Đơn Trung Bình (AOV)', aov, 'VNĐ/đơn', 'Doanh thu / Số đơn'],
    [],
    ['II. BẢNG THEO DÕI DOANH THU & CHI PHÍ THEO THỨ (7 NGÀY TRONG TUẦN)'],
    ['Thứ', 'Doanh Thu (VNĐ)', 'Chi Phí Ads (VNĐ)', 'Lương Hoa Hồng (VNĐ)', 'Lợi Nhuận Ngày (VNĐ)']
  ];

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  let sumRev = 0;
  let sumAds = 0;
  let sumComm = 0;
  let sumProfit = 0;

  days.forEach(d => {
    const stat = summary.dailyStats?.find(s => s.name === d);
    const rev = stat?.revenue || 0;
    const ads = stat?.adSpend || 0;
    const comm = stat?.commission || 0;
    const dayProfit = stat?.profit !== undefined ? stat.profit : (rev - ads - comm);

    sumRev += rev;
    sumAds += ads;
    sumComm += comm;
    sumProfit += dayProfit;

    summaryRows.push([
      d,
      formatNumber(rev),
      formatNumber(ads),
      formatNumber(comm),
      formatNumber(dayProfit)
    ]);
  });

  summaryRows.push([
    'TỔNG CỘNG TUẦN',
    formatNumber(sumRev),
    formatNumber(sumAds),
    formatNumber(sumComm),
    formatNumber(sumProfit)
  ]);

  // ==========================================
  // SHEET 2: CHI TIẾT GIAO DỊCH (TRANSACTIONS)
  // ==========================================
  const transRows: any[][] = [
    ['CHI TIẾT TOÀN BỘ ĐƠN HÀNG TRONG KỲ'],
    ['Kỳ:', periodTitle, '', '', 'Tổng số đơn:', `${sales.length} đơn`],
    [],
    [
      'STT', 
      'Mã Đơn', 
      'Ngày', 
      'Giờ', 
      'Tên Khách Hàng', 
      'Gói Dịch Vụ', 
      'Doanh Thu Gói (VNĐ)', 
      'Tiền Tip (VNĐ)', 
      'Tổng Thu (VNĐ)', 
      'Reader Phụ Trách', 
      '% HH Reader', 
      'Tiền HH Reader (VNĐ)', 
      'Sale Chốt Đơn', 
      '% HH Sale', 
      'Tiền HH Sale (VNĐ)', 
      'Shop Thực Nhận (VNĐ)'
    ]
  ];

  let totalPkgAmount = 0;
  let totalOrderTip = 0;
  let totalOrderRev = 0;
  let totalReaderPayout = 0;
  let totalSalePayout = 0;
  let totalShopNet = 0;

  // Sort sales chronologically or by created_at
  const sortedSales = [...sales].sort((a, b) => {
    const dateA = a.created_at || a.date || '';
    const dateB = b.created_at || b.date || '';
    return dateA.localeCompare(dateB);
  });

  sortedSales.forEach((s, idx) => {
    const amount = Number(s.amount) || 0;
    const tip = Number(s.tip) || 0;
    const total = amount + tip;

    const rId = String(s.reader_id || (s as any).reader_name || '').trim();
    const reader = userMap.get(rId) || users.find(u => u.id === rId || u.full_name.toLowerCase() === rId.toLowerCase());
    const rName = reader?.full_name || rId || 'N/A';
    const rPercent = reader ? Number(reader.commission_percent || 0) : 0;
    const rComm = Math.round(amount * (rPercent / 100));

    const sId = String(s.sale_id || (s as any).sale_name || '').trim();
    const sale = userMap.get(sId) || users.find(u => u.id === sId || u.full_name.toLowerCase() === sId.toLowerCase());
    const sName = sale?.full_name || (sId && sId !== 'none' ? sId : '—');
    const sPercent = sale ? Number(sale.commission_percent || 0) : 0;
    const sComm = Math.round(amount * (sPercent / 100));

    // Shop net after paying staff commission and tip
    const shopNet = total - rComm - tip - sComm;

    totalPkgAmount += amount;
    totalOrderTip += tip;
    totalOrderRev += total;
    totalReaderPayout += rComm;
    totalSalePayout += sComm;
    totalShopNet += shopNet;

    let timeStr = '—';
    if (s.created_at) {
      try {
        const d = new Date(s.created_at);
        if (!isNaN(d.getTime())) {
          timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    }

    transRows.push([
      idx + 1,
      s.id || `DON-${idx + 1}`,
      s.date || '—',
      timeStr,
      s.customer_name || 'Khách vãng lai',
      s.package_name || 'Gói Tarot',
      amount,
      tip,
      total,
      rName,
      `${rPercent}%`,
      rComm,
      sName,
      `${sPercent}%`,
      sComm,
      shopNet
    ]);
  });

  // Footer summary row for transactions
  transRows.push([
    'TỔNG CỘNG',
    '',
    '',
    '',
    `${sales.length} đơn`,
    '',
    totalPkgAmount,
    totalOrderTip,
    totalOrderRev,
    '',
    '',
    totalReaderPayout,
    '',
    '',
    totalSalePayout,
    totalShopNet
  ]);

  // ==========================================
  // SHEET 3: BẢNG LƯƠNG NHÂN VIÊN (PAYROLL)
  // ==========================================
  const staffPayrollRows: any[][] = [
    ['BẢNG LƯƠNG & HIỆU SUẤT NHÂN VIÊN'],
    ['Kỳ:', periodTitle],
    [],
    [
      'STT', 
      'Họ và Tên', 
      'Tài Khoản', 
      'Vai Trò', 
      'Số Đơn Phụ Trách', 
      'Doanh Thu Mang Về (VNĐ)', 
      '% Hoa Hồng', 
      'Tiền Hoa Hồng (VNĐ)', 
      'Tiền Tip (VNĐ)', 
      'TỔNG LƯƠNG THỰC NHẬN (VNĐ)', 
      'Ngân Hàng', 
      'Số Tài Khoản Nhận Lương'
    ]
  ];

  let totalStaffSalesCount = 0;
  let totalStaffRevenue = 0;
  let totalStaffComm = 0;
  let totalStaffTip = 0;
  let totalStaffNetPayout = 0;

  const activeStaffUsers = users.filter(u => u.status !== 'inactive' && u.role !== 'manager');

  activeStaffUsers.forEach((u, idx) => {
    const uId = u.id.trim().toLowerCase();
    const uName = u.full_name.trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase();

    const userSales = sales.filter(s => {
      const rId = String(s.reader_id || (s as any).reader_name || '').trim().toLowerCase();
      const sId = String(s.sale_id || (s as any).sale_name || '').trim().toLowerCase();

      if (u.role === 'reader') {
        return rId === uId || rId === uName || rId === uUsername;
      } else if (u.role === 'sale') {
        return sId === uId || sId === uName || sId === uUsername;
      }
      return false;
    });

    const staffOrdersCount = userSales.length;
    const staffAmount = userSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const staffTip = u.role === 'reader' 
      ? userSales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0)
      : 0;
    const staffComm = Math.round(staffAmount * (Number(u.commission_percent || 0) / 100));
    const staffTotalPayout = staffComm + staffTip;

    totalStaffSalesCount += staffOrdersCount;
    totalStaffRevenue += staffAmount + staffTip;
    totalStaffComm += staffComm;
    totalStaffTip += staffTip;
    totalStaffNetPayout += staffTotalPayout;

    staffPayrollRows.push([
      idx + 1,
      u.full_name,
      `@${u.username}`,
      u.role === 'reader' ? 'Reader' : 'Sale',
      staffOrdersCount,
      staffAmount + staffTip,
      `${u.commission_percent || 0}%`,
      staffComm,
      staffTip,
      staffTotalPayout,
      u.bank_name || 'MBBank',
      u.bank_account || 'Chưa cập nhật'
    ]);
  });

  staffPayrollRows.push([
    'TỔNG CỘNG CHI TRẢ LƯƠNG',
    '',
    '',
    '',
    totalStaffSalesCount,
    totalStaffRevenue,
    '',
    totalStaffComm,
    totalStaffTip,
    totalStaffNetPayout,
    '',
    ''
  ]);

  // ==========================================
  // SHEET 4: BÁO CÁO META ADS (AD SPEND DETAIL)
  // ==========================================
  const adsRows: any[][] = [
    ['BÁO CÁO THEO DÕI CHI PHÍ QUẢNG CÁO META ADS'],
    ['Kỳ:', periodTitle],
    [],
    ['STT', 'Ngày', 'Chi Phí Ads (VNĐ)', 'Doanh Thu Của Ngày (VNĐ)', 'Tỷ Lệ Chi Phí Ads / Doanh Thu (%)']
  ];

  let totalAdsSheetSpend = 0;
  let totalAdsSheetRev = 0;

  // Collect unique dates from adHistory and sales
  const allDates = Array.from(new Set([
    ...adHistory.map(h => h.date),
    ...sales.map(s => s.date)
  ])).filter(Boolean).sort();

  allDates.forEach((dStr, idx) => {
    const adRecord = adHistory.find(h => h.date === dStr);
    const daySpend = Number(adRecord?.spend) || 0;
    const daySales = sales.filter(s => s.date === dStr);
    const dayRev = daySales.reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0), 0);
    const ratioStr = dayRev > 0 ? ((daySpend / dayRev) * 100).toFixed(1) + '%' : '—';

    totalAdsSheetSpend += daySpend;
    totalAdsSheetRev += dayRev;

    adsRows.push([
      idx + 1,
      dStr,
      daySpend,
      dayRev,
      ratioStr
    ]);
  });

  const totalAdsRatio = totalAdsSheetRev > 0 
    ? ((totalAdsSheetSpend / totalAdsSheetRev) * 100).toFixed(1) + '%' 
    : '—';

  adsRows.push([
    'TỔNG CỘNG',
    `${allDates.length} ngày`,
    totalAdsSheetSpend,
    totalAdsSheetRev,
    totalAdsRatio
  ]);

  // ==========================================
  // CREATE WORKBOOK & ATTACH SHEETS
  // ==========================================
  const wb = XLSX.utils.book_new();

  // 1. Sheet Tổng Quan
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 8 },  // STT
    { wch: 38 }, // Chỉ số / Thứ
    { wch: 22 }, // Giá trị / Doanh thu
    { wch: 22 }, // Đơn vị / Chi phí Ads
    { wch: 35 }  // Ghi chú / Lợi nhuận
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan Tài Chính');

  // 2. Sheet Chi Tiết Đơn Hàng
  const wsTrans = XLSX.utils.aoa_to_sheet(transRows);
  wsTrans['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã Đơn
    { wch: 13 }, // Ngày
    { wch: 8 },  // Giờ
    { wch: 20 }, // Tên Khách Hàng
    { wch: 16 }, // Gói Dịch Vụ
    { wch: 20 }, // Doanh Thu Gói
    { wch: 14 }, // Tiền Tip
    { wch: 18 }, // Tổng Thu
    { wch: 18 }, // Reader Phụ Trách
    { wch: 12 }, // % HH Reader
    { wch: 20 }, // Tiền HH Reader
    { wch: 18 }, // Sale Chốt Đơn
    { wch: 12 }, // % HH Sale
    { wch: 20 }, // Tiền HH Sale
    { wch: 20 }  // Shop Thực Nhận
  ];
  XLSX.utils.book_append_sheet(wb, wsTrans, 'Chi Tiết Giao Dịch');

  // 3. Sheet Bảng Lương
  const wsStaff = XLSX.utils.aoa_to_sheet(staffPayrollRows);
  wsStaff['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Họ và Tên
    { wch: 14 }, // Username
    { wch: 10 }, // Vai Trò
    { wch: 18 }, // Số Đơn Phụ Trách
    { wch: 24 }, // Doanh Thu Mang Về
    { wch: 13 }, // % Hoa Hồng
    { wch: 20 }, // Tiền Hoa Hồng
    { wch: 14 }, // Tiền Tip
    { wch: 26 }, // Tổng Lương Thực Nhận
    { wch: 18 }, // Ngân Hàng
    { wch: 24 }  // Số Tài Khoản
  ];
  XLSX.utils.book_append_sheet(wb, wsStaff, 'Bảng Lương Nhân Viên');

  // 4. Sheet Báo Cáo Meta Ads
  const wsAds = XLSX.utils.aoa_to_sheet(adsRows);
  wsAds['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Ngày
    { wch: 22 }, // Chi Phí Ads
    { wch: 24 }, // Doanh Thu Ngày
    { wch: 30 }  // Tỷ Lệ Ads/Doanh Thu
  ];
  XLSX.utils.book_append_sheet(wb, wsAds, 'Chi Phí Meta Ads');

  // Generate clean safe file name
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const fileName = `Bao_Cao_Tarot_${cleanTitle}.xlsx`;

  // Write and trigger browser download
  XLSX.writeFile(wb, fileName);
};
