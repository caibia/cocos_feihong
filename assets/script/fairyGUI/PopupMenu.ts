import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { RelationType, PopupDirection } from "./FieldTypes";
import { GButton } from "./GButton";
import { GComponent } from "./GComponent";
import { GList } from "./GList";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";

/**
 * 弹出菜单封装，负责菜单项构建、回调绑定与弹出位置控制。
 */
export class PopupMenu {

    /**
     * 菜单内容面板。
     */
    protected _contentPane: GComponent;
    /**
     * 菜单项列表对象。
     */
    protected _list: GList;

    /**
     * 初始化弹出菜单组件、内部列表和默认菜单项模板。
     * @param url 菜单资源地址。
     */
    public constructor(url?: string) {
        if (!url) {
            url = UIConfig.popupMenu;
            if (!url)
                throw new Error("UIConfig.popupMenu not defined");
        }
        this._contentPane = <GComponent>UIPackage.createObjectFromURL(url);
        this._contentPane.on(FUIEvent.DISPLAY, this.onDisplay, this);
        this._list = <GList>(this._contentPane.getChild("list"));
        this._list.removeChildrenToPool();
        this._list.addRelation(this._contentPane, RelationType.Width);
        this._list.removeRelation(this._contentPane, RelationType.Height);
        this._contentPane.addRelation(this._list, RelationType.Height);
        this._list.on(FUIEvent.CLICK_ITEM, this.onClickItem, this);
    }

    /**
     * 释放弹出菜单持有的组件引用和菜单项回调关系。
     */
    public dispose(): void {
        this._contentPane.dispose();
    }

    /**
     * 创建一个列表项并直接加入列表尾部。
     * @param caption 菜单项标题。
     * @param callback 点击回调。
     * @returns 新创建的菜单项按钮。
     */
    public addItem(caption: string, callback?: (item?: GObject, evt?: Event) => void): GButton {
        var item: GButton = <GButton>this._list.addItemFromPool();
        item.title = caption;
        item.data = callback;
        item.grayed = false;
        var c: Controller = item.getController("checked");
        if (c)
            c.selectedIndex = 0;
        return item;
    }

    /**
     * 在指定索引新增一个菜单项。
     * @param caption 菜单项标题。
     * @param index 插入索引。
     * @param callback 点击回调。
     * @returns 新创建的菜单项按钮。
     */
    public addItemAt(caption: string, index: number, callback?: (item?: GObject, evt?: Event) => void): GButton {
        var item: GButton = <GButton>this._list.getFromPool();
        this._list.addChildAt(item, index);
        item.title = caption;
        item.data = callback;
        item.grayed = false;
        var c: Controller = item.getController("checked");
        if (c)
            c.selectedIndex = 0;
        return item;
    }

    /**
     * 新增一个分隔项。
     */
    public addSeperator() {
        if (UIConfig.popupMenu_seperator == null)
            throw new Error("UIConfig.popupMenu_seperator not defined");
        this.list.addItemFromPool(UIConfig.popupMenu_seperator);
    }

    /**
     * 按索引获取菜单项名称。
     * @param index 菜单项索引。
     * @returns 菜单项名称。
     */
    public getItemName(index: number): string {
        var item: GObject = this._list.getChildAt(index);
        return item.name;
    }

    /**
     * 修改指定菜单项的标题文本。
     * @param name 菜单项名称。
     * @param caption 标题文本。
     */
    public setItemText(name: string, caption: string) {
        var item: GButton = <GButton>this._list.getChild(name);
        item.title = caption;
    }

    /**
     * 设置指定菜单项是否可见。
     * @param name 菜单项名称。
     * @param visible 是否可见。
     */
    public setItemVisible(name: string, visible: boolean) {
        var item: GButton = <GButton>this._list.getChild(name);
        if (item.visible != visible) {
            item.visible = visible;
            this._list.setBoundsChangedFlag();
        }
    }

