import Ionicons from '@expo/vector-icons/Ionicons';
import { PureComponent } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/meter';
import { Trip } from '@/types';

const QUICK_DISCOUNTS = [10, 25, 50] as const;

type DiscountSliderProps = { value: number; onChange: (value: number) => void };

function DiscountSlider(props: DiscountSliderProps) {
  const styles = useThemedStyles(createStyles);
  return <DiscountSliderControl {...props} styles={styles} />;
}

class DiscountSliderControl extends PureComponent<DiscountSliderProps & { styles: ReturnType<typeof createStyles> }, { width: number }> {
  state = { width: 0 };
  private dragStartPercent = 0;
  private clamp = (next: number) => Math.min(100, Math.max(0, Math.round(next)));
  private responders = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        this.dragStartPercent = this.props.value;
      },
      onPanResponderMove: (_event, gesture) => {
        const { width } = this.state;
        if (width) this.props.onChange(this.clamp(this.dragStartPercent + (gesture.dx / width) * 100));
      },
    });

  render() {
    const { onChange, styles, value } = this.props;
    const { width } = this.state;
    return (
    <View
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      aria-valuetext={`${value}%`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => onChange(this.clamp(value + (event.nativeEvent.actionName === 'increment' ? 5 : -5)))}
      onLayout={(event) => this.setState({ width: event.nativeEvent.layout.width })}
      style={styles.sliderTouch}
      {...this.responders.panHandlers}
    >
      <View pointerEvents="none" style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderThumb, { left: Math.max(0, (width - 26) * value / 100) }]} />
    </View>
    );
  }
}

