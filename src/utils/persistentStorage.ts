import {
  MonthlyProductivityRecord,
  BankDataModel,
  StyleScheduleRecord,
  RepairDefectRecord,
  ProcessEngineeringFinding,
  UrgentPushNotification,
  LineIncident
} from '../types';
import { INITIAL_MONTHLY_RECAP } from '../data/monthlyRecapData';
import { INITIAL_BANK_DATA } from '../data/bankData';
import { INITIAL_REPAIR_DEFECT_DATA } from '../data/repairDefectData';
import { INITIAL_STYLE_SCHEDULES } from './scheduleCalculations';
import { INITIAL_PE_FINDINGS } from '../data/peFindingsData';

// Primary Storage Keys
export const STORAGE_KEYS = {
  RECAP: 'smv_monthly_recap_records_v2',
  BANK: 'tw_bank_data_models',
  SCHEDULES: 'tw_style_schedules_v1',
  REPAIR: 'tw_repair_defect_records_v1',
  FINDINGS: 'tw_pe_findings_v1',
  NOTIFICATIONS: 'tw_urgent_notifications_v1',
  INCIDENTS: 'tw_line_incidents_v1',
  SHEET_URL: 'smv_apps_script_url',
  MASTER_VAULT: 'tw_master_persistent_vault_v2',
  EMERGENCY_UNDO: 'tw_emergency_undo_vault_v1',
  MONTH_SELECTION: 'tw_selected_dashboard_month'
} as const;

// Legacy keys for backward compatibility across Git commits and builds
const LEGACY_KEYS = {
  RECAP: ['smv_monthly_recap_records_v2', 'smv_monthly_recap_records', 'tw_monthly_recap_v1', 'tw_monthly_recap'],
  BANK: ['tw_bank_data_models', 'tw_bank_models_v1', 'tw_bank_data'],
  SCHEDULES: ['tw_style_schedules_v1', 'tw_schedules_v1', 'tw_style_schedules'],
  REPAIR: ['tw_repair_defect_records_v1', 'tw_repair_defect_records', 'tw_repair_defects'],
  FINDINGS: ['tw_pe_findings_v1', 'tw_pe_findings'],
  NOTIFICATIONS: ['tw_urgent_notifications_v1', 'tw_urgent_notifications'],
  INCIDENTS: ['tw_line_incidents_v1', 'tw_line_incidents']
};

export interface MasterVaultPayload {
  version: string;
  lastUpdated: string;
  app: string;
  recapRecords: MonthlyProductivityRecord[];
  bankModels: BankDataModel[];
  styleSchedules: StyleScheduleRecord[];
  repairRecords: RepairDefectRecord[];
  peFindings: ProcessEngineeringFinding[];
  urgentNotifications: UrgentPushNotification[];
  incidents: LineIncident[];
  sheetUrl?: string;
}

// ==========================================
// INDEXED DB DUAL-LAYER PERSISTENCE
// (Melindungi data agar tidak hilang saat GitHub pull, cache refresh, atau build baru)
// ==========================================
const IDB_NAME = 'TWSMVDataSafeVault';
const IDB_VERSION = 1;
const IDB_STORE = 'appSafeVault';

function openVaultDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = (e: any) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDBVault(vaultData: MasterVaultPayload): Promise<void> {
  try {
    const db = await openVaultDatabase();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ key: 'masterBackup', data: vaultData, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not write to IndexedDB vault:', err);
  }
}

