/**
 * RUSTIKA — Sync proyek dari Google Sheet ke aplikasi.
 *
 * Cara pasang:
 *   1. Buka Sheet → Extensions → Apps Script.
 *   2. Hapus isi default, tempel seluruh file ini.
 *   3. Ganti SYNC_SECRET dengan nilai yang sama seperti env SYNC_SECRET di Vercel.
 *   4. Save → muat ulang Sheet → muncul menu "Rustika" → "Sync ke Aplikasi".
 *
 * Layout kolom (baris 1 = judul, data mulai baris 2):
 *   A Client | B Kode Proyek | C Nama Proyek | D Tipe Proyek | E Status |
 *   F Progress % | G Lokasi | H Tanggal Mulai | I Tanggal Selesai |
 *   J Nilai Kontrak | K Catatan Progress
 *
 * Status valid: PBG, SLF, PBG UNDER CONSTRUCTION, SLF UNDER CONSTRUCTION,
 *               CONSTRUCTION, DESIGN, SUPERVISI  (kosong/typo -> DESIGN)
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
  const sheet = SpreadsheetApp.getActiveSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    ui.alert("Tidak ada baris data untuk di-sync.");
    return;
  }

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[1] && !r[2]) continue; // lewati baris kosong (tanpa kode & nama)
    rows.push({
      client: r[0],
      code: r[1],
      name: r[2],
      type: r[3],
      status: r[4],
      progress: r[5],
      location: r[6],
      start_date: fmtDate_(r[7]),
      end_date: fmtDate_(r[8]),
      contract_value: r[9],
      note: r[10],
    });
  }
  if (rows.length === 0) {
    ui.alert("Tidak ada baris valid (pastikan kolom Kode & Nama terisi).");
    return;
  }

  const res = UrlFetchApp.fetch(ENDPOINT_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-sync-secret": SYNC_SECRET },
    payload: JSON.stringify(rows),
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
    "Sync selesai ✅\n\nDibuat: " +
    j.created +
    "\nDiperbarui: " +
    j.updated +
    "\nDilewati: " +
    j.skipped;
  if (j.errors && j.errors.length) {
    msg += "\n\nCatatan:\n- " + j.errors.join("\n- ");
  }
  ui.alert(msg);
}

function fmtDate_(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v).trim();
}
