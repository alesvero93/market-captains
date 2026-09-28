import brandLogo from './assets/market-captains-logo.png?inline';
import Phaser from 'phaser';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import { ROOM_NAME, SCHEMA_VERSION, TICK_RATE, normalizeMovement } from '@liquidity/shared';
import type { Polarity, WorldSnapshot } from '@liquidity/shared';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><a class="wordmark" href="/" aria-label="Market Captains home"><img class="brand-logo" src="${brandLogo}" alt="MARKET CAPTAINS" width="240" height="60" /></a><span class="eyebrow">THE MARKET IS THE MAP</span><span class="build">M1 / FIELD LAB</span></header>
  <main>
    <section class="intro"><div><p class="eyebrow accent">FIELD LAB / 002</p><h1>Enter orbit.<br>Reverse the current.</h1><p class="lede">Approach in NEUTRAL, then switch polarity.<br>Use the field to turn and accelerate.</p></div>
    <div class="mission"><span class="eyebrow">THREE NODES · SYNTHETIC DATA</span><p>BTC ↑ · ETH ↑<br>SOL ↓</p><span class="muted">Illustrative scenarios, not real prices.<br>Arrows show current; gravity remains.</span></div></section>
    <section class="polarity-bar" aria-label="Select polarity"><button data-polarity="1" aria-pressed="false">△ LONG <kbd>1</kbd></button><button data-polarity="0" aria-pressed="true">○ NEUTRAL <kbd>2</kbd></button><button data-polarity="-1" aria-pressed="false">▽ SHORT <kbd>3</kbd></button><span id="polarity-hint" role="status">NEUTRAL: current off, gravity remains.</span></section>
    <section class="demo-bar"><button id="slingshot-demo">Play slingshot · 4 s</button><button id="free-flight">Restart with three nodes</button><span id="scenario-status" role="status">Free flight · WASD + 1/2/3</span></section>
    <section class="flight-panel" aria-label="Practice arena">
      <div class="panel-top"><span><i id="status-dot"></i><span id="status" role="status">Connecting…</span></span><span class="tag">SYNTHETIC / 0 API</span></div>
      <div id="arena" tabindex="0" aria-label="Use WASD or arrow keys to move your captain"></div>
      <div class="panel-bottom"><span><b>W A S D</b> / <b>↑ ← ↓ →</b> &nbsp; Thrust</span><span><b>1 / 2 / 3</b> Polarity <span class="cross">+</span> Gravity remains even without thrust</span></div>
    </section>
    <section class="readouts" aria-label="Telemetry"><div><span class="eyebrow">SPEED</span><strong id="speed">0 <small>u/s</small></strong></div><div><span class="eyebrow">POSITION</span><strong id="position">— <small>/ —</small></strong></div><div><span class="eyebrow">CONFIRMED POLARITY</span><strong id="polarity-state">○ NEUTRAL</strong></div><div><span class="eyebrow">CMC CALLS</span><strong>0 <small>M1 synthetic</small></strong></div></section>
    <div id="reconnect-box" hidden><button id="reconnect">Reconnect captain</button></div>
    <footer><span><span class="accent">02</span> &nbsp; MARKET PHYSICS</span><span>Favourable current ≠ zero gravity.</span><span>BUILD M1</span></footer>
  </main>`;

let room: Room | undefined;
let latest: WorldSnapshot | undefined;
let previous: WorldSnapshot | undefined;
let receivedAt = 0;
let seq = 0, clientTick = 0;
let inputTimer: ReturnType<typeof setInterval> | undefined;
const keys = new Set<string>();
const controls = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
let connected = false;
let connecting = false;
let selectedPolarity: Polarity = 0;
const polarityNames = {'1': '△ LONG', '0': '○ NEUTRAL', '-1': '▽ SHORT'};
function selectPolarity(value: Polarity) { if (!latest?.demoActive) { selectedPolarity = value; sendInput(); } }
document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(button => {
  button.addEventListener('click', () => selectPolarity(Number(button.dataset.polarity) as Polarity));
});
function setStatus(text: string, ok: boolean) {
  document.querySelector('#status')!.textContent = text;
  document.querySelector('#status-dot')!.classList.toggle('live', ok);
  document.querySelector<HTMLDivElement>('#reconnect-box')!.hidden = ok;
}
function releaseKeys() { keys.clear(); selectedPolarity = 0; sendInput(); }
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (controls.has(key)) { e.preventDefault(); keys.add(key); }
  if (key === '1' || key === '2' || key === '3') {
    e.preventDefault(); selectPolarity(key === '1' ? 1 : key === '2' ? 0 : -1);
  }
});
window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); });
window.addEventListener('blur', releaseKeys);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseKeys(); });

function sendInput() {
  if (!room || !connected || latest?.demoActive) return;
  const down = (...names: string[]) => names.some(k => keys.has(k)) ? 1 : 0;
  const movement = normalizeMovement(down('d', 'arrowright') - down('a', 'arrowleft'),
    down('s', 'arrowdown') - down('w', 'arrowup'));
  room.send('input', {schemaVersion: SCHEMA_VERSION, seq: seq++, clientTick: clientTick++, polarity: selectedPolarity, ...movement});
}

async function connect() {
  if (connected || connecting) return;
  connecting = true;
  document.querySelector<HTMLDivElement>('#reconnect-box')!.hidden = true;
  setStatus('Connecting…', false);
  try {
    const endpoint = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? `ws://${window.location.hostname}:2567` : window.location.origin);
    room = await new Client(endpoint).joinOrCreate(ROOM_NAME);
    seq = 0; clientTick = 0; latest = undefined; previous = undefined; selectedPolarity = 0;
    connected = true;
    setStatus('Captain connected', true);
    room.onMessage('snapshot', (snapshot: WorldSnapshot) => {
      if (snapshot.schemaVersion !== SCHEMA_VERSION) { setStatus('Incompatible version', false); return; }
      previous = latest && snapshot.serverTick > latest.serverTick && snapshot.scenario === latest.scenario ? latest : undefined;
      if (snapshot.demoActive || latest?.demoActive) selectedPolarity = snapshot.player.polarity;
      latest = snapshot;
      receivedAt = performance.now();
      const p = snapshot.player;
      document.querySelector('#scenario-status')!.textContent = snapshot.demoActive ? `Server demo · ${p.polarity === 0 ? 'NEUTRAL entry' : 'LONG exit'} · no thrust` : snapshot.scenario === 'slingshot' ? 'Demo complete: resume control with WASD and 1/2/3.' : 'Free flight · WASD + 1/2/3';
      document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(button => { button.disabled = snapshot.demoActive; });
      document.querySelector('#polarity-state')!.textContent = polarityNames[p.polarity];
      document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.polarity) === p.polarity)));
      const outward = snapshot.nodes.filter(n => p.polarity * n.momentumN > 0).map(n => n.symbol).join('/');
      const inward = snapshot.nodes.filter(n => p.polarity * n.momentumN < 0).map(n => n.symbol).join('/');
      document.querySelector('#polarity-hint')!.textContent = p.polarity === 0 ? 'NEUTRAL: current off, gravity remains.' :
        `${p.polarity === 1 ? 'LONG' : 'SHORT'}: ${[outward && `outward current at ${outward}`, inward && `inward at ${inward}`].filter(Boolean).join(', ')}.`;
      document.querySelector('#speed')!.innerHTML = `${Math.hypot(p.vx, p.vy).toFixed(0)} <small>u/s</small>`;
      document.querySelector('#position')!.innerHTML = `${p.x.toFixed(0)} <small>/ ${p.y.toFixed(0)}</small>`;
    });
    const disconnected = () => {
      connected = false; keys.clear(); clearInterval(inputTimer);
      setStatus('Connection lost', false);
    };
    room.onLeave(disconnected);
    room.onError(disconnected);
    clearInterval(inputTimer);
    inputTimer = setInterval(sendInput, 1000 / TICK_RATE);
  } catch {
    connected = false;
    setStatus('Server unavailable · start the project and retry', false);
  } finally {
    connecting = false;
  }
}
document.querySelector('#reconnect')!.addEventListener('click', () => void connect());
document.querySelector('#slingshot-demo')!.addEventListener('click', () => { if (connected) { keys.clear(); room?.send('scenario', 'slingshot'); } });
document.querySelector('#free-flight')!.addEventListener('click', () => { if (connected) { keys.clear(); selectedPolarity = 0; room?.send('scenario', 'free'); } });

