# SJM Flow 5.0 — UI/UX Design Guidelines FINAL
> Source of truth untuk semua keputusan desain di SJM Flow 5.0
> Wajib dibaca sebelum membuat atau mengubah komponen apapun
> Konsistensi adalah prioritas utama — jangan sok ide
> Last updated: 2026-06-10

---

## 0. Prinsip Utama

> "Setiap elemen di layar harus punya alasan untuk ada.
> Kalau tidak membantu user menyelesaikan pekerjaannya, hapus."

1. **Konsistensi di atas kreativitas** — gunakan komponen yang sudah ada
2. **Zero ambiguity** — setiap elemen jelas fungsinya tanpa penjelasan
3. **Tidak ada magic number** — semua nilai dari token yang sudah dikunci
4. **Mobile-first untuk Operasional** — Update Muatan didesain HP dulu
5. **Data tidak boleh terpotong** — setiap kolom punya lebar minimum + tooltip

---

## 1. Color System

### 1.1 Token Warna

```css
/* Brand */
--color-primary:        #EB5E28;   /* CTA utama, link aktif, accent */
--color-primary-hover:  #D4531F;   /* Hover state primary */
--color-primary-light:  #FEF0E8;   /* Background primary subtle */
--color-primary-border: #FCDAC8;   /* Border primary subtle */

/* Background */
--color-bg:             #F5F4F1;   /* Background halaman */
--color-surface:        #FFFFFF;   /* Card, modal, input, sidebar */
--color-surface-hover:  #FAF8F5;   /* Row hover, menu hover */
--color-surface-secondary: #FAF8F5; /* Table header, section muted */

/* Text */
--color-text-primary:   #1A1A1A;   /* Konten primer, judul */
--color-text-secondary: #52504A;   /* Konten sekunder, subtitle */
--color-text-tertiary:  #9B9690;   /* Label, caption, placeholder */
--color-text-disabled:  #C0B8B0;   /* Disabled state */

/* Border */
--color-border:         #E2DDD6;   /* Default border semua elemen */
--color-border-strong:  #C0B8B0;   /* Hover border, emphasis */
--color-border-subtle:  #F0EBE4;   /* Row divider, subtle separator */

/* Semantic */
--color-success:        #5C8A3C;
--color-success-light:  #EEF8E8;
--color-success-border: #C3E6A0;
--color-error:          #B85450;
--color-error-light:    #FDEEEE;
--color-error-border:   #F0B8B6;
--color-warning:        #C4914A;
--color-warning-light:  #FDF3E3;
--color-warning-border: #F0D4A8;
--color-info:           #2563EB;
--color-info-light:     #EAF2FF;
--color-info-border:    #BFDBFE;

/* Sidebar */
--color-sidebar-bg:     #FFFFFF;
--color-sidebar-border: #E2DDD6;
--color-sidebar-active-bg: #FEF0E8;
--color-sidebar-active-text: #EB5E28;
--color-sidebar-active-border: #EB5E28;
--color-sidebar-hover:  #FAF8F5;
--color-sidebar-label:  #9B9690;
```

### 1.2 Aturan Warna

- **JANGAN** hardcode hex di komponen — selalu pakai CSS variables
- **JANGAN** pakai Tailwind utility color (`text-red-500`, `bg-green-500`)
- Warna primary hanya untuk **satu tombol utama per halaman**
- Background card selalu `--color-surface` (putih)
- Warna semantik hanya untuk status/badge/feedback — bukan dekorasi

### 1.3 Status Badge Colors

| Status | Background | Text | Border |
|---|---|---|---|
| On Going | `--color-info-light` | `--color-info` | `--color-info-border` |
| Completed | `--color-success-light` | `--color-success` | `--color-success-border` |
| Loading | `--color-warning-light` | `--color-warning` | `--color-warning-border` |
| Cancelled | `--color-error-light` | `--color-error` | `--color-error-border` |
| Order Confirmed | `#F1EFE8` | `#5F5E5A` | `#E2DDD6` |
| Lunas | `--color-success-light` | `--color-success` | `--color-success-border` |
| Belum Bayar | `--color-error-light` | `--color-error` | `--color-error-border` |
| Parsial | `--color-warning-light` | `--color-warning` | `--color-warning-border` |
| Draft | `#F1EFE8` | `#5F5E5A` | `#E2DDD6` |

