"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/shell/ThemeProvider";
import { SceneId } from "@/lib/look";

type Scene = Exclude<SceneId, "auto" | "off">;

/** night 20:00–04:59, morning 05:00–10:59, afternoon 11:00–16:59, evening 17:00–19:59 (device clock) */
export function sceneForHour(h: number): Scene {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

interface Env { ctx: CanvasRenderingContext2D; W: number; H: number; dark: boolean; gold: number[]; green: number[]; animate: boolean; perchY: () => number }
interface Engine { step: (dt: number, t: number) => void; draw: (t: number) => void }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const parse = (v: string, fb: number[]) => { const m = v.trim().split(/\s+/).map(Number); return m.length === 3 && m.every(Number.isFinite) ? m : fb; };

/* ---------------------------------------------------------------- shared bits */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: number[], a: number) {
  for (const [dx, dy, r] of [[0, 0, 46], [-42, 8, 34], [44, 10, 38], [14, -14, 32]] as number[][]) {
    ctx.save(); ctx.translate(x + dx * s, y + dy * s); ctx.scale(1.35, 0.7);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * s);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(0.55, rgba(col, a * 0.55)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * s, 0, 6.2832); ctx.fill(); ctx.restore();
  }
}

/* ------------------------------------------------------------------- NIGHT */
function night(e: Env): Engine {
  const { ctx, W, H, dark, gold } = e;
  const n = Math.max(40, Math.min(150, Math.round((W * H) / 8000)));
  const stars = Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.92), r: rnd(0.4, 1.5), p: rnd(0, 6.28), sp: rnd(0.6, 2.2), big: Math.random() < 0.08 }));
  const starCol = dark ? [232, 238, 255] : [40, 52, 110];
  const base = dark ? 0.9 : 0.4;
  let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let nextShoot = rnd(3, 7);
  let clock = 0;
  return {
    step(dt) {
      clock += dt; nextShoot -= dt;
      if (e.animate && !shoot && nextShoot <= 0) { shoot = { x: rnd(W * 0.1, W * 0.7), y: rnd(10, H * 0.3), vx: rnd(380, 520), vy: rnd(150, 230), life: 0 }; nextShoot = rnd(7, 16); }
      if (shoot) { shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life += dt; if (shoot.life > 1.1) shoot = null; }
    },
    draw(t) {
      // moon (crescent) with a halo tinted by the palette
      const mx = W * 0.82, my = Math.min(150, H * 0.2) + 20, mr = 19;
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
      halo.addColorStop(0, rgba(gold, dark ? 0.2 : 0.12)); halo.addColorStop(1, rgba(gold, 0));
      ctx.fillStyle = halo; ctx.fillRect(mx - 130, my - 130, 260, 260);
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.2832); ctx.clip();
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.2832); ctx.arc(mx + 8, my - 5, mr * 0.9, 0, 6.2832);
      ctx.fillStyle = dark ? "rgba(250,244,225,0.92)" : "rgba(120,110,90,0.55)"; ctx.fill("evenodd"); ctx.restore();
      for (const s of stars) {
        const tw = e.animate ? 0.55 + 0.45 * Math.sin(t * s.sp + s.p) : 0.8;
        ctx.fillStyle = rgba(starCol, base * tw * (s.big ? 1 : 0.8));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (s.big ? 1.4 : 1), 0, 6.2832); ctx.fill();
        if (s.big) { ctx.strokeStyle = rgba(starCol, base * tw * 0.5); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(s.x - 5, s.y); ctx.lineTo(s.x + 5, s.y); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x, s.y + 5); ctx.stroke(); }
      }
      if (shoot) {
        const k = 1 - shoot.life / 1.1, len = 90;
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.16, shoot.y - shoot.vy * 0.16);
        g.addColorStop(0, rgba(starCol, 0.9 * k)); g.addColorStop(1, rgba(starCol, 0));
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - len * 0.82, shoot.y - len * 0.4); ctx.stroke();
      }
    },
  };
}

