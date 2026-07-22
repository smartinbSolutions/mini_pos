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
  Layers,
  Percent,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { getAssetUrl } from "../../../Global/assetUrl";
import { useTranslation } from "react-i18next";

const emptyForm = {
  name: "",
  latinName: "",
  costPrice: "",
  salePrice: "",
  quantity: 0,
  unit_id: "",
  tax_id: "",
  logo: "",
  barcodes: [{ barcode: "" }],
  productUnits: [],
  oldQuantity: 0,
};

export default function ProductFormModal({
  product,
  units,
  taxes,
  barcodes,
  productUnits,
  canManageBarcodes,
  canUseUnits,
  canUseTaxes,
  saving,
  onClose,
  onSubmit,
  handleLogo,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(product);

  useEffect(() => {
    if (product) {
      setForm({
        id: product.id,
        name: product.name || "",
        latinName: product.latinName || "",
        costPrice: Number(product.costPrice ?? 0),
        salePrice: Number(product.salePrice ?? 0),
        quantity: Number(product.quantity ?? 0),
        unit_id: product.unit_id ? Number(product.unit_id) : "",
        tax_id: product.tax_id ? Number(product.tax_id) : "",
        logo: product.logo || "",
        barcodes: barcodes?.length > 0 ? barcodes : [{ barcode: "" }],
        productUnits:
          productUnits
            ?.filter((u) => !u.is_base)
            .map((u) => ({
              id: u.id,
              unit_name: u.unit_name,
              conversion_factor: u.conversion_factor,
              sale_price: u.sale_price,
            })) || [],
        oldQuantity: Number(product.quantity ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, barcodes, productUnits]);

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
        currentIndex === index ? { ...barcode, barcode: value } : barcode
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
              (_, currentIndex) => currentIndex !== index
            ),
    }));
  };

  // ---- Selling units (non-base) handlers, mirrors barcode pattern ----
  const addProductUnit = () => {
    setForm((current) => ({
      ...current,
      productUnits: [
        ...current.productUnits,
        { unit_name: "", conversion_factor: "", sale_price: "" },
      ],
    }));
  };

  const updateProductUnit = (index, field, value) => {
    setForm((current) => ({
      ...current,
      productUnits: current.productUnits.map((unit, currentIndex) => {
        if (currentIndex !== index) return unit;

        const updated = { ...unit, [field]: value };

        if (field === "conversion_factor" && !unit.sale_price) {
          const factor = Number(value) || 0;
          const basePrice = Number(form.salePrice) || 0;
          updated.sale_price =
            factor > 0 ? (basePrice * factor).toString() : "";
        }

        return updated;
      }),
    }));
  };

  const removeProductUnit = (index) => {
    setForm((current) => ({
      ...current,
      productUnits: current.productUnits.filter(
        (_, currentIndex) => currentIndex !== index
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

      toast.success(t("screens.products.uploaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("screens.products.uploadFailed"));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error(t("screens.products.nameRequired"));
      return;
    }

    if (Number(form.costPrice) <= 0) {
      toast.error(t("screens.products.validCost"));
      return;
    }

    if (Number(form.salePrice) <= 0) {
      toast.error(t("screens.products.validSale"));
      return;
    }

    const cleanedUnits = form.productUnits
      .filter((u) => u.unit_name.trim() && Number(u.conversion_factor) > 0)
      .map((u) => ({
        ...(u.id ? { id: u.id } : {}),
        unit_name: u.unit_name.trim(),
        conversion_factor: Number(u.conversion_factor),
        sale_price: Number(u.sale_price || 0),
      }));

    await onSubmit({
      ...form,
      quantity: Number(form.quantity || 0),
      costPrice: Number(form.costPrice || 0),
      salePrice: Number(form.salePrice || 0),
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      tax_id: form.tax_id ? Number(form.tax_id) : null,
      barcodes: form.barcodes.filter((item) => item.barcode.trim()),
      productUnits: cleanedUnits,
      oldQuantity: form.oldQuantity || 0,
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
          className="grid max-h-[94vh] w-full max-w-6xl overflow-y-auto  rounded-[34px] border border-white/80 bg-[#f8faff] shadow-[0_32px_100px_rgba(15,23,42,0.28)] lg:grid-cols-[360px_1fr]"
        >
          <aside className="flex min-h-0 flex-col border-b border-[#e5ebff] bg-white/70 p-6 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase  text-[#4663ff]">
                  {t("ui.inventory")}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {isEditing
                    ? t("screens.products.edit")
                    : t("screens.products.create")}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-[#eef3ff] hover:text-slate-950"
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </div>

            <label className="group relative mb-5 flex aspect-square cursor-pointer items-center justify-center overflow-y-auto  rounded-[30px] border border-dashed border-[#cbd7ff] bg-[#f8faff] transition hover:border-[#4663ff]/60">
              {form.logo ? (
                <img
                  src={getAssetUrl(form.logo)}
                  alt={t("ui.product")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-8 text-center">
                  <ImagePlus size={44} className="mx-auto text-[#4663ff]" />
                  <p className="mt-4 text-sm font-black text-slate-800">
                    {t("screens.products.imageDrop")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {t("screens.products.imageTypes")}
                  </p>
                </div>
              )}

              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 text-center text-sm font-bold text-[#4663ff] opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
                {t("screens.products.changeImage")}
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
                <p className="text-xs font-bold text-slate-500">
                  {t("ui.quantity")}
                </p>
                <p className="mt-1 text-xl font-black text-slate-950">
                  {form.quantity || 0}
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-4">
                <DollarSign size={18} className="mb-3 text-emerald-600" />
                <p className="text-xs font-bold text-slate-500">
                  {t("ui.salePrice")}
                </p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {form.salePrice || 0}
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-3xl border border-[#e5ebff] bg-white p-4">
              <p className="text-sm font-black text-slate-900">
                {t("screens.products.statusTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isEditing
                  ? t("screens.products.statusEdit")
                  : t("screens.products.statusCreate")}
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-28">
              {" "}
              <div className="grid gap-5">
                <div className={panelClass}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                      <Package size={19} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">
                        {t("screens.products.identity")}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {t("screens.products.identityHint")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className={labelClass}>
                        {t("ui.product")} {t("ui.name")}
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        placeholder={t("screens.products.enterProductName")}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={labelClass}>{t("ui.latinName")}</label>
                      <input
                        value={form.latinName}
                        onChange={(event) =>
                          updateField("latinName", event.target.value)
                        }
                        placeholder={t("ui.optional")}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={labelClass}>{t("ui.quantity")}</label>
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
                      <label className={labelClass}>{t("ui.unit")}</label>
                      <select
                        value={form.unit_id}
                        onChange={(event) =>
                          updateField("unit_id", event.target.value)
                        }
                        disabled={!canUseUnits}
                        className={inputClass}
                        required
                      >
                        <option value="">
                          {canUseUnits
                            ? t("ui.selectUnit")
                            : t("ui.unitsUnavailable")}
                        </option>

                        {units?.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} {unit.code ? `(${unit.code})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs font-semibold text-slate-400">
                        {t("screens.products.baseUnitHint")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={panelClass}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <DollarSign size={19} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">
                        {t("ui.price")}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {t("screens.products.pricingHint")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className={labelClass}>{t("ui.costPrice")}</label>
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
                      <label className={labelClass}>
                        {t("screens.products.baseSalePrice")}
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salePrice}
                        onChange={(event) =>
                          updateField("salePrice", event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className={labelClass}>{t("ui.tax")}</label>
                      <select
                        value={form.tax_id}
                        onChange={(event) =>
                          updateField("tax_id", event.target.value)
                        }
                        disabled={!canUseTaxes}
                        className={inputClass}
                      >
                        <option value="">
                          {canUseTaxes
                            ? t("screens.products.noTaxOption")
                            : t("screens.products.taxesUnavailable")}
                        </option>

                        {taxes?.map((tax) => (
                          <option key={tax.id} value={tax.id}>
                            {tax.name} ({tax.rate}%)
                          </option>
                        ))}
                      </select>
                      <p className="text-xs font-semibold text-slate-400">
                        {t("screens.products.taxHint")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={panelClass}>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                        <Layers size={19} />
                      </span>
                      <div>
                        <h3 className="font-black text-slate-950">
                          {t("screens.products.sellingUnits")}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {t("screens.products.sellingUnitsHint")}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addProductUnit}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-3 text-sm font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                    >
                      <Plus size={15} />
                      {t("common.add")}
                    </button>
                  </div>

                  {form.productUnits.length === 0 && (
                    <p className="text-sm font-semibold text-slate-400">
                      {t("screens.products.noSellingUnits")}
                    </p>
                  )}

                  <div className="grid gap-3">
                    {form.productUnits.map((unit, index) => (
                      <div
                        key={unit.id || index}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"
                      >
                        <input
                          value={unit.unit_name}
                          onChange={(event) =>
                            updateProductUnit(
                              index,
                              "unit_name",
                              event.target.value
                            )
                          }
                          placeholder={t(
                            "screens.products.unitNamePlaceholder"
                          )}
                          className={inputClass}
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unit.conversion_factor}
                          onChange={(event) =>
                            updateProductUnit(
                              index,
                              "conversion_factor",
                              event.target.value
                            )
                          }
                          placeholder={t(
                            "screens.products.conversionPlaceholder"
                          )}
                          className={inputClass}
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unit.sale_price}
                          onChange={(event) =>
                            updateProductUnit(
                              index,
                              "sale_price",
                              event.target.value
                            )
                          }
                          placeholder={t(
                            "screens.products.unitSalePricePlaceholder"
                          )}
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() => removeProductUnit(index)}
                          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50"
                          aria-label={t("screens.products.removeUnit")}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
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
                            {t("ui.barcodes")}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {t("screens.products.barcodesHint")}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addBarcode}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-3 text-sm font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                      >
                        <Plus size={15} />
                        {t("common.add")}
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
                            placeholder={t("screens.products.enterBarcode")}
                            className={inputClass}
                          />

                          <button
                            type="button"
                            onClick={() => removeBarcode(index)}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50"
                            aria-label={t("screens.products.removeBarcode")}
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
                    {t("screens.products.barcodeUnavailable")}
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
                {t("common.cancel")}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving
                  ? t("common.saving")
                  : isEditing
                    ? t("screens.products.update")
                    : t("screens.products.create")}
              </button>
            </div>
          </section>
        </form>
      </div>

      <ToastContainer position="top-right" />
    </>
  );
}
