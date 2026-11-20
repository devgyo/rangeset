# Rangeset 统一品类体系 v1（研究与方案）

研究时间：2026-11-21（Asia/Shanghai, UTC+8）。数据：Neon `autumn-mouse-66031989` 只读 SELECT；代码：`devgyo/rangeset@main`（02d9b64）。
配套文件：`taxonomy/arcteryx-mapping.csv`（419 款逐条映射）、`taxonomy/map.py`（映射规则脚本）、`taxonomy/gpt-*.txt`（Google 商品分类原文件，三语）。
标记约定：✅ 本次直接抓到原页面/原文件；🔎 只来自搜索引擎摘要或第三方转载，未直接核对原页面；❌ 抓取失败。

---

## 0. 结论先行

1. **品类按"东西是什么、靠什么起作用"分，不按活动、不按品牌系列。** 品牌、性别、活动（滑雪/攀登/徒步/通勤）、品牌系列（Veilance、PRO、Beta 家族）全部做筛选维度（facet），不进品类树。这和懂车帝"级别"与"品牌"分开筛选是同一个思路。
2. **两层，叶子互斥。** 一级按穿着部位/大类（外套、抓绒与中间层、上衣、贴身层、下装、连衣裙与连体服、背包、配件、鞋），二级只在真正需要比参数的地方细分（外套 8 个、下装 7 个）。共 9 个一级、27 个叶子（其中配件 4、鞋 5 为预留）。
3. **外套二级按"防护/保暖机理"分**：硬壳、保暖硬壳、羽绒、棉服（化纤保暖）、软壳、防风、大衣与西装、背心马甲。这是抖店/淘宝（冲锋衣裤/软壳衣裤/抓绒衣裤/羽绒服/保暖棉服）、Montbell、好日山荘、Arc'teryx、Rab、Patagonia、REI 的共同交集。
4. **判定靠品牌公开的硬证据**（防水膜标签、填充类型、品牌自己的 Softshell/Windshell 声明），按固定优先级走规则；证据冲突或缺失就进 `needs_review`，不猜。
5. **Arc'teryx 实测：419 款（不含已下线的 34 双鞋）中 407 款（97.1%）按规则自动归类，12 款待复核。** 关键发现：Arc'teryx 的 "Shell Jackets" 113 款里只有 55 款是真正的硬壳，其余是软壳 31、防风 15、大衣西装 5、背心 1、待复核 6——直接沿用品牌分类会把 Gamma（软壳）和 Beta（硬壳）放在一起比。
6. 卡片 4 格（重量、版型、主面料、成分）不受品类影响，保持全站统一。

---

## 1. 研究发现

### 1.1 平台 / 标准的分类方式

