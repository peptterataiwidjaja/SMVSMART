import React from 'react';
import { RepairDefectRecord, DefectBreakdown } from '../types';
import { formatPercent, formatIndonesianFullDate, formatIndonesianFullDateWithDay, formatMonthYearIndonesian } from '../utils/formatters';
import { CompanyLogo } from './CompanyLogo';

interface RepairDefectPdfTemplateProps {
  records: RepairDefectRecord[];
  selectedDate?: string; // YYYY-MM-DD or 'all'
  selectedMonth?: string; // YYYY-MM
  supervisorName?: string;
  peName?: string;
  fmName?: string;
  isBlackAndWhite?: boolean;
  selectedLineNames?: string[];
  showKpiSummary?: boolean;
  showSummaryCards?: boolean;
  showDefectBreakdown?: boolean;
  showRepairTable?: boolean;
  showSignatureSection?: boolean;
}

export const RepairDefectPdfTemplate: React.FC<RepairDefectPdfTemplateProps> = ({
  records,
  selectedDate = 'all',
  selectedMonth,
  supervisorName = '',
  peName = '',
  fmName = '',
  isBlackAndWhite = true,
  selectedLineNames = [],
  showKpiSummary = true,
  showSummaryCards,
  showDefectBreakdown = true,
  showRepairTable = true,
  showSignatureSection = true
}) => {
  const effectiveShowKpiSummary = showSummaryCards !== undefined ? showSummaryCards : showKpiSummary;
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Filter records based on selected date, month, and line names
  const displayedRecords = React.useMemo(() => {
    let list = records;
    if (selectedDate && selectedDate !== 'all') {
      list = list.filter(r => r.date === selectedDate);
    } else if (selectedMonth && selectedMonth !== 'all') {
      list = list.filter(r => r.date && r.date.startsWith(selectedMonth));
    }
    if (selectedLineNames && selectedLineNames.length > 0) {
      list = list.filter(r => selectedLineNames.includes(r.lineName));
    }
    return list;
  }, [records, selectedDate, selectedMonth, selectedLineNames]);

  // Aggregated totals
  const totalChecked = displayedRecords.reduce((acc, r) => acc + r.totalCheckedPcs, 0);
  const totalRepair = displayedRecords.reduce((acc, r) => acc + r.totalRepairPcs, 0);
  const overallRepairRate = totalChecked > 0 ? (totalRepair / totalChecked) * 100 : 0;
  const criticalRecords = displayedRecords.filter(r => r.repairPercent >= 10.0);

  // Defect breakdown aggregation
  const totalDefects: DefectBreakdown = displayedRecords.reduce(
    (acc, r) => {
      acc.brokenStitch += r.defects?.brokenStitch || 0;
      acc.puckering += r.defects?.puckering || 0;
      acc.brokenNeedle += r.defects?.brokenNeedle || 0;
      acc.oilStains += r.defects?.oilStains || 0;
      acc.shading += r.defects?.shading || 0;
      acc.measurementMismatch += r.defects?.measurementMismatch || 0;
      acc.openSeam += r.defects?.openSeam || 0;
      acc.other += r.defects?.other || 0;
      return acc;
    },
    {
      brokenStitch: 0,
      puckering: 0,
      brokenNeedle: 0,
      oilStains: 0,
      shading: 0,
      measurementMismatch: 0,
      openSeam: 0,
      other: 0
    }
  );

  const defectSummaryList = [
    { label: 'Jahitan Loncat / Putus', count: totalDefects.brokenStitch, key: 'brokenStitch' },
    { label: 'Jahitan Kerut (Puckering)', count: totalDefects.puckering, key: 'puckering' },
    { label: 'Jarum Patah / Tusukan', count: totalDefects.brokenNeedle, key: 'brokenNeedle' },
    { label: 'Noda Minyak Mesin', count: totalDefects.oilStains, key: 'oilStains' },
    { label: 'Belang Warna Kain (Shading)', count: totalDefects.shading, key: 'shading' },
    { label: 'Ukuran Tidak Sesuai Spek', count: totalDefects.measurementMismatch, key: 'measurementMismatch' },
    { label: 'Jahitan Terbuka / Lolos Obras', count: totalDefects.openSeam, key: 'openSeam' },
    { label: 'Cacat Lain-lain', count: totalDefects.other, key: 'other' }
  ].sort((a, b) => b.count - a.count);

  const totalCategorizedDefects = defectSummaryList.reduce((acc, d) => acc + d.count, 0);

  const isDailySpecific = selectedDate && selectedDate !== 'all';
  const subtitleDate = isDailySpecific
    ? `TANGGAL PEMERIKSAAN: ${formatIndonesianFullDateWithDay(selectedDate).toUpperCase()}`
    : selectedMonth
      ? `REKAPITULASI BULAN: ${formatMonthYearIndonesian(selectedMonth).toUpperCase()}`
      : 'REKAPITULASI KESELURUHAN DATA REPAIR';

  return (
    <div
      id="printable-repair-report"
      className={`p-6 sm:p-8 bg-white ${
        isBlackAndWhite ? 'text-black border-2 border-black' : 'text-slate-900 border border-slate-300'
      } rounded-lg w-full max-w-[1020px] mx-auto space-y-4 font-sans overflow-hidden`}
    >
      {/* Official Factory Header */}
      <div className={`pb-3 flex justify-between items-start ${
        isBlackAndWhite ? 'border-b-2 border-black' : 'border-b-2 border-slate-900'
      }`}>
        <div className="flex items-center space-x-3">
          <CompanyLogo size="lg" showSubtitle={true} monochrome={isBlackAndWhite} />
        </div>
        <div className="text-right text-xs">
          <div className={`inline-block border px-2.5 py-0.5 text-[10px] font-mono font-bold mb-1 ${
            isBlackAndWhite ? 'border-black bg-neutral-100 text-black' : 'border-slate-300 bg-slate-100 text-slate-800'
          }`}>
            FORMULIR KUALITAS SEWING • NO: TW/QC-PE/FRM-09 • REV: 02
          </div>
          <p className={`font-black text-sm tracking-wide uppercase ${
            isBlackAndWhite ? 'text-black' : 'text-[#1a3478]'
          }`}>
            LAPORAN REKAPITULASI REPAIR & DEFECT SEWING PER HARI
          </p>
          <p className="font-bold text-xs mt-0.5 text-neutral-800">{subtitleDate}</p>
          <p className="text-[11px] text-neutral-600">Tanggal Cetak: {printDate}</p>
          <p className="text-[10px] text-neutral-500 font-bold">
            Divisi Quality Control (QC) Sewing & Production Engineering (PE)
          </p>
        </div>
      </div>

      {/* Info bar of selected lines */}
      <div className={`px-3 py-1.5 flex flex-wrap justify-between items-center text-xs ${
        isBlackAndWhite 
          ? 'border border-black bg-neutral-100 text-black' 
          : 'border-l-4 border-amber-600 bg-amber-50/50 text-slate-800'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="font-extrabold uppercase text-[11px]">
            Lini/Bar Terpilih: <strong>{selectedLineNames.length > 0 ? selectedLineNames.join(', ') : 'Semua Lini'}</strong>
          </span>
        </div>
        <div className="text-[10px] font-bold">
          Total Baris Data: {displayedRecords.length} data
        </div>
      </div>

      {/* KPI Highlight & Threshold Banner */}
      {effectiveShowKpiSummary && (
        <div className={`grid grid-cols-4 gap-2.5 p-3 rounded border text-xs ${
          isBlackAndWhite ? 'border-black bg-white' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className={`pr-3 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
            <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Total Output Diperiksa</span>
            <span className="text-base font-black font-mono text-black block mt-0.5">
              {totalChecked.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-neutral-500">pcs</span>
            </span>
            <span className="text-[9.5px] text-neutral-500">Total garmen diaudit QC</span>
          </div>

          <div className={`pr-3 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
            <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Total Garmen Cacat</span>
            <span className="text-base font-black font-mono text-black block mt-0.5">
              {totalRepair.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-neutral-500">pcs</span>
            </span>
            <span className="text-[9.5px] text-neutral-500">Pakaian perlu repair</span>
          </div>

          <div className={`pr-3 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
            <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Rata-Rata Tingkat Repair</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-base font-black font-mono text-black">
                {formatPercent(overallRepairRate)}
              </span>
              <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase border ${
                isBlackAndWhite 
                  ? 'border-black bg-neutral-200 text-black' 
                  : (overallRepairRate >= 10.0 ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800')
              }`}>
                [{overallRepairRate >= 10.0 ? 'KRITIS' : overallRepairRate > 3.0 ? 'PERHATIAN' : 'NORMAL'}]
              </span>
            </div>
            <span className="text-[9.5px] text-neutral-500">Toleransi standar: ≤ 3.0%</span>
          </div>

          <div>
            <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Lini Kritis (≥10%)</span>
            <span className="text-base font-black font-mono block mt-0.5 text-black">
              {criticalRecords.length} <span className="text-[10px] font-normal text-neutral-500">dari {displayedRecords.length} lini</span>
            </span>
            <span className="text-[9.5px] text-neutral-500">
              {criticalRecords.length > 0 ? 'Wajib tindakan perbaikan' : 'Semua dalam batas aman'}
            </span>
          </div>
        </div>
      )}

      {/* Main Daily Recapitulation Table */}
      {showRepairTable && (
        <div className={`border rounded overflow-hidden ${isBlackAndWhite ? 'border-black' : 'border-slate-300'}`}>
          <div className={`px-3 py-1.5 flex items-center justify-between text-xs ${
            isBlackAndWhite ? 'bg-black text-white' : 'bg-[#1a3478] text-white'
          }`}>
            <span className="text-xs font-black uppercase tracking-wider">
              Tabel Rekapitulasi Data Repair & Pemeriksaan Kualitas Sewing per Line
            </span>
            <span className="text-[11px] font-medium font-mono">
              {displayedRecords.length} Lini Tercatat
            </span>
          </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase">
              <th className="p-2 text-center w-8 border-r border-slate-200">No</th>
              <th className="p-2 text-center w-16 border-r border-slate-200">Line</th>
              <th className="p-2 text-center w-20 border-r border-slate-200">Tanggal</th>
              <th className="p-2 border-r border-slate-200">Model / Style</th>
              <th className="p-2 text-right w-20 border-r border-slate-200">Diperiksa (Pcs)</th>
              <th className="p-2 text-right w-20 border-r border-slate-200">Repair (Pcs)</th>
              <th className="p-2 text-right w-20 border-r border-slate-200">% Repair</th>
              <th className="p-2 text-center w-24 border-r border-slate-200">Status Kualitas</th>
              <th className="p-2 border-r border-slate-200">Jenis Defect Dominan</th>
              <th className="p-2">Tindakan Korektif Segera</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                  Tidak ada catatan data repair/defect sewing pada tanggal / periode yang dipilih.
                </td>
              </tr>
            ) : (
              displayedRecords.map((r, idx) => {
                const isCritical = r.repairPercent >= 10.0;
                
                // Get top defects for this line
                const defectList = [
                  { label: 'Jahitan Loncat', count: r.defects?.brokenStitch || 0 },
                  { label: 'Kerut (Puckering)', count: r.defects?.puckering || 0 },
                  { label: 'Jarum Patah', count: r.defects?.brokenNeedle || 0 },
                  { label: 'Noda Minyak', count: r.defects?.oilStains || 0 },
                  { label: 'Belang Warna', count: r.defects?.shading || 0 },
                  { label: 'Ukuran Spek', count: r.defects?.measurementMismatch || 0 },
                  { label: 'Jahitan Terbuka', count: r.defects?.openSeam || 0 },
                  { label: 'Lain-lain', count: r.defects?.other || 0 }
                ].filter(d => d.count > 0).sort((a, b) => b.count - a.count);

                const topDefectsStr = defectList.length > 0
                  ? defectList.slice(0, 2).map(d => `${d.label} (${d.count})`).join(', ')
                  : '-';

                return (
                  <tr
                    key={r.id || idx}
                    className={`transition-colors text-[11px] ${
                      isCritical ? 'bg-red-50/70 text-slate-900 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 font-black text-slate-900 font-mono">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        isCritical ? 'bg-red-600 text-white font-bold' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {r.lineName}
                      </span>
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-600">
                      {formatDate(r.date)}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                      {r.style}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono text-slate-800">
                      {r.totalCheckedPcs.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono font-bold">
                      <span className={isCritical ? 'text-red-700' : 'text-slate-900'}>
                        {r.totalRepairPcs.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono font-black">
                      <span className={isCritical ? 'text-red-700 text-xs' : r.repairPercent > 5 ? 'text-amber-600' : 'text-blue-700'}>
                        {r.repairPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-2 text-center border-r border-slate-200">
                      {isCritical ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider block">
                          KRITIS (≥10%)
                        </span>
                      ) : r.repairPercent > 3.0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider block">
                          PERHATIAN
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider block">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-[10px] text-slate-700">
                      {topDefectsStr}
                    </td>
                    <td className="p-2 text-[10px] text-slate-700">
                      {r.fishbone?.correctiveAction || r.notes || 'Penyesuaian setting mesin jahit dan pengawasan operator.'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Summary Row */}
          {displayedRecords.length > 0 && (
            <tfoot>
              <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400 text-xs">
                <td colSpan={4} className="p-2 text-center uppercase tracking-wider border-r border-slate-300">
                  TOTAL AKUMULASI REKAPITULASI HARIAN
                </td>
                <td className="p-2 text-right font-mono border-r border-slate-300">
                  {totalChecked.toLocaleString('id-ID')} pcs
                </td>
                <td className="p-2 text-right font-mono text-red-700 font-black border-r border-slate-300">
                  {totalRepair.toLocaleString('id-ID')} pcs
                </td>
                <td className="p-2 text-right font-mono font-black text-xs border-r border-slate-300">
                  <span className={overallRepairRate >= 10 ? 'text-red-700' : 'text-blue-800'}>
                    {formatPercent(overallRepairRate)}
                  </span>
                </td>
                <td colSpan={3} className="p-2 text-[10px] text-slate-600">
                  {criticalRecords.length > 0 
                    ? `Perhatian: Ditemukan ${criticalRecords.length} lini dengan tingkat cacat ≥ 10.0% yang membutuhkan eskalasi ke PE & QC.`
                    : 'Seluruh lini sewing berada dalam parameter batas kendali mutu pabrik.'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}

      {/* Two-Column Pareto Defect Analysis & Corrective Actions Highlights */}
      {showDefectBreakdown && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Column 1: Pareto Rincian Jenis Cacat */}
          <div className={`border rounded-lg p-3 ${isBlackAndWhite ? 'border-black bg-white' : 'border-slate-300 bg-slate-50/50'}`}>
            <div className={`flex items-center justify-between border-b pb-1.5 mb-2 ${isBlackAndWhite ? 'border-black' : 'border-slate-200'}`}>
              <span className="font-extrabold uppercase text-[11px]">
                Distribusi 8 Jenis Cacat Sewing (Defect Breakdown)
              </span>
              <span className="font-mono text-[10px]">
                Total Defect: {totalCategorizedDefects.toLocaleString('id-ID')} pcs
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {defectSummaryList.map((item, idx) => {
                const pct = totalCategorizedDefects > 0 ? (item.count / totalCategorizedDefects) * 100 : 0;
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="truncate pr-2">
                      {idx + 1}. {item.label}
                    </span>
                    <div className="flex items-center space-x-2 shrink-0 font-mono">
                      <span className="font-bold">{item.count} pcs</span>
                      <span className="text-[10px] text-neutral-500 w-12 text-right">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Highlights Akar Masalah & Tindakan Korektif (CAPA) */}
          <div className={`border rounded-lg p-3 ${isBlackAndWhite ? 'border-black bg-white' : 'border-slate-300 bg-slate-50/50'}`}>
            <div className={`border-b pb-1.5 mb-2 flex items-center justify-between ${isBlackAndWhite ? 'border-black' : 'border-slate-200'}`}>
              <span className="font-extrabold uppercase text-[11px]">
                Tindakan Korektif & Pencegahan (CAPA) Lini Prioritas
              </span>
              <span className={`px-2 py-0.5 font-mono text-[9px] font-bold rounded border ${
                isBlackAndWhite ? 'border-black bg-neutral-200 text-black' : 'bg-red-100 text-red-800'
              }`}>
                Ambang Kritis ≥ 10.0%
              </span>
            </div>

            <div className="space-y-2 text-[10px] leading-relaxed">
              {criticalRecords.length > 0 ? (
                criticalRecords.slice(0, 2).map(cr => (
                  <div key={cr.id} className={`p-2 rounded border ${isBlackAndWhite ? 'border-black bg-neutral-50' : 'border-red-200 bg-red-50/60'}`}>
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span>{cr.lineName} • {cr.style}</span>
                      <span className="font-mono">{cr.repairPercent.toFixed(1)}% Repair</span>
                    </div>
                    <p><strong>Akar Masalah:</strong> {cr.fishbone?.primaryRootCause || 'Kombinasi ketidaksesuaian jarum dan ketegangan benang.'}</p>
                    <p><strong>Perbaikan Segera:</strong> {cr.fishbone?.correctiveAction || 'Kalibrasi tegangan dan ganti jarum baru.'}</p>
                    <p><strong>Pencegahan (Preventive):</strong> {cr.fishbone?.preventiveAction || 'Pemeriksaan in-line berkala setiap 2 jam.'}</p>
                  </div>
                ))
              ) : (
                <div className={`p-2 rounded border ${isBlackAndWhite ? 'border-black bg-neutral-50' : 'border-emerald-200 bg-emerald-50/60 text-emerald-900'}`}>
                  <p className="font-bold">Kualitas Terkendali dengan Baik</p>
                  <p className="mt-0.5">
                    Seluruh lini sewing berada di bawah ambang batas kritis 10.0%. Pertahankan pemeliharaan berkala
                    mesin jahit dan kepatuhan SOP perakitan pola garment.
                  </p>
                </div>
              )}
              <p className="text-[9px] text-neutral-500 italic mt-1">
                *Tindakan perbaikan dikoordinasikan bersama antara QC Inspector, Supervisor Sewing, dan Production Engineer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Official Signatures Section (3 Pejabat Penandatangan) */}
      {showSignatureSection && (
        <div className={`border-t-2 pt-4 mt-6 ${isBlackAndWhite ? 'border-black' : 'border-slate-900'}`}>
          <div className="text-center mb-3">
            <p className="text-[11px] uppercase font-black tracking-wider">
              LEMBAR PENGESAHAN LAPORAN KUALITAS & REPAIR SEWING PT TERATAI WIDJAJA
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            {/* Signatory 1 */}
            <div className={`space-y-1 p-2.5 rounded border ${isBlackAndWhite ? 'border-black bg-white' : 'border-transparent'}`}>
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Dibuat & Diperiksa Oleh:</p>
              <p className="font-extrabold text-[11px]">QC INSPECTOR / SPV SEWING</p>
              <div className="h-14 flex items-end justify-center">
                {supervisorName ? (
                  <span className="font-bold underline">{supervisorName}</span>
                ) : (
                  <span className="text-neutral-400 font-mono">( ............................................ )</span>
                )}
              </div>
              <p className="text-[9px] text-neutral-400">Tanggal: ..... / ..... / 2026</p>
            </div>

            {/* Signatory 2 */}
            <div className={`space-y-1 p-2.5 rounded border ${isBlackAndWhite ? 'border-black bg-white' : 'border-transparent'}`}>
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Dianalisis & Diverifikasi:</p>
              <p className={`font-extrabold text-[11px] ${isBlackAndWhite ? 'text-black' : 'text-blue-900'}`}>PRODUCTION ENGINEER (PE)</p>
              <div className="h-14 flex items-end justify-center">
                {peName ? (
                  <span className="font-bold underline">{peName}</span>
                ) : (
                  <span className="text-neutral-400 font-mono">( ............................................ )</span>
                )}
              </div>
              <p className="text-[9px] text-neutral-400">Tanggal: ..... / ..... / 2026</p>
            </div>

            {/* Signatory 3 */}
            <div className={`space-y-1 p-2.5 rounded border ${isBlackAndWhite ? 'border-black bg-white' : 'border-transparent'}`}>
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Disetujui Oleh:</p>
              <p className={`font-extrabold text-[11px] ${isBlackAndWhite ? 'text-black' : 'text-[#1a3478]'}`}>FACTORY MANAGER (FM)</p>
              <div className="h-14 flex items-end justify-center">
                {fmName ? (
                  <span className="font-bold underline">{fmName}</span>
                ) : (
                  <span className="text-neutral-400 font-mono">( ............................................ )</span>
                )}
              </div>
              <p className="text-[9px] text-neutral-400">Tanggal: ..... / ..... / 2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
