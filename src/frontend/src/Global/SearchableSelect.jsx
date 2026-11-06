import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

const SearchableSelect = ({
  label,
  labelWidth = "20",
  height = "3", // default 3rem (48px)
  placeholder,
  options,
  selectedValue,
  selectedLabel,
  onChange,
  onInputChange,
  disabled,
  error,
  getOptionLabel = (option) => option.name,
  disableTyping = false,
  onKeyDown,
  serverFiltered = false,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const optionList = useMemo(
    () => (Array.isArray(options) ? options : options?.data || []),
    [options],
  );

  const [menuRect, setMenuRect] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  });

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return;
      const clickedInsideRoot = rootRef.current.contains(event.target);
      const clickedInsideMenu = menuRef.current?.contains(event.target);
      if (!clickedInsideRoot && !clickedInsideMenu) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [disableTyping]);

  const filteredOptions = useMemo(() => {
    if (serverFiltered) return optionList; // server already filtered
    const query = String(searchQuery || "").toLowerCase();
    return optionList.filter((option) =>
      String(getOptionLabel(option) || "")
        .toLowerCase()
        .includes(query),
    );
  }, [getOptionLabel, optionList, searchQuery, serverFiltered]);

  useEffect(() => {
    if (isOpen) return;

    if (selectedLabel) {
      setSearchQuery(selectedLabel);
      return;
    }

    if (selectedValue && typeof selectedValue === "object") {
      setSearchQuery(getOptionLabel(selectedValue));
      return;
    }

    if (
      selectedValue !== "" &&
      selectedValue !== null &&
      selectedValue !== undefined
    ) {
      const selectedOption = optionList.find(
        (option) =>
          String(option.id) === String(selectedValue) ||
          String(option._id) === String(selectedValue),
      );
      setSearchQuery(selectedOption ? getOptionLabel(selectedOption) : "");
      return;
    }

    setSearchQuery("");
  }, [getOptionLabel, isOpen, optionList, selectedLabel, selectedValue]);

  const handleSelect = (option) => {
    onChange?.(option);
    setSearchQuery(getOptionLabel(option));
    setIsOpen(false);
  };

  const updateMenuPosition = () => {
    const el = inputRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const desiredMaxHeight = 240;
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      140,
      Math.min(desiredMaxHeight, openUp ? spaceAbove : spaceBelow),
    );

    setMenuRect({
      left: rect.left,
      width: rect.width,
      top: openUp ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 6,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, searchQuery]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, {
        capture: true,
      });
    };
  }, [isOpen]);

  const hasLabel = Boolean(label && String(label).trim().length > 0 && labelWidth !== "0");

  return (
    <div className="relative w-full" ref={rootRef}>
      <div className="flex items-center">
        {hasLabel && (
          <span
            className="flex items-center rounded-l-2xl border-2 border-r-0 border-slate-200 bg-slate-100 px-3.5 text-left text-sm font-bold text-ink-soft min-h-[48px]"
            style={{
              width: `${labelWidth}%`,
              height: `${height}rem`,
            }}
          >
            {label}
          </span>
        )}

        <div className="relative" style={{ width: hasLabel ? `${100 - Number(labelWidth)}%` : "100%" }}>
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            readOnly={disableTyping}
            className={`w-full min-h-[48px] border-2 bg-slate-50 px-3.5 text-base font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              hasLabel ? "rounded-r-2xl" : "rounded-2xl"
            } ${error ? "border-danger" : "border-slate-200"}`}
            style={{
              height: `${height}rem`,
            }}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(event) => {
              if (disableTyping) return;
              setSearchQuery(event.target.value);
              setIsOpen(true);
              onInputChange?.(event.target.value);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            className="z-[9999] flex flex-col rounded-2xl border-2 border-slate-200 bg-white py-1.5 shadow-2xl"
            style={{
              position: "fixed",
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: menuRect.maxHeight,
              overflowY: "auto",
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.id || option._id}
                  className="flex min-h-[44px] cursor-pointer items-center px-4 py-2 text-start text-sm font-medium text-ink hover:bg-brand-50 hover:text-brand focus:bg-brand-50 focus:text-brand outline-none transition"
                  onClick={() => handleSelect(option)}
                >
                  {getOptionLabel(option)}
                </button>
              ))
            ) : (
              <div className="flex min-h-[44px] items-center px-4 py-2 text-sm text-slate-500">
                {t("ui.noOptionsFound", "No options found")}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SearchableSelect;
