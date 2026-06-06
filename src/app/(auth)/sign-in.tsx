import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      router.replace('/');
    }
    setLoading(false);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.header}>Welcome Back</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subheader}>
          Sign in to your account
        </ThemedText>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText} type="default">
              {loading ? 'Signing in...' : 'Sign In'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary">
            Don't have an account?{' '}
          </ThemedText>
          <Link href={'/(auth)/sign-up' as any} asChild>
            <TouchableOpacity>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Sign Up
              </ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  subheader: {
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
});
