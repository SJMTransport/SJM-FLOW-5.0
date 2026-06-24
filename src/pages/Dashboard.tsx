import React, { useState, useMemo } from "react";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import {
  Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText,
  CalendarBlank, NavigationArrow, CaretRight, CaretDown, Package, Van,
  UserCircle, Warning, Info, CheckCircle, ArrowRight, MagnifyingGlass, Bell,
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
  "On Going":       { bg: "#EFF6FF", color: "#2563EB" },
  "Loading":        { bg: "#FFFBEB", color: "#D97706" },
  "Arrived":        { bg: "#EEF2FF", color: "#4F46E5" },
  "Completed":      { bg: "#F0FDF4", color: "#16A34A" },
  "Cancelled":      { bg: "#FEF2F2", color: "#DC2626" },
  "Order Confirmed":{ bg: "#F9FAFB", color: "#6B7280" },
  "Hold":           { bg: "#FEF2F2", color: "#DC2626" },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Pagi";
  if (h < 15) return "Siang";
  if (h < 18) return "Sore";
  return "Malam";
};

const StatusBadge = ({ status }: { status: string }) => {
  const sc = STATUS_COLORS[status] || { bg: "#F9FAFB", color: "#6B7280" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 12px", borderRadius: 6,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
      background: sc.bg, color: sc.color, border: `1px solid ${sc.color}20`
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
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: <Package  size={22} weight="fill" />, color: "#EB5E28", bg: "#FEF0E8" },
    { label: "Armada Aktif",      value: (armada || []).length,                                          icon: <Van       size={22} weight="fill" />, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Sopir Tersedia",    value: (sopir || []).length,                                            icon: <UserCircle size={22} weight="fill" />, color: "#2563EB", bg: "#EFF6FF" },
    { label: "Dalam Perjalanan",  value: dalamPerjalanan,                                                icon: <NavigationArrow size={22} weight="fill" />, color: "#EB5E28", bg: "#FEF0E8" },
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
    { count: soDraft,           label: "Sales Order masih berupa Draft",    border: "#DC2626", bg: "#FEF2F2", iconBg: "#FEE2E2", icon: <Warning       size={18} weight="fill" color="#DC2626" />, action: () => navigate("/sales-order") },
    { count: soBelumDiinvoice,  label: "SO belum diinvoice",                border: "#EA580C", bg: "#FFF7ED", iconBg: "#FFEDD5", icon: <ClipboardText  size={18} weight="fill" color="#EA580C" />, action: () => navigate("/sales-order") },
    { count: soTidakAdaUpdate,  label: "Shipment tidak update >12 jam",     border: "#D97706", bg: "#FFFBEB", iconBg: "#FEF3C7", icon: <ClockCountdown  size={18} weight="fill" color="#D97706" />, action: () => navigate("/update-muatan") },
    { count: 5,                 label: "Invoice jatuh tempo minggu ini",    border: "#2563EB", bg: "#EFF6FF", iconBg: "#DBEAFE", icon: <Info            size={18} weight="fill" color="#2563EB" />, action: () => navigate("/invoice") },
  ];

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
  const periodLabel = `1 Jun 2026 - 30 Jun 2026`; // Contoh statis seperti foto

  return (
    <div style={{ display: "flex", height: "100%", background: "#F9FAFB", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════ MAIN CONTENT ══════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>

        {/* [1] HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#111827", letterSpacing: "-0.5px" }}>
              Selamat {getGreeting()}, {firstName} 👋
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 0 }}>
              Ringkasan operasional hari ini
            </p>
          </div>
          <button style={{
            height: 42, border: "1px solid #E5E7EB", borderRadius: 10,
            background: "white", display: "flex", alignItems: "center", gap: 10,
            padding: "0 16px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}>
            <CalendarBlank size={18} weight="bold" style={{ color: "#374151" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>{periodLabel}</span>
            <CaretDown size={14} weight="bold" style={{ color: "#9CA3AF" }} />
          </button>
        </div>

        {/* [2] KPI — OPERASIONAL */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabel}>RINGKASAN OPERASIONAL</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { icon: <Truck size={24} weight="fill" />, iconBg: "#EFF6FF", iconColor: "#2563EB", value: soAktif,              label: "SO Aktif",                  onClick: () => navigate("/sales-order") },
              { icon: <ClockCountdown size={24} weight="fill" />, iconBg: "#FFFBEB", iconColor: "#D97706", value: soMenungguKonfirmasi, label: "Menunggu Konfirmasi", onClick: () => navigate("/sales-order") },
              { icon: <WarningCircle size={24} weight="fill" />, iconBg: "#FEF2F2", iconColor: "#DC2626", value: soTidakAdaUpdate,    label: "Tidak Update >12 Jam", onClick: () => navigate("/update-muatan") },
            ].map((k) => (
              <div key={k.label} onClick={k.onClick} style={kpiCard}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor }}>
                  {k.icon}
                </div>
                <div style={{ flex: 1, marginLeft: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4B5563", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
                </div>
                <CaretRight size={18} weight="bold" color="#D1D5DB" />
              </div>
            ))}
          </div>
        </div>

        {/* [3] KPI — KEUANGAN */}
        {isFinanceRole && (
          <div style={{ marginBottom: 32 }}>
            <div style={sectionLabel}>RINGKASAN KEUANGAN</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {[
                { icon: <ChartLineUp size={24} weight="fill" />, iconBg: "#F0FDF4", iconColor: "#16A34A", value: `Rp ${fmt(revenueBulanIni)}`, label: "Revenue Bulan Ini",    onClick: () => navigate("/laporan") },
                { icon: <Receipt      size={24} weight="fill" />, iconBg: "#FEF2F2", iconColor: "#DC2626", value: "372",                           label: "Invoice Belum Lunas", onClick: () => navigate("/invoice") },
                { icon: <ClipboardText size={24} weight="fill" />, iconBg: "#FFFBEB", iconColor: "#D97706", value: `366`,        label: "SO Belum Diinvoice", onClick: () => navigate("/sales-order") },
              ].map((k) => (
                <div key={k.label} onClick={k.onClick} style={kpiCard}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor }}>
                    {k.icon}
                  </div>
                  <div style={{ flex: 1, marginLeft: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#4B5563", marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: k.value.startsWith("Rp") ? 22 : 30, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
                  </div>
                  <CaretRight size={18} weight="bold" color="#D1D5DB" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [4] SHIPMENT TABLE */}
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", letterSpacing: "0.2px" }}>SHIPMENT AKTIF</span>
            <div style={{ display: "flex", gap: 10 }}>
              <select
                value={shipmentFilter}
                onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
                style={{ height: 38, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 500, padding: "0 12px", background: "white", color: "#374151" }}
              >
                {["Semua Status", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button style={{ height: 38, padding: "0 16px", border: "1px solid #E5E7EB", borderRadius: 8, background: "white", fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>⧖</span> Filter
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F9FAFB" }}>
                <tr>
                  {["ORDER", "TGL MUAT ↕", "CUSTOMER", "RUTE", "SOPIR & ARMADA", "STATUS", "DURASI", "NILAI", ""].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 7 ? "right" : "left", padding: "12px 24px",
                      fontSize: 11, fontWeight: 600, color: "#6B7280",
                      borderBottom: "1px solid #F3F4F6", letterSpacing: "0.05em"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={tdBase}>
                      <button onClick={() => onSOClick?.(s.order_id)} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {s.order_id}
                      </button>
                    </td>
                    <td style={{ ...tdBase, color: "#374151" }}>{fmtTglMuat(s.tgl_muat)}</td>
                    <td style={{ ...tdBase, fontWeight: 600, color: "#111827" }}>{s.customer || "—"}</td>
                    <td style={tdBase}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 13, color: "#111827" }}>{s.lokasi_muat || "—"}</span>
                        <div style={{ height: 12, borderLeft: "1px dashed #D1D5DB", marginLeft: 6, margin: "2px 0" }}></div>
                        <span style={{ fontSize: 13, color: "#111827" }}>{s.lokasi_bongkar || "—"}</span>
                      </div>
                    </td>
                    <td style={tdBase}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{s.nama_sopir || "—"}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.no_polisi || ""} · {s.jenis_truk || ""}</div>
                    </td>
                    <td style={tdBase}><StatusBadge status={s.status_muatan} /></td>
                    <td style={{ ...tdBase, color: "#374151" }}>{calcDurasi(s)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "#111827" }}>
                      Rp {fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                    </td>
                    <td style={{ ...tdBase, textAlign: "center" }}>
                      <button style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 18 }}>⋮</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#6B7280" }}>
            <span>Menampilkan 1 - 8 dari 399 data</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={pagBtn(false, false, true)}>Prev</button>
              <button style={pagBtn(true, true, false)}>1</button>
              <button style={pagBtn(true, false, false)}>2</button>
              <button style={pagBtn(true, false, false)}>3</button>
              <span style={{ padding: "0 8px" }}>...</span>
              <button style={pagBtn(true, false, false)}>50</button>
              <button style={pagBtn(false, false, false)}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ RIGHT SIDEBAR ══════════════════ */}
      <div style={{ width: 340, flexShrink: 0, borderLeft: "1px solid #E5E7EB", background: "white", overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* DISPATCHER */}
        <div>
          <div style={panelLabel}>DISPATCHER HARI INI</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {dispatcherItems.map((d) => (
              <div key={d.label} style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: d.bg, color: d.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{d.icon}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{d.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginTop: 4 }}>{d.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AKTIVITAS TERBARU */}
        <div>
          <div style={panelLabel}>AKTIVITAS TERBARU</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #F3F4F6", borderRadius: 12, overflow: "hidden" }}>
            {recentActivity.map((l: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: i === 4 ? "none" : "1px solid #F3F4F6" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ClipboardText size={16} weight="fill" color="#6B7280" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
                    {l.order_id} <span style={{ fontWeight: 400, color: "#6B7280" }}>{l.action || "dibuat oleh Admin"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{l.time || "10:45"} · {l.status}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: "12px", background: "#F9FAFB", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#111827", cursor: "pointer", borderTop: "1px solid #F3F4F6" }}>
              Lihat semua aktivitas <CaretRight size={12} weight="bold" />
            </div>
          </div>
        </div>

        {/* ACTION CENTER */}
        <div>
          <div style={panelLabel}>ACTION CENTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actionItems.map((a, i) => (
              <div key={i} onClick={a.action} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px",
                borderRadius: 12, cursor: "pointer", background: a.bg, border: "1px solid transparent"
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{a.count}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#4B5563" }}>{a.label}</div>
                </div>
                <CaretRight size={16} weight="bold" color="#9CA3AF" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── STYLES ─── */
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 16,
};

const panelLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 16,
};

const kpiCard: React.CSSProperties = {
  background: "white", border: "1px solid #E5E7EB", borderRadius: 16,
  padding: "24px", display: "flex", alignItems: "center", cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "all 0.2s"
};

const tdBase: React.CSSProperties = {
  padding: "16px 24px", fontSize: 13, verticalAlign: "middle",
};

const pagBtn = (isSquare: boolean, active: boolean, disabled: boolean): React.CSSProperties => ({
  height: 32,
  minWidth: isSquare ? 32 : 64,
  borderRadius: 6,
  border: active ? "none" : "1px solid #E5E7EB",
  background: active ? "#EB5E28" : "white",
  color: active ? "white" : "#374151",
  fontWeight: 600,
  fontSize: 12,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
  display: "flex", alignItems: "center", justifyContent: "center",
});
