/* =========================
   Utils
========================= */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const snapIn = (t) => 1 - Math.pow(1 - t, 8);

const seg = (p, a, b) => clamp((p - a) / (b - a));
const segEase = (p, a, b, easeFn = easeInOut) => easeFn(seg(p, a, b));

const getScrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

const setTransform = (el, yPct, scale = 1) => {
    el.style.transform = `translate3d(0, ${yPct}%, 0) scale(${scale})`;
};

const setVisible = (el, on) => {
    el.style.visibility = on ? "visible" : "hidden";
};

/* =========================
   Config
========================= */
const CFG = {
    smoothing: 0.05,

    // closer to 1 = less “rush” early
    progressWarp: 1,

    bgCuts: [0.35, 0.55, 0.72, 0.98],
    bgFade: 0.06,

    forest1Enter: [0.25, 0.35],
    forest1Zoom: [0.30, 0.62],
    forest1Exit: [0.62, 0.70],
    scene2Gate: 0.60,

    mountain1Enter: [0.17, 0.25],
    mountain1ExitDown: [0.62, 0.72],

    forest2Enter: [0.62, 0.68],
    forest2Zoom: [0.68, 0.92],
    mountain2Enter: [0.64, 0.70],

    endOut: [0.92, 0.985],

    starsStart: 0.985,
    textShow: 0.987,
    textAnim: [0.987, 0.998],
    startJourneyIn: [0.02, 0.15],
    startJourneyOut: [0.31, 0.45],

    starStrength: 18,
    starFollow: 0.08,
    forest1ScaleMax: 1.6,
    forest2ScaleMax: 1.65,
};

/* =========================
   Elements
========================= */
const $ = (id) => document.getElementById(id);

const el = {
    debug: $("debug"),
    hint: $("hint"),

    bg: {
        day: $("bgDay"),
        preSunset: $("bgPreSunset"),
        sunset: $("bgSunset"),
        preNight: $("bgPreNight"),
        contact: $("bgContactNight"),
    },

    fg: {
        mountain1: $("mountain1"),
        forest1: $("forest1"),
        mountain2: $("mountain2"),
        forest2: $("forest2"),
    },

    stars: $("stars"),
    headline: $("headline"),
    startJourney: $("startJourney"),
    startJourneyChevron: $("startJourneyChevron"),
    contact: $("contact"),
    contactSocial: $("contactSocial"),
};

const BG_LIST = [
    el.bg.day,
    el.bg.preSunset,
    el.bg.sunset,
    el.bg.preNight,
    el.bg.contact,
];

const CONTACT_FINAL_TEXT = el.contact
    ? (el.contact.dataset.finalText || el.contact.textContent || "").replace(/\s+/g, " ").trim()
    : "";

const contactReveal = {
    played: false,
};

function setupContactRevealText() {
    if (!el.contact || !CONTACT_FINAL_TEXT) return;

    el.contact.setAttribute("aria-label", CONTACT_FINAL_TEXT);
    el.contact.textContent = "";
    let letterIndex = 0;
    for (let i = 0; i < CONTACT_FINAL_TEXT.length; i++) {
        const ch = CONTACT_FINAL_TEXT[i];
        const span = document.createElement("span");
        span.className = "contact-char";
        if (ch === " ") {
            span.classList.add("contact-char--space");
            span.textContent = "\u00A0";
        } else {
            span.style.setProperty("--char-index", String(letterIndex));
            span.textContent = ch;
            letterIndex += 1;
        }
        el.contact.appendChild(span);
    }
}
setupContactRevealText();

/* =========================
   Scroll progress
========================= */
let targetP = 0;
let smoothP = 0;

function updateProgress() {
    const root = document.getElementById("contact-scene-root");
    if (!root) return { y: 0, maxScroll: 1 };

    const y = getScrollTop();
    const start = root.offsetTop;
    const end = start + root.offsetHeight - window.innerHeight;
    const maxScroll = Math.max(1, end - start);

    // progress only within the contact section
    const pRaw = clamp((y - start) / maxScroll);

    // ⭐ keep your warp behavior (kills dead space INSIDE the section)
    targetP = clamp(Math.pow(pRaw, CFG.progressWarp));

    return { y, maxScroll };
}

/* =========================
   Backgrounds (smooth crossfade)
========================= */
function resetBGOpacity() {
    for (const b of BG_LIST) b.style.opacity = "0";
}

function crossfade(p, prevEl, nextEl, k) {
    const t = segEase(p, k - CFG.bgFade, k + CFG.bgFade, easeInOut);
    prevEl.style.opacity = String(1 - t);
    nextEl.style.opacity = String(t);
}

