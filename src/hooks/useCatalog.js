import { useEffect, useMemo, useState } from "react";
import {
  fetchCategories,
  fetchFeaturedProducts,
  fetchProductById,
  fetchProductsByCategory,
  fetchProjects,
  fetchSiteContent,
  fetchTestimonials,
} from "../services/catalog";

function describeError(e) {
  const code = e?.code ? String(e.code) : "";
  const message = e?.message ? String(e.message) : "";
  if (code && message) return `${code}: ${message}`;
  return message || code || "Error";
}

export function useCategories() {
  const [state, setState] = useState({ loading: true, data: [], error: "" });

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ loading: false, data: [], error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function useFeaturedProducts(limit = 8) {
  const [state, setState] = useState({ loading: true, data: [], error: "" });

  useEffect(() => {
    let alive = true;
    fetchFeaturedProducts(limit)
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ loading: false, data: [], error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  return state;
}

export function useProductsByCategory(slug) {
  const [state, setState] = useState({ loading: true, data: [], error: "" });

  useEffect(() => {
    let alive = true;
    if (!slug) return;
    setState((s) => ({ ...s, loading: true }));
    fetchProductsByCategory(slug)
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ loading: false, data: [], error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return state;
}

export function useProduct(id) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let alive = true;
    if (!id) return;
    setState((s) => ({ ...s, loading: true }));
    fetchProductById(id)
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ loading: false, data: null, error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}

export function useSiteContent() {
  const [state, setState] = useState({ loading: true, data: { img: {} }, error: "" });

  useEffect(() => {
    let alive = true;
    fetchSiteContent()
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ loading: false, data: { img: {} }, error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function useHomeContent() {
  const site = useSiteContent();
  const featured = useFeaturedProducts(8);
  const categories = useCategories();

  const [projects, setProjects] = useState({ loading: true, data: [], error: "" });
  const [testimonials, setTestimonials] = useState({ loading: true, data: [], error: "" });

  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((data) => {
        if (!alive) return;
        setProjects({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setProjects({ loading: false, data: [], error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchTestimonials()
      .then((data) => {
        if (!alive) return;
        setTestimonials({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!alive) return;
        setTestimonials({ loading: false, data: [], error: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, []);

  const loading = site.loading || featured.loading || categories.loading || projects.loading || testimonials.loading;
  const error = site.error || featured.error || categories.error || projects.error || testimonials.error;

  const data = useMemo(() => {
    return {
      img: site.data.img || {},
      featured: (featured.data || []).filter((p) => p?.active !== false),
      categories: (categories.data || []).filter((c) => c?.active !== false),
      projects: projects.data || [],
      testimonials: testimonials.data || [],
    };
  }, [site.data, featured.data, categories.data, projects.data, testimonials.data]);

  return { loading, error, data };
}
