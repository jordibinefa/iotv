# IoT-Vertebrae Overlay HTML Guide

## What is an Overlay?

An overlay is a standalone HTML snippet that runs inside a sandboxed `<iframe>` within an IoT-Vertebrae digital twin window. It provides a custom visual representation (animations, gauges, interactive elements) that reacts to PLC signals in real time.

## Technical Environment

- **Runtime**: `<iframe sandbox="allow-scripts">` — no access to parent DOM, cookies, or localStorage.
- **Pre-applied body styles**: `margin:0; padding:0; overflow:hidden; font-family:sans-serif; color:#ecf0f1;`
- **Background**: Set via `overlay.background` in the twin JSON config (default: `#1a1a2e`).
- **Size**: The iframe fills the full width of the twin window. Height is fixed by `overlay.height` in the JSON config.
- **Assets**: Images referenced with `src="filename.png"` are automatically resolved if bundled in the twin ZIP under the `twins/` folder.

## Communication API

### Receiving signals from PLC: `window.onTwinSignals(signals)`

The parent engine calls this function approximately 10 times per second with ALL current signal values (not just changed ones).

```javascript
// signals is an object: { signalName: value, ... }
// Digital signals: 0 or 1
// Analog signals: floating point, range -10.0 to +10.0 (volts)
window.onTwinSignals = function(signals) {
    var motorFwd = signals.motor_fwd || 0;   // digital: 0 or 1
    var speed = signals.speed || 0;          // analog: -10.0 to +10.0
};
```

### Writing signals to PLC: `parent.postMessage(...)`

For interactive overlays (buttons, sensors, clickable elements) that need to write values back to the PLC:

```javascript
parent.postMessage({
    type: 'twin-write-signal',
    signal: 'signal_name',   // Must match a toPLC binding in the twin JSON
    value: 1                 // 0/1 for digital, float for analog
}, '*');
```

## Required HTML Structure

Generate ONLY the inner HTML content. Do NOT include `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — these are added automatically by the engine.

```html
<div style="width:100%;height:100%;position:relative;overflow:hidden;">
  <!-- Your visual content here (SVG, HTML elements, etc.) -->
</div>

<script>
(function() {
  // Your logic here

  window.onTwinSignals = function(s) {
    // React to signal changes
  };
})();
</script>
```

## Best Practices

1. **Use inline styles only** — no external CSS files are available.
2. **Use SVG for visual elements** — scalable, precise, animatable. Use a `viewBox` with `preserveAspectRatio="xMidYMid meet"` so it scales properly.
3. **Give dynamic elements an `id`** — so you can update them efficiently via `getElementById`.
4. **Time-based animations** — ALWAYS use `requestAnimationFrame` with timestamps, never frame counters:
   ```javascript
   var lastTime = null;
   function step(timestamp) {
       if (lastTime === null) lastTime = timestamp;
       var dt = (timestamp - lastTime) / 1000; // seconds
       lastTime = timestamp;
       angle += direction * degreesPerSecond * dt;
       requestAnimationFrame(step);
   }
   requestAnimationFrame(step);
   ```
5. **CSS transitions** for smooth value changes: `transition: width 0.15s;`
6. **Dark palette** — consistent with IoT-Vertebrae UI:
   - Backgrounds: `#1a1a2e`, `#2c3e50`, `#34495e`
   - Text: `#ecf0f1`, `#95a5a6`
   - Accents: `#2ecc71` (green), `#e74c3c` (red), `#3498db` (blue), `#e67e22` (orange), `#f1c40f` (yellow)
7. **Wrap all code in an IIFE** `(function() { ... })();` to avoid global variable conflicts when multiple twins are open.
8. **Only send toPLC signals when values change** — avoid spamming postMessage every frame:
   ```javascript
   var prevValue = 0;
   if (newValue !== prevValue) {
       prevValue = newValue;
       parent.postMessage({ type: 'twin-write-signal', signal: 'name', value: newValue }, '*');
   }
   ```

## Twin JSON Config Structure (for context)

```json
{
  "twinId": "my-twin",
  "meta": {
    "name": "My Twin Name",
    "version": "1.0"
  },
  "visual": {
    "width": 400,
    "height": 150
  },
  "overlay": {
    "html": "my-overlay.html",
    "height": 200,
    "background": "#1a1a2e"
  },
  "components": [
    {
      "id": "led0",
      "type": "led",
      "props": { "label": "Motor FWD", "color_on": "#2ecc71" },
      "binding": { "fromPLC": "motor_fwd" }
    },
    {
      "id": "sw0",
      "type": "switch",
      "props": { "label": "Sensor" },
      "binding": { "toPLC": "sensor_signal" }
    }
  ]
}
```

- **fromPLC** components (led, gauge): the overlay RECEIVES these signal values via `onTwinSignals`.
- **toPLC** components (switch, slider): the overlay can WRITE these signal values via `postMessage`.

## Complete Examples

### Example 1: Simple sensor display (BME280 style)

