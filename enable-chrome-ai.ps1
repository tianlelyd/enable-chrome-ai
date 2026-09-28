# Enable Chrome AI - Windows PowerShell 版本
# 通过修改 Chrome 的 Local State 文件来启用内置 Gemini AI 功能

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     Enable Chrome AI - Windows 版本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 递归函数：设置所有 is_glic_eligible 为 true
function Set-GlicEligible($obj) {
    if ($null -eq $obj) { return }
    
    if ($obj -is [System.Management.Automation.PSCustomObject] -or $obj -is [System.Collections.IDictionary]) {
        $props = if ($obj -is [System.Management.Automation.PSCustomObject]) { $obj.PSObject.Properties } else { $obj.Keys }
        foreach ($prop in $props) {
            $name = if ($obj -is [System.Management.Automation.PSCustomObject]) { $prop.Name } else { $prop }
            if ($name -eq "is_glic_eligible") {
                if ($obj -is [System.Management.Automation.PSCustomObject]) {
                    $obj.$name = $true
                } else {
                    $obj[$name] = $true
                }
            } else {
                $val = if ($obj -is [System.Management.Automation.PSCustomObject]) { $prop.Value } else { $obj[$name] }
                Set-GlicEligible $val
            }
        }
    } elseif ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
        foreach ($item in $obj) {
            Set-GlicEligible $item
        }
    }
}

# 1. 查找 Chrome 路径
$localAppData = $env:LOCALAPPDATA
$chromePaths = @(
    "$localAppData\Google\Chrome\User Data\Local State",
    "$localAppData\Google\Chrome SxS\User Data\Local State",
    "$localAppData\Google\Chrome Beta\User Data\Local State",
    "$localAppData\Google\Chrome Dev\User Data\Local State"
)

$foundPaths = @()
foreach ($p in $chromePaths) {
    if (Test-Path -Path $p) {
        $foundPaths += $p
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "[ERROR] 未找到任何 Chrome 配置文件 (Local State)" -ForegroundColor Red
    Write-Host "请确保已安装 Google Chrome 并至少启动过一次。" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "[INFO] 找到 $($foundPaths.Count) 个 Chrome 配置文件" -ForegroundColor Blue
Write-Host ""

# 2. 关闭 Chrome
Write-Host "[INFO] 正在关闭所有 Chrome 进程（必须完全退出以防配置被覆盖）..." -ForegroundColor Blue
Get-Process -Name chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "[SUCCESS] Chrome 已关闭" -ForegroundColor Green
Write-Host ""

# 3. 处理每个配置文件
foreach ($file in $foundPaths) {
    Write-Host "[INFO] 正在处理: $file" -ForegroundColor Blue
    
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $backupFile = "$file.backup.$timestamp"
    Copy-Item -Path $file -Destination $backupFile -Force
    Write-Host "[INFO] 已备份到: $backupFile" -ForegroundColor DarkGray

    try {
        $rawContent = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        $json = $rawContent | ConvertFrom-Json -Depth 100

        # 设置地区为 us
        $json | Add-Member -NotePropertyName "variations_country" -NotePropertyValue "us" -Force
        Write-Host "[SUCCESS] 设置 variations_country = 'us'" -ForegroundColor Green

        # 设置 variations_permanent_consistency_country = ["1", "us"]
        $json | Add-Member -NotePropertyName "variations_permanent_consistency_country" -NotePropertyValue @("1", "us") -Force
        Write-Host "[SUCCESS] 设置 variations_permanent_consistency_country = ['1', 'us']" -ForegroundColor Green

        # 递归设置 is_glic_eligible
        Set-GlicEligible $json
        Write-Host "[SUCCESS] 设置所有 is_glic_eligible = true" -ForegroundColor Green

        # 保存
        $newJsonStr = $json | ConvertTo-Json -Depth 100 -Compress:$false
        [System.IO.File]::WriteAllText($file, $newJsonStr, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "[SUCCESS] 修改完成！" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "[ERROR] 处理失败: $_" -ForegroundColor Red
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "全部操作完成！" -ForegroundColor Green
Write-Host "现在你可以重新打开 Chrome 浏览器。" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
