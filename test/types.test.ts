/**
 * Type definition tests - ensure all types are correctly defined
 */

import MakerInnosetup, { type MakerInnosetupConfig, type InnoSetupConfig } from "../src/index";

describe("Type Definition Tests", () => {
  it("should support basic configuration", () => {
    const basicConfig: MakerInnosetupConfig = {
      appName: "TestApp",
      appVersion: "1.0.0",
      appPublisher: "Test Publisher",
    };

    const maker = new MakerInnosetup(basicConfig);
    expect(maker.name).toBe("innosetup");
    expect(maker.defaultPlatforms).toContain("win32");
  });

  it("should support full configuration", () => {
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
          OutputDir: "./out",
          Compression: "lzma2",
          SolidCompression: true,
        },
      },
    };

    const maker = new MakerInnosetup(fullConfig, ["win32"]);
    expect(maker.name).toBe("innosetup");
  });

  it("should support empty configuration", () => {
    const maker = new MakerInnosetup();
    expect(maker.name).toBe("innosetup");
    expect(maker.defaultPlatforms).toContain("win32");
  });

  it("should support architecture configuration", () => {
    const archConfig: MakerInnosetupConfig = {
      appName: "TestApp",
      config: {
        Setup: {
          AppName: "TestApp",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\TestApp",
          OutputDir: "./out",
          ArchitecturesAllowed: "x64compatible and x86compatible",
          ArchitecturesInstallIn64BitMode: "x64compatible",
        },
      },
    };

    const maker = new MakerInnosetup(archConfig);
    expect(maker.name).toBe("innosetup");
  });

  it("should support ARM64 configuration", () => {
    const arm64Config: MakerInnosetupConfig = {
      appName: "TestApp-ARM64",
      config: {
        Setup: {
          AppName: "TestApp-ARM64",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\TestApp",
          OutputDir: "./out",
          ArchitecturesAllowed: "arm64 and x64compatible",
        },
      },
    };

    const maker = new MakerInnosetup(arm64Config);
    expect(maker.name).toBe("innosetup");
  });

  it("should support script path configuration", () => {
    const scriptConfig: MakerInnosetupConfig = {
      scriptPath: "./custom-installer.iss",
    };

    const maker = new MakerInnosetup(scriptConfig);
    expect(maker.name).toBe("innosetup");
  });

  it("should support complete InnoSetupConfig", () => {
    const innoConfig: InnoSetupConfig = {
      Setup: {
        AppName: "MyApp",
        AppVersion: "1.0.0",
        DefaultDirName: "{autopf}\\MyApp",
        OutputDir: "./output",
        AppPublisher: "My Company",
        Compression: "lzma2",
        SolidCompression: true,
        PrivilegesRequired: "admin",
        WizardStyle: "modern",
      },
      Languages: [
        { Name: "english", MessagesFile: "compiler:Default.isl" },
        { Name: "chinesesimplified", MessagesFile: "compiler:Languages\\ChineseSimplified.isl" },
      ],
      Files: [
        {
          Source: "{build}\\*",
          DestDir: "{app}",
          Flags: "ignoreversion recursesubdirs createallsubdirs",
        },
      ],
      Icons: [
        { Name: "{group}\\MyApp", Filename: "{app}\\MyApp.exe" },
      ],
      Run: [
        {
          Filename: "{app}\\MyApp.exe",
          Description: "Launch MyApp",
          Flags: "nowait postinstall skipifsilent",
        },
      ],
    };

    const makerConfig: MakerInnosetupConfig = {
      config: innoConfig,
    };

    const maker = new MakerInnosetup(makerConfig);
    expect(maker.name).toBe("innosetup");
  });
});