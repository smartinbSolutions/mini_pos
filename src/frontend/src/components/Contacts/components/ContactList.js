import React, { useState } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  HandCoins,
  ArrowLeftRight,
  MoreVertical,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import useContactList from "../hooks/useContactList";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import DeleteModal from "../../../Global/DeleteModel";
import AddPayment from "../../Cash/Payment/components/AddPayment";
import ContactListHeader from "../../../Global/Contactlistheader";
import ContactFormModal from "../../../Global/ContactFormModal";
import Pagination from "../../../Global/Pagination";
import TagList from "../../Tags/components/TagList";
import DropdownMenu from "../../../Global/DropdownMenu";
import EmptyState from "../../../Global/ui/EmptyState";
import SettlementModal from "../../Cash/Settlement/components/SettlementModal";

// dir="ltr" font-mono tabular-nums wrapper, per the app's RTL-number convention.
const Num = ({ children, className = "" }) => (
  <span dir="ltr" className={`font-mono tabular-nums ${className}`}>
    {children}
  </span>
);

const StatCard = ({ label, value, tone = "neutral" }) => {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "success"
        ? "text-emerald-600"
        : "text-slate-900";

  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-[0_10px_30px_rgba(70,99,255,0.06)]">
      <p className="text-sm font-bold text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-black ${toneClass}`}>
        <Num>{value}</Num>
      </p>
    </div>
  );
};

// One balance, in words: > 0 he owes you, < 0 you owe him.
const BalanceCell = ({ balance, money, t }) => {
  const value = Number(balance || 0);
  const status =
    Math.abs(value) < 0.005 ? "settled" : value > 0 ? "owesYou" : "youOwe";

  const style = {
    owesYou: {
      chip: "bg-emerald-50 text-emerald-700",
      amount: "text-emerald-600",
    },
    youOwe: { chip: "bg-red-50 text-red-600", amount: "text-red-500" },
    settled: { chip: "bg-slate-100 text-slate-500", amount: "text-slate-400" },
  }[status];

  const label = {
    owesYou: t("screens.contacts.owesYou", "Owes you"),
    youOwe: t("screens.contacts.youOwe", "You owe"),
    settled: t("ui.settled", "Settled"),
  }[status];

  return (
    <div className="flex items-center justify-center gap-2">
      <span
        className={`rounded-full px-2.5 py-1 text-sm font-bold ${style.chip}`}
      >
        {label}
      </span>
      <span className={`text-base font-black ${style.amount}`}>
        <Num>{money(Math.abs(value))}</Num>
      </span>
    </div>
  );
};

