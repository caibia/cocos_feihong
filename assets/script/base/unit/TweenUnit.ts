/**
*Author  : XW
*Desc    : 
*/

import { Tween, tween } from "cc";
export default class TweenUnit {

    private static currTag: number = 0;
    private _tags: number[];
    private _targets: any[];
    public isPause: boolean = false;

    constructor() {
        this._tags = [];
        this._targets = [];
    }

    public getTween(obj: any, stopTween: boolean = true) {
        TweenUnit.currTag++;
        this._tags.push(TweenUnit.currTag);
        if (stopTween) Tween.stopAllByTarget(obj);
        let tw = tween(obj).tag(TweenUnit.currTag);
        this._targets.push(obj);
        return tw;
    }

    /**获取最后一次gettween的tag值 */
    public getLastTweenTag() {
        return TweenUnit.currTag;
    }

    /**停止并移除指定tag */
    public stopAllByTag(tag: number): void {
        let pos = this._tags.indexOf(tag);
        if (pos >= 0) {
            this._tags.splice(pos, 1);
        }
        Tween.stopAllByTag(tag);
    }

    public pause() {
        this.isPause = true;
        this._targets.forEach(target => {
            Tween.pauseAllByTarget(target);
        });
    }

    public resume() {
        this.isPause = false;
        this._targets.forEach(target => {
            Tween.resumeAllByTarget(target);
        });
    }

    public dispose() {
        let len = this._tags.length;
        while (len--) {
            let tag = this._tags.pop()
            this.stopAllByTag(tag);
        }
        this._targets = [];
    }
}