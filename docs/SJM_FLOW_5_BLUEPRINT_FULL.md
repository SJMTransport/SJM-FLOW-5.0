# SJM Flow 5.0 — Blueprint Arsitektur Lengkap
> Dokumen referensi untuk development SJM Flow 5.0
> Baca dokumen ini sebelum memulai setiap phase pengerjaan
> Last updated: 2026-06-03 | Status: v1.0 Final

---

## 1. Latar Belakang

### 1.1 Tentang PT SJM

PT Sugiarto Jaya Mandiri Transport adalah perusahaan jasa pengiriman
alat berat yang beroperasi di seluruh Indonesia. Bisnis utamanya adalah
mengangkut alat berat (excavator, wheel loader, bulldozer, mixer, dll)
dari gudang dealer/supplier ke lokasi pelanggan menggunakan armada
selfloader, towing, dan lowbed.

**Volume operasional:** ~360 SO per tahun, ratusan invoice, ribuan
entri jurnal. Sistem dipakai daily oleh 5 staff aktif.

### 1.2 Mengapa 5.0 Dibangun

SJM Flow 4.0 adalah sistem single-tenant yang sudah production.
Masalah utamanya:
- Tidak bisa dipakai oleh anak perusahaan lain (single-tenant)
- Routing manual — URL tidak berubah, tidak bisa bookmark
- Design tidak konsisten — ukuran font, spacing, border acak-acakan
- Tidak mobile-friendly — staff operasional di lapangan kesulitan
- Auth tidak aman — dulu tanpa password (sudah difix di 4.0)

5.0 menyelesaikan semua masalah ini dari awal dengan fondasi yang benar.

### 1.3 Prinsip Pengembangan

- **Fork dari 4.0** — ambil semua yang sudah benar (formula akuntansi,
  permission system, komponen UI, PDF/Excel pattern)
- **Tidak reinvent** — konsistensi dengan pola yang sudah bekerja
- **Fondasi dulu** — multi-tenant, auth, routing benar sebelum fitur baru
- **Mobile-first untuk Operasional** — staff lapangan adalah user terbesar

---

## 2. Keputusan Arsitektur

| Item | Keputusan | Alasan |
|---|---|---|
| Multi-tenant | Single DB + company_id + RLS | Paling praktis, skalabel, aman |
| Auth | Supabase Auth native | Proper hashing, session real |
| Routing | React Router v6 | URL proper, bisa bookmark, back button |
| Supabase | Project baru | Isolasi dari 4.0, clean slate |
| GitHub | Repo baru SJM-FLOW5.0 | Tidak kontaminasi 4.0 |
| Base code | Fork dari 4.0 | Formula akuntansi sudah battle-tested |
| 4.0 setelah go-live | Paralel beberapa bulan | Safety net, tidak langsung dimatikan |
| Migrasi data | Hanya PT SJM | Tenant lain mulai dari 0 |
| COA | Per perusahaan | Setiap bisnis punya struktur akun berbeda |
| Password | Supabase Auth (hashed) | Bukan plaintext seperti 4.0 |

---

## 3. Database Schema Lengkap

### 3.1 Tabel Global

```sql
-- ============================================================
-- COMPANIES — Daftar tenant/perusahaan
-- ============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        TEXT UNIQUE NOT NULL,
  nama        TEXT NOT NULL,
  logo_url    TEXT,
  alamat      TEXT,
  npwp        TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANY_USERS — Relasi user ↔ perusahaan + role
-- ============================================================
CREATE TABLE company_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN (
                'Admin','Keuangan','Operasional','Viewer'
              )),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);
```

### 3.2 Tabel Operasional

