# 路径解析详细文档

本文档详细说明 `electron-forge-maker-innosetup` 的路径解析机制，包括相对路径自动解析、路径占位符和配置选项。

## 目录

- [概述](#概述)
- [自动路径解析](#自动路径解析)
- [路径占位符](#路径占位符)
- [路径配置选项](#路径配置选项)
- [解析规则详解](#解析规则详解)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 概述

`electron-forge-maker-innosetup` 提供了智能的路径解析功能，让配置文件中的路径更加简洁和可移植。主要特性包括：

1. **自动相对路径解析** - 将相对路径自动转换为绝对路径
2. **路径占位符** - 使用 `{project}`, `{build}`, `{assets}` 等占位符
3. **跨平台兼容** - 自动规范化路径分隔符（`/` → `\`）
4. **Inno Setup 常量保护** - 不破坏 Inno Setup 的内置常量如 `{app}`, `{win}` 等

---

## 自动路径解析

### 默认行为

默认情况下，Maker 会自动将配置中的相对路径解析为绝对路径：

```typescript
import { MakerInnosetup } from "electron-forge-maker-innosetup";

new MakerInnosetup({
  // 相对路径 - 基于项目根目录自动解析
  setupIconFile: "./assets/icons/icon.ico",
  licenseFile: "./LICENSE",

  config: {
    Setup: {
      // 相对路径 - 自动解析
      SetupIconFile: "./assets/icons/icon.ico",
      LicenseFile: "./LICENSE",
    },
    Files: [
      {
        // {build} 占位符会被 Electron Forge 的打包输出目录替换
        Source: "{build}\\*",
        DestDir: "{app}",
      },
    ],
  },
});
```

### 解析基准目录

不同配置项的相对路径基准目录不同：

| 配置位置                            | 基准目录                  | 说明                 |
| ----------------------------------- | ------------------------- | -------------------- |
| 顶层 `setupIconFile`, `licenseFile` | 项目根目录 (`projectDir`) | 方便引用项目资源     |
| `config.Setup.*` 路径字段           | 项目根目录 (`projectDir`) | Setup 节中的路径     |
| `config.Languages[].LicenseFile`    | 项目根目录 (`projectDir`) | 语言特定的许可证文件 |
| `config.Files[].Source`             | 构建输出目录 (`buildDir`) | 打包后的应用文件     |

### 解析的路径字段

Maker 会自动解析以下字段中的路径：

**Setup 节：**

- `SetupIconFile`
- `LicenseFile`
- `InfoBeforeFile`
- `InfoAfterFile`
- `WizardImageFile`
- `WizardSmallImageFile`

**Languages 节：**

- `LicenseFile`
- `InfoBeforeFile`
- `InfoAfterFile`

**Files 节：**

- `Source`

---

## 路径占位符

Maker 支持特殊的路径占位符，用于动态引用项目目录：

### 支持的占位符

| 占位符      | 说明                        | 默认值          | 示例                           |
| ----------- | --------------------------- | --------------- | ------------------------------ |
| `{project}` | 项目根目录                  | `process.cwd()` | `{project}/resources/icon.ico` |
| `{build}`   | Electron Forge 打包输出目录 | 由 Forge 提供   | `{build}\\*`                   |
| `{assets}`  | 资源目录                    | `assets`        | `{assets}/icons/icon.ico`      |

### 使用示例

```typescript
new MakerInnosetup({
  // 使用 {assets} 占位符
  setupIconFile: "{assets}/icons/icon.ico",

  // 使用 {project} 占位符
  licenseFile: "{project}/LICENSE",

  config: {
    Setup: {
      // 等同于 ./assets/icons/icon.ico
      SetupIconFile: "{assets}/icons/icon.ico",
    },
    Files: [
      {
        // {build} 会被替换为 Electron Forge 的打包输出目录
        Source: "{build}\\*",
        DestDir: "{app}",
        Flags: "ignoreversion recursesubdirs createallsubdirs",
      },
    ],
  },
});
```

### 占位符解析顺序

占位符按以下顺序解析：

1. `{project}` → 替换为项目根目录
2. `{build}` → 替换为构建输出目录（如果已设置）
3. `{assets}` → 替换为资源目录的绝对路径
4. 相对路径 → 基于对应基准目录解析为绝对路径

---

## 路径配置选项

### PathConfig 接口

```typescript
interface PathConfig {
  /** 项目根目录，默认为 process.cwd() */
  projectDir?: string;

  /** 资源目录（相对于 projectDir），默认为 "assets" */
  assetsDir?: string;

  /** 构建输出目录（由 Electron Forge 自动设置） */
  buildDir?: string;
}
```

### 配置示例

```typescript
new MakerInnosetup({
  // 自定义路径配置
  paths: {
    // 指定项目根目录
    projectDir: process.cwd(),

    // 使用 "resources" 作为资源目录
    assetsDir: "resources",
  },

  setupIconFile: "{assets}/icon.ico", // 解析为 {projectDir}/resources/icon.ico
});
```

### resolveRelativePaths 选项

控制是否启用自动路径解析：

```typescript
new MakerInnosetup({
  // 启用自动解析（默认）
  resolveRelativePaths: true,

  // 或禁用自动解析，使用绝对路径
  resolveRelativePaths: false,
  setupIconFile: "E:\\project\\assets\\icon.ico",
});
```

---

## 解析规则详解

### Inno Setup 常量保护

Maker 会识别并保护 Inno Setup 的内置常量，不会对其进行路径解析：

**受保护的常量：**

- `{app}` - 应用安装目录
- `{win}` - Windows 目录
- `{sys}` - Windows System 目录
- `{pf}` - Program Files 目录
- `{cf}` - Common Files 目录
- `{tmp}` - 临时目录
- `{src}` - 安装源目录
- `{group}` - 开始菜单程序组
- `{autoprograms}` - 自动解析的程序组
- `{autodesktop}` - 自动解析的桌面
- `{userappdata}`, `{localappdata}` - 用户数据目录
- 等其他 Inno Setup 常量

**示例：**

```typescript
config: {
  Files: [
    {
      Source: "{build}\\*",    // 会被解析（{build} 是 Maker 占位符）
      DestDir: "{app}",        // 不会解析（{app} 是 Inno Setup 常量）
    },
  ],
  Icons: [
    {
      Name: "{autodesktop}\\MyApp",   // 不会解析
      Filename: "{app}\\MyApp.exe",   // 不会解析
    },
  ],
}
```

### 通配符处理

当路径包含通配符（`*` 或 `?`）时，Maker 会正确处理：

```typescript
config: {
  Files: [
    {
      // 基础路径会被解析，通配符部分保留
      Source: "{build}\\*.dll",
      DestDir: "{app}",
    },
    {
      Source: "./lib/**/*.jar",  // 解析为绝对路径 + 通配符
      DestDir: "{app}\\lib",
    },
  ],
}
```

### 路径分隔符规范化

Inno Setup 要求使用反斜杠 (`\`) 作为路径分隔符。Maker 会自动规范化：

```typescript
// 输入（使用正斜杠）
setupIconFile: "./assets/icons/icon.ico";

// 生成的 ISS 脚本（自动转换为反斜杠）
// SetupIconFile=.\assets\icons\icon.ico
```

**被规范化的字段：**

- Setup 节中的所有路径字段
- Files 节中的 `Source` 和 `DestDir`
- Icons 节中的 `Name`, `Filename`, `WorkingDir`
- Registry 节中的 `Subkey`
- Run 节中的 `Filename` 和 `WorkingDir`

---

## 最佳实践

### 1. 使用相对路径和占位符

**推荐：**

```typescript
new MakerInnosetup({
  setupIconFile: "{assets}/icon.ico",
  licenseFile: "./LICENSE",

  config: {
    Files: [
      {
        Source: "{build}\\*",
        DestDir: "{app}",
      },
    ],
  },
});
```

**不推荐：**

```typescript
new MakerInnosetup({
  resolveRelativePaths: false,
  setupIconFile: "E:\\workSpace\\my-app\\assets\\icon.ico",
  // 硬编码绝对路径不可移植
});
```

### 2. 组织资源目录结构

推荐的项目结构：

```
my-electron-app/
├── assets/
│   ├── icons/
│   │   ├── icon.ico        # 安装程序图标
│   │   └── wizard.bmp      # 安装向导图片
│   └── license/
│       ├── license-en.txt
│       └── license-zh.txt
├── src/
├── package.json
├── forge.config.ts
└── LICENSE
```

配置示例：

```typescript
new MakerInnosetup({
  setupIconFile: "{assets}/icons/icon.ico",
  licenseFile: "./LICENSE",

  config: {
    Languages: [
      {
        Name: "english",
        MessagesFile: "compiler:Default.isl",
        LicenseFile: "{assets}/license/license-en.txt",
      },
      {
        Name: "chinesesimplified",
        MessagesFile: "compiler:Languages\\ChineseSimplified.isl",
        LicenseFile: "{assets}/license/license-zh.txt",
      },
    ],
  },
});
```

### 3. 使用预处理器常量

对于复杂的配置，使用预处理器常量可以提高可维护性：

```typescript
new MakerInnosetup({
  config: {
    Defines: {
      MyAppName: "My Electron App",
      MyAppExeName: "MyElectronApp.exe",
      MyAppPublisher: "My Company",
    },
    Setup: {
      AppName: "{#MyAppName}",
      AppPublisher: "{#MyAppPublisher}",
      DefaultDirName: `{autopf}\\{#MyAppName}`,
    },
    Icons: [
      {
        Name: `{group}\\{#MyAppName}`,
        Filename: `{app}\\{#MyAppExeName}`,
      },
    ],
  },
});
```

### 4. 环境特定配置

使用环境变量和条件配置：

```typescript
const isProduction = process.env.NODE_ENV === "production";

new MakerInnosetup({
  paths: {
    projectDir: process.cwd(),
    assetsDir: isProduction ? "dist/assets" : "assets",
  },
  // ...
});
```

---

## 常见问题

### Q1: 为什么我的相对路径没有被解析？

**可能原因：**

1. 禁用了自动解析：

   ```typescript
   resolveRelativePaths: false; // 禁用了解析
   ```

2. 路径是 Inno Setup 常量：

   ```typescript
   DestDir: "{app}", // {app} 不会被解析，这是正确的
   ```

3. 路径字段不在解析列表中（只有特定字段会被解析）

### Q2: 如何使用项目外的资源文件？

使用 `{project}` 占位符和相对路径：

```typescript
new MakerInnosetup({
  // 项目上级目录的资源
  setupIconFile: "{project}/../shared-assets/icon.ico",
});
```

或使用绝对路径并禁用自动解析：

```typescript
new MakerInnosetup({
  resolveRelativePaths: false,
  setupIconFile: "C:\\shared\\assets\\icon.ico",
});
```

### Q3: 如何自定义资源目录名称？

配置 `paths.assetsDir`：

```typescript
new MakerInnosetup({
  paths: {
    assetsDir: "resources", // 将 assets 改为 resources
  },
  setupIconFile: "{assets}/icon.ico", // 解析为 ./resources/icon.ico
});
```

### Q4: {build} 占位符什么时候可用？

`{build}` 占位符在 Electron Forge 打包过程中可用，它会指向 Forge 的打包输出目录（通常是 `out/<appname>-<platform>-<arch>`）。

只在 `config.Files[].Source` 等需要引用打包输出的地方使用它。

### Q5: 路径中有空格怎么办？

相对路径解析会自动处理空格，无需额外处理。但建议避免在路径中使用空格：

```typescript
// 避免这样
setupIconFile: "./my icons/icon.ico";

// 推荐这样
setupIconFile: "./icons/icon.ico";
```

---

## 相关文档

- [README.md](../README.md) - 项目概览和基本使用
- [iss-parser.md](./iss-parser.md) - ISS 文件解析器文档
- [custom-script-output.md](./custom-script-output.md) - 自定义脚本输出文档

## 参考资料

- [Inno Setup 文档 - 常量](https://jrsoftware.org/ishelp/topic_constants.htm)
- [Electron Forge 文档](https://www.electronforge.io/)
