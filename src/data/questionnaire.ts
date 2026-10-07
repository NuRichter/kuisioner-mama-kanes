import type {
  FormSection,
  LikertSection,
  Option,
} from "@/types/questionnaire";

/**
 * Isi kuesioner bersumber dari kuisioner_lengkap.docx (Versi 3 final).
 * Redaksi dipertahankan apa adanya. Penandaan warna, kode D/A/S, kolom
 * "Dipakai", dan lembar catatan peneliti tidak ditampilkan kepada responden
 * sesuai ketentuan dokumen sumber.
 */

export const meta = {
  title:
    "Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital",
  author: "Irma Dwi Kusuma",
  year: 2026,
  likertCount: 53,
} as const;

export const respondentInfo = {
  heading: "Informasi untuk Responden",
  purpose:
    "Penelitian ini bertujuan memahami bagaimana calon investor menilai sumber informasi dan rekomendasi yang hadir dalam ekosistem investasi digital Bareksa, serta kaitannya dengan kepercayaan terhadap platform, persepsi risiko, dan niat investasi reksa dana.",
  duration:
    "Pengisian kuesioner ini memerlukan waktu sekitar 11 sampai 13 menit.",
  voluntary:
    "Partisipasi Anda bersifat sukarela. Anda berhak menghentikan pengisian sewaktu-waktu tanpa konsekuensi apa pun, dan jawaban yang belum diselesaikan tidak akan digunakan dalam analisis.",
  privacy:
    "Kuesioner ini tidak meminta nama, nomor telepon, alamat surel, nomor rekening, atau data akun Bareksa Anda. Jawaban disimpan pada penyimpanan digital yang dilindungi kata sandi, hanya dapat diakses oleh peneliti, dianalisis serta dilaporkan secara agregat, dan dimusnahkan paling lambat lima tahun setelah penelitian selesai.",
  noRightAnswer:
    "Tidak ada jawaban benar atau salah. Pilih jawaban yang paling menggambarkan penilaian Anda berdasarkan pengalaman dan informasi yang telah Anda miliki sebelum mengisi kuesioner.",
  /** Kalimat kontak. Alamat surel diisi melalui NEXT_PUBLIC_CONTACT_EMAIL. */
  contactLead:
    "Pertanyaan mengenai penelitian ini dapat disampaikan kepada Irma Dwi Kusuma, Fakultas Ekonomi dan Bisnis, Universitas Pembangunan Nasional Veteran Jawa Timur",
} as const;

export const consent = {
  id: "CONSENT",
  heading: "Persetujuan Berpartisipasi",
  statement:
    "Dengan memilih “Setuju”, saya menyatakan bahwa saya telah membaca informasi di atas, berusia sekurang-kurangnya 18 tahun, dan bersedia berpartisipasi secara sukarela dalam penelitian ini.",
  options: [
    { code: "1", label: "Setuju dan bersedia melanjutkan" },
    { code: "0", label: "Tidak setuju (pengisian dihentikan)" },
  ] satisfies Option[],
  agreeCode: "1",
} as const;

export const YES = "1";
export const NO = "0";

export const screening: FormSection = {
  kind: "form",
  id: "A",
  letter: "A",
  title: "Pertanyaan Penyaring",
  intro: [
    "Seluruh kriteria kelayakan pada bagian ini harus terpenuhi agar Anda dapat melanjutkan ke bagian utama kuesioner. Pengalaman investasi melalui platform lain tidak menggugurkan kelayakan Anda sebagai responden.",
  ],
  questions: [
    { id: "A1", number: "A1", kind: "yesno", text: "Apakah usia Anda saat ini sekurang-kurangnya 18 tahun?" },
    { id: "A2", number: "A2", kind: "yesno", text: "Apakah tahun lahir Anda berada pada rentang 1997 sampai 2012?" },
    { id: "A3", number: "A3", kind: "yesno", text: "Apakah Anda saat ini berdomisili di Indonesia?" },
    { id: "A4", number: "A4", kind: "yesno", text: "Apakah Anda memiliki akun Bareksa?" },
    { id: "A5", number: "A5", kind: "yesno", text: "Apakah Anda telah melakukan risk profiling pada Bareksa?" },
    { id: "A6", number: "A6", kind: "yesno", text: "Apakah Anda telah melihat rekomendasi yang diberikan oleh robo advisor Bareksa?" },
    { id: "A7", number: "A7", kind: "yesno", text: "Sebelum mengisi kuesioner ini, apakah Anda pernah mengakses informasi resmi Bareksa mengenai cara kerja atau rekomendasi robo advisor?" },
    { id: "A8", number: "A8", kind: "yesno", text: "Apakah Anda pernah terpapar konten finfluencer yang memiliki hubungan atau asosiasi yang dapat dikenali dengan Bareksa?" },
    { id: "A9", number: "A9", kind: "yesno", text: "Apakah Anda pernah melakukan transaksi investasi aktual melalui Bareksa?" },
  ],
};

