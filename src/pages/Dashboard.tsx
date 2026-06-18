import React, { useState, useMemo } from "react";
import { C } from "../constants";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText, CalendarBlank, Users, NavigationArrow, NotePencil, CreditCard, FileX, CaretRight } from "@phosphor-icons/react";

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

const ALERT_TINT: Record<string, string> = {
  "#EB5E28": "#FEF0E8",
  "#B85450": "#FDEEEE",
  "#C4914A": "#FDF3E3",
};

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], currentUser, onSOClick, onJurnalClick }: any) => {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
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
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: <CalendarBlank size={18} weight="fill" className="text-[#EB5E28]" /> },
    { label: "Armada Aktif", value: (armada || []).filter((a: any) => a.status === "Aktif").length, icon: <Truck size={18} weight="fill" className="text-[#5C8A3C]" /> },
    { label: "Sopir Tersedia", value: (sopir || []).filter((d: any) => d.status === "Aktif").length, icon: <Users size={18} weight="fill" className="text-[#2563EB]" /> },
    { label: "Dalam Perjalanan", value: dalamPerjalanan, icon: <NavigationArrow size={18} weight="fill" className="text-[#C4914A]" /> },
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
    }).slice(0, 4);
  }, [so]);

  // ── Alerts ────────────────────────────────────────────────────────
  const soDraft = useMemo(() => (so || []).filter((s: any) => s.is_posted === false).length, [so]);

  const alerts = useMemo(() => {
    const list: any[] = [];
    if (soDraft > 0) list.push({ icon: <NotePencil size={16} weight="fill" style={{ color: "#EB5E28" }} />, label: `${soDraft} Sales Order masih berupa Draft`, color: "#EB5E28", action: () => navigate("/sales-order") });
    list.push({ icon: <CreditCard size={16} weight="fill" style={{ color: "#B85450" }} />, label: `0 Invoice belum lunas`, color: "#B85450", action: () => navigate("/invoice") });
    if (soBelumDiinvoice > 0) list.push({ icon: <FileX size={16} weight="fill" style={{ color: "#C4914A" }} />, label: `${soBelumDiinvoice} SO belum diinvoice`, color: "#C4914A", action: () => navigate("/sales-order") });
    return list.filter(a => !a.label.startsWith("0 "));
  }, [so, soDraft, soBelumDiinvoice]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px - 40px)", gap: 12, overflow: "hidden" }}>

      {/* ── KPI ROW 1 — Ringkasan Operasional ── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8D8A85", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Ringkasan Operasional</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { icon: <Truck size={20} weight="fill" className="text-[#EB5E28]" />, bg: "#FEF0E8", value: soAktif, color: "#EB5E28", label: "SO Aktif", sub: "On Going + Loading", onClick: () => navigate("/sales-order") },
            { icon: <ClockCountdown size={20} weight="fill" className="text-[#C4914A]" />, bg: "#FFF8EC", value: soMenungguKonfirmasi, color: "#C4914A", label: "Menunggu Konfirmasi", onClick: () => navigate("/sales-order") },
            { icon: <WarningCircle size={20} weight="fill" className="text-[#B85450]" />, bg: "#FFF0F0", value: soTidakAdaUpdate, color: "#B85450", label: "Tidak Ada Update >12 jam", onClick: () => navigate("/update-muatan") },
          ].map((k) => (
            <div key={k.label} onClick={k.onClick} style={{ background: "white", border: "1px solid #E2DDD6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                <div style={{ fontSize: 12, color: "#52504A", marginTop: 2 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI ROW 2 — Ringkasan Keuangan ── */}
      {isFinanceRole && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8D8A85", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Ringkasan Keuangan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: <ChartLineUp size={20} weight="fill" className="text-[#5C8A3C]" />, bg: "#F0F7EA", value: `Rp ${fmt(revenueBulanIni)}`, label: "Revenue Bulan Ini", onClick: () => navigate("/laporan") },
              { icon: <Receipt size={20} weight="fill" className="text-[#B85450]" />, bg: "#FFF0F0", value: `${(so || []).filter((s: any) => s.status_muatan === "Completed").length}`, label: "Invoice Belum Lunas", sub: "invoice", onClick: () => navigate("/invoice") },
              { icon: <ClipboardText size={20} weight="fill" className="text-[#C4914A]" />, bg: "#FFF8EC", value: `${soBelumDiinvoice}`, label: "SO Belum Diinvoice", sub: "SO", onClick: () => navigate("/sales-order") },
            ].map((k) => (
              <div key={k.label} onClick={k.onClick} style={{ background: "#F8F6F3", border: "1px solid #E2DDD6", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: "#52504A", marginTop: 2 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KONTEN BAWAH ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>

        {/* KIRI — Tabel Shipment */}
        <div style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Shipment Terbaru</span>
            <select
              className="input-field"
              style={{ height: 32, fontSize: 11, fontWeight: 600, width: 150 }}
              value={shipmentFilter}
              onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
            >
              {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8F6F3" }}>
                <tr>
                  {["ORDER", "TGL MUAT", "CUSTOMER", "RUTE", "SOPIR & ARMADA", "STATUS", "NILAI"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 6 ? "right" : "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8D8A85", borderBottom: "1px solid #E2DDD6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentPaged.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", fontSize: 12, color: "#9B9690" }}>Tidak ada data</td></tr>
                ) : (
                  shipmentPaged.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #F0EDE8", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#FAF8F5")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => onSOClick?.(s.order_id)} style={{ fontSize: 13, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          {s.order_id}
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#52504A", fontVariantNumeric: "tabular-nums" }}>{fmtTglMuat(s.tgl_muat)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.customer || ""}>{s.customer || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#52504A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`}>
                        {s.lokasi_muat || "—"} → {s.lokasi_bongkar || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.3 }}>{s.nama_sopir || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9B9690" }}>{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[s.status_muatan] || "bg-[#F1EFE8] text-[#5F5E5A]"}`}>
                          {s.status_muatan}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        Rp{fmt(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontSize: 12 }}>
            <span style={{ color: "#9B9690" }}>
              Menampilkan {shipmentFiltered.length === 0 ? 0 : (shipmentPage - 1) * SHIPMENT_PER_PAGE + 1} - {Math.min(shipmentPage * SHIPMENT_PER_PAGE, shipmentFiltered.length)} dari {shipmentFiltered.length} data
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                disabled={shipmentPage <= 1}
                onClick={() => setShipmentPage(p => Math.max(1, p - 1))}
                style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, color: "#52504A", cursor: shipmentPage <= 1 ? "not-allowed" : "pointer", opacity: shipmentPage <= 1 ? 0.3 : 1 }}
              >
                ‹ Prev
              </button>
              <span style={{ fontSize: 12, color: "#52504A" }}>Halaman {shipmentPage} / {shipmentTotalPages}</span>
              <button
                disabled={shipmentPage >= shipmentTotalPages}
                onClick={() => setShipmentPage(p => Math.min(shipmentTotalPages, p + 1))}
                style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, color: shipmentPage >= shipmentTotalPages ? "#C0B8B0" : "#EB5E28", fontWeight: 600, cursor: shipmentPage >= shipmentTotalPages ? "not-allowed" : "pointer", opacity: shipmentPage >= shipmentTotalPages ? 0.3 : 1 }}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* KANAN — Panel */}
        <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>

          {/* Dispatcher Hari Ini */}
          <div style={{ flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8D8A85", marginBottom: 10 }}>Dispatcher Hari Ini</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {dispatcherItems.map((d) => (
                <div key={d.label} style={{ background: "#F8F6F3", borderRadius: 8, padding: 10 }}>
                  <div style={{ marginBottom: 6 }}>{d.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{d.value}</div>
                  <div style={{ fontSize: 11, color: "#52504A", marginTop: 4 }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div style={{ flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8D8A85", marginBottom: 8 }}>Aktivitas Terbaru</div>
            {recentCargoActivity.length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 11, color: "#9B9690" }}>Belum ada aktivitas</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentCargoActivity.map((l: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B85450", marginTop: 5, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <button onClick={() => onSOClick?.(l.order_id)} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {l.order_id || "Draft"}
                      </button>
                      <div style={{ fontSize: 12, color: "#52504A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.location || "Transito"}</div>
                      <div style={{ fontSize: 11, color: "#9B9690" }}>
                        {l.date} • {l.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert */}
          {alerts.length > 0 && (
            <div style={{ flex: 1, overflowY: "auto", background: "white", border: "1px solid #E2DDD6", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8D8A85", marginBottom: 8 }}>Alert</div>
              {alerts.map((a, i) => (
                <div
                  key={i}
                  onClick={a.action}
                  style={{ padding: "8px 10px", borderLeft: `3px solid ${a.color}`, background: ALERT_TINT[a.color] || "#F8F6F3", borderRadius: "0 6px 6px 0", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ flexShrink: 0 }}>{a.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.3 }}>{a.label}</span>
                  </div>
                  <CaretRight size={14} weight="fill" style={{ color: "#9B9690", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
