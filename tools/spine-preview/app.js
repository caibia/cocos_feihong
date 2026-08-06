"use strict";

// ===== Spine 3.8 预览:基于 spine-webgl 自绘,提供缩放/平移/适应等视图操作 =====

/** 单个常驻渲染器:复用同一 WebGL 上下文,切换 spine 时只换资产以避免上下文泄漏。 */
class Viewer {
  /** @param {HTMLCanvasElement} canvas 渲染画布 */
  constructor(canvas) {
    this.canvas = canvas;
    // alpha:true 以支持透明背景
    this.context = new spine.webgl.ManagedWebGLRenderingContext(canvas, { alpha: true });
    this.gl = this.context.gl;
    this.renderer = new spine.webgl.SceneRenderer(canvas, this.context, true);

    this.assetManager = null;   // 当前资产管理器(每次加载新建,旧的释放)
    this.skeleton = null;       // 当前骨架
    this.state = null;          // 当前动画状态机
    this.premultipliedAlpha = true;

    this.speed = 1;             // 播放速度倍率
    this.paused = false;        // 暂停标志
    this.loop = true;           // 循环标志
    this.lastTime = performance.now() / 1000;

    this.bg = { r: 0.118, g: 0.122, b: 0.133, a: 1 };  // 背景色(0..1)
    this.fit = { zoom: 1, x: 0, y: 0 };                // 适应窗口得到的相机基准
    this.user = { zoom: 1, x: 0, y: 0 };               // 用户缩放/平移增量

    this.onProgress = null;     // (trackTime, duration) 进度回调

    this._installCameraControls();
    this._raf = requestAnimationFrame(() => this._frame());
  }

  /** 加载一个 spine(json/skel + atlas);binary=true 时按 .skel 二进制读取。失败时 reject,真实原因直接上抛不兜底。 */
  load(skeletonUrl, atlasUrl, premultipliedAlpha, binary) {
    this.premultipliedAlpha = premultipliedAlpha;
    if (this.assetManager) this.assetManager.dispose();
    this.skeleton = null;
    this.state = null;
    const am = (this.assetManager = new spine.webgl.AssetManager(this.context));
    if (binary) am.loadBinary(skeletonUrl); else am.loadText(skeletonUrl);
    am.loadTextureAtlas(atlasUrl);
    return new Promise((resolve, reject) => {
      const poll = () => {
        if (this.assetManager !== am) return;          // 已被新的加载取代,放弃
        if (!am.isLoadingComplete()) { requestAnimationFrame(poll); return; }
        if (am.hasErrors()) { reject(new Error("资源加载失败: " + JSON.stringify(am.getErrors()))); return; }
        try {
          this._build(skeletonUrl, atlasUrl, binary);
          resolve(this.info());
        } catch (e) {
          reject(e);
        }
      };
      poll();
    });
  }

  /** 由已加载数据构建骨架与状态机,并完成首帧适应。 */
  _build(skeletonUrl, atlasUrl, binary) {
    const atlas = this.assetManager.get(atlasUrl);
    const loader = new spine.AtlasAttachmentLoader(atlas);
    // .skel 走二进制读取(Uint8Array),.json 走文本读取;数据/版本不符会在此抛错
    const reader = binary ? new spine.SkeletonBinary(loader) : new spine.SkeletonJson(loader);
    const data = reader.readSkeletonData(this.assetManager.get(skeletonUrl));
    this.skeleton = new spine.Skeleton(data);
    this.state = new spine.AnimationState(new spine.AnimationStateData(data));

    if (data.skins.length) {
      this.skeleton.setSkinByName(data.skins[0].name);
      this.skeleton.setSlotsToSetupPose();
    }
    if (data.animations.length) {
      this.state.setAnimation(0, data.animations[0].name, this.loop);
    }
    this.paused = false;
    this.lastTime = performance.now() / 1000;
    // 以首帧姿态求包围盒
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();
    this.fitView();
  }

  /** 当前骨架的动画/皮肤清单及默认选中项。 */
  info() {
    const d = this.skeleton.data;
    const cur = this.state.getCurrent(0);
    return {
      animations: d.animations.map((a) => a.name),
      skins: d.skins.map((s) => s.name),
      animation: cur && cur.animation ? cur.animation.name : null,
      skin: this.skeleton.skin ? this.skeleton.skin.name : (d.skins[0] ? d.skins[0].name : null),
    };
  }

  setAnimation(name) {
    this.state.setAnimation(0, name, this.loop);
    this.paused = false;
  }

