/**
 * Template baku "Laporan Realisasi Progres" (PBG / SLF) — sesuai format PDF
 * Rustika. Struktur 3 tingkat: Tahap → Sub-tahap → Item. Tiap item punya
 * BOBOT (porsi terhadap 100%). Pengguna mengisi PERSEN PENYELESAIAN (0–100)
 * tiap item; kontribusi = bobot × penyelesaian/100; total = progres proyek.
 *
 * Total seluruh bobot item = 100%.
 */

export type RealisasiItem = { key: string; name: string; bobot: number };
export type RealisasiSubStage = { key: string; name: string; items: RealisasiItem[] };
export type RealisasiStage = { key: string; name: string; items: RealisasiSubStage[] };

/** Map item key → persen penyelesaian (0–100). */
export type RealisasiMap = Record<string, number>;

export const REALISASI_TEMPLATE: RealisasiStage[] = [
  {
    key: "1",
    name: "Tahap Persiapan & Dokumen",
    items: [
      {
        key: "1.1",
        name: "Kick Off & Request Dokumen",
        items: [
          { key: "1.1.1", name: "START PROJECT DITANDAI DENGAN PERMOHONAN SURAT", bobot: 1.67 },
          { key: "1.1.2", name: "REVIEW DOKUMEN INPUT", bobot: 1.67 },
          { key: "1.1.3", name: "PEMBOBOTAN DOKUMEN YANG MASUK TERKIRIM VIA EMAIL", bobot: 1.66 },
        ],
      },
      {
        key: "1.2",
        name: "Submission Shop Drawing",
        items: [
          { key: "1.2.1", name: "LAYOUTING GAMBAR YANG MASUK VIA EMAIL", bobot: 5.0 },
          { key: "1.2.2", name: "RE DRAWING ( SLF / PBG )", bobot: 20.0 },
        ],
      },
    ],
  },
  {
    key: "2",
    name: "Tahap Pendaftaran & Pemeriksaan Awal",
    items: [
      {
        key: "2.1",
        name: "Registrasi & Initial Review",
        items: [
          { key: "2.1.1", name: "REGISTRASI DOKUMEN BANGUNAN / GEDUNG", bobot: 2.5 },
          { key: "2.1.2", name: "INITIAL REVIEW DATA BANGUNAN / GEDUNG", bobot: 2.5 },
        ],
      },
    ],
  },
  {
    key: "3",
    name: "Tahap Lapangan & Pengurusan SLF",
    items: [
      {
        key: "3.1",
        name: "Inspeksi Lapangan",
        items: [
          { key: "3.1.1", name: "PENENTUAN LOKASI SURVEY", bobot: 1.5 },
          { key: "3.1.2", name: "PERSIAPAN PERALATAN DAN TENAGA SURVEY", bobot: 2.5 },
          { key: "3.1.3", name: "DOKUMEN SURVEY", bobot: 3.5 },
          { key: "3.1.4", name: "SURVEY", bobot: 7.5 },
        ],
      },
      {
        key: "3.2",
        name: "Compliance Check",
        items: [
          { key: "3.2.1", name: "PEMERIKSAAN DATA DENGAN EKSISTING", bobot: 2.5 },
          { key: "3.2.2", name: "PEMBOBOTAN DOKUMEN", bobot: 7.5 },
        ],
      },
    ],
  },
  {
    key: "4",
    name: "Tahap Revisi",
    items: [
      {
        key: "4.1",
        name: "Revisi & Final Approval",
        items: [
          { key: "4.1.1", name: "REVISI DOKUMEN DENGAN EKSISTING BANGUNAN / GEDUNG", bobot: 3.0 },
          { key: "4.1.2", name: "CEK LIST DOKUMEN BANGUNAN / GEDUNG", bobot: 2.0 },
          { key: "4.1.3", name: "UPLOAD DOKUMEN ( DRAFT )", bobot: 5.0 },
        ],
      },
      {
        key: "4.2",
        name: "Penerbitan SKRD",
        items: [
          { key: "4.2.1", name: "PERHITUNGAN LUASAN RETRIBUSI BANGUNAN / GEDUNG", bobot: 3.5 },
          { key: "4.2.2", name: "INPUT DATA DOKUMEN BANGUNAN / GEDUNG", bobot: 1.5 },
        ],
      },
    ],
  },
  {
    key: "5",
    name: "Tahap Review Teknis & Sidang Pleno",
    items: [
      {
        key: "5.1",
        name: "Technical Review",
        items: [
          { key: "5.1.1", name: "CEK LIST DATA DOKUMEN BANGUNAN / GEDUNG", bobot: 3.0 },
          { key: "5.1.2", name: "PLOTTING GAMBAR KERJA", bobot: 6.0 },
          { key: "5.1.3", name: "UPLOAD DOKUMEN ( REGISTRASI )", bobot: 1.0 },
        ],
      },
      {
        key: "5.2",
        name: "Sidang TPA/Tim Teknis",
        items: [
          { key: "5.2.1", name: "PENENTUAN JADWAL SIDANG", bobot: 2.0 },
          { key: "5.2.2", name: "PELAKSANAAN SIDANG", bobot: 3.0 },
        ],
      },
    ],
  },
  {
    key: "6",
    name: "Tahap Akhir & Penerbitan PBG / SLF",
    items: [
      {
        key: "6.1",
        name: "Finalisasi & Rilis Sertifikat",
        items: [
          { key: "6.1.1", name: "REVISI HASIL SIDANG", bobot: 7.0 },
          { key: "6.1.2", name: "PENERTIBAN SERTIFIKAT PBG / SLF", bobot: 3.0 },
        ],
      },
    ],
  },
];

function clampPct(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** All leaf items, flattened. */
export function realisasiLeaves(): RealisasiItem[] {
  return REALISASI_TEMPLATE.flatMap((s) => s.items.flatMap((ss) => ss.items));
}

/** Sum of an item's bobot weighted by completion (its contribution to 100%). */
export function itemContribution(item: RealisasiItem, map: RealisasiMap): number {
  return round2((item.bobot * clampPct(map[item.key])) / 100);
}

/** Total bobot of a sub-stage / stage. */
export function subStageBobot(sub: RealisasiSubStage): number {
  return round2(sub.items.reduce((s, it) => s + it.bobot, 0));
}
export function stageBobot(stage: RealisasiStage): number {
  return round2(stage.items.reduce((s, ss) => s + subStageBobot(ss), 0));
}

/** Realized contribution of a sub-stage / stage / whole project (in % of 100). */
export function subStageProgress(sub: RealisasiSubStage, map: RealisasiMap): number {
  return round2(sub.items.reduce((s, it) => s + itemContribution(it, map), 0));
}
export function stageProgress(stage: RealisasiStage, map: RealisasiMap): number {
  return round2(stage.items.reduce((s, ss) => s + subStageProgress(ss, map), 0));
}

/** Overall project realisasi (0–100), = the project progress shown to clients. */
export function projectRealisasiTotal(map: RealisasiMap): number {
  return round2(
    REALISASI_TEMPLATE.reduce((s, stage) => s + stageProgress(stage, map), 0)
  );
}

/** Keep only known leaf keys, clamped to 0–100. */
export function sanitizeRealisasiMap(input: unknown): RealisasiMap {
  const valid = new Set(realisasiLeaves().map((l) => l.key));
  const out: RealisasiMap = {};
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (valid.has(k)) out[k] = clampPct(v);
    }
  }
  return out;
}
