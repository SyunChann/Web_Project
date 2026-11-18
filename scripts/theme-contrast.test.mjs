import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function tokens(block) {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value]));
}
const globals = source("src/app/globals.css");
const light = tokens(globals.match(/:root\s*\{([^}]+)\}/)[1]);
const dark = { ...light, ...tokens(globals.match(/html\.dark\s*\{([^}]+)\}/)[1]) };
function resolve(value, palette) {
  return value.startsWith("var(") ? resolve(palette[value.slice(4, -1)], palette) : value;
}
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels.reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
}
function contrast(first, second) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test("both themes keep primary and secondary text readable on page and card surfaces", () => {
  for (const palette of [light, dark]) for (const text of ["--foreground", "--muted"]) for (const background of ["--background", "--surface"]) {
    assert.ok(contrast(palette[text], palette[background]) >= 4.5, `${text} on ${background}`);
  }
});

test("dark content palette and flight status colors maintain text contrast", () => {
  const colors = tokens(source("src/app/theme.css").match(/html\.dark\s*\{([^}]+)\}/)[1]);
  for (const [name, value] of Object.entries(colors).filter(([key]) => key.startsWith("--theme-text-"))) {
    assert.ok(contrast(resolve(value, dark), dark["--surface"]) >= 4.5, name);
  }
  const board = source("src/app/departures/DepartureBoard.module.css");
  const status = [...board.matchAll(/:global\(html\.dark\)\s+\.\w+\s*\{ --status-color: (#[\da-f]+);/g)];
  assert.equal(status.length, 5);
  for (const [, color] of status) assert.ok(contrast(color, dark["--surface"]) >= 4.5, color);
});