/** Istilah yang dijelaskan pada awal Bagian A. */
export const glossary = [
  {
    term: "Finfluencer",
    definition:
      "Figur yang menyampaikan informasi atau edukasi keuangan dan investasi melalui media digital, dan dalam penelitian ini memiliki hubungan atau asosiasi yang dapat dikenali dengan Bareksa, misalnya melalui kanal resmi Bareksa, webinar, podcast, atau konten kolaborasi.",
  },
  {
    term: "Robo advisor Bareksa",
    definition:
      "Sistem yang menggunakan profil risiko pengguna untuk memberikan rekomendasi investasi.",
  },
] as const;

/** Kriteria kelayakan tahap awal: A1 sampai A8 = Ya dan A9 = Tidak. */
export const eligibilityRule = {
  mustBeYes: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"],
  mustBeNo: ["A9"],
} as const;

export const basis: FormSection = {
  kind: "form",
  id: "BASIS",
  title: "Konfirmasi Basis Penilaian",
  questions: [
    {
      id: "A10",
      number: "A10",
      kind: "multi",
      minSelected: 1,
      text: "Kanal resmi Bareksa yang pernah Anda gunakan untuk memperoleh informasi mengenai robo advisor. Pilih sekurang-kurangnya satu, boleh lebih dari satu.",
      options: [
        { code: "1", label: "Aplikasi Bareksa" },
        { code: "2", label: "Situs web atau artikel resmi Bareksa" },
        { code: "3", label: "Media sosial resmi Bareksa" },
        { code: "4", label: "Webinar, video, atau podcast resmi Bareksa" },
        {
          code: "5",
          label: "Kanal resmi Bareksa lainnya",
          textField: { id: "A10_other", label: "Sebutkan kanal resmi Bareksa lainnya", maxLength: 160 },
        },
      ],
    },
    {
      id: "A11",
      number: "A11",
      kind: "single",
      text: "Jika Anda pernah melihat lebih dari satu finfluencer yang memiliki hubungan atau asosiasi dengan Bareksa, pilih satu figur yang kontennya paling sering Anda lihat terkait Bareksa. Jika Anda hanya pernah melihat satu figur, gunakan figur tersebut. Apakah Anda dapat mengingat satu figur itu dengan cukup jelas untuk digunakan sebagai satu-satunya acuan ketika menjawab seluruh pertanyaan mengenai finfluencer?",
      options: [
        {
          code: "1",
          label: "Ya",
          textField: { id: "A11_figure", label: "Tuliskan nama atau akun figur tersebut", maxLength: 120 },
        },
        { code: "0", label: "Tidak (pengisian dihentikan)" },
      ],
      note: "Nama atau akun yang Anda tuliskan hanya digunakan untuk memastikan kelayakan Anda sebagai responden dan menjaga agar acuan penilaian Anda tetap sama sepanjang pengisian. Nama tersebut tidak akan dilaporkan secara individual dan tidak dikaitkan dengan identitas Anda. Penilaian Anda terhadap figur tersebut dianalisis secara agregat bersama seluruh responden lain dan tidak akan digunakan untuk menilai figur mana pun secara individual.",
    },
    {
      id: "A12",
      number: "A12",
      kind: "single",
      text: "Kapan terakhir kali Anda melihat konten dari finfluencer yang menjadi acuan pada A11?",
      options: [
        { code: "1", label: "Dalam 1 bulan terakhir" },
        { code: "2", label: "Lebih dari 1 sampai 3 bulan yang lalu" },
        { code: "3", label: "Lebih dari 3 sampai 6 bulan yang lalu" },
        { code: "4", label: "Lebih dari 6 sampai 12 bulan yang lalu" },
        { code: "5", label: "Lebih dari 12 bulan yang lalu" },
        { code: "6", label: "Tidak ingat pasti" },
      ],
    },
    {
      id: "A13",
      number: "A13",
      kind: "single",
      text: "Dalam satu bulan terakhir, seberapa sering Anda melihat konten dari figur yang Anda pilih pada A11?",
      options: [
        { code: "1", label: "Belum pernah dalam satu bulan terakhir" },
        { code: "2", label: "1 sampai 2 kali" },
        { code: "3", label: "3 sampai 5 kali" },
        { code: "4", label: "6 sampai 10 kali" },
        { code: "5", label: "Lebih dari 10 kali" },
      ],
    },
  ],
};

