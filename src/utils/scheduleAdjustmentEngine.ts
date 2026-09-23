import { StyleScheduleRecord, MonthlyProductivityRecord, ScheduleOverlapConflict } from '../types';
import { formatDateYMD, shiftDateIfSunday, isSundayDate, isSaturdayDate } from './scheduleCalculations';

export interface DynamicScheduleResult {
  adjustedSchedules: StyleScheduleRecord[];
  conflicts: ScheduleOverlapConflict[];
  collisionAnalysis: PECollisionAnalysis;
}

export interface PECollisionSummary {
  lineId: number;
  lineName: string;
  currentStyle: StyleScheduleRecord;
  incomingStyle: StyleScheduleRecord;
  collisionStartDate: string;
  collisionEndDate: string;
  collisionDays: number;
  remainingQtyToCatchUp: number;
  otHoursNeeded: number;
  severity: 'critical' | 'warning';
  rootCause: string;
  mitigationOptions: {
    overtime: string;
    speedUp: string;
    reschedule: string;
    lineTransfer: string;
  };
}

export interface PECollisionAnalysis {
  totalCollisions: number;
  affectedLines: number[];
  criticalCount: number;
  totalRemainingDeficitPcs: number;
  totalOtHoursNeeded: number;
  details: PECollisionSummary[];
}

/**
 * Menghitung hari kerja kalender (Melewati Minggu, 8 Jam Senin-Jumat, 5 Jam Sabtu)
 */
