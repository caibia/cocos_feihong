import { AudioClip, Color, EventMouse } from "cc";
import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { ButtonMode, ObjectPropID } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { GTextField } from "./GTextField";
import { PackageItem } from "./PackageItem";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";
import { Window } from "./Window";

/**
 * 按钮组件，负责标题、图标、交互状态机、选中态与点击联动逻辑。
 */
export class GButton extends GComponent {
    /**
     * 承载按钮标题的显示对象；通常是 `GTextField` 或 `GLabel`。
     */
    protected _titleObject: GObject;
    /**
     * 承载按钮图标的显示对象；通常是 `GLoader` 或 `GImage`。
     */
    protected _iconObject: GObject;

    /**
     * 当前按钮交互模式。
     */
    private _mode: ButtonMode;
    /**
     * 选中开关。
     */
    private _selected: boolean;
    /**
     * 默认标题文本。
     */
    private _title: string;
    /**
     * 选中态标题文本。
     */
    private _selectedTitle: string;
    /**
     * 默认图标资源标识。
     */
    private _icon: string;
    /**
     * 选中态图标资源标识。
     */
    private _selectedIcon: string;
    /**
     * 点击音效资源地址。
     */
    private _sound: string;
    /**
     * 点击音效音量缩放倍率。
     */
    private _soundVolumeScale: number;
    /**
     * 按钮状态控制器。
     */
    private _buttonController: Controller;
    /**
     * 关联控制器。
     */
    private _relatedController?: Controller;
    /**
     * 关联控制器的目标页面 ID。
     */
    private _relatedPageId: string;
    /**
     * 点击时是否自动切换按钮状态。
     */
    private _changeStateOnClick: boolean;
    /**
     * 与按钮联动的弹窗对象。
     */
    private _linkedPopup?: GObject;
    /**
     * 按下反馈效果类型。
     */
    private _downEffect: number;
    /**
     * 按下反馈效果参数值。
     */
    private _downEffectValue: number;
    /**
     * 按下态颜色。
     */
    private _downColor?: Color;
    /**
     * 是否处于按下缩放状态。
     */
    private _downScaled?: boolean;
    /**
     * 当前是否处于按下状态。
     */
    private _down: boolean;
    /**
     * 当前是否处于悬停状态。
     */
    private _over: boolean;

    /**
     * 静态按钮普通态页签名。
     */
    public static UP: string = "up";
    /**
     * 静态按钮按下态页签名。
     */
    public static DOWN: string = "down";
    /**
     * 静态按钮悬停态页签名。
     */
    public static OVER: string = "over";
    /**
     * 静态按钮选中悬停态页签名。
     */
    public static SELECTED_OVER: string = "selectedOver";
    /**
     * 静态按钮禁用态页签名。
     */
    public static DISABLED: string = "disabled";
    /**
     * 静态按钮选中禁用态页签名。
     */
    public static SELECTED_DISABLED: string = "selectedDisabled";

    /**
     * 初始化按钮默认状态、点击音效配置和按下反馈参数。
     */
    public constructor() {
        super();

        this._node.name = "GButton";
        this._mode = ButtonMode.Common;
        this._title = "";
        this._icon = "";
        this._sound = UIConfig.buttonSound;
        this._soundVolumeScale = UIConfig.buttonSoundVolumeScale;
        this._changeStateOnClick = true;
        this._downEffect = 0;
        this._downEffectValue = 0.8;
    }

    /**
     * 获取当前图标资源标识。
     */
    public get icon(): string | null {
        return this._icon;
    }

    /**
     * 设置图标资源标识，并同步到实际图标承载对象。
     * @param value 图标资源标识。
     */
    public set icon(value: string | null) {
        this._icon = value;
        value = (this._selected && this._selectedIcon) ? this._selectedIcon : this._icon;
        if (this._iconObject)
            this._iconObject.icon = value;
        this.updateGear(7);
    }

    /**
     * 获取当前选中态图标资源标识。
     */
    public get selectedIcon(): string | null {
        return this._selectedIcon;
    }

    /**
     * 设置选中态图标资源标识，并在已选中时立即刷新显示。
     * @param value 选中态图标资源标识。
     */
    public set selectedIcon(value: string | null) {
        this._selectedIcon = value;
        value = (this._selected && this._selectedIcon) ? this._selectedIcon : this._icon;
        if (this._iconObject)
            this._iconObject.icon = value;
    }

    /**
     * 获取当前标题文本。
     */
    public get title(): string | null {
        return this._title;
    }

    /**
     * 设置标题文本，并同步到标题承载对象。
     * @param value 标题文本。
     */
    public set title(value: string | null) {
        this._title = value;
        if (this._titleObject)
            this._titleObject.text = (this._selected && this._selectedTitle) ? this._selectedTitle : this._title;
        this.updateGear(6);
    }

