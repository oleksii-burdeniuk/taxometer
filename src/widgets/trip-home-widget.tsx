import { Divider, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ExternalTripSnapshot } from '@/lib/external-trip';

export type TripHomeWidgetProps = {
  active: boolean;
  snapshot?: ExternalTripSnapshot;
  idle: {
    appName: string;
    title: string;
    hint: string;
    open: string;
  };
  openUrl: string;
  updatedAtMs: number;
};

const TripHomeWidget = (props: TripHomeWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const YELLOW = '#FFCC00';
  const WHITE = '#F7F7F7';
  const MUTED = '#A9ADB4';
  const GREEN = '#38C989';
  const DARK = '#111315';
  const SURFACE = '#202327';
  const snapshot = props.snapshot;
  const active = props.active === true && !!snapshot;
  const openUrl = active ? snapshot.openUrl : (props.openUrl || 'taxometer://');

  if (!active) {
    const idleTitle = props.idle?.title || 'Ready for a new trip';
    const idleHint = props.idle?.hint || 'Open Taxometer to start';
    const idleOpen = props.idle?.open || 'Open app';
    const idleName = props.idle?.appName || 'Taxometer';
    if (environment.widgetFamily === 'systemSmall') {
      return (
        <VStack
          alignment="leading"
          spacing={10}
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
            padding({ all: 16 }),
            containerBackground(DARK, 'widget'),
            widgetURL(openUrl),
          ]}>
          <Image systemName="car.fill" color={YELLOW} modifiers={[font({ size: 26 })]} />
          <Spacer />
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(WHITE), lineLimit(2)]}>{idleTitle}</Text>
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(MUTED), lineLimit(2)]}>{idleHint}</Text>
        </VStack>
      );
    }
    return (
      <HStack
        spacing={14}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          padding({ all: 18 }),
          containerBackground(DARK, 'widget'),
          widgetURL(openUrl),
        ]}>
        <Image systemName="car.fill" color={YELLOW} modifiers={[font({ size: environment.widgetFamily === 'systemLarge' ? 42 : 32 })]} />
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(YELLOW)]}>{idleName}</Text>
          <Text modifiers={[font({ size: 19, weight: 'bold' }), foregroundStyle(WHITE), lineLimit(2)]}>{idleTitle}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(2)]}>{idleHint}</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[padding({ horizontal: 12, vertical: 8 }), background(YELLOW), clipShape('capsule'), font({ size: 12, weight: 'bold' }), foregroundStyle(DARK)]}>{idleOpen}</Text>
      </HStack>
    );
  }

  const status = snapshot.status === 'paused' ? snapshot.labels.paused : snapshot.labels.active;
  const shortStatus = snapshot.status === 'paused' ? snapshot.labels.pausedShort : snapshot.labels.activeShort;
  const controlIcon = snapshot.status === 'paused' ? 'play.fill' : 'pause.fill';
  const controlLabel = snapshot.status === 'paused' ? snapshot.labels.resume : snapshot.labels.pause;

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
          padding({ all: 15 }),
          containerBackground(DARK, 'widget'),
          widgetURL(snapshot.openUrl),
        ]}>
        <HStack spacing={7}>
          <Image systemName="car.fill" color={YELLOW} modifiers={[font({ size: 22 })]} />
          <Spacer />
          <Image systemName="circle.fill" color={snapshot.status === 'paused' ? MUTED : GREEN} modifiers={[font({ size: 7 })]} />
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(snapshot.status === 'paused' ? MUTED : GREEN), lineLimit(1)]}>{shortStatus}</Text>
        </HStack>
        <Spacer />
        <Text modifiers={[font({ size: 29, weight: 'heavy' }), foregroundStyle(WHITE), monospacedDigit(), minimumScaleFactor(0.58), lineLimit(1)]}>{snapshot.amountText}</Text>
        <Divider />
        <HStack spacing={7}>
          <Image systemName="clock.fill" color={MUTED} modifiers={[font({ size: 10 })]} />
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit()]}>{snapshot.durationText}</Text>
          <Spacer />
          <Image systemName="location.fill" color={MUTED} modifiers={[font({ size: 10 })]} />
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit()]}>{snapshot.distanceText}</Text>
        </HStack>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack
        spacing={15}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          padding({ all: 16 }),
          containerBackground(DARK, 'widget'),
        ]}>
        <Link destination={snapshot.openUrl}>
          <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' })]}>
            <HStack spacing={7}>
              <Image systemName="car.fill" color={YELLOW} modifiers={[font({ size: 22 })]} />
              <Image systemName="circle.fill" color={snapshot.status === 'paused' ? MUTED : GREEN} modifiers={[font({ size: 7 })]} />
              <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(snapshot.status === 'paused' ? MUTED : GREEN), lineLimit(1)]}>{shortStatus}</Text>
            </HStack>
            <Spacer />
            <Text modifiers={[font({ size: 31, weight: 'heavy' }), foregroundStyle(WHITE), monospacedDigit(), minimumScaleFactor(0.62), lineLimit(1)]}>{snapshot.amountText}</Text>
          </VStack>
        </Link>
        <Divider />
        <VStack alignment="leading" spacing={7} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
          <HStack spacing={7}><Image systemName="clock.fill" color={MUTED} /><Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{snapshot.labels.time}</Text><Spacer /><Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit()]}>{snapshot.durationText}</Text></HStack>
          <HStack spacing={7}><Image systemName="location.fill" color={MUTED} /><Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{snapshot.labels.distance}</Text><Spacer /><Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit()]}>{snapshot.distanceText}</Text></HStack>
          <HStack spacing={7}><Image systemName="tag.fill" color={MUTED} /><Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{snapshot.labels.tariff}</Text><Spacer /><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(WHITE), minimumScaleFactor(0.72), lineLimit(1)]}>{snapshot.tariffName}</Text></HStack>
          <Link destination={snapshot.controlUrl} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 7 }), background(YELLOW), clipShape('capsule')]}>
            <HStack spacing={6}><Image systemName={controlIcon} color={DARK} /><Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(DARK)]}>{controlLabel}</Text></HStack>
          </Link>
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={14}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        padding({ all: 18 }),
        containerBackground(DARK, 'widget'),
      ]}>
      <Link destination={snapshot.openUrl}>
        <HStack spacing={11}>
          <Image systemName="car.fill" color={YELLOW} modifiers={[font({ size: 28 })]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(snapshot.status === 'paused' ? MUTED : GREEN)]}>{status}</Text>
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(WHITE), lineLimit(1)]}>{snapshot.tariffName}</Text>
          </VStack>
        </HStack>
      </Link>
      <Divider />
      <Text modifiers={[frame({ maxWidth: Infinity }), font({ size: 43, weight: 'heavy' }), foregroundStyle(WHITE), monospacedDigit(), minimumScaleFactor(0.62), lineLimit(1)]}>{snapshot.amountText}</Text>
      <HStack spacing={10}>
        <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: Infinity }), padding({ all: 13 }), background(SURFACE), clipShape('roundedRectangle', 14)]}>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(MUTED)]}>{snapshot.labels.time}</Text>
          <Text modifiers={[font({ size: 21, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit()]}>{snapshot.durationText}</Text>
        </VStack>
        <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: Infinity }), padding({ all: 13 }), background(SURFACE), clipShape('roundedRectangle', 14)]}>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(MUTED)]}>{snapshot.labels.distance}</Text>
          <Text modifiers={[font({ size: 21, weight: 'bold' }), foregroundStyle(WHITE), monospacedDigit(), minimumScaleFactor(0.72), lineLimit(1)]}>{snapshot.distanceText}</Text>
        </VStack>
      </HStack>
      <Spacer />
      <HStack spacing={10}>
        <Link destination={snapshot.controlUrl} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 11 }), background(YELLOW), clipShape('roundedRectangle', 14)]}>
          <HStack spacing={7}><Image systemName={controlIcon} color={DARK} /><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(DARK)]}>{controlLabel}</Text></HStack>
        </Link>
        <Link destination={snapshot.openUrl} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 11 }), background(SURFACE), clipShape('roundedRectangle', 14)]}>
          <HStack spacing={7}><Image systemName="arrow.up.right.square" color={WHITE} /><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(WHITE)]}>{snapshot.labels.open}</Text></HStack>
        </Link>
      </HStack>
    </VStack>
  );
};

export default createWidget<TripHomeWidgetProps>('TaxometerTripWidget', TripHomeWidget);
