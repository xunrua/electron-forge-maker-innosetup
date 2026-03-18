/**
 * Inno Setup 严格 TypeScript 类型定义
 * @see https://jrsoftware.org/ishelp/
 */

// ============================================================================
// 预处理器定义
// ============================================================================

/** 预处理器常量定义 */
export interface InnoSetupDefines {
  readonly [key: string]: string | number;
}

// ============================================================================
// Setup 部分
// ============================================================================

/** 压缩类型选项 */
export type CompressionType =
  | "lzma"
  | "lzma2"
  | "zip"
  | "bzip"
  | "none"
  | "zip/1"
  | "zip/2"
  | "zip/3"
  | "zip/4"
  | "zip/5"
  | "zip/6"
  | "zip/7"
  | "zip/8"
  | "zip/9";

/** 权限级别选项 */
export type PrivilegesRequired = "none" | "poweruser" | "admin" | "lowest";

/** 权限覆盖选项 */
export type PrivilegesRequiredOverridesAllowed = "dialog" | "commandline" | "dialog commandline";

/** 内部压缩级别 */
export type InternalCompressLevel = "none" | "fast" | "normal" | "max" | "ultra" | "ultra64";

/** 向导样式选项 */
export type WizardStyle = "modern" | "classic";

/** 目录存在警告行为 */
export type DirExistsWarning = "yes" | "no" | "auto";

/** 显示语言对话框行为 */
export type ShowLanguageDialog = "yes" | "no" | "auto";

/** 语言检测方法 */
export type LanguageDetectionMethod = "locale" | "uilanguage" | "none";

/** 卸载日志模式 */
export type UninstallLogMode = "append" | "new" | "overwrite";

/** 背景颜色方向 */
export type BackColorDirection = "toptobottom" | "lefttoright";

