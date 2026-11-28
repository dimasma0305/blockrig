---
title: The Sawit Spirit
slug: sawit
fps: 60
size: 1080x1920
---

# The Sawit Spirit

- **Hook (first 2 s):** In this world, everybody plants sawit.
- **Plot:** Any forest left unplanted burns at night and is sawit by morning: everyone blames the "Sawit Spirit". Grandpa guards the last real forest; the night he falls asleep I catch three men with torches (one drops his badge), follow them into the palace and find the King's map of burned forests and his gold. He catches me, I escape with the map, the town's kids save the forest, and in the morning the whole town sees the proof: the map, the badge, and the guard confessing that the King paid them.
- **Twist:** the kind King who gives free seeds is the spirit.
- **Comment bait:** a torch in the forest again: who is it this time?
- **Length:** ~3 min, 38 shots, 4 locations (village, forest, palace, room).

<!--
How to write a shot (scripts/docs.mjs compiles this file into src/generated/story.json):

### <id> · <location>
> Narration, one or two sentences. End a line with "!" and the voice performs it with panic/energy.
  Leave the quote out for a silent reaction shot, and give it a "min".

- captions: 2-4 WORDS | PER CAPTION | *ONE* WORD IN STARS IS HIGHLIGHTED   (must cover the narration, in order)
- action: who does what (one clear action, from clips in src/cast/clips.ts)
- camera: where it is, how tight, at most one move
  (match the meaning: "Rank... last." is sad, not panic; without it, "!" lines are panic)
- faces: hero=shock, sister=angry   (BlockRig expressions: neutral happy grin laugh smug wink determined angry furious roar shocked scared sad hurt sleepy embarrassed dazed)
- weather: clear | overcast | fog | drizzle | rain | storm | snow | blizzard   (add "lightning 0.3" for a strike at 0.3 s)
- time: day | golden | dusk | night | storm
- mood: a word for the music and colour (calm, tense, panic, relief, funny)
- min: 1.2   (hold at least this long, seconds)
-->

## Shots

### s01 · village
> In this world, everybody plants sawit.

- captions: IN THIS *WORLD*, | EVERYBODY PLANTS *SAWIT*.
- action: villagers plant sawit seedlings in long rows; hero waves from the path
- emotion: flat
- camera: high wide crane down over endless sawit rows to the village
- faces: hero=happy
- weather: clear
- time: day
- mood: calm
- light: day

### s02 · village
> Sawit on the hills. Sawit by the school. Sawit where the playground used to be.

- captions: SAWIT ON THE *HILLS*. | SAWIT BY THE *SCHOOL*. | SAWIT WHERE THE *PLAYGROUND* | USED TO BE.
- action: kids stand sadly around a single swing under sawit palms
- emotion: flat
- camera: slow pan across the hills to the school, ending on the swing
- faces: hero=sad
- weather: clear
- time: day
- mood: funny
- light: day

### s03 · forest
> And if a forest is left unplanted... it burns that night.

- captions: AND IF A *FOREST* | IS LEFT *UNPLANTED*... | IT *BURNS* | THAT NIGHT.
- action: a green forest at night; flames rise through the trees
- emotion: serious
- camera: wide low over the treetops, slow push in on the fire
- weather: clear
- time: night
- mood: tense
- light: night

### s04 · forest
> By morning, it's sawit. Rows and rows of it. Like magic.

- captions: BY *MORNING*, | IT'S *SAWIT*. | ROWS AND ROWS | OF IT. | LIKE *MAGIC*.
- action: same place at dawn: smoking ground, neat sawit rows; villagers stare
- emotion: whisper
- camera: same framing as s03, slow pull back
- weather: clear
- time: golden
- mood: eerie
- light: golden

### s05 · village
> Everybody says it's the Sawit Spirit. Even the King says so.

- captions: EVERYBODY SAYS | IT'S THE *SAWIT SPIRIT*. | EVEN THE *KING* | SAYS SO.
- action: villagers bow to a big golden statue of the King in the square
- emotion: neutral
- camera: low angle up at the statue
- weather: clear
- time: day
- mood: calm
- light: day

### s06 · palace
> And the King is the nicest man in the kingdom.

