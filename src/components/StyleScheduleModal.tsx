import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Database,
  Calculator,
  Layers
} from 'lucide-react';
import { StyleScheduleRecord, BankDataModel } from '../types';
import { 
  formatDateYMD, 
  calculateAutoScheduleFromSMV, 
  calculateShiftBreakdown, 
  calculateScheduleMetrics 
} from '../utils/scheduleCalculations';

interface StyleScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: StyleScheduleRecord) => void;
  initialData?: StyleScheduleRecord | null;
  bankDataModels?: BankDataModel[];
  existingSchedules?: StyleScheduleRecord[];
}

export const StyleScheduleModal: React.FC<StyleScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  bankDataModels = [],
  existingSchedules = []
}) => {
  const [lineId, setLineId] = useState<number>(1);
  const [styleName, setStyleName] = useState<string>('');
  const [buyer, setBuyer] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(5000);
  const [smv, setSmv] = useState<number>(14.5);
  const [manpower, setManpower] = useState<number>(36);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    if (today.getDay() === 0) today.setDate(today.getDate() + 1); // Loncat ke Senin
    return formatDateYMD(today);
  });
  const [notes, setNotes] = useState<string>('');
  const [showBreakdownDetails, setShowBreakdownDetails] = useState<boolean>(false);
  const [sundaySelectedNotice, setSundaySelectedNotice] = useState<boolean>(false);

  // Auto kalkulasi jadwal & slot jam kerja normal
  const autoSchedule = useMemo(() => {
    return calculateAutoScheduleFromSMV({
      orderQty,
      smv,
      manpower,
      startDate
    });
  }, [orderQty, smv, manpower, startDate]);

  const shifts = useMemo(() => {
    return calculateShiftBreakdown(smv, manpower);
  }, [smv, manpower]);

  // Cek apakah tanggal mulai yang dipilih jatuh di hari Sabtu atau Minggu
  const isSelectedDateSunday = useMemo(() => {
    if (!startDate) return false;
    const d = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
    return d.getDay() === 0;
  }, [startDate]);

  const isSelectedDateSaturday = useMemo(() => {
    if (!startDate) return false;
    const d = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
    return d.getDay() === 6;
  }, [startDate]);

  // Handler perubahan tanggal mulai (jika Minggu, otomatis loncat ke Senin)
  const handleStartDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    const d = new Date(newDateStr.includes('T') ? newDateStr : `${newDateStr}T00:00:00`);
    if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1); // Loncat otomatis ke hari Senin!
      setStartDate(formatDateYMD(d));
      setSundaySelectedNotice(true);
    } else {
      setStartDate(newDateStr);
      setSundaySelectedNotice(false);
    }
  };

  // Sinkronisasi form saat modal dibuka atau saat initialData berganti
  useEffect(() => {
    if (initialData) {
      setLineId(initialData.lineId);
      setStyleName(initialData.styleName);
      setBuyer(initialData.buyer);
      setModelId(initialData.modelId || '');
      setOrderQty(initialData.orderQty);
      setSmv(initialData.smv || 14.5);
      setManpower(initialData.manpower || 36);
      setStartDate(initialData.startDate);
      setNotes(initialData.notes || '');
    } else {
      setLineId(1);
      setStyleName('');
      setBuyer('');
      setModelId('');
      setOrderQty(5000);
      setSmv(14.5);
      setManpower(36);
      const today = new Date();
      if (today.getDay() === 0) today.setDate(today.getDate() + 1);
      setStartDate(formatDateYMD(today));
      setNotes('');
    }
  }, [initialData, isOpen]);

  // Pilih cepat dari Bank Data
  const handleSelectBankModel = (selectedId: string) => {
    setModelId(selectedId);
    if (!selectedId) return;
    const found = bankDataModels.find(m => m.id === selectedId);
    if (found) {
      setStyleName(found.modelCode);
      setBuyer(found.buyer);
      if (found.smvStandard) setSmv(found.smvStandard);
      if (found.manpowerStandard) setManpower(found.manpowerStandard);
      if (found.targetTotalPcs) setOrderQty(found.targetTotalPcs);
    }
  };

  if (!isOpen) return null;

  // Analisis potensi tumpang tindih di Line yang dipilih
  const lineExisting = existingSchedules.filter(
    s => s.lineId === lineId && (!initialData || s.id !== initialData.id) && s.remainingQty > 0
  );

  const overlapConflicts = lineExisting.filter(s => {
    return s.startDate <= autoSchedule.plannedEndDate && s.plannedEndDate >= startDate;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleName.trim()) {
      alert('Silakan isi Nama Model / Style.');
      return;
    }

    const calculated = calculateScheduleMetrics({
      id: initialData?.id || `sch-${Date.now()}`,
      lineId,
      lineName: `Line ${lineId}`,
      styleName: styleName.trim(),
      buyer: buyer.trim() || 'Umum',
      modelId: modelId || undefined,
      orderQty: Number(orderQty) || 0,
      dailyTargetQty: autoSchedule.targetDailyMonFri,
      actualQty: initialData ? initialData.actualQty : 0,
      startDate,
      plannedEndDate: autoSchedule.plannedEndDate,
      standardWorkingHours: 8,
      manpower: Number(manpower) || 36,
      smv: Number(smv) || 14.5,
      otHoursPerDay: 0,
      notes: notes.trim()
    });

    onSave(calculated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal - Simple & Elegan */}
        <div className="px-6 py-4 bg-[#1a3478] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {initialData ? 'Ubah Jadwal Style Sewing' : 'Input Jadwal Style Sewing Baru'}
              </h3>
              <p className="text-xs text-blue-200">
                Kapasitas dihitung otomatis dari Total Target, SMV & Manpower
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Identitas Style & Line */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Line
              </label>
              <select
                value={lineId}
                onChange={(e) => setLineId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>Line {num}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Nama Model / Style <span className="text-red-500">*</span>
                </label>
                {bankDataModels.length > 0 && (
                  <div className="flex items-center space-x-1 text-[11px] text-blue-700">
                    <Database className="w-3 h-3" />
                    <select
                      value={modelId}
                      onChange={(e) => handleSelectBankModel(e.target.value)}
                      className="bg-transparent text-blue-700 font-bold hover:underline focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Pilih Bank Data</option>
                      {bankDataModels.map(m => (
                        <option key={m.id} value={m.id}>{m.modelCode} ({m.buyer})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="Contoh: DELAMI H067"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Buyer / Merk
              </label>
              <input
                type="text"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="Contoh: DELAMI / UNIQLO"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Mulai Produksi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {sundaySelectedNotice ? (
                <div className="mt-1 text-[11px] font-bold text-red-800 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md flex items-start space-x-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
                  <span>Hari Minggu adalah libur (0 jam kerja & tanpa target). Jadwal otomatis dialihkan ke hari Senin ({startDate}) agar target hanya masuk di hari kerja normal.</span>
                </div>
              ) : isSelectedDateSaturday ? (
                <div className="mt-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>📅 Terplot Mulai Hari Sabtu: Target hari pertama otomatis 5 jam ({autoSchedule.targetDailySaturday.toLocaleString()} pcs), bukan 8 jam.</span>
                </div>
              ) : (
                <p className="text-[10.5px] text-slate-500 font-medium mt-1">
                  ✓ Senin - Jumat: 8 jam • Sabtu: 5 jam • Minggu: dilewatkan (0 jam & tanpa target).
                </p>
              )}
            </div>
          </div>

          {/* 3 Parameter Utama: Total Target, SMV, Manpower */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-700" />
              <span>Parameter Input Utama</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Total Target (pcs)
                </label>
                <input
                  type="number"
                  min={1}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  SMV (menit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.1}
                  value={smv}
                  onChange={(e) => setSmv(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Manpower (orang)
                </label>
                <input
                  type="number"
                  min={1}
                  value={manpower}
                  onChange={(e) => setManpower(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Hasil Perhitungan Otomatis: Ringkasan Kapasitas Harian */}
          <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#1a3478]">
                Hasil Perhitungan Otomatis:
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Selesai: <strong className="text-slate-800">{autoSchedule.plannedEndDate}</strong> ({autoSchedule.totalWorkingDays} hari kerja)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10.5px] font-semibold text-slate-500 block">Senin - Jumat (8 Jam Kerja)</span>
                <span className="text-base font-black text-blue-900">
                  {autoSchedule.targetDailyMonFri.toLocaleString()} pcs
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">07.30 - 18.00 (Normal 8 jam)</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                <span className="text-[10.5px] font-semibold text-amber-800 block">Sabtu (5 Jam Kerja)</span>
                <span className="text-base font-black text-amber-900">
                  {autoSchedule.targetDailySaturday.toLocaleString()} pcs
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">5 jam kerja (Bukan 8 jam)</span>
              </div>
            </div>

            {/* Indikator Hari Minggu Dilewatkan */}
            {autoSchedule.totalSundaysSkipped > 0 && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start space-x-2 text-xs text-indigo-900">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-extrabold block">
                    {autoSchedule.totalSundaysSkipped} Hari Minggu Terdeteksi: Otomatis Dilewatkan Tanpa Target (0 Pcs)
                  </span>
                  <p className="text-[10.5px] text-indigo-700 leading-relaxed">
                    Setiap hari Minggu di dalam periode jadwal tidak memiliki jam kerja (0 jam) dan tidak dibebani target produksi (0 pcs). Perencanaan hitungan hari kerja otomatis dialokasikan ke hari berikutnya dengan jam kerja normal (Senin-Jumat 8 jam, Sabtu 5 jam).
                  </p>
                </div>
              </div>
            )}

            {/* Toggle Pratinjau Per Hari */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBreakdownDetails(prev => !prev)}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 flex items-center justify-between transition-colors shadow-2xs"
              >
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    {showBreakdownDetails ? 'Sembunyikan Rincian Hari Kalender' : 'Lihat Rincian Rencana Hari per Hari'}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.2 rounded-full">
                    {autoSchedule.dailyBreakdown.length} hari
                  </span>
                </div>
                <span className="text-[11px] text-blue-700 font-semibold">
                  {showBreakdownDetails ? 'Tutup ▲' : 'Buka Rincian ▼'}
                </span>
              </button>

              {showBreakdownDetails && (
                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-white max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[9.5px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2.5">Tanggal</th>
                        <th className="py-1.5 px-2">Hari</th>
                        <th className="py-1.5 px-2 text-center">Jam Kerja</th>
                        <th className="py-1.5 px-2 text-right">Target</th>
                        <th className="py-1.5 px-2 text-right">Akumulasi</th>
                        <th className="py-1.5 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {autoSchedule.dailyBreakdown.map((item) => (
                        <tr 
                          key={item.date} 
                          className={item.isSunday ? 'bg-red-50/50' : item.isSaturday ? 'bg-amber-50/30' : 'hover:bg-slate-50'}
                        >
                          <td className="py-1 px-2.5 font-mono text-slate-700 font-semibold">{item.date}</td>
                          <td className="py-1 px-2 font-bold text-slate-800">
                            <span className={item.isSunday ? 'text-red-700' : item.isSaturday ? 'text-amber-800' : 'text-slate-800'}>
                              {item.dayName}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-center font-semibold">
                            {item.isSunday ? (
                              <span className="text-slate-400 font-medium">0 jam</span>
                            ) : (
                              <span className="text-slate-700">{item.workingHours} jam</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold">
                            {item.isSunday ? (
                              <span className="text-slate-400 line-through">0 pcs</span>
                            ) : (
                              <span className="text-blue-900">{item.targetQty.toLocaleString()} pcs</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-600">
                            {item.cumulativeQty.toLocaleString()} pcs
                          </td>
                          <td className="py-1 px-2.5 text-center">
                            {item.isSunday ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-red-100 text-red-800">
                                DILEWATKAN
                              </span>
                            ) : item.isSaturday ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900">
                                5 JAM
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800">
                                NORMAL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rincian Jam Kerja & Istirahat Harian */}
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-[11px] space-y-1 text-slate-700">
              <div className="font-bold text-slate-800 text-[11.5px] mb-1">
                Rincian Jadwal Jam Kerja Normal Harian:
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>07.30 - 12.00 (4.5 jam kerja)</span>
                <strong className="text-blue-900">{shifts.slot1.targetPcs.toLocaleString()} pcs</strong>
              </div>
              <div className="flex justify-between py-0.5 text-slate-400 bg-slate-50 px-1 rounded-xs">
                <span>Istirahat Siang: 12.01 - 13.00</span>
                <span>(60 menit)</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>13.01 - 15.30 (2.5 jam kerja)</span>
                <strong className="text-blue-900">{shifts.slot2.targetPcs.toLocaleString()} pcs</strong>
              </div>
              <div className="flex justify-between py-0.5 text-slate-400 bg-slate-50 px-1 rounded-xs">
                <span>Istirahat Sore: 15.30 - 16.00</span>
                <span>(30 menit)</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>16.01 - 18.00 (1.0 jam kerja reguler)</span>
                <strong className="text-blue-900">{shifts.slot3.targetPcs.toLocaleString()} pcs</strong>
              </div>
            </div>
          </div>

          {/* Catatan Opsional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Model prioritas pengiriman buyer"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* ANALISIS DI TARUH DI BAGIAN BAWAH (Permintaan User) */}
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-600 mb-2">
              Analisis Potensi Tumpang Tindih (Overlap) Line:
            </div>
            
            {overlapConflicts.length > 0 ? (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center space-x-1.5 text-red-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Potensi Tumpang Tindih di Line {lineId}</span>
                </div>
                {overlapConflicts.map((c) => (
                  <p key={c.id} className="text-[11px] text-red-600 pl-5">
                    • Masih ada style <strong>{c.styleName}</strong> (sisa target: {c.remainingQty.toLocaleString()} pcs) terjadwal s/d {c.plannedEndDate}. Target yang masuk di rekap harian akan mengurangi sisa target ini secara otomatis.
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Line {lineId} aman tanpa potensi tumpang tindih jadwal.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1a3478] hover:bg-blue-900 text-white rounded-lg text-xs font-extrabold transition-colors shadow-2xs flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Jadwal Style</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
