/**
 * Touch controls — virtual D-pad and A/B/Start buttons for mobile.
 * Creates an HTML overlay inside #game-container and wires touchstart/touchend
 * events to update game.input._touch so the engine reads them like keyboard input.
 *
 * Buttons are only shown when a touch device is detected (coarse pointer media query).
 * Depends on: engine.js (InputManager._touch)
 */
window.ProcMario = window.ProcMario || {};

(function() {
  'use strict';

  /**
   * Initialise touch controls.
   * @param {InputManager} input - The game's InputManager instance
   */
  ProcMario.initTouchControls = function(input) {
    // Only show on touch / coarse-pointer devices
    var isTouch = window.matchMedia('(pointer: coarse)').matches ||
                  ('ontouchstart' in window);
    if (!isTouch) return;

    var container = document.getElementById('game-container');
    if (!container) return;

    // ── Build overlay ──────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.id = 'touch-overlay';
    overlay.style.cssText = [
      'position:absolute',
      'top:0', 'left:0', 'width:100%', 'height:100%',
      'pointer-events:none',    // children enable their own
      'z-index:50',
      'user-select:none',
      '-webkit-user-select:none'
    ].join(';');
    container.appendChild(overlay);

    // Helper to create a labelled touch button
    function makeBtn(id, label, css) {
      var btn = document.createElement('div');
      btn.id = id;
      btn.setAttribute('aria-label', label);
      btn.style.cssText = [
        'position:absolute',
        'pointer-events:auto',
        'border-radius:50%',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'font-size:20px',
        'font-weight:bold',
        'color:rgba(255,255,255,0.9)',
        'font-family:monospace',
        'touch-action:none',
        '-webkit-tap-highlight-color:transparent',
        css
      ].join(';');
      btn.textContent = label;
      overlay.appendChild(btn);
      return btn;
    }

    // D-pad colours: semi-transparent dark rounded squares
    var dpadStyle = [
      'border-radius:8px',
      'background:rgba(0,0,0,0.45)',
      'border:2px solid rgba(255,255,255,0.25)',
      'font-size:26px',
      'width:72px', 'height:72px'
    ].join(';');

    var btnLeft  = makeBtn('tc-left',  '◀', 'bottom:88px;left:18px;'  + dpadStyle);
    var btnRight = makeBtn('tc-right', '▶', 'bottom:88px;left:106px;' + dpadStyle);

    // A and B buttons (right side)
    var abStyle = [
      'width:76px', 'height:76px',
      'border-radius:50%',
      'border:2px solid rgba(255,255,255,0.35)'
    ].join(';');

    var btnA = makeBtn('tc-a', 'A', 'bottom:90px;right:20px;background:rgba(200,30,30,0.6);' + abStyle);
    var btnB = makeBtn('tc-b', 'B', 'bottom:90px;right:108px;background:rgba(30,80,200,0.6);' + abStyle);

    // Start button (bottom centre)
    var btnStart = makeBtn('tc-start', '▶❚❚', 'bottom:16px;left:50%;transform:translateX(-50%);width:88px;height:36px;border-radius:18px;background:rgba(80,80,80,0.6);border:2px solid rgba(255,255,255,0.25);font-size:13px;pointer-events:auto;');

    // ── Touch tracking ─────────────────────────────────────────────
    // Map from touch.identifier → button name
    var touchMap = {};

    var buttonDefs = [
      { el: btnLeft,  key: 'left'  },
      { el: btnRight, key: 'right' },
      { el: btnA,     key: 'jump'  },
      { el: btnB,     key: 'run'   },
      { el: btnStart, key: 'start' }
    ];

    function buttonForEl(el) {
      for (var i = 0; i < buttonDefs.length; i++) {
        if (buttonDefs[i].el === el) return buttonDefs[i].key;
      }
      return null;
    }

    function setActive(el, active) {
      el.style.opacity = active ? '1' : '0.65';
    }

    // Initialise opacity
    buttonDefs.forEach(function(d) { setActive(d.el, false); });

    function onTouchStart(e) {
      e.preventDefault();
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var t = touches[i];
        var target = document.elementFromPoint(t.clientX, t.clientY);
        var key = buttonForEl(target);
        if (key) {
          touchMap[t.identifier] = key;
          input._touch[key] = true;
          setActive(target, true);
        }
      }
    }

    function onTouchEnd(e) {
      e.preventDefault();
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var t = touches[i];
        var key = touchMap[t.identifier];
        if (key) {
          // Only release if no other touch still holds this button
          var stillHeld = false;
          for (var id in touchMap) {
            if (id !== String(t.identifier) && touchMap[id] === key) {
              stillHeld = true;
              break;
            }
          }
          if (!stillHeld) input._touch[key] = false;
          delete touchMap[t.identifier];
          // Find the element to deactivate
          for (var j = 0; j < buttonDefs.length; j++) {
            if (buttonDefs[j].key === key && !input._touch[key]) {
              setActive(buttonDefs[j].el, false);
            }
          }
        }
      }
    }

    function onTouchMove(e) {
      // Handle sliding a finger from one button to another
      e.preventDefault();
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var t = touches[i];
        var target = document.elementFromPoint(t.clientX, t.clientY);
        var newKey = buttonForEl(target);
        var oldKey = touchMap[t.identifier];

        if (newKey !== oldKey) {
          // Release old button
          if (oldKey) {
            var stillHeld = false;
            for (var id in touchMap) {
              if (id !== String(t.identifier) && touchMap[id] === oldKey) {
                stillHeld = true; break;
              }
            }
            if (!stillHeld) {
              input._touch[oldKey] = false;
              for (var j = 0; j < buttonDefs.length; j++) {
                if (buttonDefs[j].key === oldKey) setActive(buttonDefs[j].el, false);
              }
            }
          }
          // Press new button
          if (newKey) {
            touchMap[t.identifier] = newKey;
            input._touch[newKey] = true;
            setActive(target, true);
          } else {
            delete touchMap[t.identifier];
          }
        }
      }
    }

    overlay.addEventListener('touchstart',  onTouchStart,  { passive: false });
    overlay.addEventListener('touchend',    onTouchEnd,    { passive: false });
    overlay.addEventListener('touchcancel', onTouchEnd,    { passive: false });
    overlay.addEventListener('touchmove',   onTouchMove,   { passive: false });
  };
})();
