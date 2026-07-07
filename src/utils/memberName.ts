import type { Member } from '@/src/types/member';

export function normalizeMemberName(name: string) {
  return name.trim();
}

export function normalizeMemberNameForComparison(name: string) {
  return normalizeMemberName(name).toLocaleLowerCase('pt-BR');
}

export function isValidMemberName(name: string) {
  return normalizeMemberName(name).length > 0;
}

export function areMemberNamesEqual(firstName: string, secondName: string) {
  return normalizeMemberNameForComparison(firstName) === normalizeMemberNameForComparison(secondName);
}

export function hasDuplicateMemberName(members: Member[], name: string, ignoredMemberId?: string) {
  return members.some((member) => member.id !== ignoredMemberId && areMemberNamesEqual(member.name, name));
}

export function compareNamesAlphabetically(firstName: string, secondName: string) {
  return firstName.localeCompare(secondName, 'pt-BR', { sensitivity: 'base' });
}

export function sortNamesAlphabetically(names: string[]) {
  return [...names].sort(compareNamesAlphabetically);
}

export function sortMembersByName(members: Member[]) {
  return [...members].sort((firstMember, secondMember) =>
    compareNamesAlphabetically(firstMember.name, secondMember.name),
  );
}
