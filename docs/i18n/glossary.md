# Rangeset 术语表 v0.1（简体中文 / 日本語）

来源字段：`lib/parameters/registry.ts` v1.6.0、`model.ts`、`fabric.ts`、`components/catalog/*`、`app/*`；品类来自 Neon `products.category`。收录范围见 v1.6.0 参数标准。

此页保留原始调研的可读结构。运行时术语及补充键以 `glossary.csv` 为准。待审项见 [review.md](review.md)。依据代号见文末。

## 分组

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| General | 基本信息 | 基本情報 |  | 通用 UI 词，无需外部依据 |
| Dimensions & fit | 尺寸与版型 | サイズ・フィット | AJ1 AZ1 | AZ1 用「版型和尺码」；AJ1 用「フィット & サイズ」 |
| Main fabric | 面料 | 素材 | AZ1 AJ3 | 组内含里衬等多部位，故不用「主面料」；AZ1「材料与保养」，AJ3「素材」 |
| Protection | 防护性能 | 防護性能 | AZ1 AJ2 | AJ2 用「プロテクション」，普通读者更易懂「防護性能」 |
| Insulation | 保暖 | 保温 | MB3 SH |  |
| Features | 功能细节 | 機能・仕様 | AZ1 AJ1 | AZ1「功能和规格」；AJ1「技術的な特徴」 |
| Origin | 产地 | 生産地 | AZ1 AJ3 |  |
| Environment & certifications | 环保与认证 | 環境・認証 | AZ1 AJ1 | AZ1「可持续发展」/AJ1「サステナビリティ」；字段含法规与认证，用更中性的说法 |

