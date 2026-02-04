
# Hur simuleringen fungerar

**Kort version:** Vi spelar om resten av säsongen många gånger med slumpade resultat för att se hur ofta varje lag hamnar på varje placering.

## Steg för steg
1. **Start från dina inmatade tabellvärden.**  
   Simulatorn använder de poäng och statistik du har fyllt i som utgångsläge.

2. **Spela varje återstående match.**  
   - Om du har valt ett fast utfall (t.ex. “Hemma vinner i ordinarie”), används det alltid.  
   - Om matchen är `TBD` använder simulatorn den angivna **hemma‑vinstprocenten** för att slumpa en vinnare.

3. **Avgör ordinarie vs OT/SO.**  
   För `TBD`‑matcher avgör simulatorn om vinsten sker i ordinarie tid eller efter OT/SO, baserat på reglaget **OT/SO‑andel**. Det påverkar poängfördelningen (3–0 eller 2–1).

4. **Uppdatera tabellen.**  
   Poäng och tiebreak‑statistik (t.ex. RW/ROW) uppdateras för båda lagen.

5. **Sortera tabellen.**  
   Lagen rankas enligt vald tiebreak‑regel (standard är SHL‑stil).

6. **Upprepa många gånger.**  
   Hela processen körs så många iterationer som du valt (t.ex. 2 000).

## Resultat du får
- **Sannolikhetsfördelning** för den valda lagets slutplacering.
- **Genomsnittlig placering och poäng** för alla lag.