Displays numeric readings from analog signals. Passive — only receives signals.

**Twin JSON signals**: `temp_slider` (toPLC, analog), `hum_slider` (toPLC, analog), `pres_slider` (toPLC, analog)

```html
<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:10px;height:100%;">
  <div style="font-family:monospace;font-size:14px;line-height:2;">
    <div>🌡️ Temp: <span id="v-temp" style="color:#e74c3c;font-weight:bold;">--</span> °C</div>
    <div>💧 Hum:  <span id="v-hum" style="color:#3498db;font-weight:bold;">--</span> %</div>
    <div>🔵 Pres: <span id="v-pres" style="color:#9b59b6;font-weight:bold;">--</span> hPa</div>
  </div>
</div>
<script>
window.onTwinSignals = function(s) {
  if (s.temp_slider !== undefined) {
    var t = ((s.temp_slider + 10) / 20 * 125 - 40).toFixed(1);
    document.getElementById('v-temp').textContent = t;
  }
  if (s.hum_slider !== undefined) {
    var h = ((s.hum_slider + 10) / 20 * 100).toFixed(0);
    document.getElementById('v-hum').textContent = h;
  }
  if (s.pres_slider !== undefined) {
    var p = ((s.pres_slider + 10) / 20 * 800 + 300).toFixed(0);
    document.getElementById('v-pres').textContent = p;
  }
};
</script>
```

### Example 2: Reactive SVG visualization (LDR + lightbulb style)

SVG elements change color and glow intensity based on an analog signal. Passive.

**Twin JSON signals**: `ldr_out` (toPLC, analog, -10V to +10V)

```html
<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:30px;padding:10px;">
  <div style="text-align:center;">
    <svg width="80" height="120" viewBox="0 0 80 120">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" id="glow-center" style="stop-color:#ffff00;stop-opacity:0.9"/>
          <stop offset="100%" id="glow-edge" style="stop-color:#ffff00;stop-opacity:0"/>
        </radialGradient>
      </defs>
      <circle id="glow-circle" cx="40" cy="45" r="50" fill="url(#glow)" opacity="0"/>
      <ellipse cx="40" cy="45" rx="28" ry="30" id="glass" fill="#333" stroke="#666" stroke-width="2"/>
      <path d="M28,70 L28,85 Q28,95 40,95 Q52,95 52,85 L52,70" fill="#888" stroke="#666" stroke-width="1"/>
      <path id="filament" d="M35,55 Q37,35 40,55 Q43,35 45,55" fill="none" stroke="#555" stroke-width="2"/>
    </svg>
  </div>
  <div style="font-family:monospace;font-size:16px;">
    <div>☀️ Lux: <span id="v-lux" style="color:#f1c40f;font-weight:bold;">0</span></div>
    <div style="margin-top:8px;">
      <div style="width:120px;height:14px;background:#222;border-radius:7px;overflow:hidden;border:1px solid #555;">
        <div id="bar-lux" style="width:0%;height:100%;background:linear-gradient(90deg,#e67e22,#f1c40f);transition:width 0.15s;"></div>
      </div>
    </div>
  </div>
</div>
<script>
window.onTwinSignals = function(s) {
  if (s.ldr_out === undefined) return;
  var pct = Math.max(0, Math.min(1, (s.ldr_out + 10) / 20));
  var lux = Math.round(pct * 65535);
  document.getElementById('v-lux').textContent = lux;
  document.getElementById('bar-lux').style.width = (pct * 100) + '%';
  var glass = document.getElementById('glass');
  var r = Math.round(50 + pct * 205);
  var g = Math.round(50 + pct * 180);
  var b = Math.round(20 + pct * 30);
  glass.setAttribute('fill', 'rgb(' + r + ',' + g + ',' + b + ')');
  var filament = document.getElementById('filament');
  filament.setAttribute('stroke', pct > 0.05 ? 'rgb(' + Math.round(200+pct*55) + ',' + Math.round(150+pct*105) + ',50)' : '#555');
  var gc = document.getElementById('glow-circle');
  gc.setAttribute('opacity', (pct * 0.7).toFixed(2));
};
</script>
```

### Example 3: Animated motor with bidirectional control (H-Bridge style)

Continuous rotation animation using time-based `requestAnimationFrame`. Receives digital signals.

**Twin JSON signals**: `motorA` (fromPLC, digital 0/1), `motorB` (fromPLC, digital 0/1)

