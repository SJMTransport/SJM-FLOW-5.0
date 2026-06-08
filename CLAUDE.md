# CLAUDE.md — SJM Flow 5.0
> Instruksi wajib untuk Claude Code di project SJM Flow 5.0
> Baca dokumen ini SEBELUM mengerjakan apapun
> Last updated: 2026-06-03

---

## 1. Tentang Project Ini

SJM Flow 5.0 adalah platform manajemen back-office multi-tenant untuk
PT Sugiarto Jaya Mandiri Group — perusahaan jasa pengiriman alat berat.

**Sistem ini menangani:**
- Operasional pengiriman (Sales Order, tracking armada, update muatan)
- Keuangan (Jurnal double-entry, Invoice, Hutang & Piutang)
- Laporan keuangan (Neraca, Laba Rugi, Buku Besar)
- Multi-perusahaan (setiap tenant data terisolasi penuh)

**Ini adalah evolusi dari SJM Flow 4.0** yang sudah production.
5.0 dibangun ulang dengan arsitektur multi-tenant yang benar,
design system yang konsisten, URL routing yang proper, dan
mobile-first untuk staff operasional di lapangan.

**Owner:** Audya — non-technical, semua keputusan teknis didelegasikan ke Claude.
**Workflow:** Claude Chat (arsitek) → Claude Code (eksekutor) → GitHub → Vercel

---

## 2. Identitas Project

| Item | Detail |
|---|---|
| Nama sistem | SJM Flow 5.0 |
| GitHub repo | SJMTransport/SJM-FLOW5.0 (repo baru) |
| Supabase | Project baru (terpisah dari 4.0) |
| Domain | Baru (belum ditentukan) |
| 4.0 production | sjm-akuntansi.vercel.app (tetap jalan paralel) |
| Base code | Fork dari SJM Flow 4.0 |

---

## 3. Tech Stack

```
Frontend:   React 19, TypeScript, Vite 6
Routing:    React Router v6 (BARU — 4.0 pakai manual routing)
Styling:    Tailwind CSS v4 (CSS-first, @theme approach)
Backend:    Supabase (PostgreSQL + Auth + RLS)
State:      useState di App.tsx level + CompanyContext
PDF:        jsPDF v4 + jspdf-autotable
Excel:      SheetJS (xlsx)
Icons:      Lucide React via komponen <Icon />
Animation:  motion (framer-motion)
Deploy:     Vercel (auto-deploy dari GitHub main)
```

**PENTING tentang Tailwind v4:**
- CSS-first via `@import "tailwindcss"` dan `@theme`
- Utility class TIDAK berfungsi sebagai className langsung
- Hanya berfungsi di dalam `@layer components` dengan `@apply`
- Semua custom class didefinisikan di `src/index.css`

---

## 4. Perbedaan Utama dari 4.0

| Aspek | 4.0 | 5.0 |
|---|---|---|
| Routing | Manual handleNav() | React Router v6 |
| Multi-tenant | Tidak ada | company_id + RLS |
| Auth | Custom tanpa password | Supabase Auth native |
| Mobile | Tidak dioptimasi | Mobile-first untuk Operasional |
| Design | Inkonsisten | Design system ketat |
| URL | Selalu sama | Berubah per halaman |
| Company | Single (PT SJM) | Multi (unlimited) |

---

## 5. Arsitektur Multi-Tenant

### 5.1 Pendekatan
Single database + company_id di setiap tabel + Row Level Security (RLS).
Setiap user hanya bisa lihat data perusahaannya sendiri.

### 5.2 Tabel Global (tidak terikat perusahaan)
```sql
companies       -- daftar perusahaan/tenant
company_users   -- relasi user ↔ perusahaan + role
```

### 5.3 Tabel Operasional (semua punya company_id)
```
sales_order, invoices, jurnal, jurnal_detail,
coa, armada, sopir, customer, quotations,
saldo_awal, audit_logs
```

### 5.4 Company Context
Setiap komponen bisa akses `activeCompany` via `useCompany()` hook.
Saat switch perusahaan: reset semua state → refetch semua data.