```sql
-- ============================================================
-- COA — Chart of Accounts (per perusahaan)
-- ============================================================
CREATE TABLE coa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  kode          TEXT NOT NULL,
  nama          TEXT NOT NULL,
  kelompok      TEXT,           -- Aset, Liabilitas, Ekuitas, Pendapatan, Beban
  sub_kelompok  TEXT,           -- Kas & Bank, Piutang, dll
  status        TEXT DEFAULT 'Aktif',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, kode)
);

-- ============================================================
-- SALES ORDER
-- ============================================================
CREATE TABLE sales_order (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  order_id              TEXT NOT NULL,             -- SJM.ID-0001.26
  no_invoice            TEXT,
  kode_invoice          TEXT,
  laporan_keuangan      TEXT,                      -- LP01.26, dll
  tgl_order             DATE,
  tgl_muat              DATE,
  jam_muat              TEXT,
  lokasi_muat           TEXT,
  sharelok_muat         TEXT,
  lokasi_bongkar        TEXT,
  sharelok_bongkar      TEXT,
  customer              TEXT,
  pic_cust              TEXT,
  no_pic                TEXT,
  nama_sopir            TEXT,
  nama_vendor           TEXT,
  jenis_truk            TEXT,                      -- Selfloader, Towing, Lowbed
  no_polisi             TEXT,
  no_supir              TEXT,
  armada                TEXT,                      -- Nama mitra armada
  unit_muatan           TEXT,
  base_harga            NUMERIC,
  harga_asuransi        NUMERIC,
  pajak                 NUMERIC,
  nilai_pajak           NUMERIC,
  harga_pengiriman      NUMERIC,                   -- Harga jual netto
  total_harga           NUMERIC,                   -- Total dengan asuransi
  total_harga_pajak     NUMERIC,                   -- Total dengan pajak
  no_asuransi           TEXT,
  nilai_tanggungan      NUMERIC,
  nilai_asuransi        NUMERIC,
  nilai_tanpa_asuransi  NUMERIC,
  muatan                TEXT,                      -- Nama/deskripsi alat berat
  sn                    TEXT,                      -- Serial number alat
  spk                   TEXT,
  keterangan            TEXT,
  status_muatan         TEXT DEFAULT 'Order Confirmed'
                        CHECK (status_muatan IN (
                          'Order Confirmed','Loading','On Going',
                          'Arrived','Completed','Cancelled','Hold'
                        )),
  tgl_bongkar           DATE,
  update_ke_customer    BOOLEAN DEFAULT FALSE,
  is_posted             BOOLEAN DEFAULT FALSE,
  invoice_count         INTEGER DEFAULT 0,
  posisi_log            JSONB DEFAULT '[]',        -- Array log posisi
  modal_legs            JSONB DEFAULT '[]',
  dokumen               JSONB,
  foto_muat             TEXT,
  foto_bongkar          TEXT,
  bukti_muatan          TEXT,
  surat_jalan           TEXT,
  dokumen_asuransi      TEXT,
  tonase                NUMERIC,
  harga_per_ton         NUMERIC,
  share_token           TEXT UNIQUE,               -- Untuk customer portal (5.2)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, order_id)
);

-- ============================================================
-- JURNAL — Header jurnal umum
-- ============================================================
CREATE TABLE jurnal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  no_jurnal     TEXT NOT NULL,                     -- JU/20260101/001
  tanggal       DATE,
  no_bukti      TEXT,
  keterangan    TEXT,
  no_so         TEXT,
  total_debit   NUMERIC,
  total_kredit  NUMERIC,
  status        TEXT DEFAULT 'Draft'
                CHECK (status IN ('Draft','Posted')),
  created_by    TEXT,
  deleted_at    TIMESTAMPTZ DEFAULT NULL,          -- Soft delete
  deleted_by    TEXT DEFAULT NULL,
  so_values     JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique: nomor jurnal unik hanya untuk yang belum dihapus
CREATE UNIQUE INDEX jurnal_no_jurnal_active_key
  ON jurnal (company_id, no_jurnal)
  WHERE deleted_at IS NULL;

-- ============================================================
-- JURNAL DETAIL — Baris debit/kredit
-- ============================================================
CREATE TABLE jurnal_detail (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  jurnal_id   UUID REFERENCES jurnal(id) ON DELETE CASCADE NOT NULL,
  coa_kode    TEXT NOT NULL,
  keterangan  TEXT,
  debit       NUMERIC DEFAULT 0,
  kredit      NUMERIC DEFAULT 0,
  no_so       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  no_invoice            TEXT NOT NULL,
  tgl_invoice           DATE,
  customer              TEXT,
  so_order_ids          TEXT[],                    -- Array order_id SO
  total_sebelum_pajak   NUMERIC,
  ppn                   NUMERIC,
  total_setelah_pajak   NUMERIC,
  total_terbayar        NUMERIC DEFAULT 0,
  status_bayar          TEXT DEFAULT 'Belum Bayar'
                        CHECK (status_bayar IN (
                          'Belum Bayar','Parsial','Lunas'
                        )),
  status_dokumen        TEXT,
  tgl_kirim             DATE,
  keterangan            TEXT,
  tipe                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, no_invoice)
);

-- ============================================================
-- ARMADA
-- ============================================================
CREATE TABLE armada (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  no_polisi   TEXT NOT NULL,
  jenis_truk  TEXT,
  merk        TEXT,
  tahun       TEXT,
  status      TEXT DEFAULT 'Aktif',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE armada_dokumen (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  armada_id     UUID REFERENCES armada(id) ON DELETE CASCADE,
  jenis_dokumen TEXT,
  no_dokumen    TEXT,
  tgl_terbit    DATE,
  tgl_expired   DATE,
  file_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE armada_service (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  armada_id   UUID REFERENCES armada(id) ON DELETE CASCADE,
  tgl_service DATE,
  jenis       TEXT,
  biaya       NUMERIC,
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOPIR
-- ============================================================
CREATE TABLE sopir (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  nama        TEXT NOT NULL,
  no_hp       TEXT,
  no_sim      TEXT,
  tgl_lahir   DATE,
  alamat      TEXT,
  status      TEXT DEFAULT 'Aktif',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMER
-- ============================================================
CREATE TABLE customer (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  kode        TEXT,
  nama        TEXT NOT NULL,
  alamat      TEXT,
  no_hp       TEXT,
  email       TEXT,
  pic         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  no_quotation    TEXT NOT NULL,
  tgl_quotation   DATE,
  customer        TEXT,
  pic             TEXT,
  no_tlp          TEXT,
  lokasi_muat     TEXT,
  lokasi_tujuan   TEXT,
  harga           NUMERIC,
  status          TEXT DEFAULT 'Draft',
  keterangan      TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALDO AWAL
-- ============================================================
CREATE TABLE saldo_awal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  coa_kode    TEXT NOT NULL,
  saldo       NUMERIC DEFAULT 0,
  tahun       INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, coa_kode)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  user_name   TEXT,
  user_email  TEXT,
  action      TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMER CONTACTS — Placeholder untuk Customer Portal (5.2)
-- ============================================================
CREATE TABLE customer_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  nama        TEXT NOT NULL,
  email       TEXT,
  no_hp       TEXT,
  customer    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Row Level Security

```sql
-- Enable RLS di semua tabel operasional
ALTER TABLE sales_order     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_detail    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coa              ENABLE ROW LEVEL SECURITY;
ALTER TABLE armada           ENABLE ROW LEVEL SECURITY;
ALTER TABLE armada_dokumen   ENABLE ROW LEVEL SECURITY;
ALTER TABLE armada_service   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sopir            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldo_awal       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Policy template (apply ke semua tabel operasional)
-- User hanya bisa akses data perusahaannya sendiri
CREATE POLICY "company_isolation" ON sales_order
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
-- Repeat untuk semua tabel operasional
```

### 3.4 Indexes

```sql
-- Sales Order
CREATE INDEX idx_so_company    ON sales_order(company_id);
CREATE INDEX idx_so_status     ON sales_order(status_muatan);
CREATE INDEX idx_so_no_invoice ON sales_order(no_invoice);
CREATE INDEX idx_so_tgl_muat   ON sales_order(tgl_muat);

