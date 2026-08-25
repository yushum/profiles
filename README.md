# Profiles

Complete routing profiles built from public ruleset projects.

这是一个面向不同代理客户端的完整配置仓库。目录按客户端划分，文件名表示规则来源。

## Available profiles

| Ruleset | Mihomo | Shadowrocket |
| --- | --- | --- |
| [Sukka Ruleset](https://github.com/SukkaW/Surge) | [sukka.yaml](./mihomo/sukka.yaml) | [sukka.conf](./shadowrocket/sukka.conf) |

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

## Sukka profile

Both profiles fetch rule files from `ruleset.skk.moe` and preserve Sukka's
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

Mihomo exposes a `Proxy` policy group. Shadowrocket uses the built-in `PROXY`
policy instead; it follows the node selected on the home screen.

The base reject lists and Sogou Input privacy list are enabled. The Sogou list
may affect account sync, dictionary updates, and feedback features. Sukka
recommends dedicated content-blocking software instead of large reject lists on
mobile platforms.

Shadowrocket is not an officially supported Sukka Ruleset target. Some
desktop-only process rules may have no effect on iOS.

## Repository layout

```text
.
├── mihomo/
│   └── sukka.yaml
├── shadowrocket/
│   └── sukka.conf
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
