export interface BankInfo {
  code: string; // Napas code, e.g., 'MB', 'VCB'
  bin: string;
  name: string;
  shortName: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { code: 'MB', bin: '970422', shortName: 'MBBank', name: 'Ngân hàng Quân Đội' },
  { code: 'VCB', bin: '970436', shortName: 'Vietcombank', name: 'Ngoại Thương Việt Nam' },
  { code: 'TCB', bin: '970407', shortName: 'Techcombank', name: 'Kỹ Thương Việt Nam' },
  { code: 'VPB', bin: '970432', shortName: 'VPBank', name: 'Việt Nam Thịnh Vượng' },
  { code: 'ACB', bin: '970416', shortName: 'ACB', name: 'Á Châu' },
  { code: 'BIDV', bin: '970418', shortName: 'BIDV', name: 'Đầu tư và Phát triển VN' },
  { code: 'ICB', bin: '970415', shortName: 'VietinBank', name: 'Công Thương Việt Nam' },
  { code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Tiên Phong' },
  { code: 'STB', bin: '970403', shortName: 'Sacombank', name: 'Sài Gòn Thương Tín' },
  { code: 'HDB', bin: '970437', shortName: 'HDBank', name: 'Phát triển TP.HCM' },
  { code: 'VIB', bin: '970441', shortName: 'VIB', name: 'Quốc Tế Việt Nam' },
  { code: 'SHB', bin: '970443', shortName: 'SHB', name: 'Sài Gòn - Hà Nội' },
  { code: 'MSB', bin: '970426', shortName: 'MSB', name: 'Hàng Hải Việt Nam' },
  { code: 'OCB', bin: '970448', shortName: 'OCB', name: 'Phương Đông' },
  { code: 'LPB', bin: '970449', shortName: 'LPBank', name: 'Lộc Phát Việt Nam' },
  { code: 'SEAB', bin: '970440', shortName: 'SeABank', name: 'Đông Nam Á' },
  { code: 'ABB', bin: '970425', shortName: 'An Bình', name: 'An Bình' },
  { code: 'VCCB', bin: '970454', shortName: 'VietCapitalBank', name: 'Bản Việt' },
  { code: 'BVB', bin: '970438', shortName: 'BaoVietBank', name: 'Bảo Việt' },
  { code: 'NAB', bin: '970428', shortName: 'Nam A Bank', name: 'Nam Á' },
  { code: 'CAKE', bin: '546034', shortName: 'CAKE by VPBank', name: 'Ngân hàng số CAKE' },
  { code: 'TIMO', bin: '963388', shortName: 'Timo', name: 'Ngân hàng số Timo' }
];

export const RANDOM_TRANSFER_NOTES = [
  'Chuyen tien',
  'Tra tien mua do',
  'Thanh toan tien ca phe',
  'Giao dich ca nhan',
  'Tien an trua hom nay',
  'Gui ban tien',
  'Tra tien phong',
  'Tra tien nuoc',
  'Chuyen tien mat',
  'Tien an toi',
  'CK tra no nhe',
  'Cam on ban nhieu',
  'Gui lai tien hom truoc'
];

export function getRandomTransferNote(): string {
  const randomIndex = Math.floor(Math.random() * RANDOM_TRANSFER_NOTES.length);
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random suffix
  return `${RANDOM_TRANSFER_NOTES[randomIndex]} ${randomSuffix}`;
}

export function generateVietQRUrl(params: {
  bankCodeOrBin: string;
  accountNumber: string;
  amount?: number;
  note?: string;
  accountName?: string;
  template?: 'compact2' | 'compact' | 'qr_only';
}): string {
  const { bankCodeOrBin, accountNumber, amount, note, accountName, template = 'compact2' } = params;
  
  if (!bankCodeOrBin || !accountNumber) return '';

  const cleanAccount = accountNumber.replace(/[\s\-\.]/g, '');
  const cleanBank = bankCodeOrBin.trim();
  const cleanAmount = amount && amount > 0 ? Math.round(amount) : 0;
  const cleanNote = (note || '').trim();
  const cleanName = (accountName || '').trim();

  let url = `https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-${template}.png`;
  const queryParts: string[] = [];

  if (cleanAmount > 0) {
    queryParts.push(`amount=${cleanAmount}`);
  }
  if (cleanNote) {
    queryParts.push(`addInfo=${encodeURIComponent(cleanNote)}`);
  }
  if (cleanName) {
    queryParts.push(`accountName=${encodeURIComponent(cleanName)}`);
  }

  if (queryParts.length > 0) {
    url += `?${queryParts.join('&')}`;
  }

  return url;
}
