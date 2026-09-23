import React from 'react';
import { LineIncident } from '../types';
import { formatPercent } from '../utils/formatters';
import { CompanyLogo } from './CompanyLogo';

interface IncidentPdfTemplateProps {
  incidents: LineIncident[];
  supervisorName?: string;
  peName?: string;
  fmName?: string;
  isBlackAndWhite?: boolean;
  selectedLineNames?: string[];
}

export const IncidentPdfTemplate: React.FC<IncidentPdfTemplateProps> = ({ 
  incidents,
  supervisorName = '',
  peName = '',
  fmName = '',
  isBlackAndWhite = true,
  selectedLineNames = []
}) => {
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const displayedIncidents = React.useMemo(() => {
    if (selectedLineNames && selectedLineNames.length > 0) {
      return incidents.filter(inc => selectedLineNames.includes(inc.lineName));
    }
    return incidents;
  }, [incidents, selectedLineNames]);

  return (
    <div 
      id="printable-incident-report" 
      className={`p-6 sm:p-8 bg-white ${
        isBlackAndWhite ? 'text-black border-2 border-black' : 'text-slate-900 border border-slate-300'
      } rounded-lg w-full max-w-[1020px] mx-auto space-y-5 font-sans overflow-hidden`}
    >
      {/* Official Factory Header */}
      <div className={`pb-3 flex justify-between items-start ${
        isBlackAndWhite ? 'border-b-2 border-black' : 'border-b-2 border-slate-900'
      }`}>
        <div className="flex items-center space-x-3">
          <CompanyLogo size="lg" showSubtitle={true} monochrome={isBlackAndWhite} />
        </div>
        <div className="text-right text-xs">
          <div className={`inline-block border px-2 py-0.5 text-[10px] font-mono font-bold mb-1 ${
            isBlackAndWhite ? 'border-black bg-neutral-100 text-black' : 'border-red-300 bg-red-100 text-red-900'
          }`}>
            FORM DISPOSISI • NO: TW/PRD-PE/FRM-08
          </div>
          <p className={`font-black text-sm tracking-wide uppercase ${
            isBlackAndWhite ? 'text-black' : 'text-[#1a3478]'
          }`}>
            LEMBAR DISPOSISI HAMBATAN LINE & BOTTLENECK PRODUKSI
          </p>
          <p className="text-neutral-600 font-medium mt-0.5">Tanggal Penerbitan: {printDate}</p>
          <p className="text-[10px] text-neutral-500 font-bold">Wajib Ditandatangani Production Engineer & Factory Manager</p>
        </div>
      </div>

      {/* Purpose Banner */}
      <div className={`px-3 py-1.5 flex items-center justify-between text-xs ${
        isBlackAndWhite 
          ? 'border border-black bg-neutral-100 text-black' 
          : 'border-l-4 border-red-600 bg-red-50/50 text-slate-800'
      }`}>
        <div>
          <h2 className="text-xs font-black uppercase">
            Formulir Tindakan Korektif & Penanganan Bottleneck Alur Sewing (CAPA)
          </h2>
          <p className="text-[10px] text-neutral-600">
            Lini/Bar Terpilih: <strong>{selectedLineNames.length > 0 ? selectedLineNames.join(', ') : 'Semua Lini'}</strong>
          </p>
        </div>
        <div className="text-right">
          <span className={`px-2 py-0.5 text-xs font-bold border ${
            isBlackAndWhite ? 'border-black bg-neutral-200 text-black' : 'border-red-600 bg-red-600 text-white'
          } rounded`}>
            {displayedIncidents.length} Lini Membutuhkan Disposisi
          </span>
        </div>
      </div>

      {/* Main Table: Details of All Incidents */}
      <div className="space-y-3">
        {displayedIncidents.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 font-medium border border-neutral-300 rounded">
            Tidak ada insiden atau hambatan kritis pada lini yang dipilih.
          </div>
        ) : (
          displayedIncidents.map((inc, idx) => (
            <div key={inc.id} className={`border ${
              isBlackAndWhite ? 'border-black bg-white' : 'border-slate-300 bg-white'
            } rounded overflow-hidden`}>
              
              {/* Top Bar of Box */}
              <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs ${
                isBlackAndWhite ? 'border-black bg-neutral-100 text-black' : 'border-slate-200 bg-slate-100 text-slate-900'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    isBlackAndWhite ? 'bg-black text-white' : 'bg-[#1a3478] text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-black text-black">{inc.lineName}</span>
                  <span className="text-neutral-600 font-semibold">• Style: {inc.style}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className={`font-bold px-1.5 py-0.2 border rounded ${
                    isBlackAndWhite ? 'border-black bg-neutral-200 text-black' : (inc.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white')
                  }`}>
                    [{inc.severity === 'critical' ? 'BOTTLENECK KRITIS' : 'PERINGATAN'}]
                  </span>
                  <span className={`font-bold border px-1.5 py-0.2 rounded ${
                    isBlackAndWhite ? 'border-black text-black' : 'border-red-300 text-red-700 bg-red-50'
                  }`}>
                    Defisit: -{inc.deficitPcs} pcs/hari
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-3 grid grid-cols-3 gap-3 text-xs">
                
                {/* Col 1: Indikator & Deskripsi */}
                <div className={`space-y-1.5 border-r pr-2.5 ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
                  <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Indikator Kinerja</span>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Target Harian:</span>
                      <span className="font-bold text-black">{inc.targetDailyPcs} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Aktual Harian:</span>
                      <span className="font-black text-black">{inc.actualDailyPcs} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Efisiensi:</span>
                      <span className="font-bold text-black">{formatPercent(inc.efficiencyPercent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Defect:</span>
                      <span className="font-bold text-black">{formatPercent(inc.defectPercent)}</span>
                    </div>
                  </div>

                  <div className={`pt-1.5 border-t ${isBlackAndWhite ? 'border-neutral-200' : 'border-slate-100'}`}>
                    <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">Identifikasi Gejala</span>
                    <p className="text-[10.5px] font-semibold text-black mt-0.5">{inc.title}</p>
                  </div>
                </div>

                {/* Col 2: Akar Masalah (Root Cause) */}
                <div className={`space-y-1 border-r pr-2.5 ${isBlackAndWhite ? 'border-neutral-300' : 'border-slate-200'}`}>
                  <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">
                    Akar Masalah (Root Cause Analysis)
                  </span>
                  <p className="text-[10.5px] text-neutral-800 leading-relaxed font-medium">
                    {inc.rootCause}
                  </p>
                  <div className="pt-1 text-[9.5px] text-neutral-500">
                    Kategori: <strong>{inc.category.toUpperCase()}</strong>
                  </div>
                </div>

                {/* Col 3: Tindakan Korektif (CAPA) */}
                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold uppercase text-neutral-500 block">
                    Tindakan Korektif & Preventif (CAPA)
                  </span>
                  <div className="text-[10.5px] text-neutral-800 space-y-1 leading-relaxed">
                    <p>
                      <strong>Korektif:</strong> {inc.correctiveAction}
                    </p>
                    {inc.preventiveAction && (
                      <p>
                        <strong>Preventif:</strong> {inc.preventiveAction}
                      </p>
                    )}
                  </div>
                  <div className="pt-1.5 flex justify-between text-[9.5px] font-bold">
                    <span>PIC: {inc.pic}</span>
                    <span>Target: {inc.targetResolutionTime}</span>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Signature Approval Section */}
      <div className={`pt-2 ${isBlackAndWhite ? 'border-t-2 border-black' : 'border-t-2 border-slate-800'}`}>
        <p className="font-black text-xs text-black uppercase tracking-wide mb-2">
          LEMBAR PENGESAHAN DISPOSISI HAMBATAN SEWING
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className={`p-2.5 border ${
            isBlackAndWhite ? 'border-black bg-white' : 'border-slate-300 bg-slate-50'
          } rounded flex flex-col justify-between h-32`}>
            <p className="text-[9.5px] font-bold text-neutral-600 uppercase">1. Pengawas Lini:</p>
            <div className="text-center pt-2">
              <div className={`w-32 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
              <p className="font-bold text-black text-xs mt-1">{supervisorName || '( ................................... )'}</p>
              <p className="text-[9px] text-neutral-500">Supervisor Sewing</p>
            </div>
          </div>

          <div className={`p-2.5 border ${
            isBlackAndWhite ? 'border-black bg-white' : 'border-blue-200 bg-blue-50/50'
          } rounded flex flex-col justify-between h-32`}>
            <p className="text-[9.5px] font-bold text-neutral-600 uppercase">2. Rekomendasi Teknis:</p>
            <div className="text-center pt-2">
              <div className={`w-32 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
              <p className="font-bold text-black text-xs mt-1">{peName || '( ................................... )'}</p>
              <p className="text-[9px] text-neutral-500">Production Engineer (PE)</p>
            </div>
          </div>

          <div className={`p-2.5 border ${
            isBlackAndWhite ? 'border-black bg-white' : 'border-emerald-200 bg-emerald-50/50'
          } rounded flex flex-col justify-between h-32`}>
            <p className="text-[9.5px] font-bold text-neutral-600 uppercase">3. Keputusan & Persetujuan:</p>
            <div className="text-center pt-2">
              <div className={`w-32 mx-auto border-b ${isBlackAndWhite ? 'border-black' : 'border-slate-500'}`}></div>
              <p className="font-bold text-black text-xs mt-1">{fmName || '( ................................... )'}</p>
              <p className="text-[9px] text-neutral-500">Factory Manager (FM)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
