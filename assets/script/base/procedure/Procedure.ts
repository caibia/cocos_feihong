/**
*Author  : XW
*Desc    : 单个过程对象，负责描述动画或界面的触发条件、生命周期和结束回调
*/

import { SceneNameType } from "../../app/define/SceneDefine";
import { UINAME, UINameType } from "../../app/define/UIDefine";
import XConst from "../define/XConst";
import Extend from "../extend/Extend";
import { ITimer } from "../manager/TimerMgr";
import UIMgr from "../manager/UIMgr";
import TimerUnit from "../unit/TimerUnit";
import { ProcedureQueueMgr } from "./ProcedureQueueMgr";

export class Procedure {

    /** 全局过程自增 ID */
    public static pid: number = 0;
    /** 当前过程唯一 ID */
    public id: number;
    /** 过程名称 */
    public name: string;
    /**优先级(数字越大越优先) */
    public priority: number;
    /**开始回调 */
    public startcb: () => void;
    /**结束回调 */
    public endCb: () => void;
    /**xx毫秒后结束 */
    public duration: number;
    /**允许弹出该过程的场景 */
    public legal_scene: Partial<Record<SceneNameType, boolean>>;
    /**禁止的场景(场景名:true) */
    public forbid_scene: Partial<Record<SceneNameType, boolean>>;
    /**场景切换时是否销毁该过程 */
    public destroy_with_scene_change: boolean;
    /**是否在弹出二级界面时候禁止(一般都是功能开启) */
    public isforbidinterface: boolean;
    /**忽略的二级界面(在上面禁止时忽略) */
    public ignoreView: { [key: string]: boolean };
    /**是否弹出期间显示block */
    public showBlock: boolean;
    /**有指引时禁止弹出([guideId1,...]) */
    public forBidGuideList: number[];

    /** 定时器辅助单元 */
    public timerUnit: TimerUnit;
    /**检测是否可以结束procedure的定时器(开始时创建，结束时销毁) */
    private checkTimer: ITimer;
    /**该procedure依赖的界面，如果界面不存在了，就直接结束 */
    public uiName: UINameType;

    //有两种方式结束动画：1自己调用Procedure.onEnd()结束动画，2设置duration自动结束动画

    /**
     * 初始化
	 * @param name 过程名称。
	 * @param startcb 开始执行时的回调。
     * @param priority 优先级
     * @param duration xx毫秒后结束
     * @param isBlock 是否弹出期间显示block
     */
    init(name: string, startcb: () => void, priority?: number, duration?: number, isBlock?: boolean) {
        this.id = ProcedureQueueMgr.inst.pid;
        this.name = name;
        this.startcb = startcb;
        this.priority = !Extend.isNull(priority) ? priority : 1;
        this.duration = duration;
        this.showBlock = isBlock;
        this.timerUnit = new TimerUnit(this);
        ProcedureQueueMgr.inst.pid++;
    }

    /**
     * 设置过程结束回调。
     * @param endCb 结束回调函数。
     */
    public setEndCallback(endCb: () => void) {
        this.endCb = endCb;
    }

    /**
     * 设置过程依赖的界面名称。
     * @param uiName 界面名称。
     */
    public setUIName(uiName: UINameType) {
        this.uiName = uiName;
    }

    /** 启动当前过程 */
    public onStart() {
        if (this.showBlock) {
            UIMgr.inst.show(UINAME.BlockView, { reason: `procedure_${this.name}` });
        }

        this.startcb && this.startcb();
        //设置了自动结束时间
        this.duration && this.timerUnit.setTimeout(() => { this.onEnd(); }, this.duration)

        //设置依赖界面，如果界面不在了，直接结束
        if (this.uiName && !this.checkTimer) {
            this.checkTimer = this.timerUnit.setInterval(() => {
                let uiObj = UIMgr.inst.getUI(this.uiName, true);
                if (!uiObj || (!uiObj.parent)) {
                    this.onEnd();
                }
            }, XConst.FPS_UTIME);
        }
    }

    /** 结束当前过程 */
    public onEnd() {
        if (this.showBlock) {
            UIMgr.inst.destroy(UINAME.BlockView);
        }
        this.endCb && this.endCb();
        ProcedureQueueMgr.inst.onEnd(this);
    }

    /**
     * 设置哪些场景禁止弹出该过程。
     * @param forbidmap 禁止场景映射表。
     */
    public setForbidScene(forbidmap: Partial<Record<SceneNameType, boolean>>) {
        this.forbid_scene = forbidmap;
    }
    /**
     * 设置哪些场景允许弹出该过程。
     * @param legalmap 合法场景映射表。
     */
    public setLegalScene(legalmap: Partial<Record<SceneNameType, boolean>>) {
        this.legal_scene = legalmap;
    }
    /**
     * 设置是否在弹出二级界面时禁止执行。
     * @param isforbid 是否禁止。
     */
    public setForbidInterface(isforbid: boolean) {
        this.isforbidinterface = isforbid;
    }

    /**
     * 设置有指引时禁止弹出动画。
     * @param list 指引 ID 列表。
     */
    public setForbidGuide(list: number[]) {
        this.forBidGuideList = list;
    }
    /**
     * 设置忽略的二级界面。
     * @param map 忽略界面映射表。
     */
    public setIgnoreView(map: { [key: string]: boolean }) {
        this.ignoreView = map;
    }

    /**
     * 判断当前场景是否允许执行该过程。
     * @param scenename 场景名称。
     * @returns 是否允许执行。
     */
    public isSceneLegal(scenename: SceneNameType) {
        let legal = true;
        if (this.legal_scene && !Extend.isNull(scenename)) {
            if (!this.legal_scene[scenename]) {
                legal = false;
            }
        }
        if (this.forbid_scene) {
            if (this.forbid_scene[scenename]) {
                legal = false;
            }
        }
        return legal
    }

    /** 界面是否符合 弹出该过程 */
    public isInterfaceLegal() {
        if (!this.isforbidinterface) { return true }
        if (this.isforbidinterface) {
            if (UIMgr.inst.checkIsExistSubView(this.ignoreView)) {
                return false;
            }
        }
        return true;
    }

    /** 指引条是否符合 弹出该过程 */
    public isGuideLegal() {
        // if (this.forBidGuideList) {
        //     let guideList = GuideDB.inst.getDataList();
        //     let guideId;
        //     for (let i = 0; i < guideList.length; i++) {
        //         guideId = guideList[i].guideId;
        //         if (this.forBidGuideList.indexOf(guideId) >= 0) {
        //             return false;
        //         }
        //     }
        // }
        return true;
    }

    public dispose() {
        this.endCb = null;
        this.startcb = null;
        this.legal_scene = null;
        this.forbid_scene = null;
        this.timerUnit.dispose();
    }

}