---

## 2. Typography

### 2.1 Font Family

```css
--font-sans: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 2.2 Typographic Scale

**HANYA 6 ukuran yang boleh dipakai. Tidak ada pengecualian.**

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 22px | 700 | 1.2 | Judul halaman |
| Title | 15px | 600 | 1.3 | Section header, judul card |
| Body | 13px | 400 | 1.5 | Mobile body text |
| Body SM | 12px | 400 | 1.5 | Desktop body, tabel, form |
| Label | 11px | 500 | 1.4 | Sub-info, secondary data |
| Caption | 10px | 600 | 1.3 | Label uppercase, header tabel |
| Micro | 9px | 600 | 1.2 | Badge, timestamp kecil |

### 2.3 Font Weight yang Dipakai

```
400 — regular    → body text biasa
500 — medium     → body emphasis, label
600 — semibold   → section header, nilai penting
700 — bold       → judul halaman, nama customer
800 — extrabold  → angka KPI, nomor referensi
```

### 2.4 Nomor Referensi (SO, Invoice, Jurnal)

```css
font-family: var(--font-mono);
font-size: 12px;
font-weight: 700;
color: var(--color-primary);
font-style: normal;
letter-spacing: -0.2px;
```

### 2.5 Label Uppercase

```css
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.8px;
color: var(--color-text-tertiary);
```

### 2.6 Aturan Typography

- **JANGAN** `text-sm`, `text-xs`, `text-base` — selalu pixel eksplisit
- Angka selalu `font-variant-numeric: tabular-nums`
- Teks panjang di tabel: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Teks yang di-truncate WAJIB punya `title` attribute untuk tooltip

---

## 3. Spacing — 8pt Grid

**Semua spacing kelipatan 4 atau 8. Tidak ada magic number.**

```
4px  → gap icon-to-text, padding badge
8px  → gap antar elemen dalam grup, padding kecil
12px → padding komponen medium
16px → padding card dalam, gap kolom form, cell padding horizontal
20px → padding card utama
24px → gap antar section
28px → —
32px → gap section besar, margin halaman
40px → —
48px → section sangat besar
```

---

## 4. Border & Shadow

### 4.1 Border

```css
/* Ketebalan */
border: 1px solid;          /* Default semua elemen */
border: 2px solid;          /* Active state, selected state */

/* Warna */
border-color: var(--color-border);         /* Default */
border-color: var(--color-border-strong);  /* Hover */
border-color: var(--color-primary);        /* Focus, active, selected */
border-color: var(--color-error);          /* Error state */

/* Style */
border-style: solid;    /* Default */
border-style: dashed;   /* Upload area, drag & drop zone */
```

### 4.2 Border Radius

```
4px  → badge kecil, tag
8px  → button, input field, komponen kecil
12px → card standar, filter item, dropdown
14px → card mobile
16px → modal, slide panel, card hero
20px → modal besar
50%  → avatar, status dot
```

### 4.3 Shadow

Card di SJM Flow 5.0 **tidak menggunakan shadow** — hanya border tipis.
Shadow hanya untuk elemen yang "mengambang" di atas konten:

```css
/* Tidak ada shadow di card biasa */

/* Dropdown, popover */
box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);

/* Slide panel kanan */
box-shadow: -4px 0 16px rgba(0,0,0,0.08);

/* Modal */
box-shadow: 0 8px 32px rgba(0,0,0,0.12);

/* Toast */
box-shadow: 0 4px 12px rgba(0,0,0,0.10);
```

---

## 5. Layout System

### 5.1 Desktop Layout

```
┌─────────────────────────────────────────────────────┐
│ Topbar (56px, sticky)                               │
├──────────────┬──────────────────────────────────────┤
│ Sidebar      │ Page Content                         │
│ (240px)      │ padding: 24px                        │
│              │                                      │
│ collapsible  │ [Breadcrumb]                         │
│ ke 64px      │ [Page Header]                        │
│              │ [Alert Banner — opsional]            │
│              │ [KPI Grid — opsional]                │
│              │ [Filter Bar]                         │
│              │ [Content / Table]                    │
│              │                                      │
└──────────────┴──────────────────────────────────────┘

