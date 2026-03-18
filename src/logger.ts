import debug from "debug";

/** 日志命名空间 */
const LOG_NAMESPACE = "electron-forge-maker-innosetup";

/**
 * 创建命名空间的调试器实例
 */
function createDebugger(subNamespace: string): debug.Debugger {
  return debug(`${LOG_NAMESPACE}:${subNamespace}`);
}

/** 主日志 - 通用操作 */
export const log = createDebugger("main");

/** 路径日志 - 路径解析操作 */
export const logPath = createDebugger("path");

/** 配置日志 - 配置操作 */
export const logConfig = createDebugger("config");

/** 生成器日志 - 脚本生成 */
export const logGenerator = createDebugger("generator");

/** 解析器日志 - 脚本解析 */
export const logParser = createDebugger("parser");

/** 编译日志 - 编译过程 */
export const logCompile = createDebugger("compile");

/** 错误日志 - 始终在开发环境启用 */
export const logError = createDebugger("error");

/**
 * 启用所有日志
 * @example
 * enableDebug();
 * // 或通过环境变量:
 * // DEBUG=electron-forge-maker-innosetup:* node your-script.js
 */
export function enableDebug(): void {
  debug.enable(`${LOG_NAMESPACE}:*`);
}

/**
 * 禁用所有日志
 */
export function disableDebug(): void {
  debug.disable();
}

/**
 * 检查是否启用了调试日志
 */
export function isDebugEnabled(): boolean {
  return debug.enabled(`${LOG_NAMESPACE}:*`);
}