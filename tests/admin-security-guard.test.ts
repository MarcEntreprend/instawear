// tests/admin-security-guard.test.ts — garde-fous statiques anti-dérive.
//
// Protocoles : PROTOCOL-DE-SECURITE-BACKEND (§1 : rôle jamais côté front,
// flag admin cosmétique ; §8 : zéro log d'auth ; §12 : zéro PII en URL) +
// 10-Security-Mistakes #1 (never trust the frontend).
// Ces tests ne changent aucune logique : ils échouent si un futur edit
// réintroduit un invariant interdit (détection de dérive, §11/§14).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const FILES = walk(SRC);

test("admin : le chunk admin n'est monté que derrière isAdmin (RPC serveur)", () => {
  const hits: string[] = [];
  for (const f of FILES) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("<AdminDashboardNew")) return;
      const ctx = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (!ctx.includes("isAdmin")) hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, [], "AdminDashboardNew monté sans garde isAdmin");
});

test("admin : aucun rôle/session/token dans le stockage navigateur", () => {
  const hits: string[] = [];
  const storageRe = /(localStorage|sessionStorage)/;
  const secretRe = /\b(role|isAdmin|adminToken|authToken|jwt|session)\b/i;
  for (const f of FILES) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (storageRe.test(line) && secretRe.test(line))
          hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
  }
  assert.deepEqual(hits, [], "rôle/session persistant côté front");
});

test("admin : zéro log d'auth/PII en production", () => {
  const hits: string[] = [];
  const logRe = /console\.(log|warn|error|info|debug)\(/;
  const piiRe = /\b(session|token|password|secret|email|admin)\b/i;
  for (const f of FILES) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (logRe.test(line) && piiRe.test(line))
          hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
  }
  assert.deepEqual(hits, [], "log d'auth/PII présent");
});

test("admin : aucun header de rôle forgé (X-Admin & co)", () => {
  const hits: string[] = [];
  const re = /X-Admin|x-admin|role.*header|header.*role/i;
  for (const f of FILES) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (re.test(line)) hits.push(`${f}:${i + 1}`);
      });
  }
  assert.deepEqual(hits, [], "header de rôle côté front");
});
