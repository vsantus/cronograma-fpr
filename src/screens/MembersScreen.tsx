import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MemberList } from '@/src/components/MemberList';
import { useTrash } from '@/src/contexts/TrashContext';
import type { AppTheme } from '@/src/theme/colors';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function MembersScreen() {
  const { forgottenMemberId, isMembersLoading, members, refreshMembers, storageError } = useTrash();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [isListOpen, setIsListOpen] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Integrantes</Text>
          <Text style={styles.subtitle}>Lista sincronizada com a planilha de funcionarios.</Text>
        </View>

        {storageError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Algo deu errado</Text>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Pressable style={styles.accordionHeader} onPress={() => setIsListOpen((current) => !current)}>
            <Text style={styles.sectionTitle}>Funcionarios</Text>
            <Text style={styles.accordionIcon}>{isListOpen ? 'Fechar' : 'Abrir'}</Text>
          </Pressable>
          {isListOpen ? <MemberList forgottenMemberId={forgottenMemberId} members={members} /> : null}
        </View>

        <Pressable
          disabled={isMembersLoading}
          style={[styles.primaryButton, isMembersLoading ? styles.disabledButton : null]}
          onPress={refreshMembers}>
          <Text style={styles.primaryButtonText}>{isMembersLoading ? 'Atualizando...' : 'Atualizar planilha'}</Text>
        </Pressable>

        <Link href="/" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Voltar para Home</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
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
      maxWidth: 640,
      gap: 20,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.textMuted,
    },
    section: {
      gap: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      backgroundColor: theme.surface,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    accordionHeader: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    accordionIcon: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.primary,
    },
    primaryButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
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
