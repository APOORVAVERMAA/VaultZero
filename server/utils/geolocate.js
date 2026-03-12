const logger = require('./logger');

const isPrivateIP = (ip) => {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '');
  return ['::1', '127.0.0.1', 'localhost'].includes(clean) ||
    clean.startsWith('192.168.') || clean.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(clean);
};

const getLocation = async (ip) => {
  try {
    if (isPrivateIP(ip)) {
      return { city: 'Local', region: '', country: 'Development' };
    }
    const cleanIp = ip.replace(/^::ffff:/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=city,regionName,country,status`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        city: data.city || 'Unknown',
        region: data.regionName || '',
        country: data.country || 'Unknown',
      };
    }
    return { city: 'Unknown', region: '', country: 'Unknown' };
  } catch (err) {
    logger.error(err, 'Geolocation lookup failed');
    return { city: 'Unknown', region: '', country: 'Unknown' };
  }
};

const formatLocation = (loc) => {
  if (!loc) return 'Unknown';
  return [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Unknown';
};

const formatTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
};

module.exports = { getLocation, formatLocation, formatTime };
