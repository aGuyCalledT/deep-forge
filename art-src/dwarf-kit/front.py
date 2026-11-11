from base import *
HEAD = grid([
"...........OOOOOOOOOO...........",
"..........OSSSSSSssssO..........",
".........OSSSSSSSssssdO.........",
".........OSSSSSSsssssdO.........",
".........OSSSSSsssssddO.........",
".........OSSssssssssddO.........",
".........OSsssssssssddO.........",
"........OssssOsSSsOsdddO........",
"........OsSsswsSsdwsdsdO........",
"........OssddsSSssdsdddO........",
".........OsdddSsssddddO.........",
".........OssssaddadsddO.........",
".........OssssdaadssddO.........",
"..........OssssssssddO..........",
], 3, 'head')
# mouths (rows 14-16), drawn over the head; '_' is not used here
MOUTH = {
 'neutral': segs([(15,13,"sdaads")]),
 'happy':   segs([(14,13,"a"),(14,18,"a"),(15,13,"daOOad"),(16,14,"dSSd")]),
 'angry':   segs([(15,13,"sOOOOs"),(16,14,"dddd"),(9,11,"a"),(9,20,"a")]),
 'open':    segs([(15,13,"daOOad"),(16,14,"aOOa")]),
 'sleep':   segs([(15,14,"dadd"),(10,13,"s"),(10,18,"s"),(11,12,"aa"),(11,18,"aa")]),
}
BLINK = segs([(10,13,"s"),(10,18,"s"),(11,12,"aa"),(11,18,"aa")])

MALE = grid([
".....OOOOOOOOOOOOOOOOOOOOOO.....",  # 17
"....OTTTTTtvvvvvvvvvvttttuuO....",  # 18
"...OTTtvTttttttttttttttuvtuuO...",  # 19
"...OTttvTtttttttuttttttuvtuuO...",  # 20
"...OTttvTtttttttutttttttvtuuO...",  # 21
"...OTttvTtttttttuttttttuvtuuO...",  # 22
"...OTttvTtttttttutttttttvtuuO...",  # 23
"...OTttvTtttttttuttttttuvtuuO...",  # 24
"...OTttvTtttttttutttttttvtuuO...",  # 25
"...OTttvTtttttttuttttttuvtuuO...",  # 26
"...OuuuvEEEEEEgGGgEEEEEevuuuO...",  # 27
"...OSsdveeeeeeyggyeeeeeevSsdO...",  # 28
"...OssdvTtttttttvttttttuvsddO...",  # 29
"....OOOvTtttttttvtttttttuvOOO...",  # 30
"......OTttttttttvttttttttuO.....",  # 31
"......OTtttttttuvutttttttuO.....",  # 32
"......OOOOOOOOOOOOOOOOOOOOO.....",  # 33
"........OPpppqO..OPpppqO........",  # 34
"........OPpppqO..OPpppqO........",  # 35
".......OLBBBBbO..OLBBBBbO.......",  # 36
".......OBBBBBbO..OBBBBBbO.......",  # 37
"......OLBBBBBbO..OLBBBBbbO......",  # 38
"......OBBBBBBbO..OBBBBBBbO......",  # 39
"......OlbbbbbbO..OlbbbbbbO......",  # 40
"......OOOOOOOOO..OOOOOOOOO......",  # 41
], 17, 'male')
FEMALE = segs([
(17,6,"OOOOOO"),(17,12,"aaaaaaaa"),(17,20,"OOOOOO"),
(18,5,"O"),(18,6,"TTTTtt"),(18,12,"v"),(18,13,"sSssss"),(18,19,"v"),(18,20,"ttttuu"),(18,26,"O"),
(19,4,"OTTv"),(19,8,"Ttttt"),(19,13,"v"),(19,14,"ssss"),(19,18,"v"),(19,19,"ttttu"),(19,24,"vtuO"),
(20,4,"OTTv"),(20,8,"Tttttt"),(20,14,"v"),(20,15,"ss"),(20,17,"v"),(20,18,"tttttu"),(20,24,"vtuO"),
(21,4,"OTtv"),(21,8,"tTTTTttvvtTTTTtu"),(21,24,"vtuO"),
(22,4,"OTtv"),(22,8,"ttTTttttttTTttuu"),(22,24,"vtuO"),
(23,4,"OTtv"),(23,8,"tuuuuuttttuuuuuu"),(23,24,"vtuO"),
(24,4,"OTtv"),(24,8,"vTtttttutttttttv"),(24,24,"vtuO"),
(25,4,"OTtv"),(25,8,"vTtttttutttttttv"),(25,24,"vtuO"),
(26,4,"Ouuv"),(26,8,"vEEEEEgGGgEEEEev"),(26,24,"vuuO"),
(27,4,"OSdv"),(27,8,"veeeeeyggyeeeeev"),(27,24,"vSdO"),
(28,4,"OsdO"),(28,8,"Tttttttvtttttttu"),(28,24,"OsdO"),
(29,5,"OOO"),(29,8,"Tttttttvtttttttu"),(29,24,"OOO"),
(30,6,"OTtttttttvttttttttuO"),
(31,6,"OTttttttuvuttttttuuO"),
(32,5,"OTtttttttuvutttttttuuO"),
(33,5,"OTttttttttvttttttttuuO"),
(34,4,"OTttttttttuvuttttttttuuO"),
(35,4,"OOOOOOOOOOOOOOOOOOOOOOOO"),
(36,8,"OLBBBbO"),(36,17,"OLBBBbO"),
(37,7,"OLBBBBbO"),(37,17,"OLBBBBbO"),
(38,7,"OBBBBBbO"),(38,17,"OBBBBBbO"),
(39,6,"OLBBBBBbO"),(39,17,"OLBBBBbbO"),
(40,6,"OlbbbbbbO"),(40,17,"OlbbbbbbO"),
(41,6,"OOOOOOOOO"),(41,17,"OOOOOOOOO"),
])
# the viewer's right arm is its own part, so it can move (eat, drink)
ARM_DOWN = {'m': crop_rows(MALE, 19, 31, 25), 'f': crop_rows(FEMALE, 19, 30, 25)}
BODY = {'m': cut(MALE, 19, 31, 25), 'f': cut(FEMALE, 19, 30, 25)}
ARM_MID_M = segs([
(19,25,"tuuO"),(20,25,"tuuO"),(21,25,"tuuO"),
(22,17,"OOOOOOO"),(22,24,"vtuuO"),
(23,16,"OSsdOTTtttuuO"),
(24,16,"OssdOttttttuO"),
(25,16,"OddaOuuuuuuuO"),
(26,17,"OOO"),(26,21,"OOOOOOO"),
(27,24,"O"),(28,24,"O"),(29,24,"O"),
])
ARM_UP_M = segs([
(13,17,"OOO"),
(14,16,"OSsdO"),
(15,16,"OssdO"),
(16,16,"OddaOO"),
(17,17,"OOOOTO"),
(18,20,"OTtO"),
(19,20,"OTtO"),(19,25,"tuuO"),
(20,21,"OTtO"),(20,25,"tuuO"),
(21,22,"OTttuuO"),
(22,23,"OTtuuO"),
(23,23,"OOuuuO"),
(24,24,"OOOOO"),
(25,24,"O"),(26,24,"O"),(27,24,"O"),(28,24,"O"),(29,24,"O"),
])
def squeeze(L, col=26):
    # female arms are one pixel slimmer: drop a column right of the torso
    return [r[:col] + r[col+1:] + '.' for r in L]