-- Jurnal
CREATE INDEX idx_jurnal_company  ON jurnal(company_id);
CREATE INDEX idx_jurnal_tanggal  ON jurnal(tanggal);
CREATE INDEX idx_jurnal_deleted  ON jurnal(deleted_at);

-- Jurnal Detail
CREATE INDEX idx_jd_company   ON jurnal_detail(company_id);
CREATE INDEX idx_jd_jurnal_id ON jurnal_detail(jurnal_id);
CREATE INDEX idx_jd_coa_kode  ON jurnal_detail(coa_kode);

-- Invoices
CREATE INDEX idx_inv_company     ON invoices(company_id);
CREATE INDEX idx_inv_status_bayar ON invoices(status_bayar);
CREATE INDEX idx_inv_customer    ON invoices(customer);
CREATE INDEX idx_inv_so_ids      ON invoices USING gin(so_order_ids);

-- Audit Logs
CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

---

## 4. Arsitektur Aplikasi

### 4.1 CompanyContext

```typescript
// src/context/CompanyContext.tsx

interface Company {
  id: string;
  kode: string;
  nama: string;
  logo_url?: string;
}

interface CompanyContextType {
  activeCompany: Company | null;
  companyList: Company[];
  switchCompany: (companyId: string) => Promise<void>;
  isLoading: boolean;
}

// Hook
export function useCompany(): CompanyContextType
```

