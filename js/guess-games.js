/* Trois jeux bâtis sur PA.guessGame : seule la façon de montrer l'indice change. */
(() => {
  const { h, spr, esc } = PA;
  const typesHint = { after: 1, label: "Types", get: t => t.types.join(" / ") };
  const genHint = { after: 2, label: "Génération", get: t => `Génération ${t.gen} (${PA.REGIONS[t.gen - 1].name})` };
  const initialHint = { after: 3, label: "Initiale", get: t => `« ${t.name[0]} », ${t.name.length} lettres` };

  PA.guessGame({
    id: "silhouette", name: "Qui est ce Pokémon ?", short: "Silhouette", mon: 94, art: "shadow",
    text: "Une silhouette noire, cinq essais. Des indices se débloquent à chaque erreur.",
    intro: "Reconnais le Pokémon à sa silhouette. Tu as cinq essais, et chaque erreur débloque un indice, que tu peux consulter ou non.",
    hints: [typesHint, genHint, initialHint],
    clue(stage, t, wrong, done) {
      stage.className = "stage bg-rays";
      stage.replaceChildren(spr(t.id, 240, done ? "revealed" : "shadow"));
    },
  });

  PA.guessGame({
    id: "description", name: "Devine la description", short: "Description", mon: 63,
    text: "Lis l'extrait du Pokédex et retrouve le Pokémon qu'il décrit.",
    intro: "Une entrée du Pokédex, le nom caché. Retrouve le Pokémon décrit en cinq essais.",
    filter: p => !!p.desc,
    regionNote: " · descriptions françaises indisponibles pour une partie de Galar et pour Paldea",
    hints: [typesHint, genHint, { after: 3, label: "Silhouette", get: (t, done) => h("div", { style: "display:flex;align-items:center;gap:8px" }, spr(t.id, 48, done ? "" : "shadow"), h("strong", { textContent: "Silhouette" })) }],
    clue(stage, t, wrong, done) {
      stage.className = "stage";
      const re = new RegExp(esc(t.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const text = esc(t.desc).replace(re, done ? `<strong>${esc(t.name)}</strong>` : "<mark>???</mark>");
      const box = h("div", { className: "desc" });
      box.innerHTML = `<q>${text}</q>`;
      if (done) box.prepend(h("div", {}, spr(t.id, 96)));
      stage.replaceChildren(box);
    },
  });

  const BLUR = [18, 12, 8, 5, 3, 0];
  const ZOOM = [6, 4.5, 3.2, 2.2, 1.5, 1];
  PA.guessGame({
    id: "flou-zoom", name: "Flou & Zoom", short: "Flou & Zoom", mon: 133, art: "blur",
    text: "Une image très floue ou très zoomée qui devient plus nette à chaque erreur.",
    intro: "En mode Flou, l'image se précise à chaque erreur. En mode Zoom, la caméra recule. Cinq essais.",
    modes: [{ k: "blur", label: "Flou" }, { k: "zoom", label: "Zoom" }],
    hints: [{ ...typesHint, after: 2 }, { ...genHint, after: 3 }],
    onNew: S => { S.point = PA.opaquePoint(S.target.id); },
    clue(stage, t, wrong, done, S) {
      stage.className = "stage";
      if (S.mode === "blur") {
        const im = spr(t.id, 240);
        im.style.filter = done ? "none" : `blur(${BLUR[wrong]}px)`;
        stage.replaceChildren(im);
        return;
      }
      // Zoom : on agrandit autour d'un pixel opaque du sprite, en gardant la boîte remplie
      const BOX = 240, k = BOX / 96, z = done ? 1 : ZOOM[wrong];
      const clamp = v => Math.min(0, Math.max(BOX - BOX * z, v));
      const tx = clamp(BOX / 2 - S.point.x * k * z), ty = clamp(BOX / 2 - S.point.y * k * z);
      const im = spr(t.id, BOX);
      im.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
      stage.replaceChildren(h("div", { className: "zoombox" }, im));
    },
  });
})();
