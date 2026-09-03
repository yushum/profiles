/**
 * Quantumult X geo_location_checker script for ipinfo.io
 * Endpoint: http://ipinfo.io/json
 *
 * Industry gold-standard IP database, updated daily.
 * Licensed under AGPL-3.0-or-later.
 */

if (typeof $response === "undefined" || !$response || $response.statusCode != 200) {
  var errCode = (typeof $response !== "undefined" && $response) ? $response.statusCode : "No Response";
  $done({
    title: "网络错误",
    subtitle: "HTTP 状态码: " + errCode,
    ip: "",
    description: "无法从 http://ipinfo.io/json 获取数据。\n状态码: " + errCode
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
    if (data.error) {
      $done({
        title: "IPInfo 提示: " + (data.error.title || "请求失败"),
        subtitle: data.error.message || "",
        ip: data.ip || "",
        description: JSON.stringify(data.error, null, 2)
      });
    } else {
      var flag = "🌐";
      var code = data.country;
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

      var city = data.city || "";
      var region = data.region || "";
      var country = data.country || "";

      // 标题行：国旗 + 城市, 国家
      var locTitle = "";
      if (city && country && city !== country) {
        locTitle = city + ", " + country;
      } else {
        locTitle = city || region || country || "未知位置";
      }
      var title = flag + " " + locTitle;

      // 副标题：ASN 与组织 (如 "AS906 DMIT Cloud Services")
      var org = data.org || "";
      var subtitle = org || "未知网络";

      var ip = data.ip || "";

      // 弹窗详情
      var descLines = [];
      if (ip) descLines.push("出口 IP: " + ip);
      if (data.hostname) descLines.push("主机名: " + data.hostname);

      var fullLoc = [];
      if (country) fullLoc.push(country);
      if (region && region !== country) fullLoc.push(region);
      if (city && city !== region) fullLoc.push(city);
      if (fullLoc.length > 0) {
        descLines.push("位置: " + flag + " " + fullLoc.join(" · "));
      }

      if (org) descLines.push("组织: " + org);
      if (data.timezone) descLines.push("时区: " + data.timezone);
      if (data.postal) descLines.push("邮编: " + data.postal);
      if (data.loc) descLines.push("经纬度: " + data.loc);

      $done({
        title: title,
        subtitle: subtitle,
        ip: ip,
        description: descLines.join("\n")
      });
    }
  }
}
