const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('正在彻底关闭 Chrome 后台残留进程...');
try {
  execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
} catch (e) {}

const localStatePath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Local State');
if (fs.existsSync(localStatePath)) {
  const data = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));

  data.variations_country = 'us';
  data.variations_permanent_consistency_country = ['1', 'us'];
  data.variations_safe_seed_permanent_consistency_country = ['1', 'us'];
  data.variations_safe_seed_session_consistency_country = 'us';

  if (!data.browser) data.browser = {};
  
  // 注入所有 Glic 和 Gemini 相关 flags
  const flags = [
    'glic@1',
    'glic-actor@1',
    'glic-actor-autofill@1',
    'glic-actor-cursor@1',
    'glic-selection-prompt@1',
    'glic-toolbar-height-side-panel@1',
    'glic-guest@1',
    'glic-pinned@1',
    'prompt-api@1',
    'optimization-guide-on-device-model@1'
  ];

  const current = new Set(data.browser.enabled_labs_experiments || []);
  flags.forEach(f => current.add(f));
  data.browser.enabled_labs_experiments = Array.from(current);

  if (!data.glic) data.glic = {};
  data.glic.launcher_enabled = true;

  // 遍历递归 is_glic_eligible
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else {
      for (const k of Object.keys(obj)) {
        if (k === 'is_glic_eligible') obj[k] = true;
        else walk(obj[k]);
      }
    }
  }
  walk(data);

  fs.writeFileSync(localStatePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Local State 实验特性与国家代码全部注入成功！');
}

// 修复 Default Preferences
const defaultPrefPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Preferences');
if (fs.existsSync(defaultPrefPath)) {
  const pref = JSON.parse(fs.readFileSync(defaultPrefPath, 'utf8'));
  if (!pref.glic) pref.glic = {};
  pref.glic.previously_not_allowed = false;
  pref.glic.pinned_to_tabstrip = true;
  pref.glic.microphone_enabled = true;
  pref.glic.user_enabled_actuation_on_web = true;
  if (!pref.glic.profile_enablement) pref.glic.profile_enablement = {};
  pref.glic.profile_enablement.last_ready_state = 3;
  fs.writeFileSync(defaultPrefPath, JSON.stringify(pref, null, 2), 'utf8');
  console.log('Default Preferences 修复完成！');
}
