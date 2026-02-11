(() => {
    const intro = document.getElementById("intro");
    const title = intro?.querySelector(".intro__title");
    if (!intro || !title) return;

    let latestScrollY = 0;
    let ticking = false;

    const update = () => {
      const isPhone = window.matchMedia("(max-width: 768px)").matches;
      const maxScroll = isPhone ? window.innerHeight * 0.38 : window.innerHeight;
      const progress = Math.min(Math.max(latestScrollY, 0) / maxScroll, 1);

      // scale 1 -> 1.7 (0.7 felt good)
      const scale = 1 + progress * 0.7;
      title.style.transform = `translate(-50%, -50%) scale(${scale})`;

      if (progress >= 0.999) {
        document.body.classList.add("intro-done");
      } else {
        document.body.classList.remove("intro-done");
      }

      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        latestScrollY = window.scrollY;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    // init (in case reload mid-scroll)
    latestScrollY = window.scrollY;
    requestAnimationFrame(update);
  })();
