import React from "react";
import { Icon } from "@/src/components/SJMComponents";
import type { Company } from "@/src/context/CompanyContext";

interface CompanyPickerProps {
  companyList: Company[];
  onSelect: (companyId: string) => void;
  currentUser: any;
  onLogout: () => void;
}

export const CompanyPicker: React.FC<CompanyPickerProps> = ({ companyList, onSelect, currentUser, onLogout }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-lg font-black text-text-main uppercase tracking-widest">Pilih Perusahaan</h1>
          <p className="text-[11px] font-bold text-text-light mt-2">
            {currentUser?.nama || ""} — pilih perusahaan yang ingin diakses
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {(companyList || []).map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-border-main/40 bg-card hover:border-accent hover:shadow-md transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Icon name="Building2" size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-black text-text-main">{c.nama}</div>
                <div className="text-[10px] font-bold text-text-light uppercase tracking-widest">{c.kode}</div>
              </div>
              <Icon name="ChevronRight" size={16} className="text-text-light opacity-50" />
            </button>
          ))}
        </div>
        <button
          onClick={onLogout}
          className="mt-8 w-full text-center text-[10px] font-bold text-text-light uppercase tracking-widest hover:text-red-brand transition-colors"
        >
          Keluar
        </button>
      </div>
    </div>
  );
};
