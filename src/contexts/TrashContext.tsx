import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  addMemberToSheet,
  fetchTrashStateFromSheet,
  markTrashActionInSheet,
  removeMemberFromSheet,
  updateMemberInSheet,
} from '@/src/services/memberApi';
import { scheduleTrashReminders } from '@/src/services/trashNotifications';
import type { Member } from '@/src/types/member';
import type { DailyTrashRecord, ForcedResponsibility, TrashAction, TrashAppState } from '@/src/types/trash';
import { getDateKey, isBusinessDay } from '@/src/utils/businessDay';
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
  markForgot: () => Promise<void>;
  markMissed: () => Promise<void>;
  markTookOutTrash: () => Promise<void>;
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
    syncRemoteState();
    // The initial load should run once; later updates happen through explicit refresh/action calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addMember(member: Member) {
    try {
      await applyRemoteState(await addMemberToSheet(member.name));
      return true;
    } catch (error) {
      console.error('Erro ao salvar funcionario:', error);
      setStorageError(`Nao foi possivel salvar o funcionario na planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function updateMember(updatedMember: Member) {
    try {
      await applyRemoteState(await updateMemberInSheet(updatedMember));
      return true;
    } catch (error) {
      console.error('Erro ao editar funcionario:', error);
      setStorageError(`Nao foi possivel editar o funcionario na planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function removeMember(memberId: string) {
    try {
      await applyRemoteState(await removeMemberFromSheet(memberId));
      return true;
    } catch (error) {
      console.error('Erro ao remover funcionario:', error);
      setStorageError(`Nao foi possivel remover o funcionario da planilha. ${getErrorMessage(error)}`);
      return false;
    }
  }

  async function applyRemoteState(remoteState: TrashAppState) {
    const nextState = normalizeState(remoteState);
    setState(nextState);
    await scheduleRemindersForState(nextState);
    setStorageError(undefined);
  }

  async function markTookOutTrash() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    if (today.record?.action === 'completed') {
      return;
    }

    await applyTrashActionToSheet('completed');
  }

  async function markMissed() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    await applyTrashActionToSheet('missed');
  }

  async function markForgot() {
    if (!today.responsible || !today.isBusinessDay) {
      return;
    }

    await applyTrashActionToSheet('forgot');
  }

  async function refreshMembers() {
    await syncRemoteState();
  }

  async function syncRemoteState() {
    setIsMembersLoading(true);

    try {
      await applyRemoteState(await fetchTrashStateFromSheet());
    } catch (error) {
      console.error('Erro ao atualizar escala:', error);
      setStorageError(`Nao foi possivel atualizar a escala da planilha. ${getErrorMessage(error)}`);
    } finally {
      setIsMembersLoading(false);
    }
  }

  async function applyTrashActionToSheet(action: TrashAction) {
    try {
      await applyRemoteState(await markTrashActionInSheet(action));
    } catch (error) {
      console.error('Erro ao atualizar acao do lixo:', error);
      setStorageError(`Nao foi possivel atualizar a escala na planilha. ${getErrorMessage(error)}`);
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

function getForcedCompletedDays(forcedResponsibility: ForcedResponsibility) {
  return forcedResponsibility.completedDays ?? 0;
}

function getForcedTotalDays(forcedResponsibility: ForcedResponsibility) {
  return forcedResponsibility.totalDays ?? 2;
}

function getFirstMemberId(members: Member[]) {
  return sortMembersByName(members)[0]?.id;
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
