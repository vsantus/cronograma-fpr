import type { Member } from '@/src/types/member';

export type TrashAction = 'completed' | 'missed' | 'forgot';

export type DailyTrashRecord = {
  action: TrashAction;
  date: string;
  memberId: string;
  memberName: string;
};

export type ForcedResponsibility = {
  memberId: string;
  untilDate: string;
};

export type TrashAppState = {
  currentMemberId?: string;
  forcedResponsibility?: ForcedResponsibility;
  members: Member[];
  records: Record<string, DailyTrashRecord>;
};
