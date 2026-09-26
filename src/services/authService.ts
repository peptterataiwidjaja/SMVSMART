import { AuthUser, UserRole, NavTabId, NavBarConfigItem } from '../types';

export const AUTH_STORAGE_KEY = 'tw_auth_active_user_v1';
export const AUTH_SESSION_FLAG_KEY = 'tw_auth_session_logged_in_v2';
export const USER_ACCOUNTS_STORAGE_KEY = 'tw_user_accounts_v1';
export const NAVBAR_CONFIG_STORAGE_KEY = 'tw_navbar_config_v1';

export const ALL_NAV_TAB_IDS: NavTabId[] = [
  'overview',
  'style-schedule',
  'scenario-analysis',
  'monthly-recap',
  'repair-defect',
  'bank-data',
  'daily-smv',
  'revenue',
  'data-matrix',
  'account-access'
];

export const DEFAULT_NAV_BARS: NavBarConfigItem[] = [
  { id: 'overview', label: 'Ikhtisar & KPI', shortLabel: 'Ikhtisar', enabled: true },
  { id: 'style-schedule', label: 'Jadwal Style Sewing', shortLabel: 'Jadwal Style', enabled: true },
  { id: 'scenario-analysis', label: 'Skenario 5 vs 6 Hari & OT', shortLabel: 'Skenario 5 Hari', enabled: true },
  { id: 'monthly-recap', label: 'Rekap Harian & Analisis', shortLabel: 'Rekap Harian', enabled: true },
  { id: 'repair-defect', label: 'Repair & Defect (Fishbone)', shortLabel: 'Repair & Defect', enabled: true },
  { id: 'bank-data', label: 'Bank Data Model & Target', shortLabel: 'Bank Data', enabled: true },
  { id: 'daily-smv', label: 'Analisis Tren SMV', shortLabel: 'Tren SMV', enabled: true },
  { id: 'revenue', label: 'Kinerja Revenue', shortLabel: 'Revenue', enabled: true },
  { id: 'data-matrix', label: 'Matriks Lengkap SMV', shortLabel: 'Matriks SMV', enabled: true },
  { id: 'account-access', label: 'Akses Akun', shortLabel: 'Akses Akun', enabled: true }
];

export const DEFAULT_PE_USER: AuthUser = {
  id: 'usr-pe-001',
  username: 'PE',
  password: 'pe123',
  name: 'Process Engineering (PE)',
  email: 'pe@terataiwidjaja.com',
  role: 'PE',
  roleTitle: 'Process Engineering & Admin Akses',
  department: 'Process Engineering (PE)',
  canInputData: true,
  canPrintPdf: true,
  canEditDelete: true,
  canBackupRestore: true,
  canManageAccounts: true,
  allowedTabs: [...ALL_NAV_TAB_IDS],
  lastLogin: new Date().toISOString()
};

export const DEFAULT_MONITOR_USER: AuthUser = {
  id: 'usr-mon-002',
  username: 'monitor',
  password: 'monitor123',
  name: 'Akun Pemantau (Monitor)',
  email: 'monitor@terataiwidjaja.com',
  role: 'MONITOR',
  roleTitle: 'Monitoring Display',
  department: 'Operational Viewer',
  canInputData: false,
  canPrintPdf: false,
  canEditDelete: false,
  canBackupRestore: false,
  canManageAccounts: false,
  allowedTabs: ['overview', 'style-schedule', 'monthly-recap', 'repair-defect', 'daily-smv', 'revenue', 'data-matrix'],
  lastLogin: new Date().toISOString()
};

/**
 * Memuat daftar seluruh akun pengguna yang terdaftar (Default awal: hanya PE dengan pass pe123)
 */
