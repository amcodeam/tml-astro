const convexUrl = document.body.dataset.convexUrl;
const topOverall = "artistCounts:topArtistsOverall";
const topByWeek = "artistCounts:topArtistsByWeek";
const statsFlagKey = "stats_page";
const status = document.querySelector("[data-status]");
let convexClientPromise;

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
const listNodes = {
  overall: document.querySelector('[data-list="overall"]'),
  week1: document.querySelector('[data-list="week1"]'),
  week2: document.querySelector('[data-list="week2"]'),
};
const emptyNodes = {
  overall: document.querySelector('[data-empty="overall"]'),
  week1: document.querySelector('[data-empty="week1"]'),
  week2: document.querySelector('[data-empty="week2"]'),
};
const statsGrid = document.querySelector("[data-stats-grid]");
let statsEnabled = false;
let statsSubscribed = false;

const renderList = (key, items) => {
  const list = listNodes[key];
  const empty = emptyNodes[key];
  if (!list || !empty) {
    return;
  }

  list.innerHTML = "";
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

const subscribeStats = (client) => {
  if (statsSubscribed) {
    return;
  }
  statsSubscribed = true;
  client.onUpdate(topOverall, {}, (items) => {
    if (!statsEnabled) {
      return;
    }
    renderList("overall", items);
  });

  client.onUpdate(topByWeek, { week: "W1" }, (items) => {
    if (!statsEnabled) {
      return;
    }
    renderList("week1", items);
  });

  client.onUpdate(topByWeek, { week: "W2" }, (items) => {
    if (!statsEnabled) {
      return;
    }
    renderList("week2", items);
  });
};

if (!convexUrl) {
  if (status) {
    status.textContent =
      "Convex is not configured yet. Add PUBLIC_CONVEX_URL to enable live stats.";
  }
} else {
  getConvexClient().then((client) => {
    if (!client) {
      if (status) {
        status.textContent =
          "Live stats are offline. Picks still work without the feed.";
      }
      clearLists();
      return;
    }

    client.onUpdate("featureFlags:getFeatureFlag", { key: statsFlagKey }, (isOn) => {
      setStatsMode(isOn);
      if (isOn) {
        subscribeStats(client);
      }
    });
  });
}
