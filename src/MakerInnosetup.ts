import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";
import MakerBase, { type MakerOptions } from "@electron-forge/maker-base";
import type { ForgePlatform } from "@electron-forge/shared-types";
import type {
  MakerInnosetupConfig,
  InnoSetupConfig,
  InnoSetupSetupSection,
  InnoSetupTask,
  InnoSetupIcon,
  Architecture,
} from "./types";
import { getArchIdentifier, getArchitecturesAllowed } from "./types";
import { InnoScriptGenerator } from "./generator";
import { InnoScriptParser } from "./parser";
import {
  CompilerNotFoundError,
  CompilationError,
  CompilationTimeoutError,
  InstallerNotFoundError,
  PlatformNotSupportedError,
} from "./errors";
import { log, logPath, logCompile } from "./logger";
import { ensureDir, fileExists, isInnoSetupConstant, splitWildcardPath } from "./utils/path";

/** 默认编译超时时间（5 分钟） */
const DEFAULT_COMPILE_TIMEOUT = 300000;

/** 默认的 Inno Setup 编译器搜索路径 */
const DEFAULT_COMPILER_PATHS = [
  // 内置便携版（相对于 dist 目录）
  path.join(__dirname, "..", "vendor", "innosetup", "ISCC.exe"),
  path.join(__dirname, "..", "vendor", "ISCC.exe"),
  // 内置便携版（相对于 src 目录 - 用于开发环境）
  path.join(__dirname, "..", "..", "vendor", "innosetup", "ISCC.exe"),
  path.join(__dirname, "..", "..", "vendor", "ISCC.exe"),
  // 系统安装路径
  "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
  "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
  "C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe",
  "C:\\Program Files\\Inno Setup 5\\ISCC.exe",
];

/**
 * Electron Forge 的 Inno Setup Maker
 *
 * 使用 Inno Setup 编译器（ISCC.exe）创建 Windows 安装程序
 *
 * @example
 * ```typescript
 * import { MakerInnosetup } from 'electron-forge-maker-innosetup';
 *
 * // 在 forge.config.ts 中
 * const config: ForgeConfig = {
 *   makers: [
 *     new MakerInnosetup({
 *       appName: 'My App',
 *       appVersion: '1.0.0',
 *       setupIconFile: './assets/icon.ico',
 *       config: {
 *         Setup: {
 *           AppName: 'My App',
 *           AppVersion: '1.0.0',
 *           DefaultDirName: '{autopf}\\MyApp',
 *           OutputDir: './out/installer',
 *         },
 *       },
 *     }),
 *   ],
 * };
 * ```
 */
export default class MakerInnosetup extends MakerBase<MakerInnosetupConfig> {
  readonly name = "innosetup";
  readonly defaultPlatforms: ForgePlatform[] = ["win32"];

  private scriptGenerator: InnoScriptGenerator;

  /**
   * 从配置获取项目目录，若未配置则使用当前工作目录
   */
  private getProjectDir(): string {
    return this.config.paths?.projectDir ?? process.cwd();
  }

  /**
   * 从配置获取构建目录
   */
  private getBuildDir(): string | undefined {
    return this.config.paths?.buildDir;
  }

  /**
   * 从配置获取资源目录，若未配置则使用默认值 "assets"
   */
  private getAssetsDir(): string {
    return this.config.paths?.assetsDir ?? "assets";
  }

  constructor(config: MakerInnosetupConfig = {}, platforms?: ForgePlatform[]) {
    // 默认启用相对路径解析
    const finalConfig: MakerInnosetupConfig = {
      resolveRelativePaths: true,
      ...config,
    };
    super(finalConfig, platforms);
    this.scriptGenerator = new InnoScriptGenerator();
  }

  /**
   * 从 ISS 文件创建 MakerInnosetupConfig
   *
   * @param issFilePath - ISS 文件路径
   * @returns 解析后的配置对象
   */
  static fromIssFile(issFilePath: string): MakerInnosetupConfig {
    const config = InnoScriptParser.parseFile(issFilePath);
    return {
      config,
      scriptPath: issFilePath,
    };
  }

  /**
   * 从 ISS 内容字符串创建 MakerInnosetupConfig
   *
   * @param issContent - ISS 文件内容
   * @returns 解析后的配置对象
   */
  static fromIssContent(issContent: string): MakerInnosetupConfig {
    const config = InnoScriptParser.parse(issContent);
    return { config };
  }