## 字段

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Brand | 品牌 | ブランド |  |  |
| Model | 型号 | モデル名 | AJ2 | 争议：AZ1 的「型号」指货号 X000011062；我们指款名，备选「款名」 |
| Product line | 产品线 | ライン |  | Mainline / Veilance / System_A 这一层 |
| Model family | 系列 | シリーズ | AZ2 AJ2 | AZ2「Beta 系列」，AJ2「ベータシリーズ」 |
| Category | 品类 | カテゴリー |  |  |
| Product type | 款式 | アイテム |  | 争议：中文「款式」也可指设计风格；日文「アイテム」为服装零售惯用 |
| Gender | 性别 | 性別 |  |  |
| Official list price | 官方定价 | 希望小売価格 | AJ2 | AJ2 价格含税标注「(税込)」；中文备选「官方指导价」 |
| Activities | 适用运动 | アクティビティ | AZ1 AJ1 | AZ1 标签「户外运动」，AJ1「アクティビティ」 |
| Release year / season | 上市季 | 発売シーズン | SHB SENKEN | 值见 season.* |
| Weight | 重量 | 重量 | AZ1 AJ2 | AJ1 标签为「重さ」，AJ2 对比表为「重量」 |
| Weight reference size | 称重尺码 | 重量の基準サイズ | AJ2 | AJ2 写作「重量（Men’s M）」 |
| Fit | 版型 | フィット | AZ1 AJ1 | AZ1 规格栏写「款型」，正文用「版型」；版型更常见 |
| Centre back length | 后中长 | 着丈（センターバック） | AZ1 AJ1 AJ2 | AZ1「衣服后中长」；AJ1「センターバック長さ」，AJ2 对比表「着丈」 |
| Inseam | 内缝长 | 股下 | AZ4 YAMAP | AZ4 官方用「内缝长」；口语「内长」 |
| Available sizes | 尺码 | サイズ展開 | AZ1 AJ1 |  |
| Colorways | 配色数 | カラー展開数 |  | 字段为数量；needs_review: 日文常写「カラー展開」，「数」为我方补 |
| Main fabric | 面料 | 素材 | AZ1 AJ3 |  |
| Fabric name | 面料名称 | 素材名 |  |  |
| Composition | 成分 | 組成 |  | 日文洗标惯用「組成表示」；中文洗标「成分」 |
| Fabric weight | 克重 | 生地の目付 | AZ2 OCACI | AZ2「克重126gsm」；日文「目付」是行业词，需配 ? 说明 |
| Yarn denier | 旦数 | デニール | AJ2 AJ5 MHW TW | AJ5 表头「デニール数」；中文评测常说「D数」，正文用「旦数」 |
| Recycled content | 再生成分 | リサイクル素材比率 | AZ2 AJ1 | Arc'teryx 中文混用「再生/回收」，统一用「再生」 |
| Construction | 织法 | 織り・編み |  | 争议：含针织（Jersey/Knit），「织法」在中文可涵盖针织；needs_review |
| Stretch | 弹力 | ストレッチ |  |  |
| Certifications | 认证 | 認証 | AZ1 AJ1 |  |
| Fabric treatment | 面料处理 | 生地加工 | AZ1 AJ1 | AZ1「面料处理」，AJ1「生地加工」——官方原词 |
| Garment recycled content | 整件再生成分 | 製品全体のリサイクル素材比率 |  |  |
| Whole garment | 整件 | 製品全体 |  |  |
| Protection type | 防护类型 | シェルの種類 |  |  |
| Protection claims | 防护特性 | 防護性能の表示 | AZ1 AJ1 | AZ1「技术特点：防水/防风/透气/耐磨」 |
| Waterproof membrane | 防水膜 | 防水メンブレン | GCN1 MB1 | GCN1 用「薄膜」；MB1「メンブレン（膜）」 |
| Laminate layers | 面料层数 | レイヤー構造 | CNO MB1 | 中文户外常说「两层/三层压胶」；值保留 2L/2.5L/3L |
| Water-repellent treatment | 防泼水处理 | 撥水加工 | GCN1 AJ1 MB2 | GCN1「持久防泼水(DWR)」；AJ1「DWR（耐久撥水）加工」 |
| Wind protection | 防风性能 | 防風性 | AZ1 AJ1 |  |
| Sun protection | 防晒 | UVカット |  | needs_review: 日文亦常写「UPF」或「紫外線カット」 |
| Hydrostatic head | 静水压 | 耐水圧 | XKT MB1 | 争议：中文电商常写「防水指数」；检测标准称「静水压」 |
| Breathability | 透湿性 | 透湿性 | MB2 XKT | 争议：中文口语「透气」，但「透气」也指空气透过；用「透湿」更准 |
| Insulation type | 保暖材料 | 保温材の種類 | AZ5 AJ3 |  |
| Fill by part | 各部位填充 | 部位別の中綿 | AJ3 |  |
| Down fill power | 蓬松度 | フィルパワー | SH MB3 |  |
| Down content | 含绒量 | ダウン率 | SH KP FJ AJ3 | 争议：新国标 GB/T 14272-2021 正式名「绒子含量」；AJ3 用「ダウン含有率」 |
| Down species | 绒种 | ダウンの種類 | SH | needs_review: 「绒种」口语化，备选「羽绒种类」 |
| Down fill weight | 充绒量 | ダウン封入量 | SH KP MOON |  |
| Synthetic insulation | 合成棉 | 化繊中綿 | AZ5 AJ3 OCACI | AZ5「合成保暖材料」；口语「化纤棉/合成棉」 |
| Synthetic fill weight per area | 合成棉克重 | 中綿の目付 | AJ3 OCACI | AJ3 写「Coreloft™ 80 (80 g/m²)」 |
| Hood | 风帽 | フード | AZ1 AJ1 | 争议：普通人常说「帽子」；Arc'teryx 中文统一「风帽」 |
| Helmet-compatible hood | 头盔兼容风帽 | ヘルメット対応フード | AZ1 AJ2 |  |
| Underarm vents | 腋下透气拉链 | ピットジップ | AZ1 MHW AJ2 PEAKS | 争议：日文另一常见说法「脇下ベンチレーション」(PEAKS) |
| Two-way zipper | 双向拉链 | 2WAYジッパー | TW RKT AJ2 | AJ2 用「ダブルジッパー」，RKT 用「2wayジッパー」 |
| Powder skirt | 防雪裙 | パウダースカート | YYS PEAKS |  |
| Leg side zippers | 裤腿侧拉链 | サイドジッパー |  | needs_review: 未找到官方页面原词 |
| Search-and-rescue reflector | 搜救反射器 | 救助用リフレクター | AZ1 AJ1 | 值写「RECCO 反射器」；RECCO 不翻 |
| Pockets | 口袋 | ポケット | AZ1 AJ1 |  |
| Fabric origin | 面料产地 | 生地の原産国 | AZ1 AJ3 | 官方原词 |
| Dyeing origin | 染色地 | 染色加工地 | AZ1 AJ3 | 官方原词 |
| Manufacturing origin | 制造地 | 生産国 | AZ1 AJ3 | 官方原词 |
| Manufacturing facility | 制造工厂 | 製造施設 | AZ1 AJ1 | 官方原词 |
| Recycled material claims | 再生材料声明 | リサイクル素材の表示 |  |  |
| Certifications & standards | 认证与标准 | 認証・規格 |  |  |
| PFAS statements | PFAS 声明 | PFASに関する表示 | AZ1 AJ1 | PFAS 不翻 |
| Microfiber statements | 微纤维脱落说明 | マイクロファイバー排出の表示 | AZ1 AJ3 | AZ1「洗涤时可能会将塑料微纤维释放到环境中」 |
| Other regulatory statements | 其他法规声明 | その他の法規関連表示 |  | needs_review |