/* ------------------------------------------------------------------ MORNING */
type BirdState = "away" | "in" | "sit" | "out";
interface Bird { st: BirdState; slot: number; x: number; y: number; t: number; dur: number; sx: number; sy: number; cx: number; cy: number; ex: number; ey: number; wait: number; tilt: number; hop: number; flap: number; face: number }

function morning(e: Env): Engine {
  const { ctx, W, H, dark, gold } = e;
  const branchX0 = W * 0.5;
  const FR = [0.6, 0.74, 0.88];
  const slot = (i: number) => ({ x: W * FR[i], y: e.perchY() + Math.sin(FR[i] * 5) * 1.5 + (FR[i] - 0.5) * 6 });
  const bodyCol = dark ? [225, 220, 205] : [60, 70, 90];
  const wingCol = dark ? [175, 172, 160] : [38, 46, 66];
  const leafCol = dark ? [120, 200, 140] : [40, 120, 70];
  const mkBird = (i: number): Bird => ({ st: "away", slot: i, x: -50, y: -50, t: 0, dur: 1, sx: 0, sy: 0, cx: 0, cy: 0, ex: 0, ey: 0, wait: rnd(0.5, 3) + i * 2.2, tilt: 0, hop: 0, flap: rnd(0, 6), face: 1 });
  const birds = [0, 1, 2].map(mkBird);
  if (!e.animate) { birds[0].st = "sit"; birds[0].x = slot(0).x; birds[0].y = slot(0).y; birds[0].wait = 99; birds[1].st = "sit"; birds[1].x = slot(2).x; birds[1].y = slot(2).y; birds[1].wait = 99; birds[2].wait = 1e9; }
  const winds = Array.from({ length: 9 }, () => ({ x: rnd(-100, W), y: rnd(H * 0.12, H * 0.85), len: rnd(60, 150), sp: rnd(22, 55), ph: rnd(0, 6.28), a: rnd(0.07, 0.16) }));
  const leaves = Array.from({ length: 12 }, () => ({ x: rnd(0, W), y: rnd(0, H), sp: rnd(16, 38), ph: rnd(0, 6.28), r: rnd(3, 6), rot: rnd(0, 6.28), rs: rnd(-1.2, 1.2) }));
  const clouds = Array.from({ length: 3 }, (_, i) => ({ x: (W / 3) * i + rnd(0, 80), y: rnd(H * 0.1, H * 0.5), s: rnd(0.8, 1.5), sp: rnd(4, 9) }));

  const takeOff = (b: Bird) => { b.st = "out"; b.t = 0; b.dur = rnd(2.2, 3.2); b.sx = b.x; b.sy = b.y; b.cx = b.x + 80; b.cy = b.y - 90; b.ex = W + 60; b.ey = rnd(-40, e.perchY() * 0.3); b.face = 1; };
  const flyIn = (b: Bird) => {
    const s = slot(b.slot); b.st = "in"; b.t = 0; b.dur = rnd(2.6, 3.6);
    b.sx = rnd(-60, -20); b.sy = rnd(e.perchY() + 30, e.perchY() + 170); b.ex = s.x; b.ey = s.y; b.cx = (b.sx + b.ex) / 2; b.cy = Math.min(b.sy, b.ey) - rnd(50, 110); b.face = 1;
  };
  const bez = (b: Bird, u: number) => { const v = 1 - u; return [v * v * b.sx + 2 * v * u * b.cx + u * u * b.ex, v * v * b.sy + 2 * v * u * b.cy + u * u * b.ey]; };

  const drawBird = (b: Bird, t: number) => {
    const flying = b.st === "in" || b.st === "out";
    ctx.save(); ctx.translate(b.x, b.y - 5.5); ctx.scale(0.95, 0.95);
    const rot = flying ? (b.st === "in" ? -0.12 : -0.35) : b.tilt * 0.04; ctx.rotate(rot);
    ctx.fillStyle = rgba(bodyCol, 0.88);
    if (!flying) {
      ctx.beginPath(); ctx.moveTo(-5, 1.5); ctx.lineTo(-15 + Math.sin(t * 3 + b.slot) * 0.8 - b.hop * 0.0, 5 + b.hop * 0.0); ctx.lineTo(-13, -0.5); ctx.closePath(); ctx.fill(); // tail
    } else { ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-13, 2); ctx.lineTo(-12, -2); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.4, 0, 0, 6.2832); ctx.fill(); // body
    ctx.beginPath(); ctx.arc(6.6, -3 + (flying ? 0 : Math.sin(b.tilt) * 0.6), 3, 0, 6.2832); ctx.fill(); // head
    ctx.fillStyle = rgba(gold, 0.95); ctx.beginPath(); ctx.moveTo(9.3, -3.4); ctx.lineTo(13.2, -2.4); ctx.lineTo(9.3, -1.6); ctx.closePath(); ctx.fill(); // beak
    ctx.fillStyle = rgba(dark ? [20, 20, 24] : [250, 250, 250], 0.95); ctx.beginPath(); ctx.arc(7.4, -3.6, 0.7, 0, 6.2832); ctx.fill(); // eye
    ctx.fillStyle = rgba(wingCol, 0.95);
    if (flying) {
      const w = Math.sin(b.flap) * 1.0;
      ctx.save(); ctx.translate(-1, -2); ctx.rotate(-0.4 - w * 0.9); ctx.beginPath(); ctx.ellipse(0, -8, 3.4, 9.5, 0, 0, 6.2832); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-1, -1); ctx.rotate(0.15 + w * 0.5); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(0, -7, 3, 8, 0, 0, 6.2832); ctx.fill(); ctx.restore();
    } else { ctx.beginPath(); ctx.ellipse(-1.5, 0.4, 5, 2.6, -0.15, 0, 6.2832); ctx.fill(); }
    if (!flying) { ctx.strokeStyle = rgba(wingCol, 0.9); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-1, 4.2); ctx.lineTo(-1, 5.6 + 0); ctx.moveTo(2, 4.2); ctx.lineTo(2, 5.6); ctx.stroke(); }
    ctx.restore();
  };

  return {
    step(dt) {
      for (const b of birds) if (b.st === "sit") { const sl = slot(b.slot); b.x = sl.x; b.y = sl.y; }
      for (const w of winds) { w.x += w.sp * dt; if (w.x - w.len > W) { w.x = -w.len - 20; w.y = rnd(H * 0.12, H * 0.85); } }
      for (const l of leaves) { l.x += l.sp * dt; l.y += Math.sin(l.ph += dt * 1.1) * 14 * dt + 4 * dt; l.rot += l.rs * dt; if (l.x > W + 20 || l.y > H + 20) { l.x = -20; l.y = rnd(0, H * 0.7); } }
      for (const c of clouds) { c.x += c.sp * dt; if (c.x > W + 120) c.x = -140; }
      if (!e.animate) return;
      for (const b of birds) {
        b.flap += dt * 17;
        if (b.st === "away") { b.wait -= dt; if (b.wait <= 0) flyIn(b); }
        else if (b.st === "in") {
          b.t += dt; const u = Math.min(1, b.t / b.dur), k = 1 - Math.pow(1 - u, 2.2); // eases to a soft landing
          const [x, y] = bez(b, k); b.x = x; b.y = y;
          if (u >= 1) { b.st = "sit"; b.wait = rnd(5, 14); b.hop = 0; b.tilt = 0; }
        } else if (b.st === "sit") {
          b.wait -= dt; b.tilt += dt * rnd(0.6, 2.2); if (b.hop > 0) b.hop = Math.max(0, b.hop - dt * 5);
          if (Math.random() < dt * 0.35) b.hop = 1;
          if (b.wait <= 0) takeOff(b);
        } else {
          b.t += dt; const u = Math.min(1, b.t / b.dur), k = u * u;
          const [x, y] = bez(b, k); b.x = x; b.y = y;
          if (u >= 1) { b.st = "away"; b.wait = rnd(4, 11); }
        }
      }
    },
    draw(t) {
      const perchY = e.perchY();
      // sunrise glow low on the left, tinted warm
      const gx = W * 0.12, gy = H * 0.9;
      const sun = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.7);
      sun.addColorStop(0, `rgba(255,196,120,${dark ? 0.2 + 0.03 * Math.sin(t * 0.5) : 0.26})`); sun.addColorStop(0.45, `rgba(255,170,110,${dark ? 0.07 : 0.1})`); sun.addColorStop(1, "rgba(255,170,110,0)");
      ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
      for (const c of clouds) cloud(ctx, c.x, c.y, c.s, dark ? [200, 210, 235] : [160, 180, 210], dark ? 0.07 : 0.3);
      for (const w of winds) { // fresh-air streaks
        ctx.strokeStyle = rgba(dark ? [210, 235, 255] : [70, 110, 150], w.a * (dark ? 1 : 0.8)); ctx.lineWidth = 1.1; ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) { const px = w.x - w.len + (w.len * i) / 10, py = w.y + Math.sin(i * 0.7 + t * 1.4 + w.ph) * 5 * (i / 10); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      for (const l of leaves) { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.fillStyle = rgba(leafCol, dark ? 0.5 : 0.55); ctx.beginPath(); ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, 6.2832); ctx.fill(); ctx.restore(); }
      // the branch the birds land on
      ctx.strokeStyle = rgba(dark ? [150, 125, 95] : [100, 80, 55], 0.55); ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(W + 12, perchY + 14); ctx.quadraticCurveTo(W * 0.78, perchY + 6, branchX0, perchY + 1); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(W * 0.72, perchY + 7); ctx.quadraticCurveTo(W * 0.66, perchY + 14, W * 0.62, perchY + 22); ctx.stroke();
      for (const [fx, fy] of [[0.55, 0], [0.67, 6], [0.8, 3], [0.93, 10], [0.62, 20]] as number[][]) {
        const sway = Math.sin(t * 1.3 + fx * 9) * 1.4; ctx.fillStyle = rgba(leafCol, 0.5);
        ctx.beginPath(); ctx.ellipse(W * fx + sway, perchY + fy + 4, 6, 2.6, 0.5 + sway * 0.05, 0, 6.2832); ctx.fill();
      }
      for (const b of birds) if (b.st !== "away") drawBird(b, t);
    },
  };
}

