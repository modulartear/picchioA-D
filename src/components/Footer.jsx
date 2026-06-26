import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./icons";
import { useCategories } from "../hooks/useCatalog";

export function Footer() {
  const nav = useNavigate();
  const categoriesState = useCategories();
  const categories = (categoriesState.data || []).filter((c) => c?.active !== false);
  const [helpModal, setHelpModal] = useState("");

  const helpContent = useMemo(() => {
    return {
      shipping: {
        title: "Envíos a todo el país",
        body: [
          "Hacemos envíos a todo el país. Coordinamos la logística según tu localidad y el tipo de producto.",
          "En Venado Tuerto podés coordinar entrega local o retiro en showroom.",
          "Una vez confirmado el pedido, te informamos costos, plazos estimados y opción de seguimiento.",
        ],
      },
      buying: {
        title: "Cómo comprar",
        body: [
          "Elegí el producto y agregalo al carrito. Podés seleccionar variantes (color) cuando estén disponibles.",
          "Completá tus datos y envíanos el pedido. Te respondemos para confirmar stock, tiempos y forma de pago.",
          "Si es un trabajo a medida, coordinamos visita/medición y avanzamos con propuesta y presupuesto.",
        ],
      },
      returns: {
        title: "Cambios y devoluciones",
        body: [
          "Si tu compra no llegó en condiciones o hay un error con el producto, escribinos para resolverlo.",
          "Los productos a medida y personalizados se gestionan caso a caso, ya que se fabrican especialmente para tu pedido.",
          "Para iniciar un cambio o devolución, contactanos con tu número de pedido y fotos del producto.",
        ],
      },
    };
  }, []);

  useEffect(() => {
    if (!helpModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") setHelpModal("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpModal]);

  const modal = helpModal && helpContent[helpModal] ? (
    <div className="modal-backdrop open" onClick={() => setHelpModal("")}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 100%)" }}>
        <button className="modal__close" onClick={() => setHelpModal("")} aria-label="Cerrar">
          <Icon.Close />
        </button>
        <div style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{helpContent[helpModal].title}</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {helpContent[helpModal].body.map((p, idx) => (
              <p key={idx} className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return (
    <footer className="footer" id="contacto">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">
              <img src="/assets/ChatGPT%20Image%2029%20may%202026%2C%2019_13_38.png" alt="Picchio" />
            </div>
            <p className="footer__tag">Somos fabricantes de muebles. Diseño, fabricación propia y entrega a todo el país.</p>
          </div>

          <div>
            <h4>Productos</h4>
            <ul>
              <li>
                <a
                  href="/cat/productos"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/productos");
                  }}
                >
                  Todos
                </a>
              </li>
              {categories.map((c) => {
                const slug = String(c.slug || c.id || "").trim();
                if (!slug) return null;
                return (
                  <li key={slug}>
                    <a
                      href={"/cat/" + slug}
                      onClick={(e) => {
                        e.preventDefault();
                        nav("/cat/" + slug);
                      }}
                    >
                      {c.name || slug}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4>Ayuda</h4>
            <ul>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHelpModal("shipping");
                  }}
                >
                  Envíos a todo el país
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHelpModal("buying");
                  }}
                >
                  Cómo comprar
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHelpModal("returns");
                  }}
                >
                  Cambios y devoluciones
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Showroom Venado Tuerto
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Cotizar un mueble a medida
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <div className="footer__contact">
              <div className="row">
                <Icon.Pin />
                <span>
                  Almafuerte 201
                  <br />
                  Venado Tuerto, Santa Fe (2600)
                </span>
              </div>
              <div className="row">
                <Icon.Mail />
                <a href="mailto:picchioamob@outlook.com" style={{ color: "inherit", textDecoration: "none" }}>
                  picchioamob@outlook.com
                </a>
              </div>
              <div className="row">
                <Icon.Clock />
                <span>
                  Lun a Vie · 8:30 a 12:30
                  <br />
                  16:00 a 19:30
                </span>
              </div>
              <div className="row">
                <Icon.Phone />
                <span>WhatsApp 3462 415161</span>
              </div>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 Picchio Amoblamiento + Diseño</span>
          <span>
            Hecho con orgullo en Venado Tuerto por{" "}
            <a href="https://disearte.vercel.app/" target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "underline" }}>
              DiseArte
            </a>
          </span>
        </div>
      </div>
      {modal}
    </footer>
  );
}

