/* PokéMotus : deviner un Pokémon d'après ses caractéristiques. */
(() => {
  const { h, spr, store } = PA;
  const COLS_DEF = [
    { key: "mon", label: "Pokémon" }, { key: "t1", label: "Type 1" }, { key: "t2", label: "Type 2" },
    { key: "habitat", label: "Habitat" }, { key: "color", label: "Couleur" }, { key: "stage", label: "Stade" },
    { key: "height", label: "Taille" }, { key: "weight", label: "Poids" }, { key: "gen", label: "Génér." },
  ];
  const EPOCH = Date.UTC(2026, 9, 17);
  const dailyNum = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1; };
  function dailyId(n) {
    // Mélange déterministe : même Pokémon pour tout le monde le même jour
    let x = (n * 2654435761) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
    return PA.dex[(x >>> 0) % PA.dex.length].id;
  }

  const S = { mode: "daily", secret: null, guesses: [], won: false, hintsOn: store.get("pm-hints", true), hintsSeen: false };
  let el = {};

  function compare(g, s) {
    const out = {};
    const gt = [g.types[0], g.types[1] || "Aucun"], st = [s.types[0], s.types[1] || "Aucun"];
    out.t1 = { v: gt[0], r: gt[0] === st[0] ? "ok" : st.includes(gt[0]) ? "part" : "bad" };
    out.t2 = { v: gt[1], r: gt[1] === st[1] ? "ok" : (gt[1] !== "Aucun" && st.includes(gt[1])) ? "part" : "bad" };
    out.habitat = { v: g.habitat, r: g.habitat === s.habitat ? "ok" : "bad" };
    out.color = { v: g.color, r: g.color === s.color ? "ok" : "bad" };
    const num = (a, b, fmt) => ({ v: fmt(a), r: a === b ? "ok" : "bad", arrow: a === b ? "" : b > a ? "↑" : "↓" });
    const gens = S.mode === "daily" ? PA.REGIONS.map(r => r.gen) : PA.gens;
    out.stage = num(PA.stage(g, gens), PA.stage(s, gens), v => "Stade " + v);
    out.height = num(g.height, s.height, v => v.toLocaleString("fr-FR") + " m");
    out.weight = num(g.weight, s.weight, v => v.toLocaleString("fr-FR") + " kg");
    out.gen = num(g.gen, s.gen, v => "Gén. " + v);
    return out;
  }
  const pool = () => S.mode === "daily" ? PA.dex : PA.pool();

  function saveDaily() {
    if (S.mode === "daily") store.set("pm-daily", { day: dailyNum(), guesses: S.guesses.map(p => p.id), won: S.won });
  }
  function startDaily() {
    S.mode = "daily";
    S.secret = PA.byId.get(dailyId(dailyNum()));
    const saved = store.get("pm-daily", null);
    S.guesses = saved && saved.day === dailyNum() ? saved.guesses.map(id => PA.byId.get(id)).filter(Boolean) : [];
    S.won = S.guesses.some(p => p.id === S.secret.id);
    S.hintsSeen = false;
    render(false);
  }
  function startFree() {
    S.mode = "free";
    S.secret = PA.rand(PA.pool()); S.guesses = []; S.won = false; S.hintsSeen = false;
    render(false);
  }

  function render(animateLast) {
    el.daily.setAttribute("aria-pressed", S.mode === "daily");
    el.free.setAttribute("aria-pressed", S.mode === "free");
    el.dailyLabel.hidden = S.mode !== "daily";
    el.dailyNum.textContent = "#" + dailyNum();
    el.tries.textContent = S.guesses.length;
    el.poolLabel.textContent = S.mode === "daily" ? "Toutes les régions · le même Pokémon pour tout le monde" : "";
    renderHints(); renderBoard(animateLast); renderResult(); renderStats();
    el.ac.input.disabled = S.won;
    el.ac.input.placeholder = S.won ? "Trouvé ! Lance une partie libre pour rejouer." : "Tape le nom d'un Pokémon… (ex. Pikachu)";
    el.empty.hidden = S.guesses.length > 0;
    el.boardWrap.hidden = S.guesses.length === 0;
  }

  const HINTS = [
    { at: 4, label: "Génération", get: s => "Génération " + s.gen },
    { at: 7, label: "Silhouette", sil: true },
    { at: 10, label: "Initiale", get: s => `Commence par « ${s.name[0]} », ${s.name.length} lettres` },
  ];
  function renderHints() {
    el.hintToggle.setAttribute("aria-checked", S.hintsOn);
    el.hintToggle.querySelector("span").textContent = S.hintsOn ? "activés" : "désactivés";
    el.hints.hidden = !S.hintsOn;
    if (!S.hintsOn) return;
    // Sert au texte de partage : un indice a-t-il été visible pendant la partie ?
    if (!S.won && S.guesses.length >= HINTS[0].at) S.hintsSeen = true;
    el.hints.replaceChildren(...HINTS.map(x => {
      const open = S.guesses.length >= x.at || S.won, left = x.at - S.guesses.length;
      const d = h("div", { className: "hint" + (open ? "" : " locked") });
      if (open && x.sil) d.append(spr(S.secret.id, 48, S.won ? "" : "shadow"));
      d.append(h("div", { innerHTML: `<strong>${x.label}</strong><br>` + (open ? (x.sil ? (S.won ? S.secret.name : "Qui est-ce ?") : x.get(S.secret)) : `dans ${left} essai${left > 1 ? "s" : ""}`) }));
      return d;
    }));
  }

  function renderBoard(animateLast) {
    el.board.replaceChildren(...COLS_DEF.map(c => h("div", { className: "h", textContent: c.label })));
    [...S.guesses].reverse().forEach((g, rowIdx) => {
      const res = compare(g, S.secret);
      COLS_DEF.forEach((c, i) => {
        const cell = h("div");
        if (c.key === "mon") { cell.className = "cell mon"; cell.title = g.name; cell.append(spr(g.id, 64)); }
        else {
          const r = res[c.key];
          cell.className = "cell " + r.r + (String(r.v).length > 8 ? " long" : "");
          if (r.arrow) cell.insertAdjacentHTML("beforeend", `<div class="arrow" aria-hidden="true">${r.arrow}</div>`);
          cell.append(h("span", { textContent: r.v + (r.arrow ? " " + r.arrow : "") }));
        }
        if (animateLast && rowIdx === 0) { cell.classList.add("flip"); cell.style.animationDelay = (i * 90) + "ms"; }
        el.board.append(cell);
      });
    });
  }

  function shareText() {
    const e = { ok: "🟩", part: "🟧", bad: "🟥" };
    const head = S.mode === "daily" ? `PokéMotus #${dailyNum()}` : "PokéMotus (partie libre)";
    const lines = S.guesses.map(g => { const r = compare(g, S.secret); return COLS_DEF.slice(1).map(c => e[r[c.key].r]).join(""); });
    return `${head} · trouvé en ${S.guesses.length} essai${S.guesses.length > 1 ? "s" : ""}${S.hintsSeen ? "" : " · sans indices"}\n` + lines.join("\n");
  }

  function renderResult() {
    el.result.replaceChildren();
    if (!S.won) return;
    const w = h("div", { className: "win" }, spr(S.secret.id, 96));
    w.insertAdjacentHTML("beforeend", `<div><h2>C'était ${S.secret.name} !</h2><p>N° ${String(S.secret.id).padStart(4, "0")} · trouvé en ${S.guesses.length} essai${S.guesses.length > 1 ? "s" : ""}.${S.mode === "daily" ? " Nouveau défi demain." : ""}</p></div>`);
    const pre = h("pre", { className: "share-text", textContent: shareText() });
    const copy = h("button", { className: "btn primary", type: "button", textContent: "Copier le résultat" });
    const selectPre = () => { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Texte sélectionné, copie-le"; };
    copy.onclick = () => navigator.clipboard ? navigator.clipboard.writeText(pre.textContent).then(() => copy.textContent = "Copié", selectPre) : selectPre();
    const again = h("button", { className: "btn", type: "button", textContent: "Nouvelle partie libre" });
    again.onclick = startFree;
    w.append(pre, h("div", { className: "actions" }, copy, again));
    el.result.append(w);
  }

  const blankStats = () => ({ played: 0, won: 0, streak: 0, best: 0, lastDay: 0, total: 0 });
  function renderStats() {
    const st = store.get("pm-stats", blankStats());
    const avg = st.won ? (st.total / st.won).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "–";
    el.stats.innerHTML = [["Défis du jour réussis", st.won], ["Série actuelle", st.streak], ["Meilleure série", st.best], ["Essais en moyenne", avg]]
      .map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join("");
  }
  function recordDailyWin() {
    const st = store.get("pm-stats", blankStats()), d = dailyNum();
    if (st.lastDay === d) return;
    st.streak = st.lastDay === d - 1 ? st.streak + 1 : 1;
    st.best = Math.max(st.best, st.streak);
    st.won++; st.played++; st.total += S.guesses.length; st.lastDay = d;
    store.set("pm-stats", st);
  }

  function guess(p) {
    if (S.won || S.guesses.some(g => g.id === p.id)) return;
    S.guesses.push(p);
    if (p.id === S.secret.id) { S.won = true; if (S.mode === "daily") recordDailyWin(); }
    saveDaily();
    render(true);
  }

  PA.register({
    id: "pokemotus", name: "PokéMotus", short: "PokéMotus", live: true, mon: 25,
    text: "Devine le Pokémon grâce à ses types, son habitat, sa couleur, sa taille et son poids. Un défi par jour.",
    mount(root) {
      root.innerHTML = `
        <div class="game-head">
          <div><h1>PokéMotus</h1>
          <p>Trouve le Pokémon mystère. À chaque essai, chaque critère te dit si tu brûles&nbsp;: vert, c'est pareil&nbsp;; orange, c'est presque&nbsp;; rouge, c'est raté.</p></div>
          <div class="modes" role="group" aria-label="Mode de jeu">
            <button data-k="daily" type="button" aria-pressed="true">Défi du jour</button>
            <button data-k="free" type="button" aria-pressed="false">Partie libre</button>
          </div>
        </div>
        <div class="console">
          <div class="status">
            <div>Essais <b data-k="tries">0</b></div>
            <div data-k="dailyLabel">Défi <b data-k="dailyNum">#1</b></div>
            <div class="sep"></div><div data-k="poolLabel"></div>
            <button type="button" class="switch" role="switch" data-k="hintToggle"><i aria-hidden="true"></i>Indices : <span>activés</span></button>
          </div>
          <div data-k="regionSlot"></div>
          <div data-k="acSlot"></div>
          <div class="hints" data-k="hints"></div>
        </div>
        <div data-k="result"></div>
        <div class="board-wrap" data-k="boardWrap"><div class="board" data-k="board"></div></div>
        <div class="empty" data-k="empty"><span data-k="emptySpr"></span>
          <div>Propose un premier Pokémon pour lancer la partie. Les flèches ↑ et ↓ indiquent si le Pokémon mystère est plus grand, plus lourd, plus évolué ou d'une génération plus récente.</div></div>
        <div class="legend">
          <span><i style="background:var(--ok)"></i>Identique</span>
          <span><i style="background:var(--part)"></i>Partiel (type présent mais à l'autre place)</span>
          <span><i style="background:var(--bad)"></i>Différent</span>
          <span>Habitat connu seulement pour les générations 1 à 3</span>
          <span>Le stade ne compte que les pré-évolutions des régions jouées</span>
        </div>
        <div class="stats" data-k="stats"></div>`;
      root.querySelectorAll("[data-k]").forEach(n => el[n.dataset.k] = n);
      el.regions = PA.regionPicker(undefined, " · clique un starter pour choisir les régions de la partie libre");
      el.regionSlot.replaceWith(el.regions);
      el.ac = PA.autocomplete({ candidates: () => pool().filter(p => !S.guesses.some(g => g.id === p.id)), onPick: guess });
      el.acSlot.replaceWith(el.ac.el);
      el.emptySpr.replaceWith(spr(25, 56, "shadow"));
      el.daily.onclick = startDaily;
      el.hintToggle.onclick = () => { S.hintsOn = !S.hintsOn; store.set("pm-hints", S.hintsOn); render(false); };
      el.free.onclick = () => { if (S.mode !== "free") startFree(); };
      // Choisir des régions lance une partie libre sur ces régions
      PA.onRegions(() => { if (!root.hidden || S.mode === "free") startFree(); });
      startDaily();
    },
  });
})();
