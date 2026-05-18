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
import { getAssetUrl } from "../../../Global/assetUrl";

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
    "h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

  const labelClass = "text-sm font-bold text-slate-700";
  const panelClass =
    "rounded-[28px] border border-[#e5ebff] bg-white/85 p-5 shadow-sm";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
        <form
          onSubmit={handleSubmit}
          className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/80 bg-[#f8faff] shadow-[0_32px_100px_rgba(15,23,42,0.28)] lg:grid-cols-[360px_1fr]"
        >
          <aside className="flex min-h-0 flex-col border-b border-[#e5ebff] bg-white/70 p-6 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                  Inventory
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {isEditing ? "Edit Product" : "Create Product"}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-[#eef3ff] hover:text-slate-950"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <label className="group relative mb-5 flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[30px] border border-dashed border-[#cbd7ff] bg-[#f8faff] transition hover:border-[#4663ff]/60">
              {form.logo ? (
                <img
                  src={getAssetUrl(form.logo)}
                  alt="Product"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-8 text-center">
                  <ImagePlus size={44} className="mx-auto text-[#4663ff]" />
                  <p className="mt-4 text-sm font-black text-slate-800">
                    Drop in the product image
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    PNG, JPG, or WEBP
                  </p>
                </div>
              )}

              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 text-center text-sm font-bold text-[#4663ff] opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
                Change image
              </div>

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={uploadLogo}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-[#eef3ff] p-4">
                <Boxes size={18} className="mb-3 text-[#4663ff]" />
                <p className="text-xs font-bold text-slate-500">Quantity</p>
                <p className="mt-1 text-xl font-black text-slate-950">
                  {form.quantity || 0}
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-4">
                <DollarSign size={18} className="mb-3 text-emerald-600" />
                <p className="text-xs font-bold text-slate-500">Sale Price</p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {form.price || 0}
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-3xl border border-[#e5ebff] bg-white p-4">
              <p className="text-sm font-black text-slate-900">
                Product Status
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isEditing
                  ? "Changes will update the existing product."
                  : "A new product will be added to inventory."}
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-5">
                <div className={panelClass}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                      <Package size={19} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">
                        Product Identity
                      </h3>
                      <p className="text-sm text-slate-500">
                        Name, unit, and stock position
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
                      <label className={labelClass}>Quantity</label>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(event) =>
                          updateField("quantity", event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
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
                </div>

                <div className={panelClass}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <DollarSign size={19} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">Pricing</h3>
                      <p className="text-sm text-slate-500">
                        Cost and retail values
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
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
                </div>

                {canManageBarcodes && (
                  <div className={panelClass}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                          <Barcode size={19} />
                        </span>
                        <div>
                          <h3 className="font-black text-slate-950">
                            Barcodes
                          </h3>
                          <p className="text-sm text-slate-500">
                            Add scan codes for this product
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addBarcode}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-3 text-sm font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                      >
                        <Plus size={15} />
                        Add
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {form.barcodes.map((barcode, index) => (
                        <div
                          key={barcode.id || index}
                          className="grid grid-cols-[1fr_auto] gap-2"
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
                            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50"
                            aria-label="Remove barcode"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!canManageBarcodes && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Barcode editing is unavailable until the product barcode IPC
                    handler is registered.
                  </section>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#e5ebff] bg-white/80 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Product"
                    : "Create Product"}
              </button>
            </div>
          </section>
        </form>
      </div>

      <ToastContainer position="top-right" />
    </>
  );
}
