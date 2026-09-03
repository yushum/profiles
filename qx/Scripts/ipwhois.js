/**
 * Quantumult X geo_location_checker script for ipwho.is (MaxMind GeoIP2)
 * Endpoint: http://ipwho.is/?lang=zh-CN
 *
 * Uses MaxMind GeoIP2 database with native Chinese localization.
 * Licensed under AGPL-3.0-or-later.
 */

if (typeof $response === "undefined" || !$response || $response.statusCode != 200) {
  var errCode = (typeof $response !== "undefined" && $response) ? $response.statusCode : "No Response";
  $done({
    title: "网络错误",
    subtitle: "HTTP 状态码: " + errCode,
    ip: "",
    description: "无法从 http://ipwho.is/?lang=zh-CN 获取数据。\n状态码: " + errCode
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
    if (data.success === false) {
      $done({
        title: "IP 查询提示: " + (data.message || "未知错误"),
        subtitle: data.ip ? ("出口 IP: " + data.ip) : "查询失败",
        ip: data.ip || "",
        description: JSON.stringify(data, null, 2)
      });
    } else {
      var flag = "🌐";
      var code = data.country_code;
      if (code && typeof code === "string" && code.length === 2) {
        var upper = code.toUpperCase();
        if (upper === "TW") {
          flag = "🇨🇳";
        } else if (data.flag && data.flag.emoji) {
          flag = data.flag.emoji;
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
      var region = data.region || "";
      var city = data.city || "";

      // 标题行：国旗 + 城市, 国家
      var locTitle = "";
      if (city && country && city !== country) {
        locTitle = city + ", " + country;
      } else {
        locTitle = city || country || region || "未知位置";
      }
      var title = flag + " " + locTitle;

      // 副标题：ISP / 组织 + ASN
      var conn = data.connection || {};
      var isp = conn.isp || conn.org || "";
      var asn = conn.asn ? ("AS" + conn.asn) : "";

      var subtitle = "";
      if (isp && asn && isp.indexOf(asn) === -1) {
        subtitle = isp + " (" + asn + ")";
      } else {
        subtitle = isp || asn || "未知网络";
      }

      var ip = data.ip || "";

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

      if (conn.isp) descLines.push("ISP: " + conn.isp);
      if (conn.org && conn.org !== conn.isp) descLines.push("组织: " + conn.org);
      if (conn.asn) descLines.push("ASN: AS" + conn.asn);
      if (data.timezone && data.timezone.id) descLines.push("时区: " + data.timezone.id);
      if (data.postal) descLines.push("邮编: " + data.postal);

      $done({
        title: title,
        subtitle: subtitle,
        ip: ip,
        description: descLines.join("\n")
      });
    }
  }
}
