import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useDaily, type ChecklistId } from "@/lib/daily-context";
import { ActionButton, BrandMark, C, Copy, Eyebrow, Panel, Tag } from "@/components/ui/tetap-ui";

const MINUTE = 60;
const supportOptions = [
  { id: "air", title: "Minum segelas air", icon: "droplet" as const },
  { id: "jalan", title: "Jalan sebentar, keluar dari tempat itu", icon: "navigation" as const },
  { id: "catatan", title: "Buka kembali catatan ini", icon: "book-open" as const },
  { id: "orang", title: "Hubungi orang yang kamu percaya", icon: "phone" as const },
];

function localStartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
function programDay(startDate: string) {
  const start = localStartDate(startDate);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const delta = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return delta < 0 ? 0 : Math.min(delta + 1, 7);
}
function displayDate(date: Date) {
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

const schedule: { time: string; title: string; description: string; icon: keyof typeof Feather.glyphMap; task: ChecklistId }[] = [
  { time: "PAGI — 12.00", title: "Kerja sales", description: "Selesaikan maksimal pukul 12.00. Batas tetap batas.", icon: "briefcase", task: "sales" },
  { time: "SETELAH 12.00", title: "Pulang atau pindah mode", description: "Langsung pulang, atau beralih ke ojol jika memungkinkan.", icon: "corner-down-right", task: "transition" },
  { time: "SIANG — MALAM", title: "Ojol atau rehat terkontrol", description: "Cari orderan ojol atau istirahat dengan rencana yang jelas.", icon: "wind", task: "afternoon" },
  { time: "SEPANJANG HARI", title: "Jauhi aplikasi berisiko", description: "Tidak membuka browser atau aplikasi yang memicu judi.", icon: "shield", task: "safeApps" },
  { time: "MALAM", title: "Lihat foto keluarga", description: "Baca kalimat hari ini bersama foto Ayah dan keluarga.", icon: "heart", task: "family" },
  { time: "SEBELUM TIDUR", title: "Tulis komitmen", description: "Satu kalimat: “Hari ini saya tidak main judi.”", icon: "edit-3", task: "journal" },
];

function TaskToggle({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.check, checked && styles.checked, pressed && { opacity: 0.75 }]}>
      {checked ? <Feather name="check" size={14} color={C.bg} /> : null}
    </Pressable>
  );
}

function UrgeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { today, markUrgeStep } = useDaily();
  const [remaining, setRemaining] = useState(10 * MINUTE);
  const afterEight = new Date().getHours() >= 20;
  useEffect(() => {
    if (!visible || remaining <= 0) return;
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [visible, remaining]);
  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalShade}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTop}>
            <View style={styles.sosIcon}><Feather name="shield" size={23} color={C.accent} /></View>
            <Tag color={C.gold}>JEDA 10 MENIT</Tag>
          </View>
          <Eyebrow>Godaan bisa lewat</Eyebrow>
          <Copy size={25} weight="extra" style={{ marginTop: 7 }}>Jangan bertindak sekarang.</Copy>
          <Copy tone="muted" style={{ marginTop: 8 }}>Tunda 10 menit. Tidak ada “main kecil-kecilan”. Nol toleransi—satu langkah aman dulu.</Copy>
          <View style={styles.timerBox}>
            <Copy size={38} weight="extra" tone={remaining === 0 ? "mint" : "accent"}>{timeLabel}</Copy>
            <Copy size={12} tone="muted">Tetap di sini. Ambil jedanya.</Copy>
          </View>
          {afterEight ? (
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={17} color={C.gold} />
              <Copy size={12} style={{ flex: 1 }}><Copy size={12} weight="bold" tone="gold">Setelah pukul 20.00:</Copy> bila godaan kuat, jangan sendirian memegang HP di kamar. Keluar kamar atau nyalakan lampu terang.</Copy>
            </View>
          ) : null}
          <Copy size={12} weight="bold" tone="muted" style={{ marginTop: 18, marginBottom: 9 }}>Pilih satu hal kecil yang aman</Copy>
          {supportOptions.map((option) => {
            const checked = today.urgeSteps.includes(option.id);
            return (
              <Pressable key={option.id} onPress={() => markUrgeStep(option.id)} style={({ pressed }) => [styles.supportRow, checked && styles.supportRowDone, pressed && { opacity: 0.7 }]}>
                <Feather name={option.icon} size={17} color={checked ? C.mint : C.accent} />
                <Copy size={13} style={{ flex: 1 }}>{option.title}</Copy>
                <Feather name={checked ? "check-circle" : "circle"} size={17} color={checked ? C.mint : C.faint} />
              </Pressable>
            );
          })}
          <ActionButton title="Saya aman untuk sekarang" icon="check" onPress={onClose} style={{ marginTop: 17 }} />
          <Copy size={11} tone="faint" style={{ marginTop: 10, textAlign: "center" }}>Kalau sulit menahan diri, hubungi orang tepercaya dan jangan hadapi sendirian.</Copy>
        </View>
      </View>
    </Modal>
  );
}

