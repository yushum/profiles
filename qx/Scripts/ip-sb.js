/**
 * Quantumult X geo_location_checker script for IP.SB (https://api.ip.sb/geoip)
 *
 * Input:
 *   $response.statusCode (number)
 *   $response.body       (string: JSON from https://api.ip.sb/geoip)
 * Output:
 *   $done({ title, subtitle, ip, description })
 *
 * Licensed under AGPL-3.0-or-later.
 */

(function () {
  if (typeof $response === 'undefined' || $response.statusCode !== 200) {
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

  function getFlag(code) {
    if (!code || typeof code !== 'string' || code.length !== 2) {
      return '🌐';
    }
    var upper = code.toUpperCase();
    if (upper === 'TW') return '🇨🇳';
    var c1 = upper.charCodeAt(0);
    var c2 = upper.charCodeAt(1);
    if (c1 < 65 || c1 > 90 || c2 < 65 || c2 > 90) return '🌐';
    return String.fromCodePoint(0x1f1e6 + c1 - 65, 0x1f1e6 + c2 - 65);
  }

  var flag = getFlag(data.country_code);
  var city = data.city || data.region || data.country || 'Unknown';
  var country = data.country || data.country_code || '';
  var title = flag + ' ' + (city !== country && country ? city + ', ' + country : city);

  var org = data.organization || data.asn_organization || data.isp || 'Unknown';
  var asn = data.asn ? 'AS' + data.asn : '';
  var subtitle = asn ? org + ' (' + asn + ')' : org;

  var ip = data.ip || '';

  var descLines = [];
  if (data.ip) descLines.push('IP: ' + data.ip);
  if (data.country) {
    var loc = data.country;
    if (data.region && data.region !== data.country) loc = data.region + ', ' + loc;
    if (data.city && data.city !== data.region) loc = data.city + ', ' + loc;
    descLines.push('位置: ' + flag + ' ' + loc);
  }
  if (org) descLines.push('组织: ' + org);
  if (data.isp && data.isp !== org) descLines.push('运营商: ' + data.isp);
  if (data.asn) descLines.push('ASN: AS' + data.asn + (data.asn_organization ? ' (' + data.asn_organization + ')' : ''));
  if (data.timezone) descLines.push('时区: ' + data.timezone);

  var description = descLines.join('\n');

  $done({
    title: title,
    subtitle: subtitle,
    ip: ip,
    description: description
  });
})();
