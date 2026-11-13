package com.deepforge.game;

import java.util.*;

/**
 * Persistent game state. A fortress is stored as one JSON document per player.
 * Times are epoch seconds (double).
 */
public final class State {
    private State() {}

    public static class Fortress {
        public int version = 1;         // 2: money in Jots, gate and trade depot instead of walls and trading post
        public long userId;
        public String owner;
        public String name;
        public long rng;
        public double t;                // simulated up to this time
        public double created;
        public double coins;            // in Jots: 1 Mark = 100 Talents = 1000 Jots
        public Map<String, Integer> stock = new TreeMap<>();
        public List<Dwarf> dwarves = new ArrayList<>();
        public int nextId = 1;
        public List<Building> buildings = new ArrayList<>();
        public boolean autoPicks = true;   // miners without a pick take the best one from the warehouse
        public List<LayerState> layers = new ArrayList<>();
        public List<Caravan> caravans = new ArrayList<>();
        public double lastVisit;         // when the player last looked (0: always counts as present, old saves and tests)
        public double findAt;            // the next shift report with a find (every 4 h, up to 3 wait)
        public Visitor visitor;          // a caravan from a city at the gate that wants to buy (no risk, no road)
        public double nextVisitor;       // when the next one may come (0: soon)
        public List<Expedition> expeditions = new ArrayList<>();
        public List<Report> reports = new ArrayList<>();   // returned caravans and expeditions whose loot waits to be collected
        public List<Offer> offers = new ArrayList<>();
        public double offersAt;
        public List<Threat> threats = new ArrayList<>();
        public Raid raid;
        public Siege siege;
        public double nextRaidAt;
        public double nextMigrantsAt;
        public double griefUntil;
        public double foodDebt;
        public double aleDebt;
        public boolean noFood;
        public boolean noAle;
        public boolean storageFull;
        public boolean liftLimited;
        public List<LogEntry> log = new ArrayList<>();
        public Set<String> blueprints = new TreeSet<>();
        public Set<String> discovered = new TreeSet<>();   // layer indexes as strings
        public Set<String> cities = new TreeSet<>();
        public Set<String> doneOnce = new TreeSet<>();     // one-time expeditions finished
        public List<Artifact> artifacts = new ArrayList<>();
        public List<Forging> anvil = new ArrayList<>();     // forged pieces waiting for the player at the anvil (max 10)
        public Smithed smithed;                             // the last piece the player finished by hand
        public List<Memorial> memorials = new ArrayList<>();
        public double xp;
        public int level = 1;
        public Map<String, Integer> traditions = new TreeMap<>();
        public Stats stats = new Stats();
        public Layout layout;
        // trade depot
        public Map<String, Double> traded = new TreeMap<>();   // market key -> value traded, fading over a week (Jots)
        public double tradedAt;
        public List<Double> shareHist = new ArrayList<>();      // own market share, one sample every 2 hours
        public double shareAt;
        public List<CaravanPlan> plans = new ArrayList<>();
        public List<DepotRule> rules = new ArrayList<>();
        public List<BuyOrder> orders = new ArrayList<>();
        public List<Delivery> deliveries = new ArrayList<>();
    }

    /** A saved caravan: how many merchants and guards, and what to load (market key -> how many to keep at home). */
    public static class CaravanPlan {
        public int id;
        public String name;
        public int merchants = 1;
        public int guards;
        public Map<String, Integer> load = new TreeMap<>();
    }

    /** IF stock of good (a market key) >= atLeast THEN send plan to city. Fires again once that caravan is back. */
    public static class DepotRule {
        public int id;
        public String good;
        public int atLeast;
        public int plan;
        public String city;
        public boolean on = true;
        public int caravan;           // the caravan it sent that is still on the road (0 = none)
        public double firedAt;
        public int fired;             // how often it sent a caravan
        public String status;         // why it waits
    }

    /** Posted to the cities: we buy this good up to maxPrice (Jots each), left more, while we keep keepCoins. */
    public static class BuyOrder {
        public int id;
        public String good;
        public double maxPrice;
        public int left;
        public double keepCoins;
        public int bought;
        public double spent;
        public String status;
    }

    /** City traders on their way with goods for a buy order. Paid on arrival. */
    public static class Delivery {
        public int id;
        public int order;
        public String city;
        public String good;
        public int qty;
        public double cost;
        public double arriveAt;
    }

    /** Where rooms, hallways and stairs are in the hold. Cells are (col, floor); floor 0 is right under the surface. */
    public static class Layout {
        public Map<String, int[]> rooms = new TreeMap<>();  // building id -> [col, floor]
        public Set<String> halls = new TreeSet<>();         // "col,floor"
        public Set<String> wells = new TreeSet<>();         // "col,floor": left cell of a stairwell (2 cells wide)
        public Map<String, Double> caves = new TreeMap<>(); // dug out but empty: "col,floor" -> since when (it overgrows)
        public List<String> marks = new ArrayList<>();      // rock the miners should dig out, in order
        public Map<String, Double> digs = new TreeMap<>();  // dig progress in work seconds
        public Set<String> stairs = new TreeSet<>();        // old saves only: diagonal stairs, turned into stairwells
        public Set<String> doors = new TreeSet<>();         // old saves only: back doors, no longer used
        public int version;                                 // 2: rooms may stand without a hallway (they stand still)
    }

