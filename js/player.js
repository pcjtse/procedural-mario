(function() {
  'use strict';

  var Physics = ProcMario.Physics;
  var TILE_SIZE = Physics.TILE_SIZE;

  // ── Movement Constants ──
  var WALK_ACCEL = 0.06;
  var RUN_ACCEL = 0.1;
  var WALK_MAX = 1.5;
  var RUN_MAX = 2.5;
  var JUMP_FORCE = -7.2;
  var JUMP_FORCE_RUN = -7.8;
  var AIR_ACCEL_MULT = 0.65;
  var SKID_DECEL = 0.15;

  var COYOTE_FRAMES = 6;
  var JUMP_BUFFER_FRAMES = 6;
  var INVINCIBLE_FRAMES = 120;
  var STAR_DURATION = 600; // ~10 seconds at 60fps
  var DEATH_BOUNCE = -8;

  // Speed threshold to count as "running fast" for jump boost
  var RUN_JUMP_THRESHOLD = 2.0;

  // ── Player Class ──
  function Player(x, y) {
    // Position & size
    this.x = x || 0;
    this.y = y || 0;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;

    // Entity interface
    this.type = 'player';
    this.dead = false;
    this.onGround = false;
    this.applyingForce = false;
    this.z = 10; // render above most entities

    // Player state
    this.state = 'idle';
    this.powerState = 'small'; // 'small', 'big', 'fire'
    this.facing = 1; // 1 = right, -1 = left

    // Timers
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.starPower = false;
    this.starTimer = 0;
    this.starColorFrame = 0;

    // Transition states
    this._growing = false;
    this._growTimer = 0;
    this._shrinking = false;
    this._shrinkTimer = 0;
    this._dying = false;
    this._deathTimer = 0;
    this._deathPhase = 0; // 0 = bounce up, 1 = falling

    // Track if we were on ground last frame (for coyote time)
    this._wasOnGround = false;
    // Track if jump was initiated (for variable jump height)
    this._jumpHeld = false;

    // Animation
    this.anim = ProcMario.Animation ? ProcMario.Animation.create() : { name: 'idle', frame: 0, timer: 0 };

    // Rendering flash counter for invincibility
    this._flashCounter = 0;
  }

  // ── Block Bump Callback ──
  Player.prototype.onBumpBlock = function(col, row) {
    if (this._game) {
      this._game.events.emit('blockBump', { col: col, row: row, player: this });
    }
  };

  // ── Update ──
  Player.prototype.update = function(game) {
    this._game = game;

    // Handle transition animations (growing/shrinking)
    if (this._growing) {
      this._growTimer--;
      if (this._growTimer <= 0) {
        this._growing = false;
        this.state = 'idle';
      }
      return;
    }

    if (this._shrinking) {
      this._shrinkTimer--;
      if (this._shrinkTimer <= 0) {
        this._shrinking = false;
        this.state = 'idle';
      }
      return;
    }

    // Death animation
    if (this._dying) {
      this._deathTimer++;
      if (this._deathPhase === 0) {
        // Brief pause before bounce
        if (this._deathTimer > 20) {
          this.vy = DEATH_BOUNCE;
          this._deathPhase = 1;
        }
      } else {
        // Falling death - apply gravity manually
        this.vy += Physics.GRAVITY;
        this.y += this.vy;
        // Once fallen off screen, mark fully dead
        if (game.tilemap && this.y > game.tilemap.height * TILE_SIZE + 32) {
          this.dead = true;
          game.events.emit('playerDied', { player: this });
        }
      }
      return;
    }

    // ── Timers ──
    this.updateTimers();

    // ── Input ──
    var inputLeft = game.input.left();
    var inputRight = game.input.right();
    var inputRun = game.input.run();
    var inputJump = game.input.jump();
    var inputJumpHeld = game.input.jumpHeld();

    // ── Horizontal Movement ──
    this.applyingForce = false;

    if (inputLeft || inputRight) {
      this.applyingForce = true;
      var dir = inputRight ? 1 : -1;

      // Determine acceleration and max speed
      var accel = inputRun ? RUN_ACCEL : WALK_ACCEL;
      var maxSpeed = inputRun ? RUN_MAX : WALK_MAX;

      // Reduced air control
      if (!this.onGround) {
        accel *= AIR_ACCEL_MULT;
      }

      // Check for skidding (pressing opposite direction of movement on ground)
      var isSkidding = this.onGround && this.vx !== 0 &&
        ((dir === 1 && this.vx < -0.5) || (dir === -1 && this.vx > 0.5));

      if (isSkidding) {
        // Apply skid deceleration
        if (this.vx > 0) {
          this.vx -= SKID_DECEL;
          if (this.vx < 0) this.vx = 0;
        } else {
          this.vx += SKID_DECEL;
          if (this.vx > 0) this.vx = 0;
        }
      } else {
        // Normal acceleration
        this.vx += accel * dir;
      }

      // Clamp to max speed
      if (this.vx > maxSpeed) this.vx = maxSpeed;
      if (this.vx < -maxSpeed) this.vx = -maxSpeed;

      // Update facing direction (but not while skidding)
      if (!isSkidding) {
        this.facing = dir;
      }
    }

    // ── Jump Buffering ──
    if (inputJump) {
      this.jumpBufferTimer = JUMP_BUFFER_FRAMES;
    }

    // ── Jumping ──
    var canJump = this.onGround || this.coyoteTimer > 0;

    if (this.jumpBufferTimer > 0 && canJump) {
      // Determine jump force based on horizontal speed
      var jumpForce = (Math.abs(this.vx) >= RUN_JUMP_THRESHOLD) ? JUMP_FORCE_RUN : JUMP_FORCE;
      this.vy = jumpForce;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this._jumpHeld = true;
    }

    // ── Variable Jump Height ──
    if (this.vy < 0 && this._jumpHeld) {
      if (!inputJumpHeld) {
        // Cut jump short
        this.vy *= 0.5;
        this._jumpHeld = false;
      }
    }
    if (this.vy >= 0) {
      this._jumpHeld = false;
    }

    // ── Physics ──
    Physics.updateEntity(this, game.tilemap, 1);

    // ── Left Boundary ──
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }

    // ── Camera Left Boundary ──
    // Player can't go left of camera (like original SMB)
    if (game.camera && this.x < game.camera.x) {
      this.x = game.camera.x;
      if (this.vx < 0) this.vx = 0;
    }

    // ── Fall Death ──
    if (game.tilemap && this.y > game.tilemap.height * TILE_SIZE) {
      this.die(game);
      return;
    }

    // ── Update Animation State ──
    this.updateAnimState(inputLeft, inputRight, inputRun);
  };

  // ── Timer Updates ──
  Player.prototype.updateTimers = function() {
    // Coyote time
    if (this.onGround) {
      this.coyoteTimer = COYOTE_FRAMES;
      this._wasOnGround = true;
    } else {
      if (this._wasOnGround) {
        // Just left ground - start coyote timer countdown
        this._wasOnGround = false;
      }
      if (this.coyoteTimer > 0) {
        this.coyoteTimer--;
      }
    }

    // Jump buffer
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    // Invincibility
    if (this.invincible) {
      this.invincibleTimer--;
      this._flashCounter++;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this._flashCounter = 0;
      }
    }

    // Star power
    if (this.starPower) {
      this.starTimer--;
      this.starColorFrame++;
      if (this.starTimer <= 0) {
        this.starPower = false;
        this.invincible = false;
        this.starColorFrame = 0;
      }
    }
  };

  // ── Animation State ──
  Player.prototype.updateAnimState = function(inputLeft, inputRight, inputRun) {
    if (this._dying) {
      this.state = 'dying';
    } else if (!this.onGround) {
      if (this.vy < 0) {
        this.state = 'jumping';
      } else {
        this.state = 'falling';
      }
    } else {
      // On ground
      var absVx = Math.abs(this.vx);
      var movingRight = this.vx > 0.5;
      var movingLeft = this.vx < -0.5;
      var pressingOpposite = (movingRight && inputLeft) || (movingLeft && inputRight);

      if (pressingOpposite && absVx > 0.5) {
        this.state = 'skidding';
      } else if (absVx < 0.1) {
        this.state = 'idle';
      } else if (inputRun && absVx > WALK_MAX * 0.8) {
        this.state = 'running';
      } else {
        this.state = 'walking';
      }
    }
  };

  // ── Power-Up System ──
  Player.prototype.powerUp = function(type, game) {
    game = game || this._game;

    if (type === 'mushroom') {
      if (this.powerState === 'small') {
        this.powerState = 'big';
        this.h = 32;
        this.y -= 16; // Grow upward
        this._growing = true;
        this._growTimer = 45; // ~0.75 seconds
        this.state = 'growing';
      }
    } else if (type === 'fire') {
      if (this.powerState === 'small') {
        this.powerState = 'fire';
        this.h = 32;
        this.y -= 16;
        this._growing = true;
        this._growTimer = 45;
        this.state = 'growing';
      } else {
        this.powerState = 'fire';
      }
    } else if (type === 'star') {
      this.starPower = true;
      this.invincible = true;
      this.starTimer = STAR_DURATION;
      this.starColorFrame = 0;
    }

    if (game) {
      game.events.emit('playerPowerUp', { player: this, type: type });
    }
  };

  // ── Damage ──
  Player.prototype.takeDamage = function(game) {
    game = game || this._game;
    if (this.invincible || this.starPower) return;

    if (this.powerState === 'big' || this.powerState === 'fire') {
      // Shrink to small
      this.powerState = 'small';
      this.y += 16; // Shrink downward
      this.h = 16;
      this.invincible = true;
      this.invincibleTimer = INVINCIBLE_FRAMES;
      this._flashCounter = 0;
      this._shrinking = true;
      this._shrinkTimer = 30;
      this.state = 'shrinking';

      if (game) {
        game.events.emit('playerDamage', { player: this });
      }
    } else {
      // Small Mario dies
      this.die(game);
    }
  };

  // ── Death ──
  Player.prototype.die = function(game) {
    game = game || this._game;
    if (this._dying) return;

    this._dying = true;
    this._deathTimer = 0;
    this._deathPhase = 0;
    this.state = 'dying';
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;

    // Always die as small Mario so the correct death sprite plays (NES style)
    this.powerState = 'small';
    this.h = 16;

    if (game) {
      game.lives--;
    }
  };

  // ── Rendering ──
  Player.prototype.render = function(ctx, camera) {
    // Invincibility flash - skip drawing every other 2 frames
    if (this.invincible && !this.starPower) {
      if (Math.floor(this._flashCounter / 2) % 2 === 0) {
        return;
      }
    }

    var screen = camera.worldToScreen(this.x, this.y);
    var sx = screen.x;
    var sy = screen.y;

    // Growing/shrinking animation - alternate between small and big
    if (this._growing || this._shrinking) {
      var timer = this._growing ? this._growTimer : this._shrinkTimer;
      var showBig = Math.floor(timer / 4) % 2 === 0;
      this._renderTransition(ctx, sx, sy, showBig);
      return;
    }

    // Get animation sprite name
    var animName = 'idle';
    switch (this.state) {
      case 'walking': animName = 'walk'; break;
      case 'running': animName = 'run'; break;
      case 'jumping': animName = 'jump'; break;
      case 'falling': animName = 'fall'; break;
      case 'skidding': animName = 'skid'; break;
      case 'dying': animName = 'death'; break;
      default: animName = 'idle';
    }

    var spriteName = ProcMario.Animation ?
      ProcMario.Animation.update(this.anim, animName) : 'idle';

    var flipX = this.facing === -1;
    var starFrame = this.starPower ? (Math.floor(this.starColorFrame / 4) % 4) : -1;

    // Use pixel art system if available
    if (ProcMario.PixelArt && ProcMario.PixelArt.drawSprite) {
      ProcMario.PixelArt.drawSprite(ctx, spriteName, this.powerState, sx, sy, flipX, starFrame);
    } else {
      // Fallback: colored rectangles
      this._renderFallback(ctx, sx, sy);
    }
  };

  // Transition rendering (growing/shrinking)
  Player.prototype._renderTransition = function(ctx, sx, sy, showBig) {
    if (showBig) {
      if (ProcMario.PixelArt && ProcMario.PixelArt.drawSprite) {
        var bigY = this._growing ? sy : sy - 16;
        // When growing use the actual new power state (e.g. 'fire'), when shrinking show 'big'
        var bigState = this._growing ? this.powerState : 'big';
        ProcMario.PixelArt.drawSprite(ctx, 'idle', bigState, sx, bigY, this.facing === -1, -1);
      } else {
        this._renderFallbackBig(ctx, sx, this._growing ? sy : sy - 16);
      }
    } else {
      if (ProcMario.PixelArt && ProcMario.PixelArt.drawSprite) {
        var smallY = this._growing ? sy + 16 : sy;
        ProcMario.PixelArt.drawSprite(ctx, 'idle', 'small', sx, smallY, this.facing === -1, -1);
      } else {
        this._renderFallback(ctx, sx, this._growing ? sy + 16 : sy);
      }
    }
  };

  // Fallback rectangle renderer (small)
  Player.prototype._renderFallback = function(ctx, sx, sy) {
    // Hat (red)
    ctx.fillStyle = this.starPower ? this._getStarColor() : '#E52521';
    ctx.fillRect(sx + 2, sy, 12, 5);
    // Face (skin)
    ctx.fillStyle = '#FBB882';
    ctx.fillRect(sx + 2, sy + 5, 12, 4);
    // Body (blue/red for fire)
    ctx.fillStyle = this.powerState === 'fire' ? '#E52521' : '#2038EC';
    ctx.fillRect(sx + 1, sy + 9, 14, 4);
    // Feet (brown)
    ctx.fillStyle = '#6B3304';
    ctx.fillRect(sx + 1, sy + 13, 6, 3);
    ctx.fillRect(sx + 9, sy + 13, 6, 3);
  };

  // Fallback rectangle renderer (big)
  Player.prototype._renderFallbackBig = function(ctx, sx, sy) {
    // Hat
    ctx.fillStyle = this.starPower ? this._getStarColor() : '#E52521';
    ctx.fillRect(sx + 2, sy, 12, 5);
    // Face
    ctx.fillStyle = '#FBB882';
    ctx.fillRect(sx + 2, sy + 5, 12, 5);
    // Body
    ctx.fillStyle = this.powerState === 'fire' ? '#E52521' : '#2038EC';
    ctx.fillRect(sx + 1, sy + 10, 14, 14);
    // Feet
    ctx.fillStyle = '#6B3304';
    ctx.fillRect(sx + 1, sy + 24, 6, 8);
    ctx.fillRect(sx + 9, sy + 24, 6, 8);
  };

  Player.prototype._getStarColor = function() {
    var colors = ['#E52521', '#3CBF26', '#FFFFFF', '#2038EC'];
    return colors[Math.floor(this.starColorFrame / 4) % colors.length];
  };

  // ── Reset (for new life / level restart) ──
  Player.prototype.reset = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
    this.vx = 0;
    this.vy = 0;
    this.w = 16;
    this.h = 16;
    this.dead = false;
    this.onGround = false;
    this.state = 'idle';
    this.powerState = 'small';
    this.facing = 1;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.starPower = false;
    this.starTimer = 0;
    this.starColorFrame = 0;
    this._growing = false;
    this._shrinking = false;
    this._dying = false;
    this._deathTimer = 0;
    this._deathPhase = 0;
    this._wasOnGround = false;
    this._jumpHeld = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this._flashCounter = 0;
    if (ProcMario.Animation) {
      this.anim = ProcMario.Animation.create();
    }
  };

  window.ProcMario.Player = Player;
})();