    /**
     * 以通用文本接口返回按钮标题。
     */
    public get text(): string | null {
        return this.title;
    }

    /**
     * 以通用文本接口设置按钮标题；内部会直接转发到 `title`。
     * @param value 标题文本。
     */
    public set text(value: string | null) {
        this.title = value;
    }

    /**
     * 获取当前选中态标题文本。
     */
    public get selectedTitle(): string | null {
        return this._selectedTitle;
    }

    /**
     * 设置选中态标题文本，并在已选中时立即刷新显示。
     * @param value 选中态标题文本。
     */
    public set selectedTitle(value: string | null) {
        this._selectedTitle = value;
        if (this._titleObject)
            this._titleObject.text = (this._selected && this._selectedTitle) ? this._selectedTitle : this._title;
    }

    /**
     * 获取当前标题颜色。
     */
    public get titleColor(): Color {
        var tf: GTextField = this.getTextField();
        if (tf)
            return tf.color;
        else
            return Color.BLACK;
    }

    /**
     * 设置标题颜色，并写回内部文本对象。
     * @param value 标题颜色。
     */
    public set titleColor(value: Color) {
        var tf: GTextField = this.getTextField();
        if (tf)
            tf.color = value;
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
     * 获取当前点击音效资源地址。
     */
    public get sound(): string | null {
        return this._sound;
    }

    /**
     * 设置点击音效资源地址。
     * @param value 点击音效资源地址。
     */
    public set sound(val: string | null) {
        this._sound = val;
    }

    /**
     * 获取当前点击音效音量缩放。
     */
    public get soundVolumeScale(): number {
        return this._soundVolumeScale;
    }

    /**
     * 设置点击音效音量缩放。
     * @param value 点击音效音量缩放倍率。
     */
    public set soundVolumeScale(value: number) {
        this._soundVolumeScale = value;
    }

    /**
     * 设置选中状态，并刷新按钮视觉状态和关联控制器。
     * @param value 是否选中。
     */
    public set selected(val: boolean) {
        if (this._mode == ButtonMode.Common)
            return;

        if (this._selected != val) {
            this._selected = val;
            this.setCurrentState();
            if (this._selectedTitle && this._titleObject)
                this._titleObject.text = this._selected ? this._selectedTitle : this._title;
            if (this._selectedIcon) {
                var str: string = this._selected ? this._selectedIcon : this._icon;
                if (this._iconObject)
                    this._iconObject.icon = str;
            }
            if (this._relatedController
                && this._parent
                && !this._parent._buildingDisplayList) {
                if (this._selected) {
                    this._relatedController.selectedPageId = this._relatedPageId;
                    if (this._relatedController.autoRadioGroupDepth)
                        this._parent.adjustRadioGroupDepth(this, this._relatedController);
                }
                else if (this._mode == ButtonMode.Check && this._relatedController.selectedPageId == this._relatedPageId)
                    this._relatedController.oppositePageId = this._relatedPageId;
            }
        }
    }

    /**
     * 获取当前选中状态。
     */
    public get selected(): boolean {
        return this._selected;
    }

    /**
     * 获取当前按钮模式。
     */
    public get mode(): ButtonMode {
        return this._mode;
    }

    /**
     * 设置按钮模式，并决定后续点击如何维护选中态。
     * @param value 按钮模式枚举值。
     */
    public set mode(value: ButtonMode) {
        if (this._mode != value) {
            if (value == ButtonMode.Common)
                this.selected = false;
            this._mode = value;
        }
    }

    /**
     * 获取当前关联控制器。
     */
    public get relatedController(): Controller {
        return this._relatedController;
    }

    /**
     * 设置关联控制器，用于按钮选中态与页面联动。
     * @param value 关联控制器。
     */
    public set relatedController(val: Controller) {
        this._relatedController = val;
    }

    /**
     * 获取与按钮选中态联动的目标页面 ID。
     */
    public get relatedPageId(): string | null {
        return this._relatedPageId;
    }

    /**
     * 设置关联页面 ID，用于控制器切换时回写选中态。
     * @param value 关联页面 ID。
     */
    public set relatedPageId(val: string | null) {
        this._relatedPageId = val;
    }

    /**
     * 获取点击时是否切换按钮状态。
     */
    public get changeStateOnClick(): boolean {
        return this._changeStateOnClick;
    }

    /**
     * 设置点击时是否自动切换按钮视觉状态。
     * @param value 是否自动切换按钮视觉状态。
     */
    public set changeStateOnClick(value: boolean) {
        this._changeStateOnClick = value;
    }

    /**
     * 获取点击按钮时需要联动显示或切换的弹窗对象。
     */
    public get linkedPopup(): GObject {
        return this._linkedPopup;
    }

    /**
     * 设置点击按钮时需要联动的弹窗对象。
     * @param value 联动弹窗对象。
     */
    public set linkedPopup(value: GObject) {
        this._linkedPopup = value;
    }

    /**
     * 获取内部实际承载文本显示的文本对象。
     */
    public getTextField(): GTextField {
        if (!this._titleObject)
            return null;

        if (this._titleObject instanceof GTextField)
            return this._titleObject;
        else if ("getTextField" in this._titleObject)
            return (<any>this._titleObject).getTextField();
        else
            return null;
    }

    /**
     * 主动触发一次点击逻辑，复用按钮的完整事件链路。
     */
    public fireClick(): void {
        GRoot.inst.inputProcessor.simulateClick(this);
    }

    /**
     * 切换内部状态页签，并同步按钮的视觉反馈。
     * @param val 目标状态页签名。
     */
    protected setState(val: string): void {
        if (this._buttonController)
            this._buttonController.selectedPage = val;

        if (this._downEffect == 1) {
            var cnt: number = this.numChildren;
            if (val == GButton.DOWN || val == GButton.SELECTED_OVER || val == GButton.SELECTED_DISABLED) {

                if (!this._downColor)
                    this._downColor = new Color();
                var r: number = this._downEffectValue * 255;
                this._downColor.r = this._downColor.g = this._downColor.b = r;
                for (var i: number = 0; i < cnt; i++) {
                    var obj: GObject = this.getChildAt(i);
                    if (!(obj instanceof GTextField))
                        obj.setProp(ObjectPropID.Color, this._downColor);
                }
            }
            else {
                for (var i: number = 0; i < cnt; i++) {
                    var obj: GObject = this.getChildAt(i);
                    if (!(obj instanceof GTextField))
                        obj.setProp(ObjectPropID.Color, Color.WHITE);
                }
            }
        }
        else if (this._downEffect == 2) {
            if (val == GButton.DOWN || val == GButton.SELECTED_OVER || val == GButton.SELECTED_DISABLED) {
                if (!this._downScaled) {
                    this._downScaled = true;
                    this.setScale(this.scaleX * this._downEffectValue, this.scaleY * this._downEffectValue);
                }
            }
            else {
                if (this._downScaled) {
                    this._downScaled = false;
                    this.setScale(this.scaleX / this._downEffectValue, this.scaleY / this._downEffectValue);
                }
            }
        }
    }

    /**
     * 根据交互态和选中态推导当前应显示的状态页签。
     */
    protected setCurrentState() {
        if (this.grayed && this._buttonController && this._buttonController.hasPage(GButton.DISABLED)) {
            if (this._selected)
                this.setState(GButton.SELECTED_DISABLED);
            else
                this.setState(GButton.DISABLED);
        }
        else {
            if (this._selected)
                this.setState(this._over ? GButton.SELECTED_OVER : GButton.DOWN);
            else
                this.setState(this._over ? GButton.OVER : GButton.UP);
        }
    }

    /**
     * 响应控制器页签变化，刷新当前对象的联动状态。
     * @param c 当前变化的控制器。
     */
    public handleControllerChanged(c: Controller): void {
        super.handleControllerChanged(c);

        if (this._relatedController == c)
            this.selected = this._relatedPageId == c.selectedPageId;
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        if (this._buttonController && this._buttonController.hasPage(GButton.DISABLED)) {
            if (this.grayed) {
                if (this._selected && this._buttonController.hasPage(GButton.SELECTED_DISABLED))
                    this.setState(GButton.SELECTED_DISABLED);
                else
                    this.setState(GButton.DISABLED);
            }
            else if (this._selected)
                this.setState(GButton.DOWN);
            else
                this.setState(GButton.UP);
        }
        else
            super.handleGrayedChanged();
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
            case ObjectPropID.Selected:
                return this.selected;
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
            case ObjectPropID.Selected:
                this.selected = value;
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
        buffer.seek(0, 6);

        this._mode = buffer.readByte();
        var str: string = buffer.readS();
        if (str)
            this._sound = str;
        this._soundVolumeScale = buffer.readFloat();
        this._downEffect = buffer.readByte();
        this._downEffectValue = buffer.readFloat();
        if (this._downEffect == 2)
            this.setPivot(0.5, 0.5, this.pivotAsAnchor);

        this._buttonController = this.getController("button");
        this._titleObject = this.getChild("title");
        this._iconObject = this.getChild("icon");
        if (this._titleObject)
            this._title = this._titleObject.text;
        if (this._iconObject)
            this._icon = this._iconObject.icon;

        if (this._mode == ButtonMode.Common)
            this.setState(GButton.UP);

        this._node.on(FUIEvent.TOUCH_BEGIN, this.onTouchBegin_1, this);
        this._node.on(FUIEvent.TOUCH_END, this.onTouchEnd_1, this);
        this._node.on(FUIEvent.ROLL_OVER, this.onRollOver_1, this);
        this._node.on(FUIEvent.ROLL_OUT, this.onRollOut_1, this);
        this._node.on(FUIEvent.CLICK, this.onClick_1, this);
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
        var iv: number;

        str = buffer.readS();
        if (str != null)
            this.title = str;
        str = buffer.readS();
        if (str != null)
            this.selectedTitle = str;
        str = buffer.readS();
        if (str != null)
            this.icon = str;
        str = buffer.readS();
        if (str != null)
            this.selectedIcon = str;
        if (buffer.readBool())
            this.titleColor = buffer.readColor();
        iv = buffer.readInt();
        if (iv != 0)
            this.titleFontSize = iv;
        iv = buffer.readShort();
        if (iv >= 0)
            this._relatedController = this.parent.getControllerAt(iv);
        this._relatedPageId = buffer.readS();

        str = buffer.readS();
        if (str != null)
            this._sound = str;
        if (buffer.readBool())
            this._soundVolumeScale = buffer.readFloat();

        this.selected = buffer.readBool();
    }

    /**
     * 响应鼠标移入事件，刷新悬停态表现。
     */
    private onRollOver_1(): void {
        if (!this._buttonController || !this._buttonController.hasPage(GButton.OVER))
            return;

        this._over = true;
        if (this._down)
            return;

        if (this.grayed && this._buttonController.hasPage(GButton.DISABLED))
            return;

        this.setState(this._selected ? GButton.SELECTED_OVER : GButton.OVER);
    }

    /**
     * 响应鼠标移出事件，恢复常规显示状态。
     */
    private onRollOut_1(): void {
        if (!this._buttonController || !this._buttonController.hasPage(GButton.OVER))
            return;

        this._over = false;
        if (this._down)
            return;

        if (this.grayed && this._buttonController.hasPage(GButton.DISABLED))
            return;

        this.setState(this._selected ? GButton.DOWN : GButton.UP);
    }

    /**
     * 响应按下事件，记录按压状态并准备点击流程。
     * @param evt 触摸开始事件对象。
     */
    private onTouchBegin_1(evt: FUIEvent): void {
        if (evt.button != EventMouse.BUTTON_LEFT)
            return;

        this._down = true;
        evt.captureTouch();

        if (this._mode == ButtonMode.Common) {
            if (this.grayed && this._buttonController && this._buttonController.hasPage(GButton.DISABLED))
                this.setState(GButton.SELECTED_DISABLED);
            else
                this.setState(GButton.DOWN);
        }

        // if (this._linkedPopup) {
        //     if (this._linkedPopup instanceof Window)
        //         this._linkedPopup.toggleStatus();
        //     else
        //         GRoot.inst.togglePopup(this._linkedPopup, this);
        // }
    }

    /**
     * 响应抬起事件，恢复按钮视觉状态并完成点击判定。
     * @param evt 触摸结束事件对象。
     */
    private onTouchEnd_1(evt: FUIEvent): void {
        if (evt.button != EventMouse.BUTTON_LEFT)
            return;

        if (this._down) {
            this._down = false;

            if (this._node == null)
                return;

            if (this._mode == ButtonMode.Common) {
                if (this.grayed && this._buttonController && this._buttonController.hasPage(GButton.DISABLED))
                    this.setState(GButton.DISABLED);
                else if (this._over)
                    this.setState(GButton.OVER);
                else
                    this.setState(GButton.UP);
            }
            else {
                if (!this._over
                    && this._buttonController != null
                    && (this._buttonController.selectedPage == GButton.OVER
                        || this._buttonController.selectedPage == GButton.SELECTED_OVER)) {
                    this.setCurrentState();
                }
            }
        }
    }

    /**
     * 处理点击后的状态切换、弹窗联动与音效播放。
     */
    private onClick_1(): void {
        if (this._sound) {
            var pi: PackageItem = UIPackage.getItemByURL(this._sound);
            if (pi) {
                var sound: AudioClip = <AudioClip>pi.owner.getItemAsset(pi);
                if (sound)
                    GRoot.inst.playOneShotSound(sound, this._soundVolumeScale);
            }
        }

        if (this._mode == ButtonMode.Check) {
            if (this._changeStateOnClick) {
                this.selected = !this._selected;
                this._node.emit(FUIEvent.STATUS_CHANGED, this);
            }
        }
        else if (this._mode == ButtonMode.Radio) {
            if (this._changeStateOnClick && !this._selected) {
                this.selected = true;
                this._node.emit(FUIEvent.STATUS_CHANGED, this);
            }
        }
        else {
            if (this._relatedController)
                this._relatedController.selectedPageId = this._relatedPageId;
        }
    }

}
