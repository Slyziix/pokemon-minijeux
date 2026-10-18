/* Noyau partagé par tous les mini-jeux : données, sprites, routage, régions, autocomplétion. */
window.PA = (() => {
  const COLS = 32, SRC = 96;
  const PA = { dex: [], byId: new Map(), games: [] };

  PA.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  PA.spr = (id, size, extra = "") => {
    // Positions en % : le sprite reste juste si le CSS change sa taille
    const i = id - 1, rows = 33;
    const el = document.createElement("span");
    el.className = "spr " + extra;
    el.style.width = el.style.height = size + "px";
    el.style.backgroundSize = `${COLS * 100}% ${rows * 100}%`;
    el.style.backgroundPosition = `${(i % COLS) / (COLS - 1) * 100}% ${Math.floor(i / COLS) / (rows - 1) * 100}%`;
    return el;
  };
  PA.norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  PA.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  PA.rand = a => a[Math.floor(Math.random() * a.length)];
  PA.h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

  /* Point opaque au hasard dans un sprite (pour le zoom), lu depuis la planche */
  let sheetCtx = null;
  PA.opaquePoint = id => {
    if (!sheetCtx) return { x: 48, y: 48 };
    const i = id - 1, ox = (i % COLS) * SRC, oy = Math.floor(i / COLS) * SRC;
    const d = sheetCtx.getImageData(ox, oy, SRC, SRC).data, pts = [];
    for (let y = 0; y < SRC; y += 2) for (let x = 0; x < SRC; x += 2) if (d[(y * SRC + x) * 4 + 3] > 200) pts.push({ x, y });
    return pts.length ? PA.rand(pts) : { x: 48, y: 48 };
  };

  /* ---------- Régions (partagées entre les jeux) ---------- */
  PA.REGIONS = [
    { gen: 1, name: "Kanto", mon: 1 }, { gen: 2, name: "Johto", mon: 152 }, { gen: 3, name: "Hoenn", mon: 252 },
    { gen: 4, name: "Sinnoh", mon: 387 }, { gen: 5, name: "Unys", mon: 495 }, { gen: 6, name: "Kalos", mon: 650 },
    { gen: 7, name: "Alola", mon: 722 }, { gen: 8, name: "Galar", mon: 810 }, { gen: 9, name: "Paldea", mon: 906 },
  ];
  const ALL = PA.REGIONS.map(r => r.gen);
  PA.gens = PA.store.get("pa-gens", ALL);
  const regionListeners = new Set();
  PA.onRegions = fn => regionListeners.add(fn);
  PA.setGens = gens => {
    PA.gens = [...gens].sort((a, b) => a - b);
    PA.store.set("pa-gens", PA.gens);
    document.querySelectorAll(".regions").forEach(drawRegions);
    regionListeners.forEach(fn => fn(PA.gens));
  };
  /* Stade d'évolution en ne comptant que les pré-évolutions des générations données :
     en Gén. 1 seule, Pikachu est stade 1 car Pichu (Gén. 2) n'existe pas encore. */
  PA.stage = (p, gens = PA.gens) => 1 + p.pre.filter(g => gens.includes(g)).length;
  PA.pool = (filter = () => true) => PA.dex.filter(p => PA.gens.includes(p.gen) && filter(p));

  /* Un clic sur le starter ajoute ou retire sa région. Si toutes les régions sont actives,
     le premier clic sélectionne uniquement celle-ci. */
  function drawRegions(box) {
    const note = box.dataset.note || "";
    const list = PA.h("div", { className: "region-list" });
    PA.REGIONS.forEach(r => {
      const on = PA.gens.includes(r.gen);
      const b = PA.h("button", { type: "button", className: "region", title: `${r.name} (génération ${r.gen})` });
      b.setAttribute("aria-pressed", on);
      b.append(PA.spr(r.mon, 72), PA.h("small", { innerHTML: `<b>${r.name}</b>Gén. ${r.gen}` }));
      b.onclick = () => {
        let g;
        if (PA.gens.length === ALL.length) g = [r.gen];
        else if (on) g = PA.gens.filter(x => x !== r.gen);
        else g = [...PA.gens, r.gen];
        if (!g.length) g = ALL;
        PA.setGens(g);
      };
      list.append(b);
    });
    const head = PA.h("div", { className: "regions-head" });
    const count = PA.pool(box._filter || undefined).length;
    head.innerHTML = `<strong>Régions</strong><span>${PA.gens.length === ALL.length ? "Toutes les régions" : PA.gens.map(g => PA.REGIONS[g - 1].name).join(", ")} · ${count} Pokémon${note}</span>`;
    const all = PA.h("button", { type: "button", textContent: "Tout sélectionner" });
    all.hidden = PA.gens.length === ALL.length;
    all.onclick = () => PA.setGens(ALL);
    head.append(all);
    box.replaceChildren(head, list);
  }
  PA.regionPicker = (filter, note = "") => {
    const box = PA.h("div", { className: "regions" });
    box._filter = filter; box.dataset.note = note;
    if (PA.dex.length) drawRegions(box);
    return box;
  };

  /* ---------- Autocomplétion ---------- */
  PA.autocomplete = ({ placeholder = "Tape le nom d'un Pokémon…", candidates, onPick }) => {
    const input = PA.h("input", { type: "text", autocomplete: "off", spellcheck: false, placeholder });
    input.setAttribute("aria-label", "Nom d'un Pokémon");
    const list = PA.h("ul", { className: "suggest", hidden: true });
    list.setAttribute("role", "listbox");
    let matches = [], sel = 0;
    const draw = () => {
      list.hidden = matches.length === 0;
      list.replaceChildren(...matches.map((p, i) => {
        const b = PA.h("button", { type: "button", className: i === sel ? "on" : "", tabIndex: -1 }, PA.spr(p.id, 40), p.name);
        b.insertAdjacentHTML("beforeend", `<small>n° ${p.id}</small>`);
        b.onmousedown = e => { e.preventDefault(); pick(p); };
        const li = PA.h("li", {}, b); li.setAttribute("role", "option");
        return li;
      }));
      list.children[sel]?.scrollIntoView({ block: "nearest" });
    };
    const update = () => {
      const q = PA.norm(input.value);
      if (!q) { matches = []; list.hidden = true; return; }
      const c = candidates();
      // Uniquement les noms qui commencent par ce qui est tapé (accents et majuscules ignorés)
      matches = c.filter(p => p.key.startsWith(q)).slice(0, 50);
      sel = 0; draw();
    };
    const pick = p => { input.value = ""; matches = []; list.hidden = true; onPick(p); input.focus(); };
    input.addEventListener("input", update);
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" && matches.length) { sel = (sel + 1) % matches.length; draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp" && matches.length) { sel = (sel - 1 + matches.length) % matches.length; draw(); e.preventDefault(); }
      else if (e.key === "Enter" && matches[sel]) { pick(matches[sel]); e.preventDefault(); }
      else if (e.key === "Escape") list.hidden = true;
    });
    input.addEventListener("blur", () => setTimeout(() => list.hidden = true, 100));
    return { el: PA.h("div", { className: "search" }, input, list), input };
  };

  /* ---------- Jeux et routage ---------- */
  PA.register = game => PA.games.push(game);

  function route() {
    const id = location.hash.slice(1);
    const cur = PA.games.find(g => g.id === id && g.live) ? id : "accueil";
    document.querySelectorAll("main > section").forEach(s => s.hidden = s.id !== "view-" + cur);
    document.querySelectorAll("[data-route]").forEach(a => a.dataset.route === cur ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    const g = PA.games.find(x => x.id === cur);
    g?.onShow?.();
    window.scrollTo(0, 0);
  }

  function renderHome() {
    const grid = document.getElementById("games");
    grid.replaceChildren(...PA.games.map(x => {
      const a = PA.h(x.live ? "a" : "div", { className: "game" + (x.live ? " live" : "") });
      if (x.live) a.href = "#" + x.id;
      a.innerHTML = `<span class="tag">${x.live ? "Jouable" : "Bientôt"}</span>`;
      a.append(PA.h("div", { className: "art" }, PA.spr(x.mon, 64, x.art || "")));
      a.insertAdjacentHTML("beforeend", `<h3>${x.name}</h3><p>${x.text}</p>`);
      return a;
    }));
    document.getElementById("hero-mons").replaceChildren(...[1, 4, 7, 25].map(id => PA.spr(id, 72)));
    const nav = document.getElementById("nav");
    nav.replaceChildren(PA.h("a", { href: "#accueil", textContent: "Jeux" }), ...PA.games.filter(g => g.live).map(g => PA.h("a", { href: "#" + g.id, textContent: g.short || g.name })));
    nav.firstChild.dataset.route = "accueil";
    [...nav.children].slice(1).forEach((a, i) => a.dataset.route = PA.games.filter(g => g.live)[i].id);
  }

  PA.boot = () => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; sheetCtx = c.getContext("2d", { willReadFrequently: true }); sheetCtx.drawImage(img, 0, 0); };
    img.src = "data/sprites.png";
    fetch("data/pokemon.json").then(r => r.json()).then(data => {
      PA.dex = data;
      data.forEach(p => { p.key = PA.norm(p.name); PA.byId.set(p.id, p); });
      const main = document.querySelector("main");
      PA.games.filter(g => g.live).forEach(g => {
        const sec = PA.h("section", { id: "view-" + g.id, hidden: true });
        main.append(sec);
        g.mount(sec);
      });
      document.querySelectorAll(".regions").forEach(drawRegions);
      renderHome();
      route();
    });
    addEventListener("hashchange", route);
  };

  return PA;
})();
