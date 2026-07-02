import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function usePosCheckout({ weight } = {}) {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [funds, setFunds] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState({
    type: "amount", // amount | percent
    value: 0,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [currencies, setCurrencies] = useState();
  const weightRef = useRef(weight);

  const api = window.api;

  useEffect(() => {
    weightRef.current = weight;
  }, [weight]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      return;
    }

    try {
      setLoading(true);
      const [productsResult, customersResult, fundsResult, currencyResult] =
        await Promise.allSettled([
          api.getProducts(),
          api.getCustomers(),
          api.getFunds(),
          api.getCurrencies(),
        ]);

      if (productsResult.status === "rejected") {
        throw productsResult.reason;
      }

      if (customersResult.status === "rejected") {
        console.error("Failed to load customers:", customersResult.reason);
      }

      if (fundsResult.status === "rejected") {
        console.error("Failed to load funds:", fundsResult.reason);
      }

      setProducts(productsResult.value || []);
      setCustomers(
        customersResult.status === "fulfilled"
          ? customersResult.value || []
          : [],
      );
      setFunds(
        fundsResult.status === "fulfilled" ? fundsResult.value || [] : [],
      );

      setCurrencies(currencyResult.value?.[0] || []);

      setError(
        [customersResult, fundsResult].some(
          (result) => result.status === "rejected",
        )
          ? t("errors.partialLoad", { field: t("ui.products") })
          : "",
      );
    } catch (err) {
      console.error("Failed to load POS data:", err);
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addToCart = (product, quantity = 1, replaceQuantity = false) => {
    const qty = Math.max(0, toNumber(quantity));

    if (!qty) return;

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: replaceQuantity ? qty : toNumber(item.qty) + qty,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          ...product,
          qty,
          product_id: product.product_id || product.id,
        },
      ];
    });
  };

  const updateQuantity = (productId, nextQuantity) => {
    const quantity = Math.max(-1, toNumber(nextQuantity));

    setCart((current) =>
      quantity === -1
        ? current.filter((item) => item.id !== productId)
        : current.map((item) =>
            item.id === productId ? { ...item, qty: quantity } : item,
          ),
    );
  };

  const updatePrice = (productId, nextPrice) => {
    const price = Math.max(0, toNumber(nextPrice));
    setCart((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, price: price } : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount({
      type: "amount",
      value: 0,
    });
    setSelectedCustomerId("");
  };

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + toNumber(item.price) * toNumber(item.qty),
        0,
      ),
    [cart],
  );

  const discountAmount = useMemo(() => {
    const value = toNumber(discount.value);

    if (discount.type === "percent") {
      return (subtotal * value) / 100;
    }

    return value;
  }, [subtotal, discount]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);
  console.log(subtotal);

  const checkout = async ({
    payments,
    received,
    receivedFundTotal,
    changeFundId,
  }) => {
    setCheckingOut(true);

    try {
      const normalizedPayments = (payments || [])
        .map((payment) => ({
          fundId: Number(payment.fundId),
          amount: toNumber(payment.amount),
          amount_fund_currency: toNumber(payment.amount_fund_currency),
          currency_code: payment.currency_code,
          exchange_rate: toNumber(payment.exchange_rate || 1) || 1,
        }))
        .filter(
          (payment) =>
            payment.fundId &&
            payment.amount > 0 &&
            payment.amount_fund_currency > 0,
        );

      const payload = {
        items: cart.map((i) => ({
          name: i.name,
          quantity: i.qty,
          price: i.price,
        })),
        subtotal,
        discount: toNumber(discount.value),
        total: netTotal,
        received,
        change: received - netTotal,
        payments: normalizedPayments,
        receivedFundTotal,
        changeFundId,
        customer_id: selectedCustomerId,
        language: i18n.language,
      };

      const sales = await api.posCheckout({
        items: cart,
        subtotal,
        discount: toNumber(discount?.value || 0),
        net_total: netTotal,
        paid_amount: netTotal,
        customer_id: selectedCustomerId,
        payments: normalizedPayments,
        change_fund_id: changeFundId,
      });

      payload.id = sales.invoiceId;
      await api.printReceipt(payload);

      setCart([]);
      setDiscount({
        type: "amount",
        value: 0,
      });
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingOut(false);
    }
  };

  useEffect(() => {
    let barcode = "";

    const handleKeyDown = async (e) => {
      if (e.key === "Enter") {
        if (!barcode) return;

        try {
          const product = await api.getProductByBarcode(barcode);

          if (!product) {
            setError(t("errors.productNotFound"));
            barcode = "";
            return;
          }
          setCart((prev) => {
            const scannedQuantity =
              Math.max(0, toNumber(weightRef.current)) || 1;
            const existingIndex = prev.findIndex(
              (i) => Number(i.product_id) === Number(product.id),
            );

            if (existingIndex !== -1) {
              const updated = [...prev];
              const item = updated[existingIndex];
              const newQuantity = toNumber(item.qty) + scannedQuantity;

              updated[existingIndex] = {
                ...item,
                qty: newQuantity,
                price: Number(item.price),
              };

              return updated;
            }

            return [
              ...prev,
              {
                id: product.id,
                product_id: product.id,
                name: product.name,
                qty: scannedQuantity,
                price: product.price || 0,
                total: (product.price || 0) * scannedQuantity,
              },
            ];
          });

          barcode = "";
        } catch (err) {
          console.log(err);
        }
      } else {
        barcode += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [api]);
  return {
    products,
    customers,
    funds,
    cart,
    discount,
    setDiscount,
    selectedCustomerId,
    loading,
    checkingOut,
    error,
    subtotal,
    netTotal,
    refetch,
    setSelectedCustomerId,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    checkout,
    currencies,
  };
}