/** Setup 部分配置 */
export interface InnoSetupSetupSection {
  /** 应用程序名称 */
  AppName: string;
  /** 应用程序版本 */
  AppVersion: string;
  /** 应用程序发布者 */
  AppPublisher?: string;
  /** 应用程序发布者 URL */
  AppPublisherURL?: string;
  /** 应用程序支持 URL */
  AppSupportURL?: string;
  /** 应用程序更新 URL */
  AppUpdatesURL?: string;
  /** 默认安装目录名称 */
  DefaultDirName: string;
  /** 默认分组名称 */
  DefaultGroupName?: string;
  /** 默认用户信息名称 */
  DefaultUserInfoName?: string;
  /** 默认用户信息组织 */
  DefaultUserInfoOrg?: string;
  /** 默认用户信息序列号 */
  DefaultUserInfoSerial?: string;
  /** 默认设置类型名称 */
  DefaultSetupType?: string;
  /** 允许不开始菜单文件夹 */
  AllowNoIcons?: boolean;
  /** 许可证文件路径 */
  LicenseFile?: string;
  /** 信息前文件路径 */
  InfoBeforeFile?: string;
  /** 信息后文件路径 */
  InfoAfterFile?: string;
  /** 输出目录（可选，不设置时使用默认路径） */
  OutputDir?: string;
  /** 输出基础文件名 */
  OutputBaseFilename?: string;
  /** 输出清单文件 */
  OutputManifestFile?: string;
  /** 设置图标文件路径 */
  SetupIconFile?: string;
  /** 设置日志启用 */
  SetupLogging?: boolean;
  /** 设置互斥 */
  SetupMutex?: string;
  /** 压缩类型 */
  Compression?: CompressionType;
  /** 固实压缩启用 */
  SolidCompression?: boolean;
  /** 磁盘签名 */
  DiskSignature?: string;
  /** 磁盘簇大小 */
  DiskClusterSize?: number;
  /** 所需权限级别 */
  PrivilegesRequired?: PrivilegesRequired;
  /** 允许覆盖权限级别 */
  PrivilegesRequiredOverridesAllowed?: PrivilegesRequiredOverridesAllowed;
  /** 允许的架构（支持表达式，如 "x64compatible and not arm64"） */
  ArchitecturesAllowed?: string;
  /** 在64位模式下安装的架构 */
  ArchitecturesInstallIn64BitMode?: string;
  /** 卸载显示图标 */
  UninstallDisplayIcon?: string;
  /** 卸载显示名称 */
  UninstallDisplayName?: string;
  /** 卸载文件目录 */
  UninstallFilesDir?: string;
  /** 卸载日志模式 */
  UninstallLogMode?: UninstallLogMode;
  /** 卸载重启电脑 */
  UninstallRestartComputer?: boolean;
  /** 卸载显示大小 */
  UninstallDisplaySize?: number;
  /** 应用程序 ID（建议使用 GUID 格式） */
  AppId?: string;
  /** 向导样式 */
  WizardStyle?: WizardStyle;
  /** 向导图像拉伸 */
  WizardImageStretch?: boolean;
  /** 禁用完成页面 */
  DisableFinishedPage?: boolean;
  /** 禁用准备安装页面 */
  DisableReadyPage?: boolean;
  /** 禁用欢迎页面 */
  DisableWelcomePage?: boolean;
  /** 禁用目录页面 */
  DisableDirPage?: boolean;
  /** 禁用程序组页面 */
  DisableProgramGroupPage?: boolean;
  /** 禁用准备提示页面 */
  DisableReadyMemo?: boolean;
  /** 禁用启动提示 */
  DisableStartupPrompt?: boolean;
  /** 禁用目录存在警告 */
  DisableDirExistsWarning?: boolean;
  /** 创建应用程序目录 */
  CreateAppDir?: boolean;
  /** 创建卸载注册表键 */
  CreateUninstallRegKey?: boolean;
  /** 可卸载 */
  Uninstallable?: boolean;
  /** 启用目录不存在警告 */
  EnableDirDoesntExistWarning?: boolean;
  /** 目录存在警告行为 */
  DirExistsWarning?: DirExistsWarning;
  /** 最低 Windows 版本 */
  MinVersion?: string;
  /** 仅低于版本 */
  OnlyBelowVersion?: string;
  /** 显示语言对话框 */
  ShowLanguageDialog?: ShowLanguageDialog;
  /** 语言检测方法 */
  LanguageDetectionMethod?: LanguageDetectionMethod;
  /** 应用程序互斥 */
  AppMutex?: string;
  /** 签名工具 */
  SignTool?: string;
  /** 签名工具重试次数 */
  SignToolRetryCount?: number;
  /** 签名工具重试延迟 */
  SignToolRetryDelay?: number;
  /** 更改文件关联 */
  ChangesAssociations?: boolean;
  /** 更改环境变量 */
  ChangesEnvironment?: boolean;
  /** 关闭应用程序 */
  CloseApplications?: boolean;
  /** 关闭应用程序过滤器 */
  CloseApplicationsFilter?: string;
  /** 重启应用程序 */
  RestartApplications?: boolean;
  /** 允许取消期间安装 */
  AllowCancelDuringInstall?: boolean;
  /** 允许根目录 */
  AllowRootDirectory?: boolean;
  /** 允许网络驱动器 */
  AllowNetworkDrive?: boolean;
  /** 允许 UNC 路径 */
  AllowUNCPath?: boolean;
  /** 始终重启 */
  AlwaysRestart?: boolean;
  /** 始终显示目录页 */
  AlwaysShowDirOnReadyPage?: boolean;
  /** 始终显示组页 */
  AlwaysShowGroupOnReadyPage?: boolean;
  /** 始终使用个人组 */
  AlwaysUsePersonalGroup?: boolean;
  /** 应用程序注释 */
  AppComments?: string;
  /** 应用联系方式 */
  AppContact?: string;
  /** 应用版权 */
  AppCopyright?: string;
  /** 应用程序修改路径 */
  AppModifyPath?: string;
  /** 应用程序自述文件 */
  AppReadmeFile?: string;
  /** 背景颜色（十六进制） */
  BackColor?: string;
  /** 背景颜色2（十六进制） */
  BackColor2?: string;
  /** 背景颜色方向 */
  BackColorDirection?: BackColorDirection;
  /** 背景是否为固实 */
  BackSolid?: boolean;
  /** 安装程序密码 */
  Password?: string;
  /** 启用加密 */
  Encryption?: boolean;
  /** 启用磁盘分卷 */
  DiskSpanning?: boolean;
  /** 每张磁盘的切片数 */
  SlicesPerDisk?: number;
  /** 使用以前的应用程序目录 */
  UsePreviousAppDir?: boolean;
  /** 使用以前的组 */
  UsePreviousGroup?: boolean;
  /** 使用以前的语言 */
  UsePreviousLanguage?: boolean;
  /** 使用以前的权限 */
  UsePreviousPrivileges?: boolean;
  /** 使用以前的设置类型 */
  UsePreviousSetupType?: boolean;
  /** 使用以前的任务 */
  UsePreviousTasks?: boolean;
  /** 使用以前的用户信息 */
  UsePreviousUserInfo?: boolean;
  /** 用户信息页面启用 */
  UserInfoPage?: boolean;
  /** 版本信息公司 */
  VersionInfoCompany?: string;
  /** 版本信息描述 */
  VersionInfoDescription?: string;
  /** 版本信息文本版本 */
  VersionInfoTextVersion?: string;
  /** 版本信息版本 */
  VersionInfoVersion?: string;
  /** 版本信息产品名称 */
  VersionInfoProductName?: string;
  /** 版本信息产品文本版本 */
  VersionInfoProductTextVersion?: string;
  /** 版本信息产品版本 */
  VersionInfoProductVersion?: string;
  /** 版本信息原始文件名 */
  VersionInfoOriginalFileName?: string;
  /** 版本信息内部名称 */
  VersionInfoInternalName?: string;
  /** 版本信息版权 */
  VersionInfoCopyright?: string;
  /** 窗口显示标题 */
  WindowShowCaption?: boolean;
  /** 窗口可调整大小 */
  WindowResizable?: boolean;
  /** 窗口可见 */
  WindowVisible?: boolean;
  /** 向导图像文件 */
  WizardImageFile?: string;
  /** 向导小图像文件 */
  WizardSmallImageFile?: string;
  /** 向导图像背景色 */
  WizardImageBackColor?: string;
  /** 向导可调整大小 */
  WizardResizable?: boolean;
  /** 向导大小百分比 */
  WizardSizePercent?: number;
  /** 向导大小 X */
  WizardSizeX?: number;
  /** 向导大小 Y */
  WizardSizeY?: number;
  /** 额外磁盘空间需求 */
  ExtraDiskSpaceRequired?: number;
  /** 追加默认目录名 */
  AppendDefaultDirName?: boolean;
  /** 追加默认组名 */
  AppendDefaultGroupName?: boolean;
  /** 内部压缩级别 */
  InternalCompressLevel?: InternalCompressLevel;
  /** 合并重复文件 */
  MergeDuplicateFiles?: boolean;
  /** 保留字节数 */
  ReserveBytes?: number;
  /** 时间戳使用 UTC */
  TimeStampsInUTC?: boolean;
  /** 文件修改日期 */
  TouchDate?: string;
  /** 文件修改时间 */
  TouchTime?: string;
  /** 使用设置加载器 */
  UseSetupLdr?: boolean;
}

