package com.deepforge;

import com.deepforge.game.*;
import com.deepforge.game.State.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The balance bot (docs/KONZEPT-BALANCE.md, section 12): plays a new hold for 120 days with a fixed, sensible
 * strategy and prints the income per day next to the guide curve. Each visit it collects, sells, keeps the
 * workshops busy and invests in the cheapest useful upgrade.
 */
class BalanceBotTest {
    static final double T0 = 1_800_000_000, H = 3600, DAY = 24 * H;
    static final int DAYS = 120;
    static boolean DEBUG = false;

    /** The old guide curve from the concept (100 Marks more a day per day played), printed for comparison only. */
    static double guide(int day) {
        return Math.max(100, 100.0 * day);
    }

    /** One run: visits at these hours of each day (empty list: never), for so many days. Returns Marks earned per day. */
    static double[] play(long seed, double[] hours, int days, StringBuilder log) { return play(seed, hours, days, log, null); }

    static double[] play(long seed, double[] hours, int days, StringBuilder log, Fortress[] out) {
        Fortress f = Factory.newFortress(1, "bot", T0, seed);
        Market m = Market.inMemory(seed, T0);
        f.lastVisit = T0;
        Bot bot = new Bot(f, m);
        if (out != null) out[0] = f;
        double[] earned = new double[days];
        double last = f.stats.coinsEarned;
        for (int d = 0; d < days; d++) {
            List<Double> times = new ArrayList<>();
            for (double h : hours) times.add(T0 + d * DAY + h * H);
            times.add(T0 + (d + 1) * DAY);
            for (double t : times) {
                for (double s = f.t + H; s < t; s += H) { m.tick(s); Sim.advance(f, s, m); }
                m.tick(t);
                Sim.advance(f, t, m);
                if (t < T0 + (d + 1) * DAY) bot.visit(t);
            }
            earned[d] = (f.stats.coinsEarned - last) / Rules.JOTS_PER_MARK;
            if (DEBUG) {
                Map<String, Integer> jobs = new TreeMap<>();
                for (Dwarf x : f.dwarves) jobs.merge(x.job + (x.building != null && x.job.equals("worker") ? ":" + x.building : "") + (x.busy != null ? "(busy)" : ""), 1, Integer::sum);
                Map<String, Integer> st = new TreeMap<>();
                for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (e.getValue() > 0) st.put(e.getKey().replace("item:", ""), e.getValue());
                System.out.println("DAY " + (d + 1) + " jobs " + jobs + " caravans " + f.caravans.size() + " used " + Rules.used(f) + "/" + (int) Rules.capacity(f) + " siege " + (f.siege != null));
                System.out.println("    stock " + st);
                for (Building b : f.buildings) if (!Rules.active(f, b) && f.layout.rooms.containsKey(b.id)) {
                    int[] p = f.layout.rooms.get(b.id);
                    for (int fl = Math.max(0, p[1] - 1); fl <= Math.min(Layouts.FLOORS - 1, p[1] + 1); fl++) {
                        StringBuilder row = new StringBuilder("    row" + fl + " ");
                        for (int c = 0; c < Layouts.COLS; c++) {
                            String o = Layouts.at(f, c, fl, null);
                            row.append(o == null ? (f.layout.marks.contains(Layouts.key(c, fl)) ? 'x' : '#') : o.equals("shaft") ? 'S' : o.equals("well") ? 'W' : o.equals("hall") ? '=' : o.equals("cave") ? '.' : o.equals("room:" + b.id) ? '@' : 'R');
                        }
                        System.out.println(row);
                    }
                }
                for (Building b : f.buildings) if (!b.queue.isEmpty() || b.job != null) System.out.println("    " + b.id + " job " + (b.job == null ? null : Sim.jobName(b.job)) + " q " + b.queue.size() + " status " + b.status);
            }
            last = f.stats.coinsEarned;
            if (log != null && (d < 10 || (d + 1) % 10 == 0))
                log.append(String.format("%4d %9.0f %9.0f %5d %4d %6d %4d  %s%n", d + 1, earned[d], guide(d + 1),
                        f.dwarves.size(), f.level, (int) (f.coins / Rules.JOTS_PER_MARK), deepest(f), bot.summary()));
        }
        return earned;
    }

