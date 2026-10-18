"""Construit data/pokemon.json et data/sprites.png à partir des CSV PokeAPI et des sprites.
Usage : python3 build_data.py <dossier_csv> <dossier_sprites> <dossier_sortie>"""
import csv, json, sys, os
from PIL import Image

csv_dir, sprite_dir, out_dir = sys.argv[1:4]
FR = "5"

def rows(name):
    with open(os.path.join(csv_dir, name + ".csv"), encoding="utf-8") as f:
        return list(csv.DictReader(f))

names = {r["pokemon_species_id"]: r["name"] for r in rows("pokemon_species_names") if r["local_language_id"] == FR}
types_fr = {r["type_id"]: r["name"] for r in rows("type_names") if r["local_language_id"] == FR}
habitats = {r["pokemon_habitat_id"]: r["name"].capitalize() for r in rows("pokemon_habitat_names") if r["pokemon_habitat_id"] and r["local_language_id"] == FR}
colors = {r["pokemon_color_id"]: r["name"] for r in rows("pokemon_color_names") if r["local_language_id"] == FR}

species = {r["id"]: r for r in rows("pokemon_species")}
default_pkmn = {r["species_id"]: r for r in rows("pokemon") if r["is_default"] == "1"}
ptypes = {}
for r in rows("pokemon_types"):
    ptypes.setdefault(r["pokemon_id"], []).append((int(r["slot"]), types_fr[r["type_id"]]))

# Description Pokédex française la plus récente, et total des statistiques de base
descs = {}
for r in rows("pokemon_species_flavor_text"):
    if r["language_id"] == FR:
        descs[r["species_id"]] = max(descs.get(r["species_id"], (0, "")), (int(r["version_id"]), r["flavor_text"]))
def clean(t):
    return " ".join(t.replace("\u00ad", "").replace("\f", " ").split())
bst = {}
for r in rows("pokemon_stats"):
    bst[r["pokemon_id"]] = bst.get(r["pokemon_id"], 0) + int(r["base_stat"])

def stage(sid):
    n = 1
    while species[sid]["evolves_from_species_id"]:
        sid = species[sid]["evolves_from_species_id"]
        n += 1
    return n

def ancestor_gens(sid):
    """Générations des pré-évolutions, de la plus proche à la plus lointaine."""
    out = []
    while species[sid]["evolves_from_species_id"]:
        sid = species[sid]["evolves_from_species_id"]
        out.append(int(species[sid]["generation_id"]))
    return out

out = []
for sid in sorted(species, key=int):
    s, p = species[sid], default_pkmn[sid]
    t = [name for _, name in sorted(ptypes[p["id"]])]
    out.append({
        "id": int(sid),
        "name": names[sid],
        "types": t,
        "habitat": habitats.get(s["habitat_id"], "Inconnu"),
        "color": colors[s["color_id"]],
        "stage": stage(sid),
        "pre": ancestor_gens(sid),
        "height": int(p["height"]) / 10,
        "weight": int(p["weight"]) / 10,
        "gen": int(s["generation_id"]),
        "bst": bst[p["id"]],
        "desc": clean(descs[sid][1]) if sid in descs else "",
        "legendary": s["is_legendary"] == "1" or s["is_mythical"] == "1",
    })

with open(os.path.join(out_dir, "pokemon.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

# Planche de sprites : 32 colonnes de cases 96x96, ordre du Pokédex
COLS, SIZE = 32, 96
rows_n = (len(out) + COLS - 1) // COLS
sheet = Image.new("RGBA", (COLS * SIZE, rows_n * SIZE), (0, 0, 0, 0))
for i, pk in enumerate(out):
    im = Image.open(os.path.join(sprite_dir, f"{pk['id']}.png")).convert("RGBA")
    sheet.paste(im, ((i % COLS) * SIZE, (i // COLS) * SIZE))
sheet.save(os.path.join(out_dir, "sprites.png"), optimize=True)
print(len(out), "pokémon")