- captions: AND THE KING | IS THE *NICEST* MAN | IN THE KINGDOM.
- action: the King waves from the palace balcony; crowd cheers below
- emotion: happy
- camera: wide from the crowd up to the balcony, slow push in
- faces: king=happy
- weather: clear
- time: day
- mood: happy
- light: day

### s07 · village
> He gives every family free seeds!

- captions: HE GIVES | EVERY FAMILY | *FREE SEEDS*!
- action: the King hands a sack of seeds to a cheering family
- emotion: excited
- camera: front three-quarter, the King and the family
- faces: king=grin
- weather: clear
- time: day
- mood: happy
- light: day

### s08 · forest
> My grandpa owns the last real forest. The only place birds still sing.

- captions: MY *GRANDPA* | OWNS THE LAST | *REAL* FOREST. | THE ONLY PLACE | *BIRDS* STILL SING.
- action: hero and grandpa walk under tall green trees; birds fly over
- emotion: sad
- camera: tracking beside them under the canopy
- faces: hero=happy, grandpa=happy
- weather: clear
- time: golden
- mood: warm
- light: golden

### s09 · forest
> Every night he sits at the edge, so the spirit won't come.

- captions: EVERY *NIGHT* | HE SITS | AT THE EDGE, | SO THE *SPIRIT* | WON'T COME.
- action: grandpa sits on a stump with a lantern at the forest edge
- emotion: serious
- camera: behind grandpa, the dark sawit fields ahead
- faces: grandpa=determined
- weather: clear
- time: dusk
- mood: tense
- light: golden

### s10 · forest
> Last night... Grandpa fell asleep.

- captions: LAST *NIGHT*... | GRANDPA FELL *ASLEEP*.
- action: grandpa's head drops, the lantern flickers
- emotion: scared
- camera: close on grandpa from the side
- faces: grandpa=sleepy
- weather: clear
- time: night
- mood: tense
- light: night

### s11 · village

- action: hero looks out from the house; an orange glow rises behind the trees
- camera: over the hero's shoulder towards the glow
- faces: hero=shocked
- weather: clear
- time: night
- mood: tense
- light: night
- min: 1.4

### s12 · village
> I ran to the forest!

- captions: I *RAN* | TO THE FOREST!
- action: hero runs out of the house and down the path
- emotion: panic
- camera: low chase behind the hero
- faces: hero=scared
- weather: clear
- time: night
- mood: panic
- light: night

### s13 · forest
> But the spirit wasn't a spirit.

- captions: BUT THE SPIRIT | *WASN'T* A SPIRIT.
- action: hero hides behind a tree, peeking
- emotion: shocked
- camera: close on the hero behind the trunk
- faces: hero=shocked
- weather: clear
- time: night
- mood: tense
- light: night

### s14 · forest
> It was three men. With torches.

- captions: IT WAS | *THREE MEN*. | WITH *TORCHES*.
- action: three hooded guards walk in with torches
- emotion: whisper
- camera: low wide, the guards walking towards camera
- faces: guard=smug
- weather: clear
- time: night
- mood: tense
- light: night

### s15 · forest

- action: a guard touches a torch to a tree; flames climb; his golden badge falls into the grass; the hero's face lit orange
- camera: close on the torch, then the hero's face
- faces: hero=scared
- weather: clear
- time: night
- mood: tense
- light: night
- min: 1.5

### s16 · palace
> So I followed them. All the way to... the palace.

- captions: SO I *FOLLOWED* THEM. | ALL THE WAY TO... | THE *PALACE*.
- action: the guards walk up the palace road; the hero sneaks behind
- emotion: scared
- camera: wide high behind the hero, the palace lit up ahead
- faces: hero=scared
- weather: clear
- time: night
- mood: tense
- light: night

### s17 · room
> Through the kitchen, up the stairs, behind a painting of the King.

- captions: THROUGH THE *KITCHEN*, | UP THE *STAIRS*, | BEHIND A *PAINTING* | OF THE KING.
- action: the hero swings open a big painting of the King like a door
- emotion: whisper
- camera: front of the painting, slow push in
- faces: hero=determined
- weather: clear
- time: night
- mood: sneaky
- light: indoor

