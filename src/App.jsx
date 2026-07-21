import AdminApp from "./components/admin/AdminApp";

// This project is just the admin console — split out from the main
// PropertyBrands site so it can be deployed and access-controlled
// separately. AdminApp handles its own auth gate, sidebar, and topbar
// internally, so there's nothing else to wire up here.
export default function App() {
  return <AdminApp />;
}
