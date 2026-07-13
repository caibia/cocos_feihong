/**
*Author  : XW
*Desc    : LoginView 占位界面行为测试
*/

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const LOGIN_VIEW_PATH = path.resolve(__dirname, "../assets/script/app/module/login/LoginView.ts");

/** 模拟颜色对象 */
class FakeColor {
    /** 初始化颜色值 */
    constructor(r = 0, g = 0, b = 0, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
}

/** 模拟 FairyGUI 基础对象 */
class FakeObject {
    /** 初始化显示属性 */
    constructor() {
        this.name = "";
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.sortingOrder = 0;
        this.touchable = true;
        this.visible = true;
    }

    /** 设置对象尺寸 */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    /** 设置对象位置 */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

/** 模拟 FairyGUI 容器 */
class FakeComponent extends FakeObject {
    /** 初始化子对象集合 */
    constructor() {
        super();
        this.children = [];
        this.opaque = false;
    }

    /** 添加子对象 */
    addChild(child) {
        this.children.push(child);
        child.parent = this;
        return child;
    }

    /** 按名称获取子对象 */
    getChild(name) {
        return this.children.find((child) => child.name === name) || null;
    }
}

/** 模拟按钮对象 */
class FakeButton extends FakeComponent {}

/** 模拟矩形对象 */
class FakeGraph extends FakeObject {
    /** 记录矩形样式 */
    drawRect(lineSize, lineColor, fillColor, corner) {
        this.rectStyle = { lineSize, lineColor, fillColor, corner };
    }
}

/** 模拟文本对象 */
class FakeTextField extends FakeObject {
    /** 初始化文本属性 */
    constructor() {
        super();
        this.text = "";
    }
}

/** 模拟界面事件单元 */
class FakeEventUnit {
    /** 初始化点击回调集合 */
    constructor() {
        this.clickHandlers = new Map();
        this.isDisposed = false;
    }

    /** 注册点击回调 */
    addClickEvent(dispatcher, callback, target) {
        this.clickHandlers.set(dispatcher, () => callback.call(target));
    }

    /** 触发指定对象的点击回调 */
    click(dispatcher) {
        const handler = this.clickHandlers.get(dispatcher);
        assert.ok(handler, `未找到 ${dispatcher.name} 的点击回调`);
        handler();
    }

    /** 释放事件集合 */
    dispose() {
        this.isDisposed = true;
        this.clickHandlers.clear();
    }
}

/** 模拟窗口基类 */
class FakeWindow extends FakeComponent {
    /** 初始化窗口状态 */
    constructor() {
        super();
        this.eventUnit = new FakeEventUnit();
        this.created = false;
        this.isDisposed = false;
    }

    /** 标记界面已创建 */
    onCreate() {
        this.created = true;
    }

    /** 接收刷新参数 */
    onRefresh(arg) {
        this.arg = arg;
    }

    /** 同步根容器尺寸 */
    onStageResize() {
        if (this.view) this.view.setSize(this.width, this.height);
    }

    /** 标记窗口已进入缓存 */
    clearByCache() {
        this.cacheCleared = true;
    }

    /** 释放窗口资源 */
    dispose() {
        this.eventUnit.dispose();
        this.isDisposed = true;
    }
}

/** 模拟视频单元 */
class FakeVideoUnit {
    /** 初始化播放记录 */
    constructor() {
        this.playCalls = [];
        this.stopCalls = 0;
        FakeVideoUnit.instances.push(this);
    }

    /** 记录循环播放参数 */
    playLoop(parent, options) {
        this.playCalls.push({ parent, options });
    }

    /** 记录停止调用 */
    stop() {
        this.stopCalls++;
    }
}

FakeVideoUnit.instances = [];

/** 递归收集指定类型的子对象 */
function collectChildren(root, Type, result = []) {
    for (const child of root.children || []) {
        if (child instanceof Type) result.push(child);
        collectChildren(child, Type, result);
    }
    return result;
}

/** 转译并加载 LoginView */
function loadLoginView(logs) {
    assert.ok(fs.existsSync(LOGIN_VIEW_PATH), "LoginView.ts 尚未创建");
    const source = fs.readFileSync(LOGIN_VIEW_PATH, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
        },
        fileName: LOGIN_VIEW_PATH,
        reportDiagnostics: true,
    });
    const diagnostics = output.diagnostics || [];
    assert.equal(diagnostics.length, 0, diagnostics.map((item) => item.messageText).join("\n"));

