import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Icon } from "./icons";

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("PICCHIO_THEME_V1") || "light";
    } catch (_) {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "light");
    try {
      localStorage.setItem("PICCHIO_THEME_V1", theme);
    } catch (_) {}
  }, [theme]);

  return { theme, setTheme };
}

export function Header() {
  const nav = useNavigate();
  const loc = useLocation();
  const { cartCount, setCartOpen, showToast } = useCart();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  const navItems = useMemo(
    () => [
      { label: "Productos", path: "/cat/sillas" },
      { label: "A medida", path: "/cat/a-medida" },
      { label: "Proyectos", path: "/#proyectos" },
      { label: "Nosotros", path: "/#nosotros" },
      { label: "Contacto", path: "/#contacto" },
    ],
    [],
  );

  function goToAnchor(hash) {
    if (loc.pathname !== "/") {
      nav("/" + hash);
      return;
    }
    const el = document.getElementById(hash.replace("#", ""));
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
  }

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link className="header__logo" to="/">
            <img className="header__logo-img" src="/assets/picchio-logo.png" alt="Picchio" />
          </Link>

          <nav className="nav">
            {navItems.map((n) => {
              const isAnchor = n.path.includes("#");
              const href = isAnchor ? n.path : n.path;
              const active =
                (!isAnchor && loc.pathname.startsWith(n.path.split("/")[1] ? "/" + n.path.split("/")[1] : n.path)) ||
                (isAnchor && loc.pathname === "/");

              return (
                <a
                  key={n.label}
                  href={href}
                  className={active && !isAnchor ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isAnchor) goToAnchor(n.path.split("#")[1] ? "#" + n.path.split("#")[1] : "#");
                    else nav(n.path);
                  }}
                >
                  {n.label}
                </a>
              );
            })}
          </nav>

          <div className="header__actions">
            <button className="icon-btn" aria-label="Buscar" onClick={() => showToast("Buscador próximamente — usá las categorías por ahora")}>
              <Icon.Search />
            </button>
            <button className="icon-btn" aria-label="Modo claro/oscuro" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Icon.Sun /> : <Icon.Moon />}
            </button>
            <button className="icon-btn" aria-label="Favoritos" onClick={() => showToast("Favoritos próximamente")}>
              <Icon.Heart />
            </button>
            <button className="icon-btn" aria-label="Carrito" onClick={() => setCartOpen(true)}>
              <Icon.Cart />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>
            <button className="icon-btn menu-toggle" aria-label="Menú" onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <Icon.Close /> : <Icon.Menu />}
            </button>
          </div>
        </div>
      </header>

      <div className={"mobile-nav" + (mobileOpen ? " open" : "")}>
        {navItems.map((n) => {
          const isAnchor = n.path.includes("#");
          return (
            <a
              key={n.label}
              href={n.path}
              onClick={(e) => {
                e.preventDefault();
                if (isAnchor) goToAnchor(n.path.split("#")[1] ? "#" + n.path.split("#")[1] : "#");
                else nav(n.path);
                setMobileOpen(false);
              }}
            >
              {n.label}
            </a>
          );
        })}
      </div>
    </>
  );
}

