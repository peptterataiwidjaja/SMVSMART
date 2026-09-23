import { LineData, DailyRecord, MonthlyProductivityRecord, BankDataModel } from '../types';
import { INITIAL_LINES_DATA, DATE_LABELS } from '../data/defaultData';
import { calculateEfficiency, calculateProductivityPerOp, generateSmartAnalysis } from '../data/monthlyRecapData';

export interface ParseResult {
  lines: LineData[];
  recapRecords?: MonthlyProductivityRecord[];
  bankModels?: BankDataModel[];
  error?: string;
  source: 'google-sheets' | 'embedded-default' | 'direct-sheet' | 'paste-import';
  spreadsheetTitle?: string;
  recordCount?: number;
}

export function parseIndonesianNumber(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '#REF!' || val === '#VALUE!') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim()
    .replace(/^Rp\s?/, '')
    .replace(/\./g, '') // remove thousands dot
    .replace(/,/g, '.') // replace decimal comma
    .replace(/%/, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Ekstrak ID Spreadsheet dan GID dari tautan Google Sheets
 */
export function extractSpreadsheetInfo(url: string): { 
  spreadsheetId: string | null; 
  gid: string | null;
  isAppsScript: boolean;
  isGoogleSpreadsheet: boolean;
} {
  if (!url) {
    return { spreadsheetId: null, gid: null, isAppsScript: false, isGoogleSpreadsheet: false };
  }
  const cleanUrl = url.trim();
  const isAppsScript = cleanUrl.includes('script.google.com');
  const isGoogleSpreadsheet = cleanUrl.includes('docs.google.com/spreadsheets');

  const idMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);

  return {
    spreadsheetId: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : null,
    isAppsScript,
    isGoogleSpreadsheet
  };
}

/**
 * Parsing data mentah dari respon Google Apps Script atau 2D Array
 */
export function parseSheetData(raw: any): LineData[] {
  // If raw is already structured LineData array
  if (Array.isArray(raw) && raw.length > 0 && raw[0].lineId && raw[0].daily) {
    return raw as LineData[];
  }

  // If raw is wrapped in { rawData: [...] } or is a 2D array:
  const rows: any[][] = Array.isArray(raw) 
    ? raw 
    : (raw && Array.isArray(raw.rawData) ? raw.rawData : []);

  if (!rows || rows.length < 3) {
    return INITIAL_LINES_DATA;
  }

  try {
    // Find header date row (contains 1, 2, 3...)
    let dateRowIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const rowStr = rows[i].map(c => String(c).trim()).join(' ');
      if (rowStr.toUpperCase().includes('TANGGAL') || (rows[i].includes(1) && rows[i].includes(2))) {
        dateRowIdx = i;
        break;
      }
    }

    if (dateRowIdx === -1) {
      return INITIAL_LINES_DATA;
    }

    const dateRow = rows[dateRowIdx];
    const dateColIndices: { colIdx: number; label: string }[] = [];
    for (let c = 0; c < dateRow.length; c++) {
      const cell = String(dateRow[c]).trim();
      if (cell && !isNaN(Number(cell))) {
        dateColIndices.push({ colIdx: c, label: `Tgl ${cell}` });
      }
    }

    const parsedLines: LineData[] = [];
    let r = dateRowIdx + 1;

    while (r < rows.length) {
      const row = rows[r];
      const lineCell = String(row[1] || '').trim();
      const lineNum = parseInt(lineCell, 10);

      if (!isNaN(lineNum) && lineNum >= 1 && lineNum <= 20) {
        const overallAch = parseIndonesianNumber(row[2]) ?? 70.0;
        
        const tgtRow = rows[r] || [];
        const actRow = rows[r + 1] || [];
        const achRow = rows[r + 2] || [];

        const daily: DailyRecord[] = DATE_LABELS.map((dLabel, idx) => {
          const colMapping = dateColIndices[idx];
          const col = colMapping ? colMapping.colIdx : (4 + idx);
          const tgt = parseIndonesianNumber(tgtRow[col]);
          const act = parseIndonesianNumber(actRow[col]);
          const ach = parseIndonesianNumber(achRow[col]);

          return {
            dateIndex: idx,
            dateLabel: dLabel,
            smvTarget: tgt,
            smvActual: act,
            pencapaian: ach
          };
        });

        const existingLine = INITIAL_LINES_DATA.find(l => l.lineId === lineNum);

        parsedLines.push({
          lineId: lineNum,
          lineName: `Line ${lineNum}`,
          overallAchievement: overallAch,
          style: existingLine?.style || `Style L${lineNum}`,
          cmRate: existingLine?.cmRate || 37000,
          actualRevenue: existingLine?.actualRevenue || 180000000,
          targetRevenue: existingLine?.targetRevenue || 190000000,
          varianceRevenue: existingLine?.varianceRevenue || -10000000,
          variancePercent: existingLine?.variancePercent || -5.2,
          daily
        });

        r += 3;
      } else {
        r++;
      }
    }

    if (parsedLines.length > 0) {
      return parsedLines;
    }
  } catch (e) {
    console.error('Error parsing matrix sheet data:', e);
  }

  return INITIAL_LINES_DATA;
}