**Behavior:**
- Saat login: fetch semua perusahaan user dari company_users
- Kalau 1 perusahaan: auto-set activeCompany
- Kalau > 1: navigate ke /pick-company
- Switch company: set activeCompany → reset semua state data → refetch
- Persist activeCompany ke localStorage (remember last company)

### 4.2 API Pattern

```typescript
// src/api.ts
// Semua fungsi menerima companyId sebagai parameter

export const api = {
  getSO: async (companyId: string) => {
    return supabase
      .from("sales_order")
      .select("*")
      .eq("company_id", companyId)
      .filter("deleted_at", "is", null) // kalau ada
      .order("created_at", { ascending: false });
  },

  addSO: async (data: any, companyId: string) => {
    return supabase
      .from("sales_order")
      .insert({ ...data, company_id: companyId });
  },
  // dst...
}
```

### 4.3 State Management di App.tsx

```typescript
// State global yang di-pass ke semua page
const [so, setSo] = useState<any[]>([]);
const [jurnal, setJurnal] = useState<any[]>([]);
const [invoices, setInvoices] = useState<any[]>([]);
const [coa, setCoa] = useState<any[]>([]);
const [armada, setArmada] = useState<any[]>([]);
const [sopir, setSopir] = useState<any[]>([]);
const [customer, setCustomer] = useState<any[]>([]);
const [saldoAwal, setSaldoAwal] = useState<any[]>([]);
const [users, setUsers] = useState<any[]>([]);
const [auditLogs, setAuditLogs] = useState<any[]>([]);

// Reset semua state saat switch company
const resetAllState = () => {
  setSo([]); setJurnal([]); setInvoices([]);
  setCoa([]); setArmada([]); setSopir([]);
  setCustomer([]); setSaldoAwal([]); setUsers([]);
  setAuditLogs([]);
};
```

### 4.4 Auth Flow (Supabase Auth Native)

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${username}@sjm.internal`,
  password: password
});

// Logout
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Fetch company profile
const { data: profile } = await supabase
  .from("company_users")
  .select("*, companies(*)")
  .eq("user_id", user.id)
  .eq("is_active", true);
```

---

## 5. Migrasi Data dari 4.0 ke 5.0

### 5.1 Scope Migrasi
- **PT SJM**: semua data dimigrate
- **Tenant lain**: mulai dari 0

### 5.2 Langkah Migrasi

```sql
-- Step 1: Buat entry PT SJM
INSERT INTO companies (kode, nama, alamat, npwp)
VALUES ('PT_SJM', 'PT Sugiarto Jaya Mandiri Transport',
        '[alamat]', '[npwp]');

-- Step 2: Buat users di Supabase Auth baru
-- (manual via Supabase dashboard atau script)
-- Email format: nama@sjm.internal
-- Password: minta staff set sendiri via reset password

-- Step 3: Buat company_users
INSERT INTO company_users (company_id, user_id, nama, role)
VALUES
  ([sjm_id], [audya_uid], 'Audya', 'Admin'),
  ([sjm_id], [naufal_uid], 'Naufal', 'Admin'),
  ([sjm_id], [rafi_uid], 'Rafi', 'Operasional'),
  ([sjm_id], [indah_uid], 'Indah', 'Keuangan'),
  ([sjm_id], [umar_uid], 'Umar', 'Operasional');

-- Step 4: Migrate COA
INSERT INTO coa (company_id, kode, nama, kelompok, sub_kelompok, status)
SELECT [sjm_id], kode, nama, kelompok, sub_kelompok, status
FROM [4.0_database].coa;

-- Step 5: Migrate Sales Order
INSERT INTO sales_order (company_id, order_id, no_invoice, ...)
SELECT [sjm_id], order_id, no_invoice, ...
FROM [4.0_database].sales_order;

-- Step 6: Migrate Jurnal + Detail
INSERT INTO jurnal (company_id, no_jurnal, tanggal, ...)
SELECT [sjm_id], no_jurnal, tanggal, ...
FROM [4.0_database].jurnal
WHERE deleted_at IS NULL;

INSERT INTO jurnal_detail (company_id, jurnal_id, coa_kode, ...)
SELECT [sjm_id], jd.jurnal_id, jd.coa_kode, ...
FROM [4.0_database].jurnal_detail jd;

-- Step 7: Migrate Invoices, Armada, Sopir, Customer, dll
-- (pattern sama seperti di atas)

-- Step 8: Generate share_token untuk semua SO
UPDATE sales_order
SET share_token = gen_random_uuid()::text
WHERE share_token IS NULL;
```

