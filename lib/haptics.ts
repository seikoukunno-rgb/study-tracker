/**
 * 端末の振動（触覚フィードバック）ヘルパー。
 *
 * - Android Chrome など: Vibration API (navigator.vibrate)
 * - iPhone/iPad の Safari(17.4+): Vibration API が無いため、
 *   <input type="checkbox" switch> をタップしたときの触覚フィードバックで代用する
 * - PC など振動できない端末では何もしない
 *
 * ブラウザは「画面を一度でも触った後」でないと振動を許可しないことがある。
 * 失敗したときは false を返すので、呼び出し側でユーザー操作後に再試行できる。
 */

const LEVEL_UP_PATTERN = [60, 40, 60, 40, 160];

function iosHapticTap() {
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    setTimeout(() => label.remove(), 50);
  } catch {
    // 触覚フィードバックが使えない環境では何もしない
  }
}

function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ は "Macintosh" を名乗るので、タッチ対応かどうかも見る
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** レベルアップ用の振動。実行できたら true、ブロックされた/非対応なら false */
export function vibrateLevelUp(): boolean {
  if (typeof navigator === "undefined") return false;

  if (typeof navigator.vibrate === "function") {
    try {
      return navigator.vibrate(LEVEL_UP_PATTERN);
    } catch {
      return false;
    }
  }

  if (isIosLike()) {
    // 「トン・トン・トーン」のリズムでタップ触覚を3回
    [0, 100, 200].forEach((delay) => setTimeout(iosHapticTap, delay));
    return true;
  }

  return false;
}
