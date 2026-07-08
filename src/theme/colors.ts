import { ColorSchemeName } from 'react-native';

export type AppTheme = ReturnType<typeof getTheme>;

const light = {
  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceMuted: '#f9fafb',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  text: '#111827',
  textMuted: '#4b5563',
  textSubtle: '#6b7280',
  primary: '#2563eb',
  primarySoft: '#eef2ff',
  primaryText: '#3730a3',
  success: '#16a34a',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerStrong: '#991b1b',
  warning: '#c2410c',
  warningSoft: '#fff7ed',
  avatarBg: '#e0f2fe',
  avatarText: '#1f2937',
};

const dark = {
  background: '#0f172a',
  surface: '#111827',
  surfaceMuted: '#1f2937',
  border: '#374151',
  borderStrong: '#4b5563',
  text: '#f9fafb',
  textMuted: '#d1d5db',
  textSubtle: '#9ca3af',
  primary: '#60a5fa',
  primarySoft: '#1e3a8a',
  primaryText: '#dbeafe',
  success: '#22c55e',
  danger: '#fca5a5',
  dangerSoft: '#451a1a',
  dangerBorder: '#7f1d1d',
  dangerStrong: '#fecaca',
  warning: '#fdba74',
  warningSoft: '#431407',
  avatarBg: '#164e63',
  avatarText: '#ecfeff',
};

export function getTheme(colorScheme: ColorSchemeName) {
  return colorScheme === 'dark' ? dark : light;
}