    public static class Stats {
        public double coinsEarned;
        public int itemsCrafted;
        public int masterworks;
        public int expeditions;
        public int dwarvesLost;
        public int monstersSlain;
        public int raidsRepelled;
        public int barsSmelted;
    }

    public static class Dwarf {
        public int id;
        public String first;
        public String clan;
        public int age;
        public String beard;      // colour, always the same as the hair
        public String hair;
        public String sex = "m";      // m | f
        public int nose = -1, brows = -1, eyeColor = -1, mouth = -1;
        public boolean freckles;
        public Map<String, String> wear = new LinkedHashMap<>();   // slot -> "wear:<cloth>:<dye>"
        public int looks;             // 2 = the current look (sex, face, clothes as items)
        public String skin;
        public int beardStyle;
        public int hairStyle = -1;    // -1: derive from id (old saves)
        public int hat = -1;
        public int body = -1;         // build: 0 stout, 1 tall, 2 round
        public String outfit;         // tunic colour
        public int accessory = -1;
        public List<String> traits = new ArrayList<>();
        public Map<String, Double> xp = new TreeMap<>();
        public double health = 100;
        public double happiness = 60;
        public double lowMoodHours;
        public double hungerHours;
        public String job = "idle";   // idle | miner | worker | warrior | merchant
        public int layer;             // miner: layer index
        public String building;       // worker: building id
        public int machine = -1;      // worker: which machine (0-based); -1 = the first free one
        public String post = "hall";  // warrior: hall (entrance hall guard) | mine (patrol); old saves: fortress
        public String busy;           // caravan:<id> | expedition:<id>
        public String dig;            // miner: the cell ("col,floor") being dug out in the hold, or null
        public String weapon;
        public String helm;
        public String armor;
        public String tool;
        public double toolWear;       // working hours the tool has done (it breaks at Rules.toolLife)
        public Map<String, Double> gearWear = new TreeMap<>();   // weapon, helm, armor: share of their life used up (breaks at 1)
        public double arrived;
    }

    public static class Building {
        public String id;
        public String type;
        public int level = 1;
        public double upUntil;        // builders at work: the next level is ready at this time (0: nobody builds here)
        public List<QueueEntry> queue = new ArrayList<>();
        public Job job;
        public double heat;       // bellows heat 0..100 at heatT
        public double heatT;
        public double fert;       // mushroom farm: extra yield (0..0.6) from fertilizer until fertUntil
        public double fertUntil;
        public double acc;        // continuous production accumulator
        public String status;     // human readable why idle
        public int machines = 1;  // workstations in the room; each one needs its own worker
        public boolean machinesByHand;   // the player took a machine out: the hold no longer adds them back on its own
        public List<Job> more = new ArrayList<>();   // jobs of machines 2..n (null = idle); machine 1 uses job
        public String look = "";  // room template (art/props48/rooms), "" = the first; bays use the same name if there is one
    }

    public static class QueueEntry {
        public int id;
        public String recipe;     // smelt | alloy | craft | sharpen | engrave | cutgem | setgem
        public String mat;        // ore id, alloy metal or metal for items (null = any)
        public String itype;      // item type
        public int remaining;     // -1 = forever
        public int keep;          // > 0: only work while fewer than this many of the product are in the warehouse
    }

    public static class Job {
        public String recipe;
        public String mat;
        public String itype;
        public double progress;
        public double time;
        public Map<String, Integer> out = new TreeMap<>();
        public String inItem;     // for workshop jobs on an existing item
        public boolean quenching;
        public double quenchStart;
        public int quality = -1;
    }

    public static class LayerState {
        public int index;
        public boolean unlocked;
        public int level = 1;
        public double pending;
        public String threat;     // threat id while blocked
        public Map<String, Integer> cart = new TreeMap<>();   // ore in the mine cart; it goes up the lift when full
        public double cartSent;   // when the last full cart left (0: never)
        public int cartLoad;      // how much it carried
        public double cartStart;  // when the first ore went into the empty cart
        public int cartFill = 100;   // the cart goes up when it is this full (percent of its size)
        public int cartMinutes;      // ... or this many minutes after the first ore went in (0: no time limit)
        public double veinAt;        // the player may break the next vein out by hand from this time on
    }

    /** Traders from a city at the gate. They buy up to `want` goods of one market key at a fixed price per unit. */
    public static class Visitor {
        public int id;
        public String city;
        public String market;      // market key: "type:axe", "cat:clothing", "bar:iron", "coal"...
        public int want;
        public double mult;        // price per unit = base value × mult
        public double came;
        public double leaves;
    }

