/**
 * Main Game Orchestration - ties all systems together.
 * Depends on: ALL other modules loaded first.
 */
(function() {
  'use strict';

  var Physics = ProcMario.Physics;
  var State = ProcMario.State;
  var TileType = ProcMario.TileType;
  var TILE_SIZE = Physics.TILE_SIZE;

  // ── Game configuration ──
  var GROUND_Y = 13;
  var PLAYER_START_X = 48;
  var LEVEL_INTRO_DURATION = 150; // frames (~2.5s)
  var DEATH_RESTART_DELAY = 120;
  var LEVEL_COMPLETE_DELAY = 180;
  var TIME_BONUS_PER_TICK = 50;

  // ── State ──
  var game;
  var renderer;
  var audio;
  var currentSeed  = 1;
  var levelNum     = 1;   // tracks level count for difficulty scaling
  var difficulty   = 0;
  var currentTheme = 'overworld'; // theme for the current level
  var levelData = null;
  var stateTimer = 0;
  var highScore = 0;
  var highScores = []; // top-5 [{score, seed}]
  var comboCount = 0;
  var comboDisplayTimer = 0; // frames to show combo counter on screen
  var screenShake = 0;
  var pauseMenuIndex = 0; // 0=Resume, 1=Restart, 2=Quit
  // Iris wipe transition
  var irisState  = 'none'; // 'opening', 'closing', 'none'
  var irisTimer  = 0;
  var IRIS_FRAMES = 30;
  var irisCallback = null; // called when iris fully closes
  var showControls = false; // help overlay toggled with H
  var seedInputActive = false; // typing a custom seed on title screen

  // Colorblind mode: cycles through off → protanopia → deuteranopia → tritanopia → high-contrast
  var CB_MODES = ['off', 'protanopia', 'deuteranopia', 'tritanopia', 'highcontrast'];
  var CB_LABELS = ['', 'PROTANOPIA', 'DEUTERANOPIA', 'TRITANOPIA', 'HIGH CONTRAST'];
  var colorblindMode = 0; // index into CB_MODES
  var _cbCanvas = null; // lazily resolved game canvas

  // Performance profiler: EMA of per-frame tile-render and entity-update costs (ms)
  var perf = {
    showOverlay: false,       // toggled with F3
    tileMs:   0,              // EMA tile render ms
    entityMs: 0,              // EMA entity update ms
    frameMs:  0,              // EMA total frame time
    _lastFrame: 0,
    _alpha: 0.1,              // EMA smoothing factor (0=frozen,1=instant)
    _tileBuf:   [],           // raw sample ring buffer (last 60)
    _entityBuf: [],
    _frameBuf:  [],
    update: function(key, ms) {
      this[key] = this[key] * (1 - this._alpha) + ms * this._alpha;
      var buf = this['_' + key.replace('Ms','') + 'Buf'];
      if (buf) {
        buf.push(ms);
        if (buf.length > 60) buf.shift();
      }
    }
  };

  // OffscreenCanvas tile cache: maps tileId → { canvas, dirty }
  // Animated / special tiles (lava, water, question, coin) are NOT cached.
  var TILE_CACHE_SKIP = {}; // tile IDs that must NOT be cached (animated)
  var _tileCache = {};
  var seedInputBuffer = ''; // digits typed so far
  var levelIntro = false;
  var introTimer = 0;
  var deathRestart = false;
  var levelAdvance = false;
  var showWorldMap = false;
  var worldMapTimer = 0;
  var WORLD_MAP_DURATION = 240; // 4 seconds at 60fps

  // Bonus room state
  var bonusRoomActive = false;
  var bonusRoomTimer = 0;
  var BONUS_ROOM_DURATION = 300; // 5 seconds at 60fps
  var BONUS_ROOM_COINS = 10;    // coins awarded for visiting bonus room
  var warpPipes = [];            // list of { x, y } warp pipe positions (world coords)
  var _chunkManager = null;     // ChunkManager for tilemap chunk streaming
  var _replayFrame = 0;         // current frame index during replay playback

  // ── Build solidTiles list from tile definitions ──
  function buildSolidTilesList() {
    var solids = [];
    for (var id in ProcMario.TileType) {
      var val = ProcMario.TileType[id];
      if (typeof val === 'number' && ProcMario.isSolid(val)) {
        solids.push(val);
      }
    }
    return solids;
  }

  var solidTiles = buildSolidTilesList();

  // ── Bridge TileMap to engine/physics format ──
  // Engine/Physics expect tilemap.data (1D array) and tilemap.solidTiles,
  // but TileMap stores tiles in tilemap.tiles (Uint8Array).
  function adaptTilemap(tileMap) {
    return {
      data: tileMap.tiles,         // Uint8Array — used by Physics and engine rendering
      tiles: tileMap.tiles,        // alias — used by Blocks' getTile/setTile helpers
      width: tileMap.width,
      height: tileMap.height,
      solidTiles: solidTiles,
      getTile: tileMap.getTile.bind(tileMap),
      setTile: function(x, y, type) {
        tileMap.setTile(x, y, type);
      }
    };
  }

  // ── Convert coin tiles to coin entities ──
  function collectCoinTiles(tileMap) {
    var coins = [];
    for (var row = 0; row < tileMap.height; row++) {
      for (var col = 0; col < tileMap.width; col++) {
        if (tileMap.getTile(col, row) === TileType.COIN) {
          tileMap.setTile(col, row, TileType.EMPTY);
          coins.push(new ProcMario.Items.Coin(col * TILE_SIZE, row * TILE_SIZE));
        }
      }
    }
    return coins;
  }

  // ── Initialize ──
  function init() {
    game = new ProcMario.Game();

    // Create renderer (sprite sheet)
    renderer = new ProcMario.Renderer(game.canvas);
    renderer.init();

    // Create audio manager
    audio = new ProcMario.AudioManager();

    // Load high scores
    try {
      var saved = localStorage.getItem('procmario_highscore');
      if (saved) highScore = parseInt(saved, 10) || 0;
      var savedList = localStorage.getItem('procmario_highscores');
      if (savedList) highScores = JSON.parse(savedList) || [];
    } catch (e) { /* ignore */ }

    // Initialize blocks system
    ProcMario.Blocks.init(game);

    // Wire game events to audio and systems
    wireEvents();

    // Hook into the engine's render event for HUD, backgrounds, screens
    hookRendering();

    // Attach tile rendering function
    connectTileRenderer();

    // Override the engine's update to manage game flow
    hookUpdate();

    // Start on title screen
    game.setState(State.TITLE);
    game.start();

    // Initialise virtual touch controls (mobile only — no-op on desktop)
    if (ProcMario.initTouchControls) {
      ProcMario.initTouchControls(game.input);
    }
  }

  // ── Hook into engine update ──
  // The engine's _tick calls: input.update() → this.update() → this.render()
  // The default update() only runs entities when state === PLAYING.
  // We replace update() to handle all states + transitions.
  function hookUpdate() {
    game.update = function() {
      // Audio init on first user interaction
      if (!audio.initialized) {
        if (game.input.isPressed('Enter') || game.input.isPressed('Space') ||
            game.input.isPressed('KeyZ')) {
          audio.init();
          audio.resume();
        }
      }

      // Controls help overlay toggle
      if (game.input.isPressed('KeyH') || game.input.isPressed('Slash')) {
        showControls = !showControls;
      }

      // Game speed toggle: Tab cycles 0.5x → 1x → 2x
      if (game.input.isPressed('Tab')) {
        var speeds = [0.5, 1, 2];
        var cur = speeds.indexOf(game.speedMultiplier);
        game.speedMultiplier = speeds[(cur + 1) % speeds.length];
      }

      // F3: toggle performance profiler overlay
      if (game.input.isPressed('F3')) {
        perf.showOverlay = !perf.showOverlay;
      }

      // Colorblind mode toggle: C cycles through off/protanopia/deuteranopia/tritanopia/high-contrast
      if (game.input.isPressed('KeyC')) {
        colorblindMode = (colorblindMode + 1) % CB_MODES.length;
        var mode = CB_MODES[colorblindMode];
        if (!_cbCanvas) _cbCanvas = document.getElementById('game-canvas');
        if (_cbCanvas) {
          _cbCanvas.style.filter = mode === 'off' ? '' : 'url(#cb-' + mode + ')';
        }
      }

      // Mute toggle
      if (game.input.isPressed('KeyM')) {
        if (!audio.initialized) { audio.init(); audio.resume(); }
        audio.toggleMute();
      }

      // Level intro overlay (blocks normal gameplay)
      if (levelIntro) {
        introTimer--;
        if (introTimer <= 0) {
          levelIntro = false;
          game.setState(State.PLAYING);
          audio.startMusic(currentTheme);
          if (currentTheme === 'underground') audio.startDripAmbience();
        }
        renderer.frameCount++;
        return;
      }

      // Death restart delay
      if (deathRestart) {
        stateTimer++;
        if (stateTimer >= DEATH_RESTART_DELAY) {
          deathRestart = false;
          if (game.lives > 0) {
            irisClose(function() { startLevel(currentSeed); irisOpen(); });
          } else {
            gameOver();
          }
        }
        renderer.frameCount++;
        return;
      }

      // Level advance delay
      if (levelAdvance) {
        stateTimer++;
        if (stateTimer >= LEVEL_COMPLETE_DELAY) {
          levelAdvance = false;
          currentSeed = ((currentSeed * 1664525 + 1013904223) >>> 0) % 99000 + 1000;
          levelNum++;
          // Sigmoid curve: easy early, steep ramp around level 8, near-max by level 14
          difficulty = 1 / (1 + Math.exp(-0.4 * (levelNum - 8)));
          // Record the new level seed for replay
          if (ProcMario.ReplayRecorder && ProcMario.ReplayRecorder.isRecording()) {
            ProcMario.ReplayRecorder.recordLevelSeed(currentSeed);
          }
          // Show world map before next level
          showWorldMap = true;
          worldMapTimer = WORLD_MAP_DURATION;
        }
        renderer.frameCount++;
        return;
      }

      // World map screen (shown between levels)
      if (showWorldMap) {
        worldMapTimer--;
        if (worldMapTimer <= 0 || game.input.isPressed('Enter') ||
            game.input.isPressed('Space') || game.input.isPressed('KeyZ') ||
            game.input.isPressed('TouchJump') || game.input.isPressed('TouchStart')) {
          showWorldMap = false;
          irisClose(function() { startLevel(currentSeed); irisOpen(); });
        }
        renderer.frameCount++;
        return;
      }

      // State-specific logic
      switch (game.state) {
        case State.TITLE:
          updateTitle();
          break;

        case State.PLAYING:
          updatePlaying();
          break;

        case State.PAUSED:
          updatePaused();
          break;

        case State.LEVEL_COMPLETE:
          // Entities still update (flagpole animation, etc.)
          updateEntities();
          break;

        case State.GAME_OVER:
          updateGameOver();
          break;
      }

      // Tick iris transition
      tickIris();

      renderer.frameCount++;
    };
  }

  // ── Title screen update ──
  function updateTitle() {
    if (seedInputActive) {
      // Accept digit keys (Digit0-Digit9)
      var digitKeys = ['Digit0','Digit1','Digit2','Digit3','Digit4',
                       'Digit5','Digit6','Digit7','Digit8','Digit9'];
      for (var di = 0; di < digitKeys.length; di++) {
        if (game.input.isPressed(digitKeys[di]) && seedInputBuffer.length < 6) {
          seedInputBuffer += '' + di;
        }
      }
      // Backspace to delete
      if (game.input.isPressed('Backspace') && seedInputBuffer.length > 0) {
        seedInputBuffer = seedInputBuffer.slice(0, -1);
      }
      // Enter to confirm seed, Escape to cancel
      if (game.input.isPressed('Enter') && seedInputBuffer.length > 0) {
        currentSeed = parseInt(seedInputBuffer, 10) || currentSeed;
        seedInputActive = false;
        seedInputBuffer = '';
        if (!audio.initialized) { audio.init(); audio.resume(); }
        levelNum = 1;
        difficulty = 1 / (1 + Math.exp(-0.4 * (1 - 8)));
        game.resetStats();
        irisClose(function() { startLevel(currentSeed); irisOpen(); });
      }
      if (game.input.isPressed('Escape')) {
        seedInputActive = false;
        seedInputBuffer = '';
      }
      return;
    }

    // Press T to type a custom seed
    if (game.input.isPressed('KeyT')) {
      seedInputActive = true;
      seedInputBuffer = '';
      return;
    }

    // Press R to watch the latest saved replay
    if (game.input.isPressed('KeyR') && ProcMario.ReplayPlayer) {
      var rd = ProcMario.ReplayPlayer.loadFromStorage(0);
      if (rd) {
        if (!audio.initialized) { audio.init(); audio.resume(); }
        ProcMario.ReplayPlayer.load(rd);
        _replayFrame = 0;
        currentSeed = rd.initialSeed;
        levelNum = 1;
        difficulty = 1 / (1 + Math.exp(-0.4 * (1 - 8)));
        game.resetStats();
        irisClose(function() { startLevel(currentSeed); irisOpen(); });
      }
      return;
    }

    if (game.input.isPressed('Enter') || game.input.isPressed('Space')) {
      if (!audio.initialized) { audio.init(); audio.resume(); }
      startNewGame();
    }
  }

  // ── Playing update ──
  function updatePlaying() {
    // Replay playback: inject saved inputs into the InputManager
    if (ProcMario.ReplayPlayer && ProcMario.ReplayPlayer.isActive()) {
      var rInputs = ProcMario.ReplayPlayer.getInputs(_replayFrame);
      if (rInputs) {
        // Override the InputManager convenience methods for this frame
        game.input._replayOverride = rInputs;
      } else {
        // Replay finished
        ProcMario.ReplayPlayer.stop();
        game.input._replayOverride = null;
      }
      _replayFrame++;
    } else {
      if (game.input) game.input._replayOverride = null;
      // Record inputs for replay
      if (ProcMario.ReplayRecorder && ProcMario.ReplayRecorder.isRecording() && game.input) {
        ProcMario.ReplayRecorder.recordFrame({
          left:     game.input.left(),
          right:    game.input.right(),
          jump:     game.input.jump(),
          jumpHeld: game.input.jumpHeld(),
          run:      game.input.run(),
          down:     game.input.down(),
          up:       game.input.up()
        });
      }
    }

    // Pause
    if (game.input.isPressed('KeyP') || game.input.isPressed('Escape')) {
      pauseMenuIndex = 0;
      game.setState(State.PAUSED);
      audio.stopDripAmbience();
      audio.stopMusic();
      return;
    }

    // Fireball / Iceball shooting
    if (game.player && !game.player._dying) {
      if (game.player.powerState === 'fire' &&
          (game.input.isPressed('KeyX') || game.input.isPressed('ShiftLeft'))) {
        ProcMario.Items.spawnFireball(game);
      } else if (game.player.powerState === 'ice' &&
          (game.input.isPressed('KeyX') || game.input.isPressed('ShiftLeft'))) {
        ProcMario.Items.spawnIceBall(game);
      }
    }

    // Update entities (physics, AI, collisions)
    updateEntities();

    // Camera follows player
    if (game.player && !game.player.dead) {
      game.camera.follow(game.player);
    }

    // Stream tilemap chunks: keep tiles near camera hot, evict distant ones
    if (_chunkManager && game.camera) {
      _chunkManager.update(game.camera.x);
    }

    // Countdown timer
    if (game.time > 0) {
      game._timeAccum = (game._timeAccum || 0) + 1;
      if (game._timeAccum >= 24) {
        game.time--;
        game._timeAccum = 0;
        if (game.time === 100) {
          game.events.emit('hurryUp');
        }
        if (game.time <= 0) {
          game.events.emit('timeUp');
        }
      }
    }

    // Reset combo when player lands (but keep display timer to show final count)
    if (game.player && game.player.onGround && comboCount > 0) {
      comboCount = 0;
    }

    // Tick combo display timer
    if (comboDisplayTimer > 0) comboDisplayTimer--;

    // Warp pipe detection: player presses Down while standing on a warp pipe
    if (game.player && game.player.onGround && game.input.down() && warpPipes.length > 0) {
      var p = game.player;
      for (var wpi = 0; wpi < warpPipes.length; wpi++) {
        var wp = warpPipes[wpi];
        // Check if player center is over the pipe top (within 1 tile)
        if (Math.abs((p.x + p.w / 2) - (wp.x + TILE_SIZE)) < TILE_SIZE &&
            Math.abs(p.y - wp.y) < TILE_SIZE * 2) {
          // Enter bonus room
          bonusRoomActive = true;
          bonusRoomTimer  = BONUS_ROOM_DURATION;
          audio.playCoin(); // entry sound
          break;
        }
      }
    }

    // Bonus room countdown
    if (bonusRoomActive) {
      bonusRoomTimer--;
      if (bonusRoomTimer <= 0) {
        bonusRoomActive = false;
        // Award coins
        for (var bci = 0; bci < BONUS_ROOM_COINS; bci++) {
          game.coins++;
          game.score += 200;
          if (game.coins >= 100) { game.coins -= 100; game.lives++; game.events.emit('1up'); }
        }
        audio.playCoin();
      }
    }
  }

  // ── Entity update (shared by PLAYING and LEVEL_COMPLETE) ──
  function updateEntities() {
    var t0 = performance.now();
    for (var i = game.entities.length - 1; i >= 0; i--) {
      var entity = game.entities[i];
      if (entity.dead) {
        game.entities.splice(i, 1);
        continue;
      }
      if (entity.update) {
        entity.update(game);
      }
    }
    perf.update('entityMs', performance.now() - t0);
  }

  // ── Paused update ──
  function updatePaused() {
    // Navigate menu
    if (game.input.isPressed('ArrowUp') || game.input.isPressed('KeyW')) {
      pauseMenuIndex = (pauseMenuIndex + 2) % 3; // wrap up
    }
    if (game.input.isPressed('ArrowDown') || game.input.isPressed('KeyS')) {
      pauseMenuIndex = (pauseMenuIndex + 1) % 3;
    }

    // Select
    if (game.input.isPressed('Enter') || game.input.isPressed('Space') ||
        game.input.isPressed('KeyZ')) {
      if (pauseMenuIndex === 0) { // Resume
        game.setState(State.PLAYING);
        audio.startMusic(currentTheme);
        if (currentTheme === 'underground') audio.startDripAmbience();
      } else if (pauseMenuIndex === 1) { // Restart Level
        game.setState(State.PLAYING);
        irisClose(function() { startLevel(currentSeed); irisOpen(); });
      } else { // Quit to Title
        audio.stopMusic();
        game.setState(State.TITLE);
      }
      pauseMenuIndex = 0;
      return;
    }

    // Quick resume with pause/escape
    if (game.input.isPressed('KeyP') || game.input.isPressed('Escape')) {
      game.setState(State.PLAYING);
      audio.startMusic(currentTheme);
      if (currentTheme === 'underground') audio.startDripAmbience();
      pauseMenuIndex = 0;
    }
  }

  // ── Game over update ──
  function updateGameOver() {
    if (game.input.isPressed('Enter') || game.input.isPressed('Space')) {
      startNewGame();
    }
  }

  // ── Hook rendering ──
  function hookRendering() {
    // The engine's render() clears screen, draws tilemap, draws entities,
    // then emits 'render' for overlays. We use 'render' for HUD/screens.
    game.events.on('render', function(ctx) {
      // Screen shake
      if (screenShake > 0) {
        ctx.save();
        var sx = (Math.random() - 0.5) * screenShake;
        var sy = (Math.random() - 0.5) * screenShake;
        ctx.translate(sx, sy);
        screenShake *= 0.85;
        if (screenShake < 0.5) screenShake = 0;
      }

      // Background (parallax clouds, hills, bushes) behind tiles
      // Note: engine render() draws sky and tilemap before entities.
      // We draw BG between sky and tiles by hooking here, but since the
      // engine already drew tilemap, we draw BG on a separate pre-render hook.
      // Actually, the 'render' event fires AFTER everything. So for backgrounds
      // we need a different approach. Let's draw them on the canvas before the
      // engine renders by patching the engine's render method.

      // For now, handle title/gameover/HUD/pause overlays here.
      if (game.state === State.TITLE) {
        renderer._renderTitleScreen();
        renderTitleExtras(ctx);
      } else if (game.state === State.GAME_OVER) {
        renderer._renderGameOver();
        renderGameOverExtras(ctx);
      }

      // Level intro overlay
      if (levelIntro) {
        var introThemeProps = ProcMario.THEME_PROPS[game.theme || 'overworld'];
        ctx.fillStyle = introThemeProps ? introThemeProps.introColor : '#000000';
        ctx.fillRect(0, 0, 256, 240);
        renderer._drawText('WORLD ' + levelNum, 96, 88, 1.5, '#FFFFFF');
        // Theme name (e.g. "UNDERGROUND")
        if (introThemeProps && introThemeProps.name) {
          renderer._drawText(introThemeProps.name, 128 - introThemeProps.name.length * 3, 108, 1, '#FCB404');
        }
        // Small mario icon + lives
        if (ProcMario.PixelArt) {
          ProcMario.PixelArt.drawSprite(ctx, 'idle', 'small', 100, 128, false, -1);
        }
        renderer._drawText('x ' + game.lives, 118, 134, 1, '#FFFFFF');
      }

      // HUD during gameplay
      if (game.state === State.PLAYING || game.state === State.PAUSED ||
          game.state === State.LEVEL_COMPLETE) {
        var worldNum = Math.ceil(levelNum / 4);
        var levelInWorld = ((levelNum - 1) % 4) + 1;
        var hudState = {
          score: game.score,
          coins: game.coins,
          lives: game.lives,
          time: game.time,
          worldSeed: 'W' + worldNum + '-' + levelInWorld
        };
        renderer._renderHUD(hudState);
      }

      // Speed multiplier indicator
      if (game.speedMultiplier !== 1) {
        var speedLabel = game.speedMultiplier === 0.5 ? '0.5X' : '2X';
        renderer._drawText(speedLabel, 230, 24, 1, '#FF6666');
      }

      // Colorblind mode indicator
      if (colorblindMode > 0) {
        renderer._drawText('CB:' + CB_LABELS[colorblindMode].substring(0, 5), 2, 24, 1, '#00FFDD');
      }

      // Replay indicators
      if (ProcMario.ReplayPlayer && ProcMario.ReplayPlayer.isActive()) {
        renderer._drawText('▶ REPLAY', 100, 230, 1, '#80E0FF');
      } else if (ProcMario.ReplayRecorder && ProcMario.ReplayRecorder.isRecording()) {
        if (renderer.frameCount % 60 < 30) { // blink every second
          renderer._drawText('● REC', 218, 230, 1, '#FF4040');
        }
      }

      // Performance profiler overlay (F3)
      if (perf.showOverlay) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(2, 34, 120, 44);
        renderer._drawText('TILE ' + perf.tileMs.toFixed(2) + 'MS', 6, 38, 1, '#44FF88');
        renderer._drawText('ENT  ' + perf.entityMs.toFixed(2) + 'MS', 6, 50, 1, '#44BBFF');
        renderer._drawText('ENTS ' + game.entities.length, 6, 62, 1, '#AAAAAA');
        renderer._drawText('F3=HIDE', 6, 74, 1, '#555555');
      }

      // Combo counter display
      if (comboDisplayTimer > 0 && comboCount >= 2) {
        var alpha = Math.min(1, comboDisplayTimer / 20);
        ctx.globalAlpha = alpha;
        var multiplier = Math.min(comboCount, 5);
        renderer._drawText('x' + multiplier + ' COMBO!', 82, 48, 1.5, '#FFD700');
        ctx.globalAlpha = 1;
      }

      // Pause overlay
      if (game.state === State.PAUSED) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, 256, 240);
        renderer._drawText('PAUSED', 98, 68, 1.5, '#FFFFFF');

        var menuItems = ['RESUME', 'RESTART LEVEL', 'QUIT TO TITLE'];
        for (var mi = 0; mi < menuItems.length; mi++) {
          var mColor = mi === pauseMenuIndex ? '#FCB404' : '#FFFFFF';
          var mX = 256 / 2 - menuItems[mi].length * 3;
          renderer._drawText(menuItems[mi], mX, 100 + mi * 20, 1, mColor);
          if (mi === pauseMenuIndex) {
            // Arrow indicator
            renderer._drawText('>', mX - 10, 100 + mi * 20, 1, '#FCB404');
          }
        }
        renderer._drawText('UP/DOWN TO SELECT  ENTER TO CONFIRM', 8, 210, 0.8, '#888888');
      }

      // Bonus room overlay (warp pipe mini-room)
      if (bonusRoomActive) {
        renderBonusRoom(ctx);
      }

      // World map overlay (shown between levels)
      if (showWorldMap) {
        renderWorldMap(ctx);
      }

      // Iris wipe overlay
      renderIris(ctx);

      // Controls overlay (drawn on top of everything, any state)
      if (showControls) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(20, 20, 216, 200);
        renderer._drawText('CONTROLS', 88, 28, 1.2, '#FCB404');
        var lines = [
          ['ARROWS / WASD', 'MOVE'],
          ['SPACE / Z',     'JUMP'],
          ['X / SHIFT',     'RUN / FIRE'],
          ['P / ESC',       'PAUSE'],
          ['TAB',           'SPEED 0.5/1/2X'],
          ['C',             'COLORBLIND MODE'],
          ['M',             'MUTE'],
          ['H / ?',         'THIS SCREEN'],
          ['ENTER',         'START / CONFIRM']
        ];
        for (var li = 0; li < lines.length; li++) {
          renderer._drawText(lines[li][0], 30, 50 + li * 18, 1, '#FFFFFF');
          renderer._drawText(lines[li][1], 158, 50 + li * 18, 1, '#FCB404');
        }
        renderer._drawText('PRESS H TO CLOSE', 70, 196, 0.9, '#888888');
      }

      // Restore screen shake
      if (screenShake > 0) {
        ctx.restore();
      }
    });

    // Patch the engine's render to add parallax backgrounds BEFORE tilemap.
    var originalRender = game.render.bind(game);
    game.render = function() {
      var ctx = game.ctx;

      // Clear with theme-appropriate sky colour (overworld uses day/night variant)
      var themeProps = ProcMario.THEME_PROPS[game.theme || 'overworld'];
      var skyColor = themeProps ? themeProps.skyColor : '#6b8cff';
      if ((game.theme || 'overworld') === 'overworld') {
        skyColor = renderer.daySkyColor || skyColor;
      }
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, 256, 240);

      if (game.state === State.PLAYING || game.state === State.PAUSED ||
          game.state === State.LEVEL_COMPLETE) {
        // Draw parallax backgrounds (theme-aware)
        renderer._renderBackgrounds(game.camera, game.theme);

        // Draw tilemap — profiled
        var t0 = performance.now();
        game.renderTilemap(ctx);
        perf.update('tileMs', performance.now() - t0);

        // Draw entities sorted by z-index
        var sorted = game.entities.slice().sort(function(a, b) {
          return (a.z || 0) - (b.z || 0);
        });
        for (var i = 0; i < sorted.length; i++) {
          var ent = sorted[i];
          if (ent.render && game.camera.isVisible(ent.x, ent.y, ent.w, ent.h)) {
            ent.render(ctx, game.camera);
          }
        }
      }

      // Emit 'render' for HUD/overlays
      game.events.emit('render', ctx);
    };
  }

  // Tile IDs that must NOT use the OffscreenCanvas cache (they animate)
  TILE_CACHE_SKIP[TileType.LAVA]       = true;
  TILE_CACHE_SKIP[TileType.WATER]      = true;
  TILE_CACHE_SKIP[TileType.QUESTION]   = true;
  TILE_CACHE_SKIP[TileType.COIN]       = true;

  // ── OffscreenCanvas tile cache helper ──
  function getCachedTile(tileId, ts, paintFn) {
    if (_tileCache[tileId]) return _tileCache[tileId];
    var oc;
    try {
      oc = new OffscreenCanvas(ts, ts);
    } catch (e) {
      // OffscreenCanvas unsupported — skip caching
      return null;
    }
    var octx = oc.getContext('2d');
    paintFn(octx, 0, 0, ts);
    _tileCache[tileId] = oc;
    return oc;
  }

  // ── Tile rendering using sprite sheet ──
  function connectTileRenderer() {
    // This function is attached to tilemap.renderTile and called by
    // engine.renderTilemap() for each visible tile.
    game._tileRenderFunc = function(ctx, tileId, sx, sy, ts) {
      if (!renderer.spriteSheet) {
        // Fallback
        ctx.fillStyle = tileId === 1 ? '#c84c0c' : '#e09c3c';
        ctx.fillRect(sx, sy, ts, ts);
        return;
      }

      var animFrame = Math.floor(renderer.frameCount / 15) % 4;
      var spriteName;

      // Special animated / inline-drawn tiles
      if (tileId === TileType.LAVA) {
        var lavaPhase = (Math.floor(renderer.frameCount / 8) + Math.floor(sx / ts)) % 3;
        var lavaColors = ['#FF4400', '#FF6600', '#FF2200'];
        ctx.fillStyle = lavaColors[lavaPhase];
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = lavaPhase === 1 ? '#FFAA00' : '#FF8800';
        ctx.fillRect(sx, sy, ts, 2);
        return;
      } else if (tileId === TileType.ICE) {
        ctx.fillStyle = '#A8DAFF';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#CCEDFF';
        ctx.fillRect(sx, sy, ts, 3);
        ctx.fillStyle = '#80C4F0';
        ctx.fillRect(sx, sy + 3, ts, ts - 3);
        return;
      } else if (tileId === TileType.NOTE_BLOCK) {
        ctx.fillStyle = '#E8C800';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, 3);
        ctx.fillRect(sx + 1, sy + ts - 4, ts - 2, 3);
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(sx + 6, sy + 4, 2, 6);
        ctx.fillRect(sx + 8, sy + 4, 2, 5);
        ctx.fillRect(sx + 6, sy + 9, 4, 2);
        ctx.fillRect(sx + 4, sy + 5, 3, 2);
        return;
      } else if (tileId === TileType.WATER) {
        var wavePhase = (Math.floor(renderer.frameCount / 10) + Math.floor(sx / ts)) % 4;
        var waterColors = ['#1E90FF', '#1874D2', '#2196F3', '#1565C0'];
        ctx.fillStyle = waterColors[wavePhase];
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(sx, sy + 2 + (wavePhase < 2 ? 0 : 1), ts, 2);
        return;
      } else if (tileId === TileType.VINE) {
        // Vine: dark green stalk with lighter cross-node
        ctx.fillStyle = '#1A6B00';
        ctx.fillRect(sx + 6, sy, 4, ts);       // vertical stalk
        ctx.fillStyle = '#2DA800';
        ctx.fillRect(sx + 5, sy + 1, 6, 3);    // top leaf node
        ctx.fillRect(sx + 4, sy + 7, 8, 2);    // mid leaf
        ctx.fillRect(sx + 5, sy + 12, 6, 3);   // bottom leaf
        return;
      } else if (tileId === TileType.QUESTION) {
        spriteName = 'question_' + animFrame;
      } else if (tileId === TileType.COIN) {
        spriteName = 'coin_frame' + (animFrame + 1);
      } else {
        var baseName = ProcMario.TILE_SPRITE_MAP[tileId];
        if (baseName) {
          // Prefer a theme-specific sprite when available
          var tProps = ProcMario.THEME_PROPS[game.theme || 'overworld'];
          var prefix = tProps ? tProps.tilePrefix : '';
          var themedName = prefix ? prefix + baseName : '';
          if (themedName && renderer.spriteSheet.sprites[themedName]) {
            spriteName = themedName;
          } else {
            spriteName = baseName;
          }
        }
      }

      if (spriteName) {
        // Try to serve from OffscreenCanvas cache for static sprite tiles
        if (!TILE_CACHE_SKIP[tileId]) {
          var cached = _tileCache[spriteName];
          if (!cached) {
            // Build the cache entry
            try {
              var oc = new OffscreenCanvas(ts, ts);
              var octx = oc.getContext('2d');
              ProcMario.drawSprite(octx, renderer.spriteSheet, spriteName, 0, 0, false);
              _tileCache[spriteName] = oc;
              cached = oc;
            } catch (e) {
              _tileCache[spriteName] = null; // mark unsupported
            }
          }
          if (cached) {
            ctx.drawImage(cached, sx, sy);
            return;
          }
        }
        ProcMario.drawSprite(ctx, renderer.spriteSheet, spriteName, sx, sy, false);
      } else {
        ctx.fillStyle = '#e09c3c';
        ctx.fillRect(sx, sy, ts, ts);
      }
    };
  }

  // ── Bonus room overlay ──
  function renderBonusRoom(ctx) {
    // Darkened translucent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 256, 240);

    // Room border
    ctx.fillStyle = '#444444';
    ctx.fillRect(20, 40, 216, 160);
    ctx.fillStyle = '#222222';
    ctx.fillRect(22, 42, 212, 156);

    renderer._drawText('BONUS ROOM!', 72, 54, 1.2, '#FCB404');

    // Draw coin icons in a grid
    var cols = 5, rows = 2;
    var coinSize = 16;
    var startX = 76, startY = 80;
    var coinsLeft = Math.ceil((bonusRoomTimer / BONUS_ROOM_DURATION) * BONUS_ROOM_COINS);
    var coinIdx = 0;
    for (var cr = 0; cr < rows; cr++) {
      for (var cc = 0; cc < cols; cc++) {
        var cx = startX + cc * 22;
        var cy = startY + cr * 22;
        if (coinIdx < coinsLeft) {
          // Coin still present: spinning animation
          var spinPhase = (Math.floor(renderer.frameCount / 6) + coinIdx) % 4;
          var coinColors = ['#FCB404', '#FCD844', '#FCB404', '#B87800'];
          ctx.fillStyle = coinColors[spinPhase];
        } else {
          // Collected coin: grey
          ctx.fillStyle = '#444444';
        }
        ctx.fillRect(cx, cy, coinSize, coinSize);
        coinIdx++;
      }
    }

    // Timer bar
    var barW = Math.floor((bonusRoomTimer / BONUS_ROOM_DURATION) * 200);
    ctx.fillStyle = '#333333';
    ctx.fillRect(28, 148, 200, 6);
    ctx.fillStyle = '#FCB404';
    ctx.fillRect(28, 148, barW, 6);

    renderer._drawText('+' + BONUS_ROOM_COINS + ' COINS AWARDED', 50, 160, 1, '#FCB404');
    renderer._drawText('EXIT IN ' + Math.ceil(bonusRoomTimer / 60) + 'S', 90, 174, 1, '#AAAAAA');
  }

  // ── World map screen ──
  function renderWorldMap(ctx) {
    // Full black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 240);

    renderer._drawText('WORLD MAP', 82, 10, 1.2, '#FCB404');

    var LEVELS_PER_WORLD = 4;
    var NUM_WORLDS = 4;
    var curWorld = Math.ceil(levelNum / LEVELS_PER_WORLD);
    var curLevelInWorld = ((levelNum - 1) % LEVELS_PER_WORLD) + 1;

    // Theme icons for each level position
    var themeIcons = ['O', 'U', 'S', 'C', 'I'];  // Overworld/Underground/Sky/Castle/Ice
    var themeColors = ['#44FF88', '#FFAA00', '#88CCFF', '#FF5544', '#AADDFF'];

    // Draw up to NUM_WORLDS worlds
    var nodeW = 40;
    var nodeH = 36;
    var startX = 16;
    var startY = 36;

    for (var w = 0; w < NUM_WORLDS; w++) {
      var wy = startY + w * (nodeH + 8);

      // World label
      renderer._drawText('W' + (w + 1), startX, wy + 14, 1, '#AAAAAA');

      for (var l = 0; l < LEVELS_PER_WORLD; l++) {
        var absLevel = w * LEVELS_PER_WORLD + l + 1;
        var nx = startX + 22 + l * nodeW;
        var ny = wy;
        var isCompleted = absLevel < levelNum;
        var isCurrent   = absLevel === levelNum;

        // Connector line to next node
        if (l < LEVELS_PER_WORLD - 1) {
          ctx.fillStyle = isCompleted ? '#44AA44' : '#333333';
          ctx.fillRect(nx + 12, ny + 10, nodeW - 12, 2);
        }

        // Node circle (14×14 box as approximation)
        var nodeColor = isCompleted ? '#44AA44' : (isCurrent ? '#FCB404' : '#333333');
        ctx.fillStyle = nodeColor;
        ctx.fillRect(nx, ny + 4, 12, 12);

        // Theme icon inside the node
        var themeIdx = (absLevel - 1) % themeIcons.length;
        var iconColor = isCurrent ? '#000000' : (isCompleted ? '#FFFFFF' : '#555555');
        renderer._drawText(themeIcons[themeIdx], nx + 1, ny + 5, 0.8, iconColor);

        // Level label below node
        var labelColor = isCurrent ? '#FCB404' : (isCompleted ? '#888888' : '#444444');
        renderer._drawText('' + absLevel, nx + 3, ny + 18, 1, labelColor);

        // Blinking cursor on current level
        if (isCurrent && Math.floor(renderer.frameCount / 15) % 2 === 0) {
          ctx.fillStyle = '#FCB404';
          ctx.fillRect(nx - 2, ny + 2, 16, 16);
          ctx.fillStyle = '#000000';
          ctx.fillRect(nx, ny + 4, 12, 12);
          renderer._drawText(themeIcons[themeIdx], nx + 1, ny + 5, 0.8, '#FCB404');
        }
      }
    }

    // Legend
    renderer._drawText('O=OVERWORLD  U=UNDERGROUND', 18, 200, 0.9, '#666666');
    renderer._drawText('S=SKY  C=CASTLE  I=ICE', 38, 210, 0.9, '#666666');

    // "Press any key" prompt (blinking)
    if (Math.floor(renderer.frameCount / 30) % 2 === 0) {
      renderer._drawText('PRESS JUMP TO CONTINUE', 42, 226, 1, '#FFFFFF');
    }
  }

  // ── Title extras ──
  function renderTitleExtras(ctx) {
    if (highScores.length > 0) {
      renderer._drawText('TOP SCORES', 92, 90, 1, '#FCB404');
      for (var hi = 0; hi < highScores.length; hi++) {
        var hs = highScores[hi];
        var hsText = (hi + 1) + '. ' + padLeft(hs.score, 6) + '  ' + hs.seed;
        renderer._drawText(hsText, 56, 102 + hi * 12, 1, hi === 0 ? '#FCB404' : '#FFFFFF');
      }
    } else if (highScore > 0) {
      renderer._drawText('HIGH SCORE ' + highScore, 68, 90, 1, '#FCB404');
    }
    if (seedInputActive) {
      renderer._drawText('ENTER SEED:', 76, 168, 1, '#FCB404');
      var displaySeed = seedInputBuffer.length > 0 ? seedInputBuffer : '_';
      renderer._drawText(displaySeed + '_', 148, 168, 1, '#FFFFFF');
      renderer._drawText('ENTER=START  ESC=CANCEL', 52, 180, 1, '#888888');
    } else {
      renderer._drawText('SEED ' + currentSeed, 100, 168, 1, '#A0A0A0');
      renderer._drawText('T=CUSTOM SEED  H=CONTROLS', 44, 180, 1, '#888888');
      // Show replay hint if a saved replay exists
      if (ProcMario.ReplayPlayer) {
        var storedReplays = ProcMario.ReplayPlayer.getStoredReplays();
        if (storedReplays.length > 0) {
          renderer._drawText('R=WATCH REPLAY', 76, 192, 1, '#80E0FF');
        }
      }
    }
  }

  function padLeft(n, len) {
    var s = '' + n;
    while (s.length < len) s = '0' + s;
    return s;
  }

  // ── Game over extras ──
  function renderGameOverExtras(ctx) {
    renderer._drawText('SCORE ' + game.score, 88, 135, 1, '#FCB404');
    if (Math.floor(renderer.frameCount / 30) % 2 === 0) {
      renderer._drawText('PRESS ENTER', 84, 170, 1, '#FFFFFF');
    }
  }

  // ── Wire game events to audio and systems ──
  function wireEvents() {
    game.events.on('playerDied', function() {
      audio.playDeath();
      audio.stopDripAmbience();
      audio.stopMusic();
      stateTimer = 0;
      deathRestart = true;
    });

    game.events.on('levelComplete', function() {
      audio.stopDripAmbience();
      audio.stopMusic();
      audio.playFlagpole();
      var timeBonus = game.time * TIME_BONUS_PER_TICK;
      game.score += timeBonus;
      stateTimer = 0;
      levelAdvance = true;
    });

    game.events.on('coinCollected', function(data) {
      if (data && data.x !== undefined && audio.initialized) {
        var camCenterX = game.camera.x + 128;
        audio.playSpatial('coin', data.x, camCenterX);
        renderer.spawnCoinBurst(data.x, data.y);
      } else {
        audio.playCoin();
      }
    });

    game.events.on('1up', function() {
      audio.play1UpJingle();
    });

    game.events.on('blockBump', function() {
      audio.playBump();
      screenShake = 2;
    });

    game.events.on('brickBroken', function(data) {
      audio.playBreak();
      screenShake = 3;
      if (data && data.col !== undefined) {
        renderer.spawnBlockBreak(data.col * TILE_SIZE, data.row * TILE_SIZE);
      }
    });

    game.events.on('enemyKilled', function(data) {
      audio.playStomp();
      if (data && data.style === 'stomp') {
        comboCount++;
        comboDisplayTimer = 90; // show combo for 1.5 seconds
        var scores = [100, 200, 400, 800, 1000];
        var extra = scores[Math.min(comboCount - 1, scores.length - 1)] - 100;
        if (extra > 0) game.score += extra;
      }
    });

    game.events.on('playerPowerUp', function(data) {
      if (data && data.type === 'star') {
        audio.startStarMusic(currentTheme);
      } else {
        audio.playPowerUpJingle();
      }
    });

    game.events.on('starPowerEnd', function() {
      audio.stopStarMusic();
    });

    game.events.on('playerDamage', function() {
      audio.playBump();
    });

    game.events.on('fireballThrown', function() {
      audio.playFireball();
    });

    game.events.on('shellKicked', function() {
      audio.playStomp();
    });

    game.events.on('timeUp', function() {
      if (game.player && !game.player._dying) {
        game.player.die(game);
      }
    });

    game.events.on('hurryUp', function() {
      audio.setHurryUp(true);
    });

    game.events.on('playerLanded', function(data) {
      if (data) renderer.spawnLandingDust(data.x, data.y);
    });

    game.events.on('stateChange', function() {
      comboCount = 0;
    });
  }

  // ── Start new game ──
  function startNewGame() {
    // Randomize base seed so every playthrough generates different levels
    currentSeed = Math.floor(Math.random() * 99000) + 1000;
    levelNum = 1;
    difficulty = 1 / (1 + Math.exp(-0.4 * (1 - 8))); // sigmoid at level 1 ≈ 0.057
    game.resetStats();
    // Start recording this run
    if (ProcMario.ReplayRecorder) {
      ProcMario.ReplayRecorder.start(currentSeed);
      _replayFrame = 0;
    }
    irisClose(function() { startLevel(currentSeed); irisOpen(); });
  }

  // ── Start/Restart a level ──
  function startLevel(seed) {
    audio.stopMusic();

    // Clear state
    game.clearEntities();
    game.player = null;
    deathRestart = false;
    levelAdvance = false;
    comboCount = 0;

    // Invalidate OffscreenCanvas tile cache (theme may have changed)
    _tileCache = {};
    warpPipes = [];
    bonusRoomActive = false;

    // Determine and store theme for this level
    currentTheme = ProcMario.getThemeForLevel(levelNum);
    game.theme   = currentTheme;

    // Generate level with theme
    var gen = new ProcMario.LevelGenerator(seed, difficulty, currentTheme);
    gen.levelNum = levelNum;
    levelData = gen.generate();

    // Adapt tilemap for engine/physics
    var adapted = adaptTilemap(levelData.tileMap);
    game.loadLevel(adapted);

    // Attach sprite-based tile renderer
    game.tilemap.renderTile = game._tileRenderFunc;

    // Initialize chunk streaming manager (keeps tiles near camera hot, evicts distant chunks)
    if (ProcMario.ChunkManager) {
      _chunkManager = new ProcMario.ChunkManager(game.tilemap);
    }

    // Generate background decorations (theme-specific)
    renderer.generateBackground(levelData.width * TILE_SIZE, currentTheme);
    renderer.particles = [];
    renderer.popups = [];
    renderer.coinPops = [];

    // Register block contents
    ProcMario.Blocks.clearRegistry();
    ProcMario.Blocks.registerFromLevelData(levelData.entities);

    // Convert coin tiles to coin entities
    var coinEntities = collectCoinTiles(levelData.tileMap);
    for (var c = 0; c < coinEntities.length; c++) {
      game.addEntity(coinEntities[c]);
    }

    // Spawn enemies and moving platforms
    for (var i = 0; i < levelData.entities.length; i++) {
      var ent = levelData.entities[i];
      if (ent.type === 'goomba' || ent.type === 'koopa' || ent.type === 'piranha' ||
          ent.type === 'buzzy' || ent.type === 'hammerbro' || ent.type === 'cheep' ||
          ent.type === 'lakitu' || ent.type === 'spiny' || ent.type === 'bowser') {
        var enemy = ProcMario.Enemies.createFromData(ent);
        if (enemy) game.addEntity(enemy);
      } else if (ent.type === 'moving_platform') {
        var platform = new ProcMario.Objects.MovingPlatform(ent.x, ent.y, ent.w, ent.moveType, ent.range);
        game.addEntity(platform);
      } else if (ent.type === 'warp_pipe') {
        // Store warp pipe position in world pixels for detection
        warpPipes.push({ x: ent.x * TILE_SIZE, y: ent.y * TILE_SIZE });
      }
    }

    // Create player
    var playerY = (GROUND_Y - 1) * TILE_SIZE;
    var player = new ProcMario.Player(PLAYER_START_X, playerY);
    game.player = player;
    game.addEntity(player);

    // Re-init blocks to hook onBumpBlock on new player
    ProcMario.Blocks.init(game);
    ProcMario.Blocks.registerFromLevelData(levelData.entities);

    // Create flagpole
    var flagpole = ProcMario.Objects.createFlagpole(game);
    if (flagpole) game.addEntity(flagpole);

    // Snap camera to player
    game.camera.snapTo(player);

    // Fire playerSpawned event
    game.events.emit('playerSpawned', { player: player });

    // Show level intro
    levelIntro = true;
    introTimer = LEVEL_INTRO_DURATION;
    stateTimer = 0;

    // Update high score
    updateHighScore();
  }

  // ── Iris wipe helpers ──
  function irisClose(onClosed) {
    irisState = 'closing';
    irisTimer = 0;
    irisCallback = onClosed;
  }

  function irisOpen() {
    irisState = 'opening';
    irisTimer = 0;
    irisCallback = null;
  }

  function tickIris() {
    if (irisState === 'none') return;
    irisTimer++;
    if (irisState === 'closing' && irisTimer >= IRIS_FRAMES) {
      irisState = 'none';
      if (irisCallback) { irisCallback(); irisCallback = null; }
    } else if (irisState === 'opening' && irisTimer >= IRIS_FRAMES) {
      irisState = 'none';
    }
  }

  function renderIris(ctx) {
    if (irisState === 'none') return;
    var progress = irisTimer / IRIS_FRAMES;
    // closing → circle shrinks to 0; opening → circle grows from 0
    var t = irisState === 'closing' ? 1 - progress : progress;
    var maxR = Math.sqrt(128 * 128 + 120 * 120) + 4; // corner distance
    var r = t * maxR;
    if (r <= 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 240);
      return;
    }
    // Draw black mask with circular hole using composite
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.rect(0, 0, 256, 240);
    ctx.arc(128, 120, r, 0, Math.PI * 2, true); // clockwise hole
    ctx.fill('evenodd');
    ctx.restore();
  }

  // ── Game over ──
  function gameOver() {
    game.setState(State.GAME_OVER);
    audio.playGameOver();
    updateHighScore();
    // Stop recording and save the replay
    if (ProcMario.ReplayRecorder && ProcMario.ReplayRecorder.isRecording()) {
      var label = 'W' + Math.ceil(levelNum / 4) + ' Score ' + game.score;
      ProcMario.ReplayRecorder.stop(label);
    }
  }

  // ── High score ──
  function updateHighScore() {
    if (game.score > highScore) {
      highScore = game.score;
      try { localStorage.setItem('procmario_highscore', '' + highScore); } catch (e) {}
    }
    // Update top-5 table
    if (game.score > 0) {
      highScores.push({ score: game.score, seed: currentSeed });
      highScores.sort(function(a, b) { return b.score - a.score; });
      if (highScores.length > 5) highScores.length = 5;
      try { localStorage.setItem('procmario_highscores', JSON.stringify(highScores)); } catch (e) {}
    }
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
