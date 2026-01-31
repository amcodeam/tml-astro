const initLineup = () => {
  const schedule = globalThis.tmlSchedule;
  if (!schedule) {
    return;
  }

  const { loadSelections, selected, toggleSelection } = schedule;
  const viewSections = document.querySelectorAll("[data-view-section]");
  if (!viewSections.length) {
    return;
  }

  const stageSearchInputs = document.querySelectorAll("[data-stage-search]");
  const artistSearchInputs = document.querySelectorAll("[data-artist-search]");
  const searchClearButtons = document.querySelectorAll(".search-clear");
  const viewButtons = document.querySelectorAll("[data-view-button]");
  const weekButtons = document.querySelectorAll("[data-week-button]");
  const dayButtons = document.querySelectorAll("[data-day-button]");
  const dayLabel = document.getElementById("day-label");
  const footerMessage = document.getElementById("footer-message");
  const easterEggImages = JSON.parse(
    document.body.dataset.easterEggImages || "[]"
  )
    .map((image) => (typeof image === "string" ? image : image?.src))
    .filter(Boolean);
  const easterEggEmoji = document.body.dataset.easterEggEmoji || "🔥";
  let footerClickCount = 0;
  let footerClickTimer;
  let activeView = "stages";
  let activeWeek = weekButtons[0]?.dataset.week;
  let activeDay = dayButtons[0]?.dataset.day;

  const hydrateSelectionStyles = () => {
    selected.forEach((entry) => {
      document
        .querySelectorAll(
          `.artist[data-artist="${entry.artist}"][data-stage="${entry.stage}"][data-week="${entry.week}"][data-day="${entry.day}"]`
        )
        .forEach((item) => {
          item.classList.add("selected");
        });
    });
  };

  const bindArtistButton = (button) => {
    const isDisabled = button.dataset.disabled === "true";
    if (isDisabled) {
      button.classList.add("disabled");
      button.setAttribute("disabled", "true");
      return;
    }
    button.addEventListener("click", () => {
      toggleSelection({
        artist: button.dataset.artist,
        stage: button.dataset.stage,
        week: button.dataset.week,
        day: button.dataset.day,
        dayName: button.dataset.dayName,
      });
    });
  };

  const artistButtons = document.querySelectorAll(".artist");
  const allEntries = new Map();
  artistButtons.forEach((button) => {
    if (button.dataset.disabled === "true") {
      return;
    }
    const entry = {
      artist: button.dataset.artist,
      stage: button.dataset.stage,
      week: button.dataset.week,
      day: button.dataset.day,
      dayName: button.dataset.dayName,
    };
    const key = `${entry.week}|${entry.day}|${entry.artist}|${entry.stage}`;
    if (!allEntries.has(key)) {
      allEntries.set(key, entry);
    }
  });

  const renderSearchResults = (section, query) => {
    const results = section.querySelector("[data-search-results]");
    const stageContent = section.querySelector("[data-stage-content]");
    const artistContent = section.querySelector("[data-artist-content]");

    if (!results) {
      return;
    }

    if (!query) {
      results.classList.add("hidden");
      results.innerHTML = "";
      if (stageContent) {
        stageContent.classList.remove("hidden");
      }
      if (artistContent) {
        artistContent.classList.remove("hidden");
      }
      return;
    }

    const matches = [...allEntries.values()].filter((entry) =>
      entry.artist.toLowerCase().includes(query)
    );

    results.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No matching artists found.";
      results.appendChild(empty);
    } else {
      matches
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .forEach((entry) => {
          const card = document.createElement("article");
          card.className = "search-card";

          const info = document.createElement("div");
          const title = document.createElement("h4");
          title.textContent = entry.artist;
          info.appendChild(title);

          const stage = document.createElement("p");
          stage.className = "meta";
          stage.textContent = entry.stage;
          info.appendChild(stage);

          const details = document.createElement("p");
          details.className = "meta";
          const weekLabel = entry.week === "W1" ? "Week 1" : "Week 2";
          const dayName = entry.dayName ? entry.dayName : "";
          details.textContent = `${weekLabel} · ${dayName} · ${entry.day}`;
          info.appendChild(details);

          const button = document.createElement("button");
          button.className = "artist";
          button.type = "button";
          button.dataset.artist = entry.artist;
          button.dataset.stage = entry.stage;
          button.dataset.week = entry.week;
          button.dataset.day = entry.day;
          button.dataset.dayName = entry.dayName;
          button.textContent = "Select";

          const key = `${entry.week}|${entry.day}|${entry.artist}|${entry.stage}`;
          if (selected.has(key)) {
            button.classList.add("selected");
          }

          bindArtistButton(button);
          card.appendChild(info);
          card.appendChild(button);
          results.appendChild(card);
        });
    }

    results.classList.remove("hidden");
    if (stageContent) {
      stageContent.classList.add("hidden");
    }
    if (artistContent) {
      artistContent.classList.add("hidden");
    }
  };

  const updateVisibleSections = () => {
    viewSections.forEach((section) => {
      const matchesView = section.dataset.viewSection === activeView;
      const matchesWeek = section.dataset.week === activeWeek;
      const matchesDay = section.dataset.day === activeDay;
      section.classList.toggle(
        "hidden",
        !(matchesView && matchesWeek && matchesDay)
      );
    });
  };

  const updateDayButtons = () => {
    let firstVisibleDay = null;
    dayButtons.forEach((button) => {
      const isVisible = button.dataset.week === activeWeek;
      button.classList.toggle("hidden", !isVisible);
      if (isVisible && !firstVisibleDay) {
        firstVisibleDay = button;
      }
    });

    if (firstVisibleDay && firstVisibleDay.dataset.day !== activeDay) {
      setActiveDay(firstVisibleDay.dataset.day);
    }
  };

  const setActiveDay = (dayValue) => {
    activeDay = dayValue;
    dayButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.day === dayValue);
    });
    const labelButton = document.querySelector(
      `[data-day-button][data-day="${dayValue}"]`
    );
    if (labelButton && dayLabel) {
      dayLabel.textContent = `${labelButton.textContent.replace(/\s+/g, " ")}`;
    }
    updateVisibleSections();
  };

  const clearSearchInputs = () => {
    document.querySelectorAll(".search input").forEach((input) => {
      if (!input.value) {
        return;
      }
      input.value = "";
      const clearButton = input.closest(".search")?.querySelector(".search-clear");
      if (clearButton) {
        clearButton.classList.remove("visible");
      }
      const section = input.closest("[data-view-section]");
      if (section) {
        renderSearchResults(section, "");
      }
    });
  };

  const setActiveWeek = (weekValue) => {
    activeWeek = weekValue;
    weekButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.week === weekValue);
    });
    updateDayButtons();
    updateVisibleSections();
  };

  stageSearchInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const section = event.target.closest("[data-view-section]");
      if (section) {
        renderSearchResults(section, event.target.value.toLowerCase());
      }
      const clearButton = event.target
        .closest(".search")
        ?.querySelector(".search-clear");
      if (clearButton) {
        clearButton.classList.toggle("visible", event.target.value.length > 0);
      }
    });
  });

  artistSearchInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const section = event.target.closest("[data-view-section]");
      if (section) {
        renderSearchResults(section, event.target.value.toLowerCase());
      }
      const clearButton = event.target
        .closest(".search")
        ?.querySelector(".search-clear");
      if (clearButton) {
        clearButton.classList.toggle("visible", event.target.value.length > 0);
      }
    });
  });

  searchClearButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".search")?.querySelector("input");
      if (!input) {
        return;
      }
      input.value = "";
      button.classList.remove("visible");
      const section = input.closest("[data-view-section]");
      if (section) {
        renderSearchResults(section, "");
      }
      input.focus();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetView = button.dataset.view;
      activeView = targetView;

      viewButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      updateVisibleSections();
      clearSearchInputs();
    });
  });

  weekButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveWeek(button.dataset.week);
      clearSearchInputs();
    });
  });

  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveDay(button.dataset.day);
      clearSearchInputs();
    });
  });

  const triggerEasterEgg = () => {
    if (document.querySelector(".easter-egg")) {
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "easter-egg";

    const colors = [
      "#ff6b6b",
      "#f7b267",
      "#ffd166",
      "#7bdff2",
      "#cdb4db",
      "#f28482",
    ];
    for (let i = 0; i < 70; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${Math.random() * 100}vw`);
      piece.style.setProperty("--delay", `${Math.random() * 1.5}s`);
      piece.style.setProperty("--duration", `${2 + Math.random() * 2.5}s`);
      piece.style.setProperty(
        "--rotate",
        `${Math.floor(Math.random() * 360)}deg`
      );
      piece.style.setProperty(
        "--confetti-color",
        colors[Math.floor(Math.random() * colors.length)]
      );
      overlay.appendChild(piece);
    }

    const bouncers = [];
    const sources = easterEggImages.length ? easterEggImages : [null];
    sources.forEach((src) => {
      const bouncer = document.createElement("div");
      bouncer.className = "easter-egg-bouncer";
      if (src) {
        bouncer.style.backgroundImage = `url(${src})`;
      } else {
        bouncer.classList.add("emoji");
        bouncer.textContent = easterEggEmoji;
      }
      overlay.appendChild(bouncer);
      const speed = 280 + Math.random() * 220;
      const angle = Math.random() * Math.PI * 2;
      bouncers.push({
        element: bouncer,
        size: 144,
        x: 40 + Math.random() * (window.innerWidth - 200),
        y: 40 + Math.random() * (window.innerHeight - 200),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: (Math.random() * 220 - 110) * (Math.PI / 180),
        rotation: Math.random() * 360,
      });
    });

    document.body.appendChild(overlay);
    const startTime = performance.now();
    let lastTime = startTime;
    let rafId;

    const animateBouncers = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const width = window.innerWidth;
      const height = window.innerHeight;

      bouncers.forEach((bouncer) => {
        bouncer.x += bouncer.vx * delta;
        bouncer.y += bouncer.vy * delta;
        bouncer.rotation += bouncer.spin;

        if (bouncer.x <= 0) {
          bouncer.x = 0;
          bouncer.vx = Math.abs(bouncer.vx);
        } else if (bouncer.x + bouncer.size >= width) {
          bouncer.x = width - bouncer.size;
          bouncer.vx = -Math.abs(bouncer.vx);
        }

        if (bouncer.y <= 0) {
          bouncer.y = 0;
          bouncer.vy = Math.abs(bouncer.vy);
        } else if (bouncer.y + bouncer.size >= height) {
          bouncer.y = height - bouncer.size;
          bouncer.vy = -Math.abs(bouncer.vy);
        }

        bouncer.element.style.transform = `translate(${bouncer.x}px, ${bouncer.y}px) rotate(${bouncer.rotation}deg)`;
      });

      if (time - startTime < 10000 && overlay.isConnected) {
        rafId = requestAnimationFrame(animateBouncers);
      }
    };

    rafId = requestAnimationFrame(animateBouncers);
    setTimeout(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      overlay.remove();
    }, 10000);
  };

  footerMessage?.addEventListener("click", () => {
    footerClickCount += 1;
    clearTimeout(footerClickTimer);
    footerClickTimer = setTimeout(() => {
      footerClickCount = 0;
    }, 1200);
    if (footerClickCount >= 2) {
      footerClickCount = 0;
      triggerEasterEgg();
    }
  });

  loadSelections();
  hydrateSelectionStyles();
  updateDayButtons();
  updateVisibleSections();
};

document.addEventListener("astro:page-load", initLineup);
globalThis.addEventListener("tml:schedule-ready", initLineup, { once: true });
initLineup();
