# Rangeset 首屏 JS 审计

比较基线为发布版 `b334917` 对应的本地代码。最终三个页面分别为 635,998 B、635,998 B 和 623,364 B。350 KB 目标未达到。

同版本 Next.js 16.4.6、React 19.3.0 和 Turbopack 的空白 App Router 页面首屏引用 5 个现代浏览器脚本，共 457,222 B，排除了 `nomodule` polyfill。应用层修改可以继续降低体积，当前这套客户端运行时已有 457,222 B 的空白构建实测。

## 页面测量

| 页面 | 解码后 JS · 改前 | 解码后 JS · 改后 | 减少 | Mobile LCP · 改前 | Mobile LCP · 改后 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/zh/products` | 666,519 B | 635,998 B | 30,521 B | 0.759 s | 0.797 s |
| `/zh/products/category/hardshell-jackets` | 666,519 B | 635,998 B | 30,521 B | 0.903 s | 0.903 s |
| `/zh/products/arcteryx-womens-ifora-jacket-9524-x000009524` | 659,728 B | 623,364 B | 36,364 B | 3.238 s | 3.148 s |

JS 在本地生产构建上用全新 390px 页面加载，统计 network idle 后同源 JS 资源的去重 `decodedBodySize`。这轮 JS 测量屏蔽图片和字体。Lighthouse 13.6.0 使用默认移动端模拟节流，保留图片和字体请求，每页改前和改后各测一次。LCP 为实验室单次读数，商品图仍经过外部 CDN。两轮均加载同一份本地商品数据。

## 逐项测量

| 改动 | 目录 · 改前 → 改后 B | 硬壳分类 · 改前 → 改后 B | 详情 · 改前 → 改后 B |
| --- | ---: | ---: | ---: |
| 客户端对比链接改为纯路径模块 | 666,519 → 664,740 | 666,519 → 664,740 | 659,728 → 657,949 |
| 详情参数表改为服务端渲染 | 664,740 → 664,776 | 664,740 → 664,776 | 657,949 → 652,853 |
| 只注入当前语言与页面范围的消息 | 664,776 → 664,776 | 664,776 → 664,776 | 652,853 → 652,853 |
| 首批商品卡片改为服务端渲染，缩小交互依赖 | 664,776 → 666,972 | 664,776 → 666,972 | 652,853 → 629,728 |
| 对比选择栏及商品挑选弹层按需加载 | 666,972 → 662,113 | 666,972 → 662,113 | 629,728 → 632,634 |
| 品牌 CDN 原图使用原生图片元素 | 662,113 → 647,149 | 662,113 → 647,149 | 632,634 → 617,746 |
| 筛选、搜索及排序的计算模块按需加载 | 647,149 → 646,062 | 647,149 → 646,062 | 617,746 → 617,746 |
| 收窄首批卡片传给对比按钮的数据，补齐对比说明消息 | 646,062 → 646,062 | 646,062 → 646,062 | 617,746 → 617,746 |
| 以术语表生成的参数反查表替代整份英语字典 | 646,062 → 635,998 | 646,062 → 635,998 | 617,746 → 623,364 |

部分步骤的单页 JS 略增，构建器会重新划分共享块。只注入页面消息的步骤未改变上表 JS，但单步未压缩 HTML 分别从 226,664 B、224,871 B、106,546 B 降至 213,854 B、212,104 B、88,004 B。旧根布局下发的是当前语言的整份消息。中文目录另外通过参数格式化模块加载了整份英语字典，三份完整字典同时进入首屏的情况没有复现。现在页面级消息保持当前语言，参数反查表只包含旧数据文本匹配所需的术语。

筛选控件本身首屏可用，首次查询或翻页后再加载计算与结果卡片。图标继续使用已有的具名导入，没有发现完整图标库进入常规 Turbopack 首屏。图库仍使用相同品牌 CDN URL、裁切与加载优先顺序。

## 基线模块前十

`ANALYZE=true pnpm build --webpack` 将 `@next/bundle-analyzer` 的报告写入 `.next/analyze/client.json`。下表按页面的客户端引用清单和共享入口选择 Webpack 块，按模块 parsedSize 排序。Webpack 依赖树和常规 Turbopack 构建不同。Turbopack 的模块估计及浏览器实际下载量分别独立测得。Webpack 清单可能包含可渲染但本次浏览器没下载的块。

### Webpack · 改前

| 排名 | 目录 | 硬壳分类 | 详情 |
| ---: | --- | --- | --- |
| 1 | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B |
| 2 | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B |
| 3 | `@formatjs/icu-messageformat-parser/index.js` 23,287 B | `@formatjs/icu-messageformat-parser/index.js` 23,287 B | `@formatjs/icu-messageformat-parser/index.js` 23,287 B |
| 4 | `html-entities/dist/esm/named-references.js` 21,261 B | `html-entities/dist/esm/named-references.js` 21,261 B | `html-entities/dist/esm/named-references.js` 21,261 B |
| 5 | `@radix-ui/react-select/dist/index.mjs` 20,844 B | `@radix-ui/react-select/dist/index.mjs` 20,844 B | `@radix-ui/react-select/dist/index.mjs` 20,844 B |
| 6 | `next/dist/client/components/segment-cache/cache.js` 19,984 B | `next/dist/client/components/segment-cache/cache.js` 19,984 B | `next/dist/client/components/segment-cache/cache.js` 19,984 B |
| 7 | `cn/dist/engine.js` 17,668 B | `cn/dist/engine.js` 17,668 B | `cn/dist/engine.js` 17,668 B |
| 8 | `i18n/copy.ts + 1 modules (concatenated)/messages/en.json` 15,828 B | `i18n/copy.ts + 1 modules (concatenated)/messages/en.json` 15,828 B | `i18n/copy.ts + 1 modules (concatenated)/messages/en.json` 15,828 B |
| 9 | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B |
| 10 | `@radix-ui/react-menu/dist/index.mjs` 14,024 B | `@radix-ui/react-menu/dist/index.mjs` 14,024 B | `@radix-ui/react-menu/dist/index.mjs` 14,024 B |

### Webpack · 改后

| 排名 | 目录 | 硬壳分类 | 详情 |
| ---: | --- | --- | --- |
| 1 | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,636 B |
| 2 | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B | `next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` 24,154 B |
| 3 | `@formatjs/icu-messageformat-parser/index.js` 23,287 B | `@formatjs/icu-messageformat-parser/index.js` 23,287 B | `@formatjs/icu-messageformat-parser/index.js` 23,287 B |
| 4 | `html-entities/dist/esm/named-references.js` 21,261 B | `html-entities/dist/esm/named-references.js` 21,261 B | `html-entities/dist/esm/named-references.js` 21,261 B |
| 5 | `@radix-ui/react-select/dist/index.mjs` 20,840 B | `@radix-ui/react-select/dist/index.mjs` 20,840 B | `@radix-ui/react-select/dist/index.mjs` 20,840 B |
| 6 | `next/dist/client/components/segment-cache/cache.js` 19,982 B | `next/dist/client/components/segment-cache/cache.js` 19,982 B | `next/dist/client/components/segment-cache/cache.js` 19,982 B |
| 7 | `cn/dist/engine.js` 17,668 B | `cn/dist/engine.js` 17,668 B | `cn/dist/engine.js` 17,668 B |
| 8 | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B | `@radix-ui/react-navigation-menu/dist/index.mjs` 14,509 B |
| 9 | `@radix-ui/react-menu/dist/index.mjs` 14,021 B | `@radix-ui/react-menu/dist/index.mjs` 14,021 B | `@radix-ui/react-menu/dist/index.mjs` 14,021 B |
| 10 | `next/dist/client/components/segment-cache/scheduler.js` 13,999 B | `next/dist/client/components/segment-cache/scheduler.js` 13,999 B | `next/dist/client/components/segment-cache/scheduler.js` 13,999 B |

### Turbopack · 改前

| 排名 | 目录 | 硬壳分类 | 详情 |
| ---: | --- | --- | --- |
| 1 | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B |
| 2 | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B |
| 3 | `html-entities/dist/esm/named-references.js` 21,202 B | `html-entities/dist/esm/named-references.js` 21,202 B | `html-entities/dist/esm/named-references.js` 21,202 B |
| 4 | `next/dist/client/components/segment-cache/cache.js` 20,062 B | `next/dist/client/components/segment-cache/cache.js` 20,062 B | `next/dist/client/components/segment-cache/cache.js` 20,062 B |
| 5 | `@formatjs/icu-messageformat-parser/index.js` 19,827 B | `@formatjs/icu-messageformat-parser/index.js` 19,827 B | `@formatjs/icu-messageformat-parser/index.js` 19,827 B |
| 6 | `messages/en.json.[json].cjs` 18,614 B | `messages/en.json.[json].cjs` 18,614 B | `messages/en.json.[json].cjs` 18,614 B |
| 7 | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B |
| 8 | `cn/dist/engine.js` 13,733 B | `cn/dist/engine.js` 13,733 B | `cn/dist/engine.js` 13,733 B |
| 9 | `lib/parameters/registry.ts` 12,275 B | `lib/parameters/registry.ts` 12,275 B | `lib/parameters/registry.ts` 12,275 B |
| 10 | `cn/dist/tables.js` 11,863 B | `cn/dist/tables.js` 11,863 B | `cn/dist/tables.js` 11,863 B |

### Turbopack · 改后

| 排名 | 目录 | 硬壳分类 | 详情 |
| ---: | --- | --- | --- |
| 1 | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` 203,369 B |
| 2 | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B | `next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js` 24,066 B |
| 3 | `html-entities/dist/esm/named-references.js` 21,202 B | `html-entities/dist/esm/named-references.js` 21,202 B | `html-entities/dist/esm/named-references.js` 21,202 B |
| 4 | `next/dist/client/components/segment-cache/cache.js` 20,062 B | `next/dist/client/components/segment-cache/cache.js` 20,062 B | `next/dist/client/components/segment-cache/cache.js` 20,062 B |
| 5 | `@formatjs/icu-messageformat-parser/index.js` 19,837 B | `@formatjs/icu-messageformat-parser/index.js` 19,837 B | `@formatjs/icu-messageformat-parser/index.js` 19,837 B |
| 6 | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B | `next/dist/client/components/segment-cache/scheduler.js` 14,024 B |
| 7 | `cn/dist/engine.js` 13,552 B | `cn/dist/engine.js` 13,552 B | `cn/dist/engine.js` 13,552 B |
| 8 | `lib/parameters/registry.ts` 12,034 B | `lib/parameters/registry.ts` 12,034 B | `lib/parameters/registry.ts` 12,034 B |
| 9 | `cn/dist/tables.js` 11,857 B | `cn/dist/tables.js` 11,857 B | `cn/dist/tables.js` 11,857 B |
| 10 | `next/dist/client/components/render-tree.js` 9,947 B | `next/dist/client/components/render-tree.js` 9,947 B | `next/dist/client/components/render-tree.js` 9,947 B |

## 核验

- `pnpm lint`、`pnpm i18n-check`、`pnpm build` 均通过。集成测试指向本地 PostgreSQL 和生产模式站点，89 个测试全部通过，0 跳过。
- Chromium 390px 检查了三语目录、默认排序、款号搜索、加载更多、对比选择栏、两款对比、商品挑选弹层聚焦和 Escape 关闭、排序帮助 hover 和 Escape，以及 Ifora 图库首图。未捕获页面异常或消息缺失错误。
- 所有改动留在工作区。
