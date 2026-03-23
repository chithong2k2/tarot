/**
 * GOOGLE APPS SCRIPT API CODE (FULL VERSION WITH CASCADING DELETE)
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste the code below.
 * 4. Click 'Run' on the 'initDatabase' function to set up your sheets automatically.
 * 5. Click 'Deploy' > 'New Deployment'.
 * 6. Select 'Web App'.
 * 7. Set 'Execute as' to 'Me'.
 * 8. Set 'Who has access' to 'Anyone'.
 * 9. Copy the Web App URL and set it as VITE_GAS_API_URL in your environment.
 */

/**
 * Automatically creates sheets and sets headers
 */
function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    'USERS': ['id', 'username', 'password', 'role', 'full_name', 'bank_account', 'commission_percent'],
    'SALES_DATA': ['id', 'reader_name', 'sale_name', 'customer_name', 'package_name', 'amount', 'tip', 'date'],
    'SHIFTS': ['shift_id', 'shift_name', 'start_time', 'end_time'],
    'READER_SHIFTS': ['id', 'staff_name', 'shift_id', 'day_of_week'],
    'SALE_SHIFTS': ['id', 'staff_name', 'shift_id', 'day_of_week']
  };

  for (let sheetName in sheets) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // Set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, sheets[sheetName].length).setValues([sheets[sheetName]]);
      sheet.getRange(1, 1, 1, sheets[sheetName].length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
  }
  
  // Add an admin user if USERS is empty (except header)
  const usersSheet = ss.getSheetByName('USERS');
  if (usersSheet.getLastRow() === 1) {
    usersSheet.appendRow([
      Utilities.getUuid(),
      'admin',
      'admin123',
      'manager',
      'Administrator',
      'N/A',
      '0'
    ]);
  }

  const msg = 'Khởi tạo database thành công! Các sheet đã được tạo với header đúng chuẩn.';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    // UI might not be available if run from editor
  }
}

