/** UI界面参数的类型定义 */
declare namespace IUIArg {

    /** 登录界面参数 */
    export interface ILoginViewArg {
    }

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

}