export default function TodayScreen() {
  const { data, today, toggleTask, setGamblingAppsBlocked, logUrge } = useDaily();
  const router = useRouter();
  const [urgeOpen, setUrgeOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const day = programDay(data.startDate);
  const tomorrow = day === 0;
  const completed = Object.values(today.tasks).filter(Boolean).length;
  const progress = Math.round((completed / 6) * 100);

  const openHelp = () => { setUrgeOpen(true); setNow(new Date()); logUrge(); };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandMark />
          <View style={styles.datePill}><Feather name="calendar" size={13} color={C.muted} /><Copy size={11} tone="muted">{displayDate(now)}</Copy></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}><Tag color={tomorrow ? C.gold : C.accent}>{tomorrow ? "MULAI BESOK" : `HARI KE-${day}`}</Tag><Copy size={12} tone="muted">{completed}/6 langkah</Copy></View>
          <Copy size={31} weight="extra" style={{ marginTop: 16, maxWidth: 320 }}>{tomorrow ? "Besok, ambil arah baru." : "Satu hari. Satu pilihan."}</Copy>
          <Copy tone="muted" size={14} style={{ marginTop: 6, maxWidth: 315 }}>{tomorrow ? "Jadwal harian dimulai besok. Komitmen untuk tidak berjudi dimulai sekarang." : "Tidak perlu menyelesaikan semuanya sekaligus. Fokus ke langkah berikutnya."}</Copy>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <View style={styles.sectionHeader}><View><Eyebrow>ARAH HARI INI</Eyebrow><Copy size={19} weight="bold" style={{ marginTop: 3 }}>Jalani sesuai batas</Copy></View><Feather name="sunrise" size={22} color={C.accent} /></View>
        <Panel style={styles.timeline}>
          {schedule.map((item, index) => {
            const done = today.tasks[item.task];
            return (
              <View key={item.task} style={[styles.timelineItem, index === schedule.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.timelineRail}><View style={[styles.timelineIcon, done && { backgroundColor: C.accentSoft, borderColor: "#34769B" }]}><Feather name={item.icon} size={15} color={done ? C.mint : C.accent} /></View>{index < schedule.length - 1 ? <View style={styles.timelineLine} /> : null}</View>
                <View style={styles.timelineText}><Copy size={10} tone="accent" weight="extra" style={{ letterSpacing: 1 }}>{item.time}</Copy><Copy size={14} weight="bold" style={{ marginTop: 2 }}>{item.title}</Copy><Copy size={11} tone="muted" style={{ marginTop: 2, paddingRight: 8 }}>{item.description}</Copy></View>
                <TaskToggle checked={done} onPress={() => item.task === "family" ? router.push("/family") : item.task === "journal" ? router.push("/progress") : toggleTask(item.task)} label={item.task === "family" ? "Buka motivasi dan foto keluarga" : item.task === "journal" ? "Tulis komitmen malam" : `Tandai selesai: ${item.title}`} />
              </View>
            );
          })}
        </Panel>

        <Panel style={styles.guardCard}>
          <View style={styles.guardHeader}><View style={styles.shieldIcon}><Feather name="shield" size={17} color={C.mint} /></View><View style={{ flex: 1 }}><Eyebrow>BATAS YANG KAMU JAGA</Eyebrow><Copy size={16} weight="bold" style={{ marginTop: 3 }}>Nol toleransi terhadap judi.</Copy></View></View>
          <Copy size={12} tone="muted" style={{ marginTop: 12 }}>Hapus atau blokir semua situs dan aplikasi judi. Jangan ambil risiko dengan “sekali saja”.</Copy>
          <Pressable onPress={() => setGamblingAppsBlocked(!data.gamblingAppsBlocked)} accessibilityRole="checkbox" accessibilityState={{ checked: data.gamblingAppsBlocked }} style={({ pressed }) => [styles.blockRow, data.gamblingAppsBlocked && styles.blockRowDone, pressed && { opacity: 0.75 }]}>
            <View style={[styles.check, data.gamblingAppsBlocked && styles.checked]}>{data.gamblingAppsBlocked ? <Feather name="check" size={14} color={C.bg} /> : null}</View>
            <Copy size={12} weight="semi" style={{ flex: 1 }}>Sudah saya hapus / blokir</Copy>
            <Feather name="arrow-right" size={15} color={C.muted} />
          </Pressable>
          <Copy size={10} tone="faint" style={{ marginTop: 8 }}>Checklist ini pengingat, bukan pemblokir otomatis. Aktifkan blokir lewat pengaturan perangkat.</Copy>
        </Panel>

        <Pressable accessibilityRole="button" onPress={openHelp} style={({ pressed }) => [styles.urgeButton, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
          <View style={styles.urgePulse}><Feather name="life-buoy" size={21} color={C.bg} /></View>
          <View style={{ flex: 1 }}><Copy size={15} weight="extra" style={{ color: C.bg }}>Godaan muncul?</Copy><Copy size={11} style={{ color: "#15344A", marginTop: 2 }}>Mulai jeda 10 menit. Kamu tidak sendirian.</Copy></View>
          <Feather name="arrow-up-right" size={18} color={C.bg} />
        </Pressable>

        <View style={styles.footer}><Copy size={10} tone="faint">Disimpan hanya di perangkatmu.</Copy><Copy size={10} tone="faint">Satu hari, satu langkah.</Copy></View>
      </ScrollView>
      <UrgeModal visible={urgeOpen} onClose={() => setUrgeOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 10, paddingBottom: 30, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  datePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.bgSoft, borderWidth: 1, borderColor: C.border, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 13 },
  hero: { minHeight: 185, overflow: "hidden", borderRadius: 26, padding: 21, backgroundColor: "#102B44", borderColor: "#24516E", borderWidth: 1 },
  heroGlow: { position: "absolute", width: 210, height: 210, borderRadius: 110, top: -95, right: -38, backgroundColor: "#194A69", opacity: 0.5 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTrack: { height: 5, borderRadius: 9, backgroundColor: "#25445D", marginTop: 18, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: C.accent, borderRadius: 9 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 3, marginTop: 4 },
  timeline: { paddingVertical: 17, paddingHorizontal: 14 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", minHeight: 66, borderBottomWidth: 1, borderBottomColor: "#1C334A", paddingBottom: 12, marginBottom: 12 },
  timelineRail: { alignItems: "center", width: 33, marginRight: 10 },
  timelineIcon: { width: 31, height: 31, borderRadius: 11, backgroundColor: "#0B2134", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 1, flex: 1, minHeight: 28, backgroundColor: C.border, marginTop: 5 },
  timelineText: { flex: 1, paddingTop: 1 },
  check: { width: 23, height: 23, borderRadius: 8, borderWidth: 1.4, borderColor: "#597087", alignItems: "center", justifyContent: "center", marginTop: 4 },
  checked: { backgroundColor: C.mint, borderColor: C.mint },
  guardCard: { borderColor: "#245142", backgroundColor: "#102A2E", padding: 16 },
  guardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  shieldIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "#1B403E", alignItems: "center", justifyContent: "center" },
  blockRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderColor: "#335046", borderWidth: 1, backgroundColor: "#142F31", paddingHorizontal: 12, paddingVertical: 10 },
  blockRowDone: { backgroundColor: "#183D38", borderColor: "#32745E" },
  urgeButton: { backgroundColor: C.accent, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: C.accent, shadowOpacity: 0.16, shadowRadius: 16, elevation: 3 },
  urgePulse: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#A7E4FF", alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", justifyContent: "space-between", paddingTop: 1, paddingHorizontal: 3 },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(1, 7, 16, 0.82)" },
  modalCard: { backgroundColor: C.bgSoft, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 28, borderTopWidth: 1, borderColor: C.border, maxHeight: "94%" },
  modalHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: "#466078", alignSelf: "center", marginBottom: 17 },
  modalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sosIcon: { width: 42, height: 42, backgroundColor: C.accentSoft, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timerBox: { backgroundColor: "#0A1828", borderColor: C.border, borderWidth: 1, borderRadius: 18, alignItems: "center", padding: 12, marginTop: 14, gap: 3 },
  warningBox: { flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#352B1B", borderRadius: 14, borderColor: "#67512A", borderWidth: 1, padding: 11, marginTop: 12 },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 11, marginTop: 7 },
  supportRowDone: { borderColor: "#32745E", backgroundColor: "#14322F" },
});