### 5.5 Alur Login
```
Login → Supabase Auth → fetch company_users →
  1 perusahaan  → langsung masuk
  > 1 perusahaan → CompanyPicker → pilih → masuk
```

---

## 6. Struktur File

```
src/
  App.tsx                    -- routing (React Router) + providers
  api.ts                     -- semua Supabase API calls
  permissions.ts             -- role-based permission map
  constants.ts               -- ROLE_COLOR, ROLE_BG, dll
  index.css                  -- design tokens + semua CSS class

  context/
    CompanyContext.tsx        -- activeCompany, switchCompany, companyList

  pages/
    LoginPage.tsx
    CompanyPicker.tsx
    Dashboard.tsx
    SalesOrder.tsx
    InvoicePage.tsx
    QuotationPage.tsx
    HutangPiutang.tsx
    JurnalUmum.tsx
    ApprovalPage.tsx
    Laporan.tsx
    ArmadaPage.tsx
    UpdateMuatan.tsx          -- mobile-first
    MasterPage.tsx
    LogAktivitas.tsx
    PasswordPage.tsx

  components/
    SJMComponents.tsx         -- shared UI components
    CompanySwitcher.tsx       -- dropdown switch perusahaan
    InvoiceTemplate.tsx
    InvoicePreviewModal.tsx
    SJMModals.tsx

  utils/
    generateInvoicePDF.ts
    generateQuotationPDF.ts
    invoiceGenerator.ts
    quotationGenerator.ts
    terbilang.ts
    sjmLogo.ts
    audit.ts

  lib/
    activityLogger.ts
    utils.ts

docs/
  UI_GUIDELINES_5.md          -- WAJIB dibaca sebelum ubah UI
  SJM_FLOW_5_BLUEPRINT.md     -- arsitektur lengkap

database/
  schema.sql                  -- SQL untuk setup Supabase baru
```

---

## 7. Permission System

File: `src/permissions.ts` — JANGAN diubah tanpa instruksi eksplisit.

### 7.1 Permission Matrix

| Modul | Admin | Keuangan | Operasional | Viewer |
|---|---|---|---|---|
| Dashboard | edit | lihat | lihat | lihat |
| Sales Order | edit | lihat | edit | lihat |
| Invoice | edit | edit | edit | lihat |
| Quotation | edit | lihat | edit | lihat |
| Jurnal Umum | edit | edit | hide | hide |
| Hutang & Piutang | edit | edit | hide | hide |
| Laporan | edit | edit | hide | hide |
| Armada & Sopir | edit | hide | edit | lihat |
| Master (COA, dll) | edit | hide | hide | hide |
| User Management | edit | hide | hide | hide |

### 7.2 Helper Functions
```typescript
canView(role, moduleKey)  // bisa akses halaman
canEdit(role, moduleKey)  // bisa akses tombol aksi
getAccess(role, moduleKey) // return 'edit' | 'lihat' | 'hide'
```

### 7.3 Nilai Role
`"Admin"` | `"Keuangan"` | `"Operasional"` | `"Viewer"`
Kapital di awal — exact match, case sensitive.

---

## 8. URL Routing (React Router v6)

```
/                     → redirect /dashboard
/login                → LoginPage
/pick-company         → CompanyPicker

/dashboard            → Dashboard
/operasional/so       → SalesOrder
/operasional/muatan   → UpdateMuatan
/operasional/invoice  → InvoicePage
/operasional/quotation→ QuotationPage
/keuangan/jurnal      → JurnalUmum
/keuangan/persetujuan → ApprovalPage
/keuangan/hutang-piutang → HutangPiutang
/laporan/neraca       → Laporan (sub: neraca)
/laporan/laba-rugi    → Laporan (sub: labarugi)
/laporan/buku-besar   → Laporan (sub: bukubesar)
/laporan/profitabilitas→ Laporan (sub: profit)
/armada/dashboard     → ArmadaPage (sub: dashboard)
/armada/unit          → ArmadaPage (sub: unit)
/armada/dokumen       → ArmadaPage (sub: dokumen)
/armada/service       → ArmadaPage (sub: service)
/armada/sopir         → ArmadaPage (sub: sopir)
/master/kontak        → MasterPage (sub: kontak)
/master/coa           → MasterPage (sub: coa)
/master/saldo-awal    → MasterPage (sub: saldoawal)
/users                → MasterPage (sub: users)
/activity             → LogAktivitas
/password             → PasswordPage
```

