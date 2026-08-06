#!/usr/bin/env node
/**
 * proto 导出脚本。
 *
 * 解析 tools/proto/protos/user.proto，输出三个文件：
 *  - assets/script/app/define/ProtoDefine.ts  (ProtName enum + ProtoDataMap)
 *  - assets/resources/config/proto/proto.bin  (protobuf descriptor 二进制描述)
 *  - dts/IProto.d.ts                          (declare namespace IC2SProto / IS2CProto)
 *
 * 约定：
 *  - 顶层 message 名必须以 C2S 或 S2C 开头，例如 C2SLogin、S2CBagList
 *  - 协议枚举值 = 方向 + "_" + base 的 UPPER_SNAKE (C2SUseItem -> C2S_USE_ITEM)
 *  - 协议数据接口名 = "I" + base                  (C2SUseItem -> IC2SProto.IUseItem)
 *
 * 用法：
 *      node tools/proto/export-proto.js
 *      npm run export-proto
 */

const fs = require("fs");
const path = require("path");
const protobuf = require("protobufjs");
require("protobufjs/ext/descriptor");
const descriptor = require("protobufjs/ext/descriptor");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const PROTOS_DIR = path.resolve(__dirname, "protos");
const PROTO_FILE = path.resolve(PROTOS_DIR, "user.proto");
const OUT_DEFINE = path.resolve(PROJECT_ROOT, "assets/script/app/define/ProtoDefine.ts");
const OUT_DTS = path.resolve(PROJECT_ROOT, "dts/IProto.d.ts");
const OUT_DESCRIPTOR = path.resolve(PROJECT_ROOT, "assets/resources/config/proto/proto.bin");

const HEADER_COMMENT = `/**
 * 该文件由 tools/proto/export-proto.js 自动生成。
 * 请勿手动修改。
 */
`;

/** proto 标量类型 → TypeScript 类型 */
const PROTO_TO_TS = {
    "double": "number", "float": "number",
    "int32": "number", "uint32": "number", "sint32": "number", "fixed32": "number", "sfixed32": "number",
    "int64": "number", "uint64": "number", "sint64": "number", "fixed64": "number", "sfixed64": "number",
    "bool": "boolean",
    "string": "string",
    "bytes": "Uint8Array",
};

function readProtos() {
    if (!fs.existsSync(PROTO_FILE)) {
        throw new Error(`未找到 proto 源文件: ${PROTO_FILE}`);
    }
    const extraFiles = fs.readdirSync(PROTOS_DIR).filter(f => f.endsWith(".proto") && f !== "user.proto");
    if (extraFiles.length > 0) {
        throw new Error(`只允许保留 user.proto，请移除多余协议文件: ${extraFiles.join(", ")}`);
    }
    const root = new protobuf.Root();
    const content = fs.readFileSync(PROTO_FILE, "utf-8");
    protobuf.parse(content, root, { keepCase: true, alternateCommentMode: false });
    root.resolveAll();
    return { root };
}

function camelToUpperSnake(s) {
    return s.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toUpperCase();
}

function parseMessage(type, name) {
    const match = name.match(/^(C2S|S2C)(.+)$/);
    if (!match) {
        return {
            messageName: name,
            direction: null,
            base: name,
            protoName: null,
            interfaceName: `I${name}`,
            namespace: "ICommonProto",
            fields: Object.values(type.fields).sort((a, b) => a.id - b.id),
            comment: (type.comment || "").trim(),
            isProto: false,
        };
    }
    const direction = match[1];
    const base = match[2];
    if (!base) {
        throw new Error(`协议 message 名称非法：${name}`);
    }
    const protoName = `${direction}_${camelToUpperSnake(base)}`;
    const interfaceName = `I${base}`;
    const namespace = `I${direction}Proto`;
    const fields = Object.values(type.fields).sort((a, b) => a.id - b.id);
    return {
        messageName: name,
        direction,
        base,
        protoName,
        interfaceName,
        namespace,
        fields,
        comment: (type.comment || "").trim(),
        isProto: true,
    };
}

function collectMessages(root) {
    const messages = [];
    function walk(ns) {
        if (!ns.nested) return;
        for (const k of Object.keys(ns.nested)) {
            const child = ns.nested[k];
            if (child instanceof protobuf.Type) {
                messages.push(parseMessage(child, k));
            } else if (child instanceof protobuf.Namespace) {
                walk(child);
            }
        }
    }
    walk(root);
    return messages;
}

function buildTypeIndex(messages) {
    const idx = {};
    for (const m of messages) idx[m.messageName] = m;
    return idx;
}

