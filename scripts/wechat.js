/**
 * 微信公众号「复制页」生成器
 *
 * 作用：把 source/_posts 下的 Markdown，额外渲染成一份全内联样式、
 *      公众号编辑器可直接粘贴的 HTML 页面，随 hexo d 一起发布到站点。
 *
 * 用法：
 *   1. 正常写文章、hexo d
 *   2. 手机打开 https://lastwarmth.win/wechat/ ，找到文章点进去
 *   3. 点底部「复制全文」
 *   4. 微信 → 订阅号助手 → 新建图文 → 长按粘贴 → 发布
 *
 * 为什么不做「脚本直推草稿箱」：未认证的个人订阅号没有 draft/add 权限，
 * 调用会返回 48001 api unauthorized（微信官方社区明确要求已认证公众号）。
 *
 * 排除某篇文章：在 front-matter 里写 wechat: false
 */

'use strict';

const { Lexer, Parser, Renderer } = require('marked');

const SITE = 'https://lastwarmth.win';

/* ------------------------------------------------------------------ *
 * 一、公众号内联样式表
 * 公众号编辑器只认元素上的 inline style，<style>/class 粘贴后全部丢弃，
 * 所以这里每一种标签都必须把样式写死在元素上。
 * ------------------------------------------------------------------ */

const C = {
  text: '#333333',
  title: '#111111',
  accent: '#2b6cb0',
  codeBg: '#f6f8fa',
  codeBorder: '#e5e9ef',
  codeText: '#24292f',
  quoteBg: '#f7f9fc',
  quoteText: '#5a6672',
};

// 西文字体必须排在前面：中文字体（微软雅黑等）把全角引号画成直立的短双撇，
// 只有西文字体才呈现明显的弯钩形 “ ”，引号得走西文字体才看得出正反。
const FONT_STACK = `-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,'lucida grande','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`;
const FF = `font-family:${FONT_STACK};`;

const STYLE = {
  body: `${FF}font-size:16px;line-height:1.8;color:${C.text};letter-spacing:.4px;text-align:justify;word-break:break-word;`,
  h1: `${FF}margin:36px 0 18px;font-size:21px;font-weight:bold;line-height:1.45;color:${C.title};`,
  h2: `${FF}margin:36px 0 18px;padding-left:12px;border-left:4px solid ${C.accent};font-size:19px;font-weight:bold;line-height:1.5;color:${C.title};`,
  h3: `${FF}margin:30px 0 16px;font-size:17px;font-weight:bold;line-height:1.5;color:${C.title};`,
  h4: `${FF}margin:26px 0 14px;font-size:16px;font-weight:bold;line-height:1.5;color:${C.title};`,
  p: `${FF}margin:0 0 22px;${'font-size:16px;line-height:1.8;color:' + C.text + ';letter-spacing:.4px;text-align:justify;word-break:break-word;'}`,
  pInList: `${FF}margin:0 0 8px;${'font-size:16px;line-height:1.8;color:' + C.text + ';letter-spacing:.4px;word-break:break-word;'}`,
  pInQuote: `${FF}margin:0 0 10px;font-size:15px;line-height:1.75;color:${C.quoteText};letter-spacing:.3px;word-break:break-word;`,
  blockquote: `${FF}margin:24px 0;padding:14px 18px;border-left:3px solid ${C.accent};background:${C.quoteBg};`,
  ul: `margin:0 0 22px;padding-left:24px;list-style-type:disc;`,
  ol: `margin:0 0 22px;padding-left:24px;list-style-type:decimal;`,
  li: `${FF}margin:0 0 8px;font-size:16px;line-height:1.8;color:${C.text};letter-spacing:.4px;word-break:break-word;`,
  hr: `margin:34px 0;border:0;border-top:1px solid #e8e8e8;`,
  pre: `margin:0 0 22px;padding:15px 16px;background:${C.codeBg};border:1px solid ${C.codeBorder};border-radius:6px;overflow-x:auto;`,
  codeInPre: `font-family:Consolas,Monaco,Menlo,'Courier New',monospace;font-size:13px;line-height:1.7;color:${C.codeText};white-space:pre-wrap;word-break:break-word;background:none;padding:0;`,
  code: `margin:0 2px;padding:2px 5px;background:#f2f3f5;color:#c7254e;border-radius:3px;font-family:Consolas,Monaco,Menlo,'Courier New',monospace;font-size:14px;word-break:break-all;`,
  a: `color:${C.accent};text-decoration:none;border-bottom:1px solid rgba(43,108,176,.35);word-break:break-all;`,
  img: `max-width:100%;height:auto;border-radius:4px;`,
  strong: `font-weight:bold;color:${C.title};`,
  em: `font-style:italic;`,
  table: `width:100%;margin:0 0 22px;border-collapse:collapse;font-size:14px;`,
  th: `${FF}padding:9px 10px;border:1px solid ${C.codeBorder};background:${C.codeBg};font-weight:bold;color:${C.title};text-align:left;line-height:1.6;`,
  td: `${FF}padding:9px 10px;border:1px solid ${C.codeBorder};color:${C.text};line-height:1.6;`,
};

