import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ActionButton, BrandMark, C, Copy, Eyebrow, Panel, Tag } from "@/components/ui/tetap-ui";
import { useDaily } from "@/lib/daily-context";

const DAD_LINES = [
  "Ayah, hari ini anakmu memilih untuk tidak menyerah. Saya masih di sini, masih berusaha.",
  "Saya ingin suatu hari bisa menceritakan ke ayah bahwa saya sudah lepas dari ini. Bukan cerita kekalahan.",
  "Setiap kali saya menahan diri, saya sedang membangun versi diri yang lebih kuat. Versi yang bisa ayah banggakan.",
  "Uang bisa hilang, tapi harga diri yang saya jaga hari ini tidak akan hilang.",
  "Saya sudah pernah menang melawan hal yang lebih berat. Judi tidak akan mengalahkan saya selamanya.",
  "Hari ini saya pilih sakit karena menahan diri, daripada sakit karena menyesal lagi.",
  "Saya sedang belajar menjadi laki-laki yang bertanggung jawab, mulai dari menahan diri hari ini.",
];
const FAMILY_LINES = [
  "Hari ini saya menahan diri karena kalian. Saya tidak mau terus jadi beban.",
  "Saya ingin suatu hari bisa pulang dengan kepala tegak dan cerita bahwa saya sudah berubah.",
  "Setiap kali keinginan main muncul, saya ingat wajah kalian. Itu cukup untuk menahan diri hari ini.",
  "Saya sudah cukup menyakiti diri sendiri. Mulai hari ini, saya pilih menjaga diri demi kalian juga.",
  "Bukan hanya untuk diri saya. Saya ingin jadi kakak dan anak yang bisa diandalkan.",
  "Hari ini saya menang melawan diri sendiri. Besok saya ulangi lagi.",
  "Saya sedang belajar bertanggung jawab. Bukan hanya soal uang, tapi soal menjadi versi terbaik untuk keluarga.",
];
function dayNumber(startDate: string) {
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d, 12);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const delta = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return delta < 0 ? 1 : Math.min(delta + 1, 7);
}