Slide panel kanan (480px) — muncul saat klik row/item:
├──────────────┬────────────────────┬─────────────────┤
│ Sidebar      │ Page Content       │ Slide Panel     │
│              │ (menyempit)        │ (480px)         │
└──────────────┴────────────────────┴─────────────────┘
```

### 5.2 Topbar

```
Kiri:   Logo SJM + teks "FLOW 5.0"
Tengah: Search bar global (max-width 480px)
Kanan:  Icon notifikasi (badge count) | Icon chat | Avatar + Nama + Role + chevron
```

- Height: 56px
- Background: white
- Border bottom: 1px solid --color-border
- Sticky — selalu terlihat saat scroll

### 5.3 Sidebar Terang

```
Background: white (#FFFFFF)
Border kanan: 1px solid --color-border
Width expanded: 240px
Width collapsed: 64px
Transition: 200ms ease
```

**Struktur sidebar:**
```
[Logo area — 56px]

[Section label: OPERASIONAL]
  Menu item
  Menu item

[Section label: RESOURCE]
  Menu item

[Section label: ADMIN]
  Menu item

──── divider ────

[Nama perusahaan aktif + chevron]  ← Company switcher

[Avatar + Nama + Role]
[Logout]
```

**Menu item states:**
```css
/* Default */
padding: 8px 12px;
border-radius: 8px;
font-size: 13px;
font-weight: 500;
color: var(--color-text-secondary);

/* Hover */
background: var(--color-sidebar-hover);
color: var(--color-text-primary);

/* Active */
background: var(--color-sidebar-active-bg);
color: var(--color-sidebar-active-text);
font-weight: 600;
border-left: 3px solid var(--color-sidebar-active-border);
```

**Section label:**
```css
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.8px;
color: var(--color-sidebar-label);
padding: 16px 12px 4px;
```

**Tombol minimize sidebar:**
- Posisi: tengah kanan sidebar, absolute
- Icon: ChevronLeft (expanded) / ChevronRight (collapsed)
- Size: 20x20px, border radius 50%
- Background: white, border 1px solid --color-border

### 5.4 Page Header

```html
<!-- Selalu ada di setiap halaman -->
<div class="page-header">
  <!-- Breadcrumb -->
  <div class="breadcrumb">
    Operasional › Sales Order
  </div>

  <!-- Judul + Aksi -->
  <div class="header-row">
    <div>
      <h1>Sales Order</h1>
      <p>Manajemen order pengiriman alat berat</p>
    </div>
    <div class="header-actions">
      <!-- Tombol aksi di sini -->
    </div>
  </div>
</div>
```

```css
.breadcrumb {
  font-size: 11px;
  color: var(--color-primary);    /* "Operasional" = orange */
  margin-bottom: 6px;
}
.breadcrumb .separator {
  color: var(--color-text-tertiary);
  margin: 0 4px;
}
.breadcrumb .current {
  color: var(--color-text-secondary);
}

h1.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}
p.page-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
```

### 5.5 Slide Panel Kanan

```
Width: 480px
Background: white
Border left: 1px solid --color-border
Shadow: -4px 0 16px rgba(0,0,0,0.08)
Position: fixed, kanan layar
Z-index: 100