/** A11 = Tidak menghentikan pengisian. */
export const figureRule = { questionId: "A11", continueCode: "1" } as const;

export const PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
] as const;

export const profile: FormSection = {
  kind: "form",
  id: "B",
  letter: "B",
  title: "Karakteristik Responden",
  questions: [
    {
      id: "B1",
      number: "B1",
      kind: "year",
      text: "Tahun lahir",
      min: 1997,
      max: 2012,
      rangeMessage:
        "Tahun lahir perlu berada pada rentang 1997 sampai 2012, sesuai jawaban Anda pada A2.",
    },
    {
      id: "B2",
      number: "B2",
      kind: "text",
      text: "Provinsi domisili",
      maxLength: 80,
      autoComplete: "off",
      suggestions: PROVINCES,
    },
    {
      id: "B3",
      number: "B3",
      kind: "single",
      text: "Jenis kelamin",
      options: [
        { code: "1", label: "Perempuan" },
        { code: "2", label: "Laki-laki" },
        { code: "3", label: "Memilih tidak menjawab" },
      ],
    },
    {
      id: "B4",
      number: "B4",
      kind: "single",
      text: "Pendidikan terakhir",
      options: [
        { code: "1", label: "SMA/sederajat" },
        { code: "2", label: "Diploma" },
        { code: "3", label: "Sarjana" },
        { code: "4", label: "Pascasarjana" },
        {
          code: "5",
          label: "Lainnya",
          textField: { id: "B4_other", label: "Sebutkan pendidikan terakhir Anda", maxLength: 80 },
        },
      ],
    },
    {
      id: "B5",
      number: "B5",
      kind: "single",
      text: "Kegiatan utama saat ini",
      options: [
        { code: "1", label: "Pelajar atau mahasiswa" },
        { code: "2", label: "Bekerja" },
        { code: "3", label: "Wirausaha" },
        { code: "4", label: "Belum bekerja" },
        {
          code: "5",
          label: "Lainnya",
          textField: { id: "B5_other", label: "Sebutkan kegiatan utama Anda", maxLength: 80 },
        },
      ],
    },
    {
      id: "B6",
      number: "B6",
      kind: "single",
      text: "Sudah berapa lama Anda berinvestasi melalui platform selain Bareksa?",
      options: [
        { code: "1", label: "Belum pernah berinvestasi melalui platform lain" },
        { code: "2", label: "Kurang dari 6 bulan" },
        { code: "3", label: "6 bulan sampai kurang dari 1 tahun" },
        { code: "4", label: "1 tahun sampai kurang dari 3 tahun" },
        { code: "5", label: "3 tahun atau lebih" },
      ],
    },
  ],
};

export const likertGuide = {
  heading: "Petunjuk Pengisian Bagian C sampai Bagian K",
  lead: "Berikan penilaian terhadap setiap pernyataan dengan menggunakan skala berikut.",
  closing:
    "Mohon isi seluruh pernyataan dan bacalah setiap pernyataan dengan saksama sebelum menjawab.",
} as const;

export const LIKERT_SCALE = [
  { value: "1", label: "Sangat Tidak Setuju" },
  { value: "2", label: "Tidak Setuju" },
  { value: "3", label: "Netral" },
  { value: "4", label: "Setuju" },
  { value: "5", label: "Sangat Setuju" },
] as const;

