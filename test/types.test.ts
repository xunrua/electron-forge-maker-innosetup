/**
 * 类型测试文件 - 确保所有类型定义正确
 */

import MakerInnosetup, { MakerInnosetupConfig } from "../src/index";

describe("类型定义测试", () => {
  it("应该支持基本配置", () => {
    const basicConfig: MakerInnosetupConfig = {
      appName: "TestApp",
      appVersion: "1.0.0",
      appPublisher: "Test Publisher",
    };

    const maker = new MakerInnosetup(basicConfig);
    expect(maker.name).toBe("innosetup");
    expect(maker.defaultPlatforms).toContain("win32");
  });

  it("应该支持完整配置", () => {
    const fullConfig: MakerInnosetupConfig = {
      appName: "TestApp",
      appVersion: "1.0.0",
      appPublisher: "Test Publisher",
      appId: "{{TestApp}}",
      setupIconFile: "./icon.ico",
      licenseFile: "./LICENSE",
      outputDir: "./out",
      createDesktopIcon: true,
      createQuickLaunchIcon: false,

      config: {
        Setup: {
          AppName: "TestApp",
          AppVersion: "1.0.0",
          AppPublisher: "Test Publisher",
          AppPublisherURL: "https://test.com",
          DefaultDirName: "{autopf}\\TestApp",
          DefaultGroupName: "TestApp",
          Compression: "lzma2",
          SolidCompression: true,
        },
      },
    };

    const maker = new MakerInnosetup(fullConfig, ["win32"]);
    expect(maker.name).toBe("innosetup");
  });

  it("应该支持空配置", () => {
    const maker = new MakerInnosetup();
    expect(maker.name).toBe("innosetup");
    expect(maker.defaultPlatforms).toContain("win32");
  });

  it("应该支持架构配置", () => {
    const archConfig: MakerInnosetupConfig = {
      appName: "TestApp",
      config: {
        Setup: {
          ArchitecturesAllowed: "x64compatible and x86compatible",
          ArchitecturesInstallIn64BitMode: "x64compatible",
        },
      },
    };

    const maker = new MakerInnosetup(archConfig);
    expect(maker.name).toBe("innosetup");
  });

  it("应该支持 ARM64 配置", () => {
    const arm64Config: MakerInnosetupConfig = {
      appName: "TestApp-ARM64",
      config: {
        Setup: {
          ArchitecturesAllowed: "arm64 and x64compatible",
        },
      },
    };

    const maker = new MakerInnosetup(arm64Config);
    expect(maker.name).toBe("innosetup");
  });

  it("应该支持脚本路径配置", () => {
    const scriptConfig: MakerInnosetupConfig = {
      scriptPath: "./custom-installer.iss",
    };

    const maker = new MakerInnosetup(scriptConfig);
    expect(maker.name).toBe("innosetup");
  });
});