```html
<div style="width:100%;height:100%;position:relative;overflow:hidden;">
  <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="motor-bg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#2c3e50"/>
        <stop offset="100%" style="stop-color:#34495e"/>
      </linearGradient>
      <filter id="glow-g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="400" height="250" fill="#1a1a2e"/>
    <g transform="translate(100,10)">
      <rect x="0" y="0" width="200" height="190" rx="10" fill="url(#motor-bg)" stroke="#7f8c8d" stroke-width="2"/>
      <text x="100" y="25" text-anchor="middle" fill="#3498db" font-size="14" font-weight="bold">H-Bridge Motor</text>
      <circle cx="100" cy="80" r="40" fill="#2c3e50" stroke="#7f8c8d" stroke-width="3"/>
      <line id="m-marker" x1="100" y1="80" x2="100" y2="46" stroke="#ecf0f1" stroke-width="3" stroke-linecap="round"/>
      <text x="100" y="86" text-anchor="middle" fill="#ecf0f1" font-size="22" font-weight="bold">M</text>
      <g id="relay-a"><rect x="15" y="135" width="70" height="35" rx="5" fill="#333" stroke="#7f8c8d" stroke-width="1.5"/>
        <circle id="led-a" cx="30" cy="152" r="8" fill="#440000"/>
        <text x="58" y="157" text-anchor="middle" fill="#ecf0f1" font-size="13" font-weight="bold">FWD</text></g>
      <g id="relay-b"><rect x="115" y="135" width="70" height="35" rx="5" fill="#333" stroke="#7f8c8d" stroke-width="1.5"/>
        <circle id="led-b" cx="130" cy="152" r="8" fill="#440000"/>
        <text x="158" y="157" text-anchor="middle" fill="#ecf0f1" font-size="13" font-weight="bold">REV</text></g>
      <text id="status" x="100" y="185" text-anchor="middle" fill="#7f8c8d" font-size="13">STOPPED</text>
    </g>
  </svg>
</div>
<script>
(function() {
  var motor = { angle: 0, direction: 0 };
  var animId = null;

  function updateMotor(valA, valB) {
    var la = document.getElementById('led-a');
    var lb = document.getElementById('led-b');
    if (la) { la.setAttribute('fill', valA ? '#2ecc71' : '#440000'); la.style.filter = valA ? 'url(#glow-g)' : 'none'; }
    if (lb) { lb.setAttribute('fill', valB ? '#e74c3c' : '#440000'); lb.style.filter = valB ? 'url(#glow-g)' : 'none'; }
    var st = document.getElementById('status');
    if (valA && !valB) { motor.direction = 1; if (st) { st.textContent = 'FORWARD'; st.setAttribute('fill', '#2ecc71'); } }
    else if (!valA && valB) { motor.direction = -1; if (st) { st.textContent = 'REVERSE'; st.setAttribute('fill', '#e74c3c'); } }
    else { motor.direction = 0; if (st) { st.textContent = 'STOPPED'; st.setAttribute('fill', '#7f8c8d'); } }
    if (motor.direction !== 0 && !animId) animate();
    else if (motor.direction === 0 && animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function animate() {
    var dps = 120, last = null;
    function step(ts) {
      if (last === null) last = ts;
      var dt = (ts - last) / 1000; last = ts;
      if (motor.direction !== 0) {
        motor.angle = (motor.angle + motor.direction * dps * dt) % 360;
        if (motor.angle < 0) motor.angle += 360;
        var mk = document.getElementById('m-marker');
        if (mk) { var r = (motor.angle - 90) * Math.PI / 180; mk.setAttribute('x2', 100 + 34 * Math.cos(r)); mk.setAttribute('y2', 80 + 34 * Math.sin(r)); }
      }
      animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
  }

  window.onTwinSignals = function(s) { updateMotor(s.motorA || 0, s.motorB || 0); };
})();
</script>
```

### Example 4: Interactive bidirectional overlay (Conveyor belt style)

Complex overlay with continuous animation, interactive buttons, and sensors that write back to the PLC.

**Twin JSON signals**: `motor_fwd` (fromPLC, digital), `motor_rev` (fromPLC, digital), `solenoide` (fromPLC, digital), `speed` (fromPLC, analog), `sensor_left` (toPLC, digital), `sensor_right` (toPLC, digital), `emergency` (toPLC, digital)

Key patterns demonstrated:
- **Spawning objects** on rising edge detection (solenoid 0→1 spawns a box)
- **Sensor zones** that detect object proximity and write toPLC only when value changes
- **Clickable emergency button** that toggles state bidirectionally
- **Speed control** from analog signal mapped to animation rate
- **Roller rotation** synchronized with belt direction and speed

```javascript
// Rising edge detection
var prevSol = 0;
var sol = s.solenoide || 0;
if (sol === 1 && prevSol === 0) spawnBox();
prevSol = sol;

// Write to PLC only on change
var leftVal = leftDetected ? 1 : 0;
if (leftVal !== prevSensorLeft) {
    prevSensorLeft = leftVal;
    parent.postMessage({ type: 'twin-write-signal', signal: 'sensor_left', value: leftVal }, '*');
}

// Bidirectional toggle button
button.addEventListener('click', function() {
    pressed = !pressed;
    parent.postMessage({ type: 'twin-write-signal', signal: 'emergency', value: pressed ? 1 : 0 }, '*');
});
// Also sync from PLC side:
if (s.emergency !== undefined && (s.emergency ? true : false) !== pressed) {
    pressed = s.emergency ? true : false;
    updateVisual();
}
```
