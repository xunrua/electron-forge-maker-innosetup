# ISS 解析器文档

本文档详细说明 `electron-forge-maker-innosetup` 的 Inno Setup 脚本（`.iss`）解析器功能，包括 API 使用方法、支持的段落、配置转换等。

## 目录

- [概述](#概述)
- [API 参考](#api-参考)
- [支持的段落](#支持的段落)
- [解析选项](#解析选项)
- [预处理器常量](#预处理器常量)
- [从 ISS 创建 Maker 配置](#从-iss-创建-maker-配置)
- [错误处理](#错误处理)
- [完整示例](#完整示例)
- [最佳实践](#最佳实践)

---

## 概述

`InnoScriptParser` 类提供了将现有的 `.iss` 脚本文件解析为 TypeScript 配置对象的能力。这使得开发者可以：

1. **复用现有脚本** - 将已有的 Inno Setup 脚本转换为 Maker 配置
2. **迁移项目** - 从传统 Inno Setup 项目迁移到 Electron Forge
3. **脚本分析** - 分析和检查 ISS 脚本结构
4. **配置转换** - 在脚本和配置对象之间双向转换

### 导入解析器

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";
```

---

## API 参考

### InnoScriptParser 类

#### 静态方法

##### `parseFile(filePath: string): InnoSetupConfig`

解析指定的 ISS 文件。

**参数：**

- `filePath` - ISS 文件的路径

**返回：**

- `InnoSetupConfig` - 解析后的配置对象

**异常：**

- `ParseError` - 文件不存在或解析失败

**示例：**

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";

try {
  const config = InnoScriptParser.parseFile("./installer.iss");
  console.log("应用名称:", config.Setup.AppName);
  console.log("版本:", config.Setup.AppVersion);
} catch (error) {
  console.error("解析失败:", error.message);
}
```

---

##### `parse(content: string, options?: ParseOptions): InnoSetupConfig`

解析 ISS 脚本内容字符串。

**参数：**

- `content` - ISS 脚本内容
- `options` - 解析选项（可选）
  - `preserveDefineReferences` - 是否保留预处理器引用（默认 `true`）

**返回：**

- `InnoSetupConfig` - 解析后的配置对象

**示例：**

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";
import * as fs from "fs";

const issContent = fs.readFileSync("./installer.iss", "utf-8");

const config = InnoScriptParser.parse(issContent, {
  preserveDefineReferences: true, // 保留 {#MyApp} 引用
});

console.log("配置:", JSON.stringify(config, null, 2));
```

---

## 支持的段落

解析器支持 Inno Setup 的所有主要段落：

### [Setup] - 安装配置

解析为 `InnoSetupSetupSection` 对象。

```iss
[Setup]
AppName=MyApp
AppVersion=1.0.0
DefaultDirName={autopf}\MyApp
PrivilegesRequired=admin
```

```typescript
// 解析结果
config.Setup = {
  AppName: "MyApp",
  AppVersion: "1.0.0",
  DefaultDirName: "{autopf}\\MyApp",
  PrivilegesRequired: "admin",
};
```

**布尔值自动转换：**

```iss
[Setup]
CreateAppDir=yes
Uninstallable=no
SolidCompression=true
```

```typescript
config.Setup = {
  CreateAppDir: true, // yes -> true
  Uninstallable: false, // no -> false
  SolidCompression: true, // true -> true
};
```

**数值自动转换：**

```iss
[Setup]
VersionInfoVersion=1.0.0.0
ExtraDiskSpaceRequired=1024000
```

```typescript
config.Setup = {
  VersionInfoVersion: "1.0.0.0", // 保持字符串
  ExtraDiskSpaceRequired: 1024000, // 数字自动转换
};
```

---

### [Languages] - 语言支持

解析为 `InnoSetupLanguage[]` 数组。

```iss
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"; LicenseFile: "license-zh.txt"
```

```typescript
config.Languages = [
  {
    Name: "english",
    MessagesFile: "compiler:Default.isl",
  },
  {
    Name: "chinesesimplified",
    MessagesFile: "compiler:Languages\\ChineseSimplified.isl",
    LicenseFile: "license-zh.txt",
  },
];
```

---

### [Tasks] - 任务

解析为 `InnoSetupTask[]` 数组。

```iss
[Tasks]
Name: "desktopicon"; Description: "创建桌面图标"; GroupDescription: "附加图标:"; Flags: unchecked
Name: "quicklaunchicon"; Description: "创建快速启动图标"; GroupDescription: "附加图标:"; Flags: unchecked
```

```typescript
config.Tasks = [
  {
    Name: "desktopicon",
    Description: "创建桌面图标",
    GroupDescription: "附加图标:",
    Flags: "unchecked",
  },
  {
    Name: "quicklaunchicon",
    Description: "创建快速启动图标",
    GroupDescription: "附加图标:",
    Flags: "unchecked",
  },
];
```

---

### [Types] - 安装类型

解析为 `InnoSetupType[]` 数组。

```iss
[Types]
Name: "full"; Description: "完整安装"
Name: "compact"; Description: "精简安装"
Name: "custom"; Description: "自定义安装"; Flags: iscustom
```

```typescript
config.Types = [
  { Name: "full", Description: "完整安装" },
  { Name: "compact", Description: "精简安装" },
  { Name: "custom", Description: "自定义安装", Flags: "iscustom" },
];
```

---

### [Components] - 组件

解析为 `InnoSetupComponent[]` 数组。

```iss
[Components]
Name: "main"; Description: "主程序文件"; Types: full compact custom; Flags: fixed
Name: "docs"; Description: "文档文件"; Types: full
Name: "plugins"; Description: "插件"; Types: full custom
```

```typescript
config.Components = [
  {
    Name: "main",
    Description: "主程序文件",
    Types: "full compact custom",
    Flags: "fixed",
  },
  { Name: "docs", Description: "文档文件", Types: "full" },
  { Name: "plugins", Description: "插件", Types: "full custom" },
];
```

---

### [Files] - 文件安装

解析为 `InnoSetupFile[]` 数组。

```iss
[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs; Components: docs
```

```typescript
config.Files = [
  {
    Source: "dist\\*",
    DestDir: "{app}",
    Flags: "ignoreversion recursesubdirs createallsubdirs",
  },
  {
    Source: "README.md",
    DestDir: "{app}",
    Flags: "ignoreversion",
  },
  {
    Source: "docs\\*",
    DestDir: "{app}\\docs",
    Flags: "ignoreversion recursesubdirs",
    Components: "docs",
  },
];
```

---

### [Dirs] - 目录创建

解析为 `InnoSetupDir[]` 数组。

```iss
[Dirs]
Name: "{app}\data"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
```

```typescript
config.Dirs = [
  {
    Name: "{app}\\data",
    Permissions: "users-modify",
  },
  {
    Name: "{app}\\logs",
    Permissions: "users-modify",
  },
];
```

---

### [Icons] - 快捷方式

解析为 `InnoSetupIcon[]` 数组。

```iss
[Icons]
Name: "{group}\MyApp"; Filename: "{app}\MyApp.exe"
Name: "{group}\卸载 MyApp"; Filename: "{uninstallexe}"
Name: "{autodesktop}\MyApp"; Filename: "{app}\MyApp.exe"; Tasks: desktopicon
```

```typescript
config.Icons = [
  {
    Name: "{group}\\MyApp",
    Filename: "{app}\\MyApp.exe",
  },
  {
    Name: "{group}\\卸载 MyApp",
    Filename: "{uninstallexe}",
  },
  {
    Name: "{autodesktop}\\MyApp",
    Filename: "{app}\\MyApp.exe",
    Tasks: "desktopicon",
  },
];
```

---

### [Registry] - 注册表

解析为 `InnoSetupRegistry[]` 数组。

```iss
[Registry]
Root: HKLM; Subkey: "Software\MyApp"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKCR; Subkey: ".myapp"; ValueType: string; ValueName: ""; ValueData: "MyAppFile"; Flags: uninsdeletekey
```

```typescript
config.Registry = [
  {
    Root: "HKLM",
    Subkey: "Software\\MyApp",
    ValueType: "string",
    ValueName: "InstallPath",
    ValueData: "{app}",
    Flags: "uninsdeletekey",
  },
  {
    Root: "HKCR",
    Subkey: ".myapp",
    ValueType: "string",
    ValueName: "",
    ValueData: "MyAppFile",
    Flags: "uninsdeletekey",
  },
];
```

---

### [Run] - 安装后运行

解析为 `InnoSetupRun[]` 数组。

```iss
[Run]
Filename: "{app}\MyApp.exe"; Description: "启动 MyApp"; Flags: nowait postinstall skipifsilent
Filename: "https://myapp.com/docs"; Description: "查看文档"; Flags: shellexec postinstall unchecked
```

```typescript
config.Run = [
  {
    Filename: "{app}\\MyApp.exe",
    Description: "启动 MyApp",
    Flags: "nowait postinstall skipifsilent",
  },
  {
    Filename: "https://myapp.com/docs",
    Description: "查看文档",
    Flags: "shellexec postinstall unchecked",
  },
];
```

---

### [INI] - INI 文件操作

解析为 `InnoSetupINI[]` 数组。

```iss
[INI]
Filename: "{app}\settings.ini"; Section: "Settings"; Key: "InstallDate"; String: "{code:GetCurrentDate}"
Filename: "{app}\settings.ini"; Section: "Settings"; Key: "Version"; String: "1.0.0"
```

```typescript
config.INI = [
  {
    Filename: "{app}\\settings.ini",
    Section: "Settings",
    Key: "InstallDate",
    String: "{code:GetCurrentDate}",
  },
  {
    Filename: "{app}\\settings.ini",
    Section: "Settings",
    Key: "Version",
    String: "1.0.0",
  },
];
```

---

### [InstallDelete] / [UninstallDelete] - 删除操作

解析为 `InnoSetupInstallDelete[]` 或 `InnoSetupUninstallDelete[]` 数组。

```iss
[InstallDelete]
Type: filesandordirs; Name: "{app}\old_folder"

[UninstallDelete]
Type: files; Name: "{app}\logs\*.log"
Type: dirifempty; Name: "{app}\logs"
```

```typescript
config.InstallDelete = [
  {
    Type: "filesandordirs",
    Name: "{app}\\old_folder",
  },
];

config.UninstallDelete = [
  {
    Type: "files",
    Name: "{app}\\logs\\*.log",
  },
  {
    Type: "dirifempty",
    Name: "{app}\\logs",
  },
];
```

---

### [Messages] / [CustomMessages] - 自定义消息

解析为键值对对象。

```iss
[Messages]
SetupWindowTitle=安装 %1
WelcomeLabel1=欢迎安装 %1

[CustomMessages]
LaunchProgram=启动 %1
```

```typescript
config.Messages = {
  SetupWindowTitle: "安装 %1",
  WelcomeLabel1: "欢迎安装 %1",
};

config.CustomMessages = {
  LaunchProgram: "启动 %1",
};
```

---

### [Code] - Pascal 脚本

解析为原始字符串。

```iss
[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  // 检查是否已安装
  if RegKeyExists(HKLM, 'Software\MyApp') then
  begin
    if MsgBox('检测到已安装，是否覆盖？', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;
```

```typescript
config.Code = `function InitializeSetup(): Boolean;
begin
  Result := True;
  // 检查是否已安装
  if RegKeyExists(HKLM, 'Software\\MyApp') then
  begin
    if MsgBox('检测到已安装，是否覆盖？', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;`;
```

---

## 解析选项

### preserveDefineReferences

控制是否保留预处理器常量引用。

**默认值：** `true`

**行为说明：**

- `true`（默认）- 保留 `{#ConstantName}` 引用，并将其定义存储在 `config.Defines` 中
- `false` - 将所有 `{#ConstantName}` 替换为实际值

**示例：**

```iss
#define MyAppName "My Electron App"
#define MyAppVersion "1.0.0"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
```

```typescript
// preserveDefineReferences: true（默认）
const config1 = InnoScriptParser.parse(content, { preserveDefineReferences: true });
// 结果：
// config1.Defines = { MyAppName: "My Electron App", MyAppVersion: "1.0.0" }
// config1.Setup.AppName = "{#MyAppName}"
// config1.Setup.AppVersion = "{#MyAppVersion}"

// preserveDefineReferences: false
const config2 = InnoScriptParser.parse(content, { preserveDefineReferences: false });
// 结果：
// config2.Defines = { MyAppName: "My Electron App", MyAppVersion: "1.0.0" }
// config2.Setup.AppName = "My Electron App"  // 已替换
// config2.Setup.AppVersion = "1.0.0"          // 已替换
```

---

## 预处理器常量

### #define 指令解析

解析器支持解析 `#define` 预处理器指令：

```iss
#define MyAppName "My App"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "My Company"
#define MyAppExeName "MyApp.exe"
```

```typescript
config.Defines = {
  MyAppName: "My App",
  MyAppVersion: "1.0.0",
  MyAppPublisher: "My Company",
  MyAppExeName: "MyApp.exe",
};
```

### 字符串拼接

支持解析字符串拼接表达式：

```iss
#define MyAppName "My App"
#define MyAppExeName MyAppName + ".exe"
```

```typescript
config.Defines = {
  MyAppName: "My App",
  MyAppExeName: "My App.exe", // 已解析拼接
};
```

### StringChange 函数

支持解析 `StringChange` 函数：

```iss
#define MyAppName "My App"
#define MyAppExeName StringChange(MyAppName, " ", "") + ".exe"
```

```typescript
config.Defines = {
  MyAppName: "My App",
  MyAppExeName: "MyApp.exe", // StringChange 已执行
};
```

---

## 从 ISS 创建 Maker 配置

### 使用 MakerInnosetup.fromIssFile()

直接从 ISS 文件创建 Maker 配置：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

// 方法 1：直接使用 ISS 文件
const config: ForgeConfig = {
  makers: [
    {
      name: "electron-forge-maker-innosetup",
      config: {
        scriptPath: "./installer.iss", // 直接指定脚本路径
      },
      platforms: ["win32"],
    },
  ],
};
```

### 解析后修改配置

先解析 ISS 文件，然后修改配置：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

// 方法 2：解析并修改配置
const issConfig = MakerInnosetup.fromIssFile("./installer.iss");

// 修改版本号
if (issConfig.config?.Setup) {
  issConfig.config.Setup.AppVersion = "2.0.0";
}

// 添加新的文件
if (issConfig.config?.Files) {
  issConfig.config.Files.push({
    Source: "./new-files\\*",
    DestDir: "{app}\\new",
    Flags: "ignoreversion recursesubdirs",
  });
}

const config: ForgeConfig = {
  makers: [
    {
      name: "electron-forge-maker-innosetup",
      config: issConfig,
      platforms: ["win32"],
    },
  ],
};
```

### 从 ISS 内容创建

从 ISS 字符串内容创建配置：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";

const issContent = `
[Setup]
AppName=MyApp
AppVersion=1.0.0
DefaultDirName={autopf}\\MyApp

[Files]
Source: "dist\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs
`;

const config = MakerInnosetup.fromIssContent(issContent);
```

---

## 错误处理

### ParseError 类

解析错误时抛出 `ParseError`：

```typescript
import { InnoScriptParser, ParseError } from "electron-forge-maker-innosetup";

try {
  const config = InnoScriptParser.parseFile("./installer.iss");
} catch (error) {
  if (error instanceof ParseError) {
    console.error("解析错误:", error.message);
    console.error("行号:", error.line);
    console.error("列号:", error.column);
    console.error("上下文:", error.context);
  }
}
```

### 常见错误

#### 1. 文件不存在

```typescript
// 错误信息
// ParseError: 文件不存在: ./nonexistent.iss
```

#### 2. 缺少必需字段

```typescript
// 错误信息
// ParseError: 解析错误: 缺少必需的 Setup 部分属性: AppName 和 AppVersion 是必需的
```

#### 3. 语法错误

```typescript
// 对于格式错误的 ISS 脚本，解析器会尝试继续解析
// 但可能会产生不完整的配置
```

---

## 完整示例

### 示例 1：解析现有 ISS 文件

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";
import * as fs from "fs";

// 解析文件
const config = InnoScriptParser.parseFile("./legacy-installer.iss");

// 检查配置
console.log("应用名称:", config.Setup.AppName);
console.log("版本:", config.Setup.AppVersion);
console.log("语言数量:", config.Languages?.length ?? 0);
console.log("文件数量:", config.Files?.length ?? 0);

// 保存为 JSON 供检查
fs.writeFileSync("parsed-config.json", JSON.stringify(config, null, 2), "utf-8");
```

### 示例 2：ISS 到 Maker 配置转换

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";
import type { ForgeConfig } from "@electron-forge/shared-types";

// 从 ISS 文件解析配置
const issConfig = MakerInnosetup.fromIssFile("./installer.iss");

// 自定义输出目录
issConfig.outputDir = "./dist/installers";

// 使用解析的配置
const forgeConfig: ForgeConfig = {
  makers: [new MakerInnosetup(issConfig, ["win32"])],
};

export default forgeConfig;
```

### 示例 3：合并 ISS 配置与默认配置

```typescript
import { MakerInnosetup, InnoScriptParser } from "electron-forge-maker-innosetup";

// 解析 ISS 文件
const parsedConfig = InnoScriptParser.parseFile("./base-installer.iss");

// 创建 Maker，ISS 配置会与默认配置合并
const maker = new MakerInnosetup({
  // ISS 解析的配置作为基础
  config: parsedConfig,

  // 覆盖特定选项
  appName: "My Updated App",
  appVersion: "2.0.0",

  // 添加桌面图标（ISS 中可能没有）
  createDesktopIcon: true,
});

// 使用 maker...
```

---

## 最佳实践

### 1. 验证解析结果

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";

const config = InnoScriptParser.parseFile("./installer.iss");

// 验证必需字段
if (!config.Setup.AppName || !config.Setup.AppVersion) {
  throw new Error("ISS 脚本缺少必需的 AppName 或 AppVersion");
}

// 验证文件列表
if (!config.Files || config.Files.length === 0) {
  console.warn("警告: 没有定义要安装的文件");
}
```

### 2. 使用预处理器常量保持一致性

```typescript
// ISS 文件
// #define MyAppName "My App"
// #define MyAppVersion "1.0.0"

const config = InnoScriptParser.parseFile("./installer.iss", {
  preserveDefineReferences: true, // 保留引用
});

// 使用相同的常量定义
if (config.Defines) {
  const appName = config.Defines.MyAppName;
  const version = config.Defines.MyAppVersion;
  console.log(`解析的配置用于 ${appName} v${version}`);
}
```

### 3. 处理大型 ISS 文件

对于复杂的 ISS 文件，建议分步解析和验证：

```typescript
import { InnoScriptParser } from "electron-forge-maker-innosetup";

const config = InnoScriptParser.parseFile("./complex-installer.iss");

// 分步检查各个段落
const sections = {
  setup: config.Setup,
  files: config.Files?.length ?? 0,
  icons: config.Icons?.length ?? 0,
  registry: config.Registry?.length ?? 0,
  tasks: config.Tasks?.length ?? 0,
};

console.log("段落统计:", sections);
```

---

## 相关文档

- [README.md](../README.md) - 项目概览和基本使用
- [path-resolution.md](./path-resolution.md) - 路径解析详细文档
- [custom-script-output.md](./custom-script-output.md) - 自定义脚本输出文档

## 参考资料

- [Inno Setup 脚本格式文档](https://jrsoftware.org/ishelp/topic_scriptformat.htm)
- [Inno Setup 段落参考](https://jrsoftware.org/ishelp/topic_scriptsections.htm)