    const module = { exports: {} };
    const modules = {
        cc: {
            Color: FakeColor,
            HorizontalTextAlignment: { CENTER: 1 },
            VerticalTextAlignment: { CENTER: 1 },
        },
        "../../../base/debug/XDEBUGLOG": { __esModule: true, default: { debug: (...args) => logs.push(args) } },
        "../../../base/ui/XComponent": { UIADAPT_TYPE: { FguiAlwaysFullScreen: "FguiAlwaysFullScreen" } },
        "../../../base/ui/XWindow": { __esModule: true, default: FakeWindow, OPEN_ANIMSTYLE: { NONE: 0 } },
        "../../../base/unit/VideoUnit": { __esModule: true, default: FakeVideoUnit },
        "../../../fairyGUI/FieldTypes": {
            AlignType: { Left: 0, Center: 1, Right: 2 },
            AutoSizeType: { None: 0 },
            VertAlignType: { Top: 0, Middle: 1, Bottom: 2 },
        },
        "../../../fairyGUI/GButton": { GButton: FakeButton },
        "../../../fairyGUI/GComponent": { GComponent: FakeComponent },
        "../../../fairyGUI/GGraph": { GGraph: FakeGraph },
        "../../../fairyGUI/GTextField": { GTextField: FakeTextField },
    };
    const localRequire = (request) => {
        assert.ok(modules[request], `测试桩缺少模块：${request}`);
        return modules[request];
    };
    new Function("require", "module", "exports", "window", output.outputText)(localRequire, module, module.exports, {});
    return module.exports.default;
}

/** 验证登录占位界面行为 */
function run() {
    const logs = [];
    const LoginView = loadLoginView(logs);
    const view = new LoginView();
    view.width = 1334;
    view.height = 750;

    assert.deepEqual(view.getFairyPackageArr(), []);
    view.onCreate();
    view.onStageResize();
    view.onRefresh();

    const video = FakeVideoUnit.instances.at(-1);
    assert.ok(video, "LoginView 未创建背景视频单元");
    assert.equal(video.playCalls.length, 1);
    assert.equal(video.playCalls[0].parent, view.view);
    assert.deepEqual(video.playCalls[0].options, {
        url: "movie/login/login01",
        loop: true,
        mute: true,
        width: 1334,
        height: 750,
        zOrder: 0,
    });

    const overlay = view.view.getChild("loginOverlay");
    assert.ok(overlay, "LoginView 缺少 UI 覆盖层");
    assert.equal(overlay.sortingOrder, 10);
    const texts = collectChildren(overlay, FakeTextField).map((item) => item.text);
    for (const text of ["飞鸿江湖", "登录界面占位", "开始游戏", "选择服务器", "设置"]) {
        assert.ok(texts.includes(text), `覆盖层缺少文本：${text}`);
    }

    const buttons = collectChildren(overlay, FakeButton);
    assert.equal(buttons.length, 3);
    for (const button of buttons) view.eventUnit.click(button);
    assert.deepEqual(logs.slice(-3), [
        ["[LoginView] 点击占位按钮", "开始游戏"],
        ["[LoginView] 点击占位按钮", "选择服务器"],
        ["[LoginView] 点击占位按钮", "设置"],
    ]);

    view.width = 1024;
    view.height = 640;
    view.onStageResize();
    assert.deepEqual(video.playCalls.at(-1).options, {
        url: "movie/login/login01",
        loop: true,
        mute: true,
        width: 1024,
        height: 640,
        zOrder: 0,
    });

    view.width = 480;
    view.height = 800;
    view.onStageResize();
    for (const button of buttons) {
        assert.ok(button.x >= 0 && button.x + button.width <= 480, `${button.name} 超出窄屏水平范围`);
        assert.ok(button.y >= 0 && button.y + button.height <= 800, `${button.name} 超出窄屏垂直范围`);
    }

    view.width = 568;
    view.height = 320;
    view.onStageResize();
    for (const button of buttons) {
        assert.ok(button.y >= 0 && button.y + button.height <= 320, `${button.name} 超出低高度横屏范围`);
    }

    view.clearByCache();
    assert.equal(video.stopCalls, 1, "LoginView 进入缓存时未停止背景视频");
    assert.equal(view.cacheCleared, true);
    view.onRefresh();
    const resumedVideo = FakeVideoUnit.instances.at(-1);
    assert.notEqual(resumedVideo, video, "LoginView 从缓存恢复时未重建背景视频单元");

    view.dispose();
    assert.equal(video.stopCalls, 1);
    assert.equal(resumedVideo.stopCalls, 1);
    assert.equal(view.isDisposed, true);
    console.log("LoginView behavior test passed");
}

run();
