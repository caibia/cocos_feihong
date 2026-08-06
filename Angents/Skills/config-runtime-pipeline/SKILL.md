---
name: config-runtime-pipeline
description: Use when cocos_feihong 涉及配置源文件、tools/config、assets/resources/config/json、dts/IConfig.d.ts、ConfigMgr.getConfig、配置导入导出、运行时配置缺失或配置类型映射。
---

# 配置运行时链路

## 目标

配置改动必须证明“源配置 -> 导出脚本 -> 运行时 JSON -> 类型声明 -> 业务读取”完整闭环。只看到 Excel、编辑器字段或源码引用，不代表运行时配置已准备好。

## 核心链路

1. 配置源文件和正式产物放在 `tools/config/`；导出脚本按用途放在 `tools/script/` 对应子目录。
2. 只有仓库中真实存在并能执行的脚本才能声明为当前导出入口；新增导出器时同步补合法和非法样例。
3. 运行时 JSON 放在 `assets/resources/config/json/<ConfigName>.json`。
4. 配置类型统一维护到 `dts/IConfig.d.ts`，业务配置名进入 `IConfig.ConfigMap`。
5. 客户端业务通过 `ConfigMgr.inst.getConfig("<ConfigName>")` 读取配置，不直接读取 `tools/config` 或手写模块内配置类型。
6. `ConfigMgr` 默认读取 `config/json`；启用其它格式前必须先补齐产物、加载器和专项验证。

## 修改规则

1. 数值、掉落、关卡、商店等可调内容优先进入配置链路，不散落在业务代码中。
2. 新增配置表时，同步补齐源配置、导出入口、运行时 JSON、`IConfig.d.ts` 映射和业务读取点。
3. 新增、删除、改名字段时，先改源配置和导出规则，再重新生成 JSON/DTS；禁止只手改生成产物。
4. 配置名、JSON 文件名、`IConfig` interface 名和业务读取名必须一致。
5. 索引或复合 key 的导出规则必须写入真实导出器，并由样例验证数据形状。
6. 用户可见文本仍归 `Language.json` 和 `language-text`；配置表里只保存文本 id 或非展示字段。
7. 业务模块需要配置类型时复用 `IConfig.XxxDB`，不在模块 `dts` 中复制一份配置结构。
8. 编辑器字段、schema、options、联表 UI 命中 `editor-change-spec`；只要影响运行时配置产物，同时使用本 Skill。

## 验证要求

| 场景 | 必跑或必查 |
| --- | --- |
| 改配置源文件或导出脚本 | 运行仓库内对应导出器，并核对退出码与产物差异 |
| 新增导出行为 | 补合法、非法、空数据和重复 key 的专项测试 |
| 改配置类型或读取名 | 检查 `dts/IConfig.d.ts` 的 interface、`ConfigMap` 和 `ConfigMgr.inst.getConfig()` 调用 |
| 改文本 id 字段 | 检查 `assets/resources/config/json/Language.json` 和 `language-text` 规则 |
| 准备交付 | 运行命中的专项测试、`rg` 搜旧配置名/旧字段、`git diff --check` |

## 常见错误

- 只检查 `tools/config`，没有确认 `assets/resources/config/json` 的运行时产物已生成。
- 新增配置后忘记加入真实导出入口。
- 只手改 `IConfig.d.ts` 或 JSON，源配置和导出脚本没有对应变化。
- 在业务模块里复制配置类型，而不是复用 `IConfig`。
- 把 `Language.json` 当作普通配置表处理，或者把用户可见文本直接写进业务代码。
