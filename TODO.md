# TODO — Tetap Hari Ini

## Rutinitas harian mulai besok dan pengingat
- [x] Jadwal harian dimulai besok; beranda menampilkan kerja sales sampai maksimal pukul 12.00.
- [x] Setelah pukul 12.00, pengguna diarahkan langsung pulang atau beralih ke mode ojol bila memungkinkan.
- [x] Siang–malam diarahkan untuk fokus mencari orderan ojol atau istirahat terkontrol.
- [x] Pengguna diingatkan untuk tidak membuka browser atau aplikasi yang berisiko.
- [x] Pengingat perangkat mencakup batas kerja sales pukul 12.00, melihat foto keluarga pada malam hari, dan menulis komitmen sebelum tidur.

## Strategi anti-judi dan bantuan saat godaan
- [x] Pengguna dapat mencatat bahwa semua situs dan aplikasi judi telah dihapus atau diblokir; aplikasi menjelaskan bahwa checklist ini bukan pemblokir otomatis dan akses perlu diblokir melalui pengaturan perangkat.
- [x] Jika godaan kuat setelah pukul 20.00, instruksi meminta pengguna tidak sendirian memegang HP di kamar; keluar kamar atau nyalakan lampu terang.
- [x] Saat keinginan bermain muncul, pengguna dapat menunda 10 menit, minum air, berjalan sebentar, membuka catatan, atau menghubungi orang tepercaya.
- [x] Aplikasi menyatakan tegas bahwa tidak ada “main kecil-kecilan”; nol toleransi.

## Motivasi 7 hari, foto keluarga, dan versi ringkas
- [x] Motivasi ayah ditampilkan sesuai hari selama 7 hari: Hari 1 “Ayah, hari ini anakmu memilih untuk tidak menyerah. Saya masih di sini, masih berusaha.”; Hari 2 “Saya ingin suatu hari bisa menceritakan ke ayah bahwa saya sudah lepas dari ini. Bukan cerita kekalahan.”; Hari 3 “Setiap kali saya menahan diri, saya sedang membangun versi diri yang lebih kuat. Versi yang bisa ayah banggakan.”; Hari 4 “Uang bisa hilang, tapi harga diri yang saya jaga hari ini tidak akan hilang.”; Hari 5 “Saya sudah pernah menang melawan hal yang lebih berat. Judi tidak akan mengalahkan saya selamanya.”; Hari 6 “Hari ini saya pilih sakit karena menahan diri, daripada sakit karena menyesal lagi.”; Hari 7 “Saya sedang belajar menjadi laki-laki yang bertanggung jawab, mulai dari menahan diri hari ini.”
- [x] Setiap malam pengguna dapat membuka foto keluarga Ibu, Ayah, dan Adik; foto dipilih sendiri dari perangkat dan bukan diganti foto rekaan.
- [x] Motivasi keluarga ditampilkan sesuai hari selama 7 hari: Hari 1 “Hari ini saya menahan diri karena kalian. Saya tidak mau terus jadi beban.”; Hari 2 “Saya ingin suatu hari bisa pulang dengan kepala tegak dan cerita bahwa saya sudah berubah.”; Hari 3 “Setiap kali keinginan main muncul, saya ingat wajah kalian. Itu cukup untuk menahan diri hari ini.”; Hari 4 “Saya sudah cukup menyakiti diri sendiri. Mulai hari ini, saya pilih menjaga diri demi kalian juga.”; Hari 5 “Bukan hanya untuk diri saya. Saya ingin jadi kakak dan anak yang bisa diandalkan.”; Hari 6 “Hari ini saya menang melawan diri sendiri. Besok saya ulangi lagi.”; Hari 7 “Saya sedang belajar bertanggung jawab. Bukan hanya soal uang, tapi soal menjadi versi terbaik untuk keluarga.”
- [x] Tampilan ringkas yang mudah di-screenshot memuat aturan harian: kerja sales selesai maksimal jam 12; setelah itu fokus ojol / istirahat; tidak main judi sama sekali; malam baca catatan + lihat foto ayah; tulis “Hari ini saya tidak main judi”.

