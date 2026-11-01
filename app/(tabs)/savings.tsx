import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { ActionButton, BrandMark, C, Copy, Eyebrow, Panel, Tag } from "@/components/ui/tetap-ui";

const STORAGE_KEY = "@tetap-hari-ini/savings-v1";
type DurationUnit = "hari" | "bulan" | "tahun";
type Deposit = { id: string; amount: number; date: string };
type SavingTodo = { id: string; title: string; done: boolean };
type SavingGoal = {
  id: string;
  name: string;
  purpose: string;
  target: number;
  duration: number;
  unit: DurationUnit;
  dailyMinimum: number | null;
  createdAt: string;
  deposits: Deposit[];
  todos: SavingTodo[];
};

const DURATION_UNITS: DurationUnit[] = ["hari", "bulan", "tahun"];
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const parseAmount = (value: string) => Number(value.replace(/[^0-9]/g, "")) || 0;
const formatRupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function addDuration(startValue: string, duration: number, unit: DurationUnit) {
  const [year, month, day] = startValue.split("-").map(Number);
  const result = new Date(year, month - 1, day, 12);
  if (unit === "hari") result.setDate(result.getDate() + duration);
  else {
    const monthsToAdd = duration * (unit === "tahun" ? 12 : 1);
    const monthIndex = result.getMonth() + monthsToAdd;
    const targetYear = result.getFullYear() + Math.floor(monthIndex / 12);
    const targetMonth = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    result.setFullYear(targetYear, targetMonth, Math.min(day, lastDay));
  }
  return result;
}

function getGoalStats(goal: SavingGoal) {
  const total = goal.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  const remaining = Math.max(0, goal.target - total);
  const due = addDuration(goal.createdAt, goal.duration, goal.unit);
  const start = new Date(`${goal.createdAt}T12:00:00`);
  const days = Math.max(1, Math.ceil((due.getTime() - start.getTime()) / 86_400_000));
  const elapsed = Math.max(0, Math.floor((new Date(`${todayKey()}T12:00:00`).getTime() - start.getTime()) / 86_400_000));
  const daysLeft = Math.max(0, days - elapsed);
  const recommendedDaily = remaining > 0 ? Math.ceil(remaining / Math.max(1, daysLeft)) : 0;
  const progress = goal.target > 0 ? Math.min(100, Math.round((total / goal.target) * 100)) : 0;
  return { total, remaining, days, daysLeft, recommendedDaily, progress };
}

function MoneyField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Copy size={12} weight="bold" tone="muted">{label}</Copy>
      <View style={styles.moneyInput}>
        <Copy size={13} weight="bold" tone="muted">Rp</Copy>
        <TextInput value={value} onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder={placeholder} placeholderTextColor={C.faint} style={styles.inputText} />
      </View>
    </View>
  );
}

export default function SavingsScreen() {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalPurpose, setGoalPurpose] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hari");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [todoText, setTodoText] = useState("");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw) as { goals?: SavingGoal[]; selectedId?: string | null };
        const loadedGoals = Array.isArray(saved.goals) ? saved.goals : [];
        setGoals(loadedGoals);
        setSelectedId(saved.selectedId && loadedGoals.some((goal) => goal.id === saved.selectedId) ? saved.selectedId : loadedGoals[0]?.id ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ goals, selectedId })).catch(() => undefined);
  }, [goals, selectedId, ready]);

  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === selectedId) ?? null, [goals, selectedId]);
  const stats = selectedGoal ? getGoalStats(selectedGoal) : null;

  const createGoal = () => {
    const target = parseAmount(goalAmount);
    const duration = Number.parseInt(durationValue, 10);
    const name = goalName.trim();
    if (!name || target <= 0 || !Number.isFinite(duration) || duration < 1) return;
    const goal: SavingGoal = {
      id: makeId(), name, purpose: goalPurpose.trim(), target, duration, unit: durationUnit,
      dailyMinimum: minimumAmount.trim() ? parseAmount(minimumAmount) || null : null,
      createdAt: todayKey(), deposits: [], todos: [],
    };
    setGoals((current) => [goal, ...current]);
    setSelectedId(goal.id);
    setGoalName(""); setGoalPurpose(""); setGoalAmount(""); setDurationValue("30"); setDurationUnit("hari"); setMinimumAmount(""); setShowGoalForm(false);
  };

  const addDeposit = () => {
    if (!selectedGoal) return;
    const amount = parseAmount(depositAmount);
    if (amount <= 0) return;
    const deposit: Deposit = { id: makeId(), amount, date: todayKey() };
    setGoals((current) => current.map((goal) => goal.id === selectedGoal.id ? { ...goal, deposits: [deposit, ...goal.deposits] } : goal));
    setDepositAmount("");
  };

  const addTodo = () => {
    if (!selectedGoal || !todoText.trim()) return;
    const todo: SavingTodo = { id: makeId(), title: todoText.trim(), done: false };
    setGoals((current) => current.map((goal) => goal.id === selectedGoal.id ? { ...goal, todos: [...goal.todos, todo] } : goal));
    setTodoText("");
  };

  const toggleTodo = (todoId: string) => {
    if (!selectedGoal) return;
    setGoals((current) => current.map((goal) => goal.id === selectedGoal.id ? { ...goal, todos: goal.todos.map((todo) => todo.id === todoId ? { ...todo, done: !todo.done } : todo) } : goal));
  };

  if (!ready) return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.accent} /><Copy size={13} tone="muted" style={{ marginTop: 10 }}>Memuat target lokal…</Copy></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topline}><BrandMark /><Tag color={C.mint}>TUJUAN UANG</Tag></View>
        <Eyebrow style={{ marginTop: 24 }}>Langkah kecil, nyata</Eyebrow>
        <Copy size={29} weight="extra" style={{ marginTop: 5 }}>Target tabungan</Copy>
        <Copy size={13} tone="muted" style={{ marginTop: 5 }}>Tetapkan tujuan, rencanakan setoran, dan catat jumlah yang benar-benar terkumpul.</Copy>

        <View style={styles.sectionHeading}>
          <View><Eyebrow>Rencana kamu</Eyebrow><Copy size={18} weight="bold" style={{ marginTop: 3 }}>{goals.length ? `${goals.length} tujuan` : "Mulai dengan satu tujuan"}</Copy></View>
          <Pressable accessibilityRole="button" onPress={() => setShowGoalForm((value) => !value)} style={styles.addCircle}><Feather name={showGoalForm ? "x" : "plus"} size={19} color={C.bg} /></Pressable>
        </View>

        {showGoalForm ? (
          <Panel style={{ gap: 14, marginBottom: 18 }}>
            <View><Copy size={18} weight="bold">Buat tujuan baru</Copy><Copy size={12} tone="muted" style={{ marginTop: 4 }}>Contoh: dana darurat, servis motor, atau kebutuhan keluarga.</Copy></View>
            <View style={{ gap: 7 }}><Copy size={12} weight="bold" tone="muted">Nama tujuan</Copy><TextInput value={goalName} onChangeText={setGoalName} placeholder="Misalnya: Dana darurat" placeholderTextColor={C.faint} style={styles.textInput} maxLength={60} /></View>
            <View style={{ gap: 7 }}><Copy size={12} weight="bold" tone="muted">Untuk apa? (opsional)</Copy><TextInput value={goalPurpose} onChangeText={setGoalPurpose} placeholder="Tuliskan alasan yang ingin kamu ingat" placeholderTextColor={C.faint} style={styles.textInput} maxLength={120} /></View>
            <MoneyField label="Target total" value={goalAmount} onChangeText={setGoalAmount} placeholder="5.000.000" />
            <View style={{ gap: 8 }}>
              <Copy size={12} weight="bold" tone="muted">Durasi target</Copy>
              <View style={styles.durationRow}><TextInput value={durationValue} onChangeText={(text) => setDurationValue(text.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={[styles.textInput, { flex: 0.75 }]} placeholder="30" placeholderTextColor={C.faint} />
                <View style={styles.unitRow}>{DURATION_UNITS.map((unit) => <Pressable key={unit} onPress={() => setDurationUnit(unit)} style={[styles.unitChip, durationUnit === unit && styles.unitChipSelected]}><Copy size={11} weight="bold" tone={durationUnit === unit ? "accent" : "muted"}>{unit}</Copy></Pressable>)}</View>
              </View>
            </View>
            <View style={styles.fallbackBox}>
              <View style={styles.fallbackTitle}><Feather name="life-buoy" size={16} color={C.gold} /><Copy size={12} weight="bold" tone="gold" style={{ flex: 1 }}>Rencana saat keadaan tak terduga</Copy></View>
              <Copy size={11} tone="muted" style={{ marginTop: 5 }}>Opsional: batas setoran minimum jika target harian penuh tak memungkinkan. Contoh Rp50.000. Setoran akan tetap tercatat sesuai jumlah aktual.</Copy>
              <MoneyField label="Setoran minimum per hari (opsional)" value={minimumAmount} onChangeText={setMinimumAmount} placeholder="50.000" />
            </View>
            <ActionButton title="Simpan tujuan" icon="check" onPress={createGoal} disabled={!goalName.trim() || parseAmount(goalAmount) <= 0 || Number(durationValue) < 1} />
          </Panel>
        ) : null}

        {goals.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 15 }}>
          {goals.map((goal) => <Pressable key={goal.id} onPress={() => setSelectedId(goal.id)} style={[styles.goalPill, goal.id === selectedId && styles.goalPillActive]}><Feather name={goal.id === selectedId ? "target" : "circle"} size={15} color={goal.id === selectedId ? C.accent : C.faint} /><Copy size={12} weight="bold" tone={goal.id === selectedId ? "text" : "muted"}>{goal.name}</Copy></Pressable>)}
        </ScrollView> : null}

        {!selectedGoal || !stats ? (
          <Panel style={{ alignItems: "center", paddingVertical: 28, marginBottom: 18 }}><View style={styles.emptyIcon}><Feather name="target" size={22} color={C.accent} /></View><Copy size={17} weight="bold" style={{ marginTop: 12 }}>Satu tujuan dulu</Copy><Copy size={12} tone="muted" style={{ textAlign: "center", marginTop: 5 }}>Pilih tombol + untuk membuat tujuan uang pertamamu.</Copy></Panel>
        ) : (
          <>
            <Panel style={styles.heroCard}>
              <View style={styles.goalNameRow}><View style={{ flex: 1 }}><Eyebrow>Tujuan terpilih</Eyebrow><Copy size={21} weight="extra" style={{ marginTop: 4 }}>{selectedGoal.name}</Copy></View><View style={styles.targetIcon}><Feather name="flag" size={20} color={C.accent} /></View></View>
              {selectedGoal.purpose ? <Copy size={12} tone="muted" style={{ marginTop: 8 }}>{selectedGoal.purpose}</Copy> : null}
              <View style={styles.progressLabel}><Copy size={12} tone="muted">Terkumpul</Copy><Copy size={12} weight="bold" tone="mint">{stats.progress}%</Copy></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${stats.progress}%` }]} /></View>
              <View style={styles.amountRow}><View><Copy size={11} tone="muted">Sudah terkumpul</Copy><Copy size={21} weight="extra" tone="mint" style={{ marginTop: 3 }}>{formatRupiah(stats.total)}</Copy></View><View style={{ alignItems: "flex-end" }}><Copy size={11} tone="muted">Target total</Copy><Copy size={15} weight="bold" style={{ marginTop: 5 }}>{formatRupiah(selectedGoal.target)}</Copy></View></View>
              <View style={styles.remainingBox}><Feather name={stats.remaining ? "trending-up" : "check-circle"} size={16} color={stats.remaining ? C.accent : C.mint} /><Copy size={12} style={{ flex: 1 }}>{stats.remaining ? <><Copy size={12} weight="bold" tone="accent">Sisa {formatRupiah(stats.remaining)}</Copy> untuk mencapai tujuan.</> : "Target tercapai. Hebat, kamu konsisten!"}</Copy></View>
            </Panel>

            <View style={styles.statRow}>
              <Panel style={styles.statCard}><Copy size={10} tone="muted">ANJURAN / HARI</Copy><Copy size={16} weight="extra" tone="accent" style={{ marginTop: 5 }}>{formatRupiah(stats.recommendedDaily)}</Copy><Copy size={10} tone="faint">agar target tetap terkejar</Copy></Panel>
              <Panel style={styles.statCard}><Copy size={10} tone="muted">WAKTU TERSISA</Copy><Copy size={16} weight="extra" style={{ marginTop: 5 }}>{stats.daysLeft} hari</Copy><Copy size={10} tone="faint">dari {stats.days} hari</Copy></Panel>
            </View>

            {selectedGoal.dailyMinimum ? <Panel style={styles.minimumCard}><Feather name="life-buoy" size={17} color={C.gold} /><View style={{ flex: 1 }}><Copy size={12} weight="bold" tone="gold">Setoran minimum opsional</Copy><Copy size={12} style={{ marginTop: 3 }}>{formatRupiah(selectedGoal.dailyMinimum)} saat kondisi tidak memungkinkan. Ini bukan target penuh; catat jumlah yang benar-benar masuk.</Copy></View></Panel> : null}

            <Panel style={{ marginTop: 14, gap: 12 }}>
              <View style={styles.sectionTitle}><View><Eyebrow>Catat uang masuk</Eyebrow><Copy size={17} weight="bold" style={{ marginTop: 3 }}>Setoran aktual</Copy></View><Feather name="plus-circle" size={20} color={C.mint} /></View>
              <Copy size={12} tone="muted">Masukkan jumlah yang benar-benar berhasil disisihkan hari ini. Tidak perlu mengubah atau menyamakan angka dengan target.</Copy>
              <MoneyField label="Jumlah setoran" value={depositAmount} onChangeText={setDepositAmount} placeholder="50.000" />
              <ActionButton title="Catat setoran" icon="plus" onPress={addDeposit} disabled={parseAmount(depositAmount) <= 0} />
            </Panel>

            <Panel style={{ marginTop: 14, gap: 12 }}>
              <View style={styles.sectionTitle}><View><Eyebrow>Langkah menuju tujuan</Eyebrow><Copy size={17} weight="bold" style={{ marginTop: 3 }}>Todo</Copy></View><Tag color={C.accent}>{selectedGoal.todos.filter((todo) => todo.done).length}/{selectedGoal.todos.length}</Tag></View>
              <View style={styles.addTodoRow}><TextInput value={todoText} onChangeText={setTodoText} onSubmitEditing={addTodo} returnKeyType="done" placeholder="Tambah langkah kecil…" placeholderTextColor={C.faint} style={[styles.textInput, { flex: 1 }]} maxLength={100} /><Pressable accessibilityRole="button" onPress={addTodo} style={styles.todoAdd}><Feather name="plus" size={18} color={C.bg} /></Pressable></View>
              {selectedGoal.todos.length ? selectedGoal.todos.map((todo) => <Pressable key={todo.id} onPress={() => toggleTodo(todo.id)} style={styles.todoRow}><View style={[styles.todoCheck, todo.done && styles.todoCheckDone]}>{todo.done ? <Feather name="check" size={13} color={C.bg} /> : null}</View><Copy size={13} tone={todo.done ? "faint" : "text"} style={{ flex: 1, textDecorationLine: todo.done ? "line-through" : "none" }}>{todo.title}</Copy></Pressable>) : <Copy size={12} tone="faint">Belum ada Todo. Mulai dari satu langkah sederhana.</Copy>}
            </Panel>

            <Panel style={{ marginTop: 14, gap: 11 }}>
              <View style={styles.sectionTitle}><View><Eyebrow>Riwayat</Eyebrow><Copy size={17} weight="bold" style={{ marginTop: 3 }}>Setoran tercatat</Copy></View><Tag color={C.mint}>{selectedGoal.deposits.length} kali</Tag></View>
              {selectedGoal.deposits.length ? selectedGoal.deposits.slice(0, 8).map((deposit) => <View key={deposit.id} style={styles.depositRow}><View style={styles.depositIcon}><Feather name="arrow-down-left" size={15} color={C.mint} /></View><View style={{ flex: 1 }}><Copy size={12} weight="bold">Setoran tabungan</Copy><Copy size={10} tone="muted" style={{ marginTop: 2 }}>{new Date(`${deposit.date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</Copy></View><Copy size={13} weight="bold" tone="mint">+{formatRupiah(deposit.amount)}</Copy></View>) : <Copy size={12} tone="faint">Setoran pertama akan muncul di sini.</Copy>}
              {selectedGoal.deposits.length > 8 ? <Copy size={10} tone="faint">Menampilkan 8 setoran terbaru.</Copy> : null}
            </Panel>
          </>
        )}

        <View style={styles.privacyNote}><Feather name="lock" size={14} color={C.faint} /><Copy size={10} tone="faint" style={{ flex: 1 }}>Data tujuan, Todo, dan setoran tersimpan lokal di perangkat ini; tidak dibagikan ke feed komunitas.</Copy></View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 30 },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 13 },
  addCircle: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: C.accent },
  textInput: { backgroundColor: C.bgSoft, borderColor: C.border, borderWidth: 1, borderRadius: 13, minHeight: 46, paddingHorizontal: 13, color: C.text, fontFamily: "PlusJakartaSans_500Medium", fontSize: 13 },
  moneyInput: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bgSoft, borderColor: C.border, borderWidth: 1, borderRadius: 13, minHeight: 46, paddingHorizontal: 13 },
  inputText: { flex: 1, color: C.text, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, paddingVertical: 9 },
  durationRow: { flexDirection: "row", gap: 9 },
  unitRow: { flex: 1.25, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bgSoft, borderColor: C.border, borderWidth: 1, borderRadius: 13, padding: 4 },
  unitChip: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 36, borderRadius: 9 },
  unitChipSelected: { backgroundColor: C.accentSoft },
  fallbackBox: { borderWidth: 1, borderColor: "#765D35", backgroundColor: "#342B1E", borderRadius: 15, padding: 12, gap: 10 },
  fallbackTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalPill: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: C.bgSoft },
  goalPillActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  emptyIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: C.accentSoft },
  heroCard: { padding: 17 },
  goalNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  progressLabel: { flexDirection: "row", justifyContent: "space-between", marginTop: 19, marginBottom: 7 },
  progressTrack: { height: 9, borderRadius: 99, backgroundColor: C.bgSoft, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, backgroundColor: C.mint },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  remainingBox: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 15, padding: 11, borderRadius: 13, backgroundColor: C.bgSoft },
  statRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  statCard: { flex: 1, padding: 13, borderRadius: 17, gap: 1 },
  minimumCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12, padding: 13, borderColor: "#765D35", backgroundColor: "#2A241D" },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addTodoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  todoAdd: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: C.accent },
  todoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  todoCheck: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, borderColor: C.faint, alignItems: "center", justifyContent: "center" },
  todoCheckDone: { backgroundColor: C.mint, borderColor: C.mint },
  depositRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 10 },
  depositIcon: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#17352F" },
  privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, paddingHorizontal: 3 },
});