  setSkin(name) {
    this.skeleton.setSkinByName(name);
    this.skeleton.setSlotsToSetupPose();
    this.state.apply(this.skeleton);
  }

  setLoop(loop) {
    this.loop = loop;
    const cur = this.state.getCurrent(0);
    if (cur) cur.loop = loop;
  }

  setSpeed(v) { this.speed = v; }
  setPaused(p) { this.paused = p; if (!p) this.lastTime = performance.now() / 1000; }
  setPremultipliedAlpha(p) { this.premultipliedAlpha = p; }
  setBackground(c) { this.bg = c; }

  /** 拖动时间轴:设置当前轨道时间并暂停。 */
  seek(t01) {
    const cur = this.state.getCurrent(0);
    if (!cur || !cur.animation) return;
    cur.trackTime = t01 * cur.animation.duration;
    this.paused = true;
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();
  }

  /** 按当前姿态包围盒适应窗口,并清空用户缩放/平移。 */
  fitView() {
    if (!this.skeleton) return;
    this.skeleton.updateWorldTransform();
    const offset = new spine.Vector2();
    const size = new spine.Vector2();
    this.skeleton.getBounds(offset, size, []);
    const cw = this.canvas.clientWidth || this.canvas.width || 1;
    const ch = this.canvas.clientHeight || this.canvas.height || 1;
    const pad = 1.15;  // 留白系数
    // 相机 zoom = 世界单位/画布像素;取宽高需求较大者以完整容纳
    const zoom = Math.max((size.x * pad) / cw, (size.y * pad) / ch);
    this.fit.zoom = zoom > 0 && isFinite(zoom) ? zoom : 1;
    this.fit.x = offset.x + size.x / 2;
    this.fit.y = offset.y + size.y / 2;
    this.user = { zoom: 1, x: 0, y: 0 };
  }

  resetView() { this.user = { zoom: 1, x: 0, y: 0 }; }

  /** 鼠标滚轮缩放、按住拖动平移。 */
  _installCameraControls() {
    const c = this.canvas;
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.user.zoom = Math.min(50, Math.max(0.05, this.user.zoom * f));
    }, { passive: false });

    let dragging = false, lx = 0, ly = 0;
    c.addEventListener("mousedown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const camZoom = this.fit.zoom / this.user.zoom;  // 当前世界单位/像素
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this.user.x -= dx * camZoom;   // 让画面随鼠标移动
      this.user.y += dy * camZoom;   // 屏幕 y 向下、世界 y 向上,取反
    });
    window.addEventListener("mouseup", () => { dragging = false; });
  }

  /** 渲染循环:清屏 → 更新动画 → 设相机 → 绘制。 */
  _frame() {
    this._raf = requestAnimationFrame(() => this._frame());
    const gl = this.gl;
    this.renderer.resize(spine.webgl.ResizeMode.Expand);
    gl.clearColor(this.bg.r, this.bg.g, this.bg.b, this.bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.skeleton) return;

    const now = performance.now() / 1000;
    let delta = now - this.lastTime;
    this.lastTime = now;
    if (this.paused) delta = 0;
    this.state.update(delta * this.speed);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    const cam = this.renderer.camera;
    cam.zoom = this.fit.zoom / this.user.zoom;
    cam.position.x = this.fit.x + this.user.x;
    cam.position.y = this.fit.y + this.user.y;

    this.renderer.begin();
    this.renderer.drawSkeleton(this.skeleton, this.premultipliedAlpha);
    this.renderer.end();

    if (this.onProgress) {
      const cur = this.state.getCurrent(0);
      if (cur && cur.animation && cur.animation.duration > 0) {
        this.onProgress(cur.trackTime % cur.animation.duration, cur.animation.duration);
      } else {
        this.onProgress(0, 0);
      }
    }
  }
}

// ===== 应用层:列表、搜索、控件接线 =====

const $ = (id) => document.getElementById(id);
const els = {
  status: $("status"), current: $("current"), search: $("search"), list: $("list"),
  anim: $("anim"), skin: $("skin"), playpause: $("playpause"), loop: $("loop"),
  speed: $("speed"), speedval: $("speedval"), fit: $("fit"), reset: $("reset"),
  bg: $("bg"), pma: $("pma"), canvas: $("canvas"), overlay: $("overlay"),
  seek: $("seek"), time: $("time"),
  pickDir: $("pickDir"), pickFile: $("pickFile"), pathInput: $("pathInput"),
  loadPath: $("loadPath"), rootLabel: $("rootLabel"),
};