ARM = {
 'm': {'down': ARM_DOWN['m'], 'mid': ARM_MID_M, 'up': ARM_UP_M},
 'f': {'down': ARM_DOWN['f'], 'mid': squeeze(ARM_MID_M), 'up': squeeze(ARM_UP_M)},
}
PROP = {
 'spoon_mid': segs([(19,17,"OMO"),(20,17,"OWO"),(21,18,"m"),(22,18,"m")]),
 'spoon_up':  segs([(10,18,"OMO"),(11,18,"OWO"),(12,19,"m"),(13,19,"m")]),
 'mug_down':  segs([(26,27,"OOOO"),(27,27,"OfffO"),(28,27,"OIIYO"),(29,27,"OIIYO"),(30,27,"OOOO")]),
 'mug_up':    segs([(11,14,"OOOOO"),(12,14,"OffffO"),(13,14,"OIIIYO"),(14,14,"OIIIYO"),(15,15,"OOOO")]),
 'axe':       segs([(15,27,"O"),(16,26,"OIO"),(17,26,"OIOOO"),(18,26,"OIWMMO"),(19,26,"OIMMmO"),(20,26,"OIMmnO"),(21,26,"OIOOO"),
                    (22,26,"OIO"),(23,26,"OIO"),(24,26,"OYO"),(25,26,"OIO"),(26,26,"OIO"),(27,26,"OIO"),(31,26,"OIO"),(32,26,"OiO"),(33,27,"O")]),
 'sack':      segs([(23,27,"OOO"),(24,26,"OfYO"),(25,25,"OQQXXO"),(26,24,"OQXXXXQO"),(27,24,"OQXXXXQO"),(28,24,"OCQQQQCO"),(29,24,"OCCQQCCO"),(30,25,"OCCCCO"),(31,26,"OOOO")]),
}

# ---- body frames: stand, stand (breath, upper body 1 px down), sit, sit (breath)
HEM = {'m': 34, 'f': 36}          # first row below the hem
BOOTS_SIT = segs([(38,7,"OLBBBbO"),(38,18,"OLBBBbO"),(39,6,"OLBBBBbO"),(39,18,"OLBBBBbO"),(40,6,"OlbbbbbO"),(40,18,"OlbbbbbO"),(41,6,"OOOOOOOO"),(41,18,"OOOOOOOO")])
def body_frames(s):
    b = BODY[s]; hem = HEM[s]
    stand = b
    breath = over(crop_rows(b, hem, H), shift(crop_rows(b, 0, hem - 1), dy=1))
    sit = over(BOOTS_SIT, shift(crop_rows(b, 0, hem), dy=4))
    sitb = over(BOOTS_SIT, shift(crop_rows(b, 0, hem - 1), dy=5), shift(crop_rows(b, hem - 1, hem), dy=4))
    return [stand, breath, sit, sitb]
FRONT_DY = [0, 1, 4, 5]            # how far head, arm and props move with each body frame
