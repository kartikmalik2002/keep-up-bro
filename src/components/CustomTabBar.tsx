import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;

const getPath = (insetsBottom: number) => {
  const height = TAB_BAR_HEIGHT + insetsBottom;
  const cx = width / 2;
  
  const notchWidth = 84;
  const notchDepth = 45;
  
  // Starting from top-left with border radius
  const path = `
    M 0 24
    Q 0 0 24 0
    L ${cx - notchWidth/2 - 20} 0
    C ${cx - notchWidth/2} 0, ${cx - notchWidth/2 + 5} ${notchDepth}, ${cx} ${notchDepth}
    C ${cx + notchWidth/2 - 5} ${notchDepth}, ${cx + notchWidth/2} 0, ${cx + notchWidth/2 + 20} 0
    L ${width - 24} 0
    Q ${width} 0 ${width} 24
    L ${width} ${height}
    L 0 ${height}
    Z
  `;
  return path;
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Define the tabs including placeholders
  const tabItems = [
    { name: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'fab', label: '', icon: '', activeIcon: '' },
    { name: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  return (
    <View style={[styles.container, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      <Svg 
        width={width} 
        height={TAB_BAR_HEIGHT + insets.bottom} 
        style={[
          styles.svgBackground,
          {
            shadowColor: scheme === 'dark' ? '#000' : '#0c0e13ff',
            shadowOpacity: scheme === 'dark' ? 0.15 : 0.12,
            shadowRadius: scheme === 'dark' ? 10 : 20,
          }
        ]}
      >
        <Path 
          d={getPath(insets.bottom)} 
          fill={scheme === 'dark' ? '#1E2024' : '#FFFFFF'} 
          stroke={scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0, 0, 0, 0.03)'}
          strokeWidth={1}
        />
      </Svg>

      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {tabItems.map((item) => {
          if (item.name === 'fab') {
            return (
              <View key="fab" style={styles.tabItem} />
            );
          }

          const isFocused = state.routes[state.index]?.name === item.name;

          const onPress = () => {
            const route = state.routes.find((r: { name: string; key: string }) => r.name === item.name);
            if (!route) {
              // Handle placeholder tabs that don't exist yet
              return;
            }
            
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(item.name);
            }
          };

          const inactiveColor = scheme === 'dark' ? colors.textSecondary : '#9BA1A6';

          return (
            <Pressable
              key={item.name}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons 
                name={isFocused ? (item.activeIcon as any) : (item.icon as any)} 
                size={24} 
                color={isFocused ? colors.tint : inactiveColor} 
              />
              <ThemedText style={[styles.tabLabel, { color: isFocused ? colors.tint : inactiveColor }]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable 
        style={[styles.fab, { backgroundColor: colors.tint, bottom: insets.bottom + 25, shadowColor: colors.tint }]}
        onPress={() => router.push('/choose-habit' as any)}
      >
        <Ionicons name="add" size={32} color="#1A1C20" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
    elevation: 0,
  },
  svgBackground: {
    position: 'absolute',
    bottom: 0,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  }
});