export function loadUserAccounts(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USER_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Pastikan akun utama PE selalu memiliki akses ke 'account-access'
        const hasPE = parsed.some((u: AuthUser) => u.id === 'usr-pe-001' || u.role === 'PE');
        if (!hasPE) {
          return [DEFAULT_PE_USER, ...parsed];
        }
        return parsed.map((u: AuthUser) => {
          if (u.id === 'usr-pe-001' || u.role === 'PE') {
            const tabs = new Set<NavTabId>(u.allowedTabs || ALL_NAV_TAB_IDS);
            tabs.add('account-access');
            return {
              ...u,
              password: u.password || 'pe123',
              canManageAccounts: true,
              allowedTabs: Array.from(tabs)
            };
          }
          return {
            ...u,
            canManageAccounts: Boolean(u.canManageAccounts),
            allowedTabs: (u.allowedTabs || ['overview']).filter(t => t !== 'account-access' || u.canManageAccounts)
          };
        });
      }
    }
  } catch (err) {
    console.warn('Gagal memuat daftar akun pengguna:', err);
  }
  // Default awal sesuai permintaan: sementara hanya akun PE dengan pass pe123
  const initial = [DEFAULT_PE_USER];
  try {
    localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

/**
 * Menyimpan daftar seluruh akun pengguna ke localStorage
 */
export function saveUserAccounts(accounts: AuthUser[]): void {
  try {
    localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    // Sinkronkan juga jika akun yang sedang login ikut diedit namanya/aksesnya
    const current = getStoredAuthUser();
    const updatedCurrent = accounts.find(a => a.id === current.id);
    if (updatedCurrent) {
      saveAuthUser(updatedCurrent);
    }
  } catch (err) {
    console.error('Gagal menyimpan daftar akun pengguna:', err);
  }
}

/**
 * Memuat konfigurasi nama & status aktif bar navigasi
 */
export function loadNavBarConfig(): NavBarConfigItem[] {
  try {
    const raw = localStorage.getItem(NAVBAR_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Pastikan semua tab ID ada (termasuk account-access)
        return DEFAULT_NAV_BARS.map(def => {
          const found = parsed.find((p: NavBarConfigItem) => p.id === def.id);
          if (found) {
            return {
              id: def.id,
              label: found.label || def.label,
              shortLabel: found.shortLabel || found.label || def.shortLabel,
              enabled: def.id === 'account-access' ? true : (found.enabled ?? true)
            };
          }
          return def;
        });
      }
    }
  } catch (err) {
    console.warn('Gagal memuat konfigurasi bar navigasi:', err);
  }
  return DEFAULT_NAV_BARS;
}

/**
 * Menyimpan konfigurasi nama & status aktif bar navigasi
 */
export function saveNavBarConfig(items: NavBarConfigItem[]): void {
  try {
    localStorage.setItem(NAVBAR_CONFIG_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi bar navigasi:', err);
  }
}

/**
 * Mereset konfigurasi bar navigasi ke default awal
 */
export function resetNavBarConfig(): NavBarConfigItem[] {
  try {
    localStorage.removeItem(NAVBAR_CONFIG_STORAGE_KEY);
  } catch {}
  return DEFAULT_NAV_BARS;
}

/**
 * Cek apakah pengguna sudah login pada sesi ini
 */
export function isSessionAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_SESSION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionAuthenticated(authenticated: boolean): void {
  try {
    if (authenticated) {
      localStorage.setItem(AUTH_SESSION_FLAG_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_SESSION_FLAG_KEY);
    }
  } catch {}
}

/**
 * Mendapatkan pengguna aktif saat ini dari localStorage
 */
export function getStoredAuthUser(): AuthUser {
  const accounts = loadUserAccounts();
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && parsed.id) {
        const latestFromList = accounts.find(a => a.id === parsed.id);
        if (latestFromList) {
          return latestFromList;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca sesi pengguna:', err);
  }
  return accounts[0] || DEFAULT_PE_USER;
}

/**
 * Menyimpan sesi pengguna aktif ke localStorage
 */
export function saveAuthUser(user: AuthUser): void {
  try {
    const updated: AuthUser = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    setSessionAuthenticated(true);
  } catch (err) {
    console.error('Gagal menyimpan sesi pengguna:', err);
  }
}

/**
 * Otentikasi login berdasarkan User (username / nama) dan Password
 */
export function loginWithCredentials(usernameInput: string, passwordInput: string): AuthUser | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) return null;

  const accounts = loadUserAccounts();

  const matched = accounts.find(acc => {
    const uMatch =
      acc.username.trim().toLowerCase() === cleanUser ||
      acc.name.trim().toLowerCase() === cleanUser ||
      (acc.email && acc.email.trim().toLowerCase() === cleanUser);
    const pMatch = (acc.password || '') === cleanPass;
    return uMatch && pMatch;
  });

  if (matched) {
    saveAuthUser(matched);
    return matched;
  }

  return null;
}

/**
 * Beralih akun cepat (hanya digunakan jika diizinkan oleh PE)
 */
export function switchAccount(targetRole: UserRole): AuthUser {
  const accounts = loadUserAccounts();
  const user = accounts.find(a => a.role === targetRole) || DEFAULT_PE_USER;
  saveAuthUser(user);
  return user;
}

/**
 * Menghapus sesi login (Log out)
 */
export function logoutAuthUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSessionAuthenticated(false);
  } catch {}
}
