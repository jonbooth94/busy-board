# Busy Board

A digital busy board for a 2-year-old: 12 chunky objects on one wooden board, each doing one satisfying thing when tapped. **Color Critters**, the coloring app, lives inside it too: when the doors open she picks the board or the coloring page from two big pictures. Nothing can be done wrong, there are no words on the child's side, and the app ends its own sessions with a calm wind-down. It works fully offline once installed and makes no network requests while in use. There are no accounts, ads or analytics.

Built from the *Busy Board Build Spec* in the parent folder. Color Critters was a separate app (`../color-critters`) and was moved in here, restyled to match the board.

**Live app (once the GitHub repo is set up):** https://jonbooth94.github.io/busy-board/

---

## What's on the board

| Row | Objects |
|---|---|
| Top: quick response | Big button, light switch, doorbell (Bear peeks out), lever (ball rolls into the cup) |
| Middle: turning parts | Color knob, spinner wheel, gears, cuckoo clock |
| Bottom: music and reveal | Three keys, slide whistle, zipper (a flower inside), lock and key |

Every object works with a single tap on touch-down. Some also have an optional gesture that does the same thing (swipe the switch or zipper, turn the knob in a circle, swipe the spinner for more spin, slide across the keys or whistle). None is ever required.

**A session:** a closed wooden board → one tap opens it → the chooser: two big plates, the board (left) or Color Critters (right) → play (on the board, if nobody touches anything for 8 seconds, one toy gives a little wiggle) → in the last 30 seconds the screen dims and toys fall asleep one at a time → goodnight, the doors close. Restarting needs a grown-up (see "Parent gate").

**One timer for both apps.** The session clock keeps running whichever app she's in, so switching apps doesn't reset her screen time. If goodnight comes while she's coloring, her drawing is saved and the doors close over it.

**Getting around:** the small **house** button in the top-left corner goes back to the chooser, from the board or from the animal picker. On a coloring page, the house goes back to the animals.

## Color Critters

Pick an animal, pick a crayon, and color. The brown outlines always stay on top, so coloring never covers them.

- 20 animals on wooden plates. More than 10 scroll up and down.
- 10 crayons: red, orange, yellow, green, blue, purple, pink, brown, black and white. White works as the eraser.
- Only one finger draws at a time, so a resting palm or second finger doesn't scribble.
- The eraser button clears the page after a **2-second hold** (a ring fills). A quick tap does nothing.
- Every drawing saves itself and comes back the next time she opens that animal. The animal's plate shows her coloring.
- **Drawings from the old Color Critters app show up here.** Both apps live on `jonbooth94.github.io`, so they share the same storage. The old app at https://jonbooth94.github.io/color-critters/ still works for now, and both apps see the same drawings.

## Install on an iPad

1. Make sure the iPad is online.
2. Open **Safari** and go to https://jonbooth94.github.io/busy-board/
3. Wait until you see the closed wooden board (a second or two). That's when it downloads everything it needs for offline use.
4. Tap the **Share** button (square with an arrow), then **Add to Home Screen**, then **Add**.
5. Open **Busy Board** from the home screen once while still online. From then on it works in airplane mode.

It opens full screen. Hold the iPad in landscape; in portrait it shows a "turn me" picture instead of the board.

On recent iPadOS versions, sound plays even when the silent switch/mode is on, like a real toy (check this on your iPad; see the manual checklist). Use the volume buttons, or the volume cap in the parent settings.

### Lock it into the app: Guided Access

Guided Access keeps the iPad in one app until you end it with a passcode.

**Turn it on (one time):** Settings → **Accessibility** → **Guided Access** → turn on. Then **Passcode Settings** → **Set Guided Access Passcode**.

**Start:** open Busy Board, then triple-click the **top button** (or the **Home button** on iPads that have one) and tap **Start**. Tip: tap **Options** first and turn off **Motion** so the screen can't rotate.

**End:** triple-click the same button, enter your passcode, tap **End**.

## Install on an Android tablet

1. Open **Chrome** and go to https://jonbooth94.github.io/busy-board/ and wait for the wooden board.
2. Tap Chrome's **⋮** menu → **Install app** (or **Add to Home screen** → **Install**).
3. Open it once from the home screen while still online.

To lock it in, use **screen pinning**, exactly as described in the Color Critters README (Settings → Security → App pinning, then pin from the Recents screen).

**If Chrome says "already installed" but the icon says the app isn't available:** the install didn't finish in the background. Long-press the icon → **Remove**, uninstall **Busy Board** in Settings → Apps if it's listed, then install again from Chrome and wait for Android's "installed" notification before tapping the icon. Don't clear Chrome's site data for `jonbooth94.github.io` to fix this: Color Critters lives on the same site, and its drawings would be deleted too.