// 背景预设(0..1);transparent 配合舞台棋盘格
const BACKGROUNDS = [
  { key: "dark", label: "深灰", css: "#1e1f22", color: { r: 0.118, g: 0.122, b: 0.133, a: 1 } },
  { key: "black", label: "黑", css: "#000000", color: { r: 0, g: 0, b: 0, a: 1 } },
  { key: "white", label: "白", css: "#ffffff", color: { r: 1, g: 1, b: 1, a: 1 } },
  { key: "green", label: "绿", css: "#1aaf5d", color: { r: 0.102, g: 0.686, b: 0.365, a: 1 } },
  { key: "magenta", label: "品红", css: "#ff00ff", color: { r: 1, g: 0, b: 1, a: 1 } },
  { key: "transparent", label: "透明", css: "checker", color: { r: 0, g: 0, b: 0, a: 0 } },
];

let viewer = null;
let entries = [];        // 全部 spine 条目
let activeEl = null;     // 当前选中的列表项 DOM

function setStatus(msg, isError) {
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", !!isError);
}

function showOverlay(msg) {
  els.overlay.textContent = msg;
  els.overlay.classList.remove("hidden");
}
function hideOverlay() { els.overlay.classList.add("hidden"); }

/** 弹原生选择框选目录/文件,选完即扫描加载。 */
async function pickAndLoad(kind) {
  setStatus("选择" + (kind === "file" ? "文件" : "目录") + "…");
  let data;
  try {
    data = await (await fetch("/api/pick?type=" + kind)).json();
  } catch (e) {
    setStatus("无法打开选择框: " + e.message, true);
    return;
  }
  if (data.error) { setStatus(data.error, true); return; }
  if (data.cancelled || !data.path) { setStatus("已取消"); return; }
  els.pathInput.value = data.path;
  // 选文件时只会有一个条目,直接选中
  loadRoot(data.path, { autoSelectSingle: kind === "file" });
}

/** 扫描指定目录/文件路径并渲染列表;opts.autoOpen 深链选中,opts.autoSelectSingle 唯一项自动选中。 */
async function loadRoot(path, opts = {}) {
  setStatus("扫描中…");
  hideOverlay();
  let resp, data;
  try {
    resp = await fetch("/api/spines?root=" + encodeURIComponent(path));
    data = await resp.json();
  } catch (e) {
    setStatus("请求失败: " + e.message, true);
    return;
  }
  if (!resp.ok) {
    // 服务端已显式给出错误原因,直接呈现
    setStatus(data.error || "扫描失败", true);
    return;
  }
  entries = data.entries;
  els.rootLabel.textContent = data.root;
  els.rootLabel.title = data.root;
  renderList(els.search.value.trim());
  const broken = entries.filter((e) => e.error).length;
  setStatus(`共 ${entries.length} 个 spine` + (broken ? ` · ${broken} 个有问题` : ""));

  if (opts.autoOpen) {
    const el = els.list.querySelector(`[data-key="${CSS.escape(opts.autoOpen)}"]`);
    if (el) { el.scrollIntoView({ block: "center" }); el.click(); }
    else setStatus(`未找到: ${opts.autoOpen}`, true);
  } else if (opts.autoSelectSingle && entries.length === 1) {
    const el = els.list.querySelector(".item");
    if (el) el.click();
  }
}

/** 按关键字过滤并分组渲染。 */
function renderList(keyword) {
  els.list.innerHTML = "";
  if (!entries.length) {
    els.list.innerHTML = '<div class="hint">请选择目录或文件</div>';
    return;
  }
  const kw = (keyword || "").toLowerCase();
  const matched = entries.filter(
    (e) => !kw || e.name.toLowerCase().includes(kw) || e.dir.toLowerCase().includes(kw)
  );
  if (!matched.length) {
    els.list.innerHTML = '<div class="hint">无匹配项</div>';
    return;
  }
  const groups = new Map();
  for (const e of matched) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group).push(e);
  }
  for (const [group, items] of groups) {
    const gt = document.createElement("div");
    gt.className = "group-title";
    gt.textContent = `${group} (${items.length})`;
    els.list.appendChild(gt);
    for (const e of items) els.list.appendChild(itemEl(e));
  }
}

/** 构造单个列表项 DOM。 */
function itemEl(entry) {
  const el = document.createElement("div");
  el.className = "item" + (entry.error ? " broken" : "");
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = entry.name;
  const path = document.createElement("span");
  path.className = "path";
  path.textContent = entry.dir;
  el.append(name, path);
  el.dataset.key = `${entry.dir}/${entry.name}`;  // 供 ?open= 深链定位
  if (entry.error) {
    const err = document.createElement("span");
    err.className = "err";
    err.textContent = entry.error;
    el.appendChild(err);
  }
  el.addEventListener("click", () => selectEntry(entry, el));
  return el;
}

