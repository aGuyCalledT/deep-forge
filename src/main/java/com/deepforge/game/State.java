package com.deepforge.game;

import java.util.*;

/**
 * Persistent game state. A fortress is stored as one JSON document per player.
 * Times are epoch seconds (double).
 */
public final class State {
    private State() {}

    public static class Fortress {
        public int version = 1;
        public long userId;
        public String owner;
        public String name;
        public long rng;
        public double t;                // simulated up to this time
        public double created;
        public double coins;
        public Map<String, Integer> stock = new TreeMap<>();
        public List<Dwarf> dwarves = new ArrayList<>();
        public int nextId = 1;
        public List<Building> buildings = new ArrayList<>();
        public List<LayerState> layers = new ArrayList<>();
        public List<Caravan> caravans = new ArrayList<>();
        public List<Expedition> expeditions = new ArrayList<>();
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
        public List<Memorial> memorials = new ArrayList<>();
        public double xp;
        public int level = 1;
        public Map<String, Integer> traditions = new TreeMap<>();
        public Stats stats = new Stats();
        public Layout layout;
    }

    /** Where rooms, hallways and stairs are in the hold. Cells are (col, floor); floor 0 is right under the surface. */
    public static class Layout {
        public Map<String, int[]> rooms = new TreeMap<>();  // building id -> [col, floor]
        public Set<String> halls = new TreeSet<>();         // "col,floor"
        public Set<String> stairs = new TreeSet<>();        // "col,floor": 2 wide, from floor down to floor + 1
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
        public String beard;      // colour
        public String hair;
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
        public String post = "fortress"; // warrior: fortress | mine
        public String busy;           // caravan:<id> | expedition:<id>
        public String weapon;
        public String helm;
        public String armor;
        public String tool;
        public double arrived;
    }

    public static class Building {
        public String id;
        public String type;
        public int level = 1;
        public List<QueueEntry> queue = new ArrayList<>();
        public Job job;
        public double heat;       // bellows heat 0..100 at heatT
        public double heatT;
        public double acc;        // continuous production accumulator
        public String status;     // human readable why idle
    }

    public static class QueueEntry {
        public int id;
        public String recipe;     // smelt | alloy | craft | sharpen | engrave | cutgem | setgem
        public String mat;        // ore id, alloy metal or metal for items (null = any)
        public String itype;      // item type
        public int remaining;     // -1 = forever
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

    public static class Artifact {
        public int id;
        public String name;
        public String desc;
        public double value;
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

    /** Shared world: market indices, city demand. One row for the whole server. */
    public static class World {
        public double t;
        public long seed;
        public long rng;
        public Map<String, Double> idx = new TreeMap<>();        // market index per good (1.0 = normal)
        public Map<String, List<Double>> hist = new TreeMap<>(); // index history, one sample per 30 min
        public double histAt;
        public long demandEpoch = -1;
        public Map<String, Map<String, Double>> demand = new TreeMap<>(); // city -> category -> multiplier
        public Map<String, String> news = new TreeMap<>();
    }
}
