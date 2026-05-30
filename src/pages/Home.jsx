import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CortinasCalc } from "../components/CortinasCalc";
import { CatIcon, Icon } from "../components/icons";
import { useCart } from "../context/CartContext";
import { useHomeContent } from "../hooks/useCatalog";

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

export function Home() {
  const nav = useNavigate();
  const { setCotizadorOpen } = useCart();
  const { loading, error, data } = useHomeContent();
  const { featured, categories, projects, testimonials, img } = data;
  const clsByIndex = ["proj--a", "proj--b", "proj--c", "proj--d", "proj--e"];

  function projectCover(p) {
    const cover = String(p?.coverUrl || p?.image || p?.imageUrl || "").trim();
    if (cover) return cover;
    const media = Array.isArray(p?.media) ? p.media : [];
    const firstImg = media.find((m) => String(m?.type || "image") === "image" && m?.url);
    return String(firstImg?.url || media[0]?.url || "").trim();
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 80 }}>
        <h2 className="h-section">No se pudo cargar el catálogo</h2>
        <p className="muted" style={{ marginTop: 12 }}>
          {error}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: 80 }}>
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <section className="hero">
        <div className="hero__media" style={{ backgroundImage: `url(${img.heroLiving})` }} />
        <div className="container hero__meta">
          <span>Venado Tuerto · Fab. desde hace 25 años</span>
          <span>Colección 2026</span>
        </div>
        <div className="container hero__content">
          <span className="hero__eyebrow">Nuevos lanzamientos</span>
          <h1 className="hero__title">
            Hacemos los muebles
            <br />
            <em>que imaginás.</em>
          </h1>
          <p className="hero__lead">Diseño, fabricación propia y entrega a todo el país. Cocinas, placards, sillas, sillones y cortinas roller.</p>
          <div className="hero__ctas">
            <button className="btn btn--primary btn--lg" onClick={() => nav("/cat/a-medida")}>
              Ver muebles a medida <Icon.Arrow style={{ width: 18, height: 18 }} />
            </button>
            <button className="btn btn--ghost btn--lg" onClick={() => setCotizadorOpen(true)}>
              Cotizar mi proyecto
            </button>
          </div>
        </div>
      </section>

      <div className="cortinas-banner">
        <div className="container cortinas-banner__inner">
          <div className="cortinas-banner__text">
            <span className="cortinas-banner__dot" />
            <span>
              <b>Nuevo:</b> cotizá tus cortinas roller online · Precio al instante
            </span>
          </div>
          <button
            className="btn btn--sm"
            onClick={() => {
              setTimeout(() => {
                const el = document.getElementById("cortinas-calc");
                if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
              }, 40);
            }}
          >
            Probar cotizador <Icon.Arrow style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: 0 }}>
        <div className="cat-strip">
          {categories.map((c) => (
            <div className="cat-strip__item" key={c.slug || c.id} onClick={() => nav("/cat/" + (c.slug || c.id))}>
              {CatIcon[c.icon]}
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Más vendidos</span>
              <h2 className="h-section" style={{ marginTop: 8 }}>
                Lo que más se elige
                <br />
                <em>esta temporada.</em>
              </h2>
            </div>
            <div className="section-head__aside">
              <p className="muted">Una selección de productos con stock o entrega rápida. Tocá cualquiera para vista rápida o agregar al carrito.</p>
              <a
                href="/cat/sillas"
                className="link-arrow"
                onClick={(e) => {
                  e.preventDefault();
                  nav("/cat/sillas");
                }}
                style={{ marginTop: 14 }}
              >
                Ver todos los productos <Icon.Arrow style={{ width: 14, height: 14 }} />
              </a>
            </div>
          </div>

          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ padding: 0 }}>
        <div className="split">
          <div className="split__media" style={{ backgroundImage: `url(${img.aMedida})` }} />
          <div className="split__body">
            <span className="eyebrow">A medida · desde 1999</span>
            <h2 className="h-section">
              Cocinas y placards
              <br />
              <em>diseñados para tu espacio.</em>
            </h2>
            <p className="lead">Visitamos tu casa o local, tomamos medidas, te entregamos un render 3D y recién ahí fabricamos.</p>

            <ul className="split__list">
              <li>
                <span className="num">01</span>
                <div>
                  <b>Visita técnica sin cargo</b>
                  <span>Vamos a tu casa o local en zona Venado Tuerto.</span>
                </div>
              </li>
              <li>
                <span className="num">02</span>
                <div>
                  <b>Diseño 3D y presupuesto cerrado</b>
                  <span>Vas a ver el mueble antes de fabricarlo.</span>
                </div>
              </li>
              <li>
                <span className="num">03</span>
                <div>
                  <b>Fabricación e instalación</b>
                  <span>De 30 a 60 días según complejidad. Garantía Picchio.</span>
                </div>
              </li>
            </ul>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn btn--accent btn--lg" onClick={() => setCotizadorOpen(true)}>
                Cotizar mi proyecto <Icon.Arrow style={{ width: 18, height: 18 }} />
              </button>
              <button className="btn btn--ghost btn--lg" onClick={() => nav("/cat/a-medida")}>
                Ver proyectos
              </button>
            </div>
          </div>
        </div>
      </section>

      <CortinasCalc variant="section" cortinaImage={img.cortina} />

      <section className="section" id="proyectos">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Proyectos realizados</span>
              <h2 className="h-section" style={{ marginTop: 8 }}>
                De nuestro taller
                <br />
                <em>a tu ambiente.</em>
              </h2>
            </div>
            <div className="section-head__aside">
              <p className="muted">Una muestra de los últimos años.</p>
            </div>
          </div>

          <div className="projects">
            {(projects || []).filter((p) => p?.active !== false).map((p, idx) => (
              <div className={"proj " + (p.cls || clsByIndex[idx % clsByIndex.length])} key={p.id}>
                <div className="proj__media" style={{ backgroundImage: `url(${projectCover(p)})` }} />
                <div className="proj__caption">
                  <span>{p.title || "Proyecto"}</span>
                  <span style={{ opacity: 0.85, fontWeight: 500 }}>{p.tag || ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="nosotros" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container about">
          <div className="about__media" style={{ backgroundImage: `url(${img.aboutShop})` }} />
          <div>
            <span className="eyebrow">Nosotros</span>
            <h2 className="h-section" style={{ marginTop: 8 }}>
              Una fábrica.
              <br />
              Una familia. <em>Una marca.</em>
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              Picchio nació en Venado Tuerto como una carpintería de barrio y hoy fabrica para clientes de toda la Argentina.
            </p>
            <div className="about__stats">
              <div>
                <div className="about__stat-num">25</div>
                <div className="about__stat-label">años fabricando</div>
              </div>
              <div>
                <div className="about__stat-num">1.2k</div>
                <div className="about__stat-label">proyectos entregados</div>
              </div>
              <div>
                <div className="about__stat-num">7</div>
                <div className="about__stat-label">líneas de producto</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Lo que dicen los clientes</span>
              <h2 className="h-section" style={{ marginTop: 8 }}>
                Calificación promedio
                <br />
                <em>4.9 / 5</em>
              </h2>
            </div>
          </div>

          <div className="quotes">
            {testimonials.map((t) => (
              <div className="quote" key={t.name}>
                <div className="quote__stars">{"★★★★★".slice(0, t.stars || 5)}</div>
                <p className="quote__text">"{t.text}"</p>
                <div className="quote__author">
                  <div className="quote__avatar">{t.initials}</div>
                  <div>
                    <div className="quote__name">{t.name}</div>
                    <div className="quote__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" style={{ background: "var(--surface)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 44px" }}>
              <Icon.Truck style={{ width: 22, height: 22, color: "var(--accent)" }} />
            </div>
            <div>
              <b style={{ display: "block", marginBottom: 4 }}>Envíos a todo el país</b>
              <span className="muted" style={{ fontSize: 14 }}>
                Coordinamos con transporte propio o flete. Envío gratis en Venado Tuerto.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 44px" }}>
              <Icon.Store style={{ width: 22, height: 22, color: "var(--accent)" }} />
            </div>
            <div>
              <b style={{ display: "block", marginBottom: 4 }}>Showroom propio</b>
              <span className="muted" style={{ fontSize: 14 }}>
                Almafuerte 201, Venado Tuerto. Lun a Vie 8:30-12:30 y 16-19:30.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 44px" }}>
              <Icon.WhatsApp style={{ width: 22, height: 22, color: "var(--accent)" }} />
            </div>
            <div>
              <b style={{ display: "block", marginBottom: 4 }}>Asesoramiento por WhatsApp</b>
              <span className="muted" style={{ fontSize: 14 }}>
                3462 415161 · Respondemos en horario comercial.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

