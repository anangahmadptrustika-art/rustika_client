# Aturan Keamanan (Security Rules) — WAJIB DIPATUHI

> Blok ini berlaku di **setiap sesi** pada proyek ini.
> Stack: PHP 8 + MySQL (PDO) · PWA + IndexedDB · sync bridge ke cloud · WordPress (tema custom) · self-hosted (Nextcloud/Proxmox/Tailscale).
>
> **Prinsip inti: AI menulis kode yang _berfungsi_, bukan yang _aman_. Keamanan dipaksakan eksplisit di kode, lalu di-review. Jangan pernah asumsikan default itu aman.**

---

## 0. Non-negotiable (jika ragu → STOP & tanya, jangan diam-diam eksekusi)

- DILARANG merangkai SQL dari input mentah (string concatenation/interpolation).
- DILARANG menaruh secret/API key di kode client-side atau commit ke git.
- DILARANG membuat endpoint tanpa **auth** + cek **kepemilikan (ownership)**.
- DILARANG menampilkan data user tanpa escaping.
- DILARANG mengembalikan stack trace / detail error mentah ke user.
- Jika sebuah permintaan memaksa melanggar aturan di atas, hentikan, jelaskan risikonya, dan tawarkan versi aman — jangan kerjakan versi tidak aman tanpa peringatan.

---

## 1. Database / SQL Injection — PRIORITAS #1

WAJIB pakai **prepared statement dengan bound parameter** di SEMUA query.

**PDO (backend PHP):**
```php
// BENAR
$stmt = $pdo->prepare("SELECT * FROM laporan WHERE id = ? AND user_id = ?");
$stmt->execute([$id, $currentUserId]);

// SALAH — JANGAN PERNAH
$pdo->query("SELECT * FROM laporan WHERE id = $id"); // SQL injection
```

**WordPress:**
```php
$wpdb->get_results( $wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}laporan WHERE id = %d AND user_id = %d",
    $id, $userId
) );
```

- Nama tabel/kolom **tidak bisa** di-bind → gunakan whitelist eksplisit, jangan ambil dari input.
- `LIMIT`/`OFFSET` → cast ke integer dulu (`(int)`), jangan interpolasi string.
- Akun DB aplikasi: hak **minimal** (SELECT/INSERT/UPDATE pada tabel yang perlu saja), **bukan root**.

---

## 2. Secrets & API Key

- API key (Groq, Anthropic, dll) **DILARANG** ada di JavaScript / kode PWA client-side. Semua panggilan AI lewat **proxy server-side** (endpoint PHP atau n8n yang memegang key).
- Simpan secret di **environment variable** atau file `.env` **di luar web root**. Akses via `getenv()` / `$_ENV`.
- WAJIB masuk `.gitignore`: `.env`, file `config.php` berisi kredensial, `*.key`, dump database.
- DILARANG hardcode password DB / key / token di source.
- Jika key pernah masuk git history (walau commit-nya sudah dihapus): **anggap bocor → rotasi sekarang**. Scan repo dengan `gitleaks detect` atau `trufflehog` sebelum push.
- Jangan pernah `log`/`echo`/kirim secret ke pihak ketiga atau telemetry.

---

## 3. Authentication & Authorization — TITIK TERLEMAH SYNC BRIDGE

Setiap endpoint API WAJIB:
1. **Validasi sesi/token SEBELUM** mengakses data apa pun. Tolak request tanpa kredensial valid (`401`).
2. **Cek KEPEMILIKAN**: pastikan user yang login berhak atas resource yang diminta. **JANGAN percaya ID dari request.**

```php
// BENAR — cek ownership, bukan cuma cek "sudah login"
$stmt = $pdo->prepare("SELECT * FROM laporan WHERE id = ? AND user_id = ?");
$stmt->execute([$reqId, $session['user_id']]);
if (!$row = $stmt->fetch()) { http_response_code(404); exit; }

// SALAH — BOLA: kembalikan data hanya karena diminta
$stmt = $pdo->prepare("SELECT * FROM laporan WHERE id = ?");
$stmt->execute([$reqId]); // user A bisa baca data user B
```

