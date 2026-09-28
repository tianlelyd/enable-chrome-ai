const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('powershell -NoProfile -Command "(Get-Process chrome -ErrorAction SilentlyContinue | Select-Object -First 1).Path"').toString();
  console.log('Chrome Path:', output.trim());
} catch(e) {
  console.log('Error:', e.message);
}

// 检查当前使用的 Profile
const localStatePath = process.env.LOCALAPPDATA + '/Google/Chrome/User Data/Local State';
if (fs.existsSync(localStatePath)) {
  const ls = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
  console.log('last_active_profiles:', ls.profile?.last_active_profiles);
  console.log('info_cache names:', Object.keys(ls.profile?.info_cache || {}));
  console.log('enabled_labs_experiments:', ls.browser?.enabled_labs_experiments);
}
