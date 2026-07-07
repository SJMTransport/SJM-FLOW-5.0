# UI GUIDELINES — SJM Flow 5.0
> Sumber kebenaran desain: `src/pages/SalesOrder.tsx` (halaman acuan).
> Semua halaman WAJIB mengikuti pola di dokumen ini. Terakhir diperbarui: 2026-07-07.

Prinsip: clarity & hierarchy (Apple HIG), purposeful & accessible (Material 3).
Satu bahasa visual — tidak ada halaman yang terlihat "beda keluarga".

---

## 1. Design Tokens

### Warna
| Token | Hex | Pemakaian |
|---|---|---|
| bg-page | `#FAFAF8` | Latar halaman (dari App shell) |
| bg-card | `#FFFFFF` | Card, tabel, filter bar, modal |
| bg-surface | `#F8F6F3` | Header tabel, latar input search, footer form |
| bg-hover | `#FAF8F5` | Hover baris tabel, hover item menu |
| border | `#E2DDD6` | SEMUA border card/input/divider |
| text-main | `#1A1A1A` | Heading, isi tabel utama |
| text-secondary | `#52504A` | Subtitle, teks pendukung |
| text-muted | `#6B6862` | Label kolom, caption, placeholder (JANGAN #9B9690 — gagal WCAG) |
| accent | `#EB5E28` | Tombol primer, link, breadcrumb, active state |
| accent-bg | `#FEF0E8` | Latar hover accent, badge accent |
| success | `#16A34A` / bg `#DCFCE7` | Status positif |
| info | `#2563EB` / bg `#DBEAFE` | Status proses |
| warning | `#D97706` / bg `#FEF3C7` | Peringatan |
| danger | `#DC2626` / bg `#FEE2E2` | Error, aksi destruktif |

### Radius (hanya 4 nilai)
- `4px` — chip kecil
- `8px` — tombol, input, select, dropdown
- `12px` — card, tabel container, modal
- `999px` — badge/pill status

### Tipografi (hanya nilai ini)
- `22px/700` — judul halaman (h1)
- `16px/700` — judul section/modal
- `13px` — body default, isi tabel, tombol
- `12px` — teks sekunder, breadcrumb, pagination
- `11px/600 uppercase letterSpacing 0.5px` — label kolom tabel, label KPI
- Angka SELALU `fontVariantNumeric: "tabular-nums"`. Rupiah SELALU `Rp ` (dengan spasi) + `Intl.NumberFormat("id-ID")`, tanpa desimal.

### Ketinggian standar
- Tombol primer: `40px` | Tombol/input/select bar: `36px` | Baris tabel: padding `12px 16px`

---

## 2. Pola Halaman (copy-paste dari SalesOrder.tsx)

### Struktur halaman
```jsx
<div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
  {/* breadcrumb+header */} {/* KPI opsional */} {/* filter bar */} {/* konten */}
</div>
```

### Breadcrumb + Header
```jsx
<div style={{ flexShrink: 0 }}>
  <div style={{ fontSize: 12, color: "#EB5E28", marginBottom: 8 }}>
    Keuangan &nbsp;›&nbsp; <span style={{ fontWeight: 600 }}>Jurnal Umum</span>
  </div>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>Jurnal Umum</h1>
      <p style={{ fontSize: 13, color: "#52504A", marginTop: 4, marginBottom: 0 }}>Deskripsi singkat halaman</p>
    </div>
    {/* tombol primer di kanan */}
  </div>
</div>
```
Breadcrumb section: Operasional | Keuangan | Laporan | Armada | Master | Sistem.

### Tombol
```jsx
// PRIMER (satu per halaman, aksi utama)
<button style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px",
  background: "#EB5E28", color: "white", border: "none", borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Label</button>

// SEKUNDER (di filter bar / toolbar)
<button style={{ height: 36, padding: "0 14px", border: "1px solid #E2DDD6", borderRadius: 8,
  background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "#52504A", fontWeight: 500 }}>Label</button>

// DANGER: sama dengan sekunder tapi color: "#DC2626"; hover bg "#FEF2F2"
// Disabled: opacity 0.5 + cursor not-allowed — SELALU ada visual disabled
```

### KPI Card (jika halaman punya ringkasan)
```jsx
<div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
  <div style={{ flex: 1, background: "white", border: "1px solid #E2DDD6", borderRadius: 12,
    padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 14, background: "#FEF0E8",
      display: "flex", alignItems: "center", justifyContent: "center", color: "#EB5E28" }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B6862", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>LABEL</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#1A1A1A", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#52504A", marginTop: 2 }}>satuan</div>
    </div>
  </div>
</div>
```
Kombinasi icon bg/color: orange `#FEF0E8/#EB5E28`, biru `#DBEAFE/#2563EB`, hijau `#DCFCE7/#16A34A`, merah `#FEE2E2/#DC2626`, kuning `#FEF3C7/#D97706`.

### Filter Bar
```jsx
<div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
  background: "white", border: "1px solid #E2DDD6", borderRadius: 12, padding: "10px 16px" }}>
  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "#F8F6F3", borderRadius: 8, padding: "0 12px", height: 36 }}>
    <MagnifyingGlass size={16} style={{ color: "#6B6862" }} />
    <input style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#1A1A1A" }} />
  </div>
  <select style={{ height: 36, border: "1px solid #E2DDD6", borderRadius: 8, fontSize: 13,
    padding: "0 8px", background: "white", cursor: "pointer" }}>…</select>
</div>
```

### Tabel
```jsx
<div style={{ flex: 1, minHeight: 0, background: "white", border: "1px solid #E2DDD6",
  borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
  <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F8F6F3" }}>
        <tr><th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.5px", color: "#6B6862",
          borderBottom: "1px solid #E2DDD6", whiteSpace: "nowrap" }}>KOLOM</th></tr>
      </thead>
      <tbody>{/* td: padding "12px 16px", fontSize: 13, borderBottom: "1px solid #F0EBE4" */}</tbody>
    </table>
  </div>
  {/* pagination */}
</div>
```
- Hover baris: `#FAF8F5`. Kolom angka: `textAlign: right` + tabular-nums.
- ID/nomor dokumen: `fontSize 12, fontWeight 700, color "#EB5E28", fontFamily "monospace"`, klik → detail.
- Empty state WAJIB: `<td colSpan={n} style={{ padding: "64px 16px", textAlign: "center", fontSize: 13, color: "#6B6862" }}>Tidak ada data …</td>`

### Badge Status
```jsx
<span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
  whiteSpace: "nowrap", background: bg, color: color }}>{status}</span>
```

### Pagination (persis SalesOrder)
Footer tabel: `padding "12px 16px", borderTop "1px solid #E2DDD6"`, kiri teks "Menampilkan X - Y dari Z data" (12px `#52504A`), kanan tombol Prev/angka/Next 28×28px radius 6, aktif bg `#EB5E28` putih.

### Dropdown menu (kebab / export)
```jsx
<div style={{ position: "absolute", top: 32, right: 0, background: "white",
  border: "1px solid #E2DDD6", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
  zIndex: 30, minWidth: 160, overflow: "hidden" }}>
  <button style={{ display: "block", width: "100%", padding: "10px 14px", border: "none",
    background: "white", cursor: "pointer", fontSize: 12, color: "#1A1A1A", textAlign: "left", fontWeight: 500 }}>Aksi</button>
</div>
```

### Form (dalam ModalShell)
- Label: `fontSize 11, fontWeight 600, uppercase, letterSpacing 0.5px, color "#6B6862"`, field wajib tambah ` *`.
- Input/select: `height 40, border "1px solid #E2DDD6", borderRadius 8, fontSize 13, padding "0 12px"`, focus border `#EB5E28`.
- Footer form: bg `#F8F6F3`, border-top `#E2DDD6` — tombol Batal (ghost) kiri, aksi kanan.

---

## 3. Aturan Keras
1. JANGAN ubah logika bisnis/handler/API/permission saat redesign — hanya presentasi.
2. Setiap tabel WAJIB empty state; setiap async WAJIB loading state; setiap tombol disabled WAJIB terlihat disabled.
3. JANGAN pakai `#9B9690` untuk teks di atas putih — pakai `#6B6862`.
4. Rupiah: `Rp 12.500.000` — spasi setelah Rp, tanpa desimal, tabular-nums.
5. Mobile (UpdateMuatan): touch target minimal 40px; pola lain tetap sama.
6. Icon: Phosphor (`@phosphor-icons/react`) untuk halaman baru; ukuran 14–18 di tombol, 28 di KPI.
