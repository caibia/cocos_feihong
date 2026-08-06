"""MCP FairyGUI 服务入口"""

import os
from pathlib import Path
from fastmcp import FastMCP


def _detect_project_root() -> Path:
    """
    自动检测项目根目录（含 .mcp.json 的目录）。

    优先级：
    1. 环境变量 PROJECT_ROOT（用于特殊情况覆盖）
    2. 从脚本位置向上搜索 .mcp.json（最稳定，不依赖进程 cwd）
    3. 从 CWD 向上搜索 .mcp.json（兜底）
    """
    if "PROJECT_ROOT" in os.environ:
        return Path(os.environ["PROJECT_ROOT"])

    script_path = Path(__file__).resolve()
    for parent in script_path.parents:
        if (parent / ".mcp.json").exists():
            return parent

    cwd = Path(os.getcwd()).resolve()
    for parent in [cwd] + list(cwd.parents):
        if (parent / ".mcp.json").exists():
            return parent

    # 最后兜底：脚本所在包向上三层
    return script_path.parents[3]


def _resolve_ui_project_path(project_root: Path) -> Path:
    """
    解析 UI_PROJECT_PATH。若是相对路径，按多个锚点依次尝试，选第一个真实存在的:
    - 进程 cwd（标准 MCP runner 应该已 chdir 到 .mcp.json 的 cwd 字段）
    - 包安装目录（.mcp.json 通常把 cwd 设为这里）
    - 项目根目录（.mcp.json 所在目录）
    都不存在则返回包目录解析结果（用于错误信息）。
    """
    env_val = os.environ.get("UI_PROJECT_PATH")
    if not env_val:
        return (project_root / "client/ui_project").resolve()

    p = Path(env_val)
    if p.is_absolute():
        return p.resolve()

    # 包根目录: server.py -> mcp_fairygui -> src -> <package>
    pkg_root = Path(__file__).resolve().parents[2]
    cwd = Path(os.getcwd())
    anchors = [cwd, pkg_root, project_root]
    for anchor in anchors:
        candidate = (anchor / p).resolve()
        if candidate.exists():
            return candidate
    # 没命中：用包目录锚点的结果（最贴近 .mcp.json 里 cwd 的本意）
    return (pkg_root / p).resolve()


# 项目路径配置（自动检测）
PROJECT_ROOT = _detect_project_root()
UI_PROJECT_PATH = _resolve_ui_project_path(PROJECT_ROOT)
BRIDGE_PATH = UI_PROJECT_PATH / "plugins/MCPBridge/bridge"

# 创建 MCP 服务
mcp = FastMCP("fairygui-tools")

# 导入并注册工具模块
from .tools import package_tools, component_tools, editor_tools, file_tools

# 注册工具
package_tools.register(mcp, PROJECT_ROOT, UI_PROJECT_PATH)
component_tools.register(mcp, PROJECT_ROOT, UI_PROJECT_PATH)
editor_tools.register(mcp, BRIDGE_PATH)
file_tools.register(mcp, PROJECT_ROOT, UI_PROJECT_PATH, BRIDGE_PATH)


def main():
    """启动 MCP 服务"""
    mcp.run()


if __name__ == "__main__":
    main()