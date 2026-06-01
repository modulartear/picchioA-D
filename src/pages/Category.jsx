import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CortinasCalc } from "../components/CortinasCalc";
import { Icon } from "../components/icons";
import { useCart } from "../context/CartContext";
import { useCategories, useProductsByCategory, useSiteContent } from "../hooks/useCatalog";

function fmtPrice(product) {
  const price = product?.price;
  if (Number.isFinite(price)) return `$${price.toLocaleString("es-AR")}`;
  return "Consultar precio";
}

function ProductCard({ product }) {
  const nav = useNavigate();
  const { addToCart, setQuickViewProduct } = useCart();
  const [color, setColor] = useState(product.colors?.[0]);

  return (
    <div className="card" onClick={() => nav("/product/" + product.id)}>
      <div className="card__media">
        {product.imageUrl || product.image ? (
          <div className="card__img" style={{ backgroundImage: `url(${product.imageUrl || product.image})` }} />
        ) : (
          <div className="card__media-placeholder">{product.name}</div>
        )}
        {product.badge && <span className={"card__badge" + (product.badge === "SALE" || product.badge === "NUEVO" ? " card__badge--accent" : "")}>{product.badge}</span>}
        <div className="card__quick" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn--sm" onClick={() => addToCart(product, color)}>
            Agregar al carrito
          </button>
          <button className="icon-btn-square" onClick={() => setQuickViewProduct(product)} aria-label="Vista rápida">
            <Icon.Eye />
          </button>
        </div>
      </div>
      <div className="card__body">
        <span className="card__cat">{product.catName}</span>
        <div className="card__title">{product.name}</div>
        <div className="card__price">{fmtPrice(product)}</div>
        {product.colors && product.colors.length > 1 && (
          <div className="card__variants" onClick={(e) => e.stopPropagation()}>
            {product.colors.slice(0, 5).map((c) => (
              <button
                key={c.name}
                className={"card__variant" + (color?.name === c.name ? " active" : "")}
                style={{ background: c.hex }}
                onClick={() => setColor(c)}
                aria-label={c.name}
                title={c.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Category() {
  const { slug } = useParams();
  const nav = useNavigate();
  const categories = useCategories();
  const products = useProductsByCategory(slug);
  const site = useSiteContent();
  const { showToast } = useCart();

  const cat = useMemo(() => categories.data.find((c) => c.slug === slug || c.id === slug), [categories.data, slug]);
  const list = useMemo(() => (products.data || []).filter((p) => p?.active !== false), [products.data]);

  const [sort, setSort] = useState("featured");
  const [activeChip, setActiveChip] = useState("all");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  const sorted = useMemo(() => {
    const base = [...list];
    const filtered = (() => {
      if (activeChip === "all") return base;
      if (activeChip === "Stock inmediato") return base.filter((p) => (p.specs?.tiempo || "").toLowerCase().includes("stock"));
      if (activeChip === "A medida") return base.filter((p) => p.cat === "a-medida");
      if (activeChip === "Nuevos") return base.filter((p) => p.badge === "NUEVO");
      if (activeChip === "Más vendidos") return base.filter((p) => p.badge === "MÁS VENDIDO");
      return base;
    })();

    return filtered.sort((a, b) => {
      if (sort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
      if (sort === "new") return (b.badge === "NUEVO" ? 1 : 0) - (a.badge === "NUEVO" ? 1 : 0);
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [list, sort, activeChip]);

  if (categories.error || products.error || site.error) {
    const msg = categories.error || products.error || site.error;
    return (
      <div className="container" style={{ padding: 100 }}>
        <h2 className="h-section">Error cargando categoría</h2>
        <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
      </div>
    );
  }

  if (categories.loading || products.loading || site.loading) {
    return (
      <div className="container" style={{ padding: 80 }}>
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  if (slug === "productos") {
    return (
      <div className="fade-in">
        <div className="cat-hero">
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <nav className="crumbs">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/");
                  }}
                >
                  Inicio
                </a>
                <span className="sep">/</span>
                <span>Productos</span>
              </nav>
              <button
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  try {
                    const url = window.location.href;
                    if (navigator.share) {
                      await navigator.share({ title: "Picchio · Productos", url });
                      return;
                    }
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(url);
                      showToast("Link copiado");
                      return;
                    }
                    showToast(url);
                  } catch (_) {
                    showToast("No se pudo compartir");
                  }
                }}
              >
                Compartir
              </button>
            </div>
            <h1>Productos</h1>
            <p>Todos los productos disponibles.</p>
            <div className="chips" style={{ marginTop: 18, gap: 10, flexWrap: "wrap", overflowX: "visible" }}>
              <button
                className={"chip active"}
                onClick={() => nav("/cat/productos")}
              >
                Todos
              </button>
              {categories.data
                .filter((c) => c?.active !== false)
                .filter((c) => (c.slug || c.id) !== "cortinas")
                .map((c) => (
                  <button
                    key={c.slug || c.id}
                    className="chip"
                    onClick={() => nav("/cat/" + (c.slug || c.id))}
                  >
                    {c.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="cat-toolbar">
          <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="chips">
              {["all", "Stock inmediato", "A medida", "Nuevos", "Más vendidos"].map((c) => (
                <button key={c} className={"chip" + (activeChip === c ? " active" : "")} onClick={() => setActiveChip(c)}>
                  {c === "all" ? "Todos" : c}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
              <span className="muted">
                {sorted.length} producto{sorted.length !== 1 ? "s" : ""}
              </span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: "1px solid var(--line-strong)", padding: "8px 12px", borderRadius: 999, background: "transparent", fontSize: 13, fontWeight: 500 }}>
                <option value="featured">Destacados</option>
                <option value="new">Novedades</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container">
            {sorted.length > 0 ? (
              <div className="product-grid">
                {sorted.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
                No hay productos publicados todavía.
                <br />
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/");
                  }}
                  className="link-arrow"
                  style={{ marginTop: 14, display: "inline-flex" }}
                >
                  Volver a inicio
                </a>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (!cat) return <div className="container" style={{ padding: 100 }}>Categoría no encontrada</div>;

  async function onShare() {
    try {
      const url = window.location.href;
      const title = cat?.name ? `Picchio · ${cat.name}` : "Picchio";
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast("Link copiado");
        return;
      }
      showToast(url);
    } catch (_) {
      showToast("No se pudo compartir");
    }
  }

  return (
    <div className="fade-in">
      <div className="cat-hero">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <nav className="crumbs">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  nav("/");
                }}
              >
                Inicio
              </a>
              <span className="sep">/</span>
              <a
                href="/cat/productos"
                onClick={(e) => {
                  e.preventDefault();
                  nav("/cat/productos");
                }}
              >
                Productos
              </a>
              <span className="sep">/</span>
              <span>{cat.name}</span>
            </nav>
            <button className="btn btn--ghost btn--sm" onClick={onShare}>
              Compartir
            </button>
          </div>
          <h1>{cat.name}</h1>
          <p>{cat.tag}</p>
        </div>
      </div>

      <div className="cat-toolbar">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div className="chips">
            {["all", "Stock inmediato", "A medida", "Nuevos", "Más vendidos"].map((c) => (
              <button key={c} className={"chip" + (activeChip === c ? " active" : "")} onClick={() => setActiveChip(c)}>
                {c === "all" ? "Todos" : c}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
            <span className="muted">
              {sorted.length} producto{sorted.length !== 1 ? "s" : ""}
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: "1px solid var(--line-strong)", padding: "8px 12px", borderRadius: 999, background: "transparent", fontSize: 13, fontWeight: 500 }}>
              <option value="featured">Destacados</option>
              <option value="new">Novedades</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {sorted.length > 0 ? (
            <div className="product-grid">
              {sorted.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
              No hay productos publicados en esta categoría todavía.
              <br />
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  nav("/");
                }}
                className="link-arrow"
                style={{ marginTop: 14, display: "inline-flex" }}
              >
                Volver a inicio
              </a>
            </div>
          )}
        </div>
      </section>

      {slug === "cortinas" && (
        <section className="section" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
          <div className="container">
            <CortinasCalc variant="inline" cortinaImage={site.data.img.cortina} />
          </div>
        </section>
      )}
    </div>
  );
}