/**
 * Adds a menu to the spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Hệ Thống Quản Lý')
    .addItem('Khởi tạo/Cập nhật Sheets', 'initDatabase')
    .addToUi();
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = ss.getSheetByName('USERS');
  const salesSheet = ss.getSheetByName('SALES_DATA');
  const shiftsSheet = ss.getSheetByName('SHIFTS');
  const readerShiftsSheet = ss.getSheetByName('READER_SHIFTS');
  const saleShiftsSheet = ss.getSheetByName('SALE_SHIFTS');
  
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid JSON" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = data.action;
  
  switch (action) {
    case 'getInitialData':
      return response({
        status: 'ok',
        data: {
          users: getSheetData(usersSheet),
          sales: getSheetData(salesSheet),
          shifts: getSheetData(shiftsSheet),
          readerShifts: getSheetData(readerShiftsSheet),
          saleShifts: getSheetData(saleShiftsSheet)
        }
      });
    case 'login':
      return login(usersSheet, data.username, data.password);
    case 'getUsers':
      return getUsers(usersSheet);
    case 'addUser':
      return addUser(usersSheet, data.user);
    case 'updateUser':
      return updateUser(ss, data.user);
    case 'deleteUser':
      return deleteUser(ss, data.id);
    case 'addSaleRecord':
      return addSaleRecord(salesSheet, data.record);
    case 'updateSaleRecord':
      return updateSaleRecord(salesSheet, data.record);
    case 'deleteSaleRecord':
      return deleteSaleRecord(salesSheet, data.id);
    case 'getSales':
      return getSales(salesSheet, data.role, data.name);
    case 'getDashboardSummary':
      return getDashboardSummary(ss);
    case 'resetWeek':
      return resetWeek(salesSheet);
    case 'getShifts':
      return getShifts(shiftsSheet);
    case 'createShift':
      return createShift(shiftsSheet, data.shift);
    case 'updateShift':
      return updateShift(shiftsSheet, data.shift);
    case 'deleteShift':
      return deleteShift(ss, data.id);
    case 'getReaderShiftSchedule':
      return getReaderShiftSchedule(readerShiftsSheet);
    case 'getSaleShiftSchedule':
      return getSaleShiftSchedule(saleShiftsSheet);
    case 'registerReaderShift':
      return registerReaderShift(readerShiftsSheet, data.registration);
    case 'deleteReaderShift':
      return deleteReaderShift(readerShiftsSheet, data.id);
    case 'registerSaleShift':
      return registerSaleShift(saleShiftsSheet, data.registration);
    case 'deleteSaleShift':
      return deleteSaleShift(saleShiftsSheet, data.id);
    case 'syncAllData':
      return syncAllData(ss, data.payload);
    default:
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Unknown action: " + action }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllData(ss, payload) {
  const { users, sales, shifts, readerShifts, saleShifts } = payload;
  
  // Helper to clear and set headers
  function resetSheet(sheetName, headers) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // 1. Sync USERS
  const usersSheet = resetSheet('USERS', ['id', 'username', 'password', 'role', 'full_name', 'bank_account', 'commission_percent']);
  if (users && users.length > 0) {
    const rows = users.map(u => [u.id, u.username, u.password, u.role, u.full_name, u.bank_account, u.commission_percent]);
    usersSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // 2. Sync SALES_DATA
  const salesSheet = resetSheet('SALES_DATA', ['id', 'reader_name', 'sale_name', 'customer_name', 'package_name', 'amount', 'tip', 'date']);
  if (sales && sales.length > 0) {
    const rows = sales.map(s => [s.id, s.reader_name, s.sale_name, s.customer_name, s.package_name, s.amount, s.tip, s.date]);
    salesSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // 3. Sync SHIFTS
  const shiftsSheet = resetSheet('SHIFTS', ['shift_id', 'shift_name', 'start_time', 'end_time']);
  if (shifts && shifts.length > 0) {
    const rows = shifts.map(s => [s.id, s.shift_name, s.start_time, s.end_time]);
    shiftsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // 4. Sync READER_SHIFTS
  const readerShiftsSheet = resetSheet('READER_SHIFTS', ['id', 'staff_name', 'shift_id', 'day_of_week']);
  if (readerShifts && readerShifts.length > 0) {
    const rows = readerShifts.map(r => [r.id, r.staff_name, r.shift_id, r.day_of_week]);
    readerShiftsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // 5. Sync SALE_SHIFTS
  const saleShiftsSheet = resetSheet('SALE_SHIFTS', ['id', 'staff_name', 'shift_id', 'day_of_week']);
  if (saleShifts && saleShifts.length > 0) {
    const rows = saleShifts.map(s => [s.id, s.staff_name, s.shift_id, s.day_of_week]);
    saleShiftsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return response({ success: true, message: "Đồng bộ dữ liệu thành công!" });
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = rows[i][index];
    });
    data.push(obj);
  }
  return data;
}

function login(sheet, username, password) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    // Convert to string for safe comparison (passwords might be numbers in Sheets)
    if (String(rows[i][1]) === String(username) && String(rows[i][2]) === String(password)) {
      return response({
        success: true,
        user: {
          id: rows[i][0],
          username: rows[i][1],
          role: rows[i][3],
          full_name: rows[i][4],
          commission_percent: rows[i][6]
        }
      });
    }
  }
  return response({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
}

function getUsers(sheet) {
  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    users.push({
      id: rows[i][0],
      username: rows[i][1],
      password: rows[i][2],
      role: rows[i][3],
      full_name: rows[i][4],
      bank_account: rows[i][5],
      commission_percent: rows[i][6]
    });
  }
  return response({ success: true, users });
}

function addUser(sheet, user) {
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    user.username,
    user.password,
    user.role,
    user.full_name,
    user.bank_account,
    user.commission_percent
  ]);
  return response({ success: true, id });
}

function updateUser(ss, user) {
  const usersSheet = ss.getSheetByName('USERS');
  const salesSheet = ss.getSheetByName('SALES_DATA');
  const readerShiftsSheet = ss.getSheetByName('READER_SHIFTS');
  const saleShiftsSheet = ss.getSheetByName('SALE_SHIFTS');
  
  const rows = usersSheet.getDataRange().getValues();
  let oldFullName = "";
  let userRowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === user.id) {
      oldFullName = rows[i][4];
      userRowIndex = i + 1;
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return response({ success: false, message: "User not found" });
  }
  
  // 1. Update USERS
  usersSheet.getRange(userRowIndex, 2, 1, 6).setValues([[
    user.username,
    user.password,
    user.role,
    user.full_name,
    user.bank_account,
    user.commission_percent
  ]]);
  
  // 2. Cascading Update if full_name changed
  const newFullName = user.full_name;
  if (oldFullName !== newFullName) {
    // Update SALES_DATA
    if (salesSheet) {
      const salesRows = salesSheet.getDataRange().getValues();
      for (let i = 1; i < salesRows.length; i++) {
        let changed = false;
        let readerName = salesRows[i][1];
        let saleName = salesRows[i][2];
        
        if (readerName === oldFullName) {
          readerName = newFullName;
          changed = true;
        }
        if (saleName === oldFullName) {
          saleName = newFullName;
          changed = true;
        }
        
        if (changed) {
          salesSheet.getRange(i + 1, 2, 1, 2).setValues([[readerName, saleName]]);
        }
      }
    }
    
    // Update READER_SHIFTS
    if (readerShiftsSheet) {
      const readerRows = readerShiftsSheet.getDataRange().getValues();
      for (let i = 1; i < readerRows.length; i++) {
        if (readerRows[i][1] === oldFullName) {
          readerShiftsSheet.getRange(i + 1, 2).setValue(newFullName);
        }
      }
    }
    
    // Update SALE_SHIFTS
    if (saleShiftsSheet) {
      const saleRows = saleShiftsSheet.getDataRange().getValues();
      for (let i = 1; i < saleRows.length; i++) {
        if (saleRows[i][1] === oldFullName) {
          saleShiftsSheet.getRange(i + 1, 2).setValue(newFullName);
        }
      }
    }
  }
  
  return response({ success: true });
}

/**
 * CASCADING DELETE FOR USER
 * Deletes user and all related data in other sheets
 */
