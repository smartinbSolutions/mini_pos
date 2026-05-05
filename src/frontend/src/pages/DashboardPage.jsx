import Card from "../components/Card";

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-6">
        <Card title="Total Sales" value="$12,000" />
        <Card title="Products" value="320" />
        <Card title="Customers" value="85" />
        <Card title="Profit" value="$4,200" />
      </div>
    </div>
  );
}
