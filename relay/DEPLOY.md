# Community-Relay einrichten (Deno Deploy)

> Hinweis: Das hier richtet der **Betreiber der Community EINMAL** ein (ein Relay fuer alle). **Endnutzer muessen nichts tun** – ihr Geraet/Web nutzt die fest eingebaute Relay-Adresse. Es liegt kein Geheimnis im Repo; das Token lebt nur als Umgebungsvariable im Dienst.

Der Relay nimmt Beitraege (Rezepte/Profile) an und legt daraus einen Pull Request an.
Er haelt EIN GitHub-Token serverseitig – nie am Geraet.

## 1. GitHub-Token anlegen (einmalig)
- GitHub -> Settings -> Developer settings -> Personal access tokens -> **Fine-grained tokens** -> Generate new token.
- Resource owner: dein Account. Repository access: **Only select** -> `open-combisteamer-community`.
- Permissions: **Contents: Read and write** und **Pull requests: Read and write**.
- Token generieren und kopieren (nur einmal sichtbar).

## 2. Deno Deploy
- Auf https://dash.deno.com mit GitHub anmelden -> **New Playground**.
- Den Inhalt von `relay.ts` einfuegen und **Save & Deploy**.
- Unter **Settings -> Environment Variables** setzen:
  - `GH_TOKEN` = dein Token aus Schritt 1
  - (optional) `REPO` = `rbxxswap/open-combisteamer-community`, `BASE_BRANCH` = `master`
- Oben steht die Projekt-URL, z. B. `https://ocs-relay-xxxx.deno.dev`.

## 3. Im Web-Editor eintragen
- Tab **Programme** -> Feld **Relay-URL** -> die Deno-URL eintragen (wird lokal gespeichert).
- Fertig: „An Community senden" legt jetzt automatisch einen PR an. Du pruefst/merged ihn im Repo.
