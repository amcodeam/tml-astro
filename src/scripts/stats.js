import { ConvexClient } from "convex/browser";

const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
const topOverall = "artistCounts:topArtistsOverall";
const topByWeek = "artistCounts:topArtistsByWeek";
const status = document.querySelector("[data-status]");
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

if (!convexUrl) {
  if (status) {
    status.textContent =
      "Convex is not configured yet. Add PUBLIC_CONVEX_URL to enable live stats.";
  }
} else {
  const client = new ConvexClient(convexUrl);

  client.onUpdate(topOverall, {}, (items) => {
    renderList("overall", items);
  });

  client.onUpdate(topByWeek, { week: "W1" }, (items) => {
    renderList("week1", items);
  });

  client.onUpdate(topByWeek, { week: "W2" }, (items) => {
    renderList("week2", items);
  });
}
