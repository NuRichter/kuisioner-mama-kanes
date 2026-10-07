import "server-only";

/**
 * Peta penggunaan butir dan catatan peneliti dari kuisioner_lengkap.docx.
 * Modul ini hanya untuk area peneliti (server-only) dan tidak pernah dikirim
 * ke halaman responden.
 */

export type UsageCode = "D+A" | "D" | "A";

export interface Construct {
  id: string;
  name: string;
  short: string;
  items: string[];
  usage: UsageCode;
  dissertation: string;
  article: string;
  /** Konstruk pembentuk (untuk dimensi Kepercayaan terhadap platform). */
  parent?: string;
}

export const constructs: Construct[] = [
  { id: "FC_EXP", name: "Expertise finfluencer", short: "Expertise FC", items: ["FC_EXP1", "FC_EXP2", "FC_EXP3", "FC_EXP4"], usage: "D+A", dissertation: "Komponen konstruk orde kedua", article: "Artikel 2, konstruk berdiri sendiri" },
  { id: "FC_TRW", name: "Trustworthiness finfluencer", short: "Trustworthiness FC", items: ["FC_TRW1", "FC_TRW2", "FC_TRW3", "FC_TRW4"], usage: "D+A", dissertation: "Komponen konstruk orde kedua", article: "Artikel 2, konstruk berdiri sendiri" },
  { id: "RAC_CAP", name: "Capability robo advisor", short: "Capability RA", items: ["RAC_CAP1", "RAC_CAP2", "RAC_CAP3", "RAC_CAP4"], usage: "D+A", dissertation: "Komponen konstruk orde kedua", article: "Artikel 1, konstruk berdiri sendiri" },
  { id: "RAC_RSP", name: "Tanggung jawab sistem", short: "Tanggung jawab RA", items: ["RAC_RSP1", "RAC_RSP2", "RAC_RSP3", "RAC_RSP4", "RAC_RSP5"], usage: "D+A", dissertation: "Komponen konstruk orde kedua", article: "Artikel 1, konstruk berdiri sendiri" },
  { id: "INT", name: "Niat investasi", short: "Niat investasi", items: ["INT1", "INT2", "INT3"], usage: "D+A", dissertation: "Variabel terikat", article: "Variabel terikat keduanya" },
  { id: "TIP_COM", name: "Kepercayaan platform: kompetensi", short: "TIP kompetensi", items: ["TIP_COM1", "TIP_COM2", "TIP_COM3", "TIP_COM4"], usage: "D", dissertation: "Mediator utama", article: "Tidak dipakai", parent: "TIP" },
  { id: "TIP_INT", name: "Kepercayaan platform: integritas", short: "TIP integritas", items: ["TIP_INT1", "TIP_INT2", "TIP_INT3", "TIP_INT4"], usage: "D", dissertation: "Mediator utama", article: "Tidak dipakai", parent: "TIP" },
  { id: "TIP_BEN", name: "Kepercayaan platform: benevolensi", short: "TIP benevolensi", items: ["TIP_BEN1", "TIP_BEN2", "TIP_BEN3"], usage: "D", dissertation: "Mediator utama", article: "Tidak dipakai", parent: "TIP" },
  { id: "PR", name: "Persepsi risiko", short: "Persepsi risiko", items: ["PR1", "PR2", "PR3", "PR4", "PR5"], usage: "D", dissertation: "Moderator", article: "Tidak dipakai" },
  { id: "PSR", name: "Hubungan parasosial", short: "Parasosial", items: ["PSR1", "PSR2", "PSR3"], usage: "A", dissertation: "Tidak dipakai", article: "Artikel 2, mediator" },
  { id: "DIS", name: "Transparansi pengungkapan", short: "Transparansi", items: ["DIS1", "DIS2", "DIS3"], usage: "A", dissertation: "Tidak dipakai", article: "Artikel 2, moderator dan prediktor" },
  { id: "TRA", name: "Kepercayaan terhadap robo advisor", short: "Kepercayaan RA", items: ["TRA1", "TRA2", "TRA3"], usage: "A", dissertation: "Tidak dipakai", article: "Artikel 1, mediator" },
  { id: "AIL", name: "Literasi kecerdasan artifisial", short: "Literasi AI", items: ["AIL1", "AIL2", "AIL3"], usage: "A", dissertation: "Tidak dipakai", article: "Artikel 1, moderator" },
];

/** Gabungan untuk analisis tingkat lebih tinggi. */
export const composites = {
  /** Kepercayaan terhadap platform (11 butir). */
  TIP: ["TIP_COM1", "TIP_COM2", "TIP_COM3", "TIP_COM4", "TIP_INT1", "TIP_INT2", "TIP_INT3", "TIP_INT4", "TIP_BEN1", "TIP_BEN2", "TIP_BEN3"],
  /** Kredibilitas sumber manusia (orde kedua pada disertasi). */
  FC: ["FC_EXP1", "FC_EXP2", "FC_EXP3", "FC_EXP4", "FC_TRW1", "FC_TRW2", "FC_TRW3", "FC_TRW4"],
  /** Kredibilitas sumber sistem cerdas (orde kedua pada disertasi). */
  RAC: ["RAC_CAP1", "RAC_CAP2", "RAC_CAP3", "RAC_CAP4", "RAC_RSP1", "RAC_RSP2", "RAC_RSP3", "RAC_RSP4", "RAC_RSP5"],
} as const;

/** Item global untuk redundancy analysis. */
export const globalItems = [
  { code: "FC_GLOB", target: "FC" as const, label: "Kredibilitas finfluencer" },
  { code: "RAC_GLOB", target: "RAC" as const, label: "Kredibilitas robo advisor" },
];

/** Catatan peneliti nomor 7: target ukuran sampel. */
export const sampleTargets = [
  { manuscript: "Disertasi", floor: 400, target: [400, 400] as const, note: "Ditentukan oleh interaksi kepercayaan platform dan persepsi risiko" },
  { manuscript: "Artikel 2", floor: 300, target: [400, 400] as const, note: "H7 dapat diturunkan menjadi robustness apabila sampel terbatas" },
  { manuscript: "Artikel 1", floor: 500, target: [650, 700] as const, note: "Menuntut dua interaksi berlawanan arah terbukti bersamaan" },
  { manuscript: "Instrumen tunggal", floor: 500, target: [650, 700] as const, note: "Berlaku yang paling menuntut" },
];

/** Catatan peneliti nomor 3: validitas diskriminan kepercayaan sistem dan platform. */
export const discriminantRule = { a: "TRA", b: "TIP", threshold: 0.78 } as const;

/** Estimasi durasi dari informasi responden. */
export const durationEstimate = { minMinutes: 11, maxMinutes: 13 } as const;
