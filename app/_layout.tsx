import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { ArrowClockwise, Moon, Sun } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TrashProvider, useTrash } from '@/src/contexts/TrashContext';
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
          headerRight: () => <HeaderActions isDark={isDark} onToggleTheme={toggleTheme} />,
        }}>
        <Stack.Screen name="index" options={{ title: 'FPR', headerBackVisible: false }} />
        <Stack.Screen name="integrantes" options={{ title: 'Configurações' }} />
      </Stack>
      <StatusBar style="auto" />
    </TrashProvider>
  );
}

type HeaderActionsProps = {
  isDark: boolean;
  onToggleTheme: () => void;
};

function HeaderActions({ isDark, onToggleTheme }: HeaderActionsProps) {
  const { isMembersLoading, refreshMembers } = useTrash();
  const { theme } = useAppTheme();

  return (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel="Atualizar dados"
        disabled={isMembersLoading}
        onPress={refreshMembers}
        style={[styles.headerButton, isMembersLoading ? styles.disabledButton : null]}>
        <ArrowClockwise size={20} color={theme.text} weight="bold" />
      </Pressable>

      <Pressable
        accessibilityLabel="Alternar tema"
        onPress={onToggleTheme}
        style={styles.headerButton}>
        {isDark ? (
          <Sun size={20} color={theme.text} weight="bold" />
        ) : (
          <Moon size={20} color={theme.text} weight="bold" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