| 平台/标准 | 户外服装是怎么分的 | 分类依据 | 来源 |
|---|---|---|---|
| 抖音电商（抖店） | 户外/登山/野营/旅行用品 > 户外服装 > 冲锋衣裤（冲锋衣/冲锋裤/套装）、软壳衣裤、抓绒衣裤、羽绒服（含羽绒裤）、保暖棉服（棉衣/棉裤）、速干衣裤（T恤/背心/衬衣/裤）、功能内衣内裤、户外休闲衣裤、滑雪服、防晒衣…；户外鞋靴另列 | **功能/面料机理为主**，只有"滑雪服""防晒衣"是活动/用途 | ✅ 抖店开放平台《尺码和类目对账表》https://op.jinritemai.com/docs/guide-docs/242 （类目 ID：一级 20026、户外服装 20529、冲锋衣裤 24674、软壳衣裤 24676、抓绒衣裤 24675；文档 2022-06-30 更新，注明"类目会有更新"） |
| 淘宝/天猫 | 户外/登山/野营/旅行用品（50013886）> 户外服装：防晒衣、冲锋衣裤、羽绒服、抓绒衣裤、户外休闲衣裤、速干衣裤、功能内衣内裤、其他户外服装、防晒裤、保暖棉服、软壳衣裤 | 与抖店几乎同构（功能为主） | 🔎 第三方整理 https://www.tiaowola.com/media/huwai.html ；✅ 冲锋衣裤类目页 https://www.taobao.com/list/category/50448011.htm （商品标题大量出现"三合一""硬壳""羽绒冲锋衣"） |
| 京东 | 平台级类目页未能抓取（list.jd.com 返回空壳）。店铺级导航：骆驼自营店"冲锋衣/软壳衣、抓绒衣、皮肤衣/防晒衣、速干T恤、羽绒服/棉服、功能内衣；户外下装：速干裤/休闲裤/冲锋裤/软壳裤"，并细分"三合一/单层/硬壳/羽绒冲锋衣"；KOLON 店单列"三合一" | 功能为主；三合一常被单列 | ❌ https://list.jd.com/list.html?cat=1318,2628,12139 ；🔎 https://mall.jd.com/index-1000004021.html 、https://mall.jd.com/view_search-1216484-64094589-99-1-24-1.html |
| 懂车帝（UX 类比） | 选车页"级别"（微型/小型/紧凑/中型/中大型/大型轿车，小型~大型 SUV，MPV…）与"品牌"是两个独立筛选 | 按**物理等级**分类，品牌是维度 | 🔎 搜索摘要（页面反爬，curl 返回空）https://www.dongchedi.com/auto/library/x-0-x-x-x-x-x-x-x-x-x ——需人工打开确认 |
| Google Product Taxonomy（2021-09-21） | Apparel > Clothing > Outerwear > Coats & Jackets(5598)、Vests(1831)、Rain Pants(5514)、Rain Suits(3066)、Snow Pants & Suits(5909)；Pants(204)、Shirts & Tops(212)、Shorts(207)、Skirts(1581)、Skorts(5344)、Dresses(2271)、One-Pieces(5182)、Activewear(5322)；Luggage & Bags > Backpacks(100)；Shoes(187) | **按服装形态**，不区分硬壳/软壳 → 太粗，但可作对外映射（Merchant/结构化数据） | ✅ https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt （另有 zh-CN、ja-JP 版，已存 `taxonomy/gpt-*.txt`） |
| GS1 GPC | Clothing 段 67000000 → Clothing 家族 67010000 → 类：Upper Body Wear/Tops、Lower Body Wear/Bottoms、Full Body Wear、Clothing Accessories；Activewear 等为平行家族。**按服装分，不按穿着者分（无男女之分）** | 按身体部位 | 🔎 https://barcodepedia.com/category/67000000/clothing （第三方对 GPC 2026-05 版的解读；具体 brick 编码未逐一核对） |
| REI | 男夹克"Filter by Categories"：Insulated（Synthetic / Down）、3-in-1、Fleece and Soft-Shell（Fleece / Soft-Shell）、Snow（Downhill Ski / Snowboard / Winter / Backcountry / XC）、Casual、Rain（Multi-Sport / Casual / Ponchos）、Running、Windbreakers、Workout | 功能 + 活动混合，**同一件可进多个类** | 🔎 https://www.rei.com/c/mens-jackets?sort=max-price ；✅ Rain 页对硬壳/软壳的定义 https://www.rei.com/c/mens-rain-jackets |
| Bergfreunde / Alpinetrek | Outdoor jackets 下：Waterproof 561、Fleece 1,009、Wool 353、Softshell 233、Synthetic 509、Casual 401、Down 394、Cycling 381、Winter 785、Windproof 140、Ski 716、3-in-1 107、Running 196、XC ski 84；Vests & gilets 单列 | 功能 + 面料 + 活动 + 季节混合。子类合计 5,869 > 男女童合计 5,186，**证明子类互相重叠** | ✅ https://www.bergfreunde.eu/outdoor-jackets/ |
| Zalando | 户外夹克用"上层材料=hardshell"等**筛选属性**，3-in-1 为商品属性 | 功能做筛选 | ❌ 直接抓取 403；🔎 https://www.zalando.nl/heren-jackets/?upper_material=hardshell |
| Backcountry | 夹克页 FAQ 区分 down / synthetic / softshell；分类树未抓到 | — | ❌（反爬）✅ FAQ 文字 https://www.backcountry.com/mens-jackets |
| Moosejaw | 返回 HTTP 451，无法使用 | — | ❌ https://www.moosejaw.com/category/mens-jackets |
| SSENSE（techwear 向） | Clothing：jackets & coats、jeans、pants、shirts、shorts、suits & blazers、sweaters、swimwear、tops、underwear & loungewear；品牌为独立入口 | **纯服装形态**，无功能层级 | ✅ https://www.ssense.com/en-us/men/clothing |
| END. | Men's Jackets 页文案：bomber、denim、leather、shirt jackets、fleeces、puffers、gilets | 款式/形态 | ✅（列表为 JS 渲染未取到）https://www.endclothing.com/ca/clothing/jackets-and-coats |
| 好日山荘 GsMALL | 商品标签：ハードシェル・アルパインジャケット、ソフトシェル、ダウン、インサレーション、レインウェア・ポンチョ、ウィンドシェル、レインパンツ、トレッキングパンツ、ソフトシェルパンツ、その他トップス | 功能为主 | 🔎 https://gsmall.jp/all/ |
| 楽天 | アウトドア（101975）以装备为主，服装细类未能核实 | — | 🔎 https://www.rakuten.co.jp/category/101975/ |