Tombol minimize: ada di kiri atas panel (icon ChevronRight)
Tombol close (X): ada di kanan atas panel
```

**Behavior:**
- Klik row SO 001 → panel terbuka dengan isi SO 001
- Klik row SO 002 saat panel sudah terbuka → panel UPDATE isinya ke SO 002, tidak tutup
- Navigasi ke menu lain → panel otomatis tutup
- Klik X → panel tutup
- Klik di luar panel → TIDAK tutup (harus klik X)

### 5.6 Breakpoint

```
< 768px   → Mobile layout (bottom nav, card list, full screen form)
768-1024px → Tablet (sidebar collapsed by default)
> 1024px  → Desktop full
```

---

## 6. Components

### 6.1 Button

**3 varian. Tidak ada yang lain.**

```css
/* PRIMARY — aksi utama, satu per halaman */
.btn-primary {
  height: 36px;           /* Desktop */
  padding: 0 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 150ms ease;
  white-space: nowrap;
}
.btn-primary:hover   { background: var(--color-primary-hover); }
.btn-primary:active  { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* GHOST — aksi sekunder */
.btn-ghost {
  height: 36px;
  padding: 0 14px;
  background: white;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}
.btn-ghost:hover   { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

/* DANGER — hapus, batalkan */
.btn-danger {
  height: 36px;
  padding: 0 14px;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 150ms ease;
}
.btn-danger:hover { background: #a04846; }

/* MOBILE — height lebih besar untuk touch */
.btn-primary-mobile { height: 44px; border-radius: 12px; font-size: 13px; }
.btn-ghost-mobile   { height: 44px; border-radius: 12px; font-size: 13px; }
```

**Aturan button:**
- Icon dalam button: 14px (desktop), 16px (mobile)
- Loading state: spinner + text berubah + disabled
- Tidak ada button tanpa hover state
- Tidak ada button tanpa cursor: pointer

### 6.2 Input Field

**1 varian untuk semua input.**

```css
.input {
  height: 36px;
  padding: 0 12px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 12px;
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input::placeholder { color: var(--color-text-disabled); }
.input:hover        { border-color: var(--color-border-strong); }
.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(235, 94, 40, 0.12);
  outline: none;
}
.input:disabled {
  background: var(--color-surface-secondary);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.5;
}
.input.error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(184, 84, 80, 0.12);
}

/* Mobile */
.input-mobile {
  height: 44px;
  border-radius: 12px;
  font-size: 13px;
  padding: 0 14px;
}
```

### 6.3 Form Layout & Validation

```html
<!-- Field standar -->
<div class="form-field">
  <label class="form-label">
    Nama Customer
    <span class="required-indicator">Wajib diisi</span>
  </label>
  <input class="input" placeholder="..." />
  <span class="field-error">Nama customer tidak boleh kosong</span>
</div>
```

```css
.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.required-indicator {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-error);
}
.field-error {
  font-size: 11px;
  color: var(--color-error);
  margin-top: 4px;
  display: none;
}
.form-field.has-error .field-error { display: block; }
.form-field.has-error .input { border-color: var(--color-error); }

/* Spasi antar field */
.form-grid { display: grid; gap: 16px; }
.form-grid-2 { grid-template-columns: 1fr 1fr; gap: 16px; }
.form-section { margin-bottom: 24px; }
```

**Validasi:**
- Dijalankan saat blur (keluar dari field) dan saat submit
- Bukan real-time saat mengetik
- Field valid: tidak ada indikator (tidak perlu border hijau)
- Field error: border merah + pesan di bawah

### 6.4 Card

```css
/* Card standar — border tanpa shadow */
.card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

/* Card section dalam form */
.card-section {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.card-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-tertiary);
  margin-bottom: 14px;
}

/* Card mobile */
.card-mobile {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 12px 14px;
}

