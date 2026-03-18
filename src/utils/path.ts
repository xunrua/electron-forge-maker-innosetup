import * as path from "path";
import * as fs from "fs";

/**
 * 检查路径是否为绝对路径
 */
export function isAbsolutePath(p: string): boolean {
  return path.isAbsolute(p);
}

/**
 * 将相对路径解析为绝对路径
 * 如果输入已经是绝对路径，则直接返回
 */
export function resolvePath(input: string, baseDir: string): string {
  if (isAbsolutePath(input)) {
    return input;
  }
  return path.resolve(baseDir, input);
}

/**
 * 确保目录存在，不存在则创建
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 获取文件路径的目录名
 */
export function getDirName(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * 连接路径片段
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * 规范化路径（解析 .. 和 . 片段）
 */
export function normalizePath(p: string): string {
  return path.normalize(p);
}

/**
 * 检查路径是否以 Inno Setup 常量开头
 * Inno Setup 常量用花括号包裹，例如 {app}, {win}, {sys}
 */
export function isInnoSetupConstant(p: string): boolean {
  return /^\{(app|tmp|src|win|sys|pf|cf|dao|fonts|userappdata|localappdata|group|autoprograms|autodesktop|commondocs|autopf)\}/i.test(p);
}

/**
 * 检查路径是否包含通配符
 */
export function hasWildcard(p: string): boolean {
  return p.includes("*") || p.includes("?");
}

/**
 * 将包含通配符的路径拆分为基础路径和通配符模式
 */
export function splitWildcardPath(p: string): { basePath: string; wildcard: string } {
  const wildcardIndex = p.search(/[*?]/);
  if (wildcardIndex === -1) {
    return { basePath: p, wildcard: "" };
  }
  return {
    basePath: p.substring(0, wildcardIndex),
    wildcard: p.substring(wildcardIndex),
  };
}