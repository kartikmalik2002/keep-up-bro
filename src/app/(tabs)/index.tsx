import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, RefreshControl, StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import Reanimated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Habit = {
  id: number;
  name: string;
  type: string;
  frequency: number[];
  motivational_anchor?: string;
};

type HabitWithStatus = Habit & {
  completed_percentage: number | null;
  response_id?: number;
  created_at: string;
  history: Record<string, number | null>;
};

// HabitCard component extracted to manage local state for partial completion
function HabitCard({
  item,
  userId,
  colors,
  onRefresh
}: {
  item: HabitWithStatus;
  userId: string;
  colors: any;
  onRefresh: () => void
}) {
  const [isPartialMode, setIsPartialMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sliderValue, setSliderValue] = useState(1);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const currentDayIndex = new Date().getDay();
  const isTodayHabit = !Array.isArray(item.frequency) || item.frequency.includes(currentDayIndex);

  const handleDeleteHabit = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { data, error } = await supabase.from('habits').delete().eq('id', item.id).select();
              if (error) throw error;
              if (!data || data.length === 0) throw new Error("Delete failed: No rows were deleted. Please check permissions.");
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete habit');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditHabit = () => {
    setMenuVisible(false);
    router.push(`/create-habit?id=${item.id}`);
  };

  const saveResponse = async (percentage: number) => {
    setLoading(true);
    try {
      if (item.response_id) {
        const { error } = await supabase.from('habit_responses')
          .update({ completed_percentage: percentage })
          .eq('id', item.response_id);
        if (error) throw error;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { error } = await supabase.from('habit_responses').insert({
          habit_id: item.id,
          user_id: userId,
          date: today.toISOString(),
          completed_percentage: percentage
        });
        if (error) throw error;
      }

      // Refresh the main list
      onRefresh();
      setIsPartialMode(false);
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save response");
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryDots = (options?: { isCollapsed?: boolean }) => {
    const isCollapsed = options?.isCollapsed;
    if (!isCollapsed && containerWidth === 0) return null;

    const DOT_SIZE = 10;
    const DOT_SPACING = 6;
    const maxDots = isCollapsed ? 10 : Math.floor(containerWidth / (DOT_SIZE + DOT_SPACING));
    const numDots = Math.min(maxDots, 60);

    const dots = [];
    const todayStr = new Date();
    todayStr.setHours(0, 0, 0, 0);
    const createdAtDate = new Date(item.created_at);
    createdAtDate.setHours(0, 0, 0, 0);

    for (let i = numDots - 1; i >= 0; i--) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      const isToday = i === 0;
      const isBeforeCreation = d.getTime() < createdAtDate.getTime();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let dotColor = colors.backgroundSelected;

      if (!isBeforeCreation) {
        const pct = item.history[dateStr];

        if (pct === null || pct === undefined || pct === 0) {
          if (isToday) {
            dotColor = colors.backgroundSelected;
          } else {
            dotColor = '#ff4444'; // Red
          }
        } else if (pct === 100) {
          dotColor = '#00C851'; // Green
        } else {
          // Yellowish green for partial
          const r = Math.round(255 * (100 - pct) / 100);
          const g = Math.round(200 * (pct) / 100);
          dotColor = `rgb(${r}, ${g}, 0)`;
        }
      }

      let currentDotSize = DOT_SIZE;
      if (isCollapsed) {
        const minDotSize = 4;
        if (numDots > 1) {
          const sizeRange = DOT_SIZE - minDotSize;
          currentDotSize = DOT_SIZE - (i * (sizeRange / (numDots - 1)));
        }
      }

      dots.push(
        <Reanimated.View
          key={i}
          entering={ZoomIn.delay((numDots - 1 - i) * 40)}
          style={{ alignItems: 'center', marginRight: isToday ? 0 : DOT_SPACING, justifyContent: 'center', height: DOT_SIZE }}
        >
          <View style={{
            width: currentDotSize,
            height: currentDotSize,
            borderRadius: currentDotSize / 2,
            backgroundColor: dotColor,
          }} />
          {isToday && !isCollapsed && isTodayHabit && (
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.textSecondary,
              position: 'absolute',
              bottom: -6,
            }} />
          )}
        </Reanimated.View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {dots}
      </View>
    );
  };

  const renderFrequency = () => {
    if (!item.frequency || item.frequency.length === 7) {
      return (
        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>
          Daily
        </ThemedText>
      );
    }

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const todayIndex = new Date().getDay();

    return (
      <View style={{ flexDirection: 'row', gap: 4, marginLeft: 6 }}>
        {item.frequency.map((dayIndex) => {
          const isToday = dayIndex === todayIndex;
          return (
            <View key={dayIndex} style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: isToday ? colors.tint : (scheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ThemedText style={{
                fontSize: 11,
                color: isToday ? '#FFF' : colors.text,
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {days[dayIndex]}
              </ThemedText>
            </View>
          );
        })}
      </View>
    );
  };

  if (isPartialMode || isEditing) {
    return (
      <ThemedView style={[styles.habitCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four }}>
          <ThemedText style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '500' }}>
            How much did you complete?
          </ThemedText>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#F5A623' }}>
            {Math.round(sliderValue)}%
          </ThemedText>
        </View>

        <Slider
          style={{ width: '100%', height: 40, marginBottom: Spacing.one }}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={sliderValue}
          onValueChange={setSliderValue}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          thumbTintColor="#F5A623"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: Spacing.four + Spacing.two, marginTop: -Spacing.one }}>
          {[1, 25, 50, 75, 100].map((val) => (
            <Pressable key={val} onPress={() => setSliderValue(val)} hitSlop={15}>
              <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{val}%</ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Pressable
            style={[styles.primaryActionButton, { borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', backgroundColor: 'transparent' }]}
            onPress={() => {
              setIsPartialMode(false);
              setIsEditing(false);
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Cancel</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.primaryActionButton, { backgroundColor: colors.tint, borderColor: colors.tint }]}
            onPress={() => saveResponse(Math.round(sliderValue))}
          >
            <Ionicons name="checkmark" size={20} color="#000" />
            <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
              Save — {Math.round(sliderValue)}%
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  let statusText = 'Not started';
  let statusColor = colors.textSecondary;
  if (item.completed_percentage === 100) {
    statusText = 'Completed';
    statusColor = colors.tint;
  } else if (item.completed_percentage !== null && item.completed_percentage > 0) {
    statusText = `Partial ${item.completed_percentage}%`;
    statusColor = '#F5A623';
  }

  const chevronButtonSize = 26;
  const chevronContainerStyle = {
    width: chevronButtonSize,
    height: chevronButtonSize,
    borderRadius: chevronButtonSize / 2,
    backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  } as any;

  if (!isExpanded) {
    return (
      <ThemedView style={[styles.habitCard, {
        backgroundColor: colors.backgroundElement,
        borderColor: colors.backgroundSelected,
        paddingVertical: 16,
        position: 'relative',
        marginBottom: Spacing.three + 16,
      }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: Spacing.two }}>
            <ThemedText
              type="smallBold"
              style={[styles.habitName, { marginBottom: statusText ? 4 : 0 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </ThemedText>
            {statusText ? (
              <ThemedText style={{ fontSize: 13, color: statusColor, fontWeight: '600' }}>
                {statusText}
              </ThemedText>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderHistoryDots({ isCollapsed: true })}
          </View>
        </View>

        <Pressable
          onPress={() => setIsExpanded(true)}
          style={[chevronContainerStyle, {
            position: 'absolute',
            bottom: -(chevronButtonSize / 2),
            right: 16,
            backgroundColor: scheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
            borderWidth: 1,
            borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            zIndex: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }]}
          hitSlop={15}
        >
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.habitCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected, position: 'relative', marginBottom: Spacing.three + 16 }]}>
      <View style={{ marginBottom: Spacing.three, zIndex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: Spacing.two }}>
            <ThemedText
              type="smallBold"
              style={[styles.habitName, { marginBottom: 6 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="repeat-outline" size={14} color={colors.textSecondary} />
              {renderFrequency()}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.type === 'public' && (
              <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSelected, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }]}>
                <Ionicons name="globe-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.typeText, { color: colors.textSecondary }]}>Public</ThemedText>
              </View>
            )}
            <Pressable onPress={() => setMenuVisible(true)} hitSlop={15} style={{ paddingLeft: 4 }}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      {menuVisible && (
        <Pressable
          onPress={() => setMenuVisible(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
        />
      )}
      {menuVisible && (
        <View style={{
          position: 'absolute',
          top: 40,
          right: 16,
          backgroundColor: scheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
          borderRadius: 12,
          padding: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
          zIndex: 11,
          borderWidth: 1,
          borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }}>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}
            onPress={handleEditHabit}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
            <ThemedText style={{ fontSize: 16 }}>Edit habit</ThemedText>
          </Pressable>
          <View style={{ height: 1, backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginVertical: 4 }} />
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}
            onPress={handleDeleteHabit}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" style={{ marginRight: 12 }} />
            <ThemedText style={{ fontSize: 16, color: '#FF3B30' }}>Delete habit</ThemedText>
          </Pressable>
        </View>
      )}

      <View
        style={{ width: '100%', marginBottom: Spacing.four, paddingBottom: Spacing.two }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {renderHistoryDots()}
      </View>

      {isTodayHabit && (
      <View style={styles.habitActions}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : item.completed_percentage !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: Spacing.two }}>
            {item.completed_percentage === 100 ? (
              <>
                <View style={[styles.primaryActionButton, { flex: 1, borderColor: 'transparent', backgroundColor: `${colors.tint}15`, justifyContent: 'flex-start', paddingLeft: 16 }]}>
                  <Ionicons name="checkmark" size={18} color={colors.tint} />
                  <ThemedText style={{ color: colors.tint, fontSize: 16, fontWeight: '500' }}>Completed today</ThemedText>
                </View>

                <Pressable
                  style={[styles.primaryActionButton, { flex: 0, width: 44, paddingHorizontal: 0, borderColor: 'transparent', backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => {
                    setSliderValue(100);
                    setIsEditing(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.primaryActionButton, { flex: 1, borderColor: 'transparent', backgroundColor: '#F5A62315', justifyContent: 'flex-start', paddingLeft: 16 }]}>
                  <Ionicons name="pie-chart-outline" size={18} color="#F5A623" />
                  <ThemedText style={{ color: '#F5A623', fontSize: 16, fontWeight: '500' }}>Partially done</ThemedText>
                </View>

                <View style={[styles.primaryActionButton, { flex: 0, paddingHorizontal: 16, borderColor: 'transparent', backgroundColor: '#F5A62315' }]}>
                  <ThemedText style={{ color: '#F5A623', fontSize: 16, fontWeight: '500' }}>{item.completed_percentage}%</ThemedText>
                </View>

                <Pressable
                  style={[styles.primaryActionButton, { flex: 0, width: 44, paddingHorizontal: 0, borderColor: 'transparent', backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => {
                    setSliderValue(item.completed_percentage!);
                    setIsEditing(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', width: '100%', gap: Spacing.two }}>
            <Pressable
              style={[
                styles.primaryActionButton,
                {
                  borderColor: colors.tint,
                  backgroundColor: `${colors.tint}15`
                }
              ]}
              onPress={() => saveResponse(100)}
            >
              <Ionicons name="ellipse-outline" size={18} color={colors.tint} />
              <ThemedText style={[styles.actionText, { color: colors.tint }]}>Mark complete</ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.primaryActionButton,
                {
                  borderColor: '#F5A623',
                  backgroundColor: '#F5A62315'
                }
              ]}
              onPress={() => {
                setSliderValue(1);
                setIsPartialMode(true);
              }}
            >
              <Ionicons name="pie-chart-outline" size={18} color="#F5A623" />
              <ThemedText style={[styles.actionText, { color: '#F5A623' }]}>Partial</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
      )}

      {item.motivational_anchor ? (
        <View style={{
          marginTop: Spacing.four,
          paddingTop: Spacing.three,
          borderTopWidth: 1,
          borderTopColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
        }}>
          <ThemedText style={{
            fontSize: 13,
            color: colors.textSecondary,
            fontStyle: 'italic',
            opacity: 0.8,
            textAlign: 'left'
          }}>
            {item.motivational_anchor}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={() => setIsExpanded(false)}
        style={[chevronContainerStyle, {
          position: 'absolute',
          bottom: -(chevronButtonSize / 2),
          right: 16,
          backgroundColor: scheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
          borderWidth: 1,
          borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          zIndex: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        }]}
        hitSlop={15}
      >
        <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
      </Pressable>
    </ThemedView>
  );
}

function HabitCardSkeleton({ colors, scheme }: { colors: any; scheme: string }) {
  const animatedValue = useRef(new Animated.Value(0.5)).current;

  useFocusEffect(
    useCallback(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [animatedValue])
  );

  const bgColor = scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const chevronButtonSize = 26;
  const chevronContainerStyle = {
    width: chevronButtonSize,
    height: chevronButtonSize,
    borderRadius: chevronButtonSize / 2,
    backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  } as any;

  return (
    <ThemedView style={[styles.habitCard, { 
      backgroundColor: colors.backgroundElement, 
      borderColor: colors.backgroundSelected,
      paddingVertical: 16,
      position: 'relative',
      marginBottom: Spacing.three + 16,
    }]}>
      <Animated.View style={{ opacity: animatedValue, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: Spacing.two, gap: 6 }}>
          <View style={{ width: '60%', height: 18, borderRadius: 4, backgroundColor: bgColor }} />
          <View style={{ width: '40%', height: 14, borderRadius: 4, backgroundColor: bgColor }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => {
            const DOT_SIZE = 10;
            const minDotSize = 4;
            const numDots = 10;
            const sizeRange = DOT_SIZE - minDotSize;
            const currentDotSize = DOT_SIZE - (i * (sizeRange / (numDots - 1)));
            return (
              <View 
                key={i} 
                style={{ 
                  width: currentDotSize, 
                  height: currentDotSize, 
                  borderRadius: currentDotSize / 2, 
                  backgroundColor: bgColor,
                  marginRight: i === 0 ? 0 : 6
                }} 
              />
            );
          })}
        </View>
      </Animated.View>

      <View
        style={[chevronContainerStyle, {
          position: 'absolute',
          bottom: -(chevronButtonSize / 2),
          right: 16,
          backgroundColor: scheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
          borderWidth: 1,
          borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          zIndex: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        }]}
      >
        <Ionicons name="chevron-down" size={16} color={bgColor} />
      </View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [refreshKey, setRefreshKey] = useState(0);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const screenWidth = Dimensions.get('window').width;

  const scrollY = useRef(new Animated.Value(0)).current;
  const pagerScrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchHabits();
      }
    }, [session])
  );

  const fetchHabits = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('id, name, type, frequency, motivational_anchor, created_at')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const historyStart = new Date(today);
      historyStart.setDate(today.getDate() - 45);
      const startOfHistoryISO = historyStart.toISOString();

      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayISO = endOfToday.toISOString();

      const { data: responsesData, error: responsesError } = await supabase
        .from('habit_responses')
        .select('id, habit_id, completed_percentage, date')
        .gte('date', startOfHistoryISO)
        .lte('date', endOfTodayISO);

      if (responsesError) throw responsesError;

      const responsesMap = new Map();
      const historyMap = new Map();

      responsesData?.forEach(res => {
        const d = new Date(res.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (!historyMap.has(res.habit_id)) {
          historyMap.set(res.habit_id, {});
        }
        historyMap.get(res.habit_id)[dateStr] = res.completed_percentage;

        const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (isToday) {
          responsesMap.set(res.habit_id, { id: res.id, percentage: res.completed_percentage });
        }
      });

      const merged = (habitsData || []).map(h => {
        const responseData = responsesMap.get(h.id);
        return {
          ...h,
          completed_percentage: responseData?.percentage ?? null,
          response_id: responseData?.id,
          history: historyMap.get(h.id) || {}
        };
      });

      setHabits(merged);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    fetchHabits(true);
  }, []);

  const currentDay = new Date().getDay();

  const todayHabits = habits.filter(h => Array.isArray(h.frequency) && h.frequency.includes(currentDay));
  const upcomingHabits = habits.filter(h => !Array.isArray(h.frequency) || !h.frequency.includes(currentDay));

  const completedTodayCount = todayHabits.filter(h => h.completed_percentage !== null && h.completed_percentage > 0).length;
  const totalPercentageSum = todayHabits.reduce((acc, h) => acc + (h.completed_percentage || 0), 0);
  const todayCompletionPercentage = todayHabits.length > 0 ? Math.round(totalPercentageSum / todayHabits.length) : 0;

  const displayHabits = activeTab === 'today' ? todayHabits : upcomingHabits;

  const date = new Date();
  const dateString = `${date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()} · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.ScrollView
          style={{ flex: 1 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          stickyHeaderIndices={[1]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        >
          <Animated.View style={{ opacity: headerOpacity }}>
            <View style={styles.header}>
              <ThemedText style={[styles.headerDate, { color: colors.textSecondary }]}>{dateString}</ThemedText>
              <ThemedText type="title" style={styles.headerTitle}>Your Journey</ThemedText>
              <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {completedTodayCount} of {todayHabits.length} habits done today
              </ThemedText>
            </View>

            <View style={[styles.segmentedControlContainer, { backgroundColor: scheme === 'dark' ? colors.backgroundElement : colors.backgroundSelected, position: 'relative' }]}>
              <Animated.View style={{
                position: 'absolute',
                top: Spacing.one,
                bottom: Spacing.one,
                left: Spacing.one,
                width: (screenWidth - Spacing.four * 2 - Spacing.one * 2) / 2,
                backgroundColor: scheme === 'dark' ? colors.backgroundSelected : colors.backgroundElement,
                borderRadius: 10,
                transform: [{
                  translateX: pagerScrollX.interpolate({
                    inputRange: [0, screenWidth],
                    outputRange: [0, (screenWidth - Spacing.four * 2 - Spacing.one * 2) / 2]
                  })
                }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }} />

              <Pressable
                style={styles.segmentedButton}
                onPress={() => {
                  setActiveTab('today');
                  pagerRef.current?.scrollTo({ x: 0, animated: true });
                }}
              >
                <Animated.Text style={[
                  styles.segmentedButtonText,
                  { color: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [colors.tint, colors.textSecondary] }) }
                ]}>Today</Animated.Text>
                <Animated.View style={[
                  styles.badge,
                  { backgroundColor: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: ['rgba(0, 191, 165, 0.15)', scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'] }) }
                ]}>
                  <Animated.Text style={[
                    styles.badgeText,
                    { color: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [colors.tint, colors.textSecondary] }) }
                  ]}>{todayHabits.length}</Animated.Text>
                </Animated.View>
              </Pressable>
              <Pressable
                style={styles.segmentedButton}
                onPress={() => {
                  setActiveTab('upcoming');
                  pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
                }}
              >
                <Animated.Text style={[
                  styles.segmentedButtonText,
                  { color: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [colors.textSecondary, colors.tint] }) }
                ]}>Upcoming</Animated.Text>
                <Animated.View style={[
                  styles.badge,
                  { backgroundColor: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', 'rgba(0, 191, 165, 0.15)'] }) }
                ]}>
                  <Animated.Text style={[
                    styles.badgeText,
                    { color: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [colors.textSecondary, colors.tint] }) }
                  ]}>{upcomingHabits.length}</Animated.Text>
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ backgroundColor: colors.background, zIndex: 10 }}>
            <Animated.View style={{ 
              paddingBottom: todayHabits.length > 0 ? Spacing.two : 0,
              opacity: pagerScrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [1, 0], extrapolate: 'clamp' })
            }}>
              {todayHabits.length > 0 && (
                <View style={styles.progressBarWrapper}>
                  <View style={[styles.progressBarBackground, { backgroundColor: scheme === 'dark' ? colors.backgroundElement : colors.backgroundSelected }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.tint, width: `${todayCompletionPercentage}%` }]} />
                  </View>
                  <ThemedText style={[styles.progressText, { color: colors.textSecondary }]}>
                    {todayCompletionPercentage}% complete
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          </View>

          <Animated.ScrollView
            ref={pagerRef as any}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: pagerScrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setActiveTab(page === 0 ? 'today' : 'upcoming');
            }}
          >
            <View style={{ width: screenWidth }}>
              <View style={styles.listContent}>
                {loading ? (
                  <View style={{ paddingTop: Spacing.two }}>
                    {[1, 2, 3].map((key) => (
                      <HabitCardSkeleton key={key} colors={colors} scheme={scheme} />
                    ))}
                  </View>
                ) : todayHabits.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={{ color: colors.textSecondary }}>No habits found for today.</ThemedText>
                  </View>
                ) : (
                  todayHabits.map((item) => (
                    <HabitCard
                      key={`${item.id}-${refreshKey}`}
                      item={item}
                      userId={session?.user?.id as string}
                      colors={colors}
                      onRefresh={() => fetchHabits(true)}
                    />
                  ))
                )}
              </View>
            </View>

            <View style={{ width: screenWidth }}>
              <View style={styles.listContent}>
                {loading ? (
                  <View style={{ paddingTop: Spacing.two }}>
                    {[1, 2, 3].map((key) => (
                      <HabitCardSkeleton key={key} colors={colors} scheme={scheme} />
                    ))}
                  </View>
                ) : upcomingHabits.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={{ color: colors.textSecondary }}>No upcoming habits.</ThemedText>
                  </View>
                ) : (
                  upcomingHabits.map((item) => (
                    <HabitCard
                      key={`${item.id}-${refreshKey}`}
                      item={item}
                      userId={session?.user?.id as string}
                      colors={colors}
                      onRefresh={() => fetchHabits(true)}
                    />
                  ))
                )}
              </View>
            </View>
          </Animated.ScrollView>
        </Animated.ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Spacing.half,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.half,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    padding: Spacing.one,
    borderRadius: 14,
    marginBottom: Spacing.two,
  },
  segmentedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 10,
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: Spacing.one + Spacing.half,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarWrapper: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    marginBottom: 0,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.one,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  activeTabShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + Spacing.four,
  },
  habitCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  habitName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  typeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 8,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  partialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sliderContainer: {
    flex: 1,
    alignItems: 'stretch',
  },
  sliderLabel: {
    textAlign: 'center',
    marginBottom: Spacing.two,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: Spacing.two,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
