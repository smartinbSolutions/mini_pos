import { useCallback, useEffect, useMemo, useState } from "react";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function usePosCheckout() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [funds, setFunds] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [currencies, setCurrencies] = useState();

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
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
      console.log(currencyResult);

      setCurrencies(currencyResult.value[0] || []);

      setError(
        [customersResult, fundsResult].some(
          (result) => result.status === "rejected",
        )
          ? "Products loaded, but customers or funds are unavailable because their IPC handlers are not registered."
          : "",
      );
    } catch (err) {
      console.error("Failed to load POS data:", err);
      setError(err?.message || "Failed to load POS data.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [...current, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (productId, nextQuantity) => {
    const quantity = Math.max(0, toNumber(nextQuantity));

    setCart((current) =>
      quantity === 0
        ? current.filter((item) => item.id !== productId)
        : current.map((item) =>
            item.id === productId ? { ...item, qty: quantity } : item,
          ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
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

  const checkout = async ({ fundId, received, paymentInFundExchageRate }) => {
    setCheckingOut(true);

    try {
      const payload = {
        items: cart.map((i) => ({
          name: i.name,
          quantity: i.qty,
          price: i.price,
        })),
        total: subtotal,
        received,
        change: received - subtotal,
        customer_id: selectedCustomerId,
      };

      const sales = await api.posCheckout({
        fund_id: Number(fundId),
        items: cart,
        subtotal,
        paid_amount: received,
        net_total: subtotal,
        customer_id: selectedCustomerId,
        paymentInFundExchageRate,
      });

      payload.id = sales.invoiceId;
      await api.printReceipt(payload);

      setCart([]);

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
            setError("Product not found");
            barcode = "";
            return;
          }

          setCart((prev) => {
            const existingIndex = prev.findIndex(
              (i) => Number(i.product_id) === Number(product.id),
            );

            if (existingIndex !== -1) {
              const updated = [...prev];
              const item = updated[existingIndex];

              const newQuantity = Number(item.qty) + 1;

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
                product_id: product.id,
                name: product.name,
                qty: 1,
                price: product.price || 0,
                total: product.price || 0,
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
    selectedCustomerId,
    loading,
    checkingOut,
    error,
    subtotal,
    refetch,
    setSelectedCustomerId,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    currencies,
  };
}
