"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genCode = void 0;
var FairyEditor = CS.FairyEditor;
const CodeWriter_1 = require("./CodeWriter");
// FairyGUI 内置类型 -> 导入路径映射（按需导入）
const BUILTIN_TYPE_IMPORTS = {
    Controller: '../../../../fairyGUI/Controller',
    GButton: '../../../../fairyGUI/GButton',
    GComboBox: '../../../../fairyGUI/GComboBox',
    GComponent: '../../../../fairyGUI/GComponent',
    GGraph: '../../../../fairyGUI/GGraph',
    GGroup: '../../../../fairyGUI/GGroup',
    GImage: '../../../../fairyGUI/GImage',
    GLabel: '../../../../fairyGUI/GLabel',
    GList: '../../../../fairyGUI/GList',
    GLoader: '../../../../fairyGUI/GLoader',
    GLoader3D: '../../../../fairyGUI/GLoader3D',
    GMovieClip: '../../../../fairyGUI/GMovieClip',
    GObject: '../../../../fairyGUI/GObject',
    GProgressBar: '../../../../fairyGUI/GProgressBar',
    GRichTextField: '../../../../fairyGUI/GRichTextField',
    GSlider: '../../../../fairyGUI/GSlider',
    GTextField: '../../../../fairyGUI/GTextField',
    GTextInput: '../../../../fairyGUI/GTextInput',
    GTree: '../../../../fairyGUI/GTree',
    Transition: '../../../../fairyGUI/Transition'
};
// 统一路径格式，避免平台差异（\ 与 /）导致判断失败
function normalizePath(path) {
    if (!path)
        return '';
    return path.replace(/\\/g, '/').toLowerCase();
}
// 路径分段匹配（避免 baseview 这类子串误命中）
function hasPathSegment(classInfo, segment) {
    const folderPath = normalizePath(classInfo.res && classInfo.res.path);
    if (!folderPath)
        return false;
    const segments = folderPath.split('/').filter(s => s.length > 0);
    return segments.indexOf(segment) >= 0;
}
// 仅允许 view/widget 目录下组件参与生成（支持多层路径）
function isViewOrWidget(classInfo) {
    return hasPathSegment(classInfo, 'view') || hasPathSegment(classInfo, 'widget');
}
// 是否位于 view 目录（用于生成全屏适配代码）
function isViewClass(classInfo) {
    return hasPathSegment(classInfo, 'view');
}
// 继承规则：btn 前缀 > view 后缀 > 默认
function resolveBaseClass(className) {
    const lowerClassName = (className || '').toLowerCase();
    if (lowerClassName.startsWith('btn'))
        return 'XButton';
    if (lowerClassName.endsWith('view'))
        return 'XWindow';
    return 'XComponent';
}
// 去除 fgui. 前缀，统一类型名
function normalizeTypeName(typeName) {
    if (!typeName)
        return 'GObject';
    if (typeName.startsWith('fgui.'))
        return typeName.substring(5);
    return typeName;
}
// 去掉类名前缀（如 UI_），输出 I组件名.ts
function stripClassNamePrefix(className, classNamePrefix) {
    if (!className)
        return '';
    if (classNamePrefix && className.startsWith(classNamePrefix))
        return className.substring(classNamePrefix.length);
    return className;
}
// 字段名优先取组件原名，并去掉配置前缀与 m_ 前缀
function resolveMemberName(memberInfo, memberNamePrefix) {
    let name = memberInfo.name || memberInfo.varName || '';
    if (memberNamePrefix && name.startsWith(memberNamePrefix))
        name = name.substring(memberNamePrefix.length);
    if (name.startsWith('m_'))
        name = name.substring(2);
    return name;
}
// 代码导出根路径优先取 FairyGUI 发布设置：
// 1) codePath -> handler.exportCodePath
// 2) publish path -> handler.exportPath
// 3) 回退默认目录
function resolveCodeRootPath(handler) {
    const codePath = handler.exportCodePath || '';
    if (codePath.length > 0)
        return codePath;
    const publishPath = handler.exportPath || '';
    if (publishPath.length > 0)
        return publishPath;
    return handler.project.basePath + '/../../assets/script/app/module';
}
// 收集 named import（按路径去重）
function addNamedImport(importTable, importPath, typeName) {
    if (!importTable[importPath])
        importTable[importPath] = new Set();
    importTable[importPath].add(typeName);
}
// 按路径稳定排序输出 import，避免无意义 diff
function writeNamedImports(writer, importTable) {
    const importPaths = Object.keys(importTable).sort();
    for (let i = 0; i < importPaths.length; i++) {
        const importPath = importPaths[i];
        const names = Array.from(importTable[importPath]).sort();
        writer.writeln('import { %s } from "%s";', names.join(', '), importPath);
    }
}
// 发布代码入口
function genCode(handler) {
    // 读取发布配置
    let settings = handler.project.GetSettings('Publish').codeGeneration;
    // 包名标准化（中文转拼音等）
    let codePkgName = handler.ToFilename(handler.pkg.name);
    // 输出目录：发布设置路径 + 包名 + Interfaces
    let exportCodePath = resolveCodeRootPath(handler) + '/' + codePkgName + '/Interfaces';
    // 收集可导出类
    let classes = handler.CollectClasses(settings.ignoreNoname, settings.ignoreNoname, 'fgui');
    // 创建并清理目标目录
    handler.SetupCodeFolder(exportCodePath, 'ts');
    let classCnt = classes.Count;
    let classNamePrefix = settings.classNamePrefix;
    let memberNamePrefix = settings.memberNamePrefix;
    // 先收集会参与生成的组件名，用于自定义类型映射为 Ixxx
    let filteredClassNames = new Set();
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        if (isViewOrWidget(classInfo))
            filteredClassNames.add(stripClassNamePrefix(classInfo.className, classNamePrefix));
    }
    let writer = new CodeWriter_1.default({ blockFromNewLine: false, usingTabs: true });
    let generatedCount = 0;
    // 逐个组件生成 I组件名.ts
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        if (!isViewOrWidget(classInfo))
            continue;
        let componentClassName = stripClassNamePrefix(classInfo.className, classNamePrefix);
        let interfaceClassName = 'I' + componentClassName;
        let baseClassName = resolveBaseClass(componentClassName);
        let isViewComponent = isViewClass(classInfo);
        // importTable：内置类型导入；localTypeImports：同目录 Ixxx 导入
        let importTable = {};
        let localTypeImports = new Set();
        // fields：最终字段声明（仅名称与类型）
        let fields = [];
        let members = classInfo.members;
        let memberCnt = members.Count;
        for (let j = 0; j < memberCnt; j++) {
            let memberInfo = members.get_Item(j);
            let varName = resolveMemberName(memberInfo, memberNamePrefix);
            // 过滤 n 前缀字段
            if (varName.startsWith('n'))
                continue;
            let resolvedType = normalizeTypeName(memberInfo.type || '');
            resolvedType = stripClassNamePrefix(resolvedType, classNamePrefix);
            // 自定义组件类型改为 Ixxx，并避免自导入
            if (filteredClassNames.has(resolvedType)) {
                resolvedType = 'I' + resolvedType;
                if (resolvedType !== interfaceClassName)
                    localTypeImports.add(resolvedType);
            }
            // 内置类型按需导入
            let builtinImportPath = BUILTIN_TYPE_IMPORTS[resolvedType];
            if (builtinImportPath)
                addNamedImport(importTable, builtinImportPath, resolvedType);
            fields.push({ varName, typeName: resolvedType });
        }
        writer.reset();
        // 导入继承基类
        writer.writeln('import %s from "../../../../base/ui/%s";', baseClassName, baseClassName);
        if (isViewComponent) {
            writer.writeln('import { UIPackage } from "../../../../fairyGUI/UIPackage";');
            writer.writeln('import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";');
        }
        // 导入同目录自定义类型
        let localImports = Array.from(localTypeImports).sort();
        for (let j = 0; j < localImports.length; j++) {
            let localType = localImports[j];
            writer.writeln('import %s from "./%s";', localType, localType);
        }
        // 导入 FairyGUI 基础类型
        writeNamedImports(writer, importTable);
        writer.writeln();
        // 输出类与字段定义
        writer.writeln('export default class %s extends %s', interfaceClassName, baseClassName);
        writer.startBlock();
        for (let j = 0; j < fields.length; j++) {
            let field = fields[j];
            writer.writeln('protected %s: %s;', field.varName, field.typeName);
        }
        writer.writeln();
        writer.writeln('public onCreate()');
        writer.startBlock();
        writer.writeln('super.onCreate();');
        if (isViewComponent)
            writer.writeln('this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;');
        if (baseClassName === 'XButton' || baseClassName === 'XComponent') {
            writer.writeln('this.initComponentByView(this);');
            writer.writeln('this.initControllerByView(this);');
        }
        else {
            // writer.writeln('/** 列表子项皮肤映射对应的类 */');
            // writer.writeln('//UIObjectFactory.setExtension("ui://包名/组件名",组件类); ');
            writer.writeln('this.view = UIPackage.createObject("%s", "%s").asCom;', codePkgName, componentClassName);
            writer.writeln('this.addChild(this.view);');
            writer.writeln('this.initComponentByView(this.view);');
            writer.writeln('this.initControllerByView(this.view);');
        }
        writer.endBlock();
        writer.endBlock();
        writer.save(exportCodePath + '/I' + componentClassName + '.ts');
        generatedCount++;
    }
    // 发布日志：用于快速确认筛选与生成结果
    console.log(`[export-ccc3] package=${handler.pkg.name}, classes=${classCnt}, matched=${filteredClassNames.size}, generated=${generatedCount}, out=${exportCodePath}`);
}
exports.genCode = genCode;
