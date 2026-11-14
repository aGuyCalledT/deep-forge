package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

/**
 * Magic: gems get a cut at the jeweler, the wizard enchants them in a school, and they go into the sockets of a piece.
 * The gem brings the kind of effect and a word for its strength; the socket turns it into a number.
 * See docs/KONZEPT-MAGIE.md and docs/BALANCING.md.
 *
 * Keys: a cut gem is "gem:<cut>:<kind>:<shape>", an enchanted one "gem:<cut>:<kind>:<shape>:<effect>:<word>" (cut is the
 * quality of the cut, 0 crude .. 4 flawless; kind and shape see {@link Gems}). A piece with gems carries them in its
 * item key: "item:<type>:<metal>:<quality>:<mods>:<effect>.<word>.<cut>.<kind>.<shape>,...:<legend>".
 * Keys from before the kinds ("gem:<cut>", "gem:<cut>:<effect>:<word>", "<effect>.<word>.<cut>") still read, as rock crystal.
 */
public final class Magic {
    private Magic() {}

    /** base: the number per strength step in a plain copper socket; less: the effect lowers something. */
    public record Effect(String id, String school, String name, double base, boolean less, boolean points, double cap) {}

    public record School(String id, String name, String color, String note) {}

    public record Legend(String id, String name, String note) {}

    public static final Map<String, School> SCHOOLS = new LinkedHashMap<>();
    public static final Map<String, Effect> EFFECTS = new LinkedHashMap<>();
    public static final Map<String, Legend> LEGENDS = new LinkedHashMap<>();

    /** The quality of a cut, from the jeweler's skill. */
    public static final List<String> CUTS = List.of("Crude", "Fair", "Fine", "Brilliant", "Flawless");
    /** Chances for "greatly" and "a lot" by grade (0..4, see {@link #grade}); "better" next, the rest "slightly". */
    static final double[] GREATLY = {0, 0.03, 0.08, 0.15, 0.25};
    static final double[] A_LOT = {0.05, 0.15, 0.25, 0.35, 0.40};
    static final double[] BETTER = {0.35, 0.40, 0.40, 0.35, 0.30};
    public static final List<String> WORDS = List.of("slightly better", "better", "a lot better", "greatly better");
    public static final List<String> LESS_WORDS = List.of("slightly less", "less", "a lot less", "far less");

    /** Sockets by quality (Crude .. Artifact) and the socket factor by metal age (1 .. 6). */
    public static final int[] SOCKETS = {0, 1, 1, 2, 3, 3};
    public static final double[] AGE_FACTOR = {1, 1.5, 2, 3, 4, 5};
    public static final double LEGEND_FACTOR = 1.5, FIT = 2, JEWELRY_FIT = 1.5;
    public static final double UNSOCKET_BREAK = 0.25;
    public static final double ENCHANT_SECONDS = 1800;
    /** A tool of the right job without gems: +5 % speed per metal age (times its quality), scales +2 % prices. */
    public static final double TOOL_SPEED = 0.05, SCALES_PRICE = 0.02;

    /** The tool each job uses (the pickaxe has its own rules: hardness and speed). */
    public static final Map<String, String> TOOL_SKILL = new LinkedHashMap<>();
    /** Which effects a piece is made for: they count twice there. */
    static final Map<String, Set<String>> FITS = new LinkedHashMap<>();

    private static void effect(String id, String school, String name, double base, boolean less, boolean points, double cap) {
        EFFECTS.put(id, new Effect(id, school, name, base, less, points, cap));
    }

