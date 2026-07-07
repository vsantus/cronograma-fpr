import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TrashProvider } from '@/src/contexts/TrashContext';

export default function RootLayout() {
  return (
    <TrashProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Hoje' }} />
        <Stack.Screen name="integrantes" options={{ title: 'Integrantes' }} />
      </Stack>
      <StatusBar style="auto" />
    </TrashProvider>
  );
}
