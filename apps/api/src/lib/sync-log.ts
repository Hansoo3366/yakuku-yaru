/** Docker exec 등 비 TTY에서도 진행 로그가 바로 보이도록 stderr 사용 */
export function syncLog(tag: string, message: string) {
  process.stderr.write(`[${tag}] ${message}\n`);
}
