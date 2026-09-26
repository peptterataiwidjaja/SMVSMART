import React, { useState } from 'react';
import { Smartphone, HardDrive, ShieldCheck, UserCheck, Download, CheckCircle, X, Share2, PlusSquare, Info, FileSpreadsheet, LogOut } from 'lucide-react';
import { AuthUser, DataSourceState } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TopUtilityBarProps {
  onOpenBackupModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSheetModal?: () => void;
  onOpenAccountAccess?: () => void;
  onLogout?: () => void;
  dataSource?: DataSourceState;
  currentUser?: AuthUser;
}

export const TopUtilityBar: React.FC<TopUtilityBarProps> = ({
  onOpenBackupModal,
  onOpenLoginModal,
  onOpenSheetModal,
  onOpenAccountAccess,
  onLogout,
  dataSource,
  currentUser
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleAndroidInstallClick = () => {
    if (isInstallable) {
      install();
    } else {
      setShowAndroidModal(true);
    }
  };

  return (
    <aside aria-label="Bilah Utilitas Sistem" className="w-full bg-slate-900 text-slate-100 border-b border-slate-800 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          
          {/* SISI KIRI: IDENTITAS SISTEM & STATUS OFFLINE */}
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-extrabold text-white tracking-wide text-xs">
              PT Teratai Widjaja
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              Sistem Sewing Line &amp; Rekayasa Proses (PE)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold border border-slate-700 hidden lg:inline-flex items-center space-x-1">
              <CheckCircle className="w-2.5 h-2.5" />
              <span>Offline Ready</span>
            </span>
          </div>

          {/* SISI KANAN: BAR KHUSUS (INSTAL ANDROID, CADANGAN PEMULIHAN, PENGATURAN AKUN) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* 1. PILIHAN INSTAL ANDROID */}
            <div className="relative">
              {isInstalled ? (
                <div 
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[11px] font-bold"
                  title="Aplikasi telah terpasang di perangkat Anda sebagai aplikasi mandiri"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Android Terpasang</span>
                </div>
              ) : isIOS ? (
                <button
                  type="button"
                  onClick={() => setShowIOSModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-extrabold transition-all active:scale-95 shadow-2xs cursor-pointer"
                  title="Petunjuk pasang aplikasi di Apple iOS (iPhone/iPad)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pasang di iOS</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-topbar-install-android"
                  onClick={handleAndroidInstallClick}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-black transition-all active:scale-95 shadow-2xs border border-emerald-500 cursor-pointer"
                  title="Pasang aplikasi di smartphone Android (Bisa bekerja penuh offline)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span>Instal Android</span>
                  <span className="hidden xl:inline text-[9.5px] bg-emerald-900/90 text-emerald-200 px-1.5 py-0.2 rounded font-normal">
                    PWA / APK
                  </span>
                </button>
              )}
            </div>

            {/* PEMISAH VERTIKAL */}
            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* 2. PILIHAN CADANGAN & PEMULIHAN */}
            <button
              type="button"
              id="btn-topbar-backup-restore"
              onClick={onOpenBackupModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-extrabold transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Buka menu Cadangan & Pemulihan Data Offline Lokal (Ekspor / Impor JSON)"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cadangan &amp; Pemulihan</span>
              <span className="hidden lg:inline text-[9.5px] text-slate-400 font-normal">
                (JSON)
              </span>
            </button>

            {/* PEMISAH VERTIKAL */}
            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* 2B. PILIHAN TAUTKAN SPREADSHEET GS */}
            {onOpenSheetModal && (
              <>
                <button
                  type="button"
                  id="btn-topbar-connect-gs"
                  onClick={onOpenSheetModal}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                    dataSource?.isLive
                      ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border-emerald-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title="Pilihan Tautkan dengan Spreadsheet via Google Apps Script (.gs) atau Tautan Langsung"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${dataSource?.isLive ? 'text-emerald-400' : 'text-emerald-400'}`} />
                  <span>Tautkan Spreadsheet (.gs)</span>
                  {dataSource?.isLive ? (
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-600 text-white animate-pulse">
                      Live GS
                    </span>
                  ) : (
                    <span className="hidden lg:inline text-[9.5px] text-slate-400 font-normal">
                      (GS)
                    </span>
                  )}
                </button>

                {/* PEMISAH VERTIKAL */}
                <span className="text-slate-700 hidden sm:inline">|</span>
              </>
            )}

            {/* 3. PILIHAN PENGATURAN AKUN / GANTI AKUN */}
            {currentUser?.canManageAccounts && onOpenAccountAccess && (
              <button
                type="button"
                id="btn-topbar-account-access"
                onClick={onOpenAccountAccess}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1a3478] hover:bg-blue-800 text-white border border-blue-500 text-[11px] font-black transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Kelola Akses Akun & Bar Navigasi (Khusus PE)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                <span>Akses Akun</span>
              </button>
            )}

            <button
              type="button"
              id="btn-topbar-account-settings"
              onClick={onOpenLoginModal}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                currentUser?.role === 'PE'
                  ? 'bg-blue-900/80 hover:bg-blue-800 text-blue-100 border-blue-600'
                  : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-700'
              }`}
              title="Ganti Akun Pengguna"
            >
              <UserCheck className={`w-3.5 h-3.5 ${currentUser?.role === 'PE' ? 'text-blue-300' : 'text-amber-400'}`} />
              <span>{currentUser?.name || 'Pengguna'}</span>
              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                currentUser?.role === 'PE'
                  ? 'bg-blue-700 text-white'
                  : 'bg-amber-700 text-white'
              }`}>
                {currentUser?.username || (currentUser?.role === 'PE' ? 'PE' : 'User')}
              </span>
            </button>

            {onLogout && (
              <button
                type="button"
                id="btn-topbar-logout"
                onClick={onLogout}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                title="Keluar ke Halaman Masuk (Login)"
              >
                <LogOut className="w-3.5 h-3.5 text-red-300" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* MODAL PANDUAN INSTALASI ANDROID */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Instal Aplikasi di Android
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dapat dijalankan langsung seperti aplikasi native Android
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start space-x-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[11.5px] leading-relaxed">
                  <strong>100% Mandiri &amp; Tersedia Offline:</strong> Setelah dipasang di Android, seluruh kalkulasi SMV, jadwal sewing, dan rekap produksi dapat diakses tanpa koneksi internet.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-700 text-xs">
                    Buka aplikasi ini menggunakan browser <strong>Google Chrome</strong> di ponsel Android.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-700 text-xs">
                    Ketuk menu <strong>titik tiga (⋮)</strong> di sudut kanan atas browser Chrome.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-700 text-xs">
                    Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <p className="text-slate-700 text-xs">
                    Ikon aplikasi PT Teratai Widjaja akan muncul di layar beranda ponsel Anda dan siap digunakan sewaktu-waktu.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAndroidModal(false)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                Saya Mengerti &amp; Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PANDUAN INSTALASI IOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Pasang di iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <p>Buka menu <strong>Share / Bagikan</strong> (<Share2 className="w-3 h-3 inline mx-0.5" />) di browser Safari.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <p>Ketuk opsi <strong>"Tambah ke Layar Utama"</strong> (<PlusSquare className="w-3 h-3 inline mx-0.5" />).</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </aside>
  );
};
