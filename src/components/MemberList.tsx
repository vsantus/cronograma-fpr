import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/src/theme/colors';
import { useAppTheme } from '@/src/theme/ThemeContext';
import type { Member } from '@/src/types/member';
import { sortMembersByName } from '@/src/utils/memberName';

type MemberListProps = {
  forgottenMemberId?: string;
  members: Member[];
  onEditMember: (member: Member) => void;
  onRemoveMember: (member: Member) => void;
};

export function MemberList({ forgottenMemberId, members, onEditMember, onRemoveMember }: MemberListProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const sortedMembers = sortMembersByName(members);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>{sortedMembers.length}</Text>
      </View>

      {sortedMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhum integrante adicionado</Text>
          <Text style={styles.emptyDescription}>Cadastre um nome para iniciar a lista.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sortedMembers.map((member) => (
            <View key={member.id} style={styles.item}>
              <View style={styles.memberInfo}>
                <Text style={styles.avatar}>{member.name.charAt(0).toLocaleUpperCase('pt-BR')}</Text>
                <View style={styles.nameContainer}>
                  <Text style={styles.name}>{member.name}</Text>
                  {forgottenMemberId === member.id ? <View style={styles.forgottenDot} /> : null}
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable style={styles.editButton} onPress={() => onEditMember(member)}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>
                <Pressable style={styles.removeButton} onPress={() => onRemoveMember(member)}>
                  <Text style={styles.removeButtonText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  count: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '700',
    color: theme.textMuted,
    textAlign: 'center',
    backgroundColor: theme.surfaceMuted,
  },
  emptyState: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    backgroundColor: theme.surfaceMuted,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.textSubtle,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    backgroundColor: theme.surface,
  },
  memberInfo: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 32,
    color: theme.avatarText,
    textAlign: 'center',
    backgroundColor: theme.avatarBg,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forgottenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.danger,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButton: {
    width: 76,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.primarySoft,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.primaryText,
  },
  removeButton: {
    width: 92,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.dangerSoft,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.danger,
  },
});
