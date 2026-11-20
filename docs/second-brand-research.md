# Rangeset 第二个品牌选型（2026-11-21，北京时间）

## 结论
**第一推荐：Mammut（猛犸象）。** 备选第二是 Rab，第三是 Montbell。ACRONYM 适合以后作为"城市机能"补充，不适合当第二个品牌。

| 排名 | 品牌 | 一句话理由 |
|---|---|---|
| 1 | **Mammut** | 卡片 4 项在官网都是结构化表格，robots 允许抓取，有分地区 sitemap 且含美国站，美元定价；在中国是始祖鸟最直接的对标品牌（"鸟 vs 象"） |
| 2 | Rab | 参数最"诚实"：重量注明尺码（Size M），防水 mm、透湿 MVTR、面料克重都有；但官网没有纤维成分 %，卡片会缺"成分" |
| 3 | Montbell | 日本受众最强；商品页内嵌 JSON（weight_g 等字段），美国站有美元价；但版型不按 Regular/Slim 标注，成分写在面料描述里，列表页靠 JS 渲染 |
| 备选 | Outdoor Research | Shopify 站，抓取最容易，参数齐（重量、Standard Fit、面料+D 数+成分）；但在中日受众里声量低 |
| 以后 | ACRONYM | 机能风最对口，重量注明尺码、版型、成分都有；但当季只有约 47 个款号，只标欧元价 |

## 怎么测的
- 每个品牌：先读 robots.txt，再读 sitemap，然后抽查商品页（硬壳 + 保暖夹克）。
- 每个站点最多发几次请求，间隔 1.5 秒，用普通浏览器 UA，UA 里不含 rangeset 也不含任何网址。遇到 403、429 或人机验证页就停，不绕过。
- 只读服务端返回的 HTML 和 JSON-LD，没调任何内部接口。
- 注意：请求从数据中心 IP 发出（Cloudflare 节点显示 IAD）。从你 Mac 上访问，结果可能不同。

## 逐品牌证据

### 1. Mammut ✅ 推荐
- **robots**：`User-Agent: * Allow: /`，只禁了 cart、checkout、search、account 和筛选路径；声明了 `Sitemap: https://www.mammut.com/sitemap.xml`。
  - https://www.mammut.com/robots.txt
- **sitemap**：分地区，含 `/us/en/sitemap.xml`，有 880 个 /products/ 链接，其中按关键词粗筛约 421 个是服装（含鞋和装备，需要过滤）。服务器是 Netlify，没遇到 WAF。
- **抽查 4 页，参数都在 SSR 的 HTML 规格表里**，字段名固定：Cut、Weight、Main material (Denier)、Main material、Lining、Water column、Breathability、Fill power。
  - Eiger Free Pro HS（硬壳）：Cut Snow Sports Regular；Water column 28000 mm；Main material (Denier) 80Dx80D；Breathability RET<13；Weight 785 g；各区域成分 %（如 Lining 2：10% Spandex, 90% Polyamide (recycled)）。
    - https://www.mammut.com/us/en/products/1010-33030/eiger-free-pro-hs-hooded-jacket-men
  - Crater Pro HS（女款硬壳）：Cut Regular Fit；28000 mm；80Dx80D；RET<13；Weight 458 g。
    - https://www.mammut.com/us/en/products/1010-31690/crater-pro-hs-hooded-jacket-women
  - Broad Peak IN Hooded（羽绒）：Cut Regular Fit；20Dx20D；Weight 383 g；Fill power 800 cuin；填充 90% 灰鹅绒/10% 羽毛；Main material 100% Polyamide (recycled)；充绒量 115 g。
    - https://www.mammut.com/us/en/products/1013-02962/broad-peak-in-hooded-jacket-men
  - Taiss ML Jacket（女款抓绒）：Cut Athletic Fit；Weight 290 g；Main material 92% Polyester (recycled), 8% Spandex。
    - https://www.mammut.com/us/en/products/1014-07270/taiss-ml-jacket-women
  - JSON-LD 有 Product、IndividualProduct、AggregateOffer，priceCurrency 是 USD。
