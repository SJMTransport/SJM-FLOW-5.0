import React, { useState, useMemo } from "react";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import {
  Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText,
  CalendarBlank, NavigationArrow, CaretRight, CaretDown, Package, Van,
  UserCircle, Warning, Info, CheckCircle, ArrowRight,
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
  "On Going":       { bg: "#DBEAFE", color: "#2563EB" },
  "Loading":        { bg: "#FEF3C7", color: "#D97706" },
  "Arrived":        { bg: "#E0E7FF", color: "#4F46E5" },
  "Completed":      { bg: "#DCFCE7", color: "#16A34A" },
  "Cancelled":      { bg: "#FEE2E2", color: "#DC2626" },
  "Order Confirmed":{ bg: "#F3F4F6", color: "#6B7280" },
  "Hold":           { bg: "#FEE2E2", color: "#DC2626" },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Pagi";
  if (h < 15) return "Siang";
  if (h < 18) return "Sore";
  return "Malam";
};

/* ─── small reusable badge ─── */
const StatusBadge = ({ status }: { status: string }) => {
  const sc = STATUS_COLORS[status] || { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
      background: sc.bg, color: sc.color,
    }}>{status}</span>
  );
};

export const Dashboard = ({
  jurnal, so, coa, piutang,
  armada = [], sopir = [], armadaDokumen = [],
  currentUser, onSOClick, onJurnalClick,
}: any) => {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();

  const [period, setPeriod] = useState({
    mode: "month",
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage]     = useState(1);
  const SHIPMENT_PER_PAGE = 8;

  /* ── Financial ── */
  const jurnalBulan       = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const coaPendapatan     = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban          = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);
  const totalPendapatan   = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0), [jurnalBulan, coaPendapatan]);
  const totalBeban        = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0), [jurnalBulan, coaBeban]);
  const totalPiutang      = useMemo(() => (piutang || []).reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);

  /* ── KPI ops ── */
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const soAktif              = useMemo(() => (so || []).filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [so]);
  const soMenungguKonfirmasi = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Order Confirmed").length, [so]);
  const soTidakAdaUpdate     = useMemo(() => {
    const now = Date.now();
    const TWELVE = 12 * 60 * 60 * 1000;
    return (so || []).filter((s: any) => {
      if (!["On Going", "Loading"].includes(s.status_muatan)) return false;
      const logs = s.posisi_log || [];
      if (logs.length === 0) return true;
      const last = logs[logs.length - 1];
      const lastTime = new Date(`${last.date} ${last.time}`).getTime();
      return isNaN(lastTime) || (now - lastTime) > TWELVE;
    }).length;
  }, [so]);

  /* ── KPI finance ── */
  const isFinanceRole  = currentUser?.role === "Admin" || currentUser?.role === "Keuangan";
  const nowMonth       = today.getMonth();
  const nowYear        = today.getFullYear();
  const revenueBulanIni = useMemo(() => (so || []).filter((s: any) => {
    if (s.status_muatan !== "Completed") return false;
    const d = new Date(s.tgl_muat || s.tgl_order);
    return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
  }).reduce((sum: number, s: any) => sum + Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0), 0), [so, nowMonth, nowYear]);

  const soBelumDiinvoice = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Completed" && (s.invoice_count === 0 || !s.invoice_count)).length, [so]);

  /* ── Shipment table ── */
  const shipmentSorted  = useMemo(() => [...(so || [])].sort((a: any, b: any) => String(b.tgl_muat || "").localeCompare(String(a.tgl_muat || ""))), [so]);
  const shipmentFiltered = useMemo(() => shipmentFilter === "Semua" ? shipmentSorted : shipmentSorted.filter((s: any) => s.status_muatan === shipmentFilter), [shipmentSorted, shipmentFilter]);
  const shipmentTotalPages = Math.max(1, Math.ceil(shipmentFiltered.length / SHIPMENT_PER_PAGE));
  const shipmentPaged   = useMemo(() => shipmentFiltered.slice((shipmentPage - 1) * SHIPMENT_PER_PAGE, shipmentPage * SHIPMENT_PER_PAGE), [shipmentFiltered, shipmentPage]);

  /* ── Dispatcher ── */
  const dalamPerjalanan = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "On Going").length, [so]);
  const dispatcherItems = [
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: <Package  size={26} />, color: "#EB5E28" },
    { label: "Armada Aktif",      value: (armada || []).length,                                          icon: <Van       size={26} />, color: "#16A34A" },
    { label: "Sopir Tersedia",    value: (sopir || []).length,                                            icon: <UserCircle size={26} />, color: "#2563EB" },
    { label: "Dalam Perjalanan",  value: dalamPerjalanan,                                                icon: <NavigationArrow size={26} />, color: "#EB5E28" },
  ];

  /* ── Aktivitas Terbaru ── */
  const recentActivity = useMemo(() => {
    const logs: any[] = [];
    (so || []).forEach((s: any) => {
      (s.posisi_log || []).forEach((l: any) => {
        logs.push({ ...l, order_id: s.order_id, customer: s.customer, status: s.status_muatan });
      });
    });
    return logs.sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime()).slice(0, 5);
  }, [so]);

  /* ── Action Center ── */
  const soDraft = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Order Confirmed").length, [so]);

  const actionItems = [
    { count: soDraft,           label: "Sales Order masih berupa Draft",    border: "#DC2626", bg: "#FEF2F2", iconBg: "#FEE2E2", icon: <Warning       size={16} color="#DC2626" />, action: () => navigate("/sales-order") },
    { count: soBelumDiinvoice,  label: "SO belum diinvoice",                border: "#EA580C", bg: "#FFF7ED", iconBg: "#FEF3C7", icon: <ClipboardText  size={16} color="#EA580C" />, action: () => navigate("/sales-order") },
    { count: soTidakAdaUpdate,  label: "Shipment tidak update >12 jam",     border: "#D97706", bg: "#FFFBEB", iconBg: "#FEF3C7", icon: <ClockCountdown  size={16} color="#D97706" />, action: () => navigate("/update-muatan") },
    { count: 0,                 label: "Invoice jatuh tempo minggu ini",    border: "#2563EB", bg: "#EFF6FF", iconBg: "#DBEAFE", icon: <Info            size={16} color="#2563EB" />, action: () => navigate("/invoice") },
  ];

  /* ── Pagination ── */
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (shipmentTotalPages <= 5) {
      for (let i = 1; i <= shipmentTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (shipmentPage > 3) pages.push("...");
      for (let i = Math.max(2, shipmentPage - 1); i <= Math.min(shipmentTotalPages - 1, shipmentPage + 1); i++) pages.push(i);
      if (shipmentPage < shipmentTotalPages - 2) pages.push("...");
      pages.push(shipmentTotalPages);
    }
    return pages;
  };

  const firstName = currentUser?.nama?.split(" ")[0] || currentUser?.email?.split("@")[0] || "User";

  /* ── period label ── */
  const periodLabel = `${new Date(period.year, period.month, 1).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(period.year, period.month + 1, 0).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;

  /* ─────────────────────────────── RENDER ─────────────────────────────── */
  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", background: "#F5F4F1", overflow: "hidden" }}>

      {/* ══════════════════ MAIN SCROLL AREA ══════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 32px 24px", minWidth: 0 }}>

        {/* [1] HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>
              Selamat {getGreeting()}, {firstName} 👋
            </h1>
            <p style={{ fontSize: 13, color: "#52504A", marginTop: 4, marginBottom: 0 }}>
              Ringkasan operasional hari ini
            </p>
          </div>
          <button style={{
            height: 36, border: "1px solid #E2DDD6", borderRadius: 8,
            background: "white", display: "flex", alignItems: "center", gap: 8,
            padding: "0 14px", cursor: "pointer", flexShrink: 0,
          }}>
            <CalendarBlank size={15} style={{ color: "#52504A" }} />
            <span style={{ fontSize: 13, color: "#1A1A1A", whiteSpace: "nowrap" }}>{periodLabel}</span>
            <CaretDown size={13} style={{ color: "#9B9690" }} />
          </button>
        </div>

        {/* [2] KPI — OPERASIONAL */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>RINGKASAN OPERASIONAL</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { icon: <Truck size={32} />, iconBg: "#DBEAFE", iconColor: "#2563EB", value: soAktif,              label: "SO Aktif",                  sub: "shipment berjalan",     onClick: () => navigate("/sales-order") },
              { icon: <ClockCountdown size={32} />, iconBg: "#FEF3C7", iconColor: "#D97706", value: soMenungguKonfirmasi, label: "Menunggu Konfirmasi", sub: "perlu tindakan",        onClick: () => navigate("/sales-order") },
              { icon: <WarningCircle size={32} />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: soTidakAdaUpdate,    label: "Tidak Update >12 Jam",  sub: "butuh perhatian",       onClick: () => navigate("/update-muatan") },
            ].map((k) => (
              <div key={k.label} onClick={k.onClick} style={kpiCard}
                onMouseEnter={e => hoverOn(e)} onMouseLeave={e => hoverOff(e)}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor, flexShrink: 0 }}>
                  {k.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: "#9B9690", marginTop: 4 }}>{k.sub}</div>
                </div>
                <CaretRight size={16} color="#9B9690" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* [3] KPI — KEUANGAN */}
        {isFinanceRole && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>RINGKASAN KEUANGAN</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { icon: <ChartLineUp size={32} />, iconBg: "#DCFCE7", iconColor: "#16A34A", value: `Rp ${fmt(revenueBulanIni)}`, label: "Revenue Bulan Ini",    sub: "dari SO selesai",        onClick: () => navigate("/laporan") },
                { icon: <Receipt      size={32} />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: "0",                           label: "Invoice Belum Lunas",  sub: "outstanding",            onClick: () => navigate("/invoice") },
                { icon: <ClipboardText size={32} />, iconBg: "#FEF3C7", iconColor: "#D97706", value: `${soBelumDiinvoice}`,        label: "SO Belum Diinvoice",   sub: "perlu dibuatkan invoice", onClick: () => navigate("/sales-order") },
              ].map((k) => (
                <div key={k.label} onClick={k.onClick} style={kpiCard}
                  onMouseEnter={e => hoverOn(e)} onMouseLeave={e => hoverOff(e)}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor, flexShrink: 0 }}>
                    {k.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: k.value.startsWith("Rp") ? 22 : 32, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: "#9B9690", marginTop: 4 }}>{k.sub}</div>
                  </div>
                  <CaretRight size={16} color="#9B9690" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [4] SHIPMENT TABLE */}
        <div style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 12, overflow: "hidden" }}>

          {/* toolbar */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={sectionLabel}>SHIPMENT AKTIF</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={shipmentFilter}
                onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
                style={{ height: 34, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13, padding: "0 10px", background: "white", cursor: "pointer", color: "#1A1A1A" }}
              >
                {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                  <option key={s} value={s}>{s === "Semua" ? "Semua Status" : s}</option>
                ))}
              </select>
              <button style={{ height: 34, padding: "0 14px", border: "1px solid #E2DDD6", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 13, color: "#52504A", display: "flex", alignItems: "center", gap: 6 }}>
                ⧖ Filter
              </button>
            </div>
          </div>

          {/* table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ width: 105 }} />
                <col style={{ width: 165 }} />
                <col style={{ width: 155 }} />
                <col style={{ width: 155 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead style={{ background: "#F8F6F3" }}>
                <tr>
                  {[
                    { label: "ORDER",        align: "left" },
                    { label: "TGL MUAT ↕",  align: "left" },
                    { label: "CUSTOMER",     align: "left" },
                    { label: "RUTE",         align: "left" },
                    { label: "SOPIR & ARMADA", align: "left" },
                    { label: "STATUS",       align: "left" },
                    { label: "DURASI",       align: "left" },
                    { label: "NILAI",        align: "right" },
                    { label: "⋮",            align: "center" },
                  ].map(h => (
                    <th key={h.label} style={{
                      textAlign: h.align as any, padding: "10px 12px",
                      fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: "0.5px", color: "#9B9690",
                      borderBottom: "1px solid #E2DDD6", whiteSpace: "nowrap",
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", fontSize: 13, color: "#9B9690" }}>
                      Tidak ada data shipment
                    </td>
                  </tr>
                ) : shipmentPaged.map((s: any) => (
                  <tr key={s.id}
                    onMouseEnter={e => { Array.from(e.currentTarget.children).forEach((td) => ((td as HTMLElement).style.background = "#FAF8F5")); }}
                    onMouseLeave={e => { Array.from(e.currentTarget.children).forEach((td) => ((td as HTMLElement).style.background = "")); }}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={tdBase}>
                      <button onClick={() => onSOClick?.(s.order_id)} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "monospace" }}>
                        {s.order_id}
                      </button>
                    </td>
                    <td style={{ ...tdBase, color: "#1A1A1A", fontVariantNumeric: "tabular-nums" }}>{fmtTglMuat(s.tgl_muat)}</td>
                    <td style={{ ...tdBase, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.customer || ""}>{s.customer || "—"}</td>
                    <td style={tdBase} title={`${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`}>
                      <div style={{ fontSize: 13, color: "#1A1A1A" }}>{s.lokasi_muat || "—"}</div>
                      <div style={{ fontSize: 11, color: "#9B9690", margin: "1px 0" }}>↓</div>
                      <div style={{ fontSize: 13, color: "#1A1A1A" }}>{s.lokasi_bongkar || "—"}</div>
                    </td>
                    <td style={tdBase}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{s.nama_sopir || "—"}</div>
                      <div style={{ fontSize: 11, color: "#52504A", marginTop: 2 }}>{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                    </td>
                    <td style={tdBase}><StatusBadge status={s.status_muatan} /></td>
                    <td style={{ ...tdBase, color: "#52504A", fontVariantNumeric: "tabular-nums" }}>
                      {["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—"}
                    </td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      Rp {fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                    </td>
                    <td style={{ ...tdBase, textAlign: "center" }}>
                      <span style={{ fontSize: 16, color: "#9B9690" }}>⋮</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#52504A" }}>
            <span>
              Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * SHIPMENT_PER_PAGE + 1}
              {" – "}
              {Math.min(shipmentPage * SHIPMENT_PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button disabled={shipmentPage <= 1} onClick={() => setShipmentPage(p => p - 1)} style={pagBtn(false, false, shipmentPage <= 1)}>‹ Prev</button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} style={{ padding: "0 4px", color: "#9B9690" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setShipmentPage(p as number)} style={pagBtn(true, shipmentPage === p, false)}>{p}</button>
                )
              )}
              <button disabled={shipmentPage >= shipmentTotalPages} onClick={() => setShipmentPage(p => p + 1)} style={pagBtn(false, false, shipmentPage >= shipmentTotalPages)}>Next ›</button>
            </div>
          </div>
        </div>
        {/* end of main scroll */}
      </div>

      {/* ══════════════════ RIGHT SIDEBAR (fixed width, scrollable) ══════════════════ */}
      <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #E2DDD6", background: "#FAFAF8", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* DISPATCHER HARI INI */}
        <div>
          <div style={panelLabel}>DISPATCHER HARI INI</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {dispatcherItems.map((d) => (
              <div key={d.label} style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 10, padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <div style={{ color: d.color }}>{d.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{d.value}</div>
                <div style={{ fontSize: 11, color: "#52504A", lineHeight: 1.3 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AKTIVITAS TERBARU */}
        <div>
          <div style={panelLabel}>AKTIVITAS TERBARU</div>
          <div style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 10, overflow: "hidden" }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Belum ada aktivitas</div>
            ) : recentActivity.map((l: any, i: number) => {
              const sc = STATUS_COLORS[l.status] || { bg: "#F3F4F6", color: "#6B7280" };
              const isLast = i === recentActivity.length - 1;
              return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderBottom: isLast ? "none" : "1px solid #F0EBE4", alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ClipboardText size={15} style={{ color: sc.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <button onClick={() => onSOClick?.(l.order_id)} style={{ color: "#EB5E28", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12 }}>{l.order_id}</button>
                      {l.location ? <span style={{ fontWeight: 400, color: "#52504A" }}> · {l.location}</span> : null}
                    </div>
                    <div style={{ fontSize: 11, color: "#9B9690", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.customer || "oleh Operator"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "#9B9690" }}>{l.time || ""}</span>
                    <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{l.status}</span>
                  </div>
                </div>
              );
            })}
            <div
              onClick={() => navigate("/log-aktivitas")}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F8F6F3", fontSize: 12, fontWeight: 500, color: "#EB5E28", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FEF0E8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#F8F6F3"; }}
            >
              <span>Lihat semua aktivitas</span>
              <CaretRight size={14} />
            </div>
          </div>
        </div>

        {/* ACTION CENTER */}
        <div>
          <div style={panelLabel}>ACTION CENTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actionItems.filter(a => a.count > 0 || a.border === "#2563EB").map((a, i) => (
              <div
                key={i}
                onClick={a.action}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 12px", borderRadius: 10, cursor: "pointer",
                  borderLeft: `3px solid ${a.border}`, background: a.bg,
                  transition: "opacity 150ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", minWidth: 32, fontVariantNumeric: "tabular-nums" }}>{a.count}</div>
                <div style={{ flex: 1, fontSize: 12, color: "#52504A", lineHeight: 1.3 }}>{a.label}</div>
                <CaretRight size={14} color="#9B9690" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── shared style helpers ─── */
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.8px", color: "#6B6760", marginBottom: 10,
};

const panelLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.8px", color: "#6B6760", marginBottom: 10,
};

const kpiCard: React.CSSProperties = {
  background: "white", border: "1px solid #E2DDD6", borderRadius: 12,
  padding: "18px 20px", display: "flex", alignItems: "center",
  gap: 16, cursor: "pointer", transition: "border-color 150ms, box-shadow 150ms",
};

const tdBase: React.CSSProperties = {
  padding: "10px 12px", fontSize: 13, color: "#1A1A1A",
  borderBottom: "1px solid #F0EBE4", verticalAlign: "middle",
};

const hoverOn = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.borderColor = "#EB5E28";
  e.currentTarget.style.boxShadow   = "0 2px 8px rgba(235,94,40,0.10)";
};
const hoverOff = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.borderColor = "#E2DDD6";
  e.currentTarget.style.boxShadow   = "none";
};

const pagBtn = (isSquare: boolean, active: boolean, disabled: boolean): React.CSSProperties => ({
  height: 28,
  width: isSquare ? 28 : undefined,
  padding: isSquare ? undefined : "0 10px",
  borderRadius: 6,
  border: `1px solid ${active ? "#EB5E28" : "#E2DDD6"}`,
  background: active ? "#EB5E28" : "white",
  color: active ? "white" : "#1A1A1A",
  fontWeight: active ? 600 : 400,
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  display: "flex", alignItems: "center", justifyContent: "center",
});