const sectionC: LikertSection = {
  kind: "likert",
  id: "C",
  letter: "C",
  title: "Kredibilitas Sumber Manusia (Finfluencer)",
  instruction:
    "Gunakan satu finfluencer yang telah Anda pilih pada A11 sebagai satu-satunya acuan ketika menjawab seluruh pernyataan pada bagian ini. Jangan mengganti figur acuan di tengah pengisian.",
  items: [
    { code: "FC_EXP1", text: "Finfluencer memiliki pengetahuan yang luas mengenai investasi reksa dana." },
    { code: "FC_EXP2", text: "Finfluencer kompeten dalam memberikan informasi atau pandangan mengenai investasi reksa dana." },
    { code: "FC_EXP3", text: "Finfluencer merupakan ahli dalam bidang investasi reksa dana yang dibahasnya." },
    { code: "FC_EXP4", text: "Finfluencer memiliki pengalaman yang memadai untuk memberikan informasi atau pandangan mengenai investasi reksa dana." },
    { code: "FC_TRW1", text: "Finfluencer menyampaikan informasi investasi reksa dana secara jujur." },
    { code: "FC_TRW2", text: "Finfluencer layak dipercaya sebagai sumber informasi investasi reksa dana." },
    { code: "FC_TRW3", text: "Finfluencer menyampaikan informasi investasi reksa dana secara benar." },
    { code: "FC_TRW4", text: "Finfluencer menunjukkan kesungguhan dalam menyampaikan informasi investasi reksa dana." },
  ],
};

const sectionD: LikertSection = {
  kind: "likert",
  id: "D",
  letter: "D",
  title: "Kredibilitas Sumber Sistem Cerdas (Robo Advisor)",
  instruction:
    "Jawablah berdasarkan pengalaman Anda ketika berinteraksi dengan robo advisor Bareksa serta informasi resmi Bareksa mengenai sistem tersebut yang sudah pernah Anda akses sebelum mengisi kuesioner. Anda tidak perlu mencari informasi baru saat menjawab bagian ini.",
  items: [
    { code: "RAC_CAP1", text: "Rekomendasi robo advisor Bareksa mencerminkan preferensi investasi reksa dana saya." },
    { code: "RAC_CAP2", text: "Rekomendasi robo advisor Bareksa sesuai dengan kebutuhan investasi reksa dana saya." },
    { code: "RAC_CAP3", text: "Rekomendasi investasi reksa dana yang diberikan robo advisor Bareksa akurat." },
    { code: "RAC_CAP4", text: "Rekomendasi investasi reksa dana yang diberikan robo advisor Bareksa secara umum tepat." },
    { code: "RAC_RSP1", text: "Menurut saya, robo advisor Bareksa memberikan penjelasan yang memadai atas rekomendasi investasi reksa dana yang diberikannya." },
    { code: "RAC_RSP2", text: "Informasi yang menjadi dasar rekomendasi robo advisor Bareksa dapat ditelusuri kembali." },
    { code: "RAC_RSP3", text: "Robo advisor Bareksa tidak menyajikan rekomendasi investasi reksa dana yang menyesatkan." },
    { code: "RAC_RSP4", text: "Menurut saya, robo advisor Bareksa cukup terbuka dalam menyampaikan kemampuan dan keterbatasannya dalam memberikan rekomendasi investasi reksa dana." },
    { code: "RAC_RSP5", text: "Robo advisor Bareksa memberikan rekomendasi produk investasi reksa dana secara netral tanpa mengutamakan produk tertentu." },
  ],
};

