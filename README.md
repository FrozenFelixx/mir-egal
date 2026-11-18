# MIR EGAL 🎮

**Spielbarer Multiplayer-Prototyp (Version 1.0)** – Team L gegen Team S, bis zu 10 Spieler je Team. Lobby erstellen, Code teilen, Minigames spielen und gemeinsam Teampunkte sammeln.

## Schnellstart unter Windows

1. Den ZIP-Ordner vollständig entpacken, z. B. auf den Desktop.
2. Falls noch nicht vorhanden, **Node.js LTS** installieren: https://nodejs.org (kostenlos). Einmalig nötig; **keine anderen Pakete, kein `npm install`**.
3. **`START_MIR_EGAL.bat`** doppelklicken. Das Terminalfenster offen lassen.
4. Browser öffnen: **http://localhost:3000**
5. Name eingeben, **Lobby erstellen**, Team wählen.
6. Zum Testen ein zweites Browserfenster oder einen privaten Tab öffnen und mit dem angezeigten sechsstelligen Code der Lobby beitreten. Dort das andere Team wählen.
7. Im Host-Fenster **Match starten** anklicken. Jetzt könnt ihr spielen!

**VS Code:** Ordner `MirEgal` in VS Code öffnen, über *Terminal → Neues Terminal* `node server.js` oder `npm start` ausführen, `http://localhost:3000` aufrufen.

**macOS/Linux:** Terminal öffnen, im Projektordner `./START_MAC_LINUX.sh` ausführen (mit Node.js installiert).

## Was ist spielbar?

- **Lobby-System:** Bis 20 Spieler, 6-stellige Codes, Host, Teamwahl, Bereit-Status, Host-Übergabe, Einladungslink.
- **Tic-Tac-Toe:** Parallele 1-gegen-1-Duelle zwischen Team L und S; Gewinner erhalten 100 Punkte, Remis je 25. Zugzeit 24 Sekunden.
- **4 Gewinnt:** Parallele 1-gegen-1-Duelle; gleiche Punkteverteilung.
- **Snake Battle:** Alle Teamspieler gleichzeitig auf einem Spielfeld. WASD oder Pfeiltasten. 15 Punkte pro Futter, 60 Überlebensbonus.
- **Cell Wars:** Agar.io-inspiriertes 2D-Zellenspiel. Bewegung mit WASD oder Pfeiltasten. Punkte für Futter und das Verschlingen gegnerischer kleinerer Zellen. Respawn nach kurzer Pause.
- **Match-System:** 1, 3, 5, 7 oder 9 Runden; Spielauswahl durch den Host; zufällige Minigame-Folge; Runden- und Match-Ergebnisse; neue Serie starten.
- **Online-Multiplayer:** Echter WebSocket-Server, Spielstand und Regeln werden serverseitig berechnet. Kein Benutzerkonto erforderlich.

**Hinweis zu ungleichen Teamgrößen:** Bei Tic-Tac-Toe und 4 Gewinnt werden so viele Duelle gleichzeitig erstellt, wie das kleinere Team Spieler hat. Übrige Spieler können zuschauen. In Snake und Cell Wars können alle zugeteilten Spieler aktiv mitspielen.

## Wie können Discord-Mitglieder von anderen PCs mitspielen?

**Im gleichen WLAN/LAN:**

1. Starte das Spiel auf dem Host-PC.
2. Ermittle die lokale IP-Adresse des Host-PCs mit `ipconfig` (z. B. `192.168.1.25`).
3. Andere öffnen dann `http://192.168.1.25:3000` im Browser.
4. Die Windows-Firewall muss den eingehenden Zugriff auf Port 3000 erlauben (nur falls du dieser Verbindung vertraust).

**Über das Internet (Discord-Mitglieder außerhalb deines Netzwerks):**

