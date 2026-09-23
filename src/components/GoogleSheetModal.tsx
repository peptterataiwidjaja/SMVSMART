import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Code2, 
  HelpCircle,
  Clock,
  FileSpreadsheet,
  Link,
  ClipboardPaste,
  Download,
  UploadCloud,
  FileDown,
  Layers,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { DataSourceState } from '../types';
import { APPS_SCRIPT_TEMPLATE } from '../data/defaultData';
import { exportToGoogleSheetCsv, downloadCsvFile, extractSpreadsheetInfo } from '../services/sheetService';

export type SheetLinkTab = 'apps-script' | 'direct-link' | 'paste-data' | 'templates';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSourceState;
  onConnect: (url: string, mode?: 'apps-script' | 'direct-sheet') => Promise<void>;
  onResetDefault: () => void;
  onIntervalChange: (intervalSec: number) => void;
  onImportPastedData?: (pastedText: string, type: 'recap' | 'bank') => { count: number; message: string };
  onPushDataToSheet?: (target: 'recap' | 'bank') => Promise<{ success: boolean; message: string }>;
  recapRecordsCount?: number;
  bankModelsCount?: number;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  dataSource,
  onConnect,
  onResetDefault,
  onIntervalChange,
  onImportPastedData,
  onPushDataToSheet,
  recapRecordsCount = 0,
  bankModelsCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<SheetLinkTab>('apps-script');
  const [urlInput, setUrlInput] = useState(dataSource.appsScriptUrl || dataSource.spreadsheetUrl || '');
  const [directUrlInput, setDirectUrlInput] = useState(dataSource.spreadsheetUrl || '');
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPushing, setIsPushing] = useState<'recap' | 'bank' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // State untuk Tab Tempel Data
  const [pastedContent, setPastedContent] = useState('');
  const [pasteTargetType, setPasteTargetType] = useState<'recap' | 'bank'>('recap');

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Gagal menyalin kode:', err);
    }
  };

  const handleConnectAppsScript = async () => {
    setLocalError(null);
    setLocalSuccess(null);
    const targetUrl = urlInput.trim();
    if (!targetUrl) {
      setLocalError('Silakan masukkan URL Web App Google Apps Script (.gs) Anda.');
      return;
    }
    if (!targetUrl.startsWith('https://script.google.com/macros/s/')) {
      setLocalError('Format URL Apps Script biasanya berawalan https://script.google.com/macros/s/.../exec');
    }

    setIsConnecting(true);
    try {
      await onConnect(targetUrl, 'apps-script');
      setLocalSuccess('Berhasil terhubung ke Google Apps Script!');
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      setLocalError(e.message || 'Gagal menyambung ke Google Apps Script.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectDirectLink = async () => {
    setLocalError(null);
    setLocalSuccess(null);
    const targetUrl = directUrlInput.trim();
    if (!targetUrl) {
      setLocalError('Silakan masukkan tautan Google Spreadsheet Anda.');
      return;
    }

    const { spreadsheetId } = extractSpreadsheetInfo(targetUrl);
    if (!spreadsheetId) {
      setLocalError('Format tautan tidak valid. Pastikan tautan dari https://docs.google.com/spreadsheets/d/.../edit');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(targetUrl, 'direct-sheet');
      setLocalSuccess('Berhasil membaca data dari Google Spreadsheet langsung!');
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      setLocalError(e.message || 'Gagal membaca Google Spreadsheet. Pastikan akses disetel ke "Siapa saja yang memiliki link dapat melihat".');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApplyPastedData = () => {
    setLocalError(null);
    setLocalSuccess(null);
    if (!pastedContent.trim()) {
      setLocalError('Kotak teks tempel masih kosong. Salin tabel dari Google Sheets (Ctrl+C) lalu tempel di sini.');
      return;
    }

    if (onImportPastedData) {
      try {
        const res = onImportPastedData(pastedContent, pasteTargetType);
        if (res.count > 0) {
          setLocalSuccess(`Berhasil mengimpor ${res.count} baris data ${pasteTargetType === 'recap' ? 'Rekap Harian' : 'Bank Data'}!`);
          setPastedContent('');
          setTimeout(() => onClose(), 1500);
        } else {
          setLocalError('Tidak ada baris yang valid ditemukan. Pastikan baris memiliki header kolom yang sesuai.');
        }
      } catch (err: any) {
        setLocalError(err.message || 'Gagal memproses data tempel.');
      }
    }
  };

  const handlePushToCloud = async (target: 'recap' | 'bank') => {
    if (!onPushDataToSheet) return;
    setLocalError(null);
    setLocalSuccess(null);
    setIsPushing(target);
    try {
      const res = await onPushDataToSheet(target);
      if (res.success) {
        setLocalSuccess(res.message);
      } else {
        setLocalError(res.message);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Gagal mengirim data ke Google Sheet.');
    } finally {
      setIsPushing(null);
    }
  };

  const handleDownloadTemplate = (type: 'recap' | 'bank') => {
    const sampleRecap = [
      {
        id: 'sample_1',
        date: new Date().toISOString().substring(0, 10),
        lineId: 1,
        lineName: 'Line 1',
        style: 'DELAMI POLO H067',
        targetDailyPcs: 650,
        actualDailyPcs: 620,
        targetOutputPcs: 650,
        actualOutputPcs: 620,
        manpower: 36,
        workingHours: 8,
        smvStandard: 18.5,
        efficiencyPercent: 78.5,
        defectPercent: 1.8,
        cmRate: 37000,
        analysisStatus: 'optimal',
        analysisNote: 'Target tercapai baik'
      }
    ];

    const sampleBank = [
      {
        id: 'bank_1',
        modelCode: 'DELAMI POLO H067',
        buyer: 'DELAMI BRANDS',
        smvStandard: 18.5,
        targetDailyPcs: 650,
        targetTotalPcs: 15000,
        manpowerStandard: 36,
        workingHoursStandard: 8,
        cmRate: 37000,
        targetEfficiency: 78,
        description: 'Bahan Cotton Pique'
      }
    ];

    if (type === 'recap') {
      const csv = exportToGoogleSheetCsv('recap', sampleRecap);
      downloadCsvFile('Template_Rekap_Produksi_PT_Teratai_Widjaja.csv', csv);
    } else {
      const csv = exportToGoogleSheetCsv('bank', sampleBank);
      downloadCsvFile('Template_Bank_Data_Style_PT_Teratai_Widjaja.csv', csv);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Tautkan dengan Spreadsheet (Google Sheets .gs)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                  PT Teratai Widjaja
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih opsi penautan spreadsheet untuk sinkronisasi otomatis data rekap &amp; SMV sewing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: 4 Pilihan Metode */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto no-scrollbar gap-1 sm:gap-2 pt-2">
          <button
            type="button"
            onClick={() => { setActiveTab('apps-script'); setLocalError(null); }}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'apps-script'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>Opsi 1: Google Apps Script (.gs)</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1 rounded font-normal">2-Arah</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('direct-link'); setLocalError(null); }}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'direct-link'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Link className="w-4 h-4 text-blue-600" />
            <span>Opsi 2: Link Spreadsheet Langsung</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('paste-data'); setLocalError(null); }}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'paste-data'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-indigo-600" />
            <span>Opsi 3: Tempel Tabel (Copy-Paste)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('templates'); setLocalError(null); }}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Opsi 4: Template Spreadsheet</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
          
          {/* Status Banner */}
          <div className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
            dataSource.isLive 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            {dataSource.isLive ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold">
                  Status Sumber:{' '}
                  <span className={dataSource.isLive ? 'text-emerald-700 font-extrabold' : 'text-slate-800'}>
                    {dataSource.isLive 
                      ? `Terhubung ke Google Sheets (${dataSource.syncMode === 'direct-sheet' ? 'Direct Link' : 'Apps Script .gs'})` 
                      : 'Menggunakan Penyimpanan Lokal'}
                  </span>
                </p>
                {dataSource.isLive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              {dataSource.lastSyncTime && (
                <p className="text-[11px] text-slate-500">
                  Sinkronisasi terakhir: {new Date(dataSource.lastSyncTime).toLocaleTimeString('id-ID')} WIB
                </p>
              )}
              {dataSource.spreadsheetName && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  File Spreadsheet: <strong>{dataSource.spreadsheetName}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {localError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{localError}</span>
            </div>
          )}
          {localSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{localSuccess}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE APPS SCRIPT (.GS) */}
          {activeTab === 'apps-script' && (
            <div className="space-y-4">
              
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl text-slate-700 text-xs space-y-1">
                <p className="font-bold text-emerald-950 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Integrasi Google Apps Script (.gs) — Rekomendasi Terbaik</span>
                </p>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Menghubungkan lembar kerja Google Sheets secara dua arah (Baca data &amp; Kirim data) tanpa batasan kuota API pihak ketiga.
                </p>
              </div>

              {/* Web App URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  URL Web App Google Apps Script (.gs)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-apps-script-url"
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900 shadow-2xs"
                  />
                  <button
                    id="btn-connect-sheet"
                    type="button"
                    onClick={handleConnectAppsScript}
                    disabled={isConnecting}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 shrink-0 shadow-2xs cursor-pointer"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isConnecting ? 'Menghubungkan...' : 'Tarik Data GS'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pastikan URL Web App Anda berakhiran <code>/exec</code> bukan <code>/dev</code>.
                </p>
              </div>

              {/* Tombol Push Data ke Google Sheet jika ada URL */}
              {urlInput && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">Kirim Data Lokal ke Google Sheet (Export ke Cloud):</p>
                    <p className="text-[11px] text-slate-500">
                      Tersedia: {recapRecordsCount} baris rekap harian &amp; {bankModelsCount} bank data model
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handlePushToCloud('recap')}
                      disabled={isPushing !== null}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isPushing === 'recap' ? 'Mengirim...' : 'Kirim Rekap Harian'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePushToCloud('bank')}
                      disabled={isPushing !== null}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isPushing === 'bank' ? 'Mengirim...' : 'Kirim Bank Data'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step-by-step Setup Guide */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                  Cara Pasang Skrip di Google Sheets:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed text-[11.5px]">
                  <li>Buka lembar kerja Google Sheets Anda.</li>
                  <li>Pilih menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.</li>
                  <li>Salin seluruh kode skrip di bawah ini, tempelkan ke editor Apps Script, lalu klik ikon <strong>Save (Simpan)</strong>.</li>
                  <li>Klik tombol biru <strong>Deploy (Terapkan) &gt; New deployment (Penerapan baru)</strong>.</li>
                  <li>Pilih jenis <strong>Web app (Aplikasi web)</strong>. Set <strong>Who has access (Akses)</strong> = <strong>Anyone (Siapa saja)</strong>.</li>
                  <li>Klik <strong>Deploy</strong>, lalu salin URL Web App dan tempel pada kolom di atas.</li>
                </ol>
              </div>

              {/* Apps Script Code snippet */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Kode Apps Script (Code.gs) PT Teratai Widjaja:</span>
                  <button
                    id="btn-copy-code"
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Kode Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Skrip Code.gs</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 leading-tight border border-slate-800 select-all">
                  {APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>

              {/* Auto-refresh interval config */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-700 font-semibold">Interval Sinkronisasi Otomatis:</span>
                </div>
                <select
                  id="select-sync-interval"
                  value={dataSource.autoSyncInterval}
                  onChange={(e) => onIntervalChange(Number(e.target.value))}
                  className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>Manual (Tarik saat tombol ditekan)</option>
                  <option value={30}>Setiap 30 Detik</option>
                  <option value={60}>Setiap 1 Menit</option>
                  <option value={300}>Setiap 5 Menit</option>
                </select>
              </div>

            </div>
          )}

          {/* TAB 2: LINK GOOGLE SPREADSHEET LANGSUNG */}
          {activeTab === 'direct-link' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-slate-700 text-xs space-y-1.5">
                <p className="font-bold text-blue-950 flex items-center space-x-1.5">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span>Tautkan Langsung via Link Google Spreadsheet (Tanpa Deploy Skrip)</span>
                </p>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Metode tercepat! Anda hanya perlu menyalin tautan Spreadsheet Google Anda. Sistem akan langsung mengunduh dan membaca baris data Rekap atau Bank Data secara otomatis.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Tautan (URL) Google Spreadsheet Anda:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit#gid=0"
                    value={directUrlInput}
                    onChange={(e) => setDirectUrlInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleConnectDirectLink}
                    disabled={isConnecting}
                    className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 shrink-0 shadow-2xs cursor-pointer"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isConnecting ? 'Membaca...' : 'Tautkan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Petunjuk Pengaturan Hak Akses Link */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-800">
                  Syarat agar tautan dapat dibaca:
                </p>
                <div className="space-y-1.5 text-slate-600 text-[11.5px]">
                  <p>
                    1. Di Google Sheets, klik tombol <strong>Bagikan (Share)</strong> di sudut kanan atas.
                  </p>
                  <p>
                    2. Pada bagian <em>Akses umum (General access)</em>, ubah dari "Dibatasi" menjadi <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong> dengan peran <strong>Pelihat (Viewer)</strong>.
                  </p>
                  <p>
                    3. Klik <strong>Salin link (Copy link)</strong> dan tempelkan di kolom input di atas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEMPEL TABEL DARI GOOGLE SHEETS (COPY-PASTE) */}
          {activeTab === 'paste-data' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-slate-700 text-xs space-y-1">
                <p className="font-bold text-indigo-950 flex items-center space-x-1.5">
                  <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                  <span>Tempel Tabel Langsung dari Spreadsheet (Copy-Paste)</span>
                </p>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Tidak ingin mengatur tautan online? Cukup blok baris data di Google Sheets atau Excel, tekan <code>Ctrl+C</code>, lalu tekan <code>Ctrl+V</code> di kotak bawah ini.
                </p>
              </div>

              {/* Target Selector */}
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="text-slate-700">Impor data ini sebagai:</span>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pasteTarget"
                    checked={pasteTargetType === 'recap'}
                    onChange={() => setPasteTargetType('recap')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Rekap Harian &amp; Analisis Produksi</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pasteTarget"
                    checked={pasteTargetType === 'bank'}
                    onChange={() => setPasteTargetType('bank')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Bank Data Model &amp; Target SMV</span>
                </label>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Tempelkan (Paste) data sel di sini:
                </label>
                <textarea
                  rows={6}
                  placeholder={`Contoh baris tabel yang disalin dari Google Sheets:\nTanggal\tLine\tStyle\tTarget Harian\tAktual Harian\tOperator\tJam\tSMV\n2026-09-01\t1\tDELAMI POLO\t600\t580\t36\t8\t18.5`}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className="w-full text-xs p-3 font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleApplyPastedData}
                  className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Proses &amp; Simpan Data yang Ditempel</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPLATE GOOGLE SHEETS SIAP PAKAI */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-slate-700 text-xs space-y-1">
                <p className="font-bold text-amber-950 flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-amber-600" />
                  <span>Template Resmi Spreadsheet PT Teratai Widjaja</span>
                </p>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Gunakan format file terstandarisasi yang sudah dilengkapi nama kolom, formula efisiensi, dan susunan line yang kompatibel 100%.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Template 1: Rekap Produksi */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Template Rekap Produksi Sewing</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Kolom: Tanggal, Line, Style, Target Harian, Aktual Harian, Manpower, Jam, SMV Standar, Efisiensi, Defect %, CM Rate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('recap')}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-2xs"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Unduh CSV Rekap Produksi</span>
                  </button>
                </div>

                {/* Template 2: Bank Data Model */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Template Bank Data Style &amp; SMV</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Kolom: Kode Style/Model, Buyer, SMV Standar, Target Harian, Target Total Order, Manpower, Tarif CM, Target Efisiensi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('bank')}
                    className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-2xs"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Unduh CSV Bank Data Style</span>
                  </button>
                </div>
              </div>

              {/* Tautan Buat Spreadsheet Baru di Google */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span className="text-slate-600">Buat lembar kerja baru di akun Google Anda:</span>
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Google Sheets Baru (sheets.new)</span>
                </a>
              </div>
            </div>
          )}

          {/* Reset / Kembali ke Data Bawaan */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              id="btn-reset-default"
              type="button"
              onClick={() => {
                onResetDefault();
                setUrlInput('');
                setDirectUrlInput('');
                setLocalError(null);
                setLocalSuccess(null);
                onClose();
              }}
              className="text-slate-500 hover:text-rose-700 inline-flex items-center space-x-1.5 transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Putuskan Spreadsheet &amp; Gunakan Data Lokal</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
