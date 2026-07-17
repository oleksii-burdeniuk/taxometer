import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { ExternalTripSnapshot } from '@/lib/external-trip';

const TripLiveActivity = (props: ExternalTripSnapshot, _environment: LiveActivityEnvironment) => {
  'widget';
  const YELLOW = '#FFCC00';
  const WHITE = '#FFFFFF';
  const MUTED = '#A9ADB4';
  const DARK = '#17191C';
  const timerEnd = new Date(props.startedAtMs + 7 * 24 * 60 * 60 * 1000);
  const pauseTime = props.pausedAtMs ? new Date(props.pausedAtMs) : undefined;
  const timer = (
    <Text
      timerInterval={{ lower: new Date(props.startedAtMs), upper: timerEnd }}
      countsDown={false}
      pauseTime={pauseTime}
      modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit(), foregroundStyle(WHITE)]}
    />
  );
  const status = props.status === 'paused' ? props.labels.paused : props.labels.active;

  return {
    banner: (
      <VStack
        spacing={12}
        modifiers={[
          padding({ all: 16 }),
          activityBackgroundTint(DARK),
          widgetURL(props.openUrl),
        ]}>
        <HStack spacing={10}>
          <Image systemName="car.fill" color={YELLOW} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(MUTED)]}>{status}</Text>
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(WHITE), lineLimit(1)]}>{props.tariffName}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ size: 26, weight: 'heavy' }), foregroundStyle(YELLOW), minimumScaleFactor(0.72), lineLimit(1)]}>{props.amountText}</Text>
        </HStack>
        <HStack spacing={18}>
          <VStack alignment="leading" spacing={2}><Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{props.labels.time}</Text>{timer}</VStack>
          <VStack alignment="leading" spacing={2}><Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{props.labels.distance}</Text><Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(WHITE)]}>{props.distanceText}</Text></VStack>
          <Spacer />
          <Link destination={props.controlUrl} modifiers={[padding({ horizontal: 13, vertical: 8 }), background(YELLOW), clipShape('capsule')]}>
            <HStack spacing={5}><Image systemName={props.status === 'paused' ? 'play.fill' : 'pause.fill'} color={DARK} /><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(DARK)]}>{props.status === 'paused' ? props.labels.resume : props.labels.pause}</Text></HStack>
          </Link>
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName="car.fill" color={YELLOW} modifiers={[widgetURL(props.openUrl)]} />,
    compactTrailing: <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(YELLOW), minimumScaleFactor(0.65), lineLimit(1), widgetURL(props.openUrl)]}>{props.amountText}</Text>,
    minimal: <Image systemName="car.fill" color={YELLOW} modifiers={[widgetURL(props.openUrl)]} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={3} modifiers={[padding({ leading: 12, top: 8 }), widgetURL(props.openUrl)]}>
        <Image systemName="car.fill" color={YELLOW} />
        <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(MUTED)]}>{status}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 12, top: 8 }), widgetURL(props.openUrl)]}>
        <Text modifiers={[font({ size: 22, weight: 'heavy' }), foregroundStyle(YELLOW), minimumScaleFactor(0.65), lineLimit(1)]}>{props.amountText}</Text>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{props.labels.currentFare}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={10} modifiers={[padding({ horizontal: 12, bottom: 10 })]}>
        <HStack spacing={16} modifiers={[widgetURL(props.openUrl)]}>
          <VStack alignment="leading" spacing={2}><Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>{props.labels.time}</Text>{timer}</VStack>
          <VStack alignment="leading" spacing={2}><Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>{props.labels.distance}</Text><Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(WHITE)]}>{props.distanceText}</Text></VStack>
          <VStack alignment="leading" spacing={2}><Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>{props.labels.tariff}</Text><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(WHITE), lineLimit(1)]}>{props.tariffName}</Text></VStack>
        </HStack>
        <Link destination={props.controlUrl} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 8 }), background(YELLOW), clipShape('capsule')]}>
          <HStack spacing={6}><Image systemName={props.status === 'paused' ? 'play.fill' : 'pause.fill'} color={DARK} /><Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(DARK)]}>{props.status === 'paused' ? props.labels.resume : props.labels.pause}</Text></HStack>
        </Link>
      </VStack>
    ),
  };
};

export default createLiveActivity<ExternalTripSnapshot>('TaxometerTrip', TripLiveActivity);
