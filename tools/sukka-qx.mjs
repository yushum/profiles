#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
//
// sukka-qx.mjs — Convert Sukka Ruleset (Surge syntax) filter lists into
// Quantumult X [filter_remote] lists.
//
// Community adaptation, not an official SukkaW/Surge deliverable.
// Upstream: https://github.com/SukkaW/Surge (runtime server: https://ruleset.skk.moe)
//
// Usage:
//   node tools/sukka-qx.mjs            # sync (skips when upstream HEAD is unchanged)
//   node tools/sukka-qx.mjs --force    # re-download and rebuild regardless
//
// Conversion rules (Quantumult X supports no URL-REGEX / PROCESS-NAME / logic
// rules in filters, and has no DOMAIN-SET equivalent):
//   DOMAIN          -> host
//   DOMAIN-SUFFIX   -> host-suffix
//   DOMAIN-KEYWORD  -> host-keyword
//   DOMAIN-WILDCARD -> host-wildcard (Quantumult X 1.8.0+; perf-heavy but native)
//   IP-CIDR         -> ip-cidr    (Surge options such as no-resolve are dropped)
//   IP-CIDR6        -> ip6-cidr   (same)
//   IP-ASN          -> ip-asn
//   GEOIP           -> geoip
//   domainset lines -> host-suffix. A leading dot in a Surge DOMAIN-SET means
//                      "subdomains only"; Quantumult X cannot express that, so
//                      such lines are approximated as host-suffix (which also
//                      matches the bare domain) and reported separately.
//   URL-REGEX / PROCESS-NAME / USER-AGENT / AND / OR / NOT and anything unknown
//                   -> dropped and reported
//
// Output lines carry the target policy as the third field; the [filter_remote]
// force-policy param in qx/sukka.conf overrides it (both are the same value).
// Files are only rewritten when the upstream
// $content-hash-v1$ changes, so untouched runs produce an empty git diff.

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const UPSTREAM_REPO = process.env.UPSTREAM_REPO ?? 'https://github.com/SukkaW/Surge';
const RULES_BASE = 'https://ruleset.skk.moe/List/';
const OUT_DIR = path.resolve('qx', 'Rules');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const FORCE = process.argv.includes('--force');

// Quantumult X cannot keep up with Sukka's full reject domain set (~363k lines
// across reject/reject_extra/reject_phishing), so the two extras are not
// converted. reject-url-regex is Surge MITM-only. china_ip/lan (IP lists) are
// replaced by Quantumult X's built-in FILTER_REGION/FILTER_LAN snippets.
// Quantumult X filter files carry the policy in each line (3 fields, like the
// official crossutility filter.snippet); the force-policy param in the
// [filter_remote] entry overrides it at load time. Both are set to the same
// value so the files work regardless.
const SOURCES = [
  // Ad / privacy / malware blocking -> REJECT
  { name: 'reject-drop', src: 'non_ip/reject-drop.conf', policy: 'reject' },
  { name: 'reject-domainset', src: 'domainset/reject.conf', policy: 'reject' },
  { name: 'reject', src: 'non_ip/reject.conf', policy: 'reject' },
  { name: 'reject-no-drop', src: 'non_ip/reject-no-drop.conf', policy: 'reject' },
  { name: 'sogouinput', src: 'non_ip/sogouinput.conf', policy: 'reject' },
  // Speedtest / CDN
  { name: 'speedtest', src: 'domainset/speedtest.conf', policy: 'Speedtest' },
  { name: 'cdn-domainset', src: 'domainset/cdn.conf', policy: 'CDN' },
  { name: 'cdn', src: 'non_ip/cdn.conf', policy: 'CDN' },
  // Streaming
  { name: 'stream', src: 'non_ip/stream.conf', policy: 'Streaming' },
  { name: 'ip-stream', src: 'ip/stream.conf', policy: 'Streaming' },
  // AI / Telegram
  { name: 'ai', src: 'non_ip/ai.conf', policy: 'AI' },
  { name: 'apple-intelligence', src: 'non_ip/apple_intelligence.conf', policy: 'AI' },
  { name: 'ip-ai', src: 'ip/ai.conf', policy: 'AI' },
  { name: 'telegram', src: 'non_ip/telegram.conf', policy: 'Telegram' },
  { name: 'ip-telegram', src: 'ip/telegram.conf', policy: 'Telegram' },
  // Apple / Microsoft
  { name: 'apple-cdn-domainset', src: 'domainset/apple_cdn.conf', policy: 'direct' },
  { name: 'apple-services', src: 'non_ip/apple_services.conf', policy: 'Apple' },
  { name: 'apple-cn', src: 'non_ip/apple_cn.conf', policy: 'direct' },
  { name: 'microsoft-cdn', src: 'non_ip/microsoft_cdn.conf', policy: 'direct' },
  { name: 'microsoft', src: 'non_ip/microsoft.conf', policy: 'Microsoft' },
  // NetEase Music / Download
  { name: 'neteasemusic', src: 'non_ip/neteasemusic.conf', policy: 'NetEase Music' },
  { name: 'ip-neteasemusic', src: 'ip/neteasemusic.conf', policy: 'NetEase Music' },
  { name: 'download-domainset', src: 'domainset/download.conf', policy: 'Download' },
  { name: 'download', src: 'non_ip/download.conf', policy: 'Download' },
  // Domestic / direct / global
  { name: 'lan', src: 'non_ip/lan.conf', policy: 'direct' },
  { name: 'domestic', src: 'non_ip/domestic.conf', policy: 'direct' },
  { name: 'direct', src: 'non_ip/direct.conf', policy: 'direct' },
  { name: 'global', src: 'non_ip/global.conf', policy: 'proxy' },
  // IP-based routing (excluding china_ip -> FILTER_REGION, lan -> FILTER_LAN)
  { name: 'ip-reject', src: 'ip/reject.conf', policy: 'reject' },
  { name: 'ip-domestic', src: 'ip/domestic.conf', policy: 'direct' },
];