Der Node.js-Server muss öffentlich erreichbar sein, beispielsweise über einen VPS oder einen Node.js-Hosting-Anbieter. Ein öffentlicher Hosting-Dienst stellt üblicherweise `https://...` und `wss://...` bereit. Der Server verwendet automatisch `process.env.PORT`, sodass er auf vielen Node-Hosting-Diensten gestartet werden kann. Als Startbefehl `npm start` setzen. Dann genügt das öffentliche URL plus der Lobby-Code.

⚠️ Ein lokales `localhost`-Fenster ist **nicht** über das Internet erreichbar. Zur öffentlichen Bereitstellung sollten HTTPS/WSS und ein zuverlässiger Server verwendet werden. **Portfreigaben am Heimrouter sind nicht erforderlich und für Anfänger nicht empfohlen.** Lobbys und Punktestände werden derzeit nur im Arbeitsspeicher gespeichert und gehen bei Server-Neustart verloren.

## Steuerung

| Spiel | Steuerung |
| --- | --- |
| Tic-Tac-Toe | Auf ein freies Feld klicken |
| 4 Gewinnt | Auf die gewünschte Spalte klicken |
| Snake Battle | W/A/S/D oder Pfeiltasten |
| Cell Wars | W/A/S/D oder Pfeiltasten |

## Technischer Aufbau

```text
MirEgal/
├── START_MIR_EGAL.bat   ← Doppelklick unter Windows
├── START_MAC_LINUX.sh
├── README.md
├── package.json
├── server.js           ← HTTP + WebSocket + Spiellogik (ohne npm-Abhängigkeiten)
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js          ← Menüs, 2D-Canvas und Spielbedienung
│   └── favicon.svg
└── tests/
    └── multiplayer.test.js
```

Die gesamte Spiellogik ist in `server.js`, die Darstellung und Eingabe in `public/app.js` und das Aussehen in `public/style.css`. Die Spielzustände werden zwischen Clients über WebSockets synchronisiert.

## Selbsttest

Wenn Node.js 22 oder neuer installiert ist, im Projektordner ausführen:

```bash
npm test
```

Damit werden Spiellogik, Lobby-Erstellung, zwei echte WebSocket-Verbindungen, Teamwahl und ein kompletter Tic-Tac-Toe-Matchablauf getestet.

## Grenzen dieser ersten Version

- Noch keine Accounts, Passwort-Lobbys, Freundesliste, Datenbank oder gespeicherte Rangliste.
- In-Memory-Lobbys: Bei Neustart des Servers werden alle Lobbys zurückgesetzt.
- Keine garantierte Reconnect-Fortsetzung bei Netzunterbrechung.
- Snake und Cell Wars sind funktionale, bewusst einfache Prototyp-Varianten (kein vollständiges Agar.io).
- Keine eigenständige Windows-EXE: Das ist eine **downloadfertige Webspiel-Version** mit `.bat`-Starter. Node.js ist auf dem Host-Rechner erforderlich, auf reinen Mitspieler-PCs nicht.
- Zum Internet-Hosting braucht es einen öffentlich erreichbaren Server. Die heruntergeladene Version ist sofort lokal und im LAN testbar.

**Viel Spaß mit „MIR EGAL“!**


## Bots zum Testen (Sternenstaub Edition)
Der Lobbymeister kann im Warteraum unter Team L und Team S über
„＋ 🤖 Bot zu Team L/S“ KI-Gegner hinzufügen. Pro Team sind insgesamt
10 Spieler inklusive Bots erlaubt, maximal 20 pro Lobby.
Bots lassen sich vor Matchbeginn mit ✕ wieder entfernen.
Tic-Tac-Toe und 4 Gewinnt: Bots machen automatisch Züge (inklusive einfacher Gewinn-/Blockierstrategie).
Snake: Bots suchen Futter und meiden unmittelbare Hindernisse.
Cell Wars: Bots sammeln Futter und weichen größeren Gegnern aus.
Bots benötigen keine zusätzliche Verbindung und keine API.
Zum Testen: Lobby erstellen, Team wählen, dem anderen Team einen Bot hinzufügen,
Match starten. Die Bots sind nur einfache Testgegner.


