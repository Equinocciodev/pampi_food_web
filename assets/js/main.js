/* Pampi · interacciones */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Navegación ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = document.getElementById("burger");
  const links = document.getElementById("navLinks");
  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Frasco cilíndrico con la etiqueta real ---------- */
  const label = document.getElementById("jarLabel");
  const stage = document.getElementById("jarStage");
  const IMG_RATIO = 1270 / 560; // proporción de etiqueta-banda.jpg
  const STRIPS = 72;
  let strips = [];
  let geo = null;
  let offset = 0;
  let velocity = 34; // px por segundo

  function buildJar() {
    const r = label.clientWidth / 2;
    const h = label.clientHeight;
    if (!r || !h) return;
    const labelW = h * IMG_RATIO;
    const step = Math.PI / STRIPS;
    const arc = r * step;

    label.innerHTML = "";
    strips = [];
    for (let i = 0; i < STRIPS; i++) {
      const t0 = -Math.PI / 2 + i * step;
      const x0 = r + r * Math.sin(t0);
      const x1 = r + r * Math.sin(t0 + step);
      const el = document.createElement("div");
      el.className = "strip";
      el.style.left = x0 + "px";
      el.style.width = arc + "px";
      el.style.backgroundSize = `${labelW}px ${h}px`;
      el.style.transform = `scaleX(${(x1 - x0 + 1.2) / arc})`;
      label.appendChild(el);
      strips.push({ el, s: r * (t0 + Math.PI / 2) });
    }
    const first = !geo;
    geo = { r, labelW };
    // al inicio, el logo "Pampi" queda de frente
    if (first) offset = 0.475 * labelW - (r * Math.PI) / 2 - arc / 2;
    paint();
  }

  function paint() {
    if (!geo) return;
    // la etiqueta da exactamente una vuelta: el final empalma con el inicio
    const C = geo.labelW;
    for (const st of strips) {
      const u = (((offset + st.s) % C) + C) % C;
      st.el.style.backgroundPosition = `${-u}px 0`;
    }
  }

  let dragging = false, lastX = 0, lastT = 0, dragV = 0;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastT = performance.now(); dragV = 0;
    stage.classList.add("is-dragging");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    offset -= dx * 1.3;
    dragV = (-dx * 1.3) / Math.max(16, now - lastT) * 1000;
    lastX = e.clientX; lastT = now;
    paint();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    velocity = Math.max(-1600, Math.min(1600, dragV || velocity));
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  let prev = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (!dragging && !reduceMotion) {
      // vuelve suavemente a la velocidad de crucero
      const cruise = velocity >= 0 ? 34 : -34;
      velocity += (cruise - velocity) * Math.min(1, dt * 1.6);
      offset += velocity * dt;
      paint();
    }
    requestAnimationFrame(tick);
  }

  const img = new Image();
  img.onload = () => { buildJar(); requestAnimationFrame(tick); };
  img.src = "assets/img/etiqueta-banda.jpg";
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(buildJar, 150); });

  /* ---------- Parallax de hojas y tomates ---------- */
  const floaters = document.querySelectorAll(".floater");
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      floaters.forEach((f) => {
        const d = parseFloat(f.dataset.depth) || 1;
        f.style.transform = `translate(${cx * 40 * d}px, ${cy * 40 * d}px)`;
      });
    });
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      en.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  function countUp(el) {
    const target = parseInt(el.dataset.count, 10);
    if (reduceMotion || target === 0) { el.textContent = target; return; }
    const dur = 1400;
    const t0 = performance.now();
    const run = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  /* ---------- Pestañas de recetas ---------- */
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".recipe");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === tab.dataset.tab;
        p.hidden = !on;
        p.classList.toggle("is-active", on);
      });
    });
  });

  /* ---------- Despensa arrastrable ---------- */
  const shelf = document.getElementById("shelf");
  let sDown = false, sX = 0, sLeft = 0;
  shelf.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    sDown = true; sX = e.clientX; sLeft = shelf.scrollLeft;
    shelf.classList.add("is-dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!sDown) return;
    shelf.scrollLeft = sLeft - (e.clientX - sX);
  });
  window.addEventListener("pointerup", () => { sDown = false; shelf.classList.remove("is-dragging"); });

  /* ---------- Filtros de la despensa ---------- */
  const chips = document.querySelectorAll(".chip");
  const items = document.querySelectorAll(".item");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-active", c === chip));
      const f = chip.dataset.filter;
      items.forEach((it, i) => {
        const show = f === "all" || it.dataset.cat === f;
        it.hidden = !show;
        it.classList.remove("is-entering");
        if (show) {
          void it.offsetWidth;
          it.style.animationDelay = (i % 6) * 0.05 + "s";
          it.classList.add("is-entering");
        }
      });
      shelf.scrollTo({ left: 0, behavior: "smooth" });
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