function deleteUser(ss, id) {
  const usersSheet = ss.getSheetByName('USERS');
  const salesSheet = ss.getSheetByName('SALES_DATA');
  const readerShiftsSheet = ss.getSheetByName('READER_SHIFTS');
  const saleShiftsSheet = ss.getSheetByName('SALE_SHIFTS');
  
  const usersRows = usersSheet.getDataRange().getValues();
  let fullName = "";
  let userRowIndex = -1;
  
  for (let i = 1; i < usersRows.length; i++) {
    if (usersRows[i][0] === id) {
      fullName = usersRows[i][4];
      userRowIndex = i + 1;
      break;
    }
  }
  
  if (userRowIndex === -1) {
    return response({ success: false, message: "User not found" });
  }
  
  // 1. Delete from USERS
  usersSheet.deleteRow(userRowIndex);
  
  // 2. Delete from SALES_DATA (Cascading)
  if (salesSheet) {
    const salesRows = salesSheet.getDataRange().getValues();
    for (let i = salesRows.length - 1; i >= 1; i--) {
      // reader_name is col 2 (index 1), sale_name is col 3 (index 2)
      if (salesRows[i][1] === fullName || salesRows[i][2] === fullName) {
        salesSheet.deleteRow(i + 1);
      }
    }
  }
  
  // 3. Delete from READER_SHIFTS (Cascading)
  if (readerShiftsSheet) {
    const readerRows = readerShiftsSheet.getDataRange().getValues();
    for (let i = readerRows.length - 1; i >= 1; i--) {
      if (readerRows[i][1] === fullName) {
        readerShiftsSheet.deleteRow(i + 1);
      }
    }
  }
  
  // 4. Delete from SALE_SHIFTS (Cascading)
  if (saleShiftsSheet) {
    const saleRows = saleShiftsSheet.getDataRange().getValues();
    for (let i = saleRows.length - 1; i >= 1; i--) {
      if (saleRows[i][1] === fullName) {
        saleShiftsSheet.deleteRow(i + 1);
      }
    }
  }
  
  return response({ success: true });
}

