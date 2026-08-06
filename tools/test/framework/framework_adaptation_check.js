/*
 *Author  : XW
 *Desc    : 公共框架项目适配边界检查
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../..");

/** 读取仓库文本。 */
function read(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

/** 断言条件成立。 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

const xConstSource = read("assets/script/base/define/XConst.ts");
assert(/REAL_SCREEN_WIDTH\s*=\s*1334/.test(xConstSource), "XConst 必须使用飞鸿设计宽度 1334");
assert(/REAL_SCREEN_HEIGHT\s*=\s*750/.test(xConstSource), "XConst 必须使用飞鸿设计高度 750");
assert(!/IS_LOCAL_MODE/.test(xConstSource), "未同步 LocalServer 时不得保留本地模式入口");

const networkSource = read("assets/script/base/net/NetWorkMgr.ts");
assert(!/IS_LOCAL_MODE/.test(networkSource), "NetWorkMgr 不得保留无实现的本地模式分支");

const videoSource = read("assets/script/fairyGUI/GVideoPlayer.ts");
assert(/^\s*this\._videoPlayer\.stayOnBottom\s*=\s*true;/m.test(videoSource), "Web 视频必须保持在 Canvas 下方");

const uiConfigSource = read("assets/script/fairyGUI/UIConfig.ts");
assert(!/registerFont\([^)]*bundle/.test(uiConfigSource), "registerFont 不得保留未实现的 bundle 参数");
assert(!/registerFont[\s\S]*?return null;[\s\S]*?getFontByName/.test(uiConfigSource), "registerFont 加载失败时不得返回 null 继续初始化");

const skillRoot = path.join(repoRoot, "Angents/Skills");
const forbiddenSkillPattern = /CreatChar|GameMain|MapDB|StartGameCom|LoginCom|C2S_START_GAME_INFO|创角|主场景|开始游戏|1138\s*x\s*640|1138,640|569,320/;
assert(!forbiddenSkillPattern.test(read("AGENTS.md")), "AGENTS.md 保留了源项目业务或分辨率");
/** 递归检查 Skill 文档。 */
function checkSkillDirectory(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            checkSkillDirectory(entryPath);
            continue;
        }
        if (!entry.name.endsWith(".md")) continue;
        const content = fs.readFileSync(entryPath, "utf8");
        assert(!forbiddenSkillPattern.test(content), `Skill 保留了源项目业务或分辨率: ${path.relative(repoRoot, entryPath)}`);
        for (const match of content.matchAll(/`node\s+(tools\/test\/[^`\s]+\.js)`/g)) {
            assert(fs.existsSync(path.join(repoRoot, match[1])), `Skill 测试引用不存在: ${path.relative(repoRoot, entryPath)} -> ${match[1]}`);
        }
    }
}
checkSkillDirectory(skillRoot);

console.log("framework_adaptation_check passed");
