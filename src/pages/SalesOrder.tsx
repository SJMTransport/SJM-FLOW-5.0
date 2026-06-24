import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter, Icon, EmptyState, useToast, statusBadge, Stepper, ModalShell, FeedbackButton, PageShell, KPIGrid, ActionBar, PageHeader } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api } from "@/src/api";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { buildMeta } from "@/src/lib/activityLogger";
import {
  Package, Truck, ClipboardText, CaretRight, CaretDown, MagnifyingGlass,
  Funnel, Export, DotsThree, CalendarBlank, ArrowRight,
} from "@phosphor-icons/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Bulk Import (preserved) ──
const SO_IMPORT_FIELDS = [
  { key: "order_id", label: "Order ID", required: true },
  { key: "customer", label: "Customer", required: true },
  { key: "tgl_order", label: "Tanggal Order", required: true },
  { key: "tgl_muat", label: "Tanggal Muat", required: true },
  { key: "lokasi_muat", label: "Lokasi Muat", required: true },
  { key: "lokasi_bongkar", label: "Lokasi Bongkar", required: true },
  { key: "nama_sopir", label: "Nama Sopir", required: true },
  { key: "no_polisi", label: "No Polisi", required: true },
  { key: "nama_vendor", label: "Nama Expedisi" },
  { key: "muatan", label: "Muatan" },
  { key: "unit_muatan", label: "Unit Muatan", required: true },
  { key: "total_harga", label: "Total Harga" },
  { key: "total_harga_pajak", label: "Total Harga + Pajak" },
  { key: "base_harga", label: "Base Harga" },
  { key: "status_muatan", label: "Status Muatan" },
  { key: "no_invoice", label: "No Invoice" },
  { key: "sn", label: "SN" },
  { key: "spk", label: "SPK" },
  { key: "keterangan", label: "Keterangan" },
];