/* KPI Card */
.kpi-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 4px;
}
.kpi-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.kpi-sub {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
```

### 6.5 Badge / Status

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
}
.badge::before {
  content: '●';
  font-size: 8px;
}
/* Warna badge sesuai section 1.3 */
```

### 6.6 Table

```css
/* Container */
.table-container {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

/* Scroll wrapper untuk banyak kolom */
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;     /* Penting untuk kolom tidak bergeser */
}

/* Header — FROZEN */
thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-surface-secondary);
}
thead th {
  height: 40px;
  padding: 0 16px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  text-align: left;
}
thead th:last-child { text-align: center; }

/* Body row */
tbody tr {
  height: 52px;
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background 100ms ease;
  cursor: pointer;
}
tbody tr:last-child { border-bottom: none; }

/* Zebra striping — subtle */
tbody tr:nth-child(even) { background: #FDFCFB; }
tbody tr:hover            { background: var(--color-surface-hover) !important; }

/* Cell */
tbody td {
  padding: 0 16px;
  font-size: 12px;
  color: var(--color-text-primary);
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Aksi di tabel — selalu visible */
.table-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.table-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
}
.table-action-btn:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong); }
.table-action-btn.danger:hover { background: var(--color-error-light); border-color: var(--color-error-border); }
.table-action-btn.danger:hover svg { color: var(--color-error); }
```

### 6.7 Lebar Kolom Minimum Tabel

**Wajib dipatuhi — data tidak boleh terpotong untuk nilai penting:**

| Kolom | Min Width | Behavior |
|---|---|---|
| No SO | 140px | No-wrap, mono font |
| No Invoice | 180px | No-wrap, mono font |
| No Jurnal | 160px | No-wrap, mono font |
| Tanggal | 110px | No-wrap |
| Customer | 180px | Truncate + title tooltip |
| Muatan | 160px | Truncate + title tooltip |
| Rute | 180px | No-wrap (Asal → Tujuan) |
| Sopir + Armada | 150px | Truncate |
| Nilai / Harga | 130px | No-wrap, text-align right |
| Status | 120px | No-wrap, badge |
| Keterangan | 200px | Truncate + title tooltip |
| Aksi | 80px | text-align center |

### 6.8 Pagination

```html
<div class="pagination">
  <span class="pagination-info">Menampilkan 1-25 dari 360 SO</span>
  <div class="pagination-controls">
    <select class="rows-per-page">
      <option value="25" selected>25 per halaman</option>
      <option value="50">50 per halaman</option>
      <option value="100">100 per halaman</option>
    </select>
    <div class="page-nav">
      <button class="page-btn">←</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <span class="page-ellipsis">...</span>
      <button class="page-btn">15</button>
      <button class="page-btn">→</button>
    </div>
  </div>
</div>
```

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-subtle);
}
.pagination-info {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.page-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  font-weight: 600;
}
.page-btn:hover:not(.active) { background: var(--color-surface-hover); }
```

### 6.9 Modal

```
Ukuran:
  Small:  max-width 400px  — konfirmasi, peringatan
  Medium: max-width 560px  — form sederhana
  Large:  max-width 720px  — form kompleks
  XLarge: max-width 900px  — form dengan banyak section

Struktur wajib:
1. Overlay: rgba(0,0,0,0.4) backdrop-blur-sm
2. Container: border-radius 16px, shadow modal
3. Header: judul (15px, 600) + tombol X (kanan)
4. Body: scrollable, padding 20px
5. Footer: [Batal] [Aksi Utama] — selalu rata kanan

Behavior:
- Klik overlay: TIDAK menutup modal
- Klik X: menutup modal
- ESC key: menutup modal
```

### 6.10 Dropdown / Select

```css
.dropdown {
  height: 36px;
  padding: 0 12px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.dropdown:hover { border-color: var(--color-border-strong); }

/* Dropdown menu */
.dropdown-menu {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  min-width: 180px;
  overflow: hidden;
}
.dropdown-item {
  padding: 8px 14px;
  font-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 100ms ease;
}
.dropdown-item:hover    { background: var(--color-surface-hover); }
.dropdown-item.selected { background: var(--color-primary-light); color: var(--color-primary); font-weight: 500; }
```

### 6.11 Alert Banner

```css
/* Banner notifikasi di bawah page header */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
}
.alert-banner.warning {
  background: var(--color-warning-light);
  border-color: var(--color-warning-border);
  color: var(--color-warning);
}
.alert-banner.info {
  background: var(--color-info-light);
  border-color: var(--color-info-border);
  color: var(--color-info);
}
.alert-banner.error {
  background: var(--color-error-light);
  border-color: var(--color-error-border);
  color: var(--color-error);
}
/* Chevron kanan untuk navigasi */
.alert-banner-arrow { margin-left: auto; }
```

### 6.12 Toast Notification

```
Posisi:
  Desktop: kanan atas (top: 16px, right: 16px)
  Mobile:  bawah tengah (bottom: 80px, center)

Ukuran: min-width 280px, max-width 360px
Border radius: 12px
Shadow: 0 4px 12px rgba(0,0,0,0.10)
Durasi tampil: 3 detik
Animasi: slide in dari kanan (desktop), slide up (mobile)

Struktur:
  [Icon] [Teks pesan] [X optional]

