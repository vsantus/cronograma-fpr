import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome do integrante</Text>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        onSubmitEditing={onSubmit}
        placeholder="Digite o nome"
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

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  error: {
    fontSize: 13,
    color: '#dc2626',
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
    backgroundColor: '#2563eb',
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
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
});
