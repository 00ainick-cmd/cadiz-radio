async function boot() {
  const EPISODE = await fetch("episode.json").then(r => r.json());
  document.title = "Cadiz Radio — " + (EPISODE.issue_date || "");
  const h1 = document.getElementById("title");
  if (h1) {
    const d = EPISODE.issue_date || "";
    h1.innerHTML = "The Cadiz Sentinel<br>" + prettyDate(d);
  }
  const lede = document.getElementById("lede");
  if (lede) {
    const mins = Math.round((EPISODE.duration_seconds || 0) / 60);
    lede.textContent = (EPISODE.story_count || 0) + " stories from the type, about " + mins + " minutes. Shop cards are skippable. Nothing here was rewritten.";
  }
  const src = document.getElementById("src");
  if (src && EPISODE.source_url) src.href = EPISODE.source_url;

  const audio = document.getElementById("audio");
  const list = document.getElementById("list");
  const nowTitle = document.getElementById("now-title");
  const nowKind = document.getElementById("now-kind");

  function fmt(s) {
    s = Math.round(s || 0);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  let i = 0;
  function chapter() { return EPISODE.chapters[i]; }
  function paint() {
    const c = chapter();
    nowKind.textContent = c.kind === "sponsor" ? "Advertising columns" : (c.kind || "");
    nowTitle.textContent = c.headline || (c.kind === "intro" ? EPISODE.title : c.kind);
    audio.src = c.src;
    [...list.children].forEach((li, n) => li.classList.toggle("active", n === i));
  }
  function playAt(n) {
    i = Math.max(0, Math.min(EPISODE.chapters.length - 1, n));
    paint();
    audio.play().catch(() => {});
  }
  EPISODE.chapters.forEach((c, n) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="kind ${c.kind}">${c.kind}</span>
      <span class="headline">${c.headline || c.kind}${c.section ? ` <span class="dur">· ${c.section}</span>` : ""}</span>
      <span class="dur">${fmt(c.duration)}</span>`;
    li.addEventListener("click", () => playAt(n));
    list.appendChild(li);
  });
  audio.addEventListener("ended", () => { if (i < EPISODE.chapters.length - 1) playAt(i + 1); });
  document.getElementById("prev").onclick = () => playAt(i - 1);
  document.getElementById("next").onclick = () => playAt(i + 1);
  document.getElementById("skip-ad").onclick = () => {
    if (chapter().kind === "sponsor" && i < EPISODE.chapters.length - 1) playAt(i + 1);
  };
  document.getElementById("next-story").onclick = () => {
    const n = EPISODE.chapters.findIndex((c, idx) => idx > i && c.kind === "story");
    if (n >= 0) playAt(n);
  };
  paint();
}
function prettyDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
boot();
