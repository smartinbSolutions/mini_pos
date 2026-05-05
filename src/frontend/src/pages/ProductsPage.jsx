import React, { useEffect, useState } from "react";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const data = await window.api.getProducts().then("get-products");
      console.log(data);

      setProducts(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>

        <button
          onClick={fetchProducts}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Latin</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Qty</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.latinName}</td>
                <td className="p-3 text-green-600">{p.price}</td>
                <td className="p-3 text-red-500">{p.costPrice}</td>
                <td className="p-3">{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="p-6 text-center text-gray-500">No products found</div>
        )}
      </div>
    </div>
  );
};

export default Products;
