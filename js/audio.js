/**
 * Audio System for Procedural Mario.
 * All sounds generated procedurally using Web Audio API - no audio files needed.
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  function AudioManager() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicNodes = [];
    this.initialized = false;
    this.masterGain = null;
    this.hurryUp = false; // true when timer < 100 → music speeds up
    this.musicTheme = 'overworld';
  }

  /**
   * Initialize audio context (must be called from user interaction)
   */
  AudioManager.prototype.init = function() {
    if (this.initialized) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  };

  AudioManager.prototype.resume = function() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  };

  AudioManager.prototype.toggleMute = function() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  };

  /**
   * Play a tone with given parameters
   * @param {number} [pan] - optional stereo pan value in [-1, 1]
   */
  AudioManager.prototype._playTone = function(freq, duration, type, startTime, gainVal, pan) {
    if (!this.ctx || this.muted) return null;
    var t = startTime || this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);

    if (pan !== undefined && pan !== 0 && this.ctx.createStereoPanner) {
      var panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      gain.connect(this.masterGain);
    }

    osc.start(t);
    osc.stop(t + duration);
    return osc;
  };

  /**
   * Compute a pan value [-1, 1] for a world-x position relative to camera center.
   * @param {number} worldX  - entity x in world pixels
   * @param {number} camCenterX - camera center x in world pixels
   */
  AudioManager.prototype.getPan = function(worldX, camCenterX) {
    var range = 128; // half-screen width in pixels
    var offset = worldX - camCenterX;
    return Math.max(-1, Math.min(1, offset / range));
  };

  /**
   * Play a sound effect with stereo panning based on world position.
   * @param {string} soundName - 'coin' | 'stomp' | 'bump' | 'break'
   * @param {number} worldX
   * @param {number} camCenterX
   */
  AudioManager.prototype.playSpatial = function(soundName, worldX, camCenterX) {
    var pan = this.getPan(worldX, camCenterX);
    var t = this.ctx ? this.ctx.currentTime : 0;
    switch (soundName) {
      case 'coin':
        this._playTone(1318.5, 0.08, 'square', t, 0.12, pan);
        this._playTone(1975.5, 0.15, 'square', t + 0.08, 0.12, pan);
        break;
      case 'stomp':
        // noise is not panned (no pan param support for noise)
        this.playStomp();
        break;
      case 'bump':
        this._playTone(80, 0.05, 'square', t, 0.15, pan);
        break;
    }
  };

  /**
   * Play a frequency sweep
   */
  AudioManager.prototype._playSweep = function(startFreq, endFreq, duration, type, startTime, gainVal) {
    if (!this.ctx || this.muted) return null;
    var t = startTime || this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.linearRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(gainVal || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    return osc;
  };

  /**
   * Play a noise burst
   */
  AudioManager.prototype._playNoise = function(duration, startTime, gainVal) {
    if (!this.ctx || this.muted) return;
    var t = startTime || this.ctx.currentTime;
    var bufferSize = Math.ceil(this.ctx.sampleRate * duration);
    var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var src = this.ctx.createBufferSource();
    src.buffer = buffer;
    var gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + duration);
  };

  // ===== SOUND EFFECTS =====

  /** Jump: quick ascending square wave sweep */
  AudioManager.prototype.playJump = function() {
    this._playSweep(150, 400, 0.15, 'square');
  };

  /** Coin: two quick high notes */
  AudioManager.prototype.playCoin = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this._playTone(1318.5, 0.08, 'square', t, 0.12); // E6
    this._playTone(1975.5, 0.15, 'square', t + 0.08, 0.12); // B6
  };

  /** Stomp: noise burst + low tone */
  AudioManager.prototype.playStomp = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this._playNoise(0.06, t, 0.12);
    this._playTone(120, 0.1, 'square', t, 0.1);
  };

  /** Power-up: ascending arpeggio */
  AudioManager.prototype.playPowerUp = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    var notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0]; // C5-G6
    var dur = 0.08;
    for (var i = 0; i < notes.length; i++) {
      this._playTone(notes[i], dur * 1.5, 'square', t + i * dur, 0.1);
    }
  };

  /** Death: descending tone */
  AudioManager.prototype.playDeath = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this._playSweep(600, 100, 0.3, 'square', t, 0.15);
    this._playSweep(400, 80, 0.4, 'triangle', t + 0.3, 0.1);
  };

  /** 1-up: ascending major arpeggio */
  AudioManager.prototype.play1Up = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    var notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    for (var i = 0; i < notes.length; i++) {
      this._playTone(notes[i], 0.12, 'square', t + i * 0.06, 0.12);
    }
  };

  /** Block bump: short low thud */
  AudioManager.prototype.playBump = function() {
    this._playTone(80, 0.05, 'square', null, 0.15);
  };

  /** Block break: noise burst */
  AudioManager.prototype.playBreak = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this._playNoise(0.1, t, 0.15);
    this._playTone(200, 0.08, 'square', t, 0.08);
  };

  /** Fireball: quick descending sweep */
  AudioManager.prototype.playFireball = function() {
    this._playSweep(900, 200, 0.12, 'square', null, 0.1);
  };

  /** Flagpole victory fanfare */
  AudioManager.prototype.playFlagpole = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    // Short ascending melody
    var notes = [
      [523.25, 0.15], [659.25, 0.15], [783.99, 0.15],
      [1046.5, 0.3], [783.99, 0.1], [1046.5, 0.4]
    ];
    var offset = 0;
    for (var i = 0; i < notes.length; i++) {
      this._playTone(notes[i][0], notes[i][1] * 1.2, 'square', t + offset, 0.12);
      this._playTone(notes[i][0] * 0.5, notes[i][1] * 1.2, 'triangle', t + offset, 0.06);
      offset += notes[i][1];
    }
  };

  /** Game over melody */
  AudioManager.prototype.playGameOver = function() {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    var notes = [
      [392, 0.3], [330, 0.3], [262, 0.3], [220, 0.3], [196, 0.6]
    ]; // G4 E4 C4 A3 G3
    var offset = 0;
    for (var i = 0; i < notes.length; i++) {
      this._playTone(notes[i][0], notes[i][1] * 1.3, 'triangle', t + offset, 0.12);
      offset += notes[i][1];
    }
  };

  /** Pipe/warp sound */
  AudioManager.prototype.playPipe = function() {
    this._playSweep(500, 150, 0.3, 'square', null, 0.1);
  };

  /**
   * Duck background music for `durationSec` then restore.
   * Used by jingle stings so they are clearly audible over the loop.
   */
  AudioManager.prototype._duckMusic = function(durationSec) {
    if (!this.masterGain || this.muted) return;
    var gain = this.masterGain.gain;
    var now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0.06, now);                     // duck to 20% of normal
    gain.linearRampToValueAtTime(0.3, now + durationSec); // restore
  };

  /** 1-Up jingle: ascending arpeggio (already defined above, but now ducks music) */
  AudioManager.prototype.play1UpJingle = function() {
    if (!this.ctx) return;
    this._duckMusic(0.6);
    this.play1Up();
  };

  /** Power-up jingle: ascending scale, ducks music */
  AudioManager.prototype.playPowerUpJingle = function() {
    if (!this.ctx) return;
    this._duckMusic(0.8);
    this.playPowerUp();
  };

  /** Level-complete jingle: fanfare, ducks music */
  AudioManager.prototype.playLevelCompleteJingle = function() {
    if (!this.ctx) return;
    // Note: stopMusic is called separately by levelComplete event handler
    this.playFlagpole();
  };

  // ===== BACKGROUND MUSIC =====

  /**
   * Start background music for the given theme.
   * @param {string} theme - 'overworld' | 'underground' | 'sky' | 'castle'
   */
  AudioManager.prototype.startMusic = function(theme) {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.musicTheme   = theme || 'overworld';
    this._playMusicLoopForTheme();
  };

  AudioManager.prototype._playMusicLoopForTheme = function() {
    switch (this.musicTheme) {
      case 'underground': this._playUndergroundMusicLoop(); break;
      case 'sky':         this._playSkyMusicLoop();         break;
      case 'castle':      this._playCastleMusicLoop();      break;
      case 'water':       this._playWaterMusicLoop();       break;
      default:            this._playMusicLoop();
    }
  };

  AudioManager.prototype.stopMusic = function() {
    this.musicPlaying  = false;
    this.musicTheme    = 'overworld';
    this.hurryUp       = false;
    this._starActive   = false;
    for (var i = 0; i < this.musicNodes.length; i++) {
      try { this.musicNodes[i].stop(); } catch (e) { /* already stopped */ }
    }
    this.musicNodes = [];
  };

  /**
   * Switch to fast star music while star power is active.
   * @param {string} resumeTheme - the theme to restore when star ends
   */
  AudioManager.prototype.startStarMusic = function(resumeTheme) {
    if (!this.ctx) return;
    this._starActive     = true;
    this._starResumeTheme = resumeTheme || 'overworld';
    // Stop current music, play star loop
    var wasPlaying = this.musicPlaying;
    this.musicPlaying = false;
    for (var i = 0; i < this.musicNodes.length; i++) {
      try { this.musicNodes[i].stop(); } catch (e) {}
    }
    this.musicNodes = [];
    if (wasPlaying) {
      this.musicPlaying = true;
      this._playStarMusicLoop();
    }
  };

  AudioManager.prototype.stopStarMusic = function() {
    if (!this._starActive) return;
    this._starActive = false;
    // Stop star loop, resume original theme
    this.musicPlaying = false;
    for (var i = 0; i < this.musicNodes.length; i++) {
      try { this.musicNodes[i].stop(); } catch (e) {}
    }
    this.musicNodes = [];
    this.startMusic(this._starResumeTheme || 'overworld');
  };

  AudioManager.prototype._playStarMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying || !this._starActive) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.02;
    var eighth = (60 / 220) / 2; // Very fast BPM

    // Star melody: bright, fast, upbeat
    var melody = [
      659.25, 0, 783.99, 0, 987.77, 0, 1046.5, 0,
      987.77, 0, 880,    0, 783.99, 0, 659.25, 0,
      523.25, 0, 659.25, 0, 783.99, 0, 880,    0,
      987.77, 0, 0,      0, 0,      0, 0,      0
    ];
    var bass = [
      261.63, 0, 329.63, 0, 261.63, 0, 329.63, 0,
      261.63, 0, 329.63, 0, 261.63, 0, 329.63, 0,
      196.00, 0, 261.63, 0, 196.00, 0, 261.63, 0,
      246.94, 0, 246.94, 0, 246.94, 0, 246.94, 0
    ];

    var totalDuration = melody.length * eighth;
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.7, 'square', t + i * eighth, 0.07);
        if (o1) this.musicNodes.push(o1);
      }
    }
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o2 = this._playTone(bass[j], eighth * 0.6, 'triangle', t + j * eighth, 0.05);
        if (o2) this.musicNodes.push(o2);
      }
    }
    for (var k = 0; k < melody.length; k += 2) {
      this._playNoise(0.02, t + k * eighth, 0.04);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying && self._starActive) self._playStarMusicLoop();
      else if (self.musicPlaying && !self._starActive) self._playMusicLoopForTheme();
    }, totalDuration * 1000);
  };

  /**
   * Enable/disable hurry-up mode (restarts the current music loop at 1.5× BPM).
   */
  AudioManager.prototype.setHurryUp = function(enabled) {
    if (this.hurryUp === enabled) return;
    this.hurryUp = enabled;
    if (this.musicPlaying) {
      // Restart the loop — the next iteration will pick up the new BPM multiplier
      var theme = this.musicTheme;
      this.stopMusic();
      this.startMusic(theme);
    }
  };

  AudioManager.prototype._playMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self = this;
    var t = this.ctx.currentTime + 0.05;
    var bpm = this.hurryUp ? 210 : 140;
    var beat = 60 / bpm;
    var eighth = beat / 2;

    // C major – dense, bouncy 8-bar melody
    var melody = [
      // Bar 1
      659.25, 659.25, 659.25, 523.25, 659.25, 783.99, 0, 392.00,
      // Bar 2
      523.25, 0, 392.00, 0, 329.63, 0, 440.00, 493.88,
      // Bar 3
      466.16, 440.00, 0, 392.00, 659.25, 783.99, 880.00, 698.46,
      // Bar 4
      783.99, 659.25, 523.25, 587.33, 493.88, 0, 0, 0,
      // Bar 5 (repeat A)
      659.25, 659.25, 659.25, 523.25, 659.25, 783.99, 0, 392.00,
      // Bar 6
      523.25, 0, 392.00, 0, 329.63, 0, 440.00, 493.88,
      // Bar 7 (turnaround)
      466.16, 440.00, 392.00, 349.23, 329.63, 523.25, 392.00, 0,
      // Bar 8
      523.25, 0, 0, 0, 0, 0, 0, 0
    ];

    // Harmony voice: parallel perfect 4th above melody
    var harmony = [
      // Bar 1
      880.00, 880.00, 880.00, 698.46, 880.00, 1046.50, 0, 523.25,
      // Bar 2
      698.46, 0, 523.25, 0, 440.00, 0, 587.33, 659.25,
      // Bar 3
      622.25, 587.33, 0, 523.25, 880.00, 1046.50, 1174.66, 932.33,
      // Bar 4
      1046.50, 880.00, 698.46, 783.99, 659.25, 0, 0, 0,
      // Bar 5
      880.00, 880.00, 880.00, 698.46, 880.00, 1046.50, 0, 523.25,
      // Bar 6
      698.46, 0, 523.25, 0, 440.00, 0, 587.33, 659.25,
      // Bar 7
      622.25, 587.33, 523.25, 466.16, 440.00, 698.46, 523.25, 0,
      // Bar 8
      698.46, 0, 0, 0, 0, 0, 0, 0
    ];

    // Oom-pah bass: root on beats 1&3, fifth on beats 2&4
    var bass = [
      // Bar 1 – C/G
      130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
      // Bar 2 – C/G
      130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
      // Bar 3 – F/C
      174.61, 0, 261.63, 0, 174.61, 0, 261.63, 0,
      // Bar 4 – G/D
      196.00, 0, 293.66, 0, 196.00, 0, 293.66, 0,
      // Bar 5 – C/G
      130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
      // Bar 6 – C/G
      130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
      // Bar 7 – F/C → G/D
      174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
      // Bar 8 – C/G
      130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0
    ];

    var totalDuration = melody.length * eighth;

    // Melody (main voice)
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.8, 'square', t + i * eighth, 0.06);
        if (o1) this.musicNodes.push(o1);
      }
    }

    // Harmony voice (softer, triangle)
    for (var h = 0; h < harmony.length; h++) {
      if (harmony[h] > 0) {
        var o2 = this._playTone(harmony[h], eighth * 0.7, 'triangle', t + h * eighth, 0.028);
        if (o2) this.musicNodes.push(o2);
      }
    }

    // Oom-pah bass
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o3 = this._playTone(bass[j], eighth * 0.8, 'triangle', t + j * eighth, 0.05);
        if (o3) this.musicNodes.push(o3);
      }
    }

    // Kick on beats 1&3, snare on beats 2&4 (every quarter note)
    for (var k = 0; k < melody.length; k += 2) {
      var pos8 = k % 8;
      var kt = t + k * eighth;
      if (pos8 === 0 || pos8 === 4) {
        this._playTone(55, 0.08, 'sine', kt, 0.09);
        this._playNoise(0.04, kt, 0.05);
      } else {
        this._playNoise(0.05, kt, 0.052);
      }
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playMusicLoop();
    }, totalDuration * 1000);
  };

  // ===== THEME MUSIC LOOPS =====

  // ── Underground: A-minor, echo feel, chromatic descending bass ──
  AudioManager.prototype._playUndergroundMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self  = this;
    var t     = this.ctx.currentTime + 0.05;
    var bpm   = this.hurryUp ? 165 : 110;
    var eighth = (60 / bpm) / 2;

    // A natural minor – denser, chromatic phrases with echo
    var melody = [
      // Bar 1
      440.00, 523.25, 0, 523.25, 440.00, 392.00, 349.23, 0,
      // Bar 2
      329.63, 0, 392.00, 0, 329.63, 293.66, 329.63, 0,
      // Bar 3
      349.23, 440.00, 0, 440.00, 349.23, 329.63, 293.66, 0,
      // Bar 4 – descending chromatic
      329.63, 0, 0, 293.66, 261.63, 246.94, 220.00, 0,
      // Bar 5 – repeat
      440.00, 523.25, 0, 523.25, 440.00, 392.00, 349.23, 0,
      // Bar 6
      329.63, 0, 293.66, 0, 261.63, 246.94, 261.63, 0,
      // Bar 7 – chromatic descent to resolution
      293.66, 329.63, 349.23, 329.63, 293.66, 261.63, 246.94, 0,
      // Bar 8
      220.00, 0, 0, 0, 0, 0, 0, 0
    ];

    // Chromatic descending bass: A→Ab→G→F#→F→E→Eb→A (root + fifth)
    var bass = [
      // Bar 1: A2 + E3
      110.00, 0, 164.81, 0, 110.00, 0, 164.81, 0,
      // Bar 2: Ab2 + Eb3
      103.83, 0, 155.56, 0, 103.83, 0, 155.56, 0,
      // Bar 3: G2 + D3
      98.00, 0, 146.83, 0, 98.00, 0, 146.83, 0,
      // Bar 4: F#2 + C#3
      92.50, 0, 138.59, 0, 92.50, 0, 138.59, 0,
      // Bar 5: F2 + C3
      87.31, 0, 130.81, 0, 87.31, 0, 130.81, 0,
      // Bar 6: E2 + B2
      82.41, 0, 123.47, 0, 82.41, 0, 123.47, 0,
      // Bar 7: Eb2 + Bb2
      77.78, 0, 116.54, 0, 77.78, 0, 116.54, 0,
      // Bar 8: A2 (return)
      110.00, 0, 0, 0, 0, 0, 0, 0
    ];

    var totalDuration = melody.length * eighth;

    // Melody with echo effect
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.9, 'triangle', t + i * eighth, 0.07);
        if (o1) this.musicNodes.push(o1);
        var o2 = this._playTone(melody[i], eighth * 0.7, 'triangle', t + i * eighth + 0.065, 0.03);
        if (o2) this.musicNodes.push(o2);
      }
    }

    // Chromatic descending bass (sine for ominous sustain)
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o3 = this._playTone(bass[j], eighth * 1.8, 'sine', t + j * eighth, 0.08);
        if (o3) this.musicNodes.push(o3);
      }
    }

    // Sparse, eerie percussion (every 4 beats)
    for (var k = 0; k < melody.length; k += 8) {
      this._playNoise(0.04, t + k * eighth, 0.03);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playUndergroundMusicLoop();
    }, totalDuration * 1000);
  };

  // ── Sky: G-major, bright, high octave, floating countermelody ──
  AudioManager.prototype._playSkyMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.05;
    var eighth = (60 / (this.hurryUp ? 225 : 150)) / 2;

    // G major – dense, airy melody
    var melody = [
      // Bar 1 – G major ascending
      783.99, 0, 987.77, 0, 880.00, 783.99, 0, 659.25,
      // Bar 2
      783.99, 880.00, 0, 783.99, 0, 587.33, 493.88, 0,
      // Bar 3
      880.00, 0, 783.99, 740.00, 0, 659.25, 587.33, 0,
      // Bar 4
      659.25, 587.33, 493.88, 0, 587.33, 0, 783.99, 0,
      // Bar 5 – B section, higher register
      987.77, 0, 880.00, 0, 783.99, 880.00, 987.77, 0,
      // Bar 6
      880.00, 783.99, 0, 740.00, 0, 783.99, 0, 659.25,
      // Bar 7 – descending run
      587.33, 659.25, 740.00, 783.99, 880.00, 0, 783.99, 0,
      // Bar 8 – resolution
      392.00, 0, 0, 0, 0, 0, 0, 0
    ];

    // High arpeggio countermelody (sparse, very soft – floaty feel)
    var counter = [
      1046.50, 0, 0, 0, 1174.66, 0, 0, 0,
      1318.50, 0, 0, 0, 1174.66, 0, 0, 0,
      1174.66, 0, 0, 0, 1046.50, 0, 0, 0,
      987.77,  0, 0, 0, 1046.50, 0, 0, 0,
      1174.66, 0, 0, 0, 1318.50, 0, 0, 0,
      1567.98, 0, 0, 0, 1318.50, 0, 0, 0,
      1174.66, 0, 0, 0, 987.77,  0, 0, 0,
      783.99,  0, 0, 0, 0,       0, 0, 0
    ];

    // G major oom-pah bass (root on beats 1&3, fifth on beats 2&4)
    var bass = [
      // Bar 1 – G/D
      196.00, 0, 293.66, 0, 196.00, 0, 293.66, 0,
      // Bar 2 – G/D with Am movement
      196.00, 0, 293.66, 0, 220.00, 0, 329.63, 0,
      // Bar 3 – F#/C# passing
      185.00, 0, 277.18, 0, 185.00, 0, 277.18, 0,
      // Bar 4 – G/D
      196.00, 0, 293.66, 0, 196.00, 0, 293.66, 0,
      // Bar 5 – B/F#
      246.94, 0, 369.99, 0, 246.94, 0, 369.99, 0,
      // Bar 6 – Am/E
      220.00, 0, 329.63, 0, 220.00, 0, 329.63, 0,
      // Bar 7 – C/G to D/A
      130.81, 0, 196.00, 0, 196.00, 0, 293.66, 0,
      // Bar 8 – G resolution
      196.00, 0, 293.66, 0, 196.00, 0, 293.66, 0
    ];

    var totalDuration = melody.length * eighth;

    // Main melody (square, bright)
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.7, 'square', t + i * eighth, 0.05);
        if (o1) this.musicNodes.push(o1);
      }
    }

    // High arpeggio countermelody (triangle, very soft)
    for (var c = 0; c < counter.length; c++) {
      if (counter[c] > 0) {
        var o2 = this._playTone(counter[c], eighth * 1.8, 'triangle', t + c * eighth, 0.02);
        if (o2) this.musicNodes.push(o2);
      }
    }

    // Oom-pah bass
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o3 = this._playTone(bass[j], eighth * 0.7, 'triangle', t + j * eighth, 0.05);
        if (o3) this.musicNodes.push(o3);
      }
    }

    // Light, airy percussion (every beat)
    for (var k = 0; k < melody.length; k += 4) {
      this._playNoise(0.02, t + k * eighth, 0.025);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playSkyMusicLoop();
    }, totalDuration * 1000);
  };

  // ── Castle: D-minor, ominous, driving constant bass ──
  AudioManager.prototype._playCastleMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.05;
    var eighth = (60 / (this.hurryUp ? 232 : 155)) / 2;

    // D minor – aggressive, denser melody
    var melody = [
      // Bar 1
      587.33, 587.33, 698.46, 0, 880.00, 932.33, 0, 880.00,
      // Bar 2
      783.99, 0, 698.46, 0, 622.25, 0, 587.33, 0,
      // Bar 3 – ascending run
      698.46, 783.99, 880.00, 932.33, 880.00, 783.99, 698.46, 0,
      // Bar 4 – descending
      622.25, 587.33, 0, 523.25, 0, 466.16, 440.00, 0,
      // Bar 5 – repeat
      587.33, 587.33, 698.46, 0, 880.00, 932.33, 0, 880.00,
      // Bar 6 – variant
      783.99, 698.46, 622.25, 587.33, 523.25, 466.16, 523.25, 0,
      // Bar 7 – intensifying
      587.33, 622.25, 698.46, 622.25, 587.33, 523.25, 466.16, 0,
      // Bar 8 – resolution
      293.66, 0, 0, 0, 0, 0, 0, 0
    ];

    // Constant 8th-note driving bass: D/A alternating, sawtooth
    var bass = [
      // Bar 1 – D/A
      73.42, 110.00, 73.42, 110.00, 73.42, 110.00, 73.42, 73.42,
      // Bar 2 – C/G
      65.41, 98.00,  65.41, 98.00,  65.41, 98.00,  65.41, 65.41,
      // Bar 3 – D/A
      73.42, 110.00, 73.42, 110.00, 73.42, 110.00, 73.42, 73.42,
      // Bar 4 – Bb/F → C/G → D
      58.27, 87.31,  65.41, 98.00,  73.42, 110.00, 73.42, 73.42,
      // Bar 5 – D/A
      73.42, 110.00, 73.42, 110.00, 73.42, 110.00, 73.42, 73.42,
      // Bar 6 – Bb/F and C/G descent
      58.27, 87.31,  65.41, 98.00,  58.27, 87.31,  65.41, 98.00,
      // Bar 7 – D/A building
      73.42, 110.00, 73.42, 110.00, 73.42, 110.00, 73.42, 82.41,
      // Bar 8 – D pedal
      73.42, 73.42,  73.42, 73.42,  73.42, 73.42,  73.42, 73.42
    ];

    var totalDuration = melody.length * eighth;

    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.8, 'square', t + i * eighth, 0.06);
        if (o1) this.musicNodes.push(o1);
      }
    }

    // Constant driving bass (all 64 slots)
    for (var j = 0; j < bass.length; j++) {
      var o2 = this._playTone(bass[j], eighth * 0.72, 'sawtooth', t + j * eighth, 0.065);
      if (o2) this.musicNodes.push(o2);
    }

    // Kick on beats 1&3, heavy snare on beats 2&4 (every quarter note)
    for (var k = 0; k < melody.length; k += 2) {
      var pos8c = k % 8;
      var ktc   = t + k * eighth;
      if (pos8c === 0 || pos8c === 4) {
        this._playTone(55, 0.09, 'sine', ktc, 0.10);
        this._playNoise(0.05, ktc, 0.07);
      } else {
        this._playNoise(0.06, ktc, 0.065);
      }
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playCastleMusicLoop();
    }, totalDuration * 1000);
  };

  // ── Water: D-minor, slow flowing arpeggio, sine-heavy ──
  AudioManager.prototype._playWaterMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.05;
    var bpm    = this.hurryUp ? 160 : 105;
    var eighth = (60 / bpm) / 2;

    // D natural minor – improved density, legato flowing feel
    var melody = [
      // Bar 1
      293.66, 0, 349.23, 0, 440.00, 0, 392.00, 0,
      // Bar 2
      349.23, 329.63, 293.66, 0, 261.63, 0, 293.66, 0,
      // Bar 3
      329.63, 0, 293.66, 0, 261.63, 246.94, 261.63, 0,
      // Bar 4 – breath
      293.66, 0, 0, 261.63, 0, 0, 0, 0,
      // Bar 5
      220.00, 0, 261.63, 0, 293.66, 0, 349.23, 0,
      // Bar 6
      329.63, 293.66, 261.63, 0, 246.94, 0, 261.63, 0,
      // Bar 7
      293.66, 329.63, 0, 349.23, 0, 329.63, 293.66, 0,
      // Bar 8
      146.83, 0, 0, 0, 0, 0, 0, 0
    ];

    // D minor ripple arpeggio bass (D-F-A chord tones)
    var bass = [
      // Bar 1: D-F-A ripple
      146.83, 0, 174.61, 0, 220.00, 0, 174.61, 0,
      // Bar 2: D sustained
      146.83, 0, 130.81, 0, 146.83, 0, 174.61, 0,
      // Bar 3: Bb chord
      123.47, 0, 146.83, 0, 174.61, 0, 146.83, 0,
      // Bar 4: C
      130.81, 0, 164.81, 0, 130.81, 0, 164.81, 0,
      // Bar 5: A minor
      110.00, 0, 130.81, 0, 164.81, 0, 130.81, 0,
      // Bar 6: Bb
      116.54, 0, 146.83, 0, 174.61, 0, 146.83, 0,
      // Bar 7: C moving to D
      130.81, 0, 164.81, 0, 146.83, 0, 174.61, 0,
      // Bar 8: D resolution
      146.83, 0, 0, 0, 0, 0, 0, 0
    ];

    var totalDuration = melody.length * eighth;

    // Melody: sine for soft, underwater timbre; octave shimmer
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 1.6, 'sine', t + i * eighth, 0.055);
        if (o1) this.musicNodes.push(o1);
        var o2 = this._playTone(melody[i] * 2, eighth * 1.0, 'sine', t + i * eighth, 0.018);
        if (o2) this.musicNodes.push(o2);
      }
    }

    // Bass: sine, long resonant notes
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o3 = this._playTone(bass[j], eighth * 1.8, 'sine', t + j * eighth, 0.06);
        if (o3) this.musicNodes.push(o3);
      }
    }

    // Very soft, infrequent percussion (bubbles)
    for (var k = 0; k < melody.length; k += 8) {
      this._playNoise(0.015, t + k * eighth, 0.03);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playWaterMusicLoop();
    }, totalDuration * 1000);
  };

  // ===== AMBIENT =====

  /**
   * Start a looping underground water-drip ambience.
   * Schedules random soft drips over a recurring window.
   */
  AudioManager.prototype.startDripAmbience = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self = this;
    this._dripLoop = true;
    this._scheduleDrip();
  };

  AudioManager.prototype._scheduleDrip = function() {
    if (!this._dripLoop || !this.musicPlaying || !this.ctx) return;
    var self = this;
    var delay = 800 + Math.random() * 2400; // 0.8 – 3.2 s
    this._dripTimeout = setTimeout(function() {
      if (!self._dripLoop || !self.musicPlaying) return;
      // Drip: short sine ping at 900–1400 Hz
      var freq = 900 + Math.random() * 500;
      self._playTone(freq, 0.06, 'sine', null, 0.04);
      self._playTone(freq * 0.5, 0.12, 'sine', null, 0.02); // echo
      self._scheduleDrip();
    }, delay);
  };

  AudioManager.prototype.stopDripAmbience = function() {
    this._dripLoop = false;
    if (this._dripTimeout) { clearTimeout(this._dripTimeout); this._dripTimeout = null; }
  };

  // ===== EXPORTS =====
  ProcMario.AudioManager = AudioManager;
})();
