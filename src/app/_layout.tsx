import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../context/AuthProvider';
import { queryClient } from '../lib/queryClient';
import { colors, isDark } from '../theme';

const base = isDark ? DarkTheme : DefaultTheme;
// Headers and the tab bar take their colors from here.
const navTheme = {
  ...base,
  colors: {
    ...base.colors,
    primary: colors.primary,
    background: colors.surface,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
          <StatusBar style="auto" />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