    static {
        SCHOOLS.put("earth", new School("earth", "Earth", "#8a6a3a", "Mining, gem finds, less tool wear"));
        SCHOOLS.put("fire", new School("fire", "Fire", "#d8572a", "Smelting, smithing quality, forging speed"));
        SCHOOLS.put("steel", new School("steel", "Steel", "#8fa6b8", "Combat, defence, healing"));
        SCHOOLS.put("hearth", new School("hearth", "Hearth", "#6f9a52", "Farming and brewing, mood, eating less"));
        SCHOOLS.put("gold", new School("gold", "Gold", "#d6a43a", "Trade prices, learning, crafting"));

        effect("mining", "earth", "mining speed", 0.05, false, false, 2.0);
        effect("gemfind", "earth", "gem finds", 0.03, false, false, 1.0);
        effect("wear", "earth", "tool wear", 0.04, true, false, 0.8);
        effect("smelting", "fire", "smelting speed", 0.05, false, false, 2.0);
        effect("smithq", "fire", "smithing quality", 0.05, false, false, 2.0);
        effect("forging", "fire", "forging speed", 0.05, false, false, 2.0);
        effect("combat", "steel", "combat power", 0.05, false, false, 2.0);
        effect("defence", "steel", "defence", 0.05, false, false, 2.0);
        effect("regen", "steel", "healing", 0.05, false, false, 2.0);
        effect("farming", "hearth", "farming and brewing", 0.05, false, false, 2.0);
        effect("mood", "hearth", "mood", 2, false, true, 40);
        effect("thrift", "hearth", "food and ale", 0.04, true, false, 0.8);
        effect("prices", "gold", "trade prices", 0.02, false, false, 0.5);
        effect("learning", "gold", "learning", 0.05, false, false, 2.0);
        effect("crafting", "gold", "crafting speed", 0.05, false, false, 2.0);

        TOOL_SKILL.put("pickaxe", "mining");
        TOOL_SKILL.put("hammer", "smithing");
        TOOL_SKILL.put("ladle", "smelting");
        TOOL_SKILL.put("sickle", "farming");
        TOOL_SKILL.put("chisel", "crafting");
        TOOL_SKILL.put("scales", "trading");
        TOOL_SKILL.put("staff", "arcana");

        FITS.put("pickaxe", Set.of("mining", "gemfind", "wear"));
        FITS.put("hammer", Set.of("smithq", "forging", "wear"));
        FITS.put("ladle", Set.of("smelting", "wear"));
        FITS.put("sickle", Set.of("farming", "wear"));
        FITS.put("chisel", Set.of("crafting", "wear"));
        FITS.put("scales", Set.of("prices"));
        FITS.put("staff", Set.of("learning", "crafting"));
        FITS.put("weapon", Set.of("combat"));
        FITS.put("helm", Set.of("defence", "regen"));
        FITS.put("armor", Set.of("defence", "regen"));

        LEGENDS.put("heart", new Legend("heart", "Heart of the Mountain", "Every miner on the bearer's layer digs 15% faster."));
        LEGENDS.put("forgefather", new Legend("forgefather", "Forgefather's Blessing", "Every piece the bearer makes comes out one quality better (up to masterwork)."));
        LEGENDS.put("tankard", new Legend("tankard", "Bottomless Tankard", "The whole hold drinks 25% less ale."));
        LEGENDS.put("gatekeeper", new Legend("gatekeeper", "Gatekeeper", "Raiders are 30% weaker while the bearer guards the entrance hall."));
        LEGENDS.put("golden", new Legend("golden", "Golden Touch", "Caravans with the bearer sell 15% dearer."));
        LEGENDS.put("deepsight", new Legend("deepsight", "Deepsight", "One more ore vein a day in every layer."));
        LEGENDS.put("undying", new Legend("undying", "Undying", "The bearer does not die. They fall, and get up again (once a day)."));
        LEGENDS.put("voice", new Legend("voice", "Voice of the Clans", "Migrants come twice as often."));
    }

    // ------------------------------------------------------------ gems

    public static boolean isGem(String key) { return key != null && key.startsWith("gem:"); }

    public static String gemKey(int cut, String kind, String shape) { return "gem:" + cut + ":" + kind + ":" + shape; }

    public static String gemKey(int cut, String kind, String shape, String effect, int word) {
        return gemKey(cut, kind, shape) + ":" + effect + ":" + word;
    }

