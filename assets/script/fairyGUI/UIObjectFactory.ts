import { ObjectType, PackageItemType } from "./FieldTypes";
import { GButton } from "./GButton";
import { GComboBox } from "./GComboBox";
import { GComponent } from "./GComponent";
import { GGraph } from "./GGraph";
import { GGroup } from "./GGroup";
import { GImage } from "./GImage";
import { GLabel } from "./GLabel";
import { GList } from "./GList";
import { GLoader } from "./GLoader";
import { GLoader3D } from "./GLoader3D";
import { GMovieClip } from "./GMovieClip";
import { GObject } from "./GObject";
import { GProgressBar } from "./GProgressBar";
import { GRichTextField } from "./GRichTextField";
import { GScrollBar } from "./GScrollBar";
import { GSlider } from "./GSlider";
import { GTextField } from "./GTextField";
import { GTextInput } from "./GTextInput";
import { GTree } from "./GTree";
import { PackageItem } from "./PackageItem";
import { Decls, UIPackage } from "./UIPackage";

/**
 * 对象工厂，负责根据包资源类型或扩展信息创建 GUI 实例。
 */
export class UIObjectFactory {
    /**
     * 已创建对象计数器。
     */
    public static counter: number = 0;

    /**
     * 组件扩展类型注册表。
     */
    public static extensions: { [index: string]: new () => GComponent } = {};
    /**
     * 全局 `GLoader` 扩展类型。
     */
    public static loaderType: new () => GLoader;

    /**
     * 初始化对象工厂的扩展类注册表与包资源映射缓存。
     */
    public constructor() {
    }

    /**
     * 为指定组件资源 URL 注册扩展类；后续创建该资源时会优先实例化该类型。
     * @param url 组件资源 URL。
     * @param type 扩展类构造函数。
     */
    public static setExtension(url: string, type: new () => GComponent): void {
        if (url == null)
            throw new Error("Invaild url: " + url);

        var pi: PackageItem = UIPackage.getItemByURL(url);
        if (pi)
            pi.extensionType = type;

        UIObjectFactory.extensions[url] = type;
    }

    /**
     * 注册全局 `GLoader` 扩展类；对象工厂创建 Loader 时会优先使用它。
     * @param type `GLoader` 扩展类构造函数。
     */
    public static setLoaderExtension(type: new () => GLoader): void {
        UIObjectFactory.loaderType = type;
    }

    /**
     * 解析资源项对应的扩展类注册信息。
     * @param pi 目标包资源项。
     */
    public static resolveExtension(pi: PackageItem): void {
        var extensionType = UIObjectFactory.extensions["ui://" + pi.owner.id + pi.id];
        if (!extensionType)
            extensionType = UIObjectFactory.extensions["ui://" + pi.owner.name + "/" + pi.name];
        if (extensionType)
            pi.extensionType = extensionType;
    }

    /**
     * 根据对象类型创建新的 GUI 实例。
     * @param type 对象类型枚举值或包资源项。
     * @param userClass 可选用户自定义类。
     * @returns 创建得到的 GUI 对象。
     */
    public static newObject(type: number | PackageItem, userClass?: new () => GObject): GObject {
        var obj: GObject;
        UIObjectFactory.counter++;

        if (typeof type === 'number') {
            switch (type) {
                case ObjectType.Image:
                    return new GImage();

                case ObjectType.MovieClip:
                    return new GMovieClip();

                case ObjectType.Component:
                    return new GComponent();

                case ObjectType.Text:
                    return new GTextField();

                case ObjectType.RichText:
                    return new GRichTextField();

                case ObjectType.InputText:
                    return new GTextInput();

                case ObjectType.Group:
                    return new GGroup();

                case ObjectType.List:
                    return new GList();

                case ObjectType.Graph:
                    return new GGraph();

                case ObjectType.Loader:
                    if (UIObjectFactory.loaderType)
                        return new UIObjectFactory.loaderType();
                    else
                        return new GLoader();

                case ObjectType.Button:
                    return new GButton();

                case ObjectType.Label:
                    return new GLabel();

                case ObjectType.ProgressBar:
                    return new GProgressBar();

                case ObjectType.Slider:
                    return new GSlider();

                case ObjectType.ScrollBar:
                    return new GScrollBar();

                case ObjectType.ComboBox:
                    return new GComboBox();

                case ObjectType.Tree:
                    return new GTree();

                case ObjectType.Loader3D:
                    return new GLoader3D();

                default:
                    return null;
            }
        }
        else {
            if (type.type == PackageItemType.Component) {
                if (userClass)
                    obj = new userClass();
                else if (type.extensionType)
                    obj = new type.extensionType();
                else
                    obj = UIObjectFactory.newObject(type.objectType);
            }
            else
                obj = UIObjectFactory.newObject(type.objectType);

            if (obj)
                obj.packageItem = type;
        }

        return obj;
    }
}

Decls.UIObjectFactory = UIObjectFactory;