// ============================================================================
// Languages 部分
// ============================================================================

/** 语言配置 */
export interface InnoSetupLanguage {
  /** 语言名称标识符 */
  Name: string;
  /** 消息文件路径（使用 compiler: 前缀表示内置文件） */
  MessagesFile: string;
  /** 许可证文件路径 */
  LicenseFile?: string;
  /** 信息前文件路径 */
  InfoBeforeFile?: string;
  /** 信息后文件路径 */
  InfoAfterFile?: string;
}

// ============================================================================
// Tasks 部分
// ============================================================================

/** 任务配置 */
export interface InnoSetupTask {
  /** 任务名称标识符 */
  Name: string;
  /** 显示给用户的任务描述 */
  Description: string;
  /** 分组描述 */
  GroupDescription?: string;
  /** 任务标志 */
  Flags?: string;
  /** 所属组件 */
  Components?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// Types 部分
// ============================================================================

/** 安装类型配置 */
export interface InnoSetupType {
  /** 类型名称标识符 */
  Name: string;
  /** 显示给用户的类型描述 */
  Description: string;
  /** 类型标志 */
  Flags?: string;
}

// ============================================================================
// Components 部分
// ============================================================================

/** 组件配置 */
export interface InnoSetupComponent {
  /** 组件名称标识符 */
  Name: string;
  /** 显示给用户的组件描述 */
  Description: string;
  /** 所属类型 */
  Types?: string;
  /** 组件标志 */
  Flags?: string;
  /** 额外磁盘空间需求（字节） */
  ExtraDiskSpaceRequired?: number;
}

// ============================================================================
// Files 部分
// ============================================================================

/** 文件安装配置 */
export interface InnoSetupFile {
  /** 源文件路径（支持通配符） */
  Source: string;
  /** 目标目录 */
  DestDir: string;
  /** 目标文件名 */
  DestName?: string;
  /** 文件标志 */
  Flags?: string;
  /** 文件权限 */
  Permissions?: string;
  /** 强名称程序集 */
  StrongAssemblyName?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 所属语言 */
  Languages?: string;
  /** 检查条件函数名 */
  Check?: string;
  /** 安装前调用函数 */
  BeforeInstall?: string;
  /** 安装后调用函数 */
  AfterInstall?: string;
  /** 文件属性 */
  Attribs?: string;
  /** 字体安装名称 */
  FontInstall?: string;
}

// ============================================================================
// Dirs 部分
// ============================================================================

/** 目录配置 */
export interface InnoSetupDir {
  /** 目录名称/路径 */
  Name: string;
  /** 目录权限 */
  Permissions?: string;
  /** 目录属性 */
  Attribs?: string;
  /** 目录标志 */
  Flags?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// Icons 部分
// ============================================================================

/** 图标（快捷方式）配置 */
export interface InnoSetupIcon {
  /** 快捷方式名称/位置 */
  Name: string;
  /** 目标文件名 */
  Filename: string;
  /** 命令行参数 */
  Parameters?: string;
  /** 工作目录 */
  WorkingDir?: string;
  /** 热键组合 */
  HotKey?: string;
  /** 快捷方式注释 */
  Comment?: string;
  /** 自定义图标文件名 */
  IconFilename?: string;
  /** 图标索引 */
  IconIndex?: number;
  /** Windows 任务栏应用程序用户模型 ID */
  AppUserModelID?: string;
  /** 快捷方式标志 */
  Flags?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 所属语言 */
  Languages?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// INI 部分
// ============================================================================

/** INI 文件操作配置 */
export interface InnoSetupINI {
  /** INI 文件名 */
  Filename: string;
  /** 节名称 */
  Section: string;
  /** 键名 */
  Key?: string;
  /** 字符串值 */
  String?: string;
  /** 操作标志 */
  Flags?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// InstallDelete 部分
// ============================================================================

/** 删除类型 */
export type DeleteType = "files" | "filesandordirs" | "dirifempty";

/** 安装时删除配置 */
export interface InnoSetupInstallDelete {
  /** 删除类型 */
  Type: DeleteType;
  /** 文件/目录名称/模式 */
  Name: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// UninstallDelete 部分
// ============================================================================

/** 卸载时删除配置 */
export interface InnoSetupUninstallDelete {
  /** 删除类型 */
  Type: DeleteType;
  /** 文件/目录名称/模式 */
  Name: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// Registry 部分
// ============================================================================

/** 注册表根键 */
export type RegistryRoot =
  | "HKCR"
  | "HKCU"
  | "HKLM"
  | "HKU"
  | "HKCC"
  | "HKEY_CLASSES_ROOT"
  | "HKEY_CURRENT_USER"
  | "HKEY_LOCAL_MACHINE"
  | "HKEY_USERS"
  | "HKEY_CURRENT_CONFIG";

/** 注册表值类型 */
export type RegistryValueType =
  | "none"
  | "string"
  | "expandsz"
  | "multisz"
  | "dword"
  | "qword"
  | "binary";

/** 注册表配置 */
export interface InnoSetupRegistry {
  /** 根键 */
  Root: RegistryRoot;
  /** 子键路径 */
  Subkey: string;
  /** 值类型 */
  ValueType?: RegistryValueType;
  /** 值名称 */
  ValueName?: string;
  /** 值数据 */
  ValueData?: string | number;
  /** 权限 */
  Permissions?: string;
  /** 注册表标志 */
  Flags?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// Run 部分
// ============================================================================

/** 运行配置（安装后执行） */
export interface InnoSetupRun {
  /** 要执行的文件名 */
  Filename: string;
  /** 命令行参数 */
  Parameters?: string;
  /** 工作目录 */
  WorkingDir?: string;
  /** 状态消息 */
  StatusMsg?: string;
  /** 显示给用户的描述 */
  Description?: string;
  /** 运行标志 */
  Flags?: string;
  /** 运行一次 ID */
  RunOnceId?: string;
  /** 动词（用于 ShellExecute） */
  Verb?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 所属语言 */
  Languages?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// UninstallRun 部分
// ============================================================================

/** 卸载运行配置 */
export interface InnoSetupUninstallRun {
  /** 要执行的文件名 */
  Filename: string;
  /** 命令行参数 */
  Parameters?: string;
  /** 工作目录 */
  WorkingDir?: string;
  /** 状态消息 */
  StatusMsg?: string;
  /** 描述 */
  Description?: string;
  /** 运行标志 */
  Flags?: string;
  /** 运行一次 ID */
  RunOnceId?: string;
  /** 所属组件 */
  Components?: string;
  /** 所属任务 */
  Tasks?: string;
  /** 检查条件函数名 */
  Check?: string;
}

// ============================================================================
// Messages 部分
// ============================================================================

/** 自定义消息（键值对） */
export interface InnoSetupMessages {
  readonly [key: string]: string;
}

// ============================================================================
// 完整 Inno Setup 配置
// ============================================================================

/** 完整 Inno Setup 脚本配置 */
export interface InnoSetupConfig {
  /** 预处理器定义 */
  Defines?: InnoSetupDefines;
  /** Setup 部分（必需） */
  Setup: InnoSetupSetupSection;
  /** Languages 部分 */
  Languages?: readonly InnoSetupLanguage[];
  /** Types 部分 */
  Types?: readonly InnoSetupType[];
  /** Components 部分 */
  Components?: readonly InnoSetupComponent[];
  /** Tasks 部分 */
  Tasks?: readonly InnoSetupTask[];
  /** Files 部分 */
  Files?: readonly InnoSetupFile[];
  /** Dirs 部分 */
  Dirs?: readonly InnoSetupDir[];
  /** Icons 部分 */
  Icons?: readonly InnoSetupIcon[];
  /** INI 部分 */
  INI?: readonly InnoSetupINI[];
  /** InstallDelete 部分 */
  InstallDelete?: readonly InnoSetupInstallDelete[];
  /** UninstallDelete 部分 */
  UninstallDelete?: readonly InnoSetupUninstallDelete[];
  /** Registry 部分 */
  Registry?: readonly InnoSetupRegistry[];
  /** Run 部分 */
  Run?: readonly InnoSetupRun[];
  /** UninstallRun 部分 */
  UninstallRun?: readonly InnoSetupUninstallRun[];
  /** Messages 部分 */
  Messages?: InnoSetupMessages;
  /** CustomMessages 部分 */
  CustomMessages?: InnoSetupMessages;
  /** Pascal 代码部分 */
  Code?: string;
}

// ============================================================================
// Maker 配置
// ============================================================================

/** 路径解析配置 */
export interface PathConfig {
  /** 项目根目录 */
  projectDir?: string;
  /** 资源目录（相对于 projectDir） */
  assetsDir?: string;
  /** 构建输出目录 */
  buildDir?: string;
}

/** Maker 配置选项 */
export interface MakerInnosetupConfig {
  /** 完整 Inno Setup 配置 */
  config?: InnoSetupConfig;

