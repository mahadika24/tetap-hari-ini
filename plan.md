# Rencana Implementasi — Komunitas & Story

## Cakupan yang disetujui
Tambahkan komunitas berbasis akun dengan dua jalur yang berdampingan: chat teks di lingkaran dukungan privat berbasis undangan, serta Story pencapaian dengan pilihan audiens lingkaran privat atau publik untuk pengguna Tetap Hari Ini yang sudah masuk. “Publik” berarti terlihat di feed dalam aplikasi, bukan halaman web terbuka atau seluruh internet. Story bersifat teks pada MVP, berumur tayang 24 jam, privat sebagai bawaan, dan memerlukan konfirmasi eksplisit bila akan dipublikasikan. Nama samaran menggantikan nama dan email OAuth. Catatan malam, checklist, serta foto keluarga yang sudah ada tetap lokal dan tidak disalin ke komunitas.

## Pendekatan teknis
- Pakai Manus OAuth, `useAuth`, context sesi, serta callback OAuth proyek dengan state berisi nonce sekali pakai: cookie HTTP-only untuk Web dan pencocokan SecureStore untuk native. Tidak membuat sistem kata sandi atau identitas palsu. Endpoint sosial hanya `protectedProcedure` dan menggunakan `ctx.user.id` sebagai sumber kepemilikan.
- Tambahkan tabel server/database aditif untuk profil nama samaran, lingkaran, keanggotaan, pesan, Story, blokir, dan laporan. Semua kueri mengambil data dari identitas pengguna pada sesi dan memeriksa keanggotaan lingkaran di server.
- Pisahkan query/mutasi sosial di `server/community.ts`; pasang prosedur di `server/routers.ts`; deklarasikan skema melalui `drizzle/schema.ts` dan gunakan migrasi Drizzle. Feed menolak Story kedaluwarsa dan konten yang sudah dihapus, tetapi tidak menghapus baris Story yang telah kedaluwarsa secara otomatis. Catatan privat perangkat tetap di AsyncStorage.
- Tambahkan layar `app/(tabs)/community.tsx` dengan tiga keadaan utama: masuk/identitas nama samaran; membuat atau bergabung dengan lingkaran lewat kode undangan; dan tab Lingkaran, Story, Privasi/Laporan. Chat dapat memuat pesan baru dengan polling singkat saat layar terbuka, tanpa koneksi WebSocket.
- Tampilkan peringatan yang jelas bahwa konten publik terlihat oleh seluruh akun aplikasi dan dapat disalin pembaca. Blokir menyembunyikan konten dua arah serta mengeluarkan pemblokir dari lingkaran bersama; blokir mencegah masuk kembali sampai dibuka, dan membuka blokir tidak memulihkan keanggotaan. Laporan masuk antrean admin. Pesan/Story MVP berupa teks dan tidak menjanjikan enkripsi end-to-end.
- Anggota dapat keluar dari lingkaran. Pemilik yang keluar menyerahkan kepemilikan kepada anggota yang paling lama bergabung; bila pemilik adalah satu-satunya anggota, penghapusan lingkaran beserta konten privatnya memerlukan konfirmasi eksplisit. Pesan lama anggota yang keluar tetap tersedia untuk anggota lain.

## Keputusan desain
Gunakan kembali “Kompas Malam” yang telah disetujui: dasar biru malam, aksen sian untuk tindakan jelas, aksen mint untuk dukungan, tipografi Plus Jakarta Sans, kartu satu kolom yang ramah layar ponsel, serta bahasa yang hangat dan tidak menghakimi. Privasi menjadi interaksi utama: audiens Story dinyatakan dekat tombol kirim; tindakan publik memiliki konfirmasi terpisah; status privat terlihat jelas di ruang chat.

## Struktur proyek
- `app/(tabs)/community.tsx` — layar autentikasi sosial, alias, lingkaran dan chat, feed Story, pemilih audiens, blokir serta laporan.
- `server/community.ts` — operasi domain yang memeriksa keanggotaan, audiens, pemblokiran, masa berlaku, laporan, dan izin admin.
- `server/routers.ts` — kontrak tRPC type-safe dan pemeriksaan autentikasi.
- `server/_core/oauth.ts`, `server/_core/sdk.ts`, `constants/oauth.ts`, dan `app/oauth/callback.tsx` — state OAuth Web/native sekali pakai.
- `drizzle/schema.ts` dan `drizzle/` — model serta migrasi aditif untuk data lintas pengguna.
- `lib/daily-context.tsx` — tetap menjadi penyimpanan privat lokal; tidak menjadi sumber identitas sosial.
- `app/(tabs)/_layout.tsx` — tab Komunitas ditambahkan tanpa mengubah tab lama.

## Batas dan konsekuensi
Server dan database managed sudah aktif; data sosial bersifat lintas perangkat dan tersimpan pada database proyek bersama oleh Preview serta versi terbit. Perubahan skema hanya menambah tabel. Story yang lewat 24 jam tidak tampil lagi di feed, tetapi barisnya dapat tetap tersimpan di database; penghapusan manual tersedia untuk pemilik sebelum kedaluwarsa. Interaksi OAuth penuh, notifikasi asli, dan izin perangkat tidak dapat dibuktikan dari render Web saja. Tidak ada unggahan foto/video Story dalam MVP, moderasi otomatis sempurna, ataupun klaim bahwa nama samaran mencegah pengguna dikenali dari isi yang mereka tulis.
