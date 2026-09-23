import React from 'react';
import { LineData, DashboardSummary, MonthlyProductivityRecord, LineIncident } from '../types';
import { formatPercent, formatMonthYearIndonesian } from '../utils/formatters';
import { CompanyLogo } from './CompanyLogo';

export interface PdfReportTemplateProps {
  lines: LineData[];
  summary: DashboardSummary;
  monthlyRecap?: MonthlyProductivityRecord[];
  incidents?: LineIncident[];
  reportTitle?: string;
  reportMode?: 'daily' | 'monthly' | 'incidents';
  selectedDate?: string;
  selectedMonth?: string;
  supervisorName?: string;
  peName?: string;
  fmName?: string;
  isBlackAndWhite?: boolean;
  selectedLineNames?: string[];
  showKpiSummary?: boolean;
  showProductionTable?: boolean;
  showCapaSection?: boolean;
  showSignatureSection?: boolean;
  isSimplified?: boolean;
}

export const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({ 
  lines, 
  summary,
  monthlyRecap = [],
  incidents = [],
  reportTitle,
  reportMode = 'daily',
  selectedDate,
  selectedMonth,
  supervisorName = '',
  peName = '',
  fmName = '',
  isBlackAndWhite = true,
  selectedLineNames = [],
  showKpiSummary = true,
  showProductionTable = true,
  showCapaSection = true,
  showSignatureSection = true,
  isSimplified = true
}) => {
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

  // Filter records based on selected date/month AND selected line names ("bar")
  const displayedRecap = React.useMemo(() => {
    let list = monthlyRecap;
    if (reportMode === 'daily' && selectedDate && selectedDate !== 'all') {
      list = list.filter(r => r.date === selectedDate);
    } else if (selectedMonth && selectedMonth !== 'all') {
      list = list.filter(r => r.date && r.date.startsWith(selectedMonth));
    }
    if (selectedLineNames && selectedLineNames.length > 0) {
      list = list.filter(r => selectedLineNames.includes(r.lineName));
    }
    return list;
  }, [monthlyRecap, reportMode, selectedDate, selectedMonth, selectedLineNames]);

  // Incidents filtered by date/month and selected lines
  const relevantIncidents = React.useMemo(() => {
    let list = incidents;
    if (reportMode === 'daily' && selectedDate && selectedDate !== 'all') {
      list = list.filter(inc => inc.date === selectedDate);
    } else if (selectedMonth && selectedMonth !== 'all') {
      list = list.filter(inc => inc.date && inc.date.startsWith(selectedMonth));
    }
    if (selectedLineNames && selectedLineNames.length > 0) {
      list = list.filter(inc => selectedLineNames.includes(inc.lineName));
    }
    return list;
  }, [incidents, reportMode, selectedDate, selectedMonth, selectedLineNames]);

  // Aggregate stats for displayed records
  const totalTargetDaily = displayedRecap.reduce((acc, r) => acc + (r.targetDailyPcs || r.targetOutputPcs || 0), 0);
  const totalActualDaily = displayedRecap.reduce((acc, r) => acc + (r.actualDailyPcs || r.actualOutputPcs || 0), 0);
  const totalVariance = totalActualDaily - totalTargetDaily;
  const achievementRate = totalTargetDaily > 0 ? (totalActualDaily / totalTargetDaily) * 100 : 0;
  const avgEfficiency = displayedRecap.length > 0
    ? displayedRecap.reduce((acc, r) => acc + r.efficiencyPercent, 0) / displayedRecap.length
    : 0;
  const avgDefect = displayedRecap.length > 0
    ? displayedRecap.reduce((acc, r) => acc + r.defectPercent, 0) / displayedRecap.length
    : 0;

  // Indonesian Month-Year Label (e.g., "September 2026")
  const formattedMonth = selectedMonth ? formatMonthYearIndonesian(selectedMonth) : '';
  const monthUpper = formattedMonth ? formattedMonth.toUpperCase() : '';

  // Title calculation - clean, professional, concise
  const calculatedTitle = reportTitle || (
    reportMode === 'daily'
      ? (selectedDate && selectedDate !== 'all'
          ? `LAPORAN KONTROL PRODUKSI SEWING - TGL ${formatDate(selectedDate)}`
          : `LAPORAN KONTROL PRODUKSI SEWING ${monthUpper ? `- BULAN ${monthUpper}` : ''}`)
      : `LAPORAN REKAPITULASI PRODUKSI BULANAN SEWING ${monthUpper ? `- BULAN ${monthUpper}` : ''}`
  );

  return (
    <div 
      id="printable-pdf-report" 
      className={`p-6 sm:p-8 bg-white ${
        isBlackAndWhite ? 'text-black border-2 border-black' : 'text-slate-900 border border-slate-300'
      } rounded-lg w-full max-w-[1020px] mx-auto space-y-4 font-sans overflow-hidden`}
    >
      {/* 1. KOP SURAT / DOKUMEN HEADER */}
      <div className={`pb-3 flex justify-between items-start ${
        isBlackAndWhite ? 'border-b-2 border-black' : 'border-b-2 border-slate-900'
      }`}>
        <div className="flex items-center space-x-3">
          <CompanyLogo size="lg" showSubtitle={true} monochrome={isBlackAndWhite} />
        </div>
        <div className="text-right text-xs">
          <div className={`inline-block border px-2 py-0.5 text-[10px] font-mono font-bold mb-1 ${
            isBlackAndWhite ? 'border-black bg-neutral-100 text-black' : 'border-slate-300 bg-slate-100 text-slate-700'
          }`}>
            No. Dok: TW/PRD-PE/FRM-{reportMode === 'daily' ? '08-D' : '08-M'} • Rev: 03
          </div>
          <h1 className={`font-black text-sm tracking-wide uppercase ${
            isBlackAndWhite ? 'text-black' : 'text-[#1a3478]'
          }`}>
            {calculatedTitle}
          </h1>
          <p className="text-[11px] text-neutral-600 font-medium mt-0.5">
            Divisi Industrial Engineering (IE) & Sewing Quality Control
          </p>
          <p className="text-[10px] text-neutral-500">
            Dicetak: {printDate}
          </p>
        </div>
      </div>

      {/* 2. SUBHEADER: RINGKASAN INFO PARAMETER & FILTER BAR */}
      <div className={`px-3 py-1.5 flex flex-wrap justify-between items-center text-xs ${
        isBlackAndWhite 
          ? 'border border-black bg-neutral-100 text-black' 
          : 'border-l-4 border-red-600 bg-slate-50 text-slate-800'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="font-extrabold uppercase text-[11px]">
            {reportMode === 'daily'
              ? (selectedDate && selectedDate !== 'all' ? `Tanggal: ${formatDate(selectedDate)}` : `Periode: ${formattedMonth || 'Semua Data'}`)
              : `Periode Rekap: ${formattedMonth || 'Semua Data'}`}
          </span>
          <span className="text-neutral-400">|</span>
          <span className="text-[11px]">
            Lini/Bar Terpilih: <strong>{selectedLineNames.length > 0 ? selectedLineNames.join(', ') : 'Semua Lini (Line 1 - Line 9)'}</strong>
          </span>
        </div>
        <div className="text-[10px] font-bold">
          Total Baris Data: {displayedRecap.length} data
        </div>
      </div>

      {/* 3. BAR RINGKASAN KPI (Bisa Dipilih / Diaktifkan) */}
      {showKpiSummary && (
        <div className="grid grid-cols-4 gap-2.5">
          {/* Card 1: Output & Target */}
          <div className={`p-2.5 bg-white border ${
            isBlackAndWhite ? 'border-black' : 'border-slate-300'
          } rounded`}>
            <span className="text-[9.5px] uppercase font-bold text-neutral-600 block">
              {reportMode === 'daily' ? 'Total Output Aktual' : 'Output Terpenuhi'}
            </span>
            <span className="text-sm sm:text-base font-black text-black block mt-0.5 font-mono">
              {totalActualDaily.toLocaleString('id-ID')} pcs
            </span>
            <span className="text-[9.5px] text-neutral-500">
              Target: {totalTargetDaily.toLocaleString('id-ID')} pcs
            </span>
          </div>

          {/* Card 2: Variansi */}
          <div className={`p-2.5 bg-white border ${
            isBlackAndWhite ? 'border-black' : 'border-slate-300'
          } rounded`}>
            <span className="text-[9.5px] uppercase font-bold text-neutral-600 block">Variansi Output</span>
            <span className={`text-sm sm:text-base font-black block mt-0.5 font-mono ${
              isBlackAndWhite 
                ? 'text-black' 
                : totalVariance >= 0 ? 'text-blue-700' : 'text-red-600'
            }`}>
              {totalVariance >= 0 ? `+${totalVariance.toLocaleString('id-ID')}` : `${totalVariance.toLocaleString('id-ID')}`} pcs
            </span>
            <span className="text-[9.5px] text-neutral-500">
              Pencapaian: {achievementRate.toFixed(1)}%
            </span>
          </div>

          {/* Card 3: Efisiensi */}
          <div className={`p-2.5 bg-white border ${
            isBlackAndWhite ? 'border-black' : 'border-slate-300'
          } rounded`}>
            <span className="text-[9.5px] uppercase font-bold text-neutral-600 block">Rata-Rata Efisiensi</span>
            <span className={`text-sm sm:text-base font-black block mt-0.5 font-mono ${
              isBlackAndWhite 
                ? 'text-black' 
                : avgEfficiency >= 75 ? 'text-blue-700' : 'text-amber-600'
            }`}>
              {formatPercent(avgEfficiency)}
            </span>
            <span className="text-[9.5px] text-neutral-500">
              Standar Acuan: ≥75,00%
            </span>
          </div>

          {/* Card 4: Defect */}
          <div className={`p-2.5 bg-white border ${
            isBlackAndWhite ? 'border-black' : 'border-slate-300'
          } rounded`}>
            <span className="text-[9.5px] uppercase font-bold text-neutral-600 block">Tingkat Defect</span>
            <span className={`text-sm sm:text-base font-black block mt-0.5 font-mono ${
              isBlackAndWhite 
                ? 'text-black' 
                : avgDefect <= 2.0 ? 'text-blue-700' : 'text-red-600'
            }`}>
              {formatPercent(avgDefect)}
            </span>
            <span className="text-[9.5px] text-neutral-500">
              Maksimal Toleransi: ≤2,00%
            </span>
          </div>
        </div>
      )}

      {/* 4. BAR TABEL DATA PRODUKSI SEWING */}
      {showProductionTable && (
        <div className="space-y-1.5">
          <div className={`flex items-center justify-between pb-1 ${
            isBlackAndWhite ? 'border-b border-black' : 'border-b border-slate-300'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-black">
              1. TABEL DATA PRODUKSI & KONTROL OUTPUT SEWING
            </h3>
            <span className="text-[10px] text-neutral-600">
              {displayedRecap.length} Lini/Baris Ditampilkan
            </span>
          </div>

          <div className={`w-full overflow-hidden border ${
            isBlackAndWhite ? 'border-black' : 'border-slate-300'
          }`}>
            <table className="w-full text-left text-[11px] border-collapse table-fixed">
              <thead>
                <tr className={`${
                  isBlackAndWhite ? 'bg-neutral-200 text-black border-b-2 border-black' : 'bg-slate-100 text-slate-800 border-b border-slate-300'
                } font-black`}>
                  <th className="p-1.5 border-r border-black text-center w-[7%]">Line</th>
                  <th className="p-1.5 border-r border-black text-center w-[10%]">Tanggal</th>
                  <th className="p-1.5 border-r border-black w-[15%]">Model / Style</th>
                  <th className="p-1.5 border-r border-black text-right w-[9%]">Target</th>
                  <th className="p-1.5 border-r border-black text-right w-[9%]">Aktual</th>
                  <th className="p-1.5 border-r border-black text-right w-[9%]">Deviasi</th>
                  <th className="p-1.5 border-r border-black text-center w-[5%]">MP</th>
                  <th className="p-1.5 border-r border-black text-right w-[7%]">SMV</th>
                  <th className="p-1.5 border-r border-black text-right w-[8%]">Efisiensi</th>
                  <th className="p-1.5 border-r border-black text-right w-[7%]">Defect</th>
                  <th className="p-1.5 text-left w-[14%]">Keterangan / Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecap.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-neutral-500 font-medium">
                      Tidak ada data produksi untuk kombinasi filter dan lini yang dipilih.
                    </td>
                  </tr>
                ) : (
                  displayedRecap.map((r, idx) => {
                    const targetDaily = r.targetDailyPcs || r.targetOutputPcs || 0;
                    const actualDaily = r.actualDailyPcs || r.actualOutputPcs || 0;
                    const deviasi = actualDaily - targetDaily;
                    const isEven = idx % 2 === 1;

                    return (
                      <tr 
                        key={r.id} 
                        className={`border-b ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} ${
                          isEven ? (isBlackAndWhite ? 'bg-neutral-50' : 'bg-slate-50/40') : 'bg-white'
                        }`}
                      >
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-center font-bold text-black`}>
                          {r.lineName}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-center text-neutral-800 whitespace-nowrap`}>
                          {formatDate(r.date)}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} font-bold text-black truncate`} title={r.style}>
                          {r.style}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono`}>
                          {targetDaily.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono font-black text-black`}>
                          {actualDaily.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono font-bold ${
                          isBlackAndWhite 
                            ? 'text-black' 
                            : deviasi >= 0 ? 'text-blue-700' : 'text-red-600'
                        }`}>
                          {deviasi >= 0 ? `+${deviasi}` : deviasi}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-center font-mono`}>
                          {r.manpower}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono`}>
                          {r.smvStandard}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono font-bold ${
                          isBlackAndWhite 
                            ? 'text-black' 
                            : r.efficiencyPercent >= 75 ? 'text-blue-700' : 'text-red-600'
                        }`}>
                          {formatPercent(r.efficiencyPercent)}
                        </td>
                        <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-400' : 'border-slate-200'} text-right font-mono font-bold ${
                          isBlackAndWhite 
                            ? 'text-black' 
                            : r.defectPercent >= 2.0 ? 'text-red-600' : 'text-black'
                        }`}>
                          {formatPercent(r.defectPercent)}
                        </td>
                        <td className="p-1.5 text-[10px] text-neutral-800 leading-tight">
                          <span className="font-bold">
                            [{r.analysisStatus ? r.analysisStatus.toUpperCase() : 'OPTIMAL'}]
                          </span>{' '}
                          {r.analysisNote || r.note || 'Terkendali.'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className={`${
                  isBlackAndWhite ? 'bg-neutral-200 border-t-2 border-black text-black' : 'bg-slate-100 border-t-2 border-slate-400 text-slate-900'
                } font-black`}>
                  <td colSpan={3} className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-center uppercase text-[10px]`}>
                    TOTAL / RATA-RATA ({displayedRecap.length} LINI)
                  </td>
                  <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-right font-mono`}>
                    {totalTargetDaily.toLocaleString('id-ID')}
                  </td>
                  <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-right font-mono font-black`}>
                    {totalActualDaily.toLocaleString('id-ID')}
                  </td>
                  <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-right font-mono font-black`}>
                    {totalVariance >= 0 ? `+${totalVariance.toLocaleString('id-ID')}` : `${totalVariance.toLocaleString('id-ID')}`}
                  </td>
                  <td colSpan={2} className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'}`}></td>
                  <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-right font-mono font-black`}>
                    {formatPercent(avgEfficiency)}
                  </td>
                  <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-black' : 'border-slate-300'} text-right font-mono font-black`}>
                    {formatPercent(avgDefect)}
                  </td>
                  <td className="p-1.5 text-[9.5px] text-neutral-600">
                    Capaian: {achievementRate.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5. BAR ANALISIS MASALAH & CAPA (Bisa Dipilih / Diaktifkan) */}
      {showCapaSection && (
        <div className={`p-3 border ${
          isBlackAndWhite ? 'border-black bg-white' : 'border-red-200 bg-red-50/30'
        } rounded space-y-2`}>
          <div className={`flex items-center justify-between pb-1 ${
            isBlackAndWhite ? 'border-b border-black' : 'border-b border-red-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-black">
              2. ANALISIS HAMBATAN / BOTTLENECK & TINDAKAN PENYELESAIAN (CAPA)
            </h3>
            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 border ${
              isBlackAndWhite ? 'border-black bg-neutral-100 text-black' : 'border-red-400 bg-red-100 text-red-800'
            }`}>
              Tindakan Korektif & Preventif
            </span>
          </div>

          {relevantIncidents.length === 0 ? (
            <div className="py-2 text-center text-xs text-neutral-600 font-medium">
              ✓ Seluruh lini beroperasi on-track. Tidak terdapat hambatan kritis pada baris/lini yang dipilih.
            </div>
          ) : (
            <div className={`w-full overflow-hidden border ${
              isBlackAndWhite ? 'border-black' : 'border-slate-300'
            }`}>
              <table className="w-full text-left text-[11px] border-collapse table-fixed bg-white">
                <thead>
                  <tr className={`${
                    isBlackAndWhite ? 'bg-neutral-200 text-black border-b border-black' : 'bg-red-100/70 text-red-950 border-b border-red-200'
                  } font-black`}>
                    <th className="p-1.5 border-r border-black text-center w-[8%]">Line</th>
                    <th className="p-1.5 border-r border-black w-[15%]">Model / Style</th>
                    <th className="p-1.5 border-r border-black w-[32%]">Akar Masalah (Root Cause)</th>
                    <th className="p-1.5 border-r border-black w-[32%]">Tindakan Penyelesaian (Action Plan)</th>
                    <th className="p-1.5 text-center w-[13%]">PIC & Target</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantIncidents.map(inc => (
                    <tr key={inc.id} className={`border-b ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
                      <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'} text-center font-bold text-black`}>
                        {inc.lineName}
                        <span className="block text-[8.5px] font-bold uppercase">
                          [{inc.severity === 'critical' ? 'BOTTLENECK' : 'WARNING'}]
                        </span>
                      </td>
                      <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'} font-bold text-black text-[10px]`}>
                        {inc.style}
                        {inc.deficitPcs ? (
                          <span className="block text-[9px] font-mono text-neutral-700">
                            Defisit: -{inc.deficitPcs} pcs
                          </span>
                        ) : null}
                      </td>
                      <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'} text-[10px] text-neutral-800 leading-tight`}>
                        <p className="font-bold text-black">{inc.title}</p>
                        <p className="text-neutral-600">{inc.rootCause}</p>
                      </td>
                      <td className={`p-1.5 border-r ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'} text-[10px] text-neutral-800 leading-tight`}>
                        <p className="font-bold text-black">Tindakan: {inc.correctiveAction}</p>
                        {inc.preventiveAction && (
                          <p className="text-neutral-600">Pencegahan: {inc.preventiveAction}</p>
                        )}
                      </td>
                      <td className="p-1.5 text-center text-[10px]">
                        <span className="font-bold text-black block">{inc.pic}</span>
                        <span className="text-[9px] text-neutral-500 block">{inc.targetResolutionTime}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. BAR LEMBAR PENGESAHAN TANDA TANGAN (Bisa Dipilih / Diaktifkan) */}
      {showSignatureSection && (
        <div className={`pt-2 ${isBlackAndWhite ? 'border-t-2 border-black' : 'border-t-2 border-slate-800'}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-black text-xs text-black uppercase tracking-wide">
              LEMBAR PENGESAHAN LAPORAN PRODUKSI SEWING
            </p>
            <p className="text-[10px] text-neutral-500">
              *Tanda tangan basah atau pengesahan pejabat berwenang
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {/* Kolom 1: Supervisor */}
            <div className={`p-2.5 border ${
              isBlackAndWhite ? 'border-black bg-white' : 'border-slate-300 bg-slate-50'
            } rounded flex flex-col justify-between h-36`}>
              <div>
                <p className="text-[9.5px] font-bold text-neutral-600 uppercase">1. Dibuat Oleh:</p>
                <p className="font-black text-black text-xs mt-0.5">Supervisor Sewing / Chief Line</p>
              </div>
              <div className="text-center pt-2">
                <div className={`w-36 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
                <p className="font-bold text-black text-xs mt-1">
                  {supervisorName || '( ......................................... )'}
                </p>
                <p className="text-[9.5px] text-neutral-500">Chief Sewing Line • Tgl: {printDate}</p>
              </div>
            </div>

            {/* Kolom 2: PE */}
            <div className={`p-2.5 border ${
              isBlackAndWhite ? 'border-black bg-white' : 'border-blue-200 bg-blue-50/50'
            } rounded flex flex-col justify-between h-36`}>
              <div>
                <p className="text-[9.5px] font-bold text-neutral-600 uppercase">2. Diverifikasi Oleh:</p>
                <p className="font-black text-black text-xs mt-0.5">Production Engineer (PE)</p>
              </div>
              <div className="text-center pt-2">
                <div className={`w-36 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
                <p className="font-bold text-black text-xs mt-1">
                  {peName || '( ......................................... )'}
                </p>
                <p className="text-[9.5px] text-neutral-500">Production Engineer • Tgl: {printDate}</p>
              </div>
            </div>

            {/* Kolom 3: FM */}
            <div className={`p-2.5 border ${
              isBlackAndWhite ? 'border-black bg-white' : 'border-emerald-200 bg-emerald-50/50'
            } rounded flex flex-col justify-between h-36`}>
              <div>
                <p className="text-[9.5px] font-bold text-neutral-600 uppercase">3. Disetujui Oleh:</p>
                <p className="font-black text-black text-xs mt-0.5">Factory Manager (FM)</p>
              </div>
              <div className="text-center pt-2">
                <div className={`w-36 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
                <p className="font-bold text-black text-xs mt-1">
                  {fmName || '( ......................................... )'}
                </p>
                <p className="text-[9.5px] text-neutral-500">Factory Manager • Tgl: {printDate}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
