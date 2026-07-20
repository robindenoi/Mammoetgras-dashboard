-- ============================================================
-- Mammoetgras Bezwaarkaarten — Database setup
-- Voer dit uit in de Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Maak de tabel aan
create table if not exists public.cards (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('Geld', 'Risico', 'Uitstel', 'Vertrouwen', 'Interesse')),
  objection text not null,
  erkennen text not null,
  reframe text not null,
  bewijs text not null,
  afsluitvraag text not null,
  script text not null,
  created_at timestamptz default now()
);

-- 2. Row Level Security aanzetten
alter table public.cards enable row level security;

-- Iedereen mag lezen (agents hoeven niet in te loggen)
create policy "Iedereen mag kaarten lezen"
  on public.cards for select
  using (true);

-- Alleen ingelogde gebruikers mogen aanmaken
create policy "Ingelogde gebruikers mogen kaarten aanmaken"
  on public.cards for insert
  to authenticated
  with check (true);

-- Alleen ingelogde gebruikers mogen wijzigen
create policy "Ingelogde gebruikers mogen kaarten wijzigen"
  on public.cards for update
  to authenticated
  using (true)
  with check (true);

-- Alleen ingelogde gebruikers mogen verwijderen
create policy "Ingelogde gebruikers mogen kaarten verwijderen"
  on public.cards for delete
  to authenticated
  using (true);

-- 3. Vul de tabel met 8 startkaarten
insert into public.cards (category, objection, erkennen, reframe, bewijs, afsluitvraag, script) values

