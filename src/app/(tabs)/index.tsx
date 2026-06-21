import { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Habit = {
  id: number;
  name: string;
  type: string;
  frequency: number[];
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
  const [sliderValue, setSliderValue] = useState(50);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const renderHistoryDots = () => {
    if (containerWidth === 0) return null;

    const DOT_SIZE = 12;
    const DOT_SPACING = 6;
    const maxDots = Math.floor(containerWidth / (DOT_SIZE + DOT_SPACING));
    const numDots = Math.min(maxDots, 45); 

    const dots = [];
    const todayStr = new Date();
    todayStr.setHours(0,0,0,0);
    const createdAtDate = new Date(item.created_at);
    createdAtDate.setHours(0,0,0,0);

    for (let i = numDots - 1; i >= 0; i--) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      const isToday = i === 0;
      const isBeforeCreation = d.getTime() < createdAtDate.getTime();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      let dotColor = 'transparent';
      let borderColor = colors.textSecondary;
      let borderWidth = 2;

      if (!isBeforeCreation) {
        borderWidth = 0;
        const pct = item.history[dateStr];
        
        if (pct === null || pct === undefined || pct === 0) {
          dotColor = '#ff4444'; // Red
        } else if (pct === 100) {
          dotColor = '#00C851'; // Green
        } else {
          // Yellowish green for partial
          const r = Math.round(255 * (100 - pct) / 100);
          const g = Math.round(200 * (pct) / 100);
          dotColor = `rgb(${r}, ${g}, 0)`;
        }
      }

      dots.push(
        <View key={i} style={{ alignItems: 'center', marginRight: isToday ? 0 : DOT_SPACING }}>
          <View style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: dotColor,
            borderColor: borderColor,
            borderWidth: borderWidth,
          }} />
          {isToday && (
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.textSecondary,
              position: 'absolute',
              bottom: -8,
            }} />
          )}
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {dots}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.habitCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
      <View style={styles.habitHeader}>
        <ThemedText type="defaultSemiBold" style={styles.habitName}>{item.name}</ThemedText>
        <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSelected }]}>
          <ThemedText style={[styles.typeText, { color: colors.textSecondary }]}>{item.type}</ThemedText>
        </View>
      </View>

      <View 
        style={{ width: '100%', marginBottom: Spacing.four, paddingBottom: Spacing.two }} 
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {renderHistoryDots()}
      </View>
      
      <View style={styles.habitActions}>
        {item.completed_percentage !== null && !isEditing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
            {item.completed_percentage === 100 && (
              <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
            )}
            <ThemedText 
              style={{ 
                color: item.completed_percentage === 100 ? colors.tint : colors.textSecondary,
                fontWeight: item.completed_percentage === 100 ? '600' : 'normal'
              }}
            >
              {item.completed_percentage === 100 
                ? 'Completed' 
                : `Partially Completed: ${item.completed_percentage}%`}
            </ThemedText>
            <Pressable 
              onPress={() => {
                setSliderValue(item.completed_percentage === 100 ? 50 : item.completed_percentage!);
                setIsEditing(true);
              }} 
              style={{ marginLeft: Spacing.two }}
            >
              <ThemedText style={{ color: colors.tint, fontSize: 14 }}>Edit</ThemedText>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : isPartialMode ? (
          <View style={styles.sliderContainer}>
            <ThemedText style={styles.sliderLabel}>{Math.round(sliderValue)}%</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={99}
              step={1}
              value={sliderValue}
              onValueChange={setSliderValue}
              minimumTrackTintColor={colors.tint}
              maximumTrackTintColor={colors.backgroundSelected}
              thumbTintColor={colors.tint}
            />
            <View style={styles.sliderButtons}>
              <Pressable 
                style={[styles.actionButton, styles.partialButton, { borderColor: colors.textSecondary, marginRight: Spacing.two }]} 
                onPress={() => setIsPartialMode(false)}
              >
                <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.tint }]} 
                onPress={() => saveResponse(Math.round(sliderValue))}
              >
                <ThemedText style={styles.actionText}>Confirm</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {isEditing && (
              <Pressable 
                style={[styles.actionButton, styles.partialButton, { borderColor: colors.textSecondary, marginRight: Spacing.two }]} 
                onPress={() => setIsEditing(false)}
              >
                <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</ThemedText>
              </Pressable>
            )}
            <Pressable 
              style={[styles.actionButton, { backgroundColor: colors.tint }]} 
              onPress={() => saveResponse(100)}
            >
              <ThemedText style={styles.actionText}>Mark Complete</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, styles.partialButton, { borderColor: colors.tint, marginLeft: Spacing.two }]} 
              onPress={() => setIsPartialMode(true)}
            >
              <ThemedText style={[styles.actionText, { color: colors.tint }]}>Partial</ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    if (session) {
      fetchHabits();
    }
  }, [session]);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('id, name, type, frequency, created_at')
        .eq('user_id', session?.user?.id);

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
    }
  };

  const currentDay = new Date().getDay(); 

  const todayHabits = habits.filter(h => Array.isArray(h.frequency) && h.frequency.includes(currentDay));
  const upcomingHabits = habits.filter(h => !Array.isArray(h.frequency) || !h.frequency.includes(currentDay));

  const displayHabits = activeTab === 'today' ? todayHabits : upcomingHabits;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Habits</ThemedText>
        </View>

        <View style={[styles.tabs, { borderBottomColor: colors.backgroundSelected }]}>
          <Pressable 
            style={[styles.tab, activeTab === 'today' && { borderBottomColor: colors.tint }]} 
            onPress={() => setActiveTab('today')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'today' && { color: colors.tint, fontWeight: '600' }]}>Today</ThemedText>
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === 'upcoming' && { borderBottomColor: colors.tint }]} 
            onPress={() => setActiveTab('upcoming')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'upcoming' && { color: colors.tint, fontWeight: '600' }]}>Upcoming</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={displayHabits}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <HabitCard 
                item={item} 
                userId={session?.user?.id as string} 
                colors={colors} 
                onRefresh={fetchHabits} 
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText style={{ color: colors.textSecondary }}>No habits found.</ThemedText>
              </View>
            }
          />
        )}

        <Pressable 
          style={[styles.fab, { backgroundColor: colors.tint }]} 
          onPress={() => router.push('/create-habit' as any)}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: Spacing.two,
    marginRight: Spacing.four,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
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
    fontSize: 18,
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
  partialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionText: {
    color: '#FFF',
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
