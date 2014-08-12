

// From http://stackoverflow.com/a/10073788/500207
// General-purpose utility here used to zero-pad four-digit hex codes to five.
function pad(n, width, padder) {
    padder = padder || '0';
    n = n + '';
    if (n.length >= width) {
        return n;
    } else {
       return new Array(width - n.length + 1).join(padder) + n;
    }
}

// Convert the first character of a string to its hex Unicode code point
function c2u(s, len) {
    len = len || 5;
    return pad(s.charCodeAt(0).toString(16), len);
}

// Convert a kanji to its URL in the KanjiVG directory structure
function kanji2url(k) {
    return "kanji/" + c2u(k) + ".svg";
}

// Reads the KanjiVG XML file for a given kanji, walks it to build a
// dependency graph of its elements, and finally calls `graph2svg`
// which renders it via D3. The dependency graph uses a format that's
// tied to the D3 example at http://bl.ocks.org/mbostock/4062045 and
// isn't the most sane.
function kanji2graph(kanji) {
    var nodes_dict = {}; // kvg:element -> index in nodes_arr
    var nodes_arr = [];
    var links_arr = [];
    var ids_dict = {}; // IDs seen

    var x; // To store the SVG

    d3.xhr(kanji2url(kanji), 'text/plain', function(e,req) {
        var t = req.responseText;
        x = $('svg', $.parseXML(t));
        // Now you can do craaazy things like:
        //$('g[kvg\\:element="蔵"]', x).children('g')

        // Recursive function that builds nodes_arr, links_arr
        function walk(parentnode, parentelement) {
            var pid = parentnode.attr('id');
            if (pid in ids_dict) {
                return;
            }
            ids_dict[pid] = pid;

            parentelement = parentelement || "root";
            var parelt = parentnode.attr('kvg\:element');
            var parorig = parentnode.attr('kvg\:original');
            parorig = parorig ? parorig : '';

            if (parelt) {
                parentelement = parelt;
                if (!(parelt in nodes_dict)) {
                    nodes_dict[parelt] = nodes_arr.length;
                    nodes_arr.push({"element": parelt, "original": parorig});
                }
            }

            var children = parentnode.children('g');
            if (children.length == 0) {return;}

            for (var idx = 0; idx < children.length; idx++) {
                var child = $(children[idx]);
                var kvgelt = child.attr('kvg\:element');
                var kvgorig = child.attr('kvg\:original');
                kvgorig = kvgorig ? kvgorig : '';
                if (kvgelt) {
                    // add it to nodes_arr if necessary
                    // connect it to parent
                    if (!(kvgelt in nodes_dict)) {
                        nodes_dict[kvgelt] = nodes_arr.length;
                        nodes_arr.push({"element": kvgelt, "original": kvgorig});
                    }
                    links_arr.push({"source": nodes_dict[parentelement],
                        "target": nodes_dict[kvgelt], "value": 1});
                }
                walk(child, parentelement);
            }
            return;
        }
        // Walk the SVG for this kanji
        walk($('g[kvg\\:element="'+kanji+'"]', x));

        // Make the graph in the page
        graph2svg({nodes: nodes_arr, links: links_arr}, kanji);
    });
}

// Renders the graph generated in `kanji2graph`. Based on
// http://bl.ocks.org/mbostock/4062045 and http://bl.ocks.org/mbostock/1153292
function graph2svg(graph, kanji) {
    var width = 300,
        height = 300;

    var force = d3.layout.force()
        .charge(-320)
        .linkDistance(60)
        .size([width, height]);

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var textid = svg.append("a")
        .attr("xlink:href", kanji2url(kanji))
        .append("text")
        .text(kanji);
    // Move vertically after it's been rendered
    textid.attr("y", -textid[0][0].getBBox().y);

    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5");

    force
        .nodes(graph.nodes)
        .links(graph.links)
        .on("tick", tick)
        .start();

    var link = svg.append("g").selectAll("path")
        .data(graph.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");

    var circle = svg.append("g").selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 6)
        .call(force.drag);

    var node = svg.append("g").selectAll(".node")
        .data(graph.nodes)
        .enter().append("text")
        .attr("class", "node")
        .text(function (n) {return n.element + (n.original ? "("+n.original+")" : "");})
        .style({"fill": function (n, i) {return (i==0) ? "Indigo" : "black";},
                "font-size": function (n,i) {return (i==0) ? "18pt" : "16pt";}})
        .call(force.drag);

    node.append("title")
        .text(function(d) { return d.element; });

    function tick() {
        link.attr("d", linkArc);
        node.attr("transform", transform);
        circle.attr("transform", transform);
    }
    
    function linkArc(d) {
      return "M" + d.source.x + "," + d.source.y + "L"  + d.target.x + "," + d.target.y;
    }
    
    function transform(d) {
        return "translate(" + d.x + "," + d.y + ")";
    }
}