async function loadFromIndexedDBVault(): Promise<MasterVaultPayload | null> {
  try {
    const db = await openVaultDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get('masterBackup');
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ==========================================
// VAULT HELPER: AUTO-SNAPSHOT ALL DATA
// ==========================================
export function snapshotToMasterVault(override?: Partial<MasterVaultPayload>): MasterVaultPayload {
  try {
    const recap = override?.recapRecords || loadSafeMonthlyRecap();
    const bank = override?.bankModels || loadSafeBankData();
    const sched = override?.styleSchedules || loadSafeSchedules();
    const repair = override?.repairRecords || loadSafeRepairDefects();
    const pe = override?.peFindings || loadSafePEFindings();
    const notif = override?.urgentNotifications || loadSafeUrgentNotifications();
    const inc = override?.incidents || loadSafeIncidents();
    const sheet = override?.sheetUrl ?? (localStorage.getItem(STORAGE_KEYS.SHEET_URL) || '');

    const payload: MasterVaultPayload = {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      app: 'PT Teratai Widjaja Produksi & SMV',
      recapRecords: recap,
      bankModels: bank,
      styleSchedules: sched,
      repairRecords: repair,
      peFindings: pe,
      urgentNotifications: notif,
      incidents: inc,
      sheetUrl: sheet
    };

    localStorage.setItem(STORAGE_KEYS.MASTER_VAULT, JSON.stringify(payload));
    // Asynchronously save to IndexedDB as indestructible secondary backup
    saveToIndexedDBVault(payload);
    return payload;
  } catch (e) {
    console.error('Failed snapshotting to master vault:', e);
    return {} as MasterVaultPayload;
  }
}

// ==========================================
// SAFE LOADER WITH MULTI-KEY SCANNING
// ==========================================
function scanArrayFromKeys<T>(keys: readonly string[]): T[] | null {
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Continue to next key
    }
  }
  return null;
}

export function loadSafeMonthlyRecap(): MonthlyProductivityRecord[] {
  // 1. Scan primary and legacy localStorage keys
  const found = scanArrayFromKeys<MonthlyProductivityRecord>(LEGACY_KEYS.RECAP);
  if (found && found.length > 0) {
    return found;
  }

  // 2. Scan unified master vault
  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.recapRecords && Array.isArray(vault.recapRecords) && vault.recapRecords.length > 0) {
        // Re-persist to primary key
        localStorage.setItem(STORAGE_KEYS.RECAP, JSON.stringify(vault.recapRecords));
        return vault.recapRecords;
      }
    }
  } catch {}

  return INITIAL_MONTHLY_RECAP;
}

export function saveSafeMonthlyRecap(records: MonthlyProductivityRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECAP, JSON.stringify(records));
    // Update vault immediately
    snapshotToMasterVault({ recapRecords: records });
  } catch (err) {
    console.error('Error saving monthly recap:', err);
  }
}

export function loadSafeBankData(): BankDataModel[] {
  const found = scanArrayFromKeys<BankDataModel>(LEGACY_KEYS.BANK);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.bankModels && Array.isArray(vault.bankModels) && vault.bankModels.length > 0) {
        localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(vault.bankModels));
        return vault.bankModels;
      }
    }
  } catch {}

  return INITIAL_BANK_DATA;
}

export function saveSafeBankData(models: BankDataModel[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(models));
    snapshotToMasterVault({ bankModels: models });
  } catch (err) {
    console.error('Error saving bank data:', err);
  }
}

export function loadSafeSchedules(): StyleScheduleRecord[] {
  const found = scanArrayFromKeys<StyleScheduleRecord>(LEGACY_KEYS.SCHEDULES);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.styleSchedules && Array.isArray(vault.styleSchedules) && vault.styleSchedules.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(vault.styleSchedules));
        return vault.styleSchedules;
      }
    }
  } catch {}

  return INITIAL_STYLE_SCHEDULES;
}

export function saveSafeSchedules(schedules: StyleScheduleRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    snapshotToMasterVault({ styleSchedules: schedules });
  } catch (err) {
    console.error('Error saving style schedules:', err);
  }
}

export function loadSafeRepairDefects(): RepairDefectRecord[] {
  const found = scanArrayFromKeys<RepairDefectRecord>(LEGACY_KEYS.REPAIR);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.repairRecords && Array.isArray(vault.repairRecords) && vault.repairRecords.length > 0) {
        localStorage.setItem(STORAGE_KEYS.REPAIR, JSON.stringify(vault.repairRecords));
        return vault.repairRecords;
      }
    }
  } catch {}

  return INITIAL_REPAIR_DEFECT_DATA;
}

export function saveSafeRepairDefects(records: RepairDefectRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.REPAIR, JSON.stringify(records));
    snapshotToMasterVault({ repairRecords: records });
  } catch (err) {
    console.error('Error saving repair defect records:', err);
  }
}

export function loadSafePEFindings(): ProcessEngineeringFinding[] {
  const found = scanArrayFromKeys<ProcessEngineeringFinding>(LEGACY_KEYS.FINDINGS);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.peFindings && Array.isArray(vault.peFindings) && vault.peFindings.length > 0) {
        localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(vault.peFindings));
        return vault.peFindings;
      }
    }
  } catch {}

  return INITIAL_PE_FINDINGS;
}