// Single-label names ("unifi", "lan") and ccTLD suffixes ("ac", "ai") are valid
// rules and must not be rejected. Underscores are technically not DNS-legal but
// real-world hosts (and Sukka's own canary domain) use them.
const DOMAIN_RE = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$/i;
const WILDCARD_RE = /^[a-z0-9?*.-]{1,253}$/i;
const IPV4_CIDR_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
const IPV6_CIDR_RE = /^[0-9a-f:]+\/\d{1,3}$/i;
const IP_ASN_RE = /^\d{1,10}$/;

function isDomain(value) {
  return typeof value === 'string' && value.length <= 253 && DOMAIN_RE.test(value);
}

function isIPv4Cidr(value) {
  const m = IPV4_CIDR_RE.exec(value ?? '');
  if (!m) return false;
  return m.slice(1, 5).every((octet) => Number(octet) <= 255) && Number(m[5]) <= 32;
}

function isIPv6Cidr(value) {
  return typeof value === 'string' && value.includes(':') && IPV6_CIDR_RE.test(value);
}

function convertSurgeLine(line, stats) {
  const fields = line.split(',').map((field) => field.trim());
  const type = (fields[0] ?? '').toUpperCase();
  const value = fields[1] ?? '';
  const drop = (reason) => {
    stats.dropped[reason] = (stats.dropped[reason] ?? 0) + 1;
    return null;
  };

  switch (type) {
    case 'DOMAIN':
      return isDomain(value) ? `host,${value}` : drop('invalid-domain');
    case 'DOMAIN-SUFFIX':
      return isDomain(value) ? `host-suffix,${value}` : drop('invalid-domain');
    case 'DOMAIN-KEYWORD':
      return value !== '' ? `host-keyword,${value}` : drop('invalid');
    case 'DOMAIN-WILDCARD':
      if (!WILDCARD_RE.test(value)) return drop('invalid-wildcard');
      // Upstream occasionally emits wildcard lines without any wildcard.
      return /[*?]/.test(value) ? `host-wildcard,${value}` : `host,${value}`;
    case 'IP-CIDR':
      return isIPv4Cidr(value) ? `ip-cidr,${value}` : drop('invalid-cidr');
    case 'IP-CIDR6':
      return isIPv6Cidr(value) ? `ip6-cidr,${value}` : drop('invalid-cidr');
    case 'IP-ASN':
      return IP_ASN_RE.test(value) ? `ip-asn,${value}` : drop('invalid-asn');
    case 'GEOIP':
      return /^[a-z]{2}$/i.test(value) ? `geoip,${value.toLowerCase()}` : drop('invalid-geoip');
    case 'URL-REGEX':
      return drop('url-regex');
    case 'PROCESS-NAME':
      return drop('process-name');
    case 'USER-AGENT':
      return drop('user-agent');
    case 'AND':
    case 'OR':
    case 'NOT':
      return drop('logic');
    default:
      return drop('other');
  }
}

function convertDomainSetLine(line, stats) {
  const suffixOnly = line.startsWith('.');
  const domain = suffixOnly ? line.slice(1) : line;
  if (!isDomain(domain)) {
    stats.dropped['invalid-domain'] = (stats.dropped['invalid-domain'] ?? 0) + 1;
    return null;
  }
  if (suffixOnly) stats.approximated += 1;
  return `host-suffix,${domain}`;
}

