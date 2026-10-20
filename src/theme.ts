import type { TextStyle } from 'react-native';

// Shared look for the app: every screen takes its colors from here.
export const colors = {
  primary: '#2563eb',
  primaryLight: '#93c5fd',
  // Plucky mascot yellow: small fun touches only (badges, mascot moments).
  accent: '#ffd23f',
  // Text on yellow: stays dark even when dark mode arrives.
  onAccent: '#111827',
  onPrimary: '#fff',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerLight: '#f87171',
  dangerDark: '#b91c1c',
  warning: '#b45309',
  warningText: '#92400e',
  warningBg: '#fef3c7',
  streak: '#ea580c',
  text: '#111827',
  textSecondary: '#374151',
  muted: '#6b7280',
  subtle: '#9ca3af',
  disabled: '#d1d5db',
  surface: '#f3f4f6',
  border: '#e5e7eb',
  borderStrong: '#ddd',
  background: '#fff',
  black: '#000',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 8, lg: 12, full: 999 };

// Text ladder: pick a step through <AppText variant="..."> instead of a raw fontSize.
export const typography = {
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  small: { fontSize: 14, fontWeight: '400', color: colors.muted },
  caption: { fontSize: 12, fontWeight: '400', color: colors.muted },
} as const satisfies Record<string, TextStyle>;
