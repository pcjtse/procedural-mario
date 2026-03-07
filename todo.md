# Procedural Mario — Enhancement Suggestions

## Gameplay

- [ ] **Boss fights** — add a Bowser encounter at the end of every 4th level (castle theme); Bowser throws hammers and breathes fire, defeated by hitting an axe switch
- [ ] **More enemy types**
  - [ ] Hammer Bro — patrols and throws hammers in an arc
  - [ ] Buzzy Beetle — shell-type enemy immune to fireballs, found in underground theme
  - [ ] Cheep Cheep — jumping fish enemy for sky/water gaps
  - [ ] Lakitu — flies across the top of the screen and drops Spinies
  - [ ] Spiny — ground enemy spawned by Lakitu, immune to stomping
- [ ] **More power-ups**
  - [ ] Ice Flower — fires bouncing ice projectiles that freeze enemies into sliding blocks
  - [ ] Cape / Tanooki Suit — grants a flutter jump for extra air time
  - [ ] Mini Mushroom — shrinks Mario, allowing entry into small passages
- [ ] **Combo system** — display a visible combo counter and multiplier on-screen during multi-stomp streaks
- [ ] **Player momentum tuning** — add a small run speed boost after holding the run button for ~0.5 s, matching NES feel

## Level Generation

- [ ] **Secret bonus rooms** — random chance to place a warp pipe that leads to an off-screen coin room (blank tilemap section generated separately)
- [ ] **Water / swimming sections** — new `water` theme with buoyancy physics and Cheep Cheep enemies
- [ ] **Ice theme** — slippery ground tiles, frozen pipes, Buzzy Beetles; ground tiles tinted blue-white
- [ ] **Vertical sub-sections** — occasionally generate a short vertical climbing segment (vine or ladder of platforms) instead of horizontal traversal
- [ ] **Enemy patrol territories** — enemies assigned a min/max x range so they do not walk off platforms into gaps
- [ ] **Difficulty curve smoothing** — use a sigmoid curve instead of linear for difficulty scaling so early levels feel easier for longer

## New Tile Types

- [ ] **Vine tile** — climbable vertical tile (TileType.VINE); Mario can grab and ascend
- [ ] **Moving platform** — entity (not tile) that slides left/right or up/down on a configurable path
- [ ] **Lava tile** — instant-death solid tile, used in castle theme gaps instead of empty space
- [ ] **Ice tile** — solid but frictionless variant of GROUND_TOP for an ice world theme
- [ ] **Note block** — bounces Mario high when stomped (interactive tile)

## Audio

- [ ] **Invincibility (star) music** — fast-tempo loop that plays while the star power-up is active, then fades back to level music
- [ ] **Hurry-up music** — speed up the current theme when the level timer drops below 100
- [ ] **Positional audio panning** — pan sound effects left/right based on the entity's distance from the camera center
- [ ] **Jingle system** — short non-looping stings for 1-Up, power-up, and level-complete events that duck the background music briefly
- [ ] **Underground water drip** — ambient background noise (random soft drips) layered under the underground music loop

## Visuals / Rendering

- [ ] **Animated background tiles** — lava tiles in castle theme animate with a flickering orange glow; water tiles in water theme animate with waves
- [ ] **Particle effects** — small star burst when Mario collects a coin, dust puff on landing, smoke on brick break
- [ ] **Screen transition wipe** — iris-in / iris-out effect when entering a new level instead of a hard cut
- [ ] **Day/night cycle for overworld** — randomly choose morning (bright blue), afternoon (default), or dusk (orange-tinted) sky; affects background gradient only
- [ ] **Improved HUD** — show a coin icon next to the coin counter, a heart icon next to lives, and render the world number as "W1-1" format

## User Interface

- [ ] **World map screen** — simple top-down node graph (4 worlds × 4 levels) shown between levels; player dot advances along edges
- [ ] **Pause menu** — full pause overlay with Resume, Restart Level, and Quit to Title options (currently only shows "PAUSED" text)
- [ ] **Controls screen** — show key bindings on the title screen or via a dedicated help overlay (toggle with `?` or `H`)
- [ ] **High-score table** — persist and display the top 5 scores with seeds in `localStorage` instead of a single high score
- [ ] **Level seed input** — let the player type a custom seed on the title screen to replay a specific generated level

## Mobile / Accessibility

- [ ] **Touch controls** — virtual D-pad and A/B buttons rendered on canvas for mobile browsers; use `touchstart`/`touchend` events
- [ ] **Gamepad support** — map Web Gamepad API axes/buttons to the existing input system
- [ ] **Colorblind mode** — alternative palettes with higher contrast for enemies and interactive tiles
- [ ] **Adjustable game speed** — expose a 0.5× / 1× / 2× speed toggle (modify the physics timestep) for accessibility and speedrunning

## Technical / Architecture

- [ ] **Tilemap chunk streaming** — only keep the tiles near the camera in memory; lazily generate/discard chunks for very long levels without memory growth
- [ ] **Replay system** — record the PRNG seed + player inputs each frame; allow replaying a run from the title screen
- [ ] **Unit tests** — test `LevelGenerator.generate()` for level validity (no unbeatable gaps, flagpole always present, enemy counts within bounds)
- [ ] **Level validator tool** — standalone browser page that generates N levels and reports any validation failures (gap width, flagpole, entity overlaps)
- [ ] **Performance profiling** — measure tile-render and entity-update costs per frame; cache off-screen tile canvases to a `OffscreenCanvas` for faster blitting
