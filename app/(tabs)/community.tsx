import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { ActionButton, BrandMark, C, Copy, Eyebrow, Panel, Tag } from "@/components/ui/tetap-ui";

type CommunityTab = "circles" | "stories" | "safety";
type ReportTarget = { type: "story" | "message"; id: number; alias: string };
type BlockTarget = { userId: number; alias: string };
type ReportReason = "gambling" | "harassment" | "spam" | "other";

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "gambling", label: "Promosi / ajakan judi" },
  { id: "harassment", label: "Pelecehan" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Hal lain" },
];

function friendlyTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "baru saja";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function LoginPanel({ onLogin, error }: { onLogin: () => void; error: string }) {
  return (
    <Panel style={styles.loginPanel}>
      <View style={styles.bigIcon}><Feather name="users" size={23} color={C.accent} /></View>
      <Eyebrow style={{ marginTop: 17 }}>RUANG SALING MENGUATKAN</Eyebrow>
      <Copy size={25} weight="extra" style={{ marginTop: 7 }}>Tidak perlu berjuang sendirian.</Copy>
      <Copy size={13} tone="muted" style={{ marginTop: 9, lineHeight: 21 }}>Masuk memakai akun Manus agar bisa membuat lingkaran privat dan bertemu teman seperjalanan. Nama akun dan emailmu tidak ditampilkan kepada anggota.</Copy>
      {error ? <Copy size={11} tone="gold" style={{ marginTop: 12 }}>{error}</Copy> : null}
      <ActionButton title="Masuk dengan Manus" icon="log-in" onPress={onLogin} style={{ marginTop: 18 }} />
      <Copy size={10} tone="faint" style={{ marginTop: 12, lineHeight: 17 }}>Chat dan Story tersimpan di server. Catatan pemulihan dan foto keluarga tetap pribadi di perangkat ini.</Copy>
    </Panel>
  );
}

function AliasSetup({ initialAlias, onSave, saving, error }: { initialAlias: string; onSave: (alias: string) => void; saving: boolean; error: string }) {
  const [alias, setAlias] = useState(initialAlias);
  return (
    <Panel style={styles.loginPanel}>
      <View style={styles.bigIcon}><Feather name="user-check" size={23} color={C.accent} /></View>
      <Eyebrow style={{ marginTop: 17 }}>IDENTITAS KOMUNITAS</Eyebrow>
      <Copy size={23} weight="extra" style={{ marginTop: 7 }}>Pilih nama samaran.</Copy>
      <Copy size={12} tone="muted" style={{ marginTop: 8, lineHeight: 19 }}>Nama ini yang terlihat teman di lingkaran dan feed. Jangan gunakan nama lengkap, alamat email, atau nomor telepon.</Copy>
      <TextInput value={alias} onChangeText={setAlias} maxLength={24} autoCapitalize="words" placeholder="Contoh: LangkahBaru" placeholderTextColor="#72859A" selectionColor={C.accent} style={styles.input} accessibilityLabel="Nama samaran komunitas" />
      <Copy size={10} tone="faint">3–24 karakter. Huruf, angka, spasi, garis bawah, atau tanda hubung.</Copy>
      {error ? <Copy size={11} tone="gold" style={{ marginTop: 8 }}>{error}</Copy> : null}
      <ActionButton title={saving ? "Menyimpan…" : "Simpan nama samaran"} icon="check" disabled={saving} onPress={() => onSave(alias)} style={{ marginTop: 14 }} />
    </Panel>
  );
}

function SegmentedTab({ id, title, icon, active, onPress }: { id: CommunityTab; title: string; icon: keyof typeof Feather.glyphMap; active: boolean; onPress: (id: CommunityTab) => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onPress(id)} style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && { opacity: 0.78 }]}>
      <Feather name={icon} size={15} color={active ? C.bg : C.muted} />
      <Copy size={10} weight="bold" style={{ color: active ? C.bg : C.muted }}>{title}</Copy>
    </Pressable>
  );
}

