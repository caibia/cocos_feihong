import { Color } from "cc";
import ExtendColor, { GradientColorInfo, GradientColorInfoArr } from "../../base/extend/ExtendColor";

/**
 * UBB 解析器，负责把标签文本转换为富文本可识别的样式片段。
 */
export class UBBParser {
    /**
     * 当前待解析的原始文本。
     */
    private _text: string;
    /**
     * 当前解析读取游标位置。
     */
    private _readPos: number = 0;

    /**
     * 标签处理器映射表。
     */
    protected _handlers: { [index: string]: (tagName: string, end: boolean, attr: string) => string };

    /**
     * 最近一次解析到的颜色值。
     */
    public lastColor: string;
    /**
     * 最近一次解析到的字号值。
     */
    public lastSize: string;
    /**
     * 是否给链接输出下划线样式。
     */
    public linkUnderline: boolean;
    /**
     * 链接默认颜色。
     */
    public linkColor: string;

    /**
     * 初始化标签处理器映射表，并设置 UBB 解析器的默认输出策略。
     */
    public constructor() {
        this._handlers = {};
        this._handlers["url"] = this.onTag_URL;
        this._handlers["img"] = this.onTag_IMG;
        this._handlers["b"] = this.onTag_Simple;
        this._handlers["i"] = this.onTag_Simple;
        this._handlers["u"] = this.onTag_Simple;
        //this._handlers["sup"] = this.onTag_Simple;
        //this._handlers["sub"] = this.onTag_Simple;
        this._handlers["color"] = this.onTag_COLOR;
        //this._handlers["font"] = this.onTag_FONT;
        this._handlers["size"] = this.onTag_SIZE;
    }

    /**
     * 处理 `[url]` 标签，输出富文本可识别的链接片段。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_URL(tagName: string, end: boolean, attr: string): string {
        if (!end) {
            let ret: string;
            if (attr != null)
                ret = "<on click=\"onClickLink\" param=\"" + attr + "\">";
            else {
                var href: string = this.getTagText();
                ret = "<on click=\"onClickLink\" param=\"" + href + "\">";
            }
            if (this.linkUnderline)
                ret += "<u>";
            if (this.linkColor)
                ret += "<color=" + this.linkColor + ">";
            return ret;
        }
        else {
            let ret: string = "";
            if (this.linkColor)
                ret += "</color>";
            if (this.linkUnderline)
                ret += "</u>";
            ret += "</on>";
            return ret;
        }
    }

    /**
     * 处理 `[img]` 标签，输出图片占位富文本片段。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_IMG(tagName: string, end: boolean, attr: string): string {
        if (!end) {
            var src: string = this.getTagText(true);
            if (!src)
                return null;

            return "<img src=\"" + src + "\"/>";
        }
        else
            return null;
    }

    /**
     * 处理无额外参数的简单标签，如 `b`、`i`、`u` 等。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_Simple(tagName: string, end: boolean, attr: string): string {
        return end ? ("</" + tagName + ">") : ("<" + tagName + ">");
    }

    /**
     * 处理颜色标签，并维护解析器当前颜色栈状态。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_COLOR(tagName: string, end: boolean, attr: string): string {
        if (!end) {
            this.lastColor = attr;
            return "<color=" + attr + ">";
        }
        else
            return "</color>";
    }

    /**
     * 处理字体标签，并输出对应的字体样式片段。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_FONT(tagName: string, end: boolean, attr: string): string {
        if (!end)
            return "<font face=\"" + attr + "\">";
        else
            return "</font>";
    }

    /**
     * 处理字号标签，并记录当前字号上下文。
     * @param tagName 标签名。
     * @param end 是否为结束标签。
     * @param attr 标签属性值。
     * @returns 转换后的富文本片段。
     */
    protected onTag_SIZE(tagName: string, end: boolean, attr: string): string {
        if (!end) {
            this.lastSize = attr;
            return "<size=" + attr + ">";
        }
        else
            return "</size>";
    }

