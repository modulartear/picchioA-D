import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartProvider, useCart } from "./context/CartContext";
import { CartDrawer } from "./components/CartDrawer";
import { Cotizador } from "./components/Cotizador";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { QuickView } from "./components/QuickView";
import { Toast } from "./components/Toast";
import { WhatsAppFab } from "./components/WhatsAppFab";
import "./styles.css";

import { Admin } from "./pages/Admin";
import { Category } from "./pages/Category";
import { Checkout } from "./pages/Checkout";
import { Home } from "./pages/Home";
import { Product } from "./pages/Product";

function Shell() {
  const loc = useLocation();
  const { toast } = useCart();
  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cat/:slug" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}

      {!isAdmin && (
        <>
          <CartDrawer />
          <QuickView />
          <Cotizador />
          <WhatsAppFab />
          <Toast message={toast.message} show={toast.show} />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Shell />
      </CartProvider>
    </BrowserRouter>
  );
}