### 1.2 品牌自己的分类树（差异很大）

| 品牌 | 结构 | 主依据 | 来源 |
|---|---|---|---|
| Arc'teryx | shell-jackets/{hardshell, softshell, windshell}；insulated-jackets/{down-fill, synthetic-fill, insulated-shell}；fleece；base-layer/{tops, bottoms}；pants；shorts；shirts-and-tops；packs/{daypacks, multi-day, climbing, ski-and-snow, travel-and-commute, avalanche-airbags}；同时有活动（climb、ski-snowboard、trail、travel、everyday）和系列（veilance、beta-family、gamma-franchise、professional-use、system_a、walk-gently） | 产品类型 + 功能，再叠活动和系列 | ✅ 站点 sitemap 中 244 个 `/us/en/c/` 分类 URL（`arcteryx-crawl/us_en_categories.txt`，2026-11-20 抓取） |
| Rab | all-jackets / all-tops / all-legwear；waterproof-jackets、gore-tex-jackets、softshell-jackets、down-jackets、synthetic-jackets、insulated-jackets、fleece、midlayer、vests-gilets、hoodies、technical-tees、baselayer…；活动：climbing、mountaineering、hiking-and-trekking、ski-mountaineering、trail-running | 功能，但**互相包含**（gore-tex ⊂ waterproof；insulated ⊇ down + synthetic） | ✅ rab.equipment/us/mens 导航（`sb/pages/rab.equipment_us_mens.html`） |
| Patagonia | Jackets & Vests 下：insulated（/insulated/synthetic-insulation）、rain、fleece、soft-shell、windbreakers | 功能 | ✅ 列表页 https://www.patagonia.com/shop/mens/jackets-vests ；🔎 子类 URL https://www.patagonia.com/shop/mens/jackets-vests/insulated/synthetic-insulation |
| Mammut | 型号后缀写明功能：HS（硬壳）/ SO（软壳）/ IN（保暖）/ ML（中间层）。例：Crater Light HS、Ultimate VIII SO、Broad Peak IN、Taiss ML、Stoney HS Thermo | **功能写在品名里** | ✅ https://www.mammut.com/us/en/category/5819-10/jackets-and-vests |
| The North Face（美） | 男夹克页快捷标签：Lightweight、Puffers、Parkas、Snow；Triclimate（三合一）是自家系列名 | 款式/场景 | ✅ https://www.thenorthface.com/en-us/mens/mens-jackets-and-vests-c211702 |
| Norrøna | 商品 URL 按系列组织：femund 594、falketind 572、lofoten 451、/29 385、senja 341、trollveggen 319、fjora 319、lyngen 220… | **按系列（系列≈活动）** | ✅ products sitemap（`sb/pages/www.norrona.com_sitemap_products-us.xml.html`）；各系列对应的活动本次未逐一核实 |
| Montbell（日本） | アルパインウエア、オールウエザー（雨具：レインジャケット/パンツ/コート/ポンチョ/スカート…）、インシュレーション、ソフトシェル、サーマル（フリース）、ウインドシェル、ベスト、Tシャツ/スウェット、シャツ、パンツ、スカート/ワンピース、アンダーウエア；另有サイクル/フィッシング/パドリング等活动专区 | 功能为主 + 少量活动 | ✅ https://webshop.montbell.jp/goods/list.php?category=1 |

**结论**：品牌树有三种主轴——按功能（Arc'teryx、Patagonia、Rab、Montbell）、按品名后缀（Mammut）、按系列/活动（Norrøna）、按款式（TNF 美站）。任何一个品牌的树都不能直接当全站标准。各平台里唯一稳定的交集是：**硬壳 / 软壳 / 抓绒 / 羽绒 / 化纤保暖 / 防风（雨衣、斗篷归入防水）**，以及上衣、裤、短裤、裙、贴身层这些服装形态。