    /**
     * 读取当前标签后紧跟的文本内容。
     * @param remove 是否同步推进读取游标。
     * @returns 读取到的标签文本；未命中时返回空值。
     */
    protected getTagText(remove?: boolean): string {
        var pos1: number = this._readPos;
        var pos2: number;
        var result: string = "";
        while ((pos2 = this._text.indexOf("[", pos1)) != -1) {
            if (this._text.charCodeAt(pos2 - 1) == 92)//\
            {
                result += this._text.substring(pos1, pos2 - 1);
                result += "[";
                pos1 = pos2 + 1;
            }
            else {
                result += this._text.substring(pos1, pos2);
                break;
            }
        }
        if (pos2 == -1)
            return null;

        if (remove)
            this._readPos = pos2;

        return result;
    }

    /**
     * 解析输入内容并输出当前模块所需的结果。
     * @param text 待解析的 UBB 文本。
     * @param remove 是否移除原始标签，仅保留文本结果。
     * @param colorArr 可选渐变颜色信息数组。
     * @returns 转换后的富文本字符串。
     */
    public parse(text: string, remove?: boolean, colorArr?: GradientColorInfoArr): string {
        this._text = text;
        this.lastColor = null;
        this.lastSize = null;

        //pos1是左括号[的位置，pos2是右括号]的位置
        var pos1: number = 0, pos2: number, pos3: number;
        var end: boolean;
        var tag: string, attr: string;
        var repl: string;
        var func: Function;
        var result: string = "";
        var colorInfo: GradientColorInfo;
        //去掉\n换行符的字符串, 因为换行不占用字符
        var noEmptyStr: string;

        while ((pos2 = this._text.indexOf("[", pos1)) != -1) {
            if (pos2 > 0 && this._text.charCodeAt(pos2 - 1) == 92)//\
            {
                result += this._text.substring(pos1, pos2 - 1);
                result += "[";
                pos1 = pos2 + 1;
                continue;
            }

            result += this._text.substring(pos1, pos2);
            pos1 = pos2;
            pos2 = this._text.indexOf("]", pos1);
            if (pos2 == -1)
                break;

            end = this._text.charAt(pos1 + 1) == '/';
            tag = this._text.substring(end ? pos1 + 2 : pos1 + 1, pos2);
            this._readPos = pos2 + 1;
            attr = null;
            repl = null;
            pos3 = tag.indexOf("=");
            if (pos3 != -1) {
                attr = tag.substring(pos3 + 1);
                tag = tag.substring(0, pos3);
            }
            tag = tag.toLowerCase();
            func = this._handlers[tag];
            if (func != null) {
                repl = func.call(this, tag, end, attr);

                if (tag == "color" && colorArr) {
                    let color: Color | string;
                    //TODO：须把cc.Label.cacheMode设置为CACHE_MODE.CHAR才可以使用
                    if (!end) {
                        // console.log(attr);
                        if (attr[0] == "@") {
                            //"@"开头的表示渐变色，请参考GradientColor的定义
                            color = attr;
                        } else {
                            color = new Color().fromHEX(attr);
                        }
                        noEmptyStr = result.replace(/\n/g, "");
                        colorArr.push({ color: color, start: noEmptyStr.length, end: null });
                    } else {
                        for (let i = colorArr.length - 1; i >= 0; i--) {
                            colorInfo = colorArr[i];
                            if (colorInfo && colorInfo.end == null) {
                                noEmptyStr = result.replace(/\n/g, "");
                                colorInfo.end = noEmptyStr.length;
                                break;
                            }
                        }
                    }
                }

                if (repl != null && !remove)
                    result += repl;
            }
            else
                result += this._text.substring(pos1, this._readPos);
            pos1 = this._readPos;
        }

        if (pos1 < this._text.length)
            result += this._text.substring(pos1);

        this._text = null;

        return result;
    }
}

export var defaultParser: UBBParser = new UBBParser();
