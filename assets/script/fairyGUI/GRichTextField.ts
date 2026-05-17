
import { BitmapFont, HorizontalTextAlignment, RichText, SpriteAtlas, SpriteFrame } from "cc";
import { PackageItemType, AutoSizeType } from "./FieldTypes";
import { GTextField } from "./GTextField";
import { PackageItem } from "./PackageItem";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { defaultParser } from "./utils/UBBParser";
import { ToolSet } from "./utils/ToolSet";

/**
 * RichTextImageAtlas 类型封装，负责当前模块对应的 UI 状态、数据或行为管理。
 */
export class RichTextImageAtlas extends SpriteAtlas {

    /**
     * 获取Sprite Frame。
     */
    public getSpriteFrame(key: string): SpriteFrame {
        let pi: PackageItem = UIPackage.getItemByURL(key);
        if (pi) {
            pi.load();
            if (pi.type == PackageItemType.Image)
                return <SpriteFrame>pi.asset;
            else if (pi.type == PackageItemType.MovieClip)
                return pi.frames[0].texture;
        }

        return super.getSpriteFrame(key);
    }
}

const imageAtlas: RichTextImageAtlas = new RichTextImageAtlas();

/**
 * 富文本组件，在文本基础上扩展图片、样式标签与富文本解析能力。
 */
export class GRichTextField extends GTextField {
    /**
     * 底层富文本渲染组件。
     */
    public _richText: RichText;

    /**
     * 是否启用粗体。
     */
    private _bold: boolean;
    /**
     * 是否启用斜体。
     */
    private _italics: boolean;
    /**
     * 是否启用下划线。
     */
    private _underline: boolean;

    /**
     * 链接下划线开关。
     */
    public linkUnderline: boolean;
    /**
     * 链接颜色。
     */
    public linkColor: string;

    /**
     * 初始化富文本解析器、图片图集和富文本专用显示状态。
     */
    public constructor() {
        super();

        this._node.name = "GRichTextField";
        this._touchDisabled = false;
        this.linkUnderline = UIConfig.linkUnderline;

        if(!this._richText)
            this._richText = this["$_richtextMeta"];
    }

     /**
     * 以下代码执行后，
     * 明明this._richText已经创建了，
     * 但是到了constructor中，this._richText就丢失为undefined了。。
     * this["$_richtextMeta"]这样赋值却不会丢失
     * 有点莫名其妙
     * */
    protected createRenderer() {
        this._richText = this._node.addComponent(RichText);
        this["$_richtextMeta"] = this._richText;
        this._richText.handleTouchEvent = false;
        this.autoSize = AutoSizeType.None;
        this._richText.imageAtlas = imageAtlas;
    }

    /**
     * 获取当前水平对齐方式。
     */
    public get align(): HorizontalTextAlignment {
        return this._richText.horizontalAlign;
    }

    /**
     * 设置水平对齐方式，并刷新排版或布局。
     * @param value 水平对齐方式。
     */
    public set align(value: HorizontalTextAlignment) {
        this._richText.horizontalAlign = value;
    }

    /**
     * 获取下划线开关状态。
     */
    public get underline(): boolean {
        return this._underline;
    }

    /**
     * 设置下划线开关，并同步到底层 `Label`。
     * @param value 是否启用下划线。
     */
    public set underline(value: boolean) {
        if (this._underline != value) {
            this._underline = value;

            this.updateText();
        }
    }

    /**
     * 获取粗体开关状态。
     */
    public get bold(): boolean {
        return this._bold;
    }

    /**
     * 设置粗体开关，并同步到底层 `Label`。
     * @param value 是否启用粗体。
     */
    public set bold(value: boolean) {
        if (this._bold != value) {
            this._bold = value;

            this.updateText();
        }
    }

    /**
     * 获取斜体开关状态。
     */
    public get italic(): boolean {
        return this._italics;
    }

    /**
     * 设置斜体开关，并同步到底层 `Label`。
     * @param value 是否启用斜体。
     */
    public set italic(value: boolean) {
        if (this._italics != value) {
            this._italics = value;

            this.updateText();
        }
    }

    /**
     * 标记尺寸缓存已失效，等待后续统一刷新。
     */
    protected markSizeChanged(): void {
        //RichText貌似没有延迟重建文本，所以这里不需要
    }

    /**
     * 重新组织当前文本并同步到底层 Label 渲染组件。
     */
    protected updateText(): void {
        var text2: string = this._text;

        if (this._templateVars)
            text2 = this.parseTemplate(text2);

        if (this._ubbEnabled) {
            defaultParser.linkUnderline = this.linkUnderline;
            defaultParser.linkColor = this.linkColor;

            text2 = defaultParser.parse(text2);
        }

        if (this._bold)
            text2 = "<b>" + text2 + "</b>";
        if (this._italics)
            text2 = "<i>" + text2 + "</i>";
        if (this._underline)
            text2 = "<u>" + text2 + "</u>";
        let c = this._color
        if (this._grayed)
            c = ToolSet.toGrayedColor(c);
        text2 = "<color=" + c.toHEX("#rrggbb") + ">" + text2 + "</color>";

        if (this._autoSize == AutoSizeType.Both) {
            if (this._richText.maxWidth != 0)
                this._richText["_maxWidth"] = 0;
            this._richText.string = text2;
            if (this.maxWidth != 0 && this._uiTrans.contentSize.width > this.maxWidth)
                this._richText.maxWidth = this.maxWidth;
        }
        else
            this._richText.string = text2;
    }

    /**
     * 刷新当前文本使用的字体资源。
     */
    protected updateFont() {
        this.assignFont(this._richText, this._realFont);
    }

    /**
     * 刷新当前文本颜色显示。
     */
    protected updateFontColor() {
        this.assignFontColor(this._richText, this._color);
    }

    /**
     * 刷新当前文本字号与字号相关布局。
     */
    protected updateFontSize() {
        let fontSize: number = this._fontSize;
        let font: any = this._richText.font;
        if (font instanceof BitmapFont) {
            if (!font.fntConfig.resizable)
                fontSize = font.fntConfig.fontSize;
        }

        this._richText.fontSize = fontSize;
        this._richText.lineHeight = fontSize + this._leading * 2;
    }

    /**
     * 根据自动尺寸与溢出策略刷新文本容器表现。
     */
    protected updateOverflow() {
        if (this._autoSize == AutoSizeType.Both)
            this._richText.maxWidth = 0;
        else
            this._richText.maxWidth = this._width;
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        if (this._updatingSize)
            return;

        if (this._autoSize != AutoSizeType.Both)
            this._richText.maxWidth = this._width;
    }

    /**
     * 释放富文本图片缓存、链接监听和父类文本资源。
     */
    public dispose(){
        this["$_richtextMeta"] = undefined;
        super.dispose();
    }
}
