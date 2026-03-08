/**
 * Tile type definitions and properties for Procedural Mario.
 */
window.ProcMario = window.ProcMario || {};

(function () {
  'use strict';

  // Tile type constants
  var TileType = {
    EMPTY:           0,
    GROUND:          1,
    GROUND_TOP:      2,   // grass-topped ground surface
    BRICK:           3,
    QUESTION:        4,
    QUESTION_EMPTY:  5,   // after being hit
    HARD_BLOCK:      6,
    PIPE_TOP_LEFT:   7,
    PIPE_TOP_RIGHT:  8,
    PIPE_BODY_LEFT:  9,
    PIPE_BODY_RIGHT: 10,
    COIN:            11,
    FLAGPOLE:        12,
    FLAGPOLE_TOP:    13,
    LAVA:            14,  // instant-death solid, castle theme
    ICE:             15,  // solid but frictionless, ice theme
    NOTE_BLOCK:      16,  // bounces Mario high when stomped
    WATER:           17,  // animated water tile, used in water/swimming sections
    VINE:            18   // climbable vertical tile; Mario grabs and ascends/descends
  };

  // Properties for each tile type
  // solid: blocks movement
  // breakable: destroyed when hit from below (big Mario)
  // interactive: can be activated (hit from below)
  // animated: has frame-based animation
  // visible: rendered (EMPTY is not)
  var TILE_PROPERTIES = {};

  TILE_PROPERTIES[TileType.EMPTY] = {
    solid: false, breakable: false, interactive: false, animated: false, visible: false,
    name: 'empty'
  };
  TILE_PROPERTIES[TileType.GROUND] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'ground'
  };
  TILE_PROPERTIES[TileType.GROUND_TOP] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'ground_top'
  };
  TILE_PROPERTIES[TileType.BRICK] = {
    solid: true, breakable: true, interactive: true, animated: false, visible: true,
    name: 'brick'
  };
  TILE_PROPERTIES[TileType.QUESTION] = {
    solid: true, breakable: false, interactive: true, animated: true, visible: true,
    name: 'question'
  };
  TILE_PROPERTIES[TileType.QUESTION_EMPTY] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'question_empty'
  };
  TILE_PROPERTIES[TileType.HARD_BLOCK] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'hard_block'
  };
  TILE_PROPERTIES[TileType.PIPE_TOP_LEFT] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'pipe_top_left'
  };
  TILE_PROPERTIES[TileType.PIPE_TOP_RIGHT] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'pipe_top_right'
  };
  TILE_PROPERTIES[TileType.PIPE_BODY_LEFT] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'pipe_body_left'
  };
  TILE_PROPERTIES[TileType.PIPE_BODY_RIGHT] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    name: 'pipe_body_right'
  };
  TILE_PROPERTIES[TileType.COIN] = {
    solid: false, breakable: false, interactive: false, animated: true, visible: true,
    name: 'coin'
  };
  TILE_PROPERTIES[TileType.FLAGPOLE] = {
    solid: false, breakable: false, interactive: true, animated: false, visible: true,
    name: 'flagpole'
  };
  TILE_PROPERTIES[TileType.FLAGPOLE_TOP] = {
    solid: false, breakable: false, interactive: true, animated: false, visible: true,
    name: 'flagpole_top'
  };
  TILE_PROPERTIES[TileType.LAVA] = {
    solid: true, breakable: false, interactive: false, animated: true, visible: true,
    lethal: true,  // kills on contact
    name: 'lava'
  };
  TILE_PROPERTIES[TileType.ICE] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    slippery: true, // near-zero friction
    name: 'ice'
  };
  TILE_PROPERTIES[TileType.NOTE_BLOCK] = {
    solid: true, breakable: false, interactive: false, animated: false, visible: true,
    bouncy: true, // launches entities upward
    name: 'note_block'
  };
  TILE_PROPERTIES[TileType.WATER] = {
    solid: false, breakable: false, interactive: false, animated: true, visible: true,
    swim: true, // entities move with buoyancy physics
    name: 'water'
  };
  TILE_PROPERTIES[TileType.VINE] = {
    solid: false, breakable: false, interactive: false, animated: false, visible: true,
    climbable: true, // player can grab and ascend/descend
    name: 'vine'
  };

  /**
   * Get the properties object for a tile type.
   * @param {number} type - One of TileType constants
   * @returns {object} Properties: { solid, breakable, interactive, animated, visible, name }
   */
  function getTileProperties(type) {
    return TILE_PROPERTIES[type] || TILE_PROPERTIES[TileType.EMPTY];
  }

  /**
   * Quick check helpers.
   */
  function isSolid(type) {
    var p = TILE_PROPERTIES[type];
    return p ? p.solid : false;
  }

  function isBreakable(type) {
    var p = TILE_PROPERTIES[type];
    return p ? p.breakable : false;
  }

  function isInteractive(type) {
    var p = TILE_PROPERTIES[type];
    return p ? p.interactive : false;
  }

  function isAnimated(type) {
    var p = TILE_PROPERTIES[type];
    return p ? p.animated : false;
  }

  function isLethal(type) {
    var p = TILE_PROPERTIES[type];
    return p ? !!p.lethal : false;
  }

  function isSlippery(type) {
    var p = TILE_PROPERTIES[type];
    return p ? !!p.slippery : false;
  }

  // Expose on global namespace
  ProcMario.TileType = TileType;
  ProcMario.getTileProperties = getTileProperties;
  ProcMario.isSolid = isSolid;
  ProcMario.isBreakable = isBreakable;
  ProcMario.isInteractive = isInteractive;
  ProcMario.isAnimated = isAnimated;
  ProcMario.isLethal = isLethal;
  ProcMario.isSlippery = isSlippery;
})();
