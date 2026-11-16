/**
 * Isi QnA awal Cliploo — pertanyaan yang paling sering ditanyakan pembeli & penjual.
 * Diambil dari copy di app cliploo-mobile (Pusat Bantuan, Garansi Bebas Pengembalian,
 * Garansi 100% Ori, buka toko). Yang belum pasti ditulis umum; cek ulang sebelum rilis.
 *
 * `keywords` = sinonim/bahasa sehari-hari supaya pencarian FTS tetap kena walau user
 * pakai kata lain ("nyampe", "balikin duit", dll).
 */

export type Category = { slug: string; name: string };

export const CATEGORIES: Category[] = [
  { slug: "akun", name: "Akun" },
  { slug: "pembayaran", name: "Pembayaran" },
  { slug: "pengiriman", name: "Pengiriman" },
  { slug: "pesanan", name: "Pesanan" },
  { slug: "pembatalan", name: "Pembatalan" },
  { slug: "pengembalian", name: "Pengembalian & Dana" },
  { slug: "garansi-ori", name: "Garansi 100% Ori" },
  { slug: "voucher", name: "Voucher & Promo" },
  { slug: "live-video", name: "Cliploo Live & Video" },
  { slug: "jualan", name: "Jualan di Cliploo" },
  { slug: "keamanan", name: "Keamanan" },
];

export type Faq = {
  /** ID tetap — dipakai sebagai label model. Jangan diubah; FAQ baru pakai angka berikutnya. */
  id: number;
  category: string;
  question: string;
  answer: string;
  keywords: string;
};

