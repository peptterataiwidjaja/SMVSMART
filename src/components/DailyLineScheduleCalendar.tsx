import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Filter, 
  CheckCircle2, 
  Zap, 
  LayoutGrid, 
  List,
  ArrowRight,
  TrendingDown,
  Info,
  ShieldAlert
} from 'lucide-react';
import { StyleScheduleRecord, ScheduleOverlapConflict } from '../types';
import { calculateShiftBreakdown } from '../utils/scheduleCalculations';
import { PECollisionAnalysis } from '../utils/scheduleAdjustmentEngine';

interface DailyLineScheduleCalendarProps {
  schedules: StyleScheduleRecord[];
  conflicts: ScheduleOverlapConflict[];
  onSelectSchedule?: (schedule: StyleScheduleRecord) => void;
  onAddNewSchedule?: (lineId?: number) => void;
  canInputData?: boolean;
  onOpenCollisionModal?: () => void;
  collisionAnalysis?: PECollisionAnalysis;
  selectedYearMonth?: string;
  onMonthChange?: (yearMonth: string) => void;
}

export const DailyLineScheduleCalendar: React.FC<DailyLineScheduleCalendarProps> = ({
  schedules,
  conflicts,
  onSelectSchedule,
  onAddNewSchedule,
  canInputData = true,
  onOpenCollisionModal,
  collisionAnalysis,
  selectedYearMonth,
  onMonthChange
}) => {
  const now = new Date();
  const currentLaptopMonth = now.getMonth();
  const currentLaptopYear = now.getFullYear();
  const currentLaptopDate = now.getDate();

  // Inisialisasi sesuai bulan berjalan laptop atau props selectedYearMonth
  const initialYear = selectedYearMonth ? parseInt(selectedYearMonth.split('-')[0], 10) : currentLaptopYear;
  const initialMonth = selectedYearMonth ? parseInt(selectedYearMonth.split('-')[1], 10) - 1 : currentLaptopMonth;

  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [filterLineId, setFilterLineId] = useState<number | 'all'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'overlaps_only'>('all');
  const [viewLayout, setViewLayout] = useState<'calendar' | 'agenda'>('calendar');

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync saat selectedYearMonth dari parent (App / Navbar) berubah
  React.useEffect(() => {
    if (selectedYearMonth) {
      const parts = selectedYearMonth.split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setSelectedYear(y);
          setSelectedMonth(m);
        }
      }
    }
  }, [selectedYearMonth]);

  const changeMonth = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    if (onMonthChange) {
      const ym = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
      onMonthChange(ym);
    }
  };

  const isCurrentLaptopPeriod = selectedMonth === currentLaptopMonth && selectedYear === currentLaptopYear;
  const isToday = (day: number) => isCurrentLaptopPeriod && day === currentLaptopDate;

  // Auto-scroll horizontal ke kolom Hari Ini pada render awal atau saat kembali ke bulan ini
  React.useEffect(() => {
    if (isCurrentLaptopPeriod && viewLayout === 'calendar' && scrollContainerRef.current) {
      // Offset 130px untuk sticky line col + estimasi per col ~35px
      const targetScroll = Math.max(0, (currentLaptopDate - 3) * 36);
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }, 100);
    }
  }, [isCurrentLaptopPeriod, currentLaptopDate, viewLayout]);

  const [activeCellDetail, setActiveCellDetail] = useState<{
    dateStr: string;
    lineId: number;
    lineName: string;
    styles: StyleScheduleRecord[];
    conflicts: ScheduleOverlapConflict[];
  } | null>(null);

  // Jumlah hari dalam bulan yang dipilih
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayName = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day);
    const names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return names[d.getDay()];
  };

  const isSunday = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day);
    return d.getDay() === 0;
  };

  const isSaturday = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day);
    return d.getDay() === 6;
  };

  const formatDate = (day: number): string => {
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  };

  const allLineIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const displayedLineIds = filterLineId === 'all' ? allLineIds : [filterLineId];

  // Helper untuk mendapatkan style yang aktif pada tanggal dan line tertentu
  const getLineDayContent = (lineId: number, dateStr: string) => {
    const lineSchedules = schedules.filter(s => s.lineId === lineId);
    
    const activeStyles = lineSchedules.filter(s => {
      if (s.remainingQty <= 0 && s.projectedEndDate && dateStr > s.projectedEndDate) {
        return false;
      }
      const effectiveFinish = s.projectedEndDate && s.projectedEndDate > s.plannedEndDate
        ? s.projectedEndDate
        : s.plannedEndDate;
      return dateStr >= s.startDate && dateStr <= effectiveFinish;
    });

    const dayConflicts = conflicts.filter(c => c.lineId === lineId && c.date === dateStr);
    const isOverlap = dayConflicts.length > 0 || activeStyles.length > 1;

    return {
      activeStyles,
      dayConflicts,
      isOverlap
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header Bar - Simpel, Bersih & Menarik */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a3478]"></span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Kalender Jadwal Line Sewing
            </h3>
            {isCurrentLaptopPeriod && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Bulan Berjalan</span>
              </span>
            )}
          </div>

          {/* Controls: Month Picker, Filter Line & Layout */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Month & Year Navigation */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 0) {
                    changeMonth(11, selectedYear - 1);
                  } else {
                    changeMonth(selectedMonth - 1, selectedYear);
                  }
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 active:scale-95 transition-all"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => changeMonth(Number(e.target.value), selectedYear)}
                className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 focus:outline-hidden cursor-pointer"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => changeMonth(selectedMonth, Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 focus:outline-hidden cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 11) {
                    changeMonth(0, selectedYear + 1);
                  } else {
                    changeMonth(selectedMonth + 1, selectedYear);
                  }
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 active:scale-95 transition-all"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tombol Cepat: Ke Hari Ini / Bulan Berjalan Laptop */}
            {!isCurrentLaptopPeriod ? (
              <button
                type="button"
                onClick={() => changeMonth(currentLaptopMonth, currentLaptopYear)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                title="Kembali ke bulan & hari ini pada laptop"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Hari Ini</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (scrollContainerRef.current) {
                    const targetScroll = Math.max(0, (currentLaptopDate - 3) * 36);
                    scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer flex items-center space-x-1"
                title="Fokuskan tampilan ke tanggal hari ini"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Tgl {currentLaptopDate}</span>
              </button>
            )}

            {/* Filter Line */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={filterLineId}
                onChange={(e) => setFilterLineId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Line (1-10)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>Line {n}</option>
                ))}
              </select>
            </div>

            {/* Filter Overlap Saja */}
            <button
              onClick={() => setFilterMode(prev => prev === 'all' ? 'overlaps_only' : 'all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
                filterMode === 'overlaps_only'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{filterMode === 'overlaps_only' ? 'Semua' : 'Bentrok'}</span>
            </button>

            {/* Tombol Peringatan Cepat Tabrakan Jadwal PE */}
            {onOpenCollisionModal && (
              <button
                type="button"
                id="btn-calendar-pe-collision-alert"
                onClick={onOpenCollisionModal}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer active:scale-95 ${
                  conflicts.length > 0 || (collisionAnalysis && collisionAnalysis.totalCollisions > 0)
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title="Peringatan Dini Tabrakan Jadwal PE"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {conflicts.length > 0 || (collisionAnalysis && collisionAnalysis.totalCollisions > 0)
                    ? `Bentrok (${collisionAnalysis?.totalCollisions || conflicts.length})`
                    : 'Aman'}
                </span>
              </button>
            )}

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg">
              <button
                onClick={() => setViewLayout('calendar')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all ${
                  viewLayout === 'calendar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Matriks Kalender"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewLayout('agenda')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all ${
                  viewLayout === 'agenda' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Daftar Agenda per Line"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tombol Input Cepat Style */}
            {canInputData && onAddNewSchedule && (
              <button
                onClick={() => onAddNewSchedule()}
                className="px-3 py-1.5 bg-[#1a3478] hover:bg-blue-900 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center space-x-1"
              >
                <span>+ Input</span>
              </button>
            )}
          </div>

        </div>

        {/* Legend Ringkas & Keterangan Hari - Tanpa Bertele-tele */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-xs bg-blue-600"></span>
              <span>Sen-Jum (8j)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-xs bg-amber-400"></span>
              <span>Sabtu (5j)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-xs bg-slate-300"></span>
              <span>Minggu (Libur)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-xs bg-red-600 text-white flex items-center justify-center text-[7px] font-black">
                ⚡
              </span>
              <span>Bentrok</span>
            </span>
          </div>

          <div className="text-[11px]">
            {conflicts.length > 0 ? (
              <span className="text-red-600 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{conflicts.length} hari bentrok</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Alokasi line rapi</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TAMPILAN MATRIKS KALENDER */}
      {viewLayout === 'calendar' ? (
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <div className="min-w-[1050px]">
            
            {/* Header Kolom Tanggal */}
            <div 
              className="grid bg-slate-100 border-b border-slate-300 text-center sticky top-0 z-10"
              style={{ gridTemplateColumns: `130px repeat(${daysInMonth}, minmax(32px, 1fr))` }}
            >
              <div className="p-2 font-bold text-xs text-[#1a3478] bg-slate-200 border-r border-slate-300 flex items-center justify-center sticky left-0 z-20">
                Line
              </div>

              {dayNumbers.map((day) => {
                const dayName = getDayName(day);
                const isSun = isSunday(day);
                const isSat = isSaturday(day);
                const today = isToday(day);

                return (
                  <div
                    key={day}
                    id={today ? `cal-col-today-${day}` : undefined}
                    className={`py-1.5 px-0.5 border-r border-slate-200 text-[10px] font-bold transition-colors ${
                      today
                        ? 'bg-blue-600 text-white ring-2 ring-blue-500 z-10 shadow-xs'
                        : isSun 
                          ? 'bg-red-50/80 text-red-700' 
                          : isSat 
                            ? 'bg-amber-50/80 text-amber-800' 
                            : 'text-slate-700'
                    }`}
                  >
                    <div className={`text-[8px] uppercase tracking-tight ${today ? 'text-blue-100 font-extrabold' : 'opacity-70'}`}>
                      {dayName}
                    </div>
                    <div className="text-xs font-black">{day}</div>
                    {today && (
                      <span className="inline-block text-[7px] font-black bg-white text-blue-700 px-1 py-0.2 rounded-xs uppercase">
                        HARI INI
                      </span>
                    )}
                    {!today && isSun && (
                      <span className="inline-block text-[7px] font-bold text-red-600 bg-red-100 px-0.5 rounded-xs">
                        LIBUR
                      </span>
                    )}
                    {!today && isSat && (
                      <span className="inline-block text-[7px] font-bold text-amber-800 bg-amber-100 px-0.5 rounded-xs">
                        5J
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Baris-Baris Kategori Line */}
            <div className="divide-y divide-slate-200">
              {displayedLineIds.map((lineId) => {
                const lineName = `Line ${lineId}`;
                const lineSchedules = schedules.filter(s => s.lineId === lineId);
                const hasLineConflict = conflicts.some(c => c.lineId === lineId);

                if (filterMode === 'overlaps_only' && !hasLineConflict) {
                  return null;
                }

                return (
                  <div 
                    key={lineId}
                    className="grid hover:bg-slate-50/50 transition-colors"
                    style={{ gridTemplateColumns: `130px repeat(${daysInMonth}, minmax(32px, 1fr))` }}
                  >
                    {/* Line Header Kiri (Sticky) */}
                    <div className="p-2.5 bg-white border-r border-slate-300 flex items-center justify-between sticky left-0 z-10 shadow-2xs">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900">{lineName}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          {lineSchedules.length} style
                        </span>
                      </div>
                      {hasLineConflict && (
                        <span 
                          className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black"
                          title="Terdapat tumpang tindih style pada line ini"
                        >
                          ⚡
                        </span>
                      )}
                    </div>

                    {/* Sel Tanggal */}
                    {dayNumbers.map((day) => {
                      const dateStr = formatDate(day);
                      const isSun = isSunday(day);
                      const isSat = isSaturday(day);
                      const today = isToday(day);
                      const { activeStyles, dayConflicts, isOverlap } = getLineDayContent(lineId, dateStr);

                      return (
                        <div
                          key={day}
                          onClick={() => {
                            if (activeStyles.length > 0 || isOverlap || isSun || isSat) {
                              setActiveCellDetail({
                                dateStr,
                                lineId,
                                lineName,
                                styles: activeStyles,
                                conflicts: dayConflicts
                              });
                            }
                          }}
                          className={`min-h-[48px] p-0.5 border-r border-slate-200 relative flex flex-col justify-center gap-0.5 cursor-pointer transition-all ${
                            today
                              ? 'bg-blue-50/40 ring-1 ring-blue-300'
                              : isSun 
                                ? 'bg-slate-100/70 text-slate-400' 
                                : isSat 
                                  ? 'bg-amber-50/30' 
                                  : 'hover:bg-blue-50/40'
                          } ${isOverlap ? 'bg-red-50 ring-1 ring-inset ring-red-400' : ''}`}
                        >
                          {/* TAMPILAN HARI MINGGU / OVERLAP / NORMAL */}
                          {isSun ? (
                            <div 
                              className="w-full text-center py-1 select-none"
                              title={activeStyles.length > 0 ? `${activeStyles[0].styleName} - Minggu Libur: Target 0 pcs` : 'Hari Minggu Libur (0 Jam Kerja)'}
                            >
                              <span className="text-[7.5px] font-bold text-slate-400 bg-slate-200/80 px-1 py-0.5 rounded-xs block">
                                LIBUR
                              </span>
                              {activeStyles.length > 0 && (
                                <span className="text-[7px] text-slate-400 font-semibold truncate block mt-0.5">
                                  {activeStyles[0].styleName.split('/')[0]} (0p)
                                </span>
                              )}
                            </div>
                          ) : isOverlap ? (
                            <div className="w-full bg-red-600 text-white rounded-xs p-1 text-[8.5px] font-bold text-center leading-tight shadow-2xs">
                              <span className="text-[7.5px] tracking-tight block uppercase text-amber-300 font-black animate-pulse">
                                ⚡ BENTROK
                              </span>
                              <span className="truncate block font-black">
                                {activeStyles[0]?.styleName.split(' ')[0] || 'Style 1'}
                              </span>
                              <span className="text-[7px] text-red-200 truncate block">
                                + {activeStyles[1]?.styleName.split(' ')[0] || 'Style 2'}
                              </span>
                            </div>
                          ) : (
                            <>
                              {activeStyles.length > 0 ? (
                                (() => {
                                  const st = activeStyles[0];
                                  const isExtended = st.remainingQty > 0 && st.plannedEndDate && dateStr > st.plannedEndDate;

                                  return (
                                    <div 
                                      className={`w-full text-white rounded-xs px-1 py-1 text-[8.5px] font-bold truncate leading-tight shadow-2xs ${
                                        isExtended 
                                          ? 'bg-rose-700 ring-1 ring-rose-400' 
                                          : isSat 
                                            ? 'bg-amber-600' 
                                            : 'bg-blue-600'
                                      }`}
                                      title={`${st.styleName} (${st.buyer}) - ${isExtended ? `Perpanjangan sisa ${st.remainingQty} pcs` : `Target: ${isSat ? Math.round((st.dailyTargetQty * 5) / 8) : st.dailyTargetQty} pcs`}`}
                                    >
                                      <div className="truncate flex items-center justify-between">
                                        <span>{st.styleName.split('/')[0]}</span>
                                        {isExtended && <span className="text-[6.5px] bg-rose-950 px-0.5 rounded font-black text-rose-200">SISA</span>}
                                      </div>
                                      <div className="text-[7px] opacity-90 truncate">
                                        {isExtended
                                          ? `Sisa ${st.remainingQty}p`
                                          : isSat 
                                            ? `${Math.round((st.dailyTargetQty * 5) / 8)}p (5j)` 
                                            : `${st.dailyTargetQty}p`}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <>
                                  {isSat && (
                                    <span className="text-[7px] font-bold text-amber-500/70 text-center select-none block">
                                      5J
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      ) : (
        /* AGENDA VIEW */
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedLineIds.map((lineId) => {
              const lineName = `Line ${lineId}`;
              const lineSchedules = schedules.filter(s => s.lineId === lineId);
              const lineConflicts = conflicts.filter(c => c.lineId === lineId);

              return (
                <div 
                  key={lineId}
                  className={`p-4 rounded-xl border transition-all ${
                    lineConflicts.length > 0 ? 'bg-red-50/40 border-red-300' : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1a3478] text-white font-extrabold text-xs">
                        {lineName}
                      </span>
                      {lineConflicts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{lineConflicts.length} Hari Overlap</span>
                        </span>
                      )}
                    </div>
                    {canInputData && onAddNewSchedule && (
                      <button
                        onClick={() => onAddNewSchedule(lineId)}
                        className="text-xs text-blue-700 hover:text-blue-800 font-bold hover:underline"
                      >
                        + Tambah Style
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {lineSchedules.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Belum ada jadwal style di line ini.</p>
                    ) : (
                      lineSchedules.map((sch) => (
                        <div 
                          key={sch.id}
                          className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{sch.styleName}</span>
                            <span className="text-[11px] font-semibold text-slate-500">{sch.buyer}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>Total Target: <strong className="text-slate-800">{sch.orderQty.toLocaleString()} pcs</strong></div>
                            <div>Aktual Tercapai: <strong className="text-slate-800">{sch.actualQty.toLocaleString()} pcs</strong></div>
                            <div>Jadwal: <strong className="text-slate-800">{sch.startDate} s/d {sch.plannedEndDate}</strong></div>
                            <div>Sisa Target: <strong className={sch.remainingQty > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                              {sch.remainingQty.toLocaleString()} pcs
                            </strong></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANALISIS BENTROK LINE - Ringkas & Bersih */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Analisis Alokasi Line
            </h4>
          </div>
          {conflicts.length > 0 ? (
            <span className="text-[11px] font-bold text-red-600">
              {conflicts.length} hari bentrok terdeteksi
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-700">
              Semua jadwal tersusun rapi
            </span>
          )}
        </div>

        {conflicts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {conflicts.slice(0, 3).map((c) => (
              <div key={c.id} className="p-2.5 bg-red-50/80 border border-red-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-red-800">
                  <span>{c.lineName} · {c.date}</span>
                  <span className="text-[9px] px-1 py-0.2 bg-red-200 text-red-900 rounded-xs font-black uppercase">
                    Bentrok
                  </span>
                </div>
                <p className="text-[11px] text-red-700 leading-snug">
                  {c.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg flex items-center space-x-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Alokasi style berjalan lancar tanpa tumpang tindih antar lini.</span>
          </div>
        )}
      </div>

      {/* MODAL DETAIL HARI TERPILIH */}
      {activeCellDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-[#1a3478] text-white text-xs font-black rounded-md">
                    {activeCellDetail.lineName}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Detail: {activeCellDetail.dateStr}
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian jadwal dan target alokasi sewing harian
                </p>
              </div>

              <button
                onClick={() => setActiveCellDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Status Hari Minggu / Sabtu */}
            {new Date(activeCellDetail.dateStr).getDay() === 0 && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-bold space-y-1">
                <div className="flex items-center space-x-1.5 text-red-700 font-extrabold">
                  <Info className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Hari Minggu: Libur Pabrik (0 Jam Kerja)</span>
                </div>
                <p className="text-[11px] text-red-700 font-normal leading-relaxed">
                  Hari Minggu tidak memiliki target produksi (0 pcs) dan otomatis dilewatkan dalam perhitungan jadwal. Target kerja dialokasikan ke hari kerja berikutnya dengan jam kerja normal (Senin-Jumat 8 jam, Sabtu 5 jam).
                </p>
              </div>
            )}
            {new Date(activeCellDetail.dateStr).getDay() === 6 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-bold">
                Hari Sabtu: Masuk 5 Jam Kerja (Target disesuaikan 5/8 hari normal).
              </div>
            )}

            {/* Jika Terjadi Overlap */}
            {activeCellDetail.conflicts.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1 text-xs text-red-900">
                <div className="flex items-center space-x-1.5 font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>PERINGATAN TUMPANG TINDIH LINE</span>
                </div>
                <p className="text-[11px] text-red-700">
                  {activeCellDetail.conflicts[0].recommendation}
                </p>
              </div>
            )}

            {/* Daftar Style Aktif */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Style Terjadwal Hari Ini:
              </span>
              {activeCellDetail.styles.length > 0 ? (
                activeCellDetail.styles.map((s) => {
                  const isSun = new Date(activeCellDetail.dateStr).getDay() === 0;
                  const isSat = new Date(activeCellDetail.dateStr).getDay() === 6;
                  const dayTarget = isSun ? 0 : (isSat ? Math.round((s.dailyTargetQty * 5) / 8) : s.dailyTargetQty);
                  const shifts = calculateShiftBreakdown(s.smv, s.manpower);

                  return (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between font-extrabold text-slate-900">
                        <span>{s.styleName}</span>
                        <span className="text-blue-700">{s.buyer}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          Target Hari Ini:{' '}
                          <strong className={isSun ? 'text-slate-400 font-black' : 'text-blue-900'}>
                            {dayTarget} pcs
                          </strong>{' '}
                          <span className="text-[10px] text-slate-500">
                            ({isSun ? 'Minggu Libur/Dilewatkan' : isSat ? '5 jam kerja' : '8 jam normal'})
                          </span>
                        </div>
                        <div>Sisa Target: <strong className="text-amber-800">{s.remainingQty.toLocaleString()} pcs</strong></div>
                        <div>SMV Standar: <strong>{s.smv} mnt</strong></div>
                        <div>Alokasi Manpower: <strong>{s.manpower} op</strong></div>
                      </div>

                      {isSun ? (
                        <div className="pt-1.5 border-t border-slate-200 text-[10.5px] text-slate-500 italic">
                          ✓ Hari Minggu tidak ada shift kerja produksi. Target dialokasikan ke hari kerja berikutnya.
                        </div>
                      ) : !isSat ? (
                        <div className="pt-1.5 border-t border-slate-200 text-[10.5px] text-slate-500 space-y-0.5">
                          <div className="flex justify-between">
                            <span>07.30 - 12.00: {shifts.slot1.targetPcs} pcs</span>
                            <span className="text-slate-400">Istirahat: 12.01 - 13.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span>13.01 - 15.30: {shifts.slot2.targetPcs} pcs</span>
                            <span className="text-slate-400">Istirahat: 15.30 - 16.00</span>
                          </div>
                          <div>16.01 - 18.00: {shifts.slot3.targetPcs} pcs</div>
                        </div>
                      ) : (
                        <div className="pt-1.5 border-t border-slate-200 text-[10.5px] text-amber-700 font-medium">
                          ✓ Sabtu: 5 Jam Kerja (07.30 - 12.30) • Target {dayTarget} pcs.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada jadwal style aktif hari ini.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveCellDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
