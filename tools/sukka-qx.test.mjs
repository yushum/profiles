// SPDX-License-Identifier: AGPL-3.0-only
// Run: node --test tools/sukka-qx.test.mjs (offline; no client or dependencies).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const converter = fileURLToPath(new URL('./sukka-qx.mjs', import.meta.url));

test('conversion, cache migration and failed downloads preserve existing rules', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'sukka-qx-test-'));
  const run = (command, args, env = {}) => spawnSync(command, args, {
    cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 20_000,
  });
  try {
    // A local upstream exercises the real CLI without depending on GitHub.
    assert.equal(run('git', ['init', '--quiet', 'upstream']).status, 0);
    assert.equal(run('git', ['-C', 'upstream', '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
      '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--allow-empty', '-m', 'fixture']).status, 0);

    const sync = (failure = '', force = false) => {
      const preload = `
        globalThis.fetch = async (url) => {
          const header = '# Last Updated: 2026-09-10T00:00:00Z\\n# $content-hash-v1$:${'a'.repeat(43)}$\\n';
          const footer = '\\n################## EOF ##################\\n';
          let body = url.includes('/domainset/')
            ? 'example.com\\n.example.org\\nexample.com\\n// comment'
            : 'DOMAIN,example.com\\nDOMAIN-SUFFIX,example.org\\nPROCESS-NAME,unsupported';
          body += '\\n' + (url.includes('/domainset/') ? '' : 'DOMAIN,') + '7h15.ru1353t.1s.m4d3.by.5ukk4w.skk.moe';
          let text = header + body + footer;
          if (url.endsWith('/ip/domestic.conf')) {
            switch (${JSON.stringify(failure)}) {
              case 'html': text = '<html>Service unavailable</html>'; break;
              case 'missing-hash': text = body + footer; break;
              case 'truncated': text = header + body; break;
              case 'empty': text = header + footer; break;
              case 'invalid': text = header + body + '\\nDOMAIN,not a domain' + footer; break;
            }
          }
          return { ok: true, text: async () => text };
        };
      `;
      return run(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`,
        converter, ...(force ? ['--force'] : [])], { UPSTREAM_REPO: path.join(cwd, 'upstream') });
    };
    const rules = path.join(cwd, 'qx', 'Rules');
    const snapshot = () => Object.fromEntries(readdirSync(rules).sort().map((name) =>
      [name, readFileSync(path.join(rules, name), 'utf8')]));

    let result = sync();
    assert.equal(result.status, 0, result.stderr);
    const initial = snapshot();
    assert.equal(Object.keys(initial).length, 31);
    assert.deepEqual(initial['cdn-domainset.list'].split('\n').filter((line) => line && !line.startsWith('#')),
      ['host,example.com,CDN', 'host-suffix,example.org,CDN']);
    const manifest = JSON.parse(initial['manifest.json']);
    for (const [name, file] of Object.entries(manifest.files)) {
      assert.equal(file.rules, 2, name); // duplicates and canary removed
    }

    // Old converter output must be replaced even with identical upstream hashes.
    delete manifest.converterVersion;
    writeFileSync(path.join(rules, 'manifest.json'), JSON.stringify(manifest));
    writeFileSync(path.join(rules, 'cdn-domainset.list'), 'host-suffix,example.com,CDN\n');
    result = sync();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(snapshot(), initial);

    result = sync();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /nothing to do/);
    assert.deepEqual(snapshot(), initial);

    // The last download fails after 29 valid ones: neither lists nor manifest change.
    for (const failure of ['html', 'missing-hash', 'truncated', 'empty', 'invalid']) {
      result = sync(failure, true);
      assert.equal(result.status, 1, `${failure}: ${result.stderr}`);
      assert.match(result.stderr, /ip\/domestic.conf:.*refusing to replace rules/);
      assert.deepEqual(snapshot(), initial, failure);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