/* ------------------------------------------------------------------ *
 * 二、Markdown -> 公众号 HTML
 *
 * 版本约定：本项目 node_modules 里的 marked 是 4.3.0（hexo-renderer-marked 的
 * 传递依赖）。4.x 没有 Marked 类，renderer 收到的是「已渲染好的字符串」而不是
 * token（token 版签名是 marked 13+ 才有），所以这里按 4.x 的签名实现。
 *
 * 隔离方式：自己 new 一个 Renderer + 每次新的 options。
 * 不能用 marked.use()——那动的是全局单例，会把自定义 renderer 注入
 * hexo-renderer-marked 共用的实例，hexo g 会直接崩（读不到 hexo.config）。
 * ------------------------------------------------------------------ */

const MD_OPTIONS = { gfm: true, breaks: false };

const renderer = new Renderer();

renderer.heading = function (text, level) {
  const s = STYLE['h' + Math.min(level, 4)]; // h5/h6 借用 h4 的样式
  return `<h${level} style="${s}">${text}</h${level}>\n`;
};

renderer.paragraph = function (text) {
  // 纯图片段落：剥掉外层 p，公众号里图片单独成段更干净
  if (/^<img\b[^>]*>$/.test(text.trim())) return text + '\n';
  return `<p style="${STYLE.p}">${text}</p>\n`;
};

renderer.blockquote = function (quote) {
  // 引用块的子节点在本函数之前就已渲染完毕，没法像 token 版那样用状态变量，
  // 只能在这里把内部段落样式换掉，收紧引用块内的行距。
  const inner = quote.split(`style="${STYLE.p}"`).join(`style="${STYLE.pInQuote}"`);
  return `<blockquote style="${STYLE.blockquote}">${inner}</blockquote>\n`;
};

renderer.list = function (body, ordered, start) {
  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  return `<${tag}${startAttr} style="${ordered ? STYLE.ol : STYLE.ul}">${body}</${tag}>\n`;
};

renderer.listitem = function (text) {
  // 松散列表项内部的段落收紧，避免间距过大
  const inner = text.trim().split(`style="${STYLE.p}"`).join(`style="${STYLE.pInList}"`);
  return `<li style="${STYLE.li}">${inner}</li>\n`;
};

renderer.hr = function () {
  return `<hr style="${STYLE.hr}">\n`;
};

renderer.link = function (href, title, text) {
  const t = title ? ` title="${escapeAttr(title)}"` : '';
  return `<a href="${normalizeUrl(href)}"${t} style="${STYLE.a}">${text}</a>`;
};

renderer.image = function (href, title, text) {
  const t = title ? ` title="${escapeAttr(title)}"` : '';
  const alt = text ? ` alt="${escapeAttr(text)}"` : '';
  return `<img src="${normalizeUrl(href)}"${alt}${t} style="${STYLE.img}">`;
};

renderer.strong = function (text) {
  return `<strong style="${STYLE.strong}">${text}</strong>`;
};

renderer.em = function (text) {
  return `<em style="${STYLE.em}">${text}</em>`;
};

/** Markdown -> HTML。每次都用全新的 options，避免污染 marked 的全局 defaults */
function markdownToHtml(md) {
  const options = Object.assign({}, MD_OPTIONS, { renderer });
  return Parser.parse(Lexer.lex(md, options), options);
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 站内相对路径补成绝对地址，否则粘到公众号后图片/链接会失效 */
function normalizeUrl(url) {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || /^(data|mailto|tel):/i.test(url)) return url;
  return SITE + (url.startsWith('/') ? url : '/' + url);
}

/** hexo 的 post.raw 会带上开头的 front-matter，渲染前必须剥掉 */
function stripFrontMatter(md) {
  return String(md).replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '');
}

