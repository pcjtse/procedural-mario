(function() {
  'use strict';

  function Camera(viewWidth, viewHeight) {
    this.x = 0;
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.levelWidth = 0;
    this.levelHeight = viewHeight;
    this.smoothing = 0.1; // lerp factor for smooth scrolling
    this.targetX = 0;
    this.targetY = 0;
    // Player stays in left third of screen
    this.leadOffset = Math.floor(viewWidth / 3);
  }

  // Set level bounds for clamping
  Camera.prototype.setLevelBounds = function(width, height) {
    this.levelWidth = width;
    this.levelHeight = height;
  };

  // Follow a target entity (typically the player)
  Camera.prototype.follow = function(entity) {
    // Target: put player in the left third of the screen
    this.targetX = entity.x - this.leadOffset;
    this.targetY = 0; // Horizontal scrolling only (like SMB1)

    // Smooth lerp toward target
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;

    // Clamp to level boundaries
    this.clamp();
  };

  // Clamp camera to level bounds
  Camera.prototype.clamp = function() {
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
    if (this.levelWidth > 0) {
      var maxX = this.levelWidth - this.viewWidth;
      if (maxX < 0) maxX = 0;
      if (this.x > maxX) this.x = maxX;
    }
    if (this.levelHeight > 0) {
      var maxY = this.levelHeight - this.viewHeight;
      if (maxY < 0) maxY = 0;
      if (this.y > maxY) this.y = maxY;
    }
  };

  // Convert world coordinates to screen coordinates
  Camera.prototype.worldToScreen = function(wx, wy) {
    return {
      x: Math.round(wx - this.x),
      y: Math.round(wy - this.y)
    };
  };

  // Check if a rect (world coords) is visible in the viewport
  Camera.prototype.isVisible = function(x, y, w, h) {
    return x + w > this.x &&
           x < this.x + this.viewWidth &&
           y + h > this.y &&
           y < this.y + this.viewHeight;
  };

  // Get the range of tile columns/rows visible in the viewport
  Camera.prototype.getVisibleTileRange = function(tileSize) {
    var startCol = Math.floor(this.x / tileSize);
    var endCol = Math.ceil((this.x + this.viewWidth) / tileSize);
    var startRow = Math.floor(this.y / tileSize);
    var endRow = Math.ceil((this.y + this.viewHeight) / tileSize);
    return {
      startCol: Math.max(0, startCol),
      endCol: endCol,
      startRow: Math.max(0, startRow),
      endRow: endRow
    };
  };

  // Snap camera to target instantly (no lerp)
  Camera.prototype.snapTo = function(entity) {
    this.x = entity.x - this.leadOffset;
    this.y = 0;
    this.clamp();
  };

  window.ProcMario.Camera = Camera;
})();