function extract(text, regex) {
  return regex.exec(text)?.[1]?.trim() ?? null;
}

async function fetchText(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw new Error(`failed to fetch ${url}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  return null; // unreachable
}

async function getHeadSha() {
  const { stdout } = await execFileAsync('git', ['ls-remote', UPSTREAM_REPO, 'HEAD']);
  const sha = stdout.split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error(`unexpected ls-remote output: ${stdout}`);
  return sha;
}

function parseList(source, text) {
  const upstreamUpdated = extract(text, /^#\s*Last Updated:\s*(.+)$/m);
  const contentHash = extract(text, /\$content-hash-v1\$:(.+?)\$/);
  const stats = { dropped: {}, approximated: 0 };
  const seen = new Set();
  const lines = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith(';')) continue;
    const converted =
      source.src.startsWith('domainset/') ? convertDomainSetLine(line, stats) : convertSurgeLine(line, stats);
    if (converted === null || seen.has(converted)) continue;
    seen.add(converted);
    lines.push(`${converted},${source.policy}`);
  }

  return { lines, stats, contentHash, upstreamUpdated };
}

async function main() {
  const headSha = await getHeadSha();

  /** @type {any} */
  let manifest = { upstream: { repo: UPSTREAM_REPO, headSha: null }, files: {} };
  try {
    manifest = { ...manifest, ...JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) };
  } catch {
    // first run
  }

  if (!FORCE && manifest.upstream?.headSha === headSha) {
    console.log(`upstream unchanged at ${headSha.slice(0, 12)}, nothing to do`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  const totals = { dropped: 0, approximated: 0, rewritten: 0, unchanged: 0 };
  const nextManifest = { upstream: { repo: UPSTREAM_REPO, headSha }, files: {} };

  for (const source of SOURCES) {
    const text = await fetchText(`${RULES_BASE}${source.src}`);
    const parsed = parseList(source, text);
    const previous = manifest.files?.[source.name];

    if (!FORCE && previous && previous.contentHash === parsed.contentHash) {
      nextManifest.files[source.name] = previous;
      totals.unchanged += 1;
      continue;
    }

    const droppedCount = Object.values(parsed.stats.dropped).reduce((sum, count) => sum + count, 0);
    totals.dropped += droppedCount;
    totals.approximated += parsed.stats.approximated;
    totals.rewritten += 1;

    const droppedText =
      Object.entries(parsed.stats.dropped)
        .map(([reason, count]) => `${reason}: ${count}`)
        .join(', ') || 'none';
    const header = [
      `# Sukka Ruleset for Quantumult X — ${source.name}`,
      `# Source: ${RULES_BASE}${source.src}`,
      `# Upstream last updated: ${parsed.upstreamUpdated ?? 'unknown'}`,
      `# Upstream content hash: ${parsed.contentHash ?? 'unknown'}`,
      '# Generated by tools/sukka-qx.mjs — community adaptation, not an official SukkaW/Surge deliverable.',
      '# License: AGPL-3.0 — https://github.com/SukkaW/Surge',
      '# Quantumult X filter format. Each line carries the policy assigned by [filter_remote] in qx/sukka.conf; force-policy overrides it.',
      `# Rules: ${parsed.lines.length} emitted, ${parsed.stats.approximated} approximated from dot-prefixed DOMAIN-SET lines, dropped: ${droppedText}`,
    ];

    await writeFile(path.join(OUT_DIR, `${source.name}.list`), [...header, ...parsed.lines, ''].join('\n'));

    nextManifest.files[source.name] = {
      source: source.src,
      contentHash: parsed.contentHash,
      upstreamUpdated: parsed.upstreamUpdated,
      rules: parsed.lines.length,
      approximated: parsed.stats.approximated,
      dropped: parsed.stats.dropped,
    };

    console.log(
      `${source.name.padEnd(22)} ${String(parsed.lines.length).padStart(6)} rules, ${droppedCount} dropped` +
        (parsed.stats.approximated > 0 ? `, ${parsed.stats.approximated} approximated` : ''),
    );
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`);

  const totalRules = Object.values(nextManifest.files).reduce((sum, file) => sum + file.rules, 0);
  console.log(
    `\n${totals.rewritten} file(s) rewritten, ${totals.unchanged} unchanged; ` +
      `${totalRules} rules total, ${totals.dropped} dropped, ${totals.approximated} approximated`,
  );
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
