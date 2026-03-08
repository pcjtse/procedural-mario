/**
 * Theme definitions for Procedural Mario.
 * Supports: Overworld, Underground, Sky, Castle
 */
window.ProcMario = window.ProcMario || {};

(function () {
  'use strict';

  var Themes = {
    OVERWORLD:   'overworld',
    UNDERGROUND: 'underground',
    SKY:         'sky',
    CASTLE:      'castle',
    ICE:         'ice',
    WATER:       'water'
  };

  /**
   * Returns the theme name for a given level number (cycles through 5 themes).
   * @param {number} levelNum
   * @returns {string}
   */
  function getThemeForLevel(levelNum) {
    var cycle = ['overworld', 'underground', 'sky', 'castle', 'ice', 'water'];
    return cycle[(levelNum - 1) % cycle.length];
  }

  /**
   * Visual + audio properties for each theme.
   *  skyColor    - canvas fill for the sky/background
   *  introColor  - fill used on the level intro screen
   *  name        - display name shown on intro screen
   *  bgType      - background renderer to use
   *  musicType   - which music loop to play
   *  tilePrefix  - prepended to sprite names when looking up themed tiles
   */
  var THEME_PROPS = {
    overworld: {
      name:       'OVERWORLD',
      skyColor:   '#6B8CFF',
      introColor: '#000000',
      bgType:     'overworld',
      musicType:  'overworld',
      tilePrefix: ''
    },
    underground: {
      name:       'UNDERGROUND',
      skyColor:   '#000000',
      introColor: '#0A0A18',
      bgType:     'underground',
      musicType:  'underground',
      tilePrefix: 'ug_'
    },
    sky: {
      name:       'SKY WORLD',
      skyColor:   '#87CEEB',
      introColor: '#003366',
      bgType:     'sky',
      musicType:  'sky',
      tilePrefix: 'sky_'
    },
    castle: {
      name:       'CASTLE',
      skyColor:   '#110000',
      introColor: '#110000',
      bgType:     'castle',
      musicType:  'castle',
      tilePrefix: 'castle_'
    },
    ice: {
      name:       'ICE WORLD',
      skyColor:   '#C8E8FF',
      introColor: '#001830',
      bgType:     'ice',
      musicType:  'sky',   // reuse sky music (light, airy feel)
      tilePrefix: ''
    },
    water: {
      name:       'WATER WORLD',
      skyColor:   '#003060',
      introColor: '#001828',
      bgType:     'water',
      musicType:  'water',
      tilePrefix: ''
    }
  };

  ProcMario.Themes         = Themes;
  ProcMario.getThemeForLevel = getThemeForLevel;
  ProcMario.THEME_PROPS    = THEME_PROPS;
})();
