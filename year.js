function pretty(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short", day: "numeric"
  });
}
function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
}

fetch("year.json").then(r => r.json()).then(Y => {
  const nav = document.getElementById("year-nav");
  nav.innerHTML = Y.recorded.map(d =>
    `<a href="${d}/">${pretty(d)}</a>`
  ).join(" · ") + ` · <a href="./">Shelf</a>`;

  const tEl = document.getElementById("threads");
  tEl.innerHTML = `<h2>Follow a thread</h2>` + Y.threads.map(t => {
    const stops = t.stops.map(s => {
      if (s.href) return `<li><a href="${s.href}">${pretty(s.date)} — ${s.label}</a></li>`;
      return `<li>${pretty(s.date)} — ${s.label} (type only)</li>`;
    }).join("");
    return `<section class="thread" id="${t.id}">
      <h3>${t.title}</h3>
      <p>${t.body}</p>
      <ol>${stops}</ol>
    </section>`;
  }).join("");

  const order = ["shop", "hotel", "stage", "event", "place", "nation"];
  const label = {shop: "Doors on the square", hotel: "Hotels", stage: "The stage", event: "What the office set as news", place: "Out of the square", nation: "Through-cards and the nation"};
  const groups = {};
  Y.entities.forEach(e => {
    (groups[e.kind] = groups[e.kind] || []).push(e);
  });
  const dEl = document.getElementById("doors");
  dEl.innerHTML = `<h2>The same door, week after week</h2>
    <p class="lead">A standing card is evidence. If Ritchey is in all six recorded papers, she is still taking that upstairs room through April. If her card falls out later, she is not invented back in.</p>` +
    order.filter(k => groups[k]).map(k => {
      const cards = groups[k].map(e => {
        const first = e.clips[0];
        const weeks = e.dates.map(d => {
          const clip = e.clips.find(c => c.date === d);
          return `<a href="${d}/#c${clip.idx}">${pretty(d)}</a>`;
        }).join(" · ");
        return `<article class="door" id="${e.id}">
          <h3>${e.name}</h3>
          <p class="where">${e.place}</p>
          <p>${e.note}</p>
          <p class="weeks">First in this run ${pretty(e.first)}. Recorded: ${weeks}. <a href="${first.date}/#c${first.idx}">Listen to the first card</a>.</p>
        </article>`;
      }).join("");
      return `<section class="door-block"><h3 class="blk">${label[k]}</h3>${cards}</section>`;
    }).join("");

  document.getElementById("later").innerHTML = `<h2>Still in the type</h2>
    <p class="lead">The year does not stop in April. These later numbers are transcribed. They are not recorded yet. A historian can still read the beat.</p>
    <ol class="later-list">` + Y.later.map(x =>
      `<li><span class="ld">${longDate(x.date)}</span> ${x.label}</li>`
    ).join("") + `</ol>`;
});
