import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTabType } from './components/Navbar';
import { KpiSummary } from './components/KpiSummary';
import { ChartsSection } from './components/ChartsSection';
import { DailyMatrixTable } from './components/DailyMatrixTable';
import { RevenueTable } from './components/RevenueTable';
import { MonthlyRecapView } from './components/MonthlyRecapView';
import { BankDataView } from './components/BankDataView';
import { BankDataModal } from './components/BankDataModal';
import { InputRecapModal } from './components/InputRecapModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { TopUtilityBar } from './components/TopUtilityBar';
import { PECollisionAlertModal } from './components/PECollisionAlertModal';
import { LineIncidentModal } from './components/LineIncidentModal';
import { LineIssueNotificationBanner } from './components/LineIssueNotificationBanner';
import { StyleScheduleView } from './components/StyleScheduleView';
import { StyleScheduleModal } from './components/StyleScheduleModal';
import { UrgentPushNotificationModule } from './components/UrgentPushNotificationModule';
import { ProcessEngineeringFindingsSection } from './components/ProcessEngineeringFindingsSection';
import { PEFindingModal } from './components/PEFindingModal';
import { MonthlyPlanModal } from './components/MonthlyPlanModal';
import { RepairDefectView } from './components/RepairDefectView';
import { WorkScenarioView } from './components/WorkScenarioView';
import { LoginModal } from './components/LoginModal';
import { CompanyLogo } from './components/CompanyLogo';
import { INITIAL_LINES_DATA, computeSummary } from './data/defaultData';
import { INITIAL_MONTHLY_RECAP } from './data/monthlyRecapData';
import { INITIAL_BANK_DATA } from './data/bankData';
import { INITIAL_REPAIR_DEFECT_DATA } from './data/repairDefectData';
import { loadSavedPEFindings, savePEFindings } from './data/peFindingsData';
import { fetchGoogleSheetData, pushDataToAppsScript, parsePastedTabularData } from './services/sheetService';
import { getStoredAuthUser, saveAuthUser } from './services/authService';
import { exportReportToPdf } from './utils/pdfExport';
import { detectLineIncidents, updateIncidentInStorage } from './utils/issueDetection';
import { 
  getCurrentYearMonth, 
  getPreviousMonth, 
  getNextMonth, 
  formatMonthYearIndonesian, 
  formatRupiah, 
  formatPercent,
  isCurrentMonth,
  getLaptopCurrentMonthYear
} from './utils/formatters';
import { 
  loadSafeMonthlyRecap, 
  saveSafeMonthlyRecap, 
  loadSafeBankData, 
  saveSafeBankData, 
  loadSafeSchedules, 
  saveSafeSchedules, 
  loadSafeRepairDefects, 
  saveSafeRepairDefects, 
  loadSafePEFindings, 
  saveSafePEFindings, 
  loadSafeUrgentNotifications, 
  saveSafeUrgentNotifications, 
  ensurePersistentDataPreserved,
  snapshotToMasterVault,
  saveEmergencyUndoSnapshot,
  getEmergencyUndoSnapshot,
  STORAGE_KEYS 
} from './utils/persistentStorage';
import { buildLinesFromMonthlyRecap } from './utils/monthDataHelper';
import { 
  loadSavedSchedules, 
  saveSchedules, 
  loadSavedUrgentNotifications, 
  saveUrgentNotifications, 
  detectScheduleOverlaps,
  sendBrowserPushNotification 
} from './utils/scheduleCalculations';
import { syncSchedulesWithMonthlyRecap } from './utils/scheduleAdjustmentEngine';
import { 
  LineData, 
  DataSourceState, 
  MonthlyProductivityRecord, 
  BankDataModel, 
  LineIncident,
  StyleScheduleRecord,
  ScheduleOverlapConflict,
  UrgentPushNotification,
  ProcessEngineeringFinding,
  RepairDefectRecord,
  AuthUser
} from './types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles, 
  FileSpreadsheet, 
  Download,
  Calendar,
  Layers,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Plus,
  Database,
  BellRing,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
  HardDrive
} from 'lucide-react';
import { LocalBackupModal } from './components/LocalBackupModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [lines, setLines] = useState<LineData[]>(INITIAL_LINES_DATA);
  const [activeTab, setActiveTab] = useState<NavTabType>('overview');
  
  // 2 Akses Keamanan: Akun PE (Full Input) & Akun Monitoring (Read-Only)
  const [currentUser, setCurrentUser] = useState<AuthUser>(() => getStoredAuthUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);

  // Bank Data Manual Style Scheduling & Overtime (OT) State (Terlindungi Permanen saat Git Sync)
  const [styleSchedules, setStyleSchedules] = useState<StyleScheduleRecord[]>(() => {
    return loadSafeSchedules();
  });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StyleScheduleRecord | null>(null);

  // Urgent Push Notifications State
  const [urgentNotifications, setUrgentNotifications] = useState<UrgentPushNotification[]>(() => {
    return loadSafeUrgentNotifications();
  });
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  // Process Engineering Findings & SMV Diagnostics State
  const [peFindings, setPeFindings] = useState<ProcessEngineeringFinding[]>(() => {
    return loadSafePEFindings();
  });
  const [isPEModalOpen, setIsPEModalOpen] = useState(false);
  const [editingPEFinding, setEditingPEFinding] = useState<ProcessEngineeringFinding | null>(null);

  // Repair & Defect Records State with Git-Safe LocalStorage + Vault Persistence
  const [repairRecords, setRepairRecords] = useState<RepairDefectRecord[]>(() => {
    return loadSafeRepairDefects();
  });

  // Bank Data Master State (Model, Target, SMV Standar) with persistent storage
  const [bankDataModels, setBankDataModels] = useState<BankDataModel[]>(() => {
    return loadSafeBankData();
  });

  const [isBankDataModalOpen, setIsBankDataModalOpen] = useState(false);
  const [editingBankModel, setEditingBankModel] = useState<BankDataModel | null>(null);
  const [preselectedBankModel, setPreselectedBankModel] = useState<BankDataModel | null>(null);

  // Daily Productivity Recap State with multi-key persistent storage
  const [monthlyRecap, setMonthlyRecap] = useState<MonthlyProductivityRecord[]>(() => {
    return loadSafeMonthlyRecap();
  });

  // Modal input state for Rekap Harian
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyProductivityRecord | null>(null);

  // Selected Month Filter State (format: "YYYY-MM")
  // TAMPILAN DISESUAIKAN OTOMATIS KE BULAN & TAHUN YANG SEDANG BERJALAN PADA LAPTOP
  const currentLaptopMonth = getCurrentYearMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Selalu mulai di bulan & tahun riil laptop saat ini agar user tidak perlu repot menggeser halaman
    return getCurrentYearMonth();
  });

  // Verifikasi otomatis integritas data saat aplikasi dimuat / setelah sinkronisasi GitHub
  useEffect(() => {
    ensurePersistentDataPreserved().then((restored) => {
      if (restored) {
        setMonthlyRecap(loadSafeMonthlyRecap());
        setBankDataModels(loadSafeBankData());
        setStyleSchedules(loadSafeSchedules());
        setRepairRecords(loadSafeRepairDefects());
        setPeFindings(loadSafePEFindings());
        setUrgentNotifications(loadSafeUrgentNotifications());
      }
    });
  }, []);

  // Filter monthly recap records for the selected month
  const filteredMonthlyRecap = React.useMemo(() => {
    return monthlyRecap.filter(r => r.date && r.date.startsWith(selectedMonth));
  }, [monthlyRecap, selectedMonth]);

  // Deteksi rekaman di periode lain jika bulan berjalan laptop masih kosong
  const otherMonthsWithData = React.useMemo(() => {
    const set = new Set<string>();
    monthlyRecap.forEach(r => {
      if (r.date && r.date.length >= 7) {
        const ym = r.date.substring(0, 7);
        if (ym !== selectedMonth) set.add(ym);
      }
    });
    return Array.from(set).sort().reverse();
  }, [monthlyRecap, selectedMonth]);

  // Filter repair & defect records for the selected month
  const filteredRepairRecords = React.useMemo(() => {
    return repairRecords.filter(r => !r.date || r.date.startsWith(selectedMonth));
  }, [repairRecords, selectedMonth]);

  // Sinkronisasi dinamis Jadwal Style dengan Rekap Harian:
  // Rekap harian mengurangi target terjadwal, kalender menyesuaikan hasil.
  // Jika sisa target belum selesai, durasi kalender sewing diperpanjang otomatis
  // dan analisis tabrakan jadwal PE diperbarui real-time!
  const { 
    adjustedSchedules: dynamicallyAdjustedSchedules, 
    conflicts: dynamicScheduleConflicts,
    collisionAnalysis: peCollisionAnalysis 
  } = React.useMemo(() => {
    return syncSchedulesWithMonthlyRecap(styleSchedules, monthlyRecap);
  }, [styleSchedules, monthlyRecap]);

  // Filter style schedules active in the selected month (memperhitungkan perpanjangan sisa target)
  const filteredStyleSchedules = React.useMemo(() => {
    return dynamicallyAdjustedSchedules.filter(s => {
      const finishDate = s.projectedEndDate || s.plannedEndDate;
      if (!s.startDate && !finishDate) return true;
      const startM = s.startDate ? s.startDate.substring(0, 7) : '';
      const endM = finishDate ? finishDate.substring(0, 7) : '';
      return startM === selectedMonth || endM === selectedMonth || 
             (s.startDate <= `${selectedMonth}-31` && finishDate >= `${selectedMonth}-01`);
    });
  }, [dynamicallyAdjustedSchedules, selectedMonth]);

  // Live Overlap Conflicts calculation for current month schedules
  const scheduleConflicts = React.useMemo(() => {
    return dynamicScheduleConflicts.filter(c => c.date.startsWith(selectedMonth));
  }, [dynamicScheduleConflicts, selectedMonth]);

  // Dynamically compute LineData structure for dashboard tables & charts based on selected month
  const activeLines = React.useMemo(() => {
    const derived = buildLinesFromMonthlyRecap(filteredMonthlyRecap, bankDataModels, selectedMonth);
    if (derived.length > 0) return derived;
    // If lines was imported via Google Sheet or manually and monthly recap is empty
    if (lines.length > 0 && monthlyRecap.length === 0) {
      return lines;
    }
    return [];
  }, [filteredMonthlyRecap, bankDataModels, selectedMonth, lines, monthlyRecap.length]);

  // Line Incidents & Bottleneck Notifications state (filtered by active month records)
  const [incidents, setIncidents] = useState<LineIncident[]>(() => {
    return detectLineIncidents(filteredMonthlyRecap, activeLines);
  });
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // Perencanaan Bulanan Modal State
  const [isMonthlyPlanModalOpen, setIsMonthlyPlanModalOpen] = useState(false);

  // Sync detected incidents when filtered records change
  useEffect(() => {
    setIncidents(detectLineIncidents(filteredMonthlyRecap, activeLines));
  }, [filteredMonthlyRecap, activeLines]);

  const handleUpdateIncident = (updated: LineIncident) => {
    updateIncidentInStorage(updated);
    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    showToast('success', `Status disposisi & persetujuan ${updated.lineName} diperbarui.`);
  };

  // Notification Toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Google Apps Script source configuration
  const [dataSource, setDataSource] = useState<DataSourceState>(() => {
    const savedUrl = localStorage.getItem('smv_apps_script_url') || '';
    return {
      isLive: false,
      appsScriptUrl: savedUrl,
      lastSyncTime: null,
      autoSyncInterval: 0,
      status: 'idle'
    };
  });

  const summary = computeSummary(activeLines);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Sync with Google Apps Script or Direct Google Spreadsheet
  const handleConnectSheet = async (url: string, mode?: 'apps-script' | 'direct-sheet') => {
    setDataSource(prev => ({ ...prev, status: 'syncing' }));
    try {
      const result = await fetchGoogleSheetData(url);
      
      // Update Lines matrix if available
      if (result.lines && result.lines.length > 0) {
        setLines(result.lines);
      }

      // Update recap records if parsed
      if (result.recapRecords && result.recapRecords.length > 0) {
        setMonthlyRecap(result.recapRecords);
        saveSafeMonthlyRecap(result.recapRecords);
      }

      // Update bank data models if parsed
      if (result.bankModels && result.bankModels.length > 0) {
        setBankDataModels(result.bankModels);
        saveSafeBankData(result.bankModels);
      }

      localStorage.setItem('smv_apps_script_url', url);
      setDataSource({
        isLive: true,
        appsScriptUrl: url,
        spreadsheetUrl: url,
        spreadsheetName: result.spreadsheetTitle || (mode === 'direct-sheet' ? 'Google Spreadsheet' : 'Google Sheets Web App (.gs)'),
        syncMode: mode || (url.includes('script.google.com') ? 'apps-script' : 'direct-sheet'),
        lastSyncTime: new Date().toISOString(),
        autoSyncInterval: dataSource.autoSyncInterval,
        status: 'connected',
        syncedCount: result.recordCount
      });
      showToast('success', `Berhasil terhubung ke ${mode === 'direct-sheet' ? 'Google Spreadsheet' : 'Google Apps Script (.gs)'}!`);
    } catch (err: any) {
      setDataSource(prev => ({
        ...prev,
        status: 'error',
        errorMessage: err.message
      }));
      showToast('error', err.message || 'Gagal menyambung ke Google Spreadsheet.');
      throw err;
    }
  };

  // Push local data to Google Sheet via Apps Script
  const handlePushDataToSheet = async (target: 'recap' | 'bank') => {
    if (!dataSource.appsScriptUrl || !dataSource.appsScriptUrl.includes('script.google.com')) {
      throw new Error('Fitur kirim data membutuhkan URL Web App Google Apps Script (.gs)');
    }
    if (target === 'recap') {
      const res = await pushDataToAppsScript(dataSource.appsScriptUrl, {
        action: 'syncRecap',
        records: monthlyRecap
      });
      showToast('success', res.message || 'Data rekap harian berhasil dikirim ke Google Sheet!');
      return res;
    } else {
      const res = await pushDataToAppsScript(dataSource.appsScriptUrl, {
        action: 'syncBank',
        models: bankDataModels
      });
      showToast('success', res.message || 'Bank data model berhasil dikirim ke Google Sheet!');
      return res;
    }
  };

  // Import tabular text pasted directly from Google Sheets or Excel
  const handleImportPastedData = (pastedText: string, type: 'recap' | 'bank') => {
    const res = parsePastedTabularData(pastedText, type);
    if (type === 'recap' && res.recapRecords && res.recapRecords.length > 0) {
      setMonthlyRecap(prev => {
        const combined = [...res.recapRecords!, ...prev.filter(p => !res.recapRecords!.some(r => r.date === p.date && r.lineId === p.lineId))];
        saveSafeMonthlyRecap(combined);
        return combined;
      });
      showToast('success', `Berhasil mengimpor ${res.recapRecords.length} baris rekap harian!`);
      return { count: res.recapRecords.length, message: `Berhasil mengimpor ${res.recapRecords.length} baris.` };
    } else if (type === 'bank' && res.bankModels && res.bankModels.length > 0) {
      setBankDataModels(prev => {
        const combined = [...res.bankModels!, ...prev.filter(p => !res.bankModels!.some(m => m.modelCode.toUpperCase() === p.modelCode.toUpperCase()))];
        saveSafeBankData(combined);
        return combined;
      });
      showToast('success', `Berhasil mengimpor ${res.bankModels.length} model ke Bank Data!`);
      return { count: res.bankModels.length, message: `Berhasil mengimpor ${res.bankModels.length} model.` };
    }
    return { count: 0, message: 'Tidak ada baris valid yang ditemukan.' };
  };

  // Kosongkan semua data dengan perlindungan salinan darurat (Safe Reset)
  const handleClearAllData = () => {
    // Simpan salinan darurat terlebih dahulu agar tidak hilang permanen
    saveEmergencyUndoSnapshot({
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      app: 'PT Teratai Widjaja Produksi & SMV',
      recapRecords: monthlyRecap,
      bankModels: bankDataModels,
      styleSchedules,
      repairRecords,
      peFindings,
      urgentNotifications,
      incidents,
      sheetUrl: dataSource.appsScriptUrl
    });

    setLines([]);
    setMonthlyRecap([]);
    setBankDataModels([]);
    setStyleSchedules([]);
    setRepairRecords([]);
    setPeFindings([]);
    setUrgentNotifications([]);
    localStorage.removeItem(STORAGE_KEYS.RECAP);
    localStorage.removeItem(STORAGE_KEYS.BANK);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.REPAIR);
    localStorage.removeItem(STORAGE_KEYS.FINDINGS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.MASTER_VAULT);
    setDataSource({
      isLive: false,
      appsScriptUrl: '',
      lastSyncTime: null,
      autoSyncInterval: 0,
      status: 'idle'
    });
    showToast('info', 'Semua data telah dikosongkan. Salinan darurat tersimpan jika diperlukan.');
  };

  // Pulihkan salinan darurat jika pengguna tidak sengaja mengosongkan data
  const handleUndoClearData = () => {
    const undoData = getEmergencyUndoSnapshot();
    if (undoData) {
      if (undoData.recapRecords) {
        setMonthlyRecap(undoData.recapRecords);
        saveSafeMonthlyRecap(undoData.recapRecords);
      }
      if (undoData.bankModels) {
        setBankDataModels(undoData.bankModels);
        saveSafeBankData(undoData.bankModels);
      }
      if (undoData.styleSchedules) {
        setStyleSchedules(undoData.styleSchedules);
        saveSafeSchedules(undoData.styleSchedules);
      }
      if (undoData.repairRecords) {
        setRepairRecords(undoData.repairRecords);
        saveSafeRepairDefects(undoData.repairRecords);
      }
      if (undoData.peFindings) {
        setPeFindings(undoData.peFindings);
        saveSafePEFindings(undoData.peFindings);
      }
      if (undoData.urgentNotifications) {
        setUrgentNotifications(undoData.urgentNotifications);
        saveSafeUrgentNotifications(undoData.urgentNotifications);
      }
      showToast('success', 'Data berhasil dipulihkan dari salinan darurat!');
    }
  };

  // Reset to default preloaded dataset (now empty by default)
  const handleResetDefault = () => {
    handleClearAllData();
  };

  // Cadangan & Pemulihan Data Lokal (No Cloud) State & Handler
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleRestoreData = (restored: {
    monthlyRecap?: MonthlyProductivityRecord[];
    bankDataModels?: BankDataModel[];
    repairRecords?: RepairDefectRecord[];
    styleSchedules?: StyleScheduleRecord[];
    peFindings?: ProcessEngineeringFinding[];
    urgentNotifications?: UrgentPushNotification[];
    selectedMonth?: string;
  }) => {
    if (restored.monthlyRecap) {
      setMonthlyRecap(restored.monthlyRecap);
      saveSafeMonthlyRecap(restored.monthlyRecap);
    }
    if (restored.bankDataModels) {
      setBankDataModels(restored.bankDataModels);
      saveSafeBankData(restored.bankDataModels);
    }
    if (restored.repairRecords) {
      setRepairRecords(restored.repairRecords);
      saveSafeRepairDefects(restored.repairRecords);
    }
    if (restored.styleSchedules) {
      setStyleSchedules(restored.styleSchedules);
      saveSafeSchedules(restored.styleSchedules);
    }
    if (restored.peFindings) {
      setPeFindings(restored.peFindings);
      saveSafePEFindings(restored.peFindings);
    }
    if (restored.urgentNotifications) {
      setUrgentNotifications(restored.urgentNotifications);
      saveSafeUrgentNotifications(restored.urgentNotifications);
    }
    if (restored.selectedMonth) {
      setSelectedMonth(restored.selectedMonth);
    }
    showToast('success', 'Data lokal berhasil dipulihkan secara penuh tanpa cloud.');
  };

  // Manual Refresh
  const handleManualRefresh = useCallback(async () => {
    if (dataSource.appsScriptUrl && dataSource.isLive) {
      setDataSource(prev => ({ ...prev, status: 'syncing' }));
      try {
        const result = await fetchGoogleSheetData(dataSource.appsScriptUrl);
        setLines(result.lines);
        setDataSource(prev => ({
          ...prev,
          lastSyncTime: new Date().toISOString(),
          status: 'connected'
        }));
        showToast('success', 'Data Google Sheet berhasil diperbarui secara real-time.');
      } catch (err: any) {
        setDataSource(prev => ({ ...prev, status: 'error' }));
        showToast('error', 'Gagal memperbarui: ' + err.message);
      }
    } else {
      showToast('info', 'Data saat ini menggunakan dataset lokal bawaan.');
    }
  }, [dataSource.appsScriptUrl, dataSource.isLive]);

  // Auto-sync polling timer
  useEffect(() => {
    if (dataSource.autoSyncInterval > 0 && dataSource.isLive && dataSource.appsScriptUrl) {
      const interval = setInterval(() => {
        handleManualRefresh();
      }, dataSource.autoSyncInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [dataSource.autoSyncInterval, dataSource.isLive, dataSource.appsScriptUrl, handleManualRefresh]);

  // Target Reduction: Kurangi sisa target perencanaan ketika input aktual harian masuk
  const handleUpdateScheduleActual = useCallback((scheduleId: string, additionalPcs: number) => {
    setStyleSchedules(prev => {
      const updated = prev.map(s => {
        if (s.id === scheduleId) {
          const newActual = (s.actualQty || 0) + additionalPcs;
          const newRemaining = Math.max(0, s.orderQty - newActual);
          return {
            ...s,
            actualQty: newActual,
            remainingQty: newRemaining,
            status: (newActual >= s.orderQty ? 'completed' : 'running') as any
          };
        }
        return s;
      });
      saveSchedules(updated);
      return updated;
    });
  }, []);

  // Save / Update monthly recap record with automatic target reduction
  const handleSaveRecapRecord = (record: MonthlyProductivityRecord) => {
    setMonthlyRecap(prev => {
      const exists = prev.some(r => r.id === record.id);
      let updated: MonthlyProductivityRecord[];
      if (exists) {
        updated = prev.map(r => r.id === record.id ? record : r);
      } else {
        updated = [record, ...prev];
      }
      saveSafeMonthlyRecap(updated);
      return updated;
    });

    // Otomatis kurangi dari sisa target order jika ada jadwal yang cocok
    setStyleSchedules(prev => {
      const matching = prev.find(s => 
        (record.styleScheduleId && s.id === record.styleScheduleId) || 
        (s.lineId === record.lineId && s.styleName.toLowerCase() === record.style.toLowerCase())
      );
      if (matching) {
        const updated = prev.map(s => {
          if (s.id === matching.id) {
            const newActual = s.actualQty + (record.actualDailyPcs || 0);
            const newRemaining = Math.max(0, s.orderQty - newActual);
            return {
              ...s,
              actualQty: newActual,
              remainingQty: newRemaining,
              status: (newActual >= s.orderQty ? 'completed' : 'running') as any
            };
          }
          return s;
        });
        saveSafeSchedules(updated);
        showToast('success', `Data produksi ${record.lineName} (${record.style}) disimpan! Target order ${matching.styleName} berkurang sisa ${Math.max(0, matching.orderQty - (matching.actualQty + record.actualDailyPcs))} pcs.`);
        return updated;
      }
      showToast('success', `Data produksi ${record.lineName} (${record.style}) berhasil disimpan!`);
      return prev;
    });
  };

  // Simpan Perencanaan Bulanan (Model, Target Order, Target Harian, SMV, Mulai Kapan)
  const handleSaveMonthlyPlan = (planData: StyleScheduleRecord) => {
    setStyleSchedules(prev => {
      const exists = prev.some(s => s.id === planData.id);
      let updated: StyleScheduleRecord[];
      if (exists) {
        updated = prev.map(s => s.id === planData.id ? planData : s);
      } else {
        updated = [planData, ...prev];
      }
      saveSafeSchedules(updated);
      return updated;
    });
    showToast('success', `Perencanaan bulanan model ${planData.styleName} berhasil dibuat. Input harian otomatis akan mengurangi target.`);
  };

  // Repair & Defect Handlers
  const handleSaveRepairRecord = (record: RepairDefectRecord) => {
    setRepairRecords(prev => {
      const exists = prev.some(r => r.id === record.id);
      let updated: RepairDefectRecord[];
      if (exists) {
        updated = prev.map(r => r.id === record.id ? record : r);
      } else {
        updated = [record, ...prev];
      }
      saveSafeRepairDefects(updated);
      return updated;
    });
    showToast('success', `Data defect/repair ${record.lineName} (${record.style}) berhasil disimpan.`);
  };

  const handleDeleteRepairRecord = (id: string) => {
    setRepairRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveSafeRepairDefects(updated);
      return updated;
    });
    showToast('info', 'Data repair/defect berhasil dihapus.');
  };

  // Delete monthly recap record
  const handleDeleteRecapRecord = (id: string) => {
    setMonthlyRecap(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveSafeMonthlyRecap(updated);
      return updated;
    });
    showToast('info', 'Rekaman rekap harian berhasil dihapus.');
  };

  // Save / Update Bank Data model
  const handleSaveBankData = (model: BankDataModel) => {
    setBankDataModels(prev => {
      const exists = prev.some(m => m.id === model.id);
      let updated: BankDataModel[];
      if (exists) {
        updated = prev.map(m => m.id === model.id ? model : m);
      } else {
        updated = [model, ...prev];
      }
      saveSafeBankData(updated);
      return updated;
    });
    showToast('success', `Model ${model.modelCode} berhasil disimpan ke Bank Data!`);
  };

  // Delete Bank Data model
  const handleDeleteBankData = (id: string) => {
    setBankDataModels(prev => {
      const updated = prev.filter(m => m.id !== id);
      saveSafeBankData(updated);
      return updated;
    });
    showToast('info', 'Model di Bank Data berhasil dihapus.');
  };

  // Use Model in Input Form
  const handleUseModelInInput = (model: BankDataModel) => {
    setPreselectedBankModel(model);
    setEditingRecord(null);
    setIsInputModalOpen(true);
  };

  // Save Style Schedule Record
  const handleSaveSchedule = (record: StyleScheduleRecord) => {
    setStyleSchedules(prev => {
      const exists = prev.some(s => s.id === record.id);
      let updated: StyleScheduleRecord[];
      if (exists) {
        updated = prev.map(s => s.id === record.id ? record : s);
      } else {
        updated = [record, ...prev];
      }
      saveSafeSchedules(updated);

      // Check if this newly saved schedule creates an overlap conflict on this line
      const lineConflicts = detectScheduleOverlaps(updated).filter(c => c.lineId === record.lineId);
      if (lineConflicts.length > 0) {
        const notif: UrgentPushNotification = {
          id: `urgent-overlap-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `🚨 TUMPANG TINDIH TERDETEKSI DI ${record.lineName}`,
          message: `Style ${record.styleName} bertabrakan dengan jadwal style lain di ${record.lineName}. Silakan sesuaikan alokasi jadwal.`,
          type: 'overlap',
          lineId: record.lineId,
          lineName: record.lineName,
          styleName: record.styleName,
          severity: 'critical',
          read: false
        };
        setUrgentNotifications(prevNotifs => {
          const updatedNotifs = [notif, ...prevNotifs];
          saveSafeUrgentNotifications(updatedNotifs);
          return updatedNotifs;
        });
        sendBrowserPushNotification(notif.title, notif.message);
      }

      return updated;
    });
    showToast('success', `Jadwal style untuk ${record.styleName} (${record.lineName}) berhasil disimpan.`);
  };

  // Delete Style Schedule Record
  const handleDeleteSchedule = (id: string) => {
    setStyleSchedules(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSafeSchedules(updated);
      return updated;
    });
    showToast('info', 'Alokasi style berhasil dihapus dari jadwal.');
  };

  // Process Engineering Finding Handlers
  const handleSavePEFinding = (finding: ProcessEngineeringFinding) => {
    setPeFindings(prev => {
      const exists = prev.some(f => f.id === finding.id);
      let updated: ProcessEngineeringFinding[];
      if (exists) {
        updated = prev.map(f => f.id === finding.id ? finding : f);
      } else {
        updated = [finding, ...prev];
      }
      saveSafePEFindings(updated);
      return updated;
    });
    showToast('success', `Temuan PE & Diagnostik SMV (${finding.operationName} - ${finding.lineName}) berhasil disimpan.`);
  };

  const handleDeletePEFinding = (id: string) => {
    setPeFindings(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveSafePEFindings(updated);
      return updated;
    });
    showToast('info', 'Temuan rekayasa proses berhasil dihapus.');
  };

  const handleUpdatePEStatus = (id: string, newStatus: 'implemented' | 'trial' | 'evaluation') => {
    setPeFindings(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, status: newStatus } : f);
      saveSafePEFindings(updated);
      return updated;
    });
    showToast('success', 'Status implementasi Kaizen berhasil diperbarui.');
  };

  // Cetak Dokumen Langsung (Tanpa Preview PDF sesuai instruksi user)
  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* BAR KHUSUS: INSTAL ANDROID, CADANGAN & PEMULIHAN, PENGATURAN AKUN */}
      <TopUtilityBar
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        dataSource={dataSource}
        currentUser={currentUser}
      />

      {/* Top Navigation */}
      <Navbar
        dataSource={dataSource}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onManualRefresh={handleManualRefresh}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenInputModal={() => {
          setEditingRecord(null);
          setPreselectedBankModel(null);
          setIsInputModalOpen(true);
        }}
        onOpenBankDataModal={() => {
          setEditingBankModel(null);
          setIsBankDataModalOpen(true);
        }}
        onOpenMonthlyPlanModal={() => setIsMonthlyPlanModalOpen(true)}
        incidents={incidents}
        onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
        unreadPushCount={urgentNotifications.filter(n => !n.read).length}
        onOpenPushModal={() => setIsPushModalOpen(true)}
        overlapCount={scheduleConflicts.length}
        repairCriticalCount={filteredRepairRecords.filter(r => r.repairPercent >= 10.0).length}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-200">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center space-x-3 text-xs font-semibold ${
            notification.type === 'success' 
              ? 'bg-white border-emerald-300 text-emerald-800' 
              : notification.type === 'error' 
                ? 'bg-white border-red-300 text-red-800' 
                : 'bg-white border-blue-300 text-blue-800'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Global Month Selection & Period Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Periode Aktif:
                </span>
                <span className="text-sm sm:text-base font-extrabold text-blue-800">
                  {formatMonthYearIndonesian(selectedMonth)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  {selectedMonth}
                </span>

                {/* Badge otomatis bulan berjalan laptop */}
                {selectedMonth === currentLaptopMonth ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Bulan Berjalan Laptop</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedMonth(currentLaptopMonth)}
                    className="px-2.5 py-0.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center space-x-1 active:scale-95 transition cursor-pointer"
                    title="Klik untuk langsung kembali ke bulan & tahun laptop saat ini tanpa perlu menggeser"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Kembali ke Bulan Ini ({formatMonthYearIndonesian(currentLaptopMonth)})</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredMonthlyRecap.length > 0 
                  ? `Menampilkan ${filteredMonthlyRecap.length} data rekaman produksi pada bulan ini.`
                  : `Tampilan otomatis pada bulan berjalan laptop. Data siap untuk pengisian hari ini.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1 active:scale-95 cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bulan Lalu</span>
            </button>
            
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                title="Pilih Bulan Tertentu"
              />
            </div>

            <button
              onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1 active:scale-95 cursor-pointer"
              title="Bulan Berikutnya"
            >
              <span className="hidden sm:inline">Bulan Depan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1 active:scale-95 ml-auto sm:ml-2 cursor-pointer"
              title="Cadangkan & Pulihkan Data Lokal (Offline Tanpa Cloud)"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Cadangan Offline</span>
            </button>

            <button
              onClick={handleClearAllData}
              className="px-2.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1 active:scale-95 cursor-pointer"
              title="Kosongkan Semua Data"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Kosongkan</span>
            </button>
          </div>
        </div>

        {/* Notifikasi Informasi Jika Bulan Berjalan Masih Kosong namun Tersedia Data Lama di Bulan Lain */}
        {filteredMonthlyRecap.length === 0 && otherMonthsWithData.length > 0 && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-start sm:items-center space-x-2.5">
              <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-slate-700 leading-relaxed">
                <span className="font-extrabold text-blue-900 block sm:inline">
                  Tampilan disesuaikan ke bulan berjalan laptop ({formatMonthYearIndonesian(selectedMonth)}).
                </span>{' '}
                <span>
                  Data lama Anda ({monthlyRecap.length} baris) tetap aman tersimpan saat sinkronisasi GitHub dan tidak hilang.
                </span>{' '}
                <span className="text-slate-500 font-semibold">
                  (Tersedia di: {otherMonthsWithData.slice(0, 3).map(m => formatMonthYearIndonesian(m)).join(', ')})
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setSelectedMonth(otherMonthsWithData[0])}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-800 border border-blue-200 font-bold rounded-lg shadow-2xs transition active:scale-95 cursor-pointer text-xs"
              >
                Buka Data {formatMonthYearIndonesian(otherMonthsWithData[0])}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setPreselectedBankModel(null);
                  setIsInputModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs transition active:scale-95 cursor-pointer text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Hari Ini</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Tab Views */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
            {/* Subheader / PT Teratai Widjaja Context Bar - Hanya Muncul di Tab Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0"></span>
                <div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <h2 className="text-xs sm:text-sm font-extrabold text-[#1a3478] tracking-tight uppercase">
                      PT TERATAI WIDJAJA
                    </h2>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] sm:text-xs font-bold text-blue-700">
                      Sewing Production & Quality
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Monitoring Aktual per Hari, Target Harian, Kolom Analisis Bottleneck & Bank Data Model
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 text-xs w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditingBankModel(null);
                    setIsBankDataModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold shadow-2xs active:scale-95 transition-all"
                >
                  <Database className="w-3.5 h-3.5 text-blue-700" />
                  <span>+ Bank Data</span>
                </button>
                <button
                  onClick={() => {
                    setEditingRecord(null);
                    setPreselectedBankModel(null);
                    setIsInputModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-2xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="sm:hidden">+ Masukan Data</span>
                  <span className="hidden sm:inline">+ Masukan Data Harian</span>
                </button>
                <button
                  onClick={() => setIsSheetModalOpen(true)}
                  className="col-span-2 sm:col-auto text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center justify-center space-x-1 hover:underline py-1 sm:py-0 sm:ml-2"
                >
                  <span>{dataSource.isLive ? 'Pengaturan Sheet' : 'Hubungkan Sheet'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <KpiSummary summary={summary} />

            {/* Quick Action Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Daily Output & Analysis Highlight Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="h-1 w-full bg-linear-to-r from-blue-700 to-red-600 absolute top-0 left-0"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Rekapitulasi Aktual per Hari & Kolom Analisis
                      </h3>
                      <p className="text-xs text-slate-500">
                        {filteredMonthlyRecap.length} data masukan harian periode {formatMonthYearIndonesian(selectedMonth)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('monthly-recap')}
                    className="w-full sm:w-auto px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center space-x-1 shrink-0 active:scale-95"
                  >
                    <span>Buka Rekap Harian</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bank Data Highlight Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="h-1 w-full bg-blue-600 absolute top-0 left-0"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Bank Data Model & Target Standar
                      </h3>
                      <p className="text-xs text-slate-500">
                        {bankDataModels.length} spesifikasi model & target kapasitas Industrial Engineering (IE)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('bank-data')}
                    className="w-full sm:w-auto px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center space-x-1 shrink-0 active:scale-95"
                  >
                    <span>Kelola Bank Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Style Schedule & OT Highlight Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden md:col-span-2">
                <div className={`h-1 w-full absolute top-0 left-0 ${scheduleConflicts.length > 0 ? 'bg-red-600' : 'bg-emerald-600'}`}></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${scheduleConflicts.length > 0 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          Jadwal Style Sewing & Kalender Line
                        </h3>
                        {scheduleConflicts.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                            ⚡ {scheduleConflicts.length} Hari Overlap
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {filteredStyleSchedules.length} alokasi style sewing dengan kalkulasi sisa target otomatis & visualisasi tumpang tindih per Line
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setEditingSchedule(null);
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors text-center active:scale-95"
                    >
                      + Input Style
                    </button>
                    <button
                      onClick={() => setActiveTab('style-schedule')}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center space-x-1 shrink-0 shadow-2xs active:scale-95"
                    >
                      <span>Buka Kalender</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Charts */}
            <ChartsSection lines={activeLines} selectedMonth={selectedMonth} />

            {/* Concise Revenue Table in Overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Ringkasan Kinerja Revenue & Style Garment ({formatMonthYearIndonesian(selectedMonth)})
                </h3>
                <button
                  onClick={() => setActiveTab('revenue')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>Lihat Selengkapnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <RevenueTable lines={activeLines} summary={summary} selectedMonth={selectedMonth} />
            </div>
          </div>
        )}

        {/* Tab: BANK DATA MANUAL STYLE & KALENDER HARIAN OT */}
        {activeTab === 'style-schedule' && (
          <StyleScheduleView
            schedules={filteredStyleSchedules}
            conflicts={scheduleConflicts}
            urgentNotifications={urgentNotifications}
            bankDataModels={bankDataModels}
            onAddNew={() => {
              setEditingSchedule(null);
              setIsScheduleModalOpen(true);
            }}
            onEdit={(record) => {
              setEditingSchedule(record);
              setIsScheduleModalOpen(true);
            }}
            onDelete={handleDeleteSchedule}
            onOpenPushModal={() => setIsPushModalOpen(true)}
            onNavigateScenario={() => setActiveTab('scenario-analysis')}
            canInputData={currentUser.canInputData}
            onOpenCollisionModal={() => setIsCollisionModalOpen(true)}
            collisionAnalysis={peCollisionAnalysis}
          />
        )}

        {/* Tab: SKENARIO 5 HARI VS 6 HARI KERJA & ANALISIS LEMBUR */}
        {activeTab === 'scenario-analysis' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <WorkScenarioView
              schedules={filteredStyleSchedules}
              onNavigateSchedule={() => setActiveTab('style-schedule')}
              onOpenPdfReport={handleDirectPrint}
            />
          </div>
        )}

        {/* Tab: REKAP HARIAN & ANALISIS */}
        {activeTab === 'monthly-recap' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <MonthlyRecapView
              records={filteredMonthlyRecap}
              onAddNew={() => {
                setEditingRecord(null);
                setPreselectedBankModel(null);
                setIsInputModalOpen(true);
              }}
              onEdit={(record) => {
                setEditingRecord(record);
                setIsInputModalOpen(true);
              }}
              onDelete={handleDeleteRecapRecord}
              onExportPdf={handleDirectPrint}
              onOpenBankData={() => setActiveTab('bank-data')}
              onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
              onOpenSheetModal={() => setIsSheetModalOpen(true)}
              incidentsCount={incidents.length}
              styleSchedules={filteredStyleSchedules}
              onOpenMonthlyPlan={() => setIsMonthlyPlanModalOpen(true)}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              canInputData={currentUser.canInputData}
              canEditDelete={currentUser.canEditDelete}
            />
          </div>
        )}

        {/* Tab: REPAIR & DEFECT PER LINE (FISHBONE OTOMATIS) */}
        {activeTab === 'repair-defect' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <RepairDefectView
              records={filteredRepairRecords}
              onSaveRecord={handleSaveRepairRecord}
              onDeleteRecord={handleDeleteRepairRecord}
              onOpenPdfReport={handleDirectPrint}
              canInputData={currentUser.canInputData}
              canEditDelete={currentUser.canEditDelete}
            />
          </div>
        )}

        {/* Tab: BANK DATA MODEL & TARGET */}
        {activeTab === 'bank-data' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <BankDataView
              models={bankDataModels}
              onAddNew={() => {
                setEditingBankModel(null);
                setIsBankDataModalOpen(true);
              }}
              onEdit={(model) => {
                setEditingBankModel(model);
                setIsBankDataModalOpen(true);
              }}
              onDelete={handleDeleteBankData}
              onUseModelInInput={handleUseModelInInput}
              onOpenSheetModal={() => setIsSheetModalOpen(true)}
              canInputData={currentUser.canInputData}
              canEditDelete={currentUser.canEditDelete}
            />
          </div>
        )}

        {activeTab === 'daily-smv' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* NOTIFIKASI KENDALA LINE & BOTTLENECK BANNER - Khusus Tab Analisis SMV */}
            <LineIssueNotificationBanner
              incidents={incidents}
              onOpenModal={() => setIsIncidentModalOpen(true)}
              onPrintPdf={handleDirectPrint}
            />

            <ChartsSection lines={activeLines} selectedMonth={selectedMonth} />
            <DailyMatrixTable lines={activeLines} selectedMonth={selectedMonth} />
            
            {/* Analisis Tren Temuan Rekayasa Proses & Diagnostik SMV */}
            <ProcessEngineeringFindingsSection
              findings={peFindings}
              onAddNew={() => {
                setEditingPEFinding(null);
                setIsPEModalOpen(true);
              }}
              onEdit={(finding) => {
                setEditingPEFinding(finding);
                setIsPEModalOpen(true);
              }}
              onDelete={handleDeletePEFinding}
              onUpdateStatus={handleUpdatePEStatus}
            />
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <RevenueTable lines={activeLines} summary={summary} selectedMonth={selectedMonth} />
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Analisis Kinerja Keuangan PT Teratai Widjaja — {formatMonthYearIndonesian(selectedMonth)}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {summary.activeLinesCount > 0 ? (
                  `Dari total target anggaran ${formatRupiah(summary.totalTargetRevenue)}, realisasi revenue mencapai ${formatRupiah(summary.totalActualRevenue)} dengan selisih variansi ${formatRupiah(summary.netRevenueVariance)} (${formatPercent(summary.overallVariancePercent)}). Rata-rata pencapaian per line ${formatPercent(summary.avgLineAchievement)}.`
                ) : (
                  `Belum ada data transaksi revenue sewing line pada periode ${formatMonthYearIndonesian(selectedMonth)}. Data saat ini bersih/kosong. Silakan tambahkan masukan data harian atau hubungkan Google Sheet untuk menghasilkan kalkulasi keuangan otomatis.`
                )}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'data-matrix' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <DailyMatrixTable lines={activeLines} selectedMonth={selectedMonth} />
          </div>
        )}

      </main>

      {/* Clean Minimalist Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-[#1a3478]">PT TERATAI WIDJAJA</span>
            <span>•</span>
            <span>Garment Manufacturer Production & Quality Management</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Sistem Terintegrasi Google Apps Script</span>
            <span>•</span>
            <button 
              onClick={() => setIsSheetModalOpen(true)}
              className="text-blue-600 hover:underline"
            >
              Panduan Apps Script
            </button>
          </div>
        </div>
      </footer>

      {/* Google Sheet Apps Script Modal */}
      <GoogleSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        dataSource={dataSource}
        onConnect={handleConnectSheet}
        onResetDefault={handleResetDefault}
        onIntervalChange={(sec) => setDataSource(prev => ({ ...prev, autoSyncInterval: sec }))}
        onImportPastedData={handleImportPastedData}
        onPushDataToSheet={handlePushDataToSheet}
        recapRecordsCount={monthlyRecap.length}
        bankModelsCount={bankDataModels.length}
      />

      {/* Bank Data Model Modal */}
      <BankDataModal
        isOpen={isBankDataModalOpen}
        onClose={() => {
          setIsBankDataModalOpen(false);
          setEditingBankModel(null);
        }}
        onSave={handleSaveBankData}
        initialData={editingBankModel}
      />

      {/* Input Data Rekap Modal (Dengan target reduction otomatis) */}
      <InputRecapModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingRecord(null);
          setPreselectedBankModel(null);
        }}
        onSave={handleSaveRecapRecord}
        initialData={editingRecord}
        bankDataModels={bankDataModels}
        preselectedModel={preselectedBankModel}
        styleSchedules={filteredStyleSchedules}
        onUpdateScheduleActual={handleUpdateScheduleActual}
        defaultMonth={selectedMonth}
        canInputData={currentUser.canInputData}
      />

      {/* Modal Input Perencanaan Bulanan (Model, Target Order, Target Harian, SMV, Mulai Kapan) */}
      <MonthlyPlanModal
        isOpen={isMonthlyPlanModalOpen}
        onClose={() => setIsMonthlyPlanModalOpen(false)}
        onSave={handleSaveMonthlyPlan}
        bankDataModels={bankDataModels}
      />

      {/* Line Incident & Bottleneck Approval Modal (PE & FM) */}
      <LineIncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        incidents={incidents}
        onUpdateIncident={handleUpdateIncident}
        onPrintReport={handleDirectPrint}
      />

      {/* Peringatan Dini & Analisis Cepat Tabrakan Jadwal untuk Process Engineer (PE) */}
      <PECollisionAlertModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        analysis={peCollisionAnalysis}
      />

      {/* Modal Input Bank Data Manual Style & Jadwal OT */}
      <StyleScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        initialData={editingSchedule}
        bankDataModels={bankDataModels}
        existingSchedules={styleSchedules}
      />

      {/* Modul Notifikasi Push Pembaruan Status Proyek Mendesak */}
      <UrgentPushNotificationModule
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        notifications={urgentNotifications}
        onUpdateNotifications={(updated) => setUrgentNotifications(updated)}
        onNavigateToLine={(lineId) => {
          setActiveTab('style-schedule');
        }}
      />

      {/* Modal Input & Edit Temuan Rekayasa Proses (PE) */}
      <PEFindingModal
        isOpen={isPEModalOpen}
        onClose={() => {
          setIsPEModalOpen(false);
          setEditingPEFinding(null);
        }}
        onSave={handleSavePEFinding}
        initialData={editingPEFinding}
      />

      {/* Modal Cadangkan & Pulihkan Data Lokal (100% Offline Tanpa Cloud) */}
      <LocalBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        monthlyRecap={monthlyRecap}
        bankDataModels={bankDataModels}
        repairRecords={repairRecords}
        styleSchedules={styleSchedules}
        peFindings={peFindings}
        urgentNotifications={urgentNotifications}
        selectedMonth={selectedMonth}
        onRestoreData={handleRestoreData}
      />

      {/* Modal Autentikasi 2 Akses (Akun PE vs Akun Pemantau) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveAuthUser(user);
          showToast('success', `Berhasil beralih ke: ${user.name} (${user.role === 'PE' ? 'Akses Penuh Input & Edit' : 'Akses Monitoring Sahaja'})`);
        }}
        onSelectUser={(user) => {
          setCurrentUser(user);
          saveAuthUser(user);
          showToast('success', `Berhasil beralih ke: ${user.name} (${user.role === 'PE' ? 'Akses Penuh Input & Edit' : 'Akses Monitoring Sahaja'})`);
        }}
      />

      {/* Indikator Status Koneksi & Penyimpanan Perangkat Lokal */}
      <OfflineIndicator />

    </div>
  );
}
