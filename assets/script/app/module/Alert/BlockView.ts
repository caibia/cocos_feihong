/**
*Author  : XW
*Desc    : 
*/

import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import Extend from "../../../base/extend/Extend";
import XComponent, { UIADAPT_TYPE } from "../../../base/ui/XComponent";

export class BlockView extends XComponent {
    /**原因 */
    public reason: string;
    public overTime: number;
    public overTimeCallBack: () => void;

    public onCreate(): void {
        super.onCreate();
        this.uiAdaptType = UIADAPT_TYPE.None;
        this.block();
        this.setBlockCallback(this.onClickBg.bind(this));
    }

    /**
     * @param arg.reason 使用Block的原因
     * @param arg.alpha 用于调整背景黑幕的透明度，默认是0
     * @param arg.overTime 超时时间，超时后，BlockView会自动移除，并调用overTimeCallback
     * @param arg.overTimeCallback 超时回调
     */
    public onRefresh(arg?: IUIArg.IBlockViewArg): void {
        super.onRefresh(arg);
        //禁止同时调用2次同名的BlockView
        Extend.assert(this.reason == null);
        Extend.assert(arg && arg.reason);
        this.reason = arg.reason;
        if (arg.alpha != null) {
            this.block(arg.alpha)
        }
        this.overTime = arg.overTime || 30 * 1000;
        this.overTimeCallBack = arg.overTimeCallback;
        if (this.overTime) {
            this.timerUnit.setTimeout(() => {
                if (this.overTimeCallBack) {
                    let tmp = this.overTimeCallBack;
                    this.overTimeCallBack = null;
                    tmp && tmp();
                }
                this.destroyWithAni();
            }, this.overTime);
        }
    }

    public onClickBg() {
        XDEBUGLOG.warn(this.reason + " Block...........");
    }

    public clearByCache(): void {
        this.reason = null
        super.clearByCache();
    }

    public dispose() {
        super.dispose();
    }
}
