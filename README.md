# Bengkel Regresi Non-Linear

Aplikasi web interaktif (HTML/CSS/JavaScript murni, tanpa build step) untuk
eksplorasi data, pencocokan model regresi non-linear, diagnostik residual,
dan prediksi interaktif dengan perbandingan antar model.

## Struktur direktori

```
nlr-app/
├── index.html          # Kerangka HTML — memuat CSS & JS dalam urutan yang benar
├── css/
│   └── styles.css       # Semua styling. Token warna & font ada di :root
├── js/
│   ├── stats.js          # Fungsi matematika/statistik murni (tanpa DOM)
│   ├── models.js         # Definisi bentuk model regresi (poly, eksponensial, dst.)
│   ├── data.js            # Dataset contoh + parser CSV
│   ├── charts.js          # Helper styling Chart.js mengikuti tema terang/gelap
│   ├── theme.js            # Logika tombol ganti tema (Otomatis/Terang/Gelap)
│   └── app.js               # Orkestrasi UI — state, event listener, render
├── package.json          # Opsional, hanya untuk menjalankan dev server lokal
└── README.md
```

Setiap file JS menempel ke satu objek global `window.NLR` (`NLR.stats`,
`NLR.models`, `NLR.data`, `NLR.chartsHelper`) supaya tidak ada bentrok nama
variabel, tanpa perlu bundler atau `import`/`export` module. `app.js` dimuat
paling akhir dan memakai semua modul di atasnya.

## Menjalankan

**Cara tercepat:** buka `index.html` langsung di browser (klik dua kali, atau
`File > Open` dari browser). Semua skrip di sini adalah skrip biasa (bukan
`type="module"`), jadi aman dibuka langsung dari `file://` tanpa server.

**Direkomendasikan saat development:** jalankan server statis lokal supaya
perilaku persis seperti saat di-hosting (menghindari beberapa pembatasan
`file://` yang berbeda-beda antar browser):

```bash
# Python (sudah terpasang di banyak sistem)
python3 -m http.server 8000
# lalu buka http://localhost:8000

# atau, jika Node.js terpasang
npx serve .
```

Tidak ada langkah instalasi/build wajib — tidak ada `npm install` yang
diperlukan untuk sekadar menjalankan aplikasi ini.

## Dependensi eksternal

Dimuat dari CDN di `index.html`:
- **Chart.js 4.4.4** (`cdnjs.cloudflare.com`) — mesin grafik
- **Google Fonts**: Lora (judul), IBM Plex Sans (UI), IBM Plex Mono (angka/data)

Jika Anda butuh versi yang bekerja sepenuhnya offline, unduh berkas UMD
Chart.js dan simpan di `vendor/chart.umd.min.js`, lalu ganti tag `<script>`
di `index.html` agar mengarah ke file lokal tersebut. Untuk font, unduh berkas
`.woff2` dan definisikan `@font-face` sendiri di `css/styles.css`.

## Peta fitur → file

| Fitur di UI | Logika utama ada di |
|---|---|
| Tahap 1 — Data & EDA (statistik ringkasan, scatter plot, tabel cuplikan) | `app.js` → `renderEDA()`, dataset contoh di `data.js` |
| Unggah & parsing CSV | `data.js` → `parseCSV()`, dihubungkan di `app.js` |
| Tahap 2 — Pemilihan & pencocokan model | `models.js` (definisi model), `app.js` → `renderModelOptions()` & event `fitBtn` |
| Mesin pencocokan (least squares / Levenberg-Marquardt) | `stats.js` → `solveLinear()`, `simpleLinReg()`, `fitLM()` |
| Diagnostik (R², RMSE, residual, histogram) | `stats.js` → `computeMetrics()`, `app.js` → `renderDiagnosticsFor()` |
| Tahap 3 — Benchmark & prediksi interaktif | `app.js` → `renderBenchmark()`, `renderPrediction()`, `renderOverlay()` |
| Tema terang/gelap | `theme.js`, token warna di `css/styles.css` |

## Cara menambah model regresi baru

1. Buka `js/models.js`.
2. Tambahkan entri baru di objek `MODEL_DEFS` (ada contoh Michaelis-Menten
   dalam komentar di file tersebut sebagai templat). Setiap model butuh:
   - `label` — nama yang tampil di UI
   - `formulaTpl` — teks persamaan untuk ditampilkan
   - `needsPositiveX` — `true` jika model perlu X > 0
   - `fit(xs, ys, opts)` — mengembalikan `{ok:true, params, paramNames, predict, formula}`
     atau `{ok:false, message}` jika gagal
3. Jika model non-linear murni (bukan hasil transformasi linear), pakai
   `S.fitLM(modelFunc, initialParams, xs, ys)` seperti pada model
   eksponensial/logistik/gaussian yang sudah ada — Anda hanya perlu menebak
   parameter awal yang masuk akal.
4. Tambahkan warna baru di array `PALETTE` jika model bertambah lebih dari
   6 buah (agar tidak ada dua model berbagi warna yang sama di grafik).
5. Model baru otomatis muncul sebagai checkbox di Tahap 2 — tidak perlu
   mengubah `index.html` maupun `app.js`.

## Cara menambah dataset contoh baru

1. Buka `js/data.js`, tambahkan blok `else if(kind==="...")` baru di dalam
   `buildSample()` (ada contoh templat dalam komentar).
2. Tambahkan `<option value="...">Nama Dataset</option>` yang sesuai di
   `index.html` pada elemen `<select id="sampleSelect">`.

## Cara mengubah tampilan/tema

Semua warna, font, dan ukuran dasar didefinisikan sebagai custom property
CSS di bagian atas `css/styles.css` (`:root { --paper: ...; --ink: ...; }`
dst.), termasuk varian mode gelap. Ubah nilai di sana untuk mengganti palet
warna tanpa perlu menyentuh HTML atau JavaScript.

## Catatan tentang metode statistik

- **Polinomial**: regresi linear biasa pada basis `[1, x, x², ..., xᵈ]`
  memakai persamaan normal, diselesaikan dengan eliminasi Gauss-Jordan.
- **Power** (`y = a·xᵇ`) dan **Logaritmik** (`y = a + b·ln(x)`): dilinierkan
  lewat transformasi logaritma lalu diselesaikan secara eksak (bukan
  iteratif), sehingga selalu konvergen selama X (dan Y untuk power) positif.
- **Eksponensial**, **Logistik**, **Gaussian**: benar-benar non-linear dalam
  parameter, dicocokkan dengan algoritma Levenberg-Marquardt (implementasi
  sendiri di `stats.js`, Jacobian dihitung numerik). Bisa gagal konvergen
  pada data yang sangat berisik atau berpola tidak sesuai bentuk model —
  aplikasi akan menampilkan pesan kegagalan per model tanpa menghentikan
  model lain yang berhasil.
- **AIC** dihitung dengan rumus `n·ln(SSE/n) + 2k`, mengasumsikan residual
  berdistribusi normal — cukup untuk perbandingan relatif antar model pada
  dataset yang sama, tidak untuk perbandingan lintas dataset.

## Keterbatasan yang perlu diketahui

- Parser CSV sengaja sederhana (deteksi delimiter `,` `;` atau tab, tanpa
  dukungan nilai yang mengandung koma di dalam tanda kutip bersarang). Untuk
  CSV yang kompleks, pertimbangkan menambahkan pustaka seperti PapaParse.
- Tebakan parameter awal untuk model non-linear (LM) bersifat heuristik
  sederhana; untuk data dengan bentuk kurva yang sangat tidak biasa, Anda
  mungkin perlu menyesuaikan tebakan awal di `models.js`.
