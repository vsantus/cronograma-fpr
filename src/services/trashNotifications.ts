import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Member } from '@/src/types/member';
import type { ForcedResponsibility } from '@/src/types/trash';
import { isBusinessDay } from '@/src/utils/businessDay';
import { sortMembersByName } from '@/src/utils/memberName';

const NOTIFICATION_CHANNEL_ID = 'trash-reminders';
const NOTIFICATION_IDS_STORAGE_KEY = '@cronogramafpr:trash-notification-ids';
const NOTIFICATION_HOUR = 16;
const NOTIFICATION_MINUTE = 0;
const SCHEDULED_BUSINESS_DAYS = 10;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ScheduleTrashReminderOptions = {
  currentMemberId?: string;
  forcedResponsibility?: ForcedResponsibility;
  members: Member[];
};

export async function scheduleTrashReminders({
  currentMemberId,
  forcedResponsibility,
  members,
}: ScheduleTrashReminderOptions) {
  if (Platform.OS === 'web') {
    return;
  }

  await cancelScheduledTrashReminders();

  const sortedMembers = sortMembersByName(members);

  if (sortedMembers.length === 0) {
    return;
  }

  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return;
  }

  await configureNotificationChannel();

  const reminderDates = getNextBusinessReminderDates();
  const responsibleMembers = getResponsibleMembersForDates({
    currentMemberId,
    forcedResponsibility,
    members: sortedMembers,
    totalDates: reminderDates.length,
  });

  const notificationIds = await Promise.all(
    reminderDates.map((date, index) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete do lixo',
          body: `${responsibleMembers[index].name} e o responsavel de hoje.`,
          data: {
            date: date.toISOString(),
            memberId: responsibleMembers[index].id,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      }),
    ),
  );

  await AsyncStorage.setItem(NOTIFICATION_IDS_STORAGE_KEY, JSON.stringify(notificationIds));
}

async function requestNotificationPermission() {
  const currentPermission = await Notifications.getPermissionsAsync();

  if (currentPermission.granted) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

async function configureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Lembretes do lixo',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

async function cancelScheduledTrashReminders() {
  const storedIds = await AsyncStorage.getItem(NOTIFICATION_IDS_STORAGE_KEY);

  if (!storedIds) {
    return;
  }

  const parsedIds: unknown = JSON.parse(storedIds);

  if (!Array.isArray(parsedIds)) {
    await AsyncStorage.removeItem(NOTIFICATION_IDS_STORAGE_KEY);
    return;
  }

  await Promise.all(
    parsedIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
  await AsyncStorage.removeItem(NOTIFICATION_IDS_STORAGE_KEY);
}

function getNextBusinessReminderDates() {
  const dates: Date[] = [];
  const cursor = new Date();

  while (dates.length < SCHEDULED_BUSINESS_DAYS) {
    const reminderDate = new Date(cursor);
    reminderDate.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);

    if (isBusinessDay(reminderDate) && reminderDate.getTime() > Date.now()) {
      dates.push(reminderDate);
    }

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return dates;
}

function getResponsibleMembersForDates({
  currentMemberId,
  forcedResponsibility,
  members,
  totalDates,
}: {
  currentMemberId?: string;
  forcedResponsibility?: ForcedResponsibility;
  members: Member[];
  totalDates: number;
}) {
  const responsibleMembers: Member[] = [];
  const currentIndex = Math.max(
    members.findIndex((member) => member.id === currentMemberId),
    0,
  );
  const forcedMember = members.find((member) => member.id === forcedResponsibility?.memberId);
  const forcedRemainingDays = forcedResponsibility
    ? Math.max((forcedResponsibility.totalDays ?? 2) - (forcedResponsibility.completedDays ?? 0), 0)
    : 0;
  let rotationOffset = 0;

  for (let index = 0; index < totalDates; index += 1) {
    if (forcedMember && index < forcedRemainingDays) {
      responsibleMembers.push(forcedMember);
      continue;
    }

    responsibleMembers.push(members[(currentIndex + rotationOffset) % members.length]);
    rotationOffset += 1;
  }

  return responsibleMembers;
}
