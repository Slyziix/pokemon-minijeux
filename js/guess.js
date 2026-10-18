/* Moteur commun aux jeux « un Pokémon à trouver en quelques essais » :
   Qui est ce Pokémon ?, Description, Flou & Zoom. Chaque jeu fournit seulement son indice visuel. */
PA.guessGame = cfg => {
  const { h, spr, store } = PA;
  const MAX = cfg.maxTries || 5;
  const KEY = "pa-score-" + cfg.id;
  const S = { target: null, wrong: [], done: false, won: false, mode: cfg.modes?.[0].k };
  const score = store.get(KEY, { streak: 0, best: 0, found: 0, played: 0 });
  let el = {}, root;

  const pool = () => PA.pool(cfg.filter);

  function next() {
    const p = pool();
    let t = p.length ? PA.rand(p) : null;
    if (p.length > 1) while (t === S.target) t = PA.rand(p);
    Object.assign(S, { target: t, wrong: [], done: false, won: false });
    cfg.onNew?.(S);
    render();
    if (!root.hidden) el.ac.input.focus({ preventScroll: true });
  }

  function finish(won) {
    S.done = true; S.won = won;
    score.played++;
    if (won) { score.found++; score.streak++; score.best = Math.max(score.best, score.streak); }
    else score.streak = 0;
    store.set(KEY, score);
  }

  function pick(p) {
    if (S.done) return;
    if (p.id === S.target.id) finish(true);
    else { S.wrong.push(p); if (S.wrong.length >= MAX) finish(false); }
    render();
    if (S.done) el.verdict.querySelector("button")?.focus({ preventScroll: true });
  }

  function render() {
    el.streak.textContent = score.streak;
    el.best.textContent = score.best;
    el.found.textContent = score.found;
    el.modes?.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === S.mode));
    el.ac.input.disabled = !S.target;
    if (!S.target) {
      el.skip.hidden = el.verdict.hidden = true;
      el.tries.replaceChildren(); el.triesLabel.textContent = ""; el.wrong.replaceChildren(); el.hints.replaceChildren();
      el.stage.replaceChildren(h("p", { className: "desc", textContent: "Aucun Pokémon disponible pour ces régions dans ce jeu. Ajoute une autre région." }));
      return;
    }
    cfg.clue(el.stage, S.target, S.wrong.length, S.done, S);
    el.tries.replaceChildren(...Array.from({ length: MAX }, (_, i) => h("i", { className: i < S.wrong.length ? "used" : (S.won && i === S.wrong.length ? "won" : "") })));
    el.triesLabel.textContent = S.done ? "" : `${MAX - S.wrong.length} essai${MAX - S.wrong.length > 1 ? "s" : ""} restant${MAX - S.wrong.length > 1 ? "s" : ""}`;
    el.wrong.replaceChildren(...S.wrong.map(p => h("span", { title: p.name }, spr(p.id, 28), p.name)));
    el.hints.replaceChildren(...(cfg.hints || []).map(x => {
      const open = S.wrong.length >= x.after || S.done, left = x.after - S.wrong.length;
      const d = h("div", { className: "hint" + (open ? "" : " locked") });
      const body = open ? x.get(S.target, S.done) : `après ${left} erreur${left > 1 ? "s" : ""}`;
      if (body instanceof Node) d.append(body); else d.append(h("div", { innerHTML: `<strong>${x.label}</strong><br>${body}` }));
      return d;
    }));
    el.ac.input.disabled = S.done;
    el.skip.hidden = S.done;
    el.verdict.hidden = !S.done;
    if (S.done) {
      el.verdict.className = "verdict " + (S.won ? "ok" : "bad");
      el.verdict.innerHTML = S.won
        ? `<div><strong>Bravo, c'est ${PA.esc(S.target.name)} !</strong><br>Trouvé ${S.wrong.length ? `après ${S.wrong.length} erreur${S.wrong.length > 1 ? "s" : ""}` : "du premier coup"}.</div>`
        : `<div><strong>C'était ${PA.esc(S.target.name)}.</strong><br>La série repart de zéro.</div>`;
      const b = h("button", { type: "button", className: "btn primary", textContent: "Pokémon suivant" });
      b.onclick = next;
      el.verdict.append(b);
    }
  }

  PA.register({
    id: cfg.id, name: cfg.name, short: cfg.short, live: true, mon: cfg.mon, art: cfg.art, text: cfg.text,
    onShow: () => S.target && !S.done && el.ac.input.focus({ preventScroll: true }),
    mount(sec) {
      root = sec;
      sec.innerHTML = `
        <div class="game-head">
          <div><h1>${cfg.name}</h1><p>${cfg.intro}</p></div>
          ${cfg.modes ? `<div class="modes" role="group" aria-label="Variante" data-k="modes">${cfg.modes.map(m => `<button type="button" data-mode="${m.k}">${m.label}</button>`).join("")}</div>` : ""}
        </div>
        <div class="console">
          <div data-k="regionSlot"></div>
          <div class="status">
            <div>Série <b data-k="streak">0</b></div>
            <div>Record <b data-k="best">0</b></div>
            <div>Trouvés <b data-k="found">0</b></div>
          </div>
          <div class="round">
            <div class="stage" data-k="stage"></div>
            <div class="side">
              <div class="status"><div class="tries" data-k="tries"></div><span data-k="triesLabel"></span></div>
              <div data-k="acSlot"></div>
              <div class="wrong" data-k="wrong"></div>
              <div class="hints" data-k="hints"></div>
              <div class="verdict" data-k="verdict" hidden></div>
              <div><button type="button" class="btn ghost" data-k="skip">Je donne ma langue au Miaouss</button></div>
            </div>
          </div>
        </div>`;
      sec.querySelectorAll("[data-k]").forEach(n => el[n.dataset.k] = n);
      el.regionSlot.replaceWith(PA.regionPicker(cfg.filter, cfg.regionNote || ""));
      el.ac = PA.autocomplete({ candidates: () => pool().filter(p => !S.wrong.includes(p)), onPick: pick });
      el.acSlot.replaceWith(el.ac.el);
      el.skip.onclick = () => { finish(false); render(); };
      el.modes?.querySelectorAll("button").forEach(b => b.onclick = () => { S.mode = b.dataset.mode; next(); });
      PA.onRegions(next);
      next();
    },
  });
};
