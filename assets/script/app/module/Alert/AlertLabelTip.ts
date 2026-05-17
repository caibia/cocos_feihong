
/**
*Author  : XW
*Desc    : 
*/

import { view } from "cc";
import LanguageMgr from "../../../base/manager/LanguageMgr";
import NodePoolMgr from "../../../base/manager/NodePoolMgr";
import IAlertLabelTip from "../0Common/Interfaces/IAlertLabelTip";

export default class AlertLabelTip extends IAlertLabelTip {

    private startY: number;

    public onCreate() {
        super.onCreate();
        this.initComponentByView(this);
        this.startY = 180;
    }

    public onRefresh(arg: IUIArg.ILoginViewArg) {
        super.onRefresh(arg);
        let id: string | number = arg.id;
        let text: string = "";
        if (arg.debugTxt) {
            text = arg.debugTxt;
        } else {
            let params: any[] = arg.params;
            text = LanguageMgr.get(id, params);
        }
        this.labDesc.text = text;
        // this.loaderBg.width = this.labDesc.width * 1.6;
        this.alpha = 1;
        this.y = this.startY;
        this.x = (view.getVisibleSize().width - this.width) * 0.5;
        this.tweenUnit.getTween(this)
            .to(0.25, { y: this.startY - 80 })
            .delay(0.6)
            .to(0.2, { y: this.startY - 160, alpha: 0 })
            .call(() => {
                NodePoolMgr.inst.put(this);
            }).start();
    }

}