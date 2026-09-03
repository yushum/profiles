/**
 * Quantumult X geo_location_checker script for ip-api.com
 * Endpoint: http://ip-api.com/json/?lang=zh-CN
 *
 * Input:
 *   $response.statusCode (number / string)
 *   $response.body       (string: JSON from ip-api.com)
 * Output:
 *   $done({ title, subtitle, ip, description })
 *
 * Licensed under AGPL-3.0-or-later.
 */

if (typeof $response === "undefined" || !$response || $response.statusCode != 200) {
  var errCode = (typeof $response !== "undefined" && $response) ? $response.statusCode : "No Response";
  $done({
    title: "网络错误",
    subtitle: "HTTP 状态码: " + errCode,
    ip: "",
    description: "无法从 http://ip-api.com/json/?lang=zh-CN 获取数据。\n状态码: " + errCode
  });
} else {
  var data = null;
  try {
    data = JSON.parse($response.body);
  } catch (e) {
    $done({
      title: "解析失败",
      subtitle: "JSON 格式异常",
      ip: "",
      description: "响应内容无法解析为 JSON:\n" + ($response.body || "")
    });
  }

  if (data) {
    if (data.status != "success") {
      // API 返回错误（例如超出频次限制 over quota）
      var reason = data.message || "请求失败";
      var queryIp = data.query || "";
      $done({
        title: "IP.API 提示: " + reason,
        subtitle: queryIp ? ("出口 IP: " + queryIp) : "查询受限",
        ip: queryIp,
        description: "API 响应错误:\n" + JSON.stringify(data, null, 2)
      });
    } else {
      // 成功解析
      var flag = "🌐";
      var code = data.countryCode;
      if (code && typeof code === "string" && code.length === 2) {
        var upper = code.toUpperCase();
        if (upper === "TW") {
          flag = "🇨🇳";
        } else {
          var c1 = upper.charCodeAt(0);
          var c2 = upper.charCodeAt(1);
          if (c1 >= 65 && c1 <= 90 && c2 >= 65 && c2 <= 90) {
            try {
              flag = String.fromCodePoint(0x1f1e6 + c1 - 65, 0x1f1e6 + c2 - 65);
            } catch (err) {
              flag = "🌐";
            }
          }
        }
      }

      var country = data.country || "";
      var region = data.regionName || "";
      var city = data.city || "";

      // 主标题：国旗 + 城市/国家（例如 "🇺🇸 洛杉矶, 美国" 或 "🇭🇰 香港"）
      var locTitle = "";
      if (city && country && city !== country) {
        locTitle = city + ", " + country;
      } else {
        locTitle = city || country || region || "未知位置";
      }
      var title = flag + " " + locTitle;

      // 副标题：优先显示组织/公司，为空回退到 ISP，再回退到 AS 信息
      var org = data.org || data.isp || "";
      var asInfo = data.as || "";
      var asnMatch = asInfo.match(/^(AS\d+)/i);
      var asn = asnMatch ? asnMatch[1] : "";

      var subtitle = "";
      if (org && asn && org.indexOf(asn) === -1) {
        subtitle = org + " (" + asn + ")";
      } else {
        subtitle = org || asInfo || "未知网络";
      }

      var ip = data.query || "";

      // 弹窗详情
      var descLines = [];
      if (ip) descLines.push("出口 IP: " + ip);

      var fullLoc = [];
      if (country) fullLoc.push(country);
      if (region && region !== country) fullLoc.push(region);
      if (city && city !== region) fullLoc.push(city);
      if (fullLoc.length > 0) {
        descLines.push("位置: " + flag + " " + fullLoc.join(" · "));
      }

      if (data.org) descLines.push("组织: " + data.org);
      if (data.isp && data.isp !== data.org) descLines.push("运营商: " + data.isp);
      if (asInfo) descLines.push("ASN: " + asInfo);
      if (data.timezone) descLines.push("时区: " + data.timezone);
      if (data.zip) descLines.push("邮编: " + data.zip);

      $done({
        title: title,
        subtitle: subtitle,
        ip: ip,
        description: descLines.join("\n")
      });
    }
  }
}