## 部位

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Body | 衣身 | ボディ | AZ1 AJ3 | AJ2 写「ボディ部」 |
| Reinforcement | 加固部位 | 補強部 | ACN | needs_review: 日文未找到官方原词 |
| Panel | 拼接部位 | 切り替え部 | AZ2 | needs_review: AZ2 把 insert 译「嵌料」；「拼接」更普通易懂 |
| Lining | 里衬 | 裏地 | AZ2 AJ3 | AZ2「100%尼龙里衬」 |
| Face | 面层 | 表地 | AJ2 GCN2 | GCN2「外层面料」 |
| Backer | 背衬 | バッカー | GCN2 AJ2 | 争议：日文「裏地」与 Lining 撞车，故用「バッカー」(AJ2 原文 backer)；needs_review |
| Main fabric | 主面料 | メイン素材 |  |  |
| Contrast fabric | 拼色面料 | 配色素材 |  | needs_review: 避免与 Panel「切り替え部」撞车 |
| Down fill | 羽绒填充 | ダウン |  |  |
| Synthetic fill | 合成棉填充 | 化繊中綿 |  |  |
| Sleeves | 袖子 | 袖 |  |  |
| Hood | 风帽 | フード | AZ1 AJ1 |  |

## 取值

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Men’s | 男装 | メンズ | AZ1 AJ1 |  |
| Women’s | 女装 | ウィメンズ | AZ2 AJ1 |  |
| Unisex | 男女同款 | ユニセックス |  |  |
| Windproof | 防风 | 防風 | AZ1 AJ1 |  |
| Wind resistant | 抗风 | 耐風 | AJ1 | needs_review: 中文「抗风」与「防风」区分度弱，备选「部分防风」 |
| Down | 羽绒 | ダウン |  |  |
| Synthetic | 合成棉 | 化繊綿 | OCACI |  |
| Down + synthetic | 羽绒＋合成棉 | ダウン＋化繊綿 | AJ3 |  |
| 2L | 2L | 2L | CNO MB1 | 行话保留 |
| 2.5L | 2.5L | 2.5L | CNO HKCC | 行话保留 |
| 3L | 3L | 3L | AZ2 AJ2 | 行话保留 |

## 织法/弹力

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Ripstop | 格子防撕裂 | リップストップ | AJ3 | AJ3「マイクロリップ」「リップストップ」 |
| Plain weave | 平纹 | 平織り | AZ1 |  |
| Double weave | 双层织 | 二重織り |  | needs_review |
| Jersey | 平纹针织 | 天竺編み |  | needs_review: 日文亦作「ジャージー」 |
| Grid fleece | 网格抓绒 | グリッドフリース |  | needs_review |
| Twill | 斜纹 | 綾織り |  |  |
| Knit | 针织 | ニット |  |  |
| Mechanical | 机械弹力 | メカニカルストレッチ |  | needs_review |
| 2-way | 双向弹力 | 2WAYストレッチ |  |  |
| 4-way | 四向弹力 | 4WAYストレッチ |  | 中文口语「四面弹」，「四向」与 2-way 对称更清楚 |
| Contains elastane | 含氨纶 | ポリウレタン混 |  | 日本洗标把 elastane 标为「ポリウレタン」 |

