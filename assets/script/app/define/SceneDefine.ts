import XScene from "../../base/ui/XScene";
import { UINAME, UINameType } from "./UIDefine";

export const SceneName = {
    LoginScene: "LoginScene",
} as const;

export type SceneNameType = typeof SceneName[keyof typeof SceneName];

/**
 * 场景参数映射，默认先放开为 `any`。
 * 后续如果要强约束某个场景参数，可按场景逐个细化类型。
 */
export type SceneArgMap = { [K in SceneNameType]: any };

export type SceneDefineType = {
    ctrl?: any;
    uiArr?: UINameType[];
    debugUiArr?: UINameType[];
    isCache?: boolean;
};

export type SceneDefineMap = { [name: string]: SceneDefineType } & Record<SceneNameType, SceneDefineType>;

export default class SceneDefine {
    public static ALL_SCENE: SceneDefineMap;

    public static init(): void {
        const define: SceneDefineMap = {
            [SceneName.LoginScene]: { ctrl: XScene, uiArr: [UINAME.LoginView] },
        };
        SceneDefine.ALL_SCENE = define;
    }
}
