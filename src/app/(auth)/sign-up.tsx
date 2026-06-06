import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  async function signUpWithEmail() {
    setLoading(true);
    
    // Generate a deep link to return to the app
    const redirectUrl = Linking.createURL('/');
    console.log('Redirect URL for Supabase:', redirectUrl);

    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else if (!session) {
      Alert.alert('Success', 'Please check your inbox for email verification!');
    } else {
      router.replace('/');
    }
    setLoading(false);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.header}>Create Account</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subheader}>
          Sign up to get started
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
            onPress={signUpWithEmail}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText} type="default">
              {loading ? 'Signing up...' : 'Sign Up'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary">
            Already have an account?{' '}
          </ThemedText>
          <Link href={'/(auth)/sign-in' as any} asChild>
            <TouchableOpacity>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Sign In
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
