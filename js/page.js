(() => {
  const container = document.querySelector(".showcase-container");
  const sky = document.getElementById("sky");
  if (!container || !sky) return;
  const isSmallTouch = window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;

  if (isSmallTouch) {
    sky.style.setProperty("--mx", "0");
    sky.style.setProperty("--my", "0");
    sky.classList.add("is-leaving");
    return;
  }

  let mx = 0,
    my = 0; // current
  let tx = 0,
    ty = 0; // target
  let rafId = null;

  const setCSSVars = () => {
    sky.style.setProperty("--mx", mx.toFixed(4));
    sky.style.setProperty("--my", my.toFixed(4));
  };

  const animate = () => {
    const ease = sky.classList.contains("is-leaving") ? 0.045 : 0.09;

    mx += (tx - mx) * ease;
    my += (ty - my) * ease;

    setCSSVars();

    if (Math.abs(tx - mx) < 0.0005 && Math.abs(ty - my) < 0.0005) {
      mx = tx;
      my = ty;
      setCSSVars();
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!rafId) rafId = requestAnimationFrame(animate);
  };

  const setTargetFromEvent = (clientX, clientY) => {
    const r = sky.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;

    tx = x - 0.5;
    ty = y - 0.5;

    sky.classList.remove("is-leaving");
    start();
  };

  const leaveToCenter = () => {
    sky.classList.add("is-leaving");
    tx = 0;
    ty = 0;
    start();
  };

  container.addEventListener("mousemove", (e) =>
    setTargetFromEvent(e.clientX, e.clientY)
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches?.[0];
      if (t) setTargetFromEvent(t.clientX, t.clientY);
    },
    { passive: true }
  );

  container.addEventListener("mouseleave", leaveToCenter);
})();

