/**
 * TileMap - data structure and rendering for the tile grid.
 * Depends on: tiles.js (TileType, getTileProperties, isSolid, etc.)
 */
window.ProcMario = window.ProcMario || {};

(function () {
  'use strict';

  var TileType = ProcMario.TileType;
  var getTileProperties = ProcMario.getTileProperties;

  var TILE_SIZE = 16;

  // ---- Tile color palette (placeholder until sprite sheet is ready) ----
  var TILE_COLORS = {};
  TILE_COLORS[TileType.GROUND]          = '#8B4513';
  TILE_COLORS[TileType.GROUND_TOP]      = '#228B22';
  TILE_COLORS[TileType.BRICK]           = '#CD853F';
  TILE_COLORS[TileType.QUESTION]        = '#FFD700';
  TILE_COLORS[TileType.QUESTION_EMPTY]  = '#8B7355';
  TILE_COLORS[TileType.HARD_BLOCK]      = '#696969';
  TILE_COLORS[TileType.PIPE_TOP_LEFT]   = '#00A000';
  TILE_COLORS[TileType.PIPE_TOP_RIGHT]  = '#008000';
  TILE_COLORS[TileType.PIPE_BODY_LEFT]  = '#00C000';
  TILE_COLORS[TileType.PIPE_BODY_RIGHT] = '#009000';
  TILE_COLORS[TileType.COIN]            = '#FFD700';
  TILE_COLORS[TileType.FLAGPOLE]        = '#A0A0A0';
  TILE_COLORS[TileType.FLAGPOLE_TOP]    = '#00FF00';

  // ---- Animation state ----
  var animTimer = 0;
  var animFrame = 0;

  /**
   * TileMap constructor.
   * @param {number} width  - Number of tile columns
   * @param {number} height - Number of tile rows
   */
  function TileMap(width, height) {
    this.width = width;
    this.height = height;
    this.tileSize = TILE_SIZE;

    // 2D array stored as flat array for performance: tiles[y * width + x]
    this.tiles = new Uint8Array(width * height);
  }

  /**
   * Get the tile type at grid position (x, y).
   * Returns EMPTY for out-of-bounds coordinates.
   */
  TileMap.prototype.getTile = function (x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TileType.EMPTY;
    }
    return this.tiles[y * this.width + x];
  };

  /**
   * Set the tile type at grid position (x, y).
   */
  TileMap.prototype.setTile = function (x, y, type) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.tiles[y * this.width + x] = type;
  };

  /**
   * Check if the tile at (x, y) is solid.
   */
  TileMap.prototype.isSolidAt = function (x, y) {
    return ProcMario.isSolid(this.getTile(x, y));
  };

  /**
   * Check if the tile at (x, y) is breakable.
   */
  TileMap.prototype.isBreakableAt = function (x, y) {
    return ProcMario.isBreakable(this.getTile(x, y));
  };

  /**
   * Check if the tile at (x, y) is interactive.
   */
  TileMap.prototype.isInteractiveAt = function (x, y) {
    return ProcMario.isInteractive(this.getTile(x, y));
  };

  /**
   * Convert pixel coordinates to tile grid coordinates.
   */
  TileMap.prototype.pixelToTile = function (px, py) {
    return {
      x: Math.floor(px / TILE_SIZE),
      y: Math.floor(py / TILE_SIZE)
    };
  };

  /**
   * Convert tile coordinates to pixel position (top-left corner).
   */
  TileMap.prototype.tileToPixel = function (tx, ty) {
    return {
      x: tx * TILE_SIZE,
      y: ty * TILE_SIZE
    };
  };

  /**
   * Populate the tilemap from a 2D array (row-major: data[y][x]).
   */
  TileMap.prototype.loadFromArray = function (data) {
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        if (data[y] && data[y][x] !== undefined) {
          this.tiles[y * this.width + x] = data[y][x];
        }
      }
    }
  };

  /**
   * Export the tilemap as a 2D array.
   */
  TileMap.prototype.toArray = function () {
    var result = [];
    for (var y = 0; y < this.height; y++) {
      var row = [];
      for (var x = 0; x < this.width; x++) {
        row.push(this.tiles[y * this.width + x]);
      }
      result.push(row);
    }
    return result;
  };

  /**
   * Render visible tiles to the canvas context.
   * Only draws tiles within the camera viewport for performance.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} camera - { x, y, width, height } in pixels
   * @param {number} dt - delta time in seconds (for animation)
   */
  TileMap.prototype.render = function (ctx, camera, dt) {
    // Advance animation timer
    animTimer += (dt || 0);
    if (animTimer >= 0.2) {
      animTimer -= 0.2;
      animFrame = (animFrame + 1) % 4;
    }

    // Calculate visible tile range with 1-tile margin
    var startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    var endCol   = Math.min(this.width, Math.ceil((camera.x + camera.width) / TILE_SIZE) + 1);
    var startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    var endRow   = Math.min(this.height, Math.ceil((camera.y + camera.height) / TILE_SIZE) + 1);

    for (var y = startRow; y < endRow; y++) {
      for (var x = startCol; x < endCol; x++) {
        var type = this.tiles[y * this.width + x];
        if (type === TileType.EMPTY) continue;

        var px = x * TILE_SIZE - camera.x;
        var py = y * TILE_SIZE - camera.y;

        this._drawTile(ctx, type, px, py);
      }
    }
  };

  /**
   * Draw a single tile at pixel position (px, py) on the canvas.
   * Uses placeholder rectangle graphics until a sprite system is integrated.
   */
  TileMap.prototype._drawTile = function (ctx, type, px, py) {
    var s = TILE_SIZE;
    var color = TILE_COLORS[type];
    if (!color) return;

    ctx.fillStyle = color;
    ctx.fillRect(px, py, s, s);

    // Add detail based on tile type
    switch (type) {
      case TileType.GROUND_TOP:
        // Brown dirt below grass
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px, py + 4, s, s - 4);
        break;

      case TileType.BRICK:
        // Brick line pattern
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        ctx.beginPath();
        ctx.moveTo(px, py + s / 2);
        ctx.lineTo(px + s, py + s / 2);
        ctx.moveTo(px + s / 2, py);
        ctx.lineTo(px + s / 2, py + s / 2);
        ctx.stroke();
        break;

      case TileType.QUESTION:
        // Animated shimmer: shift brightness per frame
        var brightness = [0, 20, 40, 20][animFrame];
        var r = 255, g = 215 + brightness * 0.3, b = brightness;
        ctx.fillStyle = 'rgb(' + Math.min(255, r) + ',' + Math.min(255, Math.round(g)) + ',' + Math.min(255, b) + ')';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        // Question mark
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', px + s / 2, py + s / 2);
        break;

      case TileType.QUESTION_EMPTY:
        ctx.strokeStyle = '#5A4A2A';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        break;

      case TileType.HARD_BLOCK:
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        // Cross pattern
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s, py + s);
        ctx.moveTo(px + s, py);
        ctx.lineTo(px, py + s);
        ctx.stroke();
        break;

      case TileType.PIPE_TOP_LEFT:
      case TileType.PIPE_TOP_RIGHT:
        // Slightly darker top rim
        ctx.fillStyle = '#006800';
        ctx.fillRect(px, py, s, 4);
        break;

      case TileType.COIN:
        // Animated spinning coin
        var coinW = [12, 8, 4, 8][animFrame];
        var cx = px + s / 2 - coinW / 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(cx, py + 2, coinW, s - 4);
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(cx + 1, py + 3, Math.max(1, coinW - 2), s - 6);
        break;

      case TileType.FLAGPOLE:
        // Thin pole
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(px + s / 2 - 1, py, 2, s);
        break;

      case TileType.FLAGPOLE_TOP:
        // Ball on top
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(px + s / 2, py + s / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        // Pole below
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(px + s / 2 - 1, py + s / 2, 2, s / 2);
        break;

      default:
        // Generic outlined block
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        break;
    }
  };

  /**
   * Check collision of an axis-aligned bounding box against solid tiles.
   * Returns an array of { x, y, tileType } for each solid tile that overlaps.
   *
   * @param {number} left   - Left edge in pixels
   * @param {number} top    - Top edge in pixels
   * @param {number} right  - Right edge in pixels
   * @param {number} bottom - Bottom edge in pixels
   * @returns {Array} Array of collision objects
   */
  TileMap.prototype.getCollisions = function (left, top, right, bottom) {
    var results = [];
    var x1 = Math.floor(left / TILE_SIZE);
    var y1 = Math.floor(top / TILE_SIZE);
    var x2 = Math.floor((right - 0.01) / TILE_SIZE);
    var y2 = Math.floor((bottom - 0.01) / TILE_SIZE);

    for (var y = y1; y <= y2; y++) {
      for (var x = x1; x <= x2; x++) {
        var type = this.getTile(x, y);
        if (ProcMario.isSolid(type)) {
          results.push({ x: x, y: y, tileType: type });
        }
      }
    }
    return results;
  };

  // ──────────────────────────────────────────────────────────────────
  // ChunkManager — streaming tile storage for very long levels.
  //
  // Divides the tile grid into vertical strips (chunks) of CHUNK_WIDTH
  // columns.  Only chunks within ACTIVE_RADIUS of the camera column are
  // kept in the live `tilemap.data` flat array; the rest are serialised
  // to compact Uint8Array slabs and evicted from the hot array (filled
  // with zeros).  The TileMap's existing API (getTile / setTile / data)
  // continues to work unchanged; ChunkManager.update() is called once
  // per frame with the current camera x in pixels.
  // ──────────────────────────────────────────────────────────────────

  var CHUNK_WIDTH   = 16;   // columns per chunk
  var ACTIVE_RADIUS = 5;    // keep this many chunks on each side of camera

  function ChunkManager(tilemap) {
    this.tilemap      = tilemap;
    this.chunkCount   = Math.ceil(tilemap.width / CHUNK_WIDTH);
    this.height       = tilemap.height;
    // Backing store: cold chunks serialised here (null = still hot/unsaved)
    this._cold        = new Array(this.chunkCount);
    this._activeRange = { min: 0, max: -1 }; // nothing evicted yet
  }

  ChunkManager.prototype._chunkForCol = function(col) {
    return Math.floor(col / CHUNK_WIDTH);
  };

  ChunkManager.prototype._evict = function(chunkIdx) {
    var tm  = this.tilemap;
    var h   = this.height;
    var cw  = CHUNK_WIDTH;
    var startCol = chunkIdx * cw;
    var endCol   = Math.min(startCol + cw, tm.width);
    var cols     = endCol - startCol;
    var slab     = new Uint8Array(cols * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < cols; x++) {
        var hotIdx  = y * tm.width + (startCol + x);
        slab[y * cols + x] = tm.data[hotIdx];
        tm.data[hotIdx] = 0; // zero out hot array
      }
    }
    this._cold[chunkIdx] = slab;
  };

  ChunkManager.prototype._load = function(chunkIdx) {
    var slab = this._cold[chunkIdx];
    if (!slab) return; // was never evicted (still live)
    var tm       = this.tilemap;
    var h        = this.height;
    var cw       = CHUNK_WIDTH;
    var startCol = chunkIdx * cw;
    var endCol   = Math.min(startCol + cw, tm.width);
    var cols     = endCol - startCol;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < cols; x++) {
        tm.data[y * tm.width + (startCol + x)] = slab[y * cols + x];
      }
    }
    this._cold[chunkIdx] = null; // mark as hot
  };

  /**
   * Call once per frame.
   * @param {number} camX - camera left edge in pixels
   */
  ChunkManager.prototype.update = function(camX) {
    var centerChunk = this._chunkForCol(Math.floor(camX / TILE_SIZE));
    var newMin = Math.max(0, centerChunk - ACTIVE_RADIUS);
    var newMax = Math.min(this.chunkCount - 1, centerChunk + ACTIVE_RADIUS);
    var old    = this._activeRange;

    // Load newly-active chunks that weren't active before
    for (var ci = newMin; ci <= newMax; ci++) {
      if (ci < old.min || ci > old.max) {
        this._load(ci);
      }
    }

    // Evict chunks that just left the active window
    for (var ei = old.min; ei <= old.max; ei++) {
      if (ei < newMin || ei > newMax) {
        this._evict(ei);
      }
    }

    this._activeRange = { min: newMin, max: newMax };
  };

  ProcMario.ChunkManager = ChunkManager;

  // Expose
  TileMap.TILE_SIZE = TILE_SIZE;
  ProcMario.TileMap = TileMap;
  ProcMario.TILE_SIZE = TILE_SIZE;
})();
