import { Color, EditBox, HorizontalTextAlignment, Overflow, UITransform, VerticalTextAlignment } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { AutoSizeType } from "./FieldTypes";
import { GTextField } from "./GTextField";
import { ByteBuffer } from "./utils/ByteBuffer";
import { defaultParser } from "./utils/UBBParser";

/**
 * 输入框组件，在文本组件基础上扩展编辑、占位和输入约束能力。
 */
export class GTextInput extends GTextField {
    /**
     * 内部输入框组件。
     */
    public _editBox: EditBox;

    /**
     * 占位提示文本。
     */
    private _promptText: string;

    /**
     * 初始化输入框默认状态，并准备底层 `EditBox` 组件引用。
     */
    public constructor() {
        super();

        this._node.name = "GTextInput";
        this._touchDisabled = false;
        // this.createRenderer();
        if(!this._editBox)
            this._editBox = this["_editBox_meta_program"];
    }

    /**
     * 以下代码执行后，
     * 明明this._editBox已经创建了，
     * 但是到了constructor中，this._editBox就丢失为undefined了。。
     * this["_editBox_meta_program"]这样赋值却不会丢失
     * 
     * 原因是因为编译后的js代码，是在super()之后，才执行的this._editBox的定义，此时this._editBox就被覆盖为undefined了
     function GTextInput() {
          var _this;
          _this = _ref.call(this) || this;
          _defineProperty(_assertThisInitialized(_this), "_editBox", void 0);
          ...
     }
     * */
    protected createRenderer() {
        this._editBox = this._node.addComponent(MyEditBox);
        this["_editBox_meta_program"] = this._editBox;
        this._editBox.maxLength = -1;
        this._editBox["_updateTextLabel"]();

        this._node.on('text-changed', this.onTextChanged, this);
        this.on(FUIEvent.TOUCH_END, this.onTouchEnd1, this);

        this.autoSize = AutoSizeType.None;
    }

    /**
     * 设置可编辑状态，并同步到底层输入控件。
     * @param val 是否可编辑。
     */
    public set editable(val: boolean) {
        this._editBox.enabled = val;
    }

    /**
     * 获取当前输入框是否允许编辑。
     */
    public get editable(): boolean {
        return this._editBox.enabled;
    }

    /**
     * 设置输入框最大字符数；传入 `0` 时会退化为不限制长度。
     * @param val 最大字符数。
     */
    public set maxLength(val: number) {
        if (val == 0)
            val = -1;
        this._editBox.maxLength = val;
    }

    /**
     * 获取当前最大可输入字符数。
     */
    public get maxLength(): number {
        return this._editBox.maxLength;
    }

    /**
     * 设置占位提示文本，并同步占位 `Label` 的字体、颜色和字号。
     * @param val 占位提示文本。
     */
    public set promptText(val: string | null) {
        this._promptText = val;
        let newCreate: boolean = !this._editBox.placeholderLabel;
        this._editBox["_updatePlaceholderLabel"]();
        if (newCreate)
            this.assignFont(this._editBox.placeholderLabel, this._realFont);
        this._editBox.placeholderLabel.string = defaultParser.parse(this._promptText, true);

        if (defaultParser.lastColor) {
            let c = this._editBox.placeholderLabel.color;
            if (!c)
                c = new Color();
            c.fromHEX(defaultParser.lastColor);
            this.assignFontColor(this._editBox.placeholderLabel, c);
        }
        else
            this.assignFontColor(this._editBox.placeholderLabel, this._color);

        if (defaultParser.lastSize)
            this._editBox.placeholderLabel.fontSize = parseInt(defaultParser.lastSize);
        else
            this._editBox.placeholderLabel.fontSize = this._fontSize;
    }

    /**
     * 获取当前占位提示文本。
     */
    public get promptText(): string | null {
        return this._promptText;
    }

    /**
     * 设置输入限制表达式，并同步到底层输入控件。
     * @param value 输入限制表达式。
     */
    public set restrict(value: string | null) {
        //not supported
    }

    /**
     * 获取输入限制表达式。
     */
    public get restrict(): string | null {
        return "";
    }

    /**
     * 获取密码模式开关状态。
     */
    public get password(): boolean {
        return this._editBox.inputFlag == EditBox.InputFlag.PASSWORD;;
    }

    /**
     * 设置密码模式开关，并同步到底层输入控件。
     * @param val 是否启用密码模式。
     */
    public set password(val: boolean) {
        this._editBox.inputFlag = val ? EditBox.InputFlag.PASSWORD : EditBox.InputFlag.DEFAULT;
    }

    /**
     * 获取当前水平对齐方式。
     */
    public get align(): HorizontalTextAlignment {
        return this._editBox.textLabel.horizontalAlign;
    }

    /**
     * 设置水平对齐方式，并刷新排版或布局。
     * @param value 水平对齐方式。
     */
    public set align(value: HorizontalTextAlignment) {
        this._editBox.textLabel.horizontalAlign = value;
        if (this._editBox.placeholderLabel) {
            this._editBox.placeholderLabel.horizontalAlign = value;
        }
    }

