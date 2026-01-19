import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import MakerBase, { MakerOptions } from "@electron-forge/maker-base";
import { ForgePlatform } from "@electron-forge/shared-types";
import { MakerInnosetupConfig, InnoSetupConfig } from "./types";
import { InnoScriptGenerator } from "./generator";
import { InnoScriptParser } from "./parser";

/**
 * Electron Forge Maker for Innosetup
 */
export default class MakerInnosetup extends MakerBase<MakerInnosetupConfig> {
  name = "innosetup";
  defaultPlatforms: ForgePlatform[] = ["win32"];

  private scriptGenerator: InnoScriptGenerator;
  private buildDir: string | undefined;
  private projectDir: string | undefined;
  private assetsDir: string | undefined;
  /**
   * 获取项目根目录
   */
  private getProjectDir(): string {
    return this.projectDir || this.config?.paths?.projectDir || process.cwd();
  }

  /**
   * 获取构建目录
   */
  private getBuildDir(): string | undefined {
    return this.buildDir || this.config?.paths?.buildDir;
  }

  /**
   * 获取资源目录
   */
  private getAssetsDir(): string {
    return this.assetsDir || this.config?.paths?.assetsDir || "assets";
  }

  constructor(config: MakerInnosetupConfig = {}, platforms?: ForgePlatform[]) {
    // 默认启用相对路径解析
    if (config.resolveRelativePaths === undefined) {
      config.resolveRelativePaths = true;
    }
    super(config, platforms);
    this.scriptGenerator = new InnoScriptGenerator();
  }

  /**
   * 解析路径 - 支持相对路径转换为绝对路径
   * @param pathStr 输入路径
   * @param baseDir 基础目录（默认为 projectDir）
   * @returns 解析后的绝对路径
   */
  private resolvePath(
    pathStr: string | undefined,
    baseDir?: string
  ): string | undefined {
    if (!pathStr) {
      return undefined;
    }

    // 如果禁用了相对路径解析，直接返回
    if (this.config?.resolveRelativePaths === false) {
      return pathStr;
    }

    // 如果已经是绝对路径，直接返回
    if (path.isAbsolute(pathStr)) {
      return pathStr;
    }

    // 使用提供的 baseDir 或默认的 projectDir
    const base = baseDir || this.getProjectDir();
    return path.resolve(base, pathStr);
  }

  /**
   * 解析配置中的路径占位符
   * 支持：{project}, {assets}, {build}, {app}
   * @param pathStr 包含占位符的路径字符串
   * @returns 解析后的路径
   */
  private resolvePathPlaceholders(
    pathStr: string | undefined
  ): string | undefined {
    if (!pathStr) {
      return undefined;
    }

    let resolved = pathStr;

    const projectDir = this.getProjectDir();
    const buildDir = this.getBuildDir();
    const assetsDir = this.getAssetsDir();

    // {project} - 项目根目录
    resolved = resolved.replace(/\{project\}/g, projectDir);

    // {build} - 构建输出目录
    if (buildDir) {
      resolved = resolved.replace(/\{build\}/g, buildDir);
    }

    // {assets} - 资源目录
    const assetsPath = path.resolve(projectDir, assetsDir);
    resolved = resolved.replace(/\{assets\}/g, assetsPath);

    return resolved;
  }

  /**
   * 处理配置对象中的所有路径
   * @param config Innosetup 配置对象
   * @param appDir 应用目录
   */
  private resolveConfigPaths(config: InnoSetupConfig, appDir: string): void {
    if (this.config?.resolveRelativePaths === false) {
      return;
    }

    const projectDir = this.getProjectDir();

    // 解析 Setup 部分的路径
    if (config.Setup) {
      // SetupIconFile
      if (config.Setup.SetupIconFile) {
        config.Setup.SetupIconFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.SetupIconFile),
          projectDir
        )!;
      }

