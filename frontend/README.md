# Lernplan Wizard (Frontend)

Dieses Frontend wurde mit Vite + React + TypeScript erstellt und dient als Wizard für den Endpunkt `/plan/generate` des FastAPI-Backends.

## Voraussetzungen
- Node.js 18 oder neuer
- Backend unter `http://127.0.0.1:8080` gestartet (Standard aus dem Hauptprojekt)

## Entwicklung starten
```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Anschließend ist das UI unter `http://127.0.0.1:5173` erreichbar. Falls dein Backend unter einer anderen URL läuft, kannst du `VITE_API_BASE_URL` setzen:
```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## Produktion
```bash
npm run build
```
Das Build-Resultat liegt in `dist/` und kann z. B. via `npm run preview` oder einen beliebigen Static File Server ausgeliefert werden.

## Funktionsumfang
1. **Template-Auswahl & Rahmendaten**  
   Lädt die verfügbaren Templates über `GET /templates` und sammelt Startdatum sowie Stadt.
2. **Verfügbarkeit & Präferenzen**  
   Mehrfachauswahl für Wochentage, Repetitoriumstage und ein freies Präferenzfeld für das LLM.
3. **Schwerpunkte & Regeln**  
   Anpassbare Gewichte je Rechtsgebiet sowie globale Grenzen für die Themen pro Tag.
4. **Ergebnisanzeige**  
   Stellt die beiden CSV-Strings dar und erlaubt den Download als Dateien.

Alle Eingaben werden ohne zusätzliche Planlogik an das Backend weitergereicht – der LLM-Workflow bleibt unverändert.
