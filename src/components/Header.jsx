import { useEffect, useMemo, useRef, useState } from "react";
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
  const { cartCount, setCartOpen, setCotizadorOpen, showToast } = useCart();
  const { theme, setTheme } = useTheme();
  const headerRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const el = headerRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height || 0);
      if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    updateHeaderHeight();
    const onResize = () => updateHeaderHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navItems = useMemo(
    () => [
      { label: "Productos", path: "/cat/productos" },
      { label: "A medida", path: "/#cotizador" },
      { label: "Cortinas", path: "/#cortinas-calc" },
      { label: "Proyectos", path: "/#proyectos" },
      { label: "Nosotros", path: "/#nosotros" },
      { label: "Contacto", path: "/#contacto" },
    ],
    [],
  );

  function goToAnchor(hash) {
    if (hash === "#cotizador") {
      if (loc.pathname !== "/") {
        nav({ pathname: "/", hash: "#cotizador" });
        return;
      }
      setCotizadorOpen(true);
      return;
    }
    if (loc.pathname !== "/") {
      nav({ pathname: "/", hash });
      return;
    }
    const el = document.getElementById(hash.replace("#", ""));
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
  }

  return (
    <>
      <header className={"header" + (scrolled ? " header--scrolled" : "")}>
        <div ref={headerRef} className="container header__inner">
          <Link className="header__logo header__logo--center" to="/">
            <img
              className="header__logo-img"
              src="/assets/ChatGPT%20Image%2029%20may%202026%2C%2019_13_38.png"
              alt="Picchio"
              onLoad={() => {
                const el = headerRef.current;
                if (!el) return;
                const h = Math.ceil(el.getBoundingClientRect().height || 0);
                if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
              }}
            />
          </Link>

          <div className="header__bar">
            <div />
            <nav className="nav">
              {navItems.map((n) => {
                const isAnchor = n.path.includes("#");
                const href = isAnchor ? n.path : n.path;
                const active = (() => {
                  if (isAnchor) return loc.pathname === "/";
                  if (n.path === "/cat/productos") return loc.pathname.startsWith("/cat/") && !loc.pathname.startsWith("/cat/a-medida");
                  return loc.pathname === n.path || loc.pathname.startsWith(n.path + "/");
                })();

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

