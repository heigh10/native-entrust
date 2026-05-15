const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const menu = document.querySelector("[data-menu]");
const cycleWord = document.querySelector("[data-cycle-word]");
const heroMedia = document.querySelector(".hero-media");
const heroCanvas = document.querySelector("[data-hero-canvas]");
const heroSlides = [...document.querySelectorAll(".hero-slide")];
const statNumbers = [...document.querySelectorAll(".impact-stats strong")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  header.classList.toggle("menu-active", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

menu.addEventListener("click", (event) => {
  if (!event.target.closest("a")) {
    return;
  }

  menuButton.setAttribute("aria-expanded", "false");
  header.classList.remove("menu-active");
  document.body.classList.remove("menu-open");
});

if (cycleWord) {
  const words = ["Control", "Legacy", "Clarity"];
  let activeWord = 0;

  window.setInterval(() => {
    cycleWord.classList.add("is-changing");

    window.setTimeout(() => {
      activeWord = (activeWord + 1) % words.length;
      cycleWord.textContent = words[activeWord];
      cycleWord.classList.remove("is-changing");
    }, 180);
  }, 3000);
}

const easeInOutCubic = (value) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2);
const seededRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const loadHeroImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const drawCoverImage = (context, image, width, height, scale = 1) => {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  const drawHeight = imageRatio > canvasRatio ? height * scale : (width / imageRatio) * scale;
  const drawWidth = imageRatio > canvasRatio ? drawHeight * imageRatio : width * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
};

const raggedEdgeX = (heightPosition, sweepX, amplitude, seed) =>
  sweepX +
  Math.sin(heightPosition * 0.018 + seed) * amplitude * 0.55 +
  Math.sin(heightPosition * 0.047 + seed * 1.7) * amplitude * 0.3 +
  Math.sin(heightPosition * 0.091 + seed * 2.4) * amplitude * 0.15;

if (heroMedia && heroCanvas && heroSlides.length > 1) {
  const context = heroCanvas.getContext("2d");
  const outgoingCanvas = document.createElement("canvas");
  const outgoingContext = outgoingCanvas.getContext("2d");
  const heroSources = heroSlides.map((slide) => slide.currentSrc || slide.src);
  let activeSlide = heroSlides.findIndex((slide) => slide.classList.contains("is-active"));
  let isTransitioning = false;
  let heroImages = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (activeSlide < 0) {
    activeSlide = 0;
    heroSlides[0].classList.add("is-active");
  }

  const resizeHeroCanvas = () => {
    const bounds = heroMedia.getBoundingClientRect();

    canvasWidth = Math.max(1, Math.round(bounds.width));
    canvasHeight = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width = Math.round(canvasWidth * dpr);
    heroCanvas.height = Math.round(canvasHeight * dpr);
    heroCanvas.style.width = `${canvasWidth}px`;
    heroCanvas.style.height = `${canvasHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    outgoingCanvas.width = Math.round(canvasWidth * dpr);
    outgoingCanvas.height = Math.round(canvasHeight * dpr);
    outgoingContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (heroImages[activeSlide]) {
      drawStillHero();
    }
  };

  const drawStillHero = () => {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    drawCoverImage(context, heroImages[activeSlide], canvasWidth, canvasHeight, 1);
  };

  const applyOrganicMask = (targetContext, progress, seed) => {
    const eased = easeInOutCubic(progress);
    const sweepX = -canvasWidth * 0.32 + eased * canvasWidth * 1.64;
    const amplitude = canvasWidth * (0.055 + 0.025 * Math.sin(progress * Math.PI));

    targetContext.save();
    targetContext.globalCompositeOperation = "destination-out";
    targetContext.beginPath();
    targetContext.moveTo(-canvasWidth * 0.5, -canvasHeight * 0.1);

    for (let y = -canvasHeight * 0.12; y <= canvasHeight * 1.12; y += canvasHeight / 18) {
      targetContext.lineTo(raggedEdgeX(y, sweepX, amplitude, seed), y);
    }

    targetContext.lineTo(-canvasWidth * 0.5, canvasHeight * 1.2);
    targetContext.closePath();
    targetContext.fill();

    for (let index = 0; index < 34; index += 1) {
      const randomA = seededRandom(seed + index * 1.31);
      const randomB = seededRandom(seed + index * 2.17);
      const randomC = seededRandom(seed + index * 3.11);
      const radius = (canvasWidth * (0.018 + randomC * 0.07)) * (0.3 + eased * 0.9);
      const x = sweepX + (randomA - 0.64) * canvasWidth * 0.34;
      const y = randomB * canvasHeight;

      targetContext.globalAlpha = 0.5 + randomC * 0.5;
      targetContext.beginPath();
      targetContext.ellipse(x, y, radius * (1.2 + randomA), radius * (0.62 + randomB * 0.8), randomA * Math.PI, 0, Math.PI * 2);
      targetContext.fill();
    }

    targetContext.restore();

    return { amplitude, sweepX };
  };

  const drawPaperEdge = (paintContext, progress, seed, sweepX, amplitude) => {
    const paperAlpha = Math.sin(Math.min(progress, 0.82) * Math.PI) * 0.36;
    paintContext.save();
    paintContext.globalAlpha = Math.max(0, paperAlpha);
    paintContext.fillStyle = "rgba(251, 249, 244, 0.58)";
    paintContext.beginPath();

    for (let y = -canvasHeight * 0.12; y <= canvasHeight * 1.12; y += canvasHeight / 16) {
      const edgeX = raggedEdgeX(y, sweepX, amplitude, seed);
      const spread = canvasWidth * (0.045 + seededRandom(seed + y * 0.02) * 0.055);
      const x = edgeX + spread;

      if (y < -canvasHeight * 0.1) {
        paintContext.moveTo(x, y);
      } else {
        paintContext.lineTo(x, y);
      }
    }

    for (let y = canvasHeight * 1.12; y >= -canvasHeight * 0.12; y -= canvasHeight / 16) {
      const edgeX = raggedEdgeX(y, sweepX, amplitude * 0.65, seed + 2.4);
      paintContext.lineTo(edgeX - canvasWidth * 0.018, y);
    }

    paintContext.closePath();
    paintContext.fill();
    paintContext.restore();
  };

  const animateHeroTransition = () => {
    if (isTransitioning || !heroImages.length) {
      return;
    }

    const nextSlide = (activeSlide + 1) % heroSlides.length;
    const currentImage = heroImages[activeSlide];
    const nextImage = heroImages[nextSlide];
    const seed = window.performance.now() * 0.001;
    const duration = 2350;
    const startedAt = window.performance.now();

    isTransitioning = true;

    const render = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);

      context.clearRect(0, 0, canvasWidth, canvasHeight);
      drawCoverImage(context, nextImage, canvasWidth, canvasHeight, 1);
      outgoingContext.clearRect(0, 0, canvasWidth, canvasHeight);
      drawCoverImage(outgoingContext, currentImage, canvasWidth, canvasHeight, 1);
      const edge = applyOrganicMask(outgoingContext, progress, seed);
      context.drawImage(outgoingCanvas, 0, 0, canvasWidth, canvasHeight);
      drawPaperEdge(context, progress, seed, edge.sweepX, edge.amplitude);

      if (progress < 1) {
        window.requestAnimationFrame(render);
        return;
      }

      heroSlides.forEach((slide) => {
        slide.classList.remove("is-active");
      });
      heroSlides[nextSlide].classList.add("is-active");
      activeSlide = nextSlide;
      isTransitioning = false;
      drawStillHero();
    };

    window.requestAnimationFrame(render);
  };

  Promise.all(heroSources.map(loadHeroImage))
    .then((images) => {
      heroImages = images;
      resizeHeroCanvas();
      heroMedia.classList.add("is-canvas-ready");
      window.setInterval(animateHeroTransition, 6200);
      window.addEventListener("resize", resizeHeroCanvas, { passive: true });
    })
    .catch(() => {
      heroMedia.classList.remove("is-canvas-ready");
    });
}

const parseStatValue = (value) => {
  const normalized = value.trim().replace("-", "–");
  const range = normalized.match(/^(\d+)\s*–\s*(\d+)(%|x)$/i);
  const single = normalized.match(/^(\d+)(%|x)?$/i);

  if (range) {
    return {
      type: "range",
      low: Number(range[1]),
      high: Number(range[2]),
      suffix: range[3],
    };
  }

  if (single) {
    return {
      type: "single",
      value: Number(single[1]),
      suffix: single[2] || "",
    };
  }

  return null;
};

const formatStatValue = (config, progress) => {
  if (config.type === "range") {
    return `${Math.round(config.low * progress)}–${Math.round(config.high * progress)}${config.suffix}`;
  }

  return `${Math.round(config.value * progress)}${config.suffix}`;
};

const animateStatValue = (element) => {
  if (element.dataset.counted === "true") {
    return;
  }

  const finalValue = element.dataset.finalValue || element.textContent.trim();
  const config = parseStatValue(finalValue);

  element.dataset.counted = "true";
  element.dataset.finalValue = finalValue;

  if (!config) {
    element.textContent = finalValue;
    return;
  }

  const duration = 1200;
  const startedAt = window.performance.now();

  const tick = (now) => {
    const elapsed = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);

    element.textContent = formatStatValue(config, eased);

    if (elapsed < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    element.textContent = finalValue;
  };

  element.textContent = formatStatValue(config, 0);
  window.requestAnimationFrame(tick);
};

if (statNumbers.length) {
  if ("IntersectionObserver" in window) {
    const statObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          animateStatValue(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    statNumbers.forEach((number) => statObserver.observe(number));
  } else {
    statNumbers.forEach(animateStatValue);
  }
}