## V3 – Sternenstaub Arcade
- Slither Stars ersetzt das alte rasterbasierte Snake: freie Lenkung, durchgehende Schlangenkörper, Lichtpunkte, Wand- und Körperkollisionen.
- Cell Wars: größere Arena, mehr Pellets und kamerazentrierte Darstellung. Es ist weiterhin ein vereinfachter Agar.io-inspirierter Modus, kein 1:1-Klon.
- Rundenablauf: 10 Sekunden Erklärung, dann 3 Sekunden Countdown direkt über dem bereits sichtbaren Spielfeld; erst danach läuft die Simulation.
- Mehr Übergänge, reduzierte Comic-Optik, lokale Avatar-Auswahl und Bots.
- WASD/Pfeiltasten steuern Slither Stars. Für 20 Spieler ist die Performance weiterhin von Hardware und Netzwerk abhängig.

## Version 4 – Sternenstaub Party Arcade
- Fünf Minigames: Tic-Tac-Toe, 4 Gewinnt, Slither Stars, Agar Arena, Mathquiz Battle.
- Die ersten 10 Sekunden sind die Spielregeln. Danach ist die Arena sichtbar, aber für 3 Sekunden gesperrt. Erst dann beginnt die Runde.
- Steuerung in den Arenen: Maus oder WASD/Pfeiltasten. Leertaste beschleunigt in Slither Stars; in Agar Arena löst sie einen kurzen Split-Dash aus, sobald genug Masse vorhanden ist.
- Slither Stars: Lichtpunkte, Wachstum, Kollisionen, leuchtende Beute beim Tod, Bot-Gegner.
- Agar Arena: größere Karte, Pellets, Größenunterschiede, Fressen, Viren und Split-Dash. Dies ist **keine vollständige Agar.io-Physik**: Mehrfachzellen, Verschmelzen und Eject-Mass fehlen noch.
- Mathquiz: parallele Team-L-vs-Team-S-Duelle, 3 Rechenarten, Antworten per Enter, KI-Testgegner, neue Frage nach 8 Sekunden.
- Performance: kompaktere Schlangenkörper, 30-ms-Simulation, bis zu ca. 12,5 Netzwerk-Snapshots pro Sekunde je Raum, Animation im Browser, weniger teure Arena-CSS-Effekte. Die Flüssigkeit hängt weiterhin von Browser, PC und Latenz ab.
- Online für Freunde: Server auf einem öffentlich erreichbaren Host starten. `localhost` ist nur auf dem eigenen Rechner erreichbar.


## V5 Fehlerbehebungen
- Tic Tac Toe aktualisiert Spielfeld und Zugstatus ohne vollständigen Seitenaufbau.
- Mathquiz aktualisiert Aufgabe und Punkte ohne Flackern und verknüpft Antworten mit der jeweiligen Aufgaben-ID.
- Slither Stars und Agar Arena beenden die Runde, sobald nur noch ein Team aktive Figuren besitzt.
- Agar Arena: ausgeschiedene Spieler respawnen in dieser Runde nicht mehr.
- Nach einem Rundenergebnis folgt nach 10 Sekunden automatisch die nächste Runde; nach dem letzten Spiel bleibt die Endauswertung stehen.

---

## Sternenstaub V7 – Mathe, Charaktere und Audio (17.11.2026)

