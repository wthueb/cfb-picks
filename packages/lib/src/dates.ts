import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function getGameLockDate(startDate: Date) {
  const startDateEastern = toZonedTime(startDate, "America/New_York");
  if (startDateEastern.getDay() !== 6 || startDateEastern.getHours() < 12) {
    return startDate;
  }

  const noonEastern = new Date(
    startDateEastern.getFullYear(),
    startDateEastern.getMonth(),
    startDateEastern.getDate(),
    12,
  );

  return fromZonedTime(noonEastern, "America/New_York");
}

export function isGameLocked(startDate: Date, now = new Date()) {
  return getGameLockDate(startDate) <= now;
}
