import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Moon, Sun } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { TrashProvider } from '@/src/contexts/TrashContext';
import { ThemeProvider, useAppTheme } from '@/src/theme/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRootLayout />
    </ThemeProvider>
  );
}

function ThemedRootLayout() {
  const { isDark, theme, toggleTheme } = useAppTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  return (
    <TrashProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerRight: () => (
            <Pressable
              accessibilityLabel="Alternar tema"
              onPress={toggleTheme}
              style={styles.themeButton}>
              {isDark ? (
                <Sun size={20} color={theme.text} weight="bold" />
              ) : (
                <Moon size={20} color={theme.text} weight="bold" />
              )}
            </Pressable>
          ),
        }}>
        <Stack.Screen name="index" options={{ title: 'FPR', headerBackVisible: false }} />
        <Stack.Screen name="integrantes" options={{ title: 'Configurações' }} />
      </Stack>
      <StatusBar style="auto" />
    </TrashProvider>
  );
}

const styles = StyleSheet.create({
  themeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