## 品类

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Shell Jackets | 外层夹克 | シェルジャケット | AZ3 AJ2 | 争议：中文户外常说「冲锋衣」但只指硬壳；AZ3 用「外层夹克」，涵盖硬壳/软壳/风壳 |
| Insulated Jackets | 保暖夹克 | ダウン・中綿ジャケット | AZ5 | 争议：Arc'teryx 中文页标题未翻译 Insulated；日文搜索结果见「インサレーテッド＆ダウンジャケット」，「ダウン・中綿」更好懂；needs_review |
| Pants | 长裤 | パンツ | AJ2 |  |
| Shirts and Tops | 上衣 | シャツ・トップス |  |  |
| Fleece | 抓绒 | フリース |  |  |
| Base Layer | 打底层 | ベースレイヤー | AJ4 |  |
| Professional Use | 专业用途 | プロフェッショナル |  | needs_review: 指 LEAF 等军警/专业线，名称待定 |
| Shorts | 短裤 | ショーツ |  |  |
| Dresses and Skirts | 连衣裙与半身裙 | ワンピース・スカート |  | 日文 dress=「ワンピース」，不用「ドレス」 |

## 防护类型

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Hardshell | 硬壳 | ハードシェル | AZ3 AJ1 |  |
| Softshell | 软壳 | ソフトシェル | AZ3 CR |  |
| Windshell | 风壳 | ウインドシェル | AZ3 CR |  |
| Insulated shell | 保暖壳衣 | 中綿入りシェル |  | needs_review: 两种语言都未找到官方固定说法 |

## 款式

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Jacket | 夹克 | ジャケット | AZ1 AJ1 |  |
| Vest | 马甲 | ベスト |  | 中文不用「背心」，避免与 Tank top 撞车 |
| Coat | 大衣 | コート |  |  |
| Parka | 派克大衣 | パーカ |  | needs_review: 日文「パーカ」也指连帽卫衣 |
| Hoodie | 连帽衣 | フーディ | AZ5 AJ4 | AZ5「Cerium 连帽衣」；AJ4「フーディ」 |
| Anorak | 套头夹克 | アノラック |  |  |
| Pants | 长裤 | パンツ |  |  |
| Bib pants | 背带裤 | ビブパンツ |  |  |
| Shorts | 短裤 | ショーツ |  |  |
| Tights | 紧身裤 | タイツ |  |  |
| T-shirt | T恤 | Tシャツ |  |  |
| Shirt | 衬衫 | シャツ |  |  |
| Overshirt | 衬衫外套 | シャツジャケット |  |  |
| Polo shirt | Polo 衫 | ポロシャツ |  |  |
| Tank top | 背心 | タンクトップ |  |  |
| Sweatshirt | 卫衣 | スウェット |  |  |
| Sweater | 毛衣 | セーター |  |  |
| Pullover | 套头衫 | プルオーバー |  |  |
| Cardigan | 开衫 | カーディガン |  |  |
| Zip-neck top | 半拉链上衣 | ジップネック | AJ4 |  |
| Halter top | 挂脖上衣 | ホルターネックトップ |  |  |
| Crewneck | 圆领衫 | クルーネック | AJ4 |  |
| Bomber jacket | 飞行员夹克 | ボンバージャケット |  |  |
| Blazer | 西装外套 | ブレザー |  |  |
| Base layer top | 打底上衣 | ベースレイヤー（トップ） | AJ4 |  |
| Base layer bottom | 打底裤 | ベースレイヤー（ボトム） | AJ4 |  |
| Dress | 连衣裙 | ワンピース |  |  |
| Skirt | 半身裙 | スカート |  |  |
| Skort | 裙裤 | スコート |  |  |
| Suit | 套装 | スーツ |  | needs_review: 需先确认数据里 suit 指西装套装还是连体服 |
| Mitten | 连指手套 | ミトン |  | 配件，暂不收录 |
| Glove | 手套 | グローブ |  | 配件，暂不收录 |
| Hat | 帽子 | ハット |  | 配件，暂不收录 |
| Cap | 棒球帽 | キャップ |  | 配件，暂不收录 |
| Beanie | 毛线帽 | ビーニー |  | 配件，暂不收录 |
| Backpack | 背包 | バックパック |  | 非服装，暂不收录 |
| Needs review | 待核实 | 要確認 |  |  |