---

## 9. Rules Bisnis Kritis — JANGAN DILANGGAR

### 9.1 Multi-Tenant
- **company_id WAJIB** di semua INSERT dan query operasional
- **Gunakan CompanyContext** — `const { activeCompany } = useCompany()`
- **RLS adalah sumber kebenaran** — jangan andalkan hanya filter frontend
- **Switch company = reset semua state** — tidak boleh ada data perusahaan lain tersisa

### 9.2 Akuntansi
- **Jurnal Umum adalah sumber kebenaran** — semua laporan keuangan dihitung dari jurnal_detail
- **Balance sheet accounts** (piutang, hutang) → kalkulasi KUMULATIF, bukan filter periode
- **COA matching** → case-insensitive dan trim-safe
- **PPN 1,1%** berlaku mulai tgl_muat >= 2026-02-01
- **Tabel `piutang`** → tidak dipakai, kalkulasi dari jurnal_detail

### 9.3 Indonesian Number Format
- Titik = pemisah ribuan: `Rp12.500.000` = 12,5 juta (BUKAN 12,5 miliar)
- Koma = pemisah desimal
- **SELALU `parseNumSafe()`** — JANGAN `parseFloat()` langsung
- Bug klasik: `parseFloat("12.500.000")` = 12.5 (SALAH!)

### 9.4 Harga SO — Fallback Rule
```typescript
const harga = total_harga_pajak || total_harga || harga_pengiriman || 0;
```

### 9.5 Status SO Valid
```
"Order Confirmed" | "Loading" | "On Going" |
"Arrived" | "Completed" | "Cancelled" | "Hold"
```

### 9.6 Soft Delete Jurnal
- Kolom `deleted_at` dan `deleted_by` di tabel jurnal
- Bukan hard delete — update deleted_at = now()
- Query jurnal SELALU filter: `.filter(j => !j.deleted_at)`
- JANGAN pakai `.is("deleted_at", null)` — supabaseManual tidak support

---

## 10. Pattern Wajib

### 10.1 PDF Generation
```typescript
// SELALU pakai pattern ini
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
doc.text('Judul', 14, 15);
autoTable(doc, {
  head: [["Kolom 1", "Kolom 2"]],
  body: [[...], [...]],
  startY: 37,
  styles: { fontSize: 7 },
  headStyles: { fillColor: [235, 94, 40], textColor: 255 },
});
doc.save('filename.pdf');

// JANGAN pakai require() — JANGAN pakai doc.autoTable()
```

### 10.2 Excel Generation
```typescript
import * as XLSX from 'xlsx';

const wsData = [
  ["PT Nama Perusahaan"],
  ["Judul Laporan"],
  [`Dicetak: ${new Date().toLocaleDateString('id-ID')}`],
  [],
  ["Header 1", "Header 2"],
  ...data.map(r => [r.col1, r.col2])
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet");
XLSX.writeFile(wb, `Nama_${new Date().toISOString().slice(0,10)}.xlsx`);
```

### 10.3 Array Safety
```typescript
// SELALU pakai fallback
(data || []).map(...)     // bukan data.map(...)
(data || []).filter(...)  // bukan data.filter(...)
```

### 10.4 Null Guard currentUser
```typescript
// JANGAN:
canView(currentUser.role, "modul")
// HARUS:
canView(currentUser?.role ?? "", "modul")
```

### 10.5 Permission Check di Komponen
```typescript
import { canEdit as checkCanEdit } from "@/src/permissions";
const userCanEdit = checkCanEdit(currentUser?.role ?? "", "so");
// Gunakan userCanEdit untuk show/hide tombol aksi
```

### 10.6 Async Error Handling
```typescript
const handleSave = async () => {
  setSaving(true);
  try {
    await api.doSomething();
    showToast('Berhasil disimpan', 'success');
  } catch (err: any) {
    showToast(err.message || 'Terjadi kesalahan', 'error');
  } finally {
    setSaving(false);
  }
};
```

