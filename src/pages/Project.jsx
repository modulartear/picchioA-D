import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "../hooks/useCatalog";

export function Project() {
  const { id } = useParams();
  const nav = useNavigate();
  const state = useProject(id);
  const project = state.data;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  const media = useMemo(() => {
    const list = Array.isArray(project?.media) ? project.media : [];
    return list.slice().sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  }, [project]);

  if (state.error) {
    return (
      <div className="container" style={{ padding: 80 }}>
        <h2 className="h-section">Error cargando proyecto</h2>
        <p className="muted" style={{ marginTop: 12 }}>
          {state.error}
        </p>
      </div>
    );
  }
  if (state.loading) return <div className="container" style={{ padding: 80 }}><p className="muted">Cargando…</p></div>;
  if (!project) return <div className="container" style={{ padding: 80 }}><p className="muted">Proyecto no encontrado</p></div>;

  return (
    <div className="fade-in">
      <div className="container" style={{ paddingTop: 24 }}>
        <nav className="crumbs">
          <a
            href="/#proyectos"
            onClick={(e) => {
              e.preventDefault();
              nav({ pathname: "/", hash: "#proyectos" });
            }}
          >
            Proyectos
          </a>
          <span className="sep">/</span>
          <span>{project.title || "Detalle"}</span>
        </nav>
      </div>

      <section className="section section--tight">
        <div className="container">
          <h1 className="project-detail__title">{project.title || "Proyecto"}</h1>
          {project.tag ? <div className="project-detail__tag">{project.tag}</div> : null}
          {project.details ? <p className="project-detail__details">{project.details}</p> : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {media.length === 0 ? (
            <div className="muted" style={{ padding: 24 }}>
              Este proyecto no tiene fotos o videos cargados todavía.
            </div>
          ) : (
            <div className="project-media">
              {media.map((m, idx) => {
                const type = String(m?.type || "image");
                const url = String(m?.url || "");
                if (!url) return null;
                return (
                  <div className="project-media__item" key={m?.id || idx}>
                    {type === "video" ? <video src={url} controls /> : <img src={url} alt={`${project.title || "Proyecto"} ${idx + 1}`} loading="lazy" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

