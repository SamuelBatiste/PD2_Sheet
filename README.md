# PD2 Sheet

Kleines Nachschlagewerk für Project Diablo 2: Runewords, Crafting, Cube Recipes, Corruptions, Unique Weapons und Uber Bosses.

## Struktur

```
index.html          Seite mit Navigation und allen Bereichen
assets/style.css    das komplette Design (ein Stylesheet)
assets/app.js       Suche, Filter, Sortierung (Alpine.js)
data/*.json         alle Inhalte – hier Daten ändern oder ergänzen
Tabs/hll_arty.html  eigenständiger HLL-Artillerie-Rechner (unverändert)
```

Jeder Bereich hat eine eigene Adresse, z. B. `index.html#cube`.

## Lokal starten

Die Daten werden per `fetch` geladen, daher bitte über einen Webserver öffnen (nicht per Doppelklick):

```
python -m http.server 8000
```

Dann `http://localhost:8000` aufrufen. Auf GitHub Pages funktioniert es direkt.

## Daten ergänzen

Einträge in den JSON-Dateien unter `data/` anhängen, das Design passt sich automatisch an.
Wertebereiche in eckigen Klammern wie `[10-20]` werden automatisch hervorgehoben.