- **对应 rangeset 卡片 4 项**：重量 ✔，版型 ✔（Cut），成分 ✔（分区域，跟 v1.3.0 的 Body/Lining 分区对得上），主面料：D 数是结构化的，面料名（GORE-TEX Pro、Pertex Quantum）只在描述正文里。
- **加分项**：防水 mm、RET、蓬松度都是结构化字段，以后做筛选可以直接用。
- **受众**：
  - 中文社区里一直是"鸟 vs 象"的对比（什么值得买：Crater IV 对 Beta AR 同价位、"硬壳始祖鸟，软壳猛犸象"）。
    - https://post.smzdm.com/p/a82xgpv0/
    - https://post.smzdm.com/p/aqrprd4v/
  - 2026 年 7 月 30 日，中国资管机构 CPE 源峰签约收购 Mammut，明确要加速亚洲和中国市场。
    - https://pr.mammut.com/mammut-continues-to-accelerate-growth-with-its-new-partner-cpe
    - https://eu.36kr.com/en/p/3918951831023238
- **风险**：
  - 重量没注明是哪个尺码（只有 Rab 和 Mountain Hardwear 注明），只能显示"官方重量"。
  - 主面料名需要从描述里解析，要设"不猜"规则。
  - sitemap 混着鞋和装备，要按品类过滤（rangeset 不收鞋）。
  - Cut 有 "Snow Sports Regular" 这类变体，要加进版型映射表。
  - 美国站价格偏低，在打折（页面上能看到 Black Friday 横幅），要区分原价和折扣价。

### 2. Rab
- **robots**：允许商品页；禁了 catalogsearch、checkout、`?filter` 等。robots 里没声明 sitemap，访问 /sitemap.xml 返回的不是 XML（拿到的是一个图片文件），所以要从分类页发现商品。
  - https://rab.equipment/robots.txt
- **抽查**：
  - Kinetic Alpine Stretch Waterproof：Fit: Regular；Weight 18.3oz / 519g (Size M)；Hydrostatic head 30,000mm；MVTR 25,000g/m²/24h；Main fabric Pertex Shield Air 3L（140gsm）；有款号 QWI-73。
    - https://rab.equipment/us/mens-kinetic-alpine-stretch-waterproof-jacket
  - Microlight Down：Fit: Regular；373g (Size M)；700FP 回收羽绒（126g，Size M）；Main fabric 30D Pertex Quantum（43g/m²）。
    - https://rab.equipment/us/mens-microlight-down-jacket
  - JSON-LD 有 Product、ProductGroup，USD 定价。
- **优点**：主面料名是单独的字段；重量注明尺码。
- **缺点**：没有纤维成分 %，只在 "Material Facts" 里有回收含量 %（如 Outer 56%）。卡片上"成分"大概率显示 —。
- **未核实**：服装总数。分类页是 JS 渲染的，我没去抓接口。

### 3. Montbell
- **robots**：montbell.com/robots.txt 返回 404 的 HTML 页面，也就是没有限制规则。en.montbell.jp 已经 301 跳转到 montbell.com/jp/en。
- **抽查**：Storm Cruiser Jacket（美国站 2328321）。页面内嵌 JSON，有 `"weight_g":"284 g","weight_oz":"10 oz","total_weight_g":"296 g"`。规格表 Material 一栏：3L DRYTEC 30D Ballistic nylon、透湿 40,000 g/m²/24h（JIS L-1099 B-1）、耐水压 20,000mm 以上。Western Size 和 Asian Size 重量不同（284 g 对 254 g）。美国站价格 $270。
  - https://www.montbell.com/us/en/products/detail/2328321
  - https://www.montbell.com/us/en/contents/394
