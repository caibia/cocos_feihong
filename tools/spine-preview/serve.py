#!/usr/bin/env python3
"""Spine 3.8 预览工具:本地 HTTP 服务,按用户所选目录/文件扫描并托管 spine 资源。"""
from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

# 工具目录(前端文件所在),作为静态根
TOOL_DIR = Path(__file__).resolve().parent
# atlas 贴图页可能的扩展名
IMG_EXTS = (".png", ".jpg", ".jpeg", ".webp")
# 当前已选中的资源根:/assets 据此解析,由 /api/spines 设置;未选择前为 None
CURRENT_ROOT: Path | None = None


def list_textures(atlas_path: Path) -> list[str]:
    """读出 atlas 引用的贴图文件名(libgdx 格式:页名为顶格且带图片扩展名的行)。"""
    names: list[str] = []
    for line in atlas_path.read_text(encoding="utf-8").splitlines():
        if line and not line[0].isspace() and line.strip().lower().endswith(IMG_EXTS):
            names.append(line.strip())
    return names


def build_entry(folder: Path, stem: str, base: Path) -> dict:
    """构造单个 spine 条目;缺配套文件不静默跳过,而是显式标注 error。"""
    json_path = folder / f"{stem}.json"
    skel_path = folder / f"{stem}.skel"
    atlas_path = folder / f"{stem}.atlas"
    rel_dir = folder.relative_to(base).as_posix()
    entry = {
        "name": stem,                                                    # spine 名(文件 stem)
        "dir": rel_dir,                                                  # 相对所选根的所属文件夹
        "group": rel_dir.split("/", 1)[0] if rel_dir != "." else "(根)",  # 列表分组:首层目录
        "skeletonUrl": None,                                             # 骨架数据:.json 或 .skel
        "binary": False,                                                 # True=.skel(二进制),False=.json
        "atlasUrl": None,
        "textures": [],
        "error": None,                                                   # 非空表示不可用及原因
    }
    errors: list[str] = []
    # 同名 json 与 skel 并存时优先 json(文本读取更宽容);仅有 skel 时按二进制加载
    if json_path.is_file():
        entry["skeletonUrl"] = "/assets/" + json_path.relative_to(base).as_posix()
        entry["binary"] = False
    elif skel_path.is_file():
        entry["skeletonUrl"] = "/assets/" + skel_path.relative_to(base).as_posix()
        entry["binary"] = True
    else:
        errors.append("缺少同名 .json/.skel")
    if atlas_path.is_file():
        entry["atlasUrl"] = "/assets/" + atlas_path.relative_to(base).as_posix()
        textures = list_textures(atlas_path)
        entry["textures"] = textures
        missing = [t for t in textures if not (folder / t).is_file()]
        if not textures:
            errors.append("atlas 未声明任何贴图页")
        elif missing:
            errors.append("缺少贴图: " + ", ".join(missing))
    else:
        errors.append("缺少同名 .atlas")
    if errors:
        entry["error"] = "; ".join(errors)
    return entry


def scan_root(raw: str) -> dict:
    """扫描所选目录(递归)或单个文件,返回 {root, entries};同时设定 /assets 的解析根。"""
    global CURRENT_ROOT
    root = Path(raw)
    if not root.exists():
        # 不兜底:路径不存在直接抛出,由 API 层转成 HTTP 错误
        raise FileNotFoundError(f"路径不存在: {root}")
    if root.is_file():
        # 选了文件:以其所在目录为根,只返回该文件对应的 spine
        base = root.parent
        entries = [build_entry(base, root.stem, base)]
    else:
        # 选了目录:递归列出其下全部 spine(以 .json / .skel 为锚;同名 json+skel 视作同一条目)
        base = root
        anchors: dict[tuple[Path, str], None] = {}
        for pat in ("*.json", "*.skel"):
            for fp in base.rglob(pat):
                anchors[(fp.parent, fp.stem)] = None
        entries = [
            build_entry(folder, stem, base)
            for folder, stem in sorted(anchors, key=lambda fs: (fs[0].as_posix().lower(), fs[1].lower()))
        ]
    CURRENT_ROOT = base.resolve()
    return {"root": str(base), "entries": entries}


