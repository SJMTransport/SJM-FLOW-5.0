# SJM Flow 5.0 — UI/UX Design Guidelines
> Source of truth untuk semua keputusan desain di SJM Flow 5.0
> Wajib dibaca sebelum membuat atau mengubah komponen apapun
> Last updated: 2026-06-03

---

## 1. Filosofi Desain

> "Setiap elemen di layar harus punya alasan untuk ada.
> Kalau tidak membantu user menyelesaikan pekerjaannya, hapus."

SJM Flow adalah aplikasi **work-oriented** — bukan showcase estetika.
User membuka aplikasi untuk menyelesaikan pekerjaan, bukan untuk menikmati tampilannya.

**Tiga prinsip utama:**
- **Zero ambiguity** — setiap elemen harus jelas fungsinya tanpa perlu dijelaskan
- **Consistent hierarchy** — user tahu mana yang penting, mana yang sekunder
- **Mobile-first untuk Operasional** — Update Muatan didesain untuk HP dulu, baru desktop

---

## 2. Color System

### 2.1 Brand & Semantic Tokens

```css
/* Brand */
--accent:           #EB5E28;   /* Primary CTA, link aktif, elemen fokus */
--accent-dark:      #D4531F;   /* Hover state accent */
--accent-light:     #FEF0E8;   /* Background accent subtle */

/* Background */
--bg:               #F5F4F1;   /* Background halaman */
--surface:          #FFFFFF;   /* Card, modal, input */
--surface-hover:    #FDFCFB;   /* Row hover */
--surface-secondary:#FAFAF8;   /* Table header, section muted */

/* Text */
--text-main:        #1A1A1A;   /* Konten primer */
--text-med:         #52504A;   /* Konten sekunder */
--text-light:       #9B9690;   /* Label, caption, placeholder */
--text-muted:       #C0B8B0;   /* Disabled, sangat sekunder */

/* Border */
--border:           #E2DDD6;   /* Default border */
--border-strong:    #C0B8B0;   /* Hover border, emphasis */
--border-subtle:    #F0EBE4;   /* Row divider, subtle separator */

/* Semantic */
--success:          #5C8A3C;   /* Lunas, Completed, aktif */
--success-light:    #EAF3DE;   /* Background success */
--error:            #B85450;   /* Error, Hapus, overdue */
--error-light:      #FCEBEB;   /* Background error */
--warning:          #C4914A;   /* Parsial, pending, warning */
--warning-light:    #FAEEDA;   /* Background warning */
--info:             #4A6FA5;   /* Info, draft, netral */
--info-light:       #E6F1FB;   /* Background info */

/* Sidebar */
--sidebar-bg:       #1E1C1A;
--sidebar-header:   #141210;
```

### 2.2 Aturan Warna

- Warna aksen hanya untuk **satu tombol utama per halaman**
- Background card selalu `--surface` (putih) — tidak ada card berwarna
- Warna semantik hanya untuk status/badge — tidak untuk dekorasi
- Tidak ada hardcode hex di komponen — selalu pakai CSS variables
- Tidak ada `text-red-500`, `bg-green-500` — pakai semantic tokens

### 2.3 Status Badge Colors

| Status | Background | Text |
|---|---|---|
| Completed | `--success-light` | `--success` |
| On Going | `--info-light` | `--info` |
| Loading | `--warning-light` | `--warning` |
| Cancelled | `--error-light` | `--error` |
| Draft / Order Confirmed | `#F1EFE8` | `#5F5E5A` |
| Lunas | `--success-light` | `--success` |
| Belum Bayar | `--error-light` | `--error` |
| Parsial | `--warning-light` | `--warning` |

---

## 3. Typography

### 3.1 Typographic Scale

**Hanya 6 ukuran yang boleh dipakai. Tidak ada pengecualian.**

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 22px | 900 (black) | Judul halaman |
| Title | 15px | 700 (bold) | Section header, judul card |
| Body | 12px | 500 (medium) | Isi tabel, form, konten |
| Supporting | 11px | 500 (medium) | Info sekunder, sub-label |
| Label | 10px | 700 (bold) | Label form, header tabel, badge |
| Caption | 9px | 600 (semibold) | Timestamp, keterangan kecil |

**Khusus nomor referensi** (SO, Invoice, Jurnal):
- Font: `font-family: var(--font-mono)`
- Size: 11px, weight 800, color `--accent`, italic

### 3.2 Aturan Typography

