import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useApp } from '@/context/app-context';
import { useTheme } from '@/context/theme-context';

export default function TripControlLink() {
  const { action, tripId } = useLocalSearchParams<{ action?: string; tripId?: string }>();
  const { colors } = useTheme();
  const { ready, activeTrip, togglePause } = useApp();
  const handled = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    const run = async () => {
      if (activeTrip && (!tripId || activeTrip.id === tripId)) {
        const shouldPause = action === 'pause' && activeTrip.status === 'active';
        const shouldResume = action === 'resume' && activeTrip.status === 'paused';
        if (shouldPause || shouldResume) await togglePause();
      }
      setDone(true);
    };
    void run();
  }, [action, activeTrip, ready, togglePause, tripId]);

  if (done) return <Redirect href="/" />;
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