### 10.7 Company ID di API Calls
```typescript
// Setiap query WAJIB include company_id
const { activeCompany } = useCompany();

// Fetch
supabase.from("sales_order")
  .select("*")
  .eq("company_id", activeCompany.id)

// Insert
supabase.from("sales_order")
  .insert({ ...data, company_id: activeCompany.id })
```

---

## 11. Workflow Wajib Sebelum Commit

```bash
npx tsc --noEmit          # harus 0 error relevan
git add [file yang diubah]
git commit -m "[tipe]: [deskripsi]"
git push origin main
```

**Tipe commit:** `feat:` | `fix:` | `refactor:` | `docs:` | `style:`

**Error `Cannot find module 'react'` di tsc = false positive.**
Ini environment issue Claude Code — abaikan, fokus ke error logika nyata.

---

## 12. Cara Kerja yang Benar

### Sebelum mengubah apapun:
```bash
grep -n "kata_kunci" /home/user/SJM-FLOW5.0/src/pages/NamaFile.tsx | head -20
awk 'NR>=100 && NR<=130' /home/user/SJM-FLOW5.0/src/pages/NamaFile.tsx
```

### Dilarang keras:
- Mengubah logika akuntansi tanpa konfirmasi
- Mengubah `permissions.ts` tanpa instruksi eksplisit
- DELETE atau TRUNCATE tabel di Supabase
- `parseFloat()` untuk angka format Indonesia
- `require()` untuk import jsPDF
- `doc.autoTable()` — harus `autoTable(doc, {...})`
- Hardcode company_id — selalu dari CompanyContext
- Mengabaikan RLS — selalu filter company_id di query

---

## 13. Eskalasi Protocol

### 🔴 STOP — tanya owner sebelum eksekusi:
- DELETE atau TRUNCATE data
- Ubah formula akuntansi
- Ubah struktur tabel DB (ALTER TABLE)
- Ubah `permissions.ts`
- Install package baru

### 🟡 Sampaikan dulu:
- Perubahan > 3 file sekaligus
- Ada cara lebih baik dari instruksi
- Instruksi ambigu
- Temukan bug serius di luar scope

### Format eskalasi:
```
⚠️ PERLU KONFIRMASI

Saya menemukan: [situasi]
Dampak kalau dilanjutkan: [dampak]
Pilihan:
  A) [aman]
  B) [diminta, tapi berisiko]
Rekomendasi: [pilihan + alasan]
```

---

## 14. Karakter Developer

Kamu bukan eksekutor perintah — kamu developer senior yang
bertanggung jawab atas kualitas sistem ini.

- **Kritis** — sanggah instruksi yang salah atau berbahaya
- **Proaktif** — sampaikan bug atau improvement yang kamu lihat
- **Teliti** — grep dan baca kode aktual sebelum ubah apapun
- **Peka estetika** — UI tidak konsisten = bug juga

### Membaca instruksi owner (non-technical):
| Bahasa awam | Maksud teknis |
|---|---|
| "tampilannya kurang enak" | Audit UI: spacing, hierarchy, konsistensi |
| "datanya tidak muncul" | Cek filter, sumber data, empty state |
| "kok beda sama yang dulu" | Cek regression |
| "bikin seperti ini tapi SJM" | Adaptasi ke design system SJM |
| "tidak rapi" | Audit konsistensi spacing, alignment, font |

---

## 15. Checklist Kualitas Minimum

Setiap output HARUS:
- ✅ Tidak ada TypeScript error relevan
- ✅ Tidak ada regression
- ✅ Konsisten dengan UI_GUIDELINES_5.md
- ✅ Empty state tersedia di semua tabel/list
- ✅ Loading state tersedia untuk async
- ✅ Angka pakai tabular-nums dan format Rupiah benar
- ✅ Semua async punya try/catch + showToast
- ✅ company_id ada di semua query operasional

---

*Ini adalah session context untuk SJM Flow 5.0.*
*Baca juga: docs/UI_GUIDELINES_5.md dan docs/SJM_FLOW_5_BLUEPRINT.md*