function renderArticle(md) {
  // 去掉 front-matter、hexo 摘要标记
  const cleaned = stripFrontMatter(md)
    .replace(/<!--\s*more\s*-->/gi, '')
    .replace(/\n{3,}/g, '\n\n');

  let html = markdownToHtml(cleaned);

  // 代码块：marked 已做好转义，这里只负责套样式
  html = html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (_m, body) => {
    return `<pre style="${STYLE.pre}"><code style="${STYLE.codeInPre}">${body}</code></pre>`;
  });
  // 行内代码
  html = html.replace(/<code>/g, `<code style="${STYLE.code}">`);
  // 表格（markdown 语法生成的标签，不会与手写 HTML 冲突）
  // 注意 <th 的正则必须限定后接空白或 >，否则会误伤 <thead>
  html = html
    .replace(/<table(\s[^>]*)?>/g, (_m, a) => `<table style="${STYLE.table}"${a || ''}>`)
    .replace(/<th(\s[^>]*)?>/g, (_m, a) => `<th style="${STYLE.th}"${a || ''}>`)
    .replace(/<td(\s[^>]*)?>/g, (_m, a) => `<td style="${STYLE.td}"${a || ''}>`);
  // 手写 <img> 补上宽度约束；markdown 图片已经由 renderer 带过样式，不再重复拼一次
  html = html.replace(/<img\b([^>]*)>/g, (m, attrs) => {
    const style = /style="([^"]*)"/.exec(m);
    if (!style) return `<img${attrs} style="${STYLE.img}">`;
    if (style[1].indexOf(STYLE.img) === 0) return m;
    return m.replace(/style="[^"]*"/, `style="${STYLE.img}${style[1]}"`);
  });

  return html.trim();
}

/* ------------------------------------------------------------------ *
 * 三、复制页与索引页模板
 * ------------------------------------------------------------------ */

const PAGE_CSS = [
  '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}',
  'html,body{margin:0;padding:0}',
  "body{background:#eef0f3;font-family:" + FONT_STACK + ";padding-bottom:96px}",
  '.top{background:#fff;border-bottom:1px solid #e6e8eb;padding:16px 18px}',
  '.top .dt{font-size:12px;color:#9aa3ad;margin-bottom:6px}',
  '.top h1{margin:0 0 10px;font-size:17px;line-height:1.5;color:#111}',
  '.top .tip{margin:0;font-size:12px;line-height:1.75;color:#8a929b}',
  '.paper{max-width:680px;margin:0 auto;background:#fff;padding:24px 20px 34px;min-height:60vh}',
  '@media(min-width:700px){.paper{margin:18px auto;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}}',
  '#doc{-webkit-user-select:text;user-select:text}',
  '.bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;gap:10px;max-width:680px;margin:0 auto;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);border-top:1px solid #e6e8eb}',
  '.btn{padding:12px 16px;border:1px solid #d8dde3;border-radius:8px;background:#fff;color:#333;font-size:14px;cursor:pointer}',
  '.btn.main{flex:1;border-color:#07c160;background:#07c160;color:#fff;font-weight:bold;font-size:15px}',
  '.btn:active{opacity:.72}',
  '.toast{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:30;display:none;max-width:88vw;padding:10px 14px;border-radius:8px;background:rgba(0,0,0,.84);color:#fff;font-size:13px;line-height:1.6}',
  '.back{display:inline-block;margin-top:10px;font-size:12px;color:#2b6cb0;text-decoration:none}',
].join('');

const PAGE_JS = [
  "var doc=document.getElementById('doc');",
  "function toast(m,ms){var t=document.getElementById('toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(function(){t.style.display='none'},ms||3600);}",
  "function flash(b,txt){var o=b.getAttribute('data-label')||b.textContent;b.setAttribute('data-label',o);b.textContent=txt;setTimeout(function(){b.textContent=o;},1800);}",
  "function legacy(){try{var r=document.createRange();r.selectNodeContents(doc);var s=window.getSelection();s.removeAllRanges();s.addRange(r);var ok=document.execCommand('copy');s.removeAllRanges();return ok;}catch(e){return false;}}",
  "function ok(b,txt){flash(b,txt);}",
  "function fail(){toast('自动复制失败：请长按正文，选择「全选」后再点「复制」');}",
  "function copyAll(b){",
  "  var html=doc.innerHTML,text=doc.innerText;",
  "  if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){",
  "    try{navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]).then(function(){ok(b,'已复制 ✓');},function(){legacy()?ok(b,'已复制 ✓'):fail();});return;}catch(e){}",
  "  }",
  "  legacy()?ok(b,'已复制 ✓'):fail();",
  "}",
  "function copyTitle(b){",
  "  var t=b.getAttribute('data-title');",
  "  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){ok(b,'已复制 ✓');},function(){toast('复制失败，请手动选择标题复制');});}",
  "  else{toast('当前浏览器不支持自动复制，请手动选择标题复制');}",
  "}",
  "document.getElementById('btnCopy').addEventListener('click',function(){copyAll(this);});",
  "document.getElementById('btnTitle').addEventListener('click',function(){copyTitle(this);});",
].join('\n');

