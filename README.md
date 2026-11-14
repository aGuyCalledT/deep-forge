# Deep Forge

An idle game about a dwarf fortress, for a few friends, in the browser and on the phone.
Dig ore, smelt bars, mix alloys, forge goods, send caravans to cities with shifting prices, send expeditions into
the deep – and keep your dwarves fed, happy and alive.

- **Konzept:** [docs/konzept/spiel.md](docs/konzept/spiel.md)
- **Balancing:** [docs/BALANCING.md](docs/BALANCING.md)
- **Eigene Grafiken:** [docs/SPRITES.md](docs/SPRITES.md)
- **Server einrichten:** [docs/DEPLOY.md](docs/DEPLOY.md)
- **Regeln für Claude Code:** [CLAUDE.md](CLAUDE.md)

## Quick start

```bash
cp .env.example .env   # set DB_PASSWORD, INVITE_CODE, ADMINS
docker compose up -d --build
```

Open `http://localhost:8080`, found a hold, and start digging.

## Stack

Java 21 · Spring Boot 3 · PostgreSQL (H2 for local runs) · plain HTML/CSS/JS modules with canvas pixel art, no build step.

## Development

**IntelliJ:** open the repo folder, let Maven import, then pick **Deep Forge** in the run menu and press Run.
Open `http://localhost:8080` and found a hold. Saves go to `./data` (H2). Changes to JS and CSS show up after a
browser reload, Java changes need a restart. **Deep Forge tests** runs all tests.
Alternative: create a Maven run configuration with the goal `spring-boot:run` (Run → Edit Configurations → + → Maven).

Art: icons from `art-src/icons/*.px.js` (pxl, `node scripts/build-art.mjs`), scene and dwarves from Python in `art-src/scene/` and `art-src/dwarves/`, all into `static/art/` (see docs/SPRITES.md).

Command line:

```bash
mvn test
mvn -DskipTests package && java -jar target/deep-forge.jar
```

Fonts: Germania One, Alegreya Sans, Alegreya Sans SC and Kalam (SIL Open Font License), see `src/main/resources/static/fonts/`.