  /**
   * 检查当前平台是否支持
   *
   * @returns 当前平台是否为 Windows
   */
  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === "win32";
  }

  /**
   * 创建安装程序
   *
   * @param options - Electron Forge Maker 选项
   * @returns 生成的安装程序文件路径数组
   */
  async make(options: MakerOptions): Promise<string[]> {
    const { appName, dir, makeDir, targetArch, packageJSON } = options;
    const appVersion = packageJSON.version ?? "1.0.0";
    const archId = getArchIdentifier(targetArch);

    // 验证平台
    if (!this.isSupportedOnCurrentPlatform()) {
      throw new PlatformNotSupportedError(process.platform);
    }

    // 设置构建目录用于路径解析
    this.config.paths = {
      ...this.config.paths,
      buildDir: dir,
    };

    log("正在创建 Inno Setup 安装程序: %s %s (%s)", appName, appVersion, targetArch);
    logPath("项目目录: %s", this.getProjectDir());
    logPath("构建目录: %s", this.getBuildDir());

    // 查找编译器
    const compilerPath = this.findInnosetupCompiler();
    logCompile("使用 Inno Setup 编译器: %s", compilerPath);

    // 确定输出目录
    const baseOutputDir = this.config.outputDir ?? path.join(makeDir, "innosetup.windows");
    const outputDir = path.join(baseOutputDir, archId);
    ensureDir(outputDir);
    log("输出目录: %s", outputDir);

    // 生成或使用现有脚本
    let scriptPath: string;
    // actualOutputDir 用于查找生成的安装程序
    let actualOutputDir: string = outputDir;

    if (this.config.scriptPath) {
      scriptPath = this.resolvePath(this.config.scriptPath, this.getProjectDir());
      log("使用自定义脚本: %s", scriptPath);

      // 解析脚本以获取输出目录
      try {
        const parsedConfig = InnoScriptParser.parseFile(scriptPath);
        if (parsedConfig.Setup.OutputDir) {
          actualOutputDir = path.isAbsolute(parsedConfig.Setup.OutputDir)
            ? parsedConfig.Setup.OutputDir
            : path.resolve(path.dirname(scriptPath), parsedConfig.Setup.OutputDir);
          log("脚本定义的 OutputDir: %s", actualOutputDir);
        }
      } catch (err) {
        logCompile("解析脚本 OutputDir 失败: %s", err);
      }
    } else {
      // 生成脚本
      const defaultConfig = this.generateDefaultConfig(
        dir,
        appName,
        appVersion,
        targetArch,
        outputDir
      );
      const finalConfig = this.mergeConfig(defaultConfig, this.config.config);

      // 解析配置中的路径
      this.resolveConfigPaths(finalConfig, dir);

      // 添加任务（桌面图标等）
      this.addTasks(finalConfig, appName);

      // 生成并保存脚本
      const scriptContent = this.scriptGenerator.generate(finalConfig);
      scriptPath = path.join(makeDir, `${appName}-setup.iss`);
      this.scriptGenerator.saveToFile(scriptContent, scriptPath);
      log("已生成 Inno Setup 脚本: %s", scriptPath);

      // 使用配置中的 OutputDir（如果有）
      if (finalConfig.Setup.OutputDir) {
        actualOutputDir = finalConfig.Setup.OutputDir;
      }
    }

    // 编译
    logCompile("正在编译安装程序...");
    await this.compileScript(scriptPath, compilerPath);

    // 查找生成的安装程序
    const installerPaths = this.findInstaller(actualOutputDir, appName, appVersion, archId);

    // 输出成功信息
    log("✓ 安装程序创建成功!");
    for (const installerPath of installerPaths) {
      const stats = fs.statSync(installerPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      log("  文件: %s", installerPath);
      log("  大小: %s MB", sizeMB);
    }

    return installerPaths;
  }

  /**
   * 查找 Inno Setup 编译器
   *
   * 按以下顺序查找：
   * 1. 配置中指定的路径
   * 2. 环境变量 INNOSETUP_PATH
   * 3. 默认搜索路径
   *
   * @returns 编译器路径
   * @throws CompilerNotFoundError 如果找不到编译器
   */
  private findInnosetupCompiler(): string {
    // 首先检查配置路径
    if (this.config.innosetupPath) {
      if (fileExists(this.config.innosetupPath)) {
        return this.config.innosetupPath;
      }
    }

    // 检查环境变量
    const envPath = process.env.INNOSETUP_PATH;
    if (envPath && fileExists(envPath)) {
      return envPath;
    }

    // 搜索默认路径
    for (const searchPath of DEFAULT_COMPILER_PATHS) {
      if (fileExists(searchPath)) {
        logCompile("找到内置 Inno Setup: %s", searchPath);
        return searchPath;
      }
    }

    throw new CompilerNotFoundError(
      [this.config.innosetupPath, process.env.INNOSETUP_PATH, ...DEFAULT_COMPILER_PATHS].filter(
        Boolean
      ) as string[]
    );
  }

  /**
   * 解析相对于基础目录的路径
   *
   * @param input - 输入路径
   * @param baseDir - 基础目录
   * @returns 解析后的绝对路径
   */
  private resolvePath(input: string | undefined, baseDir: string): string {
    if (!input) {
      return "";
    }

    // 如果禁用了相对路径解析则直接返回
    if (this.config.resolveRelativePaths === false) {
      return input;
    }

    // 已经是绝对路径，规范化分隔符
    if (path.isAbsolute(input)) {
      return path.normalize(input);
    }

    // 解析相对路径并规范化
    return path.normalize(path.resolve(baseDir, input));
  }

  /**
   * 解析字符串中的路径占位符
   *
   * 支持的占位符：
   * - {project} - 项目根目录
   * - {build} - 构建输出目录
   * - {assets} - 资源文件目录
   *
   * @param input - 输入字符串
   * @returns 替换占位符后的字符串
   */
  private resolvePathPlaceholders(input: string): string {
    let result = input;
    const projectDir = this.getProjectDir();
    const buildDir = this.getBuildDir();
    const assetsDir = this.getAssetsDir();

    // {project} - 项目根目录
    result = result.replace(/\{project\}/g, projectDir);

    // {build} - 构建输出目录
    if (buildDir) {
      result = result.replace(/\{build\}/g, buildDir);
    }

    // {assets} - 资源目录
    const assetsPath = path.resolve(projectDir, assetsDir);
    result = result.replace(/\{assets\}/g, assetsPath);

    return result;
  }

  /**
   * 解析配置中的所有路径
   *
   * @param config - Inno Setup 配置
   * @param appDir - 应用目录
   */
  private resolveConfigPaths(config: InnoSetupConfig, appDir: string): void {
    if (this.config.resolveRelativePaths === false) {
      return;
    }

    const projectDir = this.getProjectDir();

    // 解析 Setup 节中的路径字段
    if (config.Setup) {
      const pathFields = [
        "SetupIconFile",
        "LicenseFile",
        "InfoBeforeFile",
        "InfoAfterFile",
        "WizardImageFile",
        "WizardSmallImageFile",
      ] as const;

      for (const field of pathFields) {
        const value = config.Setup[field];
        if (value && typeof value === "string") {
          const resolved = this.resolvePathPlaceholders(value);
          config.Setup = {
            ...config.Setup,
            [field]: this.resolvePath(resolved, projectDir),
          };
        }
      }
    }

    // 解析 Languages 节中的路径
    if (config.Languages) {
      config.Languages = config.Languages.map((lang) => {
        const resolved: typeof lang = { ...lang };
        const langPathFields = ["LicenseFile", "InfoBeforeFile", "InfoAfterFile"] as const;

        for (const field of langPathFields) {
          const value = resolved[field];
          if (value && !value.startsWith("compiler:")) {
            const resolvedPath = this.resolvePathPlaceholders(value);
            resolved[field] = this.resolvePath(resolvedPath, projectDir);
          }
        }

        return resolved;
      });
    }

    // 解析 Files 节中的路径
    if (config.Files) {
      config.Files = config.Files.map((file) => {
        if (!file.Source) return file;

        const sourcePath = this.resolvePathPlaceholders(file.Source);

        // 跳过 Inno Setup 常量
        if (isInnoSetupConstant(sourcePath)) {
          return { ...file, Source: sourcePath };
        }

        // 处理通配符
        if (sourcePath.includes("*") || sourcePath.includes("?")) {
          const { basePath, wildcard } = splitWildcardPath(sourcePath);
          const resolvedBase = this.resolvePath(basePath, appDir);
          return { ...file, Source: resolvedBase + wildcard };
        }

        return { ...file, Source: this.resolvePath(sourcePath, appDir) };
      });
    }
  }

  /**
   * 生成默认的 Inno Setup 配置
   *
   * @param appDir - 应用目录
   * @param appName - 应用名称
   * @param appVersion - 应用版本
   * @param arch - 目标架构
   * @param outputDir - 输出目录
   * @returns 默认配置对象
   */
  private generateDefaultConfig(
    appDir: string,
    appName: string,
    appVersion: string,
    arch: string,
    outputDir: string
  ): InnoSetupConfig {
    const exeName = `${appName}.exe`;
    const archId = getArchIdentifier(arch);
    const outputName = `${appName}-${appVersion}-${archId}-setup`;

    const setup: InnoSetupSetupSection = {
      AppName: this.config.appName ?? appName,
      AppVersion: this.config.appVersion ?? appVersion,
      AppPublisher: this.config.appPublisher ?? "",
      AppId: this.config.appId ?? `{{${appName}}}`,
      DefaultDirName: `{autopf}\\${appName}`,
      DefaultGroupName: appName,
      OutputDir: outputDir,
      OutputBaseFilename: outputName,
      Compression: "lzma2",
      SolidCompression: true,
      ArchitecturesAllowed: getArchitecturesAllowed(arch as Architecture),
      ArchitecturesInstallIn64BitMode: arch === "x64" ? "x64compatible" : "",
      SetupIconFile: this.config.setupIconFile ?? "",
      UninstallDisplayIcon: `{app}\\${exeName}`,
      LicenseFile: this.config.licenseFile ?? "",
      PrivilegesRequired: "admin",
      WizardStyle: "modern",
    };

    return {
      Setup: setup,
      Languages: [
        { Name: "english", MessagesFile: "compiler:Default.isl" },
        { Name: "chinesesimplified", MessagesFile: "compiler:Languages\\ChineseSimplified.isl" },
      ],
      Tasks: [],
      Files: [
        {
          Source: path.join(appDir, "*"),
          DestDir: "{app}",
          Flags: "ignoreversion recursesubdirs createallsubdirs",
        },
      ],
      Icons: [
        { Name: `{group}\\${appName}`, Filename: `{app}\\${exeName}` },
        { Name: `{group}\\卸载 ${appName}`, Filename: "{uninstallexe}" },
      ],
      Run: [
        {
          Filename: `{app}\\${exeName}`,
          Description: `启动 ${appName}`,
          Flags: "nowait postinstall skipifsilent",
        },
      ],
    };
  }

  /**
   * 合并用户配置与默认配置
   *
   * @param defaultConfig - 默认配置
   * @param userConfig - 用户配置
   * @returns 合并后的配置
   */
  private mergeConfig(
    defaultConfig: InnoSetupConfig,
    userConfig?: InnoSetupConfig
  ): InnoSetupConfig {
    if (!userConfig) {
      return defaultConfig;
    }

    return {
      Defines: userConfig.Defines ?? defaultConfig.Defines,
      Setup: { ...defaultConfig.Setup, ...userConfig.Setup },
      Languages: userConfig.Languages ?? defaultConfig.Languages,
      Tasks: userConfig.Tasks ?? defaultConfig.Tasks,
      Types: userConfig.Types ?? defaultConfig.Types,
      Components: userConfig.Components ?? defaultConfig.Components,
      Files: userConfig.Files ?? defaultConfig.Files,
      Dirs: userConfig.Dirs ?? defaultConfig.Dirs,
      Icons: userConfig.Icons ?? defaultConfig.Icons,
      INI: userConfig.INI ?? defaultConfig.INI,
      InstallDelete: userConfig.InstallDelete ?? defaultConfig.InstallDelete,
      UninstallDelete: userConfig.UninstallDelete ?? defaultConfig.UninstallDelete,
      Registry: userConfig.Registry ?? defaultConfig.Registry,
      Run: userConfig.Run ?? defaultConfig.Run,
      UninstallRun: userConfig.UninstallRun ?? defaultConfig.UninstallRun,
      Messages: userConfig.Messages ?? defaultConfig.Messages,
      CustomMessages: userConfig.CustomMessages ?? defaultConfig.CustomMessages,
      Code: userConfig.Code ?? defaultConfig.Code,
    };
  }

  /**
   * 添加桌面图标和快速启动任务
   *
   * @param config - Inno Setup 配置
   * @param appName - 应用名称
   */
  private addTasks(config: InnoSetupConfig, appName: string): void {
    const tasks: InnoSetupTask[] = [...(config.Tasks ?? [])];
    const icons: InnoSetupIcon[] = [...(config.Icons ?? [])];

    // 检查是否已存在桌面图标任务
    const hasDesktopTask = tasks.some((t) => t.Name === "desktopicon");
    const hasDesktopIcon = icons.some(
      (i) => i.Name.includes("{autodesktop}") && i.Tasks === "desktopicon"
    );

    if (this.config.createDesktopIcon !== false && !hasDesktopTask && !hasDesktopIcon) {
      tasks.push({
        Name: "desktopicon",
        Description: "创建桌面图标(&D)",
        GroupDescription: "附加图标:",
        Flags: "unchecked",
      });

      icons.push({
        Name: `{autodesktop}\\${appName}`,
        Filename: `{app}\\${appName}.exe`,
        Tasks: "desktopicon",
      });
    }

    // 检查是否已存在快速启动任务
    const hasQuickLaunchTask = tasks.some((t) => t.Name === "quicklaunchicon");
    const hasQuickLaunchIcon = icons.some(
      (i) => i.Name.includes("Quick Launch") && i.Tasks === "quicklaunchicon"
    );

    if (this.config.createQuickLaunchIcon && !hasQuickLaunchTask && !hasQuickLaunchIcon) {
      tasks.push({
        Name: "quicklaunchicon",
        Description: "创建快速启动图标(&Q)",
        GroupDescription: "附加图标:",
        Flags: "unchecked",
      });

      icons.push({
        Name: `{userappdata}\\Microsoft\\Internet Explorer\\Quick Launch\\${appName}`,
        Filename: `{app}\\${appName}.exe`,
        Tasks: "quicklaunchicon",
      });
    }

    config.Tasks = tasks;
    config.Icons = icons;
  }

  /**
   * 编译 ISS 脚本
   *
   * @param scriptPath - 脚本文件路径
   * @param compilerPath - 编译器路径
   * @returns 编译输出
   * @throws CompilationError 编译失败
   * @throws CompilationTimeoutError 编译超时
   */
  private async compileScript(scriptPath: string, compilerPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [scriptPath];

      if (this.config.isccOptions) {
        args.push(...this.config.isccOptions);
      }

      const timeout = this.config.compileTimeout ?? DEFAULT_COMPILE_TIMEOUT;
      let output = "";
      let errorOutput = "";
      let isResolved = false;
      let iscc: ChildProcess | null = null;

      const cleanup = () => {
        if (iscc && !iscc.killed) {
          try {
            iscc.kill("SIGKILL");
          } catch {
            // 忽略终止进程时的错误
          }
        }
      };

      const timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new CompilationTimeoutError(timeout));
        }
      }, timeout);

      try {
        iscc = spawn(compilerPath, args, { stdio: "pipe" });
      } catch (err) {
        clearTimeout(timeoutHandle);
        reject(
          new Error(
            `启动 Inno Setup 编译器失败: ${err instanceof Error ? err.message : String(err)}`
          )
        );
        return;
      }

      iscc.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        logCompile("%s", text.trim());
      });

      iscc.stderr?.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        logCompile("错误: %s", text.trim());
      });

      iscc.on("close", (code) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutHandle);

        if (code === 0) {
          resolve(output);
        } else {
          cleanup();
          reject(new CompilationError(code ?? 1, errorOutput || output));
        }
      });

      iscc.on("error", (err) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutHandle);
        cleanup();
        reject(new Error(`运行 Inno Setup 编译器失败: ${err.message}`));
      });
    });
  }

  /**
   * 查找生成的安装程序文件
   *
   * @param searchDir - 搜索目录
   * @param appName - 应用名称
   * @param appVersion - 应用版本
   * @param archId - 架构标识
   * @returns 安装程序文件路径数组
   * @throws InstallerNotFoundError 如果找不到安装程序
   */
  private findInstaller(
    searchDir: string,
    appName: string,
    appVersion: string,
    archId: string
  ): string[] {
    log("在目录中搜索安装程序: %s", searchDir);

    // 尝试预期的文件名格式
    const expectedNames = [
      `${appName}-${appVersion}-${archId}-setup.exe`, // 默认格式
      `${appName}_${appVersion}.exe`, // 用户自定义格式
      `${appName}-${appVersion}.exe`, // 无架构格式
    ];

    for (const expectedName of expectedNames) {
      const expectedPath = path.join(searchDir, expectedName);
      if (fileExists(expectedPath)) {
        log("找到安装程序: %s", expectedPath);
        return [expectedPath];
      }
    }

    // 搜索目录中的 .exe 文件
    const searchInDir = (dir: string): string[] => {
      if (!fileExists(dir)) return [];
      const files = fs.readdirSync(dir);
      return files.filter((f) => f.endsWith(".exe")).map((f) => path.join(dir, f));
    };

    // 先在当前目录搜索
    let exeFiles = searchInDir(searchDir);

    // 如果没找到，尝试搜索子目录 (如 innosetup.windows/x64)
    if (exeFiles.length === 0) {
      const subDir = path.join(searchDir, "innosetup.windows", archId);
      log("尝试搜索子目录: %s", subDir);
      exeFiles = searchInDir(subDir);
      if (exeFiles.length > 0) {
        log("在子目录中找到安装程序: %s", exeFiles[0]);
        return exeFiles;
      }
    } else {
      log("找到安装程序: %s", exeFiles[0]);
      return exeFiles;
    }

    throw new InstallerNotFoundError(searchDir);
  }
}
