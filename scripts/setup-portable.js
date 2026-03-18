#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const innosetupInstallPaths = [
  "C:\\Program Files (x86)\\Inno Setup 6",
  "C:\\Program Files\\Inno Setup 6",
  "C:\\Program Files (x86)\\Inno Setup 5",
  "C:\\Program Files\\Inno Setup 5",
];

const vendorPath = path.join(__dirname, "..", "vendor", "innosetup");

console.log("\x1b[36m%s\x1b[0m", "Setting up Innosetup portable version...");
console.log("");

// 查找已安装的 Innosetup
let installedPath = null;
for (const checkPath of innosetupInstallPaths) {
  if (fs.existsSync(checkPath)) {
    installedPath = checkPath;
    console.log("\x1b[32m%s\x1b[0m", `Found Innosetup at: ${installedPath}`);
    break;
  }
}

if (!installedPath) {
  console.log("\x1b[33m%s\x1b[0m", "Innosetup not found on system.");
  console.log(
    "\x1b[33m%s\x1b[0m",
    "Please download and install Innosetup from: https://jrsoftware.org/isdl.php"
  );
  process.exit(1);
}

// 创建 vendor 目录
if (!fs.existsSync(vendorPath)) {
  fs.mkdirSync(vendorPath, { recursive: true });
  console.log("\x1b[32m%s\x1b[0m", `Created directory: ${vendorPath}`);
}

// 需要复制的文件
const filesToCopy = [
  "ISCC.exe",
  "ISCmplr.dll",
  "Default.isl",
  "Setup.e32",
  "SetupLdr.e32",
  "ISPP.dll",
  "ISPPBuiltins.iss",
];

// 复制文件
console.log("");
console.log("\x1b[36m%s\x1b[0m", "Copying files...");

for (const file of filesToCopy) {
  const sourcePath = path.join(installedPath, file);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(vendorPath, file));
    console.log("\x1b[90m%s\x1b[0m", `  Copied: ${file}`);
  } else {
    console.log("\x1b[90m%s\x1b[0m", `  Skipped: ${file} (not found)`);
  }
}

// 复制 Languages 目录
const sourceLangPath = path.join(installedPath, "Languages");
const destLangPath = path.join(vendorPath, "Languages");

if (fs.existsSync(sourceLangPath)) {
  if (!fs.existsSync(destLangPath)) {
    fs.mkdirSync(destLangPath, { recursive: true });
  }

  const langFiles = fs.readdirSync(sourceLangPath).filter((f) => f.endsWith(".isl"));
  for (const langFile of langFiles) {
    fs.copyFileSync(path.join(sourceLangPath, langFile), path.join(destLangPath, langFile));
  }
  console.log(
    "\x1b[90m%s\x1b[0m",
    `  Copied: Languages directory (${langFiles.length} language files)`
  );
}

console.log("");
console.log("\x1b[32m%s\x1b[0m", "Setup completed successfully!");
console.log("");
console.log("\x1b[36m%s\x1b[0m", `Portable version location: ${vendorPath}`);
console.log("");

// 显示文件大小
function getDirectorySize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

const totalSize = getDirectorySize(vendorPath) / (1024 * 1024);
console.log("\x1b[90m%s\x1b[0m", `Total size: ${totalSize.toFixed(2)} MB`);
console.log("");
console.log("\x1b[32m%s\x1b[0m", "You can now use the maker without system-installed Innosetup!");
