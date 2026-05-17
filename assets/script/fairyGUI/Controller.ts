import { ControllerAction } from "./action/ControllerAction";
import { FEvent as FUIEvent } from "./event/Event";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

var _nextPageId: number = 0;

/**
 * 控制器，负责页面索引、页面名称与组件状态联动。
 */
export class Controller extends EventTarget {
    /**
     * 当前选中的索引。
     */
    private _selectedIndex: number;
    /**
     * 上一次选中的索引。
     */
    private _previousIndex: number;
    /**
     * 页面 ID 列表。
     */
    private _pageIds: Array<string>;
    /**
     * 页面名称列表。
     */
    private _pageNames: Array<string>;
    /**
     * 页签切换时需要执行的动作列表。
     */
    private _actions?: Array<ControllerAction>;

    /**
     * 资源名称。
     */
    public name: string;
    /**
     * 所属组件。
     */
    public parent: GComponent;
    /**
     * 是否自动调整单选组深度。
     */
    public autoRadioGroupDepth?: boolean;
    /**
     * 当前是否正处于切页回写过程中。
     */
    public changing?: boolean;

    /**
     * 初始化控制器页签列表、动作列表和默认索引。
     */
    public constructor() {
        super();
        this._pageIds = [];
        this._pageNames = [];
        this._selectedIndex = -1;
        this._previousIndex = -1;
    }

    /**
     * 清空控制器状态与动作列表，并解除事件派发器上的绑定引用。
     */
    public dispose(): void {

    }

    /**
     * 获取当前选中索引。
     */
    public get selectedIndex(): number {
        return this._selectedIndex;
    }

    /**
     * 设置当前选中索引，并同步选中态显示与控制器。
     * @param value 目标页面索引。
     */
    public set selectedIndex(value: number) {
        if (this._selectedIndex != value) {
            if (value > this._pageIds.length - 1)
                throw new Error("index out of bounds: " + value);

            this.changing = true;
            this._previousIndex = this._selectedIndex;
            this._selectedIndex = value;
            this.parent.applyController(this);

            this.emit(FUIEvent.STATUS_CHANGED, this);

            this.changing = false;
        }
    }

    public onChanged<TFunction extends (...any: any[]) => void>(callback: TFunction, thisArg?: any): void {
        this.on(FUIEvent.STATUS_CHANGED, callback, thisArg);
    }

    public offChanged<TFunction extends (...any: any[]) => void>(callback: TFunction, thisArg?: any): void {
        this.off(FUIEvent.STATUS_CHANGED, callback, thisArg);
    }

    //功能和设置selectedIndex一样，但不会触发事件
    public setSelectedIndex(value: number): void {
        if (this._selectedIndex != value) {
            if (value > this._pageIds.length - 1)
                throw new Error("index out of bounds: " + value);

            this.changing = true;
            this._previousIndex = this._selectedIndex;
            this._selectedIndex = value;
            this.parent.applyController(this);
            this.changing = false;
        }
    }

    /**
     * 获取上一次选中的页面索引；保留原始拼写仅为兼容旧调用代码。
     */
    public get previsousIndex(): number {
        return this._previousIndex;
    }

    /**
     * 获取当前选中页面。
     */
    public get selectedPage(): string {
        if (this._selectedIndex == -1)
            return null;
        else
            return this._pageNames[this._selectedIndex];
    }

    /**
     * 按页面名称切换当前页；内部会转换为索引后执行统一切页流程。
     * @param val 目标页面名称。
     */
    public set selectedPage(val: string) {
        var i: number = this._pageNames.indexOf(val);
        if (i == -1)
            i = 0;
        this.selectedIndex = i;
    }

    //功能和设置selectedPage一样，但不会触发事件
    public setSelectedPage(value: string): void {
        var i: number = this._pageNames.indexOf(value);
        if (i == -1)
            i = 0;
        this.setSelectedIndex(i);
    }

    /**
     * 获取上一次选中的页面名称。
     */
    public get previousPage(): string {
        if (this._previousIndex == -1)
            return null;
        else
            return this._pageNames[this._previousIndex];
    }

    /**
     * 获取当前页面数量。
     */
    public get pageCount(): number {
        return this._pageIds.length;
    }

    /**
     * 返回当前选中页对应的页面名称。
     */
    public getPageName(index: number): string {
        return this._pageNames[index];
    }

    /**
     * 向控制器末尾新增一个页面。
     * @param name 页面名称。
     */
    public addPage(name?: string): void {
        name = name || "";
        this.addPageAt(name, this._pageIds.length);
    }

    /**
     * 在指定索引插入一个新页面。
     * @param index 插入索引。
     * @param name 页面名称。
     */
    public addPageAt(name?: string, index?: number): void {
        name = name || "";
        var nid: string = "" + (_nextPageId++);
        if (index == null || index == this._pageIds.length) {
            this._pageIds.push(nid);
            this._pageNames.push(name);
        }
        else {
            this._pageIds.splice(index, 0, nid);
            this._pageNames.splice(index, 0, name);
        }
    }

    /**
     * 按页面名称移除一个页面。
     * @param name 要移除的页面名称。
     */
    public removePage(name: string): void {
        var i: number = this._pageNames.indexOf(name);
        if (i != -1) {
            this._pageIds.splice(i, 1);
            this._pageNames.splice(i, 1);
            if (this._selectedIndex >= this._pageIds.length)
                this.selectedIndex = this._selectedIndex - 1;
            else
                this.parent.applyController(this);
        }
    }

