import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

const emptyForm = {
  name: "",
  latinName: "",
  costPrice: "0",
  price: "0",
  quantity: "0",
  unit_id: "",
  barcodes: [{ barcode: "" }],
};

export default function ProductFormModal({
  product,
  units,
  barcodes,
  canManageBarcodes,
  canUseUnits,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(product);

  useEffect(() => {
    if (product) {
      setForm({
        id: product.id,
        name: product.name || "",
        latinName: product.latinName || "",
        costPrice: String(product.costPrice ?? 0),
        price: String(product.price ?? 0),
        quantity: String(product.quantity ?? 0),
        unit_id: product.unit_id ? String(product.unit_id) : "",
        barcodes: barcodes.length ? barcodes : [{ barcode: "" }],
      });
    } else {
      setForm(emptyForm);
    }
  }, [barcodes, product]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateBarcode = (index, value) => {
    setForm((current) => ({
      ...current,
      barcodes: current.barcodes.map((barcode, currentIndex) =>
        currentIndex === index ? { ...barcode, barcode: value } : barcode,
      ),
    }));
  };

  const addBarcode = () => {
    setForm((current) => ({
      ...current,
      barcodes: [...current.barcodes, { barcode: "" }],
    }));
  };

  const removeBarcode = (index) => {
    setForm((current) => ({
      ...current,
      barcodes:
        current.barcodes.length === 1
          ? [{ barcode: "" }]
          : current.barcodes.filter(
              (_, currentIndex) => currentIndex !== index,
            ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      unit_id: form.unit_id ? Number(form.unit_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit product" : "Add product"}
            </h2>
            <p className="text-sm text-gray-500">
              Product, unit, inventory, price, and barcode details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close product form"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Name
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Latin name
            <input
              value={form.latinName}
              onChange={(event) => updateField("latinName", event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Unit
            <select
              value={form.unit_id}
              onChange={(event) => updateField("unit_id", event.target.value)}
              disabled={!canUseUnits}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            >
              <option value="">
                {canUseUnits ? "No unit" : "Units unavailable"}
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} {unit.code ? `(${unit.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Quantity
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(event) => updateField("quantity", event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Cost price
            <input
              type="number"
              min="0"
              step="1"
              value={form.costPrice}
              onChange={(event) => updateField("costPrice", event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Sale price
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
        </div>

        {canManageBarcodes ? (
          <div className="border-t px-5 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Barcodes</h3>
              <button
                type="button"
                onClick={addBarcode}
                className="inline-flex items-center gap-2 rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800"
              >
                <Plus size={16} />
                Add barcode
              </button>
            </div>

            <div className="grid gap-2">
              {form.barcodes.map((barcode, index) => (
                <div key={barcode.id || index} className="flex gap-2">
                  <input
                    value={barcode.barcode}
                    onChange={(event) =>
                      updateBarcode(index, event.target.value)
                    }
                    className="flex-1 rounded border border-gray-300 px-3 py-2"
                    placeholder="Barcode"
                  />
                  <button
                    type="button"
                    onClick={() => removeBarcode(index)}
                    className="rounded border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"
                    aria-label="Remove barcode"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-5 text-sm text-gray-500">
            Barcode editing is unavailable until the product barcode IPC handler
            is registered.
          </div>
        )}

        <div className="flex justify-end gap-3 border-t bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