/* ---------------------------------------------------------------- AFTERNOON */
function afternoon(e: Env): Engine {
  const { ctx, W, H, dark } = e;
  const sx = W * 0.82, sy = Math.min(150, H * 0.2) + 10;
  const clouds = Array.from({ length: 4 }, (_, i) => ({ x: (W / 4) * i + rnd(0, 60), y: rnd(H * 0.08, H * 0.6), s: rnd(0.8, 1.7), sp: rnd(5, 12) }));
  const motes = Array.from({ length: 22 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.8, 2), ph: rnd(0, 6.28), sp: rnd(0.4, 1.2) }));
  const flies = [0, 1].map((i) => ({ x: rnd(0, W), y: rnd(H * 0.35, H * 0.8), ph: rnd(0, 6.28), sp: rnd(30, 48) + i * 8, col: i ? e.green : e.gold }));
  return {
    step(dt, t) {
      for (const c of clouds) { c.x += c.sp * dt; if (c.x > W + 130) c.x = -150; }
      for (const m of motes) { m.y -= m.sp * 6 * dt; m.x += Math.sin(t * 0.6 + m.ph) * 8 * dt; if (m.y < -5) { m.y = H + 5; m.x = rnd(0, W); } }
      for (const f of flies) { f.x += f.sp * dt; f.y += Math.sin(t * 1.3 + f.ph) * 36 * dt; if (f.x > W + 30) { f.x = -30; f.y = rnd(H * 0.35, H * 0.8); } }
    },
    draw(t) {
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.55);
      halo.addColorStop(0, `rgba(255,214,120,${dark ? 0.26 : 0.34})`); halo.addColorStop(0.4, `rgba(255,200,110,${dark ? 0.08 : 0.12})`); halo.addColorStop(1, "rgba(255,200,110,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.06);
      for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = `rgba(255,214,120,${(dark ? 0.1 : 0.14) * (0.6 + 0.4 * Math.sin(t * 0.9 + i))})`; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(0, -92); ctx.lineTo(3, -30); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = `rgba(255,222,140,${dark ? 0.9 : 0.95})`; ctx.beginPath(); ctx.arc(sx, sy, 17, 0, 6.2832); ctx.fill();
      for (const c of clouds) cloud(ctx, c.x, c.y, c.s, dark ? [215, 225, 245] : [150, 175, 210], dark ? 0.08 : 0.34);
      for (const m of motes) { ctx.fillStyle = `rgba(255,236,180,${(dark ? 0.35 : 0.5) * (0.5 + 0.5 * Math.sin(t * m.sp + m.ph))})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill(); }
      for (const f of flies) { // butterflies
        const w = Math.abs(Math.sin(t * 9 + f.ph)); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.sin(t * 1.3 + f.ph) * 0.3);
        ctx.fillStyle = rgba(f.col, dark ? 0.85 : 0.8);
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * 3.6 * (0.3 + w * 0.7), -2, 4.4 * (0.35 + w * 0.65), 5, sgn * 0.5, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.ellipse(sgn * 2.8 * (0.3 + w * 0.7), 3, 3 * (0.35 + w * 0.65), 3.6, sgn * -0.4, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = rgba(dark ? [30, 30, 30] : [40, 40, 50], 0.9); ctx.fillRect(-0.7, -4, 1.4, 9); ctx.restore();
      }
    },
  };
}

/* ------------------------------------------------------------------- EVENING */
function evening(e: Env): Engine {
  const { ctx, W, H, dark } = e;
  const flies = Array.from({ length: 18 }, () => ({ x: rnd(0, W), y: rnd(H * 0.3, H), ph: rnd(0, 6.28), sp: rnd(0.5, 1.4), vx: rnd(-8, 8), vy: rnd(-6, 6) }));
  const clouds = Array.from({ length: 3 }, (_, i) => ({ x: (W / 3) * i + rnd(0, 60), y: rnd(H * 0.1, H * 0.45), s: rnd(1, 1.8), sp: rnd(3, 8) }));
  let flock: { x: number; y: number; sp: number; n: number } | null = null;
  let nextFlock = e.animate ? rnd(3, 8) : 1e9;
  return {
    step(dt, t) {
      for (const f of flies) { f.x += (f.vx + Math.sin(t * 0.7 + f.ph) * 10) * dt; f.y += (f.vy + Math.cos(t * 0.9 + f.ph) * 10) * dt; if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10; if (f.y < H * 0.25) f.y = H; if (f.y > H + 10) f.y = H * 0.3; }
      for (const c of clouds) { c.x += c.sp * dt; if (c.x > W + 140) c.x = -160; }
      nextFlock -= dt;
      if (!flock && nextFlock <= 0) { flock = { x: -40, y: rnd(110, Math.max(130, H * 0.28)), sp: rnd(48, 70), n: 5 + Math.floor(Math.random() * 4) }; nextFlock = rnd(18, 32); }
      if (flock) { flock.x += flock.sp * dt; flock.y -= 3 * dt; if (flock.x > W + 80) flock = null; }
    },
    draw(t) {
      const g = ctx.createLinearGradient(0, H, 0, H * 0.35);
      g.addColorStop(0, `rgba(255,112,64,${dark ? 0.28 : 0.3})`); g.addColorStop(0.5, `rgba(255,150,90,${dark ? 0.09 : 0.12})`); g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sx = W * 0.22, sy = H + 10 - 14 * Math.sin(t * 0.08);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.55);
      halo.addColorStop(0, `rgba(255,150,70,${dark ? 0.34 : 0.32})`); halo.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,170,90,0.85)"; ctx.beginPath(); ctx.arc(sx, sy, 26, Math.PI, 0); ctx.fill();
      for (const c of clouds) cloud(ctx, c.x, c.y, c.s, dark ? [255, 150, 110] : [235, 140, 110], dark ? 0.1 : 0.26);
      for (const f of flies) { // fireflies
        const a = Math.pow(0.5 + 0.5 * Math.sin(t * f.sp * 2 + f.ph), 2);
        const gl = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10); gl.addColorStop(0, `rgba(240,255,130,${(dark ? 0.7 : 0.55) * a})`); gl.addColorStop(1, "rgba(240,255,130,0)");
        ctx.fillStyle = gl; ctx.fillRect(f.x - 10, f.y - 10, 20, 20);
        ctx.fillStyle = `rgba(255,255,200,${0.9 * a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 1.2, 0, 6.2832); ctx.fill();
      }
      if (flock) {
        ctx.strokeStyle = dark ? "rgba(255,200,170,0.6)" : "rgba(80,40,40,0.55)"; ctx.lineWidth = 1.3; ctx.lineCap = "round";
        for (let i = 0; i < flock.n; i++) {
          const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2), bx = flock.x - rank * 18, by = flock.y + side * rank * 9, fl = Math.sin(t * 8 + i) * 4.5;
          ctx.beginPath(); ctx.moveTo(bx - 7, by - 2 - fl); ctx.quadraticCurveTo(bx - 3, by - 5 - fl, bx, by); ctx.quadraticCurveTo(bx + 3, by - 5 - fl, bx + 7, by - 2 - fl); ctx.stroke();
        }
      }
    },
  };
}