## 符号/状态

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| ● Yes | ● 有 | ● あり | AJ5 TW | AJ5/TW 对比表用 ◯/○ 表示有 |
| ○ No | ○ 无 | ○ なし | AJ5 | 注意：日本对比表惯用 ◯=有、×=无；我们 ○=无，日文版必须带文字「なし」，不能只显示符号；needs_review |
| — Not published | — 未公布 | — 未公表 |  | 日文「非公開」含刻意不公开之意，「未公表」更中性 |
| N/A Not applicable | 不适用 | 対象外 |  | v1 验收用词 |
| Conflicting sources | 来源不一致 | 情報源で相違あり |  |  |
| Needs verification | 待核实 | 要確認 |  |  |
| Unverified | 未核实 | 未確認 |  |  |
| Published | 已公布 | 公表済み |  |  |
| Reference size not published | 称重尺码未公布 | 基準サイズ未公表 |  |  |

## 季节

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Spring/Summer 2026 | 2026 春夏 | 2026年春夏 | SHB SENKEN HB | SHB/SENKEN 均用「春夏/秋冬」 |
| Fall/Winter 2026 | 2026 秋冬 | 2026年秋冬 | SHB SENKEN HB | HB「2026年秋冬」 |
| Spring 2026 | 2026 春季 | 2026年春 | SHB SENKEN HB |  |
| Summer 2026 | 2026 夏季 | 2026年夏 | SHB SENKEN HB |  |
| Fall 2026 | 2026 秋季 | 2026年秋 | SHB SENKEN HB | 只写品牌给的季，不扩成秋冬 |
| Winter 2026 | 2026 冬季 | 2026年冬 | SHB SENKEN HB |  |
| 2026 | 2026 年 | 2026年 | SHB SENKEN HB | 只知年份时 |
| Version | 版本 | バージョン | SHB SENKEN HB |  |
| Release date | 发售日期 | 発売日 | SHB SENKEN HB |  |

## 界面

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Browse catalog | 浏览目录 | カタログを見る |  |  |
| Browse by category | 按品类浏览 | カテゴリーから探す |  |  |
| Product catalog | 商品目录 | 商品カタログ |  |  |
| Search catalog | 搜索目录 | カタログを検索 |  |  |
| Search products or specs | 搜索商品或参数 | 商品名・スペックで検索 |  |  |
| Search by name, category, or gender | 按名称、品类或性别搜索 | 名前・カテゴリー・性別で検索 |  |  |
| Sort | 排序 | 並び替え |  |  |
| Featured | 综合排序 | おすすめ順 |  |  |
| Featured: in stock on the brand site, complete card specs, and released in the latest two seasons come first; brands are interleaved by share within each group. No paid placement, no scores, no brand favoritism. | 综合排序：官网有货、卡片参数齐全、近两季发布的优先；同组内各品牌按占比穿插。不收费、不打分、不看品牌。 | おすすめ順：公式サイトで在庫あり・カード項目がそろっている・直近2シーズン発売の商品を優先し、各グループ内ではブランドを掲載数の比率で交互に並べます。掲載料・スコア付け・ブランドによる優遇はありません。 |  |  |
| All | 全部 | すべて |  |  |
| Family | 系列 | シリーズ |  |  |
| Line | 产品线 | ライン |  |  |
| Mainline | 主线 | メインライン |  |  |
| No products match these filters. | 没有符合筛选条件的商品。 | 条件に一致する商品はありません。 |  |  |
| Reset filters | 重置筛选 | 絞り込みを解除 |  |  |
| Show more products | 显示更多 | さらに表示 |  |  |
| Loading catalog filters… | 正在加载筛选… | 絞り込みを読み込み中… |  |  |
| Compare products | 商品对比 | 商品を比較 |  |  |
| Compare | 对比 | 比較 |  |  |
| Add to compare | 加入对比 | 比較に追加 |  |  |
| Added | 已加入 | 追加済み |  |  |
| Compare up to four products | 最多对比 4 款 | 最大4点まで比較できます |  |  |
| Remove | 移除 | 外す |  | 日文「削除」语气像删除数据，比较栏用「外す」 |
| Clear | 清空 | すべて外す |  |  |
| Add a product | 添加商品 | 商品を追加 |  |  |
| Search products to compare | 搜索要对比的商品 | 比較する商品を検索 |  |  |
| No matching products. | 没有匹配的商品。 | 該当する商品はありません。 |  |  |
| Select two to four products to compare. | 请选择 2–4 款商品进行对比。 | 比較する商品を2〜4点選んでください。 |  |  |
| Add one more product to compare specs. | 再加 1 款即可对比参数。 | もう1点追加すると比較できます。 |  |  |
| Mixed categories · Some parameters may not apply | 品类不同 · 部分参数可能不适用 | カテゴリー混在 · 一部の項目は該当しない場合があります |  |  |
| Differences only | 只看差异 | 違いのみ表示 |  |  |
| Highlight differences | 突出差异 | 違いを強調 |  |  |
| No confirmed differences among directly comparable values. | 可直接比较的参数中，没有确认的差异。 | 直接比較できる項目に、確認できた違いはありません。 |  |  |
| No shared published specs. | 没有双方都公布的参数。 | 共通して公表されているスペックはありません。 |  |  |
| Cannot compare unpublished values | 未公布的值无法比较 | 未公表の値は比較できません |  |  |
| Verify the source values before comparing | 比较前请先核对原文数值 | 比較する前に原文の値を確認してください |  |  |
| Applies to different product types | 适用于不同款式 | 異なるアイテムが対象です |  |  |
| Different or unpublished test methods | 测试方法不同或未公布 | 試験方法が異なるか未公表です |  |  |
| Different or unpublished measurement references | 测量基准不同或未公布 | 測定基準が異なるか未公表です |  |  |
| Different or unpublished currencies | 币种不同或未公布 | 通貨が異なるか未公表です |  |  |
| Different down-content reporting bases | 含绒量的统计口径不同 | ダウン率の表示基準が異なります |  |  |
| Sizes refer to different fit ranges | 尺码对应的男女款不同 | サイズの対象（メンズ・ウィメンズ）が異なります |  |  |
| Specs | 参数 | スペック |  |  |
| Specifications | 参数 | スペック |  |  |
| Key specs | 主要参数 | 主なスペック |  |  |
| Full specifications | 全部参数 | すべてのスペック |  |  |
| Example data | 示例数据 | サンプルデータ |  |  |
| Example | 示例 | サンプル |  |  |
| Discontinued | 已停产 | 廃番 | RKT | RKT「廃番」 |
| In stock | 有货 | 在庫あり | AJ3 | AJ3「在庫あり」 |
| Out of stock | 缺货 | 在庫切れ | AJ3 |  |
| Stock not published | 库存未公布 | 在庫情報なし |  |  |
| Product not found | 未找到该商品 | 商品が見つかりません |  |  |
| Skip to content | 跳到正文 | 本文へスキップ |  |  |
| Weight reference | 称重尺码 | 重量の基準サイズ |  |  |

## 不翻

| en | zh | ja | 依据 | 备注 |
|---|---|---|---|---|
| Arc'teryx | Arc'teryx | Arc'teryx |  | 技术名/商标，原样 |
| Veilance | Veilance | Veilance |  | 技术名/商标，原样 |
| System_A | System_A | System_A |  | 技术名/商标，原样 |
| Beta AR | Beta AR | Beta AR |  | 技术名/商标，原样 |
| GORE-TEX | GORE-TEX | GORE-TEX |  | 技术名/商标，原样 |
| GORE-TEX PRO ePE | GORE-TEX PRO ePE | GORE-TEX PRO ePE | AZ1 AJ1 | 技术名/商标，原样 |
| ePE | ePE | ePE |  | 技术名/商标，原样 |
| Fortius | Fortius | Fortius |  | 技术名/商标，原样 |
| Coreloft | Coreloft | Coreloft |  | 技术名/商标，原样 |
| Arato | Arato | Arato |  | 技术名/商标，原样 |
| RECCO | RECCO | RECCO | AZ1 AJ1 | 技术名/商标，原样 |
| bluesign | bluesign | bluesign | AZ1 AJ1 | 技术名/商标，原样 |
| bluepass | bluepass | bluepass |  | 技术名/商标，原样 |
| Drop Hood | Drop Hood | Drop Hood | AZ1 AJ1 | 技术名/商标，原样 |
| Storm Hood | Storm Hood | Storm Hood |  | 技术名/商标，原样 |
| FC0 DWR | FC0 DWR | FC0 DWR | AZ1 AJ1 | 技术名/商标，原样 |
| Micro-grid | Micro-grid | Micro-grid |  | 技术名/商标，原样 |
| C-KNIT | C-KNIT | C-KNIT |  | 技术名/商标，原样 |
| PFAS | PFAS | PFAS |  | 行话/单位，保留原写法 |
| DWR | DWR | DWR |  | 行话/单位，保留原写法 |
| UPF | UPF | UPF |  | 行话/单位，保留原写法 |
| RET | RET | RET |  | 行话/单位，保留原写法 |
| 100D | 100D | 100D |  | 行话/单位，保留原写法 |
| g/m² | g/m² | g/m² |  | 行话/单位，保留原写法 |
| cu in/oz | cu in/oz | cu in/oz |  | 行话/单位，保留原写法 |

