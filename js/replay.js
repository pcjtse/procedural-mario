/**
 * Replay System — records player inputs + seeds each frame.
 * Allows replaying a run from the title screen.
 *
 * Usage:
 *   ReplayRecorder.start(initialSeed)  — begin recording
 *   ReplayRecorder.recordFrame(inputs) — call once per game frame
 *   ReplayRecorder.stop()              — stop and return ReplayData
 *
 *   ReplayPlayer.load(replayData)      — load a recorded replay
 *   ReplayPlayer.getInputs(frameNum)   — return inputs for this frame
 *   ReplayPlayer.isFinished(frameNum)  — true when replay ends
 *
 * Input format per frame (compact bitmask):
 *   bit 0  left
 *   bit 1  right
 *   bit 2  jump
 *   bit 3  jumpHeld
 *   bit 4  run
 *   bit 5  down
 *   bit 6  up
 */
window.ProcMario = window.ProcMario || {};

(function () {
  'use strict';

  // ── Bitmask helpers ──
  var BITS = {
    left:     1 << 0,
    right:    1 << 1,
    jump:     1 << 2,
    jumpHeld: 1 << 3,
    run:      1 << 4,
    down:     1 << 5,
    up:       1 << 6
  };

  function encodeMask(inputs) {
    var m = 0;
    if (inputs.left)     m |= BITS.left;
    if (inputs.right)    m |= BITS.right;
    if (inputs.jump)     m |= BITS.jump;
    if (inputs.jumpHeld) m |= BITS.jumpHeld;
    if (inputs.run)      m |= BITS.run;
    if (inputs.down)     m |= BITS.down;
    if (inputs.up)       m |= BITS.up;
    return m;
  }

  function decodeMask(m) {
    return {
      left:     !!(m & BITS.left),
      right:    !!(m & BITS.right),
      jump:     !!(m & BITS.jump),
      jumpHeld: !!(m & BITS.jumpHeld),
      run:      !!(m & BITS.run),
      down:     !!(m & BITS.down),
      up:       !!(m & BITS.up)
    };
  }

  // Run-length encode an array of bytes (reduces storage for held inputs)
  function rleEncode(bytes) {
    var out = [];
    var i = 0;
    while (i < bytes.length) {
      var val = bytes[i];
      var run = 1;
      while (i + run < bytes.length && bytes[i + run] === val && run < 255) {
        run++;
      }
      out.push(val, run);
      i += run;
    }
    return out;
  }

  function rleDecode(encoded, expectedLen) {
    var out = new Uint8Array(expectedLen);
    var di = 0;
    for (var i = 0; i + 1 < encoded.length; i += 2) {
      var val = encoded[i];
      var run = encoded[i + 1];
      for (var r = 0; r < run && di < expectedLen; r++) {
        out[di++] = val;
      }
    }
    return out;
  }

  // ── ReplayData ──
  // Immutable bundle: seed + compressed input stream + level seeds array
  function ReplayData(initialSeed, levelSeeds, frames, frameCount) {
    this.initialSeed = initialSeed;
    this.levelSeeds  = levelSeeds;  // seed used at each level boundary
    this.frames      = frames;      // Uint8Array of input masks (decoded)
    this.frameCount  = frameCount;
    this.version     = 1;
    this.timestamp   = Date.now();
  }

  ReplayData.prototype.toJSON = function () {
    var encoded = rleEncode(Array.from(this.frames));
    return JSON.stringify({
      v:    this.version,
      seed: this.initialSeed,
      lvls: this.levelSeeds,
      enc:  encoded,
      len:  this.frameCount,
      ts:   this.timestamp
    });
  };

  ReplayData.fromJSON = function (jsonStr) {
    try {
      var obj = JSON.parse(jsonStr);
      var frames = rleDecode(obj.enc, obj.len);
      var rd = new ReplayData(obj.seed, obj.lvls, frames, obj.len);
      rd.timestamp = obj.ts;
      return rd;
    } catch (e) {
      return null;
    }
  };

  // Persist replays to localStorage
  var LS_KEY = 'procmario_replays';

  function loadStoredReplays() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReplayToStorage(replayData, label) {
    try {
      var stored = loadStoredReplays();
      stored.unshift({ label: label || 'Replay', data: replayData.toJSON(), ts: Date.now() });
      if (stored.length > 5) stored.length = 5; // keep last 5
      localStorage.setItem(LS_KEY, JSON.stringify(stored));
    } catch (e) { /* storage full — skip */ }
  }

  // ── ReplayRecorder ──
  var ReplayRecorder = {
    _recording: false,
    _frames:    null,
    _seed:      0,
    _levelSeeds: null,

    start: function (initialSeed) {
      this._recording  = true;
      this._seed       = initialSeed;
      this._frames     = [];
      this._levelSeeds = [initialSeed];
    },

    recordFrame: function (inputObj) {
      if (!this._recording) return;
      this._frames.push(encodeMask(inputObj));
    },

    recordLevelSeed: function (seed) {
      if (!this._recording) return;
      this._levelSeeds.push(seed);
    },

    stop: function (label) {
      if (!this._recording) return null;
      this._recording = false;
      var frameArr = new Uint8Array(this._frames);
      var rd = new ReplayData(this._seed, this._levelSeeds.slice(), frameArr, this._frames.length);
      saveReplayToStorage(rd, label);
      this._frames = null;
      return rd;
    },

    isRecording: function () { return this._recording; }
  };

  // ── ReplayPlayer ──
  var ReplayPlayer = {
    _data:    null,
    _active:  false,

    load: function (replayData) {
      this._data   = replayData;
      this._active = true;
    },

    stop: function () {
      this._active = false;
      this._data   = null;
    },

    isActive: function () { return this._active; },

    getSeedForLevel: function (levelIdx) {
      if (!this._data) return null;
      return this._data.levelSeeds[levelIdx] !== undefined
        ? this._data.levelSeeds[levelIdx]
        : null;
    },

    getInputs: function (frameNum) {
      if (!this._data || frameNum >= this._data.frameCount) return null;
      return decodeMask(this._data.frames[frameNum]);
    },

    isFinished: function (frameNum) {
      return !this._data || frameNum >= this._data.frameCount;
    },

    getStoredReplays: function () { return loadStoredReplays(); },
    loadFromStorage: function (idx) {
      var stored = loadStoredReplays();
      if (!stored[idx]) return null;
      return ReplayData.fromJSON(stored[idx].data);
    }
  };

  ProcMario.ReplayRecorder  = ReplayRecorder;
  ProcMario.ReplayPlayer    = ReplayPlayer;
  ProcMario.ReplayData      = ReplayData;
})();
