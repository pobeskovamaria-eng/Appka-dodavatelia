# Appka – Dodávatelia látok

Interná webová aplikácia na vyhľadávanie, evidenciu, filtrovanie a hodnotenie dodávateľov látok (hodváb, bavlna, TENCEL, bambus a iné prírodné materiály).

Aplikácia je v slovenčine a beží lokálne. Dáta sú uložené v SQLite súbore `data/suppliers.db`.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** – minimalistický dizajn
- **SQLite** cez `better-sqlite3` – jednoduchá, súborová databáza bez ďalšieho servera
- **Server actions** na CRUD operácie

## Spustenie lokálne

Predpoklady: Node.js 18+ a npm.

```bash
# 1. inštalácia závislostí
npm install

# 2. spustenie vývojového servera
npm run dev
```

Aplikácia bude dostupná na [http://localhost:3000](http://localhost:3000).

Pri prvom spustení sa automaticky vytvorí priečinok `data/` a SQLite súbor `data/suppliers.db`.

### Produkčné spustenie (voliteľné)

```bash
npm run build
npm start
```

## Funkcie

- **Dashboard** – prehľad počtov, top kandidátov, shortlist a kontaktov na vybavenie.
- **Zoznam dodávateľov** – tabuľka s rozsiahlymi filtrami (krajina, typ firmy, hodnotenie, skóre, hodváb 19/22 momme, certifikácie, B2B, riziká…) a textovým vyhľadávaním.
- **Detail dodávateľa** – prehľadne rozdelený do sekcií (základné údaje, materiály, hodváb, farbenie, certifikácie, B2B, dôveryhodnosť, poznámky).
- **Formulár na pridanie / úpravu** – povinné sú iba *Názov firmy* a *Webová stránka*; ostatné polia môžeš dopĺňať postupne.
- **Automatické skórovanie 0–100** s možnosťou manuálneho prepisu. Skóre sa prepočíta pri každom uložení.
- **Hodnotenie** podľa skóre: *Veľmi vhodný* (85+), *Vhodný* (70–84), *Možno vhodný* (50–69), *Nevhodný* (<50).
- **Vygenerovanie dopytového e-mailu** (SK/EN), kopírovanie do schránky alebo otvorenie v mailovom klientovi.
- **Export CSV a JSON** – tlačidlá v sekcii filtrov.
- **Zálohovanie** – stačí skopírovať priečinok `data/`.

## Skórovací systém

Maximum 100 bodov:

| Oblasť | Max |
|---|---|
| Materiály (overené − rizikové) | 25 |
| Certifikácie (overené, uvedené, mínus za nedôveryhodné) | 20 |
| B2B vhodnosť (B2B, metráž, veľkoobchod, doprava do EÚ/SK) | 15 |
| Farbenie a custom (Pantone, lab dip, custom colors…) | 15 |
| Transparentnosť firmy (firma, adresa, VAT, technické listy…) | 10 |
| Dôveryhodnosť a typ firmy (mínus za retail/marketplace/riziká) | 10 |
| Vzorky, MOQ, kontakt, cenník | 5 |

Skóre je len pomôcka. **Manuálne hodnotenie a poznámky** vždy prevažujú.

## Štruktúra projektu

```
app/
  page.tsx                  # Dashboard
  layout.tsx
  globals.css
  actions.ts                # server actions: create / update / delete
  suppliers/
    page.tsx                # zoznam + filtre
    new/page.tsx            # pridanie
    [id]/page.tsx           # detail
    [id]/edit/page.tsx      # úprava
  api/export/route.ts       # CSV / JSON export

components/
  SuppliersList.tsx         # tabuľka + klientské filtre
  SupplierForm.tsx          # formulár (nový + úprava)
  EmailButton.tsx           # generátor dopytu
  StatusBadge.tsx           # farebné štítky

lib/
  db.ts                     # SQLite + CRUD
  types.ts                  # typové definície
  constants.ts              # zoznamy možností (SK labely)
  scoring.ts                # výpočet skóre
  email.ts                  # šablóna dopytu
```

## Zálohovanie

Celá databáza je v jednom súbore: `data/suppliers.db`. Pred experimentmi jednoducho skopíruj priečinok `data/`. Alternatívne použi tlačidlo **Export JSON** v zozname dodávateľov.

## Dôležité pravidlá aplikácie

- Aplikácia **neoznačuje dodávateľa ako vhodného automaticky** podľa slov ako *eco*, *luxury*, *natural*, *sustainable*, *premium*, *green*, *ethical*. Vždy je potrebné vyplniť konkrétne dôkazy a označiť materiály/certifikácie ručne.
- Pre každú **certifikáciu** sa eviduje stav (overené / uvedené, ale neoverené / nejasné / nedôveryhodné), odkaz na dôkaz a dátum overenia.
- **Materiály** majú vlastný stav overenia. Výrazy ako *art silk*, *vegan silk*, *polyester satin* by mali byť označené ako **rizikové** alebo **nevhodné**.
- Retail e-shopy, marketplace a značky hotových produktov sa pri skórovaní **automaticky penalizujú**.
