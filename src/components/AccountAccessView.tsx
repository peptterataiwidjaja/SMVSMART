import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  LayoutGrid,
  Users,
  RotateCcw,
  Eye,
  EyeOff,
  CheckSquare,
  Square
} from 'lucide-react';
import { AuthUser, NavBarConfigItem, NavTabId } from '../types';
import { ALL_NAV_TAB_IDS, DEFAULT_NAV_BARS } from '../services/authService';

interface AccountAccessViewProps {
  currentUser: AuthUser;
  accounts: AuthUser[];
  navBarConfig: NavBarConfigItem[];
  onSaveAccounts: (updatedAccounts: AuthUser[]) => void;
  onSaveNavBarConfig: (updatedConfig: NavBarConfigItem[]) => void;
  onResetNavBarConfig: () => void;
}

export const AccountAccessView: React.FC<AccountAccessViewProps> = ({
  currentUser,
  accounts,
  navBarConfig,
  onSaveAccounts,
  onSaveNavBarConfig,
  onResetNavBarConfig
}) => {
  const [activeSubSection, setActiveSubSection] = useState<'users' | 'bars'>('users');

  // State untuk form tambah / edit akun
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AuthUser | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [canInputData, setCanInputData] = useState(true);
  const [canEditDelete, setCanEditDelete] = useState(false);
  const [canPrintPdf, setCanPrintPdf] = useState(true);
  const [canBackupRestore, setCanBackupRestore] = useState(false);
  const [canManageAccounts, setCanManageAccounts] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<NavTabId[]>([
    'overview',
    'style-schedule',
    'monthly-recap',
    'repair-defect'
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // State untuk edit nama & status bar navigasi
  const [localBars, setLocalBars] = useState<NavBarConfigItem[]>(navBarConfig);
  const [barSavedNotice, setBarSavedNotice] = useState(false);

  // Proteksi halaman: hanya PE / pemilik izin canManageAccounts yang bisa mengakses
  const isAuthorizedPE = currentUser.role === 'PE' || Boolean(currentUser.canManageAccounts);

  if (!isAuthorizedPE) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Akses Terbatas Khusus PE</h3>
        <p className="text-xs text-slate-500">
          Halaman Akses Akun hanya dapat dibuka oleh akun Process Engineering (PE).
        </p>
      </div>
    );
  }

  const openAddForm = () => {
    setEditingAccount(null);
    setUsername('');
    setName('');
    setPassword('');
    setShowFormPassword(false);
    setRoleTitle('Staff Produksi');
    setCanInputData(true);
    setCanEditDelete(false);
    setCanPrintPdf(true);
    setCanBackupRestore(false);
    setCanManageAccounts(false);
    setAllowedTabs(['overview', 'style-schedule', 'monthly-recap', 'repair-defect']);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (acc: AuthUser) => {
    setEditingAccount(acc);
    setUsername(acc.username);
    setName(acc.name);
    setPassword(''); // Kosongkan agar password lama tidak terbuka; isi hanya jika ingin mengganti
    setShowFormPassword(false);
    setRoleTitle(acc.roleTitle || '');
    setCanInputData(acc.canInputData);
    setCanEditDelete(acc.canEditDelete);
    setCanPrintPdf(acc.canPrintPdf);
    setCanBackupRestore(acc.canBackupRestore);
    const isPrimaryPE = acc.id === 'usr-pe-001';
    setCanManageAccounts(isPrimaryPE ? true : Boolean(acc.canManageAccounts));
    setAllowedTabs(acc.allowedTabs && acc.allowedTabs.length > 0 ? [...acc.allowedTabs] : [...ALL_NAV_TAB_IDS]);
    setFormError(null);
    setIsFormOpen(true);
  };

  const toggleTabPermission = (tabId: NavTabId) => {
    if (editingAccount?.id === 'usr-pe-001' && tabId === 'account-access') {
      return; // Akun utama PE wajib tetap memiliki akses ke Akses Akun
    }
    setAllowedTabs(prev =>
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const handleSaveAccountForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim();
    const cleanName = name.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanName) {
      setFormError('User dan Nama Tampilan wajib diisi.');
      return;
    }

    if (!editingAccount && !cleanPassword) {
      setFormError('Password wajib diisi untuk akun baru.');
      return;
    }

    // Cek duplikasi username
    const duplicate = accounts.find(
      a => a.username.trim().toLowerCase() === cleanUsername.toLowerCase() && a.id !== editingAccount?.id
    );
    if (duplicate) {
      setFormError(`User "${cleanUsername}" sudah digunakan. Gunakan nama user lain.`);
      return;
    }

    const finalTabs = new Set<NavTabId>(allowedTabs.length > 0 ? allowedTabs : ['overview']);
    const isPEAccount = editingAccount?.id === 'usr-pe-001' || canManageAccounts;
    if (isPEAccount) {
      finalTabs.add('account-access');
    } else {
      finalTabs.delete('account-access');
    }

    if (editingAccount) {
      const updated = accounts.map(acc => {
        if (acc.id !== editingAccount.id) return acc;
        return {
          ...acc,
          username: cleanUsername,
          name: cleanName,
          password: cleanPassword ? cleanPassword : acc.password,
          role: isPEAccount ? ('PE' as const) : ('STAFF' as const),
          roleTitle: roleTitle.trim() || (isPEAccount ? 'Process Engineering' : 'Staff Operasional'),
          canInputData,
          canEditDelete,
          canPrintPdf,
          canBackupRestore,
          canManageAccounts: isPEAccount,
          allowedTabs: Array.from(finalTabs)
        };
      });
      onSaveAccounts(updated);
    } else {
      const newAcc: AuthUser = {
        id: `usr-${Date.now()}`,
        username: cleanUsername,
        password: cleanPassword,
        name: cleanName,
        email: `${cleanUsername.toLowerCase()}@terataiwidjaja.com`,
        role: isPEAccount ? 'PE' : 'STAFF',
        roleTitle: roleTitle.trim() || (isPEAccount ? 'Process Engineering' : 'Staff Operasional'),
        department: isPEAccount ? 'Process Engineering (PE)' : 'Production & Sewing',
        canInputData,
        canEditDelete,
        canPrintPdf,
        canBackupRestore,
        canManageAccounts: isPEAccount,
        allowedTabs: Array.from(finalTabs),
        lastLogin: new Date().toISOString()
      };
      onSaveAccounts([...accounts, newAcc]);
    }

    setIsFormOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (acc: AuthUser) => {
    if (acc.id === 'usr-pe-001') return; // Jangan hapus akun utama PE
    const updated = accounts.filter(a => a.id !== acc.id);
    onSaveAccounts(updated);
  };

  const handleBarChange = (id: NavTabId, field: 'label' | 'shortLabel' | 'enabled', value: string | boolean) => {
    setLocalBars(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        if (id === 'account-access' && field === 'enabled') return { ...b, enabled: true };
        return { ...b, [field]: value };
      })
    );
    setBarSavedNotice(false);
  };

  const handleSaveBars = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNavBarConfig(localBars);
    setBarSavedNotice(true);
    setTimeout(() => setBarSavedNotice(false), 3000);
  };

  const handleResetBars = () => {
    setLocalBars(DEFAULT_NAV_BARS);
    onResetNavBarConfig();
    setBarSavedNotice(true);
    setTimeout(() => setBarSavedNotice(false), 3000);
  };

  const getBarLabel = (tabId: NavTabId) => {
    const found = navBarConfig.find(b => b.id === tabId);
    return found ? found.label : tabId;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Bar Akses Akun */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#1a3478] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Manajemen Akses Akun &amp; Pengaturan Bar
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                Khusus PE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambah atau hapus akun, ganti nama user, serta atur nama dan hak akses bar navigasi.
            </p>
          </div>
        </div>

        {/* Sub-menu Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubSection('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubSection === 'users'
                ? 'bg-white text-[#1a3478] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Akun ({accounts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLocalBars(navBarConfig);
              setActiveSubSection('bars');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubSection === 'bars'
                ? 'bg-white text-[#1a3478] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Ganti Nama &amp; Akses Bar</span>
          </button>
        </div>
      </div>

      {/* BAGIAN 1: DAFTAR AKUN & HAK AKSES BAR PER USER */}
      {activeSubSection === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Total {accounts.length} Akun Terdaftar (Password disembunyikan demi keamanan)
            </span>
            <button
              type="button"
              onClick={openAddForm}
              className="px-3.5 py-2 bg-[#288390] hover:bg-[#216d78] text-white rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Akun Baru</span>
            </button>
          </div>

          {/* Form Tambah / Edit Akun */}
          {isFormOpen && (
            <form
              onSubmit={handleSaveAccountForm}
              className="bg-white p-5 rounded-xl border-2 border-[#288390]/40 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingAccount ? `Edit Akun & Akses: ${editingAccount.name}` : 'Tambah Akun Pengguna Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    User (ID Login) *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: PE, qc1, spv"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#288390]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Tampilan *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap / bagian"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#288390]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingAccount ? 'Ganti Password (Opsional)' : 'Password Login *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingAccount ? 'Kosongkan jika tetap' : 'Masukkan password'}
                      required={!editingAccount}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#288390]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jabatan / Bagian
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Contoh: Process Engineering"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#288390]"
                  />
                </div>
              </div>

              {/* Pilihan Hak Akses Bar Navigasi */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Pilih Bar Navigasi yang Dapat Diakses oleh Akun Ini:
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setAllowedTabs(
                          canManageAccounts || editingAccount?.id === 'usr-pe-001'
                            ? [...ALL_NAV_TAB_IDS]
                            : ALL_NAV_TAB_IDS.filter(t => t !== 'account-access')
                        )
                      }
                      className="text-blue-700 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua Bar
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAllowedTabs(
                          editingAccount?.id === 'usr-pe-001'
                            ? ['overview', 'account-access']
                            : ['overview']
                        )
                      }
                      className="text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Hanya Ikhtisar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {navBarConfig
                    .filter(b => b.id !== 'account-access')
                    .map(bar => {
                      const isChecked = allowedTabs.includes(bar.id);
                      return (
                        <button
                          key={bar.id}
                          type="button"
                          onClick={() => toggleTabPermission(bar.id)}
                          className={`p-2 rounded-lg border text-left text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-400 text-blue-900'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{bar.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Pilihan Wewenang Tindakan Data */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Wewenang Tindakan &amp; Integrasi Data:
                </label>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canInputData}
                      onChange={(e) => setCanInputData(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Input Data Baru</span>
                  </label>

                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canEditDelete}
                      onChange={(e) => setCanEditDelete(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Edit &amp; Hapus Data</span>
                  </label>

                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canPrintPdf}
                      onChange={(e) => setCanPrintPdf(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Cetak / Print PDF</span>
                  </label>

                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canBackupRestore}
                      onChange={(e) => setCanBackupRestore(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Kelola Cadangan &amp; Spreadsheet</span>
                  </label>

                  {editingAccount?.id !== 'usr-pe-001' && (
                    <label className="inline-flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canManageAccounts}
                        onChange={(e) => setCanManageAccounts(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-blue-800">Beri Hak Akses Menu "Akses Akun" (Setara PE)</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#288390] hover:bg-[#216d78] text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Akun</span>
                </button>
              </div>
            </form>
          )}

          {/* Tabel Daftar Akun */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="px-4 py-3">User (Login)</th>
                    <th className="px-4 py-3">Nama Tampilan</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3">Akses Bar yang Tersedia</th>
                    <th className="px-4 py-3">Hak Operasional</th>
                    <th className="px-4 py-3 text-right">Aksi PE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {accounts.map(acc => {
                    const isPrimaryPE = acc.id === 'usr-pe-001';
                    const userTabs = acc.allowedTabs || ALL_NAV_TAB_IDS;

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span>{acc.username}</span>
                            {isPrimaryPE && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Utama PE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div>{acc.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{acc.roleTitle}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 tracking-widest select-none">
                          ••••••••
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {userTabs.map(tId => (
                              <span
                                key={tId}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  tId === 'account-access'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {getBarLabel(tId)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
                            {acc.canInputData && (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Input
                              </span>
                            )}
                            {acc.canEditDelete && (
                              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                Edit/Hapus
                              </span>
                            )}
                            {acc.canPrintPdf && (
                              <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                Print PDF
                              </span>
                            )}
                            {!acc.canInputData && !acc.canEditDelete && (
                              <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                Pantau Saja
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(acc)}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Ganti Nama, Password & Akses Bar"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit / Ganti Nama</span>
                            </button>
                            {!isPrimaryPE && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BAGIAN 2: KELOLA NAMA & KETERSEDIAAN BAR NAVIGASI */}
      {activeSubSection === 'bars' && (
        <form
          onSubmit={handleSaveBars}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Ubah Nama &amp; Ketersediaan Bar Navigasi
              </h3>
              <p className="text-xs text-slate-500">
                PE berhak mengganti nama tampilan bar menu dan mengaktifkan/menonaktifkan bar yang tersedia.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetBars}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold inline-flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#288390] hover:bg-[#216d78] text-white text-xs font-bold shadow-2xs inline-flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Bar</span>
              </button>
            </div>
          </div>

          {barSavedNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan nama dan akses bar navigasi berhasil disimpan.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localBars.map(bar => {
              const isAccountBar = bar.id === 'account-access';
              return (
                <div
                  key={bar.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                    bar.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {bar.id}
                    </span>
                    <label className="inline-flex items-center space-x-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bar.enabled}
                        disabled={isAccountBar}
                        onChange={(e) => handleBarChange(bar.id, 'enabled', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={bar.enabled ? 'text-emerald-700' : 'text-slate-500'}>
                        {isAccountBar ? 'Wajib Aktif (Khusus PE)' : bar.enabled ? 'Tersedia (Aktif)' : 'Disembunyikan'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Bar (Desktop)
                      </label>
                      <input
                        type="text"
                        value={bar.label}
                        onChange={(e) => handleBarChange(bar.id, 'label', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Ringkas (Mobile)
                      </label>
                      <input
                        type="text"
                        value={bar.shortLabel}
                        onChange={(e) => handleBarChange(bar.id, 'shortLabel', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      )}
    </div>
  );
};
