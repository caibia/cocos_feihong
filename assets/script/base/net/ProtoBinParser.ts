/**
 *Author  : XW
 *Desc    : protobuf 二进制描述解析器
 */

import * as protobufNamespace from "protobufjs";
import XDEBUGLOG from "../debug/XDEBUGLOG";

type ProtobufModule = typeof import("protobufjs");

type DescriptorSet = {
    /** 文件列表 */
    file: DescriptorFile[];
};

type DescriptorFile = {
    /** 文件名 */
    name: string;
    /** 包名 */
    package: string;
    /** 消息列表 */
    messageType: DescriptorMessage[];
    /** 枚举列表 */
    enumType: DescriptorEnum[];
    /** 服务列表 */
    service: DescriptorService[];
    /** 扩展字段列表 */
    extension: DescriptorField[];
    /** 协议语法 */
    syntax: string;
};

type DescriptorMessage = {
    /** 消息名 */
    name: string;
    /** 字段列表 */
    field: DescriptorField[];
    /** 内嵌消息列表 */
    nestedType: DescriptorMessage[];
    /** 内嵌枚举列表 */
    enumType: DescriptorEnum[];
    /** 扩展字段列表 */
    extension: DescriptorField[];
    /** 单选字段列表 */
    oneofDecl: DescriptorOneof[];
    /** 消息选项 */
    options: DescriptorMessageOptions;
};

type DescriptorField = {
    /** 字段名 */
    name: string;
    /** 字段编号 */
    number: number;
    /** 字段规则 */
    label: number;
    /** 字段类型 */
    type: number;
    /** 消息或枚举类型名 */
    typeName?: string;
    /** 单选字段索引 */
    oneofIndex?: number;
    /** proto3 可选字段 */
    proto3Optional: boolean;
    /** 字段选项 */
    options: DescriptorFieldOptions;
};

type DescriptorEnum = {
    /** 枚举名 */
    name: string;
    /** 枚举值列表 */
    value: DescriptorEnumValue[];
};

type DescriptorEnumValue = {
    /** 枚举名 */
    name: string;
    /** 枚举值 */
    number: number;
};

type DescriptorService = {
    /** 服务名 */
    name: string;
};

type DescriptorOneof = {
    /** 单选字段名 */
    name: string;
};

type DescriptorMessageOptions = {
    /** 是否为 map 内部消息 */
    mapEntry: boolean;
};

type DescriptorFieldOptions = {
    /** 是否显式设置 packed */
    hasPacked: boolean;
    /** packed 值 */
    packed: boolean;
};

/** 解析 protobufjs 运行时模块 */
export function resolveProtobufModule(): ProtobufModule {
    return ((protobufNamespace as unknown as { default?: ProtobufModule }).default
        ?? (protobufNamespace as unknown as { "module.exports"?: ProtobufModule })["module.exports"]
        ?? (protobufNamespace as unknown as ProtobufModule));
}

/**
 * 通过 proto.bin 创建 protobuf root。
 * @param bytes 描述文件二进制
 * @returns protobuf root
 */
export function createRootFromProtoBin(bytes: Uint8Array): protobufNamespace.Root {
    const protobuf = resolveProtobufModule();
    const descriptor = decodeDescriptorSet(bytes, protobuf);
    const root = new protobuf.Root();

    for (const file of descriptor.file) {
        if (!ensureSupportedFile(file)) {
            continue;
        }
        const namespace: protobufNamespace.Namespace = file.package ? root.define(file.package) : root;
        if (file.name) {
            root.files.push(file.name);
            (namespace as unknown as { filename?: string }).filename = file.name;
        }
        for (const message of file.messageType) {
            const type = createType(message, protobuf, false);
            if (type) {
                namespace.add(type);
            }
        }
        for (const enumItem of file.enumType) {
            namespace.add(createEnum(enumItem, protobuf));
        }
    }

    root.resolveAll();
    return root;
}

