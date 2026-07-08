import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  addMemberToSheet,
  fetchMembersFromSheet,
  isMembersApiConfigured,
  removeMemberFromSheet,
  updateMemberInSheet,
} from '@/src/services/memberApi';
import { loadTrashState, saveTrashState } from '@/src/services/trashStorage';
import { scheduleTrashReminders } from '@/src/services/trashNotifications';
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
  addMember: (member: Member) => Promise<boolean>;
  forgottenMemberId?: string;
  isMembersLoading: boolean;
  members: Member[];
  refreshMembers: () => Promise<void>;
  removeMember: (memberId: string) => Promise<boolean>;
  storageError?: string;
  today: TodayResponsibility;
  markForgot: () => void;
  markMissed: () => void;
  markTookOutTrash: () => void;
  updateMember: (member: Member) => Promise<boolean>;
};

const EMPTY_STATE: TrashAppState = {
  members: [],
  records: {},
};

const TrashContext = createContext<TrashContextValue | undefined>(undefined);

export function TrashProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<TrashAppState>(EMPTY_STATE);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [storageError, setStorageError] = useState<string>();

  const sortedMembers = useMemo(() => sortMembersByName(state.members), [state.members]);
  const today = useMemo(() => getTodayResponsibility(state, sortedMembers), [sortedMembers, state]);
  const forgottenMemberId = useMemo(() => getForgottenMemberId(state), [state]);

  useEffect(() => {
    async function loadState() {
      try {
        const storedState = await loadTrashState();
        const normalizedState = normalizeState(storedState);
        setState(normalizedState);

        if (isMembersApiConfigured()) {
          await syncMembersFromSheet(normalizedState);
        } else {
          await scheduleRemindersForState(normalizedState);
        }
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
      await scheduleRemindersForState(normalizedState);
      setStorageError(undefined);
    } catch {
      setStorageError('Nao foi possivel salvar os dados agora. Tente novamente em instantes.');
    }
  }

  async function addMember(member: Member) {
    try {
      if (isMembersApiConfigured()) {
        const syncedMembers = await addMemberToSheet(member.name);
        const nextState = normalizeState({
          ...state,
          currentMemberId: state.currentMemberId ?? member.id,
          members: syncedMembers ?? [...state.members, member],
        });

        setState(nextState);
        await saveTrashState(nextState);
        await scheduleRemindersForState(nextState);
        setStorageError(undefined);
        return true;
      }

      const nextMembers = [...state.members, member];

      await commitState({
        ...state,
        currentMemberId: state.currentMemberId ?? member.id,
        members: nextMembers,
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar funcionario:', error);
      setStorageError(`Nao foi possivel salvar o funcionario na planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function updateMember(updatedMember: Member) {
    try {
      if (isMembersApiConfigured()) {
        const syncedMembers = await updateMemberInSheet(updatedMember);
        await replaceMembers(syncedMembers ?? updateMemberLocally(state.members, updatedMember));
        return true;
      }

      await commitState({
        ...state,
        members: updateMemberLocally(state.members, updatedMember),
      });
      return true;
    } catch (error) {
      console.error('Erro ao editar funcionario:', error);
      setStorageError(`Nao foi possivel editar o funcionario na planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function removeMember(memberId: string) {
    try {
      if (isMembersApiConfigured()) {
        const syncedMembers = await removeMemberFromSheet(memberId);
        await replaceMembers(syncedMembers ?? removeMemberLocally(state.members, memberId));
        return true;
      }

      await commitState({
        ...state,
        members: removeMemberLocally(state.members, memberId),
      });
      return true;
    } catch (error) {
      console.error('Erro ao remover funcionario:', error);
      setStorageError(`Nao foi possivel remover o funcionario da planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function replaceMembers(members: Member[]) {
    const nextState = normalizeState({
      ...state,
      members,
    });

    setState(nextState);
    await saveTrashState(nextState);
    await scheduleRemindersForState(nextState);
    setStorageError(undefined);
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

  async function refreshMembers() {
    await syncMembersFromSheet(state);
  }

  async function syncMembersFromSheet(baseState: TrashAppState) {
    if (!isMembersApiConfigured()) {
      setStorageError('Informe a URL do Web App do Apps Script para sincronizar a planilha.');
      return;
    }

    setIsMembersLoading(true);

    try {
      const members = await fetchMembersFromSheet();
      const nextState = normalizeState({
        ...baseState,
        members,
      });

      setState(nextState);
      await saveTrashState(nextState);
      await scheduleRemindersForState(nextState);
      setStorageError(undefined);
    } catch (error) {
      console.error('Erro ao atualizar funcionarios:', error);
      setStorageError(`Nao foi possivel atualizar os funcionarios da planilha. ${getErrorMessage(error)}`);
    } finally {
      setIsMembersLoading(false);
    }
  }

  return (
    <TrashContext.Provider
      value={{
        addMember,
        forgottenMemberId,
        isMembersLoading,
        members: state.members,
        refreshMembers,
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

async function scheduleRemindersForState(state: TrashAppState) {
  await scheduleTrashReminders({
    currentMemberId: state.currentMemberId,
    forcedResponsibility: state.forcedResponsibility,
    members: state.members,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro desconhecido.';
}

function updateMemberLocally(members: Member[], updatedMember: Member) {
  return members.map((member) => (member.id === updatedMember.id ? updatedMember : member));
}

function removeMemberLocally(members: Member[], memberId: string) {
  return members.filter((member) => member.id !== memberId);
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
  const forcedResponsibility = state.members.some((member) => member.id === state.forcedResponsibility?.memberId)
    ? normalizeForcedResponsibility(state.forcedResponsibility)
    : undefined;

  return {
    currentMemberId,
    forcedResponsibility,
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
