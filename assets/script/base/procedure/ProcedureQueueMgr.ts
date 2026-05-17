/**
*Author  : XW
*Desc    : 过程队列管理器，负责过程插入、排序、执行、锁定与场景联动控制
*/

import { BlockView } from "../../app/module/alert/BlockView";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import XConst from "../define/XConst";
import { EVENTNAME } from "../../app/define/EventDefine";
import { SceneName, SceneNameType } from "../../app/define/SceneDefine";
import { UINAME, UINameType } from "../../app/define/UIDefine";
import Extend from "../extend/Extend";
import EventMgr from "../manager/EventMgr";
import SceneMgr from "../manager/SceneMgr";
import TimerMgr, { ITimer } from "../manager/TimerMgr";
import UIMgr from "../manager/UIMgr";
import { Procedure } from "./Procedure";

export const enum PROCEDUREQUEUEPRIORITY {
    MIN = 0,
    LESS = 1,
    MIDDLE = 50,
    HIGH = 100,
    TOP = 1000,
}


/**
 * 统一管理动画队列：获得奖励动画、升级动画、功能开启动画、地图开放动画等等
 * 理论上， 所有系统主动推送弹出的界面、动画(非玩家点击触发的动画)， 都应该由ProcedureQueue管理， 为了避免多个动画/界面同时弹出, 也为了指引能避开当前的推送动画/界面
 */
export class ProcedureQueueMgr {
    /** 单例实例 */
    private static _inst: ProcedureQueueMgr;
    public static get inst(): ProcedureQueueMgr {
        if (!this._inst) {
            this._inst = new ProcedureQueueMgr();
        }
        return this._inst;
    }
    /** 过程自增 ID */
    public pid: number = 0;
    /** 延迟检查下一个过程的定时器 */
    private delayTimer: ITimer;
    /**所有过程队列 */
    private allProcedure: Procedure[];
    /**当前执行的过程 */
    private curProcedure: Procedure;
    /**被哪些UI锁住 */
    private lockReasons: Partial<Record<UINameType, boolean>>;
    /**ui名字对应的过程队列 */
    private uiProcedureMap: Partial<Record<UINameType, Procedure[]>>;

    /** 初始化过程队列、锁定表和事件监听 */
    constructor() {
        this.allProcedure = [];
        this.uiProcedureMap = {};
        this.lockReasons = {};
        EventMgr.inst.addEventListener(EVENTNAME.AFTER_SCENE_CHANGE, this.onSceneChange, this);
        EventMgr.inst.addEventListener(EVENTNAME.UI_ONDESTROY, this.onUIDestroy, this);
    }

    /**
     * 添加一个过程到队列
     * @param uiName 界面名称
     * @param uiArg 界面参数
     * @param priority 优先级
     * @param duration 结束时间(xx毫秒后)
     */
    public insertView(uiName: UINameType, uiArg?: any, priority?: number, duration?: number, isBlock?: boolean): Procedure {
        let pc: Procedure = new Procedure();
        let procedures: Procedure[] = this.uiProcedureMap[uiName] || [];
        procedures.push(pc);
        this.uiProcedureMap[uiName] = procedures;
        let pName = `UI_${uiName}_${procedures.length > 0 ? procedures.length : ""}`;
        let startcb = () => { UIMgr.inst.show(uiName, uiArg); };
        priority = priority ?? PROCEDUREQUEUEPRIORITY.MIDDLE;
        pc.init(pName, startcb, priority, duration, isBlock);
        // pc.setForbidScene({ [SceneName.CombatScene]: true });
        pc.setUIName(uiName);
        this.insert(pc);
        return pc;
    }
    /**
     * 插入一个过程到队列
     * @param pc 过程对象
     */
    public insert(pc: Procedure) {
        Extend.assert(pc.name && pc.name.length > 3, "procedure的name必须存在，且长度大于3");
        this.allProcedure.push(pc);
        XDEBUGLOG.procedure(`插入${pc.name}动画`);
        if (this.allProcedure.length >= 5) {
            XDEBUGLOG.warn(`procedure`, `插入${pc.name}时procedure数量较多,数量:${this.allProcedure.length}`);
        }
        if (this.curProcedure) {
            XDEBUGLOG.procedure("当前执行的procedure是：", this.curProcedure.name);
        }
        if (!this.delayTimer) {
            this.delayTimer = TimerMgr.inst.setTimeout(() => { this.checkNext() }, XConst.FPS_UTIME);
        }
    }

