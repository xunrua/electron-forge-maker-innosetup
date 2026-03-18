# 自定义脚本输出文档

本文档详细说明如何使用自定义 Inno Setup 脚本、输出目录的处理机制，以及 Maker 如何查找生成的安装程序。

## 目录

- [概述](#概述)
- [使用自定义 ISS 脚本](#使用自定义-iss-脚本)
- [输出目录处理](#输出目录处理)
- [安装程序查找机制](#安装程序查找机制)
- [自定义输出配置](#自定义输出配置)
- [完整示例](#完整示例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 概述

`electron-forge-maker-innosetup` 支持两种工作模式：

1. **配置生成模式** - 使用 TypeScript 配置对象，Maker 自动生成 ISS 脚本
2. **自定义脚本模式** - 使用现有的 `.iss` 脚本文件，Maker 直接编译

当使用自定义脚本时，Maker 需要正确处理：

- 脚本中定义的输出目录
- 查找编译生成的安装程序文件
- 与 Electron Forge 工作流程的集成

---

## 使用自定义 ISS 脚本

### 基本用法

通过 `scriptPath` 配置项指定自定义脚本：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
  makers: [
    new MakerInnosetup(
      {
        scriptPath: "./installer.iss",
      },
      ["win32"]
    ),
  ],
};

export default config;
```

### 或者在 forge.config.js 中：

```javascript
module.exports = {
  makers: [
    {
      name: "electron-forge-maker-innosetup",
      config: {
        scriptPath: "./installer.iss",
      },
    },
  ],
};
```

### 自定义脚本示例

```iss
; installer.iss
#define MyAppName "My Electron App"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "My Company"
#define MyAppExeName "MyApp.exe"

[Setup]
AppId={{8A69D345-D564-463C-AFF1-A69D9E530F96}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE.txt
InfoBeforeFile=README.txt
OutputDir=dist\installers
OutputBaseFilename={#MyAppName}_{#MyAppVersion}_Setup
SetupIconFile=assets\icon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "out\MyApp-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
```

---

## 输出目录处理

### OutputDir 解析流程

当使用自定义脚本时，Maker 会解析脚本中的 `OutputDir` 设置来查找生成的安装程序：

```
┌─────────────────────────────────────────────────────────────┐
│                    自定义脚本处理流程                         │
├─────────────────────────────────────────────────────────────┤
│  1. 读取 scriptPath 指定的 ISS 文件                           │
│                           ↓                                  │
│  2. 解析 [Setup] 节中的 OutputDir                            │
│                           ↓                                  │
│  3. 判断 OutputDir 类型：                                     │
│     - 绝对路径 → 直接使用                                      │
│     - 相对路径 → 基于脚本所在目录解析                          │
│                           ↓                                  │
│  4. 编译 ISS 脚本                                             │
│                           ↓                                  │
│  5. 在 OutputDir 目录中查找安装程序                           │
└─────────────────────────────────────────────────────────────┘
```

### OutputDir 示例

**绝对路径：**

```iss
[Setup]
OutputDir=C:\Build\Output
```

安装程序将生成在 `C:\Build\Output\` 目录，Maker 会在此目录查找。

**相对路径：**

```iss
[Setup]
OutputDir=dist\installers
```

如果脚本位于 `E:\project\installer.iss`，则：

- OutputDir 解析为 `E:\project\dist\installers\`
- Maker 会在此目录查找安装程序

**未指定 OutputDir：**

如果脚本未指定 `OutputDir`，Maker 会使用默认输出目录：

```
{makeDir}/innosetup.windows/{arch}/
```

### 解析代码逻辑

Maker 使用以下逻辑解析自定义脚本的 OutputDir：

```typescript
// 位于 MakerInnosetup.ts
if (this.config.scriptPath) {
  scriptPath = this.resolvePath(this.config.scriptPath, this.getProjectDir());

  // 解析脚本以获取输出目录
  try {
    const parsedConfig = InnoScriptParser.parseFile(scriptPath);
    if (parsedConfig.Setup.OutputDir) {
      actualOutputDir = path.isAbsolute(parsedConfig.Setup.OutputDir)
        ? parsedConfig.Setup.OutputDir
        : path.resolve(path.dirname(scriptPath), parsedConfig.Setup.OutputDir);
    }
  } catch (err) {
    // 解析失败时使用默认目录
  }
}
```

---

## 安装程序查找机制

### 查找顺序

Maker 按以下顺序查找生成的安装程序：

```
┌─────────────────────────────────────────────────────────────┐
│                  安装程序查找流程                             │
├─────────────────────────────────────────────────────────────┤
│  1. 尝试预期文件名格式：                                       │
│     - {appName}-{version}-{arch}-setup.exe                   │
│     - {appName}_{version}.exe                                │
│     - {appName}-{version}.exe                                │
│                           ↓                                  │
│  2. 在 OutputDir 目录中搜索 .exe 文件                         │
│                           ↓                                  │
│  3. 尝试子目录 innosetup.windows/{arch}/                     │
│                           ↓                                  │
│  4. 未找到 → 抛出 InstallerNotFoundError                     │
└─────────────────────────────────────────────────────────────┘
```

### 文件名格式说明

Maker 会尝试以下文件名格式（按顺序）：

| 格式                                   | 示例                        | 说明       |
| -------------------------------------- | --------------------------- | ---------- |
| `{appName}-{version}-{arch}-setup.exe` | `MyApp-1.0.0-x64-setup.exe` | 默认格式   |
| `{appName}_{version}.exe`              | `MyApp_1.0.0.exe`           | 下划线分隔 |
| `{appName}-{version}.exe`              | `MyApp-1.0.0.exe`           | 无架构信息 |

### 自定义输出文件名

在 ISS 脚本中使用 `OutputBaseFilename` 自定义文件名：

```iss
[Setup]
OutputBaseFilename=MyCustomInstaller_v1.0.0
```

生成的文件将是 `MyCustomInstaller_v1.0.0.exe`。

### 查找代码逻辑

```typescript
private findInstaller(
  searchDir: string,
  appName: string,
  appVersion: string,
  archId: string
): string[] {
  // 尝试预期的文件名格式
  const expectedNames = [
    `${appName}-${appVersion}-${archId}-setup.exe`,
    `${appName}_${appVersion}.exe`,
    `${appName}-${appVersion}.exe`,
  ];

  for (const expectedName of expectedNames) {
    const expectedPath = path.join(searchDir, expectedName);
    if (fileExists(expectedPath)) {
      return [expectedPath];
    }
  }

  // 搜索目录中的所有 .exe 文件
  const searchInDir = (dir: string): string[] => {
    if (!fileExists(dir)) return [];
    const files = fs.readdirSync(dir);
    return files.filter((f) => f.endsWith(".exe")).map((f) => path.join(dir, f));
  };

  // 在当前目录搜索
  let exeFiles = searchInDir(searchDir);

  // 如果没找到，尝试搜索子目录
  if (exeFiles.length === 0) {
    const subDir = path.join(searchDir, "innosetup.windows", archId);
    exeFiles = searchInDir(subDir);
  }

  if (exeFiles.length > 0) {
    return exeFiles;
  }

  throw new InstallerNotFoundError(searchDir);
}
```

---

## 自定义输出配置

### 覆盖脚本中的 OutputDir

可以通过 Maker 配置覆盖脚本中的输出目录：

```typescript
new MakerInnosetup({
  scriptPath: "./installer.iss",

  // 覆盖脚本中的 OutputDir
  outputDir: "./custom-output",
});
```

**注意：** 如果同时设置了配置中的 `outputDir` 和脚本中的 `OutputDir`，配置中的优先级更高。

### 使用环境变量

在 ISS 脚本中使用环境变量：

```iss
[Setup]
; 使用环境变量
OutputDir={#OutputDir}
```

```typescript
// 在 Forge 配置中设置环境变量
process.env.OUTPUT_DIR = "./dist/installers";

new MakerInnosetup({
  scriptPath: "./installer.iss",
});
```

### 多架构输出

为不同架构生成独立的安装程序：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
  makers: [
    // x64 架构
    new MakerInnosetup(
      {
        scriptPath: "./installer-x64.iss",
        outputDir: "./dist/x64",
      },
      ["win32"]
    ),
    // ia32 架构
    new MakerInnosetup(
      {
        scriptPath: "./installer-ia32.iss",
        outputDir: "./dist/ia32",
      },
      ["win32"]
    ),
  ],
};
```

---

## 完整示例

### 示例 1：使用现有 ISS 脚本

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
  makers: [
    new MakerInnosetup(
      {
        // 使用现有的 ISS 脚本
        scriptPath: "./scripts/installer.iss",
      },
      ["win32"]
    ),
  ],
};

export default config;
```

**对应的 ISS 脚本：**

```iss
; scripts/installer.iss
#define MyAppName "My App"
#define MyAppVersion "1.0.0"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\{#MyAppName}
OutputDir=..\dist\installers
OutputBaseFilename={#MyAppName}_{#MyAppVersion}_Setup
SetupIconFile=..\assets\icon.ico

[Files]
Source: "..\out\MyApp-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\MyApp.exe"

[Run]
Filename: "{app}\MyApp.exe"; Flags: nowait postinstall skipifsilent
```

### 示例 2：结合配置对象和脚本

```typescript
import { MakerInnosetup, InnoScriptParser } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

// 解析现有脚本
const baseConfig = InnoScriptParser.parseFile("./installer.iss");

// 修改配置
if (baseConfig.Setup) {
  baseConfig.Setup.AppVersion = "2.0.0";
  baseConfig.Setup.OutputBaseFilename = "MyApp_2.0.0_Setup";
}

const config: ForgeConfig = {
  makers: [
    new MakerInnosetup(
      {
        config: baseConfig,
        outputDir: "./dist/v2",
      },
      ["win32"]
    ),
  ],
};

export default config;
```

### 示例 3：动态生成脚本路径

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";
import * as path from "path";

const config: ForgeConfig = {
  makers: [
    new MakerInnosetup(
      {
        // 根据环境选择不同的脚本
        scriptPath:
          process.env.NODE_ENV === "production" ? "./installer-prod.iss" : "./installer-dev.iss",
      },
      ["win32"]
    ),
  ],
};

export default config;
```

### 示例 4：处理多个输出文件

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

// ISS 脚本配置了磁盘分卷
// OutputBaseFilename=MyApp_Setup
// DiskSpanning=yes

const config: ForgeConfig = {
  makers: [
    new MakerInnosetup(
      {
        scriptPath: "./installer-with-spanning.iss",
      },
      ["win32"]
    ),
  ],
};

// Maker 会返回所有生成的 .exe 文件
// 例如：['MyApp_Setup.exe', 'MyApp_Setup-1.bin', 'MyApp_Setup-2.bin']
```

---

## 最佳实践

### 1. 使用相对路径

在 ISS 脚本中使用相对路径，确保项目可移植：

```iss
[Setup]
; 推荐：使用相对路径
OutputDir=dist\installers
SetupIconFile=assets\icon.ico

; 不推荐：使用硬编码的绝对路径
; OutputDir=C:\Projects\MyApp\dist\installers
```

### 2. 统一输出命名

使用一致的文件命名规范：

```iss
#define MyAppName "MyApp"
#define MyAppVersion "1.0.0"
#define MyAppArch "x64"

[Setup]
OutputBaseFilename={#MyAppName}_{#MyAppVersion}_{#MyAppArch}_Setup
```

### 3. 版本号管理

从 package.json 同步版本号：

```typescript
import { MakerInnosetup, InnoScriptParser } from "electron-forge-maker-innosetup";
import * as fs from "fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const baseConfig = InnoScriptParser.parseFile("./installer.iss");

// 同步版本号
if (baseConfig.Setup) {
  baseConfig.Setup.AppVersion = packageJson.version;
}

// 更新 Defines
if (baseConfig.Defines) {
  baseConfig.Defines.MyAppVersion = packageJson.version;
}
```

### 4. 测试输出目录

在开发环境中测试输出目录配置：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import * as path from "path";
import * as fs from "fs";

const outputDir = "./dist/installers";

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const config = new MakerInnosetup({
  scriptPath: "./installer.iss",
  outputDir,
});
```

### 5. 日志和调试

启用调试日志了解查找过程：

```typescript
// 设置环境变量启用调试
process.env.DEBUG = "electron-forge-maker-innosetup:*";

import { MakerInnosetup } from "electron-forge-maker-innosetup";
```

---

## 故障排除

### 问题 1：找不到生成的安装程序

**错误信息：**

```
InstallerNotFoundError: 在 xxx 中未找到生成的安装包
```

**可能原因：**

1. **OutputDir 配置错误**
   - 检查 ISS 脚本中的 `OutputDir` 设置
   - 确保目录路径正确且存在

2. **文件名不匹配**
   - Maker 预期的文件名格式与实际生成的不一致
   - 检查 `OutputBaseFilename` 设置

3. **权限问题**
   - 确保有写入输出目录的权限

**解决方案：**

```typescript
// 方法 1：手动指定输出目录
new MakerInnosetup({
  scriptPath: "./installer.iss",
  outputDir: "./dist/installers", // 明确指定
});

// 方法 2：使用标准文件名格式
// 在 ISS 中：
// OutputBaseFilename=MyApp-1.0.0-x64-setup
```

### 问题 2：输出目录解析错误

**症状：** 安装程序生成了，但 Maker 找不到

**原因：** 相对路径基于错误的工作目录解析

**解决方案：**

```typescript
new MakerInnosetup({
  scriptPath: "./installer.iss",
  paths: {
    projectDir: process.cwd(), // 明确指定项目目录
  },
});
```

### 问题 3：脚本编译失败

**错误信息：**

```
CompilationError: Inno Setup 编译失败
```

**排查步骤：**

1. 检查 ISS 脚本语法
2. 验证脚本中引用的文件是否存在
3. 检查 Inno Setup 编译器版本

```typescript
// 测试脚本编译
import { InnoScriptParser } from "electron-forge-maker-innosetup";

try {
  const config = InnoScriptParser.parseFile("./installer.iss");
  console.log("脚本解析成功:", config.Setup);
} catch (error) {
  console.error("脚本解析失败:", error);
}
```

### 问题 4：多架构输出混乱

**症状：** 不同架构的安装程序相互覆盖

**解决方案：**

```typescript
// 为不同架构使用不同的输出目录
const config: ForgeConfig = {
  makers: [
    new MakerInnosetup({
      scriptPath: "./installer.iss",
      outputDir: "./dist/installers/x64",
    }),
  ],
};

// 在 ISS 中也配置不同的输出
// OutputBaseFilename=MyApp-{#Arch}-Setup
```

---

## 相关文档

- [README.md](../README.md) - 项目概览和基本使用
- [path-resolution.md](./path-resolution.md) - 路径解析详细文档
- [iss-parser.md](./iss-parser.md) - ISS 解析器文档

## 参考资料

- [Inno Setup Setup 段落文档](https://jrsoftware.org/ishelp/topic_setup_section.htm)
- [Inno Setup 输出目录设置](https://jrsoftware.org/ishelp/topic_setup_outputdir.htm)
- [Electron Forge Makers 文档](https://www.electronforge.io/config/makers)
