import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MemberForm } from '@/src/components/MemberForm';
import { MemberList } from '@/src/components/MemberList';
import { useTrash } from '@/src/contexts/TrashContext';
import type { AppTheme } from '@/src/theme/colors';
import { useAppTheme } from '@/src/theme/ThemeContext';
import type { Member } from '@/src/types/member';
import { hasDuplicateMemberName, isValidMemberName, normalizeMemberName } from '@/src/utils/memberName';

export default function MembersScreen() {
  const { addMember, forgottenMemberId, members, removeMember, storageError, updateMember } = useTrash();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [isListOpen, setIsListOpen] = useState(true);
  const [memberName, setMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string>();
  const [error, setError] = useState<string>();

  function handleSubmitMember() {
    if (!isValidMemberName(memberName)) {
      setError('Informe o nome do integrante.');
      return;
    }

    const normalizedName = normalizeMemberName(memberName);

    if (hasDuplicateMemberName(members, normalizedName, editingMemberId)) {
      setError('Este integrante ja foi adicionado.');
      return;
    }

    if (editingMemberId) {
      updateMember({
        id: editingMemberId,
        name: normalizedName,
      });
      resetForm();
      return;
    }

    addMember({
      id: `${Date.now()}-${normalizedName}`,
      name: normalizedName,
    });
    resetForm();
  }

  function handleEditMember(member: Member) {
    setEditingMemberId(member.id);
    setMemberName(member.name);
    setError(undefined);
  }

  function handleRemoveMember(member: Member) {
    Alert.alert(`Remover ${member.name}?`, 'Este integrante deixara de participar da escala.', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: () => {
          removeMember(member.id);
          if (editingMemberId === member.id) {
            resetForm();
          }
        },
      },
    ]);
  }

  function resetForm() {
    setMemberName('');
    setEditingMemberId(undefined);
    setError(undefined);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Integrantes</Text>
          <Text style={styles.subtitle}>Cadastre, edite ou remova as pessoas que participam da escala.</Text>
        </View>

        {storageError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Algo deu errado</Text>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadastro</Text>
          <MemberForm
            name={memberName}
            error={error}
            submitLabel={editingMemberId ? 'Salvar edicao' : 'Adicionar'}
            onCancel={editingMemberId ? resetForm : undefined}
            onChangeName={(name) => {
              setMemberName(name);
              if (error) {
                setError(undefined);
              }
            }}
            onSubmit={handleSubmitMember}
          />
        </View>

        <View style={styles.section}>
          <Pressable style={styles.accordionHeader} onPress={() => setIsListOpen((current) => !current)}>
            <Text style={styles.sectionTitle}>Funcionarios</Text>
            <Text style={styles.accordionIcon}>{isListOpen ? 'Fechar' : 'Abrir'}</Text>
          </Pressable>
          {isListOpen ? (
            <MemberList
              forgottenMemberId={forgottenMemberId}
              members={members}
              onEditMember={handleEditMember}
              onRemoveMember={handleRemoveMember}
            />
          ) : null}
        </View>

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
