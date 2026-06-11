import React, { useState, useMemo } from "react";
import { C } from "../constants";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { Card, StatCard, Spark, PeriodFilter, Icon, EmptyState, PageShell, PageHeader, KPIGrid } from "@/src/components/SJMComponents";
import { useCompany } from "@/src/context/CompanyContext";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Selamat Pagi";
  if (h >= 11 && h < 15) return "Selamat Siang";
  if (h >= 15 && h < 19) return "Selamat Sore";
  return "Selamat Malam";
};

const STATUS_BADGE: Record<string, string> = {
  "Order Confirmed": "bg-blue-brand-light text-blue-brand",
  "Loading": "bg-yellow-brand-light text-yellow-brand",
  "On Going": "bg-accent/10 text-accent",
  "Arrived": "bg-blue-brand-light text-blue-brand",
  "Completed": "bg-green-brand-light text-green-brand",
  "Cancelled": "bg-red-brand-light text-red-brand",
  "Hold": "bg-red-brand-light text-red-brand",
};

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], currentUser, onNavigate, onSOClick, onJurnalClick }: any) => {
  const { activeCompany } = useCompany();
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [shipmentFilter, setShipmentFilter] = useState("Semua");
  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENT_PER_PAGE = 6;

  const jurnalBulan = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const soBulan = useMemo(() => filterByPeriod(so || [], period, "tgl_muat"), [so, period]);

  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);

  const totalPendapatan = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0), [jurnalBulan, coaPendapatan]);
  const totalBeban = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0), [jurnalBulan, coaBeban]);
  const labaRugi = totalPendapatan - totalBeban;
  const totalPiutang = useMemo(() => piutang.reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);

  const soOngoing = useMemo(() => soBulan.filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [soBulan]);
  const soRevenue = useMemo(() => soBulan.reduce((s: number, o: any) => s + Number(o.total_harga_pajak || o.total_harga || 0), 0), [soBulan]);

  const kasAkun = useMemo(() => (coa || []).filter((c: any) =>
    c.kelompok === "Aset" && c.status === "Aktif" && (
      (c.sub_kelompok || "").toLowerCase().includes("kas") ||
      (c.sub_kelompok || "").toLowerCase().includes("bank") ||
      (c.nama || "").toLowerCase().includes("kas") ||
      (c.nama || "").toLowerCase().includes("bank")
    )
  ).sort((a: any, b: any) => a.kode.localeCompare(b.kode)), [coa]);

  const kasMap = useMemo(() => {
    const map: any = {};
    kasAkun.forEach((a: any) => { map[a.kode] = 0; });
    jurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((e: any) => {
        if (map.hasOwnProperty(e.coa_kode)) {
          map[e.coa_kode] += Number(e.debit || 0) - Number(e.kredit || 0);
        }
      });
    });
    return map;
  }, [kasAkun, jurnal]);

  const recentTx = useMemo(() => [...jurnal].slice(0, 8), [jurnal]);
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const jm = jurnal.filter((j: any) => j.tanggal?.startsWith(ym));
      const pen = jm.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0);
      const beb = jm.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0);
      return { label: MONTH_LABELS[d.getMonth()], pendapatan: pen, beban: beb };
    });
  }, [jurnal, coaPendapatan, coaBeban]);

  const piutangHistory = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      // Calculate closing balance for that month
      const jUpTo = jurnal.filter((j: any) => new Date(j.tanggal) <= new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const bal = jUpTo.reduce((s: number, j: any) => {
          return s + (j.jurnal_detail || []).filter((e: any) => e.coa_kode?.startsWith("112")).reduce((a: number, e: any) => a + Number(e.debit) - Number(e.kredit), 0);
      }, 0);
      return Math.round(bal / 1e6);
    });
  }, [jurnal]);

  const soHistory = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = so.filter((s: any) => s.tgl_muat?.startsWith(ym)).length;
      return count;
    });
  }, [so]);

  const maxChart = Math.max(...(chartData || []).map(d => Math.max(d.pendapatan || 0, d.beban || 0)), 1);

  const earlyWarnings = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    (armadaDokumen || []).forEach((d: any) => {
      const exp = new Date(d.tgl_expired);
      const diff = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
      if (diff < 0) list.push({ type: "danger", msg: `Dokumen expired: ${d.no_polisi} - ${d.jenis_dokumen}`, icon: "AlertTriangle", action: () => onNavigate("armada", "dokumen") });
      else if (diff < 30) list.push({ type: "warning", msg: `Dokumen akan habis: ${d.no_polisi} (${d.jenis_dokumen}) dlm ${Math.round(diff)} hari`, icon: "AlertCircle", action: () => onNavigate("armada", "dokumen") });
    });

    const pendingJ = (jurnal || []).filter((j: any) => j.status === "Draft").length;
    if (pendingJ > 0) list.push({ type: "info", msg: `${pendingJ} Jurnal Umum menunggu persetujuan (acc)`, icon: "Info", action: () => onNavigate("keuangan", "persetujuan") });

    const draftSO = (so || []).filter((s: any) => s.is_posted === false).length;
    if (draftSO > 0) list.push({ type: "info", msg: `${draftSO} Sales Order masih berupa Draft`, icon: "FileText", action: () => onNavigate("operasional", "so") });
    return list;
  }, [armadaDokumen, jurnal, so]);

  const recentCargoActivity = useMemo(() => {
    const allLogs: any[] = [];
    (so || []).forEach((s: any) => {
      (s.posisi_log || []).forEach((l: any) => {
        allLogs.push({ ...l, order_id: s.order_id, customer: s.customer });
      });
    });
    return allLogs.sort((a, b) => {
      const ta = new Date(`${a.date} ${a.time}`).getTime();
      const tb = new Date(`${b.date} ${b.time}`).getTime();
      return tb - ta;
    }).slice(0, 10);
  }, [so]);

  // ── Hero / KPI helpers ────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const shipmentAktif = useMemo(() => (so || []).filter((s: any) => !["Completed", "Cancelled"].includes(s.status_muatan)).length, [so]);
  const dalamPerjalanan = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "On Going").length, [so]);
  const menungguApproval = useMemo(() =>
    (jurnal || []).filter((j: any) => j.status === "Draft").length +
    (so || []).filter((s: any) => s.is_posted === false).length
  , [jurnal, so]);
  const loadingTerlambat = useMemo(() => (so || []).filter((s: any) => s.status_muatan === "Loading" && s.tgl_muat && s.tgl_muat < todayStr).length, [so, todayStr]);
  const selesaiBulanIni = useMemo(() => soBulan.filter((s: any) => s.status_muatan === "Completed").length, [soBulan]);
  const kendalaOperasional = useMemo(() =>
    (so || []).filter((s: any) => s.status_muatan === "Hold").length +
    earlyWarnings.filter((w) => w.type === "danger").length
  , [so, earlyWarnings]);

  // ── Shipment Terbaru table ────────────────────────────────────────
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

  // ── Dispatcher Hari Ini ───────────────────────────────────────────
  const dispatcherItems = [
    { label: "Shipment Hari Ini", value: (so || []).filter((s: any) => s.tgl_muat === todayStr).length, icon: "Calendar" },
    { label: "Armada Aktif", value: (armada || []).filter((a: any) => a.status === "Aktif").length, icon: "Truck" },
    { label: "Sopir Tersedia", value: (sopir || []).filter((d: any) => d.status === "Aktif").length, icon: "Users" },
    { label: "Dalam Perjalanan", value: dalamPerjalanan, icon: "Navigation" },
  ];

  return (
    <PageShell>
      {/* SECTION 1 — Hero + Greeting */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
          <div className="lg:col-span-3">
            <h1 className="text-xl font-black text-text-main tracking-tight leading-tight">
              {getGreeting()}, {currentUser?.nama || ""}! 👋
            </h1>
            <p className="text-[12px] font-bold text-text-light mt-1 opacity-70">Berikut ringkasan operasional hari ini</p>
            {activeCompany?.nama && (
              <span className="company-badge mt-2">{activeCompany.nama}</span>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <div className="text-lg font-black text-text-main tabular-nums leading-none">{shipmentAktif}</div>
                <div className="text-[10px] font-bold text-text-light mt-1 opacity-70">Shipment Aktif</div>
              </div>
              <div>
                <div className="text-lg font-black text-text-main tabular-nums leading-none">{menungguApproval}</div>
                <div className="text-[10px] font-bold text-text-light mt-1 opacity-70">Menunggu Approval</div>
              </div>
              <div>
                <div className="text-lg font-black text-red-brand tabular-nums leading-none">{loadingTerlambat}</div>
                <div className="text-[10px] font-bold text-text-light mt-1 opacity-70">Loading Terlambat</div>
              </div>
              <div>
                <div className="text-lg font-black text-green-brand tabular-nums leading-none">{selesaiBulanIni}</div>
                <div className="text-[10px] font-bold text-text-light mt-1 opacity-70">Selesai Bulan Ini</div>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate("operasional", "so")}
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Icon name="Plus" size={14} /> Buat SO Baru
            </button>
          </div>

          <div className="hero-image-placeholder lg:col-span-2 h-[180px] rounded-2xl" />
        </div>
      </Card>

      <div className="-mt-2 mb-4 flex justify-end">
        <PeriodFilter period={period} setPeriod={setPeriod} hideSearch />
      </div>

      {/* SECTION 2 — KPI Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Shipment Aktif"
          value={shipmentAktif}
          icon="Package"
          color="var(--color-accent)"
          sub="Belum selesai"
        />
        <StatCard
          label="Dalam Perjalanan"
          value={dalamPerjalanan}
          icon="Navigation"
          color="var(--color-blue-brand)"
          sub="Status On Going"
        />
        <StatCard
          label="Menunggu Approval"
          value={menungguApproval}
          icon="Clock"
          color="var(--color-yellow-brand)"
          sub="Jurnal & SO Draft"
        />
        <StatCard
          label="Kendala Operasional"
          value={kendalaOperasional}
          icon="AlertTriangle"
          color="var(--color-red-brand)"
          sub="Hold & dokumen expired"
        />
      </KPIGrid>

      {/* SECTION 3 — Layout 2 kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-6">
        {/* Kiri — Shipment Terbaru */}
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-main/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Icon name="Package" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Shipment Terbaru</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">{shipmentFiltered.length} order</p>
              </div>
            </div>
            <select
              className="input-field h-9 text-[11px] font-bold w-full sm:w-44"
              value={shipmentFilter}
              onChange={(e) => { setShipmentFilter(e.target.value); setShipmentPage(1); }}
            >
              {["Semua", "Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Tgl Muat</th>
                  <th>Status</th>
                  <th className="text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {shipmentPaged.length === 0 ? (
                  <EmptyState colSpan={5} />
                ) : (
                  shipmentPaged.map((s: any) => (
                    <tr key={s.id} className="group transition-colors">
                      <td>
                        <button
                          onClick={() => onSOClick && onSOClick(s.order_id)}
                          className="text-[11px] font-black text-blue-brand hover:underline uppercase tracking-tight"
                        >
                          {s.order_id}
                        </button>
                      </td>
                      <td className="text-[11px] font-bold text-text-main truncate max-w-[160px]">{s.customer}</td>
                      <td className="text-[11px] font-bold text-text-med tabular-nums whitespace-nowrap">{s.tgl_muat}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[s.status_muatan] || "bg-slate-100 text-text-med"}`}>
                          {s.status_muatan}
                        </span>
                      </td>
                      <td className="text-right text-[12px] font-black text-text-main tracking-tight whitespace-nowrap">
                        {fmtShort(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {shipmentTotalPages > 1 && (
            <div className="p-3 border-t border-border-main/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-light">Halaman {shipmentPage} / {shipmentTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={shipmentPage <= 1}
                  onClick={() => setShipmentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-border-main text-[10px] font-bold disabled:opacity-30 hover:bg-slate-50 transition-all"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={shipmentPage >= shipmentTotalPages}
                  onClick={() => setShipmentPage(p => Math.min(shipmentTotalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-border-main text-[10px] font-bold disabled:opacity-30 hover:bg-slate-50 transition-all"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Kanan — Panel 280px */}
        <div className="flex flex-col gap-4">
          {/* Dispatcher Hari Ini */}
          <Card>
            <h3 className="text-[12px] font-black tracking-tight mb-3">Dispatcher Hari Ini</h3>
            <div className="grid grid-cols-2 gap-3">
              {dispatcherItems.map((d) => (
                <div key={d.label} className="p-2.5 rounded-xl bg-slate-50/70 border border-border-main/40">
                  <Icon name={d.icon} size={14} className="text-accent mb-1.5" />
                  <div className="text-[14px] font-black text-text-main tabular-nums leading-none">{d.value}</div>
                  <div className="text-[9px] font-bold text-text-light mt-1 opacity-70">{d.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Aktivitas Terbaru */}
          <Card>
            <h3 className="text-[12px] font-black tracking-tight mb-3">Aktivitas Terbaru</h3>
            <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
              {recentCargoActivity.length === 0 ? (
                <div className="p-6 text-center text-[10px] font-bold text-text-light italic">Kosong</div>
              ) : (
                recentCargoActivity.slice(0, 6).map((l: any, i: number) => (
                  <div key={i} className="relative pl-4 pb-3 border-l border-slate-100 last:border-0 last:pb-0">
                    <div className="absolute -left-[3.5px] top-0 w-1.5 h-1.5 rounded-full bg-accent" />
                    <button
                      className="text-[10px] font-bold text-accent hover:underline italic"
                      onClick={() => onSOClick?.(l.order_id)}
                    >
                      {l.order_id || "Draft"}
                    </button>
                    <div className="text-[10px] font-medium text-text-med truncate">{l.location || "Transito"}</div>
                    <div className="text-[9px] font-bold text-text-light opacity-60">{l.date} • {l.time}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Alert */}
          <Card>
            <h3 className="text-[12px] font-black tracking-tight mb-3">Alert</h3>
            <div className="flex flex-col gap-2">
              {earlyWarnings.length === 0 ? (
                <div className="p-6 text-center text-[10px] font-bold text-text-light italic">Tidak ada alert</div>
              ) : (
                earlyWarnings.slice(0, 5).map((w, i) => (
                  <div
                    key={i}
                    onClick={w.action}
                    className={`p-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                      w.type === "danger"
                        ? "bg-red-brand-light text-red-brand"
                        : w.type === "warning"
                          ? "bg-yellow-brand-light text-yellow-brand"
                          : "bg-blue-brand-light text-blue-brand"
                    }`}
                  >
                    <Icon name={w.icon || "Info"} size={13} className="shrink-0" />
                    <span className="text-[10px] font-bold leading-tight">{w.msg}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Ringkasan Keuangan (kalkulasi existing dipertahankan) */}
      <KPIGrid cols={4}>
        <StatCard
          label={`Omzet ${period.mode === "day" ? "Hari Ini" : period.mode === "month" ? "Bulan Ini" : period.mode === "year" ? "Tahun Ini" : "Total"}`}
          value={fmtShort(totalPendapatan)}
          color="var(--color-green-brand)"
          icon="TrendingUp"
          sub={totalPendapatan >= 0 ? "Surplus Keuangan" : "Defisit"}
          sparkData={chartData.map(d => Math.round(d.pendapatan / 1e6))}
        />
        <StatCard
          label="Laba Bersih"
          value={fmtShort(Math.abs(labaRugi))}
          color={labaRugi >= 0 ? "var(--color-blue-brand)" : "var(--color-red-brand)"}
          icon="Wallet"
          sub={labaRugi >= 0 ? "Margin Positif" : "Defisit Operasional"}
          sparkData={chartData.map(d => Math.round((d.pendapatan - d.beban) / 1e6))}
        />
        <StatCard
          label="Piutang Beredar"
          value={fmtShort(totalPiutang)}
          color="var(--color-red-brand)"
          icon="CreditCard"
          sub={`${piutang.filter((p: any) => Number(p.sisa_piutang) > 0 && p.status !== "Lunas").length} Invoice Terbuka`}
          sparkData={piutangHistory}
        />
        <StatCard
          label="Trip Operasional"
          value={soBulan.length}
          icon="Package"
          color="var(--color-accent)"
          sub={`${soOngoing} Unit Aktif`}
          sparkData={soHistory}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-brand/10 text-green-brand flex items-center justify-center">
                <Icon name="Activity" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Analisis Arus Kas</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Revenue vs Expense (6 Bulan)</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-sm bg-green-brand" />
                 <span className="text-[10px] font-bold text-text-light">Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-sm bg-red-brand" />
                 <span className="text-[10px] font-bold text-text-light">Beban</span>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-5 h-[180px] mb-6 pt-4 group">
            {(chartData || []).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full flex gap-1 items-end h-[150px] relative">
                  <div
                    className="flex-1 bg-green-brand rounded-t-lg transition-all duration-700 ease-out hover:opacity-100 group-hover:opacity-60 relative group/bar"
                    style={{ height: `${(d.pendapatan / maxChart) * 100}%`, minHeight: d.pendapatan > 0 ? 4 : 0 }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {fmtShort(d.pendapatan)}
                    </div>
                  </div>
                  <div
                    className="flex-1 bg-red-brand/80 rounded-t-lg transition-all duration-700 ease-out hover:opacity-100 group-hover:opacity-40 relative group/bar-red"
                    style={{ height: `${(d.beban / maxChart) * 100}%`, minHeight: d.beban > 0 ? 4 : 0 }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover/bar-red:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {fmtShort(d.beban)}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-text-light">{d.label}</div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border-main flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light opacity-60 italic">
               <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
               Realtime Update
            </div>
            <button
              onClick={() => onNavigate && onNavigate("laporan")}
              className="px-4 py-2 rounded-lg border border-border-main text-text-main text-[11px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              Laporan Lengkap <Icon name="ArrowRight" size={12} />
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-9 h-9 rounded-xl bg-blue-brand/10 text-blue-brand flex items-center justify-center">
               <Icon name="Landmark" size={18} />
             </div>
             <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Saldo Account</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Utama & Tabungan</p>
             </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-1 pb-2 mb-1 border-b border-border-main">
              <div className="col-span-6 text-[10px] font-bold text-text-light opacity-60 italic">Akun</div>
              <div className="col-span-6 text-[10px] font-bold text-text-light opacity-60 text-right italic">Saldo</div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {kasAkun.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-bold text-text-light opacity-30 italic">Kosong</div>
              ) : (
                kasAkun.map((a: any) => {
                  const saldoBulan = (jurnalBulan || []).reduce((s: number, j: any) => {
                    return s + (j.jurnal_detail || []).filter((e: any) => e.coa_kode === a.kode).reduce((x: number, e: any) => x + Number(e.debit || 0) - Number(e.kredit || 0), 0);
                  }, 0);
                  const saldoTotal = kasMap[a.kode] || 0;
                  return (
                    <div key={a.kode} className="grid grid-cols-12 gap-4 px-1.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="col-span-6 flex flex-col">
                        <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand truncate tracking-tight">{a.nama}</div>
                        <div className="text-[10px] font-bold text-text-light tracking-tighter opacity-70 italic">{a.kode}</div>
                      </div>
                      <div className="col-span-6 text-right">
                        <div className="text-[13px] font-black text-text-main tabular-nums leading-none">{fmtShort(saldoTotal)}</div>
                        <div className={`text-[9px] font-bold leading-none mt-1 ${saldoBulan >= 0 ? "text-green-brand":"text-red-brand"}`}>
                           {saldoBulan >= 0 ? "+" : ""}{fmtShort(saldoBulan)} MoM
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border-main/50 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
               <Icon name="ClipboardList" size={18} />
             </div>
             <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Posting Jurnal</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Transaksi Terkini</p>
             </div>
           </div>
           <button onClick={() => onNavigate("keuangan", "jurnal")} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all">Detail</button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th>Tgl</th>
                <th>Nomor</th>
                <th>Ket</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/20">
              {(recentTx || []).length === 0 ? (
                <EmptyState colSpan={4} />
              ) : (
                recentTx.map((j: any) => (
                  <tr key={j.id} className="group transition-colors">
                    <td className="text-[11px] font-bold text-text-med tabular-nums whitespace-nowrap">{j.tanggal}</td>
                    <td>
                      <button
                       onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)}
                       className="text-[11px] font-black text-blue-brand hover:underline uppercase tracking-tight"
                      >
                        {j.no_jurnal}
                      </button>
                    </td>
                    <td className="wrap max-w-[200px]">
                      <div className="text-[12px] font-bold text-text-main line-clamp-1 opacity-90 group-hover:text-blue-brand transition-colors" title={j.keterangan}>{j.keterangan}</div>
                    </td>
                    <td className="text-right">
                      <span className={`text-[12px] font-black tracking-tight ${
                        (j.jurnal_detail || []).some((e: any) => String(e.coa_kode).startsWith("4")) ? "text-green-brand" : "text-text-main"
                      }`}>
                        {fmtShort(Number(j.total_debit))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
};
