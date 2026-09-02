import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  DatabaseBackup,
  FolderOpen,
  Clock,
  RotateCcw,
  FileSearch,
  HardDriveDownload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useBackupSettings from "../hooks/useBackupSettings";
import RestoreConfirmModal from "./RestoreConfirmModal";

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      dir="ltr"
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-[#4663ff]" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function BackupRow({ backup, onRestoreClick }) {
  const { t, i18n } = useTranslation();
  const date = new Date(backup.mtime);
  const formatted = date.toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-800">{formatted}</p>
        <p className="text-xs text-slate-400">{formatBytes(backup.size)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRestoreClick(backup)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
      >
        <RotateCcw size={13} />
        {t("screens.backup.restore", "Restore")}
      </button>
    </div>
  );
}

export default function BackupSettingsModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const hook = useBackupSettings({ enabled: isOpen });
  const {
    settings,
    backups,
    loading,
    loadingBackups,
    savingSettings,
    creating,
    updateSettings,
    chooseAndSaveFolder,
    chooseRestoreFile,
    createBackupNow,
  } = hook;

  const [restoreTarget, setRestoreTarget] = useState(null);

  if (!isOpen) return null;

  const scheduleEnabled = Boolean(settings?.schedule_enabled);
  const scheduleFrequency = settings?.schedule_frequency || "daily";
  const scheduleTime = settings?.schedule_time || "";
  const scheduleDayOfWeek =
    settings?.schedule_day_of_week === null ||
    settings?.schedule_day_of_week === undefined
      ? 0
      : settings.schedule_day_of_week;

  const weekdayLabel = (dayIndex) =>
    new Date(2024, 0, dayIndex + 7).toLocaleDateString(i18n.language, {
      weekday: "long",
    });

  const handleBrowseForFile = async () => {
    const filePath = await chooseRestoreFile();
    if (!filePath) return;
    const fileName = filePath.split(/[\\/]/).pop();
    setRestoreTarget({ filePath, fileName });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1c2340]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(28,35,64,0.35)]">
        <div className="flex items-center justify-between border-b border-[#e9edfb] bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_100%)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4663ff]/10 text-[#4663ff]">
              <DatabaseBackup size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">
                {t("screens.backup.title", "Database backups")}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "screens.backup.hint",
                  "Local backups, saved automatically on your schedule.",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-[#eef3ff] hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-xs text-slate-400">{t("common.loading")}</p>
          ) : (
            <>
              {/* Default folder */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {t("screens.backup.folder", "Backup folder")}
                </label>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700">
                    {settings?.default_folder ||
                      t("screens.backup.noFolder", "Not set")}
                  </p>
                  <button
                    type="button"
                    onClick={chooseAndSaveFolder}
                    disabled={savingSettings}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    <FolderOpen size={14} />
                    {t("screens.backup.chooseFolder", "Choose")}
                  </button>
                </div>
              </div>

              {/* Schedule */}
              <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                    <Clock size={14} />
                    {t("screens.backup.scheduleEnabled", "Automatic backups")}
                  </label>
                  <Toggle
                    checked={scheduleEnabled}
                    onChange={() =>
                      updateSettings({ scheduleEnabled: !scheduleEnabled })
                    }
                  />
                </div>

                {scheduleEnabled && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={scheduleFrequency}
                      onChange={(e) =>
                        updateSettings({ scheduleFrequency: e.target.value })
                      }
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="daily">
                        {t("screens.backup.daily", "Daily")}
                      </option>
                      <option value="weekly">
                        {t("screens.backup.weekly", "Weekly")}
                      </option>
                    </select>

                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) =>
                        updateSettings({ scheduleTime: e.target.value })
                      }
                      dir="ltr"
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                    />

                    {scheduleFrequency === "weekly" && (
                      <select
                        value={scheduleDayOfWeek}
                        onChange={(e) =>
                          updateSettings({
                            scheduleDayOfWeek: Number(e.target.value),
                          })
                        }
                        className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        {WEEKDAY_INDEXES.map((day) => (
                          <option key={day} value={day}>
                            {weekdayLabel(day)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Manual backup */}
              <button
                type="button"
                onClick={createBackupNow}
                disabled={creating}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HardDriveDownload size={16} />
                {creating
                  ? t("screens.backup.creating", "Backing up...")
                  : t("screens.backup.backupNow", "Back up now")}
              </button>

              {/* Backup list */}
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {t("screens.backup.available", "Available backups")}
                  </p>
                  <button
                    type="button"
                    onClick={handleBrowseForFile}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#4663ff] hover:text-[#3854e8]"
                  >
                    <FileSearch size={12} />
                    {t("screens.backup.browseElsewhere", "Browse elsewhere")}
                  </button>
                </div>

                {loadingBackups ? (
                  <p className="text-xs text-slate-400">
                    {t("common.loading")}
                  </p>
                ) : backups.length > 0 ? (
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <BackupRow
                        key={backup.filePath}
                        backup={backup}
                        onRestoreClick={setRestoreTarget}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    {t("screens.backup.empty", "No backups yet.")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <RestoreConfirmModal
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        backup={restoreTarget}
        hook={hook}
      />
    </div>,
    document.body,
  );
}