function addSaleRecord(sheet, record) {
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    record.reader_name,
    record.sale_name,
    record.customer_name,
    record.package_name,
    record.amount,
    record.tip,
    record.date
  ]);
  return response({ success: true, id });
}

function updateSaleRecord(sheet, record) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === record.id) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, 2, 1, 7).setValues([[
        record.reader_name,
        record.sale_name,
        record.customer_name,
        record.package_name,
        record.amount,
        record.tip,
        record.date
      ]]);
      return response({ success: true });
    }
  }
  return response({ success: false, message: "Record not found" });
}

function deleteSaleRecord(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return response({ success: true });
    }
  }
  return response({ success: false, message: "Record not found" });
}

function getSales(sheet, role, name) {
  const rows = sheet.getDataRange().getValues();
  const sales = [];
  for (let i = 1; i < rows.length; i++) {
    const record = {
      id: rows[i][0],
      reader_name: rows[i][1],
      sale_name: rows[i][2],
      customer_name: rows[i][3],
      package_name: rows[i][4],
      amount: rows[i][5],
      tip: rows[i][6],
      date: rows[i][7]
    };
    
    if (role === 'manager') {
      sales.push(record);
    } else if (role === 'reader' && record.reader_name === name) {
      sales.push(record);
    } else if (role === 'sale' && record.sale_name === name) {
      sales.push(record);
    }
  }
  return response({ success: true, sales });
}

function getDashboardSummary(ss) {
  const salesSheet = ss.getSheetByName('SALES_DATA');
  const usersSheet = ss.getSheetByName('USERS');
  const salesRows = salesSheet.getDataRange().getValues();
  const usersRows = usersSheet.getDataRange().getValues();
  
  const userMap = {};
  usersRows.slice(1).forEach(row => {
    userMap[row[4]] = { role: row[3], commission: row[6] };
  });

  let totalAmount = 0;
  let totalTip = 0;
  let totalReaderCommission = 0;
  let totalSaleCommission = 0;
  
  const revenueByDay = {
    'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0, 'Chủ nhật': 0
  };
  
  const readerStats = {};
  const saleStats = {};

  salesRows.slice(1).forEach(row => {
    const amount = Number(row[5]) || 0;
    const tip = Number(row[6]) || 0;
    const readerName = row[1];
    const saleName = row[2];
    const date = new Date(row[7]);
    
    totalAmount += amount;
    totalTip += tip;
    
    // Day of week
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    revenueByDay[days[date.getDay()]] += (amount + tip);
    
    // Commissions
    if (userMap[readerName]) {
      // Reader gets % of amount + 100% of tip
      const comm = (amount * (userMap[readerName].commission / 100));
      totalReaderCommission += comm;
      readerStats[readerName] = (readerStats[readerName] || 0) + amount + tip;
    }
    
    if (userMap[saleName]) {
      // Sale gets % of amount only
      const comm = (amount * (userMap[saleName].commission / 100));
      totalSaleCommission += comm;
      saleStats[saleName] = (saleStats[saleName] || 0) + amount;
    }
  });

  const topReader = Object.entries(readerStats).sort((a,b) => b[1] - a[1])[0] || ["N/A", 0];
  const topSale = Object.entries(saleStats).sort((a,b) => b[1] - a[1])[0] || ["N/A", 0];

  return response({
    success: true,
    summary: {
      totalRevenue: totalAmount + totalTip,
      totalAmount,
      totalTip,
      totalReaderCommission,
      totalSaleCommission,
      totalExpenses: totalReaderCommission + totalSaleCommission + totalTip, // Assuming 0 operating costs for simple GAS summary
      revenueByDay: Object.entries(revenueByDay).map(([name, value]) => ({ name, value })),
      topReader: { name: topReader[0], amount: topReader[1] },
      topSale: { name: topSale[0], amount: topSale[1] }
    }
  });
}

