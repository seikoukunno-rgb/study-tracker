/**
 * 学習時間（分）からレベルを計算する
 * 式: Lv = √(分 / 10) + 1
 * (例: 10分でLv2, 40分でLv3, 90分でLv4, 160分でLv5...)
 */
export const calculateLevel = (totalMinutes: number) => {
  if (totalMinutes <= 0) return 1;
  return Math.floor(Math.sqrt(totalMinutes / 10)) + 1;
};

/**
 * 現在のレベルの開始に必要な合計時間を計算
 */
export const getLevelStartMinutes = (level: number) => {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 10;
};

/**
 * 次のレベルに上がるために必要な合計時間を計算
 */
export const getNextLevelMinutes = (level: number) => {
  return Math.pow(level, 2) * 10;
};