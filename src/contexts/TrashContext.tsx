import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { loadTrashState, saveTrashState } from '@/src/services/trashStorage';
import type { Member } from '@/src/types/member';
import type { DailyTrashRecord, TrashAppState } from '@/src/types/trash';
import { addBusinessDays, getDateKey, isBusinessDay } from '@/src/utils/businessDay';
import { sortMembersByName } from '@/src/utils/memberName';

type TodayResponsibility = {
  dateKey: string;
  isBusinessDay: boolean;
  record?: DailyTrashRecord;
  responsible?: Member;
};

type TrashContextValue = {
  addMember: (member: Member) => void;
  forgottenMemberId?: string;
  members: Member[];
  removeMember: (memberId: string) => void;
  storageError?: string;
  today: TodayResponsibility;
  markForgot: () => void;
  markMissed: () => void;
  markTookOutTrash: () => void;
  updateMember: (member: Member) => void;
};

const EMPTY_STATE: TrashAppState = {
  members: [],
  records: {},
};

const TrashContext = createContext<TrashContextValue | undefined>(undefined);

export function TrashProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<TrashAppState>(EMPTY_STATE);
  const [storageError, setStorageError] = useState<string>();

  const sortedMembers = useMemo(() => sortMembersByName(state.members), [state.members]);
  const today = useMemo(() => getTodayResponsibility(state, sortedMembers), [sortedMembers, state]);
  const forgottenMemberId = useMemo(() => getForgottenMemberId(state), [state]);

  useEffect(() => {
    async function loadState() {
      try {
        const storedState = await loadTrashState();
        setState(normalizeState(storedState));
      } catch {
        setState(EMPTY_STATE);
        setStorageError('Nao foi possivel carregar os dados salvos. Voce pode continuar usando o app.');
      }
    }

    loadState();
  }, []);

  async function commitState(nextState: TrashAppState) {
    const normalizedState = normalizeState(nextState);
    setState(normalizedState);

    try {
      await saveTrashState(normalizedState);
      setStorageError(undefined);
    } catch {
      setStorageError('Nao foi possivel salvar os dados agora. Tente novamente em instantes.');
    }
  }

  function addMember(member: Member) {
    const nextMembers = [...state.members, member];
    const nextState = {
      ...state,
      currentMemberId: state.currentMemberId ?? member.id,
      members: nextMembers,
    };

    commitState(nextState);
  }

  function updateMember(updatedMember: Member) {
    commitState({
      ...state,
      members: state.members.map((member) => (member.id === updatedMember.id ? updatedMember : member)),
    });
  }

  function removeMember(memberId: string) {
    const nextMembers = state.members.filter((member) => member.id !== memberId);
    const nextCurrentMemberId = state.currentMemberId === memberId ? getFirstMemberId(nextMembers) : state.currentMemberId;
    const nextForcedResponsibility =
      state.forcedResponsibility?.memberId === memberId ? undefined : state.forcedResponsibility;

    commitState({
      ...state,
      currentMemberId: nextCurrentMemberId,
      forcedResponsibility: nextForcedResponsibility,
      members: nextMembers,
    });
  }

  function markTookOutTrash() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    const shouldKeepForcedResponsibility =
      state.forcedResponsibility?.memberId === today.responsible.id &&
      state.forcedResponsibility.untilDate > today.dateKey;

    commitState({
      ...state,
      currentMemberId: shouldKeepForcedResponsibility
        ? today.responsible.id
        : getNextMemberId(sortedMembers, today.responsible.id),
      forcedResponsibility: shouldKeepForcedResponsibility ? state.forcedResponsibility : undefined,
      records: {
        ...state.records,
        [today.dateKey]: createRecord('completed', today.dateKey, today.responsible),
      },
    });
  }

  function markMissed() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    commitState({
      ...state,
      currentMemberId: getNextMemberId(sortedMembers, today.responsible.id),
      forcedResponsibility: undefined,
      records: {
        ...state.records,
        [today.dateKey]: createRecord('missed', today.dateKey, today.responsible),
      },
    });
  }

  function markForgot() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    commitState({
      ...state,
      currentMemberId: today.responsible.id,
      forcedResponsibility: {
        memberId: today.responsible.id,
        untilDate: getDateKey(addBusinessDays(new Date(), 2)),
      },
      records: {
        ...state.records,
        [today.dateKey]: createRecord('forgot', today.dateKey, today.responsible),
      },
    });
  }

  return (
    <TrashContext.Provider
      value={{
        addMember,
        forgottenMemberId,
        members: state.members,
        removeMember,
        storageError,
        today,
        markForgot,
        markMissed,
        markTookOutTrash,
        updateMember,
      }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  const value = useContext(TrashContext);

  if (!value) {
    throw new Error('useTrash must be used inside TrashProvider');
  }

  return value;
}

function getTodayResponsibility(state: TrashAppState, sortedMembers: Member[]): TodayResponsibility {
  const date = new Date();
  const dateKey = getDateKey(date);
  const record = state.records[dateKey];

  if (!isBusinessDay(date)) {
    return {
      dateKey,
      isBusinessDay: false,
      record,
    };
  }

  if (record?.action === 'completed') {
    return {
      dateKey,
      isBusinessDay: true,
      record,
      responsible: findMemberById(sortedMembers, record.memberId),
    };
  }

  const forcedMember = getForcedMember(state, sortedMembers, dateKey);
  const responsible = forcedMember ?? getCurrentMember(state, sortedMembers);

  return {
    dateKey,
    isBusinessDay: true,
    record,
    responsible,
  };
}

function getForcedMember(state: TrashAppState, sortedMembers: Member[], dateKey: string) {
  if (!state.forcedResponsibility || state.forcedResponsibility.untilDate < dateKey) {
    return undefined;
  }

  return findMemberById(sortedMembers, state.forcedResponsibility.memberId);
}

function getCurrentMember(state: TrashAppState, sortedMembers: Member[]) {
  return findMemberById(sortedMembers, state.currentMemberId) ?? sortedMembers[0];
}

function findMemberById(members: Member[], memberId?: string) {
  return members.find((member) => member.id === memberId);
}

function getNextMemberId(members: Member[], currentMemberId: string) {
  if (members.length === 0) {
    return undefined;
  }

  const currentIndex = members.findIndex((member) => member.id === currentMemberId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % members.length : 0;

  return members[nextIndex].id;
}

function getFirstMemberId(members: Member[]) {
  return sortMembersByName(members)[0]?.id;
}

function createRecord(action: DailyTrashRecord['action'], date: string, member: Member): DailyTrashRecord {
  return {
    action,
    date,
    memberId: member.id,
    memberName: member.name,
  };
}

function normalizeState(state: TrashAppState): TrashAppState {
  const currentMemberId = state.members.some((member) => member.id === state.currentMemberId)
    ? state.currentMemberId
    : getFirstMemberId(state.members);

  return {
    currentMemberId,
    forcedResponsibility: state.forcedResponsibility,
    members: state.members,
    records: state.records ?? {},
  };
}

function getForgottenMemberId(state: TrashAppState) {
  const dateKey = getDateKey();

  if (!state.forcedResponsibility || state.forcedResponsibility.untilDate < dateKey) {
    return undefined;
  }

  return state.forcedResponsibility.memberId;
}
