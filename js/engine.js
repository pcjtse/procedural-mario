(function() {
  'use strict';

  // ── Constants ──
  var NATIVE_WIDTH = 256;
  var NATIVE_HEIGHT = 240;
  var SCALE = 3;
  var TARGET_FPS = 60;
  var FRAME_TIME = 1000 / TARGET_FPS;

  // ── Game States ──
  var State = {
    TITLE: 'title',
    PLAYING: 'playing',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over',
    PAUSED: 'paused'
  };

  // ── Input Manager ──
  function InputManager() {
    this.keys = {};       // currently held keys
    this.pressed = {};    // keys pressed this frame (edge-triggered)
    this._justPressed = {};

    // Gamepad state (polled each frame via Web Gamepad API)
    this._gp = {
      left: false, right: false, up: false, down: false,
      jump: false, run: false, start: false,
      // previous-frame state for edge detection
      _prevJump: false, _prevStart: false
    };

    // Touch state (updated by touch.js virtual D-pad / buttons)
    this._touch = {
      left: false, right: false, up: false, down: false,
      jump: false, run: false, start: false,
      _prevJump: false, _prevStart: false
    };

    // Replay override: when set, convenience methods return these values instead of live input
    this._replayOverride = null;

    var self = this;
    document.addEventListener('keydown', function(e) {
      if (!self.keys[e.code]) {
        self._justPressed[e.code] = true;
      }
      self.keys[e.code] = true;
      // Prevent scrolling with game keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab','F3'].indexOf(e.code) !== -1) {
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', function(e) {
      self.keys[e.code] = false;
      self._justPressed[e.code] = false;
    });
  }

  InputManager.prototype.update = function() {
    // Copy justPressed to pressed, then clear justPressed
    for (var key in this.pressed) {
      this.pressed[key] = false;
    }
    for (var key in this._justPressed) {
      if (this._justPressed[key]) {
        this.pressed[key] = true;
        this._justPressed[key] = false;
      }
    }

    // Poll Web Gamepad API (standard mapping)
    this._pollGamepad();

    // Synthesise touch edge events
    var tc = this._touch;
    if (tc.jump  && !tc._prevJump)  { this.pressed['TouchJump']  = true; }
    if (tc.start && !tc._prevStart) { this.pressed['TouchStart'] = true; }
    tc._prevJump  = tc.jump;
    tc._prevStart = tc.start;
  };

  InputManager.prototype._pollGamepad = function() {
    var gp = this._gp;
    var prevJump  = gp.jump;
    var prevStart = gp.start;

    // Reset current state
    gp.left = gp.right = gp.up = gp.down = false;
    gp.jump = gp.run = gp.start = false;

    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var gi = 0; gi < gamepads.length; gi++) {
      var pad = gamepads[gi];
      if (!pad || !pad.connected) continue;

      // D-pad (buttons 12-15) and left analogue stick (axes 0 & 1)
      var axisX = pad.axes[0] || 0;
      var axisY = pad.axes[1] || 0;
      gp.left  = gp.left  || axisX < -0.5 || (pad.buttons[14] && pad.buttons[14].pressed);
      gp.right = gp.right || axisX >  0.5 || (pad.buttons[15] && pad.buttons[15].pressed);
      gp.up    = gp.up    || axisY < -0.5 || (pad.buttons[12] && pad.buttons[12].pressed);
      gp.down  = gp.down  || axisY >  0.5 || (pad.buttons[13] && pad.buttons[13].pressed);

      // A=0 (jump), B=1/X=2 (run), bumpers=4/5 (run), Start=9 (pause/confirm)
      gp.jump  = gp.jump  || (pad.buttons[0] && pad.buttons[0].pressed);
      gp.run   = gp.run   || (pad.buttons[1] && pad.buttons[1].pressed) ||
                             (pad.buttons[2] && pad.buttons[2].pressed) ||
                             (pad.buttons[4] && pad.buttons[4].pressed) ||
                             (pad.buttons[5] && pad.buttons[5].pressed);
      gp.start = gp.start || (pad.buttons[9] && pad.buttons[9].pressed);
      break; // use first connected gamepad
    }

    // Synthesise edge-triggered press events into the pressed map
    if (gp.jump  && !prevJump)  { this.pressed['GamepadJump']  = true; }
    if (gp.start && !prevStart) { this.pressed['GamepadStart'] = true; }
    if (gp.up    && !gp._prevUp)    { this.pressed['GamepadUp']   = true; }
    if (gp.down  && !gp._prevDown)  { this.pressed['GamepadDown'] = true; }
    gp._prevUp   = gp.up;
    gp._prevDown = gp.down;
  };

  InputManager.prototype.isDown = function(code) {
    return !!this.keys[code];
  };

  InputManager.prototype.isPressed = function(code) {
    return !!this.pressed[code];
  };

  // Convenience: check movement / action keys (keyboard + gamepad + touch)
  InputManager.prototype.left = function() {
    if (this._replayOverride) return this._replayOverride.left;
    return this.isDown('ArrowLeft') || this.isDown('KeyA') || this._gp.left || this._touch.left;
  };
  InputManager.prototype.right = function() {
    if (this._replayOverride) return this._replayOverride.right;
    return this.isDown('ArrowRight') || this.isDown('KeyD') || this._gp.right || this._touch.right;
  };
  InputManager.prototype.up = function() {
    if (this._replayOverride) return this._replayOverride.up;
    return this.isDown('ArrowUp') || this.isDown('KeyW') || this._gp.up || this._touch.up;
  };
  InputManager.prototype.down = function() {
    if (this._replayOverride) return this._replayOverride.down;
    return this.isDown('ArrowDown') || this.isDown('KeyS') || this._gp.down || this._touch.down;
  };
  InputManager.prototype.jump = function() {
    if (this._replayOverride) return this._replayOverride.jump;
    return this.isPressed('Space') || this.isPressed('KeyZ') ||
           this.isPressed('GamepadJump') || this.isPressed('TouchJump');
  };
  InputManager.prototype.jumpHeld = function() {
    if (this._replayOverride) return this._replayOverride.jumpHeld;
    return this.isDown('Space') || this.isDown('KeyZ') || this._gp.jump || this._touch.jump;
  };
  InputManager.prototype.run = function() {
    if (this._replayOverride) return this._replayOverride.run;
    return this.isDown('KeyX') || this.isDown('ShiftLeft') || this._gp.run || this._touch.run;
  };
  // Gamepad/Touch Start = Enter (for menus)
  InputManager.prototype.isPressed = function(code) {
    if (code === 'Enter' && (this.pressed['GamepadStart'] || this.pressed['TouchStart'])) return true;
    return !!this.pressed[code];
  };

  // ── Event System ──
  function EventBus() {
    this._listeners = {};
  }

  EventBus.prototype.on = function(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  };

  EventBus.prototype.off = function(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(function(cb) {
      return cb !== callback;
    });
  };

  EventBus.prototype.emit = function(event, data) {
    if (!this._listeners[event]) return;
    var listeners = this._listeners[event].slice();
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](data);
    }
  };

  // ── Game Engine ──
  function Game() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set native resolution
    this.canvas.width = NATIVE_WIDTH;
    this.canvas.height = NATIVE_HEIGHT;

    // Disable image smoothing for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;

    // Systems
    this.input = new InputManager();
    this.events = new EventBus();
    this.camera = new ProcMario.Camera(NATIVE_WIDTH, NATIVE_HEIGHT);

    // State
    this.state = State.TITLE;
    this.entities = [];
    this.tilemap = null;
    this.player = null;

    // Timing
    this._lastTime = 0;
    this._accumulator = 0;
    this._running = false;
    this._rafId = null;
    this.speedMultiplier = 1; // 0.5x, 1x, or 2x

    // Stats
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.time = 400;
    this.level = '1-1';
  }

  Game.prototype.start = function() {
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    var self = this;
    function loop(timestamp) {
      if (!self._running) return;
      self._tick(timestamp);
      self._rafId = requestAnimationFrame(loop);
    }
    this._rafId = requestAnimationFrame(loop);
  };

  Game.prototype.stop = function() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  };

  Game.prototype._tick = function(timestamp) {
    var delta = timestamp - this._lastTime;
    this._lastTime = timestamp;

    // Apply speed multiplier (0.5x slow, 2x fast)
    delta *= (this.speedMultiplier || 1);

    // Cap delta to prevent spiral of death
    if (delta > 200) delta = 200;

    this._accumulator += delta;

    // Fixed timestep updates
    while (this._accumulator >= FRAME_TIME) {
      this.input.update();
      this.update();
      this._accumulator -= FRAME_TIME;
    }

    this.render();
  };

  Game.prototype.update = function() {
    if (this.state !== State.PLAYING) return;

    // Update all entities
    for (var i = this.entities.length - 1; i >= 0; i--) {
      var entity = this.entities[i];
      if (entity.dead) {
        this.entities.splice(i, 1);
        continue;
      }
      if (entity.update) {
        entity.update(this);
      }
    }

    // Camera follows player
    if (this.player && !this.player.dead) {
      this.camera.follow(this.player);
    }

    // Countdown timer
    if (this.time > 0) {
      this._timeAccum = (this._timeAccum || 0) + 1;
      if (this._timeAccum >= 24) { // roughly 2.5 seconds per tick at 60fps
        this.time--;
        this._timeAccum = 0;
        if (this.time <= 0) {
          this.events.emit('timeUp');
        }
      }
    }
  };

  Game.prototype.render = function() {
    var ctx = this.ctx;

    // Clear with sky blue
    ctx.fillStyle = '#6b8cff';
    ctx.fillRect(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);

    if (this.state === State.PLAYING || this.state === State.PAUSED || this.state === State.LEVEL_COMPLETE) {
      // Render tilemap
      this.renderTilemap(ctx);

      // Render entities (sorted by z-index)
      var sortedEntities = this.entities.slice().sort(function(a, b) {
        return (a.z || 0) - (b.z || 0);
      });
      for (var i = 0; i < sortedEntities.length; i++) {
        var entity = sortedEntities[i];
        if (entity.render && this.camera.isVisible(entity.x, entity.y, entity.w, entity.h)) {
          entity.render(ctx, this.camera);
        }
      }
    }

    // Let external renderers draw (HUD, title screen, etc.)
    this.events.emit('render', ctx);
  };

  Game.prototype.renderTilemap = function(ctx) {
    if (!this.tilemap || !this.tilemap.data) return;

    var ts = ProcMario.Physics.TILE_SIZE;
    var range = this.camera.getVisibleTileRange(ts);
    var renderTile = this.tilemap.renderTile;

    for (var row = range.startRow; row < range.endRow && row < this.tilemap.height; row++) {
      for (var col = range.startCol; col < range.endCol && col < this.tilemap.width; col++) {
        var tileId = this.tilemap.data[row * this.tilemap.width + col];
        if (tileId === 0) continue;

        var screenPos = this.camera.worldToScreen(col * ts, row * ts);
        if (renderTile) {
          renderTile(ctx, tileId, screenPos.x, screenPos.y, ts);
        } else {
          // Fallback: colored rectangles
          ctx.fillStyle = tileId === 1 ? '#c84c0c' : '#e09c3c';
          ctx.fillRect(screenPos.x, screenPos.y, ts, ts);
        }
      }
    }
  };

  // ── Entity Management ──
  Game.prototype.addEntity = function(entity) {
    this.entities.push(entity);
    return entity;
  };

  Game.prototype.removeEntity = function(entity) {
    entity.dead = true;
  };

  Game.prototype.getEntitiesByType = function(type) {
    return this.entities.filter(function(e) {
      return e.type === type && !e.dead;
    });
  };

  Game.prototype.clearEntities = function() {
    this.entities = [];
  };

  // ── State Management ──
  Game.prototype.setState = function(newState) {
    var oldState = this.state;
    this.state = newState;
    this.events.emit('stateChange', { from: oldState, to: newState });
  };

  // ── Level Loading ──
  Game.prototype.loadLevel = function(tilemap) {
    this.tilemap = tilemap;
    this.camera.setLevelBounds(
      tilemap.width * ProcMario.Physics.TILE_SIZE,
      tilemap.height * ProcMario.Physics.TILE_SIZE
    );
    this.camera.x = 0;
    this.camera.y = 0;
    this.time = 400;
    this._timeAccum = 0;
  };

  // Reset game stats for a new game
  Game.prototype.resetStats = function() {
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.time = 400;
  };

  // ── Expose ──
  window.ProcMario.State = State;
  window.ProcMario.InputManager = InputManager;
  window.ProcMario.EventBus = EventBus;
  window.ProcMario.Game = Game;
  window.ProcMario.NATIVE_WIDTH = NATIVE_WIDTH;
  window.ProcMario.NATIVE_HEIGHT = NATIVE_HEIGHT;
  window.ProcMario.SCALE = SCALE;
  window.ProcMario.TILE_SIZE = 16;
})();
