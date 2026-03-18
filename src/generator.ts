import * as path from "path";
import * as fs from "fs";
import type {
  InnoSetupConfig,
  InnoSetupSetupSection,
  InnoSetupDefines,
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
  InnoSetupMessages,
} from "./types";
import { logGenerator } from "./logger";

/**
 * Inno Setup 脚本生成器
 *
 * 将配置对象转换为 Inno Setup 脚本文件（.iss）
 */
export class InnoScriptGenerator {
  /**
   * 生成完整的 ISS 脚本内容
   *
   * @param config - Inno Setup 配置对象
   * @returns 完整的 ISS 脚本字符串（包含 UTF-8 BOM）
   */
  generate(config: InnoSetupConfig): string {
    logGenerator("正在生成 ISS 脚本");

    const sections: string[] = [];

    // 生成 #define 预处理器指令
    if (config.Defines && Object.keys(config.Defines).length > 0) {
      sections.push(this.generateDefines(config.Defines));
    }

    // 按正确顺序生成各个节
    sections.push(this.generateSetup(config.Setup));

    if (config.Languages?.length) {
      sections.push(this.generateSection("Languages", config.Languages, this.generateLanguage));
    }
    if (config.Types?.length) {
      sections.push(this.generateSection("Types", config.Types, this.generateType));
    }
    if (config.Components?.length) {
      sections.push(this.generateSection("Components", config.Components, this.generateComponent));
    }
    if (config.Tasks?.length) {
      sections.push(this.generateSection("Tasks", config.Tasks, this.generateTask));
    }
    if (config.Files?.length) {
      sections.push(this.generateSection("Files", config.Files, this.generateFile));
    }
    if (config.Dirs?.length) {
      sections.push(this.generateSection("Dirs", config.Dirs, this.generateDir));
    }
    if (config.Icons?.length) {
      sections.push(this.generateSection("Icons", config.Icons, this.generateIcon));
    }
    if (config.INI?.length) {
      sections.push(this.generateSection("INI", config.INI, this.generateINIItem));
    }
    if (config.InstallDelete?.length) {
      sections.push(
        this.generateSection("InstallDelete", config.InstallDelete, this.generateDeleteItem)
      );
    }
    if (config.UninstallDelete?.length) {
      sections.push(
        this.generateSection("UninstallDelete", config.UninstallDelete, this.generateDeleteItem)
      );
    }
    if (config.Registry?.length) {
      sections.push(this.generateSection("Registry", config.Registry, this.generateRegistryItem));
    }
    if (config.Run?.length) {
      sections.push(this.generateSection("Run", config.Run, this.generateRunItem));
    }
    if (config.UninstallRun?.length) {
      sections.push(
        this.generateSection("UninstallRun", config.UninstallRun, this.generateUninstallRunItem)
      );
    }
    if (config.Messages && Object.keys(config.Messages).length > 0) {
      sections.push(this.generateMessagesSection("Messages", config.Messages));
    }
    if (config.CustomMessages && Object.keys(config.CustomMessages).length > 0) {
      sections.push(this.generateMessagesSection("CustomMessages", config.CustomMessages));
    }
    if (config.Code) {
      sections.push(this.generateCodeSection(config.Code));
    }

    // 添加 UTF-8 BOM 以正确支持中文字符
    return "\uFEFF" + sections.join("\n\n");
  }

