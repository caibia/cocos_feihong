/*
 *Author  : XW
 *Desc    : 事件单元点击节流、音效与监听移除检查
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "../../..");
const eventUnitPath = path.join(repoRoot, "assets/script/base/unit/EventUnit.ts");

/** 简单事件派发器。 */
class FakeNode {
    /** 初始化监听列表。 */
    constructor() {
        this.listeners = [];
        this.uuid = "event-unit-test";
    }

    /** 注册监听。 */
    on(event, callback, target) {
        this.listeners.push({ event, callback, target });
    }

    /** 移除监听。 */
    off(event, callback, target) {
        this.listeners = this.listeners.filter((listener) => listener.event !== event || listener.callback !== callback || listener.target !== target);
    }

    /** 派发事件。 */
    emit(event, ...args) {
        for (const listener of [...this.listeners]) {
            if (listener.event === event) {
                listener.callback.call(listener.target, ...args);
            }
        }
    }
}

/** 测试用 FairyGUI 对象。 */
class FakeGObject {
    /** 绑定事件节点。 */
    constructor() {
        this.node = new FakeNode();
    }
}

/** 测试用组件。 */
class FakeComponent {
    /** 绑定事件节点。 */
    constructor() {
        this.node = new FakeNode();
    }
}

/** 测试用控制器。 */
class FakeController extends FakeNode {}

/** 测试用列表。 */
class FakeGList extends FakeGObject {}

/** 断言值相等。 */
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

const game = { totalTime: 0 };
const dispatchedEvents = [];
const eventMgr = {
    inst: {
        /** 记录全局事件。 */
        dispatchEvent(event, data) {
            dispatchedEvents.push({ event, data });
        },
        addEventListener() {},
        removeListener() {},
    },
};

/** 加载事件单元类型。 */
function loadEventUnitClass() {
    const source = fs.readFileSync(eventUnitPath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2019,
        },
    }).outputText;
    const moduleRef = { exports: {} };
    const runner = new Function("require", "module", "exports", output);
    runner((request) => {
        if (request === "cc") return { Component: FakeComponent, Node: FakeNode, game };
        if (request.includes("fairyGUI/GObject")) return { GObject: FakeGObject };
        if (request.includes("fairyGUI/Controller")) return { Controller: FakeController };
        if (request.includes("fairyGUI/GList")) return { GList: FakeGList };
        if (request.includes("fairyGUI/event/Event")) return { FEvent: { CLICK: "click", CLICK_ITEM: "click_item", STATUS_CHANGED: "status_changed" } };
        if (request.includes("manager/EventMgr")) return { default: eventMgr };
        if (request.includes("manager/TimerMgr")) return { default: { inst: {} } };
        if (request.includes("debug/XDEBUGLOG")) return { default: { error() {}, warn() {} } };
        if (request.includes("define/XResConst")) return { XResConst: { AUDIO_MAP: { buttonClick: "audio/ui/UI_Click_Small" } } };
        if (request.includes("app/define/EventDefine")) return { EVENTNAME: { PLAY_SOUND: "PLAY_SOUND" } };
        throw new Error(`未处理的模块依赖: ${request}`);
    }, moduleRef, moduleRef.exports);
    return moduleRef.exports.default;
}

const EventUnit = loadEventUnitClass();
const eventUnit = new EventUnit();
const button = new FakeGObject();
const callbackTarget = {};
let clickCount = 0;
const onClick = () => {
    clickCount++;
};

eventUnit.addClickEvent(button, onClick, callbackTarget);
button.node.emit("click");
assertEqual(clickCount, 1, "首次点击执行回调");
assertEqual(dispatchedEvents.length, 1, "首次点击派发音效事件");
assertEqual(dispatchedEvents[0].event, "PLAY_SOUND", "点击使用统一音效事件");
assertEqual(dispatchedEvents[0].data.url, "audio/ui/UI_Click_Small", "点击使用飞鸿音效资源");

game.totalTime = 100;
button.node.emit("click");
assertEqual(clickCount, 1, "300ms 内重复点击不执行回调");
assertEqual(dispatchedEvents.length, 1, "300ms 内重复点击不派发音效");

game.totalTime = 300;
button.node.emit("click");
assertEqual(clickCount, 2, "达到 300ms 后点击恢复");
assertEqual(dispatchedEvents.length, 2, "达到 300ms 后恢复音效");

eventUnit.removeEvent(button, "click", onClick, callbackTarget);
game.totalTime = 600;
button.node.emit("click");
assertEqual(clickCount, 2, "原始回调可以移除包装后的监听");

const doubleClickUnit = new EventUnit();
const doubleClickButton = new FakeGObject();
let doubleClickCount = 0;
doubleClickUnit.addDoubleClickEvent(doubleClickButton, () => {
    doubleClickCount++;
}, callbackTarget);
game.totalTime = 2000;
doubleClickButton.node.emit("click");
game.totalTime = 2100;
doubleClickButton.node.emit("click");
assertEqual(doubleClickCount, 1, "双击回调正常执行");
assertEqual(dispatchedEvents.length, 2, "双击监听不派发普通点击音效");

console.log("event_unit_click_test passed");
