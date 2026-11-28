---
title: Hack NASA Before Ten
slug: nasa
fps: 30
size: 1080x1920
---

# Hack NASA Before Ten

- **Hook (first 2 s):** In this world, every kid has to hack NASA before they turn ten. If you fail... the government removes you.
- **Plot:** Raised to hack NASA, I try every real trick for nine years (Mitnick's phone con, aircrack-ng, Log4Shell, Heartbleed) while my best friend hunts UFOs like Gary McKinnon; with three seconds left Dad, eating a sandwich, asks if I tried admin/admin. It works. The next objective is the Sun.
- **Twist:** nine years of training, beaten by the default password; then "hack the Sun before eleven" ("After the Sun").
- **Real references** (each explained on screen): Jonathan James (NASA, 1999), sudo and the xkcd sandwich, Kevin Mitnick's social engineering, aircrack-ng, Log4Shell, Heartbleed, Gary McKinnon's UFO hunt, SQL injection, phishing, zero-days, default passwords; CTFs with Project SEKAI and PPP; kurenaif.
- **Comment bait:** what's your hacker name?
- **Length:** ~1:45, 37 shots, every line with its own speaker voice; one silent beat (the last shot).
- **Dialogue:** a dialogue line (`speaker:` me, mom, dad, friend, helpdesk, system) is spoken in that character's voice (docs/audio.md "Voices") and its caption carries a speaker tag; narration is the narrator's one voice. `say:` is how a name is pronounced (same word count); captions show the real spelling.
- **Explainers** (`note:`): a white sticker that says what the real thing is, so every joke reads without hacker knowledge.
- **On-screen text** (`title:` age card, `timer:` countdown above my head, `screen:` what the screens show): real names as plain text, plus the real creator images in assets/brands.

<!--
How to write a shot (scripts/docs.mjs compiles this file into src/generated/story.json):

### <id> · <location>
> Narration, one or two sentences. Leave the quote out for a silent shot, and give it a "min".

- captions: 2-4 WORDS | PER CAPTION | *ONE* WORD IN STARS IS HIGHLIGHTED   (must cover the narration, in order)
- speaker / say / note / title / timer / screen: see above
- action, camera, emotion, faces, time, mood, light, min: see the template
-->

## Shots

### s01 · town
> In this world, every kid has to hack NASA before they turn ten.

- captions: IN THIS *WORLD*, | EVERY KID HAS TO | HACK *NASA* | BEFORE THEY TURN *TEN*.
- action: a sunny street where everyone hacks: grown-ups and kids on the sidewalks, all typing on glowing laptops; billboard HACK NASA BEFORE 10 / OR GET DELETED, a big public screen NASA: LOCKED
- camera: high crane down the street to the billboard
- emotion: flat
- time: day
- mood: tense
- light: day

### s02 · room
> If you fail... the government removes you.

- captions: IF YOU *FAIL*... | THE *GOVERNMENT* | REMOVES YOU.
- action: me frozen at my desk, terrified, three seconds left
- camera: close three-quarter, my laptop with NASA: LOCKED beside me
- emotion: flat
- faces: hero=scared
- timer: 00:03 UNTIL REMOVAL
- screen: NASA: LOCKED
- note: by order of the government
- time: day
- mood: tense
- light: studio

### s03 · room
> In real life, Jonathan James hacked NASA at fifteen.

- captions: IN REAL LIFE, | JONATHAN *JAMES* | HACKED *NASA* | AT *FIFTEEN*.
- action: my monitor shows a 1999 newspaper: 15-YEAR-OLD HACKS NASA, NASA SHUTS DOWN FOR 3 WEEKS
- camera: push in on the newspaper on the monitor
- emotion: neutral
- faces: hero=scared
- timer: 00:03 UNTIL REMOVAL
- screen: NEWSPAPER
- note: real: 1999, he took the space station's software
- time: day
- mood: tense
- light: studio

### s04 · room
> Here, that makes you a late bloomer.

- captions: HERE, THAT | MAKES YOU | A LATE *BLOOMER*.
- action: the newspaper gets a red stamp: LATE BLOOMER
- camera: same, a little tighter
- emotion: smug
- faces: hero=scared
- timer: 00:03 UNTIL REMOVAL
- screen: NEWSPAPER LATE
- time: day
- mood: funny
- light: studio

### s05 · nursery
> My first word wasn't Mom. It was sudo.

- captions: MY FIRST *WORD* | WASN'T MOM. | IT WAS *SUDO*.
- say: My first word wasn't Mom. It was soo-doo.
- action: rewind cut; baby me at a tiny laptop on the nursery rug, @0xDEAF over my head; the laptop shows $ sudo
- camera: wide low across the rug, slow push in
- emotion: flat
- faces: hero=determined
- title: AGE 0
- screen: SUDO
- note: sudo = the command that makes a computer obey
- time: day
- mood: funny
- light: indoor

### s06 · nursery
> He said sudo!

- captions: HE SAID *SUDO*!
- speaker: mom
- say: He said soo-doo!
- action: Mom by the door, hands on her cheeks, proud
- camera: on Mom
- emotion: excited
- faces: mom=laugh, dad=neutral
- time: day
- mood: funny
- light: indoor

### s07 · nursery
> Sudo... make me a sandwich.

- captions: *SUDO*... | MAKE ME A *SANDWICH*.
- speaker: dad
- say: Soo-doo... make me a sandwich.
- action: Dad, deadpan, holding out an empty plate to the baby
- camera: two-shot, Dad and Mom
- emotion: flat
- faces: dad=neutral, mom=happy
- time: day
- mood: funny
- light: indoor

### s08 · preschool
> By two, we played CTFs: capture the flag, but every flag is hidden inside a hacked computer.

- captions: BY *TWO*, | WE PLAYED *CTFs*: | CAPTURE THE *FLAG*, | BUT EVERY FLAG | IS HIDDEN INSIDE | A HACKED *COMPUTER*.
- say: By two, we played C-T-Fs: capture the flag, but every flag is hidden inside a hacked computer.
- action: toddlers at miniature gaming setups with milk bottles; their screens show flag{...}
- camera: from the board side, the toddlers facing the camera
- emotion: neutral
- faces: hero=determined, friend=determined
- title: AGE 2
- time: day
- mood: funny
- light: indoor

### s09 · preschool
> Project SEKAI? PPP? This is PRESCHOOL!

- captions: PROJECT *SEKAI*? | *PPP*? | THIS IS *PRESCHOOL*!
- speaker: me
- say: Project Sekai? P-P-P? This is preschool!
- action: the PRESCHOOL CTF LEAGUE lobby with the real team logos; I look from the board to my milk bottle
- camera: the lobby board, then my face
- emotion: shocked
- faces: hero=shocked
- screen: PRESCHOOL CTF LEAGUE
- note: the best hacking teams in the world
- time: day
- mood: funny
- light: indoor

### s10 · preschool
> My best friend said he watches kurenaif for the cryptography.

- captions: MY BEST *FRIEND* SAID | HE WATCHES *KURENAIF* | FOR THE *CRYPTOGRAPHY*.
- say: My best friend said he watches kurenaifu for the cryptography.
- action: my best friend with his kurenaif flag, notebook and standee
- camera: push in on him
- emotion: neutral
- faces: friend=smug
- time: day
- mood: funny
- light: indoor

### s11 · preschool
> What did you learn?

- captions: WHAT DID | YOU *LEARN*?
- speaker: me
- action: I tilt my head
- camera: on me, the friend's flag in the corner
- emotion: neutral
- faces: hero=neutral
- time: day
- mood: funny
- light: indoor

### s12 · preschool
> The streaming schedule.

- captions: THE *STREAMING* | SCHEDULE.
- speaker: friend
- say: The streaming... schedule.
- action: his screen: kurenaif's stream schedule, every day ticked
- camera: over his shoulder onto the schedule
- emotion: neutral
- faces: friend=grin
- time: day
- mood: funny
- light: indoor

### s13 · room
> At three, I learned Kevin Mitnick's rule: don't hack the computer, hack the person.

- captions: AT *THREE*, | I LEARNED KEVIN | *MITNICK'S* RULE: | DON'T HACK THE *COMPUTER*, | HACK THE *PERSON*.
- action: my monitor: Kevin Mitnick, the most wanted hacker in America, got in by phone
- camera: over my shoulder onto the monitor
- emotion: serious
- faces: hero=determined
- title: AGE 3
- screen: MITNICK
- note: real: he talked his way in on the phone
- time: day
- mood: funny
- light: indoor

### s14 · room
> Hi, NASA help desk? I'm the new janitor. I forgot my password.

- captions: HI, NASA HELP *DESK*? | I'M THE NEW *JANITOR*. | I FORGOT MY *PASSWORD*.
- speaker: me
- action: me on a toy phone, putting on a grown-up voice
- camera: close on me and the phone
- emotion: serious
- faces: hero=smug
- screen: CALLING
- time: day
- mood: funny
- light: indoor

### s15 · room
> Sir... how old are you?

- captions: SIR... | HOW *OLD* ARE YOU?
- speaker: helpdesk
- action: the screen shows the call: NASA HELP DESK
- camera: on the screen, the call
- emotion: flat
- faces: hero=shocked
- screen: CALLING
- time: day
- mood: funny
- light: indoor

### s16 · room
> Three.

- captions: ...*THREE*.
- speaker: me
- action: click: CALL ENDED
- camera: close on me
- emotion: whisper
- faces: hero=embarrassed
- screen: CALL ENDED
- time: day
- mood: funny
- light: indoor

### s17 · room
> At five, Mom changed the Wi-Fi password so I'd go outside.

- captions: AT *FIVE*, MOM CHANGED | THE *WI-FI* PASSWORD | SO I'D GO *OUTSIDE*.
- action: Mom at the router, typing a new password, looking pleased; kids play outside the window
- camera: wide, Mom at the router, me at the desk
- emotion: neutral
- faces: mom=smug, hero=determined
- title: AGE 5
- screen: NO INTERNET
- time: day
- mood: funny
- light: indoor

### s18 · room
> I cracked it with aircrack-ng before she put the router down.

- captions: I *CRACKED* IT | WITH *AIRCRACK-NG* | BEFORE SHE PUT | THE ROUTER *DOWN*.
- say: I cracked it with air-crack-N-G before she put the router down.
- action: my screen: aircrack-ng, KEY FOUND! [ password123 ]; Mom freezes with the router
- camera: over my shoulder, the screen and Mom behind
- emotion: smug
- faces: hero=smug, mom=shocked
- screen: AIRCRACK
- note: a real Wi-Fi password cracker
- time: day
- mood: funny
- light: indoor

### s19 · room
> At seven, I tried Log4Shell on NASA. Patched. Heartbleed? Patched.

- captions: AT *SEVEN*, | I TRIED *LOG4SHELL* | ON NASA. *PATCHED*. | *HEARTBLEED*? PATCHED.
- say: At seven, I tried Log-for-Shell on NASA. Patched. Heartbleed? Patched.
- action: screen: ${jndi:ldap://...} then PATCHED; a bleeding heart then PATCHED
- camera: push in on the screen
- emotion: neutral
- faces: hero=angry
- title: AGE 7
- screen: PATCHED
- note: two real bugs that broke half the internet
- time: day
- mood: funny
- light: indoor

### s20 · friend
> My best friend went Gary McKinnon's way: search NASA for UFOs.

- captions: MY BEST FRIEND WENT | GARY *MCKINNON'S* WAY: | SEARCH NASA | FOR *UFOs*.
- action: his monitor: NASA photos, a red circle round a dot
- camera: over his shoulder onto the monitor
- emotion: neutral
- faces: friend=determined
- screen: UFO SEARCH
- note: real: he hunted UFO files inside NASA (2002)
- time: day
- mood: mystery
- light: indoor

### s21 · friend
> I found one!

- captions: I *FOUND* ONE!
- speaker: friend
- action: zoom on the UFO: it is a kurenaif sticker on the telescope
- camera: close on his face, the screen beside him
- emotion: excited
- faces: friend=laugh
- screen: UFO FOUND
- time: day
- mood: funny
- light: indoor

### s22 · room
> Explain this.

- captions: *EXPLAIN* THIS.
- speaker: mom
- action: Mom holds my report card: OSCP PASSED, OSWE PASSED, NASA F; I hold my red ball
- camera: on the report card
- emotion: serious
- faces: mom=angry, hero=scared
- title: AGE 9
- screen: PROGRESS REPORT
- time: day
- mood: tense
- light: indoor

### s23 · room
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

### s24 · room
> Exactly. Nine years.

- captions: *EXACTLY*. | NINE *YEARS*.
- speaker: mom
- action: quiet certainty
- camera: on Mom
- emotion: serious
- faces: mom=determined
- time: day
- mood: tense
- light: indoor

### s25 · room
> Can I go play?

- captions: CAN I GO *PLAY*?
- speaker: me
- action: kids play outside the window; I turn the ball
- camera: close, the window behind me
- emotion: sad
- faces: hero=sad
- time: day
- mood: calm
- light: indoor

### s26 · room
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

### s27 · room
> Last minute: SQL injection, phishing, a zero-day I wrote in my sleep.

- captions: LAST *MINUTE*: | *SQL* INJECTION, | *PHISHING*, | A *ZERO-DAY* I WROTE | IN MY *SLEEP*.
- say: Last minute: sequel injection, phishing, a zero-day I wrote in my sleep.
- action: I type like mad; the screen flashes ' OR 1=1 --, a fake login email, an exploit
- camera: fast orbit round me at the desk
- emotion: excited
- faces: hero=determined
- timer: 10TH BIRTHDAY IN 00:59 -> 00:10
- screen: ATTACKS
- time: day
- mood: action
- light: studio

### s28 · room
> Why is nothing working?!

- captions: WHY IS *NOTHING* | WORKING?!
- speaker: me
- action: ACCESS DENIED; hands on my head
- camera: close, shaking
- emotion: panic
- faces: hero=scared
- timer: 10TH BIRTHDAY IN 00:05
- screen: ACCESS DENIED
- time: day
- mood: panic
- light: studio

### s29 · room
> Did you try admin, admin?

- captions: DID YOU TRY | *ADMIN*, ADMIN?
- speaker: dad
- action: Dad walks past behind me, eating a sandwich, and stops
- camera: on Dad, sandwich in hand
- emotion: flat
- faces: dad=neutral, hero=shocked
- timer: 00:03 UNTIL REMOVAL
- screen: ACCESS DENIED
- time: day
- mood: silence
- light: studio

### s30 · room
> Oh.

- captions: ...*OH*.
- speaker: me
- action: I type admin / admin
- camera: close on me
- emotion: whisper
- faces: hero=embarrassed
- timer: 00:02 UNTIL REMOVAL
- screen: LOGIN ADMIN
- time: day
- mood: silence
- light: studio

### s31 · room
> Nine years of training. Beaten by the default password.

- captions: NINE YEARS | OF *TRAINING*. | BEATEN BY THE | DEFAULT *PASSWORD*.
- action: 00:01, ACCESS GRANTED, a green check; the countdown disappears
- camera: the screen, then me
- emotion: flat
- faces: hero=dazed
- screen: ACCESS GRANTED
- note: real: default passwords start lots of real hacks
- time: day
- mood: triumph
- light: indoor

### s32 · room
> Happy birthday, buddy.

- captions: HAPPY *BIRTHDAY*, | BUDDY.
- speaker: dad
- action: AGE 10; confetti; Dad puts a party hat on me
- camera: two-shot, confetti falling
- emotion: happy
- faces: dad=happy, hero=happy
- title: AGE 10
- time: day
- mood: happy
- light: indoor

### s33 · room
> New objective: hack the Sun before eleven.

- captions: NEW *OBJECTIVE*: | HACK THE *SUN* | BEFORE *ELEVEN*.
- speaker: system
- action: a cheerful notification; a new countdown over my head
- camera: push in on me
- emotion: excited
- faces: hero=shocked
- timer: 11TH BIRTHDAY IN 365 DAYS
- screen: NEW OBJECTIVE: HACK THE SUN
- note: the next rule
- time: day
- mood: funny
- light: indoor

### s34 · room
> Start earlier this time.

- captions: START *EARLIER* | THIS TIME.
- speaker: dad
- action: Dad hands me a tiny bottle of sunscreen
- camera: two-shot, the bottle between us
- emotion: neutral
- faces: dad=happy, hero=dazed
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: funny
- light: indoor

### s35 · room
> Can I go play now?

- captions: CAN I GO | *PLAY* NOW?
- speaker: me
- action: party hat on, I look at the red ball
- camera: close
- emotion: sad
- faces: hero=sad
- timer: 11TH BIRTHDAY IN 365 DAYS
- time: day
- mood: calm
- light: indoor

### s36 · room
> After the Sun.

- captions: AFTER THE *SUN*.
- speaker: mom
- say: After... the Sun.
- action: already reading the next mission
- camera: on Mom
- emotion: flat
- faces: mom=neutral
- time: day
- mood: calm
- light: indoor

### s37 · room

- action: I set the sunscreen by the keyboard and sit down: hat, countdown above me, the red ball untouched; cut to black
- camera: slow pull back to a wide of the desk
- faces: hero=sad
- timer: 11TH BIRTHDAY IN 364 DAYS
- screen: NEW OBJECTIVE: HACK THE SUN
- time: day
- mood: calm
- light: indoor
- min: 2