class FlightScene extends Phaser.Scene {
  private pilot!: Phaser.GameObjects.Container;
  private wake!: Phaser.GameObjects.Graphics;
  private fields!: Phaser.GameObjects.Graphics;
  private nodeLabels: Phaser.GameObjects.Text[] = [];
  private nodeSignature = '';
  private trail: {x: number; y: number}[] = [];
  private trailTick = -1;
  private marker!: Phaser.GameObjects.Text;
  create() {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x223147, 0.5);
    for (let x = 0; x <= 1440; x += 60) grid.lineBetween(x, 0, x, 900);
    for (let y = 0; y <= 900; y += 60) grid.lineBetween(0, y, 1440, y);
    grid.lineStyle(2, 0x4d6876, 0.7).strokeRect(14, 14, 1412, 872);
    const label = {fontFamily: 'monospace', fontSize: '17px', color: '#536a7e'};
    this.add.text(34, 30, 'SECTOR 01 / SYNTHETIC FIELDS', label);
    this.add.text(34, 844, 'ARROWS = FLOW · GRAVITY ALWAYS ON', label);
    this.add.text(1234, 844, '1440 × 900', label);
    this.fields = this.add.graphics();
    this.wake = this.add.graphics();
    const glow = this.add.circle(0, 0, 30, 0x83f5d3, 0.06);
    const halo = this.add.circle(0, 0, 21).setStrokeStyle(1, 0x83f5d3, 0.3);
    const body = this.add.circle(0, 0, 14, 0xa7ffe5);
    const core = this.add.circle(0, 0, 5, 0x173b3b);
    this.pilot = this.add.container(720, 450, [glow, halo, body, core]).setVisible(false);
    this.marker = this.add.text(0, -42, '○', {fontFamily: 'sans-serif', fontSize: '25px', color: '#d5fff1'}).setOrigin(0.5);
    this.pilot.add(this.marker);
  }
  override update() {
    if (!latest) return;
    const signature = latest.nodes.map(n => `${n.id}:${n.x}:${n.y}`).join('|');
    if (signature !== this.nodeSignature) {
      this.nodeLabels.forEach(label => label.destroy()); this.nodeLabels = [];
      for (const n of latest.nodes) {
        this.nodeLabels.push(this.add.text(n.x, n.y, `${n.symbol}\n${n.momentumN >= 0 ? '↑' : '↓'} SYNTHETIC`, {fontFamily: 'sans-serif', fontSize: '17px', align: 'center', color: '#e0eaf4', lineSpacing: 5}).setOrigin(0.5));
      }
      this.nodeSignature = signature;
    }
    this.fields.clear();
    for (const n of latest.nodes) {
      const alignment = latest.player.polarity * n.momentumN;
      const color = alignment > 0 ? 0x8bf3d3 : alignment < 0 ? 0xffb275 : 0x778aab;
      this.fields.fillStyle(color, 0.035).fillCircle(n.x, n.y, n.fieldRadius);
      this.fields.lineStyle(1, color, 0.25).strokeCircle(n.x, n.y, n.fieldRadius);
      this.fields.lineStyle(1, color, 0.12).strokeCircle(n.x, n.y, n.fieldRadius * 0.65);
      this.fields.fillStyle(0x142438).fillCircle(n.x, n.y, n.radius);
      this.fields.lineStyle(2, color, 0.9).strokeCircle(n.x, n.y, n.radius);
      if (alignment !== 0) for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6, dir = Math.sign(alignment);
        const phase = (latest.serverTick % 60) / 60;
        const radius = n.radius + 45 + (dir > 0 ? phase : 1 - phase) * (n.fieldRadius - n.radius - 100);
        const ax = n.x + Math.cos(angle) * radius, ay = n.y + Math.sin(angle) * radius;
        const dx = Math.cos(angle) * dir, dy = Math.sin(angle) * dir;
        this.fields.lineStyle(2, color, 0.6).lineBetween(ax - dx * 12, ay - dy * 12, ax + dx * 10, ay + dy * 10);
        this.fields.lineBetween(ax + dx * 10, ay + dy * 10, ax + dx * 3 - dy * 5, ay + dy * 3 + dx * 5);
        this.fields.lineBetween(ax + dx * 10, ay + dy * 10, ax + dx * 3 + dy * 5, ay + dy * 3 - dx * 5);
      }
    }
    this.pilot.setVisible(true);
    const to = latest.player, from = previous?.player ?? to;
    const interval = previous ? Math.max(1, (latest.serverTick - previous.serverTick) * 1000 / TICK_RATE) : 1000 / 15;
    const alpha = Phaser.Math.Clamp((performance.now() - receivedAt) / interval, 0, 1);
    const x = Phaser.Math.Linear(from.x, to.x, alpha), y = Phaser.Math.Linear(from.y, to.y, alpha);
    this.pilot.setPosition(x, y);
    this.marker.setText(to.polarity === 1 ? '△' : to.polarity === -1 ? '▽' : '○');
    if (latest.serverTick < this.trailTick) this.trail = [];
    if (latest.serverTick !== this.trailTick) {
      this.trail.push({x: to.x, y: to.y}); if (this.trail.length > 100) this.trail.shift(); this.trailTick = latest.serverTick;
    }
    this.wake.clear();
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]!, b = this.trail[i]!;
      this.wake.lineStyle(2, 0x80f5d5, i / this.trail.length * 0.5).lineBetween(a.x, a.y, b.x, b.y);
    }
    this.wake.lineStyle(4, 0x80f5d5, 0.35).lineBetween(x, y, x - to.vx * 0.1, y - to.vy * 0.1);
  }
}

new Phaser.Game({type: Phaser.AUTO, parent: 'arena', width: 1440, height: 900,
  backgroundColor: '#0b1422', scene: FlightScene,
  scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
  render: {antialias: true}, audio: {noAudio: true}});
void connect();

