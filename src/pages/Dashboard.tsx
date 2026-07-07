import React, { useState, useMemo } from "react";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import {
  Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText,
  CalendarBlank, NavigationArrow, CaretRight, CaretDown, Package, Van,
  UserCircle, Warning, Info, Funnel, CheckCircle,
} from "@phosphor-icons/react";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));

const fmtTglMuat = (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const calcDurasi = (s: any): string => {
  const start = s.tgl_muat ? new Date(s.tgl_muat) : null;
  if (!start || isNaN(start.getTime())) return "—";
  const end = s.status_muatan === "Completed" && s.tgl_bongkar
    ? new Date(s.tgl_bongkar) : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "—";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  if (days > 0) return `${days} Hari${hours > 0 ? ` ${hours} Jam` : ""}`;
  if (hours > 0) return `${hours} Jam`;
  return `${totalMinutes} Mnt`;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "On Going":        { bg: "bg-indigo-50", color: "text-indigo-600" },
  "Loading":         { bg: "bg-warning-light", color: "text-warning" },
  "Arrived":         { bg: "bg-info-light", color: "text-info" },
  "Completed":       { bg: "bg-success-light", color: "text-success" },
  "Cancelled":       { bg: "bg-error-light", color: "text-error" },
  "Order Confirmed": { bg: "bg-neutral-100", color: "text-neutral-500" },
  "Hold":            { bg: "bg-error-light", color: "text-error" },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Pagi";
  if (h < 15) return "Siang";
  if (h < 18) return "Sore";
  return "Malam";
};

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], saldoAwal = [], currentUser, onSOClick, onJurnalClick }: any) => {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage] = useState(1);
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [showShipmentSearch, setShowShipmentSearch] = useState(false);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const PER_PAGE = 8;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const nowMonth = today.getMonth();
  const nowYear = today.getFullYear();

  // ── KPI Operasional ──
  const soAktif = useMemo(() => (so || []).filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [so]);
  const soMenunggu = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Order Confirmed").length, [so]);
  const soNoUpdate = useMemo(() => {
    const now = Date.now();
    const TWELVE_H = 12 * 3600000;
    return (so || []).filter((s: any) => {
      if (!["On Going", "Loading"].includes(s.status_muatan)) return false;
      const logs = s.posisi_log || [];
      if (!logs.length) return true;
      const last = logs[logs.length - 1];
      const t = new Date(`${last.date} ${last.time}`).getTime();
      return isNaN(t) || (now - t) > TWELVE_H;
    }).length;
  }, [so]);

  // ── KPI Keuangan (Jurnal-based) ──
  const isFinance = currentUser?.role === "Admin" || currentUser?.role === "Keuangan";
  
  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);

  const jurnalBulanIni = useMemo(() => {
    return (jurnal || []).filter((j: any) => {
      if (!j.tanggal) return false;
      const d = new Date(j.tanggal);
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
    });
  }, [jurnal, nowMonth, nowYear]);

  const totalPendapatan = useMemo(() => {
    return jurnalBulanIni.reduce((s: number, j: any) => 
      s + (j.jurnal_detail || [])
        .filter((e: any) => coaPendapatan.has(e.coa_kode))
        .reduce((a: number, e: any) => a + (Number(e.kredit || 0) - Number(e.debit || 0)), 0)
    , 0);
  }, [jurnalBulanIni, coaPendapatan]);

  const totalBeban = useMemo(() => {
    return jurnalBulanIni.reduce((s: number, j: any) => 
      s + (j.jurnal_detail || [])
        .filter((e: any) => coaBeban.has(e.coa_kode))
        .reduce((a: number, e: any) => a + (Number(e.debit || 0) - Number(e.kredit || 0)), 0)
    , 0);
  }, [jurnalBulanIni, coaBeban]);

  const labaRugiBulanIni = totalPendapatan - totalBeban;
  const labaRugiValue = labaRugiBulanIni >= 0 ? `Rp ${fmt(labaRugiBulanIni)}` : `-Rp ${fmt(Math.abs(labaRugiBulanIni))}`;

  // Fallback: calculate outstanding receivables dynamically if the database table is empty
  const totalPiutang = useMemo(() => {
    if (piutang && piutang.length > 0) {
      return piutang.reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0);
    }
    const piutangCoas = (coa || []).filter((c: any) => c.sub_kelompok === "Piutang Usaha" || c.kode === "112").map((c: any) => c.kode);
    const map: any = {};
    (jurnal || []).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (piutangCoas.includes(d.coa_kode)) {
          const key = j.no_so || j.no_bukti || j.id;
          if (!map[key]) map[key] = { debit: 0, kredit: 0 };
          map[key].debit += Number(d.debit || 0);
          map[key].kredit += Number(d.kredit || 0);
        }
      });
    });
    return Object.values(map).reduce((sum: number, r: any) => {
      const s = r.debit - r.kredit;
      return sum + (s > 0 ? s : 0);
    }, 0);
  }, [piutang, jurnal, coa]);

  const soBelumInvoice = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Completed" && (!s.invoice_count || s.invoice_count === 0)).length, [so]);

  // ── Kas & Bank Balances ──
  const kasAkun = useMemo(() => (coa || []).filter((c: any) =>
    c.kelompok === "Aset" && c.status === "Aktif" && (
      (c.sub_kelompok || "").toLowerCase().includes("kas") ||
      (c.sub_kelompok || "").toLowerCase().includes("bank") ||
      (c.nama || "").toLowerCase().includes("kas") ||
      (c.nama || "").toLowerCase().includes("bank")
    )
  ).sort((a: any, b: any) => a.kode.localeCompare(b.kode)), [coa]);

  const kasMap = useMemo(() => {
    const map: Record<string, number> = {};
    kasAkun.forEach((a: any) => {
      const sa = (saldoAwal || []).find((s: any) => s.coa_kode === a.kode);
      map[a.kode] = sa ? (Number(sa.debit || 0) - Number(sa.kredit || 0)) : 0;
    });
    (jurnal || []).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((e: any) => {
        if (map.hasOwnProperty(e.coa_kode)) {
          map[e.coa_kode] += Number(e.debit || 0) - Number(e.kredit || 0);
        }
      });
    });
    return map;
  }, [kasAkun, jurnal, saldoAwal]);

  // ── Shipment Table ──
  const shipmentSorted = useMemo(() =>
    [...(so || [])].sort((a: any, b: any) => String(b.tgl_muat || "").localeCompare(String(a.tgl_muat || "")))
  , [so]);
  const shipmentFiltered = useMemo(() => {
    let data = shipmentFilter === "Semua" ? shipmentSorted : shipmentSorted.filter((s: any) => s.status_muatan === shipmentFilter);
    if (shipmentSearch.trim()) {
      const q = shipmentSearch.toLowerCase();
      data = data.filter((s: any) =>
        s.order_id?.toLowerCase().includes(q) ||
        s.customer?.toLowerCase().includes(q) ||
        s.lokasi_muat?.toLowerCase().includes(q) ||
        s.lokasi_bongkar?.toLowerCase().includes(q) ||
        s.nama_sopir?.toLowerCase().includes(q) ||
        s.no_polisi?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [shipmentSorted, shipmentFilter, shipmentSearch]);
  const totalPages = Math.max(1, Math.ceil(shipmentFiltered.length / PER_PAGE));
  const shipmentPaged = useMemo(() =>
    shipmentFiltered.slice((shipmentPage - 1) * PER_PAGE, shipmentPage * PER_PAGE)
  , [shipmentFiltered, shipmentPage]);

  // ── Dispatcher ──
  const dalamPerjalanan = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "On Going").length, [so]);
  const shipmentHariIni = useMemo(() => (so || []).filter((s: any) => s.tgl_muat === todayStr).length, [so, todayStr]);

  // ── Aktivitas Terbaru ──
  const recentActivity = useMemo(() => {
    const logs: any[] = [];
    (so || []).forEach((s: any) => {
      if (!["On Going", "Loading", "Arrived"].includes(s.status_muatan)) return;
      (s.posisi_log || []).forEach((l: any) => {
        logs.push({ ...l, order_id: s.order_id, customer: s.customer, status: s.status_muatan });
      });
    });
    return logs.sort((a, b) => {
      const ta = new Date(`${a.date} ${a.time}`).getTime();
      const tb = new Date(`${b.date} ${b.time}`).getTime();
      return tb - ta;
    }).slice(0, 5);
  }, [so]);

  // ── Pagination Helper ──
  const pageNums = useMemo(() => {
    const p: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) p.push(i);
    } else {
      p.push(1);
      if (shipmentPage > 3) p.push("...");
      for (let i = Math.max(2, shipmentPage - 1); i <= Math.min(totalPages - 1, shipmentPage + 1); i++) p.push(i);
      if (shipmentPage < totalPages - 2) p.push("...");
      p.push(totalPages);
    }
    return p;
  }, [totalPages, shipmentPage]);

  const firstName = currentUser?.nama?.split(" ")[0] || currentUser?.email?.split("@")[0] || "User";
  const periodLabel = `${new Date(nowYear, nowMonth, 1).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} - ${new Date(nowYear, nowMonth + 1, 0).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Action Center ──
  const actionItems = [
    { count: soMenunggu, label: "Sales Order masih berupa Draft", icon: <Warning size={16} weight="fill" />, iconColor: "#DC2626", iconBg: "#FEE2E2", border: "#DC2626", bg: "#FEF2F2", action: () => navigate("/sales-order") },
    { count: soBelumInvoice, label: "SO belum diinvoice", icon: <ClipboardText size={16} weight="fill" />, iconColor: "#EA580C", iconBg: "#FFEDD5", border: "#EA580C", bg: "#FFF7ED", action: () => navigate("/sales-order") },
    { count: soNoUpdate, label: "Shipment tidak update >12 jam", icon: <ClockCountdown size={16} weight="fill" />, iconColor: "#D97706", iconBg: "#FEF3C7", border: "#D97706", bg: "#FFFBEB", action: () => navigate("/update-muatan") },
    { count: 0, label: "Invoice jatuh tempo minggu ini", icon: <Info size={16} weight="fill" />, iconColor: "#2563EB", iconBg: "#DBEAFE", border: "#2563EB", bg: "#EFF6FF", action: () => navigate("/invoice") },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg w-full">

      {/* ═══ LEFT COLUMN — scrollable ═══ */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6 pb-8 custom-scrollbar">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-text-main leading-none">
              Selamat {getGreeting()}, {firstName} 
            </h1>
            <p className="text-[13px] text-text-med mt-1.5 leading-none">PT Sugiarto Jaya Mandiri Group</p>
          </div>
          <div className="h-9 border border-border-main rounded-lg bg-white flex items-center gap-2 px-3.5 cursor-pointer shrink-0 shadow-xs hover:bg-neutral-50 transition-colors">
            <CalendarBlank size={16} className="text-text-med" />
            <span className="text-[13px] text-text-main font-medium whitespace-nowrap">{periodLabel}</span>
            <CaretDown size={14} className="text-text-light" />
          </div>
        </div>

        {/* KPI ROW 1 — RINGKASAN OPERASIONAL */}
        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-2.5 block">Ringkasan Operasional</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: <Truck size={28} weight="fill" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-600", value: soAktif, label: "SO Aktif", to: "/sales-order" },
              { icon: <ClockCountdown size={28} weight="fill" />, iconBg: "bg-amber-50", iconColor: "text-amber-600", value: soMenunggu, label: "Menunggu Konfirmasi", to: "/sales-order" },
              { icon: <WarningCircle size={28} weight="fill" />, iconBg: "bg-red-50", iconColor: "text-red-600", value: soNoUpdate, label: "Tidak Update >12 Jam", to: "/update-muatan" },
            ].map((k) => (
              <div key={k.label} onClick={() => navigate(k.to)} className="bg-white border border-border-main rounded-xl p-[18px_20px] flex items-center gap-4 cursor-pointer transition-all duration-150 hover:border-accent hover:shadow-sm">
                <div className={`w-12 h-12 rounded-xl ${k.iconBg} ${k.iconColor} flex items-center justify-center shrink-0`}>{k.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-med mb-1.5">{k.label}</div>
                  <div className="text-[30px] font-black text-text-main leading-none tabular-nums tracking-tight">{k.value}</div>
                </div>
                <CaretRight size={16} className="text-text-light shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* KPI ROW 2 — RINGKASAN KEUANGAN */}
        {isFinance && (
          <div className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-2.5 block">Ringkasan Keuangan (Buku Besar)</span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { icon: <ChartLineUp size={28} weight="fill" />, iconBg: "bg-success-light", iconColor: "text-success", value: `Rp ${fmt(totalPendapatan)}`, label: "Omzet (Pendapatan)", to: "/laporan" },
                { icon: <ClipboardText size={28} weight="fill" />, iconBg: "bg-error-light", iconColor: "text-error", value: `Rp ${fmt(totalBeban)}`, label: "Total Pengeluaran (Beban)", to: "/laporan" },
                { icon: <Receipt size={28} weight="fill" />, iconBg: labaRugiBulanIni >= 0 ? "bg-indigo-50" : "bg-red-50", iconColor: labaRugiBulanIni >= 0 ? "text-indigo-600" : "text-red-600", value: labaRugiValue, label: "Laba Rugi Bersih", to: "/laporan", valueColor: labaRugiBulanIni >= 0 ? "text-indigo-600" : "text-red-600" },
                { icon: <WarningCircle size={28} weight="fill" />, iconBg: "bg-warning-light", iconColor: "text-warning", value: `Rp ${fmt(totalPiutang)}`, label: "Piutang Usaha Aktif", to: "/hutang-piutang" },
              ].map((k) => (
                <div key={k.label} onClick={() => navigate(k.to)} className="bg-white border border-border-main rounded-xl p-[16px_20px] flex items-center gap-4 cursor-pointer transition-all duration-150 hover:border-accent hover:shadow-sm">
                  <div className={`w-12 h-12 rounded-xl ${k.iconBg} ${k.iconColor} flex items-center justify-center shrink-0`}>{k.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text-med mb-1.5">{k.label}</div>
                    <div className={`text-[19px] font-black ${k.valueColor || 'text-text-main'} leading-none tabular-nums tracking-tight`}>{k.value}</div>
                  </div>
                  <CaretRight size={16} className="text-text-light shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHIPMENT TABLE */}
        <div className="bg-white border border-border-main rounded-xl overflow-hidden shadow-xs">

          {/* toolbar */}
          <div className="p-[12px_16px] border-b border-border-main flex justify-between items-center bg-white gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-med m-0">Shipment Aktif</span>
            <div className="flex gap-2">
              <select value={shipmentFilter} onChange={e => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
                className="h-8 border border-border-main rounded-lg text-[12px] px-2.5 bg-white cursor-pointer text-text-main outline-none font-bold"
              >
                {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                  <option key={s} value={s}>{s === "Semua" ? "Semua Status" : s}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowShipmentSearch(v => !v); if (showShipmentSearch) { setShipmentSearch(""); setShipmentPage(1); } }}
                className={`h-8 px-3 border rounded-lg cursor-pointer flex items-center gap-1.5 text-[12px] font-bold transition-all duration-150 ${showShipmentSearch ? "border-accent bg-accent-light text-accent" : "border-border-main bg-white text-text-med hover:bg-neutral-50"}`}
              >
                <Funnel size={14} /> Filter
              </button>
            </div>
          </div>
          
          {showShipmentSearch && (
            <div className="p-[8px_16px] border-b border-border-main bg-[#FAFAF8]">
              <input
                autoFocus
                value={shipmentSearch}
                onChange={e => { setShipmentSearch(e.target.value); setShipmentPage(1); }}
                placeholder="Cari order ID, customer, route, sopir, armada..."
                className="w-full h-[34px] border border-border-main rounded-lg px-3 text-[13px] outline-none bg-white text-text-main focus:border-accent"
              />
            </div>
          )}

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[860px]">
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[105px]" />
                <col className="w-auto" />
                <col className="w-[155px]" />
                <col className="w-[150px]" />
                <col className="w-[130px]" />
                <col className="w-[95px]" />
                <col className="w-[110px]" />
                <col className="w-[36px]" />
              </colgroup>
              <thead className="bg-[#F8F6F3]">
                <tr>
                  {[
                    { label: "ORDER",           align: "left"   },
                    { label: "TGL MUAT ↕",      align: "left"   },
                    { label: "CUSTOMER",         align: "left"   },
                    { label: "RUTE",             align: "left"   },
                    { label: "SOPIR & ARMADA",   align: "left"   },
                    { label: "STATUS",           align: "left"   },
                    { label: "DURASI",           align: "left"   },
                    { label: "NILAI",            align: "right"  },
                    { label: "",                 align: "center" },
                  ].map((h, i) => (
                    <th key={h.label || i} className="p-[10px_12px] text-[11px] font-bold text-text-light border-b border-border-main uppercase tracking-wider whitespace-nowrap" style={{ textAlign: h.align as any }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {shipmentPaged.length === 0 ? (
                  <tr><td colSpan={9} className="p-12 text-center text-[13px] text-text-light italic">Tidak ada data shipment</td></tr>
                ) : shipmentPaged.map((s: any) => {
                  const sc = STATUS_COLORS[s.status_muatan] || { bg: "bg-neutral-100", color: "text-neutral-500" };
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-[10px_12px] text-[13px] text-text-main align-middle">
                        <button onClick={() => onSOClick?.(s.order_id)} className="text-[12px] font-black text-accent bg-transparent border-none cursor-pointer p-0 font-mono hover:underline">{s.order_id}</button>
                      </td>
                      <td className="p-[10px_12px] text-[12px] text-text-med align-middle font-bold italic tabular-nums">{fmtTglMuat(s.tgl_muat)}</td>
                      <td className="p-[10px_12px] text-[12px] text-text-main font-bold align-middle truncate" title={s.customer || ""}>{s.customer || "—"}</td>
                      <td className="p-[10px_12px] text-[12px] text-text-main align-middle leading-normal">
                        <div className="font-bold text-text-main truncate" title={s.lokasi_muat}>{s.lokasi_muat || "—"}</div>
                        <div className="text-[10px] text-text-light my-0.5 opacity-60">↓</div>
                        <div className="font-bold text-text-main truncate" title={s.lokasi_bongkar}>{s.lokasi_bongkar || "—"}</div>
                      </td>
                      <td className="p-[10px_12px] text-[12px] text-text-main align-middle leading-normal">
                        <div className="font-bold text-text-main truncate">{s.nama_sopir || "—"}</div>
                        <div className="text-[11px] text-text-light mt-0.5">{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                      </td>
                      <td className="p-[10px_12px] text-[12px] text-text-main align-middle">
                        <span className={`inline-flex py-0.5 px-2.5 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.bg} ${sc.color}`}>{s.status_muatan}</span>
                      </td>
                      <td className="p-[10px_12px] text-[12px] text-text-med align-middle font-medium tabular-nums">{["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—"}</td>
                      <td className="p-[10px_12px] text-[12px] text-text-main align-middle text-right font-black tabular-nums whitespace-nowrap">Rp {fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}</td>
                      <td className="p-[10px_12px] text-[13px] text-text-main align-middle text-center relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenKebabId(openKebabId === s.order_id ? null : s.order_id); }}
                          className="text-[16px] text-text-light cursor-pointer bg-transparent border-none p-1 rounded hover:bg-oatmeal/20 hover:text-text-main"
                        >⋮</button>
                        {openKebabId === s.order_id && (
                          <div className="absolute top-7 right-0 bg-white border border-border-main rounded-lg shadow-md z-[30] min-w-[160px] overflow-hidden"
                            onMouseLeave={() => setOpenKebabId(null)}
                          >
                            <button onClick={() => { onSOClick?.(s.order_id); setOpenKebabId(null); }}
                              className="block w-full p-2.5 border-none bg-white cursor-pointer text-[12px] text-text-main text-left font-bold hover:bg-bg"
                            >Lihat Detail SO</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="p-[10px_16px] border-t border-border-main flex justify-between items-center text-[12px] text-text-med bg-white">
            <span>Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * PER_PAGE + 1} - {Math.min(shipmentPage * PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data</span>
            <div className="flex items-center gap-1">
              <button disabled={shipmentPage <= 1} onClick={() => setShipmentPage(p => p - 1)} className="h-7 px-2.5 rounded border border-border-main bg-white text-text-main text-[12px] cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50">‹ Prev</button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={`e${i}`} className="px-1 text-text-light">…</span>
              ) : (
                <button key={p} onClick={() => setShipmentPage(p as number)} className={`h-7 min-w-[28px] rounded border text-[12px] cursor-pointer flex items-center justify-center transition-colors ${shipmentPage === p ? "border-accent bg-accent text-white font-semibold" : "border-border-main bg-white text-text-main hover:bg-neutral-50"}`}>{p}</button>
              ))}
              <button disabled={shipmentPage >= totalPages} onClick={() => setShipmentPage(p => p + 1)} className="h-7 px-2.5 rounded border border-border-main bg-white text-text-main text-[12px] cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50">Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR — fixed width, independent scroll ═══ */}
      <div className="w-[300px] shrink-0 border-l border-border-main bg-[#FAFAF8] overflow-y-auto flex flex-col custom-scrollbar">

        {/* DISPATCHER HARI INI */}
        <div className="p-[20px_16px_16px] border-b border-border-main">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-3 block">Dispatcher Hari Ini</span>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: <Package size={22} weight="fill" />, color: "text-accent", bg: "bg-accent-light", value: shipmentHariIni, label: "Shipment Hari Ini" },
              { icon: <Van size={22} weight="fill" />, color: "text-success", bg: "bg-success-light", value: (armada || []).length, label: "Armada Aktif" },
              { icon: <UserCircle size={22} weight="fill" />, color: "text-info", bg: "bg-info-light", value: (sopir || []).length, label: "Sopir Tersedia" },
              { icon: <NavigationArrow size={22} weight="fill" />, color: "text-accent", bg: "bg-accent-light", value: dalamPerjalanan, label: "Dalam Perjalanan" },
            ].map(d => (
              <div key={d.label} className="bg-white border border-border-main rounded-xl p-3 flex flex-col gap-2 shadow-xs">
                <div className={`w-9 h-9 rounded-lg ${d.bg} ${d.color} flex items-center justify-center`}>{d.icon}</div>
                <div className="text-[26px] font-bold text-text-main leading-none tabular-nums">{d.value}</div>
                <div className="text-[11px] text-text-med leading-snug">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SALDO KAS & BANK */}
        {isFinance && (
          <div className="p-4 border-b border-border-main">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-3 block">Saldo Kas & Bank</span>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {kasAkun.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-text-light italic">Belum ada akun Kas & Bank</div>
              ) : (
                kasAkun.map((a: any) => {
                  const saldoTotal = kasMap[a.kode] || 0;
                  const mutation = (jurnalBulanIni || []).reduce((s: number, j: any) => {
                    return s + (j.jurnal_detail || [])
                      .filter((e: any) => e.coa_kode === a.kode)
                      .reduce((x: number, e: any) => x + Number(e.debit || 0) - Number(e.kredit || 0), 0);
                  }, 0);
                  
                  return (
                    <div key={a.kode} className="bg-white border border-border-main rounded-lg p-2.5 flex justify-between items-center hover:border-accent transition-colors shadow-2xs group">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-[12px] font-bold text-text-main group-hover:text-accent truncate" title={a.nama}>{a.nama}</div>
                        <div className="text-[10px] text-text-light font-medium italic mt-0.5">{a.kode}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-black text-text-main tabular-nums leading-none">Rp {fmt(saldoTotal)}</div>
                        <div className={`text-[9px] font-bold leading-none mt-1 ${mutation >= 0 ? "text-success" : "text-error"}`}>
                          {mutation >= 0 ? "+" : ""}{fmt(mutation)} MoM
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* AKTIVITAS TERBARU */}
        <div className="p-4 border-b border-border-main">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-3 block">Aktivitas Terbaru</span>
          {recentActivity.length === 0 ? (
            <div className="py-4 text-center text-[13px] text-text-light italic">Belum ada aktivitas</div>
          ) : (
            <div className="flex flex-col">
              {recentActivity.map((l: any, i: number) => {
                const ac = STATUS_COLORS[l.status] || { bg: "bg-accent-light", color: "text-accent" };
                return (
                  <div key={i} className="flex gap-2.5 items-start py-2.5 border-b border-border-main/40 last:border-none">
                    <div className={`w-8 h-8 rounded-full ${ac.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <ClipboardText size={15} weight="fill" className={ac.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-text-main truncate">
                        <button onClick={() => onSOClick?.(l.order_id)} className="text-[12px] font-bold text-accent bg-transparent border-none cursor-pointer p-0 hover:underline">{l.order_id}</button>
                        {l.location ? <span className="text-text-med font-normal"> · {l.location}</span> : null}
                      </div>
                      <div className="text-[11px] text-text-light truncate mt-0.5">{l.customer || "oleh Operator"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] text-text-light tabular-nums">{l.time || ""}</span>
                      <span className={`py-0.5 px-2 rounded-full text-[9px] font-bold whitespace-nowrap ${ac.bg} ${ac.color}`}>{l.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div onClick={() => navigate("/log-aktivitas")}
            className="flex items-center justify-between p-2.5 bg-neutral-100 rounded-lg mt-3 text-[12px] font-bold text-accent cursor-pointer transition-colors duration-150 hover:bg-accent-light"
          >
            <span>Lihat semua aktivitas</span>
            <CaretRight size={14} />
          </div>
        </div>

        {/* ACTION CENTER */}
        <div className="p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-light mb-3 block">Action Center</span>
          <div className="flex flex-col gap-2">
            {actionItems.map((a, i) => (
              <div key={i} onClick={a.action}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border-l-3 transition-opacity duration-150 hover:opacity-85 shadow-xs"
                style={{ borderLeftColor: a.border, backgroundColor: a.bg }}
              >
                <div className="w-[30px] h-[30px] rounded bg-white flex items-center justify-center shrink-0" style={{ color: a.iconColor }}>{a.icon}</div>
                <div className="text-[20px] font-bold text-text-main min-w-[30px] tabular-nums leading-none">{a.count}</div>
                <div className="flex-1 text-[12px] text-text-med leading-snug">{a.label}</div>
                <CaretRight size={14} className="text-text-light shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
