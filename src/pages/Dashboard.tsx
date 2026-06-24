import React, { useState, useMemo } from "react";
import { filterByPeriod } from "@/src/utils";
import { useCompany } from "@/src/context/CompanyContext";
import { useNavigate } from "react-router-dom";
import {
  Truck, ClockCountdown, WarningCircle, ChartLineUp, Receipt, ClipboardText,
  CalendarBlank, NavigationArrow, CaretRight, CaretDown, Package, Van,
  UserCircle, Warning, Info, MapPin, ArrowDown,
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
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  if (days > 0) return `${days} Hari${hours > 0 ? ` ${hours} Jam` : ""}`;
  if (hours > 0) return `${hours} Jam`;
  return `${totalMinutes} Mnt`;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "On Going":       { bg: "#EBF5FF", color: "#2563EB" },
  "Loading":        { bg: "#FFFBEB", color: "#D97706" },
  "Arrived":        { bg: "#EEF2FF", color: "#4F46E5" },
  "Completed":      { bg: "#F0FDF4", color: "#16A34A" },
  "Cancelled":      { bg: "#FEF2F2", color: "#DC2626" },
  "Order Confirmed":{ bg: "#F9FAFB", color: "#6B7280" },
  "Hold":           { bg: "#FEF2F2", color: "#DC2626" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const sc = STATUS_COLORS[status] || { bg: "#F9FAFB", color: "#6B7280" };
  return (
    <span style={{
      padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
      background: sc.bg, color: sc.color, border: `1px solid ${sc.color}20`
    }}>{status}</span>
  );
};

export const Dashboard = ({ so, currentUser, armada = [], sopir = [], navigate: nav }: any) => {
  const navigate = useNavigate();
  const [shipmentFilter, setShipmentFilter] = useState("Semua Status");
  const [shipmentPage, setShipmentPage]     = useState(1);
  const SHIPMENT_PER_PAGE = 8;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Stats Logic
  const soAktif = useMemo(() => (so || []).filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [so]);
  const revenueBulanIni = useMemo(() => (so || []).reduce((sum: number, s: any) => sum + Number(s.total_harga || 0), 0), [so]);
  const shipmentFiltered = useMemo(() => (shipmentFilter === "Semua Status" ? (so || []) : (so || []).filter((s: any) => s.status_muatan === shipmentFilter)), [so, shipmentFilter]);
  const shipmentPaged = shipmentFiltered.slice((shipmentPage - 1) * SHIPMENT_PER_PAGE, shipmentPage * SHIPMENT_PER_PAGE);

  return (
    <div style={{ 
      display: "flex", 
      height: "calc(100vh - 64px)", // Fit to screen minus header
      background: "#F9FAFB", 
      overflow: "hidden" 
    }}>
      
      {/* LEFT: MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>Selamat Siang, Audya 👋</h1>
            <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Ringkasan operasional hari ini</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "8px 16px", borderRadius: "8px", border: "1px solid #E5E7EB", cursor: "pointer" }}>
            <CalendarBlank size={18} weight="bold" />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>1 Jun 2026 - 30 Jun 2026</span>
            <CaretDown size={14} />
          </div>
        </div>

        {/* KPI OPERASIONAL */}
        <div style={sectionSection}>
          <div style={sectionTitle}>RINGKASAN OPERASIONAL</div>
          <div style={kpiGrid}>
            <KPICard icon={<Truck weight="fill" />} color="#2563EB" bg="#EFF6FF" label="SO Aktif" value={soAktif} />
            <KPICard icon={<ClockCountdown weight="fill" />} color="#D97706" bg="#FFFBEB" label="Menunggu Konfirmasi" value="3" />
            <KPICard icon={<WarningCircle weight="fill" />} color="#DC2626" bg="#FEF2F2" label="Tidak Update >12 Jam" value="7" />
          </div>
        </div>

        {/* KPI KEUANGAN */}
        <div style={sectionSection}>
          <div style={sectionTitle}>RINGKASAN KEUANGAN</div>
          <div style={kpiGrid}>
            <KPICard icon={<ChartLineUp weight="fill" />} color="#16A34A" bg="#F0FDF4" label="Revenue Bulan Ini" value={`Rp ${fmt(304522799)}`} isLarge />
            <KPICard icon={<Receipt weight="fill" />} color="#DC2626" bg="#FEF2F2" label="Invoice Belum Lunas" value="372" />
            <KPICard icon={<ClipboardText weight="fill" />} color="#D97706" bg="#FFFBEB" label="SO Belum Diinvoice" value="366" />
          </div>
        </div>

        {/* TABLE SECTION */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", marginTop: "24px" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>SHIPMENT AKTIF</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <select style={selectStyle} onChange={(e) => setShipmentFilter(e.target.value)}>
                <option>Semua Status</option>
                <option>On Going</option>
                <option>Completed</option>
              </select>
              <button style={filterBtn}><WarningCircle size={16} /> Filter</button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#F9FAFB" }}>
              <tr style={thRow}>
                <th style={thStyle}>ORDER</th>
                <th style={thStyle}>TGL MUAT ↕</th>
                <th style={thStyle}>CUSTOMER</th>
                <th style={thStyle}>RUTE</th>
                <th style={thStyle}>SOPIR & ARMADA</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>DURASI</th>
                <th style={{...thStyle, textAlign: "right"}}>NILAI</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {shipmentPaged.map((s: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ ...tdStyle, color: "#EB5E28", fontWeight: 700 }}>{s.order_id}</td>
                  <td style={tdStyle}>{fmtTglMuat(s.tgl_muat)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{s.customer}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "12px", color: "#111827" }}>{s.lokasi_muat}</span>
                      <div style={{ height: "12px", borderLeft: "1px dashed #D1D5DB", marginLeft: "4px" }}></div>
                      <span style={{ fontSize: "12px", color: "#111827" }}>{s.lokasi_bongkar}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{s.nama_sopir}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{s.no_polisi} • {s.jenis_truk}</div>
                  </td>
                  <td style={tdStyle}><StatusBadge status={s.status_muatan} /></td>
                  <td style={tdStyle}>{calcDurasi(s)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>Rp {fmt(s.total_harga || 0)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF" }}>⋮</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={paginationArea}>
            <span>Menampilkan 1 - 8 dari 399 data</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button style={pagBtn}>Prev</button>
              <button style={{ ...pagBtn, background: "#EB5E28", color: "white" }}>1</button>
              <button style={pagBtn}>2</button>
              <button style={pagBtn}>3</button>
              <span>...</span>
              <button style={pagBtn}>50</button>
              <button style={pagBtn}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ width: "320px", borderLeft: "1px solid #E5E7EB", background: "white", overflowY: "auto", padding: "24px" }}>
        
        <div style={{ marginBottom: "32px" }}>
          <div style={sectionTitle}>DISPATCHER HARI INI</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <DispatcherItem icon={<Package weight="fill" />} label="Shipment Hari Ini" value="0" color="#EB5E28" bg="#FEF0E8" />
            <DispatcherItem icon={<Van weight="fill" />} label="Armada Aktif" value="0" color="#16A34A" bg="#F0FDF4" />
            <DispatcherItem icon={<UserCircle weight="fill" />} label="Sopir Tersedia" value="0" color="#2563EB" bg="#EFF6FF" />
            <DispatcherItem icon={<NavigationArrow weight="fill" />} label="Dalam Perjalanan" value="7" color="#EB5E28" bg="#FEF0E8" />
          </div>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <div style={sectionTitle}>AKTIVITAS TERBARU</div>
          <div style={{ border: "1px solid #F3F4F6", borderRadius: "12px" }}>
            {[1,2,3,4,5].map((_, i) => (
              <div key={i} style={activityRow}>
                <div style={activityIcon}><ClipboardText size={16} weight="fill" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>SJM.ID-0394.26 <span style={{ fontWeight: 400, color: "#6B7280" }}>dibuat</span></div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF" }}>10:45 • On Going</div>
                </div>
              </div>
            ))}
            <div style={viewAllBtn}>Lihat semua aktivitas <CaretRight size={12} /></div>
          </div>
        </div>

        <div>
          <div style={sectionTitle}>ACTION CENTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <ActionItem color="#FEF2F2" border="#DC2626" icon={<Warning weight="fill" color="#DC2626" />} label="Sales Order masih berupa Draft" count="82" />
            <ActionItem color="#FFF7ED" border="#EA580C" icon={<ClipboardText weight="fill" color="#EA580C" />} label="SO belum diinvoice" count="366" />
            <ActionItem color="#FFFBEB" border="#D97706" icon={<ClockCountdown weight="fill" color="#D97706" />} label="Shipment tidak update >12 jam" count="3" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const KPICard = ({ icon, label, value, color, bg, isLarge }: any) => (
  <div style={{ 
    background: "white", border: "1px solid #E5E7EB", padding: "20px", borderRadius: "12px",
    display: "flex", alignItems: "center", gap: "16px", flex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  }}>
    <div style={{ width: "48px", height: "48px", background: bg, color: color, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: isLarge ? "20px" : "28px", fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
    <CaretRight size={16} color="#D1D5DB" />
  </div>
);

const DispatcherItem = ({ icon, label, value, color, bg }: any) => (
  <div style={{ background: "white", border: "1px solid #F3F4F6", padding: "16px", borderRadius: "12px" }}>
    <div style={{ color: color, background: bg, width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <div style={{ fontSize: "20px", fontWeight: 800 }}>{value}</div>
    <div style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.2 }}>{label}</div>
  </div>
);

const ActionItem = ({ color, border, icon, label, count }: any) => (
  <div style={{ background: color, borderLeft: `4px solid ${border}`, padding: "12px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
    <div style={{ background: "white", padding: "8px", borderRadius: "6px" }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "18px", fontWeight: 800 }}>{count}</div>
      <div style={{ fontSize: "11px", color: "#4B5563" }}>{label}</div>
    </div>
    <CaretRight size={14} color="#9CA3AF" />
  </div>
);

// Styles
const sectionSection = { marginBottom: "24px" };
const sectionTitle = { fontSize: "11px", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", marginBottom: "12px" };
const kpiGrid = { display: "flex", gap: "16px" };
const thRow = { borderBottom: "1px solid #E5E7EB" };
const thStyle: React.CSSProperties = { padding: "12px 24px", fontSize: "11px", color: "#6B7280", textAlign: "left", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "16px 24px", fontSize: "13px", color: "#111827", verticalAlign: "middle" };
const selectStyle = { padding: "6px 12px", borderRadius: "6px", border: "1px solid #E5E7EB", fontSize: "13px" };
const filterBtn = { display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "6px", border: "1px solid #E5E7EB", background: "white", fontSize: "13px", fontWeight: 600 };
const paginationArea = { padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#6B7280" };
const pagBtn: React.CSSProperties = { padding: "4px 10px", border: "1px solid #E5E7EB", borderRadius: "4px", background: "white", cursor: "pointer", fontSize: "12px" };
const activityRow = { display: "flex", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F3F4F6" };
const activityIcon = { width: "32px", height: "32px", borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" };
const viewAllBtn = { padding: "10px", textAlign: "center" as const, fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" };