- **Tidak ada** `text-sm`, `text-xs`, `text-base`, `text-lg` — selalu pixel eksplisit
- **Tidak ada** mix ukuran acak dalam satu komponen
- Angka selalu `tabular-nums` untuk alignment
- Teks panjang di tabel pakai `truncate` + `title` attribute untuk tooltip
- Letter spacing untuk label: `letter-spacing: 0.5px` sampai `1px`

---

## 4. Spacing — 8pt Grid

**Semua spacing adalah kelipatan 8. Tidak ada nilai di luar ini.**

```
4px  → xs  — gap inline kecil, icon-to-text
8px  → sm  — gap antar elemen dalam grup
12px → md- — padding komponen kecil (badge, chip, button)
16px → md  — padding card dalam, gap kolom form
20px → md+ — padding card utama
24px → lg  — gap antar section
32px → xl  — margin halaman, gap section besar
48px → 2xl — section sangat besar
```

**Contoh penerapan:**
- Button padding: `0 16px` (horizontal), height fixed
- Card padding: `20px`
- Table cell: `py-3 px-4` (12px vertical, 16px horizontal)
- Gap antar KPI card: `12px`
- Gap antar section: `24px`

---

## 5. Component Library

### 5.1 Buttons

**3 varian, tidak lebih. Semua height 36px.**

```css
/* Primary — aksi utama, satu per halaman */
.btn-primary {
  height: 36px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-primary:hover { background: var(--accent-dark); }
.btn-primary:active { transform: scale(0.98); }

/* Ghost — aksi sekunder */
.btn-ghost {
  height: 36px;
  padding: 0 14px;
  background: var(--surface);
  color: var(--text-med);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-ghost:hover { border-color: var(--border-strong); background: var(--bg); }

/* Danger — hapus, batalkan */
.btn-danger {
  height: 36px;
  padding: 0 14px;
  background: var(--error);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-danger:hover { background: #a04846; }

/* Mobile buttons — height 44px untuk touch target */
.btn-primary-mobile { height: 44px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.btn-ghost-mobile { height: 44px; border-radius: 12px; }
```

**Aturan button:**
- Disabled state: `opacity: 0.4; cursor: not-allowed`
- Loading state: spinner + text berubah + disabled
- Icon dalam button: 14px
- Tidak ada button tanpa hover state

### 5.2 Input Fields

**1 varian untuk semua input.**

```css
.input {
  height: 36px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-main);
  width: 100%;
}
.input:hover { border-color: var(--border-strong); }
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(235, 94, 40, 0.12);
  outline: none;
}
.input::placeholder { color: var(--text-muted); }

/* Mobile input */
.input-mobile { height: 44px; border-radius: 12px; font-size: 13px; }
```

### 5.3 Cards

```css
/* Card default */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

/* Card section dalam form */
.card-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

/* Card mobile */
.card-mobile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
}
```

### 5.4 Badges / Status

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
/* Icon dalam badge: 9px */
```

### 5.5 Tables

```css
.table-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

/* Header row */
.table-header {
  background: var(--surface-secondary);
  border-bottom: 1px solid var(--border-subtle);
  height: 40px;
  padding: 0 16px;
  font-size: 9px;
  font-weight: 700;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Data row */
.table-row {
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.1s;
}
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: var(--surface-hover); }

/* Aksi tersembunyi — muncul saat hover row */
.row-actions {
  opacity: 0;
  transition: opacity 0.1s;
}
.table-row:hover .row-actions { opacity: 1; }
```

**Pagination standar:**
- Default: 25 row per halaman
- Pilihan: 25 / 50 / 100
- Info: "Menampilkan 1–25 dari N data"
- Navigasi: prev, halaman (1, 2, 3, ..., N), next

### 5.6 KPI Cards

```tsx
// Selalu gunakan komponen StatCard
<StatCard
  label="Total SO"        // 9px, uppercase, text-light
  value="360"             // 22px, font-black
  sub="Semua periode"     // 10px, text-light
  icon="FileText"         // Lucide icon name
  color="var(--accent)"   // Warna value
  trend="+12 bulan ini"   // Opsional
  trendUp={true}          // Opsional
/>
```

### 5.7 Empty States

**Wajib ada di setiap tabel dan list.**

```tsx
// Bukan hanya "Tidak ada data"
// Selalu kontekstual

// Contoh untuk SO:
<EmptyState
  icon="FileText"
  title="Belum ada Sales Order"
  desc="Klik + SO Baru untuk mulai membuat order pertama."
/>

