import { useNavigate } from "react-router-dom";
import { Icon } from "./icons";

export function Footer() {
  const nav = useNavigate();
  return (
    <footer className="footer" id="contacto">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">
              <img src="/assets/picchio-logo.png" alt="Picchio" />
              <b>PICCHIO</b>
            </div>
            <p className="footer__tag">Somos fabricantes de muebles. Diseño, fabricación propia y entrega a todo el país.</p>
          </div>

          <div>
            <h4>Productos</h4>
            <ul>
              <li>
                <a
                  href="/cat/a-medida"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/a-medida");
                  }}
                >
                  A medida
                </a>
              </li>
              <li>
                <a
                  href="/cat/sillas"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/sillas");
                  }}
                >
                  Sillas
                </a>
              </li>
              <li>
                <a
                  href="/cat/oficina"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/oficina");
                  }}
                >
                  Oficina
                </a>
              </li>
              <li>
                <a
                  href="/cat/cortinas"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/cortinas");
                  }}
                >
                  Cortinas Roller
                </a>
              </li>
              <li>
                <a
                  href="/cat/living"
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/cat/living");
                  }}
                >
                  Sillones
                </a>
              </li>
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

