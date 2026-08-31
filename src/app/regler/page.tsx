export const metadata = { title: "Regler" };

const TOURNAMENT = [
  "Der spilles stableford.",
  "Deltagere har på første hul ret til én mulligan. Spilles en mulligan, skal den bold spilles.",
  "Der spilles 7 indledende runder fra april til august: 1 i april, 2 i maj, 2 i juni, 1 i juli og 1 i august.",
  "Der spilles 2-3 runder i finaleweekenden i august/september.",
  "Alle scores fra de indledende runder lægges sammen.",
  "Efter de indledende runder overføres en omregnet score til finalen: den førende spiller får det maksimale antal point med (antal finaledeltagere gange to), nr. 2 to point færre, og så fremdeles. Ved pointlighed får spillerne samme point med over, og der springes en placering over. Det mindste antal point, man kan tage med, er maksimum minus point for en sejr i en finalerunde. Point for en sejr svarer til antallet af finaledeltagere.",
  "I hver finalerunde spilles der om point efter placering: førstepladsen får point svarende til antal deltagere, andenpladsen ét mindre, og så videre.",
  "Ved pointlighed fås den score, som placeringen tildeler. Det gælder både ved overførsel til finalen og i hver finalerunde.",
  "Inden finaleweekenden laves en placeringsoversigt, så man går ud i førebold m.v. på 1. finalerunde.",
  "Ved pointlighed om 1. pladsen efter finalen spilles der omspil på ét hul om placeringen.",
  "Ved pointlighed om sejren i en runde afgøres det på bedste bagni, dernæst laveste handicap. Det gælder kun præmier, ikke point.",
  "Ved afbud tildeles point således: 1. afbud giver gennemsnitsscoren, 2. afbud gennemsnittet minus 2 point, 3. afbud minus 3, 4. afbud minus 4, og 5. til 10. afbud minus 5.",
  "Alle datoer for runderne fastlægges, inden turneringen går i gang.",
  "Der spilles efter de gældende golfregler, dog med mulligan.",
  "Resultaterne opdateres løbende på birdieopen.dk.",
  "Ved fejl i scorekort afgør turneringsledelsen konsekvensen.",
];

const COURSES = [
  "Det optimale er at spille på en ny bane i hver runde.",
  "Der tilstræbes at spille på banerne i Østjylland (fx Kalø, Mollerup, Ådal, Hammel, Lyngbygaard, Randers, Horsens, Ebeltoft, Grenå, Lübker, Odder, Skanderborg m.fl.).",
  "Finaleweekenden spilles på et anlæg med gode faciliteter til overnatning og spisning.",
  "Banerne udvælges sammen med datoerne, og én ansvarlig står for samlet booking.",
];

const PRICE = [
  "Der spilles ca. 10 runder inkl. finale til en gennemsnitspris på 200-250 kr. Samlet greenfee er i størrelsesordenen 2.000 kr.",
  "Overnatning og spisning i finaleweekenden forventes at koste 1.000-1.500 kr. afhængig af tilbud.",
  "Det koster 250 kr. pr. person at deltage. Pengene går til præmier og løbende overraskelser.",
];

function RuleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card rules-card">
      <h2>{title}</h2>
      <ol>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </div>
  );
}

export default function RulesPage() {
  return (
    <main className="wrap wrap--regler">
      <h1 className="page-title">REGLER</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        Gældende fra sæsonen 2014 og frem. De oprindelige{" "}
        <a href="https://www.birdieopen.dk/index.php/rules">regler anno 2012</a> findes stadig i arkivet.
      </p>

      <RuleCard title="TURNERINGSREGLER" items={TOURNAMENT} />
      <RuleCard title="BANER" items={COURSES} />
      <RuleCard title="PRIS" items={PRICE} />

      <p className="footnote">
        Pkt. 2 tilføjet, og reglerne om max- og minpoint i pkt. 6 ændret med virkning fra finalen i sæson 2015.
      </p>
      <p className="footnote">
        Om pkt. 7: til og med sæson 2022 gav en sejr i en finalerunde point svarende til antal
        finaledeltagere, og hver placering derunder ét point mindre. Fra sæson 2023 er skalaen fordoblet,
        så en sejr giver det dobbelte og hver placering to point mindre. Resultaterne i arkivet er
        beregnet efter den skala, der var gældende det år.
      </p>
    </main>
  );
}
