/**
 * RUSTIKA — Sync proyek & progress dari Google Sheet ke aplikasi.
 *
 * Cara pasang:
 *   1. Buka Sheet → Extensions → Apps Script.
 *   2. Hapus isi default, tempel seluruh file ini.
 *   3. Ganti SYNC_SECRET dengan nilai yang sama seperti env SYNC_SECRET di Vercel.
 *   4. Save → muat ulang Sheet → muncul menu "Rustika" → "Sync ke Aplikasi".
 *
 * Kolom dibaca BERDASARKAN JUDUL di baris 1 (bukan posisi), jadi aman walau
 * urutan kolom diubah atau ada kolom baru disisipkan.
 *
 *   Tab "Proyek"  (baris 1 = judul, data mulai baris 2). Judul yang dikenali:
 *     Client | Kode Proyek | Nama Proyek | Tipe Proyek | Status |
 *     Koordinat | Alamat (atau Lokasi) | Tanggal Mulai | Tanggal Selesai |
 *     Nilai Kontrak
 *
 *   Tab "Progress" (baris 1 = judul, data mulai baris 2):
 *     Kode Proyek | Tanggal | Progress % | Catatan
 *
 * Catatan:
 *   - Proyek dicocokkan dengan yang sudah ada lewat KODE; kalau kode tidak
 *     cocok, dicocokkan lewat NAMA. Jadi tidak akan membuat proyek dobel.
 *   - "Koordinat" boleh format DMS (mis. 2°31'33"S 121°21'29"E) atau desimal
 *     (mis. -2.526, 121.358) → otomatis jadi titik di peta.
 *   - Status valid: PBG, SLF, PBG UNDER CONSTRUCTION, SLF UNDER CONSTRUCTION,
 *     CONSTRUCTION, DESIGN, SUPERVISI (kosong/typo -> DESIGN).
 *   - Tiap baris Progress = satu titik progres pada tanggal tsb (mengisi grafik).
 */

const ENDPOINT_URL = "https://rustika-client.vercel.app/api/sync/projects";
const SYNC_SECRET = "GANTI_DENGAN_NILAI_SYNC_SECRET_DARI_VERCEL";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Rustika")
    .addItem("Sync ke Aplikasi", "syncToApp")
    .addToUi();
}

function syncToApp() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const projects = readByHeader_(
    ss,
    "Proyek",
    {
      client: ["client"],
      code: ["kode proyek", "kode"],
      name: ["nama proyek", "nama"],
      type: ["tipe proyek", "tipe"],
      status: ["status"],
      coordinates: ["koordinat", "titik koordinat", "coordinate", "coordinates"],
      location: ["alamat", "lokasi", "location"],
      start_date: ["tanggal mulai", "mulai"],
      end_date: ["tanggal selesai", "selesai"],
      contract_value: ["nilai kontrak", "kontrak", "nilai"],
    },
    function (r) {
      if (!r.code && !r.name) return null; // butuh kode & nama
      return {
        client: r.client,
        code: r.code,
        name: r.name,
        type: r.type,
        status: r.status,
        coordinates: r.coordinates,
        location: r.location,
        start_date: fmtDate_(r.start_date),
        end_date: fmtDate_(r.end_date),
        contract_value: r.contract_value,
      };
    }
  );

  const progress = readByHeader_(
    ss,
    "Progress",
    {
      code: ["kode proyek", "kode"],
      date: ["tanggal", "date"],
      progress: ["progress %", "progress", "persen", "%"],
      note: ["catatan", "note", "keterangan"],
    },
    function (r) {
      if (!r.code || r.date === "" || r.date == null) return null; // butuh kode & tanggal
      return {
        code: r.code,
        date: fmtDate_(r.date),
        progress: r.progress,
        note: r.note,
      };
    }
  );

  if (projects.length === 0 && progress.length === 0) {
    ui.alert('Tidak ada data. Pastikan ada tab "Proyek" dan/atau "Progress".');
    return;
  }

  const res = UrlFetchApp.fetch(ENDPOINT_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-sync-secret": SYNC_SECRET },
    payload: JSON.stringify({ projects: projects, progress: progress }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) {
    ui.alert("Gagal sync (HTTP " + code + "):\n" + body);
    return;
  }

  const j = JSON.parse(body);
  let msg =
    "Sync selesai ✅\n\n" +
    "PROYEK — dibuat: " +
    j.projects.created +
    ", diperbarui: " +
    j.projects.updated +
    ", dilewati: " +
    j.projects.skipped +
    "\n" +
    "PROGRESS — baru: " +
    j.progress.inserted +
    ", diperbarui: " +
    j.progress.updated +
    ", dilewati: " +
    j.progress.skipped;
  if (j.errors && j.errors.length) {
    msg += "\n\nCatatan:\n- " + j.errors.join("\n- ");
  }
  ui.alert(msg);
}

/**
 * Baca sebuah tab dan petakan kolom berdasarkan JUDUL (baris 1).
 * fieldMap: { namaField: [alias judul, ...] } (alias huruf kecil).
 * mapFn menerima objek { namaField: nilai } per baris dan mengembalikan baris
 * akhir (atau null untuk dilewati).
 */
function readByHeader_(ss, name, fieldMap, mapFn) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });

  const colOf = {};
  Object.keys(fieldMap).forEach(function (field) {
    const aliases = fieldMap[field];
    let idx = -1;
    for (let a = 0; a < aliases.length; a++) {
      const found = headers.indexOf(aliases[a]);
      if (found !== -1) {
        idx = found;
        break;
      }
    }
    colOf[field] = idx;
  });

  const out = [];
  for (let i = 1; i < values.length; i++) {
    const rowVals = values[i];
    const rec = {};
    Object.keys(colOf).forEach(function (field) {
      rec[field] = colOf[field] === -1 ? "" : rowVals[colOf[field]];
    });
    const mapped = mapFn(rec);
    if (mapped) out.push(mapped);
  }
  return out;
}

function fmtDate_(v) {
  if (v === "" || v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v).trim();
}
