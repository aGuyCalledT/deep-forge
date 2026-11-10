# Auf dem eigenen Server betreiben

Voraussetzung: Linux mit Docker und Docker Compose. Spring Boot und PostgreSQL brauchen zusammen etwa 600 MB RAM.

## Starten

```bash
git clone <dein-repo> deep-forge && cd deep-forge
cp .env.example .env
nano .env            # DB_PASSWORD setzen, INVITE_CODE für Freunde, ADMINS = dein Spielername
docker compose up -d --build
```

Das Spiel läuft dann auf `http://<server>:8080`.

## HTTPS und Zugang von außen

Drei Wege, je nach Netz:

1. **Eigene Domain + Portfreigabe:** Domain auf die Server-IP zeigen lassen, Ports 80 und 443 im Router freigeben,
   `DOMAIN=` in `.env` setzen und mit Caddy starten. Caddy holt das Zertifikat selbst:
   ```bash
   docker compose --profile https up -d --build
   ```
2. **Cloudflare Tunnel:** keine Portfreigabe nötig, braucht aber eine Domain bei Cloudflare.
   `cloudflared` auf dem Server installieren und auf `http://localhost:8080` zeigen lassen.
3. **Tailscale:** nur eingeladene Geräte kommen dran. Jeder Freund installiert die Tailscale-App.

## Aktualisieren

```bash
git pull
docker compose up -d --build
```

Spielstände liegen in PostgreSQL (Volume `dbdata`) und überleben Updates. Neue Felder im Spielstand bekommen beim
Laden Standardwerte.

## Sicherung

```bash
docker compose exec db pg_dump -U deepforge deepforge > backup-$(date +%F).sql
```

Zurückspielen:

```bash
docker compose exec -T db psql -U deepforge deepforge < backup-2026-01-01.sql
```

## Ohne Docker (zum Ausprobieren)

```bash
mvn -DskipTests package
java -jar target/deep-forge.jar
```

Ohne `DB_URL` legt das Spiel eine H2-Datenbank in `./data` an.

## Cheats

`CHEATS=true` in `.env` gibt allen Spielern die Test-Hilfen (More → Cheats). Admins (`ADMINS`) haben sie immer.
Für ein echtes Spiel unter Freunden: aus lassen.

## Passwort vergessen

Ein Admin (Name in `ADMINS`) setzt es im Spiel unter **More → Admin** zurück.
