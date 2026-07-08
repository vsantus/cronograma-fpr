import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppTheme } from '@/src/theme/colors';
import { useAppTheme } from '@/src/theme/ThemeContext';

type MemberFormProps = {
  name: string;
  error?: string;
  submitLabel?: string;
  onCancel?: () => void;
  onChangeName: (name: string) => void;
  onSubmit: () => void;
};

export function MemberForm({
  name,
  error,
  submitLabel = 'Adicionar',
  onCancel,
  onChangeName,
  onSubmit,
}: MemberFormProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome do integrante</Text>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        onSubmitEditing={onSubmit}
        placeholder="Digite o nome"
        placeholderTextColor={theme.textSubtle}
        returnKeyType="done"
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={onSubmit}>
          <Text style={styles.buttonText}>{submitLabel}</Text>
        </Pressable>
        {onCancel ? (
          <Pressable style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  inputError: {
    borderColor: theme.danger,
  },
  error: {
    fontSize: 13,
    color: theme.danger,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flexGrow: 1,
    flexBasis: 160,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textMuted,
  },
});
