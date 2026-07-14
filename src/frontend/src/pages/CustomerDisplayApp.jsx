import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CustomerDisplayApp() {
  const { t } = useTranslation();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currencyCode, setCurrencyCode] = useState("");

  useEffect(() => {
    const unsubscribe = window.api?.onCustomerDisplayCartUpdate?.((payload) => {
      setCart(payload?.items || []);
      setTotal(payload?.total || 0);
      setCurrencyCode(payload?.currencyCode || "");
    });

    return unsubscribe;
  }, []);

  const money = (value) =>
    `${Number(value || 0).toFixed(2)} ${currencyCode}`.trim();

  if (cart.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-950 text-white">
        <ShoppingBag size={56} className="text-teal-500" />
        <h1 className="text-3xl font-black">
          {t("screens.customerDisplay.welcome", "Welcome")}
        </h1>
        <p className="text-stone-400">
          {t("screens.customerDisplay.thanks", "Thanks")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-2">
          {cart.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <div>
                <h4 className="font-black text-stone-900">{item.name}</h4>
                <p className="text-sm text-stone-500">
                  {item.qty} × {money(item.price)}
                </p>
              </div>
              <span className="text-lg font-black text-stone-900">
                {money(item.qty * item.price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-stone-950 p-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-stone-300">
            {t("ui.total", "Total")}
          </span>
          <span className="text-4xl font-black">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
