import React, { useState, useMemo } from "react";
import { C } from "../constants";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { Card, StatCard, Spark, PeriodFilter, EmptyState, PageShell, PageHeader, KPIGrid } from "@/src/components/SJMComponents";
import { useCompany } from "@/src/context/CompanyContext";
import { Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText, Package, Van, UserCircle, MapPin, FileText, CaretRight, CalendarBlank, Users, NavigationArrow, NotePencil, CreditCard, FileX } from "@phosphor-icons/react";

const STATUS_BADGE: Record<string, string> = {
  "Order Confirmed": "bg-[#F1EFE8] text-[#5F5E5A]",
  "Loading": "bg-[var(--color-warning-light,#FDF3E3)] text-[var(--color-warning,#C4914A)]",
  "On Going": "bg-[var(--color-info-light,#EAF2FF)] text-[var(--color-info,#2563EB)]",
  "Arrived": "bg-[var(--color-info-light,#EAF2FF)] text-[var(--color-info,#2563EB)]",
  "Completed": "bg-[var(--color-success-light,#EEF8E8)] text-[var(--color-success,#5C8A3C)]",
  "Cancelled": "bg-[var(--color-error-light,#FDEEEE)] text-[var(--color-error,#B85450)]",
  "Hold": "bg-[var(--color-error-light,#FDEEEE)] text-[var(--color-error,#B85450)]",
};

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));

