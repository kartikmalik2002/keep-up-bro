import { useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CreateHabitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { session } = useAuth();

  // State
  const [name, setName] = useState('');
  const [type, setType] = useState('private'); // default 'private'
  const [frequency, setFrequency] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [motivationalAnchor, setMotivationalAnchor] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      fetchHabit();
    }
  }, [id]);

  const fetchHabit = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setName(data.name);
        setType(data.type);
        setFrequency(data.frequency || []);
        setDescription(data.description || '');
        setMotivationalAnchor(data.motivational_anchor || '');
        setReminderEnabled(data.reminder_enabled || false);
        if (data.reminder_time) {
          const date = new Date();
          const [hours, minutes] = data.reminder_time.split(':');
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          setReminderTime(date);
        }
        if (data.end_date) setEndDate(new Date(data.end_date));
      }
    } catch (err: any) {
      alert('Failed to load habit');
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleDay = (index: number) => {
    if (frequency.includes(index)) {
      setFrequency(frequency.filter((d) => d !== index));
    } else {
      setFrequency([...frequency, index].sort());
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    if (frequency.length === 0) {
      alert('Please select at least one day for frequency');
      return;
    }

    setLoading(true);
    try {
      const habitData: any = {
        name: name.trim(),
        type,
        frequency,
        description: description.trim() || null,
        motivational_anchor: motivationalAnchor.trim() || null,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime.toTimeString().split(' ')[0] : null,
        end_date: endDate ? endDate.toISOString() : null,
      };

      let error;
      if (id) {
        const numericId = parseInt(Array.isArray(id) ? id[0] : id, 10);
        const { data, error: updateError } = await supabase
          .from('habits')
          .update(habitData)
          .eq('id', numericId)
          .select();
          
        if (updateError) {
          error = updateError;
        } else if (!data || data.length === 0) {
          throw new Error("Update failed: No rows were modified. ID might be invalid or permissions lacking.");
        }
      } else {
        habitData.user_id = session?.user?.id;
        const { error: insertError } = await supabase.from('habits').insert([habitData]);
        error = insertError;
      }

      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      alert(err.message || `Failed to ${id ? 'update' : 'create'} habit`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.backgroundElement }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={{ color: colors.tint, fontSize: 16 }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>{id ? 'Edit Habit' : 'New Habit'}</ThemedText>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      {initialLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Name *</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
            placeholder="e.g. Morning Run"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Type (Public/Private) */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Type *</ThemedText>
          <View style={styles.radioGroup}>
            <Pressable 
              style={[styles.radio, type === 'private' && { borderColor: colors.tint, backgroundColor: colors.tint + '20' }]} 
              onPress={() => setType('private')}
            >
              <ThemedText style={type === 'private' ? { color: colors.tint, fontWeight: '600' } : {}}>Private</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.radio, type === 'public' && { borderColor: colors.tint, backgroundColor: colors.tint + '20' }]} 
              onPress={() => setType('public')}
            >
              <ThemedText style={type === 'public' ? { color: colors.tint, fontWeight: '600' } : {}}>Public</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
            <ThemedText style={[styles.label, { marginBottom: 0 }]}>Frequency *</ThemedText>
            <Pressable onPress={() => {
              if (frequency.length === 7) {
                setFrequency([]);
              } else {
                setFrequency([0, 1, 2, 3, 4, 5, 6]);
              }
            }}>
              <ThemedText style={{ color: frequency.length === 7 ? colors.textSecondary : colors.tint, fontSize: 14, fontWeight: '600' }}>
                {frequency.length === 7 ? 'Clear All' : 'All'}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.frequencyRow}>
            {DAYS.map((day, index) => {
              const isSelected = frequency.includes(index);
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCircle,
                    { backgroundColor: colors.backgroundSelected },
                    isSelected && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <ThemedText style={[styles.dayText, isSelected && { color: '#FFF' }]}>{day}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.backgroundSelected }]}
            placeholder="Details about this habit..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Motivational Anchor */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Motivational Anchor</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
            placeholder="Why do you want to do this?"
            placeholderTextColor={colors.textSecondary}
            value={motivationalAnchor}
            onChangeText={setMotivationalAnchor}
          />
        </View>

        {/* Reminder */}
        <View style={[styles.inputGroup, styles.rowGroup]}>
          <ThemedText style={styles.label}>Enable Reminder</ThemedText>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
          />
        </View>

        {reminderEnabled && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Reminder Time</ThemedText>
            <Pressable 
              style={[styles.input, { borderColor: colors.backgroundSelected, justifyContent: 'center' }]} 
              onPress={() => setShowTimePicker(true)}
            >
              <ThemedText>{reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                display="default"
                onValueChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) setReminderTime(selectedDate);
                }}
                onDismiss={() => setShowTimePicker(false)}
              />
            )}
          </View>
        )}

        {/* End Date */}
        <View style={styles.inputGroup}>
          <View style={styles.rowGroup}>
            <ThemedText style={styles.label}>End Date (Optional)</ThemedText>
            {endDate && (
              <Pressable onPress={() => setEndDate(null)}>
                <ThemedText style={{ color: colors.tint, fontSize: 14 }}>Clear</ThemedText>
              </Pressable>
            )}
          </View>
          <Pressable 
            style={[styles.input, { borderColor: colors.backgroundSelected, justifyContent: 'center' }]} 
            onPress={() => setShowDatePicker(true)}
          >
            <ThemedText>{endDate ? endDate.toLocaleDateString() : 'No End Date'}</ThemedText>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onValueChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setEndDate(selectedDate);
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}
        </View>

        {/* Create Button */}
        <Pressable 
          style={[styles.createButton, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          <ThemedText style={styles.createButtonText}>
            {loading ? 'Saving...' : id ? 'Save Changes' : 'Create Habit'}
          </ThemedText>
        </Pressable>

        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backButton: {
    width: 60,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  rowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  radio: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    paddingVertical: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
