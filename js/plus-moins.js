/* Plus ou Moins : le Pokémon de droite est-il plus lourd, plus grand ou plus fort ? */
(() => {
  const { h, spr, store, esc } = PA;
  const MODES = {
    weight: { label: "Poids", unit: "kg", what: "pèse", up: "Plus lourd", down: "Plus léger", fmt: v => v.toLocaleString("fr-FR") + " kg" },
    height: { label: "Taille", unit: "m", what: "mesure", up: "Plus grand", down: "Plus petit", fmt: v => v.toLocaleString("fr-FR") + " m" },
    bst: { label: "Stats", unit: "", what: "a un total de stats de", up: "Plus fort", down: "Moins fort", fmt: v => v + " pts" },
  };
  const S = { mode: "weight", left: null, right: null, score: 0, over: false, locked: false, answered: null };
  const best = store.get("pa-pm-best", { weight: 0, height: 0, bst: 0 });
  let el = {};

  const val = p => p[S.mode];
  function draw(exclude) {
    const p = PA.pool(x => !exclude || val(x) !== val(exclude));
    return p.length ? PA.rand(p) : null;
  }
  function restart() {
    S.score = 0; S.over = false; S.locked = false; S.answered = null;
    S.left = draw(); S.right = S.left && draw(S.left);
    render(true);
  }

  function fighter(p, showVal, isRight) {
    const m = MODES[S.mode];
    const f = h("div", { className: "fighter" + (isRight ? " enter" : "") }, spr(p.id, 128));
    f.append(h("h2", { textContent: p.name }), h("div", { className: "lbl", textContent: m.what }));
    f.append(h("div", { className: "val", textContent: showVal ? m.fmt(val(p)) : "?" }));
    if (isRight && !S.answered) {
      const c = h("div", { className: "choice" });
      [["up", "▲ " + m.up], ["down", "▼ " + m.down]].forEach(([k, label]) => {
        const b = h("button", { type: "button", className: "btn primary", textContent: label });
        b.onclick = () => answer(k);
        c.append(b);
      });
      f.append(c);
    }
    return f;
  }

  function answer(k) {
    if (S.locked || S.over) return;
    S.locked = true;
    const a = val(S.left), b = val(S.right);
    const ok = k === "up" ? b >= a : b <= a;
    S.answered = ok ? "ok" : "bad";
    render(false);
    setTimeout(() => {
      if (ok) {
        S.score++;
        if (S.score > best[S.mode]) { best[S.mode] = S.score; store.set("pa-pm-best", best); }
        S.left = S.right; S.right = draw(S.left);
        S.answered = null; S.locked = false;
        if (!S.right) S.over = true;
        render(true);
      } else { S.over = true; S.locked = false; render(false); }
    }, 1100);
  }

  function render(animate) {
    el.modes.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === S.mode));
    el.score.textContent = S.score;
    el.best.textContent = best[S.mode];
    if (!S.left || !S.right) {
      el.duel.replaceChildren(h("p", { textContent: "Il faut au moins deux Pokémon dans les régions choisies." }));
      el.over.hidden = true; return;
    }
    const vs = h("div", { className: "vs" + (S.answered ? " " + S.answered : ""), textContent: S.answered === "ok" ? "✓" : S.answered === "bad" ? "✗" : "VS" });
    const right = fighter(S.right, !!S.answered, true);
    if (!animate) right.classList.remove("enter");
    el.duel.replaceChildren(fighter(S.left, true, false), vs, right);
    el.over.hidden = !S.over;
    if (S.over) {
      const m = MODES[S.mode];
      el.over.innerHTML = `<div><strong>Perdu ! Score : ${S.score}</strong><br>${esc(S.right.name)} ${m.what} ${m.fmt(val(S.right))}, contre ${m.fmt(val(S.left))} pour ${esc(S.left.name)}.</div>`;
      const b = h("button", { type: "button", className: "btn primary", textContent: "Rejouer" });
      b.onclick = restart;
      el.over.append(b);
      b.focus({ preventScroll: true });
    }
  }

  PA.register({
    id: "plus-ou-moins", name: "Plus ou Moins", short: "Plus ou Moins", live: true, mon: 143,
    text: "Lequel est le plus lourd, le plus grand ou le plus fort ? Enchaîne les bonnes réponses.",
    mount(sec) {
      sec.innerHTML = `
        <div class="game-head">
          <div><h1>Plus ou Moins</h1><p>Le Pokémon de droite est-il au-dessus ou en dessous de celui de gauche ? En cas d'égalité, les deux réponses comptent. Une erreur et c'est fini.</p></div>
          <div class="modes" role="group" aria-label="Critère" data-k="modes">
            ${Object.entries(MODES).map(([k, m]) => `<button type="button" data-mode="${k}">${m.label}</button>`).join("")}
          </div>
        </div>
        <div class="console">
          <div data-k="regionSlot"></div>
          <div class="status"><div>Score <b data-k="score">0</b></div><div>Record <b data-k="best">0</b></div></div>
          <div class="duel" data-k="duel"></div>
          <div class="verdict bad" data-k="over" hidden></div>
        </div>`;
      sec.querySelectorAll("[data-k]").forEach(n => el[n.dataset.k] = n);
      el.regionSlot.replaceWith(PA.regionPicker());
      el.modes.querySelectorAll("button").forEach(b => b.onclick = () => { S.mode = b.dataset.mode; restart(); });
      PA.onRegions(restart);
      restart();
    },
  });
})();
