const fs = require('fs');
const path = require('path');
const chrome = require('chrome-cookies-secure');

const NETSCAPE_HEADER = `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This file was generated automatically`;
const COOKIES_FILE = path.resolve(__dirname, 'youtube_cookies.txt');

function toNetscapeLines(cookies) {
  const lines = [NETSCAPE_HEADER];
  for (const c of cookies) {
    // Fallbacks
    const domain = c.domain || '.youtube.com';
    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const cookiePath = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expiry = Math.floor((c.expires || c.expirationDate || 0));
    const name = c.name || '';
    const value = c.value || '';
    lines.push(`${domain}\t${includeSubdomains}\t${cookiePath}\t${secure}\t${expiry}\t${name}\t${value}`);
  }
  return lines.join('\n');
}

function writeNetscapeFile(cookies) {
  const content = toNetscapeLines(cookies);
  fs.writeFileSync(COOKIES_FILE, content, 'utf8');
}

async function refreshCookies(browser = 'chrome') {
  return new Promise((resolve, reject) => {
    chrome.getCookies('https://www.youtube.com', 'json', (err, cookies) => {
      if (err) return reject(err);
      try {
        writeNetscapeFile(cookies || []);
        resolve(true);
      } catch (e) {
        reject(e);
      }
    }, { browser });
  });
}

function fileAgeHours(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs / (1000 * 60 * 60);
  } catch {
    return Infinity;
  }
}

async function refreshCookiesIfNeeded(options = { maxAgeHours: 168, preferredBrowser: 'chrome' }) { // 7 días
  const { maxAgeHours, preferredBrowser } = options;
  const age = fileAgeHours(COOKIES_FILE);
  if (!isFinite(age) || age > maxAgeHours) {
    try {
      await refreshCookies(preferredBrowser);
      return true;
    } catch (e1) {
      // Intentar Edge como fallback
      try {
        await refreshCookies('edge');
        return true;
      } catch (e2) {
        return false;
      }
    }
  }
  return false;
}

module.exports = {
  refreshCookies,
  refreshCookiesIfNeeded,
  COOKIES_FILE,
};
