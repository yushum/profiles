/**
 * Quantumult X geo_location_checker script for ip-api.com
 * Endpoint: http://ip-api.com/json/?lang=zh-CN
 *
 * Input:
 *   $response.statusCode (number)
 *   $response.body       (string: JSON from ip-api.com)
 * Output:
 *   $done({ title, subtitle, ip, description })
 *
 * Licensed under AGPL-3.0-or-later.
 */

(function () {
  if (typeof $response === "undefined" || $response.statusCode !== 200) {
    $done(null);
    return;
  }

  var data;
  try {
    data = JSON.parse($response.body);
  } catch (e) {
    $done(null);
    return;
  }

  if (data.status !== "success") {
    $done(null);
    return;
  }

  function getFlag(code) {
    if (!code || typeof code !== "string" || code.length !== 2) return "🌐";
    var upper = code.toUpperCase();
    if (upper === "TW") return "🇨🇳";
    var c1 = upper.charCodeAt(0);
    var c2 = upper.charCodeAt(1);
    if (c1 < 65 || c1 > 90 || c2 < 65 || c2 > 90) return "🌐";
    return String.fromCodePoint(0x1f1e6 + c1 - 65, 0x1f1e6 + c2 - 65);
  }

  var flag = getFlag(data.countryCode);
  var country = data.country || "";
  var region = data.regionName || "";
  var city = data.city || "";

  // 标题行：国旗 + 城市/国家（例如 "🇺🇸 洛杉矶, 美国" 或 "🇭🇰 香港"）
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

  // 弹窗详细信息
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

  var description = descLines.join("\n");

  $done({
    title: title,
    subtitle: subtitle,
    ip: ip,
    description: description
  });
})();