      // LicenseFile
      if (config.Setup.LicenseFile) {
        config.Setup.LicenseFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.LicenseFile),
          projectDir
        )!;
      }

      // InfoBeforeFile
      if (config.Setup.InfoBeforeFile) {
        config.Setup.InfoBeforeFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.InfoBeforeFile),
          projectDir
        )!;
      }

      // InfoAfterFile
      if (config.Setup.InfoAfterFile) {
        config.Setup.InfoAfterFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.InfoAfterFile),
          projectDir
        )!;
      }

      // WizardImageFile
      if (config.Setup.WizardImageFile) {
        config.Setup.WizardImageFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.WizardImageFile),
          projectDir
        )!;
      }

      // WizardSmallImageFile
      if (config.Setup.WizardSmallImageFile) {
        config.Setup.WizardSmallImageFile = this.resolvePath(
          this.resolvePathPlaceholders(config.Setup.WizardSmallImageFile),
          projectDir
        )!;
      }
    }

    // 解析 Languages 部分的路径
    if (config.Languages) {
      config.Languages.forEach((lang) => {
        if (lang.LicenseFile && !lang.LicenseFile.startsWith("compiler:")) {
          lang.LicenseFile = this.resolvePath(
            this.resolvePathPlaceholders(lang.LicenseFile),
            projectDir
          );
        }
        if (
          lang.InfoBeforeFile &&
          !lang.InfoBeforeFile.startsWith("compiler:")
        ) {
          lang.InfoBeforeFile = this.resolvePath(
            this.resolvePathPlaceholders(lang.InfoBeforeFile),
            projectDir
          );
        }
        if (lang.InfoAfterFile && !lang.InfoAfterFile.startsWith("compiler:")) {
          lang.InfoAfterFile = this.resolvePath(
            this.resolvePathPlaceholders(lang.InfoAfterFile),
            projectDir
          );
        }
      });
    }

    // 解析 Files 部分的路径
    if (config.Files) {
      config.Files.forEach((file) => {
        // Source 路径处理
        if (file.Source) {
          // 首先替换我们自定义的占位符
          let sourcePath = this.resolvePathPlaceholders(file.Source);

          // 如果替换后不是 Inno Setup 内置常量（如 {app}, {tmp}），则解析为绝对路径
          // Inno Setup 常量通常以 {app}, {tmp}, {src}, {win}, {sys} 等开头
          const isInnoConstant = sourcePath?.match(
            /^\{(app|tmp|src|win|sys|pf|cf|dao|fonts|userappdata|localappdata|group|autoprograms|autodesktop|commondocs)/i
          );

          if (sourcePath && !isInnoConstant) {
            // 如果包含 * 通配符，需要特殊处理
            if (sourcePath.includes("*")) {
              const basePath = sourcePath.split("*")[0];
              const wildcard = sourcePath.substring(basePath.length);
              const resolvedBase = this.resolvePath(basePath, appDir);
              sourcePath = resolvedBase ? resolvedBase + wildcard : sourcePath;
            } else {
              sourcePath = this.resolvePath(sourcePath, appDir);
            }

            file.Source = sourcePath!;
          } else if (sourcePath) {
            // 是 Inno Setup 常量，保持不变
            file.Source = sourcePath;
          }
        }
      });
    }
  }

  /**
   * 从 ISS 文件解析配置
   * @param issFilePath ISS 文件路径
   * @returns MakerInnosetupConfig 配置对象
   */
  static fromIssFile(issFilePath: string): MakerInnosetupConfig {
    const config = InnoScriptParser.parseFile(issFilePath);
    return {
      config: config,
      scriptPath: issFilePath,
    };
  }

  /**
   * 从 ISS 脚本内容解析配置
   * @param issContent ISS 脚本内容
   * @returns MakerInnosetupConfig 配置对象
   */
  static fromIssContent(issContent: string): MakerInnosetupConfig {
    const config = InnoScriptParser.parse(issContent);
    return {
      config: config,
    };
  }

  /**
   * 检查是否支持当前平台
   */
  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === "win32";
  }

  /**
   * 查找 Innosetup 编译器路径
   */
  private findInnosetupCompiler(): string {
    if (this.config.innosetupPath) {
      return this.config.innosetupPath;
    }

    // 1. 优先查找内置的便携版（相对于包的位置）
    const builtinPaths = [
      // 相对于 dist 目录
      path.join(__dirname, "..", "vendor", "innosetup", "ISCC.exe"),
      path.join(__dirname, "..", "vendor", "ISCC.exe"),
      // 相对于 src 目录
      path.join(__dirname, "..", "..", "vendor", "innosetup", "ISCC.exe"),
      path.join(__dirname, "..", "..", "vendor", "ISCC.exe"),
    ];

    for (const builtinPath of builtinPaths) {
      if (fs.existsSync(builtinPath)) {
        console.log(`Using bundled Innosetup: ${builtinPath}`);
        return builtinPath;
      }
    }

    // 2. 尝试从环境变量中查找
    if (
      process.env.INNOSETUP_PATH &&
      fs.existsSync(process.env.INNOSETUP_PATH)
    ) {
      return process.env.INNOSETUP_PATH;
    }

    // 3. 查找系统安装的 Innosetup
    const systemPaths = [
      "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
      "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
      "C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe",
      "C:\\Program Files\\Inno Setup 5\\ISCC.exe",
    ];

    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath;
      }
    }

    throw new Error(
      "Innosetup compiler not found. Please:\n" +
        "1. Place Innosetup portable in vendor/innosetup/ directory, or\n" +
        "2. Install Innosetup to system, or\n" +
        "3. Set INNOSETUP_PATH environment variable, or\n" +
        "4. Set innosetupPath in config."
    );
  }

  /**
   * 根据架构获取架构标识符
   */
  private getArchIdentifier(arch: string): string {
    switch (arch) {
      case "x64":
        return "x64";
      case "ia32":
      case "x86":
        return "x86";
      case "arm64":
        return "arm64";
      default:
        return arch;
    }
  }

  /**
   * 根据架构获取 ArchitecturesAllowed 配置
   */
  private getArchitecturesAllowed(arch: string): string {
    switch (arch) {
      case "x64":
        return "x64compatible";
      case "ia32":
      case "x86":
        return "x86compatible";
      case "arm64":
        return "arm64";
      default:
        return arch;
    }
  }

  /**
   * 生成默认配置
   */
  private generateDefaultConfig(
    appDir: string,
    appName: string,
    appVersion: string,
    arch: string,
    outputDir: string
  ): InnoSetupConfig {
    const exeName = `${appName}.exe`;
    const archId = this.getArchIdentifier(arch);
    const outputName = `${appName}-${appVersion}-${archId}-setup`;

    return {
      Setup: {
        AppName: this.config.appName || appName,
        AppVersion: this.config.appVersion || appVersion,
        AppPublisher: this.config.appPublisher || "",
        AppId: this.config.appId || `{{${appName}}}`,
        DefaultDirName: `{autopf}\\${appName}`,
        DefaultGroupName: appName,
        OutputDir: outputDir,
        OutputBaseFilename: outputName,
        Compression: "lzma2",
        SolidCompression: true,
        ArchitecturesAllowed: this.getArchitecturesAllowed(arch),
        ArchitecturesInstallIn64BitMode: arch === "x64" ? "x64compatible" : "",
        SetupIconFile: this.config.setupIconFile || "",
        UninstallDisplayIcon: `{app}\\${exeName}`,
        LicenseFile: this.config.licenseFile || "",
        PrivilegesRequired: "admin",
        WizardStyle: "modern",
      },
      Languages: [
        {
          Name: "english",
          MessagesFile: "compiler:Default.isl",
        },
        {
          Name: "chinesesimplified",
          MessagesFile: "compiler:Languages\\ChineseSimplified.isl",
        },
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
        {
          Name: `{group}\\${appName}`,
          Filename: `{app}\\${exeName}`,
        },
        {
          Name: `{group}\\Uninstall ${appName}`,
          Filename: "{uninstallexe}",
        },
      ],
      Run: [
        {
          Filename: `{app}\\${exeName}`,
          Description: `Launch ${appName}`,
          Flags: "nowait postinstall skipifsilent",
        },
      ],
    };
  }

  /**
   * 合并用户配置和默认配置
   */
  private mergeConfig(
    defaultConfig: InnoSetupConfig,
    userConfig?: InnoSetupConfig
  ): InnoSetupConfig {
    if (!userConfig) {
      return defaultConfig;
    }

    return {
      Defines: userConfig.Defines || defaultConfig.Defines,
      Setup: { ...defaultConfig.Setup, ...userConfig.Setup },
      Languages: userConfig.Languages || defaultConfig.Languages,
      Tasks: userConfig.Tasks || defaultConfig.Tasks,
      Types: userConfig.Types || defaultConfig.Types,
      Components: userConfig.Components || defaultConfig.Components,
      Files: userConfig.Files || defaultConfig.Files,
      Dirs: userConfig.Dirs || defaultConfig.Dirs,
      Icons: userConfig.Icons || defaultConfig.Icons,
      INI: userConfig.INI || defaultConfig.INI,
      InstallDelete: userConfig.InstallDelete || defaultConfig.InstallDelete,
      UninstallDelete:
        userConfig.UninstallDelete || defaultConfig.UninstallDelete,
      Registry: userConfig.Registry || defaultConfig.Registry,
      Run: userConfig.Run || defaultConfig.Run,
      UninstallRun: userConfig.UninstallRun || defaultConfig.UninstallRun,
      Messages: userConfig.Messages || defaultConfig.Messages,
      CustomMessages: userConfig.CustomMessages || defaultConfig.CustomMessages,
      Code: userConfig.Code || defaultConfig.Code,
    };
  }

  /**
   * 添加任务（桌面图标、快速启动等）
   */
  private addTasks(config: InnoSetupConfig, appName: string): void {
    if (!config.Tasks) {
      config.Tasks = [];
    }

    // 检查用户是否已经自定义了桌面图标任务
    const hasDesktopTask = config.Tasks.some(
      (task) => task.Name === "desktopicon"
    );
    const hasDesktopIcon = config.Icons?.some(
      (icon) =>
        icon.Name?.includes("{autodesktop}") && icon.Tasks === "desktopicon"
    );

    if (
      this.config.createDesktopIcon !== false &&
      !hasDesktopTask &&
      !hasDesktopIcon
    ) {
      config.Tasks.push({
        Name: "desktopicon",
        Description: "Create a &desktop icon",
        GroupDescription: "Additional icons:",
        Flags: "unchecked",
      });

      if (config.Icons) {
        config.Icons.push({
          Name: "{autodesktop}\\" + appName,
          Filename: `{app}\\${appName}.exe`,
          Tasks: "desktopicon",
        });
      }
    }

    // 检查用户是否已经自定义了快速启动任务
    const hasQuickLaunchTask = config.Tasks.some(
      (task) => task.Name === "quicklaunchicon"
    );
    const hasQuickLaunchIcon = config.Icons?.some(
      (icon) =>
        icon.Name?.includes("Quick Launch") && icon.Tasks === "quicklaunchicon"
    );

    if (
      this.config.createQuickLaunchIcon &&
      !hasQuickLaunchTask &&
      !hasQuickLaunchIcon
    ) {
      config.Tasks.push({
        Name: "quicklaunchicon",
        Description: "Create a &Quick Launch icon",
        GroupDescription: "Additional icons:",
        Flags: "unchecked",
      });

      if (config.Icons) {
        config.Icons.push({
          Name:
            "{userappdata}\\Microsoft\\Internet Explorer\\Quick Launch\\" +
            appName,
          Filename: `{app}\\${appName}.exe`,
          Tasks: "quicklaunchicon",
        });
      }
    }
  }

  /**
   * 执行 Innosetup 编译
   */
  private async compileScript(
    scriptPath: string,
    compilerPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [scriptPath];

      if (this.config.isccOptions) {
        args.push(...this.config.isccOptions);
      }

      const iscc = spawn(compilerPath, args, {
        stdio: "pipe",
      });

      let output = "";
      let errorOutput = "";
      let isResolved = false;

      const timeout = this.config.compileTimeout || 300000;
      const timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = false;
          console.error("Innosetup compilation timeout, killing process...");
          try {
            iscc.kill("SIGKILL");
          } catch (e) {
            console.error("Failed to kill process", e);
          }
          reject(
            new Error(`Innosetup compilation timeout after ${timeout} ms`)
          );
        }
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutHandle);

        try {
          if (iscc && !iscc.killed) {
            iscc.kill("SIGKILL");
          }
        } catch (e) {}
      };

      iscc.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      iscc.stderr.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      iscc.on("close", (code) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutHandle);

        if (code === 0) {
          resolve(output);
        } else {
          cleanup();
          reject(
            new Error(
              `Innosetup compilation failed with code ${code}\n${errorOutput}`
            )
          );
        }
      });

      iscc.on("error", (err) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(new Error(`Failed to start Innosetup compiler: ${err.message}`));
      });

      // 处理进程意外退出
      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    });
  }

  /**
   * 制作安装包
   */
  async make(options: MakerOptions): Promise<string[]> {
    const { appName, dir, makeDir, targetArch, packageJSON } = options;
    const appVersion = packageJSON.version || "1.0.0";
    const archId = this.getArchIdentifier(targetArch);

    console.log(
      `Creating Innosetup installer for ${appName} ${appVersion} (${targetArch})...`
    );
    console.log(`Project directory: ${this.getProjectDir()}`);
    console.log(`Build directory: ${this.getBuildDir()}`);

    // 查找编译器
    const compilerPath = this.findInnosetupCompiler();
    console.log(`Using Innosetup compiler: ${compilerPath}`);

    // 确定输出目录：根据架构生成子目录
    // 格式: makeDir/innosetup.windows/x64 或 makeDir/innosetup.windows/arm64
    const baseOutputDir =
      this.config.outputDir || path.join(makeDir, "innosetup.windows");
    const outputDir = path.join(baseOutputDir, archId);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Output directory: ${outputDir}`);

    // 生成或使用脚本
    let scriptPath: string;
    let finalConfig: InnoSetupConfig;
    let actualOutputDir = outputDir; // 实际的输出目录

    if (this.config.scriptPath) {
      // 使用用户提供的脚本
      scriptPath = this.resolvePath(
        this.config.scriptPath,
        this.getProjectDir()
      )!;
      console.log(`Using custom script: ${scriptPath}`);

      // 解析脚本以获取实际的输出目录
      try {
        const parsedConfig = InnoScriptParser.parseFile(scriptPath);
        if (parsedConfig.Setup?.OutputDir) {
          // 如果脚本中定义了输出目录，使用绝对路径
          const scriptOutputDir = parsedConfig.Setup.OutputDir;
          actualOutputDir = path.isAbsolute(scriptOutputDir)
            ? scriptOutputDir
            : path.resolve(path.dirname(scriptPath), scriptOutputDir);
          console.log(`Script defines OutputDir: ${actualOutputDir}`);
        }
      } catch (err) {
        console.warn(`Failed to parse script for OutputDir: ${err}`);
        // 继续使用默认的 outputDir
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
      finalConfig = this.mergeConfig(defaultConfig, this.config.config);

      // 解析配置中的路径
      this.resolveConfigPaths(finalConfig, dir);

      // 添加任务
      this.addTasks(finalConfig, appName);

      // 生成脚本内容
      const scriptContent = this.scriptGenerator.generate(finalConfig);

      // 保存脚本
      scriptPath = path.join(makeDir, `${appName}-setup.iss`);
      this.scriptGenerator.saveToFile(scriptContent, scriptPath);
      console.log(`Generated Innosetup script: ${scriptPath}`);
    }

    // 编译安装包
    console.log("Compiling installer...");
    await this.compileScript(scriptPath, compilerPath);

    // 查找生成的安装包
    // 如果使用自定义脚本，在实际输出目录中查找
    const searchDir = actualOutputDir;
    console.log(`Searching for installer in: ${searchDir}`);

    // 尝试匹配输出文件名模式
    const outputPattern = `${appName}-${appVersion}-${archId}-setup.exe`;
    const outputPath = path.join(searchDir, outputPattern);

    if (fs.existsSync(outputPath)) {
      console.log(`Installer created successfully: ${outputPath}`);
      return [outputPath];
    }

    // 如果没找到，尝试查找所有 exe 文件
    if (fs.existsSync(searchDir)) {
      const files = fs.readdirSync(searchDir);
      const exeFiles = files
        .filter((f) => f.endsWith(".exe"))
        .map((f) => path.join(searchDir, f));

      if (exeFiles.length > 0) {
        console.log(`Installer created: ${exeFiles[0]}`);
        return exeFiles;
      }
    }

    throw new Error(`Failed to find generated installer in ${searchDir}`);
  }
}

// 导出类型
export * from "./types";
export { InnoScriptGenerator } from "./generator";
export { InnoScriptParser } from "./parser";