/**
 * Parsing baris CSV atau Tab-separated menjadi array 2D
 */
export function parseDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Tentukan delimiter: tab jika ada \t, selain itu koma atau titik-koma
  const firstLine = lines[0];
  const isTsv = firstLine.includes('\t');
  const delimiter = isTsv ? '\t' : (firstLine.includes(';') ? ';' : ',');

  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  });
}

/**
 * Parsing baris 2D ke format Rekap Harian (MonthlyProductivityRecord)
 */
export function parseRecapFromRows(rows: string[][]): MonthlyProductivityRecord[] {
  if (rows.length < 2) return [];

  // Cari index header
  const header = rows[0].map(h => h.toLowerCase());
  const colDate = header.findIndex(h => h.includes('tanggal') || h.includes('date') || h.includes('tgl'));
  const colLine = header.findIndex(h => h.includes('line') || h.includes('lini') || h.includes('jalur'));
  const colStyle = header.findIndex(h => h.includes('style') || h.includes('model') || h.includes('item'));
  const colTgt = header.findIndex(h => h.includes('target harian') || h.includes('target daily') || (h.includes('target') && h.includes('pcs')));
  const colAct = header.findIndex(h => h.includes('aktual harian') || h.includes('actual daily') || (h.includes('aktual') && h.includes('pcs')) || (h.includes('actual') && h.includes('pcs')));
  const colMp = header.findIndex(h => h.includes('mp') || h.includes('operator') || h.includes('manpower'));
  const colHour = header.findIndex(h => h.includes('jam') || h.includes('hour'));
  const colSmv = header.findIndex(h => h.includes('smv') || h.includes('standar'));
  const colEff = header.findIndex(h => h.includes('efisiensi') || h.includes('efficiency') || h.includes('eff'));
  const colDefect = header.findIndex(h => h.includes('defect') || h.includes('reject') || h.includes('repair'));
  const colCm = header.findIndex(h => h.includes('cm') || h.includes('tarif') || h.includes('rate'));
  const colNote = header.findIndex(h => h.includes('catatan') || h.includes('analisis') || h.includes('note'));

  const records: MonthlyProductivityRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(cell => !cell.trim())) continue;

    // Normalisasi Tanggal
    let rawDate = (colDate !== -1 ? row[colDate] : row[0]) || '';
    rawDate = rawDate.replace(/\//g, '-').trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('-');
      rawDate = `${y}-${m}-${d}`;
    }

    // Normalisasi Line
    const rawLine = (colLine !== -1 ? row[colLine] : row[1]) || '1';
    const lineNum = parseInt(rawLine.replace(/[^0-9]/g, ''), 10) || 1;

    // Style
    const style = (colStyle !== -1 ? row[colStyle] : row[2]) || `Style L${lineNum}`;

    // Target & Actual
    const targetDaily = parseIndonesianNumber(colTgt !== -1 ? row[colTgt] : row[3]) || 500;
    const actualDaily = parseIndonesianNumber(colAct !== -1 ? row[colAct] : row[4]) || 0;
    const manpower = parseInt(String(colMp !== -1 ? row[colMp] : row[5] || '36'), 10) || 36;
    const workingHours = parseIndonesianNumber(colHour !== -1 ? row[colHour] : row[6]) || 8;
    const smvStandard = parseIndonesianNumber(colSmv !== -1 ? row[colSmv] : row[7]) || 20;
    
    // Efisiensi & Produktivitas
    const calcEff = calculateEfficiency(actualDaily, smvStandard, manpower, workingHours);
    const eff = colEff !== -1 && parseIndonesianNumber(row[colEff]) !== null 
      ? Number(parseIndonesianNumber(row[colEff])) 
      : calcEff;
    
    const defect = colDefect !== -1 ? (parseIndonesianNumber(row[colDefect]) || 0) : 0;
    const cmRate = colCm !== -1 ? (parseIndonesianNumber(row[colCm]) || 37000) : 37000;
    const prodPerOp = calculateProductivityPerOp(actualDaily, manpower);
    const smartAnalysis = generateSmartAnalysis(actualDaily, targetDaily, eff, defect, manpower, prodPerOp);
    const note = colNote !== -1 && row[colNote] ? row[colNote] : smartAnalysis.text;

    records.push({
      id: `gs_rec_${rawDate || 'date'}_L${lineNum}_${i}`,
      date: rawDate,
      lineId: lineNum,
      lineName: `Line ${lineNum}`,
      style: style.trim(),
      targetDailyPcs: targetDaily,
      actualDailyPcs: actualDaily,
      targetOutputPcs: targetDaily,
      actualOutputPcs: actualDaily,
      manpower: manpower,
      workingHours: workingHours,
      smvStandard: smvStandard,
      efficiencyPercent: eff,
      productivityPcsPerOp: prodPerOp,
      defectPercent: defect,
      cmRate: cmRate,
      analysisStatus: smartAnalysis.status,
      analysisNote: note
    });
  }

  return records;
}

