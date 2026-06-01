import { useNavigate } from "react-router-dom";
import { Icon } from "./icons";
import { useCategories } from "../hooks/useCatalog";

export function Footer() {
  const nav = useNavigate();
  const categoriesState = useCategories();
  const categories = (categoriesState.data || []).filter((c) => c?.active !== false);
  return (
    <footer className="footer" id="contacto">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">
              <img src="/assets/ChatGPT%20Image%2029%20may%202026%2C%2019_13_38.png" alt="Picchio" />
            </div>
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
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Envíos a todo el país
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Cómo comprar
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
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
          <span>Hecho con orgullo en Venado Tuerto</span>
        </div>
      </div>
    </footer>
  );
}