## Catatan malam dan progres
- [x] Sebelum tidur, pengguna mengetik kalimat wajib “Hari ini saya tidak main judi.”; aplikasi memvalidasi kalimat tersebut sebelum menyimpannya.
- [x] Checklist rutinitas, langkah anti-judi, motivasi yang dibuka, dan refleksi malam disimpan untuk riwayat progres per hari; riwayat menampilkan jumlah checklist selesai, isi refleksi tersimpan, jumlah dorongan, serta langkah jeda yang dipilih.
- [x] Catatan, progres, dan preferensi foto bersifat privat serta disimpan lokal di perangkat.

## Chat dukungan privat
- [x] Pengguna masuk memakai autentikasi Manus yang sudah disediakan proyek dan memilih nama samaran; jangan mengekspos nama atau email OAuth ke komunitas.
- [x] Pengguna dapat membuat lingkaran dukungan privat dan bergabung melalui kode undangan; setiap lingkaran memiliki chat teks yang hanya dapat dibaca oleh anggota aktifnya.
- [x] Pesan memiliki penulis dan waktu; semua endpoint membaca dan menulis pesan memeriksa sesi pengguna dan keanggotaan lingkaran di server.
- [x] Pengguna dapat memblokir akun, melaporkan pesan/Story, dan menghapus pesan miliknya; blokir menyembunyikan konten kedua arah, mengeluarkan pemblokir dari semua lingkaran bersama (pemilik menyerahkan kepemilikan kepada anggota terlama), mencegah bergabung kembali selama blokir aktif, dan membuka blokir tidak memulihkan keanggotaan.
- [x] Anggota dapat keluar dari lingkaran; pemilik yang keluar menyerahkan kepemilikan kepada anggota terlama, dan jika pemilik adalah satu-satunya anggota, aplikasi memberi peringatan bahwa lingkaran beserta seluruh chat dan Story privat di dalamnya akan dihapus setelah konfirmasi. Pesan anggota yang keluar tetap tersedia untuk anggota yang tersisa.

## Story pencapaian dan privasi
- [x] Pengguna dapat membagikan pencapaian berupa Story teks dengan pilihan audiens “Lingkaran saya” atau “Publik untuk pengguna Tetap Hari Ini”.
- [x] Audiens bawaan Story adalah lingkaran privat; pengguna harus secara sadar mengubah audiens dan mengonfirmasi sebelum Story masuk ke feed publik dalam aplikasi.
- [x] Feed publik hanya tampil kepada pengguna Tetap Hari Ini yang sudah masuk, bukan situs web terbuka atau seluruh internet; tidak ada nama/email asli OAuth yang ditampilkan.
- [x] Story tidak lagi tampil di feed setelah 24 jam; baris Story dapat tetap tersimpan di database setelah kedaluwarsa; pemilik dapat menghapus Story sebelum kedaluwarsa; Story dan chat dapat dilaporkan atau pemiliknya diblokir.
- [x] Pesan, lingkaran, keanggotaan, laporan, blokir, dan Story lintas pengguna disimpan di server/database; catatan pribadi dan foto keluarga tetap lokal.


## Target tabungan, tujuan, Todo, dan setoran
- [x] Sediakan menu tambahan untuk membuat satu atau lebih target uang dengan nama/tujuan, nominal target dalam rupiah, dan durasi yang dapat dipilih dalam hari, bulan, atau tahun.
- [x] Tampilkan jumlah hari tersisa, total target, jumlah terkumpul, sisa nominal, progres, dan rekomendasi setoran harian berdasarkan target serta durasi.
- [x] Sediakan Todo yang dapat ditambahkan dan dicentang per tujuan tabungan.
- [x] Pengguna dapat mencatat beberapa setoran aktual dengan nominal serta tanggal; pelacakan saldo harus menghitung jumlah setoran tercatat dan tidak menganggap nominal target sudah tercapai bila belum.
- [x] Sediakan opsi setoran minimum harian saat terjadi keadaan tak terduga/force majeure (misalnya Rp50.000 jika target harian penuh tidak sanggup dipenuhi). Opsi ini tidak wajib diisi, pengguna dapat mencatat nominal aktual di bawah target, dan tampilan harus tetap memperlihatkan selisih menuju target dengan jelas.
- [x] Tujuan, daftar Todo, dan riwayat setoran disimpan secara lokal di perangkat dan tidak dibagikan ke komunitas.