export function saveSafePEFindings(findings: ProcessEngineeringFinding[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(findings));
    snapshotToMasterVault({ peFindings: findings });
  } catch (err) {
    console.error('Error saving PE findings:', err);
  }
}

export function loadSafeUrgentNotifications(): UrgentPushNotification[] {
  const found = scanArrayFromKeys<UrgentPushNotification>(LEGACY_KEYS.NOTIFICATIONS);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.urgentNotifications && Array.isArray(vault.urgentNotifications) && vault.urgentNotifications.length > 0) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(vault.urgentNotifications));
        return vault.urgentNotifications;
      }
    }
  } catch {}

  return [];
}

export function saveSafeUrgentNotifications(notifications: UrgentPushNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    snapshotToMasterVault({ urgentNotifications: notifications });
  } catch (err) {
    console.error('Error saving urgent notifications:', err);
  }
}

export function loadSafeIncidents(): LineIncident[] {
  const found = scanArrayFromKeys<LineIncident>(LEGACY_KEYS.INCIDENTS);
  if (found && found.length > 0) {
    return found;
  }

  try {
    const rawVault = localStorage.getItem(STORAGE_KEYS.MASTER_VAULT);
    if (rawVault) {
      const vault = JSON.parse(rawVault) as MasterVaultPayload;
      if (vault.incidents && Array.isArray(vault.incidents) && vault.incidents.length > 0) {
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(vault.incidents));
        return vault.incidents;
      }
    }
  } catch {}

  return [];
}

export function saveSafeIncidents(incidents: LineIncident[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    snapshotToMasterVault({ incidents });
  } catch (err) {
    console.error('Error saving incidents:', err);
  }
}

// Emergency Snapshot before clearing or resetting data
export function saveEmergencyUndoSnapshot(allData: MasterVaultPayload) {
  try {
    localStorage.setItem(STORAGE_KEYS.EMERGENCY_UNDO, JSON.stringify({
      timestamp: new Date().toISOString(),
      payload: allData
    }));
  } catch {}
}

export function getEmergencyUndoSnapshot(): MasterVaultPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMERGENCY_UNDO);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.payload || null;
    }
  } catch {}
  return null;
}

// ==========================================
// AUTOMATIC INITIALIZATION & RESTORATION
// (Dipanggil saat aplikasi baru dibuka untuk memastikan tidak ada data yang hilang saat update git)
// ==========================================
export async function ensurePersistentDataPreserved(): Promise<boolean> {
  try {
    // 1. Cek apakah ada data di localStorage
    const currentRecap = loadSafeMonthlyRecap();
    const currentBank = loadSafeBankData();
    const currentSchedules = loadSafeSchedules();

    const hasAnyLocalData = currentRecap.length > 0 || currentBank.length > 0 || currentSchedules.length > 0;

    if (!hasAnyLocalData) {
      // 2. Jika localStorage kosong (misal setelah git reset/clear browser cache), pulihkan dari IndexedDB
      const idbData = await loadFromIndexedDBVault();
      if (idbData) {
        console.info('🛡️ Data lama dipulihkan secara otomatis dari Brankas IndexedDB setelah sinkronisasi.');
        if (idbData.recapRecords?.length) saveSafeMonthlyRecap(idbData.recapRecords);
        if (idbData.bankModels?.length) saveSafeBankData(idbData.bankModels);
        if (idbData.styleSchedules?.length) saveSafeSchedules(idbData.styleSchedules);
        if (idbData.repairRecords?.length) saveSafeRepairDefects(idbData.repairRecords);
        if (idbData.peFindings?.length) saveSafePEFindings(idbData.peFindings);
        if (idbData.urgentNotifications?.length) saveSafeUrgentNotifications(idbData.urgentNotifications);
        if (idbData.incidents?.length) saveSafeIncidents(idbData.incidents);
        if (idbData.sheetUrl) localStorage.setItem(STORAGE_KEYS.SHEET_URL, idbData.sheetUrl);
        return true;
      }
    } else {
      // Perbarui snapshot brankas
      snapshotToMasterVault();
    }
    return false;
  } catch (err) {
    console.error('Error verifying persistent vault data:', err);
    return false;
  }
}
