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
   */
  AudioManager.prototype._playTone = function(freq, duration, type, startTime, gainVal) {
    if (!this.ctx || this.muted) return null;
    var t = startTime || this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
    return osc;
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
      default:            this._playMusicLoop();
    }
  };

  AudioManager.prototype.stopMusic = function() {
    this.musicPlaying = false;
    this.musicTheme   = 'overworld';
    for (var i = 0; i < this.musicNodes.length; i++) {
      try { this.musicNodes[i].stop(); } catch (e) { /* already stopped */ }
    }
    this.musicNodes = [];
  };

  AudioManager.prototype._playMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self = this;
    var t = this.ctx.currentTime + 0.05;
    var bpm = 140;
    var beat = 60 / bpm;
    var eighth = beat / 2;

    // Simple 4-bar melody in C major
    var melody = [
      // Bar 1
      523.25, 523.25, 0, 523.25, 0, 415.30, 523.25, 0,
      659.25, 0, 0, 0, 329.63, 0, 0, 0,
      // Bar 2
      392.00, 0, 0, 196.00, 0, 0, 261.63, 0,
      0, 329.63, 0, 349.23, 329.63, 0, 0, 0,
      // Bar 3
      523.25, 523.25, 0, 523.25, 0, 415.30, 523.25, 0,
      659.25, 0, 0, 0, 329.63, 0, 0, 0,
      // Bar 4
      392.00, 0, 0, 196.00, 0, 0, 261.63, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ];

    // Bass line
    var bass = [
      130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,
      164.81, 0, 164.81, 0, 164.81, 0, 164.81, 0,
      196.00, 0, 196.00, 0, 196.00, 0, 196.00, 0,
      130.81, 0, 130.81, 0, 196.00, 0, 130.81, 0,
      130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,
      164.81, 0, 164.81, 0, 164.81, 0, 164.81, 0,
      196.00, 0, 196.00, 0, 196.00, 0, 196.00, 0,
      130.81, 0, 130.81, 0, 196.00, 0, 130.81, 0
    ];

    var totalDuration = melody.length * eighth;

    // Schedule melody notes
    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var osc = this._playTone(melody[i], eighth * 0.8, 'square', t + i * eighth, 0.06);
        if (osc) this.musicNodes.push(osc);
      }
    }

    // Schedule bass notes
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var osc2 = this._playTone(bass[j], eighth * 0.8, 'triangle', t + j * eighth, 0.05);
        if (osc2) this.musicNodes.push(osc2);
      }
    }

    // Schedule percussion (noise on beats)
    for (var k = 0; k < melody.length; k += 4) {
      this._playNoise(0.03, t + k * eighth, 0.04);
    }

    // Schedule next loop
    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playMusicLoop();
    }, totalDuration * 1000);
  };

  // ===== THEME MUSIC LOOPS =====

  // ── Underground: A-minor, slow, echo feel ──
  AudioManager.prototype._playUndergroundMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self  = this;
    var t     = this.ctx.currentTime + 0.05;
    var bpm   = 110;
    var eighth = (60 / bpm) / 2;

    // Melody – A natural minor, dark descending phrases
    var melody = [
      220, 0, 220, 0, 261.63, 0, 220, 0,
      196, 0, 0,   0, 196,    0, 174.61, 0,
      196, 0, 220, 0, 246.94, 0, 220,    0,
      0,   0, 196, 0, 196,    0, 0,      0,
      220, 0, 261.63, 0, 293.66, 0, 261.63, 0,
      220, 0, 0,      0, 196,    0, 0,      0,
      174.61, 0, 196, 0, 220, 0, 196, 0,
      174.61, 0, 0,   0, 0,   0, 0,   0
    ];
    // Bass – sustained low drone
    var bass = [
      110, 0, 0, 0, 110, 0, 0, 0,
      98,  0, 0, 0, 98,  0, 0, 0,
      98,  0, 0, 0, 98,  0, 0, 0,
      110, 0, 0, 0, 110, 0, 0, 0,
      110, 0, 0, 0, 130.81, 0, 0, 0,
      110, 0, 0, 0, 98,     0, 0, 0,
      87.31, 0, 0, 0, 87.31, 0, 0, 0,
      110,   0, 0, 0, 0,     0, 0, 0
    ];

    var totalDuration = melody.length * eighth;

    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.9, 'triangle', t + i * eighth, 0.07);
        if (o1) this.musicNodes.push(o1);
        // Echo: faint repeat slightly offset
        var o2 = this._playTone(melody[i], eighth * 0.7, 'triangle', t + i * eighth + 0.065, 0.03);
        if (o2) this.musicNodes.push(o2);
      }
    }
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o3 = this._playTone(bass[j], eighth * 1.8, 'sine', t + j * eighth, 0.08);
        if (o3) this.musicNodes.push(o3);
      }
    }
    // Sparse percussion
    for (var k = 0; k < melody.length; k += 8) {
      this._playNoise(0.04, t + k * eighth, 0.03);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playUndergroundMusicLoop();
    }, totalDuration * 1000);
  };

  // ── Sky: G-major, bright, high octave ──
  AudioManager.prototype._playSkyMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.05;
    var eighth = (60 / 150) / 2;

    var melody = [
      783.99, 0, 880, 0, 987.77, 0, 880, 0,
      1046.5, 0, 0,   0, 880,    0, 0,   0,
      783.99, 0, 740, 0, 659.25, 0, 740, 0,
      783.99, 0, 0,   0, 0,      0, 0,   0,
      659.25, 0, 740,    0, 783.99, 0, 880,    0,
      987.77, 0, 0,      0, 1046.5, 0, 0,      0,
      880,    0, 783.99, 0, 740,    0, 659.25, 0,
      0,      0, 0,      0, 0,      0, 0,      0
    ];
    var bass = [
      196,    0, 196,    0, 220,    0, 196,    0,
      261.63, 0, 261.63, 0, 196,    0, 196,    0,
      185,    0, 185,    0, 164.81, 0, 185,    0,
      196,    0, 196,    0, 196,    0, 196,    0,
      164.81, 0, 164.81, 0, 196,    0, 220,    0,
      246.94, 0, 246.94, 0, 261.63, 0, 246.94, 0,
      220,    0, 196,    0, 185,    0, 164.81, 0,
      196,    0, 196,    0, 196,    0, 196,    0
    ];

    var totalDuration = melody.length * eighth;

    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.7, 'square', t + i * eighth, 0.05);
        if (o1) this.musicNodes.push(o1);
      }
    }
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o2 = this._playTone(bass[j], eighth * 0.7, 'triangle', t + j * eighth, 0.05);
        if (o2) this.musicNodes.push(o2);
      }
    }
    // Light, airy percussion
    for (var k = 0; k < melody.length; k += 4) {
      this._playNoise(0.02, t + k * eighth, 0.025);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playSkyMusicLoop();
    }, totalDuration * 1000);
  };

  // ── Castle: D-minor, ominous, driving ──
  AudioManager.prototype._playCastleMusicLoop = function() {
    if (!this.ctx || !this.musicPlaying) return;
    var self   = this;
    var t      = this.ctx.currentTime + 0.05;
    var eighth = (60 / 155) / 2;

    var melody = [
      293.66, 0, 293.66, 0, 349.23, 0, 293.66, 0,
      261.63, 0, 0,      0, 261.63, 0, 0,      0,
      293.66, 0, 329.63, 0, 349.23, 0, 329.63, 0,
      293.66, 0, 0,      0, 0,      0, 0,      0,
      233.08, 0, 233.08, 0, 261.63, 0, 293.66, 0,
      329.63, 0, 0,      0, 349.23, 0, 0,      0,
      293.66, 0, 261.63, 0, 233.08, 0, 220,    0,
      220,    0, 0,      0, 0,      0, 0,      0
    ];
    // Heavy, low bass
    var bass = [
      73.42, 0, 73.42, 0, 73.42, 0, 73.42, 0,
      65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0,
      73.42, 0, 73.42, 0, 87.31, 0, 73.42, 0,
      73.42, 0, 73.42, 0, 73.42, 0, 73.42, 0,
      58.27, 0, 58.27, 0, 65.41, 0, 73.42, 0,
      82.41, 0, 82.41, 0, 87.31, 0, 82.41, 0,
      73.42, 0, 65.41, 0, 58.27, 0, 55,    0,
      55,    0, 55,    0, 55,    0, 55,    0
    ];

    var totalDuration = melody.length * eighth;

    for (var i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        var o1 = this._playTone(melody[i], eighth * 0.8, 'square', t + i * eighth, 0.06);
        if (o1) this.musicNodes.push(o1);
      }
    }
    for (var j = 0; j < bass.length; j++) {
      if (bass[j] > 0) {
        var o2 = this._playTone(bass[j], eighth * 0.75, 'sawtooth', t + j * eighth, 0.07);
        if (o2) this.musicNodes.push(o2);
      }
    }
    // Heavy percussion on every beat and off-beat
    for (var k = 0; k < melody.length; k += 2) {
      this._playNoise(0.045, t + k * eighth, k % 4 === 0 ? 0.07 : 0.035);
    }

    setTimeout(function() {
      self.musicNodes = [];
      if (self.musicPlaying) self._playCastleMusicLoop();
    }, totalDuration * 1000);
  };

  // ===== EXPORTS =====
  ProcMario.AudioManager = AudioManager;
})();