- **缺点**：
  - 没有 Regular/Slim 这类版型字段，只区分亚洲码和欧美码。
  - 成分没有单列。
  - 列表页（products/list?c=10）是 JS 渲染的，要靠商品 ID 发现商品。
- **受众**：日本本土第一梯队，对 /ja 用户价值最大。

### 备选：Outdoor Research
- robots 是标准 Shopify 配置，允许抓取，sitemap 里有约 506 个商品，其中服装约 299 个。
- 抽查 3 页：
  - Foray 3L：Standard Fit；435 g；AscentShell 3L 100% 回收尼龙 40D。
  - SuperStrand LT Hoodie：300 g；12D；VerticalX。
  - Transcendent Down：377 g；800+ 蓬松度；20D 回收尼龙。
  - JSON-LD Product，USD 定价。
- 缺点：没有防水 mm；中日受众里声量低。
- https://www.outdoorresearch.com/products/mens-foray-3l-jacket-322088

### 备选：Black Diamond（服装）
- Shopify，允许抓取。sitemap 约 1,100 个商品，以攀岩装备为主，服装约 360 个（含 past-season）。
- 参数是最"工程化"的一家：
  - Highline Stretch Shell：Fit: Regular；Weight 304 g；BD.dry 40d 3L（100% Nylon Face/Back，136gsm）；20,000mm；20,000 g/m²/24h。
  - Access Down 2.0：360 g；800FP；20d（100% Nylon，43gsm）。
- 缺点：服装线小，城市机能感弱。
- https://blackdiamondequipment.com/products/womens-highline-stretch-shell

### 备选：Mountain Hardwear
- 允许抓取，sitemap 约 587 个商品，其中服装约 451 个。
- 抽查：
  - Boundary Ridge GTX：719 g（注明 "based on size Medium"）；GORE-TEX ePE 75D 3L，100% 回收聚酯。
  - Firefall Insulated：920 g；Dry.Q 150D。
- 缺点：页面上没有版型字段，卡片会缺"版型"。

### Norrøna
- robots 允许抓取，有分地区 sitemap（含 us、jp），products-us 约 369 个，其中服装约 257 个。USD 定价，sitemap 里能看到 FW26/27 这样的季度信息。
- 但抽查的 Lofoten GTX Pro Plus（$1299）和 Trollveggen：服务端 HTML 里 "Materials" 和 "Size and Fit" 标签页是空的，重量和成分都拿不到，需要浏览器渲染才能看到。中国俗称"老人头"，有一定声量。
- https://www.norrona.com/us/en/product/lofoten/lofoten-gore-tex-pro-plus-jacket-men-1004-25

### ACRONYM
- robots 写着 `User-agent: * Allow: /`，同时屏蔽了 Amazonbot、CCBot、ClaudeBot 等 AI 爬虫。我们用的是普通 UA，但要尊重它对 AI 的态度。
- 首页能看到全部历史款号，有 208 个款号链接，当季（FW2526/SS26）约 47 个。
- J98-HL：Fits: LOOSE；Weight 640g（size M，含可拆件）；POLARTEC HIGH LOFT（96% Polyester，4% Elastane）。只标欧元价。
- https://acrnm.com/J98-HL_FW2526

### 被拦截或无法评估（我都停手了，没绕过）
- **The North Face**：robots.txt 直接被 Akamai 返回 403 "Access Denied"。
- **Goldwin**：goldwin.co.jp 的 robots.txt 也是 403，页面写着「セキュリティ対策のためアクセスを制限しています」（出于安全原因限制访问）。
- **Fjällräven**：robots 允许抓取，但读 sitemap 时遇到 Cloudflare "Just a moment..." 人机验证。
- **Patagonia**：robots.txt 和商品页都返回 "System maintenance is in progress"（3.3KB）。可能是维护，也可能是对数据中心 IP 的拦截，未能评估。
- **Haglöfs**：
  - robots 允许抓取，但 sitemap 里只有分类和内容页，没有商品页。
  - /us 和 /en 商品页 curl 都返回 404，而搜索引擎有收录，比如 L.I.M GTX 页面显示 "Weight (g) 270"。
  - 分类页是 JS 渲染的。
  - 品牌在中国有声量，但抓取成本高。