export default function FamilyScreen() {
  const { data, setFamilyPhoto, toggleTask, today } = useDaily();
  const [error, setError] = useState("");
  const day = useMemo(() => dayNumber(data.startDate), [data.startDate]);

  const choosePhoto = async () => {
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError("Akses foto belum diizinkan. Kamu tetap bisa membaca motivasi tanpa mengunggah foto."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.86 });
      if (!result.canceled && result.assets[0]?.uri) setFamilyPhoto(result.assets[0].uri);
    } catch {
      setError("Pemilih foto hanya tersedia setelah aplikasi dibuka di perangkat atau Preview yang mendukungnya.");
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BrandMark /><Tag color={C.mint}>MALAM · KELUARGA</Tag></View>
        <View style={styles.heading}><Eyebrow>ALASANMU TETAP BERTAHAN</Eyebrow><Copy size={29} weight="extra" style={{ marginTop: 5 }}>Wajah yang kamu jaga.</Copy><Copy tone="muted" size={13} style={{ marginTop: 6 }}>Setiap malam, buka foto Ayah, Ibu, dan Adik. Baca pelan-pelan. Lakukan untuk hari ini.</Copy></View>

        <Panel style={styles.photoCard}>
          {data.familyPhotoUri ? (
            <Image source={{ uri: data.familyPhotoUri }} resizeMode="cover" style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.familyIcon}><Feather name="users" size={27} color={C.accent} /></View>
              <Copy size={15} weight="bold" style={{ marginTop: 13 }}>Simpan foto keluargamu di sini</Copy>
              <Copy size={11} tone="muted" style={{ textAlign: "center", marginTop: 5, maxWidth: 240 }}>Pilih sendiri foto Ayah, Ibu, dan Adik dari perangkat. Tidak ada foto rekaan.</Copy>
            </View>
          )}
          <View style={styles.photoActions}>
            <ActionButton title={data.familyPhotoUri ? "Ganti foto" : "Pilih foto keluarga"} icon="image" small onPress={choosePhoto} style={{ flex: 1 }} />
            {data.familyPhotoUri ? <Pressable accessibilityRole="button" accessibilityLabel="Hapus foto keluarga" onPress={() => setFamilyPhoto(null)} style={styles.removePhoto}><Feather name="trash-2" size={16} color={C.muted} /></Pressable> : null}
          </View>
          <Copy size={10} tone="faint" style={{ marginTop: 9 }}>Foto dipilih dan disimpan di perangkat ini saja.</Copy>
        </Panel>

        {error ? <Panel style={styles.errorCard}><Copy size={12} tone="gold">{error}</Copy></Panel> : null}

        <View style={styles.dayHeader}><View><Eyebrow>PESAN UNTUKMU</Eyebrow><Copy size={19} weight="bold" style={{ marginTop: 4 }}>Hari ke-{day} dari 7</Copy></View><View style={styles.dayBadge}><Copy size={12} weight="extra" tone="accent">0{day}</Copy></View></View>
        <Panel style={styles.quoteCard}>
          <Feather name="message-circle" size={21} color={C.accent} />
          <Copy size={17} weight="semi" style={{ marginTop: 12, lineHeight: 27 }}>“{DAD_LINES[day - 1]}”</Copy>
          <View style={styles.quoteRule} />
          <Copy size={10} tone="accent" weight="extra" style={{ letterSpacing: 1.1 }}>UNTUK AYAH</Copy>
        </Panel>
        <Panel style={styles.familyQuote}>
          <View style={styles.familyQuoteHead}><Feather name="heart" size={17} color={C.mint} /><Eyebrow style={{ color: C.mint }}>UNTUK IBU, AYAH & ADIK</Eyebrow></View>
          <Copy size={14} weight="medium" style={{ marginTop: 11, lineHeight: 23 }}>“{FAMILY_LINES[day - 1]}”</Copy>
        </Panel>

        <Pressable onPress={() => toggleTask("family")} accessibilityRole="checkbox" accessibilityState={{ checked: today.tasks.family }} style={({ pressed }) => [styles.doneRow, today.tasks.family && styles.doneRowActive, pressed && { opacity: 0.75 }]}>
          <View style={[styles.roundCheck, today.tasks.family && { backgroundColor: C.mint, borderColor: C.mint }]}>{today.tasks.family ? <Feather name="check" size={14} color={C.bg} /> : null}</View>
          <View style={{ flex: 1 }}><Copy size={13} weight="bold">Saya sudah membaca bersama foto</Copy><Copy size={10} tone="muted" style={{ marginTop: 3 }}>Tandai ritual malam hari selesai.</Copy></View>
          <Feather name="arrow-right" size={15} color={C.muted} />
        </Pressable>
        <Copy size={10} tone="faint" style={{ textAlign: "center", marginTop: 1 }}>Tidak perlu sempurna. Kembali lagi besok.</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 10, paddingBottom: 30, gap: 15 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { paddingTop: 8, paddingBottom: 2 },
  photoCard: { padding: 12 },
  photo: { width: "100%", height: 210, borderRadius: 16, backgroundColor: C.bgSoft },
  photoPlaceholder: { width: "100%", height: 204, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "#35516B", backgroundColor: "#0B1B2D" },
  familyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  photoActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11 },
  removePhoto: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: C.bgSoft, borderColor: C.border, borderWidth: 1 },
  errorCard: { borderColor: "#65502D", backgroundColor: "#2C251A", padding: 13 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3 },
  dayBadge: { width: 41, height: 41, borderRadius: 14, borderColor: "#235472", borderWidth: 1, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  quoteCard: { backgroundColor: "#11283E", borderColor: "#2A5271", padding: 20, minHeight: 202 },
  quoteRule: { height: 1, backgroundColor: "#2B4D69", marginTop: 18, marginBottom: 12 },
  familyQuote: { backgroundColor: "#102729", borderColor: "#27504D", padding: 17 },
  familyQuoteHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  doneRow: { borderRadius: 17, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: "row", alignItems: "center", padding: 13, gap: 11 },
  doneRowActive: { borderColor: "#32745E", backgroundColor: "#132F30" },
  roundCheck: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: "#597087", alignItems: "center", justifyContent: "center" },
});
