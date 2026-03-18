/**
 * ISS Parser Tests
 */

import { MakerInnosetup, InnoScriptParser } from "../src/index";

describe("ISS Parser", () => {
  const sampleIss = `
; Sample Inno Setup Script

[Setup]
AppName=My Application
AppVersion=1.0.0
AppPublisher=My Company
AppPublisherURL=https://example.com
DefaultDirName={autopf}\\MyApp
DefaultGroupName=My Application
OutputDir=output
OutputBaseFilename=myapp-setup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "{src}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\My Application"; Filename: "{app}\\MyApp.exe"
Name: "{autodesktop}\\My Application"; Filename: "{app}\\MyApp.exe"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\\MyApp"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"

[Run]
Filename: "{app}\\MyApp.exe"; Description: "Launch My Application"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
`;

  it("should parse ISS content", () => {
    const config = InnoScriptParser.parse(sampleIss);

    expect(config).toBeDefined();
    expect(config.Setup).toBeDefined();
    expect(config.Setup.AppName).toBe("My Application");
    expect(config.Setup.AppVersion).toBe("1.0.0");
    expect(config.Setup.AppPublisher).toBe("My Company");
  });

  it("should create Maker config from ISS content", () => {
    const makerConfig = MakerInnosetup.fromIssContent(sampleIss);

    expect(makerConfig).toBeDefined();
    expect(makerConfig.config).toBeDefined();
    expect(makerConfig.config?.Setup.AppName).toBe("My Application");
  });

  it("should create MakerInnosetup instance", () => {
    const maker = new MakerInnosetup({
      appName: "TestApp",
      appVersion: "1.0.0",
    });

    expect(maker).toBeDefined();
    expect(maker.name).toBe("innosetup");
  });

  it("should parse Languages section", () => {
    const config = InnoScriptParser.parse(sampleIss);

    expect(config.Languages).toBeDefined();
    expect(config.Languages?.length).toBe(2);
    expect(config.Languages?.[0]?.Name).toBe("english");
    expect(config.Languages?.[1]?.Name).toBe("chinesesimplified");
  });

  it("should parse Files section", () => {
    const config = InnoScriptParser.parse(sampleIss);

    expect(config.Files).toBeDefined();
    expect(config.Files?.length).toBeGreaterThan(0);
    expect(config.Files?.[0]?.Source).toContain("{src}");
    expect(config.Files?.[0]?.DestDir).toBe("{app}");
  });

  it("should parse Icons section", () => {
    const config = InnoScriptParser.parse(sampleIss);

    expect(config.Icons).toBeDefined();
    expect(config.Icons?.length).toBe(2);
  });

  it("should parse Code section", () => {
    const config = InnoScriptParser.parse(sampleIss);

    expect(config.Code).toBeDefined();
    expect(config.Code).toContain("InitializeSetup");
  });

  it("should throw ParseError for missing required fields", () => {
    const invalidIss = `
[Setup]
Compression=lzma2
`;

    expect(() => InnoScriptParser.parse(invalidIss)).toThrow();
  });
});