### 1.3 Rangeset 现状

- `products.category` 直接存 Arc'teryx 的品牌分类（10 个值），`sub_tags` 存品牌标签，`is_hardshell` 是布尔值。
- 计数（全部 active）：Shell Jackets 113、Insulated Jackets 81、Pants 73、Shirts and Tops 66、Fleece 35、Footwear 34（已下线）、Base Layer 21、Professional Use 15、Shorts 10、Dresses and Skirts 5，合计 453；不含鞋 419。
- 代码：`lib/parameters/classification.ts` 已经从品名/标签推出 `productType`（jacket/vest/coat/parka/hoodie/pants/bib_pants…）和 `protectionType`（hard_shell/soft_shell/wind_shell/insulated_shell），`lib/catalog-scope.ts` 用品牌分类白名单 + 非鞋判断决定上架范围。**新品类可以完全由这两个已有结果 + 填充类型推出来，不需要改数据库。**
- 现有问题：
  1. "Shell Jackets" ≠ 硬壳：113 款中硬壳 55，软壳 31，防风 15，大衣/西装 5（Alar/Phera Wool Coat、Indisce/Spere Blazer），背心 1。
  2. `is_hardshell` 不可靠：同名同性别的 Beta Jacket（男）一条为 true 一条为 false；按"品牌声明防水膜"规则，硬壳夹克是 59 款，而 `is_hardshell=true` 的夹克只有 31 款；裤子 23 vs 12。
  3. "Professional Use" 是品牌系列（PRO），里面有夹克、裤、背心、背包和背包顶袋，不是品类。
  4. 背包（Alpha PRO 50）和顶袋目前会混在服装列表里。

---

## 2. 设计原则

1. **一个商品只有一个叶子品类**（互斥）。其他所有属性都是筛选维度，可多选。
2. **按物理事实分类**：东西是什么（穿在哪个部位、什么形态）→ 靠什么起作用（防水膜、填充、面料结构）。活动、季节、风格、系列、性别、品牌都不进树。
3. **最多两层**。一级 ≤ 9 个，便于做懂车帝式顶部标签；二级只在同一级内参数可比性差异很大时才拆（外套、下装）。
4. **只用品牌公开证据判定**：品牌的品类、标签、品名、规格里的防水膜/填充声明。缺证据或证据冲突 → `needs_review`，不猜，不按价格/外观推断。
5. **规则有固定优先级**（见 §4），同一输入永远得到同一结果；同款男女/多色出现不同结果 → 自动转复核。
6. **每个品牌一张映射表**：品牌原始分类 + 标签 → 我们的叶子。新品牌上线时先跑映射，`needs_review` ≤ 2% 再上线。
7. **人工覆盖优先级最高**，沿用现有 `manual_overrides` 机制，记录原因和日期。
8. **对外可映射**：每个叶子带 Google 商品分类 ID，用于结构化数据和以后的 Merchant 接入。

**筛选维度（facet，全部可多选）**：品牌、性别（男/女/中性）、活动（品牌声明的，如滑雪、攀登、徒步、越野跑、通勤、旅行）、品牌系列（Veilance、PRO、Walk Gently…）、填充类型（羽绒/化纤/羊毛/混合）、防水膜（GORE-TEX Pro/GORE-TEX/其他/无）、款式（连帽、套头、背带、三合一、斗篷、短款、长款）、袖长、防水（●/○/—，已有）。

---

## 3. v1 品类树

代码用英文 key（URL 也用它）。日文名为草稿，进 glossary 的 needs_review 等母语复核。