// Contoh untuk hasil filter kosong:
<EmptyState
  icon="Search"
  title="Tidak ada hasil"
  desc="Coba ubah filter atau kata kunci pencarian."
/>
```

### 5.8 Loading States

```tsx
// Tabel loading
<TableSkeleton rows={5} />

// Button loading
<button disabled>
  <Spinner size={14} /> Menyimpan...
</button>

// Full page loading (jarang)
<PageLoader />
```

### 5.9 Modal / Dialog

```
Struktur wajib semua modal:
1. Overlay: bg-black/40 backdrop-blur-sm, click to close
2. Container: max-w-lg, rounded-2xl, shadow-xl
3. Header: judul + close button
4. Body: scrollable kalau konten panjang
5. Footer: [Batal] [Aksi Utama] — selalu di kanan
```

**Konfirmasi hapus wajib 2 lapis:**
- Lapis 1: Modal konfirmasi biasa
- Lapis 2: Ketik ulang identifier (no SO, no jurnal, dll)

---

## 6. Layout System

### 6.1 Desktop Layout Anatomy

**Setiap halaman mengikuti struktur ini tanpa pengecualian:**

```
┌─────────────────────────────────────────┐
│ Sidebar (200px, collapsible ke 64px)    │
├─────────────────────────────────────────┤
│ Topbar (52px)                           │
│ Breadcrumb              Search | Notif  │
├─────────────────────────────────────────┤
│ Page Content (padding: 24px)            │
│                                         │
│ PageHeader                              │
│ [Judul 22px]          [Aksi Utama]      │
│ [Subtitle 12px]                         │
│                                         │
│ Notification Banner (kalau ada)         │
│                                         │
│ KPI Grid (kalau ada)                    │
│ [KPI] [KPI] [KPI] [KPI]                │
│                                         │
│ Filter Bar                              │
│ [Search] [Filter] [Filter]   [Export]   │
│                                         │
│ Content (Tabel / Form)                  │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 Sidebar Structure

```
[Logo + App Name]          ← 56px header, bg sidebar-header

[Section Label: MAIN]
  Dashboard

[Section Label: OPERASIONAL]
  Sales Order
  Update Muatan
  Invoice
  Quotation

[Section Label: KEUANGAN]
  Jurnal Umum
  Persetujuan Jurnal
  Hutang & Piutang

[Section Label: LAPORAN]
  Neraca Saldo
  Laba Rugi
  Buku Besar
  Profitabilitas

[Section Label: ARMADA]
  Dashboard Unit
  Unit List
  Dokumen
  Service
  Sopir

[Section Label: SISTEM]
  Master

──────────────────          ← border separator

  Users
  Log Aktivitas
  Password

[Session Card]              ← Avatar + Nama + Role + Company
[Logout Button]
```

### 6.3 Company Switcher

Tampil di session card — nama perusahaan aktif bisa diklik untuk switch.

### 6.4 URL Structure (React Router)

```
/                           → redirect ke /dashboard
/login                      → halaman login
/pick-company               → company picker

/dashboard                  → dashboard
/operasional/so             → sales order
/operasional/muatan         → update muatan
/operasional/invoice        → invoice
/operasional/quotation      → quotation
/keuangan/jurnal            → jurnal umum
/keuangan/persetujuan       → approval jurnal
/keuangan/hutang-piutang    → hutang & piutang
/laporan/neraca             → neraca saldo
/laporan/laba-rugi          → laba rugi
/laporan/buku-besar         → buku besar
/laporan/profitabilitas     → profitabilitas
/armada/dashboard           → dashboard armada
/armada/unit                → unit list
/armada/dokumen             → dokumen
/armada/service             → service
/armada/sopir               → sopir
/master/kontak              → kontak
/master/coa                 → master COA
/master/saldo-awal          → saldo awal
/users                      → manajemen user
/activity                   → log aktivitas
/password                   → ganti password
```

---

## 7. Mobile Design System

### 7.1 Strategi Mobile

| Halaman | Pendekatan | Alasan |
|---|---|---|
| Update Muatan | Mobile-first | Staff operasional di lapangan |
| Dashboard Operasional | Mobile-first | Monitoring cepat dari HP |
| SO List | Mobile-friendly | Cek status dari luar |
| Invoice, Jurnal, Laporan | Mobile-friendly | Keuangan jarang di lapangan |
| Master, COA | Desktop only | Jarang diakses, kompleks |

### 7.2 Mobile Layout

