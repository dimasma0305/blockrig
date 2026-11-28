# Visuals: the look bible

What "Hack NASA Before Ten" looks like. The code follows this file; when the look changes, change it here first.

## Format

- 1080×1920, 60 fps, H.264 CRF 18. Captions at 62% of the height; dialogue captions carry a speaker tag
  (ME, MOM, DAD, BEST FRIEND, SYSTEM) in that character's colour (src/direction/Layers2D.tsx).
- Keep faces and key action out of the app zones: right 14% (buttons), bottom 16% (caption, username), top 7%.
- On-screen text: `title:` (AGE 0, 2, 3, 4, 5, 9, 10) pops in at the top; `timer:` floats above my head as a red
  countdown (`a -> b` counts down across a shot); `screen:` picks what the desk monitor, laptops, lobby board say.
  Real brand and event names (NASA, OSCP, OSWE, OSEP, OSED, CODEGATE, SECCON, DEF CON CTF, Project SEKAI, PPP,
  DiceGang, TokyoWesterns, HackerOne, Bugcrowd, PortSwigger, Burp Suite, CTFtime, picoCTF, Hack The Box,
  LiveOverflow, John Hammond, kurenaif, TCP1P) appear only as plain text, never as logos.
- Effects: freeze tint and "❚❚ PAUSED" on the hook (s01-s03), a VHS rewind into the nursery, glitch cuts on s04,
  s54 and s61, white flashes on s06, s29, s57, s59, a green flash on ACCESS GRANTED, confetti on the birthday, a cut
  to black at the end. Post effects (AO, bloom, SMAA) and cascaded sun shadows from the kit.

## Cast

Roblox catalog items (local renders; Roblox allows them in videos; files git-ignored): anime face accessories per
emotion (the template's set: faceAnime, faceFang, faceRanker, facePotato, faceCrying, faceSparkle, faceSmile,
faceSharpEyes, faceAngerVein, faceChibi, faceHearts, faceLaugh, faceDizzy, faceSleepy, faceBlush).

| Id | Body | Hair | Shirt / pants | Extras |
|---|---|---|---|---|
| me (hero) | child, scaled by age (0.5 baby → 0.95 at ten) | heroHair | Denim Jacket with White Hoodie / Black Jeans with White Shoes | gaming headset (White Gaming Headset) at the preschool, party hat at ten (drawn) |
| me as a baby | same | heroHair | Teal Shirt / Jean Shorts with White Shoes (Roblox) | |
| me at five | same | heroHair | dinosaur pyjamas (drawn tee and shorts: Roblox's dinosaur pyjamas need a sign-in) | |
| Mom | slender adult | Popular Girl Blonde & Brown Hair (bunnexh) | Pastel Starburst Top with Gray Jacket / Beautiful You Jeans (Roblox) | |
| Dad | classic adult | Brown Charmer Hair (Roblox) | Blue Plaid Shirt / Dark Green Jeans (Roblox) | sandwich |
| best friend | child | Messy Boy Hair in Black (Rush_X) | Emo y2k black shirt / Black Jeans | kurenaif FAN CLUB flag, headset |
| teammates | child | Brown Scene Hair; Straight Hair with Headphones | Green Jersey; I <3 Pizza Shirt | headsets, milk bottles |
| kids outside | child | Cool Boy Hair; Split Bangs Hair | Grey Striped Shirt; purple crop-top | |

## Locations

| Id | What | Built from |
|---|---|---|
| room | my room at every age: gaming desk with two monitors (the main one is the story's screen), gaming chair, bed, bean bag, shelves; the window shows a yard with kids playing, a fence, trees and houses | Roblox Toolbox "Random Bedroom" (9659331819), one curtain left out; yard: Kenney suburban fence, trees, houses |
| nursery | baby room: rug, teddy bear, dragon plush, toy chest with a Hack The Box sticker, tablet with the bedtime playlist, tiny laptop | Roblox Toolbox "Modern Bedroom" (17681009469), Kenney furniture (rugRound, bear, cardboardBoxOpen, laptop, sideTable, lampRoundFloor) |
| preschool | the CTF room: two rows of toddler desks with laptops and milk bottles, the PRESCHOOL CTF LEAGUE board | Kenney furniture walls, desks, chairs, laptops, bookcase |
| hall | conference hall: CODEGATE / SECCON / DEF CON CTF banners, trophies on tables, rolling suitcases, spotlights | code walls + Kenney tables, drawn banners |
| friend | my best friend's room: kurenaif posters, the flag, bed, desk | Kenney furniture room |

Story props drawn in code (src/world/storyProps.ts; no downloaded asset carries them): the red ball, juice boxes,
yogurt, milk bottles, certificate, OSWE/OSEP/OSED books, trophies, suitcases, badges, phone, sandwich, the tiny
sunscreen, receipt, party hat, dragon plush, the OPEN AFTER NASA label (on a Kenney cardboard box). Screens and
boards with text: src/world/boards.ts.

## Materials and textures

Roblox maps keep their own colours with CC0 surface detail; Kenney models their colour maps; floors `planks`
(Poly Haven brown_planks_04), the hall floor `concrete` (brushed_concrete), grass (ambientCG Grass004), skies from
Poly Haven HDRIs.

## Light

Every indoor shot names a preset (`light: indoor`); the hook and the final minute use `studio` (a hard key and rim:
the "dramatic light"). Sun through the windows with cascaded shadows; room lights from the maps.
