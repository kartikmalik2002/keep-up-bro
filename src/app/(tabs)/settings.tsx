import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/context/theme';

export default function SettingsScreen() {
  const { theme, setTheme } = useAppTheme();
  
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Appearance</ThemedText>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[
                styles.radio, 
                theme === 'light' && { borderColor: Colors.light.tint, backgroundColor: Colors.light.tint + '20' }
              ]} 
              onPress={() => setTheme('light')}
            >
              <ThemedText style={theme === 'light' ? { color: Colors.light.tint, fontWeight: '600' } : {}}>Light</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.radio, 
                theme === 'dark' && { borderColor: Colors.light.tint, backgroundColor: Colors.light.tint + '20' }
              ]} 
              onPress={() => setTheme('dark')}
            >
              <ThemedText style={theme === 'dark' ? { color: Colors.light.tint, fontWeight: '600' } : {}}>Dark</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
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
    alignItems: 'stretch',
    gap: Spacing.four,
  },
  section: {
    marginTop: Spacing.four,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.three,
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
    backgroundColor: '#88888820', // fallback subtle background
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
