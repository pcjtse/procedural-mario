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
  var currentSeed = 1;
  var levelNum = 1;   // tracks level count for difficulty scaling
  var difficulty = 0;
  var levelData = null;
  var stateTimer = 0;
  var highScore = 0;
  var comboCount = 0;
  var screenShake = 0;
  var levelIntro = false;
  var introTimer = 0;
  var deathRestart = false;
  var levelAdvance = false;

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

    // Load high score
    try {
      var saved = localStorage.getItem('procmario_highscore');
      if (saved) highScore = parseInt(saved, 10) || 0;
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
          audio.startMusic();
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
            startLevel(currentSeed);
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
          difficulty = Math.min(1.0, 0.15 + levelNum * 0.1);
          startLevel(currentSeed);
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

      renderer.frameCount++;
    };
  }

  // ── Title screen update ──
  function updateTitle() {
    if (game.input.isPressed('Enter') || game.input.isPressed('Space')) {
      if (!audio.initialized) { audio.init(); audio.resume(); }
      startNewGame();
    }
  }

  // ── Playing update ──
  function updatePlaying() {
    // Pause
    if (game.input.isPressed('KeyP') || game.input.isPressed('Escape')) {
      game.setState(State.PAUSED);
      audio.stopMusic();
      return;
    }

    // Fireball
    if (game.player && game.player.powerState === 'fire' && !game.player._dying) {
      if (game.input.isPressed('KeyX') || game.input.isPressed('ShiftLeft')) {
        ProcMario.Items.spawnFireball(game);
      }
    }

    // Update entities (physics, AI, collisions)
    updateEntities();

    // Camera follows player
    if (game.player && !game.player.dead) {
      game.camera.follow(game.player);
    }

    // Countdown timer
    if (game.time > 0) {
      game._timeAccum = (game._timeAccum || 0) + 1;
      if (game._timeAccum >= 24) {
        game.time--;
        game._timeAccum = 0;
        if (game.time <= 0) {
          game.events.emit('timeUp');
        }
      }
    }

    // Reset combo when player lands
    if (game.player && game.player.onGround) {
      comboCount = 0;
    }
  }

  // ── Entity update (shared by PLAYING and LEVEL_COMPLETE) ──
  function updateEntities() {
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
  }

  // ── Paused update ──
  function updatePaused() {
    if (game.input.isPressed('KeyP') || game.input.isPressed('Escape')) {
      game.setState(State.PLAYING);
      audio.startMusic();
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
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 240);
        renderer._drawText('WORLD ' + currentSeed, 88, 100, 1.5, '#FFFFFF');
        // Small mario icon + lives
        if (ProcMario.PixelArt) {
          ProcMario.PixelArt.drawSprite(ctx, 'idle', 'small', 100, 122, false, -1);
        }
        renderer._drawText('x ' + game.lives, 118, 128, 1, '#FFFFFF');
      }

      // HUD during gameplay
      if (game.state === State.PLAYING || game.state === State.PAUSED ||
          game.state === State.LEVEL_COMPLETE) {
        var hudState = {
          score: game.score,
          coins: game.coins,
          lives: game.lives,
          time: game.time,
          worldSeed: '' + levelNum
        };
        renderer._renderHUD(hudState);
      }

      // Pause overlay
      if (game.state === State.PAUSED) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 256, 240);
        renderer._drawText('PAUSED', 100, 112, 1.5, '#FFFFFF');
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

      // Clear with sky
      ctx.fillStyle = '#6b8cff';
      ctx.fillRect(0, 0, 256, 240);

      if (game.state === State.PLAYING || game.state === State.PAUSED ||
          game.state === State.LEVEL_COMPLETE) {
        // Draw parallax backgrounds
        renderer._renderBackgrounds(game.camera);

        // Draw tilemap
        game.renderTilemap(ctx);

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

      if (tileId === TileType.QUESTION) {
        spriteName = 'question_' + animFrame;
      } else if (tileId === TileType.COIN) {
        spriteName = 'coin_frame' + (animFrame + 1);
      } else {
        spriteName = ProcMario.TILE_SPRITE_MAP[tileId];
      }

      if (spriteName) {
        ProcMario.drawSprite(ctx, renderer.spriteSheet, spriteName, sx, sy, false);
      } else {
        ctx.fillStyle = '#e09c3c';
        ctx.fillRect(sx, sy, ts, ts);
      }
    };
  }

  // ── Title extras ──
  function renderTitleExtras(ctx) {
    if (highScore > 0) {
      renderer._drawText('HIGH SCORE ' + highScore, 68, 90, 1, '#FCB404');
    }
    renderer._drawText('SEED ' + currentSeed, 100, 160, 1, '#A0A0A0');
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
      audio.stopMusic();
      stateTimer = 0;
      deathRestart = true;
    });

    game.events.on('levelComplete', function() {
      audio.stopMusic();
      audio.playFlagpole();
      var timeBonus = game.time * TIME_BONUS_PER_TICK;
      game.score += timeBonus;
      stateTimer = 0;
      levelAdvance = true;
    });

    game.events.on('coinCollected', function() {
      audio.playCoin();
    });

    game.events.on('1up', function() {
      audio.play1Up();
    });

    game.events.on('blockBump', function() {
      audio.playBump();
      screenShake = 2;
    });

    game.events.on('brickBroken', function() {
      audio.playBreak();
      screenShake = 3;
    });

    game.events.on('enemyKilled', function(data) {
      audio.playStomp();
      if (data && data.style === 'stomp') {
        comboCount++;
        var scores = [100, 200, 400, 800, 1000];
        var extra = scores[Math.min(comboCount - 1, scores.length - 1)] - 100;
        if (extra > 0) game.score += extra;
      }
    });

    game.events.on('playerPowerUp', function() {
      audio.playPowerUp();
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

    game.events.on('stateChange', function() {
      comboCount = 0;
    });
  }

  // ── Start new game ──
  function startNewGame() {
    // Randomize base seed so every playthrough generates different levels
    currentSeed = Math.floor(Math.random() * 99000) + 1000;
    levelNum = 1;
    difficulty = 0.15;
    game.resetStats();
    startLevel(currentSeed);
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

    // Generate level
    var gen = new ProcMario.LevelGenerator(seed, difficulty);
    levelData = gen.generate();

    // Adapt tilemap for engine/physics
    var adapted = adaptTilemap(levelData.tileMap);
    game.loadLevel(adapted);

    // Attach sprite-based tile renderer
    game.tilemap.renderTile = game._tileRenderFunc;

    // Generate background decorations
    renderer.generateBackground(levelData.width * TILE_SIZE);
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

    // Spawn enemies
    for (var i = 0; i < levelData.entities.length; i++) {
      var ent = levelData.entities[i];
      if (ent.type === 'goomba' || ent.type === 'koopa' || ent.type === 'piranha') {
        var enemy = ProcMario.Enemies.createFromData(ent);
        if (enemy) game.addEntity(enemy);
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

  // ── Game over ──
  function gameOver() {
    game.setState(State.GAME_OVER);
    audio.playGameOver();
    updateHighScore();
  }

  // ── High score ──
  function updateHighScore() {
    if (game.score > highScore) {
      highScore = game.score;
      try {
        localStorage.setItem('procmario_highscore', '' + highScore);
      } catch (e) { /* ignore */ }
    }
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
