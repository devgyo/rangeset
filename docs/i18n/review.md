# Rangeset i18n 人工审校

由 `pnpm i18n-check --write` 从术语表生成。

## 待审术语与草译

| Key | English | 简体中文 | 日本語 | 备注 |
| --- | --- | --- | --- | --- |
| field.model | Model | 型号 | モデル名 | 争议：AZ1 的「型号」指货号 X000011062；我们指款名，备选「款名」 |
| field.product_type | Product type | 款式 | アイテム | 争议：中文「款式」也可指设计风格；日文「アイテム」为服装零售惯用 |
| field.colors | Colorways | 配色数 | カラー展開数 | 字段为数量；needs_review: 日文常写「カラー展開」，「数」为我方补 |
| field.weave | Construction | 织法 | 織り・編み | 争议：含针织（Jersey/Knit），「织法」在中文可涵盖针织；needs_review |
| field.upf | Sun protection | 防晒 | UVカット | needs_review: 日文亦常写「UPF」或「紫外線カット」 |
| field.hydrostatic_head | Hydrostatic head | 静水压 | 耐水圧 | 争议：中文电商常写「防水指数」；检测标准称「静水压」 |
| field.breathability | Breathability | 透湿性 | 透湿性 | 争议：中文口语「透气」，但「透气」也指空气透过；用「透湿」更准 |
| field.down_ratio | Down content | 含绒量 | ダウン率 | 争议：新国标 GB/T 14272-2021 正式名「绒子含量」；AJ3 用「ダウン含有率」 |
| field.down_species | Down species | 绒种 | ダウンの種類 | needs_review: 「绒种」口语化，备选「羽绒种类」 |
| field.hood | Hood | 风帽 | フード | 争议：普通人常说「帽子」；Arc'teryx 中文统一「风帽」 |
| field.pit_zips | Underarm vents | 腋下透气拉链 | ピットジップ | 争议：日文另一常见说法「脇下ベンチレーション」(PEAKS) |
| field.leg_zips | Leg side zippers | 裤腿侧拉链 | サイドジッパー | needs_review: 未找到官方页面原词 |
| field.regulatory | Other regulatory statements | 其他法规声明 | その他の法規関連表示 | needs_review |
| part.reinforcement | Reinforcement | 加固部位 | 補強部 | needs_review: 日文未找到官方原词 |
| part.panel | Panel | 拼接部位 | 切り替え部 | needs_review: AZ2 把 insert 译「嵌料」；「拼接」更普通易懂 |
| part.backer | Backer | 背衬 | バッカー | 争议：日文「裏地」与 Lining 撞车，故用「バッカー」(AJ2 原文 backer)；needs_review |
| part.contrast | Contrast fabric | 拼色面料 | 配色素材 | needs_review: 避免与 Panel「切り替え部」撞车 |
| wind.wind_resistant | Wind resistant | 抗风 | 耐風 | needs_review: 中文「抗风」与「防风」区分度弱，备选「部分防风」 |
| construction.double | Double weave | 双层织 | 二重織り | needs_review |
| construction.jersey | Jersey | 平纹针织 | 天竺編み | needs_review: 日文亦作「ジャージー」 |
| construction.grid_fleece | Grid fleece | 网格抓绒 | グリッドフリース | needs_review |
| stretch.mechanical | Mechanical | 机械弹力 | メカニカルストレッチ | needs_review |
| cat.shell_jackets | Shell Jackets | 外层夹克 | シェルジャケット | 争议：中文户外常说「冲锋衣」但只指硬壳；AZ3 用「外层夹克」，涵盖硬壳/软壳/风壳 |
| cat.insulated_jackets | Insulated Jackets | 保暖夹克 | ダウン・中綿ジャケット | 争议：Arc'teryx 中文页标题未翻译 Insulated；日文搜索结果见「インサレーテッド＆ダウンジャケット」，「ダウン・中綿」更好懂；needs_review |
| cat.professional | Professional Use | 专业用途 | プロフェッショナル | needs_review: 指 LEAF 等军警/专业线，名称待定 |
| protection.insulated_shell | Insulated shell | 保暖壳衣 | 中綿入りシェル | needs_review: 两种语言都未找到官方固定说法 |
| type.parka | Parka | 派克大衣 | パーカ | needs_review: 日文「パーカ」也指连帽卫衣 |
| type.suit | Suit | 套装 | スーツ | needs_review: 需先确认数据里 suit 指西装套装还是连体服 |
| symbol.no | ○ No | ○ 无 | ○ なし | 注意：日本对比表惯用 ◯=有、×=无；我们 ○=无，日文版必须带文字「なし」，不能只显示符号；needs_review |
| ui.language | Language | 语言 | 言語 | needs_review: v1 补充草译。 |
| ui.navigation | Main navigation | 主导航 | メインナビゲーション | needs_review: v1 补充草译。 |
| ui.hero_first | Specs, | 看参数， | 宣伝文句より、 | needs_review: v1 补充草译。 |
| ui.hero_second | not hype. | 不看噱头。 | スペック。 | needs_review: v1 补充草译。 |
| ui.hero_description | Browse the Arc’teryx US catalog and compare published specs side by side. | 浏览始祖鸟美国商品目录，并排对比官方公布的参数。 | Arc’teryxの米国向けカタログで、公表スペックを比較できます。 | needs_review: v1 补充草译。 |
| ui.families | Product families | 商品系列 | 製品シリーズ | needs_review: v1 补充草译。 |
| ui.catalog_live | US catalog · Published specs and MSRP | 美国目录 · 已公布参数及官方定价 | 米国向けカタログ · 公表スペックと希望小売価格 | needs_review: v1 补充草译。 |
| ui.breadcrumb | Breadcrumb | 当前位置 | パンくずリスト | needs_review: v1 补充草译。 |
| ui.family_variants | Other {family} {category} | {family} 系列的其他{category} | {family}シリーズのほかの{category} | needs_review: v1 补充草译。 |
| ui.legend | Parameter status legend | 参数状态图例 | スペックの状態を示す凡例 | needs_review: v1 补充草译。 |
| ui.photo_angles | Photo angles | 拍摄角度 | 撮影アングル | needs_review: v1 补充草译。 |
| ui.colorway | Colorway | 配色 | カラー | needs_review: v1 补充草译。 |
| ui.colorways | Colorways | 配色选项 | カラーバリエーション | needs_review: v1 补充草译。 |
| ui.model_height | Model {height} | 模特身高 {height} | モデル身長{height} | needs_review: v1 补充草译。 |
| ui.wearing_size | Wearing size {size} | 试穿尺码 {size} | 着用サイズ{size} | needs_review: v1 补充草译。 |
| ui.view_product | View {name} | 查看 {name} | {name}を見る | needs_review: v1 补充草译。 |
| ui.color_count | {count} colors | {count} 种配色 | {count}色 | needs_review: v1 补充草译。 |
| ui.catalog_filters | Catalog filters | 目录筛选 | カタログの絞り込み | needs_review: v1 补充草译。 |
| ui.sort_name | Name A–Z | 商品名 A–Z | 商品名順（A–Z） | needs_review: v1 补充草译。 |
| ui.sort_price_asc | Price low–high | 价格从低到高 | 価格が安い順 | needs_review: v1 补充草译。 |
| ui.sort_price_desc | Price high–low | 价格从高到低 | 価格が高い順 | needs_review: v1 补充草译。 |
| ui.sort_weight | Weight low–high | 重量从轻到重 | 重量が軽い順 | needs_review: v1 补充草译。 |
| ui.product_count | {count, plural, one {# product} other {# products}} | {count} 款商品 | {count}点 | needs_review: v1 补充草译。 |
| ui.jacket_count | {count, plural, one {# jacket} other {# jackets}} | {count} 款夹克 | ジャケット{count}点 | needs_review: v1 补充草译。 |
| ui.close_picker | Close product picker | 关闭商品选择器 | 商品選択を閉じる | needs_review: v1 补充草译。 |
| ui.jacket_index | Jacket index | 夹克目录 | ジャケット一覧 | needs_review: v1 补充草译。 |
| ui.jacket_intro | Browse hardshell specs and select 2–4 jackets to compare. | 浏览硬壳参数，选择 2–4 款夹克进行对比。 | ハードシェルのスペックを見ながら、ジャケットを2〜4点選んで比較できます。 | needs_review: v1 补充草译。 |
| ui.catalog_order | Catalog order | 目录顺序 | カタログ順 | needs_review: v1 补充草译。 |
| ui.column_groups | Column groups | 表格分组 | 列グループ | needs_review: v1 补充草译。 |
| ui.jackets_selected | {count} of 4 jackets selected. | 已选 {count} 款，最多 4 款。 | {count}点を選択済みです。最大4点まで選べます。 | needs_review: v1 补充草译。 |
| ui.size | Size {size} | 尺码 {size} | サイズ{size} | needs_review: v1 补充草译。 |
| ui.test_method_missing | Test method: {status} | 测试方法：{status} | 試験方法：{status} | needs_review: v1 补充草译。 |
| ui.recycled_claim | Recycled material claimed · % not published | 标注使用再生材料 · 比例未公布 | リサイクル素材を使用 · 比率は未公表 | needs_review: v1 补充草译。 |
| ui.recycled_fiber | recycled {fiber} | 再生{fiber} | リサイクル{fiber} | needs_review: v1 补充草译。 |
| ui.virgin_fiber | virgin {fiber} | 原生{fiber} | バージン{fiber} | needs_review: v1 补充草译。 |
| seo.title | Rangeset — specs, not hype | Rangeset — 看参数，不看噱头 | Rangeset — 宣伝文句よりスペック | needs_review: v1 补充草译。 |
| seo.description | Browse and compare published Arc’teryx product specifications. | 浏览和对比 Arc’teryx 公布的商品参数。 | Arc’teryxが公表した製品スペックを閲覧・比較できます。 | needs_review: v1 补充草译。 |
| seo.catalog_description | Browse the Arc’teryx US catalog and compare published specifications across models. | 浏览始祖鸟美国商品目录，对比不同款式的官方参数。 | Arc’teryxの米国向けカタログで、モデルごとの公表スペックを比較できます。 | needs_review: v1 补充草译。 |
| seo.compare_description | Compare published specifications for up to four Arc’teryx products. | 并排对比最多 4 款 Arc’teryx 商品的已公布参数。 | Arc’teryx製品の公表スペックを最大4点まで並べて比較できます。 | needs_review: v1 补充草译。 |
| seo.jackets_description | Browse and compare hardshell jackets by membrane, construction, weight, price, and features. | 按防水膜、结构、重量、价格和功能浏览和对比硬壳夹克。 | 防水メンブレン、構造、重量、価格、機能からハードシェルジャケットを比較できます。 | needs_review: v1 补充草译。 |
| seo.product_description | Published configuration and specs for the {brand} {name}. | {brand} {name} 的已公布配置与参数。 | {brand} {name}の公表仕様とスペック。 | needs_review: v1 补充草译。 |
| group.numbers | Numbers | 数值参数 | 数値スペック | needs_review: v1 补充草译。 |
| field.legacy_waterproof | Waterproof rating | 防水等级 | 防水性能 | needs_review: v1 补充草译。 |
| value.waterproof | Waterproof | 防水 | 防水 | needs_review: v1 补充草译。 |
| value.water_resistant | Water resistant | 耐水 | 耐水 | needs_review: v1 补充草译。 |
| value.fit_regular | Regular | 常规版型 | レギュラーフィット | needs_review: v1 补充草译。 |
| value.fit_fitted | Fitted | 修身版型 | フィット感のあるシルエット | needs_review: v1 补充草译。 |
| value.fit_relaxed | Relaxed | 宽松版型 | リラックスフィット | needs_review: v1 补充草译。 |
| value.fit_next_to_skin | Next to Skin | 贴身版型 | 肌に沿うフィット | needs_review: v1 补充草译。 |
| value.fit_oversized | Oversized | 超宽松版型 | オーバーサイズ | needs_review: v1 补充草译。 |
| help_label.ripstop | Ripstop | 格子防撕裂 | リップストップ | needs_review: v1 补充草译。 |
| help_label.stretch | Stretch | 弹力 | ストレッチ | needs_review: v1 补充草译。 |
| help_label.denier | Denier | 旦数 | デニール | needs_review: v1 补充草译。 |
| help_label.3l | 3L | 3L | 3L | needs_review: v1 补充草译。 |
| help_label.2l | 2L | 2L | 2L | needs_review: v1 补充草译。 |
| help_label.2_5l | 2.5L | 2.5L | 2.5L | needs_review: v1 补充草译。 |
| help_label.fill | Fill power | 蓬松度 | フィルパワー | needs_review: v1 补充草译。 |
| help_label.gsm | Grams per square metre | g/m² | g/m² | needs_review: v1 补充草译。 |
| help_label.membrane | Waterproof membrane | 防水膜 | 防水メンブレン | needs_review: v1 补充草译。 |
| help_label.dwr | DWR | DWR | DWR | needs_review: v1 补充草译。 |
| help_label.upf | UPF | UPF | UPF | needs_review: v1 补充草译。 |
| help_label.hydrostatic | Hydrostatic head | 静水压 | 耐水圧 | needs_review: v1 补充草译。 |
| help_label.breathability | Breathability | 透湿性 | 透湿性 | needs_review: v1 补充草译。 |
| help_label.recco | RECCO | RECCO | RECCO | needs_review: v1 补充草译。 |
| help_label.pfas | PFAS | PFAS | PFAS | needs_review: v1 补充草译。 |
| status_description.yes | The brand explicitly lists this feature. | 品牌明确列出了这项功能。 | ブランドがこの機能を明記しています。 | needs_review: v1 补充草译。 |
| status_description.no | The brand explicitly says this feature is absent. | 品牌明确说明没有这项功能。 | ブランドがこの機能がないことを明記しています。 | needs_review: v1 补充草译。 |
| status_description.unpublished | The brand has not published enough information to confirm this value. | 品牌公布的信息不足以确认这项参数。 | ブランドの公表情報ではこの値を確認できません。 | needs_review: v1 补充草译。 |
| status_description.inapplicable | This parameter does not apply to this product. | 这项参数不适用于该商品。 | この項目はこの製品には該当しません。 | needs_review: v1 补充草译。 |
| note.the_published_measurements_do_not_agree_after_unit_conversion | The published measurements do not agree after unit conversion. | 换算单位后，已公布的测量值不一致。 | 単位を換算すると、公表された測定値が一致しません。 | needs_review: v1 补充草译。 |
| note.the_published_measurement_or_unit_could_not_be_read | The published measurement or unit could not be read. | 无法识别已公布的测量值或单位。 | 公表された測定値または単位を読み取れません。 | needs_review: v1 补充草译。 |
| note.published_down_proportion_exceeds_100 | Published down proportion exceeds 100%. | 已公布的绒含量超过 100%。 | 公表されたダウンの割合が100%を超えています。 | needs_review: v1 补充草译。 |
| note.published_test_results_cannot_be_reconciled | Published test results cannot be reconciled. | 已公布的测试结果不一致。 | 公表された試験結果が一致しません。 | needs_review: v1 补充草译。 |
| note.a_source_did_not_identify_a_supported_fabric_location | A source did not identify a supported fabric location. | 原文没有明确注明面料部位。 | 出典に素材の部位が明記されていません。 | needs_review: v1 补充草译。 |
| note.the_brand_s_statements_disagree | The brand’s statements disagree. | 品牌的不同说明不一致。 | ブランドの説明に食い違いがあります。 | needs_review: v1 补充草译。 |
| note.multiple_reference_sizes_or_measurements_are_published | Multiple reference sizes or measurements are published. | 品牌公布了多个参考尺码或测量值。 | 複数の基準サイズまたは測定値が公表されています。 | needs_review: v1 补充草译。 |
| note.sources_name_different_primary_membranes | Sources name different primary membranes. | 不同来源标注的主防水膜不一致。 | 出典によって主な防水メンブレンの記載が異なります。 | needs_review: v1 补充草译。 |
| note.more_than_one_laminate_is_listed_for_the_primary_fabric | More than one laminate is listed for the primary fabric. | 主要面料标注了多种层压结构。 | 主素材に複数のラミネート構造が記載されています。 | needs_review: v1 补充草译。 |
| note.different_breathability_measures_are_published | Different breathability measures are published. | 品牌公布了不同口径的透湿数据。 | 測定基準の異なる透湿データが公表されています。 | needs_review: v1 补充草译。 |
| note.the_indexed_value_or_unit_could_not_be_normalized | The indexed value or unit could not be normalized. | 无法将录入值或单位转换为统一格式。 | 登録された値または単位を共通形式に変換できません。 | needs_review: v1 补充草译。 |
| note.the_indexed_value_differs_from_the_parsed_source_text | The indexed value differs from the parsed source text. | 录入值与从原文提取的值不一致。 | 登録値と出典の原文から読み取った値が一致しません。 | needs_review: v1 补充草译。 |
| note.manual_value_does_not_match_the_field_definition | Manual value does not match the field definition. | 手动录入值与字段定义不符。 | 手動入力値が項目の定義に合っていません。 | needs_review: v1 补充草译。 |
| note.a_product_level_override_cannot_be_assigned_to_one_of_multiple_main_fabrics | A product-level override cannot be assigned to one of multiple main fabrics. | 有多种主要面料，无法确定商品级更正适用于哪一种。 | 主素材が複数あるため、製品単位の修正をどの素材に適用するか判断できません。 | needs_review: v1 补充草译。 |
| note.manual_parts_are_invalid_or_a_backer_has_no_unambiguous_parent | Manual parts are invalid or a backer has no unambiguous parent. | 手动录入的部位无效，或无法确定背衬属于哪个部位。 | 手動入力した部位が無効か、バッカーが属する部位を特定できません。 | needs_review: v1 补充草译。 |
| note.different_or_unpublished_test_methods_for_component_measurements | Different or unpublished test methods for component measurements | 部位测量的测试方法不同或未公布 | 部位別の試験方法が異なるか未公表 | needs_review: v1 补充草译。 |
| note.the_source_does_not_specify_a_usable_weight_per_area | The source does not specify a usable weight per area. | 原文未提供可用的单位面积重量。 | 出典に換算できる単位面積あたりの重量が記載されていません。 | needs_review: v1 补充草译。 |
| note.published_fiber_percentages_exceed_100 | Published fiber percentages exceed 100%. | 已公布的纤维比例合计超过 100%。 | 公表された繊維の組成比率の合計が100%を超えています。 | needs_review: v1 补充草译。 |
| note.published_weights_per_area_disagree | Published weights per area disagree. | 已公布的单位面积重量不一致。 | 公表された単位面積あたりの重量が一致しません。 | needs_review: v1 补充草译。 |
| activity.hike | Hike | 徒步 | ハイキング | needs_review: v1 补充草译。 |
| activity.boulder | Boulder | 抱石 | ボルダリング | needs_review: v1 补充草译。 |
| activity.city | City | 城市日常 | 街での普段使い | needs_review: v1 补充草译。 |
| activity.alpine | Alpine | 高山活动 | 高山での活動 | needs_review: v1 补充草译。 |
| activity.mountain_rescue | Mountain Rescue | 山地救援 | 山岳救助 | needs_review: v1 补充草译。 |
| activity.ski_guiding | Ski Guiding | 滑雪向导 | スキーガイド | needs_review: v1 补充草译。 |
| activity.search_and_rescue | Search and Rescue | 搜救 | 捜索・救助 | needs_review: v1 补充草译。 |
| activity.rock | Rock | 岩壁活动 | 岩場での活動 | needs_review: v1 补充草译。 |
| activity.resort | Resort | 雪场滑雪 | ゲレンデスキー | needs_review: v1 补充草译。 |
| activity.trail_run | Trail Run | 越野跑 | トレイルランニング | needs_review: v1 补充草译。 |
| activity.touring | Touring | 滑雪巡游 | スキーツアー | needs_review: v1 补充草译。 |
| activity.freeride | Freeride | 自由滑雪 | フリーライド | needs_review: v1 补充草译。 |
| activity.training_fitness | Training/Fitness | 训练与健身 | トレーニング・フィットネス | needs_review: v1 补充草译。 |
| activity.rock_climbing | Rock Climbing | 攀岩 | ロッククライミング | needs_review: v1 补充草译。 |
| activity.ice_climbing | Ice Climbing | 攀冰 | アイスクライミング | needs_review: v1 补充草译。 |
| activity.alpine_climbing | Alpine Climbing | 高山攀登 | アルパインクライミング | needs_review: v1 补充草译。 |
| activity.backcountry_skiing | Backcountry Skiing | 野雪滑雪 | バックカントリースキー | needs_review: v1 补充草译。 |
| activity.mountain_bike | Mountain Bike | 山地骑行 | マウンテンバイク | needs_review: v1 补充草译。 |
| activity.travel_commute | Travel/Commute | 旅行与通勤 | 旅行・通勤 | needs_review: v1 补充草译。 |
| activity.ski_patrol | Ski Patrol | 雪场巡逻 | スキーパトロール | needs_review: v1 补充草译。 |
| fiber.nylon | Nylon | 尼龙 | ナイロン | needs_review: v1 补充草译或保护词。 |
| fiber.polyamide | Polyamide | 聚酰胺 | ポリアミド | needs_review: v1 补充草译或保护词。 |
| fiber.polyester | Polyester | 聚酯纤维 | ポリエステル | needs_review: v1 补充草译或保护词。 |
| fiber.elastane | Elastane | 氨纶 | ポリウレタン | needs_review: v1 补充草译或保护词。 |
| fiber.spandex | Spandex | 氨纶 | ポリウレタン | needs_review: v1 补充草译或保护词。 |
| fiber.lycra | Lycra | Lycra | Lycra | needs_review: v1 补充草译或保护词。 |
| fiber.cotton | Cotton | 棉 | 綿 | needs_review: v1 补充草译或保护词。 |
| fiber.wool | Wool | 羊毛 | ウール | needs_review: v1 补充草译或保护词。 |
| fiber.merino_wool | Merino wool | 美利奴羊毛 | メリノウール | needs_review: v1 补充草译或保护词。 |
| fiber.elastomultiester | Elastomultiester | 弹性聚酯纤维 | エラストマルチエステル | needs_review: v1 补充草译或保护词。 |
| fiber.polypropylene | Polypropylene | 聚丙烯 | ポリプロピレン | needs_review: v1 补充草译或保护词。 |
| fiber.polyethylene | Polyethylene | 聚乙烯 | ポリエチレン | needs_review: v1 补充草译或保护词。 |
| fiber.polyurethane | Polyurethane | 聚氨酯 | ポリウレタン | needs_review: v1 补充草译或保护词。 |
| fiber.viscose | Viscose | 黏胶纤维 | ビスコース | needs_review: v1 补充草译或保护词。 |
| fiber.lyocell | Lyocell | 莱赛尔纤维 | リヨセル | needs_review: v1 补充草译或保护词。 |
| fiber.acrylic | Acrylic | 腈纶 | アクリル | needs_review: v1 补充草译或保护词。 |
| fiber.linen | Linen | 亚麻 | リネン | needs_review: v1 补充草译或保护词。 |
| fiber.hemp | Hemp | 大麻纤维 | ヘンプ | needs_review: v1 补充草译或保护词。 |
| fiber.silk | Silk | 蚕丝 | シルク | needs_review: v1 补充草译或保护词。 |
| fiber.rayon | Rayon | 人造丝 | レーヨン | needs_review: v1 补充草译或保护词。 |
| fiber.modal | Modal | 莫代尔纤维 | モダール | needs_review: v1 补充草译或保护词。 |
| fiber.aramid | Aramid | 芳纶 | アラミド | needs_review: v1 补充草译或保护词。 |
| fiber.ptfe | PTFE | PTFE | PTFE | needs_review: v1 补充草译或保护词。 |
| ui.fiber_share | {pct}% {fiber} | {pct}% {fiber} | {pct}%{fiber} | needs_review: v1 补充草译。 |
| value.goose | goose | 鹅 | ガチョウ | needs_review: v1 补充草译。 |
| value.duck | duck | 鸭 | アヒル | needs_review: v1 补充草译。 |
| value.minimum | Minimum | 最低值 | 最低値 | needs_review: v1 补充草译。 |
| card.weight_help | Brands may weigh different reference sizes. Some brands do not publish the reference size. | 各品牌称重时使用的参考尺码可能不同。部分品牌未公布参考尺码。 | 計量時の基準サイズはブランドによって異なります。基準サイズを公表していないブランドもあります。 | needs_review: 卡片说明草译。 |
| card.fiber_share | {fiber} {pct}% | {fiber} {pct}% | {fiber}{pct}% | needs_review: 卡片成分显示。 |
| card.recycled_share | {pct}% recycled | 再生 {pct}% | リサイクル素材{pct}% | needs_review: 卡片再生成分显示。 |
| card.search_placeholder | Search by name or model number | 搜索产品名或款号 | 製品名・品番で検索 | needs_review: 款号搜索占位。 |
| card.main_fabric | Main fabric | 主面料 | 主素材 | needs_review: 卡片仅展示 Body。 |
| taxonomy.outerwear | Outerwear | 外套 | アウター | needs_review: 日文草译。 |
| taxonomy.hardshell_jackets | Hardshell Jackets | 硬壳冲锋衣 | ハードシェル | needs_review: 日文草译。 |
| taxonomy.insulated_shells | Insulated Shells | 保暖冲锋衣 | インサレーテッドシェル | needs_review: 日文草译。 |
| taxonomy.down_jackets | Down Jackets | 羽绒服 | ダウンジャケット | needs_review: 日文草译。 |
| taxonomy.synthetic_insulated_jackets | Synthetic Insulated Jackets | 棉服 | 化繊インサレーション | needs_review: 日文草译。 |
| taxonomy.softshell_jackets | Softshell Jackets | 软壳 | ソフトシェル | needs_review: 日文草译。 |
| taxonomy.windshells | Windshells | 防风外套 | ウインドシェル | needs_review: 日文草译。 |
| taxonomy.coats_and_tailoring | Coats & Tailoring | 大衣与西装 | コート・テーラード | needs_review: 日文草译。 |
| taxonomy.vests | Vests | 背心马甲 | ベスト | needs_review: 日文草译。 |
| taxonomy.fleece_and_midlayers | Fleece & Midlayers | 抓绒与中间层 | フリース・ミッドレイヤー | needs_review: 日文草译。 |
| taxonomy.tops | Shirts & Tops | 上衣 | トップス | needs_review: 日文草译。 |
| taxonomy.base_layers | Base Layers | 贴身层 | ベースレイヤー | needs_review: 日文草译。 |
| taxonomy.base_layer_tops | Base Layer Tops | 贴身上衣 | ベースレイヤー（トップ） | needs_review: 日文草译。 |
| taxonomy.base_layer_bottoms | Base Layer Bottoms | 贴身下装 | ベースレイヤー（ボトム） | needs_review: 日文草译。 |
| taxonomy.bottoms | Bottoms | 下装 | ボトムス | needs_review: 日文草译。 |
| taxonomy.hardshell_pants | Hardshell Pants | 冲锋裤 | ハードシェルパンツ | needs_review: 日文草译。 |
| taxonomy.insulated_pants | Insulated Pants | 保暖裤 | インサレーションパンツ | needs_review: 日文草译。 |
| taxonomy.softshell_pants | Softshell Pants | 软壳裤 | ソフトシェルパンツ | needs_review: 日文草译。 |
| taxonomy.pants | Pants | 长裤 | パンツ | needs_review: 日文草译。 |
| taxonomy.tights_and_leggings | Tights & Leggings | 紧身裤 | タイツ・レギンス | needs_review: 日文草译。 |
| taxonomy.shorts | Shorts | 短裤 | ショーツ | needs_review: 日文草译。 |
| taxonomy.skirts | Skirts | 半身裙 | スカート | needs_review: 日文草译。 |
| taxonomy.dresses_and_one_pieces | Dresses & One-Pieces | 连衣裙与连体服 | ワンピース・オールインワン | needs_review: 日文草译。 |
| taxonomy.dresses | Dresses | 连衣裙 | ワンピース | needs_review: 日文草译。 |
| taxonomy.one_piece_suits | One-Piece Suits | 连体服 | オールインワン | needs_review: 日文草译。 |
| taxonomy.backpacks | Backpacks | 背包 | バックパック | needs_review: 日文草译。 |
| ui.subcategories | Subcategories | 二级品类 | サブカテゴリー | needs_review: 日文草译。 |
| ui.local_catalog | Local catalog · Saved product data | 本地目录 · 已保存的商品数据 | ローカルカタログ · 保存済みの商品データ | needs_review: 日文草译。 |
| activity.approach | Approach | 接近路线 | アプローチ | needs_review: 日文草译。 |
| activity.climbing | Climbing | 攀登 | クライミング | needs_review: 日文草译。 |
| activity.everyday | Everyday | 日常 | 日常 | needs_review: 日文草译。 |
| activity.mountain_training | Mountain Training | 山地训练 | 山岳トレーニング | needs_review: 日文草译。 |
| activity.mountaineering | Mountaineering | 登山 | 登山 | needs_review: 日文草译。 |
| activity.skiing | Skiing | 滑雪 | スキー | needs_review: 日文草译。 |
| activity.travel | Travel | 旅行 | 旅行 | needs_review: 日文草译。 |
| activity.via_ferrata | Via Ferrata | 铁道式攀登 | ヴィア・フェラータ | needs_review: 日文草译。 |

## 回退到英文的说明

- `help.ripstop`
- `help.stretch`
- `help.2l`
- `help.2_5l`
- `help.gsm`
- `help.membrane`
- `help.upf`
- `help.hydrostatic`
- `help.breathability`
- `help.pfas`
- `help.weight_size`