export default function ContactList({ role }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { money } = usePrimaryCurrency();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [settlementContact, setSettlementContact] = useState(null);

  const {
    legacyKey,
    saving,
    contacts,
    stats,
    counts,
    actionError,
    draft,
    setDraft,
    editing,
    setEditing,
    editingId,
    setEditingId,
    submitDraft,
    submitEdit,
    startEdit,
    handleDelete,
    navigate,
    openPaymentModel,
    setOpenPaymentModel,
    selectedContact,
    setSelectedContact,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    balanceFilter,
    setBalanceFilter,
    search,
    setSearch,
    tagsByContact,
  } = useContactList(role);

  const isCustomerPage = role === "customer";

  // Per-page wording — everything else on the screen is shared.
  const text = isCustomerPage
    ? {
        title: t("ui.customers"),
        subtitle: t("screens.contacts.customersSubtitle"),
        search: t("screens.contacts.searchCustomer"),
        createTitle: t("screens.contacts.createCustomer"),
        createSubtitle: t("screens.contacts.addCustomerContact"),
        submit: t("screens.contacts.addCustomer"),
        empty: t("screens.contacts.noCustomers"),
        otherRole: t("screens.contacts.roleSupplier", "Supplier"),
      }
    : {
        title: t("ui.suppliers"),
        subtitle: t("screens.contacts.suppliersSubtitle"),
        search: t("screens.contacts.searchSupplier"),
        createTitle: t("screens.contacts.createSupplier"),
        createSubtitle: t("screens.contacts.addSupplierContact"),
        submit: t("screens.contacts.addSupplier"),
        empty: t("screens.contacts.noSuppliers"),
        otherRole: t("screens.contacts.roleCustomer", "Customer"),
      };

  const hasOtherRole = (c) => (isCustomerPage ? c.is_supplier : c.is_customer);

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";

  const filterChipClass = (key) =>
    `rounded-full min-h-[44px] px-4 py-2 text-sm font-bold transition ${
      balanceFilter === key
        ? "bg-[#4663ff] text-white shadow-md shadow-[#4663ff]/20"
        : "bg-white/80 text-slate-500 border border-[#dbe4ff] hover:bg-[#eef3ff]"
    }`;

  const chips = [
    { key: "all", label: t("common.all") || "All", count: counts.all },
    {
      key: "receivable",
      label: t("screens.contacts.owesYou", "Owes you"),
      count: counts.receivable,
    },
    {
      key: "payable",
      label: t("screens.contacts.youOwe", "You owe"),
      count: counts.payable,
    },
    {
      key: "settled",
      label: t("ui.settled") || "Settled",
      count: counts.settled,
    },
  ];

  return (
    <div className={pageClass}>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={text.title} value={stats.count} />
          <StatCard
            label={t("screens.contacts.owedToYou", "Owed to you")}
            value={money(stats.receivable)}
            tone="success"
          />
          <StatCard
            label={t("screens.contacts.youOweTotal", "You owe")}
            value={money(stats.payable)}
            tone="danger"
          />
          <StatCard
            label={t("screens.contacts.net", "Net")}
            value={money(stats.receivable - stats.payable)}
            tone={stats.receivable - stats.payable >= 0 ? "success" : "danger"}
          />
        </div>

        <div className={panelClass}>
          <ContactListHeader
            eyebrow={t("ui.contacts")}
            title={text.title}
            subtitle={text.subtitle}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={text.search}
            createTitle={text.createTitle}
            createSubtitle={text.createSubtitle}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitDraft}
            saving={saving}
            actionError={actionError}
            submitLabel={text.submit}
            t={t}
            type={role}
          />

          <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1ff] px-5 py-3">
            {chips.map((chip) => (
              <button
                key={chip.key}
                className={filterChipClass(chip.key)}
                onClick={() => setBalanceFilter(chip.key)}
              >
                {chip.label} ({chip.count})
              </button>
            ))}
          </div>

          {contacts.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Users} title={text.empty} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-center text-sm">
                <thead className="bg-[#f8faff] text-sm font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-4 text-center">{t("ui.name")}</th>
                    <th className="px-5 py-4 text-center">{t("ui.phone")}</th>
                    <th className="px-5 py-4 text-center">{t("ui.address")}</th>
                    <th className="px-5 py-4 text-center">{t("ui.balance")}</th>
                    <th className="px-5 py-4 text-center">
                      {t("screens.tags.title") || "Tags"}
                    </th>
                    <th className="px-5 py-4 text-center">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="transition hover:bg-[#f8faff]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4663ff] text-sm font-bold text-white shadow-md shadow-[#4663ff]/20">
                            {contact.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                          <div className="min-w-0 text-start">
                            <span className="block text-base font-bold text-slate-900">
                              {contact.name}
                            </span>
                            {hasOtherRole(contact) ? (
                              <span className="mt-0.5 inline-block rounded-md bg-[#eef3ff] px-2 py-0.5 text-sm font-bold text-[#4663ff]">
                                {text.otherRole}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-base text-slate-600">
                        {contact.phone || t("ui.noPhone")}
                      </td>
                      <td className="px-5 py-3 max-w-[200px] truncate text-base text-slate-600">
                        {contact.address || t("ui.noAddress")}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <BalanceCell
                          balance={contact.balance}
                          money={money}
                          t={t}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <TagList
                          tags={tagsByContact[contact.id] || []}
                          limit={2}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/contact/${contact.id}`)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand-700"
                          >
                            <Eye size={17} />
                            {t("simple.latest.view")}
                          </button>
                          <DropdownMenu
                            align={isRtl ? "left" : "right"}
                            trigger={
                              <button
                                type="button"
                                aria-label={t("common.actions")}
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                              >
                                <MoreVertical size={20} />
                              </button>
                            }
                            options={[
                              {
                                key: "payment",
                                icon: <HandCoins size={18} />,
                                label: t("ui.payment"),
                                onClick: () => {
                                  setSelectedContact(contact);
                                  setOpenPaymentModel(true);
                                },
                              },
                              {
                                key: "settlement",
                                icon: <ArrowLeftRight size={18} />,
                                label: t("screens.payments.settlement", "Settlement"),
                                onClick: () => setSettlementContact(contact),
                              },
                              {
                                key: "edit",
                                icon: <Edit2 size={18} />,
                                label: t("common.edit"),
                                onClick: () => startEdit(contact),
                              },
                              {
                                key: "delete",
                                icon: <Trash2 size={18} />,
                                label: t("common.delete"),
                                danger: true,
                                onClick: () => setDeleteTarget(contact),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </div>
      </div>

      <ContactFormModal
        open={Boolean(editingId)}
        onClose={() => setEditingId(null)}
        mode="edit"
        form={editing}
        setForm={setEditing}
        onSubmit={submitEdit}
        saving={saving}
        actionError={actionError}
        title={t("common.edit")}
        subtitle={editing.name}
        submitLabel={t("common.save")}
        type={role}
        t={t}
      />

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={null}
        party={selectedContact?.id}
        partyName={selectedContact?.name}
        mode={role}
        refetchList={refetch}
      />
      <SettlementModal
        isOpen={Boolean(settlementContact)}
        onClose={() => setSettlementContact(null)}
        contactId={settlementContact?.id}
        onSaved={refetch}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
      <ToastContainer />
    </div>
  );
}