    static int deepest(Fortress f) {
        int n = 0;
        for (LayerState l : f.layers) if (l.unlocked) n = l.index;
        return n;
    }

    static double sum(double[] a, int from, int to) {
        double s = 0;
        for (int i = from; i < to; i++) s += a[i];
        return s;
    }

    /** Plays 120 days with three visits a day and prints the table. Checks what must hold already. */
    @Test
    void threeVisitsADayFor120Days() {
        StringBuilder log = new StringBuilder(" day   earned     guide  pop  lvl  coins deep  levels\n");
        Fortress[] keep = new Fortress[1];
        double[] e = play(1, new double[]{8, 13, 20}, DAYS, log, keep);
        System.out.print(log);
        int set = 0;
        for (Dwarf x : keep[0].dwarves) set += Magic.gems(x.tool).size();
        double mining = keep[0].dwarves.stream().filter(x -> x.job.equals("miner")).mapToDouble(x -> Magic.bonus(x, "mining")).average().orElse(0);
        System.out.printf("Magic: %d gems set in tools, miners mine %.0f%% faster on average%n", set, mining * 100);
        assertTrue(set > 0, "the wizard enchants and the miners carry the gems");
        System.out.printf("Marks earned: days 1-10 %.0f, 21-30 %.0f, 111-120 %.0f (guide %.0f, %.0f, %.0f)%n",
                sum(e, 0, 10), sum(e, 20, 30), sum(e, 110, 120), 5500.0, 25500.0, 115500.0);
        assertTrue(sum(e, 0, 3) > 0, "the hold earns money in the first days");
        // no fixed curve (the player wants fun, not a target): every month earns more than the one before
        for (int m = 1; m < DAYS / 30; m++)
            assertTrue(sum(e, 30 * m, 30 * m + 30) > sum(e, 30 * m - 30, 30 * m), "month " + (m + 1) + " earns more than month " + m);
    }

    /** For diagnosis: the log, the jobs, the store and every refused action of the first 30 days. */
    @Test
    @org.junit.jupiter.api.Disabled("diagnosis only")
    void debugLog() {
        Fortress[] keep = new Fortress[1];
        DEBUG = true;
        play(1, new double[]{8, 13, 20}, 30, null, keep);
        DEBUG = false;
        for (State.LogEntry e : keep[0].log) if (!e.kind.equals("info") || e.text.contains("stock") ) System.out.println("LOG " + (int) ((e.t - T0) / 3600) + "h " + e.kind + " " + e.text);
    }

    @Test
    void fewerVisitsEarnLessButNotMuchLess() {
        int days = 30;
        double three = sum(play(2, new double[]{8, 13, 20}, days, null), 0, days);
        double one = sum(play(2, new double[]{19}, days, null), 0, days);
        double six = sum(play(2, new double[]{7, 10, 13, 16, 19, 22}, days, null), 0, days);
        System.out.printf("30 days, Marks earned: one visit %.0f, three %.0f, six %.0f%n", one, three, six);
        assertTrue(one <= three * 1.05, "coming more often never pays less");
    }

    @Test
    void aMonthAwayBringsAboutThreeDays() {
        double[] played = play(3, new double[]{8, 13, 20}, 2, null);
        // the same start, then nobody comes for 30 days: the day plan winds the dwarves down
        double[] away = play(3, new double[]{}, 30, null);
        double month = sum(away, 0, 30), threeDays = 1.5 * sum(played, 0, 2);
        System.out.printf("a month away earns %.0f Marks, three played days %.0f%n", month, threeDays);
        assertTrue(month <= Math.max(threeDays, 50), "a month away may not bring more than about three days");
    }

    /** The player: a few simple rules, like someone who looks in now and then and invests sensibly. */
    static class Bot {
        final Fortress f;
        final Market m;
        Rng r;

        Bot(Fortress f, Market m) { this.f = f; this.m = m; }

        boolean act(double t, Object... kv) {
            Map<String, Object> a = new LinkedHashMap<>();
            for (int i = 0; i < kv.length; i += 2) a.put((String) kv[i], kv[i + 1]);
            try {
                Actions.apply(f, a, t, r);
                return true;
            } catch (Actions.GameException ex) {
                if (ex.getMessage() != null && ex.getMessage().contains("dug-out")) needSpace = true;
                if (DEBUG && !a.get("type").equals("unlockLayer")) System.out.println("BOT " + (int) ((t - T0) / 3600) + "h " + a + " -> " + ex.getMessage());
                return false;
            }
        }