function page({ title, date, words, body }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${escapeAttr(title)} · 公众号复制</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="top">
  <div class="dt">${date} · 约 ${words} 字</div>
  <h1>${escapeAttr(title)}</h1>
  <p class="tip">点底部「复制全文」→ 打开微信「订阅号助手」或公众号 → 新建图文 → 长按粘贴。<br>标题请用左侧「复制标题」单独复制（公众号标题是单独字段）。<br>未认证公众号的正文站外链接不可点击，重要链接建议放进「阅读原文」。</p>
  <a class="back" href="./">← 返回文章列表</a>
</header>
<main class="paper"><div id="doc">${body}</div></main>
<div class="toast" id="toast"></div>
<div class="bar">
  <button class="btn" id="btnTitle" data-title="${escapeAttr(title)}">复制标题</button>
  <button class="btn main" id="btnCopy">复制全文</button>
</div>
<script>${PAGE_JS}</script>
</body>
</html>`;
}

function indexPage(items) {
  const byYear = new Map();
  for (const it of items) {
    const y = it.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(it);
  }
  const groups = [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => {
      const rows = list
        .map(
          (it) =>
            `<li data-k="${escapeAttr((it.title + ' ' + it.slug).toLowerCase())}">` +
            `<a href="./${it.slug}.html"><span class="t">${escapeAttr(it.title)}</span>` +
            `<span class="d">${it.date.slice(5)}</span></a></li>`
        )
        .join('');
      return `<h2>${year}<em>${list.length}</em></h2><ul class="list">${rows}</ul>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>公众号复制页 · 听雪楼</title>
<style>${PAGE_CSS}
.wrap{max-width:680px;margin:0 auto;padding:0 0 40px}
.search{padding:12px 18px 6px;background:#fff;border-bottom:1px solid #e6e8eb;position:sticky;top:0;z-index:5}
.search input{width:100%;padding:11px 13px;border:1px solid #d8dde3;border-radius:8px;font-size:15px;outline:none}
h2{margin:26px 18px 10px;font-size:14px;color:#9aa3ad;font-weight:normal}
h2 em{margin-left:6px;font-style:normal;color:#c3c9d0}
.list{margin:0 18px;padding:0;list-style:none}
.list li{border-bottom:1px solid #eef0f3}
.list a{display:flex;align-items:center;gap:10px;padding:13px 2px;text-decoration:none;color:#222;font-size:15px;line-height:1.5}
.list .t{flex:1}
.list .d{color:#b6bdc6;font-size:12px;flex:0 0 auto}
.empty{display:none;margin:40px 18px;color:#9aa3ad;font-size:14px;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <div class="top" style="border-bottom:0">
    <h1 style="margin-bottom:6px">公众号复制页</h1>
    <p class="tip">共 ${items.length} 篇。点进去 → 复制全文 → 粘到公众号编辑器。带 <b>wechat: false</b> 的文章不在此列。</p>
  </div>
  <div class="search"><input id="q" type="search" placeholder="搜索标题…" autocomplete="off"></div>
  ${groups}
  <div class="empty" id="empty">没有匹配的文章</div>
</div>
<script>
var q=document.getElementById('q'),empty=document.getElementById('empty');
q.addEventListener('input',function(){
  var k=this.value.trim().toLowerCase(),shown=0;
  document.querySelectorAll('.list li').forEach(function(li){
    var hit=!k||li.getAttribute('data-k').indexOf(k)>-1;
    li.style.display=hit?'':'none'; if(hit)shown++;
  });
  document.querySelectorAll('h2').forEach(function(h){
    var ul=h.nextElementSibling,any=false;
    if(ul){ul.querySelectorAll('li').forEach(function(li){if(li.style.display!=='none')any=true;});}
    h.style.display=any?'':'none';
  });
  empty.style.display=shown?'none':'block';
});
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * 四、注册 Hexo 生成器：hexo g / hexo d 时自动产出
 * ------------------------------------------------------------------ */

function slugOf(post) {
  return String(post.slug || post.path || post.title || 'post')
    .replace(/[\\/]+/g, '-')
    .replace(/[^\w.\-\u4e00-\u9fa5]/g, '')
    .replace(/^-+|-+$/g, '') || 'post';
}

hexo.extend.generator.register('wechat_copy_pages', function (locals) {
  const posts = locals.posts.sort('-date').toArray();
  const items = [];
  const used = new Map();

  for (const post of posts) {
    if (!post.raw) continue;
    if (post.password) continue; // 加密文章不生成
    if (post.wechat === false) continue; // front-matter 显式排除

    let slug = slugOf(post);
    if (used.has(slug)) {
      const n = used.get(slug) + 1;
      used.set(slug, n);
      slug = `${slug}-${n}`;
    } else {
      used.set(slug, 0);
    }

    const date = post.date ? post.date.format('YYYY-MM-DD') : '';
    const words = String(post.raw).replace(/\s/g, '').length;
    const body = renderArticle(post.raw);

    items.push({
      slug,
      title: post.title || slug,
      date,
      words,
      body,
    });
  }

  const pages = items.map((it) => ({
    path: `wechat/${it.slug}.html`,
    data: page(it),
  }));
  pages.push({ path: 'wechat/index.html', data: indexPage(items) });
  return pages;
});