// 
$( document ).ready(function() {
    // A quick example that shows the things this code uses
    var x; var deep; var shallow;
    d3.xhr(kanji2url('胆'),'text/plain', function(e,req) {
        var t = req.responseText;
        x = $('svg', $.parseXML(t));
        deep = $( "g[kvg\\:element='一']" ,x);
        shallow = $( "g[kvg\\:element='旦']" ,x)
    });

    // Draw a few graphs for kicks
    kanji2graph('蔵');
    kanji2graph('渓');
    kanji2graph('環');
    kanji2graph('剰');

    // Populate the joyo sidebar with kanji
    var joyodiv = $("#joyo");
    for (var i=0; i<joyo.length; i++) {
        $('<span>')
            .text(joyo[i])
            .attr({'id': joyo[i], 'class': 'clickable-joyo'})
            .click(function() {kanji2graph(this.id);} )
            .appendTo(joyodiv);
    }


});

// Heisig-sorted joyo kanji
var joyo = "一二三四五六七八九十口日月田目古吾冒朋明唱晶品呂昌早旭世胃旦胆亘凹凸旧自白百\
中千舌升昇丸寸肘専博占上下卓朝嘲只貝唄貞員貼見児元頁頑凡負万句肌旬勺的首乙乱直具真工左右有賄貢項刀刃\
切召昭則副別丁町可頂子孔了女好如母貫兄呪克小少大多夕汐外名石肖硝砕砂妬削光太器臭嗅妙省厚奇川州順水氷\
永泉腺原願泳沼沖汎江汰汁沙潮源活消況河泊湖測土吐圧埼垣填圭封涯寺時均火炎煩淡灯畑災灰点照魚漁里黒墨鯉\
量厘埋同洞胴向尚字守完宣宵安宴寄富貯木林森桂柏枠梢棚杏桐植椅枯朴村相机本札暦案燥未末昧沫味妹朱株若草\
苦苛寛薄葉模漠墓暮膜苗兆桃眺犬状黙然荻狩猫牛特告先洗介界茶脊合塔王玉宝珠現玩狂旺皇呈全栓理主注柱金銑\
鉢銅釣針銘鎮道導辻迅造迫逃辺巡車連軌輸喩前煎各格賂略客額夏処条落冗冥軍輝運冠夢坑高享塾熟亭京涼景鯨舎\
周週士吉壮荘売学覚栄書津牧攻敗枚故敬言警計詮獄訂訃討訓詔詰話詠詩語読調談諾諭式試弐域賊栽載茂戚成城誠\
威滅減蔑桟銭浅止歩渉頻肯企歴武賦正証政定錠走超赴越是題堤建鍵延誕礎婿衣裁装裏壊哀遠猿初巾布帆幅帽幕幌\
錦市柿姉肺帯滞刺制製転芸雨雲曇雷霜冬天妖沃橋嬌立泣章競帝諦童瞳鐘商嫡適滴敵匕叱匂頃北背比昆皆楷諧混渇\
謁褐喝葛旨脂詣壱毎敏梅海乞乾腹複欠吹炊歌軟次茨資姿諮賠培剖音暗韻識鏡境亡盲妄荒望方妨坊芳肪訪放激脱説\
鋭曽増贈東棟凍妊廷染燃賓歳県栃地池虫蛍蛇虹蝶独蚕風己起妃改記包胞砲泡亀電竜滝豚逐遂家嫁豪腸場湯羊美洋\
詳鮮達羨差着唯堆椎誰焦礁集准進雑雌準奮奪確午許歓権観羽習翌曜濯曰困固錮国団因姻咽園回壇店庫庭庁床麻磨\
心忘恣忍認忌志誌芯忠串患思恩応意臆想息憩恵恐惑感憂寡忙悦恒悼悟怖慌悔憎慣愉惰慎憾憶惧憧憬慕添必泌手看\
摩我義議犠抹拭拉抱搭抄抗批招拓拍打拘捨拐摘挑指持拶括揮推揚提損拾担拠描操接掲掛捗研戒弄械鼻刑型才財材\
存在乃携及吸扱丈史吏更硬梗又双桑隻護獲奴怒友抜投没股設撃殻支技枝肢茎怪軽叔督寂淑反坂板返販爪妥乳浮淫\
将奨采採菜受授愛曖払広勾拡鉱弁雄台怠治冶始胎窓去法会至室到致互棄育撤充銃硫流允唆出山拙岩炭岐峠崩密蜜\
嵐崎崖入込分貧頒公松翁訟谷浴容溶欲裕鉛沿賞党堂常裳掌皮波婆披破被残殉殊殖列裂烈死葬瞬耳取趣最撮恥職聖\
敢聴懐慢漫買置罰寧濁環還夫扶渓規替賛潜失鉄迭臣姫蔵臓賢腎堅臨覧巨拒力男労募劣功勧努勃励加賀架脇脅協行\
律復得従徒待往征径彼役徳徹徴懲微街桁衡稿稼程税稚和移秒秋愁私秩秘称利梨穫穂稲香季委秀透誘稽穀菌萎米粉\
粘粒粧迷粋謎糧菊奥数楼類漆膝様求球救竹笑笠笹箋筋箱筆筒等算答策簿築篭人佐侶但住位仲体悠件仕他伏伝仏休\
仮伎伯俗信佳依例個健側侍停値倣傲倒偵僧億儀償仙催仁侮使便倍優伐宿傷保褒傑付符府任賃代袋貸化花貨傾何荷\
俊傍俺久畝囚内丙柄肉腐座挫卒傘匁以似併瓦瓶宮営善膳年夜液塚幣蔽弊喚換融施旋遊旅勿物易賜尿尼尻泥塀履屋\
握屈掘堀居据裾層局遅漏刷尺尽沢訳択昼戸肩房扇炉戻涙雇顧啓示礼祥祝福祉社視奈尉慰款禁襟宗崇祭察擦由抽油\
袖宙届笛軸甲押岬挿申伸神捜果菓課裸斤析所祈近折哲逝誓斬暫漸断質斥訴昨詐作雪録剥尋急穏侵浸寝婦掃当彙争\
浄事唐糖康逮伊君群耐需儒端両満画歯曲曹遭漕槽斗料科図用庸備昔錯借惜措散廿庶遮席度渡奔噴墳憤焼暁半伴畔\
判拳券巻圏勝藤謄片版之乏芝不否杯矢矯族知智挨矛柔務霧班帰弓引弔弘強弥弱溺沸費第弟巧号朽誇顎汚与写身射\
謝老考孝教拷者煮著箸署暑諸猪渚賭峡狭挟頬追阜師帥官棺管父釜交効較校足促捉距路露跳躍践踏踪骨滑髄禍渦鍋\
過阪阿際障隙随陪陽陳防附院陣隊墜降階陛隣隔隠堕陥穴空控突究窒窃窟窪搾窯窮探深丘岳兵浜糸織繕縮繁縦緻線\
綻締維羅練緒続絵統絞給絡結終級紀紅納紡紛紹経紳約細累索総綿絹繰継緑縁網緊紫縛縄幼後幽幾機畿玄畜蓄弦擁\
滋慈磁系係孫懸遜却脚卸御服命令零齢冷領鈴勇湧通踊疑擬凝範犯氾厄危宛腕苑怨柳卵留瑠貿印臼毀興酉酒酌酎酵\
酷酬酪酢酔配酸猶尊豆頭短豊鼓喜樹皿血盆盟盗温蓋監濫鑑藍猛盛塩銀恨根即爵節退限眼良朗浪娘食飯飲飢餓飾餌\
館餅養飽既概慨平呼坪評刈刹希凶胸離璃殺爽純頓鈍辛辞梓宰壁璧避新薪親幸執摯報叫糾収卑碑陸睦勢熱菱陵亥核\
刻該骸劾述術寒塞醸譲壌嬢毒素麦青精請情晴清静責績積債漬表俵潔契喫害轄割憲生星醒姓性牲産隆峰蜂縫拝寿鋳\
籍春椿泰奏実奉俸棒謹僅勤漢嘆難華垂唾睡錘乗剰今含貪吟念捻琴陰予序預野兼嫌鎌謙廉西価要腰票漂標栗慄遷覆\
煙南楠献門問閲閥間闇簡開閉閣閑聞潤欄闘倉創非俳排悲罪輩扉侯喉候決快偉違緯衛韓干肝刊汗軒岸幹芋宇余除徐\
叙途斜塗束頼瀬勅疎辣速整剣険検倹重動腫勲働種衝薫病痴痘症瘍痩疾嫉痢痕疲疫痛癖匿匠医匹区枢殴欧抑仰迎登\
澄発廃僚瞭寮療彫形影杉彩彰彦顔須膨参惨修珍診文対紋蚊斑斉剤済斎粛塁楽薬率渋摂央英映赤赦変跡蛮恋湾黄横\
把色絶艶肥甘紺某謀媒欺棋旗期碁基甚勘堪貴遺遣潰舞無組粗租狙祖阻査助宜畳並普譜湿顕繊霊業撲僕共供異翼戴\
洪港暴爆恭選殿井丼囲耕亜悪円角触解再講購構溝論倫輪偏遍編冊柵典氏紙婚低抵底民眠捕哺浦蒲舗補邸郭郡郊部\
都郵邦那郷響郎廊盾循派脈衆逓段鍛后幻司伺詞飼嗣舟舶航舷般盤搬船艦艇瓜弧孤繭益暇敷来気汽飛沈枕妻凄衰衷\
面麺革靴覇声眉呉娯誤蒸承函極牙芽邪雅釈番審翻藩毛耗尾宅託為偽畏長張帳脹髪展喪巣単戦禅弾桜獣脳悩厳鎖挙\
誉猟鳥鳴鶴烏蔦鳩鶏島暖媛援緩属嘱偶遇愚隅逆塑遡岡鋼綱剛缶陶揺謡鬱就蹴懇墾貌免逸晩勉象像馬駒験騎駐駆駅\
騒駄驚篤罵騰虎虜膚虚戯虞慮劇虐鹿麓薦慶麗熊能態寅演辰辱震振娠唇農濃送関咲鬼醜魂魔魅塊襲嚇朕雰箇錬遵罷\
屯且藻隷癒璽潟丹丑羞卯巳";
