/**
*Author  : XW
*Desc    : 登录背景视频的 Web Canvas 配置测试
*/

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ENGINE_SETTINGS_PATH = path.resolve(__dirname, "../settings/v2/packages/engine.json");
const settings = JSON.parse(fs.readFileSync(ENGINE_SETTINGS_PATH, "utf8"));

assert.equal(
    settings.macroConfig?.ENABLE_TRANSPARENT_CANVAS,
    true,
    "stayOnBottom 视频需要开启 ENABLE_TRANSPARENT_CANVAS，否则会被不透明 Canvas 遮挡",
);
console.log("Login video canvas config test passed");