export function getWorkingDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr || startDateStr > endDateStr) return 0;
  let count = 0;
  const curr = new Date(startDateStr.includes('T') ? startDateStr : `${startDateStr}T00:00:00`);
  const end = new Date(endDateStr.includes('T') ? endDateStr : `${endDateStr}T00:00:00`);

  while (curr <= end) {
    if (curr.getDay() !== 0) { // Lewati Minggu
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

/**
 * Menghitung kapasitas target suatu tanggal tertentu untuk style (8 jam Mon-Fri, 5 jam Sat, 0 Sun)
 */
export function getDailyCapacityForDate(dateStr: string, baseDaily8Hour: number): number {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  const day = d.getDay();
  if (day === 0) return 0; // Minggu Libur
  if (day === 6) return Math.round((baseDaily8Hour * 5) / 8); // Sabtu 5 jam
  return baseDaily8Hour; // Senin-Jumat 8 jam
}

/**
 * Proyeksikan tanggal selesai dinamis untuk sisa target (remainingQty):
 * Menghitung hari demi hari dari startDate atau latestRecordDate sampai sisa pcs terpenuhi.
 */
export function projectEndDateForRemainingQty(
  startFromDateStr: string,
  remainingQty: number,
  dailyTargetQty: number
): { projectedEndDate: string; workingDaysNeeded: number } {
  if (remainingQty <= 0) {
    return { projectedEndDate: startFromDateStr, workingDaysNeeded: 0 };
  }

  const safeTarget = Math.max(1, dailyTargetQty || 500);
  let leftQty = remainingQty;
  let curr = new Date(startFromDateStr.includes('T') ? startFromDateStr : `${startFromDateStr}T00:00:00`);
  
  // Pastikan tidak mulai di hari Minggu
  if (curr.getDay() === 0) {
    curr.setDate(curr.getDate() + 1);
  }

  let workingDaysNeeded = 0;
  let lastDateStr = formatDateYMD(curr);

  // Batasi iterasi maksimal 180 hari kerja agar aman
  let safetyCounter = 0;
  while (leftQty > 0 && safetyCounter < 180) {
    safetyCounter++;
    const dateStr = formatDateYMD(curr);
    const capacity = getDailyCapacityForDate(dateStr, safeTarget);

    if (capacity > 0) {
      workingDaysNeeded++;
      leftQty -= capacity;
      lastDateStr = dateStr;
    }

    if (leftQty > 0) {
      curr.setDate(curr.getDate() + 1);
    }
  }

  return {
    projectedEndDate: lastDateStr,
    workingDaysNeeded
  };
}

/**
 * Sinkronisasi Rekap Harian dengan Jadwal Sewing Kalender & Analisis Cepat Tabrakan Jadwal PE
 *
 * Aturan Bisnis:
 * 1. Rekap harian mengurangi target yang dijadwalkan secara otomatis (actualQty bertambah, remainingQty berkurang).
 * 2. Kalender menyesuaikan dengan hasil: jika masih ada sisa target, estimasi tanggal rampung (projectedEndDate)
 *    akan bergeser dan mempengaruhi kalender sewing.
 * 3. Jika pergeseran sisa target menabrak jadwal style berikutnya pada lini yang sama, berikan analisis cepat dan tepat
 *    sebagai peringatan dini buat Process Engineer (PE).
 */
export function syncSchedulesWithMonthlyRecap(
  schedules: StyleScheduleRecord[],
  recapRecords: MonthlyProductivityRecord[]
): DynamicScheduleResult {
  if (!schedules || schedules.length === 0) {
    return {
      adjustedSchedules: [],
      conflicts: [],
      collisionAnalysis: {
        totalCollisions: 0,
        affectedLines: [],
        criticalCount: 0,
        totalRemainingDeficitPcs: 0,
        totalOtHoursNeeded: 0,
        details: []
      }
    };
  }

  // 1. Sesuaikan setiap jadwal berdasarkan akumulasi rekap harian
  const adjustedSchedules: StyleScheduleRecord[] = schedules.map(s => {
    // Cari rekap harian yang sesuai (berdasarkan styleScheduleId atau kecocokan lineId & styleName)
    const matchingRecaps = recapRecords.filter(r => {
      if (r.styleScheduleId && r.styleScheduleId === s.id) return true;
      const matchLine = r.lineId === s.lineId;
      const cleanRecapStyle = (r.style || '').trim().toLowerCase();
      const cleanScheduleStyle = (s.styleName || '').trim().toLowerCase();
      return matchLine && cleanRecapStyle === cleanScheduleStyle;
    });

    // Urutkan rekap berdasarkan tanggal
    matchingRecaps.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Akumulasi total aktual dari rekap harian
    const totalActualFromRecap = matchingRecaps.reduce((acc, r) => acc + (Number(r.actualDailyPcs) || 0), 0);
    const effectiveActual = Math.max(s.actualQty || 0, totalActualFromRecap);
    const orderQty = Math.max(1, s.orderQty || 1000);
    const remainingQty = Math.max(0, orderQty - effectiveActual);
    const percentCompleted = Math.min(100, Math.round((effectiveActual / orderQty) * 100));

    // Cari tanggal rekap terakhir yang diisi
    const latestRecap = matchingRecaps.length > 0 ? matchingRecaps[matchingRecaps.length - 1] : null;
    const latestRecapDate = latestRecap?.date || s.startDate;

    let projectedEndDate = s.plannedEndDate;
    let delayDays = 0;
    let status = s.status;

    if (remainingQty === 0) {
      // Style sudah selesai penuh!
      status = 'completed';
      // Tanggal rampung adalah tanggal rekap terakhir di mana target tercapai
      if (latestRecap?.date) {
        projectedEndDate = latestRecap.date;
      }
    } else {
      // Masih bersisa target: Kalender menyesuaikan dengan hasil!
      // Hitung dari tanggal rekap terakhir (atau startDate jika belum ada rekap)
      const projectionStart = latestRecapDate > s.startDate ? latestRecapDate : s.startDate;
      const projection = projectEndDateForRemainingQty(projectionStart, remainingQty, s.dailyTargetQty);
      
      // Jika projectedEndDate lebih lambat dari jadwal awal (plannedEndDate), maka terjadi penundaan
      if (projection.projectedEndDate > s.plannedEndDate) {
        projectedEndDate = projection.projectedEndDate;
        delayDays = getWorkingDaysBetween(s.plannedEndDate, projectedEndDate);
        status = 'overtime';
      } else {
        projectedEndDate = s.plannedEndDate;
        status = 'running';
      }
    }

    // Jam lembur (OT) yang dibutuhkan untuk mengejar sisa target
    const safeSMV = Math.max(0.1, s.smv || 14.5);
    const safeMP = Math.max(1, s.manpower || 36);
    const otHoursNeeded = Number(((remainingQty * safeSMV) / (safeMP * 60)).toFixed(1));

    return {
      ...s,
      actualQty: effectiveActual,
      remainingQty,
      percentCompleted,
      projectedEndDate,
      delayDays,
      status: status as 'planning' | 'running' | 'overtime' | 'completed',
      needsOT: remainingQty > 0 && delayDays > 0,
      otHoursNeeded
    };
  });

  // 2. Deteksi Tabrakan Jadwal (Collision) Antar-Style pada Lini Sewing yang Sama
  const conflicts: ScheduleOverlapConflict[] = [];
  const collisionDetails: PECollisionSummary[] = [];

  // Kelompokkan jadwal per Line
  const schedulesByLine: { [lineId: number]: StyleScheduleRecord[] } = {};
  adjustedSchedules.forEach(item => {
    if (!schedulesByLine[item.lineId]) {
      schedulesByLine[item.lineId] = [];
    }
    schedulesByLine[item.lineId].push(item);
  });

  // Analisis tabrakan untuk setiap line
  Object.keys(schedulesByLine).forEach(lineKey => {
    const lineId = Number(lineKey);
    const lineSchedules = schedulesByLine[lineId];

    // Urutkan berdasarkan tanggal mulai (startDate)
    lineSchedules.sort((a, b) => a.startDate.localeCompare(b.startDate));

    for (let i = 0; i < lineSchedules.length; i++) {
      for (let j = i + 1; j < lineSchedules.length; j++) {
        const currentStyle = lineSchedules[i];
        const incomingStyle = lineSchedules[j];

        // Jika currentStyle sudah selesai 100%, tidak ada tabrakan jadwal!
        if (currentStyle.remainingQty <= 0) {
          continue;
        }

        // Tanggal selesai efektif dari currentStyle (memperhitungkan sisa target)
        const effectiveFinishDate = currentStyle.projectedEndDate || currentStyle.plannedEndDate;
        const incomingStartDate = incomingStyle.startDate;

        // Terjadi TABRAKAN JADWAL jika tanggal selesai style berjalan >= tanggal mulai style berikutnya
        if (effectiveFinishDate >= incomingStartDate) {
          const collisionStart = incomingStartDate;
          const collisionEnd = effectiveFinishDate < incomingStyle.plannedEndDate ? effectiveFinishDate : incomingStyle.plannedEndDate;
          const collisionDays = getWorkingDaysBetween(collisionStart, collisionEnd);

          if (collisionDays > 0) {
            const isCritical = currentStyle.remainingQty > 400 || collisionDays >= 3;
            const otHoursNeeded = currentStyle.otHoursNeeded || Number(((currentStyle.remainingQty * (currentStyle.smv || 14.5)) / ((currentStyle.manpower || 36) * 60)).toFixed(1));

            // Rekomendasi Solusi Cepat untuk PE
            const nextFreeDate = shiftDateIfSunday(
              (() => {
                const d = new Date(effectiveFinishDate);
                d.setDate(d.getDate() + 1);
                return formatDateYMD(d);
              })()
            );

            const mitigationOptions = {
              overtime: `Tambah lembur 2.0 jam/hari selama ${Math.ceil(otHoursNeeded / 2)} hari di Line ${lineId} agar ${currentStyle.styleName} rampung sebelum ${incomingStartDate}.`,
              speedUp: `Tingkatkan target output harian dari ${currentStyle.dailyTargetQty} pcs menjadi ${Math.round(currentStyle.dailyTargetQty * 1.25)} pcs/hari (+25%) dengan re-layout stasiun kerja kritis.`,
              reschedule: `Undur jadwal mulai ${incomingStyle.styleName} dari ${incomingStartDate} menjadi ${nextFreeDate}.`,
              lineTransfer: `Alihkan persiapan awal / pemotongan / sewing ${incomingStyle.styleName} ke line sewing lain yang sedang lowong.`
            };

            const rootCause = `Output rekap harian baru mencapai ${currentStyle.actualQty.toLocaleString('id-ID')} pcs dari target order ${currentStyle.orderQty.toLocaleString('id-ID')} pcs (Sisa: ${currentStyle.remainingQty.toLocaleString('id-ID')} pcs). Akibatnya penyelesaian mundur hingga ${effectiveFinishDate} dan menabrak tanggal mulai ${incomingStyle.styleName} (${incomingStartDate}).`;

            // Simpan detail analisis PE
            collisionDetails.push({
              lineId,
              lineName: currentStyle.lineName || `Line ${lineId}`,
              currentStyle,
              incomingStyle,
              collisionStartDate: collisionStart,
              collisionEndDate: collisionEnd,
              collisionDays,
              remainingQtyToCatchUp: currentStyle.remainingQty,
              otHoursNeeded,
              severity: isCritical ? 'critical' : 'warning',
              rootCause,
              mitigationOptions
            });

            // Masukkan tanggal-tanggal bentrok ke conflicts untuk kalender
            let curD = new Date(collisionStart);
            const endD = new Date(collisionEnd);
            while (curD <= endD) {
              if (curD.getDay() !== 0) { // Lewati Minggu
                const dStr = formatDateYMD(curD);
                const conflictId = `collision-${lineId}-${currentStyle.id}-${incomingStyle.id}-${dStr}`;
                
                if (!conflicts.some(c => c.id === conflictId)) {
                  conflicts.push({
                    id: conflictId,
                    lineId,
                    lineName: currentStyle.lineName || `Line ${lineId}`,
                    date: dStr,
                    previousStyle: {
                      id: currentStyle.id,
                      styleName: currentStyle.styleName,
                      buyer: currentStyle.buyer,
                      remainingQty: currentStyle.remainingQty,
                      otHours: otHoursNeeded,
                      otPeriod: 'Shift 07.30 - 18.00'
                    },
                    incomingStyle: {
                      id: incomingStyle.id,
                      styleName: incomingStyle.styleName,
                      buyer: incomingStyle.buyer,
                      orderQty: incomingStyle.orderQty,
                      dailyTargetQty: incomingStyle.dailyTargetQty,
                      regularPeriod: 'Shift 07.30 - 18.00'
                    },
                    severity: isCritical ? 'critical' : 'warning',
                    recommendation: `[PERINGATAN PE] Tabrakan jadwal di Line ${lineId} pada ${dStr}: ${currentStyle.styleName} (Sisa ${currentStyle.remainingQty} pcs) belum selesai saat ${incomingStyle.styleName} dijadwalkan masuk. Rekomendasi: ${mitigationOptions.overtime}`,
                    delayDays: currentStyle.delayDays || 0,
                    projectedEndDate: effectiveFinishDate,
                    otHoursNeeded,
                    deficitPcs: currentStyle.remainingQty,
                    mitigationOptions: {
                      overtimeAction: mitigationOptions.overtime,
                      speedUpAction: mitigationOptions.speedUp,
                      rescheduleAction: mitigationOptions.reschedule,
                      reallocateAction: mitigationOptions.lineTransfer
                    }
                  });
                }
              }
              curD.setDate(curD.getDate() + 1);
            }
          }
        }
      }
    }
  });

  const totalCollisions = collisionDetails.length;
  const affectedLines = Array.from(new Set(collisionDetails.map(c => c.lineId)));
  const criticalCount = collisionDetails.filter(c => c.severity === 'critical').length;
  const totalRemainingDeficitPcs = collisionDetails.reduce((acc, c) => acc + c.remainingQtyToCatchUp, 0);
  const totalOtHoursNeeded = collisionDetails.reduce((acc, c) => acc + c.otHoursNeeded, 0);

  return {
    adjustedSchedules,
    conflicts,
    collisionAnalysis: {
      totalCollisions,
      affectedLines,
      criticalCount,
      totalRemainingDeficitPcs,
      totalOtHoursNeeded,
      details: collisionDetails
    }
  };
}
