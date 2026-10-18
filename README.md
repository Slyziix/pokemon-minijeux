# Poké Arcade

Un site de mini-jeux sur les 1025 Pokémon des neuf générations, en français.

## Les jeux

- **PokéMotus** : devine le Pokémon mystère grâce à ses types, son habitat, sa couleur, son stade d'évolution, sa taille, son poids et sa génération. Un défi du jour commun à tous, et des parties libres.
- **Cinq Familles** : 25 Pokémon à regrouper en 5 familles de 5 qui partagent un point commun (type, région, faiblesse, taille…). Quatre erreurs autorisées.
- **Qui est ce Pokémon ?** : reconnais le Pokémon à sa silhouette.
- **Devine la description** : retrouve le Pokémon décrit par une entrée du Pokédex.
- **Flou & Zoom** : une image floue ou très zoomée qui se précise à chaque erreur.
- **Plus ou Moins** : le Pokémon de droite est-il plus lourd, plus grand ou plus fort que celui de gauche ?

Dans chaque jeu, un clic sur le starter d'une région l'ajoute ou la retire de la sélection.

## Lancer le site

Le site est entièrement statique, mais il charge ses données avec `fetch`, il faut donc le servir via un petit serveur HTTP (ouvrir `index.html` directement ne fonctionne pas) :

```bash
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

Il peut aussi être publié tel quel sur GitHub Pages, Netlify ou Vercel.

## Structure

```
index.html          page principale
css/style.css       styles
js/core.js          données, sprites, routage, sélecteur de régions, autocomplétion
js/motus.js         PokéMotus
js/familles.js      Cinq Familles
js/guess.js         moteur commun des jeux de devinette
js/guess-games.js   Silhouette, Description, Flou & Zoom
js/plus-moins.js    Plus ou Moins
data/pokemon.json   données des Pokémon
data/sprites.png    planche des sprites (32 colonnes de 96 px, ordre du Pokédex)
tools/build_data.py régénère les deux fichiers de data/
```

## Régénérer les données

Les données viennent de [PokeAPI](https://github.com/PokeAPI/pokeapi) (fichiers CSV de `data/v2/csv`) et des [sprites PokeAPI](https://github.com/PokeAPI/sprites). Il faut Python 3 et Pillow :

```bash
python3 tools/build_data.py <dossier_csv> <dossier_sprites> data
```

Le dossier CSV doit contenir `pokemon`, `pokemon_species`, `pokemon_species_names`, `pokemon_types`, `type_names`, `pokemon_habitat_names`, `pokemon_color_names`, `pokemon_species_flavor_text` et `pokemon_stats`. Le dossier des sprites contient `1.png` à `1025.png`.

## Mentions

Pokémon et les noms des Pokémon sont des marques de Nintendo, Creatures Inc. et GAME FREAK inc. Ce site est un projet de fan, non officiel et sans but commercial.