function ConfirmModal({ visible, title, body, confirmTitle, danger, onConfirm, onCancel }: { visible: boolean; title: string; body: string; confirmTitle: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.modalShade}>
        <View style={styles.modalCard}>
          <View style={[styles.modalIcon, danger && styles.modalIconDanger]}><Feather name={danger ? "alert-triangle" : "eye"} size={21} color={danger ? C.gold : C.accent} /></View>
          <Copy size={20} weight="extra" style={{ marginTop: 14 }}>{title}</Copy>
          <Copy size={12} tone="muted" style={{ marginTop: 8, lineHeight: 19 }}>{body}</Copy>
          <ActionButton title={confirmTitle} icon={danger ? "shield" : "arrow-up-right"} variant={danger ? "danger" : "primary"} onPress={onConfirm} style={{ marginTop: 18 }} />
          <ActionButton title="Kembali" variant="quiet" onPress={onCancel} style={{ marginTop: 5 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function CommunityScreen() {
  const auth = useAuth();
  const profileQuery = trpc.community.profile.mine.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  const circlesQuery = trpc.community.circles.list.useQuery(undefined, { enabled: auth.isAuthenticated && Boolean(profileQuery.data?.alias), refetchInterval: 15000 });
  const feedQuery = trpc.community.stories.feed.useQuery(undefined, { enabled: auth.isAuthenticated && Boolean(profileQuery.data?.alias), refetchInterval: 30000 });
  const blockedQuery = trpc.community.safety.blocked.useQuery(undefined, { enabled: auth.isAuthenticated && Boolean(profileQuery.data?.alias) });
  const moderationQuery = trpc.community.moderation.open.useQuery(undefined, { enabled: auth.isAuthenticated && profileQuery.data?.isModerator === true });

  const [activeTab, setActiveTab] = useState<CommunityTab>("circles");
  const [activeCircleId, setActiveCircleId] = useState<number | null>(null);
  const [leaveCircleTarget, setLeaveCircleTarget] = useState<{ id: number; name: string } | null>(null);
  const [circleForm, setCircleForm] = useState<"create" | "join" | null>(null);
  const [circleName, setCircleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [storyAudience, setStoryAudience] = useState<"circle" | "public">("circle");
  const [storyCircleId, setStoryCircleId] = useState<number | null>(null);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("other");
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [aliasError, setAliasError] = useState("");

  const circles = circlesQuery.data ?? [];
  const activeCircle = circles.find((circle) => circle.id === activeCircleId) ?? null;
  const privateStoryCircle = circles.find((circle) => circle.id === storyCircleId) ?? circles[0] ?? null;
  const activeCircleQuery = trpc.community.circles.messages.useQuery(
    { circleId: activeCircle?.id ?? 0 },
    { enabled: auth.isAuthenticated && Boolean(activeCircle), refetchInterval: activeCircle ? 6000 : false },
  );

  const saveAlias = trpc.community.profile.saveAlias.useMutation({
    onSuccess: async () => { setAliasError(""); setNotice("Nama samaran tersimpan."); await profileQuery.refetch(); },
    onError: (error) => setAliasError(error.message),
  });
  const createCircle = trpc.community.circles.create.useMutation({
    onSuccess: async (circle) => {
      setCircleForm(null); setCircleName(""); setActiveCircleId(circle.id); setNotice("Lingkaran privat siap. Bagikan kode hanya kepada orang tepercaya."); await circlesQuery.refetch();
    },
    onError: (error) => setNotice(error.message),
  });
  const joinCircle = trpc.community.circles.join.useMutation({
    onSuccess: async (circle) => {
      setCircleForm(null); setInviteCode(""); setActiveCircleId(circle.id); setNotice(circle.alreadyMember ? "Kamu sudah menjadi anggota lingkaran ini." : `Kamu bergabung dengan ${circle.name}.`); await circlesQuery.refetch();
    },
    onError: (error) => setNotice(error.message),
  });
  const sendMessage = trpc.community.circles.send.useMutation({
    onSuccess: async () => { setMessageDraft(""); await activeCircleQuery.refetch(); },
    onError: (error) => setNotice(error.message),
  });
  const removeMessage = trpc.community.circles.deleteMessage.useMutation({
    onSuccess: async () => { setNotice("Pesanmu dihapus."); await activeCircleQuery.refetch(); },
    onError: (error) => setNotice(error.message),
  });
  const createStory = trpc.community.stories.create.useMutation({
    onSuccess: async () => { setStoryDraft(""); setConfirmPublic(false); setNotice("Story dibagikan dan akan hilang dari feed setelah 24 jam."); await feedQuery.refetch(); },
    onError: (error) => { setConfirmPublic(false); setNotice(error.message); },
  });
  const removeStory = trpc.community.stories.remove.useMutation({
    onSuccess: async () => { setNotice("Story milikmu dihapus."); await feedQuery.refetch(); },
    onError: (error) => setNotice(error.message),
  });
  const blockUser = trpc.community.safety.block.useMutation({
    onSuccess: async (result) => {
      setBlockTarget(null); setActiveCircleId(null);
      setNotice(result.leftCircleCount ? `Akun diblokir. Kamu keluar dari ${result.leftCircleCount} lingkaran bersama.` : "Akun diblokir. Kontennya disembunyikan dari kalian berdua.");
      await Promise.all([feedQuery.refetch(), circlesQuery.refetch(), blockedQuery.refetch()]);
    },
    onError: (error) => { setBlockTarget(null); setNotice(error.message); },
  });
  const unblockUser = trpc.community.safety.unblock.useMutation({
    onSuccess: async () => { setNotice("Pemblokiran dibuka."); await Promise.all([feedQuery.refetch(), blockedQuery.refetch()]); },
    onError: (error) => setNotice(error.message),
  });
  const reportContent = trpc.community.safety.report.useMutation({
    onSuccess: async () => { setReportTarget(null); setNotice("Laporan terkirim untuk ditinjau."); await Promise.all([feedQuery.refetch(), activeCircleQuery.refetch()]); },
    onError: (error) => { setReportTarget(null); setNotice(error.message); },
  });
  const resolveReport = trpc.community.moderation.resolve.useMutation({
    onSuccess: async () => { setNotice("Tinjauan moderasi diperbarui."); await Promise.all([moderationQuery.refetch(), feedQuery.refetch(), activeCircleQuery.refetch()]); },
    onError: (error) => setNotice(error.message),
  });

  const stories = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const blockedUsers = blockedQuery.data ?? [];
  const reports = moderationQuery.data ?? [];
  const leaveCircle = trpc.community.circles.leave.useMutation({
    onSuccess: async (result) => {
      setLeaveCircleTarget(null); setActiveCircleId(null); setMessageDraft("");
      setNotice(result.circleDeleted ? "Lingkaran kosong dan isinya telah dihapus." : result.ownerTransferred ? "Kamu keluar; kepemilikan dialihkan kepada anggota yang paling lama bergabung." : "Kamu keluar. Anggota yang tersisa tetap dapat melihat pesan lama.");
      await circlesQuery.refetch();
    },
    onError: (error) => { setLeaveCircleTarget(null); setNotice(error.message); },
  });

  const beginLogin = async () => {
    setLoginError("");
    try { await startOAuthLogin(); } catch { setLoginError("Masuk belum dapat dibuka. Periksa koneksi lalu coba lagi."); }
  };
  const shareInvite = async (code: string, name: string) => {
    try { await Share.share({ title: "Undangan lingkaran dukungan", message: `Kamu diundang ke lingkaran “${name}” di Tetap Hari Ini. Kode undangan privat: ${code}` }); }
    catch { setNotice(`Bagikan kode ini secara pribadi kepada teman tepercaya: ${code}`); }
  };
  const submitStory = (audience: "circle" | "public") => {
    if (audience === "public") {
      setConfirmPublic(true);
      return;
    }
    if (!privateStoryCircle) { setNotice("Buat atau gabung ke lingkaran dulu untuk membagikan Story privat."); return; }
    createStory.mutate({ body: storyDraft.trim(), audience: "circle", circleId: privateStoryCircle.id, confirmPublic: false });
  };
  const confirmPublicStory = () => {
    createStory.mutate({ body: storyDraft.trim(), audience: "public", confirmPublic: true });
  };

  if (auth.loading) {
    return <SafeAreaView edges={["top"]} style={styles.safe}><View style={styles.center}><ActivityIndicator color={C.accent} /><Copy tone="muted" size={12} style={{ marginTop: 10 }}>Memeriksa sesi…</Copy></View></SafeAreaView>;
  }

  if (!auth.isAuthenticated) {
    return <SafeAreaView edges={["top"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><BrandMark /><Tag color={C.accent}>KOMUNITAS PRIVAT</Tag></View><LoginPanel onLogin={() => void beginLogin()} error={loginError} /></ScrollView></SafeAreaView>;
  }

  if (profileQuery.isLoading) {
    return <SafeAreaView edges={["top"]} style={styles.safe}><View style={styles.center}><ActivityIndicator color={C.accent} /><Copy tone="muted" size={12} style={{ marginTop: 10 }}>Menyiapkan profil samaran…</Copy></View></SafeAreaView>;
  }

  if (profileQuery.error) {
    return <SafeAreaView edges={["top"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><BrandMark /><Tag color={C.gold}>SESI BELUM SIAP</Tag></View><Panel style={styles.loginPanel}><Copy size={20} weight="bold">Tidak dapat membuka komunitas.</Copy><Copy size={12} tone="muted" style={{ marginTop: 8 }}>{profileQuery.error.message}</Copy><ActionButton title="Coba lagi" icon="refresh-cw" onPress={() => void profileQuery.refetch()} style={{ marginTop: 16 }} /><ActionButton title="Masuk ulang dengan Manus" icon="log-in" variant="secondary" onPress={() => void auth.logout().then(beginLogin)} style={{ marginTop: 8 }} /></Panel></ScrollView></SafeAreaView>;
  }

  if (!profileQuery.data?.alias) {
    return <SafeAreaView edges={["top"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><BrandMark /><Tag color={C.accent}>KOMUNITAS</Tag></View><AliasSetup initialAlias="" saving={saveAlias.isPending} error={aliasError} onSave={(alias) => saveAlias.mutate({ alias })} /></ScrollView></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}><BrandMark /><View style={styles.identity}><View style={styles.onlineDot} /><Copy size={11} weight="bold">{profileQuery.data.alias}</Copy></View></View>
          <View style={styles.heading}><Eyebrow>LANGKAH KECIL, BERSAMA</Eyebrow><Copy size={28} weight="extra" style={{ marginTop: 5 }}>Ruang dukungan.</Copy><Copy size={12} tone="muted" style={{ marginTop: 5, lineHeight: 18 }}>Saling menguatkan tanpa membuka identitas asli.</Copy></View>
          <View style={styles.tabs}>
            <SegmentedTab id="circles" title="Lingkaran" icon="users" active={activeTab === "circles"} onPress={(tab) => { setActiveTab(tab); setNotice(""); }} />
            <SegmentedTab id="stories" title="Story" icon="clock" active={activeTab === "stories"} onPress={(tab) => { setActiveTab(tab); setNotice(""); }} />
            <SegmentedTab id="safety" title="Privasi" icon="shield" active={activeTab === "safety"} onPress={(tab) => { setActiveTab(tab); setNotice(""); }} />
          </View>

          {activeTab === "circles" ? (
            <>
              {activeCircle ? (
                <>
                  <View style={styles.circleTitleRow}>
                    <Pressable accessibilityRole="button" onPress={() => setActiveCircleId(null)} style={styles.backButton}><Feather name="arrow-left" size={17} color={C.text} /></Pressable>
                    <View style={{ flex: 1 }}><Eyebrow>LINGKARAN PRIVAT</Eyebrow><Copy size={17} weight="bold" style={{ marginTop: 2 }}>{activeCircle.name}</Copy></View>
                    <Pressable accessibilityRole="button" onPress={() => void shareInvite(activeCircle.inviteCode, activeCircle.name)} style={styles.shareCode}><Feather name="share-2" size={15} color={C.accent} /><Copy size={9} tone="accent" weight="bold">Undang</Copy></Pressable>
                  </View>
                  <Panel style={styles.invitePanel}><Copy size={10} tone="muted">Kode privat · bagikan hanya ke orang tepercaya</Copy><Copy size={15} weight="extra" style={{ letterSpacing: 2, marginTop: 5 }}>{activeCircle.inviteCode}</Copy></Panel>
                  <ActionButton title="Keluar dari lingkaran" icon="log-out" variant="danger" small onPress={() => setLeaveCircleTarget({ id: activeCircle.id, name: activeCircle.name })} />
                  <View style={styles.chatIntro}><Copy size={10} tone="muted">Pesan teks hanya terlihat anggota aktif. Tautan dan data keuangan tidak diizinkan.</Copy></View>
                  {activeCircleQuery.isLoading ? <View style={styles.centerSmall}><ActivityIndicator color={C.accent} /></View> : null}
                  {(activeCircleQuery.data ?? []).map((message) => {
                    const mine = message.authorId === auth.user?.id;
                    return (
                      <View key={message.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
                        <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
                          <View style={styles.messageMeta}><Copy size={9} tone={mine ? "accent" : "muted"} weight="bold">{mine ? "Kamu" : message.authorAlias}</Copy><Copy size={9} tone="faint">{friendlyTime(message.createdAt)}</Copy></View>
                          <Copy size={12} style={{ marginTop: 4, lineHeight: 18 }}>{message.body}</Copy>
                        </View>
                        {!mine ? <View style={styles.contentActions}><Pressable accessibilityRole="button" onPress={() => { setReportTarget({ type: "message", id: message.id, alias: message.authorAlias }); setReportReason("other"); }}><Copy size={9} tone="muted">Laporkan</Copy></Pressable><Pressable accessibilityRole="button" onPress={() => setBlockTarget({ userId: message.authorId, alias: message.authorAlias })}><Copy size={9} tone="gold">Blokir</Copy></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => removeMessage.mutate({ messageId: message.id })}><Copy size={9} tone="faint">Hapus pesan</Copy></Pressable>}
                      </View>
                    );
                  })}
                  {!activeCircleQuery.isLoading && !(activeCircleQuery.data?.length) ? <Panel style={styles.emptyPanel}><Copy size={12} weight="semi">Mulai dengan satu kalimat dukungan.</Copy><Copy size={10} tone="muted" style={{ marginTop: 4 }}>Kamu bisa berbagi tanpa menceritakan detail yang belum nyaman.</Copy></Panel> : null}
                  <Panel style={styles.composer}>
                    <TextInput value={messageDraft} onChangeText={setMessageDraft} multiline maxLength={1000} placeholder="Tulis pesan yang mendukung…" placeholderTextColor="#71849A" selectionColor={C.accent} style={[styles.input, styles.messageInput]} accessibilityLabel="Pesan lingkaran" />
                    <View style={styles.composerBottom}><Copy size={9} tone="faint">Tanpa tautan · {messageDraft.length}/1000</Copy><ActionButton title={sendMessage.isPending ? "Mengirim…" : "Kirim"} icon="send" small disabled={sendMessage.isPending || !messageDraft.trim()} onPress={() => activeCircle && sendMessage.mutate({ circleId: activeCircle.id, body: messageDraft.trim() })} /></View>
                  </Panel>
                </>
              ) : (
                <>
                  <Panel style={styles.safetyBanner}><Feather name="lock" size={16} color={C.mint} /><Copy size={11} style={{ flex: 1, lineHeight: 17 }}>Lingkaran hanya dapat dimasuki dengan kode undangan. Percakapan tidak tampil di feed Story.</Copy></Panel>
                  <View style={styles.sectionRow}><Eyebrow>LINGKARAN SAYA</Eyebrow><Copy size={10} tone="muted">{circles.length} ruang</Copy></View>
                  {circlesQuery.isLoading ? <View style={styles.centerSmall}><ActivityIndicator color={C.accent} /></View> : null}
                  {circles.map((circle) => (
                    <Pressable key={circle.id} onPress={() => { setActiveCircleId(circle.id); setNotice(""); }} style={({ pressed }) => [styles.circleCard, pressed && { opacity: 0.78 }]}>
                      <View style={styles.circleSymbol}><Feather name="users" size={17} color={C.accent} /></View>
                      <View style={{ flex: 1 }}><Copy size={13} weight="bold">{circle.name}</Copy><Copy size={10} tone="muted" style={{ marginTop: 2 }}>Dikelola {circle.ownerAlias ?? "anggota"} · kode {circle.inviteCode}</Copy></View>
                      <Feather name="chevron-right" size={16} color={C.muted} />
                    </Pressable>
                  ))}
                  {!circlesQuery.isLoading && !circles.length ? <Panel style={styles.emptyPanel}><View style={styles.bigIcon}><Feather name="users" size={20} color={C.accent} /></View><Copy size={14} weight="bold" style={{ marginTop: 12 }}>Buat ruang kecil yang aman.</Copy><Copy size={10} tone="muted" style={{ marginTop: 5, lineHeight: 16 }}>Undang satu atau beberapa orang tepercaya. Kode hanya perlu dibagikan secara pribadi.</Copy></Panel> : null}
                  {circleForm ? (
                    <Panel style={styles.formPanel}>
                      <View style={styles.sectionRow}><Copy size={14} weight="bold">{circleForm === "create" ? "Buat lingkaran" : "Gabung dengan kode"}</Copy><Pressable onPress={() => setCircleForm(null)}><Feather name="x" size={17} color={C.muted} /></Pressable></View>
                      {circleForm === "create" ? <TextInput value={circleName} onChangeText={setCircleName} maxLength={60} placeholder="Nama ruang, misalnya Langkah Baru" placeholderTextColor="#71849A" style={styles.input} /> : <TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" maxLength={32} placeholder="Kode dari teman tepercaya" placeholderTextColor="#71849A" style={styles.input} />}
                      <ActionButton title={circleForm === "create" ? "Buat ruang privat" : "Gabung lingkaran"} icon={circleForm === "create" ? "plus" : "log-in"} disabled={createCircle.isPending || joinCircle.isPending} onPress={() => circleForm === "create" ? createCircle.mutate({ name: circleName.trim() }) : joinCircle.mutate({ inviteCode: inviteCode.trim() })} style={{ marginTop: 10 }} />
                    </Panel>
                  ) : (
                    <View style={styles.actionRow}><ActionButton title="Buat lingkaran" icon="plus" small onPress={() => setCircleForm("create")} style={{ flex: 1 }} /><ActionButton title="Masukkan kode" icon="key" variant="secondary" small onPress={() => setCircleForm("join")} style={{ flex: 1 }} /></View>
                  )}
                </>
              )}
            </>
          ) : null}

          {activeTab === "stories" ? (
            <>
              <Panel style={styles.safetyBanner}><Feather name="eye" size={16} color={C.accent} /><Copy size={11} style={{ flex: 1, lineHeight: 17 }}>Story dapat dibaca akun dalam lingkaranmu atau seluruh pengguna aplikasi. Story tidak dibuka untuk web umum.</Copy></Panel>
              <Panel style={styles.storyComposer}>
                <View style={styles.sectionRow}><View style={styles.storyIcon}><Feather name="edit-3" size={16} color={C.accent} /></View><View style={{ flex: 1 }}><Eyebrow>RAYAKAN USAHAMU</Eyebrow><Copy size={14} weight="bold" style={{ marginTop: 2 }}>Bagikan satu pencapaian.</Copy></View></View>
                <TextInput value={storyDraft} onChangeText={setStoryDraft} multiline maxLength={500} placeholder="Contoh: Hari ini saya melewati satu dorongan dengan menghubungi teman…" placeholderTextColor="#71849A" selectionColor={C.accent} style={[styles.input, styles.storyInput]} accessibilityLabel="Teks Story pencapaian" />
                <View style={styles.audienceLabel}><Eyebrow>PILIH AUDIENS — PRIVAT SEBAGAI BAWAAN</Eyebrow></View>
                <View style={styles.audienceRow}>
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected: storyAudience === "circle" }} onPress={() => setStoryAudience("circle")} style={[styles.audienceOption, storyAudience === "circle" && styles.audienceOptionSelected]}>
                    <Feather name="lock" size={14} color={storyAudience === "circle" ? C.mint : C.muted} /><Copy size={10} weight="bold" style={{ flex: 1 }}>Lingkaran</Copy>{storyAudience === "circle" ? <Feather name="check-circle" size={14} color={C.mint} /> : null}
                  </Pressable>
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected: storyAudience === "public" }} onPress={() => setStoryAudience("public")} style={[styles.audienceOption, storyAudience === "public" && styles.audienceOptionPublic]}>
                    <Feather name="globe" size={14} color={storyAudience === "public" ? C.gold : C.muted} /><Copy size={10} weight="bold" style={{ flex: 1 }}>Publik di aplikasi</Copy>{storyAudience === "public" ? <Feather name="check-circle" size={14} color={C.gold} /> : null}
                  </Pressable>
                </View>
                {storyAudience === "circle" ? (
                  circles.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleChips}>{circles.map((circle) => <Pressable key={circle.id} onPress={() => setStoryCircleId(circle.id)} style={[styles.circleChip, privateStoryCircle?.id === circle.id && styles.circleChipSelected]}><Copy size={10} tone={privateStoryCircle?.id === circle.id ? "mint" : "muted"}>{circle.name}</Copy></Pressable>)}</ScrollView>
                    : <Copy size={10} tone="muted" style={{ marginTop: 7 }}>Buat atau gabung lingkaran untuk membagikan secara privat.</Copy>
                ) : <Copy size={10} tone="gold" style={{ marginTop: 7, lineHeight: 15 }}>Story ini akan terlihat semua akun Tetap Hari Ini sampai 24 jam. Hindari nama asli, nomor, lokasi, atau detail keuangan.</Copy>}
                <View style={styles.composerBottom}><Copy size={9} tone="faint">Teks saja · {storyDraft.length}/500</Copy><ActionButton title={storyAudience === "public" ? "Tinjau audiens" : "Bagikan privat"} icon={storyAudience === "public" ? "eye" : "lock"} small disabled={createStory.isPending || storyDraft.trim().length < 3 || (storyAudience === "circle" && !privateStoryCircle)} onPress={() => submitStory(storyAudience)} /></View>
              </Panel>
              <View style={styles.sectionRow}><Eyebrow>STORY TERBARU</Eyebrow><Copy size={10} tone="muted">Hilang setelah 24 jam</Copy></View>
              {feedQuery.isLoading ? <View style={styles.centerSmall}><ActivityIndicator color={C.accent} /></View> : null}
              {stories.map((story) => (
                <Panel key={story.id} style={styles.storyCard}>
                  <View style={styles.storyHead}><View style={styles.avatar}><Copy size={10} weight="extra" tone="accent">{story.authorAlias.slice(0, 1).toUpperCase()}</Copy></View><View style={{ flex: 1 }}><Copy size={11} weight="bold">{story.authorAlias}{story.authorId === auth.user?.id ? " · kamu" : ""}</Copy><Copy size={9} tone="muted" style={{ marginTop: 2 }}>{friendlyTime(story.createdAt)} · selama 24 jam</Copy></View><Tag color={story.audience === "public" ? C.gold : C.mint}>{story.audience === "public" ? "PUBLIK" : story.circleName ?? "LINGKARAN"}</Tag></View>
                  <Copy size={13} style={{ marginTop: 13, lineHeight: 20 }}>{story.body}</Copy>
                  <View style={styles.storyActions}>
                    {story.authorId === auth.user?.id ? <Pressable accessibilityRole="button" onPress={() => removeStory.mutate({ storyId: story.id })}><Copy size={9} tone="muted">Hapus Story</Copy></Pressable> : <><Pressable accessibilityRole="button" onPress={() => { setReportTarget({ type: "story", id: story.id, alias: story.authorAlias }); setReportReason("other"); }}><Copy size={9} tone="muted">Laporkan</Copy></Pressable><Pressable accessibilityRole="button" onPress={() => setBlockTarget({ userId: story.authorId, alias: story.authorAlias })}><Copy size={9} tone="gold">Blokir</Copy></Pressable></>}
                  </View>
                </Panel>
              ))}
              {!feedQuery.isLoading && !stories.length ? <Panel style={styles.emptyPanel}><Copy size={12} weight="bold">Belum ada Story yang tampil.</Copy><Copy size={10} tone="muted" style={{ marginTop: 4 }}>Bagikan pencapaian kecil secara privat, atau pilih publik setelah membaca konfirmasinya.</Copy></Panel> : null}
            </>
          ) : null}

          {activeTab === "safety" ? (
            <>
              <Panel style={styles.safetyBanner}><Feather name="shield" size={16} color={C.mint} /><Copy size={11} style={{ flex: 1, lineHeight: 17 }}>Jangan bagikan kata sandi, alamat rumah, nomor telepon, atau informasi uang. Konten publik bisa disalin. Story hilang dari feed setelah 24 jam, tetapi teksnya dapat tetap tersimpan di database proyek.</Copy></Panel>
              <View style={styles.sectionRow}><Eyebrow>AKUN YANG KAMU BLOKIR</Eyebrow><Copy size={10} tone="muted">{blockedUsers.length}</Copy></View>
              {blockedUsers.map((blocked) => <Panel key={blocked.userId} style={styles.blockedRow}><View style={styles.avatar}><Feather name="user-x" size={13} color={C.muted} /></View><Copy size={11} weight="semi" style={{ flex: 1 }}>{blocked.alias}</Copy><Pressable onPress={() => unblockUser.mutate({ userId: blocked.userId })}><Copy size={9} tone="accent">Buka blokir</Copy></Pressable></Panel>)}
              {!blockedUsers.length ? <Copy size={10} tone="faint">Belum ada akun yang diblokir.</Copy> : null}
              {profileQuery.data.isModerator ? (
                <>
                  <View style={[styles.sectionRow, { marginTop: 8 }]}><Eyebrow>ANTREAN LAPORAN ADMIN</Eyebrow><Copy size={10} tone="gold">{reports.length}</Copy></View>
                  {reports.map((report) => <Panel key={report.id} style={styles.reportCard}><View style={styles.sectionRow}><Tag color={C.gold}>{report.targetType.toUpperCase()} · {report.reason.toUpperCase()}</Tag><Copy size={9} tone="muted">dari {report.reporterAlias}</Copy></View><Copy size={10} tone="muted" style={{ marginTop: 7 }}>oleh {report.authorAlias}</Copy><Copy size={12} style={{ marginTop: 5 }}>{report.targetBody}</Copy><View style={styles.actionRow}><ActionButton title="Sembunyikan" icon="eye-off" variant="danger" small onPress={() => resolveReport.mutate({ reportId: report.id, action: "hide" })} style={{ flex: 1 }} /><ActionButton title="Tinjau, tetap tampil" icon="check" variant="secondary" small onPress={() => resolveReport.mutate({ reportId: report.id, action: "reviewed" })} style={{ flex: 1 }} /><ActionButton title="Abaikan" variant="quiet" small onPress={() => resolveReport.mutate({ reportId: report.id, action: "dismiss" })} /></View></Panel>)}
                  {!moderationQuery.isLoading && !reports.length ? <Copy size={10} tone="faint">Tidak ada laporan yang menunggu.</Copy> : null}
                </>
              ) : null}
              <Copy size={10} tone="faint" style={{ lineHeight: 16, marginTop: 6 }}>Laporan dibaca moderator aplikasi. Chat/Story teks MVP disimpan di server; fitur ini bukan konseling darurat dan tidak terenkripsi end-to-end.</Copy>
            </>
          ) : null}

          {notice ? <Panel style={styles.notice}><Copy size={10} tone="mint">{notice}</Copy></Panel> : null}
          <View style={styles.footer}><Copy size={9} tone="faint">Nama samaran · ruang dukungan · tanpa tekanan</Copy></View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmPublic}
        title="Bagikan ke feed publik aplikasi?"
        body="Semua akun Tetap Hari Ini yang masuk dapat membaca Story ini selama 24 jam. Nama asli dan emailmu tidak ditampilkan, tetapi isi tulisan dapat memberi petunjuk tentang dirimu atau disalin pembaca. Lanjutkan hanya jika kamu nyaman."
        confirmTitle={createStory.isPending ? "Menerbitkan…" : "Ya, terbitkan Story"}
        onConfirm={confirmPublicStory}
        onCancel={() => setConfirmPublic(false)}
      />
      <ConfirmModal
        visible={Boolean(blockTarget)}
        title={`Blokir ${blockTarget?.alias ?? "akun ini"}?`}
        body="Konten kalian akan saling disembunyikan. Untuk mencegah kontak di grup bersama, kamu akan keluar dari lingkaran yang sama; jika kamu pemilik, kepemilikan dialihkan. Membuka blokir tidak otomatis mengembalikanmu ke lingkaran."
        confirmTitle={blockUser.isPending ? "Memblokir…" : "Blokir akun"}
        danger
        onConfirm={() => blockTarget && blockUser.mutate({ userId: blockTarget.userId })}
        onCancel={() => setBlockTarget(null)}
      />
      <ConfirmModal
        visible={Boolean(leaveCircleTarget)}
        title="Keluar dari lingkaran?"
        body="Aksesmu ke chat dan Story privat berhenti. Jika kamu pemilik, kepemilikan berpindah ke anggota paling lama bergabung; jika hanya kamu yang tersisa, lingkaran beserta seluruh chat dan Story privat di dalamnya akan dihapus. Pesan lama tetap terlihat oleh anggota yang tersisa."
        confirmTitle={leaveCircle.isPending ? "Keluar…" : "Ya, keluar"}
        danger
        onConfirm={() => leaveCircleTarget && leaveCircle.mutate({ circleId: leaveCircleTarget.id })}
        onCancel={() => setLeaveCircleTarget(null)}
      />
      <Modal visible={Boolean(reportTarget)} transparent animationType="fade" onRequestClose={() => setReportTarget(null)} statusBarTranslucent>
        <View style={styles.modalShade}><View style={styles.modalCard}><View style={[styles.modalIcon, styles.modalIconDanger]}><Feather name="flag" size={19} color={C.gold} /></View><Copy size={19} weight="extra" style={{ marginTop: 12 }}>Laporkan ke moderator</Copy><Copy size={11} tone="muted" style={{ marginTop: 5 }}>Pilih alasan. Laporan hanya dapat dilihat moderator aplikasi.</Copy>
          {REPORT_REASONS.map((reason) => <Pressable key={reason.id} onPress={() => setReportReason(reason.id)} style={[styles.reasonRow, reportReason === reason.id && styles.reasonRowSelected]}><Copy size={11} style={{ flex: 1 }}>{reason.label}</Copy>{reportReason === reason.id ? <Feather name="check-circle" size={15} color={C.accent} /> : null}</Pressable>)}
          <ActionButton title={reportContent.isPending ? "Mengirim…" : "Kirim laporan"} icon="flag" variant="danger" disabled={reportContent.isPending} onPress={() => reportTarget && reportContent.mutate({ targetType: reportTarget.type, targetId: reportTarget.id, reason: reportReason })} style={{ marginTop: 12 }} /><ActionButton title="Batal" variant="quiet" onPress={() => setReportTarget(null)} />
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 28, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25 },
  centerSmall: { minHeight: 55, alignItems: "center", justifyContent: "center" },
  header: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  identity: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint },
  heading: { paddingTop: 3 },
  loginPanel: { padding: 20, marginTop: 12 },
  bigIcon: { width: 48, height: 48, borderRadius: 17, borderWidth: 1, borderColor: "#2B5471", backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: "#091726", paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, marginTop: 12 },
  tabs: { flexDirection: "row", gap: 7, padding: 5, borderRadius: 16, backgroundColor: "#0A1725", borderWidth: 1, borderColor: C.border },
  segment: { minHeight: 38, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12 },
  segmentActive: { backgroundColor: C.accent },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  safetyBanner: { padding: 12, flexDirection: "row", alignItems: "center", gap: 9, borderColor: "#284E4C", backgroundColor: "#102322" },
  circleCard: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17 },
  circleSymbol: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: C.accentSoft, borderRadius: 13 },
  emptyPanel: { padding: 16, alignItems: "flex-start" },
  formPanel: { padding: 13, gap: 6 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  circleTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  shareCode: { alignItems: "center", justifyContent: "center", gap: 4, padding: 9, borderRadius: 13, borderWidth: 1, borderColor: "#2A526F", backgroundColor: C.accentSoft },
  invitePanel: { padding: 12, borderColor: "#2B4B67", backgroundColor: "#102134" },
  chatIntro: { paddingHorizontal: 3, marginTop: -2 },
  messageRow: { alignItems: "flex-start", gap: 4 },
  messageRowMine: { alignItems: "flex-end" },
  messageBubble: { maxWidth: "88%", minWidth: 135, padding: 11, borderRadius: 15, borderBottomLeftRadius: 5, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  messageBubbleMine: { borderBottomLeftRadius: 15, borderBottomRightRadius: 5, backgroundColor: "#102B42", borderColor: "#27506D" },
  messageMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  contentActions: { flexDirection: "row", gap: 12, paddingHorizontal: 7, marginBottom: 5 },
  composer: { padding: 10, marginTop: 1 },
  messageInput: { minHeight: 43, maxHeight: 90, marginTop: 0, marginBottom: 8, textAlignVertical: "top" },
  composerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  storyComposer: { padding: 13, gap: 6 },
  storyIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.accentSoft },
  storyInput: { minHeight: 90, maxHeight: 145, textAlignVertical: "top" },
  audienceLabel: { marginTop: 4, marginBottom: 2 },
  audienceRow: { flexDirection: "row", gap: 7 },
  audienceOption: { minHeight: 41, flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: "#0C1928" },
  audienceOptionSelected: { borderColor: "#37775F", backgroundColor: "#112A29" },
  audienceOptionPublic: { borderColor: "#715B35", backgroundColor: "#2A241A" },
  circleChips: { flexDirection: "row", gap: 7, paddingVertical: 7 },
  circleChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  circleChipSelected: { borderColor: "#39745E", backgroundColor: "#132D2B" },
  storyCard: { padding: 13 },
  storyHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: C.accentSoft, borderWidth: 1, borderColor: "#2C526D" },
  storyActions: { minHeight: 22, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 17, marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7 },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10 },
  reportCard: { padding: 12, gap: 5 },
  notice: { padding: 11, borderColor: "#286050", backgroundColor: "#102723" },
  footer: { alignItems: "center", paddingTop: 2 },
  modalShade: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(2,8,16,0.82)" },
  modalCard: { width: "100%", maxWidth: 420, borderRadius: 23, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 19 },
  modalIcon: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.accentSoft },
  modalIconDanger: { backgroundColor: "#3B3020", borderWidth: 1, borderColor: "#685530" },
  reasonRow: { minHeight: 38, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, marginTop: 6, borderRadius: 10, backgroundColor: "#0E1C2A" },
  reasonRowSelected: { borderWidth: 1, borderColor: "#2D5A77" },
});