def pick_path(kind: str) -> dict:
    """弹出原生选择框(tkinter);kind 为 dir/file。返回 {path} 或 {cancelled} 或 {error}。"""
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:  # tkinter 缺失等:显式上报,不静默
        return {"error": f"无法打开原生对话框: {exc}"}
    win = tk.Tk()
    win.withdraw()
    win.attributes("-topmost", True)
    win.update()
    try:
        if kind == "file":
            path = filedialog.askopenfilename(
                parent=win,
                title="选择 .json / .skel 或 .atlas",
                filetypes=[("Spine 文件", "*.json *.skel *.atlas"), ("所有文件", "*.*")],
            )
        else:
            path = filedialog.askdirectory(parent=win, title="选择 spine 目录")
    finally:
        win.destroy()
    return {"path": path} if path else {"cancelled": True}


class Handler(SimpleHTTPRequestHandler):
    """静态根=工具目录;另提供 /api/pick、/api/spines 与 /assets/<相对所选根>。"""

    # 显式指定 MIME,避开 Windows 注册表对 .js/.css 的错误映射
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".html": "text/html",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(TOOL_DIR), **kwargs)

    def do_GET(self):
        parts = urlsplit(self.path)
        path = parts.path
        if path == "/api/pick":
            return self._serve_pick(parse_qs(parts.query))
        if path == "/api/spines":
            return self._serve_spines(parse_qs(parts.query))
        if path.startswith("/assets/"):
            return self._serve_asset(path[len("/assets/"):])
        return super().do_GET()

    def _serve_pick(self, query: dict):
        """弹原生对话框选目录/文件,返回所选路径。"""
        kind = (query.get("type") or ["dir"])[0]
        self._send_json(pick_path(kind))

    def _serve_spines(self, query: dict):
        """扫描 ?root=<绝对路径> 指定的目录/文件;缺参或路径非法以错误显式暴露。"""
        raw = (query.get("root") or [""])[0]
        if not raw:
            return self._send_json({"error": "缺少 root 参数"}, 400)
        try:
            payload = scan_root(raw)
        except FileNotFoundError as exc:
            return self._send_json({"error": str(exc)}, 404)
        self._send_json(payload)

    def _serve_asset(self, rel: str):
        """托管所选根下的资源文件;未选择或越界时显式报错,不兜底。"""
        if CURRENT_ROOT is None:
            return self.send_error(409, "no root selected")
        target = (CURRENT_ROOT / unquote(rel)).resolve()
        if target != CURRENT_ROOT and CURRENT_ROOT not in target.parents:
            return self.send_error(403, "forbidden")
        if not target.is_file():
            return self.send_error(404, "not found")
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix.lower() == ".atlas":
            ctype = "text/plain; charset=utf-8"
        self._send_bytes(target.read_bytes(), ctype)

    def _send_json(self, obj, status: int = 200):
        self._send_bytes(
            json.dumps(obj, ensure_ascii=False).encode("utf-8"),
            "application/json; charset=utf-8",
            status,
        )

    def _send_bytes(self, data: bytes, ctype: str, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description="Spine 3.8 预览本地服务")
    # 默认 8970,避开 mitmweb 的 8080
    parser.add_argument("--port", type=int, default=8970, help="监听端口(默认 8970)")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址(默认 127.0.0.1)")
    args = parser.parse_args()

    # 单线程 HTTPServer:请求在主线程处理,tkinter 对话框可正常弹出
    server = HTTPServer((args.host, args.port), Handler)
    print(f"Spine 预览服务已启动: http://{args.host}:{args.port}/")
    print("打开页面后,点『选择目录/文件』或粘贴路径来加载 spine")
    print("Ctrl+C 停止")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