export const FAQS: Faq[] = [
  // ───────────── Akun ─────────────
  {
    id: 1,
    category: "akun",
    question: "Bagaimana cara daftar akun Cliploo?",
    answer:
      "Buka aplikasi Cliploo, pilih **Daftar**, lalu masuk dengan nomor HP atau akun Google/Apple. Masukkan kode verifikasi (OTP) yang dikirim lewat SMS atau WhatsApp, lalu lengkapi nama dan foto profil.",
    keywords: "register buat akun bikin akun sign up registrasi baru",
  },
  {
    id: 2,
    category: "akun",
    question: "Saya tidak menerima kode OTP, harus bagaimana?",
    answer:
      "Coba langkah berikut:\n1. Pastikan nomor HP yang dimasukkan benar dan sinyal stabil.\n2. Tunggu 60 detik, lalu pilih **Kirim ulang**.\n3. Pilih **Metode Lain** untuk menerima OTP lewat WhatsApp.\n4. Cek apakah SMS dari pengirim tak dikenal diblokir di HP-mu.\n\nKalau tetap tidak masuk, kami bisa sambungkan ke CS.",
    keywords: "otp tidak masuk kode verifikasi gak dateng sms whatsapp kirim ulang",
  },
  {
    id: 3,
    category: "akun",
    question: "Bagaimana cara mengganti nomor HP atau email akun?",
    answer:
      "Buka tab **Saya** > **Pengaturan** > **Akun & Keamanan**, lalu pilih **Nomor HP** atau **Email**. Kamu akan diminta verifikasi OTP ke nomor/email lama sebelum menggantinya.",
    keywords: "ubah ganti nomor hp handphone email akun",
  },
  {
    id: 4,
    category: "akun",
    question: "Bagaimana cara mengubah atau menambah alamat pengiriman?",
    answer:
      "Buka tab **Saya** > **Alamat Saya** > **Tambah Alamat Baru**. Kamu juga bisa mengubah alamat langsung di halaman **Checkout** sebelum membayar. Tandai salah satu sebagai **Alamat Utama** agar otomatis terpilih.",
    keywords: "alamat ubah ganti tambah alamat utama pengiriman salah alamat",
  },
  {
    id: 5,
    category: "akun",
    question: "Bagaimana cara menghapus akun Cliploo?",
    answer:
      "Buka tab **Saya** > **Pengaturan** > **Akun & Keamanan** > **Hapus Akun**. Pastikan tidak ada pesanan yang masih berjalan dan saldo sudah ditarik. Akun yang sudah dihapus **tidak bisa dipulihkan**.",
    keywords: "hapus akun tutup akun nonaktif delete akun",
  },

  // ───────────── Pembayaran ─────────────
  {
    id: 6,
    category: "pembayaran",
    question: "Metode pembayaran apa saja yang tersedia di Cliploo?",
    answer:
      "Cliploo menerima:\n- **Dompet digital**: DANA, OVO, ShopeePay, LinkAja, AstraPay\n- **QRIS**\n- **Transfer bank / Virtual Account**: BCA, BRI, Mandiri, BNI, Permata, BSI, CIMB\n- **Kartu kredit/debit**\n- **PayLater** (Akulaku)\n- **Bayar di gerai**: Alfamart, Indomaret\n- **COD (Bayar di Tempat)** untuk pesanan tertentu",
    keywords: "metode bayar cara bayar pembayaran ewallet e-wallet dana ovo gopay qris va virtual account transfer bank kartu kredit paylater alfamart indomaret",
  },
  {
    id: 7,
    category: "pembayaran",
    question: "Mengapa saya tidak bisa membayar dengan COD?",
    answer:
      "COD hanya tersedia untuk pesanan tertentu:\n- Total pesanan di bawah batas COD\n- Alamat berada di area layanan kurir yang mendukung COD\n- Toko mengaktifkan COD\n\nBila tidak memenuhi, pilih metode pembayaran lain saat checkout.",
    keywords: "cod bayar di tempat tidak bisa cod gak ada pilihan cod",
  },
  {
    id: 8,
    category: "pembayaran",
    question: "Berapa lama batas waktu pembayaran?",
    answer:
      "Batas waktu pembayaran terlihat di halaman pembayaran (hitung mundur). Kalau waktunya habis, pesanan **dibatalkan otomatis** dan tidak ada yang ditagih. Kalau ternyata uang sudah terlanjur masuk, uang tersebut akan dikembalikan.",
    keywords: "batas waktu bayar expired kadaluarsa habis waktu pembayaran countdown",
  },
  {
    id: 9,
    category: "pembayaran",
    question: "Sudah bayar tapi status pesanan masih Belum Bayar?",
    answer:
      "Biasanya pesanan terkonfirmasi dalam beberapa detik sampai beberapa menit. Coba:\n1. Tutup lalu buka lagi halaman **Pesanan Saya**.\n2. Pastikan nominal dan nomor Virtual Account sudah sesuai.\n3. Simpan bukti bayar.\n\nKalau lebih dari 1 jam status belum berubah, kami sambungkan ke CS dengan membawa bukti bayarmu.",
    keywords: "sudah bayar belum terkonfirmasi status belum bayar pembayaran tidak masuk pending",
  },
  {
    id: 10,
    category: "pembayaran",
    question: "Kenapa pembayaran pakai kartu kredit/debit gagal?",
    answer:
      "Pembayaran kartu kadang belum bisa diselesaikan di aplikasi (misalnya verifikasi 3D Secure gagal atau limit kartu). Pembelianmu **masih bisa dibayar dengan metode lain** — pilih metode lain di halaman pembayaran.",
    keywords: "kartu kredit debit gagal ditolak cc visa mastercard",
  },
  {
    id: 11,
    category: "pembayaran",
    question: "Bagaimana cara bayar lewat Virtual Account?",
    answer:
      "Pilih **Transfer bank / Virtual Account** saat checkout, pilih bank, lalu salin nomor VA yang muncul. Bayar lewat m-banking, internet banking, atau ATM menu **Transfer > Virtual Account** dengan nominal **persis sama**. Status pesanan berubah otomatis setelah pembayaran diterima.",
    keywords: "virtual account va bca bri mandiri bni transfer cara bayar atm mbanking",
  },

  // ───────────── Pengiriman ─────────────
  {
    id: 12,
    category: "pengiriman",
    question: "Bagaimana cara melacak pesanan saya?",
    answer:
      "Buka **Pesanan Saya**, pilih pesanan, lalu ketuk **Lacak**. Kamu akan melihat posisi paket dan riwayat perjalanannya dari kurir.",
    keywords: "lacak tracking resi cek posisi paket dimana paket status pengiriman",
  },
  {
    id: 13,
    category: "pengiriman",
    question: "Pesanan saya belum sampai padahal estimasi sudah lewat?",
    answer:
      "Coba cek dulu riwayat di halaman **Lacak**. Kadang kurir terlambat memperbarui status. Kalau sudah lewat 2 hari dari estimasi dan status tidak bergerak, kamu bisa ajukan **Pengembalian** dengan alasan *Barang kurang atau tidak diterima*, atau kami sambungkan ke CS.",
    keywords: "belum sampai belum nyampe telat terlambat lama paket tidak datang estimasi lewat",
  },
  {
    id: 14,
    category: "pengiriman",
    question: "Status paket sudah diterima tapi saya belum menerima barangnya?",
    answer:
      "Jangan konfirmasi **Pesanan Diterima** dulu. Cek ke keluarga/tetangga/satpam, lalu lihat foto bukti kirim di halaman **Lacak** (jika ada). Kalau barang tetap tidak ada, ajukan **Pengembalian** dengan alasan *Barang kurang atau tidak diterima* sebelum batas waktunya habis.",
    keywords: "status diterima padahal belum terima paket hilang tidak sampai kurir bohong",
  },
  {
    id: 15,
    category: "pengiriman",
    question: "Bagaimana cara mendapatkan gratis ongkir?",
    answer:
      "Klaim voucher **Gratis Ongkir** di halaman Voucher, lalu pakai saat checkout. Setiap voucher punya syarat minimal belanja dan batas potongan — cek detailnya di voucher. Voucher gratis ongkir tidak bisa memotong harga produk.",
    keywords: "gratis ongkir free ongkir ongkos kirim murah voucher ongkir",
  },
  {
    id: 16,
    category: "pengiriman",
    question: "Bisakah mengubah alamat setelah pesanan dibuat?",
    answer:
      "Alamat hanya bisa diubah **sebelum pesanan dikirim** oleh penjual. Buka **Rincian Pesanan** dan cek apakah tombol ubah alamat tersedia. Kalau sudah dikirim, kamu bisa chat penjual atau kurir, atau kami sambungkan ke CS.",
    keywords: "ubah alamat setelah checkout salah alamat ganti alamat pesanan",
  },

  // ───────────── Pesanan ─────────────
  {
    id: 17,
    category: "pesanan",
    question: "Di mana saya bisa melihat semua pesanan saya?",
    answer:
      "Buka tab **Saya** > **Pesanan Saya**. Pesanan dikelompokkan per status: Belum Bayar, Dikemas, Dikirim, Selesai, Dibatalkan, dan Pengembalian.",
    keywords: "lihat pesanan riwayat pesanan order history daftar pesanan",
  },
  {
    id: 18,
    category: "pesanan",
    question: "Kapan saya harus menekan Pesanan Diterima?",
    answer:
      "Tekan **Pesanan Diterima** hanya setelah barang sampai dan kamu sudah mengecek kondisinya. Setelah dikonfirmasi, dana diteruskan ke penjual dan **pengembalian dana karena produk tidak ori tidak bisa diajukan lagi**.",
    keywords: "konfirmasi pesanan diterima selesai kapan tekan diterima",
  },
  {
    id: 19,
    category: "pesanan",
    question: "Bagaimana cara memberi penilaian (review) produk?",
    answer:
      "Setelah pesanan selesai, buka **Pesanan Saya** > tab **Selesai** > **Nilai**. Beri bintang, tulis ulasan, dan tambahkan foto/video. Semua penilaianmu bisa dilihat di **Penilaian Saya**.",
    keywords: "review ulasan nilai penilaian rating bintang komentar produk",
  },
  {
    id: 20,
    category: "pesanan",
    question: "Bagaimana cara membeli lagi produk yang pernah saya beli?",
    answer:
      "Buka **Pesanan Saya** > tab **Selesai**, lalu ketuk **Beli Lagi** pada pesanan tersebut. Produk akan langsung masuk ke keranjang.",
    keywords: "beli lagi repeat order pesan ulang",
  },

  // ───────────── Pembatalan ─────────────
  {
    id: 21,
    category: "pembatalan",
    question: "Bagaimana cara membatalkan pesanan?",
    answer:
      "Buka **Pesanan Saya**, pilih pesanan, lalu ketuk **Batalkan Pesanan** dan pilih alasannya.\n- Pesanan **Belum Bayar** langsung batal.\n- Pesanan yang sudah dibayar tapi **belum dikirim** perlu persetujuan penjual.\n- Pesanan yang sudah **dikirim** tidak bisa dibatalkan — ajukan Pengembalian setelah barang diterima.",
    keywords: "batal cancel batalin pesanan membatalkan order",
  },
  {
    id: 22,
    category: "pembatalan",
    question: "Pesanan saya dibatalkan, uangnya kembali ke mana?",
    answer:
      "Dana pesanan yang dibatalkan dikembalikan ke **rekening bank atas namamu** setelah diproses Cliploo, biasanya **1–3 hari kerja**. Rinciannya bisa dilihat di halaman pembatalan pesanan.",
    keywords: "dana pembatalan refund batal uang kembali kemana",
  },
  {
    id: 23,
    category: "pembatalan",
    question: "Kenapa pesanan saya dibatalkan otomatis?",
    answer:
      "Pesanan bisa dibatalkan otomatis jika:\n- Batas waktu pembayaran habis\n- Penjual tidak mengirim pesanan sampai batas waktu\n- Stok produk habis\n\nKalau sudah membayar, dananya dikembalikan.",
    keywords: "dibatalkan otomatis sistem batal sendiri kenapa batal",
  },

  // ───────────── Pengembalian & Dana ─────────────
  {
    id: 24,
    category: "pengembalian",
    question: "Bagaimana cara mengajukan pengembalian barang/dana?",
    answer:
      "1. Buka **Pesanan Saya** atau **Rincian Pesanan**, pilih **Ajukan Pengembalian**.\n2. Pilih alasan yang sesuai dan unggah foto/video bukti.\n3. Pilih **Dijemput Kurir** dan tentukan jadwal penjemputan.\n4. Setelah barang dicek penjual, kamu menerima pengembalian dana.",
    keywords: "retur return kembalikan barang ajukan pengembalian refund cara",
  },
  {
    id: 25,
    category: "pengembalian",
    question: "Berapa lama batas waktu mengajukan pengembalian?",
    answer:
      "Dihitung sejak pesanan diterima:\n- Toko **Mall**: 15 hari\n- Toko **Star+** dan **Dikelola Cliploo**: 7 hari\n- Toko lainnya: 2 hari\n\nLewat dari itu, pengajuan pengembalian tidak bisa dilakukan lagi.",
    keywords: "batas waktu retur berapa hari pengembalian deadline lewat",
  },
  {
    id: 26,
    category: "pengembalian",
    question: "Kapan dana pengembalian masuk ke rekening saya?",
    answer:
      "Setelah pengembalian disetujui, dana ditransfer ke **rekening bank atas namamu** dalam **1–3 hari kerja**, apa pun metode bayarmu (dompet digital, QRIS, VA, kartu, PayLater, atau gerai). Barang yang dikembalikan dicek penjual dulu selama 3–5 hari kerja.",
    keywords: "refund kapan masuk dana kembali berapa lama uang balik pengembalian dana",
  },
  {
    id: 27,
    category: "pengembalian",
    question: "Apa itu Garansi Bebas Pengembalian?",
    answer:
      "Program Cliploo yang memperbolehkan kamu mengembalikan barang **bahkan karena berubah pikiran**, salah ukuran, kurang cocok, atau rusak — plus **Gratis Dijemput Kurir**. Berlaku di semua penjual dan kategori, kecuali produk tertentu sesuai Syarat & Ketentuan.",
    keywords: "garansi bebas pengembalian berubah pikiran gratis retur free return",
  },
  {
    id: 28,
    category: "pengembalian",
    question: "Produk apa saja yang tidak bisa dikembalikan?",
    answer:
      "Tidak bisa dikembalikan lewat Garansi Bebas Pengembalian:\n- Produk *custom*\n- Produk berhadiah dan *mystery box*\n- Produk *defect* (cacat yang sudah diinformasikan)\n- Perhiasan logam mulia dan batu permata\n\nCek detail lengkap di halaman Syarat & Ketentuan Garansi Bebas Pengembalian.",
    keywords: "tidak bisa retur dikecualikan pengecualian custom mystery box perhiasan",
  },
  {
    id: 29,
    category: "pengembalian",
    question: "Bagaimana syarat kondisi barang yang dikembalikan?",
    answer:
      "- Kondisi sama seperti saat diterima: tidak rusak, label dan segel masih terpasang.\n- Aksesoris dan hadiah dikembalikan lengkap.\n- Kartu garansi/keaslian dan buku panduan belum dipakai/diaktifkan.\n- Dikemas rapi dengan kardus, *bubble wrap*, atau kemasan asli.\n- Dikirim maksimal **5 hari** sejak pengajuan.",
    keywords: "syarat retur kondisi barang kemas packing segel label",
  },
  {
    id: 30,
    category: "pengembalian",
    question: "Siapa yang menanggung ongkir pengembalian?",
    answer:
      "Dengan Garansi Bebas Pengembalian kamu bisa memakai **Gratis Dijemput Kurir**. Untuk pengembalian di luar program tersebut, ongkos kirim balik ke penjual ditanggung pembeli — kecuali memakai J&T yang gratis.",
    keywords: "ongkir retur ongkos kirim balik bayar siapa gratis jemput kurir",
  },
  {
    id: 31,
    category: "pengembalian",
    question: "Pengajuan pengembalian saya ditolak, apa yang bisa saya lakukan?",
    answer:
      "Cek alasan penolakan di **Rincian Pengembalian**. Kalau kamu merasa keputusannya keliru dan punya bukti tambahan (foto/video unboxing), kami bisa sambungkan ke CS untuk ditinjau ulang.",
    keywords: "retur ditolak pengembalian ditolak banding tidak disetujui",
  },

  // ───────────── Garansi 100% Ori ─────────────
  {
    id: 32,
    category: "garansi-ori",
    question: "Apa itu Garansi 100% Ori?",
    answer:
      "Jaminan dari Cliploo bahwa produk berlabel **Garansi 100% Ori** asli. Kalau terbukti tidak ori, kamu mendapat **pengembalian dana 100%**, dan khusus transaksi di toko Cliploo bisa mendapat **2x harga produk**.",
    keywords: "garansi ori original asli palsu kw keaslian",
  },
  {
    id: 33,
    category: "garansi-ori",
    question: "Saya curiga produknya palsu, bagaimana cara klaim Garansi Ori?",
    answer:
      "**Jangan tekan Pesanan Diterima dulu.** Ajukan pengembalian dengan alasan *Produk tidak ori*, lalu tunggu tim Cliploo menghubungimu lewat halaman diskusi untuk pemeriksaan.\n- Jika **tidak ori**: produk kembali ke penjual dan dana dikembalikan 100%.\n- Jika **ori**: produk tetap milikmu dan dana tidak dikembalikan.\n\nHanya tim Cliploo yang berhak memutuskan ori/tidak ori.",
    keywords: "klaim garansi ori produk palsu kw tidak asli curiga fake",
  },

  // ───────────── Voucher & Promo ─────────────
  {
    id: 34,
    category: "voucher",
    question: "Bagaimana cara memakai voucher?",
    answer:
      "Klaim voucher dulu (dari halaman toko, halaman Voucher, atau saat Live). Lalu di halaman **Checkout**, buka bagian **Voucher** dan pilih voucher yang ingin dipakai. Voucher yang memenuhi syarat akan terpilih otomatis bila tersedia.",
    keywords: "pakai voucher cara pakai kupon kode promo diskon checkout",
  },
  {
    id: 35,
    category: "voucher",
    question: "Kenapa voucher saya tidak bisa dipakai?",
    answer:
      "Biasanya karena:\n- Belum memenuhi **minimal belanja**\n- Voucher sudah berakhir atau kuotanya habis\n- Voucher hanya untuk toko/produk tertentu\n- Voucher khusus pengguna baru atau pembelian pertama\n\nCek syarat di detail voucher.",
    keywords: "voucher tidak bisa dipakai gagal tidak berlaku error kupon",
  },
  {
    id: 36,
    category: "voucher",
    question: "Apa itu voucher pembelian pertama?",
    answer:
      "Voucher khusus untuk pengguna yang **belum pernah** menyelesaikan pembelian di Cliploo. Klaim di halaman **Pembelian Pertama** dan pakai saat checkout pesanan pertamamu. Jika sudah pernah belanja, voucher ini tidak berlaku.",
    keywords: "voucher pengguna baru pembelian pertama first purchase new user",
  },
  {
    id: 37,
    category: "voucher",
    question: "Apa itu Flash Sale?",
    answer:
      "Promo harga spesial dalam waktu terbatas dengan stok terbatas. Buka halaman **Flash Sale** untuk melihat jadwal sesi. Harga Flash Sale hanya berlaku selama sesi berlangsung dan stok masih ada.",
    keywords: "flash sale promo diskon kilat jam tertentu",
  },

  // ───────────── Cliploo Live & Video ─────────────
  {
    id: 38,
    category: "live-video",
    question: "Apa itu Cliploo Live?",
    answer:
      "Fitur siaran langsung tempat penjual memamerkan produk secara real-time. Kamu bisa bertanya lewat chat, klaim voucher khusus Live, dan membeli produk yang dipajang tanpa keluar dari siaran.",
    keywords: "live streaming siaran langsung belanja live",
  },
  {
    id: 39,
    category: "live-video",
    question: "Bagaimana cara membeli produk dari video atau Live?",
    answer:
      "Ketuk ikon **keranjang/tas** di video atau Live untuk melihat produk yang ditautkan, pilih produk, lalu **Beli Sekarang** atau **Masukkan Keranjang**.",
    keywords: "beli dari video live keranjang kuning produk di video",
  },

  // ───────────── Jualan di Cliploo ─────────────
  {
    id: 40,
    category: "jualan",
    question: "Bagaimana cara membuka Toko Cliploo?",
    answer:
      "Tab **Saya** > **Mulai Jualan** > terima OTP (SMS atau WhatsApp) > lengkapi informasi toko > **Mulai Verifikasi Wajah**. Pengajuan biasanya diproses dalam beberapa menit.\n\nSyarat: nomor HP terverifikasi, usia minimal 18 tahun, dan KTP yang sah. Pembukaan toko **tidak bisa dibatalkan** setelah disetujui.",
    keywords: "buka toko jadi seller jualan daftar penjual mulai jualan",
  },
  {
    id: 41,
    category: "jualan",
    question: "Verifikasi wajah saat buka toko gagal terus?",
    answer:
      "1. Perbarui aplikasi Cliploo ke versi terbaru.\n2. Coba lagi minimal 2 kali di ruangan yang terang.\n3. Jika masih gagal, tunggu 10 menit dan pastikan internet stabil.\n4. Mulai ulang HP lalu coba lagi.",
    keywords: "verifikasi wajah gagal sistem error face wajah tidak terdeteksi",
  },
  {
    id: 42,
    category: "jualan",
    question: "Bagaimana cara menarik saldo penjualan?",
    answer:
      "Buka **Toko Saya** > **Saldo Penjual** > **Tarik Saldo**, pilih rekening bank yang sudah terdaftar atas nama pemilik toko, lalu masukkan nominal. Dana dari pesanan masuk ke saldo setelah pembeli mengonfirmasi pesanan diterima.",
    keywords: "tarik saldo penjual withdraw pencairan dana toko",
  },
  {
    id: 43,
    category: "jualan",
    question: "Bagaimana cara menutup toko sementara (libur)?",
    answer:
      "Buka **Pengaturan Toko** > **Mode Libur** dan aktifkan. Selama Mode Libur, pembeli tidak bisa membuat pesanan baru di tokomu.",
    keywords: "tutup toko sementara libur cuti mode libur",
  },
  {
    id: 44,
    category: "jualan",
    question: "Produk apa yang dilarang dijual di Cliploo?",
    answer:
      "Produk wajib mengikuti **Kebijakan Produk Cliploo**. Produk ilegal, palsu/KW, berbahaya, atau melanggar hak cipta akan diturunkan. Pelanggaran berulang bisa membuat toko dibatasi.",
    keywords: "produk dilarang larangan jualan kebijakan produk diturunkan banned",
  },

  // ───────────── Keamanan ─────────────
  {
    id: 45,
    category: "keamanan",
    question: "Apakah Cliploo pernah meminta kode OTP atau password?",
    answer:
      "**Tidak pernah.** Cliploo, termasuk tim CS, tidak akan pernah meminta kode OTP, password, PIN, atau data kartu. Jangan berikan kepada siapa pun. Kalau ada yang memintanya atas nama Cliploo, itu penipuan.",
    keywords: "otp password pin diminta cs minta kode penipuan aman",
  },
  {
    id: 46,
    category: "keamanan",
    question: "Bagaimana cara melaporkan penjual atau produk mencurigakan?",
    answer:
      "Buka halaman produk, ketuk ikon **⋯** > **Laporkan Produk**, pilih alasan, lalu kirim. Untuk penjual yang meminta transaksi di luar aplikasi, segera laporkan — transaksi di luar Cliploo tidak dilindungi.",
    keywords: "lapor laporkan produk penjual mencurigakan scam penipu report",
  },
  {
    id: 47,
    category: "keamanan",
    question: "Penjual meminta saya transfer langsung di luar aplikasi, aman?",
    answer:
      "**Tidak aman.** Selalu bayar lewat checkout di aplikasi Cliploo. Transaksi di luar aplikasi tidak dilindungi Garansi Bebas Pengembalian maupun Garansi 100% Ori. Laporkan penjual tersebut.",
    keywords: "transfer langsung luar aplikasi rekening pribadi penjual cod luar",
  },
];
