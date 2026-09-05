# Sæt sitet op på Netlify

Sitet bygges som rene filer, så der er ingen server at holde kørende.

## Én gang

1. Log ind på [netlify.com](https://app.netlify.com) og vælg **Add new site → Import an existing project**.
2. Vælg **GitHub** og find `birdieopen`. Er repoet privat, skal Netlify have adgang
   til det, hvilket den selv beder om undervejs.
3. Netlify læser `netlify.toml`, så byggeopskriften er udfyldt på forhånd:
   - Build command: `npm run build:static`
   - Publish directory: `out`
4. Tryk **Deploy**. Første build tager et par minutter, mest fordi
   afhængighederne skal hentes.

Derefter bygger Netlify automatisk, hver gang der bliver skubbet til `main`.

## Hvad der ikke er med

Livescore, indtastning, login og administration kræver en database. De ruter
bliver lagt til side under et statisk build. Skærmene kan stadig ses med
opdigtede scores på `/design/live` og `/design/kort`, og Live-siden i menuen
peger på dem.

Når Supabase er koblet på, skal sitet i stedet hostes et sted der kan køre
Next.js på serveren, for eksempel Vercel eller Netlify med deres Next-runtime.

## Opdatere indholdet

Historikken ligger som JSON i `data/`, så et build henter ikke noget udefra.
Når der er spillet en ny runde:

```bash
npm run scrape -- --fresh 26   # hent sæsonen forfra fra birdieopen.dk
npm run snapshot               # byg datasættet om
npm run verify                 # regn efter mod det gamle sites tal
git commit -am "Opdater data" && git push
```

Netlify bygger selv videre derfra.
