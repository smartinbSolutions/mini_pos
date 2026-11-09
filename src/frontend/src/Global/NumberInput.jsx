import { useEffect, useRef, useState } from "react";
import { normalizeDigits } from "./FormatNumber";

// Unified numeric input for the whole app. Handles Arabic-Indic digit
// normalization, safe in-progress decimal typing (doesn't collapse "5." or
// "0.5" mid-keystroke), and clamps/cleans the value only on blur.
//
// Key fix: while the input is focused, its displayed value is driven ONLY
// by internal `raw` state — never by the external `value` prop. This means
// no parent re-render (even one that eagerly coerces to Number and loses a
// trailing ".") can ever clobber what the user is actively typing. The
// external value is only re-synced in once the input loses focus.
//
// Props:
//   value        - current value (string or number, controlled)
//   onChange(val)- called with the new value (string while typing is normal —
//                  don't assume it's always a clean number until blur)
//   allowDecimal - true for prices/rates/anything fractional (default true)
//   min          - clamp floor on blur (default 0; pass null to disable)
//   max          - clamp ceiling on blur (default none)
//   className    - passed to underlying input (48px height and 16px text are always the minimum)
//   ...rest      - spread onto the underlying <input> (placeholder, disabled, etc.)
export default function NumberInput({
  value,
  onChange,
  allowDecimal = true,
  min = 0,
  max = null,
  className = "",
  ...rest
}) {
  const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
  const isFocused = useRef(false);

  const [raw, setRaw] = useState(
    value === null || value === undefined ? "" : String(value),
  );

  useEffect(() => {
    if (isFocused.current) return; // never overwrite active typing
    setRaw(value === null || value === undefined ? "" : String(value));
  }, [value]);

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleChange = (e) => {
    const normalized = normalizeDigits(e.target.value);
    if (normalized === "" || pattern.test(normalized)) {
      setRaw(normalized);
      onChange(normalized);
    }
  };

  const handleBlur = () => {
    isFocused.current = false;

    if (raw === "") {
      onChange("");
      return;
    }

    let num = Number(raw);
    if (isNaN(num)) {
      setRaw("");
      onChange("");
      return;
    }

    if (min !== null) num = Math.max(min, num);
    if (max !== null) num = Math.min(max, num);

    setRaw(String(num));
    onChange(num);
  };

  // Touch-friendly minimums that always apply: 48px tall, 16px text. A caller
  // may make the field bigger, but a smaller height or text-xs/text-sm is
  // lifted to the minimum (min-h wins over h in Tailwind).
  const largerText = /\btext-(base|lg|xl|\d+xl|\[(1[6-9]|[2-9]\d)px\])/.test(className);
  const cleaned = className.replace(/\btext-(xs|sm)\b/g, "").trim();

  const baseClasses = ["min-h-[48px]", largerText ? "" : "text-base", cleaned]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      dir="ltr"
      value={raw}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={baseClasses}
      {...rest}
    />
  );
}
