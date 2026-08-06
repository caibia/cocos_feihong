/*
 *Author  : XW
 *Desc    : 本地 Skill 注册健康检查脚本
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../../..");
const agentsPath = path.join(rootDir, "AGENTS.md");
const readmePath = path.join(rootDir, "README.md");
const skillsDir = path.join(rootDir, "Angents/Skills");
const skillNameReg = /^[a-z0-9-]+$/;
const expectedSkillCategories = new Map([
    ["runtime-debug-tracing", "流程类"],
    ["scoped-git-upload", "流程类"],
    ["db-data-pattern", "基础与质量类"],
    ["code-style", "基础与质量类"],
    ["code-quality-review", "基础与质量类"],
    ["local-server-protocol", "领域类"],
    ["language-text", "领域类"],
    ["config-runtime-pipeline", "领域类"],
    ["scene-flow-contract", "领域类"],
    ["resource-lifecycle", "领域类"],
    ["game-runtime-quality", "领域类"],
    ["fgui-mcp", "领域类"],
    ["fgui-package-normalize", "领域类"],
    ["editor-change-spec", "文档与工具类"],
]);
const removedSkillNames = ["grill-me", "agos-workflow", "check-doc", "module-model"];

/**
 * 读取 UTF-8 文本。
 * @param {string} filePath 文件路径
 * @returns {string} 文本内容
 */
function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

/**
 * 断言检查结果。
 * @param {boolean} condition 检查结果
 * @param {string} message 错误信息
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * 转为仓库相对路径。
 * @param {string} filePath 文件路径
 * @returns {string} 仓库相对路径
 */
