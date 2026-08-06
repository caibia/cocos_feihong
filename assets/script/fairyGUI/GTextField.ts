import { BitmapFont, CacheMode, Color, Font, HorizontalTextAlignment, Label, Node, Vec2, VerticalTextAlignment } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { AutoSizeType, ObjectPropID } from "./FieldTypes";
import { GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { UIConfig, getFontByName } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";
import { ToolSet } from "./utils/ToolSet";
import { defaultParser } from "./utils/UBBParser";
import { GComponent } from "./GComponent";
import ExtendColor, { GradientColorInfoArr } from "../base/extend/ExtendColor";
import Extend from "../base/extend/Extend";

/** 带 UBB 颜色状态的 Label。 */
type LabelWithUbbState = Label & {
    /** 是否启用 UBB 顶点色。 */
    $useUBB?: boolean,
    /** UBB 文本所属对象。 */
    $ubbOwner?: GTextField,
    /** UBB 颜色区间。 */
    $ubbColorArr?: GradientColorInfoArr,
};

/**
 * 文本组件，负责普通文本、模板文本、UBB 解析、自动尺寸以及底层 `Label` 渲染同步。
 */
export class GTextField extends GObject {
    /**
     * Cocos 统一颜色填充模式。
     */
    private static readonly _FILL_COLOR_TYPE_COLOR = 0;
    /**
     * Cocos 顶点颜色填充模式。
     */
    private static readonly _FILL_COLOR_TYPE_VERTEX = 1;
    /**
     * UBB 顶点色补丁已注入标记。
     */
    private static _UBB_ASSEMBLER_PATCHED = "__x_ubb_vertex_color_patched__";
    /**
     * UBB 渲染数据补丁已注入标记。
     */
    private static _UBB_RENDER_DATA_PATCHED = "__x_ubb_render_data_patched__";
    /**
     * 底层 `Label` 组件；文本内容、排版、缓存模式和顶点色补丁都直接作用在这里。
     */
    public _label: Label;

    /**
     * 业务层或编辑器设置的字体标识；可能是注册字体名，也可能是资源路径。
     */
    protected _font: string;
    /**
     * 真正应用到底层 `Label` 的字体对象或字体名；在 `assignFont` 时解析得到。
     */
    protected _realFont: string | Font;
    /**
     * 逻辑字号；位图字体场景下会进一步换算到底层真实字号。
     */
    protected _fontSize: number = 0;
    /**
     * 文本默认颜色；未被 UBB 标签覆盖的片段最终都会使用它。
     */
    protected _color: Color;
    /**
     * 描边颜色；仅在描边宽度大于 0 时参与显示。
     */
    protected _strokeColor?: Color;
    /**
     * 阴影偏移量；写入到底层 `Label` 时会换算成引擎坐标方向。
     */
    protected _shadowOffset?: Vec2;
    /**
     * 阴影颜色；只有在阴影开启时才会实际影响渲染。
     */
    protected _shadowColor?: Color;
    /**
     * 逻辑行距；会和字号共同换算到底层 `lineHeight`。
     */
    protected _leading: number = 0;
    /**
     * 原始文本内容；模板变量替换和 UBB 解析都会基于它做二次处理。
     */
    protected _text: string;
    /**
     * 是否启用 UBB 解析；开启后 `updateText` 会先交给 `UBBParser` 处理文本。
     */
    protected _ubbEnabled: boolean;
    /**
     * 模板变量集合；用于替换 `{name}` 一类占位符。
     */
    protected _templateVars?: { [index: string]: string };
    /**
     * 自动尺寸策略；决定文本变化时是扩容、收缩还是裁剪。
     */
    protected _autoSize: AutoSizeType;
    /**
     * 尺寸回流锁；底层 `Label` 回写尺寸时用来防止递归触发布局。
     */
    protected _updatingSize: boolean;
    /**
     * 尺寸脏标记；文本、字号、行距等变化后都会把它置为 `true`。
     */
    protected _sizeDirty: boolean;
    /**
     * 垂直滚动文本时额外挂载的容器，用来把文本包进可滚动结构中。
     */
    protected _scrollLabCom: GComponent;
    /**
     * 当前文本对应的 UBB 颜色区间。
     */
    private _ubbColorArr?: GradientColorInfoArr;
    /**
     * UBB 组装器补丁的重试标记。
     */
    private _ubbPatchRetryPending: boolean = false;
    /**
     * UBB 组装器补丁的重试次数。
     */
    private _ubbPatchRetryCount: number = 0;
    /**
     * UBB 顶点色重刷的重试标记。
     */
    private _ubbColorRefreshPending: boolean = false;

    /**
     * 初始化默认文本状态，并创建底层 `Label` 与尺寸监听。
     */
    public constructor() {
        super();

        this._node.name = "GTextField";
        this._touchDisabled = true;

        this._text = "";
        this._color = new Color(255, 255, 255, 255);

        this.createRenderer();

        this.fontSize = 12;
        this.leading = 3;
        this.singleLine = false;

        this._sizeDirty = false;

        this._node.on(Node.EventType.SIZE_CHANGED, this.onLabelSizeChanged, this);
    }

    /**
     * 创建当前文本对象所需的底层渲染组件。
     */
    protected createRenderer() {
        this._label = this._node.addComponent(Label);
        this._label.string = "";
        // 触发设置默认字体
        this.font = undefined;

        // this._label.cacheMode = Label.CacheMode.CHAR;
        this.autoSize = AutoSizeType.Both;
    }

    /**
     * 设置原始文本内容，并立即触发 GearText、尺寸脏标记和底层排版刷新。
     * @param value 原始文本内容。
     */
    public set text(value: string | null) {
        this._text = value;
        if (this._text == null)
            this._text = "";
        this.updateGear(6);

        this.markSizeChanged();
        this.updateText();
    }

    /**
     * 获取当前文本内容。
     */
    public get text(): string | null {
        return this._text;
    }

    /**
     * 获取当前字体标识。
     */
    public get font(): string | null {
        return this._font;
    }

    /** 判断当前字体是否走原生 TTF 渲染链路。 */
    public get isNativeTTF(): boolean {
        return false;
    }

    /**
     * 设置字体标识，并重新解析底层字体资源。
     * @param value 字体标识或资源路径。
     */
    public set font(value: string | null) {
        if (this._font != value || !value) {
            this._font = value;

            this.markSizeChanged();

            let newFont: any = value ? value : UIConfig.defaultFont;

            if (newFont.startsWith("ui://")) {
                var pi: PackageItem = UIPackage.getItemByURL(newFont);
                if (pi)
                    newFont = <Font>pi.owner.getItemAsset(pi);
                else
                    newFont = UIConfig.defaultFont;
            }
            this._realFont = newFont;
            this.updateFont();
        }
    }

    /**
     * 获取当前字号。
     */
    public get fontSize(): number {
        return this._fontSize;
    }

    /**
     * 设置字号，并刷新文本排版。
     * @param value 字号。
     */
    public set fontSize(value: number) {
        if (value < 0)
            return;

        if (this._fontSize != value) {
            this._fontSize = value;

            this.markSizeChanged();
            this.updateFontSize();
        }
    }

    /**
     * 获取当前颜色。
     */
    public get color(): Color {
        return this._color;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     * @param value 文本颜色。
     */
    public set color(value: Color) {
        this._color.set(value);
        this.updateGear(4);
        this.updateFontColor();
    }

    /**
     * 获取当前水平对齐方式。
     */
    public get align(): HorizontalTextAlignment {
        return this._label ? this._label.horizontalAlign : 0;
    }

    /**
     * 设置水平对齐方式，并刷新排版或布局。
     * @param value 水平对齐方式。
     */
    public set align(value: HorizontalTextAlignment) {
        if (this._label) this._label.horizontalAlign = value;
    }

    /**
     * 获取当前垂直对齐方式。
     */
    public get verticalAlign(): VerticalTextAlignment {
        return this._label ? this._label.verticalAlign : 0;
    }

    /**
     * 设置垂直对齐方式，并刷新排版或布局。
     * @param value 垂直对齐方式。
     */
    public set verticalAlign(value: VerticalTextAlignment) {
        if (this._label) this._label.verticalAlign = value;
    }

    /**
     * 获取当前行距。
     */
    public get leading(): number {
        return this._leading;
    }

    /**
     * 设置行距，并刷新文本行高。
     * @param value 行距。
     */
    public set leading(value: number) {
        if (this._leading != value) {
            this._leading = value;

            this.markSizeChanged();
            this.updateFontSize();
        }
    }

    /**
     * 获取当前字距。
     */
    public get letterSpacing(): number {
        return this._label ? this._label.spacingX : 0;
    }

    /**
     * 设置字距，并刷新文本排版。
     * @param value 字距。
     */
    public set letterSpacing(value: number) {
        if (this._label && this._label.spacingX != value) {
            this.markSizeChanged();
            this._label.spacingX = value;
        }
    }

    /**
     * 获取下划线开关状态。
     */
    public get underline(): boolean {
        return this._label ? this._label.isUnderline : false;
    }

    /**
     * 设置下划线开关，并同步到底层 `Label`。
     * @param value 是否启用下划线。
     */
    public set underline(value: boolean) {
        if (this._label) this._label.isUnderline = value;
    }

    /**
     * 获取粗体开关状态。
     */
    public get bold(): boolean {
        return this._label ? this._label.isBold : false;
    }

    /**
     * 设置粗体开关，并同步到底层 `Label`。
     * @param value 是否启用粗体。
     */
    public set bold(value: boolean) {
        if (this._label) this._label.isBold = value;
    }

    /**
     * 获取斜体开关状态。
     */
    public get italic(): boolean {
        return this._label ? this._label.isItalic : false;
    }

    /**
     * 设置斜体开关，并同步到底层 `Label`。
     * @param value 是否启用斜体。
     */
    public set italic(value: boolean) {
        if (this._label) this._label.isItalic = value;
    }

    /**
     * 获取当前是否按单行模式排版。
     */
    public get singleLine(): boolean {
        return this._label ? !this._label.enableWrapText : false;
    }

    /**
     * 设置单行模式开关，并同步到底层 `Label` 的换行策略。
     * @param value 是否启用单行模式。
     */
    public set singleLine(value: boolean) {
        if (this._label) this._label.enableWrapText = !value;
    }

    /**
     * 获取当前描边宽度。
     */
    public get stroke(): number {
        return this._label ? this._label.outlineWidth : 0;
    }

    /**
     * 设置描边宽度，并同步描边开关。
     * @param value 描边宽度。
     */
    public set stroke(value: number) {
        if (!this._label)
            return;

        this._label.outlineWidth = value;
        this._label.enableOutline = value > 0;
        if (value > 0)
            this.updateStrokeColor();
    }

    /**
     * 获取当前描边颜色。
     */
    public get strokeColor(): Color {
        return this._strokeColor;
    }

    /**
     * 获取底层 Cocos `Label` 组件。
     */
    public get ccLabel(): Label {
        return this._label;
    }

    /**
     * 设置描边颜色，并刷新描边显示。
     * @param value 描边颜色。
     */
    public set strokeColor(value: Color) {
        if (!this._strokeColor)
            this._strokeColor = new Color();
        this._strokeColor.set(value);
        this.updateGear(4);
        this.updateStrokeColor();
    }

    /**
     * 获取当前阴影偏移量。
     */
    public get shadowOffset(): Vec2 {
        return this._shadowOffset;
    }

    /**
     * 设置阴影偏移量，并同步阴影开关。
     * @param value 阴影偏移量。
     */
    public set shadowOffset(value: Vec2) {
        if (!this._shadowOffset)
            this._shadowOffset = new Vec2();
        this._shadowOffset.set(value);

        if (!this._label)
            return;
        this._label.shadowOffset = new Vec2(this._shadowOffset.x, -this._shadowOffset.y);
        this._label.enableShadow = value.x != 0 || value.y != 0;
        if (this._label.enableShadow)
            this.updateShadowColor();
    }

    /**
     * 获取当前阴影颜色。
     */
    public get shadowColor(): Color {
        return this._shadowColor;
    }

    /**
     * 设置阴影颜色，并刷新阴影显示。
     * @param value 阴影颜色。
     */
    public set shadowColor(value: Color) {
        if (!this._shadowColor)
            this._shadowColor = new Color();
        this._shadowColor.set(value);
        this.updateShadowColor();
    }

    /**
     * 设置 UBB 解析开关，并在后续刷新文本时决定是否走 UBB 流程。
     * @param value 是否启用 UBB 解析。
     */
    public set ubbEnabled(value: boolean) {
        if (this._ubbEnabled != value) {
            this._ubbEnabled = value;

            this.markSizeChanged();
            this.updateText();
        }
    }

    /**
     * 获取 UBB 解析开关状态。
     */
    public get ubbEnabled(): boolean {
        return this._ubbEnabled;
    }

    /**
     * 设置自动尺寸策略，并按策略刷新布局或排版。
     * @param value 自动尺寸策略。
     */
    public set autoSize(value: AutoSizeType) {
        if (this._autoSize != value) {
            this._autoSize = value;

            this.markSizeChanged();
            this.updateOverflow();
        }
    }

    /**
     * 获取当前自动尺寸策略。
     */
    public get autoSize(): AutoSizeType {
        return this._autoSize;
    }

    /**
     * 解析模板字符串，并将变量占位符替换为当前值。
     * @param template 模板字符串。
     * @returns 替换后的文本结果。
     */
    protected parseTemplate(template: string): string {
        var pos1: number = 0, pos2: number, pos3: number;
        var tag: string;
        var value: string;
        var result: string = "";
        while ((pos2 = template.indexOf("{", pos1)) != -1) {
            if (pos2 > 0 && template.charCodeAt(pos2 - 1) == 92)//\
            {
                result += template.substring(pos1, pos2 - 1);
                result += "{";
                pos1 = pos2 + 1;
                continue;
            }

            result += template.substring(pos1, pos2);
            pos1 = pos2;
            pos2 = template.indexOf("}", pos1);
            if (pos2 == -1)
                break;

            if (pos2 == pos1 + 1) {
                result += template.substring(pos1, pos1 + 2);
                pos1 = pos2 + 1;
                continue;
            }

            tag = template.substring(pos1 + 1, pos2);
            pos3 = tag.indexOf("=");
            if (pos3 != -1) {
                value = this._templateVars[tag.substring(0, pos3)];
                if (value == null)
                    result += tag.substring(pos3 + 1);
                else
                    result += value;
            }
            else {
                value = this._templateVars[tag];
                if (value != null)
                    result += value;
            }
            pos1 = pos2 + 1;
        }

        if (pos1 < template.length)
            result += template.substring(pos1);

        return result;
    }

    /**
     * 获取当前模板变量字典。
     */
    public get templateVars(): { [index: string]: string } {
        return this._templateVars;
    }

    /**
     * 整体替换模板变量字典，并立即把变量重新刷回当前文本。
     * @param value 模板变量字典。
     */
    public set templateVars(value: { [index: string]: string }) {
        if (this._templateVars == null && value == null)
            return;

        this._templateVars = value;
        this.flushVars();
    }

    /**
     * 写入单个模板变量，便于后续统一刷新文本。
     * @param name 模板变量名。
     * @param value 模板变量值。
     */
    public setVar(name: string, value: string): GTextField {
        if (!this._templateVars)
            this._templateVars = {};
        this._templateVars[name] = value;

        return this;
    }

    /**
     * 立即把模板变量重新应用到当前文本内容。
     */
    public flushVars(): void {
        this.markSizeChanged();
        this.updateText();
    }

    /**
     * 获取文本内容在当前排版下的实际宽度。
     */
    public get textWidth(): number {
        this.ensureSizeCorrect();

        return this._uiTrans.width;
    }

    /** 获取文本内容在当前排版下的实际高度 */
    public get textHeight(): number {
        this.ensureSizeCorrect();

        return this._uiTrans.height;
    }

    /**
     * 确保当前尺寸缓存已完成刷新并可安全读取。
     */
    public ensureSizeCorrect(): void {
        if (this._sizeDirty) {
            this._label.updateRenderData(true);
            this._sizeDirty = false;
        }
    }

    /**
     * 切换文本缓存模式，并同步 UBB 变色需要的颜色填充方式。
     * @param cacheMode 文本缓存模式。
     */
    public setXCacheMode(cacheMode: CacheMode): void {
        if (cacheMode === CacheMode.CHAR) {
            this.setLabelFillColorType(GTextField._FILL_COLOR_TYPE_VERTEX);
        } else {
            this.setLabelFillColorType(GTextField._FILL_COLOR_TYPE_COLOR);
        }
        if (this._label.cacheMode === cacheMode) {
            this.tryPatchLabelAssembler();
            if (this._ubbColorArr && this._ubbColorArr.length > 0) {
                this.scheduleUbbColorRefresh();
            }
            return;
        }
        if (cacheMode === CacheMode.NONE || cacheMode === CacheMode.BITMAP) {
            // 整段文本使用同一组顶点。
            this._label.cacheMode = CacheMode.NONE;
            this.assignFontColor(this._label, this._color);
        } else if (cacheMode === CacheMode.CHAR) {
            // 每个字符使用独立顶点。
            this._label.cacheMode = CacheMode.CHAR;
        }
        this.tryPatchLabelAssembler();
        if (this._ubbColorArr && this._ubbColorArr.length > 0) {
            this.scheduleUbbColorRefresh();
        }
    }

    /**
     * 设置底层 Label 的颜色填充模式。
     * @param value Cocos 颜色填充模式。
     */
    private setLabelFillColorType(value: number): void {
        const label = this._label as unknown as { setFillColorType: (value: number) => void };
        label.setFillColorType(value);
    }

    /**
     * 把 UBB 顶点色写入当前 Label。
     * @param comp 底层 Label 组件。
     */
    private static applyUbbColor(comp: Label): void {
        const label = comp as LabelWithUbbState;
        if (!label.$useUBB) return;
        const owner = label.$ubbOwner;
        const colorArr = label.$ubbColorArr;
        if (!owner || !colorArr || colorArr.length === 0) return;
        owner.setLabelFillColorType(GTextField._FILL_COLOR_TYPE_VERTEX);
        ExtendColor.gradientColorByChar(owner, colorArr);
    }

    /**
     * 清空 Label 上的 UBB 颜色状态。
     * @param label 底层 Label 组件。
     */
    private static clearUbbColorState(label: LabelWithUbbState): void {
        delete label.$ubbOwner;
        delete label.$ubbColorArr;
    }

    /**
     * 给当前 Label 组装器打补丁，保留 UBB 顶点色。
     */
    private tryPatchLabelAssembler(): void {
        const assembler: any = (this._label as any)?._assembler;
        if (!assembler) {
            if (this._ubbEnabled) this.scheduleTryPatchLabelAssembler();
            return;
        }
        let hasPatched = false;
        if (!assembler[GTextField._UBB_RENDER_DATA_PATCHED]) {
            const rawUpdateRenderData = assembler.updateRenderData;
            if (typeof rawUpdateRenderData === "function") {
                assembler.updateRenderData = function (comp: Label): void {
                    rawUpdateRenderData.call(this, comp);
                    GTextField.applyUbbColor(comp);
                };
                assembler[GTextField._UBB_RENDER_DATA_PATCHED] = true;
                hasPatched = true;
            }
        }
        if (assembler[GTextField._UBB_ASSEMBLER_PATCHED]) {
            if (hasPatched) this._ubbPatchRetryCount = 0;
            return;
        }
        const rawFillBuffers = assembler.fillBuffers;
        if (typeof rawFillBuffers !== "function") {
            if (!hasPatched && this._ubbEnabled) this.scheduleTryPatchLabelAssembler();
            return;
        }
        assembler.fillBuffers = function (comp: Label, renderer: any): void {
            rawFillBuffers.call(this, comp, renderer);
            GTextField.applyUbbColor(comp);
        };
        assembler[GTextField._UBB_ASSEMBLER_PATCHED] = true;
        this._ubbPatchRetryCount = 0;
    }

    /**
     * 安排下一帧重试 UBB 组装器补丁。
     */
    private scheduleTryPatchLabelAssembler(): void {
        if (this._ubbPatchRetryPending || this._ubbPatchRetryCount >= 3) return;
        this._ubbPatchRetryPending = true;
        this._ubbPatchRetryCount++;
        this._partner.callLater(() => {
            this._ubbPatchRetryPending = false;
            this.tryPatchLabelAssembler();
        });
    }

    /**
     * 安排下一帧重新写入 UBB 顶点色。
     */
    private scheduleUbbColorRefresh(): void {
        if (this._ubbColorRefreshPending) return;
        if (!this._ubbEnabled || !this._ubbColorArr || this._ubbColorArr.length === 0) return;
        if (this._label.cacheMode !== CacheMode.CHAR) return;
        this._ubbColorRefreshPending = true;
        this._partner.callLater(() => {
            this._ubbColorRefreshPending = false;
            this.refreshUbbColor();
        });
    }

    /**
     * 重新写入当前文本的 UBB 顶点色。
     */
    private refreshUbbColor(): void {
        if (!this._label || !this._ubbEnabled || !this._ubbColorArr || this._ubbColorArr.length === 0) return;
        if (this._label.cacheMode !== CacheMode.CHAR) return;

        this._ubbPatchRetryCount = 0;
        this.tryPatchLabelAssembler();
        this._label.updateRenderData(true);

        const renderData: any = (this._label as any).renderData;
        if (!renderData || !renderData.chunk || !renderData.data) {
            this.scheduleUbbColorRefresh();
            return;
        }

        ExtendColor.gradientColorByChar(this, this._ubbColorArr);
    }

    /**
     * 重新组织当前文本并同步到底层 Label 渲染组件。
     */
    protected updateText(): void {
        this.tryPatchLabelAssembler();
        ExtendColor.clearGradientMaterial(this);
        const label = this._label as LabelWithUbbState;
        if (this._ubbEnabled) {
            label.$useUBB = true;
        } else {
            delete label.$useUBB;
            GTextField.clearUbbColorState(label);
        }
        var text2: string = this._text;
        if (this._templateVars)
            text2 = this.parseTemplate(text2);
        this.assignFontColor(this._label, this.color);
        let colorArr: GradientColorInfoArr;
        if (this._ubbEnabled) {
            colorArr = [];
            text2 = defaultParser.parse(text2, true, colorArr);
            const noEmptyStr = text2.replace(/\n/g, "");
            if (colorArr.length === 1
                && typeof colorArr[0].color === "string"
                && colorArr[0].start === 0
                && colorArr[0].end === noEmptyStr.length
                && ExtendColor.applyGradientMaterial(this, colorArr[0].color as string)) {
                delete label.$useUBB;
                GTextField.clearUbbColorState(label);
                this._ubbColorArr = null;
                this._label.string = text2;
                if (this._autoSize == AutoSizeType.Both || this._autoSize == AutoSizeType.Height) {
                    this._sizeDirty = true;
                    this.ensureSizeCorrect();
                }
                return;
            }
            if (!Extend.isEmpty(colorArr)) {
                const baseColor = this._grayed ? ToolSet.toGrayedColor(this._color) : this._color;
                // Label 本体使用白色，实际文本色由顶点色写入。
                this.assignFontColor(this._label, Color.WHITE);
                this.setXCacheMode(CacheMode.CHAR);
                if (this._grayed) {
                    colorArr = [];
                }
                // 换行符不生成字符顶点。
                // 没有 UBB 颜色标签的片段使用文本默认颜色。
                colorArr.unshift({ color: baseColor, start: 0, end: noEmptyStr.length });
            } else {
                this.setXCacheMode(CacheMode.NONE);
            }
            this._ubbColorArr = !Extend.isEmpty(colorArr) ? colorArr : null;
        } else {
            this.setXCacheMode(CacheMode.NONE);
            this._ubbColorArr = null;
        }
        this._label.string = text2;
        if (this._autoSize == AutoSizeType.Both || this._autoSize == AutoSizeType.Height) {
            this._sizeDirty = true;
            this.ensureSizeCorrect();
        }
        if (!Extend.isEmpty(colorArr)) {
            label.$ubbOwner = this;
            label.$ubbColorArr = colorArr;
            this.refreshUbbColor();
        } else {
            GTextField.clearUbbColorState(label);
        }
    }

    /**
     * 把字体资源或字体名称应用到目标 Label。
     */
    protected assignFont(label: any, value: string | Font): void {
        if (value instanceof Font)
            label.font = value;
        else {
            let font = getFontByName(<string>value);
            if (!font) {
                label.fontFamily = <string>value;
                label.useSystemFont = true;
            }
            else
                label.font = font;
        }
    }

    /**
     * 把颜色值写入目标 Label 的字体颜色配置。
     */
    protected assignFontColor(label: any, value: Color): void {
        let font: any = label.font;
        if ((font instanceof BitmapFont) && !(font.fntConfig.canTint))
            value = Color.WHITE;

        if (this._grayed)
            value = ToolSet.toGrayedColor(value);
        label.color = value;
    }

    /**
     * 刷新当前文本使用的字体资源。
     */
    protected updateFont() {
        this.assignFont(this._label, this._realFont);
        this.scheduleUbbColorRefresh();
    }

    /**
     * 刷新当前文本颜色显示。
     */
    protected updateFontColor() {
        this.assignFontColor(this._label, this._color);
        this.scheduleUbbColorRefresh();
    }

    /**
     * 刷新当前文本描边颜色。
     */
    protected updateStrokeColor() {
        if (!this._label || !this._label.enableOutline)
            return;
        if (!this._strokeColor)
            this._strokeColor = new Color();
        if (this._grayed)
            this._label.outlineColor = ToolSet.toGrayedColor(this._strokeColor);
        else
            this._label.outlineColor = this._strokeColor;
    }

    /**
     * 刷新当前文本阴影颜色。
     */
    protected updateShadowColor() {
        if (!this._label || !this._label.enableShadow)
            return;
        if (!this._shadowColor)
            this._shadowColor = new Color();
        if (this._grayed)
            this._label.shadowColor = ToolSet.toGrayedColor(this._shadowColor);
        else
            this._label.shadowColor = this._shadowColor;
    }

    /**
     * 刷新当前文本字号与字号相关布局。
     */
    protected updateFontSize() {
        let font: any = this._label.font;
        if (font instanceof BitmapFont) {
            let fntConfig = font.fntConfig;
            if (fntConfig.resizable)
                this._label.fontSize = this._fontSize;
            else
                this._label.fontSize = fntConfig.fontSize;
            this._label.lineHeight = fntConfig.fontSize + (this._leading + 4) * fntConfig.fontSize / this._label.fontSize;
        }
        else {
            this._label.fontSize = this._fontSize;
            this._label.lineHeight = this._fontSize + this._leading;
        }
        this.scheduleUbbColorRefresh();
    }

    /**
     * 根据自动尺寸与溢出策略刷新文本容器表现。
     */
    protected updateOverflow() {
        if (this._autoSize == AutoSizeType.Both)
            this._label.overflow = Label.Overflow.NONE;
        else if (this._autoSize == AutoSizeType.Height) {
            this._label.overflow = Label.Overflow.RESIZE_HEIGHT;
            this._uiTrans.width = this._width;
        }
        else if (this._autoSize == AutoSizeType.Shrink) {
            this._label.overflow = Label.Overflow.SHRINK;
            this._uiTrans.setContentSize(this._width, this._height);
        }
        else {
            this._label.overflow = Label.Overflow.CLAMP;
            this._uiTrans.setContentSize(this._width, this._height);
        }
        this.scheduleUbbColorRefresh();
    }

    /**
     * 标记尺寸缓存已失效，等待后续统一刷新。
     */
    protected markSizeChanged(): void {
        if (this._underConstruct)
            return;

        if (this._autoSize == AutoSizeType.Both || this._autoSize == AutoSizeType.Height) {
            if (!this._sizeDirty) {
                this._node.emit(FUIEvent.SIZE_DELAY_CHANGE);
                this._sizeDirty = true;
            }
        }
    }

    /**
     * 响应底层 Label 尺寸回流，更新 FairyGUI 对象尺寸。
     */
    protected onLabelSizeChanged(): void {
        this._sizeDirty = false;

        if (this._underConstruct)
            return;

        if (this._autoSize == AutoSizeType.Both || this._autoSize == AutoSizeType.Height) {
            this._updatingSize = true;
            this.setSize(this._uiTrans.width, this._uiTrans.height);
            this._updatingSize = false;
        }
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        if (this._updatingSize)
            return;
        if (this._autoSize == AutoSizeType.None || this._autoSize == AutoSizeType.Shrink) {
            this._uiTrans.setContentSize(this._width, this._height);
        }
        else if (this._autoSize == AutoSizeType.Height)
            this._uiTrans.width = this._width;
        this.scheduleUbbColorRefresh();
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        this.updateFontColor();
        this.updateStrokeColor();
        this.scheduleUbbColorRefresh();
    }

    /**
     * 在透明度变化后重新写入 UBB 顶点色。
     */
    protected handleAlphaChanged(): void {
        this.scheduleUbbColorRefresh();
    }

    /**
     * 在可见状态变化后重新写入 UBB 顶点色。
     */
    public handleVisibleChanged(): void {
        super.handleVisibleChanged();
        this.scheduleUbbColorRefresh();
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值。
     */
    public getProp(index: number): any {
        switch (index) {
            case ObjectPropID.Color:
                return this.color;
            case ObjectPropID.OutlineColor:
                return this.strokeColor;
            case ObjectPropID.FontSize:
                return this.fontSize;
            default:
                return super.getProp(index);
        }
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
     * @param index FairyGUI 属性编号。
     * @param value 要写入的属性值。
     */
    public setProp(index: number, value: any): void {
        switch (index) {
            case ObjectPropID.Color:
                this.color = value;
                break;
            case ObjectPropID.OutlineColor:
                this.strokeColor = value;
                break;
            case ObjectPropID.FontSize:
                this.fontSize = value;
                break;
            default:
                super.setProp(index, value);
                break;
        }
    }

    /**
     * 获取文本对象当前的外部可见状态；这里覆写它是为了补挂尺寸刷新逻辑。
     */
    public get visible() {
        return super.visible;
    }

    /**
     * 设置外部可见状态，并重新计算最终显示结果。
     * @param value 是否可见。
     */
    public set visible(value: boolean) {
        // if(this.visible == value) return;
        if (this._scrollLabCom) this._scrollLabCom.visible = value;
        super.visible = value;
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 5);

        this.font = buffer.readS();
        this.fontSize = buffer.readShort();
        this.color = buffer.readColor();
        this.align = buffer.readByte();
        this.verticalAlign = buffer.readByte();
        this.leading = buffer.readShort();
        this.letterSpacing = buffer.readShort();
        this._ubbEnabled = buffer.readBool();
        this.autoSize = buffer.readByte();
        this.underline = buffer.readBool();
        this.italic = buffer.readBool();
        this.bold = buffer.readBool();
        this.singleLine = buffer.readBool();
        if (buffer.readBool()) {
            this.strokeColor = buffer.readColor();
            this.stroke = buffer.readFloat();
        }

        if (buffer.readBool()) {
            this.shadowColor = buffer.readColor();
            let f1 = buffer.readFloat();
            let f2 = buffer.readFloat();
            this.shadowOffset = new Vec2(f1, f2);
        }

        if (buffer.readBool())
            this._templateVars = {};
    }

    /**
     * 在对象加入父级后，继续读取扩展文本配置，例如初始文案、模板变量和滚动文本能力。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        buffer.seek(beginPos, 6);

        var str: string = buffer.readS();
        if (str != null) {
            this.text = str;
        }
        else {
            this.text = "";
        }
    }

    /** 设置为垂直滚动文本 */
    public setVerticalScrollText() {
        // 当前项目未提供 ScrollLabelCom 公共包，保持显式不可用。
        return;
    }
}

