/**
 * Convert a wall-clock date and time in an IANA timezone to a UTC instant.
 * The database stores timestamptz; the timezone column records which zone the
 * user entered, so both values have to describe the same moment.
 */

export interface WallClock {
  date: string;
  time: string;
}

function timeZoneIsValid(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const value: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") value[part.type] = part.value;
  }

  const hour = value.hour === "24" ? "00" : value.hour;
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(hour),
    Number(value.minute),
    Number(value.second),
  );
  return asUtc - instant.getTime();
}

export function formatWallClock(iso: string, timeZone: string): WallClock {
  const zone = timeZoneIsValid(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));

  const value: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") value[part.type] = part.value;
  }
  const hour = value.hour === "24" ? "00" : value.hour;
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${hour}:${value.minute}`,
  };
}

export function wallClockToUtcIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Enter a valid date and time.");
  }
  if (!timeZoneIsValid(timeZone)) {
    throw new Error("Select a valid timezone.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) {
    throw new Error("Enter a valid time.");
  }

  const guessedUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const corrected = new Date(guessedUtc.getTime() - zoneOffsetMs(guessedUtc, timeZone));
  const utcIso = new Date(
    guessedUtc.getTime() - zoneOffsetMs(corrected, timeZone),
  ).toISOString();

  const roundTrip = formatWallClock(utcIso, timeZone);
  if (roundTrip.date !== date || roundTrip.time !== time) {
    throw new Error("That local time does not exist in the selected timezone.");
  }

  return utcIso;
}