/**
 * Parsing baris 2D ke format Bank Data Model & SMV
 */
export function parseBankFromRows(rows: string[][]): BankDataModel[] {
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase());
  const colCode = header.findIndex(h => h.includes('model') || h.includes('style') || h.includes('kode'));
  const colBuyer = header.findIndex(h => h.includes('buyer') || h.includes('customer') || h.includes('klien'));
  const colSmv = header.findIndex(h => h.includes('smv') || h.includes('standar'));
  const colTgtDaily = header.findIndex(h => h.includes('target harian') || (h.includes('target') && h.includes('hari')) || h.includes('daily'));
  const colTgtTotal = header.findIndex(h => h.includes('target order') || h.includes('total') || h.includes('po'));
  const colMp = header.findIndex(h => h.includes('operator') || h.includes('manpower') || h.includes('mp'));
  const colHours = header.findIndex(h => h.includes('jam') || h.includes('hours'));
  const colCm = header.findIndex(h => h.includes('cm') || h.includes('tarif') || h.includes('rate') || h.includes('harga'));
  const colEff = header.findIndex(h => h.includes('efisiensi') || h.includes('eff'));
  const colDesc = header.findIndex(h => h.includes('catatan') || h.includes('deskripsi') || h.includes('desc'));

  const models: BankDataModel[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(c => !c.trim())) continue;

    const code = (colCode !== -1 ? row[colCode] : row[0]) || '';
    if (!code.trim()) continue;

    const buyer = (colBuyer !== -1 ? row[colBuyer] : row[1]) || 'LOKAL';
    const smv = parseIndonesianNumber(colSmv !== -1 ? row[colSmv] : row[2]) || 20;
    const tgtDaily = parseIndonesianNumber(colTgtDaily !== -1 ? row[colTgtDaily] : row[3]) || 500;
    const tgtTotal = parseIndonesianNumber(colTgtTotal !== -1 ? row[colTgtTotal] : row[4]) || 5000;
    const mp = parseInt(String(colMp !== -1 ? row[colMp] : row[5] || '36'), 10) || 36;
    const hours = parseIndonesianNumber(colHours !== -1 ? row[colHours] : row[6]) || 8;
    const cm = parseIndonesianNumber(colCm !== -1 ? row[colCm] : row[7]) || 37000;
    const eff = parseIndonesianNumber(colEff !== -1 ? row[colEff] : row[8]) || 75;
    const desc = colDesc !== -1 && row[colDesc] ? row[colDesc] : '';

    models.push({
      id: `gs_bank_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`,
      modelCode: code.trim(),
      buyer: buyer.trim(),
      smvStandard: smv,
      targetDailyPcs: tgtDaily,
      targetTotalPcs: tgtTotal,
      manpowerStandard: mp,
      workingHoursStandard: hours,
      cmRate: cm,
      targetEfficiency: eff,
      description: desc.trim(),
      updatedAt: new Date().toISOString()
    });
  }

  return models;
}

/**
 * Tarik data dari Google Spreadsheet langsung via CSV Visualization Endpoint (Tanpa Skrip)
 */
export async function fetchDirectGoogleSheet(spreadsheetUrl: string): Promise<ParseResult> {
  const { spreadsheetId, gid } = extractSpreadsheetInfo(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('URL Google Spreadsheet tidak valid. Pastikan format: https://docs.google.com/spreadsheets/d/{ID}/edit');
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
  
  let csvText = '';
  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      // Fallback ke standard export
      const fallbackUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
      const fbRes = await fetch(fallbackUrl);
      if (!fbRes.ok) {
        throw new Error(`Gagal membaca spreadsheet (HTTP ${fbRes.status}). Harap pastikan Spreadsheet disetel ke: "Siapa saja yang memiliki link dapat melihat (Viewer)".`);
      }
      csvText = await fbRes.text();
    } else {
      csvText = await response.text();
    }
  } catch (err: any) {
    throw new Error(err.message || 'Gagal tersambung ke Google Spreadsheet. Periksa izin pembagian spreadsheet Anda.');
  }

  const rows = parseDelimitedText(csvText);
  if (rows.length === 0) {
    throw new Error('Google Spreadsheet kosong atau tidak ada data yang dapat dibaca.');
  }

  // Deteksi tipe konten sheet berdasarkan header
  const headerStr = rows[0].join(' ').toLowerCase();
  
  // Jika ini sheet Rekap Harian
  if (headerStr.includes('tanggal') || headerStr.includes('target harian') || headerStr.includes('aktual')) {
    const recapRecords = parseRecapFromRows(rows);
    return {
      lines: INITIAL_LINES_DATA,
      recapRecords,
      source: 'direct-sheet',
      recordCount: recapRecords.length
    };
  }

  // Jika ini sheet Bank Data
  if (headerStr.includes('kode') || headerStr.includes('model') || headerStr.includes('buyer')) {
    const bankModels = parseBankFromRows(rows);
    return {
      lines: INITIAL_LINES_DATA,
      bankModels,
      source: 'direct-sheet',
      recordCount: bankModels.length
    };
  }

  // Jika ini format matriks SMV lama
  const matrixLines = parseSheetData(rows);
  return {
    lines: matrixLines,
    source: 'direct-sheet',
    recordCount: matrixLines.length
  };
}

/**
 * Tarik data dari Google Sheets melalui Google Apps Script Web App ATAU Direct Link
 */
export async function fetchGoogleSheetData(targetUrl: string): Promise<ParseResult> {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('URL tautan tidak valid. Pastikan berawalan https://');
  }

  const { isGoogleSpreadsheet, isAppsScript } = extractSpreadsheetInfo(targetUrl);

  // Jika pengguna memasukkan URL Google Spreadsheet langsung (docs.google.com/spreadsheets/d/...)
  if (isGoogleSpreadsheet && !isAppsScript) {
    return fetchDirectGoogleSheet(targetUrl);
  }

  // Jika pengguna memasukkan URL Google Apps Script Web App (script.google.com/macros/s/.../exec)
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data dari Google Apps Script (HTTP ${response.status})`);
  }

  const json = await response.json();
  if (json.status === 'error') {
    throw new Error(json.message || 'Google Apps Script mengembalikan pesan kesalahan.');
  }

  // Parse structured recap records jika ada
  let recapRecords: MonthlyProductivityRecord[] | undefined = undefined;
  if (json.recapRecords && Array.isArray(json.recapRecords)) {
    recapRecords = json.recapRecords;
  }

  // Parse structured bank data jika ada
  let bankModels: BankDataModel[] | undefined = undefined;
  if (json.bankModels && Array.isArray(json.bankModels)) {
    bankModels = json.bankModels;
  }

  // Parse lines matrix
  const lines = parseSheetData(json.rawData || json);

  const totalCount = (recapRecords?.length || 0) + (bankModels?.length || 0) + (lines.length || 0);

  return {
    lines,
    recapRecords,
    bankModels,
    source: 'google-sheets',
    spreadsheetTitle: json.spreadsheetName,
    recordCount: totalCount
  };
}

/**
 * Kirim data lokal ke Google Sheet melalui Google Apps Script (POST)
 */
export async function pushDataToAppsScript(
  appsScriptUrl: string, 
  payload: {
    action: 'syncRecap' | 'syncBank';
    records?: MonthlyProductivityRecord[];
    models?: BankDataModel[];
  }
): Promise<{ success: boolean; message: string; count?: number }> {
  if (!appsScriptUrl || !appsScriptUrl.includes('script.google.com')) {
    throw new Error('Fitur kirim data hanya mendukung URL Web App Google Apps Script (.gs)');
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // Sederhana agar tidak memicu preflight CORS issue pada Apps Script
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gagal mengirim data ke Google Apps Script (HTTP ${response.status})`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Gagal memperbarui Google Sheet');
  }

  return {
    success: true,
    message: result.message || 'Data berhasil dikirim ke Google Sheet',
    count: result.count
  };
}

/**
 * Parsing teks yang ditempel (Paste) langsung dari Google Sheets atau Excel
 */
export function parsePastedTabularData(
  text: string, 
  targetType: 'recap' | 'bank' | 'auto'
): { 
  recapRecords?: MonthlyProductivityRecord[]; 
  bankModels?: BankDataModel[]; 
  count: number;
} {
  const rows = parseDelimitedText(text);
  if (rows.length === 0) return { count: 0 };

  const headerStr = rows[0].join(' ').toLowerCase();

  if (targetType === 'bank' || (targetType === 'auto' && (headerStr.includes('buyer') || headerStr.includes('smv')) && !headerStr.includes('aktual'))) {
    const bankModels = parseBankFromRows(rows);
    return { bankModels, count: bankModels.length };
  }

  const recapRecords = parseRecapFromRows(rows);
  return { recapRecords, count: recapRecords.length };
}

/**
 * Ekspor data ke format CSV yang kompatibel dengan Google Sheets & Excel (dengan UTF-8 BOM)
 */
export function exportToGoogleSheetCsv(type: 'recap' | 'bank', data: any[]): string {
  const bom = '\uFEFF';
  if (type === 'recap') {
    const headers = [
      'Tanggal',
      'Line',
      'Nama Line',
      'Style',
      'Target Harian (pcs)',
      'Aktual Harian (pcs)',
      'Target Akumulasi',
      'Aktual Akumulasi',
      'Operator (MP)',
      'Jam Kerja',
      'SMV Standar',
      'Efisiensi %',
      'Defect %',
      'Tarif CM (Rp)',
      'Status',
      'Analisis Catatan'
    ];
    const rows = (data as MonthlyProductivityRecord[]).map(r => [
      `"${r.date || ''}"`,
      `"${r.lineId || 1}"`,
      `"${r.lineName || ''}"`,
      `"${r.style || ''}"`,
      r.targetDailyPcs || 0,
      r.actualDailyPcs || 0,
      r.targetOutputPcs || 0,
      r.actualOutputPcs || 0,
      r.manpower || 36,
      r.workingHours || 8,
      r.smvStandard || 0,
      r.efficiencyPercent || 0,
      r.defectPercent || 0,
      r.cmRate || 37000,
      `"${r.analysisStatus || 'optimal'}"`,
      `"${(r.analysisNote || '').replace(/"/g, '""')}"`
    ]);
    return bom + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  }

  const headers = [
    'Kode Style/Model',
    'Buyer',
    'SMV Standar (menit)',
    'Target Harian (pcs)',
    'Target Order (pcs)',
    'Standar Manpower',
    'Jam Kerja',
    'Tarif CM (Rp)',
    'Target Efisiensi %',
    'Deskripsi / Catatan'
  ];
  const rows = (data as BankDataModel[]).map(m => [
    `"${m.modelCode || ''}"`,
    `"${m.buyer || ''}"`,
    m.smvStandard || 0,
    m.targetDailyPcs || 0,
    m.targetTotalPcs || 0,
    m.manpowerStandard || 36,
    m.workingHoursStandard || 8,
    m.cmRate || 37000,
    m.targetEfficiency || 75,
    `"${(m.description || '').replace(/"/g, '""')}"`
  ]);
  return bom + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
}

/**
 * Unduh string CSV sebagai file lokal di browser
 */
export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
