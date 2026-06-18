/**
 * RUSTIKA — Sync proyek & progress dari Google Sheet ke aplikasi.
 *
 * Cara pasang:
 *   1. Buka Sheet → Extensions → Apps Script.
 *   2. Hapus isi default, tempel seluruh file ini.
 *   3. Ganti SYNC_SECRET dengan nilai yang sama seperti env SYNC_SECRET di Vercel.
 *   4. Save → muat ulang Sheet → muncul menu "Rustika" → "Sync ke Aplikasi".
 *
 * Butuh DUA tab (nama persis):
 *
 *   Tab "Proyek"  (baris 1 = judul, data mulai baris 2):
 *     A Client | B Kode Proyek | C Nama Proyek | D Tipe Proyek | E Status |
 *     F Lokasi | G Tanggal Mulai | H Tanggal Selesai | I Nilai Kontrak
 *
 *   Tab "Progress" (baris 1 = judul, data mulai baris 2):
 *     A Kode Proyek | B Tanggal | C Progress % | D Catatan
 *
 * Status valid: PBG, SLF, PBG UNDER CONSTRUCTION, SLF UNDER CONSTRUCTION,
 *               CONSTRUCTION, DESIGN, SUPERVISI  (kosong/typo -> DESIGN)
 * Tiap baris Progress = satu titik progres pada tanggal tsb (mengisi grafik).
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

  const projects = readTab_(ss, "Proyek", function (r) {
    if (!r[1] && !r[2]) return null; // butuh kode & nama
    return {
      client: r[0],
      code: r[1],
      name: r[2],
      type: r[3],
      status: r[4],
      location: r[5],
      start_date: fmtDate_(r[6]),
      end_date: fmtDate_(r[7]),
      contract_value: r[8],
    };
  });

  const progress = readTab_(ss, "Progress", function (r) {
    if (!r[0] || r[1] === "" || r[1] == null) return null; // butuh kode & tanggal
    return {
      code: r[0],
      date: fmtDate_(r[1]),
      progress: r[2],
      note: r[3],
    };
  });

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

function readTab_(ss, name, mapFn) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = mapFn(values[i]);
    if (row) out.push(row);
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