### Math Battle / Mathquiz
- **Fragen wechseln ausschließlich nach einer richtig gelösten Antwort** durch einen der beiden Duellteilnehmer (Mensch oder Bot). Es gibt keinen 8-Sekunden-Aufgabenwechsel mehr.
- **Richtig: +10 Duellpunkte**, danach neue Aufgabe. **Falsch: −5 Duellpunkte**, dieselbe Aufgabe bleibt bestehen; man darf wiederholt antworten. Der Server begrenzt Versuche pro Person auf einen je 220 ms.
- Wenn der Gegner richtig antwortet, wechselt die Aufgabe ebenfalls; das wird mit einem eigenen Punktehinweis sichtbar gemacht.
- Matchpunkte werden aus den tatsächlichen Duellpunkten übernommen, nicht noch einmal mit 10 multipliziert. Negative Ergebnisse sind möglich.
- Eingabefeld und Spieloberfläche werden bei gewöhnlichen Spielstands-Updates nicht neu aufgebaut.

### Sound und Musik
- Zwei Buttons rechts oben: `🔇 Ton AUS` / `🔊 Ton AN` und `♫ Musik AN/AUS`.
- Sound ist zunächst deaktiviert, damit der Browser nicht ungefragt Audio abspielt. **Klicke auf „Ton AUS“, um Soundeffekte und die Hintergrundmusik freizuschalten.**
- Geräusche für Setzen, Punkte sammeln, richtig/falsch, Countdown, Rundenstart und Sieg; dazu eine leise, originale algorithmisch erzeugte Musikschleife.
- Keine fremden Audiodateien und kein Streaming benötigt. Einstellungen bleiben lokal im Browser gespeichert.

### Sternenwesen
- Im Startmenü Tierart, Fellfarbe und Accessoire auswählen: Hase, Katze, Igel, Fuchs, Fledermaus, Stern; sechs Farben; Schleife, Krone, Brille, Schal oder ohne.
- Neue handgezeichnet wirkende **SVG-Sticker** statt nur Unicode-Emojis. Sie erscheinen in Teamlisten, auf den Duellkarten, neben Mathe-Punkteständen, in Ranglisten, Ergebnisanzeigen und in den 2D-Arenen.
- Auswahl wird im Browser gespeichert und beim Betreten der Lobby an alle anderen Clients übermittelt.
- Dein eigener Charakter bleibt weiterhin grün markiert, Gegner rot.

### Spielgefühl & Darstellung
- Kleine animierte Punktanzeigen für Punktegewinne / Fehler, markierte Züge bei Tic Tac Toe und 4 Gewinnt, Ergebniseffekte und Rundenstartton.
- Das Minigame wird **nicht** bei jeder Antwort neu gerendert. Nur betroffene Texte, Punkte und Felder ändern sich.
- Für die Arena-Rangliste werden nur bei veränderter Reihenfolge neue Zeilen erstellt; sonst werden die bestehenden Zahlen aktualisiert.

### Projektdateien
- `server.js`: Regeln, synchronisierte Punkte und Multiplayer.
- `public/app.js`: Spielfelder und animierte Punktanzeigen.
- `public/avatars.js`: Originale SVG-Tiercharaktere und Avatarbilder für Canvas.
- `public/audio.js`: Originale Soundeffekte und Musik über Web Audio (ohne Fremdassets).
- `public/style.css`: Layout, Sticker, Übergänge und Punkteanimationen.
- `tests/math.test.js`: Tests für falsche/richtige Antworten und keinen zeitbasierten Aufgabenwechsel.

**Testen:** Die alte Version und ihren Node-Server vollständig schließen, dieses Projekt in einem neuen Ordner entpacken, `START_MIR_EGAL.bat` ausführen und `http://localhost:3000` öffnen. Bei einem alten Browserstand `Strg+F5` drücken. In der Lobby Team L wählen, einen Bot in Team S hinzufügen und nur Mathquiz aktivieren.

**Hinweis:** Für alle browserseitigen Audiofunktionen ist eine Nutzerinteraktion erforderlich. Die Testläufe prüfen die Server-Spiellogik und das statische Rendern; Audio-Hardware und Netzwerklatenz bei 20 Spielern werden damit nicht vollständig getestet.
