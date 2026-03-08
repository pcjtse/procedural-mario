/**
 * LevelGenerator - Procedural level generation for Procedural Mario.
 * Produces fun, varied, always-completable Mario-style levels.
 *
 * Depends on: tiles.js (TileType), tilemap.js (TileMap)
 */
window.ProcMario = window.ProcMario || {};

(function () {
  'use strict';

  var T = ProcMario.TileType;

  // ---- Segment type enum ----
  var SegType = {
    FLAT:      0,
    GAP:       1,
    PLATFORMS: 2,
    PIPES:     3,
    STAIRS:    4,
    COIN_RUN:  5,
    CHALLENGE: 6,
    VERTICAL:  7   // short vertical climbing segment (zig-zag platforms)
  };

  // Max jump distance (in tiles) Mario can clear with a running jump
  var MAX_JUMP_TILES = 5;
  // Max jump height (in tiles) Mario can reach from the surface he is standing on.
  // Derived from physics: v² / (2 * gravity) = 7.2² / (2 * 0.4) ≈ 64.8 px ≈ 4 tiles.
  var MAX_JUMP_HEIGHT = 4;
  // Level height in tiles
  var LEVEL_HEIGHT = 15;
  // Ground row index (0-indexed from top; ground surface is row 13, fill below)
  var GROUND_Y = 13;

  // ---------------------------------------------------------------
  // Seeded PRNG (Mulberry32)
  // ---------------------------------------------------------------
  function mulberry32(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------
  // LevelGenerator constructor
  // ---------------------------------------------------------------

  /**
   * @param {number} seed       - Integer seed for deterministic generation
   * @param {number} difficulty - 0.0 (easy) to 1.0 (hard)
   * @param {string} theme      - 'overworld' | 'underground' | 'sky' | 'castle'
   */
  function LevelGenerator(seed, difficulty, theme) {
    this.seed       = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
    this.difficulty = Math.max(0, Math.min(1, difficulty || 0));
    this.theme      = theme || 'overworld';
    this.rand       = mulberry32(this.seed);
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  /**
   * Generate a complete level.
   * @returns {{ tiles: number[][], entities: Array, width: number, height: number, seed: number }}
   */
  LevelGenerator.prototype.generate = function () {
    // Determine level width based on difficulty (easier = shorter)
    var minW = 200;
    var maxW = 400;
    var width = Math.floor(minW + (maxW - minW) * (0.5 + this.difficulty * 0.5));
    // Round to nice number
    width = Math.ceil(width / 10) * 10;

    var height = LEVEL_HEIGHT;

    // Allocate 2D grid (row-major: grid[y][x])
    var grid = [];
    for (var y = 0; y < height; y++) {
      grid.push(new Array(width));
      for (var x = 0; x < width; x++) {
        grid[y][x] = T.EMPTY;
      }
    }

    // Entity list
    var entities = [];

    // ---- Build level in segments ----
    var cursor = 0;

    // 1. Safe starting area (flat, 10 tiles)
    cursor = this._placeFlat(grid, cursor, 10, false);

    // 2. Main body segments
    while (cursor < width - 20) {
      var segType = this._pickSegment();
      var segWidth = this._segmentWidth(segType);

      // Don't overshoot
      if (cursor + segWidth > width - 20) break;

      cursor = this._buildSegment(grid, entities, cursor, segType, segWidth);
    }

    // 3. End section: staircase + flagpole
    cursor = this._placeEndSection(grid, cursor, width, entities);

    // Fill remaining ground to the edge
    this._fillGround(grid, cursor, width);

    // ---- Add Lakitu for sky theme ----
    if (this.theme === 'sky') {
      var numLakitu = 1 + Math.floor(this.difficulty * 1.5);
      for (var li = 0; li < numLakitu; li++) {
        var lx = this._randInt(20, width - 20);
        entities.push({ type: 'lakitu', x: lx, y: 1 });
      }
    }

    // ---- Add Cheep Cheep (overworld / sky / ice / water themes) ----
    if (this.theme === 'overworld' || this.theme === 'sky' || this.theme === 'ice') {
      if (this.rand() < 0.4 + this.difficulty * 0.3) {
        var numCheep = 1 + Math.floor(this.difficulty * 2);
        for (var ci = 0; ci < numCheep; ci++) {
          var cx = this._randInt(10, width - 10);
          entities.push({ type: 'cheep', x: cx, y: GROUND_Y - 2 });
        }
      }
    } else if (this.theme === 'water') {
      // Water world: many Cheep Cheeps scattered throughout
      var numWaterCheep = 3 + Math.floor(this.difficulty * 4);
      for (var wci = 0; wci < numWaterCheep; wci++) {
        var wcx = this._randInt(10, width - 10);
        var wcy = this._randInt(4, GROUND_Y - 2);
        entities.push({ type: 'cheep', x: wcx, y: wcy });
      }
    }

    // ---- Validation pass ----
    this._validateGaps(grid, width);
    this._validateObstacleHeights(grid, width);

    // ---- Theme post-processing ----
    if (this.theme === 'underground') {
      this._addCaveCeiling(grid, width);
    } else if (this.theme === 'water') {
      this._floodWater(grid, width);
    }

    // ---- Build TileMap ----
    var tileMap = new ProcMario.TileMap(width, height);
    tileMap.loadFromArray(grid);

    return {
      tiles: grid,
      tileMap: tileMap,
      entities: entities,
      width: width,
      height: height,
      seed: this.seed
    };
  };

  // ---------------------------------------------------------------
  // Segment picking
  // ---------------------------------------------------------------

  /**
   * Choose a segment type with weighted random selection.
   * Weights shift with difficulty and theme.
   */
  LevelGenerator.prototype._pickSegment = function () {
    var d = this.difficulty;
    var weights;

    switch (this.theme) {
      case 'underground':
        // Caves: lots of platforms and flat sections, very few open gaps,
        // pipes act as cave pillars, more challenges as difficulty rises.
        weights = [
          /* FLAT      */ 3 - d * 0.5,
          /* GAP       */ 0.2 + d * 0.4,
          /* PLATFORMS */ 3   + d * 1,
          /* PIPES     */ 2,
          /* STAIRS    */ 1.5 + d * 0.5,
          /* COIN_RUN  */ 1.5 - d * 0.3,
          /* CHALLENGE */ d * 2,
          /* VERTICAL  */ 1
        ];
        break;
      case 'sky':
        // Sky world: many platforms and gaps, fewer pipes, coin-heavy.
        weights = [
          /* FLAT      */ 1.5 - d * 0.5,
          /* GAP       */ 2   + d * 1.5,
          /* PLATFORMS */ 3   + d * 1.5,
          /* PIPES     */ 0.5,
          /* STAIRS    */ 1   + d * 0.5,
          /* COIN_RUN  */ 2   + d * 0.5,
          /* CHALLENGE */ d * 2,
          /* VERTICAL  */ 0.5
        ];
        break;
      case 'castle':
        // Castle: dangerous gaps, long stairways, heavy on challenges,
        // fewer coins, very few pipes.
        weights = [
          /* FLAT      */ 2   - d * 0.5,
          /* GAP       */ 1   + d * 1.5,
          /* PLATFORMS */ 1.5,
          /* PIPES     */ 0.5,
          /* STAIRS    */ 2   + d * 0.5,
          /* COIN_RUN  */ 0.5,
          /* CHALLENGE */ 2   + d * 3,
          /* VERTICAL  */ 0.5
        ];
        break;
      case 'ice':
        // Ice world: lots of flat/slippery ground and platforms, fewer pipes,
        // slippery surfaces make gaps feel harder so keep them smaller.
        weights = [
          /* FLAT      */ 3   - d * 1,
          /* GAP       */ 0.8 + d * 1.2,
          /* PLATFORMS */ 3   + d * 1,
          /* PIPES     */ 0.5,
          /* STAIRS    */ 1   + d * 0.5,
          /* COIN_RUN  */ 2   - d * 0.5,
          /* CHALLENGE */ d * 1.5,
          /* VERTICAL  */ 1
        ];
        break;
      case 'water':
        // Water world: lots of flat submerged ground, many platforms (coral reefs),
        // many coins to collect underwater, fewer pipes, some gaps (air pockets).
        weights = [
          /* FLAT      */ 3   - d * 0.5,
          /* GAP       */ 0.5 + d * 1,
          /* PLATFORMS */ 3   + d * 1,
          /* PIPES     */ 0.5,
          /* STAIRS    */ 0.5,
          /* COIN_RUN  */ 3   - d * 0.5,
          /* CHALLENGE */ d * 1.5,
          /* VERTICAL  */ 0.5
        ];
        break;
      default: // overworld
        weights = [
          /* FLAT      */ 3 - d * 1.5,
          /* GAP       */ 1 + d * 2,
          /* PLATFORMS */ 2 + d * 1,
          /* PIPES     */ 1.5,
          /* STAIRS    */ 1 + d * 0.5,
          /* COIN_RUN  */ 1.5 - d * 0.5,
          /* CHALLENGE */ d * 2.5,
          /* VERTICAL  */ 0.8
        ];
    }

    var total = 0;
    for (var i = 0; i < weights.length; i++) {
      weights[i] = Math.max(0, weights[i]);
      total += weights[i];
    }

    var r = this.rand() * total;
    var acc = 0;
    for (var j = 0; j < weights.length; j++) {
      acc += weights[j];
      if (r <= acc) return j;
    }
    return SegType.FLAT;
  };

  /**
   * Determine width for a segment type.
   */
  LevelGenerator.prototype._segmentWidth = function (type) {
    switch (type) {
      case SegType.FLAT:      return this._randInt(8, 14);
      case SegType.GAP:       return this._randInt(8, 12);
      case SegType.PLATFORMS: return this._randInt(10, 16);
      case SegType.PIPES:     return this._randInt(8, 14);
      case SegType.STAIRS:    return this._randInt(8, 12);
      case SegType.COIN_RUN:  return this._randInt(10, 16);
      case SegType.CHALLENGE: return this._randInt(12, 20);
      case SegType.VERTICAL:  return this._randInt(10, 14);
      default: return 10;
    }
  };

  // ---------------------------------------------------------------
  // Segment builders
  // ---------------------------------------------------------------

  LevelGenerator.prototype._buildSegment = function (grid, entities, cursor, type, segWidth) {
    switch (type) {
      case SegType.FLAT:
        return this._buildFlat(grid, entities, cursor, segWidth);
      case SegType.GAP:
        return this._buildGap(grid, entities, cursor, segWidth);
      case SegType.PLATFORMS:
        return this._buildPlatforms(grid, entities, cursor, segWidth);
      case SegType.PIPES:
        return this._buildPipes(grid, entities, cursor, segWidth);
      case SegType.STAIRS:
        return this._buildStairs(grid, entities, cursor, segWidth);
      case SegType.COIN_RUN:
        return this._buildCoinRun(grid, entities, cursor, segWidth);
      case SegType.CHALLENGE:
        return this._buildChallenge(grid, entities, cursor, segWidth);
      case SegType.VERTICAL:
        return this._buildVertical(grid, entities, cursor, segWidth);
      default:
        return this._placeFlat(grid, cursor, segWidth, true);
    }
  };

  // Return a ground-enemy type appropriate for the current theme
  LevelGenerator.prototype._pickEnemy = function () {
    switch (this.theme) {
      case 'underground': return this.rand() < 0.5 ? 'buzzy' : 'goomba';
      case 'castle':      return this.rand() < 0.4 ? 'hammerbro' : (this.rand() < 0.5 ? 'koopa' : 'goomba');
      case 'ice':         return this.rand() < 0.4 ? 'buzzy' : 'goomba';
      case 'water':       return this.rand() < 0.6 ? 'cheep' : 'goomba';
      default:            return this.rand() < 0.5 ? 'goomba' : 'koopa';
    }
  };

  // -- FLAT --
  LevelGenerator.prototype._buildFlat = function (grid, entities, cursor, w) {
    this._fillGround(grid, cursor, cursor + w);

    // Maybe place some question blocks
    if (this.rand() < 0.6) {
      var bx = cursor + this._randInt(2, w - 2);
      var by = GROUND_Y - 4;
      this._placeQuestionBlock(grid, entities, bx, by);
    }

    // Maybe a brick row
    if (this.rand() < 0.4) {
      var brickStart = cursor + this._randInt(1, Math.floor(w / 2));
      var brickLen = this._randInt(3, Math.min(6, w - brickStart + cursor));
      var brickY = GROUND_Y - 4;
      for (var i = 0; i < brickLen; i++) {
        grid[brickY][brickStart + i] = T.BRICK;
      }
    }

    // Enemy on flat ground
    if (this.rand() < 0.3 + this.difficulty * 0.4) {
      var ex = cursor + this._randInt(3, w - 2);
      entities.push({ type: this._pickEnemy(), x: ex, y: GROUND_Y - 1, patrolMinX: cursor + 1, patrolMaxX: cursor + w - 1 });
    }

    return cursor + w;
  };

  // -- GAP --
  LevelGenerator.prototype._buildGap = function (grid, entities, cursor, w) {
    // Ground on the left
    var leftW = this._randInt(3, 5);
    this._fillGround(grid, cursor, cursor + leftW);

    // Gap width scales with difficulty (2 to MAX_JUMP_TILES-1)
    var maxGap = Math.min(MAX_JUMP_TILES - 1, 2 + Math.floor(this.difficulty * 3));
    var gapW = this._randInt(2, maxGap);

    // Castle theme fills gaps with lava instead of empty space
    if (this.theme === 'castle' && T.LAVA) {
      this._fillLavaGap(grid, cursor + leftW, cursor + leftW + gapW);
    }

    // Ground on the right
    var rightW = w - leftW - gapW;
    if (rightW < 2) rightW = 2;
    this._fillGround(grid, cursor + leftW + gapW, cursor + leftW + gapW + rightW);

    // Coins over the gap in an arc
    if (this.rand() < 0.7) {
      this._placeCoinArc(grid, cursor + leftW, GROUND_Y - 3, gapW);
    }

    return cursor + leftW + gapW + rightW;
  };

  // -- PLATFORMS --
  LevelGenerator.prototype._buildPlatforms = function (grid, entities, cursor, w) {
    // 30% chance to include a moving platform instead of (or in addition to) static ones
    if (this.rand() < 0.3) {
      var mpX = cursor + this._randInt(2, w - 5);
      var mpY = GROUND_Y - this._randInt(3, 5);
      var mpW = this._randInt(3, 5) * 16; // width in pixels
      var mpType = this.rand() < 0.5 ? 'horizontal' : 'vertical';
      entities.push({
        type: 'moving_platform',
        x: mpX * 16, // pixel coords
        y: mpY * 16,
        w: mpW,
        moveType: mpType,
        range: this._randInt(2, 5) * 16
      });
    }

    this._fillGround(grid, cursor, cursor + w);

    // Place 1-3 platforms at varying heights
    var numPlats = this._randInt(1, 3);
    for (var i = 0; i < numPlats; i++) {
      var platX = cursor + this._randInt(1, w - 5);
      var platW = this._randInt(3, 6);
      var platY = GROUND_Y - this._randInt(3, 6);

      // Use bricks or hard blocks
      var blockType = this.rand() < 0.5 ? T.BRICK : T.HARD_BLOCK;
      for (var bx = platX; bx < platX + platW && bx < cursor + w; bx++) {
        grid[platY][bx] = blockType;
      }

      // Question block on platform
      if (this.rand() < 0.5 && platW >= 3) {
        var qx = platX + Math.floor(platW / 2);
        this._placeQuestionBlock(grid, entities, qx, platY);
      }

      // Koopa on platform (patrol clamped to platform width)
      if (this.rand() < 0.3 + this.difficulty * 0.3) {
        entities.push({ type: 'koopa', x: platX + 1, y: platY - 1, patrolMinX: platX, patrolMaxX: platX + platW });
      }
    }

    // Coins between platforms
    if (this.rand() < 0.5) {
      var cx = cursor + this._randInt(2, w - 3);
      this._placeCoinLine(grid, cx, GROUND_Y - 2, this._randInt(3, 5));
    }

    return cursor + w;
  };

  // -- PIPES --
  LevelGenerator.prototype._buildPipes = function (grid, entities, cursor, w) {
    this._fillGround(grid, cursor, cursor + w);

    // 1-3 pipes of varying height
    var numPipes = this._randInt(1, 3);
    var px = cursor + 2;

    var hasWarpPipe = false; // only one warp pipe per pipe segment
    for (var i = 0; i < numPipes && px < cursor + w - 3; i++) {
      var pipeH = this._randInt(2, 4);
      this._placePipe(grid, px, GROUND_Y, pipeH);

      // Piranha plant in pipe
      var hasPiranha = this.rand() < 0.2 + this.difficulty * 0.4;
      if (hasPiranha) {
        entities.push({ type: 'piranha', x: px, y: GROUND_Y - pipeH - 1 });
      }

      // Warp pipe (15% chance, no piranha, no warp pipe already placed)
      if (!hasPiranha && !hasWarpPipe && this.rand() < 0.15) {
        entities.push({ type: 'warp_pipe', x: px, y: GROUND_Y - pipeH });
        hasWarpPipe = true;
      }

      px += this._randInt(4, 6);
    }

    return cursor + w;
  };

  // -- STAIRS --
  LevelGenerator.prototype._buildStairs = function (grid, entities, cursor, w) {
    this._fillGround(grid, cursor, cursor + w);

    // Ascending staircase
    var stairH = this._randInt(3, 5);
    var ascending = this.rand() < 0.5;

    for (var step = 0; step < stairH && step < w; step++) {
      var sx = ascending ? cursor + step : cursor + w - 1 - step;
      var height = step + 1;
      for (var h = 0; h < height; h++) {
        grid[GROUND_Y - 1 - h][sx] = T.HARD_BLOCK;
      }
    }

    // Enemy at base
    if (this.rand() < 0.3 + this.difficulty * 0.3) {
      var baseX = ascending ? cursor + stairH + 1 : cursor + 1;
      if (baseX > cursor && baseX < cursor + w) {
        entities.push({ type: this._pickEnemy(), x: baseX, y: GROUND_Y - 1, patrolMinX: cursor + 1, patrolMaxX: cursor + w - 1 });
      }
    }

    return cursor + w;
  };

  // -- COIN_RUN --
  LevelGenerator.prototype._buildCoinRun = function (grid, entities, cursor, w) {
    this._fillGround(grid, cursor, cursor + w);

    // Line of coins at jump height
    var coinY = GROUND_Y - 3;
    var coinStart = cursor + 2;
    var coinLen = w - 4;
    this._placeCoinLine(grid, coinStart, coinY, coinLen);

    // Maybe a question block in the middle
    if (this.rand() < 0.5) {
      var qx = cursor + Math.floor(w / 2);
      this._placeQuestionBlock(grid, entities, qx, coinY - 2);
    }

    // Occasionally place a note block (25% chance)
    if (this.rand() < 0.25 && T.NOTE_BLOCK) {
      var nx = cursor + this._randInt(2, w - 3);
      if (grid[GROUND_Y][nx] === T.GROUND_TOP || grid[GROUND_Y][nx] === T.ICE) {
        grid[GROUND_Y][nx] = T.NOTE_BLOCK;
      }
    }

    return cursor + w;
  };

  // -- CHALLENGE --
  LevelGenerator.prototype._buildChallenge = function (grid, entities, cursor, w) {
    // Combination: ground with gap, platforms, and enemies
    var leftW = this._randInt(3, 5);
    this._fillGround(grid, cursor, cursor + leftW);

    // Gap
    var gapW = this._randInt(2, Math.min(4, MAX_JUMP_TILES - 1));

    // Small floating platform over gap
    var platY = GROUND_Y - this._randInt(2, 4);
    var platX = cursor + leftW + Math.floor(gapW / 2) - 1;
    for (var p = 0; p < 3; p++) {
      if (platX + p >= 0) {
        grid[platY][platX + p] = T.BRICK;
      }
    }

    // Right ground
    var rightW = w - leftW - gapW;
    if (rightW < 3) rightW = 3;
    this._fillGround(grid, cursor + leftW + gapW, cursor + leftW + gapW + rightW);

    // Enemies (patrolling the right-ground section only)
    var numEnemies = this._randInt(1, 2 + Math.floor(this.difficulty * 2));
    var challengePatrolMin = cursor + leftW + gapW;
    var challengePatrolMax = cursor + leftW + gapW + rightW;
    for (var e = 0; e < numEnemies; e++) {
      var exx = challengePatrolMin + this._randInt(1, rightW - 1);
      entities.push({ type: this._pickEnemy(), x: exx, y: GROUND_Y - 1, patrolMinX: challengePatrolMin, patrolMaxX: challengePatrolMax });
    }

    // Power-up before the challenge
    if (this.rand() < 0.6) {
      this._placeQuestionBlock(grid, entities, cursor + 2, GROUND_Y - 4);
    }

    // Coins over gap
    this._placeCoinArc(grid, cursor + leftW, GROUND_Y - 5, gapW);

    return cursor + leftW + gapW + rightW;
  };

  // ---------------------------------------------------------------
  // Vertical climbing sub-section
  // Creates a zig-zag ladder of platforms the player climbs then descends.
  // ---------------------------------------------------------------

  LevelGenerator.prototype._buildVertical = function (grid, entities, cursor, w) {
    // Entry and exit ground anchors (2 tiles each)
    var anchorW = 2;
    this._fillGround(grid, cursor, cursor + anchorW);
    this._fillGround(grid, cursor + w - anchorW, cursor + w);

    // Interior area: no ground floor (just empty columns for mid-section)
    // Build zig-zag platforms ascending from GROUND_Y-2 to GROUND_Y-10
    // Platforms alternate left side / right side of the segment.
    // We need each jump to be ≤ MAX_JUMP_HEIGHT vertically and ≤ MAX_JUMP_TILES horizontally.
    var useVines = T.VINE && this.rand() < 0.35; // 35% chance to use vines instead of platforms
    var platW = 3; // each platform is 3 tiles wide
    var stepH = 3; // 3 rows per step (within MAX_JUMP_HEIGHT=4)
    var leftX  = cursor + anchorW;           // left-aligned platforms start here
    var rightX = cursor + w - anchorW - platW; // right-aligned platforms

    var maxSteps = Math.floor((GROUND_Y - 3) / stepH); // how many steps fit in height
    var numSteps = Math.min(maxSteps, 3 + this._randInt(0, 1)); // 3-4 steps

    if (useVines) {
      // Place a vertical vine column in the center of the segment
      var vx = cursor + Math.floor(w / 2);
      for (var vy = 2; vy < GROUND_Y; vy++) {
        if (vx < grid[0].length) grid[vy][vx] = T.VINE;
      }
      // Coins along the vine as incentive
      for (var vc2 = 3; vc2 < GROUND_Y - 1; vc2 += 3) {
        if (vx + 1 < grid[0].length) grid[vc2][vx + 1] = T.COIN;
      }
      // Question block at the top
      this._placeQuestionBlock(grid, entities, vx, 2);
      return cursor + w;
    }

    for (var step = 0; step < numSteps; step++) {
      var platY = GROUND_Y - 2 - step * stepH; // ascending
      if (platY < 2) break;

      var isLeft = (step % 2 === 0);
      var px = isLeft ? leftX : rightX;
      var tileType = this.theme === 'ice' ? T.ICE : T.HARD_BLOCK;

      for (var pi = 0; pi < platW; pi++) {
        if (px + pi < grid[0].length) grid[platY][px + pi] = tileType;
      }

      // Coin above platform mid-point as reward
      var coinY = platY - 1;
      if (coinY >= 1) {
        grid[coinY][px + 1] = T.COIN;
      }
    }

    // Place a question block on the middle step for variety
    var midStep = Math.floor(numSteps / 2);
    var midPlatY = GROUND_Y - 2 - midStep * stepH;
    var midX = midStep % 2 === 0 ? leftX + 1 : rightX + 1;
    if (midPlatY - 3 >= 1) {
      this._placeQuestionBlock(grid, entities, midX, midPlatY - 3);
    }

    return cursor + w;
  };

  // ---------------------------------------------------------------
  // End section: staircase + flagpole
  // ---------------------------------------------------------------
  LevelGenerator.prototype._placeEndSection = function (grid, cursor, levelWidth, entities) {
    entities = entities || [];

    // Fill ground to end
    this._fillGround(grid, cursor, levelWidth);

    // Boss level: castle theme on every 4th level — place Bowser, no staircase
    var isBossLevel = this.theme === 'castle' && this.levelNum && (this.levelNum % 4 === 0);

    if (!isBossLevel) {
      // Staircase (8 tiles, ascending right)
      var stairStart = levelWidth - 14;
      if (stairStart < cursor) stairStart = cursor + 2;
      for (var step = 0; step < 8; step++) {
        var sx = stairStart + step;
        if (sx >= levelWidth) break;
        for (var h = 0; h <= step; h++) {
          grid[GROUND_Y - 1 - h][sx] = T.HARD_BLOCK;
        }
      }
    } else {
      // Boss level: place an axe switch at end (represented as a question block)
      // And Bowser standing before it
      var bowserX = levelWidth - 12;
      entities.push({ type: 'bowser', x: bowserX, y: GROUND_Y - 2 });

      // Axe: represented as a special question block at the very end platform
      var axeX = levelWidth - 4;
      var axeY = GROUND_Y - 4;
      grid[axeY][axeX] = T.BRICK;
      entities.push({ type: 'question_block', x: axeX, y: axeY, contents: 'axe' });

      // Castle bridge (hard blocks across last 15 tiles)
      for (var bx = levelWidth - 16; bx < levelWidth - 2; bx++) {
        if (bx < 0 || bx >= grid[0].length) continue;
        grid[GROUND_Y][bx] = T.HARD_BLOCK;
        grid[GROUND_Y + 1] && (grid[GROUND_Y + 1][bx] = T.HARD_BLOCK);
      }
    }

    // Flagpole at end (always)
    var poleX = levelWidth - 3;
    if (!isBossLevel) {
      grid[GROUND_Y - 1][poleX] = T.HARD_BLOCK;  // base block
      for (var fy = 2; fy < GROUND_Y - 1; fy++) {
        grid[fy][poleX] = T.FLAGPOLE;
      }
      grid[1][poleX] = T.FLAGPOLE_TOP;
    } else {
      // Boss: axe trigger acts as the "flagpole" — still need an exit flagpole for level complete
      poleX = levelWidth - 2;
      grid[GROUND_Y - 1][poleX] = T.HARD_BLOCK;
      for (var fy2 = 2; fy2 < GROUND_Y - 1; fy2++) {
        grid[fy2][poleX] = T.FLAGPOLE;
      }
      grid[1][poleX] = T.FLAGPOLE_TOP;
    }

    return levelWidth;
  };

  // ---------------------------------------------------------------
  // Ground fill
  // ---------------------------------------------------------------
  LevelGenerator.prototype._fillGround = function (grid, fromX, toX) {
    var isIce = this.theme === 'ice';
    for (var x = fromX; x < toX; x++) {
      if (x < 0 || x >= grid[0].length) continue;
      // Top surface: use ICE tile for ice theme so physics applies slippery friction
      grid[GROUND_Y][x] = isIce ? T.ICE : T.GROUND_TOP;
      // Underground fill
      for (var y = GROUND_Y + 1; y < grid.length; y++) {
        grid[y][x] = T.GROUND;
      }
    }
  };

  // Fill a gap column with lava (castle theme)
  LevelGenerator.prototype._fillLavaGap = function (grid, fromX, toX) {
    if (!T.LAVA) return; // tile type not defined yet — skip
    for (var x = fromX; x < toX; x++) {
      if (x < 0 || x >= grid[0].length) continue;
      grid[GROUND_Y][x] = T.LAVA;
      for (var y = GROUND_Y + 1; y < grid.length; y++) {
        grid[y][x] = T.LAVA;
      }
    }
  };

  // ---------------------------------------------------------------
  // Placement helpers
  // ---------------------------------------------------------------

  /**
   * Place a question block and register its contents as an entity.
   */
  LevelGenerator.prototype._placeQuestionBlock = function (grid, entities, x, y) {
    if (y < 0 || y >= LEVEL_HEIGHT || x < 0 || x >= grid[0].length) return;
    grid[y][x] = T.QUESTION;

    // Decide contents
    var r = this.rand();
    var contents;
    if (r < 0.60) contents = 'coin';
    else if (r < 0.85) contents = 'mushroom';
    else if (r < 0.95) contents = 'star';
    else contents = '1up';

    entities.push({ type: 'question_block', x: x, y: y, contents: contents });
  };

  /**
   * Place a pipe of given height at column x, with ground at groundY.
   */
  LevelGenerator.prototype._placePipe = function (grid, x, groundY, height) {
    if (x < 0 || x + 1 >= grid[0].length) return;
    var topY = groundY - height;
    // Pipe top
    grid[topY][x]     = T.PIPE_TOP_LEFT;
    grid[topY][x + 1] = T.PIPE_TOP_RIGHT;
    // Pipe body
    for (var y = topY + 1; y < groundY; y++) {
      grid[y][x]     = T.PIPE_BODY_LEFT;
      grid[y][x + 1] = T.PIPE_BODY_RIGHT;
    }
  };

  /**
   * Place a line of coins horizontally.
   */
  LevelGenerator.prototype._placeCoinLine = function (grid, startX, y, length) {
    if (y < 0 || y >= LEVEL_HEIGHT) return;
    for (var i = 0; i < length; i++) {
      var cx = startX + i;
      if (cx >= 0 && cx < grid[0].length && grid[y][cx] === T.EMPTY) {
        grid[y][cx] = T.COIN;
      }
    }
  };

  /**
   * Place coins in an arc pattern (for jumping over gaps).
   */
  LevelGenerator.prototype._placeCoinArc = function (grid, startX, peakY, spanWidth) {
    // Parabolic arc
    var mid = spanWidth / 2;
    for (var i = 0; i < spanWidth; i++) {
      var t = (i - mid) / mid;  // -1 to 1
      var arcY = Math.round(peakY + 2 * t * t);  // parabola
      var cx = startX + i;
      if (cx >= 0 && cx < grid[0].length && arcY >= 0 && arcY < LEVEL_HEIGHT) {
        if (grid[arcY][cx] === T.EMPTY) {
          grid[arcY][cx] = T.COIN;
        }
      }
    }
  };

  // ---------------------------------------------------------------
  // Underground cave ceiling
  // ---------------------------------------------------------------

  /**
   * Scatter hard-block stalactites from the ceiling for underground levels.
   * Only fills EMPTY cells to avoid overwriting gameplay-critical tiles.
   */
  LevelGenerator.prototype._addCaveCeiling = function (grid, width) {
    for (var x = 0; x < width; x++) {
      if (this.rand() < 0.12) {
        var depth = this._randInt(1, 4);
        for (var y = 0; y < depth && y < 7; y++) {
          if (grid[y][x] === T.EMPTY) {
            grid[y][x] = T.HARD_BLOCK;
          }
        }
      }
    }
  };

  // Flood open air cells with WATER tiles for water theme
  LevelGenerator.prototype._floodWater = function (grid, width) {
    if (!T.WATER) return;
    // Fill all EMPTY tiles from row 1 down to GROUND_Y-1 with WATER
    for (var x = 0; x < width; x++) {
      for (var y = 1; y < GROUND_Y; y++) {
        if (grid[y][x] === T.EMPTY) {
          grid[y][x] = T.WATER;
        }
      }
    }
  };

  // ---------------------------------------------------------------
  // Validation: ensure all gaps are jumpable
  // ---------------------------------------------------------------
  LevelGenerator.prototype._validateGaps = function (grid, width) {
    var inGap = false;
    var gapStart = 0;

    for (var x = 0; x < width; x++) {
      var hasGround = false;
      // Check if there's any solid tile in the lower area (rows GROUND_Y to bottom)
      for (var y = GROUND_Y; y < LEVEL_HEIGHT; y++) {
        if (ProcMario.isSolid(grid[y][x])) {
          hasGround = true;
          break;
        }
      }

      if (!hasGround) {
        if (!inGap) {
          inGap = true;
          gapStart = x;
        }
      } else {
        if (inGap) {
          var gapWidth = x - gapStart;
          if (gapWidth > MAX_JUMP_TILES) {
            // Fix: fill in the middle to make it jumpable
            var fillStart = gapStart + Math.floor(MAX_JUMP_TILES / 2);
            var fillEnd = x - Math.floor(MAX_JUMP_TILES / 2);
            for (var fx = fillStart; fx <= fillEnd; fx++) {
              // Place a small rescue platform
              var platY = GROUND_Y - 2;
              grid[platY][fx] = T.HARD_BLOCK;
            }
          }
          inGap = false;
        }
      }
    }
  };

  // ---------------------------------------------------------------
  // Validation: ensure all obstacles are short enough to jump over
  // ---------------------------------------------------------------

  /**
   * Scan every column for solid obstacles above ground level.
   * The "effective floor" a player approaches from is the topmost solid
   * surface in the immediately preceding column (or GROUND_Y if none).
   * If the obstacle height relative to that floor exceeds MAX_JUMP_HEIGHT,
   * a stepping platform is inserted 2–3 tiles to the left at half the
   * obstacle height so the player can clear it in two jumps.
   */
  LevelGenerator.prototype._validateObstacleHeights = function (grid, width) {
    for (var x = 1; x < width; x++) {
      // Find the topmost solid tile strictly above the ground row in this column.
      var obstacleTopY = -1;
      for (var y = 0; y < GROUND_Y; y++) {
        if (ProcMario.isSolid(grid[y][x])) {
          obstacleTopY = y;
          break;
        }
      }
      if (obstacleTopY === -1) continue; // no above-ground obstacle here

      // Determine the effective floor: the topmost solid surface in column x-1
      // (the last tile column the player stands on before hitting this obstacle).
      var effectiveFloorY = GROUND_Y;
      for (var ly = 0; ly < GROUND_Y; ly++) {
        if (ProcMario.isSolid(grid[ly][x - 1])) {
          effectiveFloorY = ly;
          break;
        }
      }

      // Height of the obstacle relative to the accessible floor.
      var relativeHeight = effectiveFloorY - obstacleTopY;
      if (relativeHeight <= MAX_JUMP_HEIGHT) continue; // jumpable — nothing to do

      // Obstacle is too tall. Place a stepping platform midway up so the player
      // can reach it from the current floor and then clear the obstacle top.
      var stepHeight = Math.ceil(relativeHeight / 2);
      var stepY      = effectiveFloorY - stepHeight; // tile row for the platform

      // Position: 2–3 tiles to the left of the obstacle column.
      var stepStartX = Math.max(1, x - 3);
      var stepEndX   = x - 1;

      for (var sx = stepStartX; sx <= stepEndX; sx++) {
        if (grid[stepY][sx] !== T.EMPTY) continue; // don't overwrite existing tiles

        // Only place the platform where there is solid ground below it,
        // so the player can actually reach this stepping stone (not a pit).
        var hasSupport = false;
        for (var fy = stepY + 1; fy <= GROUND_Y; fy++) {
          if (ProcMario.isSolid(grid[fy][sx])) {
            hasSupport = true;
            break;
          }
        }
        if (hasSupport) {
          grid[stepY][sx] = T.HARD_BLOCK;
        }
      }
    }
  };

  // ---------------------------------------------------------------
  // Flat ground helper (used for intro)
  // ---------------------------------------------------------------
  LevelGenerator.prototype._placeFlat = function (grid, cursor, width, addDecor) {
    this._fillGround(grid, cursor, cursor + width);

    if (addDecor && this.rand() < 0.4) {
      // Occasional cosmetic block
      var bx = cursor + this._randInt(2, width - 2);
      grid[GROUND_Y - 4][bx] = T.BRICK;
    }

    return cursor + width;
  };

  // ---------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------

  /**
   * Random integer in [min, max] inclusive.
   */
  LevelGenerator.prototype._randInt = function (min, max) {
    return Math.floor(this.rand() * (max - min + 1)) + min;
  };

  // ---------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------
  ProcMario.LevelGenerator = LevelGenerator;
  ProcMario.SegmentType = SegType;
})();
