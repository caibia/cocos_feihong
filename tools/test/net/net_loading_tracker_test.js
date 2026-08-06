/*
 *Author  : XW
 *Desc    : 网络加载等待项与归属检查
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "../../..");
const trackerPath = path.join(repoRoot, "assets/script/base/net/NetLoadingTracker.ts");
const socketPath = path.join(repoRoot, "assets/script/base/net/SocketMgr.ts");

/** 加载网络等待项类型。 */
function loadTrackerClass() {
    const source = fs.readFileSync(trackerPath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2019,
        },
    }).outputText;
    const moduleRef = { exports: {} };
    const runner = new Function("require", "module", "exports", output);
    runner((request) => {
        if (request.includes("XDEBUGLOG")) {
            return { default: { warn: () => undefined } };
        }
        return require(request);
    }, moduleRef, moduleRef.exports);
    return moduleRef.exports.default;
}

/**
 * 断言值相等。
 * @param {*} actual 实际值
 * @param {*} expected 预期值
 * @param {string} message 错误信息
 */
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

const NetLoadingTracker = loadTrackerClass();

const tracker = new NetLoadingTracker();
tracker.addSendProto("C2S_LOGIN");
assertEqual(tracker.hasPending(), true, "添加发送协议后存在等待项");
assertEqual(tracker.consumeReceiveProto("S2C_OTHER"), false, "不匹配的返回协议不关闭");
assertEqual(tracker.hasPending(), true, "不匹配后仍存在等待项");
assertEqual(tracker.consumeReceiveProto("S2C_LOGIN"), true, "匹配的返回协议会关闭");
assertEqual(tracker.hasPending(), false, "匹配后没有等待项");

tracker.addSendProto("C2S_LOGIN");
tracker.addSendProto("C2S_LOGIN");
assertEqual(tracker.consumeReceiveProto("S2C_LOGIN"), true, "同协议第一次返回会扣减计数");
assertEqual(tracker.hasPending(), true, "同协议仍有第二个等待项");
assertEqual(tracker.consumeReceiveProto("S2C_LOGIN"), true, "同协议第二次返回会扣减计数");
assertEqual(tracker.hasPending(), false, "同协议全部返回后没有等待项");

tracker.addSendProto("C2S_LOGIN");
tracker.addSendProto("C2S_OTHER");
assertEqual(tracker.consumeReceiveProto("S2C_LOGIN"), true, "多个协议中匹配一个返回");
assertEqual(tracker.hasPending(), true, "另一个协议仍在等待");
tracker.clear();
assertEqual(tracker.hasPending(), false, "清空后没有等待项");

tracker.addSendProto("C2S_LOGIN");
assertEqual(tracker.consumeSendProto("C2S_LOGIN"), true, "发送失败时可以按发送协议取消");
assertEqual(tracker.hasPending(), false, "取消后没有等待项");
assertEqual(tracker.consumeSendProto("C2S_LOGIN"), false, "重复取消不会命中等待项");

tracker.addSendProto("S2C_LOGIN");
assertEqual(tracker.hasPending(), false, "非发送协议不会登记归属");

const socketSource = fs.readFileSync(socketPath, "utf8");
assertEqual(/UIMgr|NetLoadingView/.test(socketSource), false, "SocketMgr 不得直接控制网络加载界面");

console.log("net_loading_tracker_test passed");