function setBackgroundsSmooth(p) {
    resetBGOpacity();

    const [k1, k2, k3, k4] = CFG.bgCuts;
    const FADE = CFG.bgFade;

    if (p < k1 - FADE) {
        el.bg.day.style.opacity = "1";
    } else if (p < k1 + FADE) {
        crossfade(p, el.bg.day, el.bg.preSunset, k1);
    } else if (p < k2 - FADE) {
        el.bg.preSunset.style.opacity = "1";
    } else if (p < k2 + FADE) {
        crossfade(p, el.bg.preSunset, el.bg.sunset, k2);
    } else if (p < k3 - FADE) {
        el.bg.sunset.style.opacity = "1";
    } else if (p < k3 + FADE) {
        crossfade(p, el.bg.sunset, el.bg.preNight, k3);
    } else if (p < k4 - FADE) {
        el.bg.preNight.style.opacity = "1";
    } else if (p < k4 + FADE) {
        crossfade(p, el.bg.preNight, el.bg.contact, k4);
    } else {
        el.bg.contact.style.opacity = "1";
    }

    for (const b of BG_LIST) b.style.filter = "none";
}

/* =========================
   Stars (pointer parallax)
========================= */
let starTX = 0, starTY = 0;
let starX = 0, starY = 0;

function setStarTargetFromPointer(x, y) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = x / w - 0.5;
    const ny = y / h - 0.5;

    const s = CFG.starStrength;
    starTX = nx * 2 * s;
    starTY = ny * 2 * s;
}

window.addEventListener("mousemove", (e) => setStarTargetFromPointer(e.clientX, e.clientY), { passive: true });

window.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    setStarTargetFromPointer(t.clientX, t.clientY);
}, { passive: true });

