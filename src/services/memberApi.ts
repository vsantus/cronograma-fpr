import { saveMembers } from '@/src/services/memberStorage';
import type { Member } from '@/src/types/member';
import { sortMembersByName } from '@/src/utils/memberName';

const MEMBERS_API_URL = 'https://script.google.com/macros/s/AKfycbx112LOYVIox1xTIX1-xBzKKibV--ok7hrApXFOy_KgkRiqE91jLYsSM3Qts5fZIt-c/exec';

type MembersApiResponse = {
  data?: unknown;
  error?: unknown;
  success?: boolean;
};

type RemoteMember = {
  ativo?: unknown;
  id?: unknown;
  nome?: unknown;
};

export function isMembersApiConfigured() {
  return MEMBERS_API_URL.trim().length > 0;
}

export async function fetchMembersFromSheet() {
  if (!isMembersApiConfigured()) {
    return [];
  }

  const response = await fetch(MEMBERS_API_URL);

  if (!response.ok) {
    throw new Error(`Falha ao buscar planilha: HTTP ${response.status}. ${await getResponseText(response)}`);
  }

  const payload = parseApiResponse(await response.text());

  if (payload.success === false || !Array.isArray(payload.data)) {
    throw new Error(getPayloadError(payload, 'A API retornou um formato invalido ao buscar funcionarios.'));
  }

  const members = payload.data
    .map(normalizeRemoteMember)
    .filter((member): member is Member => Boolean(member));

  const sortedMembers = sortMembersByName(members);
  await saveMembers(sortedMembers);

  return sortedMembers;
}

export async function addMemberToSheet(name: string) {
  return postMemberAction({
    action: 'create',
    nome: name,
  });
}

export async function updateMemberInSheet(member: Member) {
  return postMemberAction({
    action: 'update',
    id: member.id,
    nome: member.name,
  });
}

export async function removeMemberFromSheet(memberId: string) {
  return postMemberAction({
    action: 'delete',
    id: memberId,
  });
}

async function postMemberAction(body: Record<string, unknown>) {
  if (!isMembersApiConfigured()) {
    return undefined;
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

  const payload = parseApiResponse(await response.text());

  if (payload.success === false) {
    throw new Error(getPayloadError(payload, 'A API recusou o cadastro do funcionario.'));
  }

  if (!Array.isArray(payload.data)) {
    return undefined;
  }

  const members = payload.data
    .map(normalizeRemoteMember)
    .filter((member): member is Member => Boolean(member));

  const sortedMembers = sortMembersByName(members);
  await saveMembers(sortedMembers);

  return sortedMembers;
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

async function getResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getPayloadError(payload: MembersApiResponse, fallback: string) {
  return typeof payload.error === 'string' ? payload.error : fallback;
}

function parseApiResponse(text: string): MembersApiResponse {
  try {
    return JSON.parse(text) as MembersApiResponse;
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
