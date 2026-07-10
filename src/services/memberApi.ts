import type { Member } from '@/src/types/member';
import type { DailyTrashRecord, ForcedResponsibility, TrashAction, TrashAppState } from '@/src/types/trash';
import { sortMembersByName } from '@/src/utils/memberName';

const MEMBERS_API_URL = 'https://script.google.com/macros/s/AKfycbx112LOYVIox1xTIX1-xBzKKibV--ok7hrApXFOy_KgkRiqE91jLYsSM3Qts5fZIt-c/exec';

type ApiResponse = {
  data?: unknown;
  error?: unknown;
  success?: boolean;
};

type RemoteAppState = {
  members?: unknown;
  state?: unknown;
  today?: unknown;
};

type RemoteMember = {
  ativo?: unknown;
  id?: unknown;
  nome?: unknown;
};

type RemoteScaleState = {
  currentMemberId?: unknown;
  forcedCompletedDays?: unknown;
  forcedMemberId?: unknown;
  forcedTotalDays?: unknown;
};

type RemoteToday = {
  dateKey?: unknown;
  record?: unknown;
};

type RemoteRecord = {
  action?: unknown;
  date?: unknown;
  debtProgress?: unknown;
  memberId?: unknown;
  memberName?: unknown;
};

type RemoteDebtProgress = {
  currentDay?: unknown;
  totalDays?: unknown;
};

export function isMembersApiConfigured() {
  return MEMBERS_API_URL.trim().length > 0;
}

export async function fetchTrashStateFromSheet() {
  if (!isMembersApiConfigured()) {
    throw new Error('URL do Web App do Apps Script nao configurada.');
  }

  const response = await fetch(MEMBERS_API_URL);

  if (!response.ok) {
    throw new Error(`Falha ao buscar planilha: HTTP ${response.status}. ${await getResponseText(response)}`);
  }

  return getStateFromResponse(await response.text(), 'A API retornou um formato invalido ao buscar a escala.');
}

export async function addMemberToSheet(name: string) {
  return postAction({
    action: 'create',
    nome: name,
  });
}

export async function updateMemberInSheet(member: Member) {
  return postAction({
    action: 'update',
    id: member.id,
    nome: member.name,
  });
}

export async function removeMemberFromSheet(memberId: string) {
  return postAction({
    action: 'delete',
    id: memberId,
  });
}

export async function markTrashActionInSheet(action: TrashAction) {
  return postAction({ action });
}

async function postAction(body: Record<string, unknown>) {
  if (!isMembersApiConfigured()) {
    throw new Error('URL do Web App do Apps Script nao configurada.');
  }

  const response = await fetch(MEMBERS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Falha ao salvar na planilha: HTTP ${response.status}. ${await getResponseText(response)}`);
  }

  return getStateFromResponse(await response.text(), 'A API recusou a acao enviada.');
}

function getStateFromResponse(text: string, fallbackError: string) {
  const payload = parseApiResponse(text);

  if (payload.success === false) {
    throw new Error(getPayloadError(payload, fallbackError));
  }

  return normalizeRemoteState(payload.data);
}

function normalizeRemoteState(data: unknown): TrashAppState {
  if (!data || typeof data !== 'object') {
    throw new Error('A API nao retornou o estado da escala.');
  }

  const remoteState = data as RemoteAppState;
  if (!Array.isArray(remoteState.members)) {
    throw new Error('A API nao retornou a lista de funcionarios.');
  }

  const members = normalizeMembers(Array.isArray(remoteState.members) ? remoteState.members : []);
  const scaleState = normalizeScaleState(remoteState.state);
  const today = normalizeToday(remoteState.today);

  return {
    currentMemberId: scaleState.currentMemberId || members[0]?.id,
    forcedResponsibility: scaleState.forcedResponsibility,
    members,
    records: today.record ? { [today.dateKey]: today.record } : {},
  };
}

function normalizeMembers(values: unknown[]) {
  const members = values
    .map(normalizeRemoteMember)
    .filter((member): member is Member => Boolean(member));

  return sortMembersByName(members);
}

function normalizeRemoteMember(value: unknown): Member | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const remoteMember = value as RemoteMember;
  const name = typeof remoteMember.nome === 'string' ? remoteMember.nome.trim() : '';

  if (!name || remoteMember.ativo === false) {
    return undefined;
  }

  return {
    id: String(remoteMember.id ?? name),
    name,
  };
}

function normalizeScaleState(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      currentMemberId: undefined,
      forcedResponsibility: undefined,
    };
  }

  const state = value as RemoteScaleState;
  const forcedMemberId = typeof state.forcedMemberId === 'string' ? state.forcedMemberId : '';

  return {
    currentMemberId: typeof state.currentMemberId === 'string' ? state.currentMemberId : undefined,
    forcedResponsibility: forcedMemberId
      ? ({
          completedDays: Number(state.forcedCompletedDays || 0),
          memberId: forcedMemberId,
          totalDays: Number(state.forcedTotalDays || 2),
          untilDate: '',
        } satisfies ForcedResponsibility)
      : undefined,
  };
}

function normalizeToday(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      dateKey: '',
      record: undefined,
    };
  }

  const today = value as RemoteToday;
  const dateKey = typeof today.dateKey === 'string' ? today.dateKey : '';

  return {
    dateKey,
    record: dateKey ? normalizeRecord(today.record, dateKey) : undefined,
  };
}

function normalizeRecord(value: unknown, fallbackDate: string): DailyTrashRecord | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as RemoteRecord;

  if (!isTrashAction(record.action) || typeof record.memberId !== 'string' || typeof record.memberName !== 'string') {
    return undefined;
  }

  return {
    action: record.action,
    date: typeof record.date === 'string' ? record.date : fallbackDate,
    debtProgress: normalizeDebtProgress(record.debtProgress),
    memberId: record.memberId,
    memberName: record.memberName,
  };
}

function normalizeDebtProgress(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const debtProgress = value as RemoteDebtProgress;
  const currentDay = Number(debtProgress.currentDay);
  const totalDays = Number(debtProgress.totalDays);

  if (!currentDay || !totalDays) {
    return undefined;
  }

  return {
    currentDay,
    totalDays,
  };
}

function isTrashAction(value: unknown): value is TrashAction {
  return value === 'completed' || value === 'missed' || value === 'forgot';
}

async function getResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getPayloadError(payload: ApiResponse, fallback: string) {
  return typeof payload.error === 'string' ? payload.error : fallback;
}

function parseApiResponse(text: string): ApiResponse {
  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(`A API nao retornou JSON. Resposta: ${stripHtml(text).slice(0, 240)}`);
  }
}

function stripHtml(text: string) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[#\w]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
