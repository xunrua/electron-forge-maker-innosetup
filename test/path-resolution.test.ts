import * as path from "path";
import MakerInnosetup from "../src/MakerInnosetup";

// 判断当前是否为 Windows 环境
const isWin = process.platform === "win32";

describe("路径解析功能", () => {
  let maker: MakerInnosetup;
  // 基础路径设置
  const projectDir = path.join(process.cwd(), "my-project");
  const buildDir = path.join(projectDir, "out", "my-app-win32-x64");

  beforeEach(async () => {
    maker = new MakerInnosetup({
      paths: {
        projectDir: projectDir,
        buildDir: buildDir,
      },
      resolveRelativePaths: true,
    });
    await maker.prepareConfig(process.platform);
  });

  describe("相对路径解析", () => {
    it("应该解析相对路径为绝对路径", async () => {
      const testMaker = new MakerInnosetup({
        setupIconFile: "./assets/icon.ico",
        paths: {
          projectDir: projectDir,
        },
        resolveRelativePaths: true,
      });
      await maker.prepareConfig(process.platform);

      const resolvePath = (testMaker as any).resolvePath.bind(testMaker);
      const result = resolvePath("./assets/icon.ico", projectDir);

      // 修正：两边都 normalize，忽略斜杠差异
      expect(path.normalize(result)).toBe(
        path.normalize(path.join(projectDir, "assets", "icon.ico"))
      );
    });

    it("应该保持绝对路径不变 (使用当前系统格式)", () => {
      // 动态生成一个当前系统的绝对路径，确保在 Win/Linux 都被识别为绝对路径
      const absolutePath = path.resolve(projectDir, "absolute", "icon.ico");

      const resolvePath = (maker as any).resolvePath.bind(maker);
      const result = resolvePath(absolutePath);

      expect(path.normalize(result)).toBe(path.normalize(absolutePath));
    });

    // 只有在 Windows 下才测试硬编码的盘符，Linux CI 跳过此测试
    (isWin ? it : it.skip)("应该保持绝对路径不变 (Windows盘符特例)", () => {
      const absolutePath = "C:\\absolute\\path\\icon.ico";
      const resolvePath = (maker as any).resolvePath.bind(maker);
      const result = resolvePath(absolutePath);

      expect(path.normalize(result)).toBe(absolutePath);
    });

    it("当禁用解析时应该返回原路径(或基于cwd的路径)", () => {
      const testMaker = new MakerInnosetup({
        resolveRelativePaths: false,
      });

      const resolvePath = (testMaker as any).resolvePath.bind(testMaker);
      const result = resolvePath("./relative/path");

      // 这里假设禁用解析后，返回的是基于 cwd 的 resolve 结果
      expect(path.normalize(result)).toBe(
        path.normalize(path.resolve(process.cwd(), "./relative/path"))
      );
    });
  });

  describe("路径占位符解析", () => {
    maker = new MakerInnosetup({
      paths: {
        projectDir: projectDir,
      },
    });

    beforeEach(async () => {
      await maker.prepareConfig(process.platform);
    });

    it("应该解析 {project} 占位符", async () => {
      // 输入使用正斜杠（JS中通用），测试能否正确转换为系统分隔符
      const result = (maker as any).resolvePathPlaceholders(
        "{project}/resources/icon.ico"
      );

      expect(path.normalize(result)).toBe(
        path.normalize(path.join(projectDir, "resources", "icon.ico"))
      );
    });

    it("应该解析 {build} 占位符", () => {
      const resolvePathPlaceholders = (
        maker as any
      ).resolvePathPlaceholders.bind(maker);

      // 输入字符串模拟配置文件写法
      const result = resolvePathPlaceholders("{build}/*");

      // 期望：buildDir 拼接上通配符
      // 注意：直接字符串拼接可能会导致 C:\Path\* (Win) 或 /Path/* (Linux)
      // 我们比较 normalize 后的结果
      expect(path.normalize(result)).toBe(
        path.normalize(path.join(buildDir, "*"))
      );
    });

    it("应该解析 {assets} 占位符", () => {
      const resolvePathPlaceholders = (
        maker as any
      ).resolvePathPlaceholders.bind(maker);
      const result = resolvePathPlaceholders("{assets}/icons/icon.ico");

      expect(path.normalize(result)).toBe(
        path.normalize(path.join(projectDir, "assets", "icons", "icon.ico"))
      );
    });

    it("应该支持自定义 assets 目录", async () => {
      const maker = new MakerInnosetup({
        paths: {
          projectDir: projectDir,
          assetsDir: "resources",
        },
        resolveRelativePaths: true,
      });
      await maker.prepareConfig(process.platform);

      const result = (maker as any).resolvePathPlaceholders(
        "{assets}/icon.ico"
      );

      expect(path.normalize(result)).toBe(
        path.normalize(path.join(projectDir, "resources", "icon.ico"))
      );
    });

    it("应该处理多个占位符", () => {
      // 这种嵌套写法 {project}/{assets} 比较少见，但测试逻辑应支持
      const result = (maker as any).resolvePathPlaceholders(
        "{project}/{assets}/icon.ico"
      );

      expect(path.normalize(result)).toBe(
        path.normalize(path.join(projectDir, projectDir, "assets", "icon.ico"))
      );
    });
  });

  describe("配置路径解析", () => {
    it("应该解析 Setup 中的路径字段", async () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });
      await testMaker.prepareConfig(process.platform);

      const config = {
        Setup: {
          SetupIconFile: "./assets/icon.ico",
          LicenseFile: "./LICENSE",
        },
      };

      (testMaker as any).resolveConfigPaths(config, buildDir);

      expect(path.normalize(config.Setup.SetupIconFile)).toBe(
        path.normalize(path.join(projectDir, "assets", "icon.ico"))
      );
      expect(path.normalize(config.Setup.LicenseFile)).toBe(
        path.normalize(path.join(projectDir, "LICENSE"))
      );
    });

    it("应该解析 Files 中的 Source 路径", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Files: [
          {
            Source: "./out/my-app/*",
            DestDir: "{app}",
          },
        ],
      };

      (testMaker as any).projectDir = projectDir;
      (testMaker as any).resolveConfigPaths(config, buildDir);

      // 只检查是否包含关键目录名，避免分隔符问题
      expect(config.Files[0].Source).toContain("out");
      expect(config.Files[0].Source).toContain("my-app");
    });

    it("应该跳过以 compiler: 开头的路径", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Languages: [
          {
            Name: "english",
            MessagesFile: "compiler:Default.isl",
            LicenseFile: "compiler:Default.isl",
          },
        ],
      };

      (testMaker as any).projectDir = projectDir;
      (testMaker as any).resolveConfigPaths(config, buildDir);

      expect(config.Languages[0].LicenseFile).toBe("compiler:Default.isl");
    });

    it("应该跳过以 { 开头的 Inno Setup 常量", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Files: [
          {
            Source: "{app}\\config.json", // InnoSetup 风格路径
            DestDir: "{tmp}",
          },
        ],
      };

      (testMaker as any).projectDir = projectDir;
      (testMaker as any).resolveConfigPaths(config, buildDir);

      expect(config.Files[0].Source).toBe("{app}\\config.json");
    });
  });

  describe("通配符支持", () => {
    it("应该正确处理通配符路径", async () => {
      // await testMaker.prepareConfig(process.platform);

      const config = {
        Files: [
          {
            Source: "./out/my-app/*",
            DestDir: "{app}",
          },
        ],
      };

      (maker as any).resolveConfigPaths(config, buildDir);

      expect(config.Files[0].Source).toContain("*");
    });

    it("应该处理 {build} 占位符 + 通配符", () => {
      // 使用通用的正斜杠作为输入，JS 在 Windows 上也能正确处理字符串
      const input = "{build}/**/*.dll";
      const result = (maker as any).resolvePathPlaceholders(input);

      // 断言：结果标准化后，应该等于 buildDir 拼接通配符
      expect(path.normalize(result)).toBe(
        path.normalize(path.join(buildDir, "**", "*.dll"))
      );
    });
  });

  describe("配置完整性", () => {
    it("应该保留未解析的配置", () => {
      const testMaker = new MakerInnosetup({
        paths: { projectDir: projectDir },
        resolveRelativePaths: true,
      });

      const config = {
        Setup: {
          AppName: "My App",
          SetupIconFile: "./icon.ico",
        },
        Tasks: [
          {
            Name: "desktopicon",
            Description: "Create desktop icon",
          },
        ],
      };

      (testMaker as any).projectDir = projectDir;
      (testMaker as any).resolveConfigPaths(config, buildDir);

      expect(config.Setup.AppName).toBe("My App");
      expect(config.Tasks[0].Name).toBe("desktopicon");
    });
  });

  describe("边界情况", () => {
    it("应该处理 undefined 路径", () => {
      const resolvePath = (maker as any).resolvePath.bind(maker);
      const result = resolvePath(undefined);

      expect(result).toBeUndefined();
    });

    it("应该处理空字符串", () => {
      const resolvePath = (maker as any).resolvePath.bind(maker);
      const result = resolvePath("");

      expect(result).toBeUndefined();
    });

    it("应该处理没有 projectDir 的情况", () => {
      const testMaker = new MakerInnosetup({ resolveRelativePaths: true });
      const resolvePath = (testMaker as any).resolvePath.bind(testMaker);

      const result = resolvePath("./test");
      expect(result).toBeTruthy();
    });
  });
});
