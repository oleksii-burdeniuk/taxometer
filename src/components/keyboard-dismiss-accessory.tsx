import { useEffect, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '@/constants/colors';
import { useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';

export const KEYBOARD_DISMISS_ACCESSORY_ID = 'taxometer-keyboard-dismiss';

export function KeyboardDismissAccessory() {
  const { t } = useI18n();
  const styles = useThemedStyles(createStyles);
  const [androidKeyboardVisible, setAndroidKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setAndroidKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (Platform.OS === 'android') {
    if (!androidKeyboardVisible) return null;
    return <View pointerEvents="box-none" style={styles.androidOverlay}><Pressable accessibilityRole="button" onPress={Keyboard.dismiss} style={({ pressed }) => [styles.doneButton, styles.androidDoneButton, pressed && styles.pressed]}><Text style={styles.doneText}>{t('done')}</Text></Pressable></View>;
  }
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DISMISS_ACCESSORY_ID}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
          <Text style={styles.doneText}>{t('done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  toolbar: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end', justifyContent: 'center', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  doneButton: { minWidth: 76, minHeight: 36, paddingHorizontal: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  androidOverlay: { position: 'absolute', right: 12, bottom: 10, zIndex: 1000, elevation: 12 }, androidDoneButton: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 12 },
  doneText: { color: colors.dark, fontSize: 15, fontWeight: '900' }, pressed: { opacity: 0.72 },
});
