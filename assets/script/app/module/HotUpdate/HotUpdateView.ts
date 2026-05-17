import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import { HOT_UPDATE_DEFAULT_CONFIG } from "../../../base/define/HotUpdateDefine";
import HotUpdateMgr from "../../../base/manager/HotUpdateMgr";
import { UIADAPT_TYPE } from "../../../base/ui/XComponent";
import { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import IHotUpdateView from "./Interfaces/IHotUpdateView";

export default class HotUpdateView extends IHotUpdateView {
    private _isUpdating = false;

    public getFairyPackageArr(): string[] {
        return ["HotUpdate"];
    }

    public onCreate() {
        super.onCreate();
        this.openAniStyle = OPEN_ANIMSTYLE.NONE;
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
    }

    public onRefresh(arg?: any) {
        super.onRefresh(arg);
        this.labTip.text = "Checking update...";
        this.setProgress(0);
        this.runHotUpdate();
    }

    private async runHotUpdate() {
        if (this._isUpdating) return;
        this._isUpdating = true;
        try {
            const ret = await HotUpdateMgr.inst.startHotUpdate(HOT_UPDATE_DEFAULT_CONFIG, (progress) => {
                this.setProgress(progress.percent);
                this.labTip.text = progress.message || "Downloading update files...";
            });
            XDEBUGLOG.debug("HotUpdateResult(HotUpdateView)", ret);
            if (ret.updated) {
                this.labTip.text = "Update finished. Restarting...";
                HotUpdateMgr.inst.applyUpdateAndRestart(200);
            } else {
                this.labTip.text = "Update failed. Please restart and retry.";
            }
        } finally {
            this._isUpdating = false;
        }
    }

    private setProgress(percent: number): void {
        const p = Math.max(0, Math.min(1, percent || 0));
        this.loadingBar.max = 100;
        this.loadingBar.value = p * 100;
        this.labBar.text = `${(p * 100).toFixed(2)}%`;
    }
}

