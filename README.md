# Profiles

Complete routing profiles built from public ruleset projects.

这是一个面向不同代理客户端的完整配置仓库。目录按客户端划分，文件名表示规则来源。

## Available profiles

| Ruleset | Mihomo | Shadowrocket | Stash | Quantumult X |
| --- | --- | --- | --- | --- |
| [Sukka Ruleset](https://github.com/SukkaW/Surge) | [sukka.yaml](./mihomo/sukka.yaml) | [sukka.conf](./shadowrocket/sukka.conf) | [sukka.yaml](./stash/sukka.yaml) | [sukka.conf](./qx/sukka.conf) |

> [!IMPORTANT]
> These are unofficial community profiles. Please report profile-specific issues
> to this repository rather than to the ruleset or client maintainers.

## Usage

### Mihomo

The Mihomo profile is intended for Mihomo-based clients such as Clash Verge Rev.

1. Download [mihomo/sukka.yaml](./mihomo/sukka.yaml).
2. Replace the placeholder proxy-provider URL with your subscription URL:

   ```yaml
   url: "https://example.com/REPLACE_WITH_YOUR_SUBSCRIPTION_URL"
   ```

3. Import the file into the client.

The subscription cache path is `./providers/my-subscription.yaml`. Each policy
group can select any node supplied by the provider.

### Shadowrocket

1. Add your nodes or subscription in Shadowrocket.
2. Download and import [shadowrocket/sukka.conf](./shadowrocket/sukka.conf).
3. Select the imported configuration and use configuration-based routing.
4. Select `PROXY` or `DIRECT` for each routing category.

The profile uses the nodes already managed by Shadowrocket. It does not contain
or download a node subscription. `PROXY` follows the node selected on the home
screen; `DIRECT` is available only where a direct route can be meaningful.

### Stash

The Stash profile targets Stash on iOS, macOS, tvOS, and visionOS.

1. Download [stash/sukka.yaml](./stash/sukka.yaml).
2. Replace the placeholder proxy-provider URL with your subscription URL:

   ```yaml
   url: "https://example.com/REPLACE_WITH_YOUR_SUBSCRIPTION_URL"
   ```

3. Import the file into Stash (via AirDrop, iCloud, or paste the URL in
   Stash → Settings → Configuration Files → Download from URL).
4. Select the imported configuration and tap Start on the home screen.

Stash uses Fake IP by default. The profile includes a QUIC-blocking script
shortcut to force TCP, which most proxy protocols handle more efficiently.
`REJECT-NO-DROP` is not available in Stash; the upstream reject-no-drop ruleset
is mapped to `REJECT` instead.

### Quantumult X

Requires Quantumult X 1.8.0 or newer; the profile uses the built-in
`FILTER_LAN` / `FILTER_REGION` snippets and was verified against the v1.8.0
(build 943) TestFlight sample configuration.

1. Add your nodes or subscription in Quantumult X.
2. Download and import [qx/sukka.conf](./qx/sukka.conf) (Settings →
   Configuration → Download), then start the tunnel.
3. The built-in `PROXY` policy follows the node selected on the home screen;
   select `PROXY` or `DIRECT` for each category policy group.

Quantumult X cannot parse Surge syntax, so the rule lists are pre-converted
and committed under [qx/Rules/](./qx/Rules/). A scheduled workflow rebuilds
them hourly against upstream; the client refreshes the lists daily. The
converter reports what it drops per file (upstream `URL-REGEX`,
`USER-AGENT`, `PROCESS-NAME`, and logic rules have no Quantumult X filter
equivalent). If `raw.githubusercontent.com` is unreachable from your network,
switch the list URLs to the jsDelivr mirror documented in the profile header.

## Sukka profile

All profiles fetch rule files from `ruleset.skk.moe` and preserve Sukka's
required domain/non-IP-before-IP ordering.

The routing categories are:

```text
AI
Telegram
Streaming
CDN
Speedtest
Apple
Microsoft
NetEase Music
Download
```

Mihomo and Stash expose a `PROXY` policy group. Shadowrocket uses the built-in
`PROXY` policy instead; it follows the node selected on the home screen.

The base reject lists and Sogou Input privacy list are enabled. The Sogou list
may affect account sync, dictionary updates, and feedback features. Sukka
recommends dedicated content-blocking software instead of large reject lists on
mobile platforms.

Shadowrocket, Stash, and Quantumult X are not officially supported Sukka
Ruleset targets. Some desktop-only process rules may have no effect on iOS.
The Quantumult X profile also omits the `reject_extra` and `reject_phishing`
domain sets (~213k lines) to stay within Quantumult X performance limits.

## Repository layout

```text
.
├── mihomo/
│   └── sukka.yaml
├── shadowrocket/
│   └── sukka.conf
├── stash/
│   └── sukka.yaml
├── qx/
│   ├── sukka.conf
│   └── Rules/            # generated, see .github/workflows/sukka-qx.yml
├── tools/
│   └── sukka-qx.mjs      # Sukka Ruleset -> Quantumult X converter
├── .github/
│   └── workflows/
│       └── sukka-qx.yml
├── .gitignore
├── LICENSE
├── NOTICE
└── README.md
```

## Privacy

Subscription URLs are credentials. Do not commit them to a public repository or
include them in issues, logs, or screenshots.

## License

Original repository content is licensed under
[AGPL-3.0-only](./LICENSE). Third-party rules and data retain their upstream
licenses; see [NOTICE](./NOTICE) for attribution and exceptions.