/* =========================
   Main loop
========================= */
function tick() {
    const { y, maxScroll } = updateProgress();

    smoothP = lerp(smoothP, targetP, CFG.smoothing);

    if (el.debug) {
        el.debug.textContent =
            `scrollY: ${Math.round(y)}\n` +
            `max:     ${Math.round(maxScroll)}\n` +
            `pRaw:    ${clamp(y / maxScroll).toFixed(3)}\n` +
            `pWarp:   ${targetP.toFixed(3)}\n` +
            `smooth:  ${smoothP.toFixed(3)}`;
    }

    if (el.hint) el.hint.style.opacity = smoothP > 0.02 ? "0" : "1";

    // Backgrounds
    setBackgroundsSmooth(smoothP);

    // Opening prompt on day scene (before mountain1 comes in)
    if (el.startJourney) {
        const uiP = targetP;
        const dayOnly = uiP < (CFG.bgCuts[0] - CFG.bgFade);
        const beforeMountains = uiP < CFG.mountain1Enter[0];
        const inT = segEase(uiP, ...CFG.startJourneyIn, easeOut);
        const outT = segEase(uiP, ...CFG.startJourneyOut, easeInOut);
        const alpha = dayOnly && beforeMountains ? clamp(inT * (1 - outT)) : 0;
        const y = lerp(20, 0, inT) + lerp(0, -12, outT);
        el.startJourney.style.opacity = alpha.toFixed(3);
        el.startJourney.style.transform = `translate3d(-50%, calc(-50% + ${y.toFixed(2)}px), 0)`;

        if (el.startJourneyChevron) {
            const chevronY = y + 56;
            el.startJourneyChevron.style.opacity = alpha.toFixed(3);
            el.startJourneyChevron.style.transform = `translate3d(-50%, calc(-50% + ${chevronY.toFixed(2)}px), 0)`;
        }
    }

    // Visibility sequencing
    setVisible(el.fg.mountain1, smoothP < 0.98);
    setVisible(el.fg.forest1, smoothP >= 0.18 && smoothP < 0.98);

    const allowScene2 = smoothP >= CFG.scene2Gate;
    setVisible(el.fg.forest2, allowScene2 && smoothP < 0.98);
    setVisible(el.fg.mountain2, allowScene2 && smoothP < 0.98);

    // mountain1 snap-in
    {
        const t = segEase(smoothP, ...CFG.mountain1Enter, snapIn);
        const yPos = lerp(120, 0, t);
        setTransform(el.fg.mountain1, yPos, 1);
    }

    // mountain1 exits DOWN when scene2 starts coming in
    {
        const tDown = segEase(smoothP, ...CFG.mountain1ExitDown, easeInOut);
        if (smoothP >= CFG.mountain1ExitDown[0]) {
            setTransform(el.fg.mountain1, lerp(0, 180, tDown), 1);
        }
    }

    // forest1 snap-in + zoom + exit (DOWN)
    {
        const tEnter = segEase(smoothP, ...CFG.forest1Enter, snapIn);
        const yIn = lerp(120, 0, tEnter);

        const tZoom = segEase(smoothP, ...CFG.forest1Zoom, easeInOut);
        const s = lerp(1.0, CFG.forest1ScaleMax, tZoom);

        let yPos = smoothP < CFG.forest1Enter[1] ? yIn : 0;

        const tExit = segEase(smoothP, ...CFG.forest1Exit, easeInOut);
        if (smoothP >= CFG.forest1Exit[0]) yPos = lerp(0, 160, tExit);

        setTransform(el.fg.forest1, yPos, s);
    }

    // forest2 (only after forest1 full zoom)
    if (allowScene2) {
        const tEnter = segEase(smoothP, ...CFG.forest2Enter, snapIn);
        const yIn = lerp(120, 0, tEnter);
        const yPos = smoothP < CFG.forest2Enter[1] ? yIn : 0;

        const tZoom = segEase(smoothP, ...CFG.forest2Zoom, easeInOut);
        const s = lerp(1.0, CFG.forest2ScaleMax, tZoom);

        setTransform(el.fg.forest2, yPos, s);
    }

    // mountain2
    if (allowScene2) {
        const t = segEase(smoothP, ...CFG.mountain2Enter, snapIn);
        setTransform(el.fg.mountain2, lerp(120, 0, t), 1);
    }

    // End: move all foreground out (DOWN)
    {
        const tOut = segEase(smoothP, ...CFG.endOut, easeInOut);
        const outY = lerp(0, 240, tOut);

        if (smoothP >= CFG.endOut[0]) {
            el.fg.mountain1.style.transform = `translate3d(0, ${outY}%, 0) scale(1)`;
            el.fg.forest1.style.transform = `translate3d(0, ${outY}%, 0) scale(${CFG.forest1ScaleMax})`;
            el.fg.forest2.style.transform = `translate3d(0, ${outY}%, 0) scale(${CFG.forest2ScaleMax})`;
            el.fg.mountain2.style.transform = `translate3d(0, ${outY}%, 0) scale(1)`;
        }
    }

    // Stars: ONLY after everything is gone
    const starsOn = smoothP >= CFG.starsStart ? 1 : 0;
    el.stars.style.opacity = String(starsOn);
    el.stars.style.visibility = starsOn ? "visible" : "hidden";

    if (starsOn) {
        const time = performance.now() * 0.00025;
        const driftX = Math.sin(time) * 3;
        const driftY = Math.cos(time * 0.9) * 2;

        starX = lerp(starX, starTX, CFG.starFollow);
        starY = lerp(starY, starTY, CFG.starFollow);

        el.stars.style.transform = `translate3d(${(starX + driftX).toFixed(2)}px, ${(starY + driftY).toFixed(2)}px, 0) scale(1.03)`;
    }

    // Text: ONLY after everything is gone
    {
        const show = starsOn && smoothP >= CFG.textShow;
        if (el.headline) el.headline.style.opacity = show ? "1" : "0";
        if (el.contact) {
            el.contact.style.opacity = show ? "1" : "0";
            el.contact.style.visibility = show ? "visible" : "hidden";
        }
        if (el.contactSocial) {
            el.contactSocial.style.opacity = show ? "1" : "0";
            el.contactSocial.style.visibility = show ? "visible" : "hidden";
            if (show) {
                if (!el.contactSocial.classList.contains("is-visible")) {
                    el.contactSocial.classList.add("is-visible");
                }
            } else {
                el.contactSocial.classList.remove("is-visible");
            }
        }

        if (el.contact && CONTACT_FINAL_TEXT) {
            if (show && !contactReveal.played) {
                el.contact.classList.remove("is-revealed");
                void el.contact.offsetWidth;
                el.contact.classList.add("is-revealed");
                contactReveal.played = true;
            }
            if (!show && contactReveal.played) {
                el.contact.classList.remove("is-revealed");
                contactReveal.played = false;
            }
        }

        const t = show ? segEase(smoothP, ...CFG.textAnim, easeOut) : 0;
        const tSocial = show ? segEase(smoothP, CFG.textAnim[0] + 0.002, CFG.textAnim[1], easeOut) : 0;

        if (el.headline) el.headline.style.transform = `translate3d(0, ${lerp(28, 0, t).toFixed(2)}px, 0)`;
        if (el.contact) el.contact.style.transform = `translate3d(0, ${lerp(34, 0, t).toFixed(2)}px, 0)`;
        if (el.contactSocial) el.contactSocial.style.transform = `translate3d(0, ${lerp(20, 0, tSocial).toFixed(2)}px, 0)`;
    }

    requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
