-- ============================================================
-- SJM Flow 5.0 — Database Schema
-- Sumber: docs/SJM_FLOW_5_BLUEPRINT_FULL.md (section 3)
-- CATATAN: file ini adalah dokumentasi. Tidak dieksekusi otomatis.
-- ============================================================

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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
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

-- ============================================================
-- INDEXES
-- ============================================================
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
