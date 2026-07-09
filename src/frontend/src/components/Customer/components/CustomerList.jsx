import React, { useMemo, useState } from "react";
import { Eye, Edit2, Trash2, HandCoins } from "lucide-react";
import useCustomerList from "../hooks/useCustomerList";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../Global/DeleteModel";
import AddPayment from "../../Cash/Payment/components/AddPayment";
import ContactListHeader from "../../../Global/Contactlistheader";
import Pagination from "../../../Global/Pagination";

const BalanceCell = ({ total, paid, balance, money, t }) => {
  const isSettled = balance <= 0;

  return (
    <span className="group relative inline-flex cursor-help items-center justify-end">
      <span
        className={`font-black tabular-nums ${
          isSettled ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {money(balance)}
      </span>

      <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1.5 w-48 whitespace-normal rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        <span className="flex justify-between">
          <span className="text-slate-300">
            {t("screens.contacts.sales") || "Sales"}
          </span>
          <span className="font-bold">{money(total)}</span>
        </span>
        <span className="mt-1 flex justify-between">
          <span className="text-slate-300">{t("ui.paid") || "Paid"}</span>
          <span className="font-bold text-emerald-300">{money(paid)}</span>
        </span>
      </span>
    </span>
  );
};

export const CustomerList = () => {
  const { t } = useTranslation();
  const {
    saving,
    customers,
    handleDeleteCustomer,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    actionError,
    navigate,
    openPaymentModel,
    setOpenPaymentModel,
    selecteCustomer,
    setSelecteCustomer,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  } = useCustomerList();
  const { money } = usePrimaryCurrency();

  const [search, setSearch] = useState("");
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";

  const filteredCustomer = useMemo(() => {
    return customers.filter((s) =>
      `${s.name} ${s.phone} ${s.address} ${s.total} ${s.total_paid}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [customers, search]);

  return (
    <div className={pageClass}>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className={panelClass}>
          <ContactListHeader
            eyebrow={t("ui.contacts")}
            title={t("ui.customers")}
            subtitle={t("screens.contacts.customersSubtitle")}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("screens.contacts.searchCustomer")}
            createTitle={t("screens.contacts.createCustomer")}
            createSubtitle={t("screens.contacts.addCustomerContact")}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitDraft}
            saving={saving}
            actionError={actionError}
            submitLabel={t("screens.contacts.addCustomer")}
            t={t}
          />

          {filteredCustomer.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">
              {t("screens.contacts.noCustomers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">{t("ui.name")}</th>
                    <th className="px-5 py-4">{t("ui.phone")}</th>
                    <th className="px-5 py-4">{t("ui.address")}</th>
                    <th className="px-5 py-4 text-right">{t("ui.balance")}</th>
                    <th className="px-5 py-4 text-right">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {filteredCustomer.map((customer) => {
                    const sales = customer.total || 0;
                    const paid = customer.total_paid || 0;
                    const balance = customer.balance ?? sales - paid;

                    if (editingId === customer.id) {
                      return (
                        <tr key={customer.id} className="bg-[#f8faff]">
                          <td className="px-5 py-3" colSpan={5}>
                            <form
                              onSubmit={submitEdit}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                required
                                value={editing.name}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    name: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[160px]`}
                                placeholder={t("ui.name")}
                              />
                              <input
                                value={editing.phone}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    phone: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[140px]`}
                                placeholder={t("ui.phone")}
                              />
                              <input
                                value={editing.address}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    address: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[160px]`}
                                placeholder={t("ui.address")}
                              />
                              <button className="flex items-center gap-1.5 rounded-xl bg-[#4663ff] px-3 py-2 text-xs font-bold text-white hover:bg-[#3854e8]">
                                {t("common.save")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-xl border border-[#dbe4ff] bg-white p-2 text-slate-500 hover:bg-[#eef3ff]"
                              >
                                <span>&times;</span>
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-[#f8faff]"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4663ff] text-xs font-bold text-white shadow-md shadow-[#4663ff]/20">
                              {customer.name?.charAt(0)?.toUpperCase() || "C"}
                            </div>
                            <span className="font-bold text-slate-900">
                              {customer.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {customer.phone || t("ui.noPhone")}
                        </td>
                        <td className="px-5 py-3 max-w-[200px] truncate text-slate-500">
                          {customer.address || t("ui.noAddress")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <BalanceCell
                            total={sales}
                            paid={paid}
                            balance={balance}
                            money={money}
                            t={t}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                navigate(`/payment/customer/${customer.id}`)
                              }
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("screens.funds.viewMovements")}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelecteCustomer(customer);
                                setOpenPaymentModel(true);
                              }}
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("ui.payment")}
                            >
                              <HandCoins size={16} />
                            </button>
                            <button
                              onClick={() => startEdit(customer)}
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("common.edit")}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteCustomer(customer)}
                              className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                              title={t("common.delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
          )}
        </div>
      </div>

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={null}
        party={selecteCustomer?.id}
        partyName={selecteCustomer?.name}
        mode="customer"
        refetchList={refetch}
      />

      <DeleteModal
        open={Boolean(deleteCustomer)}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={async () => {
          await handleDeleteCustomer(deleteCustomer);
          setDeleteCustomer(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};
