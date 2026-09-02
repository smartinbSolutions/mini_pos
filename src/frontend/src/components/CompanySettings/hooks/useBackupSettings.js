import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export default function useBackupSettings({ enabled = true } = {}) {
  const { t } = useTranslation();
  const api = window.api;

  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const refetchSettings = useCallback(async () => {
    if (!api) return;
    try {
      setLoading(true);
      const res = await api.getBackupSettings();
      setSettings(res?.success ? res.data : null);
    } catch (err) {
      console.error("Failed to load backup settings:", err);
      toast.error(t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  const refetchBackups = useCallback(async () => {
    if (!api) return;
    try {
      setLoadingBackups(true);
      const res = await api.listBackups();
      if (res?.success) {
        setBackups(res.data);
      } else {
        setBackups([]);
        // A missing/unreachable folder isn't really an "error" the first
        // time settings are opened (nothing configured yet) — only toast
        // when it's a real failure, not the empty-state case.
        if (res?.error && res.error !== "NO_BACKUP_FOLDER_CONFIGURED") {
          toast.error(res.error);
        }
      }
    } catch (err) {
      console.error("Failed to list backups:", err);
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  }, [api]);

  // Same enabled-gate as usePrinterSettings — lets a caller mount this
  // hook without firing IPC calls before the backup screen is actually open.
  useEffect(() => {
    if (enabled) {
      refetchSettings();
      refetchBackups();
    }
  }, [enabled, refetchSettings, refetchBackups]);

  const updateSettings = async (data) => {
    if (!api) return;
    try {
      setSavingSettings(true);
      console.log("Updating backup settings with data:", data);
      const res = await api.updateBackupSettings(data);
      console.log("Update backup settings response:", res);
      if (res?.success) {
        await refetchSettings();
      } else {
        toast.error(res?.error || t("errors.saveError"));
      }
      return res;
    } catch (err) {
      console.error("Failed to update backup settings:", err);
      toast.error(err?.message || t("errors.saveError"));
      return { success: false, error: err?.message };
    } finally {
      setSavingSettings(false);
    }
  };

  // Opens the native folder picker, then immediately persists the choice —
  // no separate "save" step, matching how addDetectedPrinter saves right
  // after the picker resolves rather than staging it in local state.
  const chooseAndSaveFolder = async () => {
    if (!api) return;
    const picked = await api.chooseBackupFolder();
    if (!picked?.success) return picked;
    return updateSettings({ defaultFolder: picked.folder });
  };

  const chooseRestoreFile = async () => {
    if (!api) return null;
    const picked = await api.chooseRestoreFile();
    if (!picked?.success) return null;
    return picked.filePath;
  };

  const createBackupNow = async () => {
    if (!api) return;
    try {
      setCreating(true);
      const res = await api.createBackup();
      if (res?.success) {
        toast.success(t("screens.backup.createSuccess", "Backup created"));
        await refetchSettings();
        await refetchBackups();
      } else {
        toast.error(
          res?.error || t("screens.backup.createFailed", "Backup failed"),
        );
      }
      return res;
    } catch (err) {
      console.error("Backup creation failed:", err);
      toast.error(
        err?.message || t("screens.backup.createFailed", "Backup failed"),
      );
      return { success: false, error: err?.message };
    } finally {
      setCreating(false);
    }
  };

  // Takes the full auth payload directly rather than reading it off hook
  // state — the PIN/recovery-key inputs live in the confirmation modal's
  // own local state, not here, since they should never linger in memory
  // longer than the single call that needs them.
  const restoreBackup = async ({
    filePath,
    administratorId,
    administratorPin,
    recoveryKey,
    administratorUsername,
  }) => {
    if (!api) return { success: false, error: "NO_API" };
    try {
      setRestoring(true);
      const res = await api.restoreBackup({
        backupFilePath: filePath,
        administratorId,
        administratorPin,
        recoveryKey,
        administratorUsername,
      });
      if (!res?.success) {
        toast.error(
          res?.error || t("screens.backup.restoreFailed", "Restore failed"),
        );
      }
      // On success the main process relaunches the app almost immediately —
      // there's usually no next render to show a success toast to, so we
      // deliberately don't try.
      return res;
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error(
        err?.message || t("screens.backup.restoreFailed", "Restore failed"),
      );
      return { success: false, error: err?.message };
    } finally {
      setRestoring(false);
    }
  };

  return {
    settings,
    backups,
    loading,
    loadingBackups,
    savingSettings,
    creating,
    restoring,
    updateSettings,
    chooseAndSaveFolder,
    chooseRestoreFile,
    createBackupNow,
    restoreBackup,
    refetchSettings,
    refetchBackups,
  };
}