| 一级 | 二级（叶子） | key | zh | en | ja | 定义 | Google ID |
|---|---|---|---|---|---|---|---|
| 外套 Outerwear アウター | 硬壳 | outer.hardshell | 硬壳冲锋衣 | Hardshell Jackets | ハードシェル | 有袖外衣，品牌声明防水膜/防水（GORE-TEX、ePE、2L/2.5L/3L 防水面料等），**无固定填充**。雨衣、防水大衣、防水斗篷、套头 anorak 都在这里 | 5598 |
|  | 保暖硬壳 | outer.insulated_shell | 保暖冲锋衣 | Insulated Shells | インサレーテッドシェル | 防水膜 + **固定填充**（羽绒冲锋衣、带棉滑雪服、防水羽绒派克） | 5598 |
|  | 羽绒 | outer.down | 羽绒服 | Down Jackets | ダウン | 主填充为羽绒，无防水膜 | 5598 |
|  | 棉服 | outer.synthetic | 棉服（化纤保暖） | Synthetic Insulated | 化繊インサレーション | 主填充为化纤（含 active insulation，如 Atom、Proton），无防水膜 | 5598 |
|  | 软壳 | outer.softshell | 软壳 | Softshell Jackets | ソフトシェル | 品牌声明 softshell，或弹性梭织、防泼水但**不声明防水** | 5598 |
|  | 防风 | outer.windshell | 防风外套 | Windshells | ウインドシェル | 品牌声明 windshell / wind jacket；轻薄梭织、无防水声明、无填充 | 5598 |
|  | 大衣与西装 | outer.tailoring | 大衣与西装 | Coats & Tailoring | コート・テーラード | 西装、羊毛大衣、风衣等城市剪裁外衣，且无防水膜、无填充 | 5598 |
|  | 背心马甲 | outer.vest | 背心马甲 | Vests | ベスト | **无袖**外层（羽绒、化纤、抓绒、工装背心都算）；功能写入"填充类型/面料"维度 | 1831 |
| 抓绒与中间层 Fleece & Midlayers | 抓绒与中间层 | fleece | 抓绒与中间层 | Fleece & Midlayers | フリース・ミッドレイヤー | 起绒/毛圈针织（合成或羊毛）的保暖上衣：全拉链、半拉链、套头、连帽、开衫都算；无填充 | 5598/212 |
| 上衣 Tops | 上衣 | tops | 上衣 | Shirts & Tops | トップス | T恤、Polo、衬衫、背心款上衣、轻量连帽衫、cotton overshirt。T恤/衬衫/Polo 是"款式"维度，不拆叶子（理由见 §5.7） | 212 |
| 贴身层 Base Layers | 贴身上衣 | base.top | 贴身上衣 | Base Layer Tops | ベースレイヤー（トップ） | 品牌声明的 base layer 上衣 | 5322 |
|  | 贴身下装 | base.bottom | 贴身下装 | Base Layer Bottoms | ベースレイヤー（ボトム） | 品牌声明的 base layer 下装 | 5322 |
| 下装 Bottoms | 硬壳裤 | bottoms.hardshell | 冲锋裤 | Hardshell Pants | ハードシェルパンツ | 有防水膜、无填充（含背带裤） | 5514 / 5909 |
|  | 保暖裤 | bottoms.insulated | 保暖裤 | Insulated Pants | インサレーションパンツ | 有填充（有无防水膜都算，防水写入维度） | 5909 / 204 |
|  | 软壳裤 | bottoms.softshell | 软壳裤 | Softshell Pants | ソフトシェルパンツ | 品牌声明 softshell | 204 |
|  | 长裤 | bottoms.pants | 长裤 | Pants | パンツ | 其余长裤：徒步、工装、城市、抓绒裤、慢跑裤 | 204 |
|  | 紧身裤 | bottoms.tights | 紧身裤 | Tights & Leggings | タイツ・レギンス | 非 base layer 的 tight / legging | 204 |
|  | 短裤 | bottoms.shorts | 短裤 | Shorts | ショーツ | 含裙裤（skort） | 207 |
|  | 半身裙 | bottoms.skirt | 半身裙 | Skirts | スカート | — | 1581 |
| 连衣裙与连体服 | 连衣裙 | onepiece.dress | 连衣裙 | Dresses | ワンピース | — | 2271 |
|  | 连体服 | onepiece.suit | 连体服 | One-Pieces & Suits | オールインワン | 上下一体（滑雪连体服、工作服） | 5182 / 5909 |
| 背包 Packs | 背包 | packs.backpack | 背包 | Backpacks | バックパック | 容量写入维度 | 100 |
|  | 背包配件 | packs.accessory | 背包配件 | Pack Accessories | パックアクセサリー | 顶袋、防雨罩等 | 5181 |
| 配件 Accessories（预留） | 帽子 / 手套 / 袜子 / 其他配件 | acc.headwear / acc.gloves / acc.socks / acc.other | 帽子 / 手套 / 袜子 / 其他配件 | Headwear / Gloves / Socks / Other | 帽子 / グローブ / ソックス / その他 | 目前库里 0 款 | 167 / 209 |
| 鞋 Footwear（预留，前台隐藏） | 徒步鞋靴 / 越野跑鞋 / 接近与登山鞋 / 休闲鞋 / 凉鞋拖鞋 | foot.hiking / foot.trail_run / foot.approach_alpine / foot.lifestyle / foot.sandal | 同左 | Hiking / Trail Running / Approach & Mountaineering / Lifestyle / Sandals | トレッキング / トレイルラン / アプローチ・登山靴 / ライフスタイル / サンダル | 恢复上线时按品牌声明的鞋型映射；鞋的类型本身就是结构差异（鞋底、帮高），不算"按活动分" | 187 |

---

## 4. 判定规则（按顺序，命中即停）

1. 鞋 → `foot.*`（预留）。背包 / 顶袋 → `packs.*`。
2. 品牌声明 base layer → `base.top` / `base.bottom`。
3. 上下一体 → `onepiece.suit`；连衣裙 → `onepiece.dress`；半身裙 → `bottoms.skirt`；短裤与裙裤 → `bottoms.shorts`。
4. 下装：tight/legging → 紧身裤；有填充 → 保暖裤；有防水膜 → 硬壳裤；声明 softshell → 软壳裤；其余 → 长裤。
5. **证据冲突 → `needs_review`**（例：标签写 GORE-TEX Waterproof，正文写 "not fully waterproof"）。
6. 无袖 → `outer.vest`（任何功能）。
7. 品牌分类为 Fleece / 起绒中间层 → `fleece`。
8. 上衣类（T恤、衬衫、Polo、轻量连帽衫）→ `tops`；但声明 softshell 或有填充的 overshirt 按 9–13 走。
9. **有填充**：有防水膜 → 保暖硬壳；羽绒为主 → 羽绒；化纤为主 → 棉服；填充类型未公布 → `needs_review`。
10. 有防水膜（或品牌声明 Hardshell 且无冲突）→ 硬壳。
11. 西装 / 羊毛大衣 / 风衣，且无防水膜、无填充 → 大衣与西装。
12. 声明 softshell → 软壳。
13. 声明 windshell → 防风。
14. 以上都不命中 → `needs_review`。
15. **一致性检查**：同一款（同名，不同性别/颜色/地区）落到不同叶子 → 全部转 `needs_review`。

### 4.1 边界情况

| 情况 | 规则 | 例子 |
|---|---|---|
| 软壳 vs 硬壳 | 看品牌是否**声明防水**（防水膜/Waterproof）。只有防泼水（DWR、Water resistant）、GORE-TEX INFINIUM/WINDSTOPPER 一律不算硬壳 | Solano（标签 Hardshell 但只写 Water resistant，客服答 not fully waterproof）→ 复核 |
| 混合拼接（hybrid） | 按**躯干主体**的面料和功能判（和参数标准 v1.3.0 的 Body 分区一致）；拼接部位写入面料分区 | Rhoam Hybrid（3L 防水面板 + 正文 not fully waterproof）→ 复核；Delta Hybrid Hoody（抓绒主体）→ 抓绒 |
| 保暖硬壳 | 防水膜 + 固定填充才算；只有"insulated shell"字样但没有防水声明的，按填充类型归羽绒或棉服 | Macai Down Jacket（GTX + 羽绒）→ 保暖硬壳；Altus Down Jacket（insulated shell 标签，无防水）→ 羽绒 |
| 羽绒 vs 棉服 | 按**主填充**（躯干）；羽绒 + 化纤混填按躯干主填充；未公布 → 复核 | Cerium（羽绒）→ 羽绒；Atom（化纤）→ 棉服 |
| active insulation / 保暖中间层 | 有填充就按填充归，不归抓绒 | Proton、Atom → 棉服 |
| 抓绒 vs 中间层 | 起绒/毛圈针织（合成或羊毛）都在"抓绒与中间层"；有填充的不在 | Kyanite、Conic Wool Midlayer → 抓绒与中间层 |
| 背心 | 无袖一律归背心马甲，功能放维度；贴身/运动背心（tank）归上衣或贴身层 | Atom Vest、Cerium Vest、Covert Vest（抓绒）、Patrol Vest → 背心马甲；Norvan Tank → 上衣 |
| 三合一 | 按**外层**归类（通常是硬壳），打"三合一"标记，重量注明是否含内胆 | 淘宝/京东大量"三合一冲锋衣"→ 硬壳 + 三合一 |
| 雨衣 / 斗篷 | 声明防水即归硬壳，款式标"斗篷/雨衣"；版型可为 N/A | Montbell レインポンチョ → 硬壳 + 斗篷 |
| 滑雪服 | 不单设类目：防水无填充 → 硬壳（裤 → 硬壳裤）；有填充 → 保暖硬壳（裤 → 保暖裤）；"滑雪"是活动维度 | Sabre / Rush / Sentinel |
| 背带裤 | 归对应裤类，款式标"背带" | Alpha SV Bib → 硬壳裤 |
| overshirt | 声明 softshell → 软壳；有填充 → 棉服；纯棉梭织 → 上衣 | Mionn Softshell Overshirt → 软壳；Cronin Insulated Overshirt → 棉服；Cronin Cotton Overshirt → 上衣 |
| 西装 / 大衣 | 无防水膜、无填充 → 大衣与西装；有防水膜 → 硬壳；有填充 → 羽绒/棉服 | Indisce Blazer → 大衣与西装；Nitra Trench Coat（GTX）→ 硬壳；Monitor Down Coat → 保暖硬壳 |
| 皮肤衣 / 防晒衣（中国市场） | 无防水 → 防风；"防晒"写入功能维度 | 将来接入国产品牌时用 |
| 品牌系列 | 不进树：Veilance、PRO（Professional Use）、Walk Gently、System_A、Gamma 家族 → "系列"维度 | Ski Guide Jacket → 硬壳 + 系列 PRO |
| 配件、背包 | 背包按容量维度，不按活动拆；顶袋 → 背包配件 | Alpha PRO 50 → 背包；PRO Backpack Lid Replacement → 背包配件 |
| 鞋 | 预留；按鞋型（徒步/越野跑/接近与登山/休闲/凉拖），GTX 写入维度 | Norvan LD 4 → 越野跑鞋；Kopec 2 Mid GTX → 徒步鞋靴（待恢复时复核） |

