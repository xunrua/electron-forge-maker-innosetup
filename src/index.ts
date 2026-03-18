export { default } from "./MakerInnosetup";
export { default as MakerInnosetup } from "./MakerInnosetup";
export * from "./types";
export { InnoScriptGenerator } from "./generator";
export { InnoScriptParser } from "./parser";
export {
  MakerInnosetupError,
  CompilerNotFoundError,
  CompilationError,
  CompilationTimeoutError,
  ParseError,
  ConfigValidationError,
  InstallerNotFoundError,
  PlatformNotSupportedError,
} from "./errors";
export {
  log,
  logPath,
  logConfig,
  logGenerator,
  logParser,
  logCompile,
  logError,
  enableDebug,
  disableDebug,
  isDebugEnabled,
} from "./logger";
