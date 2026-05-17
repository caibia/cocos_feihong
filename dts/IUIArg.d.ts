/** UI界面参数的类型定义 */
declare namespace IUIArg {

    export interface IDialogViewArg {
        /**标题 */
        title: string,
        /**内容 */
        content: string,
        /**确定按钮文本 */
        okBtnText?: string,
        /**取消按钮文本 */
        cancelBtnText?: string,
        /**确定按钮回调 */
        okFunc?: () => void,
        /**取消按钮回调 */
        cancelFunc?: () => void
    }

    export interface IBlockViewArg {
        /**使用Block的原因 */
        reason: string,
        /**用于调整背景黑幕的透明度，默认是0 */
        alpha?: number,
        /**超时时间，超时后，BlockView会自动移除，并调用overTimeCallback */
        overTime?: number,
        /**超时回调 */
        overTimeCallback?: () => void,  //超时回调
    }

    export interface ILoginViewArg {
        /** 提示文本 */
        debugTxt?: string,
        /** 提示文本ID */
        id?: number | string,
        /** 提示文本参数 用来替换文本里的{0},{1},... */
        params?: any[]
    }

    export interface IPvPlayViewArg {
        /** PV 主视频资源（相对 resources，无扩展名） */
        pvName: string,
        /** PV 字幕视频资源（相对 resources，无扩展名）；空表示不显示字幕 */
        zimuName?: string,
        /** PV 期间播放的 BGM 资源 */
        bgm?: string,
        /** 播完是否把 PV 标记为已播；true=首次播放，false=重播 */
        markPlayed?: boolean,
    }
}