## 依据代号

- **AZ1**: https://arcteryx.com/us/zh/shop/mens/beta-ar-jacket-1062
- **AZ2**: https://arcteryx.com/us/zh/shop/womens/beta-ar-jacket-9863
- **AZ3**: https://arcteryx.com/us/zh/c/mens/shell-jackets
- **AZ4**: https://arcteryx.com/us/zh/help/sizing/mens/bottoms
- **AZ5**: https://arcteryx.com/us/zh/shop/mens/cerium-hoody-0521
- **ACN**: https://arcteryx.com/cn/brandActivitiesDetails/1727079560248
- **AJ1**: https://arcteryx.jp/products/beta-ar-jacket-m
- **AJ2**: https://arcteryx.jp/pages/260618_beta-series
- **AJ3**: https://arcteryx.jp/products/cerium-jacket-m
- **AJ4**: https://arcteryx.jp/collections/base-layer
- **AJ5**: https://arcteryx.jp/pages/s24beta-epe
- **GCN1**: https://www.gore-tex.com.cn/support/frequently-asked-questions
- **GCN2**: https://www.gore-tex.com.cn/technology/gore-tex-products/pro
- **MB1**: https://www.montbell.jp/generalpage/disp.php?id=794
- **MB2**: https://support.montbell.jp/material/aboutmaterial/
- **MB3**: https://www.montbell.jp/generalpage/disp.php?id=754
- **SH**: https://cdn.shanghai.gov.cn/nw17239/20261118/a7c698df69c1468080cf50944ccd0877.html
- **KP**: https://www.kepuchina.cn/article/articleinfo?ar_id=461509&business_type=100&classify=0
- **CNO**: http://www.cnoutdoor.com/?action-viewnews-itemid-263107=
- **HKCC**: https://www.consumer.org.hk/sc/article/542-hard-shell-jackets/542-hard-shell-jackets-samples-and-test-items
- **XKT**: http://xkt-cert.com/news/s99976.html
- **MHW**: https://www.maihuwai.com/shaidan/51660.html
- **RKT**: https://www.rakuten.co.jp/canpanera/contents/arcteryx/jacket/beta/compare/
- **PEAKS**: https://www.funq.jp/peaks/article/763065/
- **YYS**: https://www.yiyiso.com/p38281
- **OCACI**: https://ocaci.jp/blog/519/
- **FJ**: https://fjallraven.jp/fjallraven3/guide/material-guides/down
- **MOON**: https://shop.moonloid.jp/view/page/daun-q-a
- **YAMAP**: https://store.yamap.com/guide/size
- **CR**: https://colorfulrock.com/yamanobori/softshell/
- **SENKEN**: https://senken.co.jp/posts/goldwin-260213
- **HB**: https://hypebae.com/jp/2026/11/the-north-face-2026-autam-winter-korea-collection-relese-info
- **SHB**: https://saohuobao.com/deals/arcteryx-fw26-new-arrivals-202609
- **TW**: https://arcteryx.tw/pages/find-your-shell-jacket-beta
- **DB**: repo:lib/parameters + Neon products.category