const BUILD: Record<Scene, (e: Env) => Engine> = { night, morning, afternoon, evening };

/** Full-screen animated backdrop, drawn live (no image or GIF files) so it follows theme, palette and time of day. */
export default function SceneBackground() {
  const { theme, look } = useTheme();
  const ref = useRef<HTMLCanvasElement>(null);
  const [hour, setHour] = useState<number>(() => new Date().getHours());

  useEffect(() => { const id = window.setInterval(() => setHour(new Date().getHours()), 60_000); return () => window.clearInterval(id); }, []);

  const scene: Scene | null = look.scene === "off" ? null : look.scene === "auto" ? sceneForHour(hour) : (look.scene as Scene);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0, last = 0, t = 0, W = 0, H = 0;
    const holder: { e: Engine | null } = { e: null };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(document.documentElement);
      let perch = 30, perchAt = -1e9;
      const perchY = () => { // re-measured twice a second: the header only exists after sign-in / on phones
        const now = performance.now();
        if (now - perchAt > 500) {
          perchAt = now;
          const header = document.querySelector(".mobile-header") as HTMLElement | null;
          perch = header && getComputedStyle(header).display !== "none" ? header.getBoundingClientRect().bottom + 16 : 30;
        }
        return perch;
      };
      holder.e = BUILD[scene]({ ctx, W, H, dark: theme === "dark", gold: parse(cs.getPropertyValue("--gold-rgb"), [229, 184, 105]), green: parse(cs.getPropertyValue("--green-rgb"), [0, 226, 123]), animate: look.motion === "on", perchY });
    };
    const render = () => { ctx.clearRect(0, 0, W, H); holder.e?.draw(t); };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      if (now - last < 33) return; // ~30 fps keeps phones cool
      const dt = Math.min(0.1, (now - last) / 1000 || 0.033); last = now; t += dt;
      holder.e?.step(dt, t); render();
    };

    build();
    if (look.motion === "on") { holder.e?.step(0.016, 0); raf = requestAnimationFrame(frame); }
    else { holder.e?.step(0, 0); render(); }

    let timer = 0;
    const onResize = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { build(); if (look.motion !== "on") render(); }, 150); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer); window.removeEventListener("resize", onResize); };
  }, [scene, theme, look.motion, look.palette, look.vibrancy]);

  if (!scene) return null;
  return <canvas key={scene} ref={ref} className="bf-scene" data-scene-active={scene} aria-hidden="true" />;
}
