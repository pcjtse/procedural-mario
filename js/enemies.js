/**
 * Enemies - Goomba, Koopa Troopa, Piranha Plant
 * Depends on: physics.js, engine.js, tiles.js
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  var Physics = ProcMario.Physics;
  var TILE = ProcMario.Physics.TILE_SIZE;

  var Enemies = {};

  // ── Shared helper: check stomp vs damage against player ──
  function checkPlayerCollision(enemy, game) {
    var player = game.player;
    if (!player || player.dead || enemy.dead || enemy.dying) return;
    if (player.invincible) return;

    if (!Physics.checkEntityCollision(enemy, player)) return;

    // Star power kills enemy instantly
    if (player.starPower) {
      enemyStarKill(enemy, game);
      return;
    }

    // Stomp check: player falling and player bottom is above enemy's vertical midpoint
    var playerBottom = player.y + player.h;
    var enemyMid = enemy.y + enemy.h * 0.5;

    if (player.vy > 0 && playerBottom < enemyMid + 4) {
      return 'stomp';
    } else {
      return 'damage';
    }
  }

  function enemyStarKill(enemy, game) {
    enemy.dying = true;
    enemy.dyingTimer = 0;
    enemy.dyingStyle = 'flip';
    enemy.vy = -4;
    enemy.vx = 0;
    game.score += 100;
    game.events.emit('enemyKilled', { enemy: enemy, style: 'star' });
  }

  // ── Goomba ──
  function Goomba(x, y) {
    this.type = 'goomba';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = -0.5;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null; // 'squish' or 'flip'
    this.applyingForce = true; // prevent friction from stopping patrol
    this.animTimer = 0;
    this.animFrame = 0;
    this.active = false; // activated when near camera
  }

  Goomba.prototype.update = function(game) {
    // Activate when within view distance
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 32, this.y, this.w + 64, this.h)) {
        this.active = true;
      } else {
        return;
      }
    }

    // Dying animation
    if (this.dying) {
      this.dyingTimer++;
      if (this.dyingStyle === 'squish') {
        if (this.dyingTimer >= 30) {
          this.dead = true;
        }
      } else if (this.dyingStyle === 'flip') {
        this.vy += Physics.GRAVITY;
        this.y += this.vy;
        if (this.y > game.tilemap.height * TILE + 32) {
          this.dead = true;
        }
      }
      return;
    }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);

    // Reverse on wall collision (vx was zeroed by physics)
    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -0.5 : 0.5;
    }

    // Animation
    this.animTimer++;
    if (this.animTimer >= 10) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    // Fall off screen check
    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    // Player collision
    var result = checkPlayerCollision(this, game);
    if (result === 'stomp') {
      this.dying = true;
      this.dyingTimer = 0;
      this.dyingStyle = 'squish';
      this.vx = 0;
      this.h = 8;
      this.y += 8;
      game.score += 100;
      game.player.vy = -4;
      game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
    } else if (result === 'damage') {
      if (game.player.takeDamage) {
        game.player.takeDamage();
      }
    }
  };

  Goomba.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var ss = ProcMario.spriteSheet;

    if (this.dying && this.dyingStyle === 'flip') {
      ctx.save();
      ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
      ctx.scale(1, -1);
      if (ss) {
        var spr = ss.getSprite('goomba_walk1', false);
        if (spr) ctx.drawImage(spr, -this.w / 2, -this.h / 2);
      }
      ctx.restore();
      return;
    }

    if (this.dying && this.dyingStyle === 'squish') {
      if (ss) {
        ProcMario.drawSprite(ctx, ss, 'goomba_squished', pos.x, pos.y, false);
      }
      return;
    }

    var spriteName = this.animFrame === 0 ? 'goomba_walk1' : 'goomba_walk2';
    if (ss) {
      ProcMario.drawSprite(ctx, ss, spriteName, pos.x, pos.y, false);
    }
  };

  // ── Koopa Troopa ──
  function Koopa(x, y) {
    this.type = 'koopa';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 24;
    this.vx = -0.5;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    this.state = 'walking'; // 'walking', 'shell', 'shell_moving'
    this.shellTimer = 0;
    this.shellKillCombo = 0;
    this.shellEnemyCount = 0;
    this.applyingForce = true;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1; // -1 left, 1 right
    this.active = false;
  }

  Koopa.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 32, this.y, this.w + 64, this.h)) {
        this.active = true;
      } else {
        return;
      }
    }

    // Dying flip animation
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) {
        this.dead = true;
      }
      return;
    }

    var prevVx = this.vx;

    if (this.state === 'walking') {
      // Edge detection: check if tile ahead and below exists
      var checkX = this.vx < 0 ? this.x - 1 : this.x + this.w;
      var checkCol = Math.floor(checkX / TILE);
      var belowRow = Math.floor((this.y + this.h + 1) / TILE);
      if (this.onGround && !Physics.isSolidTile(game.tilemap, checkCol, belowRow)) {
        this.vx = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
      }

      Physics.updateEntity(this, game.tilemap, 1);

      // Reverse on wall
      if (prevVx !== 0 && this.vx === 0) {
        this.vx = prevVx > 0 ? -0.5 : 0.5;
        this.facing = this.vx > 0 ? 1 : -1;
      }

      // Animation
      this.animTimer++;
      if (this.animTimer >= 10) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }

    } else if (this.state === 'shell') {
      // Stationary shell
      Physics.updateEntity(this, game.tilemap, 1);

      this.shellTimer++;
      // Recover after 8 seconds
      if (this.shellTimer > 480) {
        this.state = 'walking';
        this.h = 24;
        this.y -= 8;
        this.vx = -0.5;
        this.facing = -1;
        this.shellTimer = 0;
      }

    } else if (this.state === 'shell_moving') {
      Physics.updateEntity(this, game.tilemap, 1);

      // Reverse on wall
      if (prevVx !== 0 && this.vx === 0) {
        this.vx = prevVx > 0 ? -4 : 4;
      }

      this.shellTimer++;
      // Stop after 10 seconds or 5 enemy kills
      if (this.shellTimer > 600 || this.shellEnemyCount >= 5) {
        this.state = 'shell';
        this.vx = 0;
        this.shellTimer = 0;
        this.shellKillCombo = 0;
        this.shellEnemyCount = 0;
      }

      // Check shell vs other enemies
      var allEntities = game.entities;
      for (var i = 0; i < allEntities.length; i++) {
        var other = allEntities[i];
        if (other === this || other.dead || other.dying) continue;
        if (other.type !== 'goomba' && other.type !== 'koopa' && other.type !== 'piranha') continue;
        if (!Physics.checkEntityCollision(this, other)) continue;

        // Kill the other enemy
        other.dying = true;
        other.dyingTimer = 0;
        other.dyingStyle = 'flip';
        other.vy = -4;
        other.vx = 0;
        this.shellEnemyCount++;
        var comboScores = [100, 200, 400, 800];
        var comboIdx = Math.min(this.shellKillCombo, comboScores.length - 1);
        game.score += comboScores[comboIdx];
        this.shellKillCombo++;
        game.events.emit('enemyKilled', { enemy: other, style: 'shell' });
      }
    }

    // Fall off screen
    if (this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
      return;
    }

    // Player collision
    var player = game.player;
    if (!player || player.dead || player.invincible) return;

    if (!Physics.checkEntityCollision(this, player)) return;

    if (player.starPower) {
      enemyStarKill(this, game);
      return;
    }

    var playerBottom = player.y + player.h;
    var myMid = this.y + this.h * 0.5;
    var isStomping = player.vy > 0 && playerBottom < myMid + 4;

    if (this.state === 'walking') {
      if (isStomping) {
        // Become shell
        this.state = 'shell';
        this.y += (this.h - 16);
        this.h = 16;
        this.vx = 0;
        this.shellTimer = 0;
        game.score += 100;
        player.vy = -4;
        game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
      } else {
        if (player.takeDamage) player.takeDamage();
      }
    } else if (this.state === 'shell') {
      // Kick the shell
      this.state = 'shell_moving';
      this.shellTimer = 0;
      this.shellKillCombo = 0;
      this.shellEnemyCount = 0;
      var kickDir = (player.x + player.w / 2 < this.x + this.w / 2) ? 1 : -1;
      this.vx = 4 * kickDir;
      game.score += 200;
      game.events.emit('shellKicked', { shell: this });
    } else if (this.state === 'shell_moving') {
      if (isStomping) {
        // Stop shell
        this.state = 'shell';
        this.vx = 0;
        this.shellTimer = 0;
        player.vy = -4;
      } else {
        if (player.takeDamage) player.takeDamage();
      }
    }
  };

  Koopa.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var ss = ProcMario.spriteSheet;

    if (this.dying) {
      ctx.save();
      ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
      ctx.scale(1, -1);
      if (ss) {
        var spr = ss.getSprite('koopa_walk1', false);
        if (spr) ctx.drawImage(spr, -this.w / 2, -this.h / 2);
      }
      ctx.restore();
      return;
    }

    if (this.state === 'shell' || this.state === 'shell_moving') {
      if (ss) {
        ProcMario.drawSprite(ctx, ss, 'koopa_shell', pos.x, pos.y, false);
      }
      return;
    }

    var spriteName = this.animFrame === 0 ? 'koopa_walk1' : 'koopa_walk2';
    var flipped = this.facing > 0;
    if (ss) {
      ProcMario.drawSprite(ctx, ss, spriteName, pos.x, pos.y, flipped);
    }
  };

  // ── Piranha Plant ──
  function PiranhaPlant(x, y) {
    this.type = 'piranha';
    this.x = x * TILE; // convert tile coords to pixel
    this.pipeTopY = y * TILE;
    this.y = this.pipeTopY + 24; // start hidden
    this.w = 16;
    this.h = 24;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    // State machine: 'emerging', 'up', 'retreating', 'hidden'
    this.state = 'hidden';
    this.stateTimer = 0;
    this.baseY = this.pipeTopY + 24;
    this.topY = this.pipeTopY - 8; // how high it rises
    this.active = true; // always active since position is fixed
  }

  PiranhaPlant.prototype.update = function(game) {
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) {
        this.dead = true;
      }
      return;
    }

    var player = game.player;
    this.stateTimer++;

    switch (this.state) {
      case 'hidden':
        this.y = this.baseY;
        if (this.stateTimer >= 90) {
          // Don't emerge if player is nearby
          if (player && !player.dead) {
            var playerCenterX = player.x + player.w / 2;
            var pipeCenterX = this.x + this.w / 2;
            if (Math.abs(playerCenterX - pipeCenterX) < TILE * 2) {
              // Stay hidden, reset timer
              this.stateTimer = 60;
              break;
            }
          }
          this.state = 'emerging';
          this.stateTimer = 0;
        }
        break;

      case 'emerging':
        // Rise over 60 frames
        var emergeProgress = Math.min(this.stateTimer / 60, 1);
        this.y = this.baseY - (this.baseY - this.topY) * emergeProgress;
        if (this.stateTimer >= 60) {
          this.state = 'up';
          this.stateTimer = 0;
        }
        break;

      case 'up':
        this.y = this.topY;
        if (this.stateTimer >= 90) {
          this.state = 'retreating';
          this.stateTimer = 0;
        }
        break;

      case 'retreating':
        var retreatProgress = Math.min(this.stateTimer / 60, 1);
        this.y = this.topY + (this.baseY - this.topY) * retreatProgress;
        if (this.stateTimer >= 60) {
          this.state = 'hidden';
          this.stateTimer = 0;
        }
        break;
    }

    // Player collision (cannot be stomped)
    if (!player || player.dead || player.invincible) return;
    if (this.state === 'hidden') return;

    if (Physics.checkEntityCollision(this, player)) {
      if (player.starPower) {
        enemyStarKill(this, game);
      } else {
        if (player.takeDamage) player.takeDamage();
      }
    }
  };

  PiranhaPlant.prototype.render = function(ctx, camera) {
    if (this.state === 'hidden' && !this.dying) return;

    var pos = camera.worldToScreen(this.x, this.y);
    var ss = ProcMario.spriteSheet;

    if (this.dying) {
      ctx.save();
      ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
      ctx.scale(1, -1);
      if (ss) {
        var spr = ss.getSprite('piranha_frame1', false);
        if (spr) ctx.drawImage(spr, -this.w / 2, -this.h / 2);
      }
      ctx.restore();
      return;
    }

    var frame = Math.floor(Date.now() / 200) % 2;
    var spriteName = frame === 0 ? 'piranha_frame1' : 'piranha_frame2';
    if (ss) {
      ProcMario.drawSprite(ctx, ss, spriteName, pos.x, pos.y, false);
    }
  };

  // ── Factory: create enemy from level generator entity data ──
  Enemies.createFromData = function(data) {
    switch (data.type) {
      case 'goomba':
        return new Goomba(data.x * TILE, (data.y) * TILE);
      case 'koopa':
        return new Koopa(data.x * TILE, (data.y - 0.5) * TILE); // koopa is taller
      case 'piranha':
        return new PiranhaPlant(data.x, data.y); // PiranhaPlant handles tile->pixel internally
      default:
        return null;
    }
  };

  // ── Expose constructors ──
  Enemies.Goomba = Goomba;
  Enemies.Koopa = Koopa;
  Enemies.PiranhaPlant = PiranhaPlant;

  window.ProcMario.Enemies = Enemies;
})();
