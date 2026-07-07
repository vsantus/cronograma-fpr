import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Member } from '@/src/types/member';

const MEMBERS_STORAGE_KEY = '@cronogramafpr:members';

export async function loadMembers() {
  const storedMembers = await AsyncStorage.getItem(MEMBERS_STORAGE_KEY);

  if (!storedMembers) {
    return [];
  }

  const parsedMembers: unknown = JSON.parse(storedMembers);

  if (!Array.isArray(parsedMembers)) {
    return [];
  }

  return parsedMembers.filter(isMember);
}

export async function saveMembers(members: Member[]) {
  await AsyncStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
}

function isMember(value: unknown): value is Member {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const member = value as Partial<Member>;
  return typeof member.id === 'string' && typeof member.name === 'string';
}
