/**
 * 导出 / 导入文件：把存档存成一个 .json 文件下载下来，或者选一个文件读进来。
 * iPhone 上导出时会弹出「存储到文件」之类的选项。
 */

/** 把一段文字存成文件下载 */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** 让玩家选一个文件，读出里面的文字。取消了返回 null。 */
export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    document.body.appendChild(input);
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      finish(file ? await file.text() : null);
    });
    input.addEventListener('cancel', () => finish(null));
    input.click();
  });
}
