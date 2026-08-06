/*
 *Author  : XW
 *Desc    : protobuf 运行时初始化失败、释放与重试检查
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "../../..");

/** 断言值相等。 */
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

/** 断言异步调用失败。 */
async function assertReject(callback, message) {
    let error = null;
    try {
        await callback();
    } catch (err) {
        error = err;
    }
    if (!error) {
        throw new Error(`${message}: expected rejection`);
    }
}

/** 加载 TypeScript 模块。 */
function loadTsModule(relativePath, requireModule) {
    const sourcePath = path.join(repoRoot, relativePath);
    const source = fs.readFileSync(sourcePath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2019,
        },
    }).outputText;
    const moduleRef = { exports: {} };
    const runner = new Function("require", "module", "exports", output);
    runner(requireModule, moduleRef, moduleRef.exports);
    return moduleRef.exports.default;
}

/** 执行协议运行时检查。 */
async function run() {
    const root = { lookupType: () => ({}) };
    const asset = { buffer: () => new ArrayBuffer(8) };
    let loadResult = null;
    let parseError = null;
    let releaseCount = 0;
    const ProtoBinLoader = loadTsModule("assets/script/base/net/ProtoBinLoader.ts", (request) => {
        if (request === "cc") return { BufferAsset: class BufferAsset {} };
        if (request === "protobufjs") return {};
        if (request.includes("debug/XDEBUGLOG")) return { default: { error() {} } };
        if (request.includes("define/XResConst")) return { XResConst: { PROTO_DESCRIPTOR: "config/proto/proto" } };
        if (request.includes("manager/ResMgr")) {
            return {
                default: {
                    inst: {
                        loadRes: async () => loadResult,
                        releaseRes: () => {
                            releaseCount++;
                        },
                    },
                },
            };
        }
        if (request.includes("ProtoBinParser")) {
            return {
                createRootFromProtoBin: () => {
                    if (parseError) throw parseError;
                    return root;
                },
            };
        }
        throw new Error(`未处理的模块依赖: ${request}`);
    });

    const missingLoader = new ProtoBinLoader();
    await assertReject(() => missingLoader.loadRoot(), "描述文件缺失时初始化失败");
    loadResult = asset;
    assertEqual(await missingLoader.loadRoot(), root, "描述文件恢复后可以重试");
    assertEqual(releaseCount, 1, "成功解析后释放描述资源");

    const brokenLoader = new ProtoBinLoader();
    parseError = new Error("parse failed");
    await assertReject(() => brokenLoader.loadRoot(), "描述文件解析异常时初始化失败");
    assertEqual(releaseCount, 2, "解析异常时仍释放描述资源");

    let canLookupMissing = false;
    const codecRoot = {
        lookupType(messageName) {
            if (messageName === "Missing" && !canLookupMissing) {
                throw new Error("missing type");
            }
            return {};
        },
    };
    const ProtoCodec = loadTsModule("assets/script/base/net/ProtoCodec.ts", (request) => {
        if (request.includes("app/define/ProtoDefine")) {
            return { PROTO_MESSAGE_NAME_MAP: { C2S_TEST: "Present", S2C_TEST: "Missing" } };
        }
        if (request.includes("debug/XDEBUGLOG")) return { default: { error() {}, net() {}, warn() {} } };
        if (request.includes("ProtoBinLoader")) return { default: { inst: { loadRoot: async () => codecRoot } } };
        throw new Error(`未处理的模块依赖: ${request}`);
    });
    const codec = new ProtoCodec();
    await assertReject(() => codec.init(), "任一映射类型缺失时编解码器初始化失败");
    canLookupMissing = true;
    await codec.init();

    console.log("proto_runtime_init_test passed");
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
