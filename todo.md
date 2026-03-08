# Procedural Mario — Enhancement Suggestions

## Gameplay

- [x] **Boss fights** — add a Bowser encounter at the end of every 4th level (castle theme); Bowser throws hammers and breathes fire, defeated by hitting an axe switch
- [x] **More enemy types**
  - [x] Hammer Bro — patrols and throws hammers in an arc
  - [x] Buzzy Beetle — shell-type enemy immune to fireballs, found in underground theme
  - [x] Cheep Cheep — jumping fish enemy for sky/water gaps
  - [x] Lakitu — flies across the top of the screen and drops Spinies
  - [x] Spiny — ground enemy spawned by Lakitu, immune to stomping
- [x] **More power-ups**
  - [x] Ice Flower — fires bouncing ice projectiles that freeze enemies into sliding blocks
  - [x] Cape / Tanooki Suit — grants a flutter jump for extra air time
  - [x] Mini Mushroom — shrinks Mario, allowing entry into small passages
- [x] **Combo system** — display a visible combo counter and multiplier on-screen during multi-stomp streaks
- [x] **Player momentum tuning** — add a small run speed boost after holding the run button for ~0.5 s, matching NES feel

## Level Generation

- [x] **Secret bonus rooms** — random chance to place a warp pipe that leads to an off-screen coin room (blank tilemap section generated separately)
- [x] **Water / swimming sections** — new `water` theme with buoyancy physics and Cheep Cheep enemies
- [x] **Ice theme** — slippery ground tiles, frozen pipes, Buzzy Beetles; ground tiles tinted blue-white
- [x] **Vertical sub-sections** — occasionally generate a short vertical climbing segment (vine or ladder of platforms) instead of horizontal traversal
- [x] **Enemy patrol territories** — enemies assigned a min/max x range so they do not walk off platforms into gaps
- [x] **Difficulty curve smoothing** — use a sigmoid curve instead of linear for difficulty scaling so early levels feel easier for longer

## New Tile Types

- [x] **Vine tile** — climbable vertical tile (TileType.VINE); Mario can grab and ascend
- [x] **Moving platform** — entity (not tile) that slides left/right or up/down on a configurable path
- [x] **Lava tile** — instant-death solid tile, used in castle theme gaps instead of empty space
- [x] **Ice tile** — solid but frictionless variant of GROUND_TOP for an ice world theme
- [x] **Note block** — bounces Mario high when stomped (interactive tile)

## Audio

- [x] **Invincibility (star) music** — fast-tempo loop that plays while the star power-up is active, then fades back to level music
- [x] **Hurry-up music** — speed up the current theme when the level timer drops below 100
- [x] **Positional audio panning** — pan sound effects left/right based on the entity's distance from the camera center
- [x] **Jingle system** — short non-looping stings for 1-Up, power-up, and level-complete events that duck the background music briefly
- [x] **Underground water drip** — ambient background noise (random soft drips) layered under the underground music loop

## Visuals / Rendering

- [x] **Animated background tiles** — lava tiles in castle theme animate with a flickering orange glow; water tiles in water theme animate with waves
- [x] **Particle effects** — small star burst when Mario collects a coin, dust puff on landing, smoke on brick break
- [x] **Screen transition wipe** — iris-in / iris-out effect when entering a new level instead of a hard cut
- [x] **Day/night cycle for overworld** — randomly choose morning (bright blue), afternoon (default), or dusk (orange-tinted) sky; affects background gradient only
- [x] **Improved HUD** — show a coin icon next to the coin counter, a heart icon next to lives, and render the world number as "W1-1" format

## User Interface

- [x] **World map screen** — simple top-down node graph (4 worlds × 4 levels) shown between levels; player dot advances along edges
- [x] **Pause menu** — full pause overlay with Resume, Restart Level, and Quit to Title options (currently only shows "PAUSED" text)
- [x] **Controls screen** — show key bindings on the title screen or via a dedicated help overlay (toggle with `?` or `H`)
- [x] **High-score table** — persist and display the top 5 scores with seeds in `localStorage` instead of a single high score
- [x] **Level seed input** — let the player type a custom seed on the title screen to replay a specific generated level

## Mobile / Accessibility

- [x] **Touch controls** — virtual D-pad and A/B buttons rendered on canvas for mobile browsers; use `touchstart`/`touchend` events
- [x] **Gamepad support** — map Web Gamepad API axes/buttons to the existing input system
- [x] **Colorblind mode** — alternative palettes with higher contrast for enemies and interactive tiles
- [x] **Adjustable game speed** — expose a 0.5× / 1× / 2× speed toggle (modify the physics timestep) for accessibility and speedrunning

## Technical / Architecture

- [x] **Tilemap chunk streaming** — only keep the tiles near the camera in memory; lazily generate/discard chunks for very long levels without memory growth
- [x] **Replay system** — record the PRNG seed + player inputs each frame; allow replaying a run from the title screen
- [x] **Unit tests** — test `LevelGenerator.generate()` for level validity (no unbeatable gaps, flagpole always present, enemy counts within bounds)
- [x] **Level validator tool** — standalone browser page that generates N levels and reports any validation failures (gap width, flagpole, entity overlaps)
- [x] **Performance profiling** — measure tile-render and entity-update costs per frame; cache off-screen tile canvases to a `OffscreenCanvas` for faster blitting
