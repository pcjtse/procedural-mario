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
    if (!player || player.dead || enemy.dead || enemy.dying) return null;
    if (player.invincible) return null;

    if (!Physics.checkEntityCollision(enemy, player)) return null;

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

  // Returns true if the enemy is frozen and handles its freeze countdown
  function handleFrozen(enemy) {
    if (!enemy._frozen) return false;
    enemy._frozenTimer = (enemy._frozenTimer || 0) + 1;
    if (enemy._frozenTimer >= (enemy._frozenDuration || 180)) {
      enemy._frozen = false;
      enemy._frozenTimer = 0;
    }
    return enemy._frozen;
  }

  // Draw ice overlay on a frozen enemy
  function renderFrozenOverlay(ctx, pos, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#B0E8FF';
    ctx.fillRect(pos.x, pos.y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#80C8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x, pos.y, w, h);
    ctx.restore();
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
    this.patrolMinX = -Infinity; // pixel x lower bound for patrol
    this.patrolMaxX = Infinity;  // pixel x upper bound for patrol
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

    // Frozen by ice ball: pause movement
    if (handleFrozen(this)) return;

    // Edge detection: reverse before walking off a platform edge
    if (this.onGround) {
      var checkX = this.vx < 0 ? this.x - 1 : this.x + this.w;
      var checkCol = Math.floor(checkX / TILE);
      var belowRow = Math.floor((this.y + this.h + 1) / TILE);
      if (!Physics.isSolidTile(game.tilemap, checkCol, belowRow)) {
        this.vx = -this.vx;
      }
    }

    // Patrol territory bounds
    if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.5; }
    if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.5; }

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
    if (this._frozen) renderFrozenOverlay(ctx, pos, this.w, this.h);
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
    this.patrolMinX = -Infinity;
    this.patrolMaxX = Infinity;
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

    if (handleFrozen(this)) return;

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

      // Patrol territory bounds
      if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.5; this.facing = 1; }
      if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.5; this.facing = -1; }

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

  // ── Buzzy Beetle ──
  // Like Koopa but immune to fireballs; found in underground theme.
  function BuzzyBeetle(x, y) {
    this.type = 'buzzy';
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
    this.dyingStyle = null;
    this.state = 'walking'; // 'walking', 'shell', 'shell_moving'
    this.shellTimer = 0;
    this.applyingForce = true;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    this.active = false;
    this.patrolMinX = -Infinity;
    this.patrolMaxX = Infinity;
    this.fireproof = true; // immune to fireballs
  }

  BuzzyBeetle.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 32, this.y, this.w + 64, this.h)) {
        this.active = true;
      } else { return; }
    }

    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) this.dead = true;
      return;
    }

    var prevVx = this.vx;

    if (this.state === 'walking') {
      var checkX = this.vx < 0 ? this.x - 1 : this.x + this.w;
      var checkCol = Math.floor(checkX / TILE);
      var belowRow = Math.floor((this.y + this.h + 1) / TILE);
      if (this.onGround && !Physics.isSolidTile(game.tilemap, checkCol, belowRow)) {
        this.vx = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
      }
      if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.5; this.facing = 1; }
      if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.5; this.facing = -1; }

      Physics.updateEntity(this, game.tilemap, 1);
      if (prevVx !== 0 && this.vx === 0) {
        this.vx = prevVx > 0 ? -0.5 : 0.5;
        this.facing = this.vx > 0 ? 1 : -1;
      }
      this.animTimer++;
      if (this.animTimer >= 12) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    } else if (this.state === 'shell') {
      Physics.updateEntity(this, game.tilemap, 1);
      this.shellTimer++;
      if (this.shellTimer > 480) {
        this.state = 'walking';
        this.vx = -0.5;
        this.facing = -1;
        this.shellTimer = 0;
      }
    } else if (this.state === 'shell_moving') {
      Physics.updateEntity(this, game.tilemap, 1);
      if (prevVx !== 0 && this.vx === 0) {
        this.vx = prevVx > 0 ? -4 : 4;
      }
      this.shellTimer++;
      if (this.shellTimer > 600) {
        this.state = 'shell';
        this.vx = 0;
        this.shellTimer = 0;
      }
    }

    if (this.y > game.tilemap.height * TILE + 32) { this.dead = true; return; }

    var player = game.player;
    if (!player || player.dead || player.invincible) return;
    if (!Physics.checkEntityCollision(this, player)) return;

    if (player.starPower) { enemyStarKill(this, game); return; }

    var playerBottom = player.y + player.h;
    var isStomping = player.vy > 0 && playerBottom < this.y + this.h * 0.5 + 4;

    if (this.state === 'walking') {
      if (isStomping) {
        this.state = 'shell';
        this.vx = 0;
        this.shellTimer = 0;
        game.score += 100;
        player.vy = -4;
        game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
      } else {
        if (player.takeDamage) player.takeDamage();
      }
    } else if (this.state === 'shell') {
      this.state = 'shell_moving';
      this.shellTimer = 0;
      var kickDir = (player.x + player.w / 2 < this.x + this.w / 2) ? 1 : -1;
      this.vx = 4 * kickDir;
      game.score += 200;
    } else if (this.state === 'shell_moving') {
      if (isStomping) {
        this.state = 'shell';
        this.vx = 0;
        this.shellTimer = 0;
        player.vy = -4;
      } else {
        if (player.takeDamage) player.takeDamage();
      }
    }
  };

  BuzzyBeetle.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);

    if (this.dying) {
      ctx.save();
      ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
      ctx.scale(1, -1);
      ctx.fillStyle = '#5A2E8A';
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      ctx.restore();
      return;
    }

    var inShell = this.state === 'shell' || this.state === 'shell_moving';
    if (inShell) {
      // Dark shell
      ctx.fillStyle = '#2A1A5A';
      ctx.fillRect(pos.x, pos.y + 4, this.w, this.h - 4);
      ctx.fillStyle = '#4A3A8A';
      ctx.fillRect(pos.x + 2, pos.y + 6, this.w - 4, this.h - 8);
    } else {
      // Body: dark blue-purple carapace
      ctx.fillStyle = '#3A2A6A';
      ctx.fillRect(pos.x, pos.y, this.w, this.h);
      ctx.fillStyle = '#5A4A9A';
      ctx.fillRect(pos.x + 2, pos.y + 2, this.w - 4, this.h - 6);
      // Eyes
      ctx.fillStyle = '#FFFFFF';
      var eyeOff = this.facing > 0 ? 10 : 2;
      ctx.fillRect(pos.x + eyeOff, pos.y + 3, 3, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(pos.x + eyeOff + 1, pos.y + 4, 1, 1);
      // Animated legs
      ctx.fillStyle = '#2A1A5A';
      var legOff = this.animFrame === 0 ? 0 : 1;
      ctx.fillRect(pos.x + 2, pos.y + this.h - 3 + legOff, 3, 3 - legOff);
      ctx.fillRect(pos.x + 11, pos.y + this.h - 3 - legOff, 3, 3 + legOff);
    }
  };

  // ── Hammer Bro ──
  // Patrols back and forth and throws hammers at the player.
  function HammerBro(x, y) {
    this.type = 'hammerbro';
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
    this.applyingForce = true;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    this.active = false;
    this.patrolMinX = -Infinity;
    this.patrolMaxX = Infinity;
    this.throwTimer = 0;
    this.throwCooldown = 90; // throw a hammer every 1.5 seconds
  }

  // Hammer projectile
  function Hammer(x, y, vx, vy) {
    this.type = 'hammer';
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 8;
    this.vx = vx;
    this.vy = vy;
    this.onGround = false;
    this.dead = false;
    this.alive = true;
    this.spinFrame = 0;
    this.spinTimer = 0;
    this.active = true;
  }

  Hammer.prototype.update = function(game) {
    this.vy += Physics.GRAVITY * 0.5;
    this.x += this.vx;
    this.y += this.vy;

    // Spin animation
    this.spinTimer++;
    if (this.spinTimer >= 4) { this.spinTimer = 0; this.spinFrame = (this.spinFrame + 1) % 4; }

    // Die when off screen
    if (this.y > game.tilemap.height * TILE + 32 || this.y < -32 ||
        this.x > game.tilemap.width * TILE + 32 || this.x < -32) {
      this.dead = true;
      return;
    }

    // Hit ground
    var groundCol = Math.floor((this.x + this.w / 2) / TILE);
    var groundRow = Math.floor((this.y + this.h) / TILE);
    if (Physics.isSolidTile(game.tilemap, groundCol, groundRow)) {
      this.dead = true;
      return;
    }

    // Hit player
    var player = game.player;
    if (!player || player.dead || player.invincible || player.starPower) return;
    if (Physics.checkEntityCollision(this, player)) {
      if (player.takeDamage) player.takeDamage();
      this.dead = true;
    }
  };

  Hammer.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    // Brown hammer head
    ctx.save();
    ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
    ctx.rotate(this.spinFrame * Math.PI / 2);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, 3);
    ctx.restore();
  };

  HammerBro.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 32, this.y, this.w + 64, this.h)) {
        this.active = true;
      } else { return; }
    }

    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) this.dead = true;
      return;
    }

    if (handleFrozen(this)) return;

    // Patrol
    var checkX = this.vx < 0 ? this.x - 1 : this.x + this.w;
    var checkCol = Math.floor(checkX / TILE);
    var belowRow = Math.floor((this.y + this.h + 1) / TILE);
    if (this.onGround && !Physics.isSolidTile(game.tilemap, checkCol, belowRow)) {
      this.vx = -this.vx;
      this.facing = this.vx > 0 ? 1 : -1;
    }
    if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.5; this.facing = 1; }
    if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.5; this.facing = -1; }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);
    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -0.5 : 0.5;
      this.facing = this.vx > 0 ? 1 : -1;
    }

    // Animation
    this.animTimer++;
    if (this.animTimer >= 10) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    // Throw hammers
    this.throwTimer++;
    if (this.throwTimer >= this.throwCooldown) {
      this.throwTimer = 0;
      var player = game.player;
      if (player && !player.dead) {
        // Aim at player with arc
        var dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        var aimDir = dx > 0 ? 1 : -1;
        var hvx = aimDir * 2.5;
        var hvy = -5.5;
        var hammer = new Hammer(this.x + (aimDir > 0 ? this.w : -8), this.y, hvx, hvy);
        game.addEntity(hammer);
        this.facing = aimDir;
      }
    }

    if (this.y > game.tilemap.height * TILE + 32) { this.dead = true; return; }

    var player2 = game.player;
    if (!player2 || player2.dead || player2.invincible) return;
    if (!Physics.checkEntityCollision(this, player2)) return;

    if (player2.starPower) { enemyStarKill(this, game); return; }

    var playerBottom = player2.y + player2.h;
    var isStomping = player2.vy > 0 && playerBottom < this.y + this.h * 0.5 + 4;
    if (isStomping) {
      this.dying = true;
      this.dyingTimer = 0;
      this.dyingStyle = 'flip';
      this.vy = -4;
      game.score += 1000;
      player2.vy = -4;
      game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
    } else {
      if (player2.takeDamage) player2.takeDamage();
    }
  };

  HammerBro.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var flipped = this.facing > 0;

    if (this.dying) {
      ctx.save();
      ctx.translate(pos.x + this.w / 2, pos.y + this.h / 2);
      ctx.scale(1, -1);
      ctx.fillStyle = '#C84C0C';
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      ctx.restore();
      return;
    }

    // Helmet (red-brown)
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(pos.x + 2, pos.y, this.w - 4, 8);
    ctx.fillStyle = '#AA0000';
    ctx.fillRect(pos.x + 3, pos.y + 1, this.w - 6, 5);

    // Body
    ctx.fillStyle = '#C84C0C';
    ctx.fillRect(pos.x, pos.y + 8, this.w, 12);
    ctx.fillStyle = '#E06020';
    ctx.fillRect(pos.x + 2, pos.y + 9, this.w - 4, 8);

    // Boots
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(pos.x + 1, pos.y + 18, 5, 6);
    ctx.fillRect(pos.x + 10, pos.y + 18, 5, 6);

    // Eyes (face direction)
    ctx.fillStyle = '#FFFFFF';
    var ex = flipped ? pos.x + 10 : pos.x + 3;
    ctx.fillRect(ex, pos.y + 3, 4, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(ex + (flipped ? 2 : 1), pos.y + 4, 2, 2);

    // Arm with hammer (alternating frames)
    if (this.animFrame === 0) {
      ctx.fillStyle = '#8B4513';
      var hammerArmX = flipped ? pos.x + this.w : pos.x - 6;
      ctx.fillRect(hammerArmX, pos.y + 2, 6, 6);
      ctx.fillRect(hammerArmX + (flipped ? -2 : 2), pos.y, 6, 4);
    }
  };

  // ── Cheep Cheep ── jumping fish; spawns near gaps and leaps upward
  function CheepCheep(x, y) {
    this.type = 'cheep';
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 12;
    this.vx = -1.2;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    this.active = false;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    // Leap cycle
    this._leapTimer = 0;
    this._leapInterval = 80 + Math.floor(Math.random() * 60);
  }

  CheepCheep.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 32, this.y, this.w + 64, this.h)) {
        this.active = true;
      } else { return; }
    }
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) this.dead = true;
      return;
    }

    // Periodically leap upward
    this._leapTimer++;
    if (this._leapTimer >= this._leapInterval && this.onGround) {
      this.vy = -5.5;
      this._leapTimer = 0;
    }

    Physics.updateEntity(this, game.tilemap, 1);
    this.facing = this.vx > 0 ? 1 : -1;

    this.animTimer++;
    if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    var result = checkPlayerCollision(this, game);
    if (result === 'stomp') {
      this.dying = true;
      this.dyingStyle = 'flip';
      this.vy = -3;
      game.score += 200;
      game.player.vy = -5;
      game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
    } else if (result === 'damage') {
      game.player.takeDamage(game);
    }
  };

  CheepCheep.prototype.render = function(ctx, cam) {
    if (this.dying && this.dyingTimer > 30) return;
    var pos = cam ? { x: this.x - cam.x, y: this.y - cam.y } : { x: this.x, y: this.y };
    var flipped = this.facing > 0;
    ctx.save();
    if (flipped) {
      ctx.translate(pos.x + this.w, pos.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(pos.x, pos.y);
    }
    // Body – red oval
    ctx.fillStyle = '#E02020';
    ctx.fillRect(2, 2, 10, 8);
    ctx.fillRect(1, 4, 12, 4);
    // Tail
    ctx.fillStyle = '#C01010';
    ctx.fillRect(10, 0, 4, 3);
    ctx.fillRect(10, 9, 4, 3);
    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(1, 3, 2, 2);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(1, 3, 1, 1);
    // Fins – animate
    ctx.fillStyle = '#FF6060';
    if (this.animFrame === 0) {
      ctx.fillRect(3, 0, 5, 2);
      ctx.fillRect(3, 10, 5, 2);
    } else {
      ctx.fillRect(3, 1, 5, 1);
      ctx.fillRect(3, 10, 5, 1);
    }
    ctx.restore();
  };

  // ── Spiny ── ground enemy spawned by Lakitu; immune to stomping
  function Spiny(x, y) {
    this.type = 'spiny';
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = -0.8;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    this.active = true; // spawned dynamically, always active
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    this.patrolMinX = -Infinity;
    this.patrolMaxX = Infinity;
  }

  Spiny.prototype.update = function(game) {
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) this.dead = true;
      return;
    }

    var prevVx = this.vx;
    var checkX = this.vx < 0 ? this.x - 1 : this.x + this.w;
    var checkCol = Math.floor(checkX / TILE);
    var belowRow = Math.floor((this.y + this.h + 1) / TILE);
    if (this.onGround && !Physics.isSolidTile(game.tilemap, checkCol, belowRow)) {
      this.vx = -this.vx;
      this.facing = this.vx > 0 ? 1 : -1;
    }
    if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.8; this.facing = 1; }
    if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.8; this.facing = -1; }

    Physics.updateEntity(this, game.tilemap, 1);
    if (prevVx !== 0 && this.vx === 0) {
      this.vx = prevVx > 0 ? -0.8 : 0.8;
      this.facing = this.vx > 0 ? 1 : -1;
    }
    this.animTimer++;
    if (this.animTimer >= 10) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    var result = checkPlayerCollision(this, game);
    if (result === 'stomp') {
      // Immune to stomping — damages player instead
      game.player.takeDamage(game);
    } else if (result === 'damage') {
      game.player.takeDamage(game);
    }
  };

  Spiny.prototype.render = function(ctx, cam) {
    if (this.dying && this.dyingTimer > 30) return;
    var pos = cam ? { x: this.x - cam.x, y: this.y - cam.y } : { x: this.x, y: this.y };
    ctx.save();
    ctx.translate(pos.x, pos.y);
    // Body
    ctx.fillStyle = '#C0331A';
    ctx.fillRect(1, 4, 12, 8);
    ctx.fillRect(3, 2, 8, 10);
    // Spines (alternating with animFrame)
    ctx.fillStyle = '#FFD040';
    var spineOffsets = [1, 4, 7, 10];
    for (var i = 0; i < spineOffsets.length; i++) {
      var sx = spineOffsets[i];
      var sy = (i + this.animFrame) % 2 === 0 ? 0 : 1;
      ctx.fillRect(sx, sy, 2, 3 - sy);
    }
    // Feet
    ctx.fillStyle = '#8B2210';
    ctx.fillRect(1, 11, 3, 3);
    ctx.fillRect(10, 11, 3, 3);
    // Eye
    ctx.fillStyle = '#FFF';
    ctx.fillRect(this.facing < 0 ? 2 : 9, 5, 3, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.facing < 0 ? 3 : 10, 6, 2, 2);
    ctx.restore();
  };

  // ── Lakitu ── flies across top of screen and drops Spinies
  function Lakitu(x, y) {
    this.type = 'lakitu';
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = -1.0;
    this.vy = 0;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    this.active = false;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    this._throwTimer = 0;
    this._throwCooldown = 180;
    this._floatPhase = Math.random() * Math.PI * 2;
    this._baseY = y;
  }

  Lakitu.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 64, this.y, this.w + 128, this.h)) {
        this.active = true;
      } else { return; }
    }
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 32) this.dead = true;
      return;
    }

    // Float sinusoidally near the top of the screen
    this._floatPhase += 0.03;
    this.y = this._baseY + Math.sin(this._floatPhase) * 10;

    // Follow player horizontally at camera speed + small oscillation
    var player = game.player;
    if (player && !player.dead) {
      var targetX = player.x + (this.facing > 0 ? 60 : -60);
      this.x += (targetX - this.x) * 0.01;
    } else {
      this.x += this.vx;
    }
    this.facing = (player && player.x < this.x) ? -1 : 1;

    // Throw Spiny egg downward
    this._throwTimer++;
    if (this._throwTimer >= this._throwCooldown) {
      this._throwTimer = 0;
      var spiny = new Spiny(this.x, this.y + this.h + 2);
      spiny.vy = 2;
      game.addEntity(spiny);
    }

    this.animTimer++;
    if (this.animTimer >= 12) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    var result = checkPlayerCollision(this, game);
    if (result === 'stomp') {
      this.dying = true;
      this.dyingStyle = 'flip';
      this.vy = -3;
      game.score += 800;
      game.player.vy = -5;
      game.events.emit('enemyKilled', { enemy: this, style: 'stomp' });
    } else if (result === 'damage') {
      game.player.takeDamage(game);
    }
  };

  Lakitu.prototype.render = function(ctx, cam) {
    if (this.dying && this.dyingTimer > 30) return;
    var pos = cam ? { x: this.x - cam.x, y: this.y - cam.y } : { x: this.x, y: this.y };
    var flipped = this.facing > 0;
    ctx.save();
    if (flipped) {
      ctx.translate(pos.x + this.w, pos.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(pos.x, pos.y);
    }
    // Cloud
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 8, 16, 8);
    ctx.fillRect(2, 6, 12, 4);
    ctx.fillRect(4, 4, 8, 4);
    // Lakitu body (small)
    ctx.fillStyle = '#FFB347';
    ctx.fillRect(3, 0, 10, 10);
    // Head
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(4, -4, 8, 6);
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(5, -3, 2, 2);
    ctx.fillRect(9, -3, 2, 2);
    // Glasses
    ctx.fillStyle = '#444';
    ctx.fillRect(4, -4, 4, 1);
    ctx.fillRect(8, -4, 4, 1);
    // Fishing rod + spiny egg
    ctx.fillStyle = '#888';
    ctx.fillRect(this.animFrame === 0 ? 11 : 12, 2, 1, 8);
    // Spiny egg on rod
    ctx.fillStyle = '#C0331A';
    ctx.fillRect(this.animFrame === 0 ? 9 : 10, 9, 5, 5);
    ctx.fillStyle = '#FFD040';
    ctx.fillRect(10, 10, 2, 2);
    ctx.restore();
  };

  // ── Bowser ── castle boss, defeated when player reaches the axe switch
  function Bowser(x, y) {
    this.type = 'bowser';
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.vx = -0.6;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.dying = false;
    this.dyingTimer = 0;
    this.dyingStyle = null;
    this.active = false;
    this.animTimer = 0;
    this.animFrame = 0;
    this.facing = -1;
    this._throwTimer = 0;
    this._throwCooldown = 120;
    this._fireTimer = 0;
    this._fireCooldown = 200;
    this._jumpTimer = 0;
    this._jumpCooldown = 180;
    this.fireproof = true; // fireballs do nothing
    this.patrolMinX = x - 80;
    this.patrolMaxX = x + 32;
    this._hp = 3; // defeated after 3 axe-hits (or set dead by axe event)
  }

  Bowser.prototype.update = function(game) {
    if (!this.active) {
      if (game.camera && game.camera.isVisible(this.x - 64, this.y, this.w + 128, this.h)) {
        this.active = true;
      } else { return; }
    }
    if (this.dying) {
      this.dyingTimer++;
      this.vy += Physics.GRAVITY * 0.5;
      this.y += this.vy;
      if (this.y > game.tilemap.height * TILE + 64) this.dead = true;
      return;
    }

    // Patrol
    if (this.x <= this.patrolMinX && this.vx < 0) { this.vx = 0.6; this.facing = 1; }
    if (this.x + this.w >= this.patrolMaxX && this.vx > 0) { this.vx = -0.6; this.facing = -1; }

    var prevVx = this.vx;
    Physics.updateEntity(this, game.tilemap, 1);
    if (prevVx !== 0 && this.vx === 0) { this.vx = prevVx > 0 ? -0.6 : 0.6; this.facing = this.vx > 0 ? 1 : -1; }

    // Periodic jump
    this._jumpTimer++;
    if (this._jumpTimer >= this._jumpCooldown && this.onGround) {
      this.vy = -6;
      this._jumpTimer = 0;
    }

    // Throw hammers
    this._throwTimer++;
    if (this._throwTimer >= this._throwCooldown) {
      this._throwTimer = 0;
      var hDir = this.facing;
      var hammer = new Hammer(this.x + (hDir > 0 ? this.w : 0), this.y,
                              hDir * 3.5, -5);
      game.addEntity(hammer);
    }

    // Breathe fire (FireBall)
    this._fireTimer++;
    if (this._fireTimer >= this._fireCooldown && ProcMario.Items && ProcMario.Items.Fireball) {
      this._fireTimer = 0;
      var dir = this.facing;
      var fx = dir > 0 ? this.x + this.w : this.x - 8;
      var fy = this.y + 16;
      var fball = new ProcMario.Items.Fireball(fx, fy, dir);
      fball.type = 'bowser_fire'; // won't hurt enemies
      fball.startX = this.x; // give it longer range
      game.addEntity(fball);
    }

    this.animTimer++;
    if (this.animTimer >= 15) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    // Contact damage — immune to stomping
    var result = checkPlayerCollision(this, game);
    if (result === 'stomp' || result === 'damage') {
      game.player.takeDamage(game);
    }
  };

  Bowser.prototype.render = function(ctx, cam) {
    if (this.dying && this.dyingTimer > 45) return;
    var pos = cam ? { x: this.x - cam.x, y: this.y - cam.y } : { x: this.x, y: this.y };
    var flipped = this.facing > 0;
    ctx.save();
    if (flipped) {
      ctx.translate(pos.x + this.w, pos.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(pos.x, pos.y);
    }
    // Body (dark green)
    ctx.fillStyle = '#1A5C1A';
    ctx.fillRect(4, 8, 24, 20);
    ctx.fillRect(8, 4, 16, 8);
    // Shell/spikes on back
    ctx.fillStyle = '#2A8C2A';
    ctx.fillRect(6, 10, 4, 14);
    ctx.fillStyle = '#FFD040';
    ctx.fillRect(6, 10, 2, 2);
    ctx.fillRect(6, 15, 2, 2);
    ctx.fillRect(6, 20, 2, 2);
    // Head
    ctx.fillStyle = '#2A7C2A';
    ctx.fillRect(12, 0, 14, 10);
    // Horns
    ctx.fillStyle = '#FFD040';
    ctx.fillRect(14, -4, 4, 5);
    ctx.fillRect(22, -3, 3, 4);
    // Eyes (red, menacing)
    ctx.fillStyle = '#FF2020';
    ctx.fillRect(14, 2, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(15, 3, 2, 2);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(15, 3, 1, 1);
    // Mouth with fangs
    ctx.fillStyle = '#000';
    ctx.fillRect(16, 6, 8, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(17, 5, 2, 2);
    ctx.fillRect(21, 5, 2, 2);
    // Arms
    ctx.fillStyle = '#1A5C1A';
    ctx.fillRect(0, 10, 6, 10);
    ctx.fillRect(26, 10, 6, 10);
    // Feet (animate)
    ctx.fillStyle = '#0A3A0A';
    if (this.animFrame === 0) {
      ctx.fillRect(6, 26, 8, 6);
      ctx.fillRect(18, 26, 8, 6);
    } else {
      ctx.fillRect(4, 26, 8, 6);
      ctx.fillRect(20, 26, 8, 6);
    }
    // HP indicator (hearts above boss)
    ctx.restore();
    for (var h = 0; h < this._hp; h++) {
      ctx.fillStyle = '#FF4040';
      ctx.fillRect(pos.x + 2 + h * 10, pos.y - 10, 8, 8);
    }
  };

  // ── Factory: create enemy from level generator entity data ──
  Enemies.createFromData = function(data) {
    var enemy;
    switch (data.type) {
      case 'goomba':
        enemy = new Goomba(data.x * TILE, data.y * TILE);
        break;
      case 'koopa':
        enemy = new Koopa(data.x * TILE, (data.y - 0.5) * TILE); // koopa is taller
        break;
      case 'buzzy':
        enemy = new BuzzyBeetle(data.x * TILE, data.y * TILE);
        break;
      case 'hammerbro':
        enemy = new HammerBro(data.x * TILE, (data.y - 0.5) * TILE);
        break;
      case 'piranha':
        return new PiranhaPlant(data.x, data.y); // PiranhaPlant handles tile->pixel internally
      case 'cheep':
        enemy = new CheepCheep(data.x * TILE, data.y * TILE);
        break;
      case 'lakitu':
        enemy = new Lakitu(data.x * TILE, data.y * TILE);
        break;
      case 'spiny':
        enemy = new Spiny(data.x * TILE, data.y * TILE);
        break;
      case 'bowser':
        enemy = new Bowser(data.x * TILE, (data.y - 1) * TILE);
        break;
      default:
        return null;
    }
    // Apply patrol territory if provided by the level generator (tile coords → pixels)
    if (data.patrolMinX !== undefined) enemy.patrolMinX = data.patrolMinX * TILE;
    if (data.patrolMaxX !== undefined) enemy.patrolMaxX = data.patrolMaxX * TILE;
    return enemy;
  };

  // ── Expose constructors ──
  Enemies.Goomba = Goomba;
  Enemies.Koopa = Koopa;
  Enemies.PiranhaPlant = PiranhaPlant;
  Enemies.BuzzyBeetle = BuzzyBeetle;
  Enemies.HammerBro = HammerBro;
  Enemies.Hammer = Hammer;
  Enemies.CheepCheep = CheepCheep;
  Enemies.Spiny = Spiny;
  Enemies.Lakitu = Lakitu;
  Enemies.Bowser = Bowser;

  window.ProcMario.Enemies = Enemies;
})();