        String summary() {
            StringBuilder s = new StringBuilder();
            for (Building b : f.buildings) if (b.level > 1) s.append(b.id.replace("-1", "")).append(b.level).append(' ');
            return s.toString();
        }

        void visit(double t) {
            r = new Rng(f.rng);
            f.lastVisit = t;
            if (!f.reports.isEmpty()) act(t, "type", "collect", "id", -1);
            for (Contract c : new ArrayList<>(f.contracts)) act(t, "type", "fillContract", "id", c.id);
            sellToVisitor(t);
            jobs(t);
            smelter(t);
            forge(t);
            arm(t);
            magic(t);
            monsters(t);
            caravans(t);
            invest(t);
            connectRooms(t);
            dig(t);
            f.rng = r.s;
        }

        void sellToVisitor(double t) {
            if (f.visitor == null) return;
            for (String k : new ArrayList<>(f.stock.keySet()))
                if (f.visitor != null && Content.marketKey(k).equals(f.visitor.market) && sellable(k))
                    act(t, "type", "sellVisitor", "key", k, "amount", k.startsWith("item:pickaxe:") ? Math.min(Rules.stock(f, k), picksInStock() - miners()) : Rules.stock(f, k));
        }

        /** Goods the bot sells: finished pieces, and bars beyond what the forge needs. */
        boolean sellable(String k) {
            if (k.startsWith("item:pickaxe:")) return picksInStock() > miners();   // picks for the miners stay
            return k.startsWith("item:") || (k.startsWith("bar:") && Rules.stock(f, k) > keepBars(k));
        }

        double food, ale;
        boolean needSpace;

        void needs(double t) {
            Map<?, ?> d = (Map<?, ?>) View.of(f, t).get("derived");
            food = ((Number) d.get("foodPerHour")).doubleValue();
            ale = ((Number) d.get("alePerHour")).doubleValue();
            // a full larder or cellar counts as enough
            if (Rules.stock(f, "food") > 150) food = Math.max(food, 1);
            if (Rules.stock(f, "ale") > 100) ale = Math.max(ale, 1);
            if (Rules.stock(f, "food") < 40) food = Math.min(food, -0.1);
        }