---

## 5. Arc'teryx 映射实测（419 款，不含已下线的 34 双鞋）

规则脚本：`taxonomy/map.py`；逐条结果：`taxonomy/arcteryx-mapping.csv`。

### 5.1 按新品类计数

| 一级 | 叶子 | 数量 |
|---|---|---|
| 外套（192） | 硬壳 | 59 |
|  | 保暖硬壳 | 20 |
|  | 羽绒 | 20 |
|  | 棉服 | 31 |
|  | 软壳 | 31 |
|  | 防风 | 15 |
|  | 大衣与西装 | 5 |
|  | 背心马甲 | 11 |
| 抓绒与中间层 | 抓绒与中间层 | 34 |
| 上衣 | 上衣 | 66 |
| 贴身层（21） | 贴身上衣 / 贴身下装 | 14 / 7 |
| 下装（90） | 硬壳裤 / 保暖裤 / 软壳裤 / 长裤 / 紧身裤 / 短裤 / 半身裙 | 23 / 5 / 16 / 29 / 3 / 10 / 4 |
| 连衣裙与连体服 | 连衣裙 / 连体服 | 1 / 1 |
| 背包 | 背包 / 背包配件 | 1 / 1 |
| — | **needs_review** | **12** |
| 合计 |  | 419 |

自动归类 407 / 419 = **97.1%**。

### 5.2 品牌原分类 → 新品类

| Arc'teryx 分类 | 去向 |
|---|---|
| Shell Jackets 113 | 硬壳 55、软壳 31、防风 15、大衣与西装 5、背心 1、复核 6 |
| Insulated Jackets 81 | 棉服 29、羽绒 20、保暖硬壳 18、背心 8、复核 6 |
| Pants 73 | 长裤 29、硬壳裤 19、软壳裤 16、保暖裤 5、紧身裤 3、连体服 1（Incendia One Piece） |
| Shirts and Tops 66 | 上衣 66 |
| Fleece 35 | 抓绒与中间层 34、背心 1（Covert Vest） |
| Base Layer 21 | 贴身上衣 14、贴身下装 7 |
| Professional Use 15 | 硬壳 4、硬壳裤 4、保暖硬壳 2、棉服 2、背心 1、背包 1、背包配件 1 |
| Shorts 10 | 短裤 10 |
| Dresses and Skirts 5 | 半身裙 4、连衣裙 1 |

### 5.3 12 款待复核（全部是证据问题，不是规则问题）

