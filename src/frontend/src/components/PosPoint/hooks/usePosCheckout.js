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

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [productsResult, customersResult, fundsResult] =
        await Promise.allSettled([
          api.getProducts(),
          api.getCustomers(),
          api.getFunds(),
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
        customersResult.status === "fulfilled" ? customersResult.value || [] : [],
      );
      setFunds(fundsResult.status === "fulfilled" ? fundsResult.value || [] : []);
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
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
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

  const checkout = async ({ fundId }) => {
    if (!cart.length) {
      throw new Error("Cart is empty.");
    }

    if (!fundId) {
      throw new Error("Select a fund before checkout.");
    }

    setCheckingOut(true);
    try {
      const customerId = selectedCustomerId ? Number(selectedCustomerId) : null;
      const invoiceResult = await api.createSalesInvoice({
        customer_id: customerId,
        date: new Date().toISOString(),
        subtotal,
        discount: 0,
        tax: 0,
        net_total: subtotal,
      });

      const invoiceId = invoiceResult?.id;
      for (const item of cart) {
        await api.createSalesInvoiceItem({
          invoice_id: invoiceId,
          product_id: item.id,
          quantity: toNumber(item.qty),
          price: toNumber(item.price),
        });
      }

      await api.createPayment({
        type: "income",
        party_type: customerId ? "customer" : "walk-in",
        party_id: customerId,
        fund_id: Number(fundId),
        amount: subtotal,
        note: `Sales invoice #${invoiceId}`,
      });

      clearCart();
      await refetch();
      return invoiceResult;
    } finally {
      setCheckingOut(false);
    }
  };

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
  };
}
