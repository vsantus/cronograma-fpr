import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { loadTrashState, saveTrashState } from '@/src/services/trashStorage';
import type { Member } from '@/src/types/member';
import type { DailyTrashRecord, ForcedResponsibility, TrashAppState } from '@/src/types/trash';
import { addBusinessDays, getDateKey, isBusinessDay } from '@/src/utils/businessDay';
import { sortMembersByName } from '@/src/utils/memberName';

type TodayResponsibility = {
  dateKey: string;
  debtStatus?: {
    currentDay: number;
    isLastDay: boolean;
    totalDays: number;
  };
  isBusinessDay: boolean;
  nextResponsible?: Member;
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

    if (today.record?.action === 'completed') {
      return;
    }

    const forcedResponsibility = getActiveForcedResponsibility(state, today.responsible.id);
    const totalDebtDays = forcedResponsibility ? getForcedTotalDays(forcedResponsibility) : 0;
    const completedDebtDays = forcedResponsibility ? getForcedCompletedDays(forcedResponsibility) + 1 : 0;
    const shouldKeepForcedResponsibility = Boolean(
      forcedResponsibility && completedDebtDays < totalDebtDays
    );

    commitState({
      ...state,
      currentMemberId: shouldKeepForcedResponsibility
        ? today.responsible.id
        : getNextMemberId(sortedMembers, today.responsible.id),
      forcedResponsibility:
        shouldKeepForcedResponsibility && forcedResponsibility
          ? {
              ...forcedResponsibility,
              completedDays: completedDebtDays,
              totalDays: totalDebtDays,
            }
          : undefined,
      records: {
        ...state.records,
        [today.dateKey]: createRecord('completed', today.dateKey, today.responsible, {
          debtProgress: forcedResponsibility
            ? {
                currentDay: completedDebtDays,
                totalDays: totalDebtDays,
              }
            : undefined,
        }),
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
        completedDays: 0,
        memberId: today.responsible.id,
        totalDays: 2,
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
    const responsible = findMemberById(sortedMembers, record.memberId);
    const debtStatus = responsible ? getDebtStatus(state, responsible.id, dateKey, record) : undefined;

    return {
      dateKey,
      debtStatus,
      isBusinessDay: true,
      nextResponsible:
        responsible && debtStatus && !debtStatus.isLastDay ? responsible : getNextResponsible(sortedMembers, responsible),
      record,
      responsible,
    };
  }

  const forcedMember = getForcedMember(state, sortedMembers, dateKey);
  const responsible = forcedMember ?? getCurrentMember(state, sortedMembers);
  const debtStatus = responsible ? getDebtStatus(state, responsible.id, dateKey, record) : undefined;

  return {
    dateKey,
    debtStatus,
    isBusinessDay: true,
    nextResponsible:
      responsible && debtStatus && !debtStatus.isLastDay ? responsible : getNextResponsible(sortedMembers, responsible),
    record,
    responsible,
  };
}

function getForcedMember(state: TrashAppState, sortedMembers: Member[], _dateKey: string) {
  if (!state.forcedResponsibility) {
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
  return getNextMember(members, currentMemberId)?.id;
}

function getNextMember(members: Member[], currentMemberId: string) {
  if (members.length === 0) {
    return undefined;
  }

  const currentIndex = members.findIndex((member) => member.id === currentMemberId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % members.length : 0;

  return members[nextIndex];
}

function getNextResponsible(members: Member[], responsible?: Member) {
  return responsible ? getNextMember(members, responsible.id) : undefined;
}

function getDebtStatus(
  state: TrashAppState,
  memberId: string,
  dateKey: string,
  record?: DailyTrashRecord
): TodayResponsibility['debtStatus'] {
  if (record?.debtProgress) {
    return {
      currentDay: record.debtProgress.currentDay,
      isLastDay: record.debtProgress.currentDay >= record.debtProgress.totalDays,
      totalDays: record.debtProgress.totalDays,
    };
  }

  if (
    !state.forcedResponsibility ||
    state.forcedResponsibility.memberId !== memberId ||
    record?.action === 'forgot'
  ) {
    return undefined;
  }

  const totalDays = getForcedTotalDays(state.forcedResponsibility);
  const completedDays = getForcedCompletedDays(state.forcedResponsibility);
  const currentDay = Math.min(completedDays + 1, totalDays);

  return {
    currentDay,
    isLastDay: currentDay >= totalDays,
    totalDays,
  };
}

function getActiveForcedResponsibility(state: TrashAppState, memberId: string) {
  if (!state.forcedResponsibility || state.forcedResponsibility.memberId !== memberId) {
    return undefined;
  }

  return state.forcedResponsibility;
}

function getForcedCompletedDays(forcedResponsibility: ForcedResponsibility) {
  return forcedResponsibility.completedDays ?? 0;
}

function getForcedTotalDays(forcedResponsibility: ForcedResponsibility) {
  return forcedResponsibility.totalDays ?? 2;
}

function getFirstMemberId(members: Member[]) {
  return sortMembersByName(members)[0]?.id;
}

function createRecord(
  action: DailyTrashRecord['action'],
  date: string,
  member: Member,
  options?: Pick<DailyTrashRecord, 'debtProgress'>
): DailyTrashRecord {
  return {
    action,
    date,
    debtProgress: options?.debtProgress,
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
    forcedResponsibility: normalizeForcedResponsibility(state.forcedResponsibility),
    members: state.members,
    records: state.records ?? {},
  };
}

function getForgottenMemberId(state: TrashAppState) {
  if (!state.forcedResponsibility) {
    return undefined;
  }

  return state.forcedResponsibility.memberId;
}

function normalizeForcedResponsibility(forcedResponsibility?: ForcedResponsibility) {
  if (!forcedResponsibility) {
    return undefined;
  }

  return {
    ...forcedResponsibility,
    completedDays: getForcedCompletedDays(forcedResponsibility),
    totalDays: getForcedTotalDays(forcedResponsibility),
  };
}
