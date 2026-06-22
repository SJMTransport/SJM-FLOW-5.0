import React, { useState, useMemo } from "react";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText, CalendarBlank, Users, NavigationArrow, CaretRight, CaretLeft, Plus, DotsThree, Package, Van, UserCircle, Warning, Funnel } from "@phosphor-icons/react";

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
  "On Going": { bg: "#DBEAFE", color: "#2563EB" },
  "Loading": { bg: "#FEF3C7", color: "#D97706" },
  "Arrived": { bg: "#E0E7FF", color: "#4F46E5" },
  "Completed": { bg: "#DCFCE7", color: "#16A34A" },
  "Cancelled": { bg: "#FEE2E2", color: "#DC2626" },
  "Order Confirmed": { bg: "#F3F4F6", color: "#6B7280" },
  "Hold": { bg: "#FEE2E2", color: "#DC2626" },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Pagi";
  if (h < 15) return "Siang";
  if (h < 18) return "Sore";
  return "Malam";
};

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], currentUser, onSOClick, onJurnalClick }: any) => {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENT_PER_PAGE = 8;

  // ── Financial calculations (preserved) ──
  const jurnalBulan = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);
  const totalPendapatan = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0), [jurnalBulan, coaPendapatan]);
  const totalBeban = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0), [jurnalBulan, coaBeban]);
  const totalPiutang = useMemo(() => (piutang || []).reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);

  // ── KPI Row 1 ──
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

  // ── KPI Row 2 ──
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

  // ── Shipment table ──
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

  // ── Dispatcher ──
  const dalamPerjalanan = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "On Going").length, [so]);
  const dispatcherItems = [
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: <Package size={18} style={{ color: "#EB5E28" }} /> },
    { label: "Armada Aktif", value: (armada || []).length, icon: <Van size={18} style={{ color: "#16A34A" }} /> },
    { label: "Sopir Tersedia", value: (sopir || []).length, icon: <UserCircle size={18} style={{ color: "#2563EB" }} /> },
    { label: "Dalam Perjalanan", value: dalamPerjalanan, icon: <NavigationArrow size={18} style={{ color: "#EB5E28" }} /> },
  ];

  // ── Aktivitas Terbaru ──
  const recentCargoActivity = useMemo(() => {
    const allLogs: any[] = [];
    (so || []).forEach((s: any) => {
      if (!["On Going", "Loading", "Arrived"].includes(s.status_muatan)) return;
      (s.posisi_log || []).forEach((l: any) => {
        allLogs.push({ ...l, order_id: s.order_id, customer: s.customer, status: s.status_muatan });
      });
    });
    return allLogs.sort((a, b) => {
      const ta = new Date(`${a.date} ${a.time}`).getTime();
      const tb = new Date(`${b.date} ${b.time}`).getTime();
      return tb - ta;
    }).slice(0, 5);
  }, [so]);

  const ACTIVITY_ICON_COLORS: Record<string, { bg: string; color: string }> = {
    "On Going": { bg: "#DBEAFE", color: "#2563EB" },
    "Loading": { bg: "#FEF3C7", color: "#D97706" },
    "Arrived": { bg: "#E0E7FF", color: "#4F46E5" },
    "Completed": { bg: "#DCFCE7", color: "#16A34A" },
    "Cancelled": { bg: "#FEE2E2", color: "#DC2626" },
  };

  // ── Action Center ──
  const soDraft = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Order Confirmed").length, [so]);

  // ── Pagination ──
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", padding: "20px 24px", gap: 12, overflow: "hidden", background: "#F5F4F1", boxSizing: "border-box" as any }}>

      {/* [1] HEADER ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>
            Selamat {getGreeting()}, {firstName} 👋
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "SO Baru", path: "/sales-order" },
            { label: "Update Muatan", path: "/update-muatan" },
            { label: "Invoice Baru", path: "/invoice" },
          ].map(q => (
            <button
              key={q.label}
              onClick={() => navigate(q.path)}
              style={{ height: 36, padding: "0 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid #E2DDD6", background: "white", color: "#1A1A1A", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 150ms ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.color = "#EB5E28"; e.currentTarget.style.background = "#FEF0E8"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.color = "#1A1A1A"; e.currentTarget.style.background = "white"; }}
            >
              <Plus size={14} /> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* [2] KPI ROW 1 — Operasional */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#9B9690", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Ringkasan Operasional</div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {[
            { icon: <Truck size={24} />, iconBg: "#DBEAFE", iconColor: "#2563EB", value: soAktif, label: "SO Aktif", onClick: () => navigate("/sales-order") },
            { icon: <ClockCountdown size={24} />, iconBg: "#FEF3C7", iconColor: "#D97706", value: soMenungguKonfirmasi, label: "Menunggu Konfirmasi", onClick: () => navigate("/sales-order") },
            { icon: <WarningCircle size={24} />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: soTidakAdaUpdate, label: "Tidak Ada Update >12 Jam", onClick: () => navigate("/update-muatan") },
          ].map((k) => (
            <div
              key={k.label}
              onClick={k.onClick}
              style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 150ms ease", flex: 1 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(235,94,40,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: k.iconColor }}>{k.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
              </div>
              <CaretRight size={16} color="#9B9690" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* [3] KPI ROW 2 — Keuangan */}
      {isFinanceRole && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9B9690", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Ringkasan Keuangan</div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            {[
              { icon: <ChartLineUp size={24} />, iconBg: "#DCFCE7", iconColor: "#16A34A", value: `Rp ${fmt(revenueBulanIni)}`, label: "Revenue Bulan Ini", onClick: () => navigate("/laporan") },
              { icon: <Receipt size={24} />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: "0", label: "Invoice Belum Lunas", onClick: () => navigate("/invoice") },
              { icon: <ClipboardText size={24} />, iconBg: "#FEF3C7", iconColor: "#D97706", value: `${soBelumDiinvoice}`, label: "SO Belum Diinvoice", onClick: () => navigate("/sales-order") },
            ].map((k) => (
              <div
                key={k.label}
                onClick={k.onClick}
                style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 150ms ease", flex: 1 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(235,94,40,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: k.iconColor }}>{k.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                </div>
                <CaretRight size={16} color="#9B9690" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* [4] CONTENT ROW */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* LEFT — Shipment Table */}
        <div style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {/* Toolbar */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9B9690" }}>Shipment Aktif</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={shipmentFilter}
                onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
                style={{ height: 32, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13, padding: "0 8px", background: "white", cursor: "pointer" }}
              >
                {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button style={{ height: 32, padding: "0 12px", border: "1px solid #E2DDD6", borderRadius: 8, background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#52504A" }}>
                <Funnel size={14} /> Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F8F6F3" }}>
                <tr>
                  {[
                    { label: "ORDER", align: "left" },
                    { label: "TGL MUAT ↕", align: "left" },
                    { label: "CUSTOMER", align: "left" },
                    { label: "RUTE", align: "left" },
                    { label: "SOPIR & ARMADA", align: "left" },
                    { label: "STATUS", align: "left" },
                    { label: "DURASI", align: "left" },
                    { label: "NILAI", align: "right" },
                    { label: "⋮", align: "center" },
                  ].map((h) => (
                    <th key={h.label} style={{ textAlign: h.align as any, padding: "10px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9B9690", borderBottom: "1px solid #E2DDD6", whiteSpace: "nowrap", cursor: h.label.includes("↕") ? "pointer" : "default" }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Tidak ada data shipment</td></tr>
                ) : (
                  shipmentPaged.map((s: any) => {
                    const sc = STATUS_COLORS[s.status_muatan] || { bg: "#F3F4F6", color: "#6B7280" };
                    return (
                      <tr key={s.id} style={{ cursor: "pointer" }}
                        onMouseEnter={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = "#FAF8F5"; }}
                        onMouseLeave={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = ""; }}
                      >
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #F0EBE4" }}>
                          <button onClick={() => onSOClick?.(s.order_id)} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "monospace" }}>
                            {s.order_id}
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", borderBottom: "1px solid #F0EBE4" }}>{fmtTglMuat(s.tgl_muat)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px solid #F0EBE4" }} title={s.customer || ""}>{s.customer || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px solid #F0EBE4" }} title={`${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`}>
                          {s.lokasi_muat || "—"} → {s.lokasi_bongkar || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #F0EBE4" }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", lineHeight: 1.3 }}>{s.nama_sopir || "—"}</div>
                          <div style={{ fontSize: 11, color: "#52504A", marginTop: 2 }}>{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #F0EBE4" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: sc.bg, color: sc.color }}>
                            {s.status_muatan}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#52504A", fontVariantNumeric: "tabular-nums", borderBottom: "1px solid #F0EBE4" }}>
                          {["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", borderBottom: "1px solid #F0EBE4" }}>
                          Rp {fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #F0EBE4" }}>
                          <span style={{ fontSize: 16, color: "#9B9690", cursor: "pointer" }}>⋮</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontSize: 12, color: "#52504A" }}>
            <span>
              Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * SHIPMENT_PER_PAGE + 1} - {Math.min(shipmentPage * SHIPMENT_PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                disabled={shipmentPage <= 1}
                onClick={() => setShipmentPage(p => p - 1)}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, cursor: shipmentPage <= 1 ? "not-allowed" : "pointer", opacity: shipmentPage <= 1 ? 0.4 : 1, color: "#52504A" }}
              >
                ‹ Prev
              </button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} style={{ padding: "0 4px", color: "#9B9690" }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setShipmentPage(p as number)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, fontSize: 12,
                      border: `1px solid ${shipmentPage === p ? "#EB5E28" : "#E2DDD6"}`,
                      background: shipmentPage === p ? "#EB5E28" : "white",
                      color: shipmentPage === p ? "white" : "#1A1A1A",
                      fontWeight: shipmentPage === p ? 600 : 400,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={shipmentPage >= shipmentTotalPages}
                onClick={() => setShipmentPage(p => p + 1)}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, cursor: shipmentPage >= shipmentTotalPages ? "not-allowed" : "pointer", opacity: shipmentPage >= shipmentTotalPages ? 0.4 : 1, color: "#52504A" }}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Panel 300px */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", minHeight: 0 }}>

          {/* Dispatcher Hari Ini */}
          <div style={{ flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9B9690", marginBottom: 12 }}>Dispatcher Hari Ini</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {dispatcherItems.map((d) => (
                <div key={d.label} style={{ background: "#F8F6F3", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ marginBottom: 4 }}>{d.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{d.value}</div>
                  <div style={{ fontSize: 11, color: "#52504A" }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div style={{ flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9B9690", marginBottom: 8 }}>Aktivitas Terbaru</div>
            {recentCargoActivity.length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Belum ada aktivitas</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentCargoActivity.map((l: any, i: number) => {
                  const ac = ACTIVITY_ICON_COLORS[l.status] || { bg: "#FEF0E8", color: "#EB5E28" };
                  const sc = STATUS_COLORS[l.status] || { bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: i < recentCargoActivity.length - 1 ? "1px solid #F0EBE4" : "none" }}>
                      <div style={{ fontSize: 11, color: "#9B9690", whiteSpace: "nowrap", marginTop: 2, minWidth: 32 }}>{l.time || ""}</div>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: ac.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ac.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A" }}>
                          <button onClick={() => onSOClick?.(l.order_id)} style={{ color: "#EB5E28", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12 }}>{l.order_id}</button>
                        </div>
                        <div style={{ fontSize: 11, color: "#52504A", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.location || "Transito"}</div>
                      </div>
                      <span style={{ display: "inline-flex", padding: "2px 6px", borderRadius: 999, fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color, flexShrink: 0, marginTop: 2, whiteSpace: "nowrap" }}>
                        {l.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div
              onClick={() => navigate("/log-aktivitas")}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#F8F6F3", borderRadius: 8, marginTop: 8, fontSize: 12, fontWeight: 500, color: "#EB5E28", cursor: "pointer", transition: "background 150ms ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FEF0E8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#F8F6F3"; }}
            >
              <span>Lihat semua aktivitas ›</span>
            </div>
          </div>

          {/* Action Center */}
          <div style={{ flex: 1, overflowY: "auto", background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9B9690", marginBottom: 8 }}>Action Center</div>
            {[
              { severity: "critical", count: soDraft, label: "Sales Order masih berupa Draft", icon: <Warning size={16} style={{ color: "#DC2626" }} />, iconBg: "#FEE2E2", border: "#DC2626", bg: "#FEF2F2", action: () => navigate("/sales-order") },
              { severity: "high", count: soBelumDiinvoice, label: "SO belum diinvoice", icon: <ClipboardText size={16} style={{ color: "#EA580C" }} />, iconBg: "#FEF3C7", border: "#EA580C", bg: "#FFF7ED", action: () => navigate("/sales-order") },
              { severity: "medium", count: soTidakAdaUpdate, label: "Shipment tidak update >12 jam", icon: <ClockCountdown size={16} style={{ color: "#D97706" }} />, iconBg: "#FEF3C7", border: "#D97706", bg: "#FFFBEB", action: () => navigate("/update-muatan") },
              { severity: "info", count: 0, label: "Invoice jatuh tempo minggu ini", icon: <Receipt size={16} style={{ color: "#2563EB" }} />, iconBg: "#DBEAFE", border: "#2563EB", bg: "#EFF6FF", action: () => navigate("/invoice") },
            ].filter(a => a.count > 0 || a.severity === "info").map((a, i) => (
              <div
                key={i}
                onClick={a.action}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", borderLeft: `3px solid ${a.border}`, background: a.bg, transition: "all 150ms ease" }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", minWidth: 36, fontVariantNumeric: "tabular-nums" }}>{a.count}</div>
                <div style={{ flex: 1, fontSize: 12, color: "#52504A", lineHeight: 1.3 }}>{a.label}</div>
                <CaretRight size={14} style={{ color: "#9B9690", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
