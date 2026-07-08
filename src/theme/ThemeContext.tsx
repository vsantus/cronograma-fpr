import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { getTheme } from '@/src/theme/colors';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  isDark: boolean;
  theme: ReturnType<typeof getTheme>;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo(() => {
    const theme = getTheme(mode);

    return {
      isDark: mode === 'dark',
      theme,
      toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return value;
}
