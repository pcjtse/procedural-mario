/**
 * Objects - Flagpole, Moving Platforms
 * Depends on: physics.js, engine.js, tiles.js
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  var TILE = ProcMario.Physics.TILE_SIZE;

  var Objects = {};

  // ── Flagpole ──
  function Flagpole(col, topRow, bottomRow) {
    this.type = 'flagpole';
    this.col = col;
    this.x = col * TILE;
    this.y = topRow * TILE;
    this.w = TILE;
    this.h = (bottomRow - topRow) * TILE;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.triggered = false;
    this.flagY = this.y + 8; // flag starts near top
    this.flagSliding = false;
    this.bottomY = bottomRow * TILE;
  }

  Flagpole.prototype.update = function(game) {
    if (this.triggered) {
      // Slide flag down
      if (this.flagSliding && this.flagY < this.bottomY - 16) {
        this.flagY += 2;
      }
      return;
    }

    var player = game.player;
    if (!player || player.dead) return;

    // Check if player overlaps the flagpole column
    if (ProcMario.Physics.checkEntityCollision(this, player)) {
      this.triggered = true;
      this.flagSliding = true;

      // Calculate score bonus based on height of contact
      var contactY = player.y;
      var poleHeight = this.h;
      var relativeHeight = 1 - ((contactY - this.y) / poleHeight);
      relativeHeight = Math.max(0, Math.min(1, relativeHeight));

      var bonusScores = [100, 400, 800, 2000, 5000];
      var idx = Math.min(Math.floor(relativeHeight * bonusScores.length), bonusScores.length - 1);
      var bonus = bonusScores[idx];
      game.score += bonus;

      game.events.emit('flagpoleGrabbed', {
        bonus: bonus,
        height: relativeHeight,
        x: this.x,
        y: contactY
      });

      // Start level complete sequence
      if (player.startFlagSlide) {
        player.startFlagSlide(this.x + TILE / 2, this.bottomY);
      } else {
        // Fallback: just freeze player and trigger completion
        player.vx = 0;
        player.vy = 0;
      }

      // Emit level complete after a short delay
      var flagpole = this;
      var delayFrames = 90;
      var counter = { frames: 0 };
      var delayEntity = {
        type: 'flag_delay',
        x: 0, y: 0, w: 0, h: 0,
        vx: 0, vy: 0, onGround: false,
        dead: false,
        update: function(g) {
          counter.frames++;
          if (counter.frames >= delayFrames) {
            this.dead = true;
            g.events.emit('levelComplete', { bonus: bonus });
            g.setState(ProcMario.State.LEVEL_COMPLETE);
          }
        },
        render: function() {}
      };
      game.addEntity(delayEntity);
    }
  };

  Flagpole.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    // Pole (thin vertical line)
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(pos.x + TILE / 2 - 1, pos.y, 2, this.h);

    // Ball on top
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(pos.x + TILE / 2, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Flag
    var flagScreenPos = camera.worldToScreen(this.x, this.flagY);
    ctx.fillStyle = '#00AA00';
    ctx.beginPath();
    ctx.moveTo(flagScreenPos.x + TILE / 2 + 1, flagScreenPos.y);
    ctx.lineTo(flagScreenPos.x + TILE / 2 + 1, flagScreenPos.y + 12);
    ctx.lineTo(flagScreenPos.x + TILE / 2 - 12, flagScreenPos.y + 6);
    ctx.closePath();
    ctx.fill();
  };

  // ── Moving Platform ──
  function MovingPlatform(x, y, width, moveType, range) {
    this.type = 'platform';
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = 8;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.moveType = moveType; // 'horizontal' or 'vertical'
    this.range = range || 64;
    this.startX = x;
    this.startY = y;
    this.speed = 0.5;
    this.direction = 1;
    this.prevX = x;
    this.prevY = y;
  }

  MovingPlatform.prototype.update = function(game) {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.moveType === 'horizontal') {
      this.x += this.speed * this.direction;
      if (this.x > this.startX + this.range) {
        this.x = this.startX + this.range;
        this.direction = -1;
      } else if (this.x < this.startX) {
        this.x = this.startX;
        this.direction = 1;
      }
    } else {
      this.y += this.speed * this.direction;
      if (this.y > this.startY + this.range) {
        this.y = this.startY + this.range;
        this.direction = -1;
      } else if (this.y < this.startY) {
        this.y = this.startY;
        this.direction = 1;
      }
    }

    // Carry the player if standing on platform
    var player = game.player;
    if (!player || player.dead) return;

    // Check if player is standing on this platform
    var playerBottom = player.y + player.h;
    var onPlatform = (
      playerBottom >= this.y - 1 &&
      playerBottom <= this.y + 4 &&
      player.x + player.w > this.x &&
      player.x < this.x + this.w &&
      player.vy >= 0
    );

    if (onPlatform) {
      player.onGround = true;
      player.vy = 0;
      player.y = this.y - player.h;

      // Move player with platform
      var dx = this.x - this.prevX;
      var dy = this.y - this.prevY;
      player.x += dx;
      player.y += dy;
    }
  };

  MovingPlatform.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    // Platform surface
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(pos.x, pos.y, this.w, this.h);

    // Top edge highlight
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(pos.x, pos.y, this.w, 2);

    // Bottom edge shadow
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(pos.x, pos.y + this.h - 2, this.w, 2);
  };

  // ── Factory: create flagpole from level data ──
  Objects.createFlagpole = function(game) {
    if (!game.tilemap) return null;

    var T = ProcMario.TileType;
    var width = game.tilemap.width;
    var height = game.tilemap.height;

    // Find the flagpole column by scanning for FLAGPOLE_TOP tile
    for (var col = width - 1; col >= 0; col--) {
      for (var row = 0; row < height; row++) {
        var tileData = game.tilemap.data
          ? game.tilemap.data[row * width + col]
          : (game.tilemap.tiles ? game.tilemap.tiles[row * width + col] : 0);

        if (tileData === T.FLAGPOLE_TOP) {
          // Found the top of the flagpole, find the bottom
          var bottomRow = row + 1;
          while (bottomRow < height) {
            var belowTile = game.tilemap.data
              ? game.tilemap.data[bottomRow * width + col]
              : (game.tilemap.tiles ? game.tilemap.tiles[bottomRow * width + col] : 0);

            if (belowTile !== T.FLAGPOLE) break;
            bottomRow++;
          }

          var flagpole = new Flagpole(col, row, bottomRow);
          return flagpole;
        }
      }
    }
    return null;
  };

  // ── Expose ──
  Objects.Flagpole = Flagpole;
  Objects.MovingPlatform = MovingPlatform;

  window.ProcMario.Objects = Objects;
})();