export function FinishTripModal({
  visible,
  trip,
  discountPercent,
  discountMode,
  finalPriceInput,
  finishing,
  onDiscountChange,
  onDiscountModeChange,
  onFinalPriceChange,
  onClose,
  onFinish,
}: {
  visible: boolean;
  trip: Trip | null;
  discountPercent: number;
  discountMode: 'percent' | 'finalPrice';
  finalPriceInput: string;
  finishing: boolean;
  onDiscountChange: (value: number) => void;
  onDiscountModeChange: (value: 'percent' | 'finalPrice') => void;
  onFinalPriceChange: (value: string) => void;
  onClose: () => void;
  onFinish: () => void;
}) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!trip) return null;

  const isMeteredRide = trip.meterEnabled !== false;
  const meteredTotal = trip.total;
  const priceBeforeDiscount = trip.agreedFare ?? meteredTotal;
  const hasFinalPriceInput = finalPriceInput.trim().length > 0;
  const enteredFinalPrice = hasFinalPriceInput ? Number(finalPriceInput.replace(',', '.')) : Number.NaN;
  const exactPriceValid = hasFinalPriceInput && Number.isFinite(enteredFinalPrice) && enteredFinalPrice >= 0 && enteredFinalPrice <= priceBeforeDiscount;
  const finalPriceValid = discountMode === 'percent' ? (!hasFinalPriceInput || exactPriceValid) : exactPriceValid;
  const finalTotal = exactPriceValid
    ? Math.round(enteredFinalPrice * 100) / 100
    : discountMode === 'finalPrice'
      ? priceBeforeDiscount
      : Math.round((priceBeforeDiscount * (100 - discountPercent))) / 100;
  const discountAmount = Math.round((priceBeforeDiscount - finalTotal) * 100) / 100;
  const adjustFinalPrice = (cents: number) => {
    if (!finalPriceValid) return;
    const next = Math.min(priceBeforeDiscount, Math.max(0, Math.round((finalTotal + cents / 100) * 100) / 100));
    onFinalPriceChange(next.toFixed(2));
  };
  const money = (value: number) => formatMoney(value, trip.tariff.currency, locale);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel={t('close')} onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoider}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View><Text style={styles.eyebrow}>{t('ridePaused')}</Text><Text style={styles.modalTitle}>{t('finalSummary')}</Text></View>
              <Pressable accessibilityLabel={t('close')} accessibilityRole="button" disabled={finishing} onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
            </View>
            <ScrollView bounces={false} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              {isMeteredRide && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{t('meteredFare')}</Text><Text style={styles.summaryValue}>{money(meteredTotal)}</Text></View>}
              {trip.agreedFare !== undefined && <View style={styles.summaryRow}><Text style={styles.summaryLabelStrong}>{t('agreedFare')}</Text><Text style={styles.summaryValueStrong}>{money(trip.agreedFare)}</Text></View>}
            </View>

            <View style={styles.discountHeader}>
              <View><Text style={styles.sectionTitle}>{t('clientDiscount')}</Text><Text style={styles.sectionHint}>{discountMode === 'percent' ? t('discountHint') : t('finalPriceHint')}</Text></View>
              <Text style={styles.discountValue}>{discountMode === 'percent' ? `${discountPercent}%` : money(Math.max(0, discountAmount))}</Text>
            </View>
            <View style={styles.discountModes}>
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: discountMode === 'percent' }} onPress={() => onDiscountModeChange('percent')} style={[styles.discountMode, discountMode === 'percent' && styles.discountModeActive]}><Text style={[styles.discountModeText, discountMode === 'percent' && styles.discountModeTextActive]}>{t('discountPercentMode')}</Text></Pressable>
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: discountMode === 'finalPrice' }} onPress={() => onDiscountModeChange('finalPrice')} style={[styles.discountMode, discountMode === 'finalPrice' && styles.discountModeActive]}><Text style={[styles.discountModeText, discountMode === 'finalPrice' && styles.discountModeTextActive]}>{t('finalPriceMode')}</Text></Pressable>
            </View>
            {discountMode === 'percent' ? <>
              <View style={styles.quickRow}>
                <Pressable accessibilityRole="button" onPress={() => onDiscountChange(0)} style={[styles.quickDiscount, discountPercent === 0 && styles.quickDiscountActive]}><Text style={[styles.quickDiscountText, discountPercent === 0 && styles.quickDiscountTextActive]}>0%</Text></Pressable>
                {QUICK_DISCOUNTS.map((value) => <Pressable accessibilityRole="button" key={value} onPress={() => onDiscountChange(value)} style={[styles.quickDiscount, discountPercent === value && styles.quickDiscountActive]}><Text style={[styles.quickDiscountText, discountPercent === value && styles.quickDiscountTextActive]}>{value}%</Text></Pressable>)}
              </View>
              <DiscountSlider onChange={onDiscountChange} value={discountPercent} />
              <View style={styles.sliderLabels}><Text style={styles.sliderLabel}>0%</Text><Text style={styles.sliderLabel}>100%</Text></View>
            </> : <View style={styles.finalPriceEditor}>
              <Field autoFocus compact keyboardType="decimal-pad" label={t('finalPrice')} onChangeText={onFinalPriceChange} placeholder={money(Math.floor(priceBeforeDiscount))} value={finalPriceInput} />
              <Text style={[styles.finalPriceHint, !finalPriceValid && styles.finalPriceError]}>{finalPriceValid ? t('finalPriceHint') : t('invalidFinalPrice')}</Text>
            </View>}

            <View style={styles.finalCard}>
              <View style={styles.finalDetail}><Text style={styles.finalDetailLabel}>{t('discount')}</Text><Text style={styles.finalDetailValue}>{discountAmount > 0 ? `−${money(discountAmount)}` : money(0)}</Text></View>
              <View style={styles.finalRow}>
                <Text style={styles.finalLabel}>{t('total')}</Text>
                <View style={styles.finalTotalControls}>
                  <Pressable accessibilityLabel={t('decreasePrice')} accessibilityRole="button" accessibilityState={{ disabled: !finalPriceValid || finalTotal <= 0 }} disabled={!finalPriceValid || finalTotal <= 0} onPress={() => adjustFinalPrice(-1)} style={({ pressed }) => [styles.priceStepButton, pressed && styles.priceStepButtonPressed, (!finalPriceValid || finalTotal <= 0) && styles.priceStepButtonDisabled]}><Ionicons name="remove" size={22} color={colors.onDark} /></Pressable>
                  <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={styles.finalTotal}>{money(finalTotal)}</Text>
                  <Pressable accessibilityLabel={t('increasePrice')} accessibilityRole="button" accessibilityState={{ disabled: !finalPriceValid || finalTotal >= priceBeforeDiscount }} disabled={!finalPriceValid || finalTotal >= priceBeforeDiscount} onPress={() => adjustFinalPrice(1)} style={({ pressed }) => [styles.priceStepButton, pressed && styles.priceStepButtonPressed, (!finalPriceValid || finalTotal >= priceBeforeDiscount) && styles.priceStepButtonDisabled]}><Ionicons name="add" size={22} color={colors.onDark} /></Pressable>
                </View>
              </View>
            </View>
            <Button disabled={!finalPriceValid} label={t('finishAndReceipt')} loading={finishing} onPress={onFinish} />
            <Button disabled={finishing} label={t('continueRide')} onPress={onClose} variant="ghost" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' },
  keyboardAvoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.background, paddingTop: 9, overflow: 'hidden' },
  handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: colors.border, marginBottom: 5 },
  modalHeader: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.warningText, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  modalTitle: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  modalContent: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  summaryCard: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: colors.muted, fontSize: 14, fontWeight: '700' }, summaryValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  summaryLabelStrong: { color: colors.text, fontSize: 14, fontWeight: '900' }, summaryValueStrong: { color: colors.text, fontSize: 21, fontWeight: '900' },
  discountHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, sectionHint: { color: colors.muted, fontSize: 11, marginTop: 3 },
  discountValue: { color: colors.text, fontSize: 29, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 8 },
  discountModes: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  discountMode: { flex: 1, minHeight: 40, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, discountModeActive: { backgroundColor: colors.surface },
  discountModeText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, discountModeTextActive: { color: colors.text },
  quickDiscount: { flex: 1, minHeight: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  quickDiscountActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickDiscountText: { color: colors.text, fontSize: 14, fontWeight: '800' }, quickDiscountTextActive: { color: colors.dark },
  sliderTouch: { height: 50, marginHorizontal: 12, justifyContent: 'center', position: 'relative' },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, sliderFill: { height: '100%', backgroundColor: colors.primary },
  sliderThumb: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: colors.text, borderWidth: 4, borderColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -17, paddingHorizontal: 12 }, sliderLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  finalPriceEditor: { gap: 7 }, finalPriceHint: { color: colors.muted, fontSize: 11, lineHeight: 15 }, finalPriceError: { color: colors.danger },
  finalCard: { padding: 17, borderRadius: 20, backgroundColor: colors.dark, gap: 12, marginTop: 3 },
  finalDetail: { flexDirection: 'row', justifyContent: 'space-between' }, finalDetailLabel: { color: '#AEB3B9', fontSize: 13, fontWeight: '700' }, finalDetailValue: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  finalRow: { gap: 9 }, finalLabel: { color: colors.onDark, fontSize: 14, fontWeight: '800' },
  finalTotalControls: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  finalTotal: { flexShrink: 1, color: colors.onDark, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, textAlign: 'center' },
  priceStepButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34383D', borderWidth: 1, borderColor: '#4A4F55' },
  priceStepButtonPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] }, priceStepButtonDisabled: { opacity: 0.28 },
});