    /**
     * 设置指定菜单项是否灰化。
     * @param name 菜单项名称。
     * @param grayed 是否灰化。
     */
    public setItemGrayed(name: string, grayed: boolean) {
        var item: GButton = <GButton>this._list.getChild(name);
        item.grayed = grayed;
    }

    /**
     * 设置指定菜单项是否允许勾选。
     * @param name 菜单项名称。
     * @param checkable 是否允许勾选。
     */
    public setItemCheckable(name: string, checkable: boolean) {
        var item: GButton = <GButton>this._list.getChild(name);
        var c: Controller = item.getController("checked");
        if (c) {
            if (checkable) {
                if (c.selectedIndex == 0)
                    c.selectedIndex = 1;
            }
            else
                c.selectedIndex = 0;
        }
    }

    /**
     * 设置指定菜单项的勾选状态。
     * @param name 菜单项名称。
     * @param checked 是否勾选。
     */
    public setItemChecked(name: string, checked: boolean) {
        var item: GButton = <GButton>this._list.getChild(name);
        var c: Controller = item.getController("checked");
        if (c)
            c.selectedIndex = checked ? 2 : 1;
    }

    /**
     * 判断指定菜单项当前是否处于勾选状态。
     * @param name 菜单项名称。
     * @returns 当前是否勾选。
     */
    public isItemChecked(name: string): boolean {
        var item: GButton = <GButton>this._list.getChild(name);
        var c: Controller = item.getController("checked");
        if (c)
            return c.selectedIndex == 2;
        else
            return false;
    }

    /**
     * 移除指定菜单项。
     * @param name 菜单项名称。
     * @returns 是否移除成功。
     */
    public removeItem(name: string): boolean {
        var item: GObject = this._list.getChild(name);
        if (item) {
            var index: number = this._list.getChildIndex(item);
            this._list.removeChildToPoolAt(index);
            return true;
        }
        else
            return false;
    }

    /**
     * 清空全部菜单项。
     */
    public clearItems() {
        this._list.removeChildrenToPool();
    }

    /**
     * 获取当前项数量。
     */
    public get itemCount(): number {
        return this._list.numChildren;
    }

    /**
     * 获取当前内容面板。
     */
    public get contentPane(): GComponent {
        return this._contentPane;
    }

    /**
     * 获取当前列表对象。
     */
    public get list(): GList {
        return this._list;
    }

    /**
     * 显示当前对象或界面内容。
     * @param target 可选目标对象。
     * @param dir 弹出方向策略。
     */
    public show(target?: GObject | null, dir?: PopupDirection | boolean) {
        GRoot.inst.showPopup(this.contentPane, (target instanceof GRoot) ? null : target, dir);
    }

    /**
     * 响应列表项点击事件，并驱动选择逻辑。
     * @param item 目标菜单项对象。
     * @param evt 点击事件对象。
     */
    private onClickItem(item: GObject, evt: FUIEvent): void {
        this._list._partner.callLater((dt: number) => {
            this.onClickItem2(item, evt);
        }, 0.1);
    }

    /**
     * 点击菜单项后执行对应回调，并按配置决定是否关闭弹窗。
     */
    private onClickItem2(item: GObject, evt: FUIEvent): void {
        if (!(item instanceof GButton))
            return;

        if (item.grayed) {
            this._list.selectedIndex = -1;
            return;
        }
        var c: Controller = item.getController("checked");
        if (c && c.selectedIndex != 0) {
            if (c.selectedIndex == 1)
                c.selectedIndex = 2;
            else
                c.selectedIndex = 1;
        }
        var r: GRoot = <GRoot>(this._contentPane.parent);
        r.hidePopup(this.contentPane);
        if (item.data instanceof Function)
            item.data(item, evt);
    }

    /**
     * 菜单显示到舞台后，重置 hover/选择等临时状态。
     */
    private onDisplay() {
        this._list.selectedIndex = -1;
        this._list.resizeToFit(100000, 10);
    }

}
