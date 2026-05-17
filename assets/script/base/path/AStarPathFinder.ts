/**
 *Author  : XW
 *Desc    : A* 寻路工具（网格）
 */

/** 网格坐标 */
export interface IAStarCell {
    /** 行索引 */
    row: number;
    /** 列索引 */
    col: number;
}

/** 走格子判定函数 */
export type AStarWalkableFn = (row: number, col: number) => boolean;

/** 寻路配置 */
export interface IAStarOption {
    /** 是否允许对角线移动 */
    allowDiagonal?: boolean;
}

type IAStarNode = {
    /** 行索引 */
    row: number;
    /** 列索引 */
    col: number;
    /** G 值 */
    g: number;
    /** H 值 */
    h: number;
    /** F 值 */
    f: number;
    /** 父节点 key */
    parentKey: string | null;
    /** 是否在开启列表 */
    opened: boolean;
    /** 是否已关闭 */
    closed: boolean;
};

/** A* 寻路器 */
export default class AStarPathFinder {
    /** 直线移动代价 */
    private static readonly COST_STRAIGHT = 10;
    /** 对角线移动代价 */
    private static readonly COST_DIAGONAL = 14;

    /**
     * 执行寻路。
     * @param start 起点
     * @param end 终点
     * @param rows 行数
     * @param cols 列数
     * @param walkableFn 可走判定
     * @param option 选项
     */
    public static findPath(start: IAStarCell, end: IAStarCell, rows: number, cols: number, walkableFn: AStarWalkableFn, option?: IAStarOption,): IAStarCell[] {
        if (!this.isInMap(start.row, start.col, rows, cols) || !this.isInMap(end.row, end.col, rows, cols)) {
            return [];
        }
        if (!walkableFn(start.row, start.col) || !walkableFn(end.row, end.col)) {
            return [];
        }

        if (start.row === end.row && start.col === end.col) {
            return [{ row: start.row, col: start.col }];
        }

        const allowDiagonal = option?.allowDiagonal !== false;
        const openList: IAStarNode[] = [];
        const nodeMap: Map<string, IAStarNode> = new Map();

        const startNode: IAStarNode = {
            row: start.row,
            col: start.col,
            g: 0,
            h: this.heuristic(start.row, start.col, end.row, end.col),
            f: 0,
            parentKey: null,
            opened: true,
            closed: false,
        };
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);
        nodeMap.set(this.makeKey(start.row, start.col), startNode);

        const directions = allowDiagonal
            ? [
                { dr: -1, dc: 0, cost: this.COST_STRAIGHT },
                { dr: 1, dc: 0, cost: this.COST_STRAIGHT },
                { dr: 0, dc: -1, cost: this.COST_STRAIGHT },
                { dr: 0, dc: 1, cost: this.COST_STRAIGHT },
                { dr: -1, dc: -1, cost: this.COST_DIAGONAL },
                { dr: -1, dc: 1, cost: this.COST_DIAGONAL },
                { dr: 1, dc: -1, cost: this.COST_DIAGONAL },
                { dr: 1, dc: 1, cost: this.COST_DIAGONAL },
            ]
            : [
                { dr: -1, dc: 0, cost: this.COST_STRAIGHT },
                { dr: 1, dc: 0, cost: this.COST_STRAIGHT },
                { dr: 0, dc: -1, cost: this.COST_STRAIGHT },
                { dr: 0, dc: 1, cost: this.COST_STRAIGHT },
            ];

        while (openList.length > 0) {
            openList.sort((a, b) => (a.f - b.f) || (a.h - b.h));
            const current = openList.shift() as IAStarNode;
            current.closed = true;

            if (current.row === end.row && current.col === end.col) {
                return this.buildPath(current, nodeMap);
            }

            for (let i = 0; i < directions.length; i += 1) {
                const dir = directions[i];
                const nr = current.row + dir.dr;
                const nc = current.col + dir.dc;
                if (!this.isInMap(nr, nc, rows, cols)) {
                    continue;
                }
                if (!walkableFn(nr, nc)) {
                    continue;
                }

                const isDiagonal = dir.dr !== 0 && dir.dc !== 0;
                if (isDiagonal) {
                    // 禁止“贴角穿墙”
                    if (!walkableFn(current.row + dir.dr, current.col) || !walkableFn(current.row, current.col + dir.dc)) {
                        continue;
                    }
                }

                const nextG = current.g + dir.cost;
                const nKey = this.makeKey(nr, nc);
                let neighbor = nodeMap.get(nKey);
                if (!neighbor) {
                    neighbor = {
                        row: nr,
                        col: nc,
                        g: nextG,
                        h: this.heuristic(nr, nc, end.row, end.col),
                        f: 0,
                        parentKey: this.makeKey(current.row, current.col),
                        opened: true,
                        closed: false,
                    };
                    neighbor.f = neighbor.g + neighbor.h;
                    nodeMap.set(nKey, neighbor);
                    openList.push(neighbor);
                    continue;
                }

                if (neighbor.closed && nextG >= neighbor.g) {
                    continue;
                }

                if (!neighbor.opened || nextG < neighbor.g) {
                    neighbor.g = nextG;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parentKey = this.makeKey(current.row, current.col);
                    if (!neighbor.opened) {
                        neighbor.opened = true;
                        neighbor.closed = false;
                        openList.push(neighbor);
                    }
                }
            }
        }

        return [];
    }

    /**
     * 估价函数（曼哈顿距离）。
     */
    private static heuristic(row: number, col: number, targetRow: number, targetCol: number): number {
        return (Math.abs(targetRow - row) + Math.abs(targetCol - col)) * this.COST_STRAIGHT;
    }

    /**
     * 构建路径结果。
     */
    private static buildPath(endNode: IAStarNode, nodeMap: Map<string, IAStarNode>): IAStarCell[] {
        const path: IAStarCell[] = [];
        let cur: IAStarNode | undefined = endNode;
        while (cur) {
            path.push({ row: cur.row, col: cur.col });
            if (!cur.parentKey) {
                break;
            }
            cur = nodeMap.get(cur.parentKey);
        }
        path.reverse();
        return path;
    }

    /**
     * 判断坐标是否在地图范围内。
     */
    private static isInMap(row: number, col: number, rows: number, cols: number): boolean {
        return row >= 0 && col >= 0 && row < rows && col < cols;
    }

    /**
     * 生成节点 key。
     */
    private static makeKey(row: number, col: number): string {
        return `${row}_${col}`;
    }
}
