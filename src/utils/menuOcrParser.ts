import { PackageOption } from '../types';

/**
 * Smart heuristic parser that extracts Tarot packages & prices from raw OCR or transcribed text.
 * Handles formats like:
 * - "1 câu: 35k"
 * - "3 câu 80.000đ"
 * - "10 câu (Hot) 169k"
 * - "Trọn gói 1h không giới hạn: 300.000"
 * - "Gói năm 500k"
 */
export function parseMenuTextToPackages(rawText: string): PackageOption[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 2);

  const packages: PackageOption[] = [];
  const seenNames = new Set<string>();

  for (const line of lines) {
    // 1. Detect price pattern
    // Examples: 169k, 169.000, 169,000, 169000, 169.000đ, 1tr, 1.5tr
    const kRegex = /(\d+(?:[.,]\d+)?)\s*k(?:\b|[^\w])/i;
    const vndRegex = /(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ)?(?:\b|[^\w])/i;
    const trRegex = /(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)(?:\b|[^\w])/i;

    let price = 0;
    let matchedStr = '';

    const kMatch = line.match(kRegex);
    const vndMatch = line.match(vndRegex);
    const trMatch = line.match(trRegex);

    if (kMatch) {
      const num = parseFloat(kMatch[1].replace(',', '.'));
      price = Math.round(num * 1000);
      matchedStr = kMatch[0];
    } else if (vndMatch) {
      const numStr = vndMatch[1].replace(/[.,]/g, '');
      price = parseInt(numStr, 10);
      matchedStr = vndMatch[0];
    } else if (trMatch) {
      const num = parseFloat(trMatch[1].replace(',', '.'));
      price = Math.round(num * 1000000);
      matchedStr = trMatch[0];
    }

    if (price >= 10000) { // Valid service price threshold in VNĐ
      // Check popular flags
      const isPopular = /hot|bán chạy|khuyên dùng|phổ biến|best seller|ưu đãi|được chọn nhiều|top|⭐|★/i.test(line);

      // Extract package name by removing the price and special symbols
      let namePart = line
        .replace(matchedStr, '')
        .replace(/[:\-–—|=~*#•]/g, ' ')
        .replace(/\b(hot|bán chạy|khuyên dùng|phổ biến|best seller|ưu đãi|top)\b/gi, '')
        .replace(/[()[\]{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!namePart) {
        namePart = `Gói ${price >= 1000000 ? (price / 1000000) + 'tr' : (price / 1000) + 'k'}`;
      }

      // Clean up prefix like "Gói", "1."
      namePart = namePart.replace(/^(\d+[.)]\s*)/, '').trim();

      // Capitalize first letters for label
      const label = namePart
        .split(' ')
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : '')
        .join(' ');

      const normalizedKey = namePart.toLowerCase();
      if (!seenNames.has(normalizedKey)) {
        seenNames.add(normalizedKey);
        packages.push({
          id: 'pkg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: namePart.toLowerCase(),
          label: label,
          price: price,
          popular: isPopular
        });
      }
    }
  }

  return packages;
}
