const convexUrl = document.body.dataset.convexUrl;
let convexClientPromise;
const updateArtistCount = "artistCounts:updateArtistCount";

const getConvexClient = () => {
  if (!convexUrl) {
    return Promise.resolve(null);
  }
  if (!convexClientPromise) {
    convexClientPromise = import("https://esm.sh/convex@1.31.6/browser")
      .then(({ ConvexClient }) => new ConvexClient(convexUrl))
      .catch((error) => {
        console.error("Convex client failed to load", error);
        return null;
      });
  }
  return convexClientPromise;
};

const selected = new Map();
const stageSearchInputs = document.querySelectorAll("[data-stage-search]");
const artistSearchInputs = document.querySelectorAll("[data-artist-search]");
const searchClearButtons = document.querySelectorAll(".search-clear");
const viewButtons = document.querySelectorAll("[data-view-button]");
const viewSections = document.querySelectorAll("[data-view-section]");
const weekButtons = document.querySelectorAll("[data-week-button]");
const dayButtons = document.querySelectorAll("[data-day-button]");
const dayLabel = document.getElementById("day-label");
const copyButton = document.getElementById("copy-schedule");
const shareButtons = document.querySelectorAll("[data-share]");
const openScheduleButton = document.getElementById("open-schedule");
const schedulePanel = document.getElementById("schedule-panel");
const scheduleContent = document.getElementById("schedule-content");
const scheduleCount = document.getElementById("schedule-count");
const clearScheduleButton = document.getElementById("clear-schedule");
const footerMessage = document.getElementById("footer-message");
const easterEggImages = JSON.parse(
  document.body.dataset.easterEggImages || "[]"
)
  .map((image) => (typeof image === "string" ? image : image?.src))
  .filter(Boolean);
let footerClickCount = 0;
let footerClickTimer;
let activeView = "stages";
let activeWeek = weekButtons[0]?.dataset.week;
let activeDay = dayButtons[0]?.dataset.day;

const updateArtistStats = (entry, delta) => {
  getConvexClient()
    .then((client) => {
      if (!client) {
        return null;
      }
      return client.mutation(updateArtistCount, {
        artist: entry.artist,
        week: entry.week,
        delta,
      });
    })
    .catch((error) => {
      console.error("Failed to update artist stats", error);
    });
};

const updateSelected = () => {
  if (scheduleCount) {
    scheduleCount.textContent = String(selected.size);
  }
  renderSchedulePanel();
};

const bindArtistButton = (button) => {
  const isDisabled = button.dataset.disabled === "true";
  if (isDisabled) {
    button.classList.add("disabled");
    button.setAttribute("disabled", "true");
    return;
  }
  button.addEventListener("click", () => {
    const entry = {
      artist: button.dataset.artist,
      stage: button.dataset.stage,
      week: button.dataset.week,
      day: button.dataset.day,
      dayName: button.dataset.dayName,
    };
    const key = `${entry.week}|${entry.day}|${entry.artist}|${entry.stage}`;
    const isSelected = selected.has(key);
    if (isSelected) {
      selected.delete(key);
      updateArtistStats(entry, -1);
    } else {
      selected.set(key, entry);
      updateArtistStats(entry, 1);
    }
    document
      .querySelectorAll(
        `.artist[data-artist="${entry.artist}"][data-stage="${entry.stage}"][data-week="${entry.week}"][data-day="${entry.day}"]`
      )
      .forEach((item) => {
        item.classList.toggle("selected", !isSelected);
      });
    updateSelected();
  });
};

const artistButtons = document.querySelectorAll(".artist");
artistButtons.forEach((button) => {
  bindArtistButton(button);
});