/**
 * 校验文件描述是否在当前支持范围内。
 * @param descriptor 文件描述
 */
function ensureSupportedFile(descriptor: DescriptorFile): boolean {
    if (descriptor.syntax && descriptor.syntax !== "proto3") {
        XDEBUGLOG.warn(`不支持的 protobuf 语法: ${descriptor.syntax}`);
        return false;
    }
    if (descriptor.service.length > 0) {
        XDEBUGLOG.warn("暂不支持 protobuf service 描述");
        return false;
    }
    if (descriptor.extension.length > 0) {
        XDEBUGLOG.warn("暂不支持 protobuf extension 描述");
        return false;
    }
    return true;
}

/**
 * 创建消息类型。
 * @param descriptor 消息描述
 * @param protobuf protobuf 运行时
 * @param isNested 是否为内嵌消息
 * @returns protobuf 消息类型
 */
function createType(descriptor: DescriptorMessage, protobuf: ProtobufModule, isNested: boolean): protobufNamespace.Type | null {
    if (!ensureSupportedMessage(descriptor)) {
        return null;
    }
    const type = new protobuf.Type(descriptor.name);
    if (!isNested) {
        (type as unknown as { _edition?: string })._edition = "proto3";
    }

    for (const fieldDescriptor of descriptor.field) {
        const field = createField(fieldDescriptor, protobuf);
        if (field) {
            type.add(field);
        }
    }
    for (const nestedMessage of descriptor.nestedType) {
        if (!nestedMessage.options.mapEntry) {
            const nestedType = createType(nestedMessage, protobuf, true);
            if (nestedType) {
                type.add(nestedType);
            }
        }
    }
    for (const enumItem of descriptor.enumType) {
        type.add(createEnum(enumItem, protobuf));
    }

    return type;
}

/**
 * 校验消息描述是否在当前支持范围内。
 * @param descriptor 消息描述
 */
function ensureSupportedMessage(descriptor: DescriptorMessage): boolean {
    if (descriptor.options.mapEntry) {
        XDEBUGLOG.warn(`暂不支持 protobuf map 字段: ${descriptor.name}`);
        return false;
    }
    if (descriptor.extension.length > 0) {
        XDEBUGLOG.warn(`暂不支持 protobuf extension 字段: ${descriptor.name}`);
        return false;
    }
    if (descriptor.oneofDecl.length > 0) {
        XDEBUGLOG.warn(`暂不支持 protobuf oneof 字段: ${descriptor.name}`);
        return false;
    }
    return true;
}

/**
 * 创建字段类型。
 * @param descriptor 字段描述
 * @param protobuf protobuf 运行时
 * @returns protobuf 字段
 */
function createField(descriptor: DescriptorField, protobuf: ProtobufModule): protobufNamespace.Field | null {
    if (!ensureSupportedField(descriptor)) {
        return null;
    }
    const typeName = getFieldTypeName(descriptor);
    if (!typeName) {
        return null;
    }
    return new protobuf.Field(descriptor.name, descriptor.number, typeName, descriptor.label === 3 ? "repeated" : undefined);
}

/**
 * 校验字段描述是否在当前支持范围内。
 * @param descriptor 字段描述
 */
function ensureSupportedField(descriptor: DescriptorField): boolean {
    if (descriptor.number <= 0) {
        XDEBUGLOG.warn(`protobuf 字段编号非法: ${descriptor.name}`);
        return false;
    }
    if (descriptor.label === 2) {
        XDEBUGLOG.warn(`暂不支持 protobuf required 字段: ${descriptor.name}`);
        return false;
    }
    if (descriptor.oneofIndex !== undefined || descriptor.proto3Optional) {
        XDEBUGLOG.warn(`暂不支持 protobuf oneof/optional 字段: ${descriptor.name}`);
        return false;
    }
    if (descriptor.options.hasPacked) {
        XDEBUGLOG.warn(`暂不支持 protobuf packed 自定义选项: ${descriptor.name}`);
        return false;
    }
    return true;
}

/**
 * 获取字段类型名。
 * @param descriptor 字段描述
 * @returns 字段类型名
 */
function getFieldTypeName(descriptor: DescriptorField): string | null {
    if (descriptor.typeName) {
        return descriptor.typeName;
    }
    switch (descriptor.type) {
        case 1: return "double";
        case 2: return "float";
        case 3: return "int64";
        case 4: return "uint64";
        case 5: return "int32";
        case 6: return "fixed64";
        case 7: return "fixed32";
        case 8: return "bool";
        case 9: return "string";
        case 12: return "bytes";
        case 13: return "uint32";
        case 15: return "sfixed32";
        case 16: return "sfixed64";
        case 17: return "sint32";
        case 18: return "sint64";
        default:
            XDEBUGLOG.warn(`不支持的 protobuf 字段类型: ${descriptor.type}`);
            return null;
    }
}

/**
 * 创建枚举类型。
 * @param descriptor 枚举描述
 * @param protobuf protobuf 运行时
 * @returns protobuf 枚举类型
 */
function createEnum(descriptor: DescriptorEnum, protobuf: ProtobufModule): protobufNamespace.Enum {
    const values: Record<string, number> = {};
    for (const item of descriptor.value) {
        values[item.name] = item.number;
    }
    return new protobuf.Enum(descriptor.name, values);
}

/**
 * 解码 FileDescriptorSet。
 * @param bytes 二进制描述
 * @param protobuf protobuf 运行时
 * @returns 描述集合
 */
function decodeDescriptorSet(bytes: Uint8Array, protobuf: ProtobufModule): DescriptorSet {
    const reader = protobuf.Reader.create(bytes);
    const descriptor: DescriptorSet = { file: [] };
    while (reader.pos < reader.len) {
        const tag = reader.uint32();
        if ((tag >>> 3) === 1) {
            descriptor.file.push(decodeDescriptorFile(reader, reader.uint32()));
        } else {
            reader.skipType(tag & 7);
        }
    }
    return descriptor;
}

/**
 * 解码 FileDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 文件描述
 */
function decodeDescriptorFile(reader: protobufNamespace.Reader, length: number): DescriptorFile {
    const end = reader.pos + length;
    const descriptor: DescriptorFile = { name: "", package: "", messageType: [], enumType: [], service: [], extension: [], syntax: "proto2" };
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                descriptor.name = reader.string();
                break;
            case 2:
                descriptor.package = reader.string();
                break;
            case 4:
                descriptor.messageType.push(decodeDescriptorMessage(reader, reader.uint32()));
                break;
            case 5:
                descriptor.enumType.push(decodeDescriptorEnum(reader, reader.uint32()));
                break;
            case 6:
                descriptor.service.push(decodeDescriptorService(reader, reader.uint32()));
                break;
            case 7:
                descriptor.extension.push(decodeDescriptorField(reader, reader.uint32()));
                break;
            case 12:
                descriptor.syntax = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    return descriptor;
}

/**
 * 解码 DescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 消息描述
 */
function decodeDescriptorMessage(reader: protobufNamespace.Reader, length: number): DescriptorMessage {
    const end = reader.pos + length;
    const descriptor: DescriptorMessage = { name: "", field: [], nestedType: [], enumType: [], extension: [], oneofDecl: [], options: { mapEntry: false } };
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                descriptor.name = reader.string();
                break;
            case 2:
                descriptor.field.push(decodeDescriptorField(reader, reader.uint32()));
                break;
            case 3:
                descriptor.nestedType.push(decodeDescriptorMessage(reader, reader.uint32()));
                break;
            case 4:
                descriptor.enumType.push(decodeDescriptorEnum(reader, reader.uint32()));
                break;
            case 6:
                descriptor.extension.push(decodeDescriptorField(reader, reader.uint32()));
                break;
            case 8:
                descriptor.oneofDecl.push(decodeDescriptorOneof(reader, reader.uint32()));
                break;
            case 7:
                descriptor.options = decodeMessageOptions(reader, reader.uint32());
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    return descriptor;
}

/**
 * 解码 FieldDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 字段描述
 */
function decodeDescriptorField(reader: protobufNamespace.Reader, length: number): DescriptorField {
    const end = reader.pos + length;
    const descriptor: DescriptorField = { name: "", number: 0, label: 1, type: 0, proto3Optional: false, options: { hasPacked: false, packed: false } };
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                descriptor.name = reader.string();
                break;
            case 3:
                descriptor.number = reader.int32();
                break;
            case 4:
                descriptor.label = reader.int32();
                break;
            case 5:
                descriptor.type = reader.int32();
                break;
            case 6:
                descriptor.typeName = reader.string();
                break;
            case 8:
                descriptor.options = decodeFieldOptions(reader, reader.uint32());
                break;
            case 9:
                descriptor.oneofIndex = reader.int32();
                break;
            case 17:
                descriptor.proto3Optional = reader.bool();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    return descriptor;
}

/**
 * 解码 EnumDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 枚举描述
 */
function decodeDescriptorEnum(reader: protobufNamespace.Reader, length: number): DescriptorEnum {
    const end = reader.pos + length;
    const descriptor: DescriptorEnum = { name: "", value: [] };
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                descriptor.name = reader.string();
                break;
            case 2:
                descriptor.value.push(decodeDescriptorEnumValue(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    return descriptor;
}

/**
 * 解码 EnumValueDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 枚举值描述
 */
function decodeDescriptorEnumValue(reader: protobufNamespace.Reader, length: number): DescriptorEnumValue {
    const end = reader.pos + length;
    const descriptor: DescriptorEnumValue = { name: "", number: 0 };
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                descriptor.name = reader.string();
                break;
            case 2:
                descriptor.number = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    return descriptor;
}

/**
 * 解码 ServiceDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 服务描述
 */
function decodeDescriptorService(reader: protobufNamespace.Reader, length: number): DescriptorService {
    const end = reader.pos + length;
    const descriptor: DescriptorService = { name: "" };
    while (reader.pos < end) {
        const tag = reader.uint32();
        if ((tag >>> 3) === 1) {
            descriptor.name = reader.string();
        } else {
            reader.skipType(tag & 7);
        }
    }
    return descriptor;
}

/**
 * 解码 OneofDescriptorProto。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 单选字段描述
 */
function decodeDescriptorOneof(reader: protobufNamespace.Reader, length: number): DescriptorOneof {
    const end = reader.pos + length;
    const descriptor: DescriptorOneof = { name: "" };
    while (reader.pos < end) {
        const tag = reader.uint32();
        if ((tag >>> 3) === 1) {
            descriptor.name = reader.string();
        } else {
            reader.skipType(tag & 7);
        }
    }
    return descriptor;
}

/**
 * 解码 MessageOptions。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 消息选项
 */
function decodeMessageOptions(reader: protobufNamespace.Reader, length: number): DescriptorMessageOptions {
    const end = reader.pos + length;
    const options: DescriptorMessageOptions = { mapEntry: false };
    while (reader.pos < end) {
        const tag = reader.uint32();
        if ((tag >>> 3) === 7) {
            options.mapEntry = reader.bool();
        } else {
            reader.skipType(tag & 7);
        }
    }
    return options;
}

/**
 * 解码 FieldOptions。
 * @param reader 二进制读取器
 * @param length 数据长度
 * @returns 字段选项
 */
function decodeFieldOptions(reader: protobufNamespace.Reader, length: number): DescriptorFieldOptions {
    const end = reader.pos + length;
    const options: DescriptorFieldOptions = { hasPacked: false, packed: false };
    while (reader.pos < end) {
        const tag = reader.uint32();
        if ((tag >>> 3) === 2) {
            options.hasPacked = true;
            options.packed = reader.bool();
        } else {
            reader.skipType(tag & 7);
        }
    }
    return options;
}
