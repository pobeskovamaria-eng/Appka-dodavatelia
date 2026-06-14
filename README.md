# Appka dodávateľov / Fabric Supplier Finder

Streamlit aplikácia na vyhľadávanie overených európskych a zahraničných **výrobcov / mlynov / tkáčov** látok podľa stanovených kritérií:

- **Hodváb** (mulberry, hrúbka v mommi — typicky 19, 22 a iné)
- **100 % bavlna**
- **Tencel / Lyocell**
- **Bambus**
- možnosť farbenia
- bez resellerov a bez umelého (polyesterového) saténu
- referenčný benchmark: [maekotessuti.com](https://maekotessuti.com/)

Aplikácia kombinuje:

1. **Kurátorovanú databázu** kandidátnych dodávateľov (`data/suppliers.json`) — pripravená na overenie.
2. **Doplnkové live vyhľadávanie** cez DuckDuckGo (bez API kľúča).

## Spustenie

```bash
pip install -r requirements.txt
streamlit run app.py
```

Otvorí sa na `http://localhost:8501`.

## Štruktúra

```
app.py                 # Streamlit UI
src/
  i18n.py              # SK / EN preklady
  search.py            # filtrovanie databázy
  web_search.py        # DuckDuckGo live search
data/
  suppliers.json       # kurátorovaná databáza dodávateľov
requirements.txt
```

## Dopĺňanie databázy

Pridaním záznamu do `data/suppliers.json` (schéma podľa existujúcich entries).
Každý nový záznam označte `"verified": false` a pridajte `verify_notes` —
overenie (MOQ, certifikácie, etika) treba urobiť priamo u dodávateľa pred objednávkou.

## ⚠️ Upozornenie

Aplikácia ukazuje **kandidátov**. Aktuálne podmienky (mommi sortiment,
farbenie, MOQ, certifikácie, etické princípy) si pred kontaktom či objednávkou
**vždy potvrďte priamo u dodávateľa**.
