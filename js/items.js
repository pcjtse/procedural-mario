/**
 * Items - Coins, Mushrooms, Fire Flower, Star, 1-Up, Fireball
 * Depends on: physics.js, engine.js, tiles.js
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  var Physics = ProcMario.Physics;
  var TILE = ProcMario.Physics.TILE_SIZE;

  var Items = {};

  // ── Coin (placed in world) ──
  function Coin(x, y) {
    this.type = 'coin';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.animTimer = 0;
    this.animFrame = 0;
  }

  Coin.prototype.update = function(game) {
    // Animation
    this.animTimer++;
    if (this.animTimer >= 8) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Check player touch
    var player = game.player;
    if (!player || player.dead) return;

    if (Physics.checkEntityCollision(this, player)) {
      this.dead = true;
      game.coins++;
      game.score += 200;
      game.events.emit('coinCollected', { x: this.x, y: this.y });

      if (game.coins >= 100) {
        game.coins = 0;
        game.lives++;
        game.events.emit('1up', { x: this.x, y: this.y });
      }
    }
  };

  Coin.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var widths = [12, 8, 4, 8];
    var coinW = widths[this.animFrame];
    var cx = pos.x + 8 - coinW / 2;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx, pos.y + 2, coinW, 12);
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(cx + 1, pos.y + 3, Math.max(1, coinW - 2), 10);
  };

  // ── Popup Coin (from question block, visual only) ──
  function PopupCoin(x, y) {
    this.type = 'popup_coin';
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 8;
    this.vx = 0;
    this.vy = -5;
    this.onGround = false;
    this.dead = false;
    this.timer = 0;
    this.animTimer = 0;
    this.animFrame = 0;
  }

  PopupCoin.prototype.update = function(game) {
    this.timer++;
    this.vy += 0.2;
    this.y += this.vy;

    this.animTimer++;
    if (this.animTimer >= 4) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    if (this.timer >= 40) {
      this.dead = true;
    }
  };

  PopupCoin.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var widths = [8, 6, 2, 6];
    var coinW = widths[this.animFrame];
    var cx = pos.x + 4 - coinW / 2;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx, pos.y, coinW, 8);
  };

  // ── Super Mushroom ──
  function Mushroom(x, y) {
    this.type = 'mushroom';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.applyingForce = true;
    // Spawn state: rise from block then move
    this.spawning = true;
    this.spawnY = y;
    this.targetY = y - 16;
  }

  Mushroom.prototype.update = function(game) {
    if (this.spawning) {
      this.y -= 0.5;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.spawning = false;
        this.vx = 1.5;
      }
      return;
    }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);

    // Reverse on wall
    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -1.5 : 1.5;
    }

    // Fall off screen
    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    // Player collection
    var player = game.player;
    if (!player || player.dead) return;

    if (Physics.checkEntityCollision(this, player)) {
      this.dead = true;
      game.score += 1000;
      if (player.powerUp) player.powerUp('mushroom');
      game.events.emit('itemCollected', { type: 'mushroom', x: this.x, y: this.y });
    }
  };

  Mushroom.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    // Cap (red with white spots)
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(pos.x, pos.y, 16, 10);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pos.x + 2, pos.y + 2, 4, 4);
    ctx.fillRect(pos.x + 10, pos.y + 2, 4, 4);

    // Stem (white)
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pos.x + 3, pos.y + 10, 10, 6);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(pos.x + 5, pos.y + 11, 2, 2);
    ctx.fillRect(pos.x + 9, pos.y + 11, 2, 2);
  };

  // ── 1-Up Mushroom ──
  function OneUpMushroom(x, y) {
    Mushroom.call(this, x, y);
    this.type = '1up';
  }

  OneUpMushroom.prototype = Object.create(Mushroom.prototype);
  OneUpMushroom.prototype.constructor = OneUpMushroom;

  OneUpMushroom.prototype.update = function(game) {
    if (this.spawning) {
      this.y -= 0.5;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.spawning = false;
        this.vx = 1.5;
      }
      return;
    }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);

    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -1.5 : 1.5;
    }

    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    var player = game.player;
    if (!player || player.dead) return;

    if (Physics.checkEntityCollision(this, player)) {
      this.dead = true;
      game.lives++;
      game.events.emit('1up', { x: this.x, y: this.y });
    }
  };

  OneUpMushroom.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    // Cap (green with white spots)
    ctx.fillStyle = '#00AA00';
    ctx.fillRect(pos.x, pos.y, 16, 10);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pos.x + 2, pos.y + 2, 4, 4);
    ctx.fillRect(pos.x + 10, pos.y + 2, 4, 4);

    // Stem
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pos.x + 3, pos.y + 10, 10, 6);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(pos.x + 5, pos.y + 11, 2, 2);
    ctx.fillRect(pos.x + 9, pos.y + 11, 2, 2);
  };

  // ── Fire Flower ──
  function FireFlower(x, y) {
    this.type = 'fireflower';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.spawning = true;
    this.spawnY = y;
    this.targetY = y - 16;
    this.animTimer = 0;
    this.animFrame = 0;
  }

  FireFlower.prototype.update = function(game) {
    if (this.spawning) {
      this.y -= 0.5;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.spawning = false;
      }
      return;
    }

    // Animation
    this.animTimer++;
    if (this.animTimer >= 12) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    // Player collection
    var player = game.player;
    if (!player || player.dead) return;

    if (Physics.checkEntityCollision(this, player)) {
      this.dead = true;
      game.score += 1000;
      if (player.powerUp) player.powerUp('fire');
      game.events.emit('itemCollected', { type: 'fireflower', x: this.x, y: this.y });
    }
  };

  FireFlower.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    // Stem
    ctx.fillStyle = '#228B22';
    ctx.fillRect(pos.x + 5, pos.y + 8, 6, 8);

    // Leaves
    ctx.fillStyle = '#00AA00';
    ctx.fillRect(pos.x + 1, pos.y + 10, 5, 3);
    ctx.fillRect(pos.x + 10, pos.y + 10, 5, 3);

    // Flower petals
    var colors = this.animFrame === 0 ? ['#FF4500', '#FFD700'] : ['#FFD700', '#FF4500'];
    ctx.fillStyle = colors[0];
    ctx.fillRect(pos.x + 2, pos.y, 12, 10);
    ctx.fillStyle = colors[1];
    ctx.fillRect(pos.x + 5, pos.y + 2, 6, 6);

    // Center
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pos.x + 6, pos.y + 3, 4, 4);
  };

  // ── Star (invincibility) ──
  function Star(x, y) {
    this.type = 'star';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.applyingForce = true;
    this.spawning = true;
    this.spawnY = y;
    this.targetY = y - 16;
    this.animTimer = 0;
    this.colorIndex = 0;
  }

  Star.prototype.update = function(game) {
    if (this.spawning) {
      this.y -= 0.5;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.spawning = false;
        this.vx = 2;
        this.vy = -4;
      }
      return;
    }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);

    // Bounce on ground
    if (this.onGround) {
      this.vy = -4;
    }

    // Reverse on wall
    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -2 : 2;
    }

    // Color animation
    this.animTimer++;
    if (this.animTimer >= 4) {
      this.animTimer = 0;
      this.colorIndex = (this.colorIndex + 1) % 4;
    }

    // Fall off screen
    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    // Player collection
    var player = game.player;
    if (!player || player.dead) return;

    if (Physics.checkEntityCollision(this, player)) {
      this.dead = true;
      game.score += 1000;
      if (player.powerUp) player.powerUp('star');
      game.events.emit('itemCollected', { type: 'star', x: this.x, y: this.y });
    }
  };

  Star.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var colors = ['#FFD700', '#FFF', '#FF8C00', '#FFFF00'];
    var color = colors[this.colorIndex];

    // Star shape (simplified as diamond)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pos.x + 8, pos.y);
    ctx.lineTo(pos.x + 12, pos.y + 5);
    ctx.lineTo(pos.x + 16, pos.y + 6);
    ctx.lineTo(pos.x + 13, pos.y + 10);
    ctx.lineTo(pos.x + 14, pos.y + 16);
    ctx.lineTo(pos.x + 8, pos.y + 12);
    ctx.lineTo(pos.x + 2, pos.y + 16);
    ctx.lineTo(pos.x + 3, pos.y + 10);
    ctx.lineTo(pos.x, pos.y + 6);
    ctx.lineTo(pos.x + 4, pos.y + 5);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(pos.x + 5, pos.y + 6, 2, 2);
    ctx.fillRect(pos.x + 9, pos.y + 6, 2, 2);
  };

  // ── Fireball (player projectile) ──
  function Fireball(x, y, direction) {
    this.type = 'fireball';
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 8;
    this.vx = 4 * direction;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.applyingForce = true;
    this.startX = x;
    this.animTimer = 0;
    this.animFrame = 0;
  }

  Fireball.prototype.update = function(game) {
    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);

    // Bounce on ground
    if (this.onGround) {
      this.vy = -3;
    }

    // Destroyed on wall hit
    if (prevVx !== 0 && this.vx === 0) {
      this.dead = true;
      return;
    }

    // Max travel distance (~10 tiles)
    if (Math.abs(this.x - this.startX) > TILE * 10) {
      this.dead = true;
      return;
    }

    // Fall off screen
    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    // Animation
    this.animTimer++;
    if (this.animTimer >= 4) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Check enemy collisions
    var entities = game.entities;
    for (var i = 0; i < entities.length; i++) {
      var ent = entities[i];
      if (ent.dead || ent.dying) continue;
      if (ent.type !== 'goomba' && ent.type !== 'koopa' && ent.type !== 'piranha') continue;

      if (Physics.checkEntityCollision(this, ent)) {
        // Kill enemy
        ent.dying = true;
        ent.dyingTimer = 0;
        ent.dyingStyle = 'flip';
        ent.vy = -4;
        ent.vx = 0;
        game.score += 100;
        game.events.emit('enemyKilled', { enemy: ent, style: 'fireball' });
        this.dead = true;
        return;
      }
    }
  };

  Fireball.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var colors = ['#FF4500', '#FFD700', '#FF6347', '#FFA500'];

    ctx.fillStyle = colors[this.animFrame];
    ctx.beginPath();
    ctx.arc(pos.x + 4, pos.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(pos.x + 4, pos.y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  // ── Factory: spawn fireball from player ──
  Items.spawnFireball = function(game) {
    // Max 2 on screen
    var existing = game.getEntitiesByType('fireball');
    if (existing.length >= 2) return null;

    var player = game.player;
    if (!player) return null;

    var dir = player.facing || 1;
    var fx = dir > 0 ? player.x + player.w : player.x - 8;
    var fy = player.y + player.h / 2 - 4;

    var fireball = new Fireball(fx, fy, dir);
    game.addEntity(fireball);
    game.events.emit('fireballThrown', { x: fx, y: fy });
    return fireball;
  };

  // ── Expose constructors ──
  Items.Coin = Coin;
  Items.PopupCoin = PopupCoin;
  Items.Mushroom = Mushroom;
  Items.OneUpMushroom = OneUpMushroom;
  Items.FireFlower = FireFlower;
  Items.Star = Star;
  Items.Fireball = Fireball;

  window.ProcMario.Items = Items;
})();