const allEntries = new Map();
document.querySelectorAll(".artist").forEach((button) => {
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
        const dayLabel = entry.dayName ? entry.dayName : "";
        details.textContent = `${weekLabel} · ${dayLabel} · ${entry.day}`;
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

const buildShareText = () => {
  if (!selected.size) {
    return "";
  }

  const grouped = new Map();
  const weekLabel = (week) => (week === "W1" ? "Week 1" : "Week 2");
  const dayLabels = new Map();

  selected.forEach((entry) => {
    if (!grouped.has(entry.week)) {
      grouped.set(entry.week, new Map());
    }
    const weekGroup = grouped.get(entry.week);
    if (!weekGroup.has(entry.day)) {
      weekGroup.set(entry.day, []);
    }
    weekGroup.get(entry.day).push(entry);
    if (!dayLabels.has(entry.day) && entry.dayName) {
      dayLabels.set(entry.day, entry.dayName);
    }
  });

  const lines = ["Checkout my tml 2026 dj picks 🔥", ""];
  [...grouped.keys()]
    .sort()
    .forEach((week) => {
      lines.push(weekLabel(week));
      const dates = grouped.get(week);
      [...dates.keys()]
        .sort()
        .forEach((date) => {
          const dayName = dayLabels.get(date);
          lines.push(dayName ? `${dayName} ${date}` : date);
          lines.push("");
          dates
            .get(date)
            .sort((a, b) => a.artist.localeCompare(b.artist))
            .forEach((entry) => {
              lines.push(`${entry.artist} - ${entry.stage}`);
            });
          lines.push("");
        });
    });
  lines.push("create your schedule on https://mytml26.ameercode.com");
  return lines.join("\n");
};

const renderSchedulePanel = () => {
  if (!scheduleContent) {
    return;
  }
  scheduleContent.innerHTML = "";
  if (!selected.size) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Select artists to build your schedule.";
    scheduleContent.appendChild(empty);
    return;
  }

  const grouped = new Map();
  const weekLabel = (week) => (week === "W1" ? "Week 1" : "Week 2");

  selected.forEach((entry) => {
    if (!grouped.has(entry.week)) {
      grouped.set(entry.week, new Map());
    }
    const weekGroup = grouped.get(entry.week);
    if (!weekGroup.has(entry.day)) {
      weekGroup.set(entry.day, new Map());
    }
    const dayGroup = weekGroup.get(entry.day);
    if (!dayGroup.has(entry.stage)) {
      dayGroup.set(entry.stage, []);
    }
    dayGroup.get(entry.stage).push(entry);
  });

  [...grouped.keys()]
    .sort()
    .forEach((week) => {
      const weekBlock = document.createElement("div");
      weekBlock.className = "schedule-block";
      const weekTitle = document.createElement("h4");
      weekTitle.textContent = weekLabel(week);
      weekBlock.appendChild(weekTitle);

      const days = grouped.get(week);
      [...days.keys()]
        .sort()
        .forEach((date) => {
          const dayBlock = document.createElement("div");
          dayBlock.className = "schedule-day";
          const dayTitle = document.createElement("h5");
          const dayName = document.querySelector(
            `[data-day-button][data-day="${date}"]`
          )?.textContent;
          dayTitle.textContent = dayName ? dayName : date;
          dayBlock.appendChild(dayTitle);

          const stages = days.get(date);
          [...stages.keys()]
            .sort()
            .forEach((stage) => {
              const stageCard = document.createElement("div");
              stageCard.className = "schedule-card";
              const stageTitle = document.createElement("h6");
              stageTitle.textContent = stage;
              stageCard.appendChild(stageTitle);

              stages
                .get(stage)
                .sort((a, b) => a.artist.localeCompare(b.artist))
                .forEach((entry) => {
                  const artistLine = document.createElement("div");
                  artistLine.className = "schedule-artist";

                  const artistName = document.createElement("span");
                  artistName.textContent = entry.artist;

                  const removeButton = document.createElement("button");
                  removeButton.type = "button";
                  removeButton.className = "schedule-remove";
                  removeButton.dataset.removeKey = `${entry.week}|${entry.day}|${entry.artist}|${entry.stage}`;
                  removeButton.setAttribute(
                    "aria-label",
                    `Remove ${entry.artist}`
                  );
                  removeButton.textContent = "×";

                  artistLine.appendChild(artistName);
                  artistLine.appendChild(removeButton);
                  stageCard.appendChild(artistLine);
                });

              dayBlock.appendChild(stageCard);
            });

          weekBlock.appendChild(dayBlock);
        });

      scheduleContent.appendChild(weekBlock);
    });
};

copyButton?.addEventListener("click", async () => {
  if (!selected.size) {
    copyButton.textContent = "No selections";
    setTimeout(() => {
      copyButton.textContent = "Copy Schedule";
    }, 1200);
    return;
  }

  const text = buildShareText();
  await navigator.clipboard.writeText(text);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy Schedule";
  }, 1200);
});

const updateShareLabels = (label) => {
  shareButtons.forEach((button) => {
    const text = button.querySelector(".share-text");
    if (text) {
      text.textContent = label;
    }
  });
};

shareButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const text = buildShareText();
    if (!text) {
      updateShareLabels("No picks");
      setTimeout(() => {
        updateShareLabels("Share");
      }, 1200);
      return;
    }
    if (navigator.share) {
      await navigator.share({
        title: "My Tomorrowland Schedule",
        text,
      });
    } else {
      await navigator.clipboard.writeText(text);
      updateShareLabels("Copied");
      setTimeout(() => {
        updateShareLabels("Share");
      }, 1200);
    }
  });
});

openScheduleButton?.addEventListener("click", () => {
  schedulePanel?.classList.add("open");
  schedulePanel?.setAttribute("aria-hidden", "false");
});

schedulePanel?.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-panel]")) {
    schedulePanel.classList.remove("open");
    schedulePanel.setAttribute("aria-hidden", "true");
  }
});

scheduleContent?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-key]");
  if (!button) {
    return;
  }
  const key = button.dataset.removeKey;
  if (!key || !selected.has(key)) {
    return;
  }
  const entry = selected.get(key);
  selected.delete(key);
  updateArtistStats(entry, -1);
  document
    .querySelectorAll(
      `.artist[data-artist="${entry.artist}"][data-stage="${entry.stage}"][data-week="${entry.week}"][data-day="${entry.day}"]`
    )
    .forEach((item) => {
      item.classList.remove("selected");
    });
  updateSelected();
});

clearScheduleButton?.addEventListener("click", () => {
  if (!selected.size) {
    return;
  }
  selected.forEach((entry) => {
    updateArtistStats(entry, -1);
  });
  selected.clear();
  document.querySelectorAll(".artist.selected").forEach((item) => {
    item.classList.remove("selected");
  });
  updateSelected();
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
  easterEggImages.forEach((src) => {
    const bouncer = document.createElement("div");
    bouncer.className = "easter-egg-bouncer";
    bouncer.style.backgroundImage = `url(${src})`;
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

updateSelected();
updateDayButtons();
updateVisibleSections();
