(function() {
  'use strict';

  var Physics = {};

  // Constants
  Physics.GRAVITY = 0.4;
  Physics.MAX_FALL_SPEED = 8;
  Physics.FRICTION = 0.85;
  Physics.TILE_SIZE = 16;

  // AABB collision detection - returns true if two rects overlap
  Physics.aabbCheck = function(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  };

  // Point in rect test
  Physics.pointInRect = function(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
  };

  // Rect overlap - returns overlap rect or null
  Physics.rectOverlap = function(a, b) {
    var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0) {
      return {
        x: Math.max(a.x, b.x),
        y: Math.max(a.y, b.y),
        w: ox,
        h: oy
      };
    }
    return null;
  };

  // Get tile indices that a rect overlaps
  Physics.getTilesInRange = function(x, y, w, h) {
    var ts = Physics.TILE_SIZE;
    var startCol = Math.floor(x / ts);
    var endCol = Math.floor((x + w - 0.001) / ts);
    var startRow = Math.floor(y / ts);
    var endRow = Math.floor((y + h - 0.001) / ts);
    var tiles = [];
    for (var row = startRow; row <= endRow; row++) {
      for (var col = startCol; col <= endCol; col++) {
        tiles.push({ col: col, row: row });
      }
    }
    return tiles;
  };

  // Check if a tile is solid in the tilemap
  Physics.isSolidTile = function(tilemap, col, row) {
    if (!tilemap) return false;
    if (row < 0) return false;
    if (col < 0 || col >= tilemap.width) return false;
    if (row >= tilemap.height) return false; // below map — allow falling through pits
    var tile = tilemap.data[row * tilemap.width + col];
    return tile > 0 && tilemap.solidTiles.indexOf(tile) !== -1;
  };

  // Apply gravity to an entity
  Physics.applyGravity = function(entity, dt) {
    if (!entity.onGround) {
      entity.vy += Physics.GRAVITY * dt;
      if (entity.vy > Physics.MAX_FALL_SPEED) {
        entity.vy = Physics.MAX_FALL_SPEED;
      }
    }
  };

  // Resolve X-axis tile collisions for an entity
  Physics.resolveX = function(entity, tilemap) {
    if (!tilemap) return;
    var ts = Physics.TILE_SIZE;
    var tiles = Physics.getTilesInRange(entity.x, entity.y, entity.w, entity.h);

    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!Physics.isSolidTile(tilemap, t.col, t.row)) continue;

      var tileRect = { x: t.col * ts, y: t.row * ts, w: ts, h: ts };
      var entRect = { x: entity.x, y: entity.y, w: entity.w, h: entity.h };

      if (Physics.aabbCheck(entRect, tileRect)) {
        if (entity.vx > 0) {
          entity.x = tileRect.x - entity.w;
          entity.vx = 0;
        } else if (entity.vx < 0) {
          entity.x = tileRect.x + ts;
          entity.vx = 0;
        }
      }
    }
  };

  // Resolve Y-axis tile collisions for an entity
  Physics.resolveY = function(entity, tilemap) {
    if (!tilemap) return;
    var ts = Physics.TILE_SIZE;
    entity.onGround = false;
    entity._onIce = false;
    entity._onLava = false;

    var tiles = Physics.getTilesInRange(entity.x, entity.y, entity.w, entity.h);

    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!Physics.isSolidTile(tilemap, t.col, t.row)) continue;

      var tileRect = { x: t.col * ts, y: t.row * ts, w: ts, h: ts };
      var entRect = { x: entity.x, y: entity.y, w: entity.w, h: entity.h };

      if (Physics.aabbCheck(entRect, tileRect)) {
        if (entity.vy > 0) {
          // Landing on top
          entity.y = tileRect.y - entity.h;
          entity.vy = 0;
          entity.onGround = true;

          // Detect tile type for special behaviour
          var tileId = tilemap.data[t.row * tilemap.width + t.col];
          if (ProcMario.TileType && tileId === ProcMario.TileType.ICE) {
            entity._onIce = true;
          } else if (ProcMario.TileType && tileId === ProcMario.TileType.LAVA) {
            entity._onLava = true;
          } else if (ProcMario.TileType && tileId === ProcMario.TileType.NOTE_BLOCK) {
            // Note block: big bounce
            entity.vy = -10;
            entity.onGround = false;
            entity._noteBlockBounce = true;
          }
        } else if (entity.vy < 0) {
          // Hitting from below
          entity.y = tileRect.y + ts;
          entity.vy = 0;
          // Fire block bump event
          if (entity.onBumpBlock) {
            entity.onBumpBlock(t.col, t.row);
          }
        }
      }
    }
  };

  // Check if entity overlaps any water tiles
  Physics.checkInWater = function(entity, tilemap) {
    if (!tilemap || !tilemap.data || !ProcMario.TileType || !ProcMario.TileType.WATER) return false;
    var WATER_ID = ProcMario.TileType.WATER;
    var tiles = Physics.getTilesInRange(entity.x, entity.y, entity.w, entity.h);
    for (var i = 0; i < tiles.length; i++) {
      var tileId = tilemap.data[tiles[i].row * tilemap.width + tiles[i].col];
      if (tileId === WATER_ID) return true;
    }
    return false;
  };

  // Full physics step for an entity: gravity, move X, resolve X, move Y, resolve Y
  Physics.updateEntity = function(entity, tilemap, dt) {
    dt = dt || 1;

    // Water buoyancy: reduce gravity and cap fall speed
    entity._inWater = Physics.checkInWater(entity, tilemap);
    if (entity._inWater) {
      if (!entity.onGround) {
        entity.vy += Physics.GRAVITY * 0.2 * dt; // 20% gravity in water
        var waterMaxFall = 1.5;
        if (entity.vy > waterMaxFall) entity.vy = waterMaxFall;
      }
    } else {
      // Apply normal gravity
      Physics.applyGravity(entity, dt);
    }

    // Apply friction on ground (ice tile uses much lower friction)
    if (entity.onGround && !entity.applyingForce) {
      var frictionVal = entity._onIce ? 0.99 : Physics.FRICTION;
      entity.vx *= frictionVal;
      if (!entity._onIce && Math.abs(entity.vx) < 0.1) entity.vx = 0;
    }

    // In water: apply water drag on X
    if (entity._inWater) {
      entity.vx *= 0.92;
    }

    // Move and resolve X
    entity.x += entity.vx * dt;
    Physics.resolveX(entity, tilemap);

    // Move and resolve Y
    entity.y += entity.vy * dt;
    Physics.resolveY(entity, tilemap);
  };

  // Entity-to-entity AABB collision check
  Physics.checkEntityCollision = function(a, b) {
    return Physics.aabbCheck(
      { x: a.x, y: a.y, w: a.w, h: a.h },
      { x: b.x, y: b.y, w: b.w, h: b.h }
    );
  };

  window.ProcMario.Physics = Physics;
})();