function resetWeek(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return response({ success: true });
}

// --- SHIFT MANAGEMENT FUNCTIONS ---

function getShifts(sheet) {
  const rows = sheet.getDataRange().getValues();
  const shifts = [];
  for (let i = 1; i < rows.length; i++) {
    shifts.push({
      shift_id: rows[i][0],
      shift_name: rows[i][1],
      start_time: rows[i][2],
      end_time: rows[i][3]
    });
  }
  return response({ success: true, shifts });
}

function createShift(sheet, shift) {
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    shift.shift_name,
    shift.start_time,
    shift.end_time
  ]);
  return response({ success: true, id });
}

function updateShift(sheet, shift) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === shift.shift_id) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, 2, 1, 3).setValues([[
        shift.shift_name,
        shift.start_time,
        shift.end_time
      ]]);
      return response({ success: true });
    }
  }
  return response({ success: false, message: "Shift not found" });
}

/**
 * CASCADING DELETE FOR SHIFT
 * Deletes shift and all registrations for that shift
 */
function deleteShift(ss, id) {
  const shiftsSheet = ss.getSheetByName('SHIFTS');
  const readerShiftsSheet = ss.getSheetByName('READER_SHIFTS');
  const saleShiftsSheet = ss.getSheetByName('SALE_SHIFTS');
  
  const rows = shiftsSheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      shiftsSheet.deleteRow(i + 1);
      found = true;
      break;
    }
  }
  
  if (!found) return response({ success: false, message: "Shift not found" });
  
  // Cascading delete registrations
  if (readerShiftsSheet) {
    const readerRows = readerShiftsSheet.getDataRange().getValues();
    for (let i = readerRows.length - 1; i >= 1; i--) {
      if (readerRows[i][2] === id) {
        readerShiftsSheet.deleteRow(i + 1);
      }
    }
  }
  
  if (saleShiftsSheet) {
    const saleRows = saleShiftsSheet.getDataRange().getValues();
    for (let i = saleRows.length - 1; i >= 1; i--) {
      if (saleRows[i][2] === id) {
        saleShiftsSheet.deleteRow(i + 1);
      }
    }
  }
  
  return response({ success: true });
}

function getReaderShiftSchedule(sheet) {
  const rows = sheet.getDataRange().getValues();
  const schedule = [];
  for (let i = 1; i < rows.length; i++) {
    schedule.push({
      id: rows[i][0],
      staff_name: rows[i][1],
      shift_id: rows[i][2],
      day_of_week: rows[i][3]
    });
  }
  return response({ success: true, schedule });
}

function getSaleShiftSchedule(sheet) {
  const rows = sheet.getDataRange().getValues();
  const schedule = [];
  for (let i = 1; i < rows.length; i++) {
    schedule.push({
      id: rows[i][0],
      staff_name: rows[i][1],
      shift_id: rows[i][2],
      day_of_week: rows[i][3]
    });
  }
  return response({ success: true, schedule });
}

function registerReaderShift(sheet, reg) {
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    reg.staff_name,
    reg.shift_id,
    reg.day_of_week
  ]);
  return response({ success: true, id });
}

function deleteReaderShift(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return response({ success: true });
    }
  }
  return response({ success: false, message: "Registration not found" });
}

function registerSaleShift(sheet, reg) {
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    reg.staff_name,
    reg.shift_id,
    reg.day_of_week
  ]);
  return response({ success: true, id });
}

function deleteSaleShift(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return response({ success: true });
    }
  }
  return response({ success: false, message: "Registration not found" });
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'GAS API is active. Use POST to send data.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