const sectionE: LikertSection = {
  kind: "likert",
  id: "E",
  letter: "E",
  title: "Kepercayaan terhadap Platform Bareksa",
  instruction:
    "Pada bagian ini, yang dinilai adalah Bareksa sebagai penyedia layanan investasi digital, bukan finfluencer maupun robo advisor sebagai sumber informasi dan rekomendasi.",
  items: [
    { code: "TIP_COM1", text: "Saya meyakini Bareksa kompeten dan efektif dalam menyediakan layanan investasi reksa dana." },
    { code: "TIP_COM2", text: "Saya meyakini Bareksa mampu menjalankan perannya sebagai penyedia layanan investasi reksa dana dengan baik." },
    { code: "TIP_COM3", text: "Secara keseluruhan, saya menilai Bareksa sebagai penyedia layanan investasi reksa dana yang kapabel dan profesional." },
    { code: "TIP_COM4", text: "Saya meyakini Bareksa memiliki pengetahuan yang memadai mengenai layanan investasi reksa dana yang disediakannya." },
    { code: "TIP_INT1", text: "Saya meyakini Bareksa bertindak jujur dalam menyediakan layanan investasi reksa dana kepada saya." },
    { code: "TIP_INT2", text: "Secara keseluruhan, saya menilai Bareksa sebagai platform investasi reksa dana yang jujur." },
    { code: "AC1", text: "Untuk memastikan ketelitian pengisian, mohon pilih “Tidak Setuju” pada pernyataan ini." },
    { code: "TIP_INT3", text: "Saya meyakini Bareksa akan memenuhi komitmen layanan yang diberikan kepada investor reksa dana." },
    { code: "TIP_INT4", text: "Saya meyakini Bareksa menunjukkan kesungguhan dalam memberikan layanan investasi reksa dana kepada investor." },
    { code: "TIP_BEN1", text: "Saya meyakini Bareksa akan bertindak dengan mempertimbangkan kepentingan terbaik saya sebagai calon investor reksa dana." },
    { code: "TIP_BEN2", text: "Jika saya membutuhkan bantuan terkait layanan investasi reksa dana, Bareksa akan berupaya memberikan bantuan terbaik kepada saya." },
    { code: "TIP_BEN3", text: "Saya meyakini Bareksa memperhatikan kepentingan saya sebagai calon investor reksa dana, bukan hanya kepentingan bisnisnya sendiri." },
  ],
};

const sectionF: LikertSection = {
  kind: "likert",
  id: "F",
  letter: "F",
  title: "Niat Investasi",
  instruction:
    "Pernyataan berikut mengacu pada niat melakukan investasi reksa dana melalui Bareksa pada masa mendatang.",
  items: [
    { code: "INT1", text: "Saya memperkirakan bahwa saya akan berinvestasi reksa dana melalui Bareksa." },
    { code: "INT2", text: "Saya ingin berinvestasi reksa dana melalui Bareksa." },
    { code: "INT3", text: "Saya berniat berinvestasi reksa dana melalui Bareksa." },
  ],
};

const sectionG: LikertSection = {
  kind: "likert",
  id: "G",
  letter: "G",
  title: "Persepsi Risiko",
  instruction:
    "Pada bagian ini, risiko yang dinilai adalah risiko dari tindakan berinvestasi reksa dana melalui Bareksa, bukan risiko teknis penggunaan aplikasi atau platform.",
  items: [
    { code: "PR1", text: "Secara keseluruhan, keputusan berinvestasi reksa dana melalui Bareksa berisiko." },
    { code: "PR2", text: "Berinvestasi reksa dana melalui Bareksa mengandung risiko." },
    { code: "AC2", text: "Untuk memastikan ketelitian pengisian, mohon pilih “Setuju” pada pernyataan ini." },
    { code: "PR3", text: "Berinvestasi reksa dana melalui Bareksa dapat membawa risiko yang serius bagi saya." },
    { code: "PR4", text: "Berinvestasi reksa dana melalui Bareksa menimbulkan ketidakpastian yang cukup besar bagi saya." },
    { code: "PR5", text: "Berinvestasi reksa dana melalui Bareksa membuat saya menghadapi risiko secara keseluruhan." },
  ],
};

const sectionH: LikertSection = {
  kind: "likert",
  id: "H",
  letter: "H",
  title: "Penilaian Keseluruhan",
  instruction:
    "Bagian ini meminta kesan menyeluruh Anda terhadap kedua sumber yang telah dinilai pada Bagian C dan Bagian D. Jawablah berdasarkan kesan keseluruhan Anda, bukan dengan mengingat kembali jawaban Anda pada bagian sebelumnya.",
  items: [
    { code: "FC_GLOB", text: "Secara keseluruhan, saya menilai finfluencer tersebut sebagai sumber informasi investasi reksa dana yang kredibel." },
    { code: "RAC_GLOB", text: "Secara keseluruhan, saya menilai robo advisor Bareksa sebagai sumber rekomendasi investasi reksa dana yang kredibel." },
  ],
};

