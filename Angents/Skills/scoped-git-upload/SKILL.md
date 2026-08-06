---
name: scoped-git-upload
description: Use when cocos_feihong 需要提交、上传、push、同步到 origin/main，且工作区可能有无关改动、用户只要求上传当前任务范围、需要核对 staged scope、串联验证矩阵、避免 git add . 误带脏文件。
---

# 定范围提交与上传

## 使用时机

- 用户说“上传一下”“提交一下”“push”“同步到远端”“传这一部分”。
- 当前工作区有多个未提交改动，但用户只要求上传本次任务或指定文件范围。
- 需要在提交前证明暂存区没有混入无关文件。
- 用户明确说“全部上传”“全量提交”时，也使用本 Skill 的全量分支确认范围。

## References

- 选择提交前验证类型时，读取 `Angents/Skills/code-quality-review/references/verification-matrix.md`，按 staged 改动类型合并最小验证组合。
- 需要具体命令时，读取 `Angents/Skills/code-quality-review/references/test-catalog.md`。

## 核心原则

1. 默认按当前任务定范围提交，不使用 `git add .`、`git add -A` 或泛目录 staging。
2. 用户明确说“全部上传”“全量提交”时，才允许全量 staging，并先复述全量范围。
3. 只 stage 本次任务需要的文件；无关脏文件保持原样。
4. 提交前必须用 `git diff --cached --name-status` 或 `git diff --cached --name-only` 核对暂存区。
5. 如果暂存区混入无关文件，先取消暂存无关文件，再继续。
6. 验证以 staged subset 为准；工作区有无关失败时，不把无关失败算成本次阻塞。
7. `git diff --cached --check` 只证明补丁格式，不替代验证矩阵里的业务、类型、资源、文档或 Skill 校验。

## 标准流程

1. 查看状态：`git status --short --branch -uall`。
2. 明确范围：列出本次要提交的文件或目录。
3. 选择验证：按验证矩阵和命令索引列出必须运行的专项脚本、静态检查和 `git diff --cached --check`。
4. 精确暂存：只 `git add -- <path>` 指定路径。
5. 核对暂存：运行 `git diff --cached --name-status`。
6. 证明无越界：必要时用 `git diff --cached --name-only` 对照允许列表，确认 `outside_count=0`。
7. 运行验证：优先验证 staged subset；全工作区被无关改动污染时，用暂存区、临时 checkout 或本次范围专项脚本验证。
8. 提交：commit message 写本次真实改动，不概括无关脏文件。
9. 推送：`git push origin main` 或用户指定远端分支。
10. 复核：确认 `git status --short --branch` 没有本次提交的 ahead 状态，或比较 `HEAD` 与 `origin/main`。

## 脏工作区验证

1. 如果全工作区验证会受无关改动影响，优先找本次范围内的专项验证。
2. 若专项脚本依赖 staged 内容，可从暂存区或临时 checkout 验证 staged subset。
3. 验证结果必须能对应到暂存文件；不能用未暂存工作区结果冒充 staged subset 验证。
4. 报告时区分“本次已验证”和“工作区无关未验证 / 无关失败”。
5. 不因无关脏文件失败而扩大提交范围。

## 常见错误

1. 在脏工作区用 `git add .`。
2. 只看 `git status`，不看 `git diff --cached --name-status`。
3. 用户只说上传当前修改，却把历史脏文件一起提交。
4. 只跑 `git diff --cached --check`，没有按验证矩阵跑本次改动类型需要的专项验证。
5. 验证跑的是全工作区失败，结论却说本次无法提交，没有区分无关失败。
6. push 后不确认远端状态。
