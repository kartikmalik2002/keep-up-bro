import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type PublicHabit = {
  id: number;
  name: string;
  frequency: number[];
  member_count: number;
};

export default function PublicHabitsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [habits, setHabits] = useState<PublicHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  
  useEffect(() => {
    fetchPublicHabits();
  }, []);

  const fetchPublicHabits = async () => {
    try {
      setLoading(true);
      
      const { data: joinedData } = await supabase
        .from('public_habit_members')
        .select('habit_id')
        .eq('user_id', session?.user?.id);
        
      const joinedIds = joinedData ? joinedData.map(d => d.habit_id) : [];

      const { data, error } = await supabase
        .from('habits')
        .select('id, name, frequency, public_habit_members(count)')
        .eq('type', 'public')
        .neq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const unjoined = data.filter(h => !joinedIds.includes(h.id));
        
        const formatted = unjoined.map(h => ({
          id: h.id,
          name: h.name,
          frequency: h.frequency || [],
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

  const getFrequencyText = (frequency: number[]) => {
    if (!frequency || frequency.length === 0) return 'Daily';
    if (frequency.length === 7) return 'Daily';
    if (frequency.length === 5 && !frequency.includes(0) && !frequency.includes(6)) return 'Weekdays';
    return `${frequency.length} days/wk`;
  };

  const renderCard = ({ item }: { item: PublicHabit }) => (
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <ThemedText type="title" style={styles.headerTitle}>All Public Habits</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Discover and join habits from the community
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : habits.length > 0 ? (
        <FlatList
          data={habits}
          renderItem={renderCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <ThemedText style={{ color: colors.textSecondary }}>No public habits available right now.</ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
