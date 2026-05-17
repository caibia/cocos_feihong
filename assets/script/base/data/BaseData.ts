/**
*Author  : XW
*Desc    : 
*/

import ObserveMgr from "../manager/ObserveMgr";

export default class BaseData {

    public init() {
        ObserveMgr.inst.reComplie(this);
    }

}