## Parent gate and settings

Press and hold the small **moon** in the top-right corner for **3 seconds** while the ring fills. A quick tap does nothing. Holding it pauses the session clock and opens the parent settings:

| Setting | Options |
|---|---|
| Session length | 10, 15 or 20 minutes, or Off (no wind-down). One timer covers the board and Color Critters. |
| Volume cap | Low, Medium, High (both apps) |
| Toys on the board | Hide any of the 12 to rotate toys like a real shelf. A hidden toy leaves an empty plate. At least one stays visible. |
| Co-play prompts | Show a card of things to say while playing ("Can you turn the light on?") |
| Playtest log | Shows how many events are recorded, with **Share CSV** (iPad share sheet), **Download CSV** and **Clear log** |

**Back to playing** resumes the session where she was. **Start a new session** closes the doors to the wooden cover, ready for the next tap; it opens on the chooser.

After goodnight the board stays closed, even if the app is closed and reopened, until a grown-up uses the moon and taps **Start a new session**.

Settings, the log and her drawings are stored on the device only. Deleting the app (or clearing Safari/Chrome website data) deletes them.

## The playtest log

Every tap is written to a log on the device. Export it from the parent settings as CSV and open it in Power BI or a spreadsheet.

| Column | Example | Notes |
|---|---|---|
| timestamp | 2026-11-02T09:14:31.220 | Local time |
| sessionId | s003 | Counts up with each session on this device |
| objectId | light-switch | `empty` for taps on empty board space, `board` for session markers, `app` for moving between screens |
| event | tap | `tap`, `drag`, `ignoredCooldown`, `idleHint`, plus `sessionStart`, `windDown`, `sessionEnd`, and `navigate` |
| stateAfter | on | The object's state after the tap, the key or note for instruments, `asleep` during wind-down. For `navigate`: `chooser`, `board`, `picker` or `coloring:<animal>` |

Useful measures from the spec: taps per object per session, objects never touched, share of `empty` taps, time from `sessionStart` to the first `tap`, `ignoredCooldown` counts, and what happens after `windDown`. The `navigate` rows show which app she picks, how long she stays (the time to the next `navigate`) and which animals she colors. Individual crayon strokes aren't logged.

## How updates reach the devices

Same as Color Critters:

- Every push to `main` runs all the tests on GitHub. **A new version is published only if every test passes.**
- The app checks for a new version on launch and hourly while open (when online), and downloads it quietly.
- The update is applied only when the doors are **closed** (the wooden cover before a session, or goodnight) and her drawing is saved, never while she's playing either app. No pop-ups.
- The log, settings, drawings and "goodnight" state survive updates.

## Change or add an object

Each object is three things, and the build **fails** if they don't match up:

1. **A config file** in `src/config/objects/<id>.json`: its behavior type, board slot, cooldown, states, sounds and the co-play prompt. The five behavior types are `momentary` (button, doorbell, lever), `toggle` (switch, zipper, lock), `cycle` (knob), `timed` (spinner, gears, clock) and `instrument` (keys, whistle). Copy the closest existing object.
2. **A drawing** in `src/art/<id>.ts`, registered in `src/art/catalog.ts` (its poses, animations and zones) and `src/art/index.ts`. Drawings use a 200 x 200 viewBox, thick outlines and the palette in `src/art/types.ts`, and need one invisible `.hit` rect marking the object's drawn bounds.
3. **Sounds** in `src/audio/bank.ts`. All sounds are generated in code (no audio files). Give each action 2 or 3 variants and keep musical sounds on the C D E G A scale.

Then list the id in `src/config/board.json` (`objects`) and give it a free `slot`. The board layout, every object config and the parent setting defaults are separate JSON files, so the same configs could later move to a game engine unchanged.

The build checks: every sound, pose and animation a config names exists; 2–3 sound variants per action; hit padding at least 24; no two objects in one slot; timed runs at most 3 seconds; gestures fit the behavior type.

Touch rules (edge dead zone 40, max 5 touches, palm size, drag threshold 12, idle hint 8 s, wind-down 30 s, gate hold 3 s, 6 voices) are in `src/config/board.json`.

## Add a new animal

Adding an animal takes only three things: an SVG file, one line in `animals.json`, and a push. The build **fails** if the art breaks any of the first three rules below, so you can't publish a broken animal by mistake.

