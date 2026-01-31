const convexUrl = document.body.dataset.convexUrl;
const updateArtistCount = "artistCounts:updateArtistCount";
const statsFlagKey = "stats_page";
const storageKey = "tml-selected-artists";

const selected = new Map();
let convexClientPromise;
let statsEnabled = false;

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

const setStatsEnabled = (enabled) => {
  statsEnabled = Boolean(enabled);
};

const initStatsFlag = () => {
  getConvexClient()
    .then((client) => {
      if (!client) {
        setStatsEnabled(false);
        return;
      }
      client.onUpdate(
        "featureFlags:getFeatureFlag",
        { key: statsFlagKey },
        (isOn) => {
          setStatsEnabled(isOn);
        }
      );
    })
    .catch(() => {
      setStatsEnabled(false);
    });
};

const getKey = (entry) =>
  `${entry.week}|${entry.day}|${entry.artist}|${entry.stage}`;

const updateArtistStats = (entry, delta) => {
  if (!statsEnabled) {
    return;
  }
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

const saveSelections = () => {
  if (typeof localStorage === "undefined") {
    return;
  }
  const payload = [...selected.values()].map((entry) => ({
    artist: entry.artist,
    stage: entry.stage,
    week: entry.week,
    day: entry.day,
    dayName: entry.dayName,
  }));
  localStorage.setItem(storageKey, JSON.stringify(payload));
};

const loadSelections = () => {
  if (typeof localStorage === "undefined") {
    return;
  }
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return;
  }
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) {
      return;
    }
    selected.clear();
    saved.forEach((entry) => {
      if (!entry?.artist || !entry?.stage || !entry?.week || !entry?.day) {
        return;
      }
      selected.set(getKey(entry), entry);
    });
  } catch (error) {
    console.error("Failed to load saved selections", error);
  }
};

const updateArtistButtons = (entry, isSelected) => {
  document
    .querySelectorAll(
      `.artist[data-artist="${entry.artist}"][data-stage="${entry.stage}"][data-week="${entry.week}"][data-day="${entry.day}"]`
    )
    .forEach((item) => {
      item.classList.toggle("selected", isSelected);
    });
};

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
  const scheduleContent = document.getElementById("schedule-content");
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
          const dayEntries = [...days.get(date).values()].flat();
          const dayName = dayEntries.map((entry) => entry.dayName).find(Boolean);
          dayTitle.textContent = dayName ? `${dayName} ${date}` : date;
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
                  removeButton.dataset.removeKey = getKey(entry);
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

const updateSelected = () => {
  const scheduleCount = document.getElementById("schedule-count");
  if (scheduleCount) {
    scheduleCount.textContent = String(selected.size);
  }
  saveSelections();
  renderSchedulePanel();
};

const toggleSelection = (entry) => {
  const key = getKey(entry);
  const isSelected = selected.has(key);
  if (isSelected) {
    selected.delete(key);
    updateArtistStats(entry, -1);
  } else {
    selected.set(key, entry);
    updateArtistStats(entry, 1);
  }
  updateArtistButtons(entry, !isSelected);
  updateSelected();
  return !isSelected;
};

const removeSelectionByKey = (key) => {
  if (!key || !selected.has(key)) {
    return;
  }
  const entry = selected.get(key);
  selected.delete(key);
  updateArtistStats(entry, -1);
  updateArtistButtons(entry, false);
  updateSelected();
};

const clearSelections = () => {
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
};

const updateShareLabels = (label) => {
  document.querySelectorAll("[data-share]").forEach((button) => {
    const text = button.querySelector(".share-text");
    if (text) {
      text.textContent = label;
    }
  });
};

const initScheduleUI = () => {
  if (!document.body || document.body.dataset.scheduleInit === "true") {
    return;
  }
  document.body.dataset.scheduleInit = "true";

  loadSelections();
  updateSelected();

  document.querySelectorAll(".artist").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }
    button.dataset.bound = "true";
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
  });

  const openScheduleButton = document.getElementById("open-schedule");
  const schedulePanel = document.getElementById("schedule-panel");
  const scheduleContent = document.getElementById("schedule-content");
  const clearScheduleButton = document.getElementById("clear-schedule");
  const copyButton = document.getElementById("copy-schedule");

  document.querySelectorAll("[data-share]").forEach((button) => {
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
    removeSelectionByKey(button.dataset.removeKey);
  });

  clearScheduleButton?.addEventListener("click", () => {
    clearSelections();
  });
};

document.addEventListener("astro:page-load", () => {
  initScheduleUI();
});

initStatsFlag();
initScheduleUI();

globalThis.tmlSchedule = {
  loadSelections,
  selected,
  toggleSelection,
};
globalThis.dispatchEvent(new Event("tml:schedule-ready"));
