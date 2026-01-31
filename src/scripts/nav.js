const initNav = () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const drawer = document.querySelector("[data-nav-drawer]");
  if (!toggle || !drawer) {
    return;
  }

  if (toggle.dataset.bound === "true") {
    return;
  }
  toggle.dataset.bound = "true";
  document.body.dataset.navInit = "true";

  const closeNav = () => {
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
  };

  const openNav = () => {
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
  };

  toggle.addEventListener("click", () => {
    if (document.body.classList.contains("nav-open")) {
      closeNav();
    } else {
      openNav();
    }
  });

  document.querySelectorAll("[data-nav-close]").forEach((button) => {
    button.addEventListener("click", closeNav);
  });

  drawer.addEventListener("click", (event) => {
    if (
      event.target.closest("[data-nav-link]") ||
      event.target.closest("[data-open-schedule]") ||
      event.target.closest("[data-share]")
    ) {
      closeNav();
    }
  });
};

document.addEventListener("astro:page-load", initNav);
initNav();