### 5.3 Verifikasi Setelah Migrasi

```sql
-- Bandingkan jumlah row
SELECT
  (SELECT COUNT(*) FROM [4.0].sales_order) as so_lama,
  (SELECT COUNT(*) FROM sales_order WHERE company_id = [sjm_id]) as so_baru;

-- Bandingkan total jurnal
SELECT
  SUM(total_debit) as total_debit_baru
FROM jurnal
WHERE company_id = [sjm_id] AND deleted_at IS NULL;

-- Cek balance jurnal
SELECT no_jurnal,
  SUM(debit) - SUM(kredit) as selisih
FROM jurnal_detail
WHERE company_id = [sjm_id]
GROUP BY no_jurnal
HAVING ABS(SUM(debit) - SUM(kredit)) > 1;
-- Harus return 0 rows
```

---

## 6. Dashboard per Role

### 6.1 Admin — "Executive Overview"

```
[Notif Banner: jurnal pending, SO draft, alert]

[KPI Row 1: Omzet | Laba Bersih | Piutang Beredar | Kas & Bank]
[KPI Row 2: Total SO | Completed | Belum Invoice | Trip Aktif]

[Chart Arus Kas 6 bulan] [Aging Piutang: 0-30|30-60|60-90|>90]

[Posting Jurnal Terbaru]  [SO Belum Invoice]

[Logistik Ops Terkini]    [Top Customer by Revenue]
```

### 6.2 Keuangan — "Finance Overview"

```
[Notif Banner: jurnal pending, piutang jatuh tempo]

[KPI: Omzet | Laba Bersih | Piutang Beredar | Kas & Bank]

[Chart Arus Kas]          [Aging Piutang Detail]

[Posting Jurnal Terbaru — lebih panjang]

[Invoice Outstanding per Customer]
```

### 6.3 Operasional — "Ops Overview"

```
[Notif Banner: SO draft, armada dokumen expired]

[KPI: Total Trip | On Going | Completed | Armada Aktif]

[Logistik Ops — lebih besar, lebih detail]

[SO yang butuh action]    [Armada Status Summary]
```

---

## 7. Mobile Design — Update Muatan

### 7.1 Screen 1: List SO Aktif
```
TopBar: "Update Muatan" + jumlah trip aktif
Tabs: On Going | Loading | Semua
Alert: SO yang belum diupdate > 6 jam
List: Card per SO — id, customer, rute, status
Bottom Nav: Dashboard | Muatan | SO | Lainnya
```

### 7.2 Screen 2: Form Update
```
TopBar: Back + no SO + rute + status pill
Card SO: info ringkas (customer, rute, sopir)
Status selector: grid 2x2 visual (tap to select)
Lokasi: input + tombol GPS otomatis
Foto: grid 3 kolom (upload/kamera)
Catatan: textarea opsional
Bottom Action: [WA] [Kirim Update]
```

### 7.3 posisi_log Format
```json
{
  "timestamp": "2026-06-03T09:42:00Z",
  "lokasi": "Rest Area KM 207 Tol Palimanan",
  "status": "On Going",
  "catatan": "Kondisi normal, mesin baik",
  "foto_urls": ["https://..."],
  "updated_by": "rafi@sjm.internal",
  "source": "admin"
}
```

