/**
 * Blocks - Question Block, Brick Block, Hidden Block interaction handlers.
 * Depends on: physics.js, engine.js, tiles.js, items.js
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  var TILE = ProcMario.Physics.TILE_SIZE;
  var TileType = ProcMario.TileType;

  var Blocks = {};

  // ── Block content registry (populated by level generator entity data) ──
  // Key: "col,row" -> { contents: 'coin'|'mushroom'|'star'|'1up', hits: N }
  var blockContents = {};

  Blocks.registerBlock = function(col, row, contents) {
    blockContents[col + ',' + row] = {
      contents: contents || 'coin',
      hits: contents === 'multi_coin' ? 5 : 1
    };
  };

  Blocks.clearRegistry = function() {
    blockContents = {};
  };

  // ── Bounce animation entities ──
  function BounceBlock(col, row, tileId) {
    this.type = 'bounce_block';
    this.col = col;
    this.row = row;
    this.x = col * TILE;
    this.y = row * TILE;
    this.w = TILE;
    this.h = TILE;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.timer = 0;
    this.offsetY = 0;
    this.tileId = tileId;
    this.z = -1; // render behind other entities
  }

  BounceBlock.prototype.update = function(game) {
    this.timer++;
    // Bounce up 4px then return over 12 frames
    if (this.timer <= 6) {
      this.offsetY = -4 * (this.timer / 6);
    } else if (this.timer <= 12) {
      this.offsetY = -4 * (1 - (this.timer - 6) / 6);
    } else {
      this.dead = true;
    }
  };

  BounceBlock.prototype.render = function(ctx, camera) {
    // This is just visual feedback; the actual tile is rendered by the tilemap
    // We render a slightly offset version
    var pos = camera.worldToScreen(this.x, this.y + this.offsetY);

    // Draw the tile appearance
    if (this.tileId === TileType.QUESTION || this.tileId === TileType.QUESTION_EMPTY) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(pos.x, pos.y, TILE, TILE);
    } else if (this.tileId === TileType.BRICK) {
      ctx.fillStyle = '#CD853F';
      ctx.fillRect(pos.x, pos.y, TILE, TILE);
    }
  };

  // ── Brick particle ──
  function BrickParticle(x, y, vx, vy) {
    this.type = 'brick_particle';
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 8;
    this.vx = vx;
    this.vy = vy;
    this.onGround = false;
    this.dead = false;
    this.timer = 0;
  }

  BrickParticle.prototype.update = function(game) {
    this.vy += ProcMario.Physics.GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.timer++;

    if (this.timer > 60 || this.y > game.tilemap.height * TILE + 32) {
      this.dead = true;
    }
  };

  BrickParticle.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(pos.x, pos.y, 8, 8);
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x + 0.5, pos.y + 0.5, 7, 7);
  };

  // ── Score popup text ──
  function ScorePopup(x, y, text) {
    this.type = 'score_popup';
    this.x = x;
    this.y = y;
    this.w = 1;
    this.h = 1;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.text = text;
    this.timer = 0;
  }

  ScorePopup.prototype.update = function() {
    this.timer++;
    this.y -= 0.8;
    if (this.timer >= 40) {
      this.dead = true;
    }
  };

  ScorePopup.prototype.render = function(ctx, camera) {
    var pos = camera.worldToScreen(this.x, this.y);
    var alpha = Math.max(0, 1 - this.timer / 40);
    ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, pos.x, pos.y);
  };

  // ── Get tilemap data accessor (handles both .data and .tiles) ──
  function getTile(tilemap, col, row) {
    if (col < 0 || row < 0 || col >= tilemap.width || row >= tilemap.height) return 0;
    if (tilemap.data) return tilemap.data[row * tilemap.width + col];
    if (tilemap.tiles) return tilemap.tiles[row * tilemap.width + col];
    return 0;
  }

  function setTile(tilemap, col, row, value) {
    if (col < 0 || row < 0 || col >= tilemap.width || row >= tilemap.height) return;
    if (tilemap.data) tilemap.data[row * tilemap.width + col] = value;
    if (tilemap.tiles) tilemap.tiles[row * tilemap.width + col] = value;
  }

  // ── Main block bump handler ──
  function handleBlockBump(game, col, row, player) {
    var tileId = getTile(game.tilemap, col, row);
    if (!tileId) return;

    var pixelX = col * TILE;
    var pixelY = row * TILE;

    if (tileId === TileType.QUESTION) {
      handleQuestionBlock(game, col, row, pixelX, pixelY, player);
    } else if (tileId === TileType.BRICK) {
      handleBrickBlock(game, col, row, pixelX, pixelY, player);
    }

    // Kill enemies standing on top of the bumped block
    bumpEnemiesAbove(game, col, row);
  }

  function handleQuestionBlock(game, col, row, pixelX, pixelY, player) {
    // Change to empty question block
    setTile(game.tilemap, col, row, TileType.QUESTION_EMPTY);

    // Bounce animation
    game.addEntity(new BounceBlock(col, row, TileType.QUESTION_EMPTY));

    // Determine contents
    var key = col + ',' + row;
    var blockData = blockContents[key];
    var contents = blockData ? blockData.contents : 'coin';

    switch (contents) {
      case 'coin':
        // Popup coin animation
        game.addEntity(new ProcMario.Items.PopupCoin(pixelX + 4, pixelY));
        game.coins++;
        game.score += 200;
        game.events.emit('coinCollected', { x: pixelX, y: pixelY });
        game.addEntity(new ScorePopup(pixelX + 8, pixelY - 8, '200'));

        if (game.coins >= 100) {
          game.coins = 0;
          game.lives++;
          game.events.emit('1up', { x: pixelX, y: pixelY });
        }
        break;

      case 'mushroom':
        // If player is already big, spawn a random upgrade flower/cape
        if (player && player.powerState && player.powerState !== 'small') {
          var upgradeRoll = Math.random();
          if (upgradeRoll < 0.4) {
            game.addEntity(new ProcMario.Items.FireFlower(pixelX, pixelY));
          } else if (upgradeRoll < 0.6 && ProcMario.Items.IceFlower) {
            game.addEntity(new ProcMario.Items.IceFlower(pixelX, pixelY));
          } else if (upgradeRoll < 0.75 && ProcMario.Items.Cape) {
            game.addEntity(new ProcMario.Items.Cape(pixelX, pixelY));
          } else {
            game.addEntity(new ProcMario.Items.FireFlower(pixelX, pixelY));
          }
        } else {
          // Small Mario: mushroom, or rare mini mushroom
          if (Math.random() < 0.1 && ProcMario.Items.MiniMushroom) {
            game.addEntity(new ProcMario.Items.MiniMushroom(pixelX, pixelY));
          } else {
            game.addEntity(new ProcMario.Items.Mushroom(pixelX, pixelY));
          }
        }
        break;

      case 'star':
        var star = new ProcMario.Items.Star(pixelX, pixelY);
        game.addEntity(star);
        break;

      case '1up':
        var oneUp = new ProcMario.Items.OneUpMushroom(pixelX, pixelY);
        game.addEntity(oneUp);
        break;

      case 'axe':
        // Kill all Bowser entities and trigger level complete
        var entities = game.entities;
        for (var ai = 0; ai < entities.length; ai++) {
          if (entities[ai].type === 'bowser' && !entities[ai].dead) {
            entities[ai].dying = true;
            entities[ai].dyingTimer = 0;
            entities[ai].vy = -4;
            game.score += 5000;
            game.events.emit('enemyKilled', { enemy: entities[ai], style: 'axe' });
          }
        }
        game.score += 2000;
        setTimeout(function() { game.events.emit('levelComplete'); }, 1000);
        break;
    }

    // Remove from registry
    delete blockContents[key];
  }

  function handleBrickBlock(game, col, row, pixelX, pixelY, player) {
    // Check for hidden coin contents
    var key = col + ',' + row;
    var blockData = blockContents[key];

    if (blockData && blockData.hits > 0) {
      // Multi-coin brick
      blockData.hits--;
      game.addEntity(new ProcMario.Items.PopupCoin(pixelX + 4, pixelY));
      game.coins++;
      game.score += 200;
      game.addEntity(new ScorePopup(pixelX + 8, pixelY - 8, '200'));
      game.addEntity(new BounceBlock(col, row, TileType.BRICK));

      if (blockData.hits <= 0) {
        setTile(game.tilemap, col, row, TileType.QUESTION_EMPTY);
        delete blockContents[key];
      }

      if (game.coins >= 100) {
        game.coins = 0;
        game.lives++;
        game.events.emit('1up', { x: pixelX, y: pixelY });
      }
      return;
    }

    // Player power state determines behavior
    var isBig = player && player.powerState && player.powerState !== 'small';

    if (isBig) {
      // Break the brick
      setTile(game.tilemap, col, row, TileType.EMPTY);
      game.score += 50;

      // Spawn 4 brick particles
      var speeds = [
        { vx: -1.5, vy: -4 },
        { vx: 1.5,  vy: -4 },
        { vx: -1,   vy: -2.5 },
        { vx: 1,    vy: -2.5 }
      ];
      for (var i = 0; i < speeds.length; i++) {
        game.addEntity(new BrickParticle(
          pixelX + (i < 2 ? 0 : 8),
          pixelY + (i < 2 ? 0 : 8),
          speeds[i].vx,
          speeds[i].vy
        ));
      }

      game.events.emit('brickBroken', { col: col, row: row });
    } else {
      // Just bump (small player)
      game.addEntity(new BounceBlock(col, row, TileType.BRICK));
    }
  }

  // ── Bump enemies standing on top of the hit block ──
  function bumpEnemiesAbove(game, col, row) {
    var bumpX = col * TILE;
    var bumpY = (row - 1) * TILE;
    var bumpRect = { x: bumpX, y: bumpY, w: TILE, h: TILE };

    var entities = game.entities;
    for (var i = 0; i < entities.length; i++) {
      var ent = entities[i];
      if (ent.dead || ent.dying) continue;
      if (ent.type !== 'goomba' && ent.type !== 'koopa') continue;

      if (ProcMario.Physics.aabbCheck(
        { x: ent.x, y: ent.y, w: ent.w, h: ent.h },
        bumpRect
      )) {
        ent.dying = true;
        ent.dyingTimer = 0;
        ent.dyingStyle = 'flip';
        ent.vy = -4;
        ent.vx = 0;
        game.score += 100;
        game.events.emit('enemyKilled', { enemy: ent, style: 'bump' });
      }
    }
  }

  // ── Hidden Block ──
  // Hidden blocks are registered similarly but the tile is EMPTY until hit.
  // When a player bumps an EMPTY tile that is registered as hidden, reveal it.
  function handleHiddenBlock(game, col, row, player) {
    var key = col + ',' + row;
    if (!blockContents[key]) return false;

    var blockData = blockContents[key];
    if (!blockData.hidden) return false;

    // Reveal the block
    setTile(game.tilemap, col, row, TileType.QUESTION_EMPTY);
    game.addEntity(new BounceBlock(col, row, TileType.QUESTION_EMPTY));

    // Spawn contents
    var pixelX = col * TILE;
    var pixelY = row * TILE;
    switch (blockData.contents) {
      case 'coin':
        game.addEntity(new ProcMario.Items.PopupCoin(pixelX + 4, pixelY));
        game.coins++;
        game.score += 200;
        break;
      case '1up':
        game.addEntity(new ProcMario.Items.OneUpMushroom(pixelX, pixelY));
        break;
      case 'mushroom':
        game.addEntity(new ProcMario.Items.Mushroom(pixelX, pixelY));
        break;
    }

    delete blockContents[key];
    return true;
  }

  Blocks.registerHiddenBlock = function(col, row, contents) {
    blockContents[col + ',' + row] = {
      contents: contents || 'coin',
      hits: 1,
      hidden: true
    };
  };

  // ── Initialize: hook into game events ──
  Blocks.init = function(game) {
    Blocks.clearRegistry();

    // The physics engine calls entity.onBumpBlock(col, row) when hitting from below.
    // We need to hook this on the player.
    var hookPlayer = function() {
      if (!game.player) return;
      game.player.onBumpBlock = function(col, row) {
        var tileId = getTile(game.tilemap, col, row);

        // Check for hidden block first
        if (tileId === TileType.EMPTY) {
          handleHiddenBlock(game, col, row, game.player);
          return;
        }

        game.events.emit('blockBump', { col: col, row: row, player: game.player });
        handleBlockBump(game, col, row, game.player);
      };
    };

    // Hook when player is created
    hookPlayer();
    game.events.on('playerSpawned', hookPlayer);
  };

  // ── Register blocks from level generator entities ──
  Blocks.registerFromLevelData = function(entities) {
    for (var i = 0; i < entities.length; i++) {
      var ent = entities[i];
      if (ent.type === 'question_block') {
        Blocks.registerBlock(ent.x, ent.y, ent.contents);
      }
    }
  };

  // ── Expose ──
  Blocks.BounceBlock = BounceBlock;
  Blocks.BrickParticle = BrickParticle;
  Blocks.ScorePopup = ScorePopup;
  Blocks.handleBlockBump = handleBlockBump;

  window.ProcMario.Blocks = Blocks;
})();
