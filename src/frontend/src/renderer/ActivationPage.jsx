import { useState } from "react";

export default function ActivationPage({ onActivated }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [message, setMessage] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsActivating(true);

    try {
      if (!window.license?.activate) {
        setMessage("License activation is only available in the desktop app.");
        return;
      }

      const result = await window.license.activate(licenseKey);

      if (!result?.success) {
        setMessage(result?.message || "Activation failed");
        return;
      }

      setMessage("Activation successful");
      onActivated?.(result.payload);
    } catch (error) {
      setMessage(error.message || "Activation failed");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <h1 className="text-2xl font-semibold">Activate POS License</h1>
          <p className="mt-2 text-sm text-slate-400">
            Internet is required only for this first activation.
          </p>

          <label
            className="mt-6 block text-sm font-medium text-slate-200"
            htmlFor="license-key"
          >
            License key
          </label>
          <input
            id="license-key"
            value={licenseKey}
            onChange={(event) => setLicenseKey(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            placeholder="Enter license key"
            autoComplete="off"
            spellCheck="false"
          />

          {message ? (
            <p className="mt-4 text-sm text-cyan-200">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={isActivating}
            className="mt-6 w-full rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActivating ? "Activating..." : "Activate"}
          </button>
        </form>
      </div>
    </main>
  );
}
