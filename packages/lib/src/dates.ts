import { fromZonedTime, toZonedTime } from "date-fns-tz";

function getNoon(date: Date) {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return noon;
}

export function isGameLocked(startDate: Date) {
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const startDateUtc = fromZonedTime(startDate, localTimeZone);
  const startDateEastern = toZonedTime(startDateUtc, "America/New_York");

  const now = new Date();

  if (startDateEastern.getDay() !== 6 || startDateEastern.getHours() < 12) {
    return startDate <= now;
  }

  const noonEastern = getNoon(startDateEastern);

  const noonLocal = toZonedTime(noonEastern, localTimeZone);

  return noonLocal <= now;
}