| Rule | Detail |
|---|---|
| Canvas | `viewBox="0 0 1024 1024"` exactly |
| Outlines only | `fill="none"` on every shape (put it on the root `<svg>`) |
| Transparent background | no background rectangle, no background style, no embedded images |
| Line color | `stroke="#4a3426"`, the board's brown ink (put it on the root `<svg>`) |
| Line style | `stroke-width` 14–18 (the others use 16), `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Look | cute and simple for a toddler: big shapes, big eyes, very few small details, no text |
| Layout | centered with about 8% empty space around the edge (keep drawing inside roughly 82 to 942) |

Start your file from this skeleton:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none" stroke="#4a3426" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
  <!-- shapes go here -->
</svg>
```

Solid pupils are made from strokes, not fills: a tiny dot `<path d="M500 400 m-1 0 h2"/>` plus a ring `<circle cx="500" cy="400" r="15"/>`. Copy them from `src/critters/animals/dog.svg`.

1. Save the SVG as `src/critters/animals/<id>.svg`, e.g. `pig.svg`. Use lowercase letters, numbers and dashes only.
2. Add one line to `src/critters/animals/animals.json`, in the position where it should appear on the picker:
   ```json
   { "id": "pig", "name": "Pig", "file": "pig.svg", "sound": null },
   ```
   The `id` is what drawings are saved under, so **never change an existing animal's id** or her saved coloring of it will disappear. You *can* replace an animal's SVG at any time; her drawing stays.
3. Optional sound: put an audio file (`.mp3`, `.ogg`, `.wav` or `.m4a`) in `src/critters/animals/sounds/` and set `"sound": "sounds/pig.mp3"`. It plays when that animal opens.

Then push, and check the **Actions** tab on GitHub: a green check means it's live.

## Ask Claude Code to change things

Open Claude Code in this folder and ask in plain words. Examples:

- *"Make the big button bigger and the bubble float higher. Show me the art review page before you push."*
- *"The playtest showed nobody touches the gears. Swap them for a drum that plays a low note."*
- *"Make the cooldown on the lever 400 ms and the doorbell's Bear wave twice."*
- *"Add a pig to Color Critters, following the art rules in the README. Put it after the cow."*
- *"The prairie dog looks like a bear. Make it more recognizable."*

The **art review page** (`npm run dev`, then open http://localhost:5174/busy-board/dev/review.html) shows every object large with buttons for each pose and animation, every animal, and the app icon. It is never part of the live app.

## Run the tests locally

One-time setup:

```bash
npm ci
```
```bash
npx playwright install chromium webkit
```

Then:

```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm run test:unit
```
```bash
npm run build
```
```bash
npm run test:e2e
```

- `npm run build` also runs the config and animal checks (`npm run validate` runs them on their own).
- `test:e2e` needs `npm run build` first. It tests the real production build on an **iPad** (Safari's engine, 1180 x 820) and a **Galaxy Tab S9** (Chrome), both in landscape: the chooser and home buttons, touch-down triggering, cooldowns, hit padding, the edge dead zone, gestures, multi-touch (Chrome only), idle hints, wind-down and goodnight in both apps, the parent gate and settings, CSV export, every animal opening, drawing, one-finger coloring, the hold-to-clear button, drawings saving, offline use and updating from one version to the next.
- Test hooks: the tests set `bb.debug` in localStorage to shorten sessions and record sound names. Real devices never have it.

## Where things live

| Path | What |
|---|---|
| `src/config/` | `board.json` (layout and touch rules), `settings.json` (parent defaults), `objects/*.json` (one per object) |
| `src/engine/behaviors.ts` | the five behavior types as small state machines |
| `src/engine/router.ts` | touch router: touch-down, hit padding, dead zone, palms, multi-touch, drags |
| `src/engine/controller.ts` | one object: state machine → sound, animation, log |
| `src/art/` | the drawings and their animations |
| `src/audio/` | sound synthesis (`bank.ts`, `synth.ts`) and playback with the voice limit (`engine.ts`) |
| `src/session.ts` | cover, play, idle hints, wind-down, goodnight |
| `src/views.ts` | the chooser and switching between the chooser, the board and Color Critters |
| `src/critters/` | Color Critters: the animal picker, coloring screen, drawing storage, icons, and `animals/` (the SVGs and `animals.json`) |
| `src/parent/` | parent gate and settings panel |
| `src/log.ts` | playtest log (IndexedDB, versioned schema) and CSV |
| `src/critters/storage.ts` | drawings (IndexedDB `color-critters`, versioned schema, shared with the old app) |
| `src/pwa.ts` | offline support and the update policy |
| `assets/icon.svg` | app icon source. After editing it, run `npm run icons` |
| `scripts/` | config and animal validation, icon generation |
| `tests/` | unit tests (Vitest) and end-to-end tests (Playwright) |
| `dev/` | art review page (development only) |
| `MANUAL_CHECKLIST.md` | what to check by hand on the real iPad and tablet |
