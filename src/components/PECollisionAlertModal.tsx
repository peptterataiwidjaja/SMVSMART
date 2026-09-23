import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  Zap, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { PECollisionAnalysis, PECollisionSummary } from '../utils/scheduleAdjustmentEngine';

interface PECollisionAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PECollisionAnalysis;
  onApplyReschedule?: (incomingStyleId: string, newStartDate: string) => void;
}

export const PECollisionAlertModal: React.FC<PECollisionAlertModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onApplyReschedule
}) => {
  const [selectedDetail, setSelectedDetail] = useState<PECollisionSummary | null>(
    analysis.details.length > 0 ? analysis.details[0] : null
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-red-700 via-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-black">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Peringatan Dini &amp; Analisis Cepat Tabrakan Jadwal PE
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  Process Engineering
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Deteksi otomatis pergeseran kalender sewing akibat sisa target dari input rekap harian
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Total Tabrakan */}
            <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Tabrakan Jadwal</span>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-700 mt-1">
                {analysis.totalCollisions} <span className="text-xs font-semibold text-slate-400">kasus</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {analysis.criticalCount} berstatus kritis
              </p>
            </div>

            {/* Lini Terdampak */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Lini Terdampak</span>
                <Layers className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {analysis.affectedLines.length > 0 ? analysis.affectedLines.join(', ') : '0'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Lini sewing aktif
              </p>
            </div>

            {/* Defisit Sisa Target */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Sisa Target Tertahan</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                {analysis.totalRemainingDeficitPcs.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400">pcs</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Akumulasi sisa rekap harian
              </p>
            </div>

            {/* Estimasi Jam Lembur */}
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Total Estimasi Lembur</span>
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                {analysis.totalOtHoursNeeded.toFixed(1)} <span className="text-xs font-semibold text-slate-400">jam</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Untuk mencegah tabrakan
              </p>
            </div>

          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {analysis.details.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Tidak Ada Tabrakan Jadwal Lini Sewing
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Semua style berjalan sesuai alokasi target dan rekap harian. Tidak ditemukan tumpang tindih waktu pada lini produksi mana pun.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Daftar Analisis Tabrakan per Lini ({analysis.details.length})
                </h4>
                <span className="text-xs text-slate-500">
                  Pilih lini untuk melihat rekomendasi aksi cepat PE
                </span>
              </div>

              {/* LIST ITEMS */}
              <div className="space-y-3">
                {analysis.details.map((detail, idx) => {
                  const isExpanded = selectedDetail?.lineId === detail.lineId && selectedDetail?.currentStyle.id === detail.currentStyle.id;

                  return (
                    <div 
                      key={`${detail.lineId}-${idx}`}
                      className={`rounded-xl border transition-all ${
                        isExpanded 
                          ? 'border-red-400 bg-red-50/20 shadow-md ring-1 ring-red-400/40' 
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* CARD HEADER CLICKABLE */}
                      <div 
                        onClick={() => setSelectedDetail(isExpanded ? null : detail)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="px-2.5 py-1 rounded-lg bg-[#1a3478] text-white font-black text-xs shrink-0 mt-0.5 shadow-2xs">
                            {detail.lineName}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {detail.currentStyle.styleName}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="font-bold text-slate-700 text-sm">
                                {detail.incomingStyle.styleName}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              <span>Rentang Tabrakan: <strong className="text-red-700">{detail.collisionStartDate} s/d {detail.collisionEndDate}</strong></span>
                              <span>•</span>
                              <span>Tabrakan: <strong className="text-red-700 font-bold">{detail.collisionDays} Hari Kerja</strong></span>
                              <span>•</span>
                              <span>Sisa Target: <strong className="text-amber-700">{detail.remainingQtyToCatchUp.toLocaleString('id-ID')} pcs</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            detail.severity === 'critical'
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {detail.severity === 'critical' ? '⚡ Kritis' : '⚠️ Perlu Perhatian'}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* CARD EXPANDED DETAILS & 4 PE MITIGATION ACTIONS */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-red-100 space-y-4 text-xs">
                          {/* ROOT CAUSE ANALYSIS */}
                          <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 text-red-950 space-y-1">
                            <div className="flex items-center space-x-1.5 font-black text-red-900">
                              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                              <span>Analisis Penyebab Tabrakan (Root Cause):</span>
                            </div>
                            <p className="text-[11.5px] leading-relaxed text-red-900/90 pl-5">
                              {detail.rootCause}
                            </p>
                          </div>

                          {/* 4 PE FAST MITIGATION OPTIONS */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-1.5 font-extrabold text-slate-900 text-xs">
                              <Sparkles className="w-4 h-4 text-blue-700" />
                              <span>Pilihan Rekomendasi Solusi Cepat untuk Process Engineer (PE):</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                              
                              {/* Opsi 1: Lembur */}
                              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                                <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                                  <Clock className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Opsi 1: Penambahan Lembur (Overtime)</span>
                                </div>
                                <p className="text-[11px] text-blue-950 leading-relaxed">
                                  {detail.mitigationOptions.overtime}
                                </p>
                              </div>

                              {/* Opsi 2: Percepatan Target */}
                              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                                <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Opsi 2: Akselerasi Target Harian</span>
                                </div>
                                <p className="text-[11px] text-emerald-950 leading-relaxed">
                                  {detail.mitigationOptions.speedUp}
                                </p>
                              </div>

                              {/* Opsi 3: Undur Jadwal */}
                              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                                <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                                  <Calendar className="w-3.5 h-3.5 text-purple-700" />
                                  <span>Opsi 3: Penjadwalan Ulang (Reschedule)</span>
                                </div>
                                <p className="text-[11px] text-purple-950 leading-relaxed">
                                  {detail.mitigationOptions.reschedule}
                                </p>
                              </div>

                              {/* Opsi 4: Re-alokasi Line */}
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                                <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Opsi 4: Pengalihan Lini Sewing</span>
                                </div>
                                <p className="text-[11px] text-amber-950 leading-relaxed">
                                  {detail.mitigationOptions.lineTransfer}
                                </p>
                              </div>

                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Sistem otomatis memperbarui tabrakan jadwal saat input rekap harian baru disimpan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-extrabold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Tutup Analisis
          </button>
        </div>

      </div>
    </div>
  );
};
