import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Search, CalendarDays } from "lucide-react";

import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import Pagination from "../../../../Global/Pagination";

const SettlementList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { money } = usePrimaryCurrency();
  const api = window.api;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const refetch = useCallback(async () => {
    setLoading(true);
    const res = await api.getSettlements({
      page,
      limit,
      search: search || undefined,
    });
    setRows(res?.data || []);
    setTotal(res?.total || 0);
    setTotalPages(res?.totalPages || 1);
    setLoading(false);
  }, [api, page, limit, search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className={panelClass}>
          <div className="p-7">
            <p className="mb-2 text-xs font-bold uppercase text-violet-600">
              {t("screens.payments.settlement", "Settlement")}
            </p>
            <h1 className="text-4xl font-black leading-tight text-slate-950">
              {t("screens.payments.settlementsTitle", "Settlements")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ebff] bg-white/60 p-5">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#4663ff] focus:ring-2 focus:ring-[#4663ff]/10"
              />
            </div>
          </div>
        </section>

        <section className={panelClass}>
          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-400">
              {t("common.loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <ArrowLeftRight size={22} />
              </div>
              <p className="font-bold text-slate-600">
                {t("screens.payments.noSettlements", "No settlements yet")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef1ff]">
              {rows.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/settlements/${s.id}`)}
                  className="flex w-full flex-col gap-3 px-6 py-4 text-left transition hover:bg-[#f8faff] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <ArrowLeftRight size={19} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-black text-violet-700">
                          #{s.id}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <CalendarDays size={11} />
                          {s.date?.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-[#1c2340]">
                        {s.contact_name}
                      </p>
                      {s.note && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {s.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    dir="ltr"
                    className="text-lg font-black tabular-nums text-violet-700"
                  >
                    {money(s.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default SettlementList;
