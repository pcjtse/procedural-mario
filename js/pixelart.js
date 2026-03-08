/**
 * Pixel Art Data & Sprite System for Procedural Mario.
 * NES-accurate sprites regenerated from official Super Mario Bros. reference.
 * All graphics defined as pixel arrays - no external image files.
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  // NES-accurate color palette
  // Each index maps to a specific NES color used in Super Mario Bros.
  var PALETTE = [
    null,              //  0 = transparent
    '#000000',         //  1 = black (outlines)
    '#FCFCFC',         //  2 = white / near-white
    '#E52521',         //  3 = red  (Mario hat / mushroom cap)
    '#FBB882',         //  4 = skin (Mario face)
    '#6B8CFF',         //  5 = sky blue (background)
    '#00A800',         //  6 = green (grass / Koopa shell highlight)
    '#C84C0C',         //  7 = brown (ground / Goomba body)
    '#FCB400',         //  8 = gold / yellow (coins / star)
    '#E45C10',         //  9 = orange (brick face / fire flower petals)
    '#503000',         // 10 = dark brown (mortar / Goomba outline)
    '#0058F8',         // 11 = blue (Mario overalls)
    '#F8D8A8',         // 12 = light tan (Goomba face / cloud)
    '#A8A8A8',         // 13 = gray (flagpole / hard block)
    '#00A844',         // 14 = pipe green (dark stripe on pipe)
    '#F8D878',         // 15 = light yellow (coin face / star highlight)
    '#AC7C00',         // 16 = dark gold (coin outline)
    '#D82800',         // 17 = bright red (piranha / fire flower)
    '#585858',         // 18 = dark gray (hard block base)
    '#006800',         // 19 = dark green (pipe shadow / Koopa dark)
    '#F83800',         // 20 = fire orange
    '#7C7C7C',         // 21 = mid gray
    '#38B764',         // 22 = bright green (Koopa shell)
    '#8B4513',         // 23 = saddle brown (Goomba feet)
    '#FCD8A8',         // 24 = very light skin (Koopa head)
    '#E8C000'          // 25 = amber (question block gold)
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

  // ===== PLAYER DEATH SPRITE (Small 16x16) =====
  // NES-accurate small Mario death – face-up, arms/legs spread, hat still on
  var playerSmallDeath = [
    [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],   //  hat
    [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],   //  hat brim
    [0,0,0,10,10,10, 4, 4,10,10,0,0,0,0,0,0], // hair/face
    [0,0,10, 4,10, 4, 4, 4, 4,10, 4,10,0,0,0,0],
    [0,0,10, 4,10,10, 4, 4, 4,10, 4, 4,0,0,0,0],
    [0,0,10,10, 4, 4, 4, 4,10,10,10,0,0,0,0,0],
    [0,0,0,0, 4, 4, 4, 4, 4, 4,0,0,0,0,0,0],
    [0,3,3,0,11, 4,11,11,11, 4,11,0,3,3,0,0], // arms spread (skin at sides)
    [0,3,11,11,11,11,11,11,11,11,11,3,0,0,0,0],
    [3,11,11, 4, 4,11,11,11,11, 4, 4,11,11,3,0,0],
    [0,11,11,11,11,11,11,11,11,11,11,11,0,0,0,0],
    [0,0,11,11,11,11,11,11,11,11,11,0,0,0,0,0],
    [3,3,11, 4,11,0,0,0,0,11, 4,11,3,3,0,0], // legs spread
    [3,3,11,11,0,0,0,0,0,0,11,11,3,3,0,0],
    [0,7,7, 7,0,0,0,0,0,0, 7, 7, 7,0,0,0],
    [7,7,7,0,0,0,0,0,0,0,0, 7, 7, 7,0,0]
  ];

  // ===== ENEMY SPRITES =====
  // ── Goomba walk frame 1 (16×16) – NES-accurate ──
  // Dark-brown mushroom cap, angry angled eyebrows, white sclera / black pupils,
  // tan lower face, small frown mouth, brown feet.
  var goombaWalk1 = [
    [0, 0, 0, 0, 0,10,10,10,10,10, 0, 0, 0, 0, 0, 0],  // cap top
    [0, 0, 0, 0,10, 7, 7, 7, 7, 7,10, 0, 0, 0, 0, 0],  // cap
    [0, 0, 0,10, 7, 7, 7, 7, 7, 7, 7,10, 0, 0, 0, 0],
    [0, 0,10, 7, 7, 7, 7, 7, 7, 7, 7, 7,10, 0, 0, 0],
    [0,10, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,10, 0, 0],  // widest cap row
    [0, 1, 7, 1, 1, 7, 7, 7, 7, 7, 1, 1, 7, 1, 0, 0],  // eyebrow (angled inward)
    [0, 1, 2,12, 1, 7, 7, 7, 7, 7, 1,12, 2, 1, 0, 0],  // eyes (white+pupil)
    [1, 7, 1,12, 1, 7, 7, 7, 7, 7, 1,12, 1, 7, 1, 0],  // eye bottom
    [1, 7, 7, 1,12, 4, 4, 4, 4, 4,12, 1, 7, 7, 1, 0],  // tan face starts
    [1, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 1, 0],
    [0, 1, 7, 7, 4, 1, 1, 1, 1, 1, 4, 7, 7, 1, 0, 0],  // frown teeth
    [0, 0, 1, 1, 7, 7, 4, 4, 4, 7, 7, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],  // bottom of body
    [0, 0, 0,10,23,23, 1, 0, 0, 1,23,23,10, 0, 0, 0],  // feet
    [0, 0,10,23,23,23,23, 0, 0,23,23,23,23,10, 0, 0],
    [0,10,23,23, 1, 0, 0, 0, 0, 0, 1,23,23,10, 0, 0]
  ];

  // ── Goomba walk frame 2 – feet alternated ──
  var goombaWalk2 = [
    [0, 0, 0, 0, 0,10,10,10,10,10, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0,10, 7, 7, 7, 7, 7,10, 0, 0, 0, 0, 0],
    [0, 0, 0,10, 7, 7, 7, 7, 7, 7, 7,10, 0, 0, 0, 0],
    [0, 0,10, 7, 7, 7, 7, 7, 7, 7, 7, 7,10, 0, 0, 0],
    [0,10, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,10, 0, 0],
    [0, 1, 7, 1, 1, 7, 7, 7, 7, 7, 1, 1, 7, 1, 0, 0],
    [0, 1, 2,12, 1, 7, 7, 7, 7, 7, 1,12, 2, 1, 0, 0],
    [1, 7, 1,12, 1, 7, 7, 7, 7, 7, 1,12, 1, 7, 1, 0],
    [1, 7, 7, 1,12, 4, 4, 4, 4, 4,12, 1, 7, 7, 1, 0],
    [1, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 1, 0],
    [0, 1, 7, 7, 4, 1, 1, 1, 1, 1, 4, 7, 7, 1, 0, 0],
    [0, 0, 1, 1, 7, 7, 4, 4, 4, 7, 7, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1,23,23,23,23, 1, 0, 0, 0, 0, 0],  // feet swapped
    [0, 0, 0, 0, 1,23,23, 1, 1,23,23, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
  ];

  // ── Goomba squished – flat pancake (16×16) ──
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
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],  // flat squished cap
    [0, 0, 1, 1, 7, 7, 7, 7, 7, 7, 7, 7, 1, 1, 0, 0],
    [0, 1, 7, 1,12, 1, 7, 7, 7, 7, 1,12, 1, 7, 1, 0],  // eyes still visible
    [1, 7, 7, 7, 1, 7, 4, 4, 4, 4, 7, 1, 7, 7, 7, 1],  // face squished
    [1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   // flat bottom
  ];

  // ── Koopa Troopa walk frame 1 (16×24) – NES-accurate ──
  // Green shell with white highlight rim and dark-green ribs,
  // tan/cream head, white eye with black pupil, orange/tan feet.
  var koopaWalk1 = [
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],  //  0  head top
    [0, 0, 0, 0, 0, 0, 1,24,24,24, 1, 0, 0, 0, 0, 0],  //  1
    [0, 0, 0, 0, 0, 1,24,24,24,24,24, 1, 0, 0, 0, 0],  //  2
    [0, 0, 0, 0, 0, 1,24, 2, 1,24,24, 1, 0, 0, 0, 0],  //  3  eye (white+pupil)
    [0, 0, 0, 0, 0, 1,24, 2, 1,24,24, 1, 0, 0, 0, 0],  //  4
    [0, 0, 0, 0, 0, 0, 1,24,24,24, 1, 0, 0, 0, 0, 0],  //  5  neck
    [0, 0, 0, 0, 0, 0, 1,11,11, 1, 0, 0, 0, 0, 0, 0],  //  6  collar (blue)
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],  //  7  shell top rim
    [0, 0, 0, 0, 1,22,22, 2, 2,22,22, 1, 0, 0, 0, 0],  //  8  shell white highlights
    [0, 0, 0, 1,22,22, 2, 2, 2, 2,22,22, 1, 0, 0, 0],  //  9
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],  // 10  widest
    [0, 0, 1,22, 2,14,14,14,14,14,14, 2,22, 1, 0, 0],  // 11  dark rib
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],  // 12  side ribs
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],  // 13
    [0, 1,19,22, 2,14,14,14,14,14,14, 2,22,19, 1, 0],  // 14  rib
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],  // 15
    [0, 0, 1,22,22,22, 2, 2, 2, 2,22,22,22, 1, 0, 0],  // 16
    [0, 0, 0, 1,22,22,22,22,22,22,22,22, 1, 0, 0, 0],  // 17
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],  // 18  bottom rim
    [0, 0, 0, 0, 0, 1, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0],  // 19  right foot forward
    [0, 0, 0, 0, 1, 9, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0],  // 20
    [0, 0, 0, 0, 1, 9, 9, 1, 0, 0, 1, 9, 9, 1, 0, 0],  // 21  left foot back
    [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0],  // 22
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]   // 23
  ];

  // ── Koopa Troopa walk frame 2 – feet alternated ──
  var koopaWalk2 = [
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,24,24,24, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1,24,24,24,24,24, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1,24, 2, 1,24,24, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1,24, 2, 1,24,24, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,24,24,24, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,11,11, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1,22,22, 2, 2,22,22, 1, 0, 0, 0, 0],
    [0, 0, 0, 1,22,22, 2, 2, 2, 2,22,22, 1, 0, 0, 0],
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],
    [0, 0, 1,22, 2,14,14,14,14,14,14, 2,22, 1, 0, 0],
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],
    [0, 1,19,22, 2,14,14,14,14,14,14, 2,22,19, 1, 0],
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],
    [0, 0, 1,22,22,22, 2, 2, 2, 2,22,22,22, 1, 0, 0],
    [0, 0, 0, 1,22,22,22,22,22,22,22,22, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 1, 0, 0, 0, 0, 0],  // left foot forward
    [0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 1, 0, 0, 0, 0],
    [0, 0, 1, 9, 9, 1, 0, 0, 1, 9, 9, 1, 0, 0, 0, 0],  // right foot back
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  // ── Koopa shell (16×24) – centered in lower portion ──
  var koopaShell = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1,22,22,22,22, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1,22,22, 2, 2, 2, 2,22,22, 1, 0, 0, 0],
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],
    [0, 0, 1,22, 2,14,14,14,14,14,14, 2,22, 1, 0, 0],
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],
    [0, 1,19,22, 2,14,22,22,22,22,14, 2,22,19, 1, 0],
    [0, 1,19,22, 2,14,14,14,14,14,14, 2,22,19, 1, 0],
    [0, 0, 1,22,22, 2, 2, 2, 2, 2, 2,22,22, 1, 0, 0],
    [0, 0, 1,22,22,22, 2, 2, 2, 2,22,22,22, 1, 0, 0],
    [0, 0, 0, 1,22,22,22,22,22,22,22,22, 1, 0, 0, 0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // ── Piranha Plant frame 1 – mouth fully open (16×24) ──
  // Bright-red head with white circular spots, dark gaping mouth,
  // alternating green/dark-green striped stem.
  var piranhaFrame1 = [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1,17,17, 2,17,17,17,17, 2,17,17, 1, 0, 0],
    [0, 1,17,17, 2, 2,17,17,17, 2, 2,17,17,17, 1, 0],
    [0, 1,17,17, 2, 2,17,17,17, 2, 2,17,17,17, 1, 0],
    [0, 1,17,17,17,17,17, 2, 2,17,17,17,17,17, 1, 0],
    [0, 0, 1,17,17,17, 2, 2, 2, 2,17,17,17, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],  // teeth row
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],  // mouth closed bottom
    [0, 0, 0, 0, 1, 1,17, 1, 1,17, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],  // stem start
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0]
  ];

  // ── Piranha Plant frame 2 – mouth partially closed ──
  var piranhaFrame2 = [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1,17,17, 2,17,17,17,17, 2,17,17, 1, 0, 0],
    [0, 1,17,17, 2, 2,17,17,17, 2, 2,17,17,17, 1, 0],
    [0, 1,17,17, 2, 2,17,17,17, 2, 2,17,17,17, 1, 0],
    [0, 1,17,17,17,17,17, 2, 2,17,17,17,17,17, 1, 0],
    [0, 0, 1,17,17,17, 2, 2, 2, 2,17,17,17, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1,17,17,17,17, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1,14,14, 1, 0, 0, 0, 0, 0, 0]
  ];

  // ===== ITEM SPRITES =====

  // ── Super Mushroom (16×16) – NES-accurate ──
  // Red rounded cap with large white circular spots, cream/tan stem,
  // two dot-eyes and tiny feet.
  var mushroom = [
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 2, 2, 3, 3, 3, 1, 0, 0, 0],  // white spots
    [0, 0, 1, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 1, 0, 0],
    [0, 0, 1, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0],
    [0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1, 0],
    [0, 1, 3, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3, 3, 1, 0],
    [0, 1, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 1, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],  // cap base
    [0, 0, 0, 1,12,12,12, 2, 2,12,12,12, 1, 0, 0, 0],  // stem top (tan face)
    [0, 0, 1,12,12, 1,12,12,12,12, 1,12,12, 1, 0, 0],  // eyes
    [0, 1,12,12,12, 1,12,12,12,12, 1,12,12,12, 1, 0],
    [0, 1,12,12,12,12,12,12,12,12,12,12,12,12, 1, 0],
    [0, 1,12,12,12,12,12,12,12,12,12,12,12,12, 1, 0],
    [0, 0, 1,12,12,12,12,12,12,12,12,12,12, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0]
  ];

  // ── 1-Up Mushroom (16×16) – green cap, same stem as super mushroom ──
  var oneUpMushroom = [
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 6, 6, 6, 6, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 6, 2, 2, 6, 6, 6, 1, 0, 0, 0],
    [0, 0, 1, 6, 6, 2, 2, 2, 2, 2, 2, 6, 6, 1, 0, 0],
    [0, 0, 1, 2, 2, 2, 6, 6, 6, 6, 2, 2, 2, 1, 0, 0],
    [0, 1, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 0],
    [0, 1, 6, 6, 6, 6, 2, 2, 2, 2, 6, 6, 6, 6, 1, 0],
    [0, 1, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 1, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 1,12,12,12, 2, 2,12,12,12, 1, 0, 0, 0],
    [0, 0, 1,12,12, 1,12,12,12,12, 1,12,12, 1, 0, 0],
    [0, 1,12,12,12, 1,12,12,12,12, 1,12,12,12, 1, 0],
    [0, 1,12,12,12,12,12,12,12,12,12,12,12,12, 1, 0],
    [0, 1,12,12,12,12,12,12,12,12,12,12,12,12, 1, 0],
    [0, 0, 1,12,12,12,12,12,12,12,12,12,12, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0]
  ];

  // ── Coin animation frames – NES-accurate gold coin rotation ──
  // Uses palette index 16=dark-gold outline, 8=bright gold, 15=light-yellow shine

  // Frame 1: edge-on (thinnest – just 2 columns)
  var coinFrame1 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,16, 8,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // Frame 2: quarter-turn (medium width, angled face)
  var coinFrame2 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,16, 8, 8,16,0,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,0,16, 8, 8,16,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // Frame 3: full face with shine circle – NES coin face
  var coinFrame3 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,16,16, 8, 8,16,16,0,0,0,0,0],
    [0,0,0,0,16, 8, 8, 8, 8, 8, 8,16,0,0,0,0],
    [0,0,0,16, 8, 8,15,15,15,15, 8, 8,16,0,0,0],
    [0,0,0,16, 8,15,15, 8, 8,15,15, 8,16,0,0,0],
    [0,0,0,16, 8,15, 8, 8, 8, 8,15, 8,16,0,0,0],
    [0,0,0,16, 8,15, 8, 8, 8, 8,15, 8,16,0,0,0],
    [0,0,0,16, 8,15, 8, 8, 8, 8,15, 8,16,0,0,0],
    [0,0,0,16, 8,15, 8, 8, 8, 8,15, 8,16,0,0,0],
    [0,0,0,16, 8,15,15, 8, 8,15,15, 8,16,0,0,0],
    [0,0,0,16, 8, 8,15,15,15,15, 8, 8,16,0,0,0],
    [0,0,0,0,16, 8, 8, 8, 8, 8, 8,16,0,0,0,0],
    [0,0,0,0,0,16,16, 8, 8,16,16,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // Frame 4: mirrors frame 2 (coin rotating back)
  var coinFrame4 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,16, 8, 8,16,0,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8,15,15, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,16, 8, 8, 8, 8,16,0,0,0,0,0],
    [0,0,0,0,0,0,16, 8, 8,16,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // ── Superstar frame 1 (16×16) – NES 5-pointed gold star, eyes, rotating shine ──
  var starFrame1 = [
    [0,0,0,0,0,0,0, 1, 1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1, 8, 8, 1,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1,15,15, 1,0,0,0,0,0,0],
    [0,0,0,0,0, 1, 8,15,15, 8, 1,0,0,0,0,0],
    [1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 1, 1, 1, 1, 1, 1],
    [0, 1, 8, 8, 8, 8,15, 1, 1,15, 8, 8, 8, 8, 1,0],
    [0,0, 1, 8,15,15,15,15,15,15,15,15, 8, 1,0,0],
    [0,0,0, 1, 8,15,15,15,15,15,15, 8, 1,0,0,0],
    [0,0,0, 1, 8, 8,15,15,15,15, 8, 8, 1,0,0,0],
    [0,0, 1, 8, 8, 1, 1, 8, 8, 1, 1, 8, 8, 1,0,0],  // eyes
    [0,0, 1, 8, 1,0, 0, 1, 1,0, 0, 1, 8, 1,0,0],
    [0, 1, 8, 1,0,0, 0, 1, 1,0, 0, 0, 1, 8, 1,0],
    [0, 1, 8, 1,0,0, 0, 1, 1,0, 0, 0, 1, 8, 1,0],
    [0, 1, 1,0,0,0, 0, 0, 1, 1,0, 0, 0, 1, 1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // ── Superstar frame 2 – shine rotated 45° ──
  var starFrame2 = [
    [0,0,0,0,0,0,0, 1, 1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1, 8, 8, 1,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1, 8, 8, 1,0,0,0,0,0,0],
    [0,0,0,0,0, 1, 8, 8, 8, 8, 1,0,0,0,0,0],
    [1, 1, 1, 1, 1, 1, 8,15,15, 8, 1, 1, 1, 1, 1, 1],
    [0, 1, 8, 8, 8,15,15, 1, 1,15,15, 8, 8, 8, 1,0],
    [0,0, 1, 8, 8,15,15,15,15,15,15, 8, 8, 1,0,0],
    [0,0,0, 1, 8, 8,15,15,15,15, 8, 8, 1,0,0,0],
    [0,0,0, 1,15, 8, 8,15,15, 8, 8,15, 1,0,0,0],
    [0,0, 1,15, 8, 1, 1, 8, 8, 1, 1, 8,15, 1,0,0],
    [0,0, 1, 8, 1,0, 0, 1, 1,0, 0, 1, 8, 1,0,0],
    [0, 1, 8, 1,0,0, 0, 1, 1,0, 0, 0, 1, 8, 1,0],
    [0, 1, 8, 1,0,0, 0, 1, 1,0, 0, 0, 1, 8, 1,0],
    [0, 1, 1,0,0,0, 0, 0, 1, 1,0, 0, 0, 1, 1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // ── Fire Flower frame 1 (16×16) – orange petals, yellow center, green stem ──
  var fireFlowerFrame1 = [
    [0,0,0,0,0, 1, 1, 1, 1, 1, 1,0,0,0,0,0],
    [0,0,0, 1, 1, 9, 9, 1, 1, 9, 9, 1, 1,0,0,0],
    [0,0, 1, 9, 9, 9, 1, 8, 8, 1, 9, 9, 9, 1,0,0],
    [0,0, 1, 9, 9, 1, 8, 8, 8, 8, 1, 9, 9, 1,0,0],
    [0,0, 1, 9, 1, 8, 8,15,15, 8, 8, 1, 9, 1,0,0],
    [0,0, 1, 9, 1, 8,15,15,15,15, 8, 1, 9, 1,0,0],
    [0,0, 1, 9, 1, 8, 8,15,15, 8, 8, 1, 9, 1,0,0],
    [0,0, 1, 9, 9, 1, 8, 8, 8, 8, 1, 9, 9, 1,0,0],
    [0,0,0, 1, 9, 9, 1, 1, 1, 1, 9, 9, 1,0,0,0],
    [0,0,0,0, 1, 1, 1, 6, 6, 1, 1, 1,0,0,0,0],
    [0,0,0,0,0,0, 1,14,14, 1,0,0,0,0,0,0],
    [0,0,0,0, 1, 6, 6, 6, 6, 6, 6, 1,0,0,0,0],
    [0,0,0, 1, 6,14, 1,14,14, 1,14, 6, 1,0,0,0],
    [0,0,0,0, 1, 1, 1,14,14, 1, 1, 1,0,0,0,0],
    [0,0,0,0,0,0, 1, 6, 6, 1,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1, 1, 1, 1,0,0,0,0,0,0]
  ];

  // ── Fire Flower frame 2 – petals cycle to red for animation ──
  var fireFlowerFrame2 = [
    [0,0,0,0,0, 1, 1, 1, 1, 1, 1,0,0,0,0,0],
    [0,0,0, 1, 1,17,17, 1, 1,17,17, 1, 1,0,0,0],
    [0,0, 1,17,17,17, 1, 8, 8, 1,17,17,17, 1,0,0],
    [0,0, 1,17,17, 1, 8, 8, 8, 8, 1,17,17, 1,0,0],
    [0,0, 1,17, 1, 8, 8,15,15, 8, 8, 1,17, 1,0,0],
    [0,0, 1,17, 1, 8,15,15,15,15, 8, 1,17, 1,0,0],
    [0,0, 1,17, 1, 8, 8,15,15, 8, 8, 1,17, 1,0,0],
    [0,0, 1,17,17, 1, 8, 8, 8, 8, 1,17,17, 1,0,0],
    [0,0,0, 1,17,17, 1, 1, 1, 1,17,17, 1,0,0,0],
    [0,0,0,0, 1, 1, 1, 6, 6, 1, 1, 1,0,0,0,0],
    [0,0,0,0,0,0, 1,14,14, 1,0,0,0,0,0,0],
    [0,0,0,0, 1, 6, 6, 6, 6, 6, 6, 1,0,0,0,0],
    [0,0,0, 1, 6,14, 1,14,14, 1,14, 6, 1,0,0,0],
    [0,0,0,0, 1, 1, 1,14,14, 1, 1, 1,0,0,0,0],
    [0,0,0,0,0,0, 1, 6, 6, 1,0,0,0,0,0,0],
    [0,0,0,0,0,0, 1, 1, 1, 1,0,0,0,0,0,0]
  ];

  // ===== TILE SPRITES (16×16) – NES Super Mario Bros. accurate =====

  // ── Ground/earth tile – brown with horizontal mortar lines ──
  // NES SMB1 uses this for sub-surface ground tiles.
  var groundTile = (function() {
    var g = emptyGrid(16, 16);
    // Base: warm brown
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 7;
    // Horizontal mortar every 4 rows
    for (var c2 = 0; c2 < 16; c2++) {
      g[3][c2] = 10; g[7][c2] = 10; g[11][c2] = 10; g[15][c2] = 10;
    }
    // Vertical mortar (offset by half per row-group – NES brick pattern)
    g[0][7]=10; g[1][7]=10; g[2][7]=10;
    g[4][3]=10; g[5][3]=10; g[6][3]=10;
    g[4][11]=10; g[5][11]=10; g[6][11]=10;
    g[8][7]=10; g[9][7]=10; g[10][7]=10;
    g[12][3]=10; g[13][3]=10; g[14][3]=10;
    g[12][11]=10; g[13][11]=10; g[14][11]=10;
    return g;
  })();

  // ── Ground-top tile – grass cap + earth below ──
  // NES SMB1 top-of-ground tile: bright green grass top, dark separator, brown earth.
  var groundTopTile = (function() {
    var g = emptyGrid(16, 16);
    // Row 0: alternating bright-green speckles on top of grass
    for (var c0 = 0; c0 < 16; c0++) g[0][c0] = 14;
    g[0][0]=6; g[0][2]=6; g[0][4]=6; g[0][6]=6;
    g[0][8]=6; g[0][10]=6; g[0][12]=6; g[0][14]=6;
    // Rows 1-3: solid bright green grass
    for (var r = 1; r < 4; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 6;
    // Row 3 bottom edge: dark green border
    for (var c3 = 0; c3 < 16; c3++) g[3][c3] = 19;
    // Rows 4-15: brown earth with brick seams
    for (var r2 = 4; r2 < 16; r2++)
      for (var c2 = 0; c2 < 16; c2++) g[r2][c2] = 7;
    for (var c4 = 0; c4 < 16; c4++) { g[8][c4] = 10; g[12][c4] = 10; }
    g[4][7]=10; g[5][7]=10; g[6][7]=10; g[7][7]=10;
    g[9][3]=10; g[10][3]=10; g[11][3]=10;
    g[9][11]=10; g[10][11]=10; g[11][11]=10;
    g[13][7]=10; g[14][7]=10; g[15][7]=10;
    return g;
  })();

  // ── Brick tile – NES SMB1 breakable brick ──
  // Warm orange-brown face, dark mortar lines, small light-yellow highlight per brick.
  var brickTile = (function() {
    var g = emptyGrid(16, 16);
    // Base: orange-brown
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 9;
    // Mortar (horizontal)
    for (var c2 = 0; c2 < 16; c2++) {
      g[3][c2]=10; g[7][c2]=10; g[11][c2]=10; g[15][c2]=10;
    }
    // Mortar (vertical, offset each row)
    g[0][7]=10; g[1][7]=10; g[2][7]=10;
    g[4][3]=10; g[5][3]=10; g[6][3]=10;
    g[4][11]=10; g[5][11]=10; g[6][11]=10;
    g[8][7]=10; g[9][7]=10; g[10][7]=10;
    g[12][3]=10; g[13][3]=10; g[14][3]=10;
    g[12][11]=10; g[13][11]=10; g[14][11]=10;
    // Light-yellow highlight on top-left corner of each brick segment
    g[0][0]=15; g[0][1]=15; g[1][0]=15;
    g[0][8]=15; g[0][9]=15; g[1][8]=15;
    g[4][0]=15; g[4][1]=15; g[5][0]=15;
    g[4][4]=15; g[4][5]=15; g[5][4]=15;
    g[4][12]=15; g[4][13]=15; g[5][12]=15;
    g[8][0]=15; g[8][1]=15; g[9][0]=15;
    g[8][8]=15; g[8][9]=15; g[9][8]=15;
    g[12][0]=15; g[12][1]=15; g[13][0]=15;
    g[12][4]=15; g[12][5]=15; g[13][4]=15;
    g[12][12]=15; g[12][13]=15; g[13][12]=15;
    return g;
  })();

  // ── Question Block – NES SMB1 animated ? block (4 shimmer frames) ──
  // Black border, gold interior, black ? mark, white shimmer slides left-to-right.
  var questionBlock = (function() {
    var frames = [];
    for (var f = 0; f < 4; f++) {
      var g = emptyGrid(16, 16);
      // Border: black
      for (var c2 = 0; c2 < 16; c2++) { g[0][c2]=1; g[15][c2]=1; }
      for (var r2 = 0; r2 < 16; r2++) { g[r2][0]=1; g[r2][15]=1; }
      // Interior: bright gold
      for (var r3 = 1; r3 < 15; r3++)
        for (var c3 = 1; c3 < 15; c3++) g[r3][c3] = 8;
      // "?" glyph – drawn in black, centered
      // Top arc of ?
      g[3][5]=1; g[3][6]=1; g[3][7]=1; g[3][8]=1; g[3][9]=1; g[3][10]=1;
      g[4][4]=1; g[4][5]=1;                              g[4][10]=1; g[4][11]=1;
      g[5][10]=1; g[5][11]=1;
      g[6][9]=1; g[6][10]=1;
      g[7][8]=1; g[7][9]=1;
      g[8][7]=1; g[8][8]=1;
      // Dot of ?
      g[10][7]=1; g[10][8]=1;
      g[11][7]=1; g[11][8]=1;
      // Shimmer highlight sweeps across the block face each frame
      if (f === 0) { g[1][1]=15; g[2][1]=15; g[2][2]=15; g[1][2]=15; }
      if (f === 1) { g[1][4]=15; g[2][4]=15; g[2][5]=15; g[1][5]=15; }
      if (f === 2) { g[1][8]=15; g[2][8]=15; g[2][9]=15; g[1][9]=15; }
      if (f === 3) { g[1][12]=15; g[2][12]=15; g[2][13]=15; g[1][13]=15; }
      frames.push(g);
    }
    return frames;
  })();

  // ── Hard block (immovable) – NES SMB1 gray stone ──
  // Mid-gray base, light-gray top/left bevel highlight, black bottom/right shadow.
  var hardBlockTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 18;
    // Top & left highlight
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2]=13; g[1][c2]=21; }
    for (var r2 = 2; r2 < 16; r2++) { g[r2][0]=13; g[r2][1]=21; }
    // Bottom & right shadow
    for (var c3 = 0; c3 < 16; c3++) g[15][c3]=1;
    for (var r3 = 0; r3 < 15; r3++) g[r3][15]=1;
    // Inner corner step
    g[2][2]=21; g[2][3]=21; g[3][2]=21;
    // Inner cross pattern (NES hard block has faint inner markings)
    g[7][7]=21; g[7][8]=21; g[8][7]=21; g[8][8]=21;
    return g;
  })();

  // ── Empty block – spent ? block ──
  var emptyBlockTile = (function() {
    var g = emptyGrid(16, 16);
    // Darker gold (spent)
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 16;
    // Black border
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2]=1; g[15][c2]=1; }
    for (var r2 = 0; r2 < 16; r2++) { g[r2][0]=1; g[r2][15]=1; }
    // Dark interior (no shine)
    for (var r3 = 1; r3 < 15; r3++)
      for (var c3 = 1; c3 < 15; c3++) g[r3][c3] = 10;
    // Thin gold inner border
    for (var c4 = 1; c4 < 15; c4++) { g[1][c4]=16; g[14][c4]=16; }
    for (var r4 = 2; r4 < 14; r4++) { g[r4][1]=16; g[r4][14]=16; }
    return g;
  })();

  // ── Pipe tiles – NES SMB1 green warp pipes ──
  // Bright green body, dark-green highlight stripe, black outline.
  // The rim (top two rows of the top tile) is 2px taller/wider than the body.

  var pipeTopLeft = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 22;
    // Black rim outline rows 0-1
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2]=1; g[1][c2]=1; }
    // Black left border (body portion)
    for (var r2 = 2; r2 < 16; r2++) { g[r2][0]=1; g[r2][1]=1; }
    // Light green highlight stripe (inner, left of center)
    for (var r3 = 2; r3 < 16; r3++) { g[r3][2]=6; g[r3][3]=6; }
    // Dark-green right shadow
    for (var r4 = 0; r4 < 16; r4++) g[r4][15]=19;
    // Dark-green bottom row
    for (var c5 = 0; c5 < 16; c5++) g[15][c5]=19;
    // Rim: highlight top-left, shadow top-right
    g[0][0]=6; g[0][1]=6; g[1][0]=6; g[1][1]=6;
    g[0][14]=19; g[0][15]=19;
    return g;
  })();

  var pipeTopRight = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 22;
    // Black rim outline rows 0-1
    for (var c2 = 0; c2 < 16; c2++) { g[0][c2]=1; g[1][c2]=1; }
    // Black right border (body portion)
    for (var r2 = 2; r2 < 16; r2++) { g[r2][15]=1; g[r2][14]=1; }
    // Dark-green shadow stripe (right of center)
    for (var r3 = 2; r3 < 16; r3++) { g[r3][12]=19; g[r3][13]=19; }
    // Dark-green left shadow column
    for (var r4 = 0; r4 < 16; r4++) g[r4][0]=19;
    // Rim highlight right
    g[0][14]=6; g[0][15]=6; g[1][14]=6; g[1][15]=6;
    // Dark-green bottom row
    for (var c5 = 0; c5 < 16; c5++) g[15][c5]=19;
    return g;
  })();

  var pipeBodyLeft = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 22;
    // Black left border
    for (var r2 = 0; r2 < 16; r2++) { g[r2][0]=1; g[r2][1]=1; }
    // Light-green highlight stripe
    for (var r3 = 0; r3 < 16; r3++) { g[r3][2]=6; g[r3][3]=6; }
    // Dark-green right shadow column
    for (var r4 = 0; r4 < 16; r4++) g[r4][15]=19;
    return g;
  })();

  var pipeBodyRight = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++)
      for (var c = 0; c < 16; c++) g[r][c] = 22;
    // Black right border
    for (var r2 = 0; r2 < 16; r2++) { g[r2][15]=1; g[r2][14]=1; }
    // Dark-green shadow stripe
    for (var r3 = 0; r3 < 16; r3++) { g[r3][12]=19; g[r3][13]=19; }
    // Dark-green left shadow column
    for (var r4 = 0; r4 < 16; r4++) g[r4][0]=19;
    return g;
  })();

  // ── Flagpole tile – gray vertical pole ──
  var flagpoleTile = (function() {
    var g = emptyGrid(16, 16);
    for (var r = 0; r < 16; r++) {
      g[r][7]=2;   // white highlight on left
      g[r][8]=13;  // mid gray body
      g[r][9]=21;  // darker shadow on right
    }
    return g;
  })();

  // ── Flag tile – green flag at top of pole (16×16 sprite) ──
  // NES-style flag: triangle pointing left from the pole, with dark edge highlight.
  var flagTile = (function() {
    var g = emptyGrid(16, 16);
    // Pole in this tile too
    g[0][7]=2; g[0][8]=13; g[0][9]=21;
    // Flag triangle (points left from pole)
    g[1][1]=6; g[1][2]=6; g[1][3]=6; g[1][4]=6; g[1][5]=6; g[1][6]=6; g[1][7]=6; g[1][8]=13; g[1][9]=21;
    g[2][2]=6; g[2][3]=6; g[2][4]=6; g[2][5]=6; g[2][6]=6; g[2][7]=6; g[2][8]=13; g[2][9]=21;
    g[3][3]=6; g[3][4]=6; g[3][5]=6; g[3][6]=6; g[3][7]=6; g[3][8]=13; g[3][9]=21;
    g[4][4]=6; g[4][5]=6; g[4][6]=6; g[4][7]=6; g[4][8]=13; g[4][9]=21;
    g[5][5]=6; g[5][6]=6; g[5][7]=6; g[5][8]=13; g[5][9]=21;
    // Dark lower edge of flag
    g[6][1]=19; g[6][2]=19; g[6][3]=19; g[6][4]=19; g[6][5]=19;
    g[6][6]=19; g[6][7]=19; g[6][8]=13; g[6][9]=21;
    for (var r = 7; r < 16; r++) { g[r][7]=2; g[r][8]=13; g[r][9]=21; }
    return g;
  })();

  // ===== THEME PALETTE HELPERS =====

  /**
   * Create a copy of a base palette with specific indices replaced.
   * @param {Array} base - original palette array
   * @param {Object} overrides - { index: color } pairs
   * @returns {Array}
   */
  function makeThemePalette(base, overrides) {
    var p = base.slice();
    for (var i in overrides) {
      if (overrides.hasOwnProperty(i)) p[i] = overrides[i];
    }
    return p;
  }

  // ── Theme palette helpers ──
  // Underground: earth tones → dark stone cave
  var UNDERGROUND_PALETTE = makeThemePalette(PALETTE, {
    6:  '#5A5A5A',  // green  → slate gray
    7:  '#484848',  // brown  → dark gray
    9:  '#6A6A6A',  // orange → gray (brick face)
    10: '#222222',  // dark brown → near black (mortar)
    14: '#686868',  // pipe green → mid gray
    19: '#181818',  // dark green → very dark
    22: '#5A5A5A'   // bright green (pipe) → slate gray
  });

  // Sky: earth tones → cloud blues
  var SKY_PALETTE = makeThemePalette(PALETTE, {
    6:  '#B8E4FF',  // green  → light sky blue
    7:  '#8AC0E0',  // brown  → steel blue
    9:  '#A0C8E8',  // orange → blue (brick face)
    10: '#6090B0',  // dark brown → blue-gray (mortar)
    14: '#A0D8F0',  // pipe green → light blue
    19: '#5080A0',  // dark green → darker blue
    22: '#A8D8FF'   // bright green (pipe) → sky blue variant
  });

  // Castle: earth tones → dark stone
  var CASTLE_PALETTE = makeThemePalette(PALETTE, {
    6:  '#444444',  // green  → dark stone
    7:  '#363636',  // brown  → darker stone
    9:  '#4A4A4A',  // orange → stone (brick face)
    10: '#1C1C1C',  // dark brown → near black (mortar)
    14: '#555555',  // pipe green → stone
    19: '#141414',  // dark green → very dark
    22: '#444444'   // bright green (pipe) → dark stone
  });

  // ===== BACKGROUND DECORATIONS =====

  // ── Cloud sprite (48×24) – NES SMB1 puffy 3-bump white cloud ──
  // White body with black 1-pixel outline, slight shadow on bottom edge.
  var cloudSprite = (function() {
    var g = emptyGrid(48, 24);
    // Helper: fill ellipse with colour, outline with black
    function ellipse(cr, cc, rA, cA, fill, outline) {
      for (var r = 0; r < 24; r++) {
        for (var c = 0; c < 48; c++) {
          var dr = r - cr, dc = c - cc;
          var v = dr*dr/(rA*rA) + dc*dc/(cA*cA);
          if (v < 1)       g[r][c] = fill;
          if (v < 1.4 && g[r][c] === 0) g[r][c] = outline;
        }
      }
    }
    // Main body (wide flat ellipse)
    ellipse(16, 24, 7, 20, 2, 1);
    // Left bump
    ellipse(10, 12, 6, 8, 2, 1);
    // Centre bump (tallest)
    ellipse(8, 24, 8, 10, 2, 1);
    // Right bump
    ellipse(11, 36, 5, 8, 2, 1);
    // Erase outline on bottom (NES clouds have open bottom)
    for (var c = 0; c < 48; c++) { g[22][c]=0; g[23][c]=0; }
    return g;
  })();

  // ── Hill sprite (64×32) – NES SMB1 rolling green hill ──
  // Triangular hill silhouette with bright green top-edge highlight stripe.
  var hillSprite = (function() {
    var g = emptyGrid(64, 32);
    var cx = 32, base = 31;
    for (var r = 0; r < 32; r++) {
      var half = Math.round((r / base) * cx);
      for (var c = cx - half; c <= cx + half && c < 64; c++) {
        if (c >= 0) {
          g[r][c] = 6;
          // Top 2 rows: lighter green highlight
          if (r < 2) g[r][c] = 14;
        }
      }
    }
    // Black outline (left and right slopes)
    for (var r2 = 0; r2 < 32; r2++) {
      var h2 = Math.round((r2 / base) * cx);
      var lc = cx - h2, rc = cx + h2;
      if (lc >= 0 && lc < 64) g[r2][lc] = 1;
      if (rc >= 0 && rc < 64) g[r2][rc] = 1;
    }
    return g;
  })();

  // ── Bush sprite (32×16) – NES SMB1 rounded green bush ──
  // Three overlapping circles with bright-green highlight on top.
  var bushSprite = (function() {
    var g = emptyGrid(32, 16);
    function circle(cr, cc, rad) {
      for (var r = 0; r < 16; r++) {
        for (var c = 0; c < 32; c++) {
          var dr=r-cr, dc=c-cc;
          if (dr*dr+dc*dc < rad*rad)       g[r][c] = 6;
          if (dr*dr+dc*dc < (rad+1)*(rad+1) && g[r][c]===0) g[r][c] = 1;
        }
      }
    }
    circle(10, 8,  6);
    circle(8,  16, 7);
    circle(10, 24, 6);
    // Bright green top highlight
    for (var r=0;r<16;r++) for (var c=0;c<32;c++) {
      if (g[r][c]===6 && (r<3 || (g[r-1] && g[r-1][c]===1) || (r>0 && g[r-1][c]===0))) g[r][c]=14;
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

    // Player death sprite (fallback)
    this._addSprite('player_small_death', playerSmallDeath, p);

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
    this._addSprite('1up_mushroom', oneUpMushroom, p);
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

    // ── Underground tile variants (dark stone cave) ──
    // ground_top uses the plain brick pattern (no grass) for cave floor look
    this._addSprite('ug_ground',          groundTile,    UNDERGROUND_PALETTE);
    this._addSprite('ug_ground_top',      groundTile,    UNDERGROUND_PALETTE);
    this._addSprite('ug_brick',           brickTile,     UNDERGROUND_PALETTE);
    this._addSprite('ug_hard_block',      hardBlockTile, UNDERGROUND_PALETTE);
    this._addSprite('ug_pipe_top_left',   pipeTopLeft,   UNDERGROUND_PALETTE);
    this._addSprite('ug_pipe_top_right',  pipeTopRight,  UNDERGROUND_PALETTE);
    this._addSprite('ug_pipe_body_left',  pipeBodyLeft,  UNDERGROUND_PALETTE);
    this._addSprite('ug_pipe_body_right', pipeBodyRight, UNDERGROUND_PALETTE);

    // ── Sky tile variants (cloud blues) ──
    this._addSprite('sky_ground',          groundTile,    SKY_PALETTE);
    this._addSprite('sky_ground_top',      groundTopTile, SKY_PALETTE);
    this._addSprite('sky_brick',           brickTile,     SKY_PALETTE);
    this._addSprite('sky_hard_block',      hardBlockTile, SKY_PALETTE);
    this._addSprite('sky_pipe_top_left',   pipeTopLeft,   SKY_PALETTE);
    this._addSprite('sky_pipe_top_right',  pipeTopRight,  SKY_PALETTE);
    this._addSprite('sky_pipe_body_left',  pipeBodyLeft,  SKY_PALETTE);
    this._addSprite('sky_pipe_body_right', pipeBodyRight, SKY_PALETTE);

    // ── Castle tile variants (dark stone) ──
    // ground_top uses plain brick (no grass) so it looks like a stone floor
    this._addSprite('castle_ground',          groundTile,    CASTLE_PALETTE);
    this._addSprite('castle_ground_top',      groundTile,    CASTLE_PALETTE);
    this._addSprite('castle_brick',           brickTile,     CASTLE_PALETTE);
    this._addSprite('castle_hard_block',      hardBlockTile, CASTLE_PALETTE);
    this._addSprite('castle_pipe_top_left',   pipeTopLeft,   CASTLE_PALETTE);
    this._addSprite('castle_pipe_top_right',  pipeTopRight,  CASTLE_PALETTE);
    this._addSprite('castle_pipe_body_left',  pipeBodyLeft,  CASTLE_PALETTE);
    this._addSprite('castle_pipe_body_right', pipeBodyRight, CASTLE_PALETTE);
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
