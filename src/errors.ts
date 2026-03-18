/**
 * electron-forge-maker-innosetup 错误类定义
 */

/** 所有 Maker 错误的基类 */
export class MakerInnosetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MakerInnosetupError";
  }
}

/** 编译器未找到错误 */
export class CompilerNotFoundError extends MakerInnosetupError {
  /** 搜索过的路径列表 */
  readonly searchedPaths: readonly string[];

  constructor(searchedPaths: readonly string[]) {
    super(
      `未找到 Inno Setup 编译器。已搜索路径:\n${searchedPaths.map((p) => `  - ${p}`).join("\n")}\n\n` +
        "请执行以下操作之一:\n" +
        "  1. 将 Inno Setup 便携版放置在 vendor/innosetup/ 目录\n" +
        "  2. 安装 Inno Setup 到系统\n" +
        "  3. 设置 INNOSETUP_PATH 环境变量\n" +
        "  4. 在配置中设置 innosetupPath"
    );
    this.name = "CompilerNotFoundError";
    this.searchedPaths = searchedPaths;
  }
}

/** 脚本编译失败错误 */
export class CompilationError extends MakerInnosetupError {
  /** 退出码 */
  readonly exitCode: number;
  /** 输出内容 */
  readonly output: string;

  constructor(exitCode: number, output: string) {
    super(`Inno Setup 编译失败，退出码: ${exitCode}\n${output}`);
    this.name = "CompilationError";
    this.exitCode = exitCode;
    this.output = output;
  }
}

/** 编译超时错误 */
export class CompilationTimeoutError extends MakerInnosetupError {
  /** 超时时间（毫秒） */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Inno Setup 编译超时，已等待 ${timeoutMs}ms`);
    this.name = "CompilationTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/** 脚本解析错误 */
export class ParseError extends MakerInnosetupError {
  /** 错误行号 */
  readonly line?: number;
  /** 错误列号 */
  readonly column?: number;
  /** 错误上下文 */
  readonly context?: string;

  constructor(message: string, line?: number, column?: number, context?: string) {
    const location = line !== undefined ? `，第 ${line} 行${column !== undefined ? `，第 ${column} 列` : ""}` : "";
    super(`解析错误${location}: ${message}${context ? `\n  ${context}` : ""}`);
    this.name = "ParseError";
    this.line = line;
    this.column = column;
    this.context = context;
  }
}

/** 配置验证错误 */
export class ConfigValidationError extends MakerInnosetupError {
  /** 错误列表 */
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`配置验证失败:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

/** 安装包未找到错误 */
export class InstallerNotFoundError extends MakerInnosetupError {
  /** 搜索目录 */
  readonly searchDir: string;

  constructor(searchDir: string) {
    super(`在 ${searchDir} 中未找到生成的安装包`);
    this.name = "InstallerNotFoundError";
    this.searchDir = searchDir;
  }
}

/** 平台不支持错误 */
export class PlatformNotSupportedError extends MakerInnosetupError {
  /** 当前平台 */
  readonly platform: string;

  constructor(platform: string) {
    super(`不支持平台 "${platform}"。Inno Setup 仅支持 Windows (win32) 平台。`);
    this.name = "PlatformNotSupportedError";
    this.platform = platform;
  }
}