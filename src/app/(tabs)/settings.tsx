import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Settings</ThemedText>
        
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  signOutButton: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    backgroundColor: '#ff4444',
    borderRadius: Spacing.two,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  signOutText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
