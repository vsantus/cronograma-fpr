import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Member } from '@/src/types/member';
import { sortMembersByName } from '@/src/utils/memberName';

type MemberListProps = {
  members: Member[];
  onEditMember: (member: Member) => void;
  onRemoveMember: (member: Member) => void;
};

export function MemberList({ members, onEditMember, onRemoveMember }: MemberListProps) {
  const sortedMembers = sortMembersByName(members);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Integrantes</Text>
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
                <Text style={styles.name}>{member.name}</Text>
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

const styles = StyleSheet.create({
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
    color: '#111827',
  },
  count: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
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
    borderColor: '#e5e7eb',
    padding: 12,
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    textAlign: 'center',
    backgroundColor: '#e0f2fe',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#eef2ff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3730a3',
  },
  removeButton: {
    width: 92,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
});
