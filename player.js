function prettyDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
}
function pageKey(ch) {
  return ch.category || (ch.kind === "sponsor" ? "The shops" : ch.kind === "intro" ? "Masthead" : ch.kind === "outro" ? "Close" : "The paper");
}
function fmt(s) {
  s = Math.round(s || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

async function boot() {
  const EPISODE = await fetch("episode.json").then(r => r.json());
  document.title = "Cadiz Radio — " + prettyDate(EPISODE.issue_date);
  document.getElementById("dateline").textContent = prettyDate(EPISODE.issue_date);
  const ed = document.getElementById("ed");
  if (ed) ed.textContent = (EPISODE.story_count || "") + " stories from the type";
  const src = document.getElementById("src");
  if (src && EPISODE.source_url) src.href = EPISODE.source_url;

  const audio = document.getElementById("audio");
  const nowTitle = document.getElementById("now-title");
  const nowKind = document.getElementById("now-kind");
  const pages = document.getElementById("pages");
  const playBtn = document.getElementById("play");
  const scriptEl = document.getElementById("script");

  const groups = [];
  const map = new Map();
  EPISODE.chapters.forEach((c, n) => {
    c._n = n;
    const key = pageKey(c);
    if (!map.has(key)) {
      const g = { key, items: [] };
      map.set(key, g);
      groups.push(g);
    }
    map.get(key).items.push(c);
  });

  groups.forEach(g => {
    const block = document.createElement("section");
    block.className = "page-block";
    block.innerHTML = `<h2>${g.key}</h2>`;
    const cols = document.createElement("div");
    cols.className = "cols";
    g.items.forEach(c => {
      const el = document.createElement("div");
      el.className = "item " + (c.kind || "");
      el.dataset.n = c._n;
      const label = c.kind === "sponsor" ? "Notice" : (c.kind === "story" ? "" : (c.kind || ""));
      const title = c.headline && !/^Page\s/i.test(c.headline) ? c.headline : (c.headline || c.kind);
      el.innerHTML = `${label ? `<div class="k">${label}</div>` : ""}
        <h3>${title}</h3>
        <span class="dur">${fmt(c.duration)}</span>
        <span class="also" hidden></span>`;
      el.id = "c" + c._n;
      el.addEventListener("click", () => playAt(c._n));
      cols.appendChild(el);
    });
    block.appendChild(cols);
    pages.appendChild(block);
  });

  let i = 0;
  function chapter() { return EPISODE.chapters[i]; }
  function paint() {
    const c = chapter();
    nowKind.textContent = c.kind === "sponsor" ? "Advertising columns" : (c.kind || "Story");
    nowTitle.textContent = c.headline || (c.kind === "intro" ? EPISODE.title : c.kind);
    if (scriptEl) scriptEl.textContent = c.read || c.text || c.headline || "";
    audio.src = c.src;
    document.querySelectorAll(".item").forEach(el => {
      el.classList.toggle("active", Number(el.dataset.n) === i);
    });
    const active = document.querySelector(".item.active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function playAt(n) {
    i = Math.max(0, Math.min(EPISODE.chapters.length - 1, n));
    paint();
    startWave();
    audio.play().catch(() => {});
    playBtn.textContent = "Pause";
  }

  audio.addEventListener("ended", () => {
    if (i < EPISODE.chapters.length - 1) playAt(i + 1);
  });
  document.getElementById("prev").onclick = () => playAt(i - 1);
  document.getElementById("next").onclick = () => playAt(i + 1);
  playBtn.onclick = () => {
    startWave();
    if (audio.paused) {
      if (!audio.src) paint();
      audio.play().catch(() => {});
      playBtn.textContent = "Pause";
    } else {
      audio.pause();
      playBtn.textContent = "Play";
    }
  };

  // Voicewave
  const canvas = document.getElementById("wave");
  const g = canvas.getContext("2d");
  let analyser = null;
  let waveOn = false;
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.floor(r.width * devicePixelRatio);
    canvas.height = Math.floor(r.height * devicePixelRatio);
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  function startWave() {
    if (waveOn) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    waveOn = true;
    const data = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      const w = canvas.width, h = canvas.height;
      g.fillStyle = "#070604";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#e2b15a";
      g.lineWidth = 2 * devicePixelRatio;
      g.beginPath();
      for (let x = 0; x < w; x++) {
        const v = data[Math.floor(x / w * data.length)] / 128.0;
        const y = v * h / 2;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    draw();
  }


  const hist = document.getElementById("hist");
  if (hist) {
    fetch("../historian.json").then(r => r.json()).then(all => {
      const n = all[EPISODE.issue_date];
      if (!n) return;
      const prev = n.prev ? `<a href="../${n.prev}/">Earlier paper</a>` : "<span>First paper in this run</span>";
      const nxt = n.next ? `<a href="../${n.next}/">Next paper</a>` : "";
      const items = (n.on_the_ground || []).map(x => `<li>${x}</li>`).join("");
      hist.innerHTML = `<h2>This week in Cadiz</h2>
        <p>${prettyDate(EPISODE.issue_date)} · paper ${n.index} of ${n.of} · printed ${n.print_day}</p>
        <p>${n.editor} ${n.why || ""}</p>
        <ul>${items}</ul>
        <div class="tl">${prev}${nxt}<a href="../year.html">1844 in Cadiz</a><a id="loc" href="${EPISODE.source_url || "#"}">Chronicling America</a></div>`;
    }).catch(() => {});
  }


  fetch("../year.json").then(r => r.json()).then(Y => {
    const here = EPISODE.issue_date;
    Y.entities.forEach(ent => {
      ent.clips.filter(c => c.date === here).forEach(c => {
        const el = document.getElementById("c" + c.idx);
        if (!el) return;
        const also = el.querySelector(".also");
        if (!also) return;
        const others = ent.dates.filter(d => d !== here);
        const weeks = others.map(d => {
          const clip = ent.clips.find(x => x.date === d);
          const [y, m, dd] = d.split("-").map(Number);
          const lab = new Date(y, m - 1, dd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return `<a href="../${d}/#c${clip.idx}">${lab}</a>`;
        }).join(" · ");
        also.hidden = false;
        also.innerHTML = weeks
          ? `${ent.place.split(".")[0]}. Also ${weeks}.`
          : `${ent.place.split(".")[0]}. First time in this run.`;
      });
    });
  }).catch(() => {});

  const hash = location.hash.match(/^#c(\d+)$/);
  if (hash) i = Number(hash[1]);
  paint();
}
boot();
