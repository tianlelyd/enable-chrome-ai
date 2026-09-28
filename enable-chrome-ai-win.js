const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================');
console.log('     Enable Chrome AI (深度修复与启用版)');
console.log('==========================================\n');

// 1. 递归设置 is_glic_eligible = true
function updateGlicEligible(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(updateGlicEligible);
  } else {
    for (const key of Object.keys(obj)) {
      if (key === 'is_glic_eligible') {
        obj[key] = true;
      } else {
        updateGlicEligible(obj[key]);
      }
    }
  }
}

// 2. 检查 Chrome 路径
const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) {
  console.error('[ERROR] 未找到 LOCALAPPDATA 环境变量');
  process.exit(1);
}

const chromeUserDataDirs = [
  path.join(localAppData, 'Google', 'Chrome', 'User Data'),
  path.join(localAppData, 'Google', 'Chrome SxS', 'User Data'),
  path.join(localAppData, 'Google', 'Chrome Beta', 'User Data'),
  path.join(localAppData, 'Google', 'Chrome Dev', 'User Data')
].filter(p => fs.existsSync(p));

if (chromeUserDataDirs.length === 0) {
  console.error('[ERROR] 未找到任何 Chrome 用户数据目录');
  process.exit(1);
}

// 3. 关闭 Chrome 进程
console.log('[INFO] 正在关闭所有 Chrome 进程...');
try {
  execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
  console.log('[SUCCESS] 已关闭 Chrome 进程');
} catch (e) {
  console.log('[INFO] Chrome 当前未运行');
}

// 4. 处理每个 User Data 目录
for (const udir of chromeUserDataDirs) {
  console.log(`\n[INFO] 正在处理 Chrome 目录: ${udir}`);

  // (1) 处理 Local State（严格对齐原项目 lcandy2/enable-chrome-ai 逻辑）
  const localStatePath = path.join(udir, 'Local State');
  if (fs.existsSync(localStatePath)) {
    try {
      const raw = fs.readFileSync(localStatePath, 'utf8');
      const data = JSON.parse(raw);

      // 读取真实 Chrome 版本号（关键：variations 一致性种子必须匹配当前版本）
      const lastVersionPath = path.join(udir, 'Last Version');
      let lastVersion = null;
      if (fs.existsSync(lastVersionPath)) {
        lastVersion = fs.readFileSync(lastVersionPath, 'utf8').trim();
      }

      // 1. 递归设置所有 is_glic_eligible = true
      updateGlicEligible(data);

      // 2. 设置 variations_country = "us"
      data.variations_country = 'us';

      // 3. variations_permanent_consistency_country[0] = 当前版本号, [1] = "us"
      //    （第一项必须是真实版本号，否则 Chrome 会判定 variations 数据无效并重置）
      if (lastVersion) {
        data.variations_permanent_consistency_country = [lastVersion, 'us'];
      } else if (Array.isArray(data.variations_permanent_consistency_country)) {
        data.variations_permanent_consistency_country[1] = 'us';
      } else {
        data.variations_permanent_consistency_country = ['0', 'us'];
      }
      // 4. variations_safe_seed 系列也必须改为 us（关键：Chrome 153+ 会用 safe_seed_session 判定地区）
      //    safe_seed_permanent 的第一项同样必须匹配真实版本号
      if (lastVersion) {
        data.variations_safe_seed_permanent_consistency_country = [lastVersion, 'us'];
      }
      data.variations_safe_seed_session_consistency_country = 'us';
      data.variations_safe_seed_locale = 'en-US';

      // 5. variations_permanent_overridden_country = "us"（PR #28 新增字段）
      data.variations_permanent_overridden_country = 'us';

      // 6. 追加 GLIC labs 实验到 browser.enabled_labs_experiments（保留已有值）
      if (!data.browser) data.browser = {};
      if (!Array.isArray(data.browser.enabled_labs_experiments)) {
        data.browser.enabled_labs_experiments = [];
      }
      const labsExperiments = ['glic@1', 'glic-actor@1', 'glic-entrypoint-variations@1'];
      for (const exp of labsExperiments) {
        if (!data.browser.enabled_labs_experiments.includes(exp)) {
          data.browser.enabled_labs_experiments.push(exp);
        }
      }

      // 启用 glic launcher
      if (!data.glic) data.glic = {};
      data.glic.launcher_enabled = true;

      fs.writeFileSync(localStatePath, JSON.stringify(data, null, 2), 'utf8');
      console.log('[SUCCESS] 已修复并写入 Local State (版本: ' + lastVersion + ')');
    } catch (err) {
      console.error('[ERROR] 处理 Local State 失败:', err.message);
    }
  }

  // (2) 扫描所有 Profile 目录修复 Preferences
  try {
    const entries = fs.readdirSync(udir, { withFileTypes: true });
    const profileDirs = entries
      .filter(e => e.isDirectory() && (e.name === 'Default' || e.name.startsWith('Profile ')))
      .map(e => path.join(udir, e.name));

    for (const pdir of profileDirs) {
      const prefPath = path.join(pdir, 'Preferences');
      if (fs.existsSync(prefPath)) {
        try {
          const prefRaw = fs.readFileSync(prefPath, 'utf8');
          const prefData = JSON.parse(prefRaw);

          if (!prefData.glic) prefData.glic = {};
          prefData.glic.previously_not_allowed = false;
          prefData.glic.pinned_to_tabstrip = true;
          prefData.glic.microphone_enabled = true;
          prefData.glic.user_enabled_actuation_on_web = true;
          if (prefData.glic.profile_enablement) {
            prefData.glic.profile_enablement.last_ready_state = 3;
          }

          // PR #28: sync.glic_rollout_eligibility = true, browser.gemini_settings = 0
          if (!prefData.sync) prefData.sync = {};
          prefData.sync.glic_rollout_eligibility = true;
          if (!prefData.browser) prefData.browser = {};
          prefData.browser.gemini_settings = 0;

          fs.writeFileSync(prefPath, JSON.stringify(prefData, null, 2), 'utf8');
          console.log(`[SUCCESS] 已重置并激活配置: ${path.basename(pdir)}/Preferences`);
        } catch (perr) {
          console.error(`[WARN] 修复 ${pdir} 失败:`, perr.message);
        }
      }
    }
  } catch (e) {
    console.error('[WARN] 遍历 Profile 失败:', e.message);
  }
}

console.log('\n==========================================');
console.log('🎉 深度配置修复已全部完成！');
console.log('==========================================\n');