  /**
   * 将脚本内容保存到文件
   *
   * @param scriptContent - 脚本内容
   * @param filePath - 目标文件路径
   */
  saveToFile(scriptContent: string, filePath: string): void {
    logGenerator("保存脚本到: %s", filePath);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 使用 UTF-8 编码写入（BOM 已包含在 scriptContent 中）
    fs.writeFileSync(filePath, scriptContent, "utf-8");
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 转义字符串值中的引号
   * Inno Setup 中引号需要双写来转义
   *
   * @param value - 原始字符串
   * @returns 转义后的字符串
   */
  private escapeValue(value: string): string {
    return value.replace(/"/g, '""');
  }

  /**
   * 将参数格式化为 Name: "Value" 形式
   *
   * @param name - 参数名
   * @param value - 参数值
   * @returns 格式化后的字符串
   */
  private formatParam(name: string, value: string): string {
    return `${name}: "${this.escapeValue(value)}"`;
  }

  /**
   * 将参数格式化为 Name: Value 形式（不带引号）
   * 用于 flags、types 等不需要引号的参数
   *
   * @param name - 参数名
   * @param value - 参数值
   * @returns 格式化后的字符串
   */
  private formatParamRaw(name: string, value: string): string {
    return `${name}: ${value}`;
  }

  /**
   * 生成包含多个条目的节
   *
   * @param name - 节名称
   * @param items - 条目数组
   * @param generator - 单个条目的生成函数
   * @returns 完整的节内容
   */
  private generateSection<T>(
    name: string,
    items: readonly T[],
    generator: (this: InnoScriptGenerator, item: T) => string
  ): string {
    const lines = [`[${name}]`, ...items.map((item) => generator.call(this, item))];
    return lines.join("\n");
  }

  // ============================================================================
  // 节生成器
  // ============================================================================

  /**
   * 生成 #define 预处理器指令
   *
   * @param defines - 预处理器常量定义
   * @returns 完整的指令内容
   */
  private generateDefines(defines: InnoSetupDefines): string {
    const lines: string[] = [
      "; 由 electron-forge-maker-innosetup 生成的脚本",
      "; 请参阅 Inno Setup 文档了解如何创建脚本文件！",
      "",
    ];

    for (const [key, value] of Object.entries(defines)) {
      if (value !== undefined && value !== null) {
        const strValue = String(value);
        // 检查值是否为表达式（包含函数调用或引用）
        const isExpression = strValue.includes("(") || strValue.includes("+");

        if (typeof value === "string" && !isExpression) {
          lines.push(`#define ${key} "${this.escapeValue(strValue)}"`);
        } else {
          lines.push(`#define ${key} ${strValue}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * 生成 [Setup] 节
   *
   * @param setup - Setup 节配置
   * @returns 完整的 Setup 节内容
   */
  private generateSetup(setup: InnoSetupSetupSection): string {
    const lines = ["[Setup]"];

    // 需要规范化路径分隔符的字段
    const pathFields = new Set([
      "DefaultDirName",
      "DefaultGroupName",
      "OutputDir",
      "SetupIconFile",
      "LicenseFile",
      "InfoBeforeFile",
      "InfoAfterFile",
      "WizardImageFile",
      "WizardSmallImageFile",
      "UninstallDisplayIcon",
      "UninstallFilesDir",
      "AppReadmeFile",
    ]);

    for (const [key, value] of Object.entries(setup)) {
      if (value !== undefined && value !== null) {
        if (typeof value === "boolean") {
          lines.push(`${key}=${value ? "yes" : "no"}`);
        } else if (typeof value === "number") {
          lines.push(`${key}=${value}`);
        } else {
          // 规范化路径分隔符
          const normalizedValue = pathFields.has(key)
            ? (value as string).replace(/\//g, "\\")
            : value;
          lines.push(`${key}=${normalizedValue}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * 生成 Language 条目
   *
   * @param lang - 语言配置
   * @returns 格式化的语言条目
   */
  private generateLanguage(lang: InnoSetupLanguage): string {
    const parts = [
      this.formatParam("Name", lang.Name),
      this.formatParam("MessagesFile", lang.MessagesFile),
    ];

    if (lang.LicenseFile) parts.push(this.formatParam("LicenseFile", lang.LicenseFile));
    if (lang.InfoBeforeFile) parts.push(this.formatParam("InfoBeforeFile", lang.InfoBeforeFile));
    if (lang.InfoAfterFile) parts.push(this.formatParam("InfoAfterFile", lang.InfoAfterFile));

    return parts.join("; ");
  }

  /**
   * 生成 Task 条目
   *
   * @param task - 任务配置
   * @returns 格式化的任务条目
   */
  private generateTask(task: InnoSetupTask): string {
    const parts = [
      this.formatParam("Name", task.Name),
      this.formatParam("Description", task.Description),
    ];

    if (task.GroupDescription)
      parts.push(this.formatParam("GroupDescription", task.GroupDescription));
    if (task.Flags) parts.push(this.formatParamRaw("Flags", task.Flags));
    if (task.Components) parts.push(this.formatParamRaw("Components", task.Components));
    if (task.Check) parts.push(this.formatParamRaw("Check", task.Check));

    return parts.join("; ");
  }

  /**
   * 生成 Type 条目
   *
   * @param type - 安装类型配置
   * @returns 格式化的类型条目
   */
  private generateType(type: InnoSetupType): string {
    const parts = [
      this.formatParam("Name", type.Name),
      this.formatParam("Description", type.Description),
    ];

    if (type.Flags) parts.push(this.formatParamRaw("Flags", type.Flags));

    return parts.join("; ");
  }

  /**
   * 生成 Component 条目
   *
   * @param comp - 组件配置
   * @returns 格式化的组件条目
   */
  private generateComponent(comp: InnoSetupComponent): string {
    const parts = [
      this.formatParam("Name", comp.Name),
      this.formatParam("Description", comp.Description),
    ];

    if (comp.Types) parts.push(this.formatParamRaw("Types", comp.Types));
    if (comp.Flags) parts.push(this.formatParamRaw("Flags", comp.Flags));
    if (comp.ExtraDiskSpaceRequired !== undefined) {
      parts.push(`ExtraDiskSpaceRequired: ${comp.ExtraDiskSpaceRequired}`);
    }

    return parts.join("; ");
  }

  /**
   * 生成 File 条目
   *
   * @param file - 文件配置
   * @returns 格式化的文件条目
   */
  private generateFile(file: InnoSetupFile): string {
    // 规范化路径分隔符
    const normalizedSource = file.Source.replace(/\//g, "\\");
    const normalizedDestDir = file.DestDir.replace(/\//g, "\\");

    const parts = [
      this.formatParam("Source", normalizedSource),
      this.formatParam("DestDir", normalizedDestDir),
    ];

    if (file.DestName) parts.push(this.formatParam("DestName", file.DestName));
    if (file.Flags) parts.push(this.formatParamRaw("Flags", file.Flags));
    if (file.Permissions) parts.push(this.formatParamRaw("Permissions", file.Permissions));
    if (file.Components) parts.push(this.formatParamRaw("Components", file.Components));
    if (file.Tasks) parts.push(this.formatParamRaw("Tasks", file.Tasks));
    if (file.Languages) parts.push(this.formatParamRaw("Languages", file.Languages));
    if (file.Check) parts.push(this.formatParamRaw("Check", file.Check));
    if (file.BeforeInstall) parts.push(this.formatParamRaw("BeforeInstall", file.BeforeInstall));
    if (file.AfterInstall) parts.push(this.formatParamRaw("AfterInstall", file.AfterInstall));
    if (file.Attribs) parts.push(this.formatParamRaw("Attribs", file.Attribs));
    if (file.FontInstall) parts.push(this.formatParam("FontInstall", file.FontInstall));

    return parts.join("; ");
  }

  /**
   * 生成 Dir 条目
   *
   * @param dir - 目录配置
   * @returns 格式化的目录条目
   */
  private generateDir(dir: InnoSetupDir): string {
    // 规范化路径分隔符
    const normalizedName = dir.Name.replace(/\//g, "\\");

    const parts = [this.formatParam("Name", normalizedName)];

    if (dir.Permissions) parts.push(this.formatParamRaw("Permissions", dir.Permissions));
    if (dir.Attribs) parts.push(this.formatParamRaw("Attribs", dir.Attribs));
    if (dir.Flags) parts.push(this.formatParamRaw("Flags", dir.Flags));
    if (dir.Components) parts.push(this.formatParamRaw("Components", dir.Components));
    if (dir.Tasks) parts.push(this.formatParamRaw("Tasks", dir.Tasks));
    if (dir.Check) parts.push(this.formatParamRaw("Check", dir.Check));

    return parts.join("; ");
  }

  /**
   * 生成 Icon 条目
   *
   * @param icon - 图标配置
   * @returns 格式化的图标条目
   */
  private generateIcon(icon: InnoSetupIcon): string {
    // 规范化路径分隔符：Inno Setup 要求使用 \
    const normalizedName = icon.Name.replace(/\//g, "\\");
    const normalizedFilename = icon.Filename.replace(/\//g, "\\");

    const parts = [
      this.formatParam("Name", normalizedName),
      this.formatParam("Filename", normalizedFilename),
    ];

    if (icon.Parameters) parts.push(this.formatParam("Parameters", icon.Parameters));
    if (icon.WorkingDir)
      parts.push(this.formatParam("WorkingDir", icon.WorkingDir.replace(/\//g, "\\")));
    if (icon.HotKey) parts.push(this.formatParam("HotKey", icon.HotKey));
    if (icon.Comment) parts.push(this.formatParam("Comment", icon.Comment));
    if (icon.IconFilename)
      parts.push(this.formatParam("IconFilename", icon.IconFilename.replace(/\//g, "\\")));
    if (icon.IconIndex !== undefined) parts.push(`IconIndex: ${icon.IconIndex}`);
    if (icon.AppUserModelID) parts.push(this.formatParam("AppUserModelID", icon.AppUserModelID));
    if (icon.Flags) parts.push(this.formatParamRaw("Flags", icon.Flags));
    if (icon.Components) parts.push(this.formatParamRaw("Components", icon.Components));
    if (icon.Tasks) parts.push(this.formatParamRaw("Tasks", icon.Tasks));
    if (icon.Languages) parts.push(this.formatParamRaw("Languages", icon.Languages));
    if (icon.Check) parts.push(this.formatParamRaw("Check", icon.Check));

    return parts.join("; ");
  }

  /**
   * 生成 INI 条目
   *
   * @param ini - INI 文件配置
   * @returns 格式化的 INI 条目
   */
  private generateINIItem(ini: InnoSetupINI): string {
    const parts = [
      this.formatParam("Filename", ini.Filename),
      this.formatParam("Section", ini.Section),
    ];

    if (ini.Key) parts.push(this.formatParam("Key", ini.Key));
    if (ini.String) parts.push(this.formatParam("String", ini.String));
    if (ini.Flags) parts.push(this.formatParamRaw("Flags", ini.Flags));
    if (ini.Components) parts.push(this.formatParamRaw("Components", ini.Components));
    if (ini.Tasks) parts.push(this.formatParamRaw("Tasks", ini.Tasks));
    if (ini.Check) parts.push(this.formatParamRaw("Check", ini.Check));

    return parts.join("; ");
  }

  /**
   * 生成 InstallDelete/UninstallDelete 条目
   *
   * @param item - 删除项配置
   * @returns 格式化的删除条目
   */
  private generateDeleteItem(item: InnoSetupInstallDelete | InnoSetupUninstallDelete): string {
    const parts = [this.formatParamRaw("Type", item.Type), this.formatParam("Name", item.Name)];

    if (item.Components) parts.push(this.formatParamRaw("Components", item.Components));
    if (item.Tasks) parts.push(this.formatParamRaw("Tasks", item.Tasks));
    if (item.Check) parts.push(this.formatParamRaw("Check", item.Check));

    return parts.join("; ");
  }

  /**
   * 生成 Registry 条目
   *
   * @param reg - 注册表配置
   * @returns 格式化的注册表条目
   */
  private generateRegistryItem(reg: InnoSetupRegistry): string {
    // 规范化注册表子键路径分隔符
    const normalizedSubkey = reg.Subkey.replace(/\//g, "\\");

    const parts = [
      this.formatParamRaw("Root", reg.Root),
      this.formatParam("Subkey", normalizedSubkey),
    ];

    if (reg.ValueType) parts.push(this.formatParamRaw("ValueType", reg.ValueType));
    if (reg.ValueName !== undefined) parts.push(this.formatParam("ValueName", reg.ValueName));
    if (reg.ValueData !== undefined) {
      if (typeof reg.ValueData === "string") {
        // 规范化值数据中的路径分隔符
        parts.push(this.formatParam("ValueData", reg.ValueData.replace(/\//g, "\\")));
      } else {
        parts.push(`ValueData: ${reg.ValueData}`);
      }
    }
    if (reg.Permissions) parts.push(this.formatParamRaw("Permissions", reg.Permissions));
    if (reg.Flags) parts.push(this.formatParamRaw("Flags", reg.Flags));
    if (reg.Components) parts.push(this.formatParamRaw("Components", reg.Components));
    if (reg.Tasks) parts.push(this.formatParamRaw("Tasks", reg.Tasks));
    if (reg.Check) parts.push(this.formatParamRaw("Check", reg.Check));

    return parts.join("; ");
  }

  /**
   * 生成 Run 条目
   *
   * @param run - 运行配置
   * @returns 格式化的运行条目
   */
  private generateRunItem(run: InnoSetupRun): string {
    // 规范化路径分隔符
    const normalizedFilename = run.Filename.replace(/\//g, "\\");

    const parts = [this.formatParam("Filename", normalizedFilename)];

    if (run.Parameters) parts.push(this.formatParam("Parameters", run.Parameters));
    if (run.WorkingDir)
      parts.push(this.formatParam("WorkingDir", run.WorkingDir.replace(/\//g, "\\")));
    if (run.StatusMsg) parts.push(this.formatParam("StatusMsg", run.StatusMsg));
    if (run.Description) parts.push(this.formatParam("Description", run.Description));
    if (run.Flags) parts.push(this.formatParamRaw("Flags", run.Flags));
    if (run.RunOnceId) parts.push(this.formatParam("RunOnceId", run.RunOnceId));
    if (run.Verb) parts.push(this.formatParam("Verb", run.Verb));
    if (run.Components) parts.push(this.formatParamRaw("Components", run.Components));
    if (run.Tasks) parts.push(this.formatParamRaw("Tasks", run.Tasks));
    if (run.Languages) parts.push(this.formatParamRaw("Languages", run.Languages));
    if (run.Check) parts.push(this.formatParamRaw("Check", run.Check));

    return parts.join("; ");
  }

  /**
   * 生成 UninstallRun 条目
   *
   * @param run - 卸载运行配置
   * @returns 格式化的卸载运行条目
   */
  private generateUninstallRunItem(run: InnoSetupUninstallRun): string {
    // 规范化路径分隔符
    const normalizedFilename = run.Filename.replace(/\//g, "\\");

    const parts = [this.formatParam("Filename", normalizedFilename)];

    if (run.Parameters) parts.push(this.formatParam("Parameters", run.Parameters));
    if (run.WorkingDir)
      parts.push(this.formatParam("WorkingDir", run.WorkingDir.replace(/\//g, "\\")));
    if (run.StatusMsg) parts.push(this.formatParam("StatusMsg", run.StatusMsg));
    if (run.Description) parts.push(this.formatParam("Description", run.Description));
    if (run.Flags) parts.push(this.formatParamRaw("Flags", run.Flags));
    if (run.RunOnceId) parts.push(this.formatParam("RunOnceId", run.RunOnceId));
    if (run.Components) parts.push(this.formatParamRaw("Components", run.Components));
    if (run.Tasks) parts.push(this.formatParamRaw("Tasks", run.Tasks));
    if (run.Check) parts.push(this.formatParamRaw("Check", run.Check));

    return parts.join("; ");
  }

  /**
   * 生成 Messages/CustomMessages 节
   *
   * @param name - 节名称
   * @param messages - 消息定义
   * @returns 完整的消息节内容
   */
  private generateMessagesSection(name: string, messages: InnoSetupMessages): string {
    const lines = [`[${name}]`];

    for (const [key, value] of Object.entries(messages)) {
      lines.push(`${key}=${value}`);
    }

    return lines.join("\n");
  }

  /**
   * 生成 Code 节
   *
   * @param code - Pascal 脚本代码
   * @returns 完整的 Code 节内容
   */
  private generateCodeSection(code: string): string {
    return `[Code]\n${code}`;
  }
}
