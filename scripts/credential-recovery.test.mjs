import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { generatePassword } from "../src/lib/usuarios/generate-password.mjs";

// Exercise the manual recovery entry point with a fake Supabase module.
// Local configuration and networking are disabled even for successful cases.
function runRecovery(email, password) {
  const source = `
    import { registerHooks } from 'node:module';
    const state = globalThis.__recoveryTest = { configRead: 0, clients: 0, updates: 0, rounds: null };
    globalThis.fetch = async () => { throw new Error('Network disabled'); };
    process.loadEnvFile = () => { state.configRead++; };
    registerHooks({
      resolve(name, context, next) {
        if (name === '@supabase/supabase-js') return { url: 'recovery:client', shortCircuit: true };
        return next(name, context);
      },
      load(url, context, next) {
        if (url !== 'recovery:client') return next(url, context);
        return { format: 'module', shortCircuit: true, source: \`
          export function createClient() {
            const s = globalThis.__recoveryTest;
            s.clients++;
            const chain = {
              update(row) { s.updates++; s.rounds = Number(row.password.split('$')[2]); return chain; },
              eq() { return chain; },
              ilike() { return chain; },
              select() { return Promise.resolve({ data: [{ id: 1 }], error: null }); }
            };
            return { from(table) { if (table !== 'usuarios') throw new Error('Unexpected resource'); return chain; } };
          }
        \` };
      }
    });
    process.on('exit', () => console.log('TEST_STATE:' + JSON.stringify(state)));
    await import('./scripts/reset-admin-password.mjs');
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      RESET_ADMIN_EMAIL: email,
      RESET_ADMIN_PASSWORD: password,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "test-only-never-used",
    },
  });
  const state = JSON.parse(result.stdout.match(/TEST_STATE:(.+)/)[1]);
  return { ...result, state };
}

test("recovery rejects missing/weak inputs before reading configuration or creating a client", () => {
  for (const [email, password] of [["", ""], ["admin@example.com", "short"], ["invalid", generatePassword()]]) {
    const result = runRecovery(email, password);
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.state, { configRead: 0, clients: 0, updates: 0, rounds: null });
  }
});

test("recovery uses a supplied strong password, cost 12 and omits secrets from output", () => {
  const password = generatePassword();
  const result = runRecovery("admin@example.com", password);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.state, { configRead: 1, clients: 1, updates: 1, rounds: 12 });
  assert.equal((result.stdout + result.stderr).includes(password), false);
  assert.equal((result.stdout + result.stderr).includes("test-only-never-used"), false);
});
