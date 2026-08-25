# Profiles

A collection of complete, client-ready routing profiles built from public ruleset projects.

这是一个面向多客户端、多规则来源的配置仓库。顶层目录按客户端划分，配置文件名标识规则来源；仓库不会绑定某个特定规则项目。

## Available profiles

| Ruleset source | Mihomo | Shadowrocket | Validation |
| --- | --- | --- | --- |
| [Sukka Ruleset](https://github.com/SukkaW/Surge) | [sukka.yaml](./mihomo/sukka.yaml) | [sukka.conf](./shadowrocket/sukka.conf) | Mihomo tested; Shadowrocket reviewed |

> [!IMPORTANT]
> 所有配置均为非官方社区适配，不受对应规则项目或客户端维护者支持。由本仓库配置引起的问题应在本仓库处理，不应提交给上游规则维护者。

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

目录使用客户端名称，文件使用规则来源名称，并保留各客户端的原生扩展名。这样新增规则来源时无需改变现有链接，也不会把仓库范围写死在某个项目上。

## Repository conventions

- 每个文件都是可独立导入的完整客户端配置，而不是单独的规则片段。
- 配置文件名应使用简短、稳定的规则来源标识，例如 `sukka.yaml`。
- 客户端配置保持纯 ASCII；说明文档可以使用中文。
- 不提交节点、订阅地址、认证信息或提供器缓存。
- 规则归类尽量保持对应上游语义，不擅自增加域名、IP 或重新命名服务类别。
- 每个配置必须在文件头标明 SPDX 许可证标识和上游来源。
- 不同规则来源可能采用不同许可证；新增配置前必须单独核对。

## Sukka profiles

当前提供的 Sukka 配置具有以下共同设计：

- 所有远程规则文件均直接来自 [Sukka Ruleset](https://github.com/SukkaW/Surge)。
- 仅使用主站 `ruleset.skk.moe`，不使用镜像地址。
- 域名和非 IP 规则位于 IP 规则之前，保持上游推荐顺序。
- 所有流媒体合并到一个 `Streaming` 策略，不按地区拆分。
- 不按节点名称筛选地区；每个服务策略都能选择订阅中的任意节点。
- `AI`、`Telegram` 和 `Streaming` 不提供 `DIRECT`。
- `CDN`、`Speedtest`、`Apple`、`Microsoft`、`NetEase Music` 和 `Download` 保留 `DIRECT`。
- IPv6 默认关闭，不包含 MITM、URL Rewrite 或客户端模块。
- 为避免重复和额外开销，不加载地区流媒体子集、Telegram ASN、`reject_extra`、`reject_phishing` 或 IPv6 规则。

配置会在运行时访问 `ruleset.skk.moe` 更新规则。使用该服务前请阅读上游的 [隐私政策](https://skk.moe/privacy-policy/)。基础拦截规则和搜狗输入法隐私规则默认启用；后者会影响搜狗输入法账号同步、词库更新和问题反馈。Sukka 上游不建议在移动端依赖大型域名列表替代专用内容拦截工具。

### Policy groups

| Policy | Default route | `DIRECT` available |
| --- | --- | --- |
| `Proxy Select` | Selected proxy | No |
| `AI` | `Proxy Select` | No |
| `Telegram` | `Proxy Select` | No |
| `Streaming` | `Proxy Select` | No |
| `CDN` | `Proxy Select` | Yes |
| `Speedtest` | `DIRECT` | Yes |
| `Apple` | `DIRECT` | Yes |
| `Microsoft` | `DIRECT` | Yes |
| `NetEase Music` | `DIRECT` | Yes |
| `Download` | `DIRECT` | Yes |

每个服务策略同时列出全部具体节点。选择具体节点时，该服务固定使用对应出口；选择 `Proxy Select` 时则跟随全局节点选择。

Apple CDN、Apple CN 和 Microsoft CDN 属于明确的境内服务规则，因此始终使用 `DIRECT`，不会跟随 `Apple` 或 `Microsoft` 策略组。

### Mihomo

配置文件：[mihomo/sukka.yaml](./mihomo/sukka.yaml)

适用于 Mihomo 内核及 Clash Verge Rev。导入前，在本地副本中把以下占位符替换为实际订阅地址：

```yaml
url: "https://example.com/REPLACE_WITH_YOUR_SUBSCRIPTION_URL"
```

代理提供器缓存路径为：

```yaml
path: ./providers/my-subscription.yaml
```

订阅地址相当于账号凭据，切勿提交到公开仓库、Issue、日志或截图中。`providers/` 和 `rule_providers/` 已加入 `.gitignore`，但 `.gitignore` 无法保护已经写入受版本控制文件的秘密。

配置不覆盖 Clash Verge Rev 的 TUN 和外部控制器设置，这些功能继续由客户端界面管理。

### Shadowrocket

配置文件：[shadowrocket/sukka.conf](./shadowrocket/sukka.conf)

1. 先在 Shadowrocket 中正常添加节点或节点订阅。
2. 导入 `sukka.conf` 并选择使用该配置。
3. 将全局路由设为“配置”。
4. 在策略页面分别设置 `Proxy Select`、`AI`、`Telegram`、`Streaming` 等策略。

配置使用 `policy-regex-filter=.*` 将全部节点加入各策略，不进行地区筛选。Shadowrocket 并非 Sukka Ruleset 官方支持的目标，本文件只是社区兼容适配；上游规则中的桌面进程匹配在 iOS 上可能无法发挥作用。

## Adding another ruleset source

1. 为每个受支持客户端添加以规则来源命名的文件，例如 `mihomo/example.yaml`。
2. 在上方 `Available profiles` 表格中增加一行。
3. 在 `NOTICE` 中记录上游仓库、作者、许可证和是否进行了修改。
4. 在配置文件头写入准确的 `SPDX-License-Identifier`；不要默认沿用其他配置的许可证。
5. 记录该来源专属的策略结构和设计取舍。
6. 完成语法、凭据、规则顺序、URL 和客户端内核测试。

## Validation checklist

每次发布前至少检查：

1. 配置能够被对应客户端解析；
2. 仓库不包含订阅地址或其他凭据；
3. 客户端配置不包含非 ASCII 字符；
4. 规则 URL 与该配置声明的上游来源一致；
5. 域名、非 IP 和 IP 规则保持上游要求的顺序；
6. README、NOTICE 和 SPDX 标识反映真实许可证。

## Licensing

仓库当前原创框架、文档和 Sukka 配置采用 [GNU Affero General Public License v3.0 only](./LICENSE)。每个配置文件中的 SPDX 标识具有更明确的文件级说明。

未来加入的其他规则来源可能适用不同许可证。第三方规则、数据和上游项目不因收录在本仓库中而改变许可证；具体归属和例外记录在 [NOTICE](./NOTICE) 中。新增来源前应分别核对许可兼容性。

## Disclaimer

本仓库按“现状”提供，不保证适用于任何特定网络、节点服务商或客户端版本。使用者应自行检查配置、保护订阅凭据，并承担使用风险。