    /** "gem:2:ruby:rose:smithq:3" -> the gem (effect null for a plain cut gem); null if it is no valid gem. */
    public static Gem parseGem(String key) {
        if (!isGem(key)) return null;
        String[] p = key.split(":");
        try {
            int cut = Integer.parseInt(p[1]);
            if (cut < 0 || cut >= CUTS.size()) return null;
            if (p.length == 2) return new Gem(cut, Gems.OLD_KIND, Gems.OLD_SHAPE, null, 0);
            if (p.length == 4 && EFFECTS.containsKey(p[2])) return gem(cut, Gems.OLD_KIND, Gems.OLD_SHAPE, p[2], Integer.parseInt(p[3]));
            if (!Gems.KINDS.containsKey(p[2]) || !Gems.SHAPES.containsKey(p[3])) return null;
            if (p.length == 4) return new Gem(cut, p[2], p[3], null, 0);
            if (p.length != 6 || !EFFECTS.containsKey(p[4])) return null;
            return gem(cut, p[2], p[3], p[4], Integer.parseInt(p[5]));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Gem gem(int cut, String kind, String shape, String effect, int w) {
        return w < 1 || w > 4 ? null : new Gem(cut, kind, shape, effect, w);
    }

    /** cut: the quality of the cut; kind and shape: see {@link Gems}; effect and word once it is enchanted. */
    public record Gem(int cut, String kind, String shape, String effect, int word) {
        public boolean enchanted() { return effect != null; }
        public String key() { return effect == null ? gemKey(cut, kind, shape) : gemKey(cut, kind, shape, effect, word); }
        public Gems.Kind kindOf() { return Gems.KINDS.get(kind); }
        public Gem enchant(String fx, int w) { return new Gem(cut, kind, shape, fx, w); }
    }

    public static boolean isPlainGem(String key) {
        Gem g = parseGem(key);
        return g != null && !g.enchanted();
    }

    public static double gemValue(String key) {
        Gem g = parseGem(key);
        return g == null ? 0 : gemValue(g);
    }

    /** The rough gem's value × the cut's quality, and more once enchanted. */
    public static double gemValue(Gem g) {
        return g.kindOf().value() * Gems.CUT_MULT[g.cut] * (g.enchanted() ? 1 + 0.4 * g.word : 1);
    }

    public static String word(Effect e, int word) {
        return (e.less() ? LESS_WORDS : WORDS).get(word - 1);
    }

    /** "a lot better smithing quality" */
    public static String gemEffectText(Gem g) {
        Effect e = EFFECTS.get(g.effect);
        return word(e, g.word) + " " + e.name();
    }

    public static String gemName(String key) {
        Gem g = parseGem(key);
        if (g == null) return key;
        String kind = g.kindOf().name(), shape = Gems.SHAPES.get(g.shape).name();
        if (!g.enchanted()) return CUTS.get(g.cut) + " " + kind.toLowerCase() + ", " + shape;
        return SCHOOLS.get(EFFECTS.get(g.effect).school()).name() + " " + kind.toLowerCase() + " (" + CUTS.get(g.cut).toLowerCase() + ", "
                + shape + "): " + gemEffectText(g);
    }

    // ------------------------------------------------------------ sockets

    /** Metal age 1..6 by value: copper and tin, iron and bronze, silver and steel, gold, platinum, star steel. */
    public static int age(Content.Metal m) {
        double v = m.value();
        return v <= 600 ? 1 : v <= 1300 ? 2 : v <= 3200 ? 3 : v <= 8000 ? 4 : v <= 18000 ? 5 : 6;
    }

    public static int sockets(String itemKey) {
        return SOCKETS[Math.min(SOCKETS.length - 1, Integer.parseInt(Content.parseItem(itemKey)[2]))];
    }

    /** The gems in a piece, in socket order. */
    public static List<Gem> gems(String itemKey) {
        List<Gem> out = new ArrayList<>();
        if (itemKey == null || !Content.isItem(itemKey)) return out;
        String s = Content.parseItem(itemKey)[4];
        if (s.isEmpty()) return out;
        for (String part : s.split(",")) {
            String[] x = part.split("\\.");
            if ((x.length != 3 && x.length != 5) || !EFFECTS.containsKey(x[0])) continue;
            String kind = x.length == 5 && Gems.KINDS.containsKey(x[3]) ? x[3] : Gems.OLD_KIND;
            String shape = x.length == 5 && Gems.SHAPES.containsKey(x[4]) ? x[4] : Gems.OLD_SHAPE;
            try {
                out.add(new Gem(Math.max(0, Math.min(CUTS.size() - 1, Integer.parseInt(x[2]))), kind, shape, x[0],
                        Math.max(1, Math.min(4, Integer.parseInt(x[1])))));
            } catch (NumberFormatException ignored) {
            }
        }
        return out;
    }

    static String gemsPart(List<Gem> gems) {
        StringBuilder sb = new StringBuilder();
        for (Gem g : gems) {
            if (sb.length() > 0) sb.append(',');
            sb.append(g.effect).append('.').append(g.word).append('.').append(g.cut).append('.').append(g.kind).append('.').append(g.shape);
        }
        return sb.toString();
    }

    public static String legend(String itemKey) {
        if (itemKey == null || !Content.isItem(itemKey)) return null;
        String l = Content.parseItem(itemKey)[5];
        return LEGENDS.containsKey(l) ? l : null;
    }

    /** The socket factor of a piece: its metal age, and half again for a legendary piece. */
    public static double socketFactor(String itemKey) {
        String[] p = Content.parseItem(itemKey);
        double f = AGE_FACTOR[age(Content.METALS.get(p[1])) - 1];
        return Integer.parseInt(p[2]) >= Content.ARTIFACT ? f * LEGEND_FACTOR : f;
    }

    /** ×2 when the gem's effect is what the piece is made for, ×1.5 in jewelry (fits everything), else ×1. */
    public static double fit(String type, String effect) {
        Content.ItemType t = Content.ITEMS.get(type);
        if (t == null) return 1;
        if ("jewelry".equals(t.category())) return JEWELRY_FIT;
        Set<String> f = FITS.get(type);
        if (f == null && t.slot() != null) f = FITS.get(t.slot());
        return f != null && f.contains(effect) ? FIT : 1;
    }

    /** What one gem gives in a piece: base × word × socket factor × fit. */
    public static double amount(String itemKey, Gem g) {
        Effect e = EFFECTS.get(g.effect);
        return e.base() * g.word * socketFactor(itemKey) * fit(Content.parseItem(itemKey)[0], g.effect);
    }

    /** Sum of each effect in one piece. */
    public static Map<String, Double> effects(String itemKey) {
        Map<String, Double> m = new LinkedHashMap<>();
        if (itemKey == null || !Content.isItem(itemKey)) return m;
        for (Gem g : gems(itemKey)) m.merge(g.effect, amount(itemKey, g), Double::sum);
        return m;
    }

    /** The piece with one more gem; null when it has no free socket or the gem is not enchanted. */
    public static String withGem(String itemKey, String gemKey) {
        Gem g = parseGem(gemKey);
        if (g == null || !g.enchanted()) return null;
        List<Gem> gems = gems(itemKey);
        if (gems.size() >= sockets(itemKey)) return null;
        gems.add(g);
        return rekey(itemKey, gems);
    }

    /** The piece without the gem at index i, or null. */
    public static String withoutGem(String itemKey, int i) {
        List<Gem> gems = gems(itemKey);
        if (i < 0 || i >= gems.size()) return null;
        gems.remove(i);
        return rekey(itemKey, gems);
    }

    static String rekey(String itemKey, List<Gem> gems) {
        String[] p = Content.parseItem(itemKey);
        return Content.itemKey(p[0], p[1], Integer.parseInt(p[2]), p[3], gemsPart(gems), p[5]);
    }

    public static String withLegend(String itemKey, String legend) {
        String[] p = Content.parseItem(itemKey);
        return Content.itemKey(p[0], p[1], Integer.parseInt(p[2]), p[3], p[4], legend);
    }

    // ------------------------------------------------------------ rolls

    /** The cut a jeweler gives a rough gem: by crafting skill and the workshop's level. */
    public static int rollCut(Rng r, int skill, int level) {
        double mean = -0.2 + 0.14 * skill + 0.25 * (level - 1);
        return (int) Math.max(0, Math.min(CUTS.size() - 1, Math.round(mean + r.gauss() * 0.8)));
    }

    /** How well a gem takes magic, 0..4: its kind's tier counts 0.6 a step, the quality of the cut 0.5. */
    public static final double GRADE_TIER = 0.6, GRADE_CUT = 0.5;

    public static double grade(int tier, int cut) {
        return Math.max(0, Math.min(4, GRADE_TIER * tier + GRADE_CUT * cut));
    }

    public static double grade(Gem g) { return grade(g.kindOf().tier(), g.cut); }

    /** Strength 1..4 by the gem's grade; arcana (skill 0..20) moves it up one step by chance, a tower of level 3+ rolls twice. */
    public static int rollWord(Rng r, double grade, int arcana, int towerLevel) {
        int w = rollWordOnce(r, grade, arcana);
        if (towerLevel >= 3) w = Math.max(w, rollWordOnce(r, grade, arcana));
        return w;
    }

    static int rollWordOnce(Rng r, double grade, int arcana) {
        double[] ch = wordChances(grade);
        double x = r.next();
        int w = x < ch[3] ? 4 : x < ch[3] + ch[2] ? 3 : x < ch[3] + ch[2] + ch[1] ? 2 : 1;
        if (w < 4 && r.chance(Math.min(1, arcana / 20.0) * 0.5)) w++;
        return w;
    }

    private static double lerp(double[] t, double grade) {
        int i = (int) Math.floor(grade);
        if (i >= t.length - 1) return t[t.length - 1];
        double f = grade - i;
        return t[i] * (1 - f) + t[i + 1] * f;
    }

    /** Chances of the four words (slightly .. greatly) for a grade (no arcana, one roll), between the table's steps. */
    public static double[] wordChances(double grade) {
        double g = lerp(GREATLY, grade), a = lerp(A_LOT, grade), b = lerp(BETTER, grade);
        return new double[]{1 - g - a - b, b, a, g};
    }

    public static String rollEffect(Rng r, String school) {
        List<String> l = new ArrayList<>();
        for (Effect e : EFFECTS.values()) if (e.school().equals(school)) l.add(e.id());
        return r.pick(l);
    }

    /** The legendary effect of a new artifact, fitting what it is. */
    public static String rollLegend(Rng r, String type) {
        Content.ItemType t = Content.ITEMS.get(type);
        List<String> l = switch (type) {
            case "pickaxe" -> List.of("heart", "deepsight");
            case "hammer", "ladle", "chisel" -> List.of("forgefather");
            case "sickle" -> List.of("tankard");
            case "scales" -> List.of("golden");
            case "staff" -> List.of("voice", "deepsight");
            default -> t != null && t.slot() != null && !"trinket".equals(t.slot()) && !"tool".equals(t.slot())
                    ? List.of("gatekeeper", "undying") : new ArrayList<>(LEGENDS.keySet());
        };
        return r.pick(l);
    }

    // ------------------------------------------------------------ on a dwarf

    public static List<String> worn(Dwarf d) {
        List<String> l = new ArrayList<>();
        for (String k : new String[]{d.weapon, d.helm, d.armor, d.tool, d.trinket}) if (k != null && Content.isItem(k)) l.add(k);
        return l;
    }

    /** All effects of a dwarf's gear, each capped. */
    public static Map<String, Double> effects(Dwarf d) {
        Map<String, Double> m = new LinkedHashMap<>();
        for (String k : worn(d)) for (Map.Entry<String, Double> e : effects(k).entrySet()) m.merge(e.getKey(), e.getValue(), Double::sum);
        m.replaceAll((k, v) -> Math.min(v, EFFECTS.get(k).cap()));
        return m;
    }

    /** One effect of a dwarf's gear (0 when there is none), capped. */
    public static double bonus(Dwarf d, String effect) {
        if (d == null) return 0;
        double v = 0;
        for (String k : worn(d)) for (Gem g : gems(k)) if (g.effect.equals(effect)) v += amount(k, g);
        return Math.min(v, EFFECTS.get(effect).cap());
    }

    public static boolean bears(Dwarf d, String legend) {
        for (String k : worn(d)) if (legend.equals(legend(k))) return true;
        return false;
    }

    /** The dwarves carrying a legendary effect (it counts once in the hold, whoever has it). */
    public static List<Dwarf> bearers(Fortress f, String legend) {
        List<Dwarf> l = new ArrayList<>();
        for (Dwarf d : f.dwarves) if (bears(d, legend)) l.add(d);
        return l;
    }

    public static boolean active(Fortress f, String legend) {
        return !bearers(f, legend).isEmpty();
    }

    /** The job tool's own speed bonus: +5 % per metal age times quality, when it is the tool of this skill. */
    public static double toolSpeed(Dwarf d, String skill) {
        if (d.tool == null || !Content.isItem(d.tool)) return 0;
        String[] p = Content.parseItem(d.tool);
        if (p[0].equals("pickaxe") || !skill.equals(TOOL_SKILL.get(p[0]))) return 0;
        return TOOL_SPEED * age(Content.METALS.get(p[1])) * Rules.qualityPower(d.tool);
    }

    /** Is the dwarf's tool the one for this skill? */
    public static boolean toolFor(Dwarf d, String skill) {
        if (d.tool == null || !Content.isItem(d.tool)) return false;
        return skill.equals(TOOL_SKILL.get(Content.parseItem(d.tool)[0]));
    }

    /** The effect that speeds up work of a skill. */
    public static String speedEffect(String skill) {
        return switch (skill) {
            case "mining" -> "mining";
            case "smelting" -> "smelting";
            case "smithing" -> "forging";
            case "farming" -> "farming";
            case "crafting", "arcana" -> "crafting";
            default -> null;
        };
    }

    public static Map<String, Object> asData() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("schools", SCHOOLS.values());
        d.put("effects", EFFECTS.values());
        d.put("legends", LEGENDS.values());
        d.put("cuts", CUTS);
        d.put("greatly", GREATLY);
        d.put("aLot", A_LOT);
        d.put("better", BETTER);
        d.put("gradeTier", GRADE_TIER);
        d.put("gradeCut", GRADE_CUT);
        d.put("words", WORDS);
        d.put("lessWords", LESS_WORDS);
        d.put("sockets", SOCKETS);
        d.put("ageFactor", AGE_FACTOR);
        d.put("legendFactor", LEGEND_FACTOR);
        d.put("fit", FIT);
        d.put("jewelryFit", JEWELRY_FIT);
        d.put("fits", FITS);
        d.put("toolSkill", TOOL_SKILL);
        d.put("toolSpeed", TOOL_SPEED);
        d.put("scalesPrice", SCALES_PRICE);
        d.put("unsocketBreak", UNSOCKET_BREAK);
        return d;
    }
}
