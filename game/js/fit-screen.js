function fitGameToViewport() {
  const app = document.querySelector(".mr-app");
  if (!app) return;

  const designWidth = 1500;
  const designHeight = 923;

  const scale = Math.min(
    window.innerWidth / designWidth,
    window.innerHeight / designHeight,
    1
  );

  app.style.setProperty("--fit-scale", String(scale));
}

window.addEventListener("resize", fitGameToViewport);
window.addEventListener("orientationchange", fitGameToViewport);
document.addEventListener("DOMContentLoaded", fitGameToViewport);
fitGameToViewport();