function toRepoPath(filePath) {
    return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

/**
 * 解析 Skill frontmatter。
 * @param {string} filePath Skill 文件路径
 * @returns {{ name: string, description: string }} frontmatter 数据
 */
function parseFrontmatter(filePath) {
    const text = readText(filePath);
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    assert(match, `${toRepoPath(filePath)} 缺少 YAML frontmatter`);

    const result = {};
    for (const line of match[1].split(/\r?\n/)) {
        const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (item) {
            result[item[1]] = item[2].replace(/^["']|["']$/g, "").trim();
        }
    }
    return result;
}

/**
 * 获取 AGENTS.md 中登记的 Skill 和分类。
 * @returns {Map<string, { path: string, category: string }>} Skill 注册信息
 */
function getRegisteredSkills() {
    const result = new Map();
    const categoryReg = /^###\s+(.+)$/;
    const linkReg = /\[([a-z0-9-]+)\]\((Angents\/Skills\/([a-z0-9-]+)\/SKILL\.md)\)/;
    let category = "";

    for (const line of readText(agentsPath).split(/\r?\n/)) {
        const categoryMatch = line.match(categoryReg);
        if (categoryMatch) {
            category = categoryMatch[1].trim();
            continue;
        }
        if (!/^\|\s*\[/.test(line)) {
            continue;
        }
        const match = line.match(linkReg);
        if (!match) {
            continue;
        }
        assert(match[1] === match[3], `AGENTS.md Skill 名称和目录不一致：${line}`);
        assert(!result.has(match[1]), `AGENTS.md 重复登记 Skill：${match[1]}`);
        result.set(match[1], { path: match[2], category });
    }
    return result;
}

/**
 * 检查 Markdown 文件中的本地链接。
 * @param {string} filePath Markdown 文件路径
 */
function checkMarkdownLinks(filePath) {
    const text = readText(filePath);
    const linkReg = /\[[^\]]+\]\(([^)]+)\)/g;
    let match;
    while ((match = linkReg.exec(text))) {
        const rawTarget = match[1].trim();
        if (/^(?:https?:|mailto:|#)/.test(rawTarget)) {
            continue;
        }
        const target = rawTarget.split("#")[0].replace(/^<|>$/g, "");
        if (!target || !target.endsWith(".md")) {
            continue;
        }
        const targetPath = target.startsWith("Angents/")
            ? path.join(rootDir, target)
            : path.resolve(path.dirname(filePath), target);
        assert(fs.existsSync(targetPath), `${toRepoPath(filePath)} 引用不存在：${rawTarget}`);
    }
}

const agentsText = readText(agentsPath);
const readmeText = readText(readmePath);
const registeredSkills = getRegisteredSkills();
const skillDirectories = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
const expectedSkillNames = [...expectedSkillCategories.keys()].sort();
const activeRuleFiles = [agentsPath, readmePath];

assert(JSON.stringify([...registeredSkills.keys()].sort()) === JSON.stringify(expectedSkillNames), "AGENTS.md 本地 Skill 集合未完成精简");
assert(JSON.stringify(skillDirectories) === JSON.stringify(expectedSkillNames), "Angents/Skills 目录集合未完成精简");
assert(/## 快速通道/.test(agentsText), "AGENTS.md 缺少小功能快速通道");
assert(/快速通道[\s\S]*不创建[\s\S]*计划文档/.test(agentsText), "快速通道必须禁止为小功能创建计划文档");
assert(/快速通道[\s\S]*不强制[\s\S]*TDD/.test(agentsText), "快速通道必须取消小功能强制 TDD");
assert(/只读取[\s\S]*直接命中/.test(agentsText), "AGENTS.md 必须要求只读取直接命中的 Skill");

for (const [skillName, expectedCategory] of expectedSkillCategories) {
    const registration = registeredSkills.get(skillName);
    assert(registration.category === expectedCategory, `${skillName} 必须登记在 ${expectedCategory}`);
    const skillPath = path.join(skillsDir, skillName, "SKILL.md");
    activeRuleFiles.push(skillPath);
    assert(fs.existsSync(skillPath), `${skillName} 缺少 SKILL.md`);
    assert(fs.existsSync(path.join(rootDir, registration.path)), `${skillName} 的 AGENTS.md 路径不存在`);
    assert(skillNameReg.test(skillName), `${skillName} 目录名格式不合法`);

    const frontmatter = parseFrontmatter(skillPath);
    assert(frontmatter.name === skillName, `${skillName} frontmatter name 不匹配`);
    assert(/^Use when\b/.test(frontmatter.description || ""), `${skillName} description 必须以 Use when 开头`);
    assert(frontmatter.description.length >= 30 && frontmatter.description.length <= 500, `${skillName} description 长度不合理`);
    checkMarkdownLinks(skillPath);

    const referencesDir = path.join(skillsDir, skillName, "references");
    if (fs.existsSync(referencesDir)) {
        for (const entry of fs.readdirSync(referencesDir, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.endsWith(".md")) {
                const referencePath = path.join(referencesDir, entry.name);
                activeRuleFiles.push(referencePath);
                checkMarkdownLinks(referencePath);
            }
        }
    }
}

const activeRuleTexts = activeRuleFiles.map(readText);
for (const removedSkillName of removedSkillNames) {
    assert(!activeRuleTexts.some((text) => text.includes(removedSkillName)), `活动规则仍引用已删除 Skill：${removedSkillName}`);
}

const codeQualityReviewText = readText(path.join(skillsDir, "code-quality-review", "SKILL.md"));
const gameRuntimeQualityText = readText(path.join(skillsDir, "game-runtime-quality", "SKILL.md"));
const runtimeDebugTracingText = readText(path.join(skillsDir, "runtime-debug-tracing", "SKILL.md"));
assert(/快速通道[\s\S]*不执行本 Skill/.test(codeQualityReviewText), "code-quality-review 必须排除快速通道");
assert(!/任何代码改动最终回复前必须执行/.test(codeQualityReviewText), "code-quality-review 不得继续全量强制触发");
assert(/性能[\s\S]*事件[\s\S]*计时[\s\S]*异步/.test(gameRuntimeQualityText), "game-runtime-quality 必须聚焦运行时高风险问题");
assert(!/superpowers:test-driven-development/.test(runtimeDebugTracingText), "runtime-debug-tracing 不应重复 TDD 流程");

checkMarkdownLinks(agentsPath);
console.log("本地 Skill 注册健康检查通过");
