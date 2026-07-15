import { Receipt, RotateCcw, Eye, Calendar, User, Loader2 } from "lucide-react";
import Pagination from "../../../../Global/Pagination";

export default function TodayInvoicesList({
  loading,
  error,
  activeTab,
  setActiveTab,
  salesInvoices,
  returnInvoices,
  onSelectInvoice,
  money,
  t,
  onClose,

  page,
  setPage,
  total,
  totalPages,
  limit,
  setLimit,
}) {
  const currentInvoices =
    activeTab === "sales" ? salesInvoices : returnInvoices;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="mt-3 text-xs font-semibold text-stone-500">
          {t("screens.pos.loading", "جاري التحميل...")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-xs font-semibold text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* TABS */}
      <div className="shrink-0 flex border-b border-stone-100 bg-stone-50/50 p-2 gap-2">
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "sales"
              ? "bg-white text-teal-700 shadow-sm border border-stone-200/60"
              : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          <Receipt size={14} />
          {t("screens.pos.sales", "المبيعات")}{" "}
          {activeTab === "sales" ? `(${total})` : ""}
        </button>

        <button
          onClick={() => setActiveTab("returns")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "returns"
              ? "bg-white text-rose-700 shadow-sm border border-stone-200/60"
              : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          <RotateCcw size={14} />
          {t("screens.pos.returns", "المرتجع")}{" "}
          {activeTab === "returns" ? `(${total})` : ""}
        </button>
      </div>

      {/* LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="space-y-3">
          {currentInvoices.length > 0 ? (
            currentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50/50 p-4 hover:border-teal-300 hover:bg-white transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      invoice.type === "return"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-teal-50 text-teal-600"
                    }`}
                  >
                    <Receipt size={18} />
                  </div>

                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="font-black text-sm text-stone-950">
                        {invoice.invoice_number || invoice.id}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          invoice.type === "return"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {invoice.type === "return"
                          ? t("ui.return", "مرتجع")
                          : t("ui.sale", "مبيعات")}
                      </span>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <Calendar size={12} />
                      {invoice.created_at &&
                        new Date(invoice.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      <span className="text-stone-300">|</span>
                      <User size={12} />
                      {invoice.customer_name ||
                        invoice.customer?.name ||
                        t("screens.pos.walkInCustomer", "زبون سفري")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ltr:ml-auto rtl:mr-auto">
                  <div className="text-right min-w-[80px]">
                    <p className="text-[10px] uppercase text-stone-500 font-semibold">
                      {t("ui.netTotal", "الصافي")}
                    </p>
                    <b className="text-stone-950 text-sm">
                      {money(
                        invoice.net_total ||
                          invoice.netTotal ||
                          invoice.total ||
                          0,
                      )}
                    </b>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectInvoice(invoice, "view")}
                      className="flex h-9 px-3 items-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition shadow-sm"
                    >
                      <Eye size={14} />
                      {t("common.view", "عرض")}
                    </button>

                    {invoice.type !== "return" && (
                      <button
                        type="button"
                        onClick={() => onSelectInvoice(invoice, "return")}
                        className="flex h-9 px-3 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:text-stone-950 hover:bg-rose-100 transition shadow-sm"
                      >
                        <RotateCcw size={14} />
                        {t("screens.pos.return", "إرجاع")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs font-semibold text-stone-400">
              {t("common.noData", "لا توجد بيانات متاحة اليوم")}
            </div>
          )}
        </div>
      </div>

      {/* PAGINATION CONTAINER */}
      <div className="shrink-0 border-t border-stone-100 bg-white p-3">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* FOOTER */}
      <div className="shrink-0 flex justify-end border-t bg-stone-50/50 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border bg-white px-5 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
        >
          {t("common.close", "إغلاق")}
        </button>
      </div>
    </div>
  );
}
