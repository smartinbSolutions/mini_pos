import { useState } from "react";

const productsMock = [
  { id: 1, name: "Coca Cola", price: 1.5 },
  { id: 2, name: "Pepsi", price: 1.3 },
  { id: 3, name: "Water", price: 0.5 },
  { id: 4, name: "Chocolate", price: 2.0 },
];

export default function App() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    const exists = cart.find((i) => i.id === product.id);

    if (exists) {
      setCart(
        cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)),
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="h-14 bg-black text-white flex items-center px-4 justify-between">
        <h1 className="text-lg font-bold">POS SYSTEM</h1>
      </div>

      <div className="flex flex-1">
        <div className="flex-1 p-4">
          <div className="grid grid-cols-4 gap-4">
            {productsMock.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-white p-4 rounded shadow cursor-pointer hover:bg-blue-50 transition"
              >
                <div className="font-bold">{p.name}</div>
                <div className="text-gray-500">{p.price} $</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-1/3 bg-white border-r flex flex-col">
          <div className="p-3 border-b font-bold">🧾 Invoice</div>

          <div className="flex-1 overflow-auto p-2">
            {cart.length === 0 && (
              <div className="text-center text-gray-400 mt-10">No items</div>
            )}

            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-2 border-b"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.price} $</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 bg-gray-200"
                    onClick={() =>
                      setCart(
                        cart.map((i) =>
                          i.id === item.id && i.qty > 1
                            ? { ...i, qty: i.qty - 1 }
                            : i,
                        ),
                      )
                    }
                  >
                    -
                  </button>

                  <span>{item.qty}</span>

                  <button
                    className="px-2 bg-gray-200"
                    onClick={() =>
                      setCart(
                        cart.map((i) =>
                          i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{total.toFixed(2)} $</span>
            </div>

            <button className="w-full mt-3 bg-green-600 text-white py-2 rounded">
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