/* =========================
   PAINTING: Zzz + Awake swap + Pupils follow pointer (ENTIRE PAGE/BODY) - SMOOTH RAF
========================= */
(() => {
  const host = document.getElementById("openPdfButton");
  if (!host) return;

  const img = document.getElementById("paintingImage");
  const zLayer = host.querySelector(".zzz-layer");
  const eyesLayer = host.querySelector(".eyes-layer");
  const pupilL = host.querySelector(".pupil--left");
  const pupilR = host.querySelector(".pupil--right");

  const awakeSrc = host.dataset.awakeSrc || "./assets/images/whiteh.png";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let isAwake = false;

  let zAlive = !reduceMotion;
  let zTimer = null;

  const spawnZ = () => {
    if (!zAlive || isAwake) return;

    const el = document.createElement("div");
    el.className = "zzz";
    el.textContent = "Z";

    const size = 18 + Math.random() * 28;
    const dx = (Math.random() * 40 + 10) * (Math.random() > 0.5 ? 1 : -1);
    const dy = -(Math.random() * 80 + 55);
    const scale = 1 + Math.random() * 0.9;
    const dur = 1200 + Math.random() * 900;

    el.style.fontSize = `${size}px`;
    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--s", scale.toFixed(2));
    el.style.animation = `zzz-float ${dur}ms ease-out forwards`;

    zLayer.appendChild(el);

    setTimeout(() => (el.textContent = "z"), dur * 0.25);
    setTimeout(() => (el.textContent = "z"), dur * 0.55);
    setTimeout(() => (el.textContent = "z"), dur * 0.8);

    el.addEventListener("animationend", () => el.remove(), { once: true });

    const nextIn = 260 + Math.random() * 420;
    zTimer = setTimeout(spawnZ, nextIn);
  };

  const stopZzz = () => {
    zAlive = false;
    if (zTimer) {
      clearTimeout(zTimer);
      zTimer = null;
    }
    zLayer.innerHTML = "";
  };

  if (!reduceMotion) spawnZ();

  document.addEventListener("visibilitychange", () => {
    if (reduceMotion) return;
    zAlive = !document.hidden && !isAwake;
    if (zAlive && !zTimer) spawnZ();
    if (!zAlive && zTimer) {
      clearTimeout(zTimer);
      zTimer = null;
    }
  });

  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;

  const setPupilOffset = (pupil, tx, ty) => {
    pupil.style.setProperty("--px", `${tx.toFixed(3)}px`);
    pupil.style.setProperty("--py", `${ty.toFixed(3)}px`);
  };

  let curLx = 0, curLy = 0;
  let curRx = 0, curRy = 0;

  let tgtLx = 0, tgtLy = 0;
  let tgtRx = 0, tgtRy = 0;

  let raf = null;

  const resetPupils = () => {
    curLx = curLy = curRx = curRy = 0;
    tgtLx = tgtLy = tgtRx = tgtRy = 0;
    setPupilOffset(pupilL, 0, 0);
    setPupilOffset(pupilR, 0, 0);
  };

  const startRAF = () => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };

  const computeTargetsFromPoint = (clientX, clientY) => {
    if (!isAwake) return;

    const r = host.getBoundingClientRect();
    const css = getComputedStyle(host);

    const lx = parseFloat(css.getPropertyValue("--eyeL-x")) / 100;
    const ly = parseFloat(css.getPropertyValue("--eyeL-y")) / 100;
    const rx = parseFloat(css.getPropertyValue("--eyeR-x")) / 100;
    const ry = parseFloat(css.getPropertyValue("--eyeR-y")) / 100;

    const eyeLx = r.left + r.width * lx;
    const eyeLy = r.top + r.height * ly;
    const eyeRx = r.left + r.width * rx;
    const eyeRy = r.top + r.height * ry;

    const maxR = parseFloat(css.getPropertyValue("--pupil-max")) || 4;

    {
      const dx = clientX - eyeLx;
      const dy = clientY - eyeLy;
      const len = Math.hypot(dx, dy) || 1;
      tgtLx = (dx / len) * maxR;
      tgtLy = (dy / len) * maxR;
    }

    {
      const dx = clientX - eyeRx;
      const dy = clientY - eyeRy;
      const len = Math.hypot(dx, dy) || 1;
      tgtRx = (dx / len) * maxR;
      tgtRy = (dy / len) * maxR;
    }

    startRAF();
  };

  const tick = () => {
    raf = null;
    if (!isAwake) return;

    const ease = 0.18;

    curLx += (tgtLx - curLx) * ease;
    curLy += (tgtLy - curLy) * ease;
    curRx += (tgtRx - curRx) * ease;
    curRy += (tgtRy - curRy) * ease;

    setPupilOffset(pupilL, curLx, curLy);
    setPupilOffset(pupilR, curRx, curRy);

    const done =
      Math.abs(tgtLx - curLx) < 0.02 &&
      Math.abs(tgtLy - curLy) < 0.02 &&
      Math.abs(tgtRx - curRx) < 0.02 &&
      Math.abs(tgtRy - curRy) < 0.02;

    if (!done) raf = requestAnimationFrame(tick);
  };

  const activateAwake = (clientX, clientY) => {
    if (isAwake) return;
    isAwake = true;

    img.src = awakeSrc;
    stopZzz();

    eyesLayer.classList.add("is-on");
    host.classList.add("is-awake");

    resetPupils();

    const x = clientX ?? lastX ?? window.innerWidth / 2;
    const y = clientY ?? lastY ?? window.innerHeight / 2;
    lastX = x;
    lastY = y;
    computeTargetsFromPoint(x, y);
  };

  host.addEventListener("click", (e) => {
    e.preventDefault();

    lastX = e.clientX;
    lastY = e.clientY;

    if (isAwake) {
      return;
    }

    host.classList.remove("is-shaking");
    void host.offsetWidth;
    host.classList.add("is-shaking");

    const onShakeEnd = (ev) => {
      if (ev.animationName !== "painting-shake") return;
      host.removeEventListener("animationend", onShakeEnd);
      host.classList.remove("is-shaking");
      activateAwake(e.clientX, e.clientY);
    };

    host.addEventListener("animationend", onShakeEnd);
  });

  host.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();

    if (!isAwake) activateAwake(lastX, lastY);
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      computeTargetsFromPoint(lastX, lastY);
    },
    { passive: true }
  );

  window.addEventListener("blur", () => {
    if (!isAwake) return;
    resetPupils();
  });
})();
