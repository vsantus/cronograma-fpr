import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTrash } from '@/src/contexts/TrashContext';
import type { AppTheme } from '@/src/theme/colors';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function TodayScreen() {
  const { forgottenMemberId, markForgot, markMissed, markTookOutTrash, storageError, today } = useTrash();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const hasResponsible = Boolean(today.responsible && today.isBusinessDay);
  const hasForgottenFlag = Boolean(today.responsible && forgottenMemberId === today.responsible.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>De quem é o Lixo?</Text>
          {/* <Text style={styles.title}>{formatCurrentDay()}</Text> */}
        </View>

        {storageError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Algo deu errado</Text>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Responsavel do dia:</Text>
          <View style={styles.responsibleRow}>
            <Text style={styles.responsibleName}>
              {today.isBusinessDay ? today.responsible?.name ?? 'Nenhum integrante cadastrado' : 'Sem escala hoje'}
            </Text>
            {hasForgottenFlag ? <View style={styles.forgottenDot} /> : null}
          </View>
          {today.record || today.debtStatus ? (
            <Text style={styles.status}>{getStatusText(today.record?.action, today.debtStatus)}</Text>
          ) : null}
        </View>



        <View style={styles.actions}>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.completedButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markTookOutTrash}>
            <Text style={styles.completedButtonText}>Ja tirou o lixo</Text>
          </Pressable>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.missedButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markMissed}>
            <Text style={styles.missedButtonText}>Não veio hoje</Text>
          </Pressable>
          <Pressable
            disabled={!hasResponsible}
            style={[styles.actionButton, styles.forgotButton, !hasResponsible ? styles.disabledButton : null]}
            onPress={markForgot}>
            <Text style={styles.forgotButtonText}>Esqueceu de tirar o lixo</Text>
          </Pressable>
        </View>
        <View style={styles.reminderCard}>
          <Text style={styles.label}>
            {today.debtStatus && !today.debtStatus.isLastDay ? 'Proximo dia util' : 'Proximo da lista'}
          </Text>
          <Text style={styles.nextName}>
            {today.nextResponsible ? today.nextResponsible.name : 'Cadastre integrantes para ver a sequencia'}
          </Text>
        </View>

        <Link href="/integrantes" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Gerenciar time</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function getStatusText(
  action?: string,
  debtStatus?: {
    currentDay: number;
    isLastDay: boolean;
    totalDays: number;
  }
) {
  if (!action && debtStatus) {
    return debtStatus.isLastDay
      ? `Debito ativo: dia ${debtStatus.currentDay}/${debtStatus.totalDays}. Hoje e o ultimo dia antes de seguir a lista.`
      : `Debito ativo: dia ${debtStatus.currentDay}/${debtStatus.totalDays}. A mesma pessoa continua no proximo dia util.`;
  }

  if (action === 'completed') {
    if (debtStatus) {
      return debtStatus.isLastDay
        ? `Debito ${debtStatus.currentDay}/${debtStatus.totalDays} concluido. O proximo dia util segue para a proxima pessoa.`
        : `Debito ${debtStatus.currentDay}/${debtStatus.totalDays} concluido. A mesma pessoa continua no proximo dia util.`;
    }

    return 'Dia concluido. O proximo dia util segue para a proxima pessoa.';
  }

  if (action === 'missed') {
    return 'Responsabilidade passada para a proxima pessoa.';
  }

  return 'Responsavel pelos proximos 2 dias de lixo.';
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
      backgroundColor: theme.background,
    },
    content: {
      width: '100%',
      maxWidth: 560,
      gap: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    eyebrow: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.text,
    },
    card: {
      gap: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      backgroundColor: theme.surface,
    },
    reminderCard: {
      gap: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      backgroundColor: theme.surfaceMuted,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSubtle,
    },
    responsibleName: {
      flexShrink: 1,
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
    },
    responsibleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    forgottenDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.danger,
    },
    nextName: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    status: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.textMuted,
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
      backgroundColor: theme.success,
    },
    completedButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
    },
    missedButton: {
      backgroundColor: theme.dangerSoft,
    },
    missedButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.danger,
    },
    forgotButton: {
      backgroundColor: theme.warningSoft,
    },
    forgotButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.warning,
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
      borderColor: theme.borderStrong,
      backgroundColor: theme.surface,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textMuted,
    },
    errorBox: {
      gap: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      padding: 12,
      backgroundColor: theme.dangerSoft,
    },
    errorTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.dangerStrong,
    },
    errorText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.dangerStrong,
    },
  });
