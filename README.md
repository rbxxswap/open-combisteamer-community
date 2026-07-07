# Open Combi-Steamer – Community

Offene Sammlung von **Garprogrammen** und **Hardware-Profilen** für den quelloffenen
Kombidämpfer-Controller (ESP32-P4). Jeder darf beitragen – geprüft per Pull-Request.

## 🔥 Firmware flashen (Erstinstallation)

Der einfachste Weg, ein neu gebautes Gerät in Betrieb zu nehmen:

**➡️ https://rbxxswap.github.io/open-combisteamer-community/**

1. Seite in **Chrome** oder **Edge** öffnen (WebSerial wird benötigt – Firefox/Safari gehen nicht).
2. Gerät per **USB-C** anschließen.
3. Auf **„Firmware flashen"** klicken und den Port wählen.

Danach laufen alle weiteren Updates **drahtlos über die Weboberfläche des Geräts (OTA)** –
kein Kabel mehr nötig.

## 📖 Kurzanleitung

- **Bedienen:** Startseite mit Betriebsarten (Dampf / Heißluft / Kombi) und deinen Rezepten.
- **Rezepte holen:** Im Web-Browser des Geräts den Reiter *Browser* öffnen, Community-Rezepte
  ansehen und mit *+ Bibliothek* aufs Gerät laden (dafür einmal *Community-Rezepte benutzen*
  im Hardware-Tab aktivieren).
- **Eigene Rezepte teilen:** Im Reiter *Programme* ein Rezept anlegen und *An Community senden* –
  der Relay legt automatisch einen Pull-Request in diesem Repo an.
- **Bewerten:** Jedes Community-Rezept lässt sich mit Sternen und Kommentar bewerten; Ersteller
  bekommen so Feedback und können ihre Rezepte verbessern.

## 📂 Struktur

| Ordner | Inhalt |
|--------|--------|
| `rezepte/` | Garprogramme (`index.json`) + Bilder (`images/`) |
| `profile/` | Hardware-Profile je Basisgerät |
| `relay/`   | Cloudflare-Worker (nimmt Beiträge/Bewertungen entgegen, legt PRs an) |
| `docs/`    | Web-Flasher (GitHub Pages) |

## ⚠️ Hinweis

Ein selbstgebautes Gerät am Netz (230/400 V) erfordert Sachkunde. Arbeiten an Netzspannung
nur durch befähigte Personen. Dieses Repo ist ein technisches Projekt, keine Bau- oder
Sicherheitsfreigabe.