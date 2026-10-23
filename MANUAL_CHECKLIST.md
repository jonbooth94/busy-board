# Manual checklist (real devices)

Do this on the **iPad** (the main target) and, if you use one, the **Android tablet**. Tick each box as you go. If something fails, note which device and what happened. The automated tests can't check sound latency, real fingers or Guided Access, so these matter.

| | iPad | Tablet |
|---|---|---|
| Device model / OS version | | |
| Date checked | | |

## 1. Install
- [ ] iPad  - [ ] Tablet: Install from the browser (README: Safari → Share → **Add to Home Screen**; Chrome → **⋮ → Install app**).
- [ ] iPad  - [ ] Tablet: The **Busy Board** icon (wooden board with a button, switch, knob and keys) looks right on the home screen, not cropped.
- [ ] iPad  - [ ] Tablet: Opening it from the icon is **full screen**: no address bar.
- [ ] iPad  - [ ] Tablet: It opens on the **closed wooden board**, with the two knobs gently pulsing.

## 2. Airplane mode
- [ ] iPad  - [ ] Tablet: Open the app once online, then close it fully (swipe it away).
- [ ] iPad  - [ ] Tablet: Turn on **airplane mode** (Wi-Fi off too) and open the app from the home screen. It loads.
- [ ] iPad  - [ ] Tablet: Open the board and tap every object. All 12 work, with sound.
- [ ] iPad  - [ ] Tablet: Turn airplane mode off when done.

## 3. Sound (the most important part)
- [ ] iPad  - [ ] Tablet: The first tap on the cover plays a soft wooden chime.
- [ ] iPad  - [ ] Tablet: **Latency:** tap the big button and the keys quickly. The sound feels attached to the finger, with no noticeable delay. (Spec target: under 50 ms. If it feels laggy, note it: this is the main risk of the web version.)
- [ ] iPad  - [ ] Tablet: Repeated taps on one object don't sound identical every time (2–3 variants).
- [ ] iPad  - [ ] Tablet: Mashing many objects at once never gets loud or distorted; older sounds just stop.
- [ ] iPad: With the **silent switch / silent mode on**, sound still plays. (If not, note the iPadOS version.)
- [ ] iPad  - [ ] Tablet: Lock the screen during play, unlock: sound still works on the next tap.

## 4. Every object (tap once each, then try the optional gesture)
| Object | Tap does | Optional gesture | iPad | Tablet |
|---|---|---|---|---|
| Big button | squish, boop, bubble floats up and pops | — | ☐ | ☐ |
| Light switch | click, lamp glows / dims | swipe up = on, down = off | ☐ | ☐ |
| Doorbell | ding-dong, door opens, Bear peeks out | — | ☐ | ☐ |
| Lever | pulls down, ball rolls into the cup, springs back | — | ☐ | ☐ |
| Color knob | turns one notch, light changes color with its own note | drag in a circle | ☐ | ☐ |
| Spinner wheel | spins about two turns, clicks slow down | swipe for extra spin | ☐ | ☐ |
| Gears | whirr for 2 seconds, puffs of steam | — | ☐ | ☐ |
| Clock | hands sweep, bird pops out and chirps | — | ☐ | ☐ |
| Three keys | each key plays its note, a note floats up | slide across for a run | ☐ | ☐ |
| Slide whistle | handle jumps to the finger, pitch matches | slide along it | ☐ | ☐ |
| Zipper | zips open to a flower, or closes | swipe right / left | ☐ | ☐ |
| Lock and key | key turns, lock clicks open; tap again to close | — | ☐ | ☐ |

## 5. Kid-proofing
- [ ] iPad  - [ ] Tablet: Objects react the moment a finger touches, not on release.
- [ ] iPad  - [ ] Tablet: A slightly-off tap just beside an object still works.
- [ ] iPad  - [ ] Tablet: Hold the device with thumbs resting on the screen edges: nothing triggers.
- [ ] iPad  - [ ] Tablet: A tap on bare wood makes a soft knock.
- [ ] iPad  - [ ] Tablet: Five fingers on five objects at once: all five respond.
- [ ] iPad  - [ ] Tablet: Lay a palm flat on the screen: no burst of sounds. Mash the screen for ~10 seconds: nothing crashes or freezes.
- [ ] iPad  - [ ] Tablet: Pinch and double-tap: the page **doesn't zoom**. Long-press: **no menu, no text selection**.
- [ ] iPad  - [ ] Tablet: Rotate to portrait: a "turn me" picture shows. Back to landscape: the board is back.
- [ ] iPad  - [ ] Tablet: Leave it untouched for 8 seconds: one toy gives a small wiggle (no sound). It keeps happening every 8 seconds, a different toy each time.
- [ ] iPad  - [ ] Tablet: Nothing flashes; light changes fade.

## 6. Parent gate and settings
- [ ] iPad  - [ ] Tablet: A quick tap on the moon does nothing.
- [ ] iPad  - [ ] Tablet: Holding it fills a ring; letting go early cancels. Holding **3 seconds** opens the settings.
- [ ] iPad  - [ ] Tablet: The settings scroll with a finger. **Back to the board** returns to play.
- [ ] iPad  - [ ] Tablet: Hide two toys: they become empty plates. Close and reopen the app: still hidden.
- [ ] iPad  - [ ] Tablet: Volume Low / Medium / High each play a preview chime at that level.
- [ ] iPad  - [ ] Tablet: Co-play prompts **Show** lists a "Things to say" card for the visible toys.
- [ ] iPad: **Share CSV** opens the share sheet; save to Files and open it in Numbers or Excel. - [ ] Tablet: **Download CSV** saves a file that opens in a spreadsheet.

## 7. Session ending (set Session length to 10 min to save time)
- [ ] iPad  - [ ] Tablet: About 30 seconds before the end, the lamp and board dim and toys fall asleep **one at a time** (faded, with a little moon). Asleep toys ignore taps.
- [ ] iPad  - [ ] Tablet: At the end the doors close and a moon and stars appear, with a soft lullaby.
- [ ] iPad  - [ ] Tablet: Taps on the goodnight screen do nothing.
- [ ] iPad  - [ ] Tablet: Close and reopen the app: still goodnight. The moon → **Start a new session** brings back the closed board.
- [ ] Did the ending feel calm? Notes:

## 8. Guided Access (iPad) / screen pinning (tablet)
- [ ] iPad: Start Guided Access (README). Swiping up from the bottom doesn't leave the app. Ending it asks for the passcode.
- [ ] Tablet: Pin the app. Swiping home or back doesn't leave the app.

## 9. Updates keep the log and settings
1. Play a little, and hide one toy in the settings.
2. Push a small, visible change (e.g. ask Claude Code to *"make the big button blue"*) and wait for the green check in GitHub **Actions**.
3. On each device, online:
- [ ] iPad  - [ ] Tablet: Open the app and play for a minute. **It does not reload while playing.**
- [ ] iPad  - [ ] Tablet: Use the moon → **Start a new session**. Within a few seconds the cover refreshes once and the change is there. If not, close and reopen the app.
- [ ] iPad  - [ ] Tablet: The hidden toy is still hidden, and the log count didn't drop.
