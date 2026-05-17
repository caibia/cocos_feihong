import { AudioClip, Color } from "cc";
import { ObjectPropID } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { GTextField } from "./GTextField";
import { GTextInput } from "./GTextInput";
import { PackageItem } from "./PackageItem";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";
import { FEvent as FUIEvent } from "./event/Event";

/**
 * 标签组件，组合标题文本与图标子对象，并兼容输入框式交互。
 */
export class GLabel extends GComponent {
    /**
     * 内部标题显示对象。
     */
    protected _titleObject: GObject;
    /**
     * 内部图标显示对象。
     */
    protected _iconObject: GObject;
    /**
     * 点击音效资源地址。
     */
    private _sound: string;
    /**
     * 点击音效音量缩放倍率。
     */
    private _soundVolumeScale: number;

    /**
     * 初始化标签默认状态，并等待扩展构造阶段绑定标题和图标子对象。
     */
    public constructor() {
        super();

        this._node.name = "GLabel";
    }

    /**
     * 获取当前图标资源标识。
     */
    public get icon(): string | null {
        if (this._iconObject)
            return this._iconObject.icon;
    }

    /**
     * 设置图标资源标识，并同步到实际图标承载对象。
     * @param value 图标资源标识。
     */
    public set icon(value: string | null) {
        if (this._iconObject)
            this._iconObject.icon = value;
        this.updateGear(7);
    }

    /**
     * 获取当前标题文本。
     */
    public get title(): string | null {
        if (this._titleObject)
            return this._titleObject.text;
        else
            return null;
    }

    /**
     * 设置标题文本，并同步到标题承载对象。
     * @param value 标题文本。
     */
    public set title(value: string | null) {
        if (this._titleObject)
            this._titleObject.text = value;
        this.updateGear(6);
    }

    /**
     * 以通用文本接口返回当前标题文本。
     */
    public get text(): string | null {
        return this.title;
    }

    /**
     * 以通用文本接口设置标题文本；内部会直接转发到 `title`。
     * @param value 标题文本。
     */
    public set text(value: string | null) {
        this.title = value;
    }

    /**
     * 获取当前标题颜色。
     */
    public get titleColor(): Color {
        var tf: GTextField = this.getTextField();
        if (tf)
            return tf.color;
        else
            return Color.WHITE;
    }

    /**
     * 设置标题颜色，并写回内部文本对象。
     * @param value 标题颜色。
     */
    public set titleColor(value: Color) {
        var tf: GTextField = this.getTextField();
        if (tf)
            tf.color = value;
        this.updateGear(4);
    }

    /**
     * 获取当前标题字号。
     */
    public get titleFontSize(): number {
        var tf: GTextField = this.getTextField();
        if (tf)
            return tf.fontSize;
        else
            return 0;
    }

    /**
     * 设置标题字号，并写回内部文本对象。
     * @param value 标题字号。
     */
    public set titleFontSize(value: number) {
        var tf: GTextField = this.getTextField();
        if (tf)
            tf.fontSize = value;
    }

    /**
     * 设置可编辑状态，并同步到底层输入控件。
     * @param value 是否可编辑。
     */
    public set editable(val: boolean) {
        if (this._titleObject && (this._titleObject instanceof GTextInput))
            this._titleObject.editable = val;
    }

    /**
     * 获取当前是否可编辑。
     */
    public get editable(): boolean {
        if (this._titleObject && (this._titleObject instanceof GTextInput))
            return this._titleObject.editable;
        else
            return false;
    }

    /**
     * 获取内部实际承载文本显示的文本对象。
     */
    public getTextField(): GTextField {
        if (this._titleObject instanceof GTextField)
            return this._titleObject;
        else if ('getTextField' in this._titleObject)
            return (<any>this._titleObject).getTextField();
        else
            return null;
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值。
     */
    public getProp(index: number): any {
        switch (index) {
            case ObjectPropID.Color:
                return this.titleColor;
            case ObjectPropID.OutlineColor:
                {
                    var tf: GTextField = this.getTextField();
                    if (tf)
                        return tf.strokeColor;
                    else
                        return 0;
                }
            case ObjectPropID.FontSize:
                return this.titleFontSize;
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
                this.titleColor = value;
                break;
            case ObjectPropID.OutlineColor:
                {
                    var tf: GTextField = this.getTextField();
                    if (tf)
                        tf.strokeColor = value;
                }
                break;
            case ObjectPropID.FontSize:
                this.titleFontSize = value;
                break;
            default:
                super.setProp(index, value);
                break;
        }
    }

    /**
     * 从扩展数据中读取组件特有配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected constructExtension(buffer: ByteBuffer): void {
        this._titleObject = this.getChild("title");
        this._iconObject = this.getChild("icon");
    }

    /**
     * 在对象加入父级后，继续补充依赖父级、控制器或运行时环境的配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        if (!buffer.seek(beginPos, 6))
            return;

        if (buffer.readByte() != this.packageItem.objectType)
            return;

        var str: string;
        str = buffer.readS();
        if (str != null)
            this.title = str;
        str = buffer.readS();
        if (str != null)
            this.icon = str;
        if (buffer.readBool())
            this.titleColor = buffer.readColor();
        var iv: number = buffer.readInt();
        if (iv != 0)
            this.titleFontSize = iv;

        if (buffer.readBool()) {
            var input: GTextField = this.getTextField();
            if (input instanceof GTextInput) {
                str = buffer.readS();
                if (str != null)
                    input.promptText = str;

                str = buffer.readS();
                if (str != null)
                    input.restrict = str;

                iv = buffer.readInt();
                if (iv != 0)
                    input.maxLength = iv;
                iv = buffer.readInt();
                if (iv != 0) {
                    //keyboardType
                }
                if (buffer.readBool())
                    input.password = true;
            }
            else
                buffer.skip(13);
        }
        str = buffer.readS();
        if (str != null) {
            this._sound = str;
            if (buffer.readBool()){
                this._soundVolumeScale = buffer.readFloat();
            }
            this._node.on(FUIEvent.CLICK, this.onClick_1, this);
        }

    }

    /**
     * 处理点击后的状态切换、弹窗联动与音效播放。
     */
    private onClick_1():void{
        if(this._sound){
            var pi: PackageItem = UIPackage.getItemByURL(this._sound);
            if (pi) {
                var sound: AudioClip = <AudioClip>pi.owner.getItemAsset(pi);
                if (sound)
                    GRoot.inst.playOneShotSound(sound, this._soundVolumeScale);
            }
        }
    }
}
