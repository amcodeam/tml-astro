const convexUrl = document.body.dataset.convexUrl;
const topOverall = "artistCounts:topArtistsOverall";
const topByWeek = "artistCounts:topArtistsByWeek";
const statsFlagKey = "stats_page";
let convexClientPromise;
let statsSubscribed = false;
let activeInitId = null;

let listNodes = {};
let emptyNodes = {};
let statsGrid = null;
let status = null;
let loading = null;
let downState = null;
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

const renderList = (key, items) => {
  const list = listNodes[key];
  const empty = emptyNodes[key];
  if (!list || !empty) {
    return;
  }

  list.innerHTML = "";
  if (loading) {
    loading.classList.add("hidden");
  }
  if (!items?.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "stats-row";

    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = `${index + 1}`;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.artist;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${item.count}`;

    row.append(rank, name, count);
    list.appendChild(row);
  });
};

const clearLists = () => {
  Object.keys(listNodes).forEach((key) => {
    const list = listNodes[key];
    const empty = emptyNodes[key];
    if (list) {
      list.innerHTML = "";
    }
    if (empty) {
      empty.classList.remove("hidden");
    }
  });
};

const setStatsMode = (enabled) => {
  statsEnabled = Boolean(enabled);
  if (statsGrid) {
    statsGrid.classList.toggle("hidden", !statsEnabled);
  }
  if (status) {
    status.textContent = statsEnabled
      ? "Live feed ready. Your picks update these lists instantly."
      : "Stats are turned off right now.";
  }
  if (!statsEnabled) {
    clearLists();
  }
};

const setLoading = (isLoading) => {
  if (loading) {
    loading.classList.toggle("hidden", !isLoading);
  }
};

const setDownState = (isDown, message) => {
  if (downState) {
    downState.classList.toggle("hidden", !isDown);
  }
  if (statsGrid) {
    statsGrid.classList.toggle("hidden", isDown || !statsEnabled);
  }
  if (status && message) {
    status.textContent = message;
  }
};

const subscribeStats = (client) => {
  if (statsSubscribed) {
    return;
  }
  statsSubscribed = true;
  client.onUpdate(topOverall, {}, (items) => {
    renderList("overall", items);
  });

  client.onUpdate(topByWeek, { week: "W1" }, (items) => {
    renderList("week1", items);
  });

  client.onUpdate(topByWeek, { week: "W2" }, (items) => {
    renderList("week2", items);
  });
};

const initStatsPage = () => {
  if (!document.querySelector("[data-stats-grid]")) {
    return;
  }

  const initId = Symbol("stats");
  activeInitId = initId;

  status = document.querySelector("[data-status]");
  listNodes = {
    overall: document.querySelector('[data-list="overall"]'),
    week1: document.querySelector('[data-list="week1"]'),
    week2: document.querySelector('[data-list="week2"]'),
  };
  emptyNodes = {
    overall: document.querySelector('[data-empty="overall"]'),
    week1: document.querySelector('[data-empty="week1"]'),
    week2: document.querySelector('[data-empty="week2"]'),
  };
  loading = document.querySelector("[data-stats-loading]");
  downState = document.querySelector("[data-stats-down]");
  statsGrid = document.querySelector("[data-stats-grid]");

  statsSubscribed = false;
  statsEnabled = false;
  clearLists();
  if (downState) {
    downState.classList.add("hidden");
  }
  if (statsGrid) {
    statsGrid.classList.add("hidden");
  }
  if (status) {
    status.textContent = "Loading live stats...";
  }
  setLoading(true);

  if (!convexUrl) {
    setLoading(false);
    setDownState(
      true,
      "Stats are unavailable right now. Live picks still work on the line-up page."
    );
    return;
  }

  getConvexClient().then((client) => {
    if (activeInitId !== initId) {
      return;
    }
    if (!client) {
      setLoading(false);
      setDownState(true, "Live stats are offline. Picks still work without the feed.");
      clearLists();
      return;
    }

    client.onUpdate("featureFlags:getFeatureFlag", { key: statsFlagKey }, (isOn) => {
      if (activeInitId !== initId) {
        return;
      }
      setLoading(false);
      setStatsMode(isOn);
      if (!isOn) {
        setDownState(true, "Stats are down right now.");
      } else {
        setDownState(false);
      }
      if (isOn) {
        subscribeStats(client);
      }
    });
  });
};

document.addEventListener("astro:page-load", initStatsPage);
initStatsPage();