    public static class Caravan {
        public int id;
        public String city;
        public List<Integer> merchants = new ArrayList<>();
        public List<Integer> guards = new ArrayList<>();
        public Map<String, Integer> cargo = new TreeMap<>();
        public List<Artifact> artifacts = new ArrayList<>();
        public Map<String, Integer> buy = new TreeMap<>();
        public double budget;
        public double departAt;
        public double arriveAt;
        public double returnAt;
        public String state = "outbound";  // outbound | returning
        public int rule;                    // the depot rule that sent it (0 = sent by hand)
        public double revenue;
        public double spent;
        public Map<String, Integer> bought = new TreeMap<>();
        public List<String> report = new ArrayList<>();
    }

    public static class Offer {
        public int id;
        public String type;
        public String name;
        public String desc;
        public double hours;
        public int danger;
        public double recPower;
        public String target;
        public double expires;    // 0 = never
        public boolean fixed;
    }

    public static class Expedition {
        public int id;
        public String type;
        public String name;
        public int danger;
        public String target;
        public List<Integer> party = new ArrayList<>();
        public int size;
        public int food;
        public int ale;
        public double supply;     // provided / needed
        public double departAt;
        public double returnAt;
        public List<Stage> stages = new ArrayList<>();
        public int next;          // next stage index
        public Map<String, Integer> loot = new TreeMap<>();
        public double coins;
        public List<Artifact> artifacts = new ArrayList<>();
        public List<String> blueprints = new ArrayList<>();
        public int recruits;
        public List<String> discoveries = new ArrayList<>();
        public List<String> log = new ArrayList<>();
        public String state = "active";  // active | done | lost
        public double bonus;      // accumulated success modifier from choices
    }

    public static class Stage {
        public double at;
        public String kind;       // combat | hazard | find | choice | flavor | goal
        public String event;
        public String prompt;
        public String optA;
        public String optB;
        public String chosen;     // "a" | "b" | null
        public boolean done;
    }

    public static class Threat {
        public int id;
        public int layer;
        public String monster;
        public String name;
        public double power;
        public double since;
        public double nextHarm;
        public String cell;           // a critter in an overgrown cave of the hold ("col,floor"); null: a monster in the mine
        public double fightAt;        // critters: when the guards from the entrance hall get there (0 = nobody on the way)
        public List<Integer> guards = new ArrayList<>();   // who is on the way
        public double retryAt;        // critters: guards try again from this time on (after a lost fight)
    }

    public static class Raid {
        public String name;
        public double power;
        public double arrivesAt;
        public double announcedAt;
    }

    public static class Siege {
        public String name;
        public double power;
        public double until;
    }

    /** What a caravan or expedition brought home. The goods, coins and artifacts are added when the player collects. */
    public static class Report {
        public int id;
        public String kind;                 // caravan | expedition
        public int ref;                     // caravan or expedition id
        public String title;
        public boolean bad;                 // things went wrong (bandits, deaths)
        public double at;
        public List<String> lines = new ArrayList<>();
        public Map<String, Integer> goods = new TreeMap<>();
        public double coins;
        public List<Artifact> artifacts = new ArrayList<>();
        public List<String> extras = new ArrayList<>();   // things that already happened: new dwarves, routes, blueprints
    }

    public static class Artifact {
        public int id;
        public String name;
        public String desc;
        public double value;
        public String item;       // forged artifacts: the item key it was made as (quality 5)
        public boolean unnamed;   // waits for the player to name it
    }

    /** A piece of hot metal at the anvil, waiting to be hammered and quenched by the player. */
    public static class Forging {
        public int id;
        public String building;
        public String itype;
        public String mat;
        public int dwarf;         // who forged it (0: nobody any more)
        public int skill;         // their smithing skill then
        public boolean nimble;
        public int level;         // forge level then
        public double hours;      // working hours the piece took (artifact chance grows with it)
        public double at;         // when it came off the fire
    }

    public static class Smithed {
        public int forging;
        public String key;        // the item made (null for an artifact)
        public int quality;
        public int artifact;      // artifact id, 0 for none
        public double score;      // 0..1, how well the player did
    }

    public static class Memorial {
        public String name;
        public String cause;
        public double t;
    }

    public static class LogEntry {
        public double t;
        public String kind;   // info | good | warn | bad
        public String text;

        public LogEntry() {}

        public LogEntry(double t, String kind, String text) {
            this.t = t;
            this.kind = kind;
            this.text = text;
        }
    }

    /** Shared world: prices of every good in every city, city demand. One row for the whole server. */
    public static class World {
        public int version;           // 2: world level + city levels in log space
        public double t;
        public long seed;
        public long rng;
        public Map<String, Double> idx = new TreeMap<>();        // old worlds: market index per good
        public Map<String, Double> g = new TreeMap<>();          // world level per market key (log of the multiplier)
        public Map<String, Map<String, Double>> c = new TreeMap<>(); // city -> market key -> city level (log)
        public Map<String, List<Double>> hist = new TreeMap<>(); // world multiplier, one sample per 30 min, 7 days
        public double histAt;
        public Map<String, Map<String, List<Double>>> chist = new TreeMap<>(); // city multipliers, one per 2 h, 7 days
        public double chistAt;
        public long demandEpoch = -1;
        public Map<String, Map<String, Double>> demand = new TreeMap<>(); // city -> category -> multiplier
        public Map<String, String> news = new TreeMap<>();
    }
}