-- GELD 1
('Geld',
 'Ik heb er nu geen geld voor.',
 'Ik snap dat je goed op je financiën let — dat is verstandig.',
 'Juist omdat je financieel slim bezig bent, is dit interessant. Mammoetgras is een reële grondstof met groeiende vraag, geen speculatie.',
 'De teelt loopt al 20-25 jaar bij Limoges in Frankrijk. De planten zijn volwassen en productief. Toepassingen in papier, bouwmaterialen en biobrandstof zorgen voor stabiele afzetmarkten.',
 'Stel dat we samen kijken welk instapbedrag bij jouw situatie past — wanneer zou dat schikken?',
 'Klant: "Ik heb er nu geen geld voor."
Jij: "Dat snap ik helemaal, en het is goed dat je daar eerlijk over bent. Juist daarom wil ik je laten zien dat dit geen groot bedrag hoeft te zijn. De plantages draaien al meer dan 20 jaar bij Limoges — dit is geen startup, maar een bewezen teelt. Zullen we samen kijken welk instapbedrag bij jou past?"'),

-- GELD 2
('Geld',
 'Ik wil eerst met mijn partner overleggen.',
 'Heel begrijpelijk, zo''n beslissing neem je samen.',
 'Wat als ik je de informatie zo helder meegeef dat je partner direct een goed beeld heeft? Veel van onze beleggers hebben het juist als gezinsinvestering opgepakt.',
 'We hebben een informatiebrochure die precies uitlegt hoe de teelt werkt, inclusief de mediavermeldingen in VPRO en het Algemeen Dagblad. En een locatiebezoek in Frankrijk is ook mogelijk.',
 'Zal ik je een pakketje sturen dat je samen kunt doorlezen, en bel ik jullie volgende week even?',
 'Klant: "Ik wil eerst met mijn partner overleggen."
Jij: "Dat snap ik volledig — het is goed dat jullie dit samen doen. Laat me je een helder pakketje meegeven met alle feiten, inclusief de mediavermeldingen van VPRO en AD. Er is ook de mogelijkheid om de plantage bij Limoges te bezoeken. Mag ik jullie volgende week even bellen om eventuele vragen te beantwoorden?"'),

-- RISICO 1
('Risico',
 'Is dit niet gewoon een te mooi verhaal?',
 'Goed dat je kritisch bent — dat zou ik ook zijn bij iets nieuws.',
 'Het klinkt bijzonder, maar de feiten zijn verifieerbaar. Mammoetgras is geen belofte, het is een plant die al decennia groeit en bewezen resultaten laat zien.',
 'De plantage draait al 20-25 jaar in Limoges. Mammoetgras slaat 5 tot 7 keer meer CO2 op dan een gemiddeld bos. VPRO en het Algemeen Dagblad hebben erover bericht. En Mammoetgras Wereldwijd is een Nederlands bedrijf, gevestigd in Amsterdam.',
 'Wat als ik je uitnodig voor een bezoek aan de plantage, zodat je het met eigen ogen kunt zien?',
 'Klant: "Is dit niet gewoon een te mooi verhaal?"
Jij: "Die scepsis begrijp ik goed. Laat me je de feiten geven: de plantage bestaat al ruim 20 jaar bij Limoges in Frankrijk. Mammoetgras slaat 5 tot 7 keer meer CO2 op dan bos. VPRO en AD hebben erover geschreven, en wij zijn een Nederlands bedrijf in Amsterdam. Zal ik je uitnodigen voor een bezoek, zodat je het zelf kunt zien?"'),

-- RISICO 2
('Risico',
 'Wat als de markt voor mammoetgras instort?',
 'Een logische zorg — je wilt weten of er straks nog vraag is.',
 'Mammoetgras heeft niet één afzetmarkt maar meerdere: papier, bouwmaterialen én biobrandstof. Die diversificatie is juist de kracht.',
 'De bouwsector zoekt actief naar duurzame grondstoffen. De papiersector wil van hout af. En de EU stimuleert biobrandstoffen. Die drie markten groeien onafhankelijk van elkaar.',
 'Welke van die toepassingen spreekt jou het meest aan? Dan kan ik je daar meer over vertellen.',
 'Klant: "Wat als de markt instort?"
Jij: "Goede vraag, en ik snap dat je daar over nadenkt. Het sterke punt is juist dat mammoetgras niet van één markt afhankelijk is. Het wordt gebruikt in papierproductie, als bouwmateriaal én als biobrandstof. De EU stimuleert al die sectoren actief. Welke toepassing vind je het interessantst? Dan vertel ik je er meer over."'),

-- UITSTEL 1
('Uitstel',
 'Ik wil er nog even over nadenken.',
 'Natuurlijk, het is een beslissing die je bewust wilt nemen.',
 'Waar ik je wel op wil wijzen: de plantages hebben een beperkte capaciteit. Hoe eerder je instapt, hoe eerder je profiteert van de groei die al gaande is.',
 'De planten bij Limoges zijn al volwassen na 20-25 jaar teelt. Je hoeft niet te wachten op groei — de opbrengst is er al. Elke maand uitstel is een maand minder rendement.',
 'Wat heb je precies nodig om een beslissing te nemen? Dan zorg ik dat je dat deze week nog hebt.',
 'Klant: "Ik wil er nog even over nadenken."
Jij: "Dat is heel begrijpelijk. Wat ik je wel wil meegeven: de plantages bij Limoges draaien al 20 tot 25 jaar. De planten zijn volwassen en productief, dus je hoeft niet op groei te wachten. Elke maand dat je wacht, is rendement dat je laat liggen. Wat heb je nodig om deze week een beslissing te kunnen nemen?"'),

-- UITSTEL 2
('Uitstel',
 'Ik bel je later wel terug.',
 'Prima, ik wil je zeker niet onder druk zetten.',
 'Mag ik je één ding vragen? Vaak is "later terugbellen" het moment dat het erbij inschiet. Laten we nu een concreet moment prikken.',
 'Onze ervaring is dat wie een concreet volgend contactmoment plant, veel tevredener is met het proces. En je zit nergens aan vast — het is gewoon een gesprek.',
 'Kan ik je donderdag om 14:00 bellen? Dan heb je ook even tijd gehad om erover na te denken.',
 'Klant: "Ik bel je later wel terug."
Jij: "Geen probleem, ik wil je nergens toe pushen. Maar eerlijk: als we nu een moment prikken, dan weet je zeker dat het niet erbij inschiet. Je zit nergens aan vast. Kan ik je donderdag om 14:00 bellen? Dan heb je rustig de tijd gehad."'),

-- VERTROUWEN
('Vertrouwen',
 'Ik ken jullie bedrijf niet.',
 'Helemaal terecht dat je wilt weten met wie je zaken doet.',
 'Mammoetgras Wereldwijd is een Nederlands bedrijf, gevestigd in Amsterdam. We zijn transparant over wie we zijn en wat we doen.',
 'We zijn vermeld in VPRO-uitzendingen en het Algemeen Dagblad. Je kunt onze plantage bij Limoges in Frankrijk bezoeken. En we nodigen je van harte uit op kantoor in Amsterdam.',
 'Zal ik een kennismakingsgesprek op kantoor in Amsterdam inplannen, of heb je liever eerst een videocall?',
 'Klant: "Ik ken jullie bedrijf niet."
Jij: "Dat snap ik, en het is goed dat je dat zegt. Mammoetgras Wereldwijd is een Nederlands bedrijf in Amsterdam. We zijn besproken door VPRO en in het AD. Je kunt de plantage in Frankrijk bezoeken of langskomen op ons kantoor. Wat past je beter: een afspraak in Amsterdam of eerst een videocall?"'),

-- INTERESSE
('Interesse',
 'Ik heb al genoeg beleggingen.',
 'Mooi dat je al een portfolio hebt — dat toont financieel bewustzijn.',
 'Juist voor ervaren beleggers is mammoetgras interessant als diversificatie. Het correleert niet met de aandelenmarkt en heeft een tastbaar, fysiek product.',
 'Terwijl aandelen en crypto schommelen, groeit mammoetgras gewoon door — letterlijk. De vraag naar duurzame grondstoffen voor papier, bouw en biobrandstof stijgt los van beursontwikkelingen.',
 'Welk percentage van je portfolio zit nu in reële, tastbare assets? Misschien past mammoetgras precies in dat stukje.',
 'Klant: "Ik heb al genoeg beleggingen."
Jij: "Goed om te horen dat je financieel actief bent. Juist daarom is dit interessant: mammoetgras correleert niet met de beurs. Terwijl aandelen en crypto schommelen, groeit het gewoon door. De vraag naar duurzame grondstoffen stijgt onafhankelijk van beursontwikkelingen. Welk deel van je portfolio zit nu in tastbare assets? Mammoetgras past daar misschien precies in."');
