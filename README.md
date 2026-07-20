# Mammoetgras — Bezwaarkaarten Dashboard

Sales objection-handling dashboard voor Mammoetgras Wereldwijd. Agents gebruiken dit om bezwaren van klanten te leren afhandelen en effectief te closen.

---

## Stap-voor-stap installatie

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account
2. Klik **New Project** en kies een naam (bijv. "mammoetgras-dashboard")
3. Kies een sterk database-wachtwoord en sla het op
4. Wacht tot het project is aangemaakt (±2 minuten)

### 2. Database opzetten

1. Ga in je Supabase project naar **SQL Editor** (linkermenu)
2. Klik **New query**
3. Open het bestand `supabase-setup.sql` uit deze map en kopieer de volledige inhoud
4. Plak het in de SQL Editor en klik **Run**
5. Je ziet nu "Success" — de tabel en 8 startkaarten zijn aangemaakt

### 3. Admin-gebruikers aanmaken

1. Ga naar **Authentication** > **Users** in Supabase
2. Klik **Add user** > **Create new user**
3. Vul het e-mailadres en wachtwoord in voor Joey
4. Herhaal voor Quincy
5. Deze twee accounts kunnen nu inloggen als admin

### 4. API-sleutels ophalen

1. Ga naar **Settings** > **API** in Supabase
2. Kopieer de **Project URL** (begint met `https://`)
3. Kopieer de **anon public** key (lange reeks tekens)

### 5. Project lokaal opstarten (optioneel)

```bash
# Kopieer het voorbeeld-bestand voor omgevingsvariabelen
cp .env.local.example .env.local

# Open .env.local en vul je Supabase URL en anon key in

# Installeer afhankelijkheden
npm install

# Start de ontwikkelserver
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

### 6. Deployen naar Vercel (gratis)

1. Push dit project naar een GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Eerste versie bezwaarkaarten"
   git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/mammoetgras-dashboard.git
   git push -u origin main
   ```
2. Ga naar [vercel.com](https://vercel.com) en log in met je GitHub-account
3. Klik **Add New** > **Project**
4. Selecteer je `mammoetgras-dashboard` repository
5. Voeg onder **Environment Variables** twee variabelen toe:
   - `NEXT_PUBLIC_SUPABASE_URL` → plak je Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → plak je anon key
6. Klik **Deploy**
7. Na ±1 minuut is je dashboard live op een `.vercel.app` URL

### 7. Eigen domein koppelen (optioneel)

1. Ga in Vercel naar je project > **Settings** > **Domains**
2. Voeg je domein toe (bijv. `sales.mammoetgraswereldwijd.nl`)
3. Volg de instructies om je DNS in te stellen

---

## Gebruik

### Voor sales agents
- Open het dashboard (geen login nodig)
- Filter op categorie: Geld, Risico, Uitstel, Vertrouwen, Interesse
- Klik op een bezwaarkaart om de route naar de close te zien
- Leer het voorbeeldscript uit je hoofd of gebruik het als leidraad

### Voor admins (Joey & Quincy)
- Klik op **Admin** rechtsboven en log in
- Maak nieuwe kaarten aan met de **+ Nieuwe kaart** knop
- Bewerk of verwijder bestaande kaarten vanuit de detailweergave
- Wijzigingen zijn direct zichtbaar voor alle agents

---

## Technische details

- **Framework:** Next.js 15 (App Router) + Tailwind CSS
- **Database:** Supabase (PostgreSQL met Row Level Security)
- **Hosting:** Vercel (gratis tier)
- **Authenticatie:** Supabase Auth (e-mail + wachtwoord)
