import { saveMembers } from '@/src/services/memberStorage';
import type { Member } from '@/src/types/member';
import { sortMembersByName } from '@/src/utils/memberName';

const MEMBERS_API_URL = 'https://script.google.com/macros/s/AKfycbx112LOYVIox1xTIX1-xBzKKibV--ok7hrApXFOy_KgkRiqE91jLYsSM3Qts5fZIt-c/exec';

type MembersApiResponse = {
  data?: unknown;
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
    throw new Error('Members API request failed');
  }

  const payload: MembersApiResponse = await response.json();

  if (payload.success === false || !Array.isArray(payload.data)) {
    throw new Error('Members API returned an invalid payload');
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