```
┌─────────────────┐
│ Mobile Topbar   │  ← Back button + Judul + Aksi
├─────────────────┤
│ Tab Bar         │  ← Filter tab (kalau ada)
├─────────────────┤
│                 │
│ Content         │  ← Scrollable
│                 │
│                 │
├─────────────────┤
│ Bottom Action   │  ← Primary action button (44px)
└─────────────────┘

Navigasi utama: Bottom Navigation Bar
  Dashboard | Muatan | SO | Lainnya
```

### 7.3 Mobile Touch Targets

- Semua tombol aksi: **minimum 44px height**
- Tap target area: minimum 44x44px
- Tidak ada elemen interaktif < 32px
- Gap antar tombol berdekatan: minimum 8px

### 7.4 Mobile Typography

```
Judul halaman:  15px, font-bold (bukan 22px — terlalu besar di HP)
Body:           13px (bukan 12px — lebih mudah dibaca di HP)
Label:          10px, uppercase
Caption:        9px
Nomor ref:      12px, mono, italic
```

### 7.5 Mobile Status Selector

Untuk Update Muatan — jangan pakai dropdown. Pakai **grid tombol visual**:
- 2x2 grid
- Setiap status punya icon + label + sub-label
- State terpilih: border accent + background accent-light + checkmark
- Touch target per tombol: ~60px height

### 7.6 Mobile Cards vs Desktop Tables

Di mobile, tabel tidak cocok. Ganti dengan card list:

```
Desktop: Tabel dengan kolom
Mobile:  Card list dengan info terpenting di atas
         Status badge di kanan atas
         Info sekunder di bawah
```

---

## 8. Iconography

**Semua icon dari Lucide React via komponen `<Icon />`.**

```tsx
<Icon name="Plus" size={14} />        // Dalam tombol desktop
<Icon name="Plus" size={16} />        // Dalam tombol mobile
<Icon name="Trash2" size={13} />      // Aksi di tabel
<Icon name="LayoutDashboard" size={16} /> // Sidebar navigation
<Icon name="Search" size={32} />      // Empty state
<Icon name="X" size={18} />           // Close modal
```

**Aturan icon:**
- Icon selalu disertai label teks kecuali space sangat terbatas
- Icon-only selalu punya `title` attribute untuk tooltip
- Tidak ada import langsung dari `lucide-react` — selalu via `<Icon />`
- Icon dalam badge: 9px

---

## 9. Interaction States

**Setiap elemen interaktif wajib punya semua state ini:**

```
Default   → tampilan normal
Hover     → subtle bg change, cursor pointer, border darkens
Focus     → ring accent 3px, outline visible (accessibility)
Active    → scale(0.98), pressed feel
Disabled  → opacity 0.4, cursor not-allowed
Loading   → spinner + text berubah + element disabled
```

**Transition timing:**
- Color/bg: `transition: 150ms ease`
- Transform: `transition: 100ms ease`
- Opacity: `transition: 150ms ease`

---

## 10. Data States

**Setiap area konten wajib punya semua state:**

```
Loading   → Skeleton shimmer atau centered spinner
Empty     → Icon (32px) + Judul + Deskripsi kontekstual + Aksi (opsional)
Error     → Icon error + Pesan + Tombol Retry
Populated → Konten aktual
```

**Empty state messages — selalu kontekstual:**

| Halaman | Empty Message |
|---|---|
| SO | "Belum ada Sales Order. Klik + SO Baru untuk mulai." |
| Invoice | "Belum ada invoice. Buat invoice dari halaman Sales Order." |
| Jurnal | "Belum ada jurnal bulan ini." |
| Hasil filter | "Tidak ada hasil. Coba ubah filter atau kata kunci." |
| Hutang & Piutang | "Tidak ada transaksi outstanding." |

---

## 11. Forms

### 11.1 Form Layout Desktop

```
Section card → judul section (10px, uppercase, opacity 60%)
Grid 2 kolom untuk field sejajar
Grid 1 kolom untuk field panjang (keterangan, alamat)
Label selalu di atas field — tidak floating
Tombol aksi di bawah form: [Batal] [Simpan]
```

### 11.2 Form Validation

```
Error: border merah + icon error + pesan di bawah field
Warning: border kuning + pesan kuning
Success: border hijau (konfirmasi input valid)

Validasi dilakukan:
- Saat blur (keluar dari field)
- Saat submit
- Bukan real-time (terlalu annoying)
```

### 11.3 Form Mobile

```
1 kolom penuh
Label di atas, input di bawah
Height input: 44px (bukan 36px)
Border radius: 12px (bukan 8px)
Font: 13px (bukan 12px)
```

