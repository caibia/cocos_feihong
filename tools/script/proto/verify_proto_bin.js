#!/usr/bin/env node
/**
 *Author  : XW
 *Desc    : 验证客户端 proto.bin 解析器能读取二进制描述并完成 protobuf 编解码
 */

const fs = require("fs");
const path = require("path");
const protobuf = require("protobufjs");
const ts = require("typescript");
require("protobufjs/ext/descriptor");

require.extensions[".ts"] = function loadTs(module, filename) {
    const content = fs.readFileSync(filename, "utf-8");
    const output = ts.transpileModule(content, {
        compilerOptions: {
            esModuleInterop: true,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2019,
        },
    });
    module._compile(output.outputText, filename);
};

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const descriptorPath = path.join(projectRoot, "assets/resources/config/proto/proto.bin");
const runtimePath = path.join(projectRoot, "assets/script/base/net/ProtoBinParser.ts");
const bytes = fs.readFileSync(descriptorPath);
const { createRootFromProtoBin } = require(runtimePath);

if (typeof createRootFromProtoBin !== "function") {
    throw new Error("ProtoBinParser 未导出 createRootFromProtoBin");
}

const officialRoot = protobuf.Root.fromDescriptor(bytes);
const runtimeRoot = createRootFromProtoBin(new Uint8Array(bytes));

/**
 * 校验官方描述器与客户端运行时的编解码结果。
 * @param {string} messageName 消息名称
 * @param {object} payload 消息数据
 */
function assertSameCodec(messageName, payload) {
    const officialType = officialRoot.lookupType(messageName);
    const runtimeType = runtimeRoot.lookupType(messageName);
    const officialBytes = officialType.encode(officialType.create(payload)).finish();
    const runtimeBytes = runtimeType.encode(runtimeType.create(payload)).finish();

    if (Buffer.compare(Buffer.from(officialBytes), Buffer.from(runtimeBytes)) !== 0) {
        throw new Error(`${messageName} 编码结果不一致`);
    }

    const decoded = runtimeType.toObject(runtimeType.decode(officialBytes), { defaults: true, longs: Number, enums: Number });
    const expected = officialType.toObject(officialType.decode(officialBytes), { defaults: true, longs: Number, enums: Number });
    if (JSON.stringify(decoded) !== JSON.stringify(expected)) {
        throw new Error(`${messageName} 解码结果不一致`);
    }
}

assertSameCodec("C2SLogin", { account: "test_account" });
assertSameCodec("S2CLogin", { code: 0, token: "test_token" });

console.log("proto.bin 解析验证通过");
