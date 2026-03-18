import * as fs from "fs";
import type {
  InnoSetupConfig,
  InnoSetupSetupSection,
  InnoSetupLanguage,
  InnoSetupTask,
  InnoSetupType,
  InnoSetupComponent,
  InnoSetupFile,
  InnoSetupDir,
  InnoSetupIcon,
  InnoSetupINI,
  InnoSetupInstallDelete,
  InnoSetupUninstallDelete,
  InnoSetupRegistry,
  InnoSetupRun,
  InnoSetupUninstallRun,
  RegistryRoot,
  RegistryValueType,
  DeleteType,
} from "./types";
import { ParseError } from "./errors";
import { logParser } from "./logger";

/** 解析结果（包含可选的错误信息） */
interface ParseResult {
  config: Omit<InnoSetupConfig, "Setup"> & { Setup?: Partial<InnoSetupSetupSection> };
  errors: ParseError[];
}

/**
 * Inno Setup 脚本解析器
 * 将 .iss 文件解析为 InnoSetupConfig 对象
 */
export class InnoScriptParser {
  /**
   * 解析 ISS 文件
   * @param filePath .iss 文件路径
   * @returns 解析后的配置
   * @throws ParseError 如果文件无法读取
   */
  static parseFile(filePath: string): InnoSetupConfig {
    logParser("解析文件: %s", filePath);

    if (!fs.existsSync(filePath)) {
      throw new ParseError(`文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return this.parse(content);
  }

  /**
   * 解析 ISS 脚本内容
   * @param content ISS 脚本内容
   * @param options 解析选项
   * @returns 解析后的配置
   */
  static parse(
    content: string,
    options: { preserveDefineReferences?: boolean } = {}
  ): InnoSetupConfig {
    const { preserveDefineReferences = true } = options;
    logParser("解析内容, preserveDefineReferences: %s", preserveDefineReferences);

    const lines = content.split(/\r?\n/);
    const defines: Map<string, string | number> = new Map();
    const result: ParseResult = {
      config: {},
      errors: [],
    };

    // 第一遍扫描：提取所有 #define 指令
    this.extractDefines(lines, defines);

    if (defines.size > 0) {
      result.config.Defines = Object.fromEntries(defines);
    }

    // 第二遍扫描：解析段落
    this.parseSections(lines, result, defines, preserveDefineReferences);

    // 验证必需的字段
    if (!result.config.Setup?.AppName || !result.config.Setup?.AppVersion) {
      result.errors.push(
        new ParseError("缺少必需的 Setup 部分属性: AppName 和 AppVersion 是必需的")
      );
    }

    if (result.errors.length > 0) {
      throw result.errors[0];
    }

    // 构建最终配置（包含必需字段）
    const setup: InnoSetupSetupSection = {
      AppName: result.config.Setup?.AppName ?? "",
      AppVersion: result.config.Setup?.AppVersion ?? "",
      DefaultDirName: result.config.Setup?.DefaultDirName ?? "{autopf}\\App",
      OutputDir: result.config.Setup?.OutputDir ?? "output",
      ...result.config.Setup,
    };

    return {
      ...result.config,
      Setup: setup,
    } as InnoSetupConfig;
  }

  /**
   * 从行中提取 #define 指令
   */
  private static extractDefines(lines: string[], defines: Map<string, string | number>): void {
    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("//")) {
        continue;
      }

      // 解析 #define 指令
      const defineMatch = trimmed.match(/^#define\s+(\w+)\s+(.+)$/);
      if (defineMatch) {
        const [, varName, varValue] = defineMatch;
        if (varName && varValue) {
          defines.set(varName, this.parseDefineValue(varValue.trim(), defines));
        }
      }
    }
  }

  /**
   * 解析 #define 的值
   */
  private static parseDefineValue(
    value: string,
    defines: Map<string, string | number>
  ): string | number {
    // 移除外层引号
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    // 处理字符串拼接
    if (value.includes("+")) {
      return this.parseConcatenation(value, defines);
    }

    // 处理 StringChange 函数
    if (value.includes("StringChange(")) {
      return this.parseStringChange(value, defines);
    }

    // 检查是否是对其他定义的引用
    const existingDefine = defines.get(value);
    if (existingDefine !== undefined) {
      return existingDefine;
    }

    // 检查是否为数字
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue;
    }

    return value;
  }

  /**
   * 解析字符串拼接表达式
   */
  private static parseConcatenation(value: string, defines: Map<string, string | number>): string {
    const parts = value.split("+").map((p) => p.trim());
    let result = "";

    for (const part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        result += part.slice(1, -1);
      } else {
        const defineValue = defines.get(part);
        result += defineValue !== undefined ? String(defineValue) : part;
      }
    }

    return result;
  }

  /**
   * 解析 StringChange 函数调用
   */
  private static parseStringChange(value: string, defines: Map<string, string | number>): string {
    const match = value.match(/StringChange\(([^,]+),\s*"([^"]*)",\s*"([^"]*)"\)/);
    if (!match) {
      return value;
    }

    const [, varRef, searchStr, replaceStr] = match;
    if (!varRef) {
      return value;
    }

    const varName = varRef.trim();
    const sourceValue = defines.get(varName);
    let result = typeof sourceValue === "string" ? sourceValue : varName;
    result = result.replace(new RegExp(searchStr ?? "", "g"), replaceStr ?? "");

    // 处理后缀拼接
    const suffixMatch = value.match(/StringChange\([^)]+\)(.*)$/);
    if (suffixMatch?.[1]) {
      const suffix = suffixMatch[1].trim();
      if (suffix.startsWith("+")) {
        const suffixPart = suffix.substring(1).trim();
        if (suffixPart.startsWith('"') && suffixPart.endsWith('"')) {
          result += suffixPart.slice(1, -1);
        }
      }
    }

    return result;
  }

  /**
   * 替换 {#ConstantName} 引用为实际值
   */
  private static replaceDefines(text: string, defines: Map<string, string | number>): string {
    return text.replace(/\{#(\w+)\}/g, (match, varName: string) => {
      const value = defines.get(varName);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 解析所有段落
   */
  private static parseSections(
    lines: string[],
    result: ParseResult,
    defines: Map<string, string | number>,
    preserveDefineReferences: boolean
  ): void {
    let currentSection: string | null = null;
    let codeSection = "";
    let inCodeSection = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (rawLine === undefined) continue;
      let line = rawLine.trim();

      // 跳过空行、注释和 #define 指令
      if (!line || line.startsWith(";") || line.startsWith("//") || line.startsWith("#define")) {
        continue;
      }

      // 如果不保留引用，则替换常量
      if (!preserveDefineReferences) {
        line = this.replaceDefines(line, defines);
      }

      // 检查段落头
      const sectionMatch = line.match(/^\[(\w+)\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1];
        if (sectionName) {
          currentSection = sectionName;
        }

        if (currentSection === "Code") {
          inCodeSection = true;
          codeSection = "";
        } else {
          inCodeSection = false;
        }
        continue;
      }

      // 单独处理 Code 段落（收集原始行）
      if (inCodeSection) {
        const processedLine = preserveDefineReferences
          ? rawLine
          : this.replaceDefines(rawLine, defines);
        codeSection += processedLine + "\n";
        continue;
      }

      // 根据当前段落解析行
      this.parseSectionLine(currentSection, line, result, i + 1);
    }

    // 添加收集的代码段落
    if (codeSection.trim()) {
      result.config.Code = codeSection.trim();
    }
  }

  /**
   * 解析段落中的单行
   */
  private static parseSectionLine(
    section: string | null,
    line: string,
    result: ParseResult,
    lineNumber: number
  ): void {
    if (!section) {
      return;
    }

    try {
      switch (section) {
        case "Setup":
          this.parseSetupLine(line, result);
          break;
        case "Languages":
          this.parseLanguagesLine(line, result);
          break;
        case "Tasks":
          this.parseTasksLine(line, result);
          break;
        case "Types":
          this.parseTypesLine(line, result);
          break;
        case "Components":
          this.parseComponentsLine(line, result);
          break;
        case "Files":
          this.parseFilesLine(line, result);
          break;
        case "Dirs":
          this.parseDirsLine(line, result);
          break;
        case "Icons":
          this.parseIconsLine(line, result);
          break;
        case "INI":
          this.parseINILine(line, result);
          break;
        case "InstallDelete":
          this.parseInstallDeleteLine(line, result);
          break;
        case "UninstallDelete":
          this.parseUninstallDeleteLine(line, result);
          break;
        case "Registry":
          this.parseRegistryLine(line, result);
          break;
        case "Run":
          this.parseRunLine(line, result);
          break;
        case "UninstallRun":
          this.parseUninstallRunLine(line, result);
          break;
        case "Messages":
          this.parseMessagesLine(line, result);
          break;
        case "CustomMessages":
          this.parseCustomMessagesLine(line, result);
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(new ParseError(`解析失败: ${message}`, lineNumber));
    }
  }

  /**
   * 解析 Setup 段落行
   */
  private static parseSetupLine(line: string, result: ParseResult): void {
    const match = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) {
      return;
    }

    const [, key, value] = match;
    if (!key || !value) {
      return;
    }

    if (!result.config.Setup) {
      result.config.Setup = {};
    }

    let parsedValue: string | number | boolean = value.trim();

    // 移除引号
    if (
      typeof parsedValue === "string" &&
      parsedValue.startsWith('"') &&
      parsedValue.endsWith('"')
    ) {
      parsedValue = parsedValue.slice(1, -1);
    }

    // 转换布尔值
    if (parsedValue === "yes" || parsedValue === "true") {
      parsedValue = true;
    } else if (parsedValue === "no" || parsedValue === "false") {
      parsedValue = false;
    }

    // 转换数字
    if (typeof parsedValue === "string" && /^\d+$/.test(parsedValue)) {
      parsedValue = parseInt(parsedValue, 10);
    }

    // 使用 Object.assign 设置属性以正确处理类型
    Object.assign(result.config.Setup, { [key]: parsedValue });
  }

  /**
   * 从行中解析参数（Name: "value"; Param: "value"）
   */
  private static parseParams(line: string): Record<string, string> {
    const params: Record<string, string> = {};
    const parts = line.split(";").map((p) => p.trim());

    for (const part of parts) {
      const match = part.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key && value) {
          let parsedValue = value.trim();
          // 移除引号
          if (parsedValue.startsWith('"') && parsedValue.endsWith('"')) {
            parsedValue = parsedValue.slice(1, -1);
          }
          params[key] = parsedValue;
        }
      }
    }

    return params;
  }

  /**
   * 解析 Languages 段落行
   */
  private static parseLanguagesLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name || !params.MessagesFile) {
      return;
    }

    const lang: InnoSetupLanguage = {
      Name: params.Name,
      MessagesFile: params.MessagesFile,
    };

    if (params.LicenseFile) lang.LicenseFile = params.LicenseFile;
    if (params.InfoBeforeFile) lang.InfoBeforeFile = params.InfoBeforeFile;
    if (params.InfoAfterFile) lang.InfoAfterFile = params.InfoAfterFile;

    if (!result.config.Languages) {
      result.config.Languages = [];
    }
    result.config.Languages = [...result.config.Languages, lang];
  }

  /**
   * 解析 Tasks 段落行
   */
  private static parseTasksLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name || !params.Description) {
      return;
    }

    const task: InnoSetupTask = {
      Name: params.Name,
      Description: params.Description,
    };

    if (params.GroupDescription) task.GroupDescription = params.GroupDescription;
    if (params.Flags) task.Flags = params.Flags;
    if (params.Components) task.Components = params.Components;
    if (params.Check) task.Check = params.Check;

    if (!result.config.Tasks) {
      result.config.Tasks = [];
    }
    result.config.Tasks = [...result.config.Tasks, task];
  }

  /**
   * 解析 Types 段落行
   */
  private static parseTypesLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name || !params.Description) {
      return;
    }

    const type: InnoSetupType = {
      Name: params.Name,
      Description: params.Description,
    };

    if (params.Flags) type.Flags = params.Flags;

    if (!result.config.Types) {
      result.config.Types = [];
    }
    result.config.Types = [...result.config.Types, type];
  }

  /**
   * 解析 Components 段落行
   */
  private static parseComponentsLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name || !params.Description) {
      return;
    }

    const component: InnoSetupComponent = {
      Name: params.Name,
      Description: params.Description,
    };

    if (params.Types) component.Types = params.Types;
    if (params.Flags) component.Flags = params.Flags;
    if (params.ExtraDiskSpaceRequired) {
      component.ExtraDiskSpaceRequired = parseInt(params.ExtraDiskSpaceRequired, 10);
    }

    if (!result.config.Components) {
      result.config.Components = [];
    }
    result.config.Components = [...result.config.Components, component];
  }

  /**
   * 解析 Files 段落行
   */
  private static parseFilesLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Source || !params.DestDir) {
      return;
    }

    const file: InnoSetupFile = {
      Source: params.Source,
      DestDir: params.DestDir,
    };

    if (params.DestName) file.DestName = params.DestName;
    if (params.Flags) file.Flags = params.Flags;
    if (params.Permissions) file.Permissions = params.Permissions;
    if (params.StrongAssemblyName) file.StrongAssemblyName = params.StrongAssemblyName;
    if (params.Components) file.Components = params.Components;
    if (params.Tasks) file.Tasks = params.Tasks;
    if (params.Languages) file.Languages = params.Languages;
    if (params.Check) file.Check = params.Check;
    if (params.BeforeInstall) file.BeforeInstall = params.BeforeInstall;
    if (params.AfterInstall) file.AfterInstall = params.AfterInstall;
    if (params.Attribs) file.Attribs = params.Attribs;
    if (params.FontInstall) file.FontInstall = params.FontInstall;

    if (!result.config.Files) {
      result.config.Files = [];
    }
    result.config.Files = [...result.config.Files, file];
  }

  /**
   * 解析 Dirs 段落行
   */
  private static parseDirsLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name) {
      return;
    }

    const dir: InnoSetupDir = {
      Name: params.Name,
    };

    if (params.Permissions) dir.Permissions = params.Permissions;
    if (params.Attribs) dir.Attribs = params.Attribs;
    if (params.Flags) dir.Flags = params.Flags;
    if (params.Components) dir.Components = params.Components;
    if (params.Tasks) dir.Tasks = params.Tasks;
    if (params.Check) dir.Check = params.Check;

    if (!result.config.Dirs) {
      result.config.Dirs = [];
    }
    result.config.Dirs = [...result.config.Dirs, dir];
  }

  /**
   * 解析 Icons 段落行
   */
  private static parseIconsLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Name || !params.Filename) {
      return;
    }

    const icon: InnoSetupIcon = {
      Name: params.Name,
      Filename: params.Filename,
    };

    if (params.Parameters) icon.Parameters = params.Parameters;
    if (params.WorkingDir) icon.WorkingDir = params.WorkingDir;
    if (params.HotKey) icon.HotKey = params.HotKey;
    if (params.Comment) icon.Comment = params.Comment;
    if (params.IconFilename) icon.IconFilename = params.IconFilename;
    if (params.IconIndex) icon.IconIndex = parseInt(params.IconIndex, 10);
    if (params.AppUserModelID) icon.AppUserModelID = params.AppUserModelID;
    if (params.Flags) icon.Flags = params.Flags;
    if (params.Components) icon.Components = params.Components;
    if (params.Tasks) icon.Tasks = params.Tasks;
    if (params.Languages) icon.Languages = params.Languages;
    if (params.Check) icon.Check = params.Check;

    if (!result.config.Icons) {
      result.config.Icons = [];
    }
    result.config.Icons = [...result.config.Icons, icon];
  }

  /**
   * 解析 INI 段落行
   */
  private static parseINILine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Filename || !params.Section) {
      return;
    }

    const ini: InnoSetupINI = {
      Filename: params.Filename,
      Section: params.Section,
    };

    if (params.Key) ini.Key = params.Key;
    if (params.String) ini.String = params.String;
    if (params.Flags) ini.Flags = params.Flags;
    if (params.Components) ini.Components = params.Components;
    if (params.Tasks) ini.Tasks = params.Tasks;
    if (params.Check) ini.Check = params.Check;

    if (!result.config.INI) {
      result.config.INI = [];
    }
    result.config.INI = [...result.config.INI, ini];
  }

  /**
   * 解析 InstallDelete 段落行
   */
  private static parseInstallDeleteLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Type || !params.Name) {
      return;
    }

    const item: InnoSetupInstallDelete = {
      Type: params.Type as DeleteType,
      Name: params.Name,
    };

    if (params.Components) item.Components = params.Components;
    if (params.Tasks) item.Tasks = params.Tasks;
    if (params.Check) item.Check = params.Check;

    if (!result.config.InstallDelete) {
      result.config.InstallDelete = [];
    }
    result.config.InstallDelete = [...result.config.InstallDelete, item];
  }

  /**
   * 解析 UninstallDelete 段落行
   */
  private static parseUninstallDeleteLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Type || !params.Name) {
      return;
    }

    const item: InnoSetupUninstallDelete = {
      Type: params.Type as DeleteType,
      Name: params.Name,
    };

    if (params.Components) item.Components = params.Components;
    if (params.Tasks) item.Tasks = params.Tasks;
    if (params.Check) item.Check = params.Check;

    if (!result.config.UninstallDelete) {
      result.config.UninstallDelete = [];
    }
    result.config.UninstallDelete = [...result.config.UninstallDelete, item];
  }

  /**
   * 解析 Registry 段落行
   */
  private static parseRegistryLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Root || !params.Subkey) {
      return;
    }

    let valueData: string | number | undefined = params.ValueData;
    if (valueData && /^\d+$/.test(valueData)) {
      valueData = parseInt(valueData, 10);
    }

    const reg: InnoSetupRegistry = {
      Root: params.Root as RegistryRoot,
      Subkey: params.Subkey,
    };

    if (params.ValueType) reg.ValueType = params.ValueType as RegistryValueType;
    if (params.ValueName) reg.ValueName = params.ValueName;
    if (valueData !== undefined) reg.ValueData = valueData;
    if (params.Permissions) reg.Permissions = params.Permissions;
    if (params.Flags) reg.Flags = params.Flags;
    if (params.Components) reg.Components = params.Components;
    if (params.Tasks) reg.Tasks = params.Tasks;
    if (params.Check) reg.Check = params.Check;

    if (!result.config.Registry) {
      result.config.Registry = [];
    }
    result.config.Registry = [...result.config.Registry, reg];
  }

  /**
   * 解析 Run 段落行
   */
  private static parseRunLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Filename) {
      return;
    }

    const run: InnoSetupRun = {
      Filename: params.Filename,
    };

    if (params.Parameters) run.Parameters = params.Parameters;
    if (params.WorkingDir) run.WorkingDir = params.WorkingDir;
    if (params.StatusMsg) run.StatusMsg = params.StatusMsg;
    if (params.Description) run.Description = params.Description;
    if (params.Flags) run.Flags = params.Flags;
    if (params.RunOnceId) run.RunOnceId = params.RunOnceId;
    if (params.Verb) run.Verb = params.Verb;
    if (params.Components) run.Components = params.Components;
    if (params.Tasks) run.Tasks = params.Tasks;
    if (params.Languages) run.Languages = params.Languages;
    if (params.Check) run.Check = params.Check;

    if (!result.config.Run) {
      result.config.Run = [];
    }
    result.config.Run = [...result.config.Run, run];
  }

  /**
   * 解析 UninstallRun 段落行
   */
  private static parseUninstallRunLine(line: string, result: ParseResult): void {
    const params = this.parseParams(line);
    if (!params.Filename) {
      return;
    }

    const run: InnoSetupUninstallRun = {
      Filename: params.Filename,
    };

    if (params.Parameters) run.Parameters = params.Parameters;
    if (params.WorkingDir) run.WorkingDir = params.WorkingDir;
    if (params.StatusMsg) run.StatusMsg = params.StatusMsg;
    if (params.Description) run.Description = params.Description;
    if (params.Flags) run.Flags = params.Flags;
    if (params.RunOnceId) run.RunOnceId = params.RunOnceId;
    if (params.Components) run.Components = params.Components;
    if (params.Tasks) run.Tasks = params.Tasks;
    if (params.Check) run.Check = params.Check;

    if (!result.config.UninstallRun) {
      result.config.UninstallRun = [];
    }
    result.config.UninstallRun = [...result.config.UninstallRun, run];
  }

  /**
   * 解析 Messages 段落行
   */
  private static parseMessagesLine(line: string, result: ParseResult): void {
    const match = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) {
      return;
    }

    const [, key, value] = match;
    if (!key || !value) {
      return;
    }

    if (!result.config.Messages) {
      result.config.Messages = {};
    }
    result.config.Messages = { ...result.config.Messages, [key]: value };
  }

  /**
   * 解析 CustomMessages 段落行
   */
  private static parseCustomMessagesLine(line: string, result: ParseResult): void {
    const match = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) {
      return;
    }

    const [, key, value] = match;
    if (!key || !value) {
      return;
    }

    if (!result.config.CustomMessages) {
      result.config.CustomMessages = {};
    }
    result.config.CustomMessages = { ...result.config.CustomMessages, [key]: value };
  }
}
