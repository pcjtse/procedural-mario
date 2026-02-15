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

    var self = this;
    document.addEventListener('keydown', function(e) {
      if (!self.keys[e.code]) {
        self._justPressed[e.code] = true;
      }
      self.keys[e.code] = true;
      // Prevent scrolling with game keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code) !== -1) {
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
  };

  InputManager.prototype.isDown = function(code) {
    return !!this.keys[code];
  };

  InputManager.prototype.isPressed = function(code) {
    return !!this.pressed[code];
  };

  // Convenience: check movement / action keys
  InputManager.prototype.left = function() {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  };
  InputManager.prototype.right = function() {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  };
  InputManager.prototype.up = function() {
    return this.isDown('ArrowUp') || this.isDown('KeyW');
  };
  InputManager.prototype.down = function() {
    return this.isDown('ArrowDown') || this.isDown('KeyS');
  };
  InputManager.prototype.jump = function() {
    return this.isPressed('Space') || this.isPressed('KeyZ');
  };
  InputManager.prototype.jumpHeld = function() {
    return this.isDown('Space') || this.isDown('KeyZ');
  };
  InputManager.prototype.run = function() {
    return this.isDown('KeyX') || this.isDown('ShiftLeft');
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