Pesan yang baik:
  ❌ "Berhasil"
  ✅ "SO SJM.ID-0361.26 berhasil disimpan"
  ❌ "Terjadi kesalahan"
  ✅ "Gagal menyimpan: nomor SO sudah digunakan"
```

### 6.13 Empty State

**Wajib ada di setiap tabel dan list.**

```html
<div class="empty-state">
  <div class="empty-icon"><!-- Icon 32px, opacity 30% --></div>
  <div class="empty-title">Belum ada Sales Order</div>
  <div class="empty-desc">Klik + SO Baru untuk membuat order pertama.</div>
  <!-- Tombol aksi opsional -->
</div>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon    { opacity: 0.3; margin-bottom: 4px; }
.empty-title   { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.empty-desc    { font-size: 12px; color: var(--color-text-tertiary); max-width: 280px; }
```

**Pesan empty state per halaman:**

| Halaman | Pesan |
|---|---|
| SO | "Belum ada Sales Order. Klik + SO Baru untuk mulai." |
| Invoice | "Belum ada invoice. Buat dari halaman Sales Order." |
| Jurnal | "Belum ada jurnal bulan ini." |
| Hasil filter | "Tidak ada hasil. Coba ubah filter atau kata kunci." |
| Hutang & Piutang | "Tidak ada transaksi outstanding." |
| Update Muatan | "Tidak ada SO aktif saat ini." |

### 6.14 Loading State

```css
/* Skeleton shimmer */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #F0EBE4 25%, #FAF8F5 50%, #F0EBE4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

/* Tabel loading: 5 baris skeleton */
/* Button loading */
.btn-loading {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}
```

### 6.15 Divider

```css
.divider {
  height: 1px;
  background: var(--color-border-subtle);
  border: none;
  margin: 16px 0;
}
.divider-strong {
  background: var(--color-border);
}
```

**Kapan pakai divider vs whitespace:**
- Divider: memisahkan section yang berbeda konten dalam satu card
- Whitespace (margin/gap): memisahkan antar card atau antar section

---

## 7. Icon

**Semua icon dari Lucide React via komponen `<Icon />`.**

```css
/* Ukuran standar */
Icon dalam button desktop:  14px
Icon dalam button mobile:   16px
Icon aksi tabel:            14px (selalu visible)
Icon sidebar expanded:      18px
Icon sidebar collapsed:     20px
Icon empty state:           32px, opacity 30%
Icon close modal:           18px
Icon badge:                 10px
Icon input prefix:          14px

/* Stroke width */
Default:  1.5px
Active:   2px
```

**Aturan:**
- Selalu via `<Icon name="..." />` — JANGAN import langsung dari lucide-react
- Icon tanpa label teks WAJIB punya `title` atau `aria-label`
- Warna icon mengikuti warna teks parent

---

## 8. Mobile Design

### 8.1 Layout Mobile

```
┌─────────────────┐
│ Mobile Topbar   │  ← Hamburger + Judul + Aksi (56px)
├─────────────────┤
│ Tab/Filter Bar  │  ← Opsional (40px)
├─────────────────┤
│                 │
│ Content         │  ← Scrollable, padding-bottom 80px
│ (card list)     │
│                 │
├─────────────────┤
│ Bottom Nav      │  ← 4 tab: Dashboard|Muatan|SO|Lainnya (56px)
└─────────────────┘
```

### 8.2 Touch Targets

- Semua tombol aksi: **minimum 44px height**
- Semua tap target: **minimum 44x44px**
- Gap antar tombol berdekatan: minimum 8px
- Tidak ada elemen interaktif < 32px

### 8.3 Mobile Cards (pengganti tabel)

Di mobile, tabel diganti dengan card list:
```
[No SO + Status badge (kanan atas)]
[Nama Customer (bold)]
[Rute: Asal → Tujuan]
[Sopir · No Polisi]
[Waktu update (kanan bawah)]
```

### 8.4 Bottom Navigation

```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 56px;
  background: white;
  border-top: 1px solid var(--color-border);
  display: flex;
  z-index: 100;
}
.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  position: relative;
}
.bottom-nav-item.active {
  color: var(--color-primary);
}
.bottom-nav-badge {
  position: absolute;
  top: 6px;
  right: calc(50% - 18px);
  width: 16px; height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 8.5 Mobile Typography

```
Judul halaman:  17px, font-weight 700
Body:           13px (bukan 12px — lebih mudah dibaca)
Label:          11px, weight 500
Caption:        10px, weight 600
Nomor ref:      12px, mono
```

---

## 9. Format Data

### 9.1 Tanggal & Waktu

```
Tanggal panjang:   09 Jun 2026
Tanggal pendek:    09/06/26  (hanya kalau space terbatas)
Waktu:             09:41 WIB
Datetime:          09 Jun 2026, 09:41 WIB
Relatif < 24 jam:  "2 jam lalu", "30 menit lalu"
Relatif > 24 jam:  tanggal eksplisit "09 Jun 2026"
```

### 9.2 Angka & Mata Uang

```typescript
// Rupiah penuh
fmt(27000000)       // → "Rp 27.000.000"

// Rupiah disingkat (KPI cards)
fmtShort(27000000)  // → "Rp 27 Jt"

// Parsing — SELALU parseNumSafe, JANGAN parseFloat
parseNumSafe("27.000.000") // → 27000000
parseFloat("27.000.000")   // → 27 (SALAH!)

// Angka selalu tabular-nums
font-variant-numeric: tabular-nums;
```

### 9.3 Status Text

Selalu konsisten — jangan ganti-ganti:
```
"On Going"       bukan "Dalam Perjalanan" atau "ongoing"
"Completed"      bukan "Selesai" atau "Done"
"Order Confirmed" bukan "Confirmed"
"Belum Bayar"    bukan "Unpaid"
"Lunas"          bukan "Paid" atau "Sudah Bayar"
```

---

## 10. Interaction States

**Setiap elemen interaktif WAJIB punya semua state:**

```
Default   → tampilan normal
Hover     → bg change, cursor pointer, border darkens
Focus     → ring primary 3px (accessibility)
Active    → scale(0.98) — tombol saja
Disabled  → opacity 0.4, cursor not-allowed
Loading   → spinner + text berubah + pointer-events none
```

```css
/* Transition timing standar */
transition: background 150ms ease;
transition: border-color 150ms ease;
transition: all 150ms ease;
transition: transform 100ms ease;  /* Untuk scale */
```

---

## 11. Login & Company Picker

### 11.1 Login Page

```
Layout: full screen #F5F4F1, centered
Card: white, border-radius 16px, border 1px solid --color-border
Card width: 400px
Padding: 32px

Struktur:
  Logo SJM Flow 5.0 (centered)
  Judul: "Selamat Datang" (22px, 700)
  Subtitle: "Masuk ke akun SJM Flow Anda" (13px, secondary)
  Field Username
  Field Password + toggle show/hide
  Tombol "Masuk" (full width, 44px, primary)
  Footer: "SJM Flow 5.0 · PT Sugiarto Jaya Mandiri" (11px, tertiary)
```

### 11.2 Company Picker

```
Layout: full screen #F5F4F1, centered
Card: white, border-radius 16px, max-width 400px

Struktur:
  Logo SJM Flow 5.0
  Judul: "Pilih Perusahaan" (22px, 700)
  Subtitle: "Anda memiliki akses ke beberapa perusahaan" (13px)
  Dropdown pilih perusahaan (urutan: alfabetis)
  Tombol "Lanjutkan" (full width, 44px, primary, disabled kalau belum pilih)
  Teks: "Anda bisa switch perusahaan kapan saja dari sidebar" (11px, tertiary)

User dengan 1 perusahaan:
  Dropdown tetap tampil tapi hanya 1 opsi
  Tidak di-skip — user tetap harus klik Lanjutkan
```

---

## 12. Dashboard per Role

### 12.1 Admin

```
Greeting: "Selamat Pagi, [Nama] 👋"
Hero section: placeholder image area (akan diisi gambar)
KPI summary dalam hero: Shipment Aktif | Menunggu Approval | Loading Terlambat | Selesai
CTA: "+ Buat Shipment Baru"

KPI Cards (4): Shipment Aktif | Dalam Perjalanan | Menunggu Approval | Kendala Operasional

Panel kanan (280px):
  - Dispatcher Hari Ini (ringkasan cepat)
  - Aktivitas Terbaru (timeline)
  - Alert (dokumen expired, kendaraan overdue)

Konten utama:
  - Tabel Shipment Terbaru dengan filter
```

### 12.2 Keuangan

```
KPI: Omzet | Laba Bersih | Piutang Beredar | Kas & Bank
Panel kanan: Invoice outstanding, aging piutang
Konten: Posting jurnal terbaru
```

### 12.3 Operasional

```
KPI: Total Trip | On Going | Completed | Armada Aktif
Tidak ada panel kanan
Konten: SO aktif + logistik ops terkini
```

---

## 13. Checklist Wajib Sebelum Commit UI

### Typography
- [ ] Font size dari scale (9/10/11/12/13/15/22px)?
- [ ] Tidak ada text-sm, text-xs, text-base, text-lg?
- [ ] Angka pakai tabular-nums?
- [ ] Nomor referensi pakai font-mono?

### Color
- [ ] Warna dari CSS variables?
- [ ] Tidak ada hardcode hex?
- [ ] Status badge pakai warna semantik yang benar?
- [ ] Tidak ada Tailwind color utility?

### Spacing
- [ ] Semua spacing kelipatan 4 atau 8?
- [ ] Tidak ada magic number?

### Components
- [ ] Button pakai btn-primary/ghost/danger?
- [ ] Input pakai class input?
- [ ] Icon via `<Icon />` bukan import langsung?
- [ ] Semua elemen interaktif punya hover state?

### Table
- [ ] Header frozen (sticky)?
- [ ] Kolom punya lebar minimum?
- [ ] Teks panjang di-truncate + ada title tooltip?
- [ ] Zebra striping aktif?
- [ ] Empty state ada dan kontekstual?
- [ ] Loading skeleton ada?

### Form
- [ ] Label di atas field?
- [ ] Required indicator "Wajib diisi" merah?
- [ ] Error state: border merah + pesan di bawah?
- [ ] Validasi saat blur + submit (bukan real-time)?

### Mobile
- [ ] Touch target minimum 44px?
- [ ] Tabel diganti card list di mobile?
- [ ] Bottom action bar untuk aksi utama?
- [ ] Content padding-bottom 80px (ruang bottom nav)?

### General
- [ ] Empty state ada di semua tabel/list?
- [ ] Loading state ada untuk semua async?
- [ ] Toast pesan kontekstual (bukan hanya "Berhasil")?
- [ ] Slide panel behavior benar (replace, tidak tutup)?

---

## 14. Anti-Patterns — JANGAN DILAKUKAN

```
❌ Hardcode hex: style={{ color: '#FF8F00' }}
❌ Tailwind color: className="bg-orange-500 text-green-600"
❌ Font size acak: text-sm, text-xs, text-[13.5px]
❌ Magic number: marginTop: 13, padding: 7
❌ Import icon langsung dari lucide-react
❌ Shadow di card biasa (hanya border)
❌ Tabel di mobile tanpa horizontal scroll
❌ Touch target < 44px
❌ Empty state tanpa deskripsi kontekstual
❌ Loading state tanpa disabled
❌ Form submit tanpa validasi
❌ Delete tanpa konfirmasi
❌ Delete data penting tanpa konfirmasi 2 lapis
❌ Toast "Berhasil" atau "Error" tanpa konteks
❌ Inline style untuk layout dan spacing
❌ Async tanpa try/catch + showToast
❌ parseFloat() untuk angka format Indonesia
❌ Teks panjang terpotong tanpa title tooltip
❌ Header tabel tidak frozen
❌ Status text tidak konsisten ("On Going" vs "Dalam Perjalanan")
❌ Kolom tanpa lebar minimum
❌ Border radius tidak konsisten dalam satu halaman
```

---

*Dokumen ini adalah source of truth untuk semua keputusan desain SJM Flow 5.0.*
*Diupdate setiap kali ada keputusan desain baru yang disepakati.*
*Referensi visual: Dashboard dan SO dari ChatGPT mockup (Juni 2026).*
