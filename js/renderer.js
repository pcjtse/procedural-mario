/**
 * Renderer for Procedural Mario.
 * Handles tile rendering, backgrounds, HUD, screens, and particle effects.
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  var TILE_SIZE = 16;
  var SKY_COLOR = '#6B8CFF';

  // Tile type to sprite name mapping
  var TILE_SPRITE_MAP = {
    1:  'ground',
    2:  'ground_top',
    3:  'brick',
    4:  'question',   // animated - handled specially
    5:  'question_empty',
    6:  'hard_block',
    7:  'pipe_top_left',
    8:  'pipe_top_right',
    9:  'pipe_body_left',
    10: 'pipe_body_right',
    11: 'coin',        // animated - handled specially
    12: 'flagpole',
    13: 'flagpole_top'
  };

  /**
   * Renderer constructor
   * @param {HTMLCanvasElement} canvas
   */
  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.width = canvas.width;
    this.height = canvas.height;
    this.spriteSheet = null;
    this.frameCount = 0;
    this.particles = [];
    this.popups = [];
    this.coinPops = [];

    // Background element positions (generated per level)
    this.bgClouds = [];
    this.bgHills = [];
    this.bgBushes = [];
  }

  /**
   * Initialize sprites - call after DOM is ready
   */
  Renderer.prototype.init = function() {
    this.spriteSheet = new ProcMario.SpriteSheet();
    ProcMario.spriteSheet = this.spriteSheet; // global access for entity rendering
  };

  /**
   * Generate background decorations for a level
   */
  Renderer.prototype.generateBackground = function(levelWidth) {
    this.bgClouds = [];
    this.bgHills = [];
    this.bgBushes = [];

    // Clouds every ~120 pixels
    for (var x = 60; x < levelWidth; x += 100 + Math.random() * 80) {
      this.bgClouds.push({
        x: x,
        y: 20 + Math.random() * 40
      });
    }

    // Hills every ~200 pixels
    for (var x2 = 30; x2 < levelWidth; x2 += 160 + Math.random() * 120) {
      this.bgHills.push({
        x: x2,
        y: this.height - 32 - 32  // above ground line
      });
    }

    // Bushes every ~150 pixels
    for (var x3 = 80; x3 < levelWidth; x3 += 100 + Math.random() * 100) {
      this.bgBushes.push({
        x: x3,
        y: this.height - 32 - 16  // on the ground
      });
    }
  };

  /**
   * Main render call
   */
  Renderer.prototype.render = function(gameState) {
    this.frameCount++;
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (!gameState) return;

    switch (gameState.screen) {
      case 'title':
        this._renderTitleScreen();
        break;
      case 'levelIntro':
        this._renderLevelIntro(gameState);
        break;
      case 'playing':
      case 'dying':
      case 'levelComplete':
        this._renderGameplay(gameState);
        break;
      case 'gameOver':
        this._renderGameOver();
        break;
      default:
        this._renderGameplay(gameState);
    }
  };

  // ===== GAMEPLAY RENDERING =====

  Renderer.prototype._renderGameplay = function(state) {
    var cam = state.camera || { x: 0, y: 0 };

    // Sky
    this.ctx.fillStyle = SKY_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Background layers (parallax)
    this._renderBackgrounds(cam);

    // Tiles
    if (state.tilemap) {
      this._renderTiles(state.tilemap, cam);
    }

    // Entities
    if (state.entities) {
      this._renderEntities(state.entities, cam);
    }

    // Player
    if (state.player) {
      this._renderPlayer(state.player, cam);
    }

    // Particles
    this._updateAndRenderParticles(cam);

    // Coin pop animations
    this._updateAndRenderCoinPops(cam);

    // Score popups
    this._updateAndRenderPopups(cam);

    // HUD (always on top)
    this._renderHUD(state);
  };

  // ===== BACKGROUND =====

  Renderer.prototype._renderBackgrounds = function(cam) {
    if (!this.spriteSheet) return;

    // Far layer - clouds at 0.2x scroll
    var cloudOffset = cam.x * 0.2;
    for (var i = 0; i < this.bgClouds.length; i++) {
      var cloud = this.bgClouds[i];
      var cx = cloud.x - cloudOffset;
      // Wrap clouds
      while (cx < -48) cx += this.width + 96;
      ProcMario.drawSprite(this.ctx, this.spriteSheet, 'cloud', cx, cloud.y, false);
    }

    // Mid layer - hills at 0.5x scroll
    var hillOffset = cam.x * 0.5;
    for (var j = 0; j < this.bgHills.length; j++) {
      var hill = this.bgHills[j];
      var hx = hill.x - hillOffset;
      if (hx > -64 && hx < this.width + 64) {
        ProcMario.drawSprite(this.ctx, this.spriteSheet, 'hill', hx, hill.y, false);
      }
    }

    // Near layer - bushes at 0.8x scroll
    var bushOffset = cam.x * 0.8;
    for (var k = 0; k < this.bgBushes.length; k++) {
      var bush = this.bgBushes[k];
      var bx = bush.x - bushOffset;
      if (bx > -32 && bx < this.width + 32) {
        ProcMario.drawSprite(this.ctx, this.spriteSheet, 'bush', bx, bush.y, false);
      }
    }
  };

  // ===== TILES =====

  Renderer.prototype._renderTiles = function(tilemap, cam) {
    if (!this.spriteSheet) return;

    var startCol = Math.floor(cam.x / TILE_SIZE);
    var endCol = Math.ceil((cam.x + this.width) / TILE_SIZE) + 1;
    var startRow = Math.floor(cam.y / TILE_SIZE);
    var endRow = Math.ceil((cam.y + this.height) / TILE_SIZE) + 1;

    if (startCol < 0) startCol = 0;
    if (startRow < 0) startRow = 0;
    if (endCol > tilemap.width) endCol = tilemap.width;
    if (endRow > tilemap.height) endRow = tilemap.height;

    var animFrame = Math.floor(this.frameCount / 15) % 4;

    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tile = tilemap.data[row * tilemap.width + col];
        if (tile === 0) continue;

        var sx = col * TILE_SIZE - Math.round(cam.x);
        var sy = row * TILE_SIZE - Math.round(cam.y);

        var spriteName;
        if (tile === 4) {
          // Question block - animated
          spriteName = 'question_' + animFrame;
        } else if (tile === 11) {
          // Coin tile - animated
          spriteName = 'coin_frame' + (animFrame + 1);
        } else {
          spriteName = TILE_SPRITE_MAP[tile];
        }

        if (spriteName) {
          ProcMario.drawSprite(this.ctx, this.spriteSheet, spriteName, sx, sy, false);
        }
      }
    }
  };

  // ===== ENTITIES =====

  Renderer.prototype._renderEntities = function(entities, cam) {
    if (!this.spriteSheet) return;

    for (var i = 0; i < entities.length; i++) {
      var ent = entities[i];
      if (!ent.active) continue;

      var ex = ent.x - Math.round(cam.x);
      var ey = ent.y - Math.round(cam.y);

      // Skip if offscreen
      if (ex < -32 || ex > this.width + 32 || ey < -32 || ey > this.height + 32) continue;

      var frame = Math.floor(this.frameCount / 10) % 2;
      var spriteName = this._getEntitySprite(ent, frame);
      var flipped = ent.direction === 1; // flip if facing right for enemies

      if (spriteName) {
        ProcMario.drawSprite(this.ctx, this.spriteSheet, spriteName, ex, ey, flipped);
      }
    }
  };

  Renderer.prototype._getEntitySprite = function(ent, frame) {
    switch (ent.type) {
      case 'goomba':
        if (ent.squished) return 'goomba_squished';
        return frame === 0 ? 'goomba_walk1' : 'goomba_walk2';
      case 'koopa':
        if (ent.inShell) return 'koopa_shell';
        return frame === 0 ? 'koopa_walk1' : 'koopa_walk2';
      case 'piranha':
        return frame === 0 ? 'piranha_frame1' : 'piranha_frame2';
      case 'mushroom':
        return 'mushroom';
      case 'star':
        return frame === 0 ? 'star_frame1' : 'star_frame2';
      case 'fireFlower':
        return frame === 0 ? 'fire_flower_frame1' : 'fire_flower_frame2';
      case 'coin':
        var coinFrame = Math.floor(this.frameCount / 8) % 4;
        return 'coin_frame' + (coinFrame + 1);
      default:
        return null;
    }
  };

  // ===== PLAYER =====

  Renderer.prototype._renderPlayer = function(player, cam) {
    if (!this.spriteSheet || !player) return;
    if (player.invincibleTimer > 0 && this.frameCount % 4 < 2) return; // blink

    var px = player.x - Math.round(cam.x);
    var py = player.y - Math.round(cam.y);

    var prefix = player.big ? 'player_big_' : 'player_small_';
    var spriteName;

    if (player.dead) {
      spriteName = 'player_small_death';
    } else if (!player.onGround) {
      spriteName = prefix + 'jump';
    } else if (player.skidding) {
      spriteName = prefix + 'skid';
    } else if (Math.abs(player.vx) > 0.5) {
      var walkFrame = (Math.floor(this.frameCount / 5) % 3) + 1;
      spriteName = prefix + 'walk' + walkFrame;
    } else {
      spriteName = prefix + 'idle';
    }

    var flipped = player.facing === -1;
    ProcMario.drawSprite(this.ctx, this.spriteSheet, spriteName, px, py, flipped);
  };

  // ===== PARTICLES =====

  /**
   * Spawn block break particles at a position
   */
  Renderer.prototype.spawnBlockBreak = function(worldX, worldY) {
    var offsets = [[-1,-1],[1,-1],[-1,0.5],[1,0.5]];
    for (var i = 0; i < 4; i++) {
      this.particles.push({
        x: worldX + 4 + (i % 2) * 8,
        y: worldY + (i < 2 ? 0 : 8),
        vx: offsets[i][0] * (1.5 + Math.random()),
        vy: offsets[i][1] * (2 + Math.random() * 2),
        life: 30,
        color: '#E45C10',
        size: 4
      });
    }
  };

  /**
   * Spawn coin pop from hit question block
   */
  Renderer.prototype.spawnCoinPop = function(worldX, worldY) {
    this.coinPops.push({
      x: worldX,
      y: worldY,
      vy: -4,
      life: 20
    });
  };

  /**
   * Spawn score popup
   */
  Renderer.prototype.spawnScorePopup = function(worldX, worldY, score) {
    this.popups.push({
      x: worldX,
      y: worldY,
      text: '+' + score,
      life: 40,
      vy: -0.8
    });
  };

  Renderer.prototype._updateAndRenderParticles = function(cam) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      var sx = p.x - Math.round(cam.x);
      var sy = p.y - Math.round(cam.y);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(sx, sy, p.size, p.size);
    }
  };

  Renderer.prototype._updateAndRenderCoinPops = function(cam) {
    if (!this.spriteSheet) return;
    for (var i = this.coinPops.length - 1; i >= 0; i--) {
      var cp = this.coinPops[i];
      cp.y += cp.vy;
      cp.vy += 0.3;
      cp.life--;

      if (cp.life <= 0) {
        this.coinPops.splice(i, 1);
        continue;
      }

      var frame = Math.floor(this.frameCount / 4) % 4;
      var sx = cp.x - Math.round(cam.x);
      var sy = cp.y - Math.round(cam.y);
      ProcMario.drawSprite(this.ctx, this.spriteSheet, 'coin_frame' + (frame + 1), sx, sy, false);
    }
  };

  Renderer.prototype._updateAndRenderPopups = function(cam) {
    for (var i = this.popups.length - 1; i >= 0; i--) {
      var pop = this.popups[i];
      pop.y += pop.vy;
      pop.life--;

      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }

      var sx = pop.x - Math.round(cam.x);
      var sy = pop.y - Math.round(cam.y);
      var alpha = Math.min(1, pop.life / 10);
      this.ctx.globalAlpha = alpha;
      this._drawText(pop.text, sx, sy, 1, '#FFFFFF');
      this.ctx.globalAlpha = 1;
    }
  };

  // ===== HUD =====

  Renderer.prototype._renderHUD = function(state) {
    var y = 8;
    var score = state.score || 0;
    var coins = state.coins || 0;
    var world = state.worldSeed || '1-1';
    var time = state.time || 400;

    // "MARIO" + score
    this._drawText('MARIO', 16, y, 1, '#FFFFFF');
    this._drawText(this._padNumber(score, 6), 16, y + 10, 1, '#FFFFFF');

    // Coin count
    this._drawText('x' + this._padNumber(coins, 2), 96, y + 10, 1, '#FCB404');

    // World
    this._drawText('WORLD', 144, y, 1, '#FFFFFF');
    this._drawText('' + world, 148, y + 10, 1, '#FFFFFF');

    // Time
    this._drawText('TIME', 208, y, 1, '#FFFFFF');
    this._drawText('' + Math.ceil(time), 212, y + 10, 1, '#FFFFFF');
  };

  // ===== SCREENS =====

  Renderer.prototype._renderTitleScreen = function() {
    // Sky background
    this.ctx.fillStyle = SKY_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Ground
    this.ctx.fillStyle = '#C84C0C';
    this.ctx.fillRect(0, this.height - 32, this.width, 32);
    this.ctx.fillStyle = '#00A800';
    this.ctx.fillRect(0, this.height - 32, this.width, 4);

    // Title
    this._drawText('SUPER PROC BROS', this.width / 2 - 52, 50, 1.5, '#FFFFFF');
    this._drawText('PROCEDURALLY GENERATED', this.width / 2 - 66, 72, 1, '#FCB404');

    // Blinking "PRESS ENTER"
    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      this._drawText('PRESS ENTER', this.width / 2 - 38, 130, 1, '#FFFFFF');
    }

    // Copyright style
    this._drawText('2026 PROC MARIO', this.width / 2 - 48, this.height - 50, 1, '#FCA044');
  };

  Renderer.prototype._renderLevelIntro = function(state) {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    var world = state.worldSeed || '1-1';
    this._drawText('WORLD ' + world, this.width / 2 - 30, this.height / 2 - 20, 1.5, '#FFFFFF');

    // Lives display
    var lives = state.lives || 3;
    this._drawText('x ' + lives, this.width / 2 - 8, this.height / 2 + 10, 1, '#FFFFFF');
  };

  Renderer.prototype._renderGameOver = function() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this._drawText('GAME OVER', this.width / 2 - 30, this.height / 2 - 5, 1.5, '#FFFFFF');
  };

  // ===== TEXT RENDERING =====

  /**
   * Draw text using bitmap font
   */
  Renderer.prototype._drawText = function(text, x, y, scale, color) {
    scale = scale || 1;
    color = color || '#FFFFFF';
    var chars = ProcMario.FONT_CHARS;
    if (!chars) return;

    this.ctx.fillStyle = color;
    var charWidth = Math.ceil(6 * scale);
    var str = text.toUpperCase();

    for (var i = 0; i < str.length; i++) {
      var charData = chars[str[i]];
      if (!charData) continue;

      for (var row = 0; row < 7; row++) {
        var bits = charData[row];
        for (var bit = 0; bit < 7; bit++) {
          if (bits & (1 << (6 - bit))) {
            this.ctx.fillRect(
              Math.round(x + i * charWidth + bit * scale),
              Math.round(y + row * scale),
              Math.ceil(scale),
              Math.ceil(scale)
            );
          }
        }
      }
    }
  };

  Renderer.prototype._padNumber = function(num, digits) {
    var s = '' + num;
    while (s.length < digits) s = '0' + s;
    return s;
  };

  // ===== EXPORTS =====
  ProcMario.Renderer = Renderer;
  ProcMario.TILE_SPRITE_MAP = TILE_SPRITE_MAP;
})();
