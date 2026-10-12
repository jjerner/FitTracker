import { Appearance } from 'react-native';

// Shared look for the app: every screen takes its colors from here.
const light = {
  primary: '#2563eb',
  primaryLight: '#93c5fd',
  onPrimary: '#fff',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerLight: '#f87171',
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
  barButton: '#374151', // buttons on the always-black rest bar
};

const dark: typeof light = {
  primary: '#3b82f6',
  primaryLight: '#93c5fd',
  onPrimary: '#fff',
  success: '#22c55e',
  successBg: '#14532d',
  danger: '#f87171',
  dangerLight: '#fca5a5',
  warning: '#f59e0b',
  warningText: '#fcd34d',
  warningBg: '#451a03',
  streak: '#fb923c',
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  muted: '#9ca3af',
  subtle: '#6b7280',
  disabled: '#4b5563',
  surface: '#111827',
  border: '#374151',
  borderStrong: '#4b5563',
  background: '#1f2937',
  black: '#000',
  barButton: '#374151', // buttons on the always-black rest bar
};

export const isDark = Appearance.getColorScheme() === 'dark';
// shortcut: theme is picked once at app start (styles are built at import), so switching the phone's theme needs an app restart; upgrade to a useColors hook in the UX overhaul.
export const colors = isDark ? dark : light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 6, md: 8, lg: 12 };
