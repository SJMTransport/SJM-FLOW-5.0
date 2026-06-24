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
  "On Going":        { bg: "#DBEAFE", color: "#2563EB" },
  "Loading":         { bg: "#FEF3C7", color: "#D97706" },
  "Arrived":         { bg: "#E0E7FF", color: "#4F46E5" },
  "Completed":       { bg: "#DCFCE7", color: "#16A34A" },
  "Cancelled":       { bg: "#FEE2E2", color: "#DC2626" },
  "Order Confirmed": { bg: "#F3F4F6", color: "#6B7280" },
  "Hold":            { bg: "#FEE2E2", color: "#DC2626" },
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
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage] = useState(1);
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

  // ── KPI Keuangan ──
  const isFinance = currentUser?.role === "Admin" || currentUser?.role === "Keuangan";
  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const revenueBulanIni = useMemo(() => {
    return (so || []).filter((s: any) => {
      if (s.status_muatan !== "Completed") return false;
      const d = new Date(s.tgl_muat || s.tgl_order);
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
    }).reduce((sum: number, s: any) => sum + Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0), 0);
  }, [so, nowMonth, nowYear]);
  const totalPiutang = useMemo(() => (piutang || []).reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);
  const soBelumInvoice = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Completed" && (!s.invoice_count || s.invoice_count === 0)).length, [so]);

  // ── Shipment Table ──
  const shipmentSorted = useMemo(() =>
    [...(so || [])].sort((a: any, b: any) => String(b.tgl_muat || "").localeCompare(String(a.tgl_muat || "")))
  , [so]);
  const shipmentFiltered = useMemo(() =>
    shipmentFilter === "Semua" ? shipmentSorted : shipmentSorted.filter((s: any) => s.status_muatan === shipmentFilter)
  , [shipmentSorted, shipmentFilter]);
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

  // ── Pagination ──
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
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden", background: "#F5F4F1" }}>

      {/* ═══ LEFT COLUMN ═══ */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 24px", gap: 16, overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>
              Selamat {getGreeting()}, {firstName} 👋
            </h1>
            <p style={{ fontSize: 13, color: "#52504A", marginTop: 4, marginBottom: 0 }}>
              Ringkasan operasional hari ini
            </p>
          </div>
          <div style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, background: "white", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", cursor: "pointer", flexShrink: 0 }}>
            <CalendarBlank size={16} style={{ color: "#52504A" }} />
            <span style={{ fontSize: 13, color: "#1A1A1A", whiteSpace: "nowrap" }}>{periodLabel}</span>
            <CaretDown size={14} style={{ color: "#9B9690" }} />
          </div>
        </div>

        {/* KPI ROW 1 — RINGKASAN OPERASIONAL */}
        <div style={{ flexShrink: 0 }}>
          <div style={labelStyle}>Ringkasan Operasional</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { icon: <Truck size={24} weight="fill" />, iconBg: "#DBEAFE", iconColor: "#2563EB", value: soAktif, label: "SO Aktif", to: "/sales-order" },
              { icon: <ClockCountdown size={24} weight="fill" />, iconBg: "#FEF3C7", iconColor: "#D97706", value: soMenunggu, label: "Menunggu Konfirmasi", to: "/sales-order" },
              { icon: <WarningCircle size={24} weight="fill" />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: soNoUpdate, label: "Tidak Update >12 Jam", to: "/update-muatan" },
            ].map((k) => (
              <div key={k.label} onClick={() => navigate(k.to)} style={kpiCard}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(235,94,40,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ ...iconBox, background: k.iconBg, color: k.iconColor }}>{k.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                </div>
                <CaretRight size={16} color="#9B9690" />
              </div>
            ))}
          </div>
        </div>

        {/* KPI ROW 2 — RINGKASAN KEUANGAN */}
        {isFinance && (
          <div style={{ flexShrink: 0 }}>
            <div style={labelStyle}>Ringkasan Keuangan</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { icon: <ChartLineUp size={24} weight="fill" />, iconBg: "#DCFCE7", iconColor: "#16A34A", value: `Rp ${fmt(revenueBulanIni)}`, label: "Revenue Bulan Ini", to: "/laporan/laba-rugi" },
                { icon: <Receipt size={24} weight="fill" />, iconBg: "#FEE2E2", iconColor: "#DC2626", value: fmt(totalPiutang), label: "Invoice Belum Lunas", to: "/invoice" },
                { icon: <ClipboardText size={24} weight="fill" />, iconBg: "#FEF3C7", iconColor: "#D97706", value: String(soBelumInvoice), label: "SO Belum Diinvoice", to: "/sales-order" },
              ].map((k) => (
                <div key={k.label} onClick={() => navigate(k.to)} style={{ ...kpiCard, padding: "14px 20px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(235,94,40,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ ...iconBox, background: k.iconBg, color: k.iconColor }}>{k.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#52504A", marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                  </div>
                  <CaretRight size={16} color="#9B9690" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHIPMENT TABLE */}
        <div style={{ flex: 1, minHeight: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9B9690" }}>Shipment Aktif</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={shipmentFilter} onChange={e => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
                style={{ height: 32, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13, padding: "0 8px", background: "white", cursor: "pointer" }}
              >
                {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                  <option key={s} value={s}>{s === "Semua" ? "Semua Status" : s}</option>
                ))}
              </select>
              <button style={{ height: 32, padding: "0 12px", border: "1px solid #E2DDD6", borderRadius: 8, background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#52504A" }}>
                <Funnel size={14} /> Filter
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F8F6F3" }}>
                <tr>
                  {["ORDER", "TGL MUAT ↕", "CUSTOMER", "RUTE", "SOPIR & ARMADA", "STATUS", "DURASI", "NILAI", ""].map((h, i) => (
                    <th key={h || i} style={{ textAlign: h === "NILAI" ? "right" as const : "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9B9690", borderBottom: "1px solid #E2DDD6", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Tidak ada data shipment</td></tr>
                ) : shipmentPaged.map((s: any) => {
                  const sc = STATUS_COLORS[s.status_muatan] || { bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <tr key={s.id} style={{ cursor: "pointer" }}
                      onMouseEnter={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = "#FAF8F5"; }}
                      onMouseLeave={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = ""; }}
                    >
                      <td style={td}><button onClick={() => onSOClick?.(s.order_id)} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "monospace" }}>{s.order_id}</button></td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{fmtTglMuat(s.tgl_muat)}</td>
                      <td style={{ ...td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }} title={s.customer || ""}>{s.customer || "—"}</td>
                      <td style={td} title={`${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`}>
                        <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.3 }}>{s.lokasi_muat || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9B9690", margin: "1px 0" }}>↓</div>
                        <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.3 }}>{s.lokasi_bongkar || "—"}</div>
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{s.nama_sopir || "—"}</div>
                        <div style={{ fontSize: 11, color: "#52504A", marginTop: 2 }}>{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                      </td>
                      <td style={td}><span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: sc.bg, color: sc.color }}>{s.status_muatan}</span></td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums", color: "#52504A" }}>{["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>Rp{fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}</td>
                      <td style={{ ...td, textAlign: "center" }}><span style={{ fontSize: 16, color: "#9B9690", cursor: "pointer" }}>⋮</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontSize: 12, color: "#52504A" }}>
            <span>Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * PER_PAGE + 1} - {Math.min(shipmentPage * PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button disabled={shipmentPage <= 1} onClick={() => setShipmentPage(p => p - 1)} style={pagBtn(shipmentPage <= 1)}>‹ Prev</button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={`e${i}`} style={{ padding: "0 4px", color: "#9B9690" }}>…</span>
              ) : (
                <button key={p} onClick={() => setShipmentPage(p as number)} style={{ width: 28, height: 28, borderRadius: 6, fontSize: 12, border: `1px solid ${shipmentPage === p ? "#EB5E28" : "#E2DDD6"}`, background: shipmentPage === p ? "#EB5E28" : "white", color: shipmentPage === p ? "white" : "#1A1A1A", fontWeight: shipmentPage === p ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{p}</button>
              ))}
              <button disabled={shipmentPage >= totalPages} onClick={() => setShipmentPage(p => p + 1)} style={pagBtn(shipmentPage >= totalPages)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN ═══ */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, padding: "20px 24px 20px 0", overflowY: "auto", minHeight: 0 }}>

        {/* DISPATCHER HARI INI */}
        <div style={panel}>
          <div style={labelStyle}>Dispatcher Hari Ini</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: <Package size={18} weight="fill" />, color: "#EB5E28", value: shipmentHariIni, label: "Shipment Hari Ini" },
              { icon: <Van size={18} weight="fill" />, color: "#16A34A", value: (armada || []).length, label: "Armada Aktif" },
              { icon: <UserCircle size={18} weight="fill" />, color: "#2563EB", value: (sopir || []).length, label: "Sopir Tersedia" },
              { icon: <NavigationArrow size={18} weight="fill" />, color: "#EB5E28", value: dalamPerjalanan, label: "Dalam Perjalanan" },
            ].map(d => (
              <div key={d.label} style={{ background: "#F8F6F3", borderRadius: 8, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: d.color }}>{d.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{d.value}</div>
                  <div style={{ fontSize: 10, color: "#52504A", marginTop: 3 }}>{d.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AKTIVITAS TERBARU */}
        <div style={panel}>
          <div style={labelStyle}>Aktivitas Terbaru</div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Belum ada aktivitas</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentActivity.map((l: any, i: number) => {
                const ac = STATUS_COLORS[l.status] || { bg: "#FEF0E8", color: "#EB5E28" };
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderBottom: i < recentActivity.length - 1 ? "1px solid #F0EBE4" : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: ac.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <ClipboardText size={14} weight="fill" style={{ color: ac.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <button onClick={() => onSOClick?.(l.order_id)} style={{ color: "#EB5E28", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12 }}>{l.order_id}</button>
                        {l.location ? <span style={{ color: "#52504A", fontWeight: 400 }}> · {l.location}</span> : null}
                      </div>
                      <div style={{ fontSize: 11, color: "#9B9690", marginTop: 2 }}>{l.customer || "oleh Operator"}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "#9B9690", whiteSpace: "nowrap" }}>{l.time || ""}</span>
                      <span style={{ padding: "2px 6px", borderRadius: 999, fontSize: 10, fontWeight: 500, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>{l.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div onClick={() => navigate("/activity")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#F8F6F3", borderRadius: 8, marginTop: 8, fontSize: 12, fontWeight: 500, color: "#EB5E28", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#FEF0E8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F8F6F3"; }}
          >
            <span>Lihat semua aktivitas</span>
            <CaretRight size={14} />
          </div>
        </div>

        {/* ACTION CENTER */}
        <div style={panel}>
          <div style={labelStyle}>Action Center</div>
          {actionItems.map((a, i) => (
            <div key={i} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", borderLeft: `3px solid ${a.border}`, background: a.bg }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: a.iconColor }}>{a.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", minWidth: 36, fontVariantNumeric: "tabular-nums" }}>{a.count}</div>
              <div style={{ flex: 1, fontSize: 12, color: "#52504A", lineHeight: 1.3 }}>{a.label}</div>
              <CaretRight size={14} style={{ color: "#9B9690", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Shared styles ──
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#9B9690", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 };
const iconBox: React.CSSProperties = { width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const kpiCard: React.CSSProperties = { background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 150ms ease", flex: 1 };
const panel: React.CSSProperties = { flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: 14 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "#1A1A1A", borderBottom: "1px solid #F0EBE4" };
const pagBtn = (disabled: boolean): React.CSSProperties => ({ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, color: "#52504A" });