    /**
     * 按索引移除一个页面。
     * @param index 要移除的页面索引。
     */
    public removePageAt(index: number): void {
        this._pageIds.splice(index, 1);
        this._pageNames.splice(index, 1);
        if (this._selectedIndex >= this._pageIds.length)
            this.selectedIndex = this._selectedIndex - 1;
        else
            this.parent.applyController(this);
    }

    /**
     * 清空控制器当前维护的全部页面。
     */
    public clearPages(): void {
        this._pageIds.length = 0;
        this._pageNames.length = 0;
        if (this._selectedIndex != -1)
            this.selectedIndex = -1;
        else
            this.parent.applyController(this);
    }

    /**
     * 判断控制器是否包含指定页面名称。
     * @param aName 页面名称。
     * @returns 是否包含该页面。
     */
    public hasPage(aName: string): boolean {
        return this._pageNames.indexOf(aName) != -1;
    }

    /**
     * 根据页面 ID 查询页面索引。
     * @param aId 页面 ID。
     * @returns 对应页面索引；未命中时返回 `-1`。
     */
    public getPageIndexById(aId: string): number {
        return this._pageIds.indexOf(aId);
    }

    /**
     * 根据页面名称查询页面 ID。
     * @param aName 页面名称。
     * @returns 对应页面 ID；未命中时返回空值。
     */
    public getPageIdByName(aName: string): string | null {
        var i: number = this._pageNames.indexOf(aName);
        if (i != -1)
            return this._pageIds[i];
        else
            return null;
    }

    /**
     * 根据页面 ID 查询页面名称。
     * @param aId 页面 ID。
     * @returns 对应页面名称；未命中时返回空值。
     */
    public getPageNameById(aId: string): string | null {
        var i: number = this._pageIds.indexOf(aId);
        if (i != -1)
            return this._pageNames[i];
        else
            return null;
    }

    /**
     * 根据当前索引返回页面 ID。
     */
    public getPageId(index: number): string | null {
        return this._pageIds[index];
    }

    /**
     * 获取当前选中页面Id。
     */
    public get selectedPageId(): string | null {
        if (this._selectedIndex == -1)
            return null;
        else
            return this._pageIds[this._selectedIndex];
    }

    /**
     * 按页面 ID 切换当前页；内部会查到索引后执行统一切页流程。
     * @param val 目标页面 ID。
     */
    public set selectedPageId(val: string | null) {
        var i: number = this._pageIds.indexOf(val);
        this.selectedIndex = i;
    }

    /**
     * 切换到与指定页面 ID 相对的另一页；常用于开关式控制器。
     * @param obj 页面 ID。
     */
    public set oppositePageId(val: string | null) {
        var i: number = this._pageIds.indexOf(val);
        if (i > 0)
            this.selectedIndex = 0;
        else if (this._pageIds.length > 1)
            this.selectedIndex = 1;
    }

    /**
     * 获取上一次选中的页面 ID。
     */
    public get previousPageId(): string | null {
        if (this._previousIndex == -1)
            return null;
        else
            return this._pageIds[this._previousIndex];
    }

    /**
     * 执行控制器命中的联动动作集合。
     */
    public runActions(): void {
        if (this._actions) {
            var cnt: number = this._actions.length;
            for (var i: number = 0; i < cnt; i++) {
                this._actions[i].run(this, this.previousPageId, this.selectedPageId);
            }
        }
    }

    /**
     * 根据序列化数据初始化当前对象配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    public setup(buffer: ByteBuffer): void {
        var beginPos: number = buffer.position;
        buffer.seek(beginPos, 0);

        this.name = buffer.readS();
        if (buffer.readBool())
            this.autoRadioGroupDepth = true;

        buffer.seek(beginPos, 1);

        var i: number;
        var nextPos: number;
        var cnt: number = buffer.readShort();

        for (i = 0; i < cnt; i++) {
            this._pageIds.push(buffer.readS());
            this._pageNames.push(buffer.readS());
        }

        var homePageIndex: number = 0;
        if (buffer.version >= 2) {
            var homePageType: number = buffer.readByte();
            switch (homePageType) {
                case 1:
                    homePageIndex = buffer.readShort();
                    break;

                case 2:
                    homePageIndex = this._pageNames.indexOf(UIPackage.branch);
                    if (homePageIndex == -1)
                        homePageIndex = 0;
                    break;

                case 3:
                    homePageIndex = this._pageNames.indexOf(UIPackage.getVar(buffer.readS()));
                    if (homePageIndex == -1)
                        homePageIndex = 0;
                    break;
            }
        }

        buffer.seek(beginPos, 2);

        cnt = buffer.readShort();
        if (cnt > 0) {
            if (!this._actions)
                this._actions = new Array<ControllerAction>();

            for (i = 0; i < cnt; i++) {
                nextPos = buffer.readShort();
                nextPos += buffer.position;

                var action: ControllerAction = createAction(buffer.readByte());
                action.setup(buffer);
                this._actions.push(action);

                buffer.position = nextPos;
            }
        }

        if (this.parent && this._pageIds.length > 0)
            this._selectedIndex = homePageIndex;
        else
            this._selectedIndex = -1;
    }
}


import { PlayTransitionAction } from "./action/PlayTransitionAction"
import { ChangePageAction } from "./action/ChangePageAction"
import { EventTarget } from "cc";
import { GComponent } from "./GComponent";

function createAction(type: number): ControllerAction {
    switch (type) {
        case 0:
            return new PlayTransitionAction();

        case 1:
            return new ChangePageAction();
    }
    return null;
}