### Veilance
- 已经包含在现有 Arc'teryx 数据里：`lib/arcteryx-view.ts` 的 CatalogCard 有 `veilance: boolean` 字段。veilance.com 也已经 301 跳转到 arcteryx.com/gb/en/lp/veilance。不算新品牌。

## 对比表

"结构化"指固定字段的规格表或 JSON；✔ 有，✗ 没有，~ 部分有或只在正文描述里。

| 品牌 | 重量 | 注明尺码 | 版型 | 主面料名 | 成分% | D 数 | 防水mm | 透湿 | 蓬松度 | 季度 | robots/sitemap | 拦截 | 美元价 | 服装数（约） | 中/日相关 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mammut | ✔ | ✗ | ✔ Cut | ~ 正文 | ✔ 分区 | ✔ | ✔ | ✔ RET | ✔ | ✗ | ✔/✔ | 无 | ✔ | ~420 | 中强、日强* |
| Rab | ✔ | ✔ M | ✔ | ✔ | ✗ | ~ | ✔ | ✔ MVTR | ✔ | ✗ | ✔/✗ | 无 | ✔ | 未核实 | 中 |
| Montbell | ✔ JSON | 欧/亚码 | ✗ | ✔ | ✗ | ✔ | ✔ | ✔ | — | ✗ | 无规则/✗ | 无 | ✔ | 未核实 | 日最强 |
| Outdoor Research | ✔ | ✗ | ✔ | ✔ | ~ | ✔ | ✗ | ✗ | ✔ | ✗ | ✔/✔ | 无 | ✔ | ~299 | 弱 |
| Black Diamond | ✔ | ✗ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ | ✔/✔ | 无 | ✔ | ~360 | 弱 |
| Mountain Hardwear | ✔ | ✔ M | ✗ | ✔ | ✔ | ✔ | ✗ | ✗ | — | ✗ | ✔/✔ | 无 | ✔ | ~451 | 弱 |
| Norrøna | ✗ SSR | — | ~ | ✗ SSR | ✗ SSR | — | — | — | — | ✔ | ✔/✔ | 无 | ✔ | ~257 | 中 |
| ACRONYM | ✔ | ✔ M | ✔ | ✔ | ✔ | ~ | ~ | ~ | — | ✔ URL | ✔/✗ | 无 | ✗ 欧元 | ~47 当季 | 机能圈强 |
| TNF / Goldwin / Fjällräven / Patagonia | — | | | | | | | | | | 403/验证/维护 | **有** | | | |

*Mammut 在日本的热度我没有单独查证。

## 集成成本（只读看了仓库）
- 现在的代码是 Arc'teryx 专用的：`lib/arcteryx-view.ts` 里有 Arc'teryx 的系列表（Beta/Alpha/Atom…）和 veilance 字段。
- 加第二个品牌，需要：
  1. 抽出一个品牌无关的卡片和视图层；
  2. 给 Mammut 写一个 adapter：sitemap，然后 SSR 规格表，再映射到现有的 Evidence 和参数注册表；
  3. 在版型映射表里补 Mammut 的 Cut 取值；
  4. 按品类过滤掉鞋和装备。
- Mammut 的规格表字段名固定，解析起来比 Arc'teryx 简单。
- GitHub 代码搜索没有索引到爬虫代码，建议让 Codex 在本地确认爬虫模块的位置。

## 第一推荐的风险
1. 重量没有参考尺码。卡片照常显示，详情页标注"官方未注明尺码"。
2. 主面料名在正文里，解析不到就显示 —，不猜。
3. 美国站正在促销，价格字段要区分原价和折扣价。
4. 品牌易主（CPE 交割预计在未来几个月内完成），官网结构可能会改版，爬虫要有字段缺失告警。