function mapFieldType(field, typeIndex) {
    let t = PROTO_TO_TS[field.type];
    if (!t) {
        const refMsg = typeIndex[field.type];
        if (refMsg) {
            t = `${refMsg.namespace}.${refMsg.interfaceName}`;
        } else {
            throw new Error(`字段 ${field.name} 引用了未知类型：${field.type}`);
        }
    }
    if (field.repeated) t = `${t}[]`;
    return t;
}

/**
 * 判断响应字段是否可省略。
 * @param message 消息定义
 * @param field 字段定义
 */
function isOptionalResponseField(message, field) {
    return message.direction === "S2C" && field.name !== "code";
}

function genProtoDefine(messages) {
    const lines = [];
    lines.push(HEADER_COMMENT);
    lines.push("export const enum ProtName {");
    for (const m of messages.filter(item => item.isProto)) {
        if (m.comment) lines.push(`    /** ${m.comment} */`);
        lines.push(`    ${m.protoName} = "${m.protoName}",`);
    }
    lines.push("}");
    lines.push("");
    lines.push("/** 协议数据映射 */");
    lines.push("export interface ProtoDataMap {");
    for (const m of messages.filter(item => item.isProto)) {
        if (m.comment) lines.push(`    /** ${m.comment} */`);
        lines.push(`    [ProtName.${m.protoName}]: ${m.namespace}.${m.interfaceName};`);
    }
    lines.push("}");
    lines.push("");
    lines.push("/** 协议名 -> protobuf 类型全名 */");
    lines.push("export const PROTO_MESSAGE_NAME_MAP: Record<ProtName, string> = {");
    for (const m of messages.filter(item => item.isProto)) {
        lines.push(`    [ProtName.${m.protoName}]: "${m.messageName}",`);
    }
    lines.push("};");
    return lines.join("\n") + "\n";
}

function genProtoDts(messages, typeIndex) {
    const byNs = {};
    for (const m of messages) {
        if (!byNs[m.namespace]) byNs[m.namespace] = [];
        byNs[m.namespace].push(m);
    }
    const lines = [];
    lines.push(HEADER_COMMENT);
    const namespaces = Object.keys(byNs).sort();
    for (let i = 0; i < namespaces.length; i++) {
        const ns = namespaces[i];
        if (i > 0) lines.push("");
        lines.push(`declare namespace ${ns} {`);
        for (let j = 0; j < byNs[ns].length; j++) {
            const m = byNs[ns][j];
            if (j > 0) lines.push("");
            if (m.comment) lines.push(`    /** ${m.comment} */`);
            lines.push(`    interface ${m.interfaceName} {`);
            for (const f of m.fields) {
                const c = (f.comment || "").trim();
                if (c) lines.push(`        /** ${c} */`);
                const optionalFlag = isOptionalResponseField(m, f) ? "?" : "";
                lines.push(`        ${f.name}${optionalFlag}: ${mapFieldType(f, typeIndex)};`);
            }
            lines.push(`    }`);
        }
        lines.push(`}`);
    }
    return lines.join("\n") + "\n";
}

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath, content) {
    ensureDir(filePath);
    let prev = "";
    if (fs.existsSync(filePath)) prev = fs.readFileSync(filePath, "utf-8");
    if (prev === content) {
        console.log(`  unchanged  ${path.relative(PROJECT_ROOT, filePath)}`);
        return;
    }
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  written    ${path.relative(PROJECT_ROOT, filePath)}`);
}

function writeBinaryIfChanged(filePath, content) {
    ensureDir(filePath);
    if (fs.existsSync(filePath)) {
        const prev = fs.readFileSync(filePath);
        if (Buffer.compare(prev, Buffer.from(content)) === 0) {
            console.log(`  unchanged  ${path.relative(PROJECT_ROOT, filePath)}`);
            return;
        }
    }
    fs.writeFileSync(filePath, Buffer.from(content));
    console.log(`  written    ${path.relative(PROJECT_ROOT, filePath)}`);
}

function genDescriptor(root) {
    const descriptorMsg = root.toDescriptor("proto3");
    return descriptor.FileDescriptorSet.encode(descriptorMsg).finish();
}

function main() {
    const { root } = readProtos();
    console.log("已加载 user.proto");

    const messages = collectMessages(root).sort((a, b) => {
        const nsCompare = a.namespace.localeCompare(b.namespace);
        if (nsCompare !== 0) return nsCompare;
        return a.interfaceName.localeCompare(b.interfaceName);
    });
    console.log(`解析出 ${messages.length} 条顶层消息`);

    const typeIndex = buildTypeIndex(messages);

    writeIfChanged(OUT_DEFINE, genProtoDefine(messages));
    writeIfChanged(OUT_DTS, genProtoDts(messages, typeIndex));
    writeBinaryIfChanged(OUT_DESCRIPTOR, genDescriptor(root));

    console.log("✓ proto 生成完成");
}

main();
