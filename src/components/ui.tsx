import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { KEYBOARD_DISMISS_ACCESSORY_ID } from '@/components/keyboard-dismiss-accessory';
import { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/context/theme-context';

export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useComponentStyles();
  return <View style={styles.header}><Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>{title}</Text>{action}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const styles = useComponentStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, variant = 'primary', loading, style, ...props }: Omit<PressableProps, 'style'> & { label: string; variant?: 'primary' | 'dark' | 'ghost' | 'danger'; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const styles = useComponentStyles();
  const disabled = !!props.disabled || !!loading;
  return (
    <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...props.accessibilityState, disabled, busy: !!loading }} disabled={disabled} style={({ pressed }) => [styles.button, styles[`button_${variant}`], pressed && styles.pressed, disabled && styles.disabled, style]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.dark : variant === 'ghost' ? colors.text : colors.onDark} /> : <Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary, variant === 'ghost' && styles.buttonTextGhost]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, containerStyle, compact = false, ...props }: TextInputProps & { label: string; containerStyle?: StyleProp<ViewStyle>; compact?: boolean }) {
  const { colors } = useTheme();
  const styles = useComponentStyles();
  return <View style={[styles.field, compact && styles.fieldCompact, containerStyle]}><Text style={[styles.fieldLabel, compact && styles.fieldLabelCompact]}>{label}</Text><TextInput accessibilityLabel={label} selectionColor={colors.primary} {...props} inputAccessoryViewID={props.inputAccessoryViewID ?? (Platform.OS === 'ios' ? KEYBOARD_DISMISS_ACCESSORY_ID : undefined)} placeholderTextColor={colors.placeholder} style={[styles.input, compact && styles.inputCompact, props.style]} /></View>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  const styles = useComponentStyles();
  return <View style={styles.stat}><Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.statValue}>{value}</Text><Text numberOfLines={1} style={styles.statLabel}>{label}</Text></View>;
}

export function useSharedStyles() {
  return useThemedStyles(createSharedStyles);
}

const createSharedStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});

const createComponentStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { flexShrink: 1, fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.8 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  button: { minHeight: 54, borderRadius: 17, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  button_primary: { backgroundColor: colors.primary }, button_dark: { backgroundColor: colors.dark },
  button_ghost: { backgroundColor: colors.surfaceAlt }, button_danger: { backgroundColor: colors.danger },
  buttonText: { color: colors.onDark, fontSize: 16, fontWeight: '800' },
  buttonTextPrimary: { color: colors.dark }, buttonTextGhost: { color: colors.text },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.45 },
  field: { gap: 7 }, fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  input: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  fieldCompact: { gap: 5 }, fieldLabelCompact: { fontSize: 11 }, inputCompact: { height: 44, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingHorizontal: 3 }, statValue: { width: '100%', color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
});

function useComponentStyles() {
  return useThemedStyles(createComponentStyles);
}