### s18 · room
> A giant map. Every forest in the kingdom, crossed out in red.

- captions: A GIANT *MAP*. | EVERY FOREST | IN THE KINGDOM, | CROSSED OUT IN *RED*.
- action: a huge map on the wall, every forest crossed out with red X marks
- emotion: shocked
- camera: slow pan across the map
- faces: hero=shocked
- weather: clear
- time: night
- mood: tense
- light: indoor

### s19 · room
> Only one was left. Grandpa's.

- captions: ONLY *ONE* | WAS LEFT. | *GRANDPA'S*.
- action: close on the one green forest with a red circle around it
- emotion: serious
- camera: close push in on the map
- faces: hero=sad
- weather: clear
- time: night
- mood: tense
- light: indoor

### s20 · room
> Next to it, a mountain of gold.

- captions: NEXT TO IT, | A *MOUNTAIN* | OF *GOLD*.
- action: the hero turns: a huge pile of gold coins and oil barrels
- emotion: shocked
- camera: low wide, the hero small against the gold
- faces: hero=shocked
- weather: clear
- time: night
- mood: tense
- light: indoor

### s21 · room
> Every bottle of sawit oil we sell goes to one company. The King's company.

- captions: EVERY BOTTLE | OF *SAWIT OIL* | WE SELL | GOES TO ONE *COMPANY*. | THE *KING'S* COMPANY.
- action: oil barrels stamped with the King's crown logo
- emotion: angry
- camera: tracking along the barrels to the crown logo
- faces: hero=angry
- weather: clear
- time: night
- mood: angry
- light: indoor

### s22 · room
> Free seeds. Free fire. He buys our sawit for one coin... and sells it for a hundred.

- captions: *FREE* SEEDS. | *FREE* FIRE. | HE BUYS OUR SAWIT | FOR *ONE* COIN... | AND SELLS IT | FOR A *HUNDRED*.
- action: a ledger board: 1 coin in, 100 coins out
- emotion: angry
- camera: close on the board, then the hero
- faces: hero=furious
- weather: clear
- time: night
- mood: angry
- light: indoor

### s23 · room
> Then the door opened.

- captions: THEN THE *DOOR* | OPENED.
- action: the door swings open, light floods in
- emotion: scared
- camera: from behind the hero towards the door
- faces: hero=scared
- weather: clear
- time: night
- mood: tense
- light: indoor

### s24 · room

- action: the King stands in the doorway, smiling
- camera: low close on the King
- faces: king=smug
- weather: clear
- time: night
- mood: tense
- light: indoor
- min: 1.4

### s25 · room
> He just smiled and said: nobody will believe a kid.

- captions: HE JUST *SMILED* | AND SAID: | NOBODY WILL | *BELIEVE* A KID.
- action: the King steps in, guards behind him
- emotion: smug
- camera: over the King's shoulder onto the hero
- faces: king=smug, hero=scared
- weather: clear
- time: night
- mood: tense
- light: indoor

### s26 · palace
> So I grabbed his map, jumped out the window and ran!

- captions: SO I *GRABBED* | HIS MAP, | JUMPED OUT | THE WINDOW | AND *RAN*!
- action: the hero leaps from the palace with the rolled-up map and runs
- emotion: panic
- camera: wide side, the hero mid-air
- faces: hero=scared
- weather: clear
- time: night
- mood: panic
- light: night

### s27 · village
> I woke up every kid I knew.

- captions: I WOKE UP | EVERY *KID* | I KNEW.
- action: kids come out of houses with lanterns, gathering round the hero
- emotion: serious
- camera: high wide over the village street
- faces: hero=determined
- weather: clear
- time: night
- mood: determined
- light: night

### s28 · forest
> Buckets from the bakery. Hoses from the school. All night long.

- captions: BUCKETS FROM | THE *BAKERY*. | HOSES FROM | THE *SCHOOL*. | ALL *NIGHT* LONG.
- action: kids pass buckets in a line and spray water on the flames
- emotion: excited
- camera: tracking along the bucket line
- faces: hero=determined
- weather: clear
- time: night
- mood: action
- light: night

### s29 · forest
> And the fire... went out.

