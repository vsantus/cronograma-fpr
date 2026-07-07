import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadMembers } from '@/src/services/memberStorage';
import type { TrashAppState } from '@/src/types/trash';

const TRASH_STATE_STORAGE_KEY = '@cronogramafpr:trash-state';

const EMPTY_TRASH_STATE: TrashAppState = {
  members: [],
  records: {},
};

export async function loadTrashState() {
  const storedState = await AsyncStorage.getItem(TRASH_STATE_STORAGE_KEY);

  if (!storedState) {
    const migratedMembers = await loadMembers();
    return {
      ...EMPTY_TRASH_STATE,
      members: migratedMembers,
    };
  }

  const parsedState: unknown = JSON.parse(storedState);

  if (!isTrashAppState(parsedState)) {
    return EMPTY_TRASH_STATE;
  }

  return parsedState;
}

export async function saveTrashState(state: TrashAppState) {
  await AsyncStorage.setItem(TRASH_STATE_STORAGE_KEY, JSON.stringify(state));
}

function isTrashAppState(value: unknown): value is TrashAppState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<TrashAppState>;
  return Array.isArray(state.members) && typeof state.records === 'object' && Boolean(state.records);
}