  /** 自定义 .iss 脚本路径（如果提供，则覆盖 config） */
  scriptPath?: string;

  /** Inno Setup 编译器路径（ISCC.exe） */
  innosetupPath?: string;

  /** 安装包输出目录 */
  outputDir?: string;

  /** 使用 GUI 模式编译 */
  gui?: boolean;

  /** 额外的 ISCC 命令行选项 */
  isccOptions?: readonly string[];

  /** 应用程序名称（config.Setup.AppName 的快捷方式） */
  appName?: string;

  /** 应用程序版本（config.Setup.AppVersion 的快捷方式） */
  appVersion?: string;

  /** 应用程序发布者（config.Setup.AppPublisher 的快捷方式） */
  appPublisher?: string;

  /** 应用程序 ID（config.Setup.AppId 的快捷方式） */
  appId?: string;

  /** 许可证文件路径（支持相对路径） */
  licenseFile?: string;

  /** 安装图标文件路径（支持相对路径） */
  setupIconFile?: string;

  /** 创建桌面图标 */
  createDesktopIcon?: boolean;

  /** 创建快速启动图标 */
  createQuickLaunchIcon?: boolean;

  /** 编译超时时间（毫秒，默认: 300000 = 5 分钟） */
  compileTimeout?: number;

  /** 路径配置 */
  paths?: PathConfig;

  /** 自动将相对路径解析为绝对路径（默认: true） */
  resolveRelativePaths?: boolean;
}

// ============================================================================
// 架构工具
// ============================================================================

/** 架构标识符类型 */
export type Architecture = "x64" | "ia32" | "x86" | "arm64";

/**
 * 获取指定架构的 ArchitecturesAllowed 值
 */
export function getArchitecturesAllowed(arch: Architecture): string {
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
 * 从目标架构字符串获取架构标识符
 */
export function getArchIdentifier(arch: string): string {
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
