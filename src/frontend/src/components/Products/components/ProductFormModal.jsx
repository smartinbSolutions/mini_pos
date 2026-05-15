import {
  Plus,
  Save,
  Trash2,
  X,
  Package,
  DollarSign,
  Barcode,
  ImagePlus,
  Boxes,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";

const emptyForm = {
  name: "",
  latinName: "",
  costPrice: "",
  price: "",
  quantity: 0,
  unit_id: "",
  logo: "",
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
  handleLogo,
}) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(product);

  useEffect(() => {
    if (product) {
      setForm({
        id: product.id,
        name: product.name || "",
        latinName: product.latinName || "",
        costPrice: Number(product.costPrice ?? 0),
        price: Number(product.price ?? 0),
        quantity: Number(product.quantity ?? 0),
        unit_id: product.unit_id ? Number(product.unit_id) : "",
        logo: product.logo || "",
        barcodes: barcodes?.length > 0 ? barcodes : [{ barcode: "" }],
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, barcodes]);
  console.log(form);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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

  const uploadLogo = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const savedPath = await handleLogo(file);

      setForm((current) => ({
        ...current,
        logo: savedPath,
      }));

      toast.success("Image uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter product name");
      return;
    }

    if (Number(form.costPrice) <= 0) {
      toast.error("Please enter a valid cost price");
      return;
    }

    if (Number(form.price) <= 0) {
      toast.error("Please enter a valid sale price");
      return;
    }

    await onSubmit({
      ...form,
      quantity: Number(form.quantity || 0),
      costPrice: Number(form.costPrice || 0),
      price: Number(form.price || 0),
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      barcodes: form.barcodes.filter((item) => item.barcode.trim()),
    });
  };

  const inputClass =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

  const labelClass = "text-sm font-semibold text-zinc-700";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-950 text-white">
                <Package size={19} />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                  {isEditing ? "Edit Product" : "Create Product"}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Manage product details, pricing, image, and barcodes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
              <main className="space-y-6">
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Package size={18} className="text-zinc-500" />
                    <h3 className="font-bold text-zinc-950">
                      Product Information
                    </h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Product Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        placeholder="Enter product name"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Latin Name</label>
                      <input
                        value={form.latinName}
                        onChange={(event) =>
                          updateField("latinName", event.target.value)
                        }
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Quantity</label>
                      <div className="relative">
                        <Boxes
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        />
                        <input
                          type="number"
                          min="0"
                          value={form.quantity}
                          onChange={(event) =>
                            updateField("quantity", event.target.value)
                          }
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Unit</label>
                      <select
                        value={form.unit_id}
                        onChange={(event) =>
                          updateField("unit_id", event.target.value)
                        }
                        disabled={!canUseUnits}
                        className={inputClass}
                      >
                        <option value="">
                          {canUseUnits ? "Select unit" : "Units unavailable"}
                        </option>

                        {units?.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} {unit.code ? `(${unit.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="border-t border-zinc-200 pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-zinc-500" />
                    <h3 className="font-bold text-zinc-950">Pricing</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Cost Price</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.costPrice}
                        onChange={(event) =>
                          updateField("costPrice", event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Sale Price</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          updateField("price", event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                {canManageBarcodes && (
                  <section className="border-t border-zinc-200 pt-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Barcode size={18} className="text-zinc-500" />
                        <h3 className="font-bold text-zinc-950">Barcodes</h3>
                      </div>

                      <button
                        type="button"
                        onClick={addBarcode}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <Plus size={15} />
                        Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.barcodes.map((barcode, index) => (
                        <div
                          key={barcode.id || index}
                          className="grid grid-cols-[1fr_auto] gap-3"
                        >
                          <input
                            value={barcode.barcode}
                            onChange={(event) =>
                              updateBarcode(index, event.target.value)
                            }
                            placeholder="Enter barcode"
                            className={inputClass}
                          />

                          <button
                            type="button"
                            onClick={() => removeBarcode(index)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                            aria-label="Remove barcode"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {!canManageBarcodes && (
                  <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Barcode editing is unavailable until the product barcode IPC
                    handler is registered.
                  </section>
                )}
              </main>

              <aside>
                <div className="sticky top-6 space-y-4">
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <ImagePlus size={18} className="text-zinc-500" />
                      <h3 className="font-bold text-zinc-950">Product Image</h3>
                    </div>

                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 transition hover:border-zinc-500 hover:bg-zinc-100">
                      {form.logo ? (
                        <img
                          src={form.logo}
                          alt="Product"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="px-6 text-center">
                          <ImagePlus
                            size={38}
                            className="mx-auto text-zinc-400"
                          />
                          <p className="mt-3 text-sm font-semibold text-zinc-700">
                            Upload image
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            PNG, JPG, or WEBP
                          </p>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={uploadLogo}
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-semibold text-zinc-900">
                      Product Status
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {isEditing
                        ? "Changes will update the existing product."
                        : "A new product will be added to inventory."}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Product"
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer position="top-right" />
    </>
  );
}
