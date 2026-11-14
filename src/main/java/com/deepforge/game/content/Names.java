package com.deepforge.game.content;

import com.deepforge.game.rules.*;

import java.util.List;

/** Generators for dwarves, artifacts and other flavour. */
public final class Names {
    private Names() {}

    static final List<String> PRE = List.of("Bor", "Dur", "Thra", "Gim", "Kaz", "Mor", "Bal", "Dag", "Fun", "Grom",
            "Hel", "Kil", "Nor", "Orm", "Rur", "Sto", "Tor", "Ul", "Vig", "Bri", "Dis", "Hil", "Mag", "Ragn", "Thyr",
            "Ing", "Ast", "Edd", "Gud", "Sig", "Bram", "Kor", "Har", "Ulf", "Yr");
    static final List<String> SUF = List.of("in", "ur", "grim", "ra", "rik", "dis", "dur", "nar", "li", "gar",
            "mund", "hild", "run", "bek", "dok", "vi", "a", "ok", "rid");
    public static final List<String> CLAN = List.of("Ironbeard", "Stonefist", "Deepdelver", "Copperkettle", "Anvilborn",
            "Ashforge", "Goldvein", "Hammerhand", "Coalbrow", "Granitejaw", "Emberbeard", "Tinkettle", "Rockbottom",
            "Silveraxe", "Brightbellows", "Dustmantle", "Flintheart", "Gravelgut", "Quartzcheek", "Mugsworth",
            "Cinderbraid", "Oreheart", "Slatebelly", "Torchwick");
    public static final List<String> BEARDS = List.of("#7a3b1e", "#c4622d", "#e0b04a", "#3b2a20", "#1e1a18", "#9a9a9a",
            "#e8e2d4", "#8d5a2b", "#b8432c");
    public static final List<String> SKINS = List.of("#f0c8a0", "#d9a77c", "#b97f57", "#8d5a3b", "#f4d3b8");

    static final List<String> ART_ADJ = List.of("Weeping", "Silent", "Burning", "Forgotten", "Hollow", "Gilded",
            "Shattered", "Laughing", "Ancient", "Midnight", "Sunken", "Whispering");
    static final List<String> ART_NOUN = List.of("Goblet", "Crown", "Hammer", "Lantern", "Idol", "Anvil", "Mask",
            "Chalice", "Key", "Horn", "Seal", "Circlet");

    static final List<String> F_PRE = List.of("Bri", "Dis", "Hil", "Ast", "Sig", "Ing", "Gud", "Thyr", "Ragn", "Mag", "Edd",
            "Fre", "Hel", "Ka", "Lof", "Nal", "Ola", "Run", "Sol", "Ves", "Yl", "Dag", "Tor", "Ber");
    static final List<String> F_SUF = List.of("a", "is", "hild", "run", "dis", "ra", "li", "vi", "gerd", "wyn", "eth", "ja",
            "dri", "una", "borg", "frid", "elle");

    public static String first(Rng r) {
        return r.pick(PRE) + r.pick(SUF);
    }

    public static String first(Rng r, boolean female) {
        return female ? r.pick(F_PRE) + r.pick(F_SUF) : first(r);
    }

    public static String artifact(Rng r) {
        return "The " + r.pick(ART_ADJ) + " " + r.pick(ART_NOUN) + " of " + first(r);
    }
}
