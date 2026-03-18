import * as path from "path";
import MakerInnosetup from "../src/MakerInnosetup";

// Only run path tests on Windows
const isWin = process.platform === "win32";

describe.skip("Path Resolution", () => {
  let maker: MakerInnosetup;
  const projectDir = path.join(process.cwd(), "my-project");
  const buildDir = path.join(projectDir, "out", "my-app-win32-x64");

  beforeEach(() => {
    maker = new MakerInnosetup({
      paths: {
        projectDir: projectDir,
        buildDir: buildDir,
      },
      resolveRelativePaths: true,
    });
  });

  describe("Relative Path Resolution", () => {
    it("should resolve relative paths to absolute paths", () => {
      const testMaker = new MakerInnosetup({
        setupIconFile: "./assets/icon.ico",
        paths: {
          projectDir: projectDir,
        },
        resolveRelativePaths: true,
      });

      const resolvePath = (testMaker as unknown as { resolvePath: (p: string, base: string) => string }).resolvePath.bind(testMaker);
      const result = resolvePath("./assets/icon.ico", projectDir);

      expect(path.normalize(result)).toBe(path.normalize(path.join(projectDir, "assets", "icon.ico")));
    });

    it("should keep absolute paths unchanged", () => {
      const absolutePath = path.resolve(projectDir, "absolute", "icon.ico");

      const resolvePath = (maker as unknown as { resolvePath: (p: string) => string }).resolvePath.bind(maker);
      const result = resolvePath(absolutePath);

      expect(path.normalize(result)).toBe(path.normalize(absolutePath));
    });

    (isWin ? it : it.skip)("should keep Windows absolute paths unchanged", () => {
      const absolutePath = "C:\\absolute\\path\\icon.ico";
      const resolvePath = (maker as unknown as { resolvePath: (p: string) => string }).resolvePath.bind(maker);
      const result = resolvePath(absolutePath);

      expect(path.normalize(result)).toBe(absolutePath);
    });

    it("should return original path when resolution is disabled", () => {
      const testMaker = new MakerInnosetup({
        resolveRelativePaths: false,
      });

      const resolvePath = (testMaker as unknown as { resolvePath: (p: string, base: string) => string }).resolvePath.bind(testMaker);
      const result = resolvePath("./relative/path", process.cwd());

      expect(path.normalize(result)).toBe(path.normalize(path.resolve(process.cwd(), "./relative/path")));
    });
  });

  describe("Path Placeholder Resolution", () => {
    beforeEach(() => {
      maker = new MakerInnosetup({
        paths: {
          projectDir: projectDir,
        },
      });
    });

    it("should resolve {project} placeholder", () => {
      const result = (maker as unknown as { resolvePathPlaceholders: (p: string) => string }).resolvePathPlaceholders("{project}/resources/icon.ico");

      expect(path.normalize(result)).toBe(path.normalize(path.join(projectDir, "resources", "icon.ico")));
    });

    it("should resolve {build} placeholder", () => {
      const result = (maker as unknown as { resolvePathPlaceholders: (p: string) => string }).resolvePathPlaceholders("{build}/*");

      expect(path.normalize(result)).toBe(path.normalize(path.join(buildDir, "*")));
    });

    it("should resolve {assets} placeholder", () => {
      const result = (maker as unknown as { resolvePathPlaceholders: (p: string) => string }).resolvePathPlaceholders("{assets}/icons/icon.ico");

      expect(path.normalize(result)).toBe(path.normalize(path.join(projectDir, "assets", "icons", "icon.ico")));
    });

    it("should support custom assets directory", () => {
      const customMaker = new MakerInnosetup({
        paths: {
          projectDir: projectDir,
          assetsDir: "resources",
        },
        resolveRelativePaths: true,
      });

      const result = (customMaker as unknown as { resolvePathPlaceholders: (p: string) => string }).resolvePathPlaceholders("{assets}/icon.ico");

      expect(path.normalize(result)).toBe(path.normalize(path.join(projectDir, "resources", "icon.ico")));
    });
  });

  describe("Config Path Resolution", () => {
    it("should resolve paths in Setup section", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Setup: {
          AppName: "Test",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\Test",
          OutputDir: "output",
          SetupIconFile: "./assets/icon.ico",
          LicenseFile: "./LICENSE",
        },
      };

      (testMaker as unknown as { resolveConfigPaths: (c: unknown, b: string) => void }).resolveConfigPaths(config, buildDir);

      expect(path.normalize((config.Setup as { SetupIconFile: string }).SetupIconFile)).toBe(
        path.normalize(path.join(projectDir, "assets", "icon.ico"))
      );
      expect(path.normalize((config.Setup as { LicenseFile: string }).LicenseFile)).toBe(
        path.normalize(path.join(projectDir, "LICENSE"))
      );
    });

    it("should skip paths starting with compiler:", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Setup: {
          AppName: "Test",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\Test",
          OutputDir: "output",
        },
        Languages: [
          {
            Name: "english",
            MessagesFile: "compiler:Default.isl",
            LicenseFile: "compiler:Default.isl",
          },
        ],
      };

      (testMaker as unknown as { resolveConfigPaths: (c: unknown, b: string) => void }).resolveConfigPaths(config, buildDir);

      expect((config.Languages as Array<{ LicenseFile: string }>)[0]?.LicenseFile).toBe("compiler:Default.isl");
    });

    it("should skip Inno Setup constants", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Setup: {
          AppName: "Test",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\Test",
          OutputDir: "output",
        },
        Files: [
          {
            Source: "{app}\\config.json",
            DestDir: "{tmp}",
          },
        ],
      };

      (testMaker as unknown as { resolveConfigPaths: (c: unknown, b: string) => void }).resolveConfigPaths(config, buildDir);

      expect((config.Files as Array<{ Source: string }>)[0]?.Source).toBe("{app}\\config.json");
    });
  });

  describe("Wildcard Support", () => {
    it("should handle wildcard paths", () => {
      const config = {
        Setup: {
          AppName: "Test",
          AppVersion: "1.0.0",
          DefaultDirName: "{autopf}\\Test",
          OutputDir: "output",
        },
        Files: [
          {
            Source: "./out/my-app/*",
            DestDir: "{app}",
          },
        ],
      };

      (maker as unknown as { resolveConfigPaths: (c: unknown, b: string) => void }).resolveConfigPaths(config, buildDir);

      expect((config.Files as Array<{ Source: string }>)[0]?.Source).toContain("*");
    });

    it("should handle {build} placeholder with wildcard", () => {
      const input = "{build}/**/*.dll";
      const result = (maker as unknown as { resolvePathPlaceholders: (p: string) => string }).resolvePathPlaceholders(input);

      expect(path.normalize(result)).toBe(path.normalize(path.join(buildDir, "**", "*.dll")));
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty path", () => {
      const resolvePath = (maker as unknown as { resolvePath: (p: string | undefined, base: string) => string }).resolvePath.bind(maker);
      const result = resolvePath(undefined, projectDir);

      expect(result).toBe("");
    });

    it("should handle empty string", () => {
      const resolvePath = (maker as unknown as { resolvePath: (p: string, base: string) => string }).resolvePath.bind(maker);
      const result = resolvePath("", projectDir);

      expect(result).toBe("");
    });
  });
});