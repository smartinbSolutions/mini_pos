import db from "../../db";
import { getBackupSettings, runBackupNow } from "./backupMeta.service";

const CHECK_INTERVAL_MS = 60 * 1000; // check once a minute — cheap, and
// keeps the "already ran today" logic simple (see below) without needing
// a heavier cron-style library for what is just daily/weekly granularity.

let intervalHandle = null;

function alreadyRanToday(lastBackupAt) {
  if (!lastBackupAt) return false;
  const last = new Date(lastBackupAt);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

function isScheduledNow(settings) {
  if (!settings || !settings.schedule_enabled) return false;
  if (!settings.schedule_time) return false;

  const [scheduledHour, scheduledMinute] = settings.schedule_time
    .split(":")
    .map(Number);

  const now = new Date();
  const matchesTime =
    now.getHours() === scheduledHour && now.getMinutes() === scheduledMinute;

  if (!matchesTime) return false;

  if (settings.schedule_frequency === "weekly") {
    return now.getDay() === settings.schedule_day_of_week;
  }

  // 'daily' — time match alone is enough
  return true;
}

function checkAndRun() {
  const settingsResult = getBackupSettings();

  if (!settingsResult.success || !settingsResult.data) return;

  const settings = settingsResult.data;

  //   if (alreadyRanToday(settings.last_backup_at)) return;
  if (!isScheduledNow(settings)) return;

  runBackupNow(db, {});
}

export function startBackupScheduler() {
  if (intervalHandle) return; // already running — don't double-schedule
  intervalHandle = setInterval(checkAndRun, CHECK_INTERVAL_MS);
}

export function stopBackupScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
