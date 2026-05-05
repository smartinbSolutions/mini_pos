import React from "react";
import useGetProducts from "../hooks/useGetProducts";

const ProductList = () => {
  const { products, loading, error, refetch } = useGetProducts();

  if (loading) {
    return <div className="p-6">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Error loading products
        <button
          onClick={refetch}
          className="ml-4 px-3 py-1 bg-gray-800 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>

        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add Product
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Latin Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Cost</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{p.id}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.latinName}</td>
                <td className="p-3 text-green-600">{p.price}</td>
                <td className="p-3 text-red-500">{p.costPrice}</td>
                <td className="p-3">{p.quantity}</td>

                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded">
                    Edit
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-500 text-white rounded">
                    Delete
                  </button>
                </td>
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

export default ProductList;