---

## 12. Notification & Feedback

### 12.1 Toast Notifications

```
Posisi: top-right (desktop), top-center (mobile)
Durasi: 3 detik
Max width: 320px
4 tipe: success, error, warning, info
Selalu ada icon + teks yang jelas
```

**Pesan yang baik:**
- ❌ "Terjadi kesalahan"
- ✅ "Gagal menyimpan SO: nomor SO sudah digunakan"
- ❌ "Berhasil"
- ✅ "SO SJM.ID-0361.26 berhasil disimpan"

### 12.2 Notification Banner

Untuk notifikasi yang butuh tindakan (jurnal pending, SO draft):
- Tampil di bawah PageHeader
- 2 banner maksimal side-by-side
- Bisa diklik untuk navigate ke halaman terkait
- Punya icon + teks + chevron kanan

### 12.3 Alert / Warning States

```
Info banner:    bg info-light, border info, icon info
Warning banner: bg warning-light, border warning, icon warning
Error banner:   bg error-light, border error, icon error
```

---

## 13. Number & Currency Formatting

```typescript
// Rupiah — selalu pakai helper ini
fmt(15250000)        // → "Rp 15.250.000"
fmtShort(15250000)   // → "Rp 15,2 Jt"

// Angka selalu tabular-nums
className="tabular-nums"

// Parsing — WAJIB pakai parseNumSafe, JANGAN parseFloat
parseNumSafe("12.500.000")  // → 12500000 (BENAR)
parseFloat("12.500.000")    // → 12.5 (SALAH)
```

---

## 14. Checklist Sebelum Commit UI

**Wajib diverifikasi sebelum setiap commit yang menyentuh UI:**

### Typography
- [ ] Font size dari typographic scale (9/10/11/12/15/22px)?
- [ ] Tidak ada text-sm, text-xs, text-base?
- [ ] Angka pakai tabular-nums?
- [ ] Nomor referensi pakai font-mono + italic + accent?

### Color
- [ ] Warna dari CSS variables (--accent, --text-main, dll)?
- [ ] Tidak ada hardcode hex di komponen?
- [ ] Status badge pakai warna semantik yang benar?

### Spacing
- [ ] Semua spacing kelipatan 8 (4/8/12/16/20/24/32/48px)?
- [ ] Tidak ada magic number (13px, 7px, dll)?

### Components
- [ ] Button pakai btn-primary/ghost/danger?
- [ ] Input pakai class input?
- [ ] Card pakai class card/card-section?
- [ ] Icon via `<Icon />`, bukan import langsung?

### States
- [ ] Loading state ada?
- [ ] Empty state ada dan kontekstual?
- [ ] Error state ada?
- [ ] Semua tombol punya hover state?
- [ ] Disabled state pakai opacity 0.4?

### Mobile (untuk halaman operasional)
- [ ] Touch target minimum 44px?
- [ ] Tidak ada tabel di mobile — pakai card list?
- [ ] Bottom action bar untuk aksi utama?
- [ ] Font size mobile 13px untuk body?

### Accessibility
- [ ] Icon-only punya title/aria-label?
- [ ] Warna tidak satu-satunya pembeda status?
- [ ] Input punya label yang jelas?

---

## 15. Anti-Patterns — JANGAN DILAKUKAN

```
❌ Hardcode warna: style={{ color: '#FF8F00' }}
❌ Tailwind utility langsung: className="bg-orange-500 text-white"
❌ Font size acak: text-sm, text-xs, text-[13px] campur aduk
❌ Import icon langsung: import { Plus } from 'lucide-react'
❌ Magic number spacing: marginTop: 13, padding: 7
❌ Tabel di mobile tanpa horizontal scroll
❌ Touch target < 44px di mobile
❌ Empty state tanpa deskripsi kontekstual
❌ Loading state tanpa disabled button
❌ Form tanpa validasi sebelum submit
❌ Delete tanpa konfirmasi
❌ Delete data penting tanpa konfirmasi 2 lapis
❌ Toast hanya "Berhasil" atau "Error" tanpa konteks
❌ Inline style untuk layout dan spacing
❌ Async function tanpa try/catch
❌ parseFloat() untuk angka format Indonesia
```

---

*Dokumen ini adalah source of truth untuk semua keputusan desain SJM Flow 5.0.*
*Update setiap kali ada keputusan desain baru yang disepakati.*
*Baca dokumen ini sebelum membuat komponen atau halaman apapun.*