    /**
     * 把过程插入到队列头部。
     * @param pc 过程对象。
     */
    public insert2first(pc: Procedure) {
        let name = pc.name;
        Extend.assert(name && typeof (name) == "string" && name.length > 3, "procedure的name必须存在，且长度大于3");
        this.allProcedure.unshift(pc);
        if (this.allProcedure.length >= 5) {
            XDEBUGLOG.warn(`procedure`, "插入procedure数量比较多,数量：", pc.name, this.allProcedure.length);
        }
        if (this.curProcedure) {
            XDEBUGLOG.procedure("当前执行的procedure是：", this.curProcedure.name);
        }
        if (!this.delayTimer) {
            this.delayTimer = TimerMgr.inst.setTimeout(() => { this.checkNext() }, XConst.FPS_UTIME);
        }
    }
    /** 
     * 某个界面要求锁住动画队列，直到解锁后才开始播放动画
     * 比如一键装备，要求控制 激活套装、激活技能、战力提升这三个动画的顺序，而这个三个动画的协议到达时间和顺序是客户端不可控的
     * 此时就可以先锁住动画队列，直到协议都收到后才解锁播放动画
     **/
    /**
     * 锁住过程队列。
     * @param uiName 锁定原因对应的界面名。
     */
    public lock(uiName: UINameType) {
        Extend.assert(uiName, "锁住动画队列必须填写reason")
        this.lockReasons[uiName] = true;
    }
    /** 解锁 */
    /**
     * 解锁过程队列。
     * @param uiName 锁定原因对应的界面名。
     */
    public releaseLock(uiName: UINameType) {
        delete this.lockReasons[uiName];
    }

    /** 是否被某些界面锁住 */
    private isLock() {
        let bool = !Extend.isEmpty(this.lockReasons);
        bool && XDEBUGLOG.procedure("ProcedureQueue被以下原因锁住了", this.lockReasons);
        return bool;
    }
    /**
     * 删除一个过程
     * @param pc 过程对象
     */
    public remove(pc: Procedure) {
        for (let i = 0; i < this.allProcedure.length; i++) {
            let tmp = this.allProcedure[i];
            if (tmp == pc) {
                this.allProcedure.splice(i, 1);
                break;
            }
        }
        for (let uiName in this.uiProcedureMap) {
            let list = this.uiProcedureMap[uiName as UINameType] || [];
            for (let i = 0; i < list.length; i++) {
                let tmp = list[i];
                if (tmp == pc) {
                    list.splice(i, 1);
                    break;
                }
            }
        }
    }

