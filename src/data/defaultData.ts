import { LineData, DashboardSummary } from '../types';

export const DATE_LABELS: string[] = [
  'Tgl 1', 'Tgl 2', 'Tgl 3', 'Tgl 4', 'Tgl 5', 'Tgl 6', 'Tgl 7',
  'Tgl 9', 'Tgl 10', 'Tgl 11', 'Tgl 13', 'Tgl 14', 'Tgl 15 (A)',
  'Tgl 15 (B)', 'Tgl 15 (C)', 'Tgl 15 (D)', 'Tgl 15 (E)', 'Tgl 16',
  'Tgl 17', 'Tgl 18', 'Tgl 20'
];

export const INITIAL_LINES_DATA: LineData[] = [];

export function computeSummary(lines: LineData[]): DashboardSummary {
  const totalActual = lines.reduce((acc, curr) => acc + (curr.actualRevenue || 0), 0);
  const totalTarget = lines.reduce((acc, curr) => acc + (curr.targetRevenue || 0), 0);
  const netVariance = totalActual - totalTarget;
  const overallVariancePercent = totalTarget > 0 ? (netVariance / totalTarget) * 100 : 0;
  const avgLineAchievement = lines.length > 0 
    ? lines.reduce((acc, curr) => acc + (curr.overallAchievement || 0), 0) / lines.length
    : 0;

  let sortedByAch = [...lines].filter(l => l.overallAchievement > 0).sort((a, b) => b.overallAchievement - a.overallAchievement);
  const bestLine = sortedByAch.length > 0 
    ? { lineId: sortedByAch[0].lineId, achievement: sortedByAch[0].overallAchievement }
    : { lineId: 0, achievement: 0 };
  const lowestLine = sortedByAch.length > 0 
    ? { lineId: sortedByAch[sortedByAch.length - 1].lineId, achievement: sortedByAch[sortedByAch.length - 1].overallAchievement }
    : { lineId: 0, achievement: 0 };

  let avgSmv = 0;
  if (lines.length > 0) {
    const allSmvs: number[] = [];
    lines.forEach(l => {
      l.daily?.forEach(d => {
        if (d.smvActual && d.smvActual > 0) allSmvs.push(d.smvActual);
      });
    });
    if (allSmvs.length > 0) {
      avgSmv = Number((allSmvs.reduce((a, b) => a + b, 0) / allSmvs.length).toFixed(2));
    }
  }

  return {
    totalActualRevenue: totalActual,
    totalTargetRevenue: totalTarget,
    netRevenueVariance: netVariance,
    overallVariancePercent,
    avgLineAchievement: Number(avgLineAchievement.toFixed(2)),
    avgSmv,
    activeLinesCount: lines.length,
    bestLine,
    lowestLine,
  };
}

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT (Code.gs) - PT TERATAI WIDJAJA
 * Integrasi Lengkap Google Spreadsheet dengan Dashboard SMV & Produksi
 * 
 * PETUNJUK PENERAPAN KILAT:
 * 1. Di Google Sheets Anda, buka menu "Extensions" (Ekstensi) > "Apps Script".
 * 2. Hapus semua teks bawaan, lalu tempel (paste) seluruh kode skrip ini.
 * 3. Klik tombol Simpan (ikon disket / Ctrl+S).
 * 4. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 5. Pilih tipe "Web app" (Aplikasi web) melalui ikon roda gigi di sebelah kiri.
 * 6. Set "Execute as" = "Me (email Anda)".
 * 7. Set "Who has access" = "Anyone" (Siapa saja).
 * 8. Klik "Deploy", izinkan akses Google jika diminta, lalu salin URL Web App (/exec).
 * 9. Tempelkan URL tersebut ke kolom "Tautkan Spreadsheet (.gs)" di aplikasi!
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'all';
    
    // Pastikan sheet standar tersedia
    ensureStandardSheets(ss);
    
    const response = {
      status: "success",
      timestamp: new Date().toISOString(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl()
    };
    
    if (action === 'recap' || action === 'all') {
      response.recapRecords = readRecapSheet(ss);
    }
    
    if (action === 'bank' || action === 'all') {
      response.bankModels = readBankDataSheet(ss);
    }
    
    if (action === 'matrix' || action === 'all') {
      response.rawData = readMatrixSheet(ss);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureStandardSheets(ss);
    
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Payload data tidak ditemukan");
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'syncRecap';
    let message = "Data berhasil disinkronkan";
    let count = 0;
    
    if (action === 'syncRecap' && payload.records) {
      count = writeRecapSheet(ss, payload.records);
      message = "Berhasil memperbarui " + count + " baris Rekap Harian di Google Sheet";
    } else if (action === 'syncBank' && payload.models) {
      count = writeBankDataSheet(ss, payload.models);
      message = "Berhasil memperbarui " + count + " data model Bank Data di Google Sheet";
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: message, count: count }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureStandardSheets(ss) {
  if (!ss.getSheetByName("REKAP PRODUKSI")) {
    const recapSheet = ss.insertSheet("REKAP PRODUKSI");
    const headers = [
      "Tanggal", "Line", "Nama Line", "Style", "Target Harian (pcs)", 
      "Aktual Harian (pcs)", "Target Akumulasi", "Aktual Akumulasi",
      "Operator (MP)", "Jam Kerja", "SMV Standar", "Efisiensi %", 
      "Defect %", "Tarif CM (Rp)", "Status", "Analisis Catatan"
    ];
    recapSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    recapSheet.getRange(1, 1, 1, headers.length).setBackground("#1a3478").setFontColor("#ffffff").setFontWeight("bold");
    recapSheet.setFrozenRows(1);
  }
  
  if (!ss.getSheetByName("BANK DATA")) {
    const bankSheet = ss.insertSheet("BANK DATA");
    const headers = [
      "Kode Style/Model", "Buyer", "SMV Standar (menit)", "Target Harian (pcs)",
      "Target Order (pcs)", "Standar Manpower", "Jam Kerja", "Tarif CM (Rp)",
      "Target Efisiensi %", "Deskripsi / Catatan"
    ];
    bankSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    bankSheet.getRange(1, 1, 1, headers.length).setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold");
    bankSheet.setFrozenRows(1);
  }
}

function readRecapSheet(ss) {
  const sheet = ss.getSheetByName("REKAP PRODUKSI") || ss.getSheetByName("REKAP BULANAN") || ss.getActiveSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const records = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] && !row[1] && !row[3]) continue;
    
    // Normalisasi tanggal YYYY-MM-DD
    let dateStr = "";
    if (row[0] instanceof Date) {
      dateStr = Utilities.formatDate(row[0], Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    } else {
      dateStr = String(row[0] || "").trim();
    }
    
    const lineNum = parseInt(String(row[1]).replace(/[^0-9]/g, ""), 10) || 1;
    const style = String(row[3] || row[2] || "").trim();
    if (!style && !dateStr) continue;
    
    records.push({
      id: "gs_" + (dateStr || "nodate") + "_L" + lineNum + "_" + i,
      date: dateStr,
      lineId: lineNum,
      lineName: "Line " + lineNum,
      style: style,
      targetDailyPcs: parseFloat(row[4]) || 0,
      actualDailyPcs: parseFloat(row[5]) || 0,
      targetOutputPcs: parseFloat(row[6]) || parseFloat(row[4]) || 0,
      actualOutputPcs: parseFloat(row[7]) || parseFloat(row[5]) || 0,
      manpower: parseInt(row[8], 10) || 36,
      workingHours: parseFloat(row[9]) || 8,
      smvStandard: parseFloat(row[10]) || 20,
      efficiencyPercent: parseFloat(row[11]) || 0,
      productivityPcsPerOp: (row[8] && parseFloat(row[8]) > 0) ? Number(((parseFloat(row[5]) || 0) / parseFloat(row[8])).toFixed(1)) : 0,
      defectPercent: parseFloat(row[12]) || 0,
      cmRate: parseFloat(row[13]) || 37000,
      analysisStatus: (parseFloat(row[11]) >= 70 ? 'optimal' : (parseFloat(row[11]) < 60 ? 'critical' : 'warning')),
      analysisNote: String(row[15] || row[14] || "Tersinkronisasi dari Google Sheet")
    });
  }
  return records;
}

function readBankDataSheet(ss) {
  const sheet = ss.getSheetByName("BANK DATA") || ss.getSheetByName("MASTER STYLE");
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const models = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const code = String(row[0] || "").trim();
    if (!code) continue;
    models.push({
      id: "gs_bank_" + i,
      modelCode: code,
      buyer: String(row[1] || "-").trim(),
      smvStandard: parseFloat(row[2]) || 20,
      targetDailyPcs: parseFloat(row[3]) || 500,
      targetTotalPcs: parseFloat(row[4]) || 5000,
      manpowerStandard: parseInt(row[5], 10) || 36,
      workingHoursStandard: parseFloat(row[6]) || 8,
      cmRate: parseFloat(row[7]) || 37000,
      targetEfficiency: parseFloat(row[8]) || 75,
      description: String(row[9] || "")
    });
  }
  return models;
}

function readMatrixSheet(ss) {
  const sheet = ss.getSheetByName("MATRIKS SMV") || ss.getSheetByName("REKAP BULANAN") || ss.getActiveSheet();
  return sheet.getDataRange().getValues();
}

function writeRecapSheet(ss, records) {
  const sheet = ss.getSheetByName("REKAP PRODUKSI") || ss.insertSheet("REKAP PRODUKSI");
  sheet.clearContents();
  
  const headers = [
    "Tanggal", "Line", "Nama Line", "Style", "Target Harian (pcs)", 
    "Aktual Harian (pcs)", "Target Akumulasi", "Aktual Akumulasi",
    "Operator (MP)", "Jam Kerja", "SMV Standar", "Efisiensi %", 
    "Defect %", "Tarif CM (Rp)", "Status", "Analisis Catatan"
  ];
  
  const rows = [headers];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    rows.push([
      r.date || "",
      r.lineId || 1,
      r.lineName || ("Line " + (r.lineId || 1)),
      r.style || "",
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
      r.analysisStatus || "optimal",
      r.analysisNote || ""
    ]);
  }
  
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#1a3478").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);
  return records.length;
}

function writeBankDataSheet(ss, models) {
  const sheet = ss.getSheetByName("BANK DATA") || ss.insertSheet("BANK DATA");
  sheet.clearContents();
  
  const headers = [
    "Kode Style/Model", "Buyer", "SMV Standar (menit)", "Target Harian (pcs)",
    "Target Order (pcs)", "Standar Manpower", "Jam Kerja", "Tarif CM (Rp)",
    "Target Efisiensi %", "Deskripsi / Catatan"
  ];
  
  const rows = [headers];
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    rows.push([
      m.modelCode || "",
      m.buyer || "",
      m.smvStandard || 0,
      m.targetDailyPcs || 0,
      m.targetTotalPcs || 0,
      m.manpowerStandard || 36,
      m.workingHoursStandard || 8,
      m.cmRate || 37000,
      m.targetEfficiency || 75,
      m.description || ""
    ]);
  }
  
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);
  return models.length;
}
`;
