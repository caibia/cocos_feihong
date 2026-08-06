---
name: local-server-protocol
description: Use when cocos_feihong 任务涉及 assets/script/app/server 本地服务端、协议收发、LocalServer、ServerDefine、ProtoCodec、proto.bin、ProtoBinParser、ProtoBinLoader、服务端错误码或客户端禁止直连 server 的边界。
---

# 本地服务端与协议运行时规则

## 使用时机

- 修改 `assets/script/app/server/` 下的本地服务端脚本、协议处理器、模块服务或模块 DB。
- 修改客户端到本地服务端的协议收发、`LocalServer`、`ServerDefine`、`NetworkUnit`、`NetWorkMgr` 等链路。
- 修改协议运行时、`proto.bin` 加载、`ProtoCodec`、`ProtoBinParser`、`ProtoBinLoader` 或协议错误码。
- 新增服务端错误码或用户可见错误提示时，同时阅读 `Angents/Skills/language-text/SKILL.md`。
- 处理需要经过本地服务端协议的业务流程。

## 本地服务端边界

1. `assets/script/app/server/` 只用于本地模拟真实服务端；业务客户端代码禁止 import、引用或直接调用该目录下任何内容，必须通过协议交互。
2. 除 `ServerDefine` 注册中心外，`assets/script/app/server/` 下脚本禁止互相 import、引用或直接调用，模块必须自成一体。
3. 本地服务端模块只能通过 `LocalServer.register()` 注册协议处理器，并按真实服务端请求 / 响应流程通信。
4. `GameApp` 仅允许在本地模式启动时调用 `ServerDefine.init()` 注册处理器，不得通过它读写服务端状态或调用业务逻辑。
5. `assets/script/app/server/` 下脚本禁止 import 客户端 `ProtoDefine`、客户端 DB、客户端 UI 或其它客户端业务模块。
6. 协议名在服务端模块内按真实协议字符串声明，协议数据只通过请求体和服务端模块自身状态处理。
7. 本地服务端脚本禁止新增 `throw`、`throw new Error`、`throw Error`；配置缺失、参数不合法或状态不满足时，返回明确业务 code。
8. 本地服务端不是 mock 返回层，必须校验登录态、会话、参数、数据归属和状态前置条件。
9. 响应必须返回明确业务 code；数据必须由服务端模块自身状态或服务端配置产生。
10. 禁止为让界面跑通而写固定假数据、客户端同步状态或无条件成功。

## 协议运行时规则

1. 协议运行时固定使用 `assets/resources/config/proto/proto.bin`，不生成、不依赖 `proto.json`。
2. `ProtoCodec` 只负责协议包编解码、协议名映射和 protobuf 类型表初始化，不承载 descriptor 二进制解析逻辑。
3. descriptor 二进制解析统一放在 `ProtoBinParser`。
4. `proto.bin` 加载统一放在 `ProtoBinLoader`。
5. 其它模块不得重复实现 descriptor 解析，不得绕过 `ProtoBinParser` 或 `ProtoBinLoader`。
6. 登录、本地服务端相关错误提示默认沿用 `code == Language.json id`。
7. 新增非 0 服务端错误码时必须同步补齐 `Language.json`，并按 `language-text` 检查覆盖。

## 分层规则

1. 经过协议的业务链路默认按 `View + DB + ServerService` 分层。
2. `View` 处理界面、输入、跳转和场景流转。
3. `DB` 处理协议、状态和协议返回提示。
4. `ServerService` 只处理服务端业务校验与回包。
5. 只有多入口复用或复杂状态机确实需要时，才额外抽 `Flow`。

## 自查清单

1. 客户端是否仍然只通过协议通道访问服务端逻辑。
2. 服务端模块是否没有直接 import 客户端 DB、UI、`ProtoDefine` 或其它服务端模块。
3. 每个协议处理器是否校验登录态、会话、参数、数据归属和状态前置条件。
4. 错误分支是否返回明确 code，且新增 code 已同步 `Language.json`。
5. 协议运行时是否仍只加载 `proto.bin`，没有新增 `proto.json` 依赖。
6. `ProtoCodec`、`ProtoBinParser`、`ProtoBinLoader` 是否保持职责分离。
