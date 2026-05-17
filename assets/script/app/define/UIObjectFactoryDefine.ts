
import AlertLabelTip from "../../app/module/Alert/AlertLabelTip";
import { XResourcesUrl } from "../../base/define/XResourcesUrl";
import { UIObjectFactory } from "../../fairyGUI/UIObjectFactory";

export class UIObjectFactoryDefine {

    public static init() {
        UIObjectFactory.setExtension(`ui://${XResourcesUrl.COM_PACKAGE}/AlertLabelTip`, AlertLabelTip);
    }

}