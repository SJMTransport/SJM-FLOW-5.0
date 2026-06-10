import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/src/api';

export interface Company {
  id: string;
  kode: string;
  nama: string;
  logo_url?: string;
  alamat?: string;
}

interface CompanyContextType {
  activeCompany: Company | null;
  companyList: Company[];
  switchCompany: (companyId: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  activeCompany: null,
  companyList: [],
  switchCompany: () => {},
  isLoading: true,
});

export function CompanyProvider({
  children,
  userId,
  onCompanyChange,
}: {
  children: React.ReactNode;
  userId: string | null;
  onCompanyChange?: () => void;
}) {
  const [activeCompany, setActiveCompany] = useState<Company | null>(() => {
    try {
      const saved = localStorage.getItem('sjm_active_company');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('*, companies(*)')
          .eq('user_id', userId)
          .eq('is_active', true);
        if (error || !data) { setIsLoading(false); return; }
        const companies: Company[] = data
          .map((d: any) => d.companies)
          .filter(Boolean)
          .sort((a: Company, b: Company) => a.nama.localeCompare(b.nama));
        setCompanyList(companies);
        if (!activeCompany && companies.length === 1) {
          setActiveCompany(companies[0]);
          localStorage.setItem('sjm_active_company', JSON.stringify(companies[0]));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, [userId]);

  const switchCompany = (companyId: string) => {
    const company = companyList.find(c => c.id === companyId);
    if (!company) return;
    setActiveCompany(company);
    localStorage.setItem('sjm_active_company', JSON.stringify(company));
    onCompanyChange?.();
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, companyList, switchCompany, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
