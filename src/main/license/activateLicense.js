import os from "node:os";
import { app } from "electron";
import getDeviceHash from "./getDeviceHash";
import saveLicenseFile from "./saveLicenseFile";
import verifyLicenseFile from "./verifyLicenseFile";

const DEFAULT_ACTIVATION_URL = "http://localhost:8001/api/licenses/activate";

function getActivationUrl() {
  return DEFAULT_ACTIVATION_URL;
}

export default async function activateLicense(licenseKey) {
  if (!licenseKey?.trim()) {
    return { success: false, message: "License key is required" };
  }

  let response;

  try {
    response = await fetch(DEFAULT_ACTIVATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseKey: licenseKey.trim(),
        deviceHash: await getDeviceHash(),
        deviceName: os.hostname(),
        appVersion: app.getVersion(),
      }),
    });
  } catch (e) {
    console.log(`e`, e);
    return {
      success: false,
      message:
        "Activation server is not reachable. Internet is required for first activation.",
    };
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.license) {
    return {
      success: false,
      message: result?.message || "License activation failed",
    };
  }

  await saveLicenseFile(result.license);

  const status = await verifyLicenseFile();

  if (!status.valid) {
    return {
      success: false,
      message: "Activated license could not be verified on this device",
      reason: status.reason,
    };
  }

  return {
    success: true,
    message: result.message || "License activated successfully",
    payload: status.payload,
  };
}
