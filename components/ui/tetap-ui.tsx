import React from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type TextProps, type ViewProps } from "react-native";
import { Feather } from "@expo/vector-icons";

export const C = {
  bg: "#081321",
  bgSoft: "#0C1B2D",
  card: "#102238",
  cardRaised: "#142A42",
  border: "#203A55",
  text: "#F3F8FF",
  muted: "#A2B4C8",
  faint: "#70869E",
  accent: "#38BDF8",
  accentSoft: "#123B54",
  mint: "#8BE0CB",
  gold: "#F2C46D",
  red: "#FF7D86",
  white: "#FFFFFF",
};

export const FONT = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
};

type Tone = "text" | "muted" | "faint" | "accent" | "mint" | "gold" | "red";
interface CopyProps extends TextProps { size?: number; tone?: Tone; weight?: keyof typeof FONT; }
export function Copy({ size = 15, tone = "text", weight = "regular", style, ...props }: CopyProps) {
  return <Text {...props} style={[{ color: C[tone], fontSize: size, lineHeight: size * 1.48, fontFamily: FONT[weight] }, style]} />;
}

export function Panel({ children, style, ...props }: ViewProps) {
  return <View {...props} style={[styles.panel, style]}>{children}</View>;
}

interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  small?: boolean;
}
export function ActionButton({ title, icon, variant = "primary", small = false, style, ...props }: ButtonProps) {
  const backgroundColor = variant === "primary" ? C.accent : variant === "danger" ? "#52252E" : variant === "secondary" ? C.cardRaised : "transparent";
  const borderColor = variant === "quiet" ? "transparent" : variant === "primary" ? C.accent : variant === "danger" ? "#7E3E47" : C.border;
  const textColor = variant === "primary" ? C.bg : variant === "danger" ? "#FFDCE0" : C.text;
  return (
    <Pressable accessibilityRole="button" {...props} style={(state) => [styles.button, { backgroundColor, borderColor, paddingVertical: small ? 10 : 14, paddingHorizontal: small ? 13 : 17, opacity: state.pressed ? 0.82 : 1 }, typeof style === "function" ? style(state) : style]}>
      {icon ? <Feather name={icon} size={small ? 16 : 18} color={textColor} /> : null}
      <Copy size={small ? 13 : 14} weight="bold" style={{ color: textColor }}>{title}</Copy>
    </Pressable>
  );
}

export function Tag({ children, color = C.accent, style }: { children: React.ReactNode; color?: string; style?: ViewProps["style"] }) {
  return <View style={[styles.tag, { backgroundColor: `${color}1C`, borderColor: `${color}55` }, style]}><Copy size={11} weight="bold" style={{ color }}>{children}</Copy></View>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextProps["style"] }) {
  return <Copy size={11} tone="accent" weight="extra" style={[{ letterSpacing: 1.55, textTransform: "uppercase" }, style]}>{children}</Copy>;
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={styles.brandIcon}>
        <Feather name="compass" size={compact ? 16 : 18} color={C.accent} />
        <View style={styles.brandDot} />
      </View>
      {!compact ? <View><Copy size={11} weight="extra" style={{ letterSpacing: 1.5 }}>TETAP</Copy><Copy size={10} tone="muted" weight="medium">HARI INI</Copy></View> : null}
    </View>
  );
}

export function ScreenFrame({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 22, padding: 18 },
  button: { borderRadius: 15, borderWidth: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  tag: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  brandIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.accentSoft, borderWidth: 1, borderColor: "#25516B", alignItems: "center", justifyContent: "center" },
  brandDot: { position: "absolute", width: 5, height: 5, borderRadius: 3, right: 7, top: 7, backgroundColor: C.mint },
});