/** 选中并加载一个条目;损坏条目只报错不加载。 */
async function selectEntry(entry, el) {
  if (entry.error) {
    setStatus(`${entry.name}: ${entry.error}`, true);
    return;
  }
  if (activeEl) activeEl.classList.remove("active");
  el.classList.add("active");
  activeEl = el;
  els.current.textContent = `${entry.dir}/${entry.name}`;
  hideOverlay();
  setStatus("加载中…");
  try {
    const info = await viewer.load(entry.skeletonUrl, entry.atlasUrl, els.pma.checked, entry.binary);
    populateSelect(els.anim, info.animations, info.animation);
    populateSelect(els.skin, info.skins, info.skin);
    els.playpause.textContent = "⏸";
    setStatus(`${entry.binary ? "skel" : "json"} · 动画 ${info.animations.length} · 皮肤 ${info.skins.length}`);
  } catch (e) {
    showOverlay(String(e.message || e));
    setStatus("加载失败", true);
  }
}

/** 用选项填充下拉框并选中默认值。 */
function populateSelect(sel, names, selected) {
  sel.innerHTML = "";
  for (const n of names) {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    if (n === selected) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.disabled = names.length === 0;
}

/** 渲染背景色按钮。 */
function renderBackgrounds() {
  BACKGROUNDS.forEach((b, i) => {
    const sw = document.createElement("button");
    sw.className = "swatch" + (b.css === "checker" ? " checker" : "") + (i === 0 ? " active" : "");
    if (b.css !== "checker") sw.style.background = b.css;
    sw.title = b.label;
    sw.addEventListener("click", () => {
      document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      sw.classList.add("active");
      viewer.setBackground(b.color);
    });
    els.bg.appendChild(sw);
  });
}

function wireControls() {
  els.pickDir.addEventListener("click", () => pickAndLoad("dir"));
  els.pickFile.addEventListener("click", () => pickAndLoad("file"));
  els.loadPath.addEventListener("click", () => {
    const p = els.pathInput.value.trim();
    if (p) loadRoot(p);
  });
  els.pathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const p = els.pathInput.value.trim(); if (p) loadRoot(p); }
  });
  els.search.addEventListener("input", () => renderList(els.search.value.trim()));
  els.anim.addEventListener("change", () => viewer.setAnimation(els.anim.value));
  els.skin.addEventListener("change", () => viewer.setSkin(els.skin.value));
  els.loop.addEventListener("change", () => viewer.setLoop(els.loop.checked));
  els.pma.addEventListener("change", () => viewer.setPremultipliedAlpha(els.pma.checked));
  els.speed.addEventListener("input", () => {
    const v = parseFloat(els.speed.value);
    viewer.setSpeed(v);
    els.speedval.textContent = v.toFixed(1) + "×";
  });
  els.playpause.addEventListener("click", () => {
    const paused = els.playpause.textContent === "⏸";
    viewer.setPaused(paused);
    els.playpause.textContent = paused ? "▶" : "⏸";
  });
  els.fit.addEventListener("click", () => viewer.fitView());
  els.reset.addEventListener("click", () => viewer.resetView());

  // 时间轴:拖动时暂停并定位
  els.seek.addEventListener("input", () => {
    viewer.seek(parseInt(els.seek.value, 10) / 1000);
    els.playpause.textContent = "▶";
  });
  // 渲染进度回写时间轴(拖动时不抢占)
  let seeking = false;
  els.seek.addEventListener("mousedown", () => { seeking = true; });
  window.addEventListener("mouseup", () => { seeking = false; });
  viewer.onProgress = (t, dur) => {
    if (!seeking && dur > 0) els.seek.value = String(Math.round((t / dur) * 1000));
    els.time.textContent = `${t.toFixed(2)} / ${dur.toFixed(2)}s`;
  };
}

function main() {
  viewer = new Viewer(els.canvas);
  renderBackgrounds();
  wireControls();
  renderList("");  // 初始提示
  // 深链:?root=<路径>&open=<dir>/<name> 启动即加载并选中(便于书签/分享)
  const p = new URLSearchParams(location.search);
  const root = p.get("root");
  if (root) { els.pathInput.value = root; loadRoot(root, { autoOpen: p.get("open") || undefined }); }
}

main();
