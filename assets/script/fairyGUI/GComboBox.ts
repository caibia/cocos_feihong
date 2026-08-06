import { Color, EventMouse } from "cc";
import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { PopupDirection, ObjectPropID, RelationType } from "./FieldTypes";
import { GButton } from "./GButton";
import { GComponent } from "./GComponent";
import { GList } from "./GList";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { GTextField } from "./GTextField";
import { GTextInput } from "./GTextInput";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 下拉框组件，负责选项列表展开、选中结果同步与按钮表现整合。
 */
export class GComboBox extends GComponent {
    /**
     * 实际弹出的下拉面板组件；里面通常包含一个 `GList` 作为选项列表。
     */
    public dropdown: GComponent;

    /**
     * 显示当前选中文案的标题对象。
     */
    protected _titleObject: GObject;
    /**
     * 显示当前选中图标的图标对象。
     */
    protected _iconObject: GObject;
    /**
     * 下拉面板内真正承载选项的列表对象。
     */
    protected _list: GList;

    /**
     * 下拉选项显示文本数组。
     */
    private _items: Array<string>;
    /**
     * 下拉选项对应的值数组。
     */
    private _values: Array<string>;
    /**
     * 下拉选项图标资源数组。
     */
    private _icons?: Array<string>;

    /**
     * 下拉面板最多可见项数量。
     */
    private _visibleItemCount: number = 0;
    /**
     * 选项列表是否需要刷新。
     */
    private _itemsUpdated: boolean;
    /**
     * 当前选中的索引。
     */
    private _selectedIndex: number = 0;
    /**
     * 下拉按钮状态控制器。
     */
    private _buttonController: Controller;
    /**
     * 下拉面板弹出方向策略。
     */
    private _popupDirection: number = PopupDirection.Auto;
    /**
     * 选中项联动控制器。
     */
    private _selectionController: Controller;

    /**
     * 当前是否处于悬停状态。
     */
    private _over: boolean;
    /**
     * 当前是否处于按下状态。
     */
    private _down: boolean;

    /**
     * 初始化下拉框默认可见项数量、选项缓存和选中状态。
     */
    public constructor() {
        super();

        this._node.name = "GComboBox";
        this._visibleItemCount = UIConfig.defaultComboBoxVisibleItemCount;
        this._itemsUpdated = true;
        this._selectedIndex = -1;
        this._items = [];
        this._values = [];
    }

    /**
     * 获取下拉框当前显示的标题文本。
     */
    public get text(): string | null {
        if (this._titleObject)
            return this._titleObject.text;
        else
            return null;
    }

    /**
     * 直接设置当前显示文本；通常只影响标题显示，不会反向修改选中值。
     * @param value 要显示的标题文本。
     */
    public set text(value: string | null) {
        if (this._titleObject)
            this._titleObject.text = value;
        this.updateGear(6);
    }

