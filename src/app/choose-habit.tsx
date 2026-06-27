import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

type PublicHabit = {
  id: number;
  name: string;
  frequency: number[];
  member_count: number;
};

export default function ChooseHabitScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [habits, setHabits] = useState<PublicHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchPublicHabits();
  }, []);

  const fetchPublicHabits = async () => {
    try {
      setLoading(true);
      
      // 1. Get habits user has already joined
      const { data: joinedData } = await supabase
        .from('public_habit_members')
        .select('habit_id')
        .eq('user_id', session?.user?.id);
        
      const joinedIds = joinedData ? joinedData.map(d => d.habit_id) : [];

      // 2. Fetch public habits not owned by user
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, frequency, public_habit_members(count)')
        .eq('type', 'public')
        .neq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        // Filter out already joined habits
        const unjoined = data.filter(h => !joinedIds.includes(h.id));
        
        const formatted = unjoined.map(h => ({
          id: h.id,
          name: h.name,
          frequency: h.frequency || [],
          // Supabase count returns an array like [{count: 5}]
          member_count: h.public_habit_members && h.public_habit_members[0] ? h.public_habit_members[0].count : 0
        }));
        
        setHabits(formatted);
      }
    } catch (error: any) {
      console.error('Error fetching public habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (habitId: number) => {
    if (!session?.user?.id) return;
    
    try {
      setJoiningId(habitId);
      const { error } = await supabase
        .from('public_habit_members')
        .insert({
          user_id: session.user.id,
          habit_id: habitId,
        });

      if (error) throw error;
      
      Alert.alert('Success', 'You have joined the habit!');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join habit');
      setJoiningId(null);
    }
  };

  const handleScrollPrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const handleScrollNext = () => {
    if (currentIndex < habits.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const getFrequencyText = (frequency: number[]) => {
    if (!frequency || frequency.length === 0) return 'Daily';
    if (frequency.length === 7) return 'Daily';
    if (frequency.length === 5 && !frequency.includes(0) && !frequency.includes(6)) return 'Weekdays';
    return `${frequency.length} days/wk`;
  };

  const renderCard = ({ item, index }: { item: PublicHabit; index: number }) => (
    <ThemedView style={[styles.card, { 
      backgroundColor: scheme === 'dark' ? colors.backgroundElement : colors.backgroundSelected,
      borderColor: scheme === 'dark' ? '#333' : '#E5E5E5' 
    }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconPlaceholder}>
          <Ionicons name="sparkles" size={24} color={colors.tint} />
        </View>
        <View style={[styles.publicBadge, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="globe-outline" size={12} color={colors.tint} style={{ marginRight: 4 }} />
          <ThemedText style={[styles.publicBadgeText, { color: colors.tint }]}>Public</ThemedText>
        </View>
      </View>
      
      <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </ThemedText>
      
      <View style={[styles.frequencyBadge, { backgroundColor: scheme === 'dark' ? '#333' : '#E5E5E5' }]}>
        <ThemedText style={[styles.frequencyText, { color: colors.textSecondary }]}>
          {getFrequencyText(item.frequency)}
        </ThemedText>
      </View>
      
      <View style={styles.joinedRow}>
        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
        <ThemedText style={[styles.joinedText, { color: colors.textSecondary }]}>
          {item.member_count.toLocaleString()} joined
        </ThemedText>
      </View>

      <Pressable
        style={[styles.joinButton, { backgroundColor: colors.tint, opacity: joiningId === item.id ? 0.7 : 1 }]}
        onPress={() => handleJoin(item.id)}
        disabled={joiningId !== null}
      >
        {joiningId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={styles.joinButtonText}>Join Habit</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <ThemedText type="title" style={styles.headerTitle}>Choose or Create Habit</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Join existing or create your own
          </ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Join Public Habit Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="globe-outline" size={20} color={colors.tint} style={{ marginRight: 8 }} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Join a Public Habit</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/public-habits')}>
            <ThemedText style={[styles.viewAllText, { color: colors.tint }]}>View All</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : habits.length > 0 ? (
          <View>
            <FlatList
              ref={flatListRef}
              data={habits}
              renderItem={renderCard}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CARD_WIDTH + Spacing.four}
              decelerationRate="fast"
              onMomentumScrollEnd={(ev) => {
                const index = Math.round(ev.nativeEvent.contentOffset.x / (CARD_WIDTH + Spacing.four));
                setCurrentIndex(index);
              }}
            />
            
            {/* Carousel Controls */}
            {habits.length > 1 && (
              <View style={styles.carouselControls}>
                <Pressable 
                  style={[styles.arrowButton, { backgroundColor: scheme === 'dark' ? '#333' : '#E5E5E5', opacity: currentIndex === 0 ? 0.5 : 1 }]}
                  onPress={handleScrollPrev}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
                <Pressable 
                  style={[styles.arrowButton, { backgroundColor: scheme === 'dark' ? '#333' : '#E5E5E5', opacity: currentIndex === habits.length - 1 ? 0.5 : 1 }]}
                  onPress={handleScrollNext}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={{ color: colors.textSecondary }}>No public habits available right now.</ThemedText>
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: scheme === 'dark' ? '#333' : '#E5E5E5' }]} />
          <ThemedText style={[styles.dividerText, { color: colors.textSecondary, backgroundColor: colors.background }]}>or</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: scheme === 'dark' ? '#333' : '#E5E5E5' }]} />
        </View>

        {/* Create Your Own Section */}
        <View style={styles.createSection}>
          <ThemedText type="defaultSemiBold" style={styles.createTitle}>Create Your Own</ThemedText>
          <ThemedText style={[styles.createDescription, { color: colors.textSecondary }]}>
            Design a custom habit with your own schedule, reminders, and make it public or keep it private.
          </ThemedText>
          
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/create-habit')}
          >
            <ThemedText style={styles.createButtonText}>Create Custom Habit</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  backButton: {
    marginRight: Spacing.three,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.five,
    marginBottom: Spacing.four,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  carouselContent: {
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: CARD_WIDTH,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: Spacing.two,
  },
  frequencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: Spacing.three,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  joinedText: {
    fontSize: 14,
    marginLeft: 6,
  },
  joinButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  carouselControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  createSection: {
    paddingHorizontal: Spacing.four,
  },
  createTitle: {
    fontSize: 18,
    marginBottom: Spacing.two,
  },
  createDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.four,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
