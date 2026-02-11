(() => {
  const root = document.documentElement;
  const loader = document.getElementById("pageLoader");
  const countNode = document.getElementById("pageLoaderCount");

  if (!loader || !countNode) {
    root.classList.remove("is-loading");
    return;
  }

  let progress = 0;
  let done = false;
  let rafId = 0;
  const startedAt = performance.now();
  const durationMs = 2200;

  const render = () => {
    countNode.textContent = String(progress);
  };

  const tick = (now) => {
    if (done) return;

    const elapsed = now - startedAt;
    const next = Math.min(99, Math.floor((elapsed / durationMs) * 100));
    progress = Math.max(progress, next);
    render();

    rafId = window.requestAnimationFrame(tick);
  };

  const finish = () => {
    if (done) return;
    done = true;

    if (rafId) window.cancelAnimationFrame(rafId);
    progress = 100;
    render();

    loader.classList.add("is-done");
    root.classList.remove("is-loading");

    window.setTimeout(() => {
      loader.remove();
    }, 380);
  };

  if (document.readyState === "complete") {
    finish();
    return;
  }

  rafId = window.requestAnimationFrame(tick);
  window.addEventListener("load", finish, { once: true });
})();