    /**
     * 获取当前垂直对齐方式。
     */
    public get verticalAlign(): VerticalTextAlignment {
        return this._editBox.textLabel.verticalAlign;
    }

    /**
     * 设置垂直对齐方式，并刷新排版或布局。
     * @param value 垂直对齐方式。
     */
    public set verticalAlign(value: VerticalTextAlignment) {
        this._editBox.textLabel.verticalAlign = value;
        if (this._editBox.placeholderLabel) {
            this._editBox.placeholderLabel.verticalAlign = value;
        }
    }

    /**
     * 获取当前是否按单行模式排版。
     */
    public get singleLine(): boolean {
        return this._editBox.inputMode != EditBox.InputMode.ANY;
    }

    /**
     * 设置单行模式开关，并同步到底层 `Label` 的换行策略。
     * @param value 是否启用单行模式。
     */
    public set singleLine(value: boolean) {
        this._editBox.inputMode = value ? EditBox.InputMode.SINGLE_LINE : EditBox.InputMode.ANY;
    }

    /**
     * 请求将输入焦点切换到当前对象。
     */
    public requestFocus(): void {
        this._editBox.focus();
    }

    /**
     * 标记尺寸缓存已失效，等待后续统一刷新。
     */
    protected markSizeChanged(): void {
        //不支持自动大小，所以这里空
    }

    /**
     * 重新组织当前文本并同步到底层 Label 渲染组件。
     * @returns 最终文本会直接写回底层输入框组件。
     */
    protected updateText(): void {
        var text2: string = this._text;

        if (this._templateVars)
            text2 = this.parseTemplate(text2);

        if (this._ubbEnabled) //不支持同一个文本不同样式
            text2 = defaultParser.parse(text2, true);

        this._editBox.string = text2;
    }

    /**
     * 刷新当前文本使用的字体资源。
     */
    protected updateFont() {
        this.assignFont(this._editBox.textLabel, this._realFont);
        if (this._editBox.placeholderLabel)
            this.assignFont(this._editBox.placeholderLabel, this._realFont);
    }

    /**
     * 刷新当前文本颜色显示。
     */
    protected updateFontColor() {
        this.assignFontColor(this._editBox.textLabel, this._color);
    }

    /**
     * 刷新当前文本字号与字号相关布局。
     */
    protected updateFontSize() {
        this._editBox.textLabel.fontSize = this._fontSize;
        this._editBox.textLabel.lineHeight = this._fontSize + this._leading;
        if (this._editBox.placeholderLabel)
            this._editBox.placeholderLabel.fontSize = this._editBox.textLabel.fontSize;
    }

    /**
     * 根据自动尺寸与溢出策略刷新文本容器表现。
     */
    protected updateOverflow() {
        //not supported
    }

    /**
     * 底层输入文本变化时，把最新字符串同步回 `GTextField._text`。
     */
    private onTextChanged() {
        this._text = this._editBox.string;
    }

    /**
     * 触摸结束时主动拉起键盘，并阻止事件继续向上冒泡。
     * @param evt 触摸结束事件对象。
     */
    private onTouchEnd1(evt: FUIEvent) {
        (<MyEditBox>this._editBox).openKeyboard();
        evt.propagationStopped = true
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 4);

        var str: string = buffer.readS();
        if (str != null)
            this.promptText = str;
        else if (this._editBox.placeholderLabel)
            this._editBox.placeholderLabel.string = "";

        str = buffer.readS();
        if (str != null)
            this.restrict = str;

        var iv: number = buffer.readInt();
        if (iv != 0)
            this.maxLength = iv;
        iv = buffer.readInt();
        if (iv != 0) {//keyboardType
        }
        if (buffer.readBool())
            this.password = true;

        //同步一下对齐方式

        if (this._editBox.placeholderLabel) {
            let hAlign = this._editBox.textLabel.horizontalAlign;
            this._editBox.placeholderLabel.horizontalAlign = hAlign;

            let vAlign = this._editBox.textLabel.verticalAlign;
            this._editBox.placeholderLabel.verticalAlign = vAlign;
        }
    }
}

class MyEditBox extends EditBox {
    /**
     * 初始化输入框内部标签的锚点和溢出模式，使其与 FairyGUI 文本坐标系一致。
     */
    protected _init(): void {
        super._init();

        this.placeholderLabel.getComponent(UITransform).setAnchorPoint(0, 1);
        this.textLabel.getComponent(UITransform).setAnchorPoint(0, 1);
        this.placeholderLabel.overflow = Overflow.CLAMP;
        this.textLabel.overflow = Overflow.CLAMP;
    }

    /**
     * 屏蔽引擎默认事件注册，交由 FairyGUI 自己接管输入事件。
     */
    protected _registerEvent() {
        //取消掉原来的事件处理
    }

    /**
     * 主动拉起系统键盘，进入编辑状态。
     */
    public openKeyboard() {
        let impl = this["_impl"];
        if (impl) {
            impl.beginEditing();
        }
    }
}
