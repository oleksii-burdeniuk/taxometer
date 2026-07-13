import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 10);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#93989F',
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.tabIcon,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.tabBar, { height: 64 + bottomInset, paddingBottom: bottomInset }],
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('appName'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tariffs"
        options={{
          title: t('tariffs'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pricetags' : 'pricetags-outline'} size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('history'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: colors.background },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 8,
  },
  item: { paddingTop: 2 },
  tabIcon: { marginTop: 0 },
  label: { fontSize: 10, fontWeight: '700', marginTop: 3, lineHeight: 13 },
});
