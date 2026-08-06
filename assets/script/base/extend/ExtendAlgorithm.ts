/**
*Author  : XW
*Desc    : 算法扩展工具，提供 TopK 排序和快速排序等数组处理能力
*/

export default class ExtendAlgorithm {

    /**
     * TopK排序， 只排序前K个元素  O(2N)时间复杂度
	 * @param arr 待排序数组。
     * @param k 		K个元素
     * @param compare 	返回-1表示a要排在b之前，返回0表示a和b相等，返回1表示a要排在b之后
     * @param sortK 	是否对前K个元素也要排序 
     * @returns 		返回数组的前K个元素即TopK，注意默认前K个元素是没有经过排序的
     */
    public static topKSort(arr: any[], k: number, compare: (a, b) => number, sortK?: boolean) {
        if (!arr || arr.length == 0 || !k) return arr;
        if (k > arr.length - 1) k = arr.length - 1;
        ExtendAlgorithm._topKSort(arr, k, 0, arr.length - 1, compare);
        if (sortK) {
            ExtendAlgorithm._quickSort(arr, 0, k, compare);
        }
        return arr;
    }

    /**
     * 内部执行 TopK 分区筛选。
     * @param arr 待处理数组。
     * @param k 目标索引。
     * @param low 当前分区起始索引。
     * @param high 当前分区结束索引。
     * @param compare 比较函数。
     * @returns 分区后命中的索引。
     */
    private static _topKSort(arr: any[], k: number, low: number, high: number, compare: (a, b) => number) {
        let index = ExtendAlgorithm._partition(arr, low, high, compare);
        if (index == k) return index;
        else if (index > k) return ExtendAlgorithm._topKSort(arr, k, low, index - 1, compare);
        else if (index < k) return ExtendAlgorithm._topKSort(arr, k, index + 1, high, compare);
    }

    /**
     * 执行一次快速排序分区。
     * @param arr 待处理数组。
     * @param low 当前分区起始索引。
     * @param high 当前分区结束索引。
     * @param compare 比较函数。
     * @returns 分区点索引。
     */
    private static _partition(arr: any[], low: number, high: number, compare: (a, b) => number) {
        let base: any = arr[low];
        let c;
        while (low < high) {
            while (low < high && (compare(base, arr[high]) || 0) <= 0) {   //注：要预防调用者的compare返回undefined等错误的值
                high--;
            }
            if (low < high) {
                arr[low] = arr[high];
            }
            while (low < high && (compare(base, arr[low]) || 0) >= 0) {
                low++;
            }
            if (low < high) {
                arr[high] = arr[low];
            }
        }
        arr[low] = base;
        return low;
    }

    /**
     * 对整个数组执行快速排序。
     * @param arr 待排序数组。
     * @param compare 比较函数。
     */
    public static quickSort(arr: any[], compare: (a, b) => number) {
        ExtendAlgorithm._quickSort(arr, 0, arr.length - 1, compare);
    }

    /**
     * 内部快速排序实现。
     * @param arr 待排序数组。
     * @param low 当前分区起始索引。
     * @param high 当前分区结束索引。
     * @param compare 比较函数。
     */
    private static _quickSort(arr: any[], low: number, high: number, compare: (a, b) => number) {
        if (low >= high) return;
        let index = ExtendAlgorithm._partition(arr, low, high, compare);
        ExtendAlgorithm._quickSort(arr, low, index - 1, compare);
        ExtendAlgorithm._quickSort(arr, index + 1, high, compare);
    }
}
