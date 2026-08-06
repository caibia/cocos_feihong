---
name: db-data-pattern
description: Use when cocos_feihong 涉及 DB 数据模块、BaseData、LoginDB 风格、assets/script/app/data/*DB.ts、协议数据状态、post/send 入口或数据对象结构收敛。
---

# DB 数据模块规则

## 目标

DB 像 `LoginDB` 一样维护业务状态、协议入口和观察者，不把配置推导、UI 展示索引和临时组合逻辑堆进数据模块。

## 使用时机

- 新增或重构 `assets/script/app/data/*DB.ts`。
- 修改 `BaseData` 子类的状态字段、协议 `sendXxx`、回包处理、`postXxx` 观察者或 `clearData()`。
- 需要判断某个数据该放 DB、配置表、View、服务端还是协议返回。
- 用户要求“按 `LoginDB` 那样”整理 DB 数据。

## 核心模式

1. 一个 DB 只负责一个业务状态域，职责写在文件头 `Desc`。
2. 状态字段少而明确，优先保存业务对象，例如 `_charInfo`、`_serverInfo`、`_token`；不要把一个业务对象拆成多张索引表、候选表和临时状态表。
3. 字段多的业务数据先定义稳定对象结构，允许一个默认对象创建入口，例如 `createEmptyCharInfo()`；不要为每组小字段新增 `createEmptyXxxOptions()`、`createEmptyXxxIndexes()` 这类机械工厂。
4. 策划可调内容走配置链路；DB 只读取配置和保存当前选择，不在 DB 内从多张配置表拼出新的配置表。
5. `sendXxx` 负责校验前置状态、构造协议请求并发送；字段多时基于当前业务对象克隆和局部覆盖，不在发送点铺一长串局部变量。
6. 回包处理先校验 `code`、必填字段和状态前置；失败时提示或日志后 `return`，成功后更新 DB 状态并调用 `postXxx`。
7. `postXxx` 只作为观察者入口，保持空函数或原样返回回包，不隐藏业务逻辑。
8. `clearData()` 负责释放网络单元、监听句柄和状态；状态重置收敛为少量有语义的 `clearState()`、`clearServerState()`。

## 配置和数据归属

| 数据类型 | 归属 |
| --- | --- |
| 协议返回的当前账号、区服、角色、token | DB |
| 用户当前选择、提交前的业务对象 | DB |
| 可调外观候选、掉落、关卡、商店、文本 id | 配置表 |
| 临时展示页码、按钮选中态、动画态 | View / Component |
| 登录态、会话、角色归属和服务端状态前置 | 本地服务端 |

## LoginDB 对照

- `LoginDB` 的 `_serverList`、`_serverInfo`、`_charInfo`、`_token` 是清晰业务状态。
- `createEmptyCharInfo()` 是完整对象默认值入口，用来保证协议结构完整。
- `sendLogin()`、`sendServerList()`、`sendStartGame()` 是协议发送入口。
- `postLogin()`、`postServerList()`、`postStartGameInfo()` 是观察者入口。
- `clearData()` 释放网络单元，再调用状态清理。

## 反例

- 不要在 DB 中维护 `_appearancePartOptions`、`_appearancePartIndexes` 这类 UI 选择索引表。
- 不要写 `createEmptyAppearancePartOptions()`、`createEmptyAppearancePartIndexes()` 这类只返回空结构的机械工厂。
- 不要在 `sendXxx` 前用大量 `const clothes`、`const hat`、`const shoe` 再拼一大段 `return { ... }`；先收敛成当前业务对象或默认模板。
- 不要把配置表缺失用默认值悄悄兜底；缺配置要日志暴露并停止当前流程。

## 验证

- 搜索目标 DB 是否出现多组 `createEmptyXxxOptions`、`createEmptyXxxIndexes`、`_xxxOptions`、`_xxxIndexes`。
- 检查 `sendXxx` 是否有清晰请求对象，是否校验前置状态和发送失败分支。
- 检查 `postXxx` 是否只做观察者入口。
- 涉及配置候选时，同时读取 `config-runtime-pipeline` 并验证配置链路。
- 改完代码后执行 `code-quality-review`。