const fmtTglMuat = (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], currentUser, onNavigate, onSOClick, onJurnalClick }: any) => {
  const { activeCompany } = useCompany();
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENT_PER_PAGE = 8;

  // ── Existing financial calculations (preserved) ──────────────────
  const jurnalBulan = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const soBulan = useMemo(() => filterByPeriod(so || [], period, "tgl_muat"), [so, period]);

  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);

  const totalPendapatan = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0), [jurnalBulan, coaPendapatan]);
  const totalBeban = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0), [jurnalBulan, coaBeban]);
  const labaRugi = totalPendapatan - totalBeban;
  const totalPiutang = useMemo(() => (piutang || []).reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);

  // ── KPI Row 1 — Operasional ──────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const soAktif = useMemo(() => (so || []).filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [so]);
  const soMenungguKonfirmasi = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Order Confirmed").length, [so]);
  const soTidakAdaUpdate = useMemo(() => {
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    return (so || []).filter((s: any) => {
      if (!["On Going", "Loading"].includes(s.status_muatan)) return false;
      const logs = s.posisi_log || [];
      if (logs.length === 0) return true;
      const last = logs[logs.length - 1];
      const lastTime = new Date(`${last.date} ${last.time}`).getTime();
      return isNaN(lastTime) || (now - lastTime) > TWELVE_HOURS;
    }).length;
  }, [so]);

  // ── KPI Row 2 — Keuangan ────────────────────────────────────────
  const isFinanceRole = currentUser?.role === "Admin" || currentUser?.role === "Keuangan";
  const nowMonth = today.getMonth();
  const nowYear = today.getFullYear();

  const revenueBulanIni = useMemo(() => {
    return (so || []).filter((s: any) => {
      if (s.status_muatan !== "Completed") return false;
      const d = new Date(s.tgl_muat || s.tgl_order);
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
    }).reduce((sum: number, s: any) => sum + Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0), 0);
  }, [so, nowMonth, nowYear]);

  const soBelumDiinvoice = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Completed" && (s.invoice_count === 0 || !s.invoice_count)).length, [so]);

  // ── Shipment table ───────────────────────────────────────────────
  const shipmentSorted = useMemo(() =>
    [...(so || [])].sort((a: any, b: any) => String(b.tgl_muat || "").localeCompare(String(a.tgl_muat || "")))
  , [so]);
  const shipmentFiltered = useMemo(() =>
    shipmentFilter === "Semua" ? shipmentSorted : shipmentSorted.filter((s: any) => s.status_muatan === shipmentFilter)
  , [shipmentSorted, shipmentFilter]);
  const shipmentTotalPages = Math.max(1, Math.ceil(shipmentFiltered.length / SHIPMENT_PER_PAGE));
  const shipmentPaged = useMemo(() =>
    shipmentFiltered.slice((shipmentPage - 1) * SHIPMENT_PER_PAGE, shipmentPage * SHIPMENT_PER_PAGE)
  , [shipmentFiltered, shipmentPage]);

  // ── Dispatcher ────────────────────────────────────────────────────
  const dalamPerjalanan = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "On Going").length, [so]);
  const dispatcherItems = [
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: <CalendarBlank size={14} weight="fill" className="text-[#EB5E28]" /> },
    { label: "Armada Aktif", value: (armada || []).filter((a: any) => a.status === "Aktif").length, icon: <Truck size={14} weight="fill" className="text-[#EB5E28]" /> },
    { label: "Sopir Tersedia", value: (sopir || []).filter((d: any) => d.status === "Aktif").length, icon: <Users size={14} weight="fill" className="text-[#EB5E28]" /> },
    { label: "Dalam Perjalanan", value: dalamPerjalanan, icon: <NavigationArrow size={14} weight="fill" className="text-[#EB5E28]" /> },
  ];

  // ── Aktivitas Terbaru (from posisi_log) ──────────────────────────
  const recentCargoActivity = useMemo(() => {
    const allLogs: any[] = [];
    (so || []).forEach((s: any) => {
      if (!["On Going", "Loading", "Arrived"].includes(s.status_muatan)) return;
      (s.posisi_log || []).forEach((l: any) => {
        allLogs.push({ ...l, order_id: s.order_id, customer: s.customer });
      });
    });
    return allLogs.sort((a, b) => {
      const ta = new Date(`${a.date} ${a.time}`).getTime();
      const tb = new Date(`${b.date} ${b.time}`).getTime();
      return tb - ta;
    }).slice(0, 5);
  }, [so]);

  // ── Alerts ────────────────────────────────────────────────────────
  const soDraft = useMemo(() => (so || []).filter((s: any) => s.is_posted === false).length, [so]);

  const alerts = useMemo(() => {
    const list: any[] = [];
    if (soDraft > 0) list.push({ icon: <NotePencil size={14} weight="fill" style={{ color: "#EB5E28" }} />, label: `${soDraft} Sales Order masih berupa Draft`, color: "#EB5E28", action: () => onNavigate("operasional", "so") });
    list.push({ icon: <CreditCard size={14} weight="fill" style={{ color: "#B85450" }} />, label: `0 Invoice belum lunas`, color: "#B85450", action: () => onNavigate("operasional", "invoice") });
    if (soBelumDiinvoice > 0) list.push({ icon: <FileX size={14} weight="fill" style={{ color: "#C4914A" }} />, label: `${soBelumDiinvoice} SO belum diinvoice`, color: "#C4914A", action: () => onNavigate("operasional", "so") });
    return list.filter(a => !a.label.startsWith("0 "));
  }, [so, soDraft, soBelumDiinvoice]);

  return (
    <div style={{ height: "calc(100vh - 72px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* KPI ROW 1 — Ringkasan Operasional */}
      <div className="mb-4 px-6 pt-5">
        <div className="text-[10px] font-black text-[#9B9690] uppercase tracking-widest mb-2">Ringkasan Operasional</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div onClick={() => onNavigate?.("operasional", "so")} className="bg-white rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ padding: "14px 16px" }}>
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FEF0E8" }}>
                <Truck size={18} weight="fill" className="text-[#EB5E28]" />
              </div>
              <CaretRight size={16} weight="fill" className="text-[#8D8A85]" />
            </div>
            <div className="mt-3">
              <div className="font-black text-[#EB5E28] tabular-nums leading-none" style={{ fontSize: 28 }}>{soAktif}</div>
              <div className="text-[12px] font-medium text-[#52504A] mt-1">SO Aktif</div>
            </div>
          </div>

          <div onClick={() => onNavigate?.("operasional", "so")} className="bg-white rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ padding: "14px 16px" }}>
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFF8EC" }}>
                <ClockCountdown size={18} weight="fill" className="text-[#C4914A]" />
              </div>
              <CaretRight size={16} weight="fill" className="text-[#8D8A85]" />
            </div>
            <div className="mt-3">
              <div className="font-black text-[#C4914A] tabular-nums leading-none" style={{ fontSize: 28 }}>{soMenungguKonfirmasi}</div>
              <div className="text-[12px] font-medium text-[#52504A] mt-1">Menunggu Konfirmasi</div>
            </div>
          </div>

          <div onClick={() => onNavigate?.("operasional", "muatan")} className="bg-white rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ padding: "14px 16px" }}>
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFF0F0" }}>
                <WarningCircle size={18} weight="fill" className="text-[#B85450]" />
              </div>
              <CaretRight size={16} weight="fill" className="text-[#8D8A85]" />
            </div>
            <div className="mt-3">
              <div className="font-black text-[#B85450] tabular-nums leading-none" style={{ fontSize: 28 }}>{soTidakAdaUpdate}</div>
              <div className="text-[12px] font-medium text-[#52504A] mt-1">Tidak Ada Update &gt;12 jam</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI ROW 2 — Ringkasan Keuangan (Admin/Keuangan only) */}
      {isFinanceRole && (
        <div className="mb-4 px-6">
          <div className="text-[10px] font-black text-[#9B9690] uppercase tracking-widest mb-2">Ringkasan Keuangan</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div onClick={() => onNavigate?.("laporan")} className="rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ background: "#F8F6F3", padding: "12px 16px" }}>
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0F7EA" }}>
                  <ChartLineUp size={16} weight="fill" className="text-[#5C8A3C]" />
                </div>
                <CaretRight size={14} weight="fill" className="text-[#8D8A85]" />
              </div>
              <div className="mt-3">
                <div className="font-bold text-[#1A1A1A] tabular-nums leading-none" style={{ fontSize: 22 }}>Rp{fmt(revenueBulanIni)}</div>
                <div className="text-[12px] font-medium text-[#52504A] mt-1">Revenue Bulan Ini</div>
              </div>
            </div>

            <div onClick={() => onNavigate?.("operasional", "invoice")} className="rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ background: "#F8F6F3", padding: "12px 16px" }}>
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFF0F0" }}>
                  <Receipt size={16} weight="fill" className="text-[#B85450]" />
                </div>
                <CaretRight size={14} weight="fill" className="text-[#8D8A85]" />
              </div>
              <div className="mt-3">
                <div className="font-bold text-[#1A1A1A] tabular-nums leading-none" style={{ fontSize: 22 }}>0</div>
                <div className="text-[12px] font-medium text-[#52504A] mt-1">Invoice Belum Lunas</div>
              </div>
            </div>

            <div onClick={() => onNavigate?.("operasional", "so")} className="rounded-xl border border-[#E2DDD6] cursor-pointer hover:border-[#EB5E28]/40 transition-all" style={{ background: "#F8F6F3", padding: "12px 16px" }}>
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFF8EC" }}>
                  <ClipboardText size={16} weight="fill" className="text-[#C4914A]" />
                </div>
                <CaretRight size={14} weight="fill" className="text-[#8D8A85]" />
              </div>
              <div className="mt-3">
                <div className="font-bold text-[#1A1A1A] tabular-nums leading-none" style={{ fontSize: 22 }}>{soBelumDiinvoice}</div>
                <div className="text-[12px] font-medium text-[#52504A] mt-1">SO Belum Diinvoice</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-column layout — fills remaining space */}
      <div className="flex gap-6 px-6 pb-4 flex-1 min-h-0">
        {/* LEFT — Shipment Terbaru */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#E2DDD6] overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-[#E2DDD6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0" style={{ background: "#F8F6F3" }}>
            <h3 className="text-[13px] font-black text-[#1A1A1A] tracking-tight">Shipment Terbaru</h3>
            <select
              className="input-field h-8 text-[11px] font-bold w-full sm:w-40"
              value={shipmentFilter}
              onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
            >
              {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 140 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr style={{ background: "#F8F6F3" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Order</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Tgl Muat</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Rute</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Sopir & Armada</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-[#9B9690] uppercase tracking-wider">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="text-[10px] font-bold text-[#9B9690]">Tidak ada data</div>
                    </td>
                  </tr>
                ) : (
                  shipmentPaged.map((s: any) => (
                    <tr key={s.id} className="border-b border-[#E2DDD6]/50 hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSOClick?.(s.order_id)}
                          className="text-[11px] font-black text-[#EB5E28] hover:underline tracking-tight"
                        >
                          {s.order_id}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-medium text-[#52504A] tabular-nums">{fmtTglMuat(s.tgl_muat)}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-[#1A1A1A] truncate max-w-[140px]">{s.customer || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-medium text-[#52504A] truncate max-w-[160px]">
                          {s.lokasi_muat || "—"} → {s.lokasi_bongkar || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-bold text-[#1A1A1A] leading-tight">{s.nama_sopir || "—"}</div>
                        <div className="text-[10px] text-[#9B9690]">{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[s.status_muatan] || "bg-[#F1EFE8] text-[#5F5E5A]"}`}>
                          {s.status_muatan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] font-black text-[#1A1A1A] tabular-nums whitespace-nowrap">
                        Rp{fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-[#E2DDD6] flex items-center justify-between flex-shrink-0" style={{ background: "#F8F6F3" }}>
            <span className="text-[10px] font-bold text-[#9B9690]">
              Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * SHIPMENT_PER_PAGE + 1}-{Math.min(shipmentPage * SHIPMENT_PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={shipmentPage <= 1}
                onClick={() => setShipmentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E2DDD6] text-[10px] font-bold text-[#52504A] disabled:opacity-30 hover:bg-white transition-all"
              >
                Prev
              </button>
              <span className="text-[10px] font-bold text-[#52504A]">Halaman {shipmentPage} / {shipmentTotalPages}</span>
              <button
                disabled={shipmentPage >= shipmentTotalPages}
                onClick={() => setShipmentPage(p => Math.min(shipmentTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E2DDD6] text-[10px] font-bold text-[#52504A] disabled:opacity-30 hover:bg-white transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — 260px */}
        <div className="w-[260px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Dispatcher Hari Ini */}
          <div className="bg-white rounded-xl border border-[#E2DDD6] p-4">
            <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-3">Dispatcher Hari Ini</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {dispatcherItems.map((d) => (
                <div key={d.label} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E2DDD6]/50">
                  <div className="mb-1.5">{d.icon}</div>
                  <div className="text-[20px] font-bold text-[#1A1A1A] tabular-nums leading-none">{d.value}</div>
                  <div className="text-[11px] text-[#52504A] mt-1">{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div className="bg-white rounded-xl border border-[#E2DDD6] p-4">
            <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-3">Aktivitas Terbaru</h3>
            <div className="flex flex-col gap-2">
              {recentCargoActivity.length === 0 ? (
                <div className="py-6 text-center text-[10px] font-bold text-[#9B9690]">Belum ada aktivitas</div>
              ) : (
                recentCargoActivity.map((l: any, i: number) => (
                  <div key={i} className="relative pl-4 pb-2 border-l-2 border-[#E2DDD6] last:border-0 last:pb-0">
                    <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-[#B85450]" />
                    <button
                      className="text-[10px] font-bold text-[#EB5E28] hover:underline"
                      onClick={() => onSOClick?.(l.order_id)}
                    >
                      {l.order_id || "Draft"}
                    </button>
                    <div className="text-[10px] font-medium text-[#52504A] truncate">{l.location || "Transito"}</div>
                    <div className="text-[9px] text-[#9B9690]">
                      {l.time} · {l.date}
                      {(() => {
                        const t = new Date(`${l.date} ${l.time}`).getTime();
                        if (isNaN(t)) return "";
                        const mins = Math.round((Date.now() - t) / 60000);
                        if (mins < 60) return ` · ${mins} menit lalu`;
                        const hrs = Math.round(mins / 60);
                        return ` · ${hrs} jam lalu`;
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alert */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2DDD6] p-4">
              <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-3">Alert</h3>
              <div className="flex flex-col gap-2">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    onClick={a.action}
                    className="bg-white rounded-lg border-l-[3px] border border-[#E2DDD6] px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#FAF8F5] transition-all"
                    style={{ borderLeftColor: a.color }}
                  >
                    <span className="shrink-0">{a.icon}</span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] flex-1 leading-tight">{a.label}</span>
                    <CaretRight size={12} weight="fill" className="text-[#9B9690] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
