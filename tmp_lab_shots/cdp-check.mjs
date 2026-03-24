const targetUrl = process.argv[2];
const outPath = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browserMsgId = 0;
let pageMsgId = 0;
const browserPending = new Map();
const pagePending = new Map();
const version = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
const browserSock = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  browserSock.addEventListener('open', resolve, { once: true });
  browserSock.addEventListener('error', reject, { once: true });
});
function sendBrowser(method, params = {}) {
  const id = ++browserMsgId;
  browserSock.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => browserPending.set(id, { resolve, reject }));
}
browserSock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && browserPending.has(msg.id)) {
    browserPending.get(msg.id).resolve(msg.result);
    browserPending.delete(msg.id);
  }
});
const { targetId } = await sendBrowser('Target.createTarget', { url: targetUrl });
const targets = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
const pageTarget = targets.find((t) => t.id === targetId);
const pageSock = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  pageSock.addEventListener('open', resolve, { once: true });
  pageSock.addEventListener('error', reject, { once: true });
});
function sendPage(method, params = {}) {
  const id = ++pageMsgId;
  pageSock.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pagePending.set(id, { resolve, reject }));
}
let loaded = false;
pageSock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pagePending.has(msg.id)) {
    pagePending.get(msg.id).resolve(msg.result);
    pagePending.delete(msg.id);
  }
  if (msg.method === 'Page.loadEventFired') {
    loaded = true;
  }
});
await sendPage('Page.enable');
await sendPage('Runtime.enable');
for (let i = 0; i < 200 && !loaded; i++) await sleep(100);
await sleep(10000);
const textResult = await sendPage('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
await import('node:fs/promises').then((fs) => fs.writeFile(outPath, String(textResult.result.value || ''), 'utf8'));
