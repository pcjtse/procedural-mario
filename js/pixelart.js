/**
 * Pixel Art Data & Sprite System for Procedural Mario.
 * All graphics defined as pixel arrays - no external image files.
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  // NES-inspired color palette
  var PALETTE = [
    null,              // 0 = transparent
    '#000000',         // 1 = black
    '#FFFFFF',         // 2 = white
    '#B81C04',         // 3 = red
    '#FCA044',         // 4 = skin
    '#6B8CFF',         // 5 = sky blue
    '#00A800',         // 6 = green
    '#C84C0C',         // 7 = brown
    '#FCB404',         // 8 = gold/yellow
    '#E45C10',         // 9 = orange
    '#503000',         // 10 = dark brown
    '#0070EC',         // 11 = blue
    '#FCFCFC',         // 12 = bright white
    '#A8A8A8',         // 13 = gray
    '#00A844',         // 14 = pipe green
    '#F8D878',         // 15 = light yellow
    '#AC7C00',         // 16 = dark gold
    '#D82800',         // 17 = bright red
    '#585858',         // 18 = dark gray
    '#006800',         // 19 = dark green
    '#F83800',         // 20 = fire red
    '#7C7C7C'          // 21 = mid gray
  ];

  // Helper: create a 2D pixel array filled with 0
  function emptyGrid(w, h) {
    var grid = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) row.push(0);
      grid.push(row);
    }
    return grid;
  }

  // ===== PLAYER SPRITES (Small 16x16) =====
  var playerSmallIdle = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,3,3,11,3,3,3,0,0,0,0,0,0],
    [0,0,0,3,3,3,11,3,3,11,3,3,3,0,0,0],
    [0,0,3,3,3,3,11,11,11,11,3,3,3,3,0,0],
    [0,0,4,4,3,11,8,11,11,8,11,3,4,4,0,0],
    [0,0,4,4,4,11,11,11,11,11,11,4,4,4,0,0],
    [0,0,4,4,11,11,11,11,11,11,11,11,4,4,0,0],
    [0,0,0,0,11,11,11,0,0,11,11,11,0,0,0,0],
    [0,0,0,7,7,7,0,0,0,0,7,7,7,0,0,0],
    [0,0,7,7,7,7,0,0,0,0,7,7,7,7,0,0]
  ];

  var playerSmallWalk1 = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,3,3,11,3,3,0,0,0,0,0,0,0],
    [0,0,0,3,3,3,11,3,3,11,3,3,0,0,0,0],
    [0,0,3,3,3,3,11,11,11,11,3,3,0,0,0,0],
    [0,0,4,4,3,11,8,11,11,8,11,0,0,0,0,0],
    [0,0,4,4,4,11,11,11,11,11,11,0,0,0,0,0],
    [0,0,0,0,0,11,11,11,11,11,0,0,0,0,0,0],
    [0,0,0,0,0,3,3,0,7,7,7,0,0,0,0,0],
    [0,0,0,0,3,3,3,7,7,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,7,7,7,0,0,0,0,0,0,0]
  ];

  var playerSmallWalk2 = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,3,3,11,3,3,3,11,0,0,0,0,0,0],
    [0,0,3,3,3,11,3,3,3,11,3,0,0,0,0,0],
    [0,0,3,3,3,11,11,11,11,11,3,0,0,0,0,0],
    [0,0,0,0,11,8,11,11,8,11,0,0,0,0,0,0],
    [0,0,0,0,11,11,11,11,11,0,0,0,0,0,0,0],
    [0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0],
    [0,0,0,0,7,7,7,0,7,7,0,0,0,0,0,0],
    [0,0,0,0,7,7,0,0,0,7,7,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  var playerSmallWalk3 = playerSmallWalk1; // reuse frame

  var playerSmallJump = [
    [0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0],
    [0,0,0,0,0,10,10,10,4,4,1,4,0,0,0,0],
    [0,0,0,0,10,4,10,4,4,4,1,4,4,4,0,0],
    [0,0,0,0,10,4,10,10,4,4,4,10,4,4,4,0],
    [0,0,0,0,10,10,4,4,4,4,10,10,10,10,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,4,4,0,0,0],
    [0,0,3,3,3,3,11,3,3,11,3,0,0,0,0,0],
    [4,4,3,3,3,3,11,11,11,11,3,3,0,4,4,0],
    [4,4,4,0,3,11,8,11,11,8,11,3,0,4,4,0],
    [0,0,0,0,11,11,11,11,11,11,11,11,0,0,0,0],
    [0,0,0,0,11,11,11,11,11,11,11,0,0,0,0,0],
    [0,0,0,0,11,11,0,0,0,0,11,0,0,0,0,0],
    [0,0,0,0,7,7,7,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,7,7,7,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  var playerSmallSkid = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,0,3,11,3,3,3,11,0,0,0,0,0],
    [0,0,0,0,3,3,11,3,3,11,3,3,0,0,0,0],
    [0,0,0,3,3,3,11,11,11,11,3,3,3,0,0,0],
    [0,0,0,3,11,11,8,11,11,8,11,3,3,0,0,0],
    [0,0,0,0,11,11,11,11,11,11,11,0,0,0,0,0],
    [0,0,0,0,0,11,11,11,11,11,0,0,0,0,0,0],
    [0,0,0,7,7,7,0,0,0,11,11,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,7,7,7,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,7,7,7,7,0,0,0,0]
  ];

  var playerSmallDeath = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,3,3,11,3,3,3,11,3,3,0,0,0,0],
    [0,4,3,3,3,11,3,3,3,11,3,3,3,4,0,0],
    [0,4,4,3,3,11,11,11,11,11,3,3,4,4,0,0],
    [0,0,4,0,11,8,11,11,11,8,11,0,4,0,0,0],
    [0,0,0,11,11,11,11,11,11,11,11,11,0,0,0,0],
    [0,0,0,11,11,11,11,11,11,11,11,11,0,0,0,0],
    [0,0,0,0,11,11,0,0,0,11,11,0,0,0,0,0],
    [0,0,7,7,7,0,0,0,0,0,0,7,7,7,0,0],
    [0,7,7,7,7,0,0,0,0,0,0,7,7,7,7,0]
  ];

  // ===== PLAYER BIG SPRITES (16x32) =====
  var playerBigIdle = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,10,10,10,4,4,1,4,0,0,0,0,0],
    [0,0,0,10,4,10,4,4,4,1,4,4,4,0,0,0],
    [0,0,0,10,4,10,10,4,4,4,10,4,4,4,0,0],
    [0,0,0,10,10,4,4,4,4,10,10,10,10,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,3,3,11,3,3,0,0,0,0,0,0,0],
    [0,0,0,3,3,3,11,3,3,11,0,0,0,0,0,0],
    [0,0,3,3,3,3,11,11,11,11,3,3,0,0,0,0],
    [0,0,4,4,3,11,8,11,11,8,11,3,4,0,0,0],
    [0,0,4,4,4,11,11,11,11,11,11,4,4,0,0,0],
    [0,0,4,4,11,11,11,11,11,11,11,11,4,0,0,0],
    [0,0,0,0,11,11,11,0,0,11,11,11,0,0,0,0],
    [0,0,0,0,3,3,3,0,0,0,3,3,3,0,0,0],
    [0,0,0,3,3,3,11,0,0,0,11,3,3,3,0,0],
    [0,0,3,3,3,3,11,0,0,0,11,3,3,3,3,0],
    [0,0,3,3,3,3,11,11,11,11,11,3,3,3,3,0],
    [0,0,0,0,3,11,8,11,11,8,11,3,0,0,0,0],
    [0,0,0,0,3,11,11,11,11,11,11,3,0,0,0,0],
    [0,0,0,0,11,11,11,11,11,11,11,11,0,0,0,0],
    [0,0,0,0,11,11,11,0,0,11,11,11,0,0,0,0],
    [0,0,0,0,11,11,0,0,0,0,11,11,0,0,0,0],
    [0,0,0,7,7,7,0,0,0,0,7,7,7,0,0,0],
    [0,0,0,7,7,7,0,0,0,0,7,7,7,0,0,0],
    [0,0,7,7,7,7,0,0,0,0,7,7,7,7,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  var playerBigWalk1 = playerBigIdle; // simplified - use idle
  var playerBigWalk2 = playerBigIdle;
  var playerBigWalk3 = playerBigIdle;
  var playerBigJump = playerBigIdle;
  var playerBigSkid = playerBigIdle;

  // ===== ENEMY SPRITES =====
  var goombaWalk1 = [
    [0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0],
    [0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0],
    [0,0,0,0,7,7,7,7,7,7,7,7,0,0,0,0],
    [0,0,0,7,7,7,7,7,7,7,7,7,7,0,0,0],
    [0,0,7,7,7,7,7,7,7,7,7,7,7,7,0,0],
    [0,0,7,1,1,7,7,7,7,7,7,1,1,7,0,0],
    [0,7,7,12,1,7,7,7,7,7,7,1,12,7,7,0],
    [0,7,7,12,1,7,7,7,7,7,7,1,12,7,7,0],
    [0,7,7,7,7,7,1,1,1,1,7,7,7,7,7,0],
    [0,0,7,7,7,7,7,7,7,7,7,7,7,7,0,0],
    [0,0,0,7,7,7,7,7,7,7,7,7,7,0,0,0],
    [0,0,1,1,1,1,7,7,7,7,1,1,1,1,0,0],
    [0,0,0,0,4,4,1,1,1,1,4,4,0,0,0,0],
    [0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0],
    [0,0,7,7,4,4,0,0,0,0,4,4,7,7,0,0],
    [0,0,7,7,7,0,0,0,0,0,0,7,7,7,0,0]
  ];

  var goombaWalk2 = [
    [0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0],
    [0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0],
    [0,0,0,0,7,7,7,7,7,7,7,7,0,0,0,0],
    [0,0,0,7,7,7,7,7,7,7,7,7,7,0,0,0],
    [0,0,7,7,7,7,7,7,7,7,7,7,7,7,0,0],
    [0,0,7,1,1,7,7,7,7,7,7,1,1,7,0,0],
    [0,7,7,12,1,7,7,7,7,7,7,1,12,7,7,0],
    [0,7,7,12,1,7,7,7,7,7,7,1,12,7,7,0],
    [0,7,7,7,7,7,1,1,1,1,7,7,7,7,7,0],
    [0,0,7,7,7,7,7,7,7,7,7,7,7,7,0,0],
    [0,0,0,7,7,7,7,7,7,7,7,7,7,0,0,0],
    [0,0,1,1,1,1,7,7,7,7,1,1,1,1,0,0],
    [0,0,0,0,4,4,1,1,1,1,4,4,0,0,0,0],
    [0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0],
    [0,0,0,0,4,4,7,7,7,7,4,4,0,0,0,0],
    [0,0,0,0,0,7,7,7,0,7,7,7,0,0,0,0]
  ];

  var goombaSquished = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0],
    [0,0,7,1,1,7,7,7,7,7,7,1,1,7,0,0],
    [0,7,7,12,1,7,7,7,7,7,7,1,12,7,7,0],
    [7,7,7,7,7,7,1,1,1,1,7,7,7,7,7,7],
    [0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0]
  ];

  // Koopa (16x24)
  var koopaWalk1 = (function() {
    var g = emptyGrid(16, 24);
    // Shell body (rows 8-19)
    var r;
    // Head area
    for (r = 0; r < 6; r++) {
      for (var c = 5; c < 11; c++) g[r][c] = 6;
    }
    g[1][7] = 1; g[1][8] = 12; // eyes
    g[2][7] = 1; g[2][8] = 12;
    // Shell
    for (r = 6; r < 18; r++) {
      for (var c2 = 3; c2 < 13; c2++) g[r][c2] = 6;
    }
    for (r = 8; r < 16; r++) {
      for (var c3 = 5; c3 < 11; c3++) g[r][c3] = 14;
    }
    g[9][7] = 8; g[9][8] = 8; // shell highlight
    // Feet
    g[18][4] = 8; g[18][5] = 8; g[18][10] = 8; g[18][11] = 8;
    g[19][3] = 8; g[19][4] = 8; g[19][5] = 8;
    g[19][10] = 8; g[19][11] = 8; g[19][12] = 8;
    return g;
  })();

  var koopaWalk2 = koopaWalk1; // simplified

  var koopaShell = (function() {
    var g = emptyGrid(16, 24);
    for (var r = 8; r < 22; r++) {
      for (var c = 3; c < 13; c++) g[r][c] = 6;
    }
    for (var r2 = 10; r2 < 20; r2++) {
      for (var c2 = 5; c2 < 11; c2++) g[r2][c2] = 14;
    }
    g[13][7] = 8; g[13][8] = 8;
    return g;
  })();

  // Piranha plant (16x24)
  var piranhaFrame1 = (function() {
    var g = emptyGrid(16, 24);
    // Head petals
    for (var r = 0; r < 8; r++) {
      for (var c = 2; c < 14; c++) g[r][c] = 17;
    }
    // White spots
    g[2][5] = 12; g[2][6] = 12; g[2][9] = 12; g[2][10] = 12;
    g[4][4] = 12; g[4][5] = 12; g[4][10] = 12; g[4][11] = 12;
    // Mouth
    for (var c2 = 4; c2 < 12; c2++) g[6][c2] = 1;
    // Stem
    for (var r2 = 8; r2 < 24; r2++) {
      g[r2][6] = 6; g[r2][7] = 6; g[r2][8] = 14; g[r2][9] = 14;
    }
    return g;
  })();

  var piranhaFrame2 = piranhaFrame1; // simplified

  // ===== ITEM SPRITES =====
  var mushroom = (function() {
    var g = emptyGrid(16, 16);
    // Red cap
    for (var r = 0; r < 8; r++) {
      for (var c = 2; c < 14; c++) g[r][c] = 3;
    }
    for (var c2 = 4; c2 < 12; c2++) g[0][c2] = 3;
    // White spots
    g[2][5] = 12; g[2][6] = 12; g[2][9] = 12; g[2][10] = 12;
    g[3][5] = 12; g[3][6] = 12; g[3][9] = 12; g[3][10] = 12;
    g[4][4] = 12; g[4][5] = 12; g[4][10] = 12; g[4][11] = 12;
    // Face/stem
    for (var r2 = 8; r2 < 14; r2++) {
      for (var c3 = 4; c3 < 12; c3++) g[r2][c3] = 4;
    }
    g[9][5] = 1; g[9][6] = 1; g[9][9] = 1; g[9][10] = 1; // eyes
    for (var r3 = 14; r3 < 16; r3++) {
      for (var c4 = 5; c4 < 11; c4++) g[r3][c4] = 4;
    }
    return g;
  })();

  // Coin animation frames (thin to wide)
  var coinFrame1 = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 2; r < 14; r++) { g[r][7] = 8; g[r][8] = 8; }
    g[3][7] = 16; g[3][8] = 16;
    g[12][7] = 16; g[12][8] = 16;
    return g;
  })();

  var coinFrame2 = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 2; r < 14; r++) {
      for (var c = 5; c < 11; c++) g[r][c] = 8;
    }
    for (var r2 = 3; r2 < 13; r2++) { g[r2][5] = 16; g[r2][10] = 16; }
    g[2][6] = 16; g[2][9] = 16; g[13][6] = 16; g[13][9] = 16;
    return g;
  })();

  var coinFrame3 = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 2; r < 14; r++) {
      for (var c = 4; c < 12; c++) g[r][c] = 8;
    }
    for (var r2 = 3; r2 < 13; r2++) { g[r2][4] = 16; g[r2][11] = 16; }
    g[2][5] = 16; g[2][10] = 16; g[13][5] = 16; g[13][10] = 16;
    // Inner detail
    for (var r3 = 5; r3 < 11; r3++) {
      g[r3][6] = 15; g[r3][7] = 15; g[r3][8] = 15; g[r3][9] = 15;
    }
    return g;
  })();

  var coinFrame4 = coinFrame2; // mirror of frame 2

  // Star power-up
  var starFrame1 = (function() {
    var g = emptyGrid(16, 16);
    // Star shape
    g[0][7] = 8; g[0][8] = 8;
    g[1][6] = 8; g[1][7] = 15; g[1][8] = 15; g[1][9] = 8;
    g[2][6] = 8; g[2][7] = 15; g[2][8] = 15; g[2][9] = 8;
    for (var c = 1; c < 15; c++) g[3][c] = 8;
    for (var c2 = 2; c2 < 14; c2++) g[4][c2] = 8;
    g[3][4] = 15; g[3][5] = 15; g[3][10] = 15; g[3][11] = 15;
    for (var c3 = 3; c3 < 13; c3++) g[5][c3] = 8;
    for (var c4 = 4; c4 < 12; c4++) { g[6][c4] = 8; g[7][c4] = 8; }
    g[6][6] = 15; g[6][7] = 15; g[6][8] = 15; g[6][9] = 15;
    g[7][6] = 15; g[7][7] = 15; g[7][8] = 15; g[7][9] = 15;
    for (var c5 = 4; c5 < 12; c5++) g[8][c5] = 8;
    for (var c6 = 3; c6 < 13; c6++) g[9][c6] = 8;
    g[10][2] = 8; g[10][3] = 8; g[10][4] = 8; g[10][11] = 8; g[10][12] = 8; g[10][13] = 8;
    g[11][1] = 8; g[11][2] = 8; g[11][3] = 8; g[11][12] = 8; g[11][13] = 8; g[11][14] = 8;
    g[10][5] = 15; g[10][6] = 15; g[10][9] = 15; g[10][10] = 15;
    return g;
  })();

  var starFrame2 = starFrame1; // simplified

  // Fire flower
  var fireFlowerFrame1 = (function() {
    var g = emptyGrid(16, 16);
    // Petals (orange/red)
    g[0][6] = 9; g[0][7] = 9; g[0][8] = 9; g[0][9] = 9;
    g[1][5] = 9; g[1][6] = 8; g[1][7] = 8; g[1][8] = 8; g[1][9] = 8; g[1][10] = 9;
    g[2][4] = 9; g[2][5] = 8; g[2][6] = 17; g[2][7] = 17; g[2][8] = 17; g[2][9] = 17; g[2][10] = 8; g[2][11] = 9;
    g[3][4] = 9; g[3][5] = 8; g[3][6] = 17; g[3][7] = 8; g[3][8] = 8; g[3][9] = 17; g[3][10] = 8; g[3][11] = 9;
    g[4][4] = 9; g[4][5] = 8; g[4][6] = 17; g[4][7] = 8; g[4][8] = 8; g[4][9] = 17; g[4][10] = 8; g[4][11] = 9;
    g[5][5] = 9; g[5][6] = 8; g[5][7] = 17; g[5][8] = 17; g[5][9] = 8; g[5][10] = 9;
    g[6][6] = 9; g[6][7] = 9; g[6][8] = 9; g[6][9] = 9;
    // Stem
    for (var r = 7; r < 16; r++) {
      g[r][7] = 6; g[r][8] = 6;
    }
    // Leaves
    g[10][5] = 6; g[10][6] = 6; g[11][4] = 6; g[11][5] = 6;
    g[10][9] = 6; g[10][10] = 6; g[11][10] = 6; g[11][11] = 6;
    return g;
  })();

  var fireFlowerFrame2 = fireFlowerFrame1;

  // ===== TILE SPRITES (16x16) =====
  var groundTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) {
        g[r][c] = 7; // brown
      }
    }
    // Brick lines
    for (var c2 = 0; c2 < 16; c2++) { g[3][c2] = 10; g[7][c2] = 10; g[11][c2] = 10; g[15][c2] = 10; }
    g[0][7] = 10; g[1][7] = 10; g[2][7] = 10;
    g[4][3] = 10; g[5][3] = 10; g[6][3] = 10;
    g[4][11] = 10; g[5][11] = 10; g[6][11] = 10;
    g[8][7] = 10; g[9][7] = 10; g[10][7] = 10;
    g[12][3] = 10; g[13][3] = 10; g[14][3] = 10;
    g[12][11] = 10; g[13][11] = 10; g[14][11] = 10;
    return g;
  })();

  var groundTopTile = (function() {
    var g = emptyGrid(16, 16);
    // Green grass top (4 rows)
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 6;
    }
    g[0][0] = 14; g[0][5] = 14; g[0][10] = 14; g[0][15] = 14;
    // Brown below
    for (var r2 = 4; r2 < 16; r2++) {
      for (var c2 = 0; c2 < 16; c2++) g[r2][c2] = 7;
    }
    for (var c3 = 0; c3 < 16; c3++) { g[7][c3] = 10; g[11][c3] = 10; g[15][c3] = 10; }
    g[4][7] = 10; g[5][7] = 10; g[6][7] = 10;
    g[8][3] = 10; g[9][3] = 10; g[10][3] = 10;
    g[8][11] = 10; g[9][11] = 10; g[10][11] = 10;
    g[12][7] = 10; g[13][7] = 10; g[14][7] = 10;
    return g;
  })();

  var brickTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 9;
    }
    // Dark mortar lines
    for (var c2 = 0; c2 < 16; c2++) { g[3][c2] = 1; g[7][c2] = 1; g[11][c2] = 1; g[15][c2] = 1; }
    g[0][7] = 1; g[1][7] = 1; g[2][7] = 1;
    g[4][3] = 1; g[5][3] = 1; g[6][3] = 1;
    g[4][11] = 1; g[5][11] = 1; g[6][11] = 1;
    g[8][7] = 1; g[9][7] = 1; g[10][7] = 1;
    g[12][3] = 1; g[13][3] = 1; g[14][3] = 1;
    g[12][11] = 1; g[13][11] = 1; g[14][11] = 1;
    // Highlights
    g[0][0] = 15; g[4][0] = 15; g[8][0] = 15; g[12][0] = 15;
    return g;
  })();

  var questionBlock = (function() {
    // 4 shimmer frames
    var frames = [];
    for (var f = 0; f < 4; f++) {
      var g = emptyGrid(16, 16);
      for (var r = 0; r < 16; r++) {
        for (var c = 0; c < 16; c++) g[r][c] = 9;
      }
      // Border
      for (var c2 = 0; c2 < 16; c2++) { g[0][c2] = 1; g[15][c2] = 1; }
      for (var r2 = 0; r2 < 16; r2++) { g[r2][0] = 1; g[r2][15] = 1; }
      // Inner gold fill
      for (var r3 = 1; r3 < 15; r3++) {
        for (var c3 = 1; c3 < 15; c3++) g[r3][c3] = 8;
      }
      // ? mark
      g[3][5] = 1; g[3][6] = 1; g[3][7] = 1; g[3][8] = 1; g[3][9] = 1; g[3][10] = 1;
      g[4][5] = 1; g[4][10] = 1;
      g[5][9] = 1; g[5][10] = 1;
      g[6][8] = 1; g[6][9] = 1;
      g[7][7] = 1; g[7][8] = 1;
      g[8][7] = 1; g[8][8] = 1;
      g[10][7] = 1; g[10][8] = 1;
      g[11][7] = 1; g[11][8] = 1;
      // Shimmer highlights based on frame
      if (f === 0) { g[2][2] = 15; g[2][3] = 15; g[3][2] = 15; }
      if (f === 1) { g[2][5] = 15; g[2][6] = 15; g[3][3] = 15; }
      if (f === 2) { g[2][8] = 15; g[2][9] = 15; g[3][4] = 15; }
      if (f === 3) { g[2][11] = 15; g[2][12] = 15; g[3][11] = 15; }
      frames.push(g);
    }
    return frames;
  })();

  var hardBlockTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 18;
    }
    // Lighter stone pattern
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2] = 13; g[15][c2] = 1; }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][0] = 13; g[r2][15] = 1; }
    g[1][1] = 21; g[1][2] = 21; g[2][1] = 21;
    return g;
  })();

  var emptyBlockTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 10;
    }
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2] = 7; g[15][c2] = 1; }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][0] = 7; g[r2][15] = 1; }
    return g;
  })();

  // Pipe tiles
  var pipeTopLeft = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 6;
    }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][0] = 1; g[r2][1] = 14; }
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2] = 1; g[15][c2] = 19; }
    g[1][2] = 14; g[1][3] = 14; // highlight
    for (var r3 = 1; r3 < 15; r3++) g[r3][3] = 14;
    return g;
  })();

  var pipeTopRight = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 16; c++) g[r][c] = 6;
    }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][15] = 1; g[r2][14] = 19; }
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2] = 1; g[15][c2] = 19; }
    for (var r3 = 1; r3 < 15; r3++) g[r3][12] = 19;
    return g;
  })();

  var pipeBodyLeft = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 2; c < 16; c++) g[r][c] = 6;
    }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][2] = 1; g[r2][3] = 14; g[r2][5] = 14; }
    return g;
  })();

  var pipeBodyRight = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      for (var c = 0; c < 14; c++) g[r][c] = 6;
    }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][13] = 1; g[r2][12] = 19; g[r2][10] = 19; }
    return g;
  })();

  var flagpoleTile = (function() {
    var g = emptyGrid(16, 16);
    g[0][7] = 13; g[0][8] = 13;
    for (var r = 0; r < 16; r++) { g[r][7] = 13; g[r][8] = 21; }
    return g;
  })();

  var flagTile = (function() {
    var g = emptyGrid(16, 16);
    // Green triangle flag pointing left
    g[0][7] = 13; g[0][8] = 21;
    g[1][7] = 6; g[1][8] = 21;
    g[2][5] = 6; g[2][6] = 6; g[2][7] = 6; g[2][8] = 21;
    g[3][3] = 6; g[3][4] = 6; g[3][5] = 6; g[3][6] = 6; g[3][7] = 6; g[3][8] = 21;
    g[4][1] = 6; g[4][2] = 6; g[4][3] = 6; g[4][4] = 6; g[4][5] = 6; g[4][6] = 6; g[4][7] = 6; g[4][8] = 21;
    g[5][3] = 6; g[5][4] = 6; g[5][5] = 6; g[5][6] = 6; g[5][7] = 6; g[5][8] = 21;
    g[6][5] = 6; g[6][6] = 6; g[6][7] = 6; g[6][8] = 21;
    g[7][7] = 6; g[7][8] = 21;
    for (var r = 8; r < 16; r++) { g[r][7] = 13; g[r][8] = 21; }
    return g;
  })();

  // ===== BACKGROUND ELEMENTS =====
  var cloudSprite = (function() {
    var g = emptyGrid(48, 24);
    // Simple fluffy cloud shape
    for (var r = 4; r < 20; r++) {
      for (var c = 4; c < 44; c++) {
        var dy = r - 12, dx = c - 24;
        if (dy * dy / 64 + dx * dx / 400 < 1) g[r][c] = 12;
      }
    }
    // Top bumps
    for (var r2 = 1; r2 < 10; r2++) {
      for (var c2 = 8; c2 < 20; c2++) {
        var dy2 = r2 - 5, dx2 = c2 - 14;
        if (dy2 * dy2 / 25 + dx2 * dx2 / 36 < 1) g[r2][c2] = 12;
      }
    }
    for (var r3 = 2; r3 < 12; r3++) {
      for (var c3 = 24; c3 < 40; c3++) {
        var dy3 = r3 - 6, dx3 = c3 - 32;
        if (dy3 * dy3 / 36 + dx3 * dx3 / 64 < 1) g[r3][c3] = 12;
      }
    }
    return g;
  })();

  var hillSprite = (function() {
    var g = emptyGrid(64, 32);
    for (var r = 0; r < 32; r++) {
      for (var c = 0; c < 64; c++) {
        var dy = r - 0, dx = c - 32;
        if (r > 0 && dx * dx / (32 * 32) + dy * dy / (32 * 32) > 1) continue;
        if (r > 31 - (32 - Math.abs(c - 32))) continue;
        var dist = Math.abs(c - 32);
        var maxR = 32 - dist;
        if (r >= 32 - maxR) {
          g[r][c] = 6;
          if (r === 32 - maxR || r === 32 - maxR + 1) g[r][c] = 14; // highlight top
        }
      }
    }
    return g;
  })();

  var bushSprite = (function() {
    var g = emptyGrid(32, 16);
    for (var r = 2; r < 16; r++) {
      for (var c = 0; c < 32; c++) {
        var dy = r - 8, dx = c - 16;
        if (dy * dy / 64 + dx * dx / 256 < 1) {
          g[r][c] = 6;
          if (dy * dy / 36 + dx * dx / 196 < 0.3) g[r][c] = 14; // inner highlight
        }
      }
    }
    return g;
  })();

  // ===== BITMAP FONT =====
  // Minimal 5x7 pixel font for HUD (only needed chars)
  var FONT_CHARS = {
    'A': [0x7C,0x22,0x22,0x7E,0x22,0x22,0x22],
    'B': [0x7C,0x22,0x22,0x7C,0x22,0x22,0x7C],
    'C': [0x3C,0x42,0x40,0x40,0x40,0x42,0x3C],
    'D': [0x78,0x24,0x22,0x22,0x22,0x24,0x78],
    'E': [0x7E,0x40,0x40,0x7C,0x40,0x40,0x7E],
    'F': [0x7E,0x40,0x40,0x7C,0x40,0x40,0x40],
    'G': [0x3C,0x42,0x40,0x4E,0x42,0x42,0x3C],
    'H': [0x42,0x42,0x42,0x7E,0x42,0x42,0x42],
    'I': [0x3E,0x08,0x08,0x08,0x08,0x08,0x3E],
    'J': [0x1E,0x04,0x04,0x04,0x04,0x44,0x38],
    'K': [0x42,0x44,0x48,0x70,0x48,0x44,0x42],
    'L': [0x40,0x40,0x40,0x40,0x40,0x40,0x7E],
    'M': [0x42,0x66,0x5A,0x42,0x42,0x42,0x42],
    'N': [0x42,0x62,0x52,0x4A,0x46,0x42,0x42],
    'O': [0x3C,0x42,0x42,0x42,0x42,0x42,0x3C],
    'P': [0x7C,0x42,0x42,0x7C,0x40,0x40,0x40],
    'Q': [0x3C,0x42,0x42,0x42,0x4A,0x44,0x3A],
    'R': [0x7C,0x42,0x42,0x7C,0x48,0x44,0x42],
    'S': [0x3C,0x42,0x40,0x3C,0x02,0x42,0x3C],
    'T': [0x7F,0x08,0x08,0x08,0x08,0x08,0x08],
    'U': [0x42,0x42,0x42,0x42,0x42,0x42,0x3C],
    'V': [0x42,0x42,0x42,0x42,0x24,0x24,0x18],
    'W': [0x42,0x42,0x42,0x42,0x5A,0x66,0x42],
    'X': [0x42,0x42,0x24,0x18,0x24,0x42,0x42],
    'Y': [0x41,0x22,0x14,0x08,0x08,0x08,0x08],
    'Z': [0x7E,0x02,0x04,0x08,0x10,0x20,0x7E],
    '0': [0x3C,0x42,0x46,0x4A,0x52,0x62,0x3C],
    '1': [0x08,0x18,0x28,0x08,0x08,0x08,0x3E],
    '2': [0x3C,0x42,0x02,0x0C,0x30,0x40,0x7E],
    '3': [0x3C,0x42,0x02,0x1C,0x02,0x42,0x3C],
    '4': [0x04,0x0C,0x14,0x24,0x7E,0x04,0x04],
    '5': [0x7E,0x40,0x7C,0x02,0x02,0x42,0x3C],
    '6': [0x1C,0x20,0x40,0x7C,0x42,0x42,0x3C],
    '7': [0x7E,0x02,0x04,0x08,0x10,0x10,0x10],
    '8': [0x3C,0x42,0x42,0x3C,0x42,0x42,0x3C],
    '9': [0x3C,0x42,0x42,0x3E,0x02,0x04,0x38],
    '-': [0x00,0x00,0x00,0x7E,0x00,0x00,0x00],
    ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    '.': [0x00,0x00,0x00,0x00,0x00,0x18,0x18],
    '!': [0x08,0x08,0x08,0x08,0x08,0x00,0x08],
    '?': [0x3C,0x42,0x02,0x0C,0x08,0x00,0x08],
    '+': [0x00,0x08,0x08,0x3E,0x08,0x08,0x00],
    ':': [0x00,0x18,0x18,0x00,0x18,0x18,0x00],
    'x': [0x00,0x00,0x42,0x24,0x18,0x24,0x42]
  };

  // ===== SPRITE RENDERING SYSTEM =====

  /**
   * Create a small offscreen canvas from pixel data
   */
  function createSpriteCanvas(pixelData, palette, scale) {
    scale = scale || 1;
    var h = pixelData.length;
    var w = pixelData[0].length;
    var canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = pixelData[y][x];
        if (idx === 0) continue; // transparent
        var color = palette[idx];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return canvas;
  }

  /**
   * SpriteSheet - pre-renders all sprites to canvases for fast blitting
   */
  function SpriteSheet() {
    this.sprites = {};
    this.flippedSprites = {};
    this._init();
  }

  SpriteSheet.prototype._init = function() {
    var p = PALETTE;

    // Player small
    this._addSprite('player_small_idle', playerSmallIdle, p);
    this._addSprite('player_small_walk1', playerSmallWalk1, p);
    this._addSprite('player_small_walk2', playerSmallWalk2, p);
    this._addSprite('player_small_walk3', playerSmallWalk3, p);
    this._addSprite('player_small_jump', playerSmallJump, p);
    this._addSprite('player_small_skid', playerSmallSkid, p);
    this._addSprite('player_small_death', playerSmallDeath, p);

    // Player big
    this._addSprite('player_big_idle', playerBigIdle, p);
    this._addSprite('player_big_walk1', playerBigWalk1, p);
    this._addSprite('player_big_walk2', playerBigWalk2, p);
    this._addSprite('player_big_walk3', playerBigWalk3, p);
    this._addSprite('player_big_jump', playerBigJump, p);
    this._addSprite('player_big_skid', playerBigSkid, p);

    // Enemies
    this._addSprite('goomba_walk1', goombaWalk1, p);
    this._addSprite('goomba_walk2', goombaWalk2, p);
    this._addSprite('goomba_squished', goombaSquished, p);
    this._addSprite('koopa_walk1', koopaWalk1, p);
    this._addSprite('koopa_walk2', koopaWalk2, p);
    this._addSprite('koopa_shell', koopaShell, p);
    this._addSprite('piranha_frame1', piranhaFrame1, p);
    this._addSprite('piranha_frame2', piranhaFrame2, p);

    // Items
    this._addSprite('mushroom', mushroom, p);
    this._addSprite('star_frame1', starFrame1, p);
    this._addSprite('star_frame2', starFrame2, p);
    this._addSprite('fire_flower_frame1', fireFlowerFrame1, p);
    this._addSprite('fire_flower_frame2', fireFlowerFrame2, p);
    this._addSprite('coin_frame1', coinFrame1, p);
    this._addSprite('coin_frame2', coinFrame2, p);
    this._addSprite('coin_frame3', coinFrame3, p);
    this._addSprite('coin_frame4', coinFrame4, p);

    // Tiles
    this._addSprite('ground', groundTile, p);
    this._addSprite('ground_top', groundTopTile, p);
    this._addSprite('brick', brickTile, p);
    this._addSprite('question_0', questionBlock[0], p);
    this._addSprite('question_1', questionBlock[1], p);
    this._addSprite('question_2', questionBlock[2], p);
    this._addSprite('question_3', questionBlock[3], p);
    this._addSprite('hard_block', hardBlockTile, p);
    this._addSprite('question_empty', emptyBlockTile, p);
    this._addSprite('pipe_top_left', pipeTopLeft, p);
    this._addSprite('pipe_top_right', pipeTopRight, p);
    this._addSprite('pipe_body_left', pipeBodyLeft, p);
    this._addSprite('pipe_body_right', pipeBodyRight, p);
    this._addSprite('flagpole', flagpoleTile, p);
    this._addSprite('flagpole_top', flagTile, p);

    // Background
    this._addSprite('cloud', cloudSprite, p);
    this._addSprite('hill', hillSprite, p);
    this._addSprite('bush', bushSprite, p);
  };

  SpriteSheet.prototype._addSprite = function(name, pixelData, palette) {
    this.sprites[name] = createSpriteCanvas(pixelData, palette, 1);
  };

  SpriteSheet.prototype._getFlipped = function(name) {
    if (this.flippedSprites[name]) return this.flippedSprites[name];
    var src = this.sprites[name];
    if (!src) return null;
    var canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    var ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    this.flippedSprites[name] = canvas;
    return canvas;
  };

  SpriteSheet.prototype.getSprite = function(name, flipped) {
    if (flipped) return this._getFlipped(name);
    return this.sprites[name] || null;
  };

  /**
   * Draw a sprite onto a context
   */
  function drawSprite(ctx, spriteSheet, spriteName, x, y, flipped, scale) {
    scale = scale || 1;
    var sprite = spriteSheet.getSprite(spriteName, flipped);
    if (!sprite) return;
    if (scale === 1) {
      ctx.drawImage(sprite, Math.round(x), Math.round(y));
    } else {
      ctx.drawImage(sprite, Math.round(x), Math.round(y),
        sprite.width * scale, sprite.height * scale);
    }
  }

  // ===== EXPORTS =====
  ProcMario.PALETTE = PALETTE;
  ProcMario.FONT_CHARS = FONT_CHARS;
  ProcMario.createSpriteCanvas = createSpriteCanvas;
  ProcMario.SpriteSheet = SpriteSheet;
  ProcMario.drawSprite = drawSprite;
})();
