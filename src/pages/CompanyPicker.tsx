import React, { useState } from "react";
import type { Company } from "@/src/context/CompanyContext";

interface CompanyPickerProps {
  companyList: Company[];
  onSelect: (companyId: string) => void;
  currentUser: any;
  onLogout: () => void;
}

export const CompanyPicker: React.FC<CompanyPickerProps> = ({ companyList, onSelect }) => {
  const sorted = [...(companyList || [])].sort((a, b) => a.nama.localeCompare(b.nama));
  const [selectedId, setSelectedId] = useState<string>(sorted.length === 1 ? sorted[0].id : "");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6" style={{ background: "#F5F4F1" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EB5E28" }}>
          <span className="text-white font-black text-lg italic">S</span>
        </div>
        <span className="text-[15px] font-black text-text-main tracking-tight">SJM Flow</span>
      </div>

      <div
        className="w-full bg-white rounded-2xl"
        style={{ maxWidth: "400px", padding: "32px", border: "1px solid #E2DDD6" }}
      >
        <div>
          <h1 className="text-[22px] font-black text-text-main leading-none">Pilih Perusahaan</h1>
          <p className="text-[12px] text-text-light mt-2">Anda memiliki akses ke beberapa perusahaan</p>
        </div>

        <div className="mt-5">
          <select
            className="input-field text-[14px] font-medium tracking-tight w-full"
            style={{ height: "44px", borderRadius: "12px" }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="" disabled>Pilih perusahaan...</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
        </div>

        <button
          className="w-full text-white text-[13px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ height: "44px", borderRadius: "12px", background: "#EB5E28" }}
          onClick={() => selectedId && onSelect(selectedId)}
          disabled={!selectedId}
        >
          Lanjutkan
        </button>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-text-light">Anda bisa switch perusahaan kapan saja dari sidebar</p>
        </div>
      </div>
    </div>
  );
};