    /**
     * 获取当前图标资源标识。
     */
    public get icon(): string | null {
        if (this._iconObject)
            return this._iconObject.icon;
        else
            return null;
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
     * 获取下拉框可见项数量上限。
     */
    public get visibleItemCount(): number {
        return this._visibleItemCount;
    }

    /**
     * 设置下拉框最多可见项数量。
     * @param value 最多可见项数量。
     */
    public set visibleItemCount(value: number) {
        this._visibleItemCount = value;
    }

    /**
     * 获取下拉框弹出方向策略。
     */
    public get popupDirection(): PopupDirection {
        return this._popupDirection;
    }

    /**
     * 设置下拉面板弹出方向策略。
     * @param value 弹出方向策略。
     */
    public set popupDirection(value: PopupDirection) {
        this._popupDirection = value;
    }

    /**
     * 获取选项文本列表。
     */
    public get items(): Array<string> {
        return this._items;
    }

    /**
     * 设置选项文本列表，并标记下拉数据需要重建。
     * @param value 选项文本数组。
     */
    public set items(value: Array<string>) {
        if (!value)
            this._items.length = 0;
        else
            this._items = value.concat();
        if (this._items.length > 0) {
            if (this._selectedIndex >= this._items.length)
                this._selectedIndex = this._items.length - 1;
            else if (this._selectedIndex == -1)
                this._selectedIndex = 0;

            this.text = this._items[this._selectedIndex];
            if (this._icons && this._selectedIndex < this._icons.length)
                this.icon = this._icons[this._selectedIndex];
        }
        else {
            this.text = "";
            if (this._icons)
                this.icon = null;
            this._selectedIndex = -1;
        }
        this._itemsUpdated = true;
    }

    /**
     * 获取选项图标列表。
     */
    public get icons(): Array<string> {
        return this._icons;
    }

    /**
     * 设置选项图标列表，并标记下拉数据需要重建。
     * @param value 选项图标资源数组。
     */
    public set icons(value: Array<string>) {
        this._icons = value;
        if (this._icons && this._selectedIndex != -1 && this._selectedIndex < this._icons.length)
            this.icon = this._icons[this._selectedIndex];
    }

    /**
     * 获取选项值列表。
     */
    public get values(): Array<string> {
        return this._values;
    }

    /**
     * 设置选项值列表，并标记下拉数据需要重建。
     * @param value 选项值数组。
     */
    public set values(value: Array<string>) {
        if (!value)
            this._values.length = 0;
        else
            this._values = value.concat();
    }

    /**
     * 获取当前选中的选项索引。
     */
    public get selectedIndex(): number {
        return this._selectedIndex;
    }

    /**
     * 设置当前选中索引，并同步选中态显示与控制器。
     * @param val 目标选中索引。
     */
    public set selectedIndex(val: number) {
        if (this._selectedIndex == val)
            return;

        this._selectedIndex = val;
        if (this._selectedIndex >= 0 && this._selectedIndex < this._items.length) {
            this.text = this._items[this._selectedIndex];
            if (this._icons && this._selectedIndex < this._icons.length)
                this.icon = this._icons[this._selectedIndex];
        }
        else {
            this.text = "";
            if (this._icons)
                this.icon = null;
        }

        this.updateSelectionController();
    }

    /**
     * 获取当前值。
     */
    public get value(): string | null {
        return this._values[this._selectedIndex];
    }

    /**
     * 设置当前值，并立即刷新对应显示状态。
     * @param val 目标选项值。
     */
    public set value(val: string | null) {
        var index: number = this._values.indexOf(val);
        if (index == -1 && val == null)
            index = this._values.indexOf("");
        this.selectedIndex = index;
    }

    /**
     * 获取当前选择控制器。
     */
    public get selectionController(): Controller {
        return this._selectionController;
    }

    /**
     * 设置选择控制器；选中项变化时会把结果同步回该控制器。
     * @param value 选择控制器。
     */
    public set selectionController(value: Controller) {
        this._selectionController = value;
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
     * 切换内部状态页签，并同步按钮的视觉反馈。
     */
    protected setState(val: string): void {
        if (this._buttonController)
            this._buttonController.selectedPage = val;
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
                {
                    tf = this.getTextField();
                    if (tf)
                        return tf.fontSize;
                    else
                        return 0;
                }
            default:
                return super.getProp(index);
        }
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
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
                {
                    tf = this.getTextField();
                    if (tf)
                        tf.fontSize = value;
                }
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
        var str: string;

        this._buttonController = this.getController("button");
        this._titleObject = this.getChild("title");
        this._iconObject = this.getChild("icon");

        str = buffer.readS();
        if (str) {
            let obj = UIPackage.createObjectFromURL(str);
            if (!(obj instanceof GComponent)) {
                console.error("下拉框必须为元件");
                return;
            }
            this.dropdown = obj;
            this.dropdown.name = "this.dropdown";
            this._list = this.dropdown.getChild("list", GList);
            if (this._list == null) {
                console.error(this.resourceURL + ": 下拉框的弹出元件里必须包含名为list的列表");
                return;
            }
            this._list.on(FUIEvent.CLICK_ITEM, this.onClickItem, this);

            this._list.addRelation(this.dropdown, RelationType.Width);
            this._list.removeRelation(this.dropdown, RelationType.Height);

            this.dropdown.addRelation(this._list, RelationType.Height);
            this.dropdown.removeRelation(this._list, RelationType.Width);

            this.dropdown.on(FUIEvent.UNDISPLAY, this.onPopupClosed, this);
        }

        this._node.on(FUIEvent.TOUCH_BEGIN, this.onTouchBegin_1, this);
        this._node.on(FUIEvent.TOUCH_END, this.onTouchEnd_1, this);
        this._node.on(FUIEvent.ROLL_OVER, this.onRollOver_1, this);
        this._node.on(FUIEvent.ROLL_OUT, this.onRollOut_1, this);
    }

    /**
     * 响应控制器页签变化，刷新当前对象的联动状态。
     * @param c 当前变化的控制器。
     */
    public handleControllerChanged(c: Controller): void {
        super.handleControllerChanged(c);

        if (this._selectionController == c)
            this.selectedIndex = c.selectedIndex;
    }

    /**
     * 把当前选中项同步回关联的选择控制器。
     */
    private updateSelectionController(): void {
        if (this._selectionController && !this._selectionController.changing
            && this._selectedIndex < this._selectionController.pageCount) {
            var c: Controller = this._selectionController;
            this._selectionController = null;
            c.selectedIndex = this._selectedIndex;
            this._selectionController = c;
        }
    }

    /**
     * 释放下拉面板监听、列表引用和组合框运行时状态。
     */
    public dispose(): void {
        if (this.dropdown) {
            this.dropdown.dispose();
            this.dropdown = null;
        }

        super.dispose();
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

        var i: number;
        var iv: number;
        var nextPos: number;
        var str: string;
        var itemCount: number = buffer.readShort();
        for (i = 0; i < itemCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            this._items[i] = buffer.readS();
            this._values[i] = buffer.readS();
            str = buffer.readS();
            if (str != null) {
                if (this._icons == null)
                    this._icons = new Array<string>();
                this._icons[i] = str;
            }

            buffer.position = nextPos;
        }

        str = buffer.readS();
        if (str != null) {
            this.text = str;
            this._selectedIndex = this._items.indexOf(str);
        }
        else if (this._items.length > 0) {
            this._selectedIndex = 0;
            this.text = this._items[0];
        }
        else
            this._selectedIndex = -1;

        str = buffer.readS();
        if (str != null)
            this.icon = str;

        if (buffer.readBool())
            this.titleColor = buffer.readColor();
        iv = buffer.readInt();
        if (iv > 0)
            this._visibleItemCount = iv;
        this._popupDirection = buffer.readByte();

        iv = buffer.readShort();
        if (iv >= 0)
            this._selectionController = this.parent.getControllerAt(iv);
    }

    /**
     * 显示下拉面板，并同步选中项和弹出位置。
     */
    protected showDropdown(): void {
        if (this._itemsUpdated) {
            this._itemsUpdated = false;

            this._list.removeChildrenToPool();
            let cnt: number = this._items.length;
            for (let i: number = 0; i < cnt; i++) {
                let item: GObject = this._list.addItemFromPool();
                item.name = i < this._values.length ? this._values[i] : "";
                item.text = this._items[i];
                item.icon = (this._icons && i < this._icons.length) ? this._icons[i] : null;
            }
            this._list.resizeToFit(this._visibleItemCount);
        }
        this._list.selectedIndex = -1;
        this.dropdown.width = this.width;
        this._list.ensureBoundsCorrect();

        GRoot.inst.togglePopup(this.dropdown, this, this._popupDirection);
        if (this.dropdown.parent)
            this.setState(GButton.DOWN);
    }

    /**
     * 下拉面板关闭后恢复按钮视觉状态并清理按下标记。
     */
    private onPopupClosed(): void {
        if (this._over)
            this.setState(GButton.OVER);
        else
            this.setState(GButton.UP);
    }

    /**
     * 响应列表项点击事件，并驱动选择逻辑。
     */
    private onClickItem(itemObject: GObject): void {
        let _t = this;
        let index = this._list.getChildIndex(itemObject);
        this._partner.callLater((dt: number) => {
            _t.onClickItem2(index);
        }, 0.1);
    }

    /**
     * 点击下拉项后更新选中索引、文本图标显示并关闭弹窗。
     */
    private onClickItem2(index: number): void {
        if (this.dropdown.parent instanceof GRoot)
            this.dropdown.parent.hidePopup();

        this._selectedIndex = -1;
        this.selectedIndex = index;
        this._node.emit(FUIEvent.STATUS_CHANGED, this);
    }

    /**
     * 响应鼠标移入事件，刷新悬停态表现。
     */
    private onRollOver_1(): void {
        this._over = true;
        if (this._down || this.dropdown && this.dropdown.parent)
            return;

        this.setState(GButton.OVER);
    }

    /**
     * 响应鼠标移出事件，恢复常规显示状态。
     */
    private onRollOut_1(): void {
        this._over = false;
        if (this._down || this.dropdown && this.dropdown.parent)
            return;

        this.setState(GButton.UP);
    }

    /**
     * 响应按下事件，记录按压状态并准备点击流程。
     */
    private onTouchBegin_1(evt: FUIEvent): void {
        if (evt.button != EventMouse.BUTTON_LEFT)
            return;

        if ((evt.initiator instanceof GTextInput) && evt.initiator.editable)
            return;

        this._down = true;
        evt.captureTouch();

        if (this.dropdown)
            this.showDropdown();
    }

    /**
     * 响应抬起事件，恢复按钮视觉状态并完成点击判定。
     */
    private onTouchEnd_1(evt: FUIEvent): void {
        if (evt.button != EventMouse.BUTTON_LEFT)
            return;

        if (this._down) {
            this._down = false;

            if (this.dropdown && !this.dropdown.parent) {
                if (this._over)
                    this.setState(GButton.OVER);
                else
                    this.setState(GButton.UP);
            }
        }
    }
}
