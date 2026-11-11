import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import draft_hair as H0
from base import *
from front import *
def beard(spans, pat="HJHh", dark_from=19, bottom=None):
    out=[]
    for y,(x0,x1) in spans.items():
        s="O"
        for x in range(x0+1,x1):
            c=pat[x%len(pat)]
            if x>=dark_from: c={'J':'H','H':'h','h':'k'}.get(c,c)
            if x==x1-1: c='k'
            if bottom and y>=bottom and c=='J': c='H'
            s+=c
        out.append((y,x0,s+"O"))
    return out
HAIR = {
 'short':   segs(H0.M1_HAIR),
 'bald':    segs([s for s in H0.M3_HAIR if s[0] >= 7]),
 'topknot': segs(H0.M1_HAIR + [(0,13,"OOOOOO"),(1,13,"OJJHhO"),(2,12,"OOgGGyOO")]),
 'long':    segs(H0.F3_HAIR),
 'braids':  segs(H0.F1_HAIR),
 'bun':     segs(H0.F2_HAIR),
}
BEARD = {
 'fork': segs(H0.M1_BEARD),
 'wide': segs(H0.M2_BEARD),
 'long': segs(H0.M3_BEARD),
 'full': segs([(12,9,"HH"),(12,21,"hh"),(13,9,"HHH"),(13,20,"hhh"),(14,8,"OHHJHH"),(14,18,"HJhhhO"),
               (15,8,"OHJJHHkkkkHHJhhO")] + beard({16:(8,23),17:(8,23),18:(8,23),19:(9,22),20:(9,22),21:(10,21),22:(11,20)}, dark_from=19, bottom=21)
              + [(23,12,"OOOOOOOO")]),
 'short': segs([(12,9,"H"),(12,22,"h"),(13,9,"H"),(13,22,"h"),(14,12,"OHJ"),(14,18,"JhO"),
                (15,11,"OHJJHkkHhhkO"),(16,12,"OkO"),(16,17,"OkO"),(16,14,"OHHO"),(17,14,"OJhO"),(18,15,"OO")]),
}
# hats sit over the hair; with a hat on, hair above row HAT_CLIP is hidden
HAT_CLIP = 8
HAT = {
 'helm': segs(H0.M2_HAIR[:8]),
 'cap':  segs([(1,12,"OOOOOOOO"),(2,11,"OXQQQQCCO"),(3,10,"OXQQQQQQCCO"),(4,9,"OXQQQQQQQQCcO"),(5,9,"OQQQQQQQQQCcO"),
               (6,8,"OXXXXXXXXXXXXQO"),(7,8,"OQCQCQCQCQCQCcO"),(8,8,"OOOOOOOOOOOOOOO"),(0,14,"OOO"),(-1+1,14,"OXO")]),
 'hood': segs([(1,11,"OOOOOOOOOO"),(2,10,"OXQQQQQQCCO"),(3,9,"OXQQQQQQQQCcO"),(4,8,"OXQQQQQQQQQQCcO"),(5,8,"OQQQCCCCCCQQCcO"),
               (6,7,"OQQCO"),(6,20,"OCcO"),(7,7,"OQCO"),(7,21,"OcO"),(8,7,"OQCO"),(8,21,"OcO"),(9,7,"OQcO"),(9,21,"OcO"),
               (10,7,"OQcO"),(10,21,"OcO"),(11,7,"OQcO"),(11,21,"OcO"),(12,7,"OQcO"),(12,21,"OcO"),(13,7,"OQcO"),(13,21,"OcO"),
               (14,7,"OQcO"),(14,21,"OcO"),(15,7,"OQQcO"),(15,20,"OCcO"),(16,7,"OQQQCO"),(16,19,"OCCcO"),(17,6,"OQQQQCCOOOOOOCCCcO"),
               (18,6,"OOOOOOO"),(18,19,"OOOOOO")]),
}
# brows and sideburns that show under a helm or hood when the style itself is hidden (bald look under hats)
UNDER = segs([(9,11,"hHh"),(9,18,"hHh")])
