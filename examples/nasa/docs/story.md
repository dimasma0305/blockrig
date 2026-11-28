---
title: Hack NASA Before Ten
slug: nasa
fps: 30
size: 1080x1920
---

# Hack NASA Before Ten

- **Hook (first 2 s):** In this world, everyone has to hack NASA before they turn ten. If you fail... the government removes you.
- **Plot:** A kid raised as a hacker from the crib (a hacker name as a baby, CTFs at two, OSCP at three) has nine years to hack NASA while every "Can I go play?" gets "After NASA"; with three seconds left Dad tells him to press Enter, he passes, and Dad's "OPEN AFTER NASA" box holds one bottle of sunscreen for the next objective: hack the Sun before eleven.
- **Twist:** the big box after NASA is a tiny sunscreen, because the next rule is "hack the SUN before ELEVEN" ("After the Sun").
- **Comment bait:** what's your hacker name?
- **Length:** ~2 min, 52 shots (one line each), 6 locations (street, my room, nursery, preschool, conference hall, friend's room).
- **Dialogue:** every line, narration and dialogue, is spoken by the one narrator voice with the emotion noted; a dialogue line's caption carries a speaker tag (`speaker:`: ME, MOM, DAD, BEST FRIEND, SYSTEM). `say:` is how the narrator pronounces a name (same word count as the line); captions show the real spelling.
- **Explainers** (`note:`): a short label under the age card that says what the jargon means, so every joke reads without hacker knowledge.
- **On-screen text** (`title:` age card, `timer:` countdown above my head, `screen:` what the laptop or board shows): real brand and event names are plain text only, never logos.

<!--
How to write a shot (scripts/docs.mjs compiles this file into src/generated/story.json):

### <id> · <location>
> Narration, one or two sentences. Leave the quote out for a silent reaction shot, and give it a "min".

- captions: 2-4 WORDS | PER CAPTION | *ONE* WORD IN STARS IS HIGHLIGHTED   (must cover the narration, in order)
- speaker: me | mom | dad | friend | system   (dialogue: a tag on the caption; leave out for the narrator)
- say: the line as the narrator pronounces it (same number of words), when a name needs help
- action, camera, emotion, faces, time, mood, light, min: see the template
- title / timer / screen: on-screen text (see above)
-->

## Shots

### s01 · town
> In this world, everyone has to hack NASA before they turn ten.

- captions: IN THIS *WORLD*, | EVERYONE HAS TO | HACK *NASA* | BEFORE THEY TURN *TEN*.
- action: a sunny street where everyone hacks: grown-ups and kids on the sidewalks, all typing on glowing laptops; a billboard HACK NASA BEFORE 10 / OR GET DELETED, a big public screen NASA: LOCKED
- camera: high crane down the street to the billboard
- emotion: flat
- time: day
- mood: tense
- light: day

### s02 · room
> If you fail... the government removes you.

- captions: IF YOU *FAIL*... | THE *GOVERNMENT* | REMOVES YOU.
- note: by order of the government
- action: same frozen frame, tighter
- camera: extreme close on my face and the timer
- emotion: flat
- faces: hero=scared
- timer: 00:03 UNTIL REMOVAL
- screen: NASA: LOCKED
- time: day
- mood: tense
- light: studio

### s04 · nursery
> Here, every baby gets a hacker name before a real one.

- captions: HERE, EVERY *BABY* | GETS A *HACKER* NAME | BEFORE A *REAL* ONE.
- action: rewind cut; baby me types on a tiny laptop on the nursery rug; my hacker name 0xDEAF floats over my head and is painted on the wall sign; the laptop says LOGGED IN AS 0xDEAF
- camera: wide low across the rug, slow push in
- emotion: neutral
- faces: hero=determined
- title: AGE 0
- screen: WHOAMI
- time: day
- mood: funny
- light: indoor

### s05 · nursery
> Our bedtime playlist was LiveOverflow and John Hammond.

- captions: OUR *BEDTIME* PLAYLIST | WAS *LIVEOVERFLOW* | AND JOHN *HAMMOND*.
- say: Our bedtime playlist was Live-Overflow and John Hammond.
- action: a tablet on the crib shows the playlist; baby me watches, sleepy
- camera: over the baby's shoulder onto the tablet
- emotion: flat
- faces: hero=sleepy
- screen: BEDTIME PLAYLIST: LiveOverflow → John Hammond
- time: day
- mood: funny
- light: indoor

### s06 · nursery

- action: the laptop flashes ROOT ACCESS; I cheer, try to stand, fall on my bottom; confidence turns into a confused stare
- camera: front, low, the baby and the laptop
- faces: hero=laugh
- screen: ROOT ACCESS
- time: day
- mood: funny
- light: indoor
- min: 2.2

### s09 · preschool
> By two, we're already competing in CTFs.

- captions: BY *TWO*, | WE'RE ALREADY COMPETING | IN *CTFs*.
- say: By two, we're already competing in C-T-Fs.
- note: CTF = a hacking competition
- action: toddlers at miniature gaming setups, milk bottles beside the keyboards
- camera: high wide over the rows, crane down
- emotion: neutral
- faces: hero=determined, friend=determined
- title: AGE 2
- time: day
- mood: funny
- light: indoor

### s10 · preschool
> Project SEKAI? PPP? This is PRESCHOOL!

- captions: PROJECT *SEKAI*? | *PPP*? | THIS IS *PRESCHOOL*!
- speaker: me
- say: Project Sekai? P-P-P? This is preschool!
- note: the best hacking teams in the world
- action: the PRESCHOOL CTF LEAGUE lobby board (Project SEKAI, PPP, DiceGang, TokyoWesterns, MILK DEPENDENCY); I look from the board to the milk bottle in my hand
- camera: past me onto the lobby board, then close on my face
- emotion: shocked
- faces: hero=shocked
- screen: PRESCHOOL CTF LEAGUE
- time: day
- mood: funny
- light: indoor

### s11 · preschool
> My best friend called himself our crypto specialist.

- captions: MY BEST *FRIEND* | CALLED HIMSELF | OUR CRYPTO *SPECIALIST*.
- action: my best friend straightens a tiny kurenaif FAN CLUB flag; kurenaif wallpaper, notebook and pencil case
- camera: slow push in on him and his desk
- emotion: neutral
- faces: friend=smug
- time: day
- mood: funny
- light: indoor

### s12 · preschool
> I watch kurenaif for the cryptography.

- captions: I WATCH *KURENAIF* | FOR THE *CRYPTOGRAPHY*.
- speaker: friend
- say: I watch kurenaifu for the cryptography.
- action: he says it suspiciously formally, flag held up
- camera: close on him, front
- emotion: serious
- faces: friend=determined
- time: day
- mood: funny
- light: indoor

### s13 · preschool
> What did you learn?

- captions: WHAT DID | YOU *LEARN*?
- speaker: me
- action: I tilt my head
- camera: over his shoulder onto me
- emotion: neutral
- faces: hero=neutral
- time: day
- mood: funny
- light: indoor

### s14 · preschool
> The streaming schedule.

- captions: THE *STREAMING* | SCHEDULE.
- speaker: friend
- say: The streaming... schedule.
- action: instant and proud; I stare; he slowly lowers the flag
- camera: two-shot, side by side at the desks
- emotion: neutral
- faces: friend=grin, hero=neutral
- time: day
- mood: funny
- light: indoor
- min: 2

### s15 · preschool
> One more flag and we win!

- captions: ONE MORE *FLAG* | AND WE *WIN*!
- speaker: me
- action: scoreboard: FINAL CHALLENGE, ONE FLAG LEFT; I lean into the keyboard
- camera: low behind the monitor, up at my face
- emotion: excited
- faces: hero=determined
- screen: FINAL CHALLENGE: ONE FLAG LEFT
- time: day
- mood: action
- light: indoor

### s16 · preschool
> Nap time.

- captions: *NAP* TIME.
- speaker: mom
- action: Mom enters with a blanket
- camera: wide from the desks to the door
- emotion: flat
- faces: mom=happy, hero=shocked
- time: day
- mood: funny
- light: indoor
- min: 1.2

### s17 · preschool
> Guys! My manager is taking me offline!

- captions: GUYS! | MY *MANAGER* | IS TAKING ME | *OFFLINE*!
- speaker: me
- action: Mom carries me away; my legs kick toward the keyboard; I shout into the headset
- camera: follow Mom carrying me toward the door
- emotion: panic
- faces: hero=furious, mom=neutral
- time: day
- mood: panic
- light: indoor

### s18 · preschool

- action: my teammates hear a lullaby; MIC DISCONNECTED; they stare at the empty chair
- camera: close on the teammates' faces
- faces: friend=sad, tm1=dazed
- screen: MIC DISCONNECTED
- time: day
- mood: funny
- light: indoor
- min: 1.5

### s19 · room
> Mom! I passed OSCP!

- captions: MOM! | I PASSED *OSCP*!
- speaker: me
- say: Mom! I passed O-S-C-P!
- note: OSCP = a famous hacking exam (for adults)
- action: I hold up a certificate OSCP: PASSED; juice box, yogurt cup and an OSWE workbook on the desk
- camera: front, my certificate up close
- emotion: happy
- faces: hero=laugh
- title: AGE 3
- screen: OSCP: PASSED
- time: day
- mood: happy
- light: indoor

### s20 · room
> Good. Now OSWE.

- captions: GOOD. | NOW *OSWE*.
- speaker: mom
- say: Good. Now O-S-W-E.
- action: Mom slides the workbook over
- camera: two-shot over the desk
- emotion: flat
- faces: mom=neutral, hero=neutral
- time: day
- mood: funny
- light: indoor

### s21 · room

- action: I try to peel open the yogurt and fail
- camera: close on my hands and face
- faces: hero=angry
- time: day
- mood: funny
- light: indoor
- min: 1.5

### s22 · room
> Certified professional. Still couldn't open a yogurt.

- captions: CERTIFIED *PROFESSIONAL*. | STILL COULDN'T OPEN | A *YOGURT*.
- action: Dad silently reaches in and opens it
- camera: side two-shot, Dad's hand comes in
- emotion: flat
- faces: hero=embarrassed, dad=neutral
- time: day
- mood: funny
- light: indoor

### s23 · hall
> At four, our school trips were CODEGATE in Korea, SECCON in Japan, and DEF CON CTF.

- captions: AT *FOUR*, | OUR SCHOOL TRIPS WERE | *CODEGATE* IN KOREA, | *SECCON* IN JAPAN, | AND *DEF* CON CTF.
- say: At four, our school trips were Codegate in Korea, Seccon in Japan, and Def Con C-T-F.
- note: the biggest hacking contests in the world
- action: montage in a conference hall: three banners in plain text, badges, tiny rolling suitcases, oversized trophies
- camera: track along the three banners, one beat each
- emotion: excited
- faces: hero=happy, friend=happy
- title: AGE 4
- time: day
- mood: happy
- light: studio

### s34 · room
> Explain this.

- captions: *EXPLAIN* THIS.
- speaker: mom
- note: NASA: F
- action: Mom reads my progress report and points at the NASA grade; I hold my red ball; CTF badges, books OSEP and OSED, a TRY HARDER sticky note behind
- camera: close on the report: OSCP PASSED, OSWE PASSED, NASA F
- emotion: serious
- faces: mom=angry, hero=scared
- title: AGE 9
- screen: PROGRESS REPORT
- time: day
- mood: tense
- light: indoor
- min: 1.2

### s35 · room
> I'm only nine!

- captions: I'M ONLY *NINE*!
- speaker: me
- action: defensive, ball in hand
- camera: close on me
- emotion: shocked
- faces: hero=shocked
- time: day
- mood: tense
- light: indoor

### s36 · room
> Exactly. You've had nine years to prepare.

- captions: *EXACTLY*. | YOU'VE HAD NINE YEARS | TO *PREPARE*.
- speaker: mom
- action: quiet certainty
- camera: low on Mom
- emotion: serious
- faces: mom=determined
- time: day
- mood: tense
- light: indoor

### s37 · room

- action: Dad carries in a big sealed package labelled OPEN AFTER NASA; through the window, children play outside
- camera: wide of the room, the window bright
- faces: dad=neutral, hero=sad
- time: day
- mood: calm
- light: indoor
- min: 1.7

### s38 · room
> Can I go play?

- captions: CAN I GO *PLAY*?
- speaker: me
- action: soft and hopeful; turning the ball, angled toward the door
- camera: close, the window behind me
- emotion: sad
- faces: hero=sad
- time: day
- mood: calm
- light: indoor

### s39 · room
> After NASA.

- captions: AFTER *NASA*.
- speaker: mom
- action: still reading, casual and automatic
- camera: on Mom, not looking up
- emotion: flat
- faces: mom=neutral
- time: day
- mood: calm
- light: indoor
- min: 1

### s40 · room

- action: I set the ball beside my chair and sit at the computer
- camera: side, the ball in the foreground
- faces: hero=sad
- time: day
- mood: sad
- light: indoor
- min: 1.4

### s41 · room
> So I practiced. Every day.

- captions: SO I *PRACTICED*. | EVERY *DAY*.
- action: I type; behind me the window goes from day to night
- camera: slow orbit round my desk
- emotion: serious
- faces: hero=determined
- time: day -> night
- mood: sad
- light: indoor

### s42 · room

- action: montage: calendar pages fly, empty juice boxes pile up, day to night; tabs CTFtime, picoCTF, Hack The Box; the ball stays by the chair
- camera: locked-off wide, time-lapse
- faces: hero=determined
- screen: PRACTICE TABS
- time: night -> day
- mood: sad
- light: indoor
- min: 2.4

### s43 · friend
> You've got this, bro. Please don't get removed.

- captions: YOU'VE GOT THIS, *BRO*. | PLEASE DON'T | GET *REMOVED*.
- speaker: friend
- action: my best friend on a video call in his kurenaif room, flag in hand; my screen shows his avatar with the flag
- camera: close on him holding the phone
- emotion: happy
- faces: friend=happy
- time: day
- mood: calm
- light: indoor

### s44 · room
> Thanks.

- captions: *THANKS*.
- speaker: me
- action: soft relief, phone in hand
- camera: close on me
- emotion: neutral
- faces: hero=happy
- time: day
- mood: calm
- light: indoor
- min: 1

### s45 · friend
> I need someone to watch kurenaif with.

- captions: I NEED SOMEONE | TO WATCH *KURENAIF* WITH.
- speaker: friend
- say: I need someone to watch kurenaifu with.
- action: equally sincere
- camera: same close
- emotion: happy
- faces: friend=grin
- time: day
- mood: calm
- light: indoor

### s46 · room
> There it is.

- captions: THERE IT *IS*.
- speaker: me
- action: amused resignation; the call ends
- camera: close on me, phone down
- emotion: smug
- faces: hero=smug
- time: day
- mood: calm
- light: indoor
- min: 1

### s47 · room
> Your cousin finished when he was six.

- captions: YOUR *COUSIN* | FINISHED WHEN | HE WAS *SIX*.
- speaker: mom
- action: Mom over my shoulder; the package nearby
- camera: two-shot from the front, Mom behind me
- emotion: smug
- faces: mom=smug, hero=scared
- timer: 10TH BIRTHDAY IN 00:59
- time: day
- mood: tense
- light: studio

### s48 · room
> Then ask him to help!

- captions: THEN ASK HIM | TO *HELP*!
- speaker: me
- action: urgent, turning round
- camera: close on me
- emotion: panic
- faces: hero=furious
- timer: 10TH BIRTHDAY IN 00:52
- time: day
- mood: tense
- light: studio

### s49 · room
> He charges now.

- captions: HE *CHARGES* NOW.
- speaker: mom
- action: a tiny shrug
- camera: on Mom
- emotion: flat
- faces: mom=neutral
- timer: 10TH BIRTHDAY IN 00:48
- time: day
- mood: tense
- light: studio
- min: 1

### s52 · room

- action: I stare into the camera, then type like mad: dramatic light, spinning camera, rising music; countdown to 00:10; the screen reads READY TO SUBMIT
- camera: fast orbit around me at the desk, pushing in
- faces: hero=determined
- timer: 10TH BIRTHDAY IN 00:10
- screen: READY TO SUBMIT
- time: day
- mood: action
- light: studio
- min: 2.5

### s53 · room
> Why is nothing happening?!

- captions: WHY IS *NOTHING* | HAPPENING?!
- speaker: me
- action: breathless panic, hands on my head
- camera: close, shaking
- emotion: panic
- faces: hero=scared
- timer: 10TH BIRTHDAY IN 00:05
- screen: READY TO SUBMIT
- time: day
- mood: panic
- light: studio

### s54 · room

- action: back to the opening shot at 00:03; Dad walks past eating a sandwich; the music stops
- camera: the opening framing, Dad crossing behind
- faces: hero=scared, dad=neutral
- timer: 00:03 UNTIL REMOVAL
- screen: READY TO SUBMIT
- time: day
- mood: silence
- light: studio
- min: 1.2

### s55 · room
> Press Enter.

- captions: PRESS *ENTER*.
- speaker: dad
- action: low and ordinary, mid-bite
- camera: on Dad, sandwich in hand
- emotion: flat
- faces: dad=neutral
- timer: 00:03 UNTIL REMOVAL
- time: day
- mood: silence
- light: studio
- min: 1

### s56 · room
> Oh.

- captions: ...*OH*.
- speaker: me
- action: a small exhale
- camera: extreme close on me
- emotion: whisper
- faces: hero=embarrassed
- timer: 00:02 UNTIL REMOVAL
- time: day
- mood: silence
- light: studio
- min: 1

### s57 · room

- action: I press Enter: 00:01, ACCESS GRANTED, the countdown disappears, a green check
- camera: close on my finger and the screen
- faces: hero=shocked
- timer: 00:01
- screen: ACCESS GRANTED
- time: day
- mood: triumph
- light: studio
- min: 1.4

### s58 · room
> I knew that.

- captions: I *KNEW* THAT.
- speaker: me
- action: I straighten my shirt, avoiding Dad's eyes
- camera: two-shot, Dad watching me
- emotion: smug
- faces: hero=smug, dad=neutral
- screen: ACCESS GRANTED
- time: day
- mood: triumph
- light: indoor
- min: 1

### s59 · room
> Happy birthday, buddy.

- captions: HAPPY *BIRTHDAY*, | BUDDY.
- speaker: dad
- action: AGE 10; confetti; Dad puts a birthday hat on me
- camera: front two-shot, confetti falling
- emotion: happy
- faces: dad=happy, hero=happy
- title: AGE 10
- time: day
- mood: happy
- light: indoor

### s60 · room
> I passed! Can I open it now?

- captions: I *PASSED*! | CAN I *OPEN* | IT NOW?
- speaker: me
- action: I relax for a moment, then notice the package and point at it
- camera: past me to the package
- emotion: excited
- faces: hero=grin
- time: day
- mood: happy
- light: indoor

### s61 · room
> New objective: hack the SUN before ELEVEN.

- captions: NEW *OBJECTIVE*: | HACK THE *SUN* | BEFORE *ELEVEN*.
- speaker: system
- note: the next rule
- action: a cheerful notification; a new countdown appears above my head
- camera: push in on the screen, then my face
- emotion: excited
- faces: hero=shocked
- timer: 11TH BIRTHDAY IN 365 DAYS
- screen: NEW OBJECTIVE: HACK THE SUN
- time: day
- mood: funny
- light: indoor

### s62 · room

- action: I look at the sun through the window; my smile stops; head tilt
- camera: from outside the window onto me, the sun behind the camera
- faces: hero=dazed
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: funny
- light: indoor
- min: 1.4

### s63 · room

- action: Dad opens the enormous package: inside, one tiny bottle of sunscreen; he puts it in my hand
- camera: top-down into the open box
- faces: dad=happy, hero=dazed
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: funny
- light: indoor
- min: 1.7

### s64 · room
> Start earlier this time.

- captions: START *EARLIER* | THIS TIME.
- speaker: dad
- action: casual; the sunscreen in my hand
- camera: two-shot, the bottle between us
- emotion: neutral
- faces: dad=happy, hero=dazed
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: funny
- light: indoor

### s68 · room
> Can I go play now?

- captions: CAN I GO | *PLAY* NOW?
- speaker: me
- action: birthday hat on; I notice the red ball
- camera: close, the ball in the foreground
- emotion: sad
- faces: hero=sad
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: calm
- light: indoor

### s69 · room
> After the Sun.

- captions: AFTER THE *SUN*.
- speaker: mom
- say: After... the Sun.
- action: same casual rhythm; already reading the next mission
- camera: on Mom, not looking up
- emotion: flat
- faces: mom=neutral
- time: day
- mood: calm
- light: indoor
- min: 1.2

### s70 · room

- action: I set the sunscreen by the keyboard and sit down: hat, countdown above me, the red ball untouched; cut to black
- camera: slow pull back to a wide of the desk
- faces: hero=sad
- timer: 11TH BIRTHDAY IN 364 DAYS
- screen: NEW OBJECTIVE: HACK THE SUN
- time: day
- mood: calm
- light: indoor
- min: 2.7
