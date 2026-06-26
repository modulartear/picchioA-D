import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CortinasCalc } from "../components/CortinasCalc";
import { CatIcon, Icon } from "../components/icons";
import { ProductPriceBlock } from "../components/ProductPriceBlock";
import { useCart } from "../context/CartContext";
import { useHomeContent } from "../hooks/useCatalog";
import { getProductImageUrlForColor, getProductPrimaryImageUrl } from "../utils/productGallery";

function ProductCard({ product }) {
  const nav = useNavigate();
  const { addToCart, setQuickViewProduct } = useCart();
  const [color, setColor] = useState(product.colors?.[0]);
  const [variantTouched, setVariantTouched] = useState(false);
  const mainImgUrl = getProductPrimaryImageUrl(product);
  const imgUrl = variantTouched ? getProductImageUrlForColor(product, color?.name) || mainImgUrl : mainImgUrl;

  useEffect(() => {
    setColor(product.colors?.[0]);
    setVariantTouched(false);
  }, [product]);

  return (
    <div className="card" onClick={() => nav("/product/" + product.id)}>
      <div className="card__media">
        {imgUrl ? (
          <div className="card__img" style={{ backgroundImage: `url(${imgUrl})` }} />
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
        <ProductPriceBlock product={product} />
        {product.colors && product.colors.length > 1 && (
          <div className="card__variants" onClick={(e) => e.stopPropagation()}>
            {product.colors.slice(0, 5).map((c) => (
              <button
                key={c.name}
                className={"card__variant" + (color?.name === c.name ? " active" : "")}
                style={{ background: c.hex }}
                onClick={() => {
                  setColor(c);
                  setVariantTouched(true);
                }}
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
  const { featured, categories, projects, img, hero } = data;
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  function openCta(href, fallback) {
    const clean = String(href || "").trim();
    if (!clean) {
      fallback();
      return;
    }
    const isHttp = /^https?:\/\//i.test(clean);
    const isSpecial = /^(mailto:|tel:|whatsapp:)/i.test(clean);
    if (isHttp) {
      window.open(clean, "_blank", "noopener,noreferrer");
      return;
    }
    if (isSpecial) {
      window.location.href = clean;
      return;
    }
    if (clean.startsWith("#")) {
      const el = document.querySelector(clean);
      if (el) {
        const rect = el.getBoundingClientRect();
        const y = Math.max(0, window.scrollY + rect.top - 80);
        window.scrollTo({ top: y, behavior: "smooth" });
        return;
      }
      fallback();
      return;
    }
    nav(clean);
  }

  const heroSlides = useMemo(() => {
    const raw = Array.isArray(hero?.slides) ? hero.slides : [];
    const clean = raw.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 4);
    return clean.length > 0 ? clean : [String(img.heroLiving || "").trim()].filter(Boolean);
  }, [hero, img.heroLiving]);

  useEffect(() => {
    setHeroSlideIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [heroSlides]);

  function projectCover(p) {
    const media = Array.isArray(p?.media) ? p.media : [];
    const cover = String(p?.coverUrl || p?.image || p?.imageUrl || "").trim();
    const coverMatch = cover ? media.find((m) => String(m?.url || "").trim() === cover) : null;
    if (cover) {
      return {
        url: cover,
        type: String(coverMatch?.type || "image"),
      };
    }
    const firstImg = media.find((m) => String(m?.type || "image") === "image" && m?.url);
    const fallback = firstImg || media[0] || null;
    return {
      url: String(fallback?.url || "").trim(),
      type: String(fallback?.type || "image"),
    };
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
        {heroSlides.map((slide, idx) => (
          <div key={`${slide}-${idx}`} className={"hero__media" + (idx === heroSlideIndex ? " active" : "")} style={{ backgroundImage: `url(${slide})` }} />
        ))}
        <div className="hero__overlay" />
        <div className="container hero__content">
          <h1 className="hero__title">
            {hero?.titleLine1 || "Hacemos los muebles"}
            {String(hero?.titleLine2 || "").trim() ? (
              <>
                <br />
                {hero.titleLine2}
              </>
            ) : null}
            {String(hero?.highlightText || "").trim() ? (
              <>
                <br />
                <em>{hero.highlightText}</em>
              </>
            ) : null}
          </h1>
          <p className="hero__lead">{hero?.lead || "Diseño, fabricación propia y entrega a todo el país. Cocinas, placards, sillas, sillones y cortinas roller."}</p>
          <div className="hero__ctas">
            <button
              className="btn btn--primary btn--lg"
              onClick={() =>
                openCta(String(hero?.primaryCtaHref || "").trim() === "/cat/a-medida" ? "#proyectos" : hero?.primaryCtaHref || "#proyectos", () => {
                  const el = document.getElementById("proyectos");
                  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
                })
              }
            >
              {hero?.primaryCtaLabel || "Ver muebles a medida"} <Icon.Arrow style={{ width: 18, height: 18 }} />
            </button>
            <button
              className="btn btn--ghost btn--lg"
              onClick={() =>
                String(hero?.secondaryCtaHref || "").trim()
                  ? openCta(hero?.secondaryCtaHref, () => {
                      setCotizadorOpen(true);
                    })
                  : setCotizadorOpen(true)
              }
            >
              {hero?.secondaryCtaLabel || "Cotizar mi proyecto"}
            </button>
          </div>
          {heroSlides.length > 1 && (
            <div className="hero__dots" aria-label="Slides del hero">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={"hero__dot" + (idx === heroSlideIndex ? " active" : "")}
                  onClick={() => setHeroSlideIndex(idx)}
                  aria-label={`Ir al slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
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
          </div>

          <div className="product-grid">
            {featured.slice(0, 4).map((p) => (
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
            {(() => {
              const list = (projects || []).filter((p) => p?.active !== false);
              if (list.length === 0) return <div className="muted">Todavía no hay proyectos publicados.</div>;
              return list.map((p, idx) => (
                <div className="proj" key={p.id || idx} onClick={() => nav("/project/" + p.id)}>
                  {(() => {
                    const cover = projectCover(p);
                    if (!cover?.url) return <div className="proj__media proj__media--empty" />;
                    if (cover.type === "video") {
                      return <video className="proj__media proj__media--video" src={cover.url} muted playsInline autoPlay loop preload="metadata" />;
                    }
                    return <div className="proj__media" style={{ backgroundImage: `url(${cover.url})` }} />;
                  })()}
                  <div className="proj__caption">
                    <span className="proj__title">{p.title || "Proyecto"}</span>
                    {p.tag ? <span className="proj__tag">{p.tag}</span> : null}
                  </div>
                </div>
              ));
            })()}
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
                <div className="about__stat-num">10</div>
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

