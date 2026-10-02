import React from "react";
import { Link2, Unlink, Truck } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import useLinkedSupplierOptions from "./useLinkedSupplierOptions";

const supplierLabel = (s) => `${s.name}${s.phone ? ` (${s.phone})` : ""}`;

// "Also a supplier" — links this customer to the supplier account of the
// same person, for the combined statement.
export default function LinkedSupplierField({ form, onChange, t }) {
  const isLinked = Boolean(form.linked_supplier_id);
  const willCreate = !isLinked && Boolean(form.create_linked_supplier);

  const { options, search } = useLinkedSupplierOptions({
    enabled: !isLinked,
    customerId: form.id,
  });

  const update = onChange;

  return (
    <div className="rounded-2xl border border-[#e5ebff] bg-[#f8faff] p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-[#1c2340]">
        <Link2 size={15} className="text-[#4663ff]" />
        {t("screens.contacts.alsoSupplier", "Also a supplier")}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {t(
          "screens.contacts.alsoSupplierHint",
          "Link the supplier account of the same person to get one combined statement.",
        )}
      </p>

      {isLinked ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#dbe4ff] bg-white px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#1c2340]">
            <Truck size={15} className="shrink-0 text-[#4663ff]" />
            <span className="truncate">{form.linked_supplier_name}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              update({ linked_supplier_id: null, linked_supplier_name: "" })
            }
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
          >
            <Unlink size={13} />
            {t("screens.contacts.unlink", "Unlink")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {!willCreate && (
            <SearchableSelect
              placeholder={t(
                "screens.contacts.selectSupplierToLink",
                "Select an existing supplier",
              )}
              options={options}
              selectedValue={form.linked_supplier_id}
              selectedLabel={form.linked_supplier_name}
              getOptionLabel={supplierLabel}
              onInputChange={search}
              onChange={(option) =>
                update({
                  linked_supplier_id: option.id,
                  linked_supplier_name: option.name,
                  create_linked_supplier: false,
                })
              }
            />
          )}

          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={willCreate}
              onChange={(e) =>
                update({ create_linked_supplier: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-[#4663ff] focus:ring-[#4663ff]/30"
            />
            {t(
              "screens.contacts.createMatchingSupplier",
              "Create a supplier with the same details",
            )}
          </label>

          {willCreate && form.name && (
            <p className="text-xs text-slate-500">
              {t("screens.contacts.willCreateSupplier", {
                name: form.name,
                defaultValue: `A supplier named ${form.name} will be created and linked.`,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
