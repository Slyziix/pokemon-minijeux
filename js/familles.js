/* Cinq Familles : 25 Pokémon à regrouper en 5 familles de 5 qui partagent un point commun. */
(() => {
  const { h, spr, store, esc } = PA;
  const SIZE = 5, GROUPS = 5, LIVES = 4;

  /* Table des types : attaquant -> [super efficace], [peu efficace], [sans effet] */
  const CHART = {
    "Normal": [[], ["Roche", "Acier"], ["Spectre"]],
    "Feu": [["Plante", "Glace", "Insecte", "Acier"], ["Feu", "Eau", "Roche", "Dragon"], []],
    "Eau": [["Feu", "Sol", "Roche"], ["Eau", "Plante", "Dragon"], []],
    "Plante": [["Eau", "Sol", "Roche"], ["Feu", "Plante", "Poison", "Vol", "Insecte", "Dragon", "Acier"], []],
    "Électrik": [["Eau", "Vol"], ["Électrik", "Plante", "Dragon"], ["Sol"]],
    "Glace": [["Plante", "Sol", "Vol", "Dragon"], ["Feu", "Eau", "Glace", "Acier"], []],
    "Combat": [["Normal", "Glace", "Roche", "Ténèbres", "Acier"], ["Poison", "Vol", "Psy", "Insecte", "Fée"], ["Spectre"]],
    "Poison": [["Plante", "Fée"], ["Poison", "Sol", "Roche", "Spectre"], ["Acier"]],
    "Sol": [["Feu", "Électrik", "Poison", "Roche", "Acier"], ["Plante", "Insecte"], ["Vol"]],
    "Vol": [["Plante", "Combat", "Insecte"], ["Électrik", "Roche", "Acier"], []],
    "Psy": [["Combat", "Poison"], ["Psy", "Acier"], ["Ténèbres"]],
    "Insecte": [["Plante", "Psy", "Ténèbres"], ["Feu", "Combat", "Poison", "Vol", "Spectre", "Acier", "Fée"], []],
    "Roche": [["Feu", "Glace", "Vol", "Insecte"], ["Combat", "Sol", "Acier"], []],
    "Spectre": [["Psy", "Spectre"], ["Ténèbres"], ["Normal"]],
    "Dragon": [["Dragon"], ["Acier"], ["Fée"]],
    "Ténèbres": [["Psy", "Spectre"], ["Combat", "Ténèbres", "Fée"], []],
    "Acier": [["Glace", "Roche", "Fée"], ["Feu", "Eau", "Électrik", "Acier"], []],
    "Fée": [["Combat", "Dragon", "Ténèbres"], ["Feu", "Poison", "Acier"], []],
  };
  const TYPES = Object.keys(CHART);
  const mult = (atk, types) => types.reduce((m, t) => {
    const [sup, weak, none] = CHART[atk];
    return m * (none.includes(t) ? 0 : sup.includes(t) ? 2 : weak.includes(t) ? .5 : 1);
  }, 1);

  /* Catalogue des points communs. level : 1 = évident, 4 = vicieux. kind : deux familles d'une même grille n'ont jamais le même kind. */
  const CATS = [
    ...TYPES.map(t => ({ kind: "type", level: 1, label: `Type ${t}`, test: p => p.types.includes(t) })),
    ...PA.REGIONS.map(r => ({ kind: "gen", level: 1, label: `Originaires de ${r.name}`, test: p => p.gen === r.gen })),
    ...["Bleu", "Brun", "Vert", "Gris", "Rouge", "Blanc", "Jaune", "Violet", "Rose", "Noir"].map(c => ({ kind: "color", level: 2, label: `Couleur du Pokédex : ${c}`, test: p => p.color === c })),
    ...["Champs", "Forêts", "Marécages", "Montagnes", "Mers", "Urbains", "Grottes", "Milieux hostiles"].map(x => ({ kind: "habitat", level: 2, label: `Habitat : ${x}`, test: p => p.habitat === x })),
    { kind: "legend", level: 2, label: "Légendaires et fabuleux", test: p => p.legendary },
    { kind: "stage", level: 2, label: "Troisième stade d'évolution", test: p => PA.stage(p, G) === 3 },
    { kind: "size", level: 3, label: "Pèsent 300 kg ou plus", test: p => p.weight >= 300 },
    { kind: "size", level: 3, label: "Pèsent 1 kg ou moins", test: p => p.weight <= 1 },
    { kind: "size", level: 3, label: "Mesurent 3 m ou plus", test: p => p.height >= 3 },
    { kind: "size", level: 3, label: "Mesurent 30 cm ou moins", test: p => p.height <= .3 },
    { kind: "bst", level: 3, label: "Total des stats de 600 ou plus", test: p => p.bst >= 600 },
    { kind: "bst", level: 3, label: "Total des stats de 250 ou moins", test: p => p.bst <= 250 },
    ...["Normal", "Combat", "Électrik", "Sol", "Psy", "Spectre", "Dragon", "Poison"].map(t => ({ kind: "immune", level: 3, label: `Immunisés contre le type ${t}`, test: p => mult(t, p.types) === 0 })),
    ...TYPES.map(t => ({ kind: "weak4", level: 4, label: `Quadruple faiblesse au type ${t}`, test: p => mult(t, p.types) === 4 })),
    { kind: "name", level: 4, label: "Nom de 4 lettres ou moins", test: p => p.key.length <= 4 },
    ..."ABCDEFGLMNPRST".split("").map(l => ({ kind: "letter", level: 4, label: `Nom commençant par ${l}`, test: p => p.key[0] === l.toLowerCase() })),
  ];
  const COLORS = ["#f2c230", "#5fb85a", "#4a90d9", "#9b6bd6", "#e0607e"];

  /* Hasard reproductible pour la grille du jour */
  const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const shuffle = (a, rng) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* Chaque Pokémon retenu vérifie le point commun de sa famille et aucun des quatre autres :
     la solution est donc unique. */
  function generate(pool, rng) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const cats = [], kinds = new Set();
      for (const c of shuffle(CATS, rng)) {
        if (kinds.has(c.kind)) continue;
        cats.push(c); kinds.add(c.kind);
        if (cats.length === GROUPS) break;
      }
      if (new Set(cats.map(c => c.level)).size < 3) continue;
      const groups = [];
      for (const c of cats) {
        const ok = pool.filter(p => c.test(p) && cats.every(o => o === c || !o.test(p)));
        if (ok.length < SIZE) break;
        groups.push({ cat: c, members: shuffle(ok, rng).slice(0, SIZE) });
      }
      if (groups.length < GROUPS) continue;
      groups.sort((a, b) => a.cat.level - b.cat.level);
      groups.forEach((g, i) => g.color = COLORS[i]);
      return groups;
    }
    return null;
  }

  const EPOCH = Date.UTC(2026, 9, 17);
  const dailyNum = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1; };

  let G = PA.REGIONS.map(r => r.gen); // régions utilisées pour compter les stades
  const S = { mode: "daily", groups: null, order: [], found: [], sel: new Set(), mistakes: 0, history: [], over: false, msg: "" };
  let el = {}, root;

  function setup(groups, rng) {
    S.groups = groups; S.found = []; S.sel = new Set(); S.mistakes = 0; S.history = []; S.over = false; S.msg = "";
    S.order = groups ? shuffle(groups.flatMap(g => g.members), rng) : [];
  }
  function startDaily() {
    S.mode = "daily";
    G = PA.REGIONS.map(r => r.gen);
    setup(generate(PA.dex, mulberry(dailyNum() * 7919)), mulberry(dailyNum()));
    const saved = store.get("pf-daily", null);
    if (saved && saved.day === dailyNum()) {
      S.found = saved.found; S.mistakes = saved.mistakes; S.history = saved.history; S.over = saved.over;
    }
    render();
  }
  function startFree() {
    S.mode = "free";
    G = PA.gens;
    setup(generate(PA.pool(), Math.random), Math.random);
    render();
  }
  function save() {
    if (S.mode === "daily") store.set("pf-daily", { day: dailyNum(), found: S.found, mistakes: S.mistakes, history: S.history, over: S.over });
  }

  const groupOf = p => S.groups.findIndex(g => g.members.includes(p));
  function submit() {
    if (S.sel.size !== SIZE || S.over) return;
    const picked = [...S.sel].map(id => PA.byId.get(id));
    const counts = {};
    picked.forEach(p => counts[groupOf(p)] = (counts[groupOf(p)] || 0) + 1);
    S.history.push(picked.map(groupOf));
    const [gi, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (n === SIZE) {
      S.found.push(+gi); S.sel.clear(); S.msg = "";
      if (S.found.length === GROUPS) finish(true);
    } else {
      S.mistakes++;
      S.msg = n === SIZE - 1 ? "Presque ! Il n'y a qu'un intrus." : "Raté, ces cinq-là ne vont pas ensemble.";
      if (S.mistakes >= LIVES) finish(false);
    }
    save(); render(true);
  }
  function finish(won) {
    S.over = true; S.won = won; S.msg = "";
    if (S.mode === "daily") {
      const st = store.get("pf-stats", { played: 0, won: 0, streak: 0, best: 0, lastDay: 0 });
      if (st.lastDay !== dailyNum()) {
        st.played++;
        if (won) { st.won++; st.streak = st.lastDay === dailyNum() - 1 ? st.streak + 1 : 1; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
        st.lastDay = dailyNum(); store.set("pf-stats", st);
      }
    }
  }

  function groupBar(gi) {
    const g = S.groups[gi];
    const bar = h("div", { className: "fam-bar" });
    bar.style.setProperty("--fam", g.color);
    bar.innerHTML = `<strong>${esc(g.cat.label)}</strong><span>${g.members.map(p => esc(p.name)).join(", ")}</span>`;
    const mons = h("div", { className: "fam-mons" }, ...g.members.map(p => spr(p.id, 48)));
    bar.prepend(mons);
    return bar;
  }

  function render(animate) {
    el.daily.setAttribute("aria-pressed", S.mode === "daily");
    el.free.setAttribute("aria-pressed", S.mode === "free");
    el.label.textContent = S.mode === "daily" ? `Grille du jour #${dailyNum()} · toutes les régions` : "Partie libre";
    el.regions.hidden = S.mode === "daily";
    if (!S.groups) {
      el.found.replaceChildren(); el.grid.replaceChildren();
      el.msg.textContent = "Impossible de former cinq familles avec ces régions. Ajoute une région ou deux.";
      el.actions.hidden = true; el.end.hidden = true; return;
    }
    el.actions.hidden = S.over;
    el.lives.replaceChildren(...Array.from({ length: LIVES }, (_, i) => h("i", { className: i < LIVES - S.mistakes ? "" : "lost" })));
    const shown = S.over ? [...S.found, ...S.groups.map((_, i) => i).filter(i => !S.found.includes(i))] : S.found;
    el.found.replaceChildren(...shown.map(groupBar));
    const left = S.order.filter(p => !shown.includes(groupOf(p)));
    el.grid.replaceChildren(...left.map(p => {
      const b = h("button", { type: "button", className: "tile" }, spr(p.id, 64), h("span", { textContent: p.name }));
      b.setAttribute("aria-pressed", S.sel.has(p.id));
      b.onclick = () => {
        if (S.sel.has(p.id)) S.sel.delete(p.id); else if (S.sel.size < SIZE) S.sel.add(p.id);
        S.msg = ""; render();
      };
      return b;
    }));
    el.msg.textContent = S.msg;
    if (animate && S.msg) { el.grid.classList.remove("shake"); void el.grid.offsetWidth; el.grid.classList.add("shake"); }
    el.submit.disabled = S.sel.size !== SIZE;
    el.submit.textContent = `Valider (${S.sel.size}/${SIZE})`;
    el.end.hidden = !S.over;
    if (S.over) {
      const won = S.found.length === GROUPS;
      const text = `${S.mode === "daily" ? `Cinq Familles #${dailyNum()}` : "Cinq Familles"} · ${won ? `${S.mistakes} erreur${S.mistakes > 1 ? "s" : ""}` : "perdu"}\n` +
        S.history.map(r => r.map(i => ["🟨", "🟩", "🟦", "🟪", "🟥"][i]).join("")).join("\n");
      el.end.innerHTML = `<div><strong>${won ? "Toutes les familles sont réunies !" : "Plus de Poké Balls…"}</strong><br>${won ? `Avec ${S.mistakes} erreur${S.mistakes > 1 ? "s" : ""}.` : "Voici les familles qu'il fallait trouver."}${S.mode === "daily" ? " Nouvelle grille demain." : ""}</div>`;
      const pre = h("pre", { className: "share-text", textContent: text });
      const copy = h("button", { type: "button", className: "btn primary", textContent: "Copier le résultat" });
      const selectPre = () => { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Texte sélectionné, copie-le"; };
      copy.onclick = () => navigator.clipboard ? navigator.clipboard.writeText(text).then(() => copy.textContent = "Copié", selectPre) : selectPre();
      const again = h("button", { type: "button", className: "btn", textContent: "Nouvelle grille" });
      again.onclick = startFree;
      el.end.append(pre, h("div", { className: "actions" }, copy, again));
    }
  }

  PA.register({
    id: "familles", name: "Cinq Familles", short: "Familles", live: true, mon: 133,
    text: "25 Pokémon à regrouper en 5 familles de 5 : même type, même région, même faiblesse… à toi de trouver le lien.",
    mount(sec) {
      root = sec;
      sec.innerHTML = `
        <div class="game-head">
          <div><h1>Cinq Familles</h1><p>Regroupe les 25 Pokémon en 5 familles de 5 qui ont un point commun&nbsp;: un type, une région, une faiblesse, une taille… Sélectionne cinq Pokémon puis valide. Tu as droit à quatre erreurs.</p></div>
          <div class="modes" role="group" aria-label="Mode de jeu">
            <button data-k="daily" type="button" aria-pressed="true">Grille du jour</button>
            <button data-k="free" type="button" aria-pressed="false">Partie libre</button>
          </div>
        </div>
        <div class="console">
          <div data-k="regionSlot"></div>
          <div class="status"><div data-k="label"></div><div class="sep"></div><div>Erreurs restantes</div><div class="lives" data-k="lives"></div></div>
        </div>
        <div class="fam-found" data-k="found"></div>
        <div class="fam-grid" data-k="grid"></div>
        <p class="fam-msg" data-k="msg" aria-live="polite"></p>
        <div class="fam-actions" data-k="actions">
          <button type="button" class="btn" data-k="shuffle">Mélanger</button>
          <button type="button" class="btn" data-k="clear">Tout désélectionner</button>
          <button type="button" class="btn primary" data-k="submit">Valider</button>
        </div>
        <div class="win fam-end" data-k="end" hidden></div>
        <p class="legend">Les familles vont de la plus évidente (jaune) à la plus vicieuse (rose). Couleurs et habitats suivent le classement officiel du Pokédex ; les faiblesses ne tiennent compte que des types, pas des talents.</p>`;
      sec.querySelectorAll("[data-k]").forEach(n => el[n.dataset.k] = n);
      el.regions = PA.regionPicker();
      el.regionSlot.replaceWith(el.regions);
      el.daily.onclick = startDaily;
      el.free.onclick = () => startFree();
      el.shuffle.onclick = () => { S.order = shuffle(S.order, Math.random); render(); };
      el.clear.onclick = () => { S.sel.clear(); S.msg = ""; render(); };
      el.submit.onclick = submit;
      PA.onRegions(() => { if (!root.hidden || S.mode === "free") startFree(); });
      startDaily();
    },
  });
})();