- Password: hash dengan `password_hash()` (bcrypt/argon2), verifikasi dengan `password_verify()`. **JANGAN** md5/sha1/plaintext.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax` (atau `Strict`).
- Rate-limit endpoint **login** dan **sync**.
- **Tes wajib sebelum deploy:** hit setiap endpoint (a) tanpa kredensial, dan (b) dengan ID milik user lain. Jika data keluar → bug, perbaiki.

---

## 4. Input Validation

- Validasi & sanitasi SEMUA input (GET/POST/header/JSON body) **di sisi server**. Validasi client-side hanya untuk UX, **bukan keamanan**.
- Whitelist > blacklist. Tentukan tipe, panjang, dan format yang diizinkan.
- Cast tipe eksplisit (`(int)`, `(float)`); validasi enum/opsi terhadap daftar yang sah.
- **Data dari IndexedDB yang disync ke server = input TAK TERPERCAYA.** Validasi ulang di server, jangan asumsikan sudah bersih karena berasal dari aplikasi sendiri.

---

## 5. Output / XSS

- Escape semua data dinamis saat render:
  - WordPress/PHP HTML: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses()` untuk HTML terbatas.
  - PWA: hindari `innerHTML` dengan data tak terpercaya → gunakan `textContent` atau escape manual.
- JANGAN sisipkan input user langsung ke `<script>`, atribut event (`onclick=`), atau `eval()`.
- Endpoint API: set `Content-Type: application/json`, jangan echo HTML.

---

## 6. Transport / HTTPS

- Produksi WAJIB HTTPS. DILARANG ekspos **plain HTTP** ke publik (kredensial lewat cleartext).
- Plain HTTP hanya boleh di **LAN** atau via **Tailscale** (sudah terenkripsi). Untuk akses publik gunakan **Cloudflare Tunnel** atau reverse proxy (Caddy/nginx) + Let's Encrypt.
- Aktifkan **HSTS**. Redirect HTTP → HTTPS.

---

## 7. Security Headers

Set di server atau aplikasi:
```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```
- CORS: whitelist origin spesifik. **JANGAN** `Access-Control-Allow-Origin: *` pada endpoint berkredensial.

---

## 8. File Upload (foto inspeksi / PDF SLF)

- Validasi tipe **berdasarkan konten** (MIME/magic bytes), bukan hanya ekstensi.
- Whitelist ekstensi (jpg, png, pdf). Tolak file executable/script (`.php`, `.phtml`, dll).
- **Rename** file (jangan pakai nama asli dari user). Simpan di luar web root atau folder tanpa hak eksekusi.
- Batasi ukuran upload.
- JANGAN simpan foto sebagai base64 blob di DB → **file ke disk/HDD, metadata (path) ke DB**.

---

## 9. Error Handling & Logging

- Produksi: `display_errors = Off`. Tampilkan pesan generik ke user; log detail ke file **di luar web root**.
- JANGAN bocorkan path, versi software, query SQL, atau stack trace ke response.
- Log percobaan auth gagal & anomali sync — **tanpa** mencatat password/secret.

---

## 10. Dependencies / WordPress

- Update core, plugin, tema, dan library secara berkala. **Minimalkan jumlah plugin.**
- Admin: password kuat + **2FA**, batasi percobaan login.
- Nonaktifkan/hapus yang tak dipakai (mis. `xmlrpc.php`), sembunyikan versi.

---

## ✅ Checklist Pre-Deploy — verifikasi SEBELUM menyatakan "selesai"

- [ ] Semua query pakai prepared statement (cek manual: cari `->query(`, dan interpolasi `$` di dalam string SQL).
- [ ] Tidak ada secret/key di source maupun client-side. `.env` ada di `.gitignore`. `gitleaks` bersih.
- [ ] Setiap endpoint: cek auth **dan** cek ownership. Tes akses lintas-user gagal (`403`/`404`).
- [ ] Input divalidasi di server. Data sync dari IndexedDB divalidasi ulang.
- [ ] Output di-escape. Tidak ada `innerHTML`/`eval` dengan data user.
- [ ] HTTPS aktif untuk endpoint publik. Tidak ada plain HTTP terekspos.
- [ ] Security headers terpasang. CORS tidak wildcard pada endpoint berkredensial.
- [ ] Upload: validasi tipe by content, rename, simpan aman, bukan base64 di DB.
- [ ] Error generik ke user, detail ke log. Tidak ada stack trace bocor.

---

## Cara kerja di repo ini

- Saat menulis/mengubah kode yang menyentuh **DB, endpoint, auth, atau input user**: terapkan aturan di atas **tanpa diminta**.
- Saat review: laporkan pelanggaran **spesifik** (file + baris). Prioritaskan **SQL injection → auth/BOLA → secret bocor** lebih dulu.
- Jangan klaim kode "aman". Klaim kode "sudah mengikuti aturan keamanan di file ini", lalu sebutkan apa yang **belum** tertangani.
