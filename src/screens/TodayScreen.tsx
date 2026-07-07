import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTrash } from '@/src/contexts/TrashContext';
import { formatCurrentDay } from '@/src/utils/businessDay';

export default function TodayScreen() {
  const { markForgot, markMissed, markTookOutTrash, storageError, today } = useTrash();
  const hasResponsible = Boolean(today.responsible && today.isBusinessDay);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Hoje</Text>
          <Text style={styles.title}>{formatCurrentDay()}</Text>
        </View>

        {storageError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Algo deu errado</Text>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Responsavel pelo lixo</Text>
          <Text style={styles.responsibleName}>
            {today.isBusinessDay ? today.responsible?.name ?? 'Nenhum integrante cadastrado' : 'Sem escala hoje'}
          </Text>
          {today.record ? <Text style={styles.status}>{getStatusText(today.record.action)}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.completedButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markTookOutTrash}>
            <Text style={styles.completedButtonText}>Tirou o lixo</Text>
          </Pressable>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.missedButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markMissed}>
            <Text style={styles.missedButtonText}>Faltou</Text>
          </Pressable>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.forgotButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markForgot}>
            <Text style={styles.forgotButtonText}>Esqueceu</Text>
          </Pressable>
        </View>

        <Link href="/integrantes" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Gerenciar integrantes</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function getStatusText(action: string) {
  if (action === 'completed') {
    return 'Dia concluido. O proximo dia util segue para a proxima pessoa.';
  }

  if (action === 'missed') {
    return 'Responsabilidade passada para a proxima pessoa.';
  }

  return 'Responsavel mantido pelos proximos 2 dias uteis.';
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#f3f4f6',
  },
  content: {
    width: '100%',
    maxWidth: 560,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  card: {
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  responsibleName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  completedButton: {
    backgroundColor: '#16a34a',
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  missedButton: {
    backgroundColor: '#fef2f2',
  },
  missedButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b91c1c',
  },
  forgotButton: {
    backgroundColor: '#fff7ed',
  },
  forgotButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#c2410c',
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
  },
  errorBox: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    backgroundColor: '#fef2f2',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7f1d1d',
  },
});