| 商品 | 原因 |
|---|---|
| Rhoam Hybrid Jacket（男、女） | 标签 GORE-TEX (Waterproof)，正文 "not fully waterproof ... WINDSTOPPER"（见 `waterproof-cell-evidence.md`） |
| Solano Hoody ×2、Solano Jacket | 标签 Hardshell，但只写 Water resistant；客服答 not fully waterproof |
| Beta Insulated Jacket（男、女） | 同款男款有 GTX 标签、女款没有 → 一致性检查拦下 |
| Demlo Insulated Jacket、Diode Insulated Bomber、Mutton Insulated Jacket、Spere Insulated Jacket | 保暖类，但未公布填充类型 |
| Asset Airshell Jacket | 没有任何壳层声明 |

### 5.4 其他发现

- `is_hardshell` 标志不能再用于"硬壳"筛选：规则得出硬壳夹克 59 款，标志为 true 的只有 31 款；裤子 23 vs 12。
- Sabre Insulated Jacket 只有 Insulated Shell + Synthetic 标签、没有 GTX 标签，按规则归棉服；如果官网正文写了 GORE-TEX，应补齐标签或人工覆盖。建议采集时把正文防水声明也解析进来。

### 5.5 上衣为什么不拆 T恤 / 衬衫

Arc'teryx 的 "T-Shirts" 标签和品名都不可靠：Skyline Shirt SS 同时有 T-Shirts 和 Collared 标签；Kragg Cotton … Shirt SS 是印花 T恤却叫 Shirt；约 20 款既无标签也无法从名字判断针织还是梭织。Google（Shirts & Tops 212）和 Arc'teryx 自己也是一个类。v1 合成一个叶子，"款式"（T恤/Polo/衬衫/背心）做维度；以后采集到"针织/梭织"字段再拆。

---

## 6. 无法归类的处理

1. 规则不命中或证据冲突 → 叶子写 `needs_review`，记录原因（如上表）。
2. 待复核商品：搜索、品牌页、详情页照常可见；**不出现在品类列表和对比推荐里**，避免错放。
3. 人工判定写入 `manual_overrides`（key 建议 `parameters.taxonomy`），记录原因、证据链接、日期；覆盖优先于规则。
4. 每次采集后跑一致性检查（同款不同叶子、硬壳但无防水声明、有填充但无填充类型），结果进复核队列。
5. 新品牌上线门槛：先写品牌映射表，`needs_review` ≤ 2% 才上线；超出说明映射表或规则需要补。
6. 新出现的品类（如以后接配件、帐篷）先进 `needs_review`，累计 ≥ 10 款且跨 ≥ 2 个品牌时再考虑新增叶子（版本号升级，写变更记录）。

---

## 7. 落地建议（给 Codex 的范围）

- 新增 `lib/taxonomy/tree.ts`（叶子 key、三语名、定义、Google ID）和 `lib/taxonomy/classify.ts`（纯函数：输入已有的 `productType`、`protectionType`、填充类型、品牌分类、标签，按 §4 顺序输出叶子 + 状态）。
- 品牌映射：`lib/taxonomy/brands/arcteryx.ts` 只放品牌特有的对照（如 "Professional Use" → 系列维度、Fleece → 抓绒），通用规则不重复写。
- 不加数据库列，读取时计算（和现有 classification 一致）；`category` 列保留为品牌原始分类。
- 前台：一级做顶部标签（外套、抓绒与中间层、上衣、贴身层、下装、连衣裙与连体服、背包），二级做标签下的分段；品牌、性别、活动、系列、填充、防水膜做筛选。
- 三语名进 `docs/i18n/glossary.csv`，日文标 needs_review。
- 测试：§5.3 的 12 款必须进 `needs_review`；Shell Jackets 113 款的拆分数量与 §5.2 一致；同款一致性检查生效。

---

## 8. 未核实与局限

- 懂车帝"级别/品牌"筛选、京东平台级类目、REI/Patagonia 子类、Zalando 筛选、GS1 brick 编码：来自搜索摘要或第三方，未直接打开原页面核对（站点反爬或 JS 渲染）。
- 抖店类目表是 2022-06-30 版本，官方注明类目会更新。
- Norrøna 各系列对应的活动未逐一核实。
- 日文名为草稿，需要母语复核。
- 映射用的是 `products.sub_tags` 和品名；正文里的防水/填充声明没有参与，可能低估硬壳/保暖硬壳（如 Sabre Insulated）。
