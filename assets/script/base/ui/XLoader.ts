/**
*Author  : XW
*Desc    : Loader 扩展组件，负责加载外部资源并处理释放逻辑
*/

import { SpriteFrame } from "cc";
import { GLoader } from "../../fairyGUI/GLoader";
import ResMgr from "../manager/ResMgr";
import { XResourcesUrl } from "../define/XResourcesUrl";


export default class XLoader extends GLoader {
    /** 最新需要显示的资源路径 */
    public lastUrl: string;

    /**
     * 释放外部纹理引用；当前项目按需自行实现。
     * @param texture 目标纹理帧。
     */
    protected freeExternal(texture: SpriteFrame): void {
        //GLoader不会释放用url设置的external的图片，如果在dispose时需要释放资源，需要在这里自己写。
    }

    /**
     * 加载外部的资源，可能用不到 因为每个界面都有自己的依赖包，暂时没想把特效单独放在fgui包外面。
     * @param url:例子："ui://zz_mainUi_effect/effect1" 
     * @param succFn 加载成功回调。
     */
    public async loadByUrl(url: string, succFn?: Function) {
        let pos2 = url.lastIndexOf("/");
        let pkgName = url.substring(5, pos2);
        let pkgUrl = XResourcesUrl.getUIPackageUrl(pkgName);
        this.lastUrl = url;
        await ResMgr.inst.loadFGUIPackage(pkgUrl, this.node.uuid, (error, pkg) => {
            if (this.isDisposed) return;
            if (this.lastUrl != url) { return; }
            this.url = undefined;
            this.url = url;
            succFn && succFn();
        });
    }

    /** 释放 Loader 扩展资源 */
    public dispose(): void {
        this.lastUrl = null;
        this.url = null;
        super.dispose();
    }
}


window["XLoader"] = XLoader;
