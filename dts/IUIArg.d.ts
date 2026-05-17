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
}