import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { SaleRecord, User, AdHistoryRecord, OperatingCost } from '../types';
import { firebaseService } from '../services/firebaseService';

interface ExportPackageOptions {
  mode: 'week' | 'month';
  sales: SaleRecord[];
  users: User[];
  adHistory?: AdHistoryRecord[];
  costs?: OperatingCost[];
  referenceDate?: Date;
}

export async function exportReportPackage({
  mode,
  sales,
  users,
  adHistory = [],
  costs = [],
  referenceDate = new Date()
}: ExportPackageOptions): Promise<{ success: boolean; fileName?: string; message?: string }> {
  try {
    const zip = new JSZip();
    const userMap = new Map<string, User>();
    users.forEach(u => userMap.set(u.id, u));

    // 1. Determine Date Range
    let startDate: Date;
    let endDate: Date;
    let periodLabel = '';
    let zipPrefix = '';

    if (mode === 'week') {
      const now = new Date(referenceDate);
      const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const startStr = `${String(startDate.getDate()).padStart(2, '0')}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const endStr = `${String(endDate.getDate()).padStart(2, '0')}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getFullYear()}`;
      periodLabel = `Tuần (${startStr} đến ${endStr})`;
      zipPrefix = `Tarot_Goi_Bao_Cao_Tuan_${startStr}_den_${endStr}`;
    } else {
      const now = new Date(referenceDate);
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthStr = `${String(startDate.getMonth() + 1).padStart(2, '0')}_${startDate.getFullYear()}`;
      periodLabel = `Tháng ${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`;
      zipPrefix = `Tarot_Goi_Bao_Cao_Thang_${monthStr}`;
    }

    // Helper: Parse date from sale.date or sale.created_at
    const parseItemDate = (itemDateStr?: string): Date | null => {
      if (!itemDateStr) return null;
      try {
        const d = new Date(itemDateStr);
        if (!isNaN(d.getTime())) return d;
        const parts = String(itemDateStr).split('-');
        if (parts.length === 3) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
      } catch {
        return null;
      }
      return null;
    };

    // Filter sales within period
    const filteredSales = sales.filter(s => {
      const d = parseItemDate(s.date) || parseItemDate(s.created_at);
      if (!d) return true;
      return d >= startDate && d <= endDate;
    });

    // Filter ad history within period
    const filteredAdHistory = adHistory.filter(a => {
      const d = parseItemDate(a.date);
      if (!d) return false;
      return d >= startDate && d <= endDate;
    });

    // 2. Calculations
    let totalRevenue = 0;
    let totalTip = 0;
    let totalReaderCommission = 0;
    let totalSaleCommission = 0;

    // Staff breakdown
    const readerMap: Record<string, {
      user: User | null;
      salesCount: number;
      revenue: number;
      tip: number;
      commission: number;
    }> = {};

    const saleMap: Record<string, {
      user: User | null;
      salesCount: number;
      revenue: number;
      tip: number;
      commission: number;
    }> = {};

    filteredSales.forEach(s => {
      const amount = Number(s.amount) || 0;
      const tip = Number(s.tip) || 0;
      totalRevenue += amount;
      totalTip += tip;

      // Reader
      const rId = s.reader_id || (s as any).reader_name || 'N/A';
      const reader = userMap.get(rId) || users.find(u => u.full_name === rId || u.id === rId) || null;
      const rName = reader?.full_name || rId;

      if (!readerMap[rName]) {
        readerMap[rName] = { user: reader, salesCount: 0, revenue: 0, tip: 0, commission: 0 };
      }
      readerMap[rName].salesCount += 1;
      readerMap[rName].revenue += amount;
      readerMap[rName].tip += tip;

      const rCommRate = Number(reader?.commission_percent ?? 50) / 100;
      const rComm = (amount + tip) * rCommRate;
      readerMap[rName].commission += rComm;
      totalReaderCommission += rComm;

      // Sale
      const sId = s.sale_id || (s as any).sale_name || 'none';
      if (sId && sId !== 'none') {
        const sale = userMap.get(sId) || users.find(u => u.full_name === sId || u.id === sId) || null;
        const sName = sale?.full_name || sId;

        if (!saleMap[sName]) {
          saleMap[sName] = { user: sale, salesCount: 0, revenue: 0, tip: 0, commission: 0 };
        }
        saleMap[sName].salesCount += 1;
        saleMap[sName].revenue += amount;
        saleMap[sName].tip += tip;

        const sCommRate = Number(sale?.commission_percent ?? 10) / 100;
        const sComm = (amount + tip) * sCommRate;
        saleMap[sName].commission += sComm;
        totalSaleCommission += sComm;
      }
    });

    const totalStaffSalary = totalReaderCommission + totalSaleCommission;
    const totalAdSpend = filteredAdHistory.reduce((sum, item) => sum + (Number(item.spend) || 0), 0);
    const ownerNetProfit = totalRevenue - totalStaffSalary - totalAdSpend;
    const netMargin = totalRevenue > 0 ? (ownerNetProfit / totalRevenue) * 100 : 0;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : null;

    // Helper format VND
    const formatCurrency = (n: number) => {
      return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
    };

    // ==========================================
    // FILE 1: 01_Bao_Cao_Doanh_Thu.xlsx
    // ==========================================
    const wbSales = XLSX.utils.book_new();

    // Sheet 1: Chi tiết từng đơn
    const salesHeader = ['STT', 'Ngày', 'Khách Hàng', 'Gói Xem Bài', 'Giá Gói', 'Tiền Tip', 'Reader Phụ Trách', 'Sale Chốt Đơn'];
    const salesDataRows: any[][] = [salesHeader];

    filteredSales.forEach((s, idx) => {
      const reader = userMap.get(s.reader_id) || users.find(u => u.full_name === s.reader_id || u.id === s.reader_id);
      const sale = userMap.get(s.sale_id) || users.find(u => u.full_name === s.sale_id || u.id === s.sale_id);
      salesDataRows.push([
        idx + 1,
        s.date || '',
        s.customer_name || 'Khách vãng lai',
        s.package_name || 'Gói Tarot',
        Number(s.amount) || 0,
        Number(s.tip) || 0,
        reader?.full_name || s.reader_id || 'N/A',
        sale?.full_name || (s.sale_id === 'none' ? 'Không có' : s.sale_id) || 'Không có'
      ]);
    });

    salesDataRows.push([]);
    salesDataRows.push(['TỔNG CỘNG', '', '', '', totalRevenue, totalTip, '', '']);
    const wsSalesDetails = XLSX.utils.aoa_to_sheet(salesDataRows);
    XLSX.utils.book_append_sheet(wbSales, wsSalesDetails, 'Chi_Tiet_Don_Hang');

    // Sheet 2: Doanh số Reader & Sale
    const staffSummaryRows: any[][] = [
      ['BẢNG TỔNG KẾT READER TRONG KỲ'],
      ['Họ và Tên Reader', 'Số Đơn Phụ Trách', 'Doanh Thu Gói', 'Tiền Tip', 'Hoa Hồng Reader'],
    ];

    Object.entries(readerMap).forEach(([name, data]) => {
      staffSummaryRows.push([
        name,
        data.salesCount,
        data.revenue,
        data.tip,
        Math.round(data.commission)
      ]);
    });

    staffSummaryRows.push([]);
    staffSummaryRows.push(['BẢNG TỔNG KẾT SALE TRONG KỲ']);
    staffSummaryRows.push(['Họ và Tên Sale', 'Số Đơn Chốt', 'Doanh Thu Gói', 'Tiền Tip', 'Hoa Hồng Sale']);

    Object.entries(saleMap).forEach(([name, data]) => {
      staffSummaryRows.push([
        name,
        data.salesCount,
        data.revenue,
        data.tip,
        Math.round(data.commission)
      ]);
    });

    const wsStaffSummary = XLSX.utils.aoa_to_sheet(staffSummaryRows);
    XLSX.utils.book_append_sheet(wbSales, wsStaffSummary, 'Tong_Ket_Nhan_Su');

    const salesXlsxBuffer = XLSX.write(wbSales, { bookType: 'xlsx', type: 'array' });
    zip.file('01_Bao_Cao_Doanh_Thu_Ban_Hang.xlsx', salesXlsxBuffer);

    // ==========================================
    // FILE 2: 02_Bang_Luong_Va_Loi_Nhuan.xlsx
    // ==========================================
    const wbPayroll = XLSX.utils.book_new();

    const payrollRows: any[][] = [
      [`BẢNG KÊ LƯƠNG & LỢI NHUẬN TÀI CHÍNH - ${periodLabel.toUpperCase()}`],
      [`Thời gian kết xuất: ${new Date().toLocaleString('vi-VN')}`],
      [],
      ['TỔNG QUAN TÀI CHÍNH CHỦ SHOP:'],
      ['1. Tổng Doanh Thu Gói', totalRevenue],
      ['2. Tổng Tiền Tip Khách Tặng (100% về NV)', totalTip],
      ['3. Tổng Lương & Hoa Hồng Phải Trả Nhân Viên', Math.round(totalStaffSalary)],
      ['4. Chi Phí Quảng Cáo Facebook Meta Ads', Math.round(totalAdSpend)],
      ['=> 5. LỢI NHUẬN THỰC TẾ BỎ TÚI CỦA CHỦ SHOP', Math.round(ownerNetProfit)],
      ['Biên Lợi Nhuận Ròng (%)', `${netMargin.toFixed(1)}%`],
      ['Tỷ Suất Hoàn Vốn Ads (ROAS)', roas ? `${roas.toFixed(2)}x` : 'Chưa có Ads'],
      [],
      ['CHI TIẾT CHI TRẢ TỪNG NHÂN VIÊN:'],
      ['STT', 'Họ và Tên', 'Vai Trò', 'Số Đơn', 'Doanh Thu', '% Hoa Hồng', 'Tiền Hoa Hồng', 'Tiền Tip', 'THỰC NHẬN (LƯƠNG + TIP)', 'Ngân Hàng', 'Số Tài Khoản', 'Tên Chủ Thẻ VietQR']
    ];

    let payoutIdx = 1;
    let grandTotalPayout = 0;

    // Merge readers and sales into payroll list
    const allStaffNames = Array.from(new Set([...Object.keys(readerMap), ...Object.keys(saleMap)]));

    allStaffNames.forEach(name => {
      const rData = readerMap[name];
      const sData = saleMap[name];
      const u = rData?.user || sData?.user;

      const role = u?.role === 'sale' ? 'Sale' : (u?.role === 'reader' ? 'Reader' : 'Nhân sự');
      const orders = (rData?.salesCount || 0) + (sData?.salesCount || 0);
      const rev = (rData?.revenue || 0) + (sData?.revenue || 0);
      const comm = (rData?.commission || 0) + (sData?.commission || 0);
      const tip = (rData?.tip || 0) + (sData?.tip || 0);
      const netPayout = comm + tip;
      grandTotalPayout += netPayout;

      payrollRows.push([
        payoutIdx++,
        name,
        role,
        orders,
        rev,
        `${u?.commission_percent || 0}%`,
        Math.round(comm),
        tip,
        Math.round(netPayout),
        u?.bank_name || 'Chưa cập nhật',
        u?.bank_account || 'Chưa cập nhật',
        u?.bank_account_name || u?.full_name?.toUpperCase() || ''
      ]);
    });

    payrollRows.push([]);
    payrollRows.push([
      'TỔNG CỘNG CHI TRẢ LƯƠNG NHÂN VIÊN',
      '',
      '',
      filteredSales.length,
      totalRevenue,
      '',
      Math.round(totalStaffSalary),
      totalTip,
      Math.round(grandTotalPayout),
      '',
      '',
      ''
    ]);

    const wsPayroll = XLSX.utils.aoa_to_sheet(payrollRows);
    XLSX.utils.book_append_sheet(wbPayroll, wsPayroll, 'Bang_Luong_Chi_Tiet');

    const payrollXlsxBuffer = XLSX.write(wbPayroll, { bookType: 'xlsx', type: 'array' });
    zip.file('02_Bang_Ke_Luong_Va_Loi_Nhuan_Chu_Shop.xlsx', payrollXlsxBuffer);

    // ==========================================
    // FILE 3: 03_Tong_Ket_Kinh_Doanh_Gui_Zalo.txt
    // ==========================================
    // Find top reader
    const sortedReaders = Object.entries(readerMap).sort((a, b) => b[1].revenue - a[1].revenue);
    const topReader = sortedReaders[0] ? `${sortedReaders[0][0]} (${formatCurrency(sortedReaders[0][1].revenue)} - ${sortedReaders[0][1].salesCount} ca)` : 'Chưa có';

    const textSummary = `
🔮 BÁO CÁO TỔNG KẾT KINH DOANH TAROT SHOP
📅 Thời gian: ${periodLabel}
⏱️ Thời điểm xuất file: ${new Date().toLocaleString('vi-VN')}
============================================================

💰 TỔNG QUAN TÀI CHÍNH:
• Tổng số đơn hoàn thành: ${filteredSales.length} đơn
• Tổng doanh thu bán gói: ${formatCurrency(totalRevenue)}
• Tổng tiền Tip khách tặng: ${formatCurrency(totalTip)}
• Chi phí quảng cáo Meta Ads: ${formatCurrency(totalAdSpend)}
• Hiệu quả quảng cáo (ROAS): ${roas ? `${roas.toFixed(2)}x` : 'Chưa chạy Ads'}
• Tổng chi trả lương & hoa hồng: ${formatCurrency(totalStaffSalary)}
------------------------------------------------------------
💎 LỢI NHUẬN THỰC TẾ BỎ TÚI CỦA BẠN: ${formatCurrency(ownerNetProfit)}
📈 Tỷ suất biên lợi nhuận ròng: ${netMargin.toFixed(1)}%

⭐ VINH DANH NHÂN SỰ XUẤT SẮC:
• Top Reader doanh thu cao nhất: ${topReader}
• Tổng số nhân sự tham gia ca: ${allStaffNames.length} bạn

============================================================
(Tệp này được đóng gói tự động từ Hệ thống Quản Trị Tarot Shop)
`.trim();

    zip.file('03_Tong_Ket_Kinh_Doanh_Gui_Zalo.txt', textSummary);

    // ==========================================
    // FILE 4: 04_Du_Lieu_Sao_Luu_Goc.json
    // ==========================================
    const backupRes = await firebaseService.exportFullBackup();
    if (backupRes.success && backupRes.backup) {
      zip.file('04_Du_Lieu_Sao_Luu_Database_Goc.json', JSON.stringify(backupRes.backup, null, 2));
    }

    // 3. Generate ZIP & Download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const fullFileName = `${zipPrefix}.zip`;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName: fullFileName,
      message: `Đã đóng gói và tải về thành công trọn bộ báo cáo ${periodLabel} (${fullFileName})!`
    };
  } catch (error) {
    console.error("[ReportPackage] Export error:", error);
    return {
      success: false,
      message: 'Lỗi khi đóng gói báo cáo: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
