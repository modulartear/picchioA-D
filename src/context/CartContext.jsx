import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProductImageUrlForColor } from "../utils/productGallery";

const CartCtx = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem("PICCHIO_CART_V1");
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart());
  const [open, setOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [cotizadorOpen, setCotizadorOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", show: false });
  const toastTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("PICCHIO_CART_V1", JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  const showToast = (message) => {
    setToast({ message, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((s) => ({ ...s, show: false })), 2400);
  };

  const fmtMoney = (amount) => {
    if (!Number.isFinite(amount)) return null;
    return `$${amount.toLocaleString("es-AR")}`;
  };

  const addToCart = (product, color) => {
    const uid = String(product.id) + "::" + String(color?.name || "default");
    const priceFromProduct = Number.isFinite(product?.price) ? product.price : null;
    const priceAmount = priceFromProduct ?? (Number.isFinite(product?.priceAmount) ? product.priceAmount : null);
    const priceLabel = fmtMoney(priceAmount) ?? product.priceLabel ?? null;
    const image = getProductImageUrlForColor(product, color?.name) || product.imageUrl || product.image;
    setItems((prev) => {
      const existing = prev.find((x) => x.uid === uid);
      if (existing) return prev.map((x) => (x.uid === uid ? { ...x, qty: x.qty + 1 } : x));
      return [
        ...prev,
        {
          uid,
          id: product.id,
          name: product.name,
          image,
          color,
          qty: 1,
          priceAmount,
          priceLabel,
          meta: product.meta,
          cat: product.cat,
          catName: product.catName,
        },
      ];
    });
    showToast(`✓ ${product.name} agregado al carrito`);
  };

  const addCustomItem = (item) => {
    const uid = item.id;
    setItems((prev) => [...prev, { uid, ...item, qty: 1 }]);
    showToast(`✓ ${item.name} agregada al pedido`);
  };

  const changeQty = (uid, qty) => {
    if (qty <= 0) return removeItem(uid);
    setItems((prev) => prev.map((x) => (x.uid === uid ? { ...x, qty } : x)));
  };

  const removeItem = (uid) => setItems((prev) => prev.filter((x) => x.uid !== uid));
  const clearCart = () => setItems([]);

  const cartCount = useMemo(() => items.reduce((s, x) => s + (x.qty || 0), 0), [items]);

  const value = {
    items,
    cartCount,
    cartOpen: open,
    setCartOpen: setOpen,
    addToCart,
    addCustomItem,
    changeQty,
    removeItem,
    clearCart,
    quickViewProduct,
    setQuickViewProduct,
    cotizadorOpen,
    setCotizadorOpen,
    toast,
    showToast,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("CartProvider no está montado");
  return ctx;
}
