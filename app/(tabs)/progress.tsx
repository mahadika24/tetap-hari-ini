import React, { useMemo, useState } from "react";
import { Platform, ScrollView, Share, StyleSheet, Switch, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { ActionButton, BrandMark, C, Copy, Eyebrow, Panel, Tag } from "@/components/ui/tetap-ui";
import { dateKey, emptyDayRecord, useDaily, type ChecklistId } from "@/lib/daily-context";

const REQUIRED_LINE = "Hari ini saya tidak main judi.";
const TASKS: ChecklistId[] = ["sales", "transition", "afternoon", "safeApps", "family", "journal"];
const TASK_NAMES: Record<ChecklistId, string> = { sales: "sales sebelum 12.00", transition: "pulang / beralih ke ojol", afternoon: "ojol / istirahat", safeApps: "menghindari aplikasi berisiko", family: "foto & motivasi keluarga", journal: "komitmen malam" };
const URGE_NAMES: Record<string, string> = { air: "minum air", jalan: "jalan sebentar", catatan: "membuka catatan", orang: "menghubungi orang tepercaya" };
function dateLabel(date: Date) { return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }); }

export default function ProgressScreen() {
  const { data, today, todayKey, saveJournal, setRemindersEnabled } = useDaily();
  const [draft, setDraft] = useState<{ day: string; text: string } | null>(null);
  const [notice, setNotice] = useState("");
  const draftText = draft?.day === todayKey ? draft.text : today.journal;
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const record = data.records[dateKey(date)] ?? emptyDayRecord();
    const completed = TASKS.filter((task) => record.tasks[task]).length;
    return { date, record, completed, ratio: Math.round(completed / TASKS.length * 100) };
  }), [data.records]);

  const setupReminders = async (enabled: boolean) => {
    setNotice("");
    if (Platform.OS === "web") {
      setNotice("Pengingat harian terjadwal bekerja saat aplikasi dipasang di perangkat iOS atau Android.");
      return;
    }
    try {
      if (!enabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        setRemindersEnabled(false);
        return;
      }
      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!permission.granted) { setNotice("Izin notifikasi belum diberikan. Kamu bisa mengaktifkannya lewat Pengaturan perangkat."); return; }
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("routine", { name: "Pengingat rutinitas", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180, 120, 180], lightColor: C.accent });
      await Notifications.cancelAllScheduledNotificationsAsync();
      const reminders = [
        { hour: 11, minute: 55, title: "Batas sales pukul 12.00", body: "Selesaikan sales, lalu pulang atau beralih ke ojol. Jaga batasmu." },
        { hour: 20, minute: 30, title: "Luangkan waktu untuk keluarga", body: "Buka foto Ayah, Ibu, dan Adik. Baca kalimat hari ini." },
        { hour: 21, minute: 45, title: "Tulis komitmen sebelum tidur", body: "Tulis: “Hari ini saya tidak main judi.” Satu pilihan hari ini sudah berarti." },
      ];
      for (const reminder of reminders) {
        await Notifications.scheduleNotificationAsync({
          content: { title: reminder.title, body: reminder.body, sound: false },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: "routine" },
        });
      }
      setRemindersEnabled(true);
      setNotice("Tiga pengingat harian sudah aktif di perangkat ini.");
    } catch {
      setNotice("Pengingat belum dapat diatur di sesi ini. Coba lagi melalui aplikasi terpasang.");
    }
  };

  const saveTonight = () => {
    if (draftText.trim() !== REQUIRED_LINE) {
      setNotice(`Tulis persis kalimat ini dengan jujur sebelum menyimpan: “${REQUIRED_LINE}”`);
      return;
    }
    saveJournal(REQUIRED_LINE);
    setDraft({ day: todayKey, text: REQUIRED_LINE });
    setNotice("Catatan malam disimpan secara lokal.");
  };
  const shareSummary = async () => {
    const summary = `ATURAN HARIAN\nKerja sales selesai maksimal jam 12.\nSetelah itu fokus ojol / istirahat.\nTidak main judi sama sekali.\nMalam: baca catatan + lihat foto Ayah.\nTulis: “Hari ini saya tidak main judi.”`;
    try { await Share.share({ message: summary, title: "Pegangan saya hari ini" }); } catch { setNotice("Ringkasan siap untuk di-screenshot dari layar ini."); }
  };
  const progressLabel = today.tasks.journal ? "Catatan tersimpan" : "Belum ditulis";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BrandMark /><Tag color={C.accent}>LANGKAH KECIL</Tag></View>
        <View style={styles.heading}><Eyebrow>JEJAK YANG KAMU BANGUN</Eyebrow><Copy size={29} weight="extra" style={{ marginTop: 5 }}>Progres & catatan</Copy><Copy size={13} tone="muted" style={{ marginTop: 6 }}>Setiap centang adalah bukti bahwa kamu kembali memilih dirimu.</Copy></View>

        <Panel style={styles.journalCard}>
          <View style={styles.sectionRow}><View style={styles.journalIcon}><Feather name="edit-3" size={17} color={C.accent} /></View><View style={{ flex: 1 }}><Eyebrow>SEBELUM TIDUR</Eyebrow><Copy size={16} weight="bold" style={{ marginTop: 2 }}>Tulis satu kalimat jujur.</Copy></View><Tag color={today.tasks.journal ? C.mint : C.gold}>{progressLabel.toUpperCase()}</Tag></View>
          <TextInput value={draftText} onChangeText={(text) => setDraft({ day: todayKey, text })} multiline placeholder={REQUIRED_LINE} placeholderTextColor="#71849A" selectionColor={C.accent} style={styles.journalInput} accessibilityLabel="Catatan malam" />
          <Copy size={10} tone="muted" style={{ marginTop: 1 }}>Kalimat yang dijaga: “Hari ini saya tidak main judi.”</Copy>
          <ActionButton title="Simpan catatan malam" icon="check" onPress={saveTonight} style={{ marginTop: 13 }} />
        </Panel>

        <View style={styles.sectionHead}><View><Eyebrow>7 HARI TERAKHIR</Eyebrow><Copy size={19} weight="bold" style={{ marginTop: 3 }}>Lihat langkahmu</Copy></View><Feather name="activity" size={20} color={C.accent} /></View>
        <Panel style={styles.historyCard}>
          {week.map((item, index) => {
            const isToday = dateKey(item.date) === todayKey;
            const completedNames = TASKS.filter((task) => item.record.tasks[task]).map((task) => TASK_NAMES[task]);
            const urgeNames = item.record.urgeSteps.map((step) => URGE_NAMES[step]).filter(Boolean);
            return (
              <View key={dateKey(item.date)} style={[styles.historyEntry, index === week.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.historyRow}>
                  <View style={[styles.dayDot, item.completed === TASKS.length && styles.dayDotFull, isToday && styles.dayDotToday]}><Copy size={9} weight="extra" tone={item.completed === TASKS.length ? "mint" : "accent"}>{String(item.date.getDate()).padStart(2, "0")}</Copy></View>
                  <View style={{ flex: 1 }}><Copy size={12} weight="semi">{isToday ? "Hari ini" : dateLabel(item.date)}</Copy><Copy size={10} tone="muted" style={{ marginTop: 2 }}>{item.completed}/{TASKS.length} langkah · {item.record.urgeCount} kali memilih jeda</Copy></View>
                  <View style={styles.miniTrack}><View style={[styles.miniFill, { width: `${item.ratio}%` }]} /></View>
                </View>
                {completedNames.length ? <Copy size={10} tone="muted" style={styles.historyDetail}>Selesai: {completedNames.join(" · ")}</Copy> : null}
                {item.record.journal ? <View style={styles.historyNote}><Feather name="edit-3" size={12} color={C.accent} /><Copy size={10} style={{ flex: 1 }}>Catatan: {item.record.journal}</Copy></View> : null}
                {item.record.urgeCount > 0 ? <Copy size={10} tone="muted" style={styles.historyDetail}>Langkah jeda: {urgeNames.length ? urgeNames.join(" · ") : "dorongan dicatat"}</Copy> : null}
              </View>
            );
          })}
        </Panel>

        <Panel style={styles.reminderCard}>
          <View style={styles.sectionRow}><View style={styles.reminderIcon}><Feather name="bell" size={17} color={C.gold} /></View><View style={{ flex: 1 }}><Eyebrow>PENGINGAT DI PERANGKAT</Eyebrow><Copy size={15} weight="bold" style={{ marginTop: 3 }}>Biar batasmu tetap terlihat.</Copy></View><Switch value={data.remindersEnabled} onValueChange={setupReminders} trackColor={{ false: "#34485E", true: "#176A83" }} thumbColor={data.remindersEnabled ? C.accent : "#B6C5D4"} accessibilityLabel="Aktifkan pengingat harian" /></View>
          <View style={styles.reminderTimes}><Copy size={10} tone="muted">11.55 · akhiri sales</Copy><Copy size={10} tone="muted">20.30 · foto keluarga</Copy><Copy size={10} tone="muted">21.45 · catatan malam</Copy></View>
          {Platform.OS === "web" ? <Copy size={10} tone="gold" style={{ marginTop: 9 }}>Pengingat terjadwal memerlukan aplikasi terpasang di perangkat.</Copy> : null}
        </Panel>

        {notice ? <Panel style={styles.notice}><Copy size={11} tone="mint">{notice}</Copy></Panel> : null}

        <View style={styles.sectionHead}><View><Eyebrow>UNTUK DISIMPAN</Eyebrow><Copy size={19} weight="bold" style={{ marginTop: 3 }}>Pegangan ringkas</Copy></View><Feather name="bookmark" size={20} color={C.accent} /></View>
        <Panel style={styles.summaryCard}>
          <View style={styles.summaryBrand}><BrandMark compact /><Copy size={9} tone="muted" weight="bold" style={{ letterSpacing: 1.2 }}>KOMPAS HARI INI</Copy></View>
          <Copy size={24} weight="extra" style={{ marginTop: 17 }}>Pilih dirimu.</Copy>
          <View style={styles.summaryLine}><Feather name="clock" size={15} color={C.accent} /><Copy size={12} weight="semi" style={{ flex: 1 }}>Kerja sales selesai maksimal jam 12.</Copy></View>
          <View style={styles.summaryLine}><Feather name="navigation" size={15} color={C.accent} /><Copy size={12} weight="semi" style={{ flex: 1 }}>Setelah itu fokus ojol / istirahat.</Copy></View>
          <View style={styles.summaryLine}><Feather name="shield" size={15} color={C.mint} /><Copy size={12} weight="semi" style={{ flex: 1 }}>Tidak main judi sama sekali.</Copy></View>
          <View style={styles.summaryLine}><Feather name="heart" size={15} color={C.mint} /><Copy size={12} weight="semi" style={{ flex: 1 }}>Malam: baca catatan + lihat foto Ayah.</Copy></View>
          <View style={styles.commitment}><Copy size={9} tone="accent" weight="extra" style={{ letterSpacing: 1 }}>JANJI HARI INI</Copy><Copy size={14} weight="bold" style={{ marginTop: 3 }}>“Hari ini saya tidak main judi.”</Copy></View>
          <Copy size={9} tone="faint" style={{ marginTop: 12, textAlign: "center" }}>Satu hari. Satu pilihan. Mulai lagi besok.</Copy>
        </Panel>
        <ActionButton title="Bagikan pegangan ringkas" icon="share-2" variant="secondary" onPress={shareSummary} />
        <Copy size={10} tone="faint" style={{ textAlign: "center", paddingHorizontal: 16 }}>Catatan dan progres disimpan lokal di perangkat. Hapus aplikasi dapat menghapus datanya.</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 10, paddingBottom: 30, gap: 15 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { paddingTop: 8, paddingBottom: 2 },
  journalCard: { padding: 16 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  journalIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  journalInput: { marginTop: 15, minHeight: 103, borderWidth: 1, borderColor: "#304B66", borderRadius: 14, padding: 13, backgroundColor: "#0A1828", color: C.text, fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, lineHeight: 20, textAlignVertical: "top" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3, marginTop: 4 },
  historyCard: { paddingHorizontal: 15, paddingVertical: 6 },
  historyEntry: { borderBottomWidth: 1, borderBottomColor: "#1C334A", paddingBottom: 10, marginBottom: 3 },
  historyRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  historyDetail: { marginLeft: 41, paddingRight: 5, marginBottom: 4 },
  historyNote: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginLeft: 41, marginRight: 4, marginTop: 1, marginBottom: 5, borderLeftWidth: 2, borderLeftColor: "#2A5877", paddingLeft: 8 },
  dayDot: { width: 31, height: 31, borderRadius: 11, borderWidth: 1, borderColor: "#34536D", backgroundColor: "#0D2237", justifyContent: "center", alignItems: "center" },
  dayDotFull: { borderColor: "#397761", backgroundColor: "#153733" },
  dayDotToday: { borderColor: C.accent, borderWidth: 1.5 },
  miniTrack: { width: 46, height: 5, borderRadius: 4, backgroundColor: "#294058", overflow: "hidden" },
  miniFill: { height: 5, borderRadius: 4, backgroundColor: C.mint },
  reminderCard: { padding: 15, borderColor: "#5A4B30", backgroundColor: "#211E1A" },
  reminderIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "#39301F", alignItems: "center", justifyContent: "center" },
  reminderTimes: { flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#51442C", gap: 3 },
  notice: { padding: 12, borderColor: "#2E695D", backgroundColor: "#132F2D" },
  summaryCard: { padding: 20, backgroundColor: "#10283D", borderColor: "#2A526D" },
  summaryBrand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 },
  commitment: { borderTopWidth: 1, borderTopColor: "#2D4C65", marginTop: 17, paddingTop: 13 },
});