    /**
     * 检测是否存在
     * @param name 进程名字/ui名字
     */
    public checkIsExist(name: string) {
        for (let i = 0; i < this.allProcedure.length; i++) {
            let tmp = this.allProcedure[i];
            if (tmp.name == name || tmp.uiName == name) {
                return true;
            }
        }
        if (this.curProcedure) {
            if (this.curProcedure.name == name || this.curProcedure.uiName == name) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断当前是否允许执行下一个过程。
     * @returns 是否允许执行。
     */
    private checkIsAllow() {
        if (this.allProcedure.length <= 0) return;
        if (this.curProcedure) return;
        let curScene = SceneMgr.inst.getCurScene();
        if (!curScene) return;
        let curSceneName = curScene.SCENENAME;
        if (!curSceneName) return;
        //是否加载过程中
        let isloading = SceneMgr.inst.isLoading();
        if (isloading) { return; }

        //根据以下条件排序: 当前场景内可显示优先->优先级优先->插入顺序优先(原数组顺序)
        //某些是在有二级界面下不能弹出的(功能开启的)
        let sortmap: any = {};
        for (let i = 0; i < this.allProcedure.length; i++) {
            let pc = this.allProcedure[i];
            let sort: any = {};
            sortmap[pc.id] = sort;
            sort.oldidx = i;
            sort.scenelegal = pc.isSceneLegal(curSceneName) ? 0 : 1;
            sort.interfacelegal = pc.isInterfaceLegal() ? 0 : 1;
            sort.guidelegal = pc.isGuideLegal() ? 0 : 1;
        }

        this.allProcedure.sort((a: Procedure, b: Procedure) => {
            let sorta = sortmap[a.id];
            let sortb = sortmap[b.id];
            if (sorta.scenelegal != sortb.scenelegal) {
                return sorta.scenelegal - sortb.scenelegal;
            }
            if (sorta.interfacelegal != sortb.interfacelegal) {
                return sorta.interfacelegal - sortb.interfacelegal;
            }
            if (sorta.guidelegal != sortb.guidelegal) {
                return sorta.guidelegal - sortb.guidelegal;
            }
            if (a.priority != b.priority) {
                //-1表示a在b前面 0表示不变 1表示a在b后面
                return b.priority - a.priority;
            }
            return sorta.oldidx - sortb.oldidx;
        });

        let firstpc = this.allProcedure[0];
        if (!firstpc.isSceneLegal(curSceneName)) return;
        //判断是否符合存在二级界面
        if (!firstpc.isInterfaceLegal()) return;
        //指引阻止
        if (!firstpc.isGuideLegal()) return;
        return true;
    }

    /** 从队列头部取出并启动一个过程 */
    private pop() {
        if (this.allProcedure.length <= 0) return;
        //拿出头部的过程
        let pc = this.allProcedure.shift();
        XDEBUGLOG.procedure("pop procedure", pc.name);
        Extend.assert(pc.name, "插入了没有名字的procedure");
        this.curProcedure = pc;
        //是否移除block
        this.checkRemoveBlockView();
        pc.onStart();
    }

    /**
     * 当前过程结束后的统一处理。
     * @param pc 结束的过程对象。
     */
    public onEnd(pc: Procedure) {
        if (pc == this.curProcedure) {
            XDEBUGLOG.procedure("end procedure", pc.name);
            this.curProcedure.dispose();
            this.curProcedure = null;
            if (!this.delayTimer) {
                this.delayTimer = TimerMgr.inst.setTimeout(() => { this.checkNext() }, XConst.FPS_UTIME);
            }
            //检测是否显示block
            this.checkCurSceneOtherProcedure();
        }
    }

    /** 检查并尝试执行下一个过程 */
    public checkNext() {
        if (this.delayTimer) {
            TimerMgr.inst.removeTimer(this.delayTimer);
            this.delayTimer = null;
        }
        if (!this.checkIsAllow()) return;
        if (this.isLock()) return;
        //执行下一个过程
        this.pop();
    }

    /** 检测当前场景是否有其他过程可执行 */
    private checkCurSceneOtherProcedure() {
        if (!this.checkIsAllow()) { return false; }
        //如果有，先显示下block，开始再移除
        UIMgr.inst.show(UINAME.BlockView, { reason: "procedureblock", overTime: 3000 });
    }

    /** 检测当前是否需要移除 BlockView */
    private checkRemoveBlockView() {
        let blockview = UIMgr.inst.getUI(UINAME.BlockView) as BlockView;
        (blockview && blockview.reason == "procedureblock") && UIMgr.inst.destroy(UINAME.BlockView);
    }

    /** UI 销毁时触发的过程队列检查 */
    private onUIDestroy() {
        if (!this.delayTimer) {
            this.delayTimer = TimerMgr.inst.setTimeout(() => { this.checkNext() }, XConst.FPS_UTIME);
        }
    }

    /** 场景切换时清理或重排过程队列 */
    private onSceneChange() {
        for (let i = this.allProcedure.length - 1; i >= 0; i--) {
            let pc = this.allProcedure[i];
            if (pc.destroy_with_scene_change) {
                pc.dispose();
                this.allProcedure.splice(i, 1);
            }
        }
        if (this.curProcedure && this.curProcedure.destroy_with_scene_change) {
            this.curProcedure.onEnd();
        }

        if (!this.delayTimer) {
            this.delayTimer = TimerMgr.inst.setTimeout(() => { this.checkNext() }, XConst.FPS_UTIME);
        }
    }

    /**
     * 判断某个过程是否应在空闲检测中被忽略。
     * @param procedure 过程对象。
     * @returns 是否忽略。
     */
    private checkIsIgnore(procedure: Procedure) {
        if (!procedure) { return false; }
        let ignoreMap = {
            // ["FightUpView"]: true,   //战力提升动画
            // ["AlertLabelTip"]: true,
            // ["equip_strength_chuizi_ani"]: true, //强化精炼装备的锤子特效
        }
        let name = procedure.uiName;
        if (ignoreMap[name]) { return true; }
        for (let key in ignoreMap) {
            let pos = name.indexOf(key)
            if (pos >= 0) { return true; }
        }
        return false;
    }

    /**
     * 判断指定场景下当前过程队列是否空闲。
     * @param sceneName 场景名称。
     * @returns 是否空闲。
     */
    public IsIdleBySceneName(sceneName: SceneNameType) {
        if (this.curProcedure && !this.checkIsIgnore(this.curProcedure)) { return false; }
        let procedure: Procedure;
        for (let i = 0; i < this.allProcedure.length; i++) {
            procedure = this.allProcedure[i];
            if (!this.checkIsIgnore(procedure) && procedure.isSceneLegal(sceneName) && procedure.isInterfaceLegal() && procedure.isGuideLegal()) {
                XDEBUGLOG.guide("存在动画播放：", procedure.name);
                return false;
            }
        }
        return true;
    }

    /** 清空当前全部过程数据并释放运行中的过程 */
    public clearData() {
        if (this.curProcedure) {
            this.curProcedure.dispose();
            this.curProcedure = null;
        }
        if (this.allProcedure) {
            for (let i = 0; i < this.allProcedure.length; i++) {
                let pro = this.allProcedure[i];
                pro.dispose();
            }
        }
        this.allProcedure = [];
    }
}
