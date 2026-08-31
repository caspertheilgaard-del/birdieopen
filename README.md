# Birdie Open

Sitet for Birdie Open: invitation-only golfturnering siden 2012.

Historikken fra 2012 til 2026 er hentet fra det gamle CodeIgniter-site og regnet
efter med en scoringsmotor, der rammer 66.420 af 66.426 kontroller. Oven på den
ligger en app, hvor spillerne taster scores ind undervejs, ser livescore, og
hvor stilling og birdieliste opdaterer sig selv, når en runde lukkes.

## Kom i gang

```bash
npm install
npm run dev
```

Uden en database læser sitet fra `data/snapshot.json`, så hele arkivet kan
gennemses lokalt med det samme.

## Kommandoer

| Kommando | Hvad den gør |
| --- | --- |
| `npm run dev` | Udviklingsserver på http://localhost:3000 |
| `npm run build` | Produktionsbuild |
| `npm test` | Scoringsmotorens unit-tests og en gennemkørsel af SQL-skemaet |
| `npm run verify` | Regner alle 15 sæsoner efter og sammenligner med det gamle sites tal |
| `npm run scrape` | Henter historikken fra birdieopen.dk til `data/legacy/` |
| `npm run snapshot` | Bygger `data/snapshot.json` ud fra `data/legacy/` |
| `npm run migrate` | Kører SQL-migrationerne mod Supabase |
| `npm run import` | Skriver historikken ind i Supabase |

## Kobl databasen på

1. Opret et gratis projekt på supabase.com.
2. Kopiér `.env.example` til `.env.local` og udfyld:
   - `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` fra Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` samme sted (kun til import, sendes aldrig til browseren)
   - `SUPABASE_DB_URL` fra Project Settings → Database → Connection string
3. `npm run migrate` opretter tabeller, scoringsfunktioner og adgangsregler.
4. `npm run import` lægger 15 sæsoners historik ind.
5. Sæt en spiller som administrator:
   `update players set role = 'admin' where slug = 'casper-theilgaard';`
6. Knyt spillere til logins ved at sætte `players.auth_user_id`, når de har logget
   ind første gang. Login er magic link, så der er ingen passwords at flytte.

Så snart nøglerne er sat, læser sitet fra databasen i stedet for snapshottet.

## Sådan hænger det sammen

```
scripts/legacy/     henter og fortolker det gamle site
scripts/import/     normaliserer og skriver til Supabase
scripts/db/         migrationer og en gennemkørsel af skemaet
src/lib/scoring/    stableford, placeringer, finalepoint, birdieliste
src/lib/data/       læselag: database når den er koblet på, ellers snapshot
src/lib/live/       livescore, offline-kø og adminhandlinger
src/app/            siderne
supabase/migrations SQL: skema, scoring, adgangsregler
```

## Reglerne i kode

Scoringen følger turneringsreglerne fra 2014 og frem:

- Stableford, hvor handicapslag fordeles efter nøgle: sværeste huller først.
- Ved afbud tildeles rundens gennemsnit, minus 2, 3, 4 eller 5 point alt efter
  hvor mange gange man har meldt afbud i sæsonen.
- Point med i finalen: føreren tager det dobbelte af antal finaledeltagere, og
  hver placering derunder giver to mindre. Bunden er maksimum minus point for en
  finalesejr.
- Finalerunder brugte en enkelt skala til og med 2022 og en dobbelt fra 2023.
  Begge æraer ligger i `finalScaleForYear`, fordi begge findes i historikken.
- Birdielisten: en eagle tæller som tre birdies, ligestilling afgøres på laveste
  nøglesum og derefter flest point.

`npm run verify` sætter det hele op mod det gamle sites egne tal. De seks
afvigelser, der er tilbage, er overført point i 2013 og 2014, hvor min-reglen
først blev ændret med virkning fra finalen 2015.

## Livescore

- Runden åbnes af turneringsledelsen under `/admin`. Så kan spillere og markører taste.
- `/live/[runde]` er leaderboardet. Det opdaterer sig selv over Supabase Realtime.
- `/live/[runde]/kort` er indtastningen: ét hul ad gangen, store felter.
- Scores gemmes først på telefonen og sendes, når der er dækning igen. Det er en
  golfbane, ikke et kontor.
- Sitet kan installeres som app på telefonen.
