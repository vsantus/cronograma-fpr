export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatCurrentDay(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(date);
}

export function isBusinessDay(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function addBusinessDays(date: Date, days: number) {
  const nextDate = new Date(date);
  let remainingDays = days;

  while (remainingDays > 0) {
    nextDate.setDate(nextDate.getDate() + 1);

    if (isBusinessDay(nextDate)) {
      remainingDays -= 1;
    }
  }

  return nextDate;
}