- captions: AND THE *FIRE*... | WENT *OUT*.
- action: the last flames die; smoke; kids collapse, happy
- emotion: happy
- camera: wide, slow crane up
- faces: hero=happy
- weather: clear
- time: golden
- mood: relief
- light: golden

### s30 · forest
> In the morning, the King brought the whole town to watch the last forest turn into sawit.

- captions: IN THE *MORNING*, | THE KING BROUGHT | THE WHOLE *TOWN* | TO WATCH | THE LAST FOREST | TURN INTO *SAWIT*.
- action: the King and two of his guards lead a crowd up the hill to the forest edge
- emotion: neutral
- camera: wide behind the crowd walking up
- faces: king=grin
- weather: clear
- time: day
- mood: calm
- light: day

### s31 · forest
> But it didn't.

- captions: BUT IT *DIDN'T*.
- action: the forest stands green; the crowd stops
- emotion: smug
- camera: reverse: the green forest towering over the crowd
- weather: clear
- time: day
- mood: funny
- light: day

### s32 · forest

- action: the King's grin drops; the whole crowd turns to look at him
- camera: close on the King
- faces: king=shocked
- weather: clear
- time: day
- mood: tense
- light: day
- min: 1.4

### s33 · forest
> So I held up the King's secret map. Every forest crossed out, in his red ink.

- captions: SO I *HELD UP* | THE KING'S | SECRET *MAP*. | EVERY FOREST | CROSSED OUT, | IN HIS *RED* INK.
- action: the hero holds the map up to the crowd; they lean in and gasp
- emotion: serious
- camera: over the crowd's shoulders onto the map, then close on it
- faces: hero=determined, grandpa=determined
- weather: clear
- time: day
- mood: tense
- light: day

### s33b · forest
> And the golden badge a guard dropped by the burning tree.

- captions: AND THE *GOLDEN BADGE* | A GUARD DROPPED | BY THE *BURNING* TREE.
- action: the hero raises the badge; everyone looks at the guard beside the King, whose chest has a bare spot where it was
- emotion: serious
- camera: low on the badge, the guard behind it
- faces: hero=determined, guard=scared
- weather: clear
- time: day
- mood: tense
- light: day

### s33c · forest
> The guard looked at the King and said: he paid us to do it!

- captions: THE GUARD | LOOKED AT THE KING | AND SAID: | HE *PAID US* | TO DO IT!
- action: the guard points at the King; the whole crowd turns to him
- emotion: shocked
- camera: behind the guard, the King and the crowd in front
- faces: guard=scared, king=shocked
- weather: clear
- time: day
- mood: tense
- light: day

### s34 · forest
> The King said: it was the spirit!

- captions: THE KING SAID: | IT WAS | THE *SPIRIT*!
- action: the King points at the sky, sweating
- emotion: excited
- camera: front, the King tight
- faces: king=embarrassed
- weather: clear
- time: day
- mood: funny
- light: day

### s35 · forest
> Nobody clapped this time.

- captions: *NOBODY* CLAPPED | THIS TIME.
- action: the crowd stands silent, arms crossed
- emotion: flat
- camera: wide over the silent crowd
- weather: clear
- time: day
- mood: funny
- light: day

### s36 · village
> Now we plant trees again. Real ones.

- captions: NOW WE PLANT | *TREES* AGAIN. | *REAL* ONES.
- action: villagers plant young trees; birds return
- emotion: happy
- camera: wide golden crane over the planting
- faces: hero=happy, grandpa=happy
- weather: clear
- time: golden
- mood: happy
- light: golden

### s37 · village
> And the King? He plants sawit. All by himself.

- captions: AND THE *KING*? | HE PLANTS SAWIT. | ALL BY *HIMSELF*.
- action: the King, crown askew, digs alone in a huge empty field
- emotion: smug
- camera: high wide, the King tiny in the field
- faces: king=sad
- weather: clear
- time: golden
- mood: funny
- light: golden

### s38 · forest
> But last night... I saw a torch in the forest again.

- captions: BUT LAST *NIGHT*... | I SAW A *TORCH* | IN THE FOREST | *AGAIN*.
- action: a single torch moves between dark trees
- emotion: whisper
- camera: slow push in towards the torch
- weather: fog
- time: night
- mood: eerie
- light: night