const BulkImportSO = ({ onComplete, onCancel, showToast, logAction, currentUser }: any) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          const newMap: any = {};
          SO_IMPORT_FIELDS.forEach(sf => {
            const match = results.meta.fields?.find(cf => {
              if (!cf) return false;
              const normalizedCf = cf.toString().toLowerCase().replace(/[^a-z]/g, "");
              const normalizedSfLabel = sf.label.toLowerCase().replace(/[^a-z]/g, "");
              const normalizedSfKey = sf.key.toLowerCase();
              return normalizedCf === normalizedSfLabel || cf.toString().toLowerCase() === normalizedSfKey;
            });
            if (match) newMap[sf.key] = match;
          });
          setMapping(newMap);
        }
        setStep(2);
      }
    });
  };

  const handleContinuePreview = () => {
    const csvOrderIdKey = mapping["order_id"];
    const validRows = csvData.filter(row => {
      const idVal = row[csvOrderIdKey];
      return idVal && idVal.toString().trim() !== "";
    });
    const mapped = validRows.map(row => {
      const obj: any = {};
      SO_IMPORT_FIELDS.forEach(f => {
        const csvKey = mapping[f.key];
        obj[f.key] = csvKey ? (row[csvKey] || "") : "";
      });
      return obj;
    });
    setPreviewData(mapped);
    setStep(3);
  };

  const handleImport = async () => {
    setUploading(true);
    try {
      for (const row of previewData) {
        await api.addSO(row, currentUser?.company_id || "");
        logAction(`Import SO: ${row.order_id}`, buildMeta({ module: 'so', action_type: 'CREATE', record_id: row.order_id }));
      }
      showToast(`${previewData.length} Sales Order berhasil diimport!`, 'success');
      onComplete();
    } catch (e: any) {
      showToast("Gagal import: " + e.message, "error");
    }
    setUploading(false);
  };

  return (
    <Card>
      {step === 1 && (
        <div className="p-8 text-center">
          <h3 className="text-lg font-black mb-4">Import Sales Order dari CSV</h3>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>Pilih File CSV</button>
          <button className="btn-ghost ml-2" onClick={onCancel}>Batal</button>
        </div>
      )}
      {step === 2 && (
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-black">Peta Kolom CSV ke Field SJM</h3>
          <div className="grid grid-cols-2 gap-3">
            {SO_IMPORT_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-[11px] font-bold w-32">{f.label}{f.required ? " *" : ""}</span>
                <select className="input-field h-8 text-[11px] flex-1" value={mapping[f.key] || ""} onChange={e => setMapping((m: any) => ({ ...m, [f.key]: e.target.value }))}>
                  <option value="">— Pilih —</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setStep(1)}>Kembali</button>
            <button className="btn-primary" onClick={handleContinuePreview}>Preview</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black">Preview {previewData.length} rows</h3>
            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setStep(2)}>Peta Ulang</button>
              <button className="btn-primary" onClick={handleImport} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" size={18} /> : "Eksekusi Import"}
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-[450px] border rounded-xl">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr>{SO_IMPORT_FIELDS.slice(0, 8).map(f => <th key={f.key} className="py-3 px-3 text-[10px] font-bold text-left">{f.label}</th>)}</tr>
              </thead>
              <tbody>
                {previewData.map((d, i) => (
                  <tr key={i} className="border-t">
                    {SO_IMPORT_FIELDS.slice(0, 8).map(f => (
                      <td key={f.key} className={`py-2 px-3 text-[11px] ${d[f.key] ? "" : "text-red-500 italic"}`}>{d[f.key] || "Null"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="text-[11px] text-red-500 hover:underline" onClick={onCancel}>Batalkan Import</button>
        </div>
      )}
    </Card>
  );
};

const genSONo = (allSOs: any[]): string => {
  const yr = new Date().getFullYear().toString().slice(-2);
  const re = /SJM\.ID-(?:\d+\.)*(\d+)\.(\d{2})$/;
  let maxNum = 0;
  (allSOs || []).forEach((s: any) => {
    const m = (s.order_id || "").match(re);
    if (m && m[2] === yr) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `SJM.ID-${String(maxNum + 1).padStart(4, "0")}.${yr}`;
};

const getFriendlyError = (err: any): string => {
  const msg = err?.message || '';
  if (msg.includes('duplicate key') || msg.includes('unique')) return 'Data ini sudah ada. Gunakan nomor/kode yang berbeda.';
  if (msg.includes('foreign key') || msg.includes('violates')) return 'Data tidak dapat disimpan karena terkait dengan data lain.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Koneksi terputus. Periksa internet dan coba lagi.';
  if (msg.includes('timeout')) return 'Server terlalu lama merespons. Coba lagi.';
  if (msg.includes('permission') || msg.includes('not authorized')) return 'Anda tidak memiliki akses untuk melakukan tindakan ini.';
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) return 'Sesi Anda telah berakhir. Silakan login kembali.';
  return 'Terjadi kesalahan. Coba lagi atau hubungi admin.';
};

const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
const fmtTglMuat = (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
const calcDurasi = (s: any): string => {
  const start = s.tgl_muat ? new Date(s.tgl_muat) : null;
  if (!start || isNaN(start.getTime())) return "—";
  const end = s.status_muatan === "Completed" && s.tgl_bongkar ? new Date(s.tgl_bongkar) : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "—";
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hrs = Math.floor((totalMin % 1440) / 60);
  if (days > 0) return `${days} Hari${hrs > 0 ? ` ${hrs} Jam` : ""}`;
  if (hrs > 0) return `${hrs} Jam`;
  return `${totalMin} Mnt`;
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

export const SalesOrderPage = ({ so, setSo, jurnal, customer, connected, currentUser, onSOClick, onArmadaClick, armada, sopir, logAction, pendingEditSO, setPendingEditSO, onGoToHP }: any) => {
  const { confirm: confirmModal, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;
  const [customerFilter, setCustomerFilter] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showExport, setShowExport] = useState(false);

  const exportExcel = () => {
    const wsData = [
      ["Sales Order — SJM Flow 5.0"],
      [`Dicetak: ${new Date().toLocaleDateString("id-ID")}`],
      [],
      ["Order ID", "Tgl Muat", "Customer", "Rute", "Sopir", "No Polisi", "Jenis Truk", "Status", "Durasi", "Nilai"],
      ...filtered.map((s: any) => [
        s.order_id, s.tgl_muat, s.customer,
        `${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`,
        s.nama_sopir, s.no_polisi, s.jenis_truk, s.status_muatan,
        ["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—",
        Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Order");
    XLSX.writeFile(wb, `SalesOrder_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExport(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Sales Order — SJM Flow 5.0", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);
    autoTable(doc, {
      head: [["Order ID", "Tgl Muat", "Customer", "Rute", "Sopir", "Status", "Nilai"]],
      body: filtered.map((s: any) => [
        s.order_id, s.tgl_muat, s.customer,
        `${s.lokasi_muat || ""} → ${s.lokasi_bongkar || ""}`,
        s.nama_sopir, s.status_muatan,
        `Rp${fmtNum(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}`,
      ]),
      startY: 26,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [235, 94, 40], textColor: 255 },
    });
    doc.save(`SalesOrder_${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowExport(false);
  };

  const emptyForm = {
    order_id: "", no_invoice: "", kode_invoice: "", laporan_keuangan: "",
    tgl_order: today(), tgl_muat: today(), tgl_bongkar: "", jam_muat: "08:00",
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    customer: "", pic_cust: "", no_pic: "",
    no_polisi: "", jenis_truk: "", nama_sopir: "", nama_vendor: "", muatan: "", unit_muatan: "", sn: "",
    harga_asuransi: "", pajak: "", nilai_pajak: "", nilai_asuransi: "",
    harga_pengiriman: "", total_harga: 0, total_harga_pajak: 0,
    is_posted: false, bukti_muatan: "", surat_jalan: "", spk: "", keterangan: "",
    no_asuransi: "", nilai_tanggungan: "", dokumen_asuransi: "",
    foto_muat: "", foto_bongkar: "",
    scan_invoice: "", potong_pajak: "", invoice_vendor: "",
    modal_legs: [],
  };
  const [form, setForm] = useState<any>(emptyForm);

  const isPajakApply = (tgl_order: string) => {
    if (!tgl_order) return false;
    const d = new Date(tgl_order);
    if (isNaN(d.getTime())) return false;
    if (d.getFullYear() < 2026) return false;
    if (d.getFullYear() === 2026 && d.getMonth() === 0) return false;
    return true;
  };

  const calcTotal = (f: any) => {
    const ins = parseFloat(f.harga_asuransi) || 0;
    const pengiriman = parseFloat(f.harga_pengiriman) || 0;
    const total = ins + pengiriman;
    const pajakApply = isPajakApply(f.tgl_order);
    const tax = pajakApply ? Math.round((pengiriman + ins) * 0.011) : 0;
    const totalPajak = total + tax;
    return { total_harga: total, total_harga_pajak: totalPajak, nilai_pajak: tax, nilai_asuransi: ins };
  };

  const handleNumChange = (k: string, v: any) => {
    const updated = { ...form, [k]: v };
    const { total_harga, total_harga_pajak, nilai_pajak, nilai_asuransi } = calcTotal(updated);
    setForm({ ...updated, total_harga, total_harga_pajak, nilai_pajak, nilai_asuransi });
  };

  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'order_id' | 'tgl_muat'>('tgl_muat');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: 'order_id' | 'tgl_muat') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleTabChange = (t: string) => { setTab(t); setErr(""); if (t === "list") setSelected([]); };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length && filtered.length > 0) setSelected([]);
    else setSelected(filtered.map((s: any) => s.id));
  };

  const approveBulk = async () => {
    const toPost = selected.filter(id => { const item = so.find((x: any) => x.id === id); return item && !item.is_posted; });
    if (toPost.length === 0) { showToast("Pilih minimal satu SO berstatus DRAFT.", "error"); return; }
    const toPostItems = toPost.map(id => so.find((x: any) => x.id === id)).filter(Boolean);
    const soList = toPostItems.slice(0, 5).map((x: any) => `• ${x.order_id}`).join('\n');
    const extra = toPostItems.length > 5 ? `\n• ... dan ${toPostItems.length - 5} lainnya` : '';
    confirmModal({
      title: "Posting Masal",
      msg: `Posting ${toPost.length} SO:\n\n${soList}${extra}\n\nLanjutkan?`,
      confirmLabel: "Posting", confirmColor: C.blue,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkPostSO(toPost, currentUser?.company_id || "");
          setSo((prev: any[]) => prev.map(s => toPost.includes(s.id) ? { ...s, is_posted: true } : s));
          showToast(`${toPost.length} SO berhasil diposting.`); setSelected([]);
        } catch (e: any) { showToast("Gagal posting: " + e.message, "error"); }
        setProcessing(false);
      }
    });
  };

  const deleteBulk = async () => {
    if (selected.length === 0) return;
    confirmModal({
      title: "Hapus Masal",
      msg: `Hapus ${selected.length} Sales Order terpilih secara PERMANEN?`,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkDeleteSO(selected, currentUser?.company_id || "");
          setSo((prev: any[]) => prev.filter(s => !selected.includes(s.id)));
          showToast(`${selected.length} SO berhasil dihapus.`); setSelected([]);
        } catch (e: any) { showToast("Gagal hapus: " + e.message, "error"); }
        setProcessing(false);
      }
    });
  };

  const resetCustomerCombo = (name = "") => { setCustomerQuery(name); setCustomerOpen(false); };

  const openNew = () => { setForm(emptyForm); setEditItem(null); setErr(""); setTab("form"); resetCustomerCombo(); };

  const openDuplicate = (s: any) => {
    const { id: _id, order_id: _oid, created_at: _ca, is_posted: _ip, ...rest } = s;
    setForm({ ...rest, order_id: "", is_posted: false, tgl_order: today(), tgl_muat: today() });
    setEditItem(null); setErr(""); setTab("form"); resetCustomerCombo(s.customer || "");
    showToast("Data disalin (Order ID dikosongkan)", "info");
  };

  const openEdit = (s: any) => { setEditItem(s); setForm(s); setErr(""); setTab("form"); resetCustomerCombo(s.customer || ""); };

  useEffect(() => {
    if (pendingEditSO && so?.length > 0) {
      const item = so.find((s: any) => s.order_id === pendingEditSO);
      if (item) openEdit(item);
      setPendingEditSO(null);
    }
  }, [pendingEditSO, so]);

  const handleDelete = async (id: string) => {
    confirmModal({
      title: "Hapus Sales Order",
      msg: "Hapus Sales Order ini secara permanen?",
      onConfirm: async () => {
        try {
          const item = so.find((x: any) => x.id === id);
          await api.deleteSO(id, currentUser?.company_id || "");
          setSo((prev: any[]) => prev.filter(x => x.id !== id));
          logAction(`Hapus SO: ${item?.order_id || id}`, buildMeta({
            module: 'so', action_type: 'DELETE', record_id: item?.order_id || id,
            before_data: item ? { order_id: item.order_id, customer: item.customer, tgl_muat: item.tgl_muat, status_muatan: item.status_muatan, total_harga: item.total_harga } : { id },
          }));
        } catch (e: any) { showToast("Gagal hapus: " + e.message, "error"); }
      }
    });
  };

  const doSave = async (posted: boolean) => {
    setSaving(true); setSaveError(false); setSaveSuccess(false);
    try {
      let finalOrderId = form.order_id?.trim() || "";
      if (posted && !finalOrderId) finalOrderId = genSONo(so);
      const payload = { ...form, order_id: finalOrderId, is_posted: posted };
      const afterSnap = { order_id: finalOrderId, customer: payload.customer, tgl_muat: payload.tgl_muat, status_muatan: payload.status_muatan, total_harga: payload.total_harga };
      if (editItem) {
        await api.updateSO(editItem.id, payload, currentUser?.company_id || "");
        setSo((s: any[]) => s.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
        logAction(`Update SO: ${payload.order_id}`, buildMeta({ module: 'so', action_type: 'UPDATE', record_id: payload.order_id, before_data: { order_id: editItem.order_id, customer: editItem.customer, tgl_muat: editItem.tgl_muat, status_muatan: editItem.status_muatan, total_harga: editItem.total_harga }, after_data: afterSnap }));
      } else {
        await api.addSO(payload, currentUser?.company_id || "");
        setReloading(true);
        const updated = await api.getSO(currentUser?.company_id || "");
        setSo(updated);
        logAction(`Buat SO: ${payload.order_id}`, buildMeta({ module: 'so', action_type: 'CREATE', record_id: payload.order_id, after_data: afterSnap }));
      }
      showToast(editItem ? `SO ${finalOrderId} berhasil diperbarui!` : `SO ${finalOrderId} berhasil dibuat!`, 'success');
      setSaveSuccess(true);
      setTimeout(() => { setTab("list"); setEditItem(null); setSaveSuccess(false); }, 1000);
    } catch (e: any) {
      console.error('simpan SO error:', e);
      setErr(getFriendlyError(e)); setSaveError(true);
      setTimeout(() => setSaveError(false), 2000);
    } finally { setSaving(false); setReloading(false); }
  };

  const submit = async (posted = false) => {
    setErr("");
    if (!form.customer) return setErr("Customer wajib diisi");
    if (!form.lokasi_muat) return setErr("Lokasi muat wajib diisi");
    if (!form.lokasi_bongkar) return setErr("Lokasi bongkar wajib diisi");
    const warnings: string[] = [];
    if (!form.no_polisi?.trim()) warnings.push('No. Polisi belum diisi');
    if (!form.jenis_truk?.trim()) warnings.push('Jenis Truk belum dipilih');
    if (!(parseFloat(String(form.harga_pengiriman || 0)) > 0)) warnings.push('Harga Pengiriman = Rp 0');
    if (!form.pic_cust?.trim()) warnings.push('PIC Customer belum diisi');
    if (warnings.length > 0) {
      confirmModal({
        title: "Data Belum Lengkap",
        msg: `Beberapa field belum diisi:\n• ${warnings.join('\n• ')}\n\nTetap simpan?`,
        confirmLabel: "Ya, Simpan",
        onConfirm: async () => { await doSave(posted); }
      });
      return;
    }
    await doSave(posted);
  };

  // ── Filtered & sorted data ──
  const periodBase = useMemo(() => filterByPeriod(so, period, "tgl_muat"), [so, period]);

  const filtered = useMemo(() => {
    return periodBase
      .filter((s: any) => statusFilter === 'all' ? true : s.status_muatan === statusFilter)
      .filter((s: any) => customerFilter === 'Semua' ? true : s.customer === customerFilter)
      .filter((s: any) => {
        if (!dateFrom && !dateTo) return true;
        const d = s.tgl_muat || "";
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      })
      .filter((s: any) =>
        !search ||
        s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.toLowerCase().includes(search.toLowerCase()) ||
        s.lokasi_muat?.toLowerCase().includes(search.toLowerCase()) ||
        s.lokasi_bongkar?.toLowerCase().includes(search.toLowerCase()) ||
        s.nama_sopir?.toLowerCase().includes(search.toLowerCase()) ||
        s.no_polisi?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a: any, b: any) => {
        const aVal = sortKey === 'tgl_muat' ? (a.tgl_muat || '') : (a.order_id || '');
        const bVal = sortKey === 'tgl_muat' ? (b.tgl_muat || '') : (b.order_id || '');
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
  }, [periodBase, statusFilter, customerFilter, search, sortKey, sortDir, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  // ── KPI counts ──
  const kpiTotal = periodBase.length;
  const kpiOnGoing = useMemo(() => periodBase.filter((s: any) => ["On Going", "Loading", "Order Confirmed"].includes(s.status_muatan)).length, [periodBase]);
  const kpiBelumInvoice = useMemo(() => periodBase.filter((s: any) => s.status_muatan === "Completed" && !s.no_invoice).length, [periodBase]);

  // ── Unique customers ──
  const uniqueCustomers = useMemo(() => {
    const names = new Set<string>();
    (so || []).forEach((s: any) => { if (s.customer) names.add(s.customer); });
    return Array.from(names).sort();
  }, [so]);

  // ── Pagination numbers ──
  const pageNums = useMemo(() => {
    const p: (number | "...")[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) p.push(i); }
    else {
      p.push(1);
      if (page > 3) p.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) p.push(i);
      if (page < totalPages - 2) p.push("...");
      p.push(totalPages);
    }
    return p;
  }, [totalPages, page]);

  return (
    <>
      <ConfirmModalUI />
      <ToastUI />

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", padding: "20px 24px", gap: 16, overflow: "hidden", background: "#F5F4F1" }}>

        {/* BREADCRUMB + HEADER */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#EB5E28", marginBottom: 8 }}>Operasional &nbsp;›&nbsp; <span style={{ fontWeight: 600 }}>Sales Order</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>Sales Order</h1>
              <p style={{ fontSize: 13, color: "#52504A", marginTop: 4, marginBottom: 0 }}>Manajemen order pengiriman alat berat</p>
            </div>
            {canEdit && (
              <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px", background: "#EB5E28", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>+</span> SO Baru
              </button>
            )}
          </div>
        </div>

        {/* KPI CARDS — 3 cards */}
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {[
            { icon: <Package size={28} weight="fill" />, iconBg: "#FEF0E8", iconColor: "#EB5E28", value: kpiTotal, label: "Order", title: "TOTAL SO" },
            { icon: <Truck size={28} weight="fill" />, iconBg: "#DBEAFE", iconColor: "#2563EB", value: kpiOnGoing, label: "Order", title: "ON GOING" },
            { icon: <ClipboardText size={28} weight="fill" />, iconBg: "#DCFCE7", iconColor: "#16A34A", value: kpiBelumInvoice, label: "Order", title: "BELUM INVOICE" },
          ].map(k => (
            <div key={k.title} style={{ flex: 1, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 150ms ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB5E28"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(235,94,40,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2DDD6"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 14, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: k.iconColor }}>{k.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9690", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{k.title}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                <div style={{ fontSize: 12, color: "#52504A", marginTop: 2 }}>{k.label}</div>
              </div>
              <CaretRight size={18} color="#9B9690" />
            </div>
          ))}
        </div>

        {/* FILTER BAR */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "10px 16px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#F8F6F3", borderRadius: 8, padding: "0 12px", height: 36 }}>
            <MagnifyingGlass size={16} style={{ color: "#9B9690" }} />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari SO, customer, route, driver, armada..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#1A1A1A" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#9B9690", fontWeight: 500 }}>Status</span>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13, padding: "0 8px", background: "white", cursor: "pointer", minWidth: 110 }}
            >
              <option value="all">Semua</option>
              {["Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#9B9690", fontWeight: 500 }}>Customer</span>
            <select value={customerFilter} onChange={e => { setCustomerFilter(e.target.value); setPage(1); }}
              style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13, padding: "0 8px", background: "white", cursor: "pointer", minWidth: 140, maxWidth: 200 }}
            >
              <option value="Semua">Semua Customer</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CalendarBlank size={14} style={{ color: "#9B9690" }} />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 12, padding: "0 8px", background: "white", cursor: "pointer", color: "#1A1A1A" }}
            />
            <span style={{ fontSize: 11, color: "#9B9690" }}>—</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 12, padding: "0 8px", background: "white", cursor: "pointer", color: "#1A1A1A" }}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                style={{ height: 36, padding: "0 10px", border: "1px solid #E2DDD6", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 11, color: "#EB5E28", fontWeight: 600 }}
              >Reset</button>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowExport(!showExport)} style={{ height: 36, padding: "0 14px", border: "1px solid #E2DDD6", borderRadius: 8, background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#52504A", fontWeight: 500 }}>
              <Export size={14} /> Export <CaretDown size={12} />
            </button>
            {showExport && (
              <div style={{ position: "absolute", top: 40, right: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20, minWidth: 140, overflow: "hidden" }}>
                <button onClick={() => { exportExcel(); setShowExport(false); }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "white", cursor: "pointer", fontSize: 13, color: "#1A1A1A", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8F6F3"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >Export Excel</button>
                <button onClick={() => { exportPDF(); setShowExport(false); }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "white", cursor: "pointer", fontSize: 13, color: "#1A1A1A", textAlign: "left", borderTop: "1px solid #E2DDD6" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8F6F3"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >Export PDF</button>
              </div>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ flex: 1, minHeight: 0, background: "white", border: "1px solid #E2DDD6", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F8F6F3" }}>
                <tr>
                  {[
                    { label: "ORDER ID", align: "left", sortable: "order_id" },
                    { label: "TGL. MUAT", align: "left", sortable: "tgl_muat" },
                    { label: "CUSTOMER", align: "left" },
                    { label: "ROUTE", align: "left" },
                    { label: "UNIT / SOPIR", align: "left" },
                    { label: "STATUS", align: "left" },
                    { label: "DURASI", align: "left" },
                    { label: "NILAI", align: "right" },
                    { label: "AKSI", align: "center" },
                  ].map(h => (
                    <th key={h.label} onClick={h.sortable ? () => toggleSort(h.sortable as any) : undefined}
                      style={{
                        textAlign: h.align as any, padding: "12px 16px", fontSize: 11, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.5px", color: "#9B9690",
                        borderBottom: "1px solid #E2DDD6", whiteSpace: "nowrap",
                        cursor: h.sortable ? "pointer" : "default",
                        background: sortKey === h.sortable ? "#F0EBE4" : undefined,
                      }}
                    >
                      {h.label}{h.sortable && (sortKey === h.sortable ? (sortDir === 'desc' ? " ↓" : " ↑") : " ↕")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "64px 16px", textAlign: "center", fontSize: 13, color: "#9B9690" }}>Tidak ada data Sales Order</td></tr>
                ) : paged.map((s: any) => {
                  const sc = STATUS_COLORS[s.status_muatan] || { bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <tr key={s.id} style={{ cursor: "pointer" }}
                      onClick={(e) => { if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).tagName === "SELECT") return; onSOClick?.(s.order_id); }}
                      onMouseEnter={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = "#FAF8F5"; }}
                      onMouseLeave={e => { for (const td of Array.from(e.currentTarget.children)) (td as HTMLElement).style.background = ""; }}
                    >
                      <td style={tdS}><button onClick={e => { e.stopPropagation(); onSOClick?.(s.order_id); }} style={{ fontSize: 12, fontWeight: 700, color: "#EB5E28", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "monospace" }}>{s.order_id || "(Draft)"}</button></td>
                      <td style={{ ...tdS, fontVariantNumeric: "tabular-nums" }}>{fmtTglMuat(s.tgl_muat)}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{s.customer || "—"}</td>
                      <td style={tdS}>
                        <span style={{ fontSize: 13, color: "#1A1A1A", fontWeight: 600 }}>{s.lokasi_muat || "—"}</span>
                        <span style={{ fontSize: 12, color: "#9B9690", margin: "0 6px" }}>→</span>
                        <span style={{ fontSize: 13, color: "#1A1A1A" }}>{s.lokasi_bongkar || "—"}</span>
                      </td>
                      <td style={tdS}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.nama_sopir || "—"}</div>
                        <div style={{ fontSize: 11, color: "#52504A", marginTop: 2 }}>{s.no_polisi || ""}{s.jenis_truk ? ` · ${s.jenis_truk}` : ""}</div>
                      </td>
                      <td style={tdS}><span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", background: sc.bg, color: sc.color }}>{s.status_muatan}</span></td>
                      <td style={{ ...tdS, fontVariantNumeric: "tabular-nums", color: "#52504A" }}>{["On Going", "Loading", "Completed"].includes(s.status_muatan) ? calcDurasi(s) : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>Rp{fmtNum(Number(s.total_harga_pajak || s.total_harga || s.harga_pengiriman || 0))}</td>
                      <td style={{ ...tdS, textAlign: "center" }}>
                        <button onClick={e => e.stopPropagation()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9B9690" }}>
                          <DotsThree size={20} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #E2DDD6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontSize: 12, color: "#52504A" }}>
            <span>Menampilkan {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1} - {Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} data</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pgBtn(page <= 1)}>‹ Prev</button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={`e${i}`} style={{ padding: "0 4px", color: "#9B9690" }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} style={{ width: 28, height: 28, borderRadius: 6, fontSize: 12, border: `1px solid ${page === p ? "#EB5E28" : "#E2DDD6"}`, background: page === p ? "#EB5E28" : "white", color: page === p ? "white" : "#1A1A1A", fontWeight: page === p ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page >= totalPages)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ FORM MODAL (preserved functionality) ══════ */}
      <ModalShell isOpen={tab === "form"} onClose={() => setTab("list")}>
        <div className="p-4 border-b border-border-main flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EB5E28]/10 text-[#EB5E28] flex items-center justify-center">
              <Icon name="FilePlus2" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A] tracking-tight leading-none">{editItem ? "Update Sales Order" : "Input SO Baru"}</h3>
              <p className="text-[9px] font-bold text-[#52504A] mt-1 italic">Rincian pengiriman armada</p>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100" onClick={() => setTab("list")}>
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          {/* Identitas Order */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9690] px-1"><Icon name="Hash" size={12} className="text-[#EB5E28]" /> Identitas Order</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9B9690] px-1">Order ID</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.order_id || ""} onChange={e => setForm((f: any) => ({ ...f, order_id: e.target.value }))} placeholder={form.is_posted ? "Wajib diisi" : "Auto-Generate"} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-[#9B9690] px-1">Customer <span className="text-[#DC2626]">*</span></label>
                <div className="flex gap-2">
                  {(() => {
                    const allNames: string[] = [...customer.map((c: any) => c.nama as string), ...localCustomers.filter((n: string) => !customer.some((c: any) => c.nama === n))];
                    const q = customerQuery.toLowerCase().trim();
                    const matches = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                    const isNew = customerQuery.trim() && !allNames.some(n => n.toLowerCase() === customerQuery.toLowerCase().trim());
                    const confirmNew = () => { const name = customerQuery.trim(); if (!name) return; setLocalCustomers(prev => prev.includes(name) ? prev : [...prev, name]); setForm((f: any) => ({ ...f, customer: name })); setCustomerOpen(false); };
                    return (
                      <div className="relative flex-1">
                        <input className="input-field h-9 w-full text-[11px] font-bold" placeholder="Cari customer..."
                          value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setForm((f: any) => ({ ...f, customer: e.target.value })); setCustomerOpen(true); }}
                          onFocus={() => setCustomerOpen(true)} onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                          onKeyDown={e => { if (e.key === 'Escape') setCustomerOpen(false); if (e.key === 'Enter') { e.preventDefault(); if (matches.length > 0) { setCustomerQuery(matches[0]); setForm((f: any) => ({ ...f, customer: matches[0] })); setCustomerOpen(false); } else confirmNew(); } }}
                        />
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2DDD6] rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                            {matches.map((name, i) => (<button key={i} type="button" className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-[#F8F6F3]" onMouseDown={e => { e.preventDefault(); setCustomerQuery(name); setForm((f: any) => ({ ...f, customer: name })); setCustomerOpen(false); }}>{name}</button>))}
                            {isNew && (<button type="button" className="w-full text-left px-3 py-2 text-[11px] font-black text-[#EB5E28] hover:bg-[#FEF0E8] flex items-center gap-2 border-t" onMouseDown={e => { e.preventDefault(); confirmNew(); }}>+ Tambah Customer Baru</button>)}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <input type="date" className="input-field h-9 w-36 text-[11px] font-bold" value={form.tgl_order || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_order: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">PIC Customer</label><input className="input-field h-9 text-[11px] font-bold" value={form.pic_cust || ""} onChange={e => setForm((f: any) => ({ ...f, pic_cust: e.target.value }))} placeholder="Nama PIC..." /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">No. Telepon PIC</label><input className="input-field h-9 text-[11px] font-bold" value={form.no_pic || ""} onChange={e => setForm((f: any) => ({ ...f, no_pic: e.target.value }))} placeholder="08xx-xxxx-xxxx" /></div>
            </div>
          </div>

          {/* Logistik & Rute */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9690] px-1"><Icon name="Truck" size={12} className="text-[#EB5E28]" /> Pengiriman & Route</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Jenis Truk <span className="text-[#DC2626]">*</span></label><select className="input-field h-9 text-[11px] font-bold" value={form.jenis_truk || ''} onChange={e => setForm((f: any) => ({ ...f, jenis_truk: e.target.value }))}><option value="">Pilih Jenis Truk</option><option value="Selfloader">Selfloader</option><option value="Selfloader Kecil">Selfloader Kecil</option><option value="Towing">Towing</option><option value="Lowbed">Lowbed</option><option value="Dolly">Dolly</option></select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Nama Sopir</label><input list="sopir-list" className="input-field h-9 text-[11px] font-bold" value={form.nama_sopir || ""} onChange={e => setForm((f: any) => ({ ...f, nama_sopir: e.target.value }))} placeholder="Cari Sopir..." /><datalist id="sopir-list">{sopir.map((s: any) => <option key={s.id} value={s.nama} />)}</datalist></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Ekspedisi Pelaksana</label><input className="input-field h-9 text-[11px] font-bold" value={form.nama_vendor || ""} onChange={e => setForm((f: any) => ({ ...f, nama_vendor: e.target.value }))} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">No. Polisi</label><input list="armada-list" className="input-field h-9 text-[11px] font-bold" value={form.no_polisi || ""} onChange={e => setForm((f: any) => ({ ...f, no_polisi: e.target.value }))} /><datalist id="armada-list">{armada.map((a: any) => <option key={a.id} value={a.no_polisi} />)}</datalist></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Lokasi Muat <span className="text-[#DC2626]">*</span></label><input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_muat || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_muat: e.target.value }))} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Lokasi Tujuan <span className="text-[#DC2626]">*</span></label><input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_bongkar: e.target.value }))} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Tgl Muat <span className="text-[#DC2626]">*</span></label><input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_muat || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_muat: e.target.value }))} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Tgl Bongkar</label><input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_bongkar: e.target.value }))} /></div>
            </div>
          </div>

          {/* Detail Muatan */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9690] px-1"><Icon name="Package" size={12} className="text-[#EB5E28]" /> Detail Muatan</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">Jenis Muatan</label><div className="flex gap-2"><input className="input-field h-9 flex-1 text-[11px] font-bold" value={form.muatan || ""} onChange={e => setForm((f: any) => ({ ...f, muatan: e.target.value }))} placeholder="Jenis" /><input className="input-field h-9 w-20 text-[11px] font-bold" value={form.unit_muatan || ""} onChange={e => setForm((f: any) => ({ ...f, unit_muatan: e.target.value }))} placeholder="Unit" /></div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#9B9690] px-1">SN / Serial Number</label><input className="input-field h-9 text-[11px] font-bold" value={form.sn || ""} onChange={e => setForm((f: any) => ({ ...f, sn: e.target.value }))} /></div>
            </div>
          </div>

          {/* Biaya */}
          <div className="space-y-4 p-5 bg-[#F8F6F3] rounded-xl border border-[#E2DDD6]">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9690] px-1"><Icon name="DollarSign" size={12} className="text-[#EB5E28]" /> Biaya & Keuangan</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#1A1A1A] px-1">Harga Pengiriman</label><CurrencyInput value={form.harga_pengiriman} onChange={(v: any) => handleNumChange("harga_pengiriman", v)} className="h-11 text-[13px] font-black bg-white" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#1A1A1A] px-1">Asuransi</label><CurrencyInput value={form.harga_asuransi} onChange={(v: any) => handleNumChange("harga_asuransi", v)} className="h-11 text-[13px] font-black bg-white" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#1A1A1A] px-1">PPN (1,1%)</label><CurrencyInput value={form.nilai_pajak} readOnly className="h-11 text-[13px] font-black bg-[#F0EBE4]" /></div>
              <div className="md:col-span-3 p-5 bg-[#1A1A1A] rounded-xl flex items-center justify-between mt-2">
                <div><span className="text-[10px] text-white/40 uppercase tracking-widest block">Total Tagihan</span><span className="text-2xl font-black text-[#EB5E28] tabular-nums">{fmt(form.total_harga_pajak || form.total_harga || 0)}</span></div>
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${isPajakApply(form.tgl_order) ? "bg-[#EB5E28] text-white" : "bg-white/10 text-white/40"}`}>{isPajakApply(form.tgl_order) ? "Taxable (1,1%)" : "Non-Taxable"}</span>
              </div>
            </div>
          </div>

          {/* Dokumen */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9690] px-1"><Icon name="Paperclip" size={12} className="text-[#EB5E28]" /> Dokumen Pendukung</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "surat_jalan", label: "Surat Jalan" }, { key: "foto_bongkar", label: "Bongkar / POD" },
                { key: "invoice_vendor", label: "Invoice Vendor" }, { key: "dokumen_asuransi", label: "Asuransi" },
                { key: "potong_pajak", label: "Potong Pajak" }, { key: "scan_invoice", label: "Scan Invoice" },
                { key: "foto_muat", label: "Foto Muat" }, { key: "spk", label: "No. SPK" },
              ].map(d => (
                <div key={d.key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#9B9690] px-1">{d.label}</label>
                  <input className="input-field h-9 text-[11px] font-bold" value={form[d.key] || ""} onChange={e => setForm((f: any) => ({ ...f, [d.key]: e.target.value }))} placeholder="Link GDrive atau filename..." />
                </div>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#9B9690] px-1">Catatan</label>
            <textarea className="input-field h-20 pt-2 text-[11px] resize-none font-bold" value={form.keterangan || ""} onChange={e => setForm((f: any) => ({ ...f, keterangan: e.target.value }))} placeholder="Catatan tambahan (opsional)..." maxLength={500} />
            <div className="text-right text-[10px] text-[#9B9690]">{(form.keterangan || "").length} / 500</div>
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] text-[#DC2626] rounded-xl border border-[#DC2626]/10 font-bold text-[11px]">
              <Icon name="AlertCircle" size={14} /> {err}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E2DDD6] bg-[#F8F6F3] flex gap-3">
          <button className="h-10 px-6 rounded-xl text-[#52504A] font-bold text-[11px] hover:bg-white transition-colors" onClick={() => setTab("list")}>Batal</button>
          <div className="flex-1" />
          <button className="h-10 px-6 rounded-xl border border-[#E2DDD6] bg-white text-[#1A1A1A] font-bold text-[11px] hover:bg-[#F8F6F3] transition-colors" onClick={() => submit(false)} disabled={saving}>Simpan Draft</button>
          <FeedbackButton className="h-10 px-6 rounded-xl bg-[#EB5E28] text-white font-bold text-[11px] flex items-center gap-2" onClick={() => submit(true)} loading={saving} success={saveSuccess} error={saveError}>
            Simpan
          </FeedbackButton>
        </div>
      </ModalShell>
    </>
  );
};

// ── Styles ──
const tdS: React.CSSProperties = { padding: "12px 16px", fontSize: 13, color: "#1A1A1A", borderBottom: "1px solid #F0EBE4" };
const pgBtn = (disabled: boolean): React.CSSProperties => ({ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2DDD6", background: "white", fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, color: "#52504A" });