const sectionI: LikertSection = {
  kind: "likert",
  id: "I",
  letter: "I",
  title: "Hubungan dengan Figur Acuan",
  instruction:
    "Pernyataan berikut mengacu pada figur yang Anda pilih pada A11. Gunakan figur yang sama seperti pada Bagian C.",
  items: [
    { code: "PSR1", text: "Saya merasa mengenal finfluencer tersebut seperti mengenal seorang teman." },
    { code: "PSR2", text: "Saya menantikan konten baru dari finfluencer tersebut." },
    { code: "PSR3", text: "Saya merasa finfluencer tersebut memahami situasi keuangan orang seperti saya." },
    { code: "AC3", text: "Untuk memastikan ketelitian pengisian, mohon pilih “Sangat Tidak Setuju” pada pernyataan ini." },
    { code: "DIS1", text: "Finfluencer tersebut menyatakan secara terbuka ketika kontennya merupakan bagian dari kerja sama komersial." },
    { code: "DIS2", text: "Finfluencer tersebut menjelaskan kemungkinan adanya kepentingan pribadi atas produk yang dibahasnya." },
    { code: "DIS3", text: "Saya dapat membedakan dengan jelas kapan finfluencer tersebut sedang mengedukasi dan kapan sedang mempromosikan produk." },
  ],
};

const sectionJ: LikertSection = {
  kind: "likert",
  id: "J",
  letter: "J",
  title: "Kepercayaan terhadap Sistem Rekomendasi",
  instruction:
    "Pada bagian ini, yang dinilai adalah robo advisor Bareksa sebagai sistem rekomendasi, bukan Bareksa sebagai penyedia layanan.",
  items: [
    { code: "TRA1", text: "Saya merasa dapat mengandalkan robo advisor Bareksa ketika mempertimbangkan pilihan reksa dana." },
    { code: "TRA2", text: "Saya merasa nyaman menjadikan rekomendasi robo advisor Bareksa sebagai dasar pertimbangan investasi saya." },
    { code: "TRA3", text: "Saya meyakini robo advisor Bareksa bekerja untuk kepentingan saya sebagai pengguna." },
  ],
};

const sectionK: LikertSection = {
  kind: "likert",
  id: "K",
  letter: "K",
  title: "Pemahaman terhadap Sistem Cerdas",
  instruction:
    "Pernyataan berikut mengacu pada pemahaman Anda secara umum, tidak khusus mengenai Bareksa.",
  items: [
    { code: "AIL1", text: "Saya memahami bagaimana sistem rekomendasi berbasis kecerdasan artifisial menghasilkan sarannya." },
    { code: "AIL2", text: "Saya mengetahui bahwa hasil rekomendasi sistem kecerdasan artifisial dipengaruhi oleh data yang digunakan untuk melatihnya." },
    { code: "AIL3", text: "Saya mampu menilai apakah suatu rekomendasi dari sistem kecerdasan artifisial masuk akal atau tidak." },
  ],
};

export const likertSections = {
  C: sectionC,
  D: sectionD,
  E: sectionE,
  F: sectionF,
  G: sectionG,
  H: sectionH,
  I: sectionI,
  J: sectionJ,
  K: sectionK,
} as const;

/** Urutan dasar instrumen. Hanya C dan D yang diacak antarversi form. */
export const likertOrderBase = ["C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;

/**
 * Aturan attention check dari catatan peneliti: AC1 lolos pada skor 2,
 * AC2 pada skor 4, dan AC3 pada skor 1. Dipakai hanya untuk ekspor data
 * peneliti, tidak pernah ditampilkan kepada responden.
 */
export const attentionChecks = { AC1: "2", AC2: "4", AC3: "1" } as const;

export const closing =
  "Terima kasih atas waktu dan partisipasi Anda. Jawaban Anda sangat berarti bagi penelitian ini.";