---

## 8. Roadmap Visi

### 5.0 — Fondasi (sekarang, ~7 minggu)
Multi-tenant, auth proper, URL routing, mobile-first operasional,
design system konsisten. Ini harus selesai dan stabil dulu.

### 5.1 — Sopir App (~2 bulan setelah 5.0)
PWA Android — buka dari browser, tidak perlu install.
Input kode trip → update status → foto → submit.
Data masuk ke posisi_log di SO.

### 5.2 — Customer Portal (~1 bulan setelah 5.1)
Link unik per SO via share_token, dibagikan via WA.
Customer lihat status, posisi, history, invoice.
Tidak perlu login, tidak perlu install.

### 5.3 — Smart Flow (jangka panjang)
Quotation approve → SO otomatis → Completed → Invoice otomatis.

### 5.4 — Business Intelligence (jangka panjang)
Profitabilitas per rute/armada/customer, prediksi durasi,
alert keterlambatan otomatis.

---

## 9. Timeline Pengerjaan

| Phase | Durasi | Deliverable |
|---|---|---|
| Phase 0 — Setup | 1 minggu | Repo, Supabase, schema, RLS, env vars |
| Phase 1 — Auth & Company | 1 minggu | Login, CompanyPicker, CompanyContext |
| Phase 2 — Core Pages | 2 minggu | Semua page dari 4.0 + company_id |
| Phase 3 — New Features | 1 minggu | Company Mgmt, Dashboard per role |
| Phase 4 — Mobile | 1 minggu | Update Muatan mobile-first |
| Phase 5 — Migration | 1 minggu | Migrate PT SJM, testing, bug fix |
| Phase 6 — Go Live | 3 hari | Deploy, DNS, parallel run |
| **Total** | **~7 minggu** | MVP production-ready |

---

## 10. Urutan Pengerjaan Phase 0

```
1. Init repo baru dari fork 4.0
2. Buat Supabase project baru
3. Jalankan database/schema.sql
4. Setup RLS policies
5. Ganti hardcoded credentials → environment variables
6. Update package.json (name, version)
7. Install React Router v6
8. Update CLAUDE.md dan docs/
9. Commit awal
```

---

## 11. Environment Variables

```env
VITE_SUPABASE_URL=https://[project-baru].supabase.co
VITE_SUPABASE_KEY=[anon-key-baru]
VITE_APP_VERSION=5.0.0
VITE_APP_NAME=SJM Flow
```

Tidak ada credentials hardcode di kode. Selalu via `import.meta.env`.

---

## 12. Hal yang Dipertahankan Penuh dari 4.0

- ✅ Seluruh formula kalkulasi akuntansi (Laporan.tsx, HutangPiutang.tsx)
- ✅ Permission system (permissions.ts) — sudah benar
- ✅ Design tokens (index.css) — diupdate untuk 5.0
- ✅ Komponen shared (SJMComponents.tsx)
- ✅ PDF generation pattern (generateInvoicePDF.ts)
- ✅ Excel generation pattern (SheetJS)
- ✅ Indonesian number format (parseNumSafe)
- ✅ Rekapitulasi Piutang (HutangPiutang.tsx)
- ✅ Soft delete jurnal (deleted_at + deleted_by)
- ✅ Semua bug fix yang tercatat

## 13. Hal yang Dibuang / Diganti dari 4.0

- ❌ Routing manual handleNav() → React Router v6
- ❌ Custom auth tanpa password → Supabase Auth native
- ❌ Hardcoded Supabase URL/KEY → env vars
- ❌ Tabel `piutang` (tidak dipakai) → hapus
- ❌ Tabel audit log duplikat → satu tabel audit_logs
- ❌ `@google/genai` dependency → hapus
- ❌ `exceljs` dependency (duplikat xlsx) → hapus
- 🔄 Dashboard → redesign per role
- 🔄 Update Muatan → redesign mobile-first
- 🔄 `user_profiles` → `company_users` + Supabase Auth

---

*Dokumen ini adalah source of truth untuk development SJM Flow 5.0.*
*Update setiap kali ada keputusan arsitektur baru.*
