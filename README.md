# Appka-dodavatelia

Mobilná aplikácia v React Native (Expo) na vyhľadávanie dodávateľov cez Google Places API.

## Funkcie

- Vyhľadávanie podľa **typu dodávateľa** a **lokality**
- Voliteľné upresnenie podľa **typu látky / materiálu** a **požadovaných certifikácií**
- Výsledky obsahujú **názov firmy, adresu a hodnotenie**
- Detail dodávateľa s **telefónom, webom, otváracími hodinami** a odkazom do Google Maps

## Inštalácia

```bash
npm install
npm start
```

Potom v Expo Go zoskenuj QR kód, alebo spusti `npm run android` / `npm run ios`.

## Konfigurácia Google Places API kľúča

Aplikácia volá [Google Places API – Text Search](https://developers.google.com/maps/documentation/places/web-service/search-text).
Kľúč pridaj jedným z dvoch spôsobov:

1. V `app.json` do `expo.extra.googlePlacesApiKey`:
   ```json
   "extra": { "googlePlacesApiKey": "TVOJ_KLUC" }
   ```
2. Cez env premennú pred štartom:
   ```bash
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=TVOJ_KLUC npm start
   ```

> V Google Cloud konzole povoľ **Places API** a obmedz kľúč na svoje aplikačné ID / referrer.

## Štruktúra projektu

```
App.js                     # navigácia (Search → Results → Detail)
src/
  config.js                # načítanie API kľúča
  services/placesApi.js    # volania Google Places (Text Search + Details)
  screens/
    SearchScreen.js        # formulár s kritériami
    ResultsScreen.js       # zoznam výsledkov
    SupplierDetailScreen.js# detail dodávateľa
  components/
    SupplierCard.js        # karta v zozname
    RatingStars.js         # hviezdičkové hodnotenie
```

## Poznámka k vyhľadávaniu

Google Places API neumožňuje filter na certifikácie ani konkrétny materiál,
preto sa tieto polia pridávajú do textového dotazu (napr. *„textilný výrobca
bavlna certifikácia GOTS Bratislava"*). Relevantnosť výsledkov závisí na
indexácii Google.
