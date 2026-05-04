import { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    window.api.getProducts().then(setProducts);
  }, []);
  console.log(products);

  return (
    <div>
      <h1>Products</h1>

      {products.map((p) => (
        <div key={p.id}>
          {p.name} - {p.price}
        </div>
      ))}
    </div>
  );
}

export default App;
