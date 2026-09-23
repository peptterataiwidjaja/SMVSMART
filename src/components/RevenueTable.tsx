import React from 'react';
import { LineData, DashboardSummary } from '../types';
import { formatRupiah, formatPercent, formatMonthYearIndonesian } from '../utils/formatters';
import { DollarSign, ArrowUpRight, ArrowDownRight, Tag, Percent, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';

interface RevenueTableProps {
  lines: LineData[];
  summary: DashboardSummary;
  selectedMonth?: string;
}

export const RevenueTable: React.FC<RevenueTableProps> = ({ lines, summary, selectedMonth }) => {
  // Hitung total output pieces jika tersedia
  const totalActualPcs = lines.reduce((acc, l) => acc + (l.actualOutputPcs || 0), 0);
  const totalTargetPcs = lines.reduce((acc, l) => acc + (l.targetOutputPcs || 0), 0);

  // Rasio Agregat Otomatis Pabrik (Tertimbang riil, BUKAN rata-rata aritmatika)
  const factoryRealizationRatio = summary.totalTargetRevenue > 0
    ? (summary.totalActualRevenue / summary.totalTargetRevenue) * 100
    : 0;
  const factoryMultiplierRatio = summary.totalTargetRevenue > 0
    ? summary.totalActualRevenue / summary.totalTargetRevenue
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Table Header Info */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Kinerja Revenue &amp; Tarif CM Riil Masing-Masing Style
              </h3>
              <p className="text-xs text-slate-500">
                Perhitungan omzet riil dan rasio performa dihitung mandiri mengikuti data spesifik tiap style ({selectedMonth ? formatMonthYearIndonesian(selectedMonth) : 'Periode Berjalan'}).
              </p>
            </div>
          </div>
        </div>

        {/* Badges Ringkasan Otomatis Pabrik */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-lg font-bold flex items-center space-x-1.5 shadow-2xs">
            <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
            <span>Rasio Agregat Pabrik: <strong>{factoryRealizationRatio.toFixed(1)}%</strong> ({factoryMultiplierRatio.toFixed(2)}x)</span>
          </div>

          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200" title="Setiap style dihitung dengan tarif CM dan output aslinya masing-masing">
            Data Riil per Lini (Tanpa Rata-Rata)
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
              <th className="px-3.5 py-3.5 min-w-[60px] text-center">Line</th>
              <th className="px-4 py-3.5 min-w-[160px]">Style Garment</th>
              <th className="px-3.5 py-3.5 text-right min-w-[110px]">Output Pcs</th>
              <th className="px-3.5 py-3.5 text-right min-w-[100px]" title="Tarif Cut & Make riil untuk style lini ini">Tarif CM Riil</th>
              <th className="px-3.5 py-3.5 text-right min-w-[125px]">Target Anggaran</th>
              <th className="px-4 py-3.5 text-right min-w-[130px]">Realisasi Revenue</th>
              <th className="px-3.5 py-3.5 text-right min-w-[125px]">Variansi (IDR)</th>
              {/* KOLOM OUTPUT PERHITUNGAN RASIO OTOMATIS */}
              <th className="px-4 py-3.5 text-center min-w-[150px] bg-blue-50/60 border-x border-blue-100 text-blue-950" title="Output Perhitungan Rasio Otomatis: Rasio Realisasi Nilai (Aktual / Target) dan Rasio Kontribusi Omzet Pabrik">
                <div className="flex items-center justify-center space-x-1">
                  <Percent className="w-3 h-3 text-blue-700" />
                  <span>Rasio Otomatis</span>
                </div>
              </th>
              <th className="px-3.5 py-3.5 text-center min-w-[90px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 && (
              <tr>
                <td colSpan={9} className="py-14 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto px-4">
                    <DollarSign className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      Belum ada data revenue sewing line untuk periode {selectedMonth ? formatMonthYearIndonesian(selectedMonth) : 'ini'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Realisasi omzet per line akan otomatis dihitung berdasarkan output riil dan tarif CM spesifik masing-masing style.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {lines.map((line) => {
              const isSurplus = line.varianceRevenue >= 0;
              // Rasio Realisasi Otomatis per Line
              const lineRatio = line.targetRevenue > 0 
                ? (line.actualRevenue / line.targetRevenue) * 100 
                : 0;
              const multiplier = line.targetRevenue > 0
                ? line.actualRevenue / line.targetRevenue
                : 0;
              const contribution = line.contributionPercent ?? (summary.totalActualRevenue > 0 
                ? (line.actualRevenue / summary.totalActualRevenue) * 100 
                : 0);

              return (
                <tr key={line.lineId} className="hover:bg-blue-50/40 transition-colors">
                  {/* Line Number */}
                  <td className="px-3.5 py-3 text-center font-bold text-slate-900">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#1a3478] text-white font-extrabold text-xs shadow-2xs">
                      {line.lineId}
                    </span>
                  </td>

                  {/* Style Garment */}
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{line.style || `Style Line ${line.lineId}`}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      Line {line.lineId} Sewing
                    </span>
                  </td>

                  {/* Output Pcs (Aktual / Target) */}
                  <td className="px-3.5 py-3 text-right font-medium text-slate-700">
                    <div className="font-black text-slate-900">
                      {(line.actualOutputPcs ?? 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Target: {(line.targetOutputPcs ?? 0).toLocaleString('id-ID')}
                    </div>
                  </td>

                  {/* Tarif CM Riil Masing-Masing Style */}
                  <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-900 text-xs border border-slate-200">
                      Rp {line.cmRate.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">per pcs riil</span>
                  </td>

                  {/* Target Anggaran */}
                  <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                    {formatRupiah(line.targetRevenue)}
                  </td>

                  {/* Realisasi Revenue */}
                  <td className="px-4 py-3 text-right font-extrabold font-mono text-slate-900">
                    <span className="text-blue-900">{formatRupiah(line.actualRevenue)}</span>
                  </td>

                  {/* Variansi (IDR & %) */}
                  <td className={`px-3.5 py-3 text-right font-bold font-mono ${
                    isSurplus ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    <div>{formatRupiah(line.varianceRevenue)}</div>
                    <div className="text-[10px] font-semibold">
                      {isSurplus ? '+' : ''}{formatPercent(line.variancePercent)}
                    </div>
                  </td>

                  {/* KOLOM OUTPUT PERHITUNGAN RASIO OTOMATIS */}
                  <td className="px-4 py-3 text-center bg-blue-50/40 border-x border-blue-100">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      {/* Rasio Realisasi Nilai */}
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] font-mono ${
                          lineRatio >= 100
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : lineRatio >= 85
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {lineRatio.toFixed(1)}% ({multiplier.toFixed(2)}x)
                        </span>
                      </div>

                      {/* Rasio Kontribusi terhadap Omzet Total Pabrik */}
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Kontribusi: <strong className="text-slate-700">{contribution.toFixed(1)}%</strong>
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3.5 py-3 text-center">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      isSurplus 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-50 text-amber-800 border border-amber-300'
                    }`}>
                      {isSurplus ? (
                        <>
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          <span>Surplus</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-3 h-3 text-amber-600" />
                          <span>Defisit</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/90 font-extrabold border-t-2 border-slate-300 text-slate-900">
              <td colSpan={2} className="px-4 py-3.5 text-xs uppercase tracking-wider text-slate-800">
                Total Ringkasan Lini (Data Riil)
              </td>
              <td className="px-3.5 py-3.5 text-right font-mono text-xs text-slate-900">
                {totalActualPcs > 0 ? (
                  <>
                    <span className="block font-black">{totalActualPcs.toLocaleString('id-ID')} pcs</span>
                    <span className="text-[10px] text-slate-500 font-normal">Target: {totalTargetPcs.toLocaleString('id-ID')}</span>
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-3.5 py-3.5 text-right text-slate-500 font-semibold text-[11px]">
                Data Masing-Masing
              </td>
              <td className="px-3.5 py-3.5 text-right font-mono text-xs text-slate-700">
                {formatRupiah(summary.totalTargetRevenue)}
              </td>
              <td className="px-4 py-3.5 text-right font-mono text-xs text-[#1a3478] font-black">
                {formatRupiah(summary.totalActualRevenue)}
              </td>
              <td className={`px-3.5 py-3.5 text-right font-mono text-xs ${
                summary.netRevenueVariance >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                <div>{formatRupiah(summary.netRevenueVariance)}</div>
                <div className="text-[10px]">
                  {summary.overallVariancePercent > 0 ? '+' : ''}
                  {formatPercent(summary.overallVariancePercent)}
                </div>
              </td>
              {/* TOTAL OUTPUT PERHITUNGAN RASIO OTOMATIS PABRIK */}
              <td className="px-4 py-3.5 text-center bg-blue-100/60 border-x border-blue-200">
                <div className="flex flex-col items-center justify-center">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-black font-mono shadow-2xs ${
                    factoryRealizationRatio >= 100
                      ? 'bg-emerald-600 text-white'
                      : factoryRealizationRatio >= 85
                        ? 'bg-blue-700 text-white'
                        : 'bg-amber-600 text-white'
                  }`}>
                    {factoryRealizationRatio.toFixed(1)}% ({factoryMultiplierRatio.toFixed(2)}x)
                  </span>
                  <span className="text-[9.5px] text-blue-900 font-bold mt-0.5">
                    Rasio Agregat Pabrik
                  </span>
                </div>
              </td>
              <td className="px-3.5 py-3.5 text-center">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                  summary.netRevenueVariance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {summary.netRevenueVariance >= 0 ? 'Tercapai' : 'Evaluasi'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