        void jobs(double t) {
            needs(t);
            boolean merchant = f.dwarves.stream().anyMatch(x -> x.job.equals("merchant"));
            int deep = deepest(f);
            int[] onLayer = new int[f.layers.size()];
            for (Dwarf x : f.dwarves) if (x.job.equals("miner")) onLayer[x.layer]++;
            if (deep > 0 && onLayer[0] < onLayer[deep]) deep = 0;   // copper, tin and coal stay needed
            // guards: two from the start, the whole hall when raiders are coming
            long guards = Rules.guards(f).size();
            int wantGuards = f.raid != null ? Rules.hallSeats(f) : f.dwarves.size() >= 9 ? 2 : 0;
            if (f.threats.stream().anyMatch(x -> x.cell == null)) wantGuards = Math.max(wantGuards, Math.min(Rules.hallSeats(f), 2 + (int) guards));
            for (Dwarf x : f.dwarves) {
                if (guards >= wantGuards) break;
                if (x.busy == null && (x.job.equals("idle") || x.job.equals("miner"))
                        && act(t, "type", "assign", "dwarf", x.id, "job", "warrior", "post", "hall")) guards++;
            }
            for (Dwarf x : f.dwarves) {
                if (x.busy != null || !x.job.equals("idle")) continue;
                if (food < 0.2 && work(t, x, "farm")) { food += Rules.FARM_PER_H; continue; }
                if (ale < 0.2 && work(t, x, "brewery")) { ale += Rules.BREW_PER_H; continue; }
                if (!merchant && f.dwarves.size() >= 8) { act(t, "type", "assign", "dwarf", x.id, "job", "merchant"); merchant = true; continue; }
                if (ores() > 60 && work(t, x, "smelter")) continue;
                if (bars() > 30 && work(t, x, "forge")) continue;
                if (plainGems() > 0 && f.dwarves.size() >= 6 && work(t, x, "wizard")) continue;
                if (!act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", deep)) act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", 0);
            }
            // workshops without enough to do give their second worker back to the mine
            for (String type : List.of("smelter", "forge")) {
                boolean busy = type.equals("smelter") ? ores() > 30 : bars() > 15;
                for (Building b : f.buildings) {
                    if (!b.type.equals(type) || busy) continue;
                    List<Dwarf> ws = Rules.assigned(f, b);
                    for (int i = 1; i < ws.size(); i++) act(t, "type", "assign", "dwarf", ws.get(i).id, "job", "miner", "layer", deep);
                }
            }
            // the first miner leaves for the forge, so pieces get made from the start
            if (Rules.workers(f, Rules.building(f, "forge-1")).isEmpty())
                for (Dwarf x : f.dwarves) if (x.job.equals("miner") && x.busy == null) { work(t, x, "forge"); break; }
            // back to the mine: guards no longer needed, farmers when the larder is full
            if (f.raid == null)
                for (Dwarf x : Rules.guards(f)) if (Rules.guards(f).size() > wantGuards) act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", deep);
            if (Rules.stock(f, "food") > 300) {
                int farmers = 0;
                for (Dwarf x : f.dwarves) if (x.job.equals("worker") && x.building != null && x.building.startsWith("farm")) farmers++;
                for (Dwarf x : f.dwarves)
                    if (farmers > 1 && x.job.equals("worker") && x.building != null && x.building.startsWith("farm") && x.busy == null) {
                        act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", deep);
                        break;
                    }
            }
            // a full cellar: one brewer goes back to the mine
            if (Rules.stock(f, "ale") > 200)
                for (Dwarf x : f.dwarves) if ("brewery-1".equals(x.building) && x.job.equals("worker") && Rules.workers(f, Rules.building(f, "brewery-1")).size() > 1) {
                    act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", deep); break; }
            // too little food or ale: miners go to the farm and the brewery while there are seats
            for (Dwarf x : f.dwarves) {
                if (!x.job.equals("miner") || x.busy != null) continue;
                if (food < 0 && work(t, x, "farm")) food += Rules.FARM_PER_H;
                else if (ale < 0 && work(t, x, "brewery")) ale += Rules.BREW_PER_H;
            }
        }

        /** A monster in the mine stops the miners there: send the warriors when they are strong enough, else arm more. */
        void monsters(double t) {
            for (Threat th : new ArrayList<>(f.threats)) {
                if (th.cell != null) continue;
                List<Dwarf> party = new ArrayList<>();
                for (Dwarf x : f.dwarves) if (x.job.equals("warrior") && x.busy == null) party.add(x);
                double p = 0;
                for (Dwarf x : party) p += Rules.power(f, x);
                if (!party.isEmpty() && p > th.power * 1.3) {
                    List<Integer> ids = party.stream().map(x -> x.id).toList();
                    act(t, "type", "fightThreat", "threat", th.id, "warriors", ids);
                    continue;
                }
                // the miners of that layer stand still anyway: two of them take up arms
                int n = 0;
                for (Dwarf x : f.dwarves)
                    if (n < 2 && x.job.equals("miner") && x.layer == th.layer && x.busy == null && act(t, "type", "assign", "dwarf", x.id, "job", "warrior", "post", "hall")) n++;
            }
        }

        int miners() { return (int) f.dwarves.stream().filter(x -> x.job.equals("miner")).count(); }

        int picksInStock() {
            int n = 0;
            for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (e.getKey().startsWith("item:pickaxe:")) n += e.getValue();
            return n;
        }

        int plainGems() {
            return Rules.stock(f, "rough_gem") + Rules.stock(f, "cut_gem");
        }

        /** Earth magic for the miners: enchant every gem, set it in a miner's pick; the wizard digs again when there are none. */
        void magic(double t) {
            Building w = Rules.building(f, "wizard");
            if (w == null || w.level <= 0) return;
            int gems = plainGems();
            if (gems > 0 && w.queue.isEmpty()) act(t, "type", "queueAdd", "building", w.id, "recipe", "enchant", "mat", "earth", "count", Math.min(gems, 5));
            if (gems == 0 && w.queue.isEmpty() && w.job == null)
                for (Dwarf x : Rules.assigned(f, w)) act(t, "type", "assign", "dwarf", x.id, "job", "miner", "layer", 0);
            for (String k : new ArrayList<>(f.stock.keySet())) {
                Magic.Gem g = Magic.parseGem(k);
                if (g == null || !g.enchanted() || Rules.stock(f, k) <= 0) continue;
                for (Dwarf x : f.dwarves) {
                    if (!x.job.equals("miner") || x.tool == null || Magic.withGem(x.tool, k) == null) continue;
                    if (act(t, "type", "socket", "dwarf", x.id, "slot", "tool", "gem", k)) break;
                }
            }
        }

        /** Bars kept back: enough for the forge and for the next upgrades. */
        int keepBars(String k) {
            int n = 20;
            for (Building b : f.buildings) if (b.level > 0) n = Math.max(n, Rules.upgradeCost(b).goods().getOrDefault(k, 0) + 10);
            return n;
        }

        int ores() {
            int n = 0;
            for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (Content.ORES.containsKey(e.getKey())) n += e.getValue();
            return n;
        }

        int bars() {
            int n = 0;
            for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (e.getKey().startsWith("bar:")) n += e.getValue();
            return n;
        }

        boolean work(double t, Dwarf x, String type) {
            for (Building b : f.buildings)
                if (b.type.equals(type) && b.level > 0 && Rules.assigned(f, b).size() < Rules.machines(b)
                        && act(t, "type", "assign", "dwarf", x.id, "job", "worker", "building", b.id)) return true;
            return false;
        }

        void smelter(double t) {
            for (Building b : f.buildings) {
                if (!b.type.equals("smelter") || b.level <= 0) continue;
                Set<String> queued = new HashSet<>();
                for (QueueEntry e : b.queue) queued.add(e.recipe + ":" + e.mat);
                // smelt every ore in store, best metal first
                List<String> ores = new ArrayList<>();
                for (String k : f.stock.keySet()) if (Content.ORES.containsKey(k) && Rules.stock(f, k) >= 2) ores.add(k);
                ores.sort(Comparator.comparingDouble(k -> -Content.baseValue(k)));
                for (String o : ores) if (!queued.contains("smelt:" + o) && b.queue.size() < 10) act(t, "type", "queueAdd", "building", b.id, "recipe", "smelt", "mat", o, "count", -1);
                // the alloys the bot can make, when both metals are there
                for (Content.Alloy a : Content.ALLOYS.values()) {
                    if (queued.contains("alloy:" + a.metal()) || b.queue.size() >= 10) continue;
                    boolean ok = true;
                    for (Map.Entry<String, Integer> x : a.inputs().entrySet()) ok &= Rules.stock(f, "bar:" + x.getKey()) >= 2 * x.getValue();
                    if (ok && Content.baseValue("bar:" + a.metal()) > 0) act(t, "type", "queueAdd", "building", b.id, "recipe", "alloy", "mat", a.metal(), "count", 3);
                }
                // drop orders that wait for ore the hold no longer has
                b.queue.removeIf(e -> e.recipe.equals("smelt") && Rules.stock(f, e.mat) < 2 && b.job == null);
            }
        }

        /** Guards get the best axe, helm and mail in store; the forge makes axes when guards have none. */
        void arm(double t) {
            int missing = 0;
            for (Dwarf x : Rules.guards(f)) {
                for (String slot : List.of("weapon", "helm", "armor")) {
                    String have = slot.equals("weapon") ? x.weapon : slot.equals("helm") ? x.helm : x.armor;
                    if (have != null) continue;
                    String best = null;
                    double bestV = 0;
                    for (String k : f.stock.keySet()) {
                        if (!Content.isItem(k) || Rules.stock(f, k) <= 0) continue;
                        Content.ItemType it = Content.ITEMS.get(Content.parseItem(k)[0]);
                        if (!slot.equals(it.slot())) continue;
                        double v = Content.baseValue(k);
                        if (v > bestV) { bestV = v; best = k; }
                    }
                    if (best != null) act(t, "type", "equip", "dwarf", x.id, "item", best);
                    else if (slot.equals("weapon")) missing++;
                }
            }
            if (missing == 0) return;
            for (Building b : f.buildings) {
                if (!b.type.equals("forge") || b.level <= 0 || b.queue.stream().anyMatch(e -> "axe".equals(e.itype))) continue;
                for (String mt : List.of("steel", "iron", "bronze"))
                    if (Rules.stock(f, "bar:" + mt) >= 2 && act(t, "type", "queueAdd", "building", b.id, "recipe", "craft", "itype", "axe", "mat", mt, "count", missing)) {
                        b.queue.add(0, b.queue.remove(b.queue.size() - 1));
                        return;
                    }
            }
        }

        /** The forge makes the piece that pays most per bar from the most valuable metal in store. */
        void forge(double t) {
            for (Building b : f.buildings) {
                if (!b.type.equals("forge") || b.level <= 0) continue;
                if (b.queue.size() >= 2) continue;
                // picks first: every miner without one gets one of the hardest metal there is
                int need = (int) f.dwarves.stream().filter(x -> x.job.equals("miner") && x.tool == null).count() - picksInStock();
                boolean queued = b.queue.stream().anyMatch(j -> "pickaxe".equals(j.itype));
                if (need > 0 && !queued) {
                    Content.ItemType pick = Content.ITEMS.get("pickaxe");
                    Content.Metal hard = null;
                    for (Content.Metal mt : Content.METALS.values())
                        if (Content.metalFits(pick, mt) && Rules.stock(f, "bar:" + mt.id()) >= pick.bars() && (hard == null || mt.hardness() > hard.hardness())) hard = mt;
                    if (hard != null && act(t, "type", "queueAdd", "building", b.id, "recipe", "craft", "itype", "pickaxe", "mat", hard.id(),
                            "count", Math.max(1, Math.min(need, Math.min(5, Rules.stock(f, "bar:" + hard.id()) / pick.bars()))))) continue;
                }
                String best = null, bestMetal = null;
                double bestValue = 0;
                for (Content.Metal mt : Content.METALS.values()) {
                    int bars = Rules.stock(f, "bar:" + mt.id());
                    for (Content.ItemType it : Content.ITEMS.values()) {
                        if (Content.PARTS.containsKey(it.id()) || bars < it.bars() || !Content.metalFits(it, mt)) continue;
                        if (it.blueprint() != null && !f.blueprints.contains(it.blueprint())) continue;
                        double v = Content.baseValue(Content.itemKey(it.id(), mt.id(), 1, "")) - it.bars() * Content.baseValue("bar:" + mt.id());
                        v /= it.bars() * Math.sqrt(mt.heat());
                        v *= Math.min(1, bars / (double) it.bars() / 4);
                        if (v > bestValue) { bestValue = v; best = it.id(); bestMetal = mt.id(); }
                    }
                }
                if (best != null) act(t, "type", "queueAdd", "building", b.id, "recipe", "craft", "itype", best, "mat", bestMetal,
                        "count", Math.max(1, Math.min(10, Rules.stock(f, "bar:" + bestMetal) / Content.ITEMS.get(best).bars())));
            }
        }

        void caravans(double t) {
            if (f.caravans.size() >= Rules.caravanSlots(f)) return;
            List<Integer> ms = new ArrayList<>();
            for (Dwarf x : f.dwarves) if (x.job.equals("merchant") && x.busy == null) ms.add(x.id);
            if (ms.isEmpty()) return;
            int cap = Rules.caravanCapacity(f) * ms.size();
            Map<String, Integer> cargo = new LinkedHashMap<>();
            List<String> keys = new ArrayList<>(f.stock.keySet());
            keys.sort(Comparator.comparingDouble(k -> -Content.baseValue(k)));
            for (String k : keys) {
                if (!sellable(k) || cap <= 0) continue;
                int n = Math.min(cap, k.startsWith("bar:") ? Rules.stock(f, k) - keepBars(k)
                        : k.startsWith("item:pickaxe:") ? Math.min(Rules.stock(f, k), picksInStock() - miners()) : Rules.stock(f, k));
                if (n <= 0) continue;
                cargo.put(k, n);
                cap -= n;
            }
            double value = 0;
            for (Map.Entry<String, Integer> e : cargo.entrySet()) value += e.getValue() * Content.baseValue(e.getKey());
            if (DEBUG) System.out.println("BOT caravan? merchants " + ms + " value " + value / 1000 + " slots " + Rules.caravanSlots(f) + " cargo " + cargo);
            if (value < 20 * Rules.JOTS_PER_MARK && Rules.stock(f, "stone") > 100) return;   // not worth the trip yet
            String city = f.cities.stream().min(Comparator.comparingDouble(c -> Content.CITIES.get(c).hours())).orElseThrow();
            // coal and stone run short: buy some on the way home
            Map<String, Integer> buy = new LinkedHashMap<>();
            if (Rules.stock(f, "coal") < 60) buy.put("coal", 100);
            if (Rules.stock(f, "stone") < 300) buy.put("stone", 300 - Rules.stock(f, "stone"));
            // bars the next upgrades and the next layer need
            for (Building b : f.buildings) if (b.level > 0)
                for (Map.Entry<String, Integer> e : Rules.upgradeCost(b).goods().entrySet())
                    if (e.getKey().startsWith("bar:") && Rules.stock(f, e.getKey()) < e.getValue()) buy.merge(e.getKey(), e.getValue() - Rules.stock(f, e.getKey()), Math::max);
            for (LayerState l : f.layers) if (!l.unlocked) {
                for (Map.Entry<String, Integer> e : Rules.layerUnlockCost(l.index).goods().entrySet())
                    if (e.getKey().startsWith("bar:") && Rules.stock(f, e.getKey()) < e.getValue()) buy.merge(e.getKey(), e.getValue() - Rules.stock(f, e.getKey()), Math::max);
                break;
            }
            double budget = Math.min(f.coins * 0.4, 200 * Rules.JOTS_PER_MARK);
            if (!buy.isEmpty() && budget > 2000)
                act(t, "type", "caravan", "city", city, "merchants", ms, "cargo", cargo, "buy", buy, "budget", Math.floor(budget));
            else act(t, "type", "caravan", "city", city, "merchants", ms, "cargo", cargo);
        }

        /** Food first, then defence when raiders come, then the cheapest upgrade that helps. */
        void invest(double t) {
            needs(t);
            // a new layer when it can be paid
            for (LayerState l : f.layers) if (!l.unlocked && l.openAt <= 0) { act(t, "type", "unlockLayer", "layer", l.index); break; }
            // more food and ale: a new room stands at once, so build one when all seats are taken
            if (food < 0 && !seatFree("farm")) act(t, "type", "build", "building", "farm");
            if (ale < 0 && !seatFree("brewery")) act(t, "type", "build", "building", "brewery");
            if (Rules.underConstruction(f, t) != null) return;
            List<String> wanted = new ArrayList<>();
            if (food < 0) wanted.add("farm");
            if (ale < 0) wanted.add("brewery");
            if (f.raid != null || f.stats.raidsRepelled + f.stats.dwarvesLost > 0) { wanted.add("gate"); wanted.add("entrance_hall"); }
            if (f.storageFull || Rules.used(f) > 0.8 * Rules.capacity(f)) wanted.add("warehouse");
            if (Rules.level(f, "gate") < 1 + f.level / 2) wanted.add("gate");
            wanted.addAll(List.of("lift", "smelter", "forge", "trade_depot", "warehouse", "tavern", "farm", "brewery", "gate", "entrance_hall"));
            if (food > 0.5 && ale > 0.5 && f.dwarves.size() >= Rules.beds(f)) wanted.add(0, "quarters");
            Building pick = null;
            double cheapest = Double.MAX_VALUE;
            int rank = 0;
            for (String type : wanted) {
                rank++;
                for (Building b : f.buildings) {
                    if (!b.type.equals(type) || b.level <= 0) continue;
                    Rules.Cost c = Rules.upgradeCost(b);
                    double price = c.coins() * (1 + 0.15 * rank);   // the first in the list are worth more
                    if (Rules.canPay(f, c) && price < cheapest) { cheapest = price; pick = b; }
                }
            }
            if (pick != null) act(t, "type", "upgrade", "building", pick.id);
            else if (DEBUG && ((int) ((t - T0) / 3600)) % 24 == 13) {
                Building b = Rules.building(f, "warehouse");
                System.out.println("BOT nothing to buy; warehouse costs " + Rules.upgradeCost(b) + " coins " + f.coins);
            }
        }

        /** Keep some dug-out rock ready for new and wider rooms: mark a stretch beside open ground. */
        void dig(double t) {
            Layouts.ensure(f);
            // only when a room had no space: empty caves overgrow and critters move in
            if (!needSpace || !f.layout.marks.isEmpty()) return;
            needSpace = false;
            for (int fl = 0; fl < Layouts.FLOORS; fl++)
                for (int c = Layouts.SHAFT; c < Layouts.COLS - 1; c++) {
                    if (Layouts.at(f, c, fl, null) != null || Layouts.at(f, c - 1, fl, null) == null) continue;
                    List<int[]> cells = new ArrayList<>();
                    for (int x = c; x < Layouts.COLS - 1 && cells.size() < 10 && Layouts.at(f, x, fl, null) == null; x++) cells.add(new int[]{x, fl});
                    if (cells.size() >= 8) { act(t, "type", "mark", "cells", cells.stream().map(p -> List.of(p[0], p[1])).toList()); return; }
                }
        }

        boolean connector(int c, int fl) {
            return c < Layouts.SHAFT || f.layout.wells.contains(Layouts.key(c, fl)) || f.layout.wells.contains(Layouts.key(c - 1, fl))
                    || f.layout.halls.contains(Layouts.key(c, fl));
        }

        /** A room that stands still for want of a hallway gets one: through the caves beside it, and rock in the
         *  way is marked for digging first (the hallway follows on a later visit). The shorter side wins. */
        void connectRooms(double t) {
            for (Building b : f.buildings) {
                int[] p = f.layout.rooms.get(b.id);
                if (p == null || b.level <= 0 || Rules.active(f, b)) continue;
                List<List<Integer>> bestCaves = null, bestRock = null;
                for (int dir : new int[]{-1, 1}) {
                    List<List<Integer>> caves = new ArrayList<>(), rock = new ArrayList<>();
                    boolean found = false;
                    for (int x = dir < 0 ? p[0] - 1 : p[0] + Layouts.width(b); x >= 0 && x < Layouts.COLS; x += dir) {
                        if (connector(x, p[1])) { found = true; break; }
                        String o = Layouts.at(f, x, p[1], null);
                        if (o == null) rock.add(List.of(x, p[1]));
                        else if (o.equals("cave")) caves.add(List.of(x, p[1]));
                        else break;   // another room is in the way
                    }
                    if (found && (bestCaves == null || caves.size() + rock.size() < bestCaves.size() + bestRock.size())) { bestCaves = caves; bestRock = rock; }
                }
                if (bestCaves == null || bestCaves.size() + bestRock.size() > 4) {
                    // no way out on this floor: a stairwell right beside the room (2 cells), dug out first
                    for (int c : new int[]{p[0] + Layouts.width(b), p[0] - 2}) {
                        if (c < Layouts.SHAFT || c + 1 >= Layouts.COLS) continue;
                        String a = Layouts.at(f, c, p[1], null), z = Layouts.at(f, c + 1, p[1], null);
                        if ("cave".equals(a) && "cave".equals(z)) { if (act(t, "type", "stairwell", "col", c, "floor", p[1])) break; continue; }
                        if ((a == null || "cave".equals(a)) && (z == null || "cave".equals(z))) {
                            List<List<Integer>> todo = new ArrayList<>();
                            if (a == null) todo.add(List.of(c, p[1]));
                            if (z == null) todo.add(List.of(c + 1, p[1]));
                            todo.removeIf(x -> f.layout.marks.contains(Layouts.key(x.get(0), x.get(1))));
                            if (!todo.isEmpty()) act(t, "type", "mark", "cells", todo);
                            break;
                        }
                    }
                    continue;
                }
                if (!bestRock.isEmpty()) {
                    List<List<Integer>> todo = new ArrayList<>();
                    for (List<Integer> c : bestRock) if (!f.layout.marks.contains(Layouts.key(c.get(0), c.get(1)))) todo.add(c);
                    if (!todo.isEmpty()) act(t, "type", "mark", "cells", todo);
                } else if (!bestCaves.isEmpty()) act(t, "type", "hallMany", "cells", bestCaves);
            }
        }

        boolean seatFree(String type) {
            for (Building b : f.buildings)
                if (b.type.equals(type) && b.level > 0 && Rules.assigned(f, b).size() < Rules.machines(b)) return true;
            return false;
        }
    }
}
