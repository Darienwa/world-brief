// Keyword-based classifier. Title hits weigh 3x, summary hits 1x.
// Chinese keywords match as substrings; English as whole words (case-insensitive).

export const CATEGORIES = [
  { id: 'military', label: '军事冲突', color: '#e66767', zh: ['军事', '军队', '空袭', '导弹', '无人机', '战争', '冲突', '交火', '停火', '袭击', '武装', '士兵', '部队', '国防', '军演', '演习', '核武', '炮击', '前线', '占领', '恐怖', '哈马斯', '真主党', '北约', '胡塞', '人质', '军舰', '战机', '伤亡', '入侵'],
    en: ['military', 'army', 'troops', 'airstrike', 'airstrikes', 'missile', 'missiles', 'drone', 'drones', 'war', 'warfare', 'conflict', 'ceasefire', 'truce', 'attack', 'attacks', 'shelling', 'armed', 'soldier', 'soldiers', 'defense', 'defence', 'pentagon', 'nato', 'navy', 'naval', 'air force', 'nuclear weapon', 'nuclear weapons', 'nuclear test', 'warhead', 'weapon', 'weapons', 'hamas', 'hezbollah', 'houthi', 'houthis', 'militants', 'insurgents', 'hostage', 'hostages', 'frontline', 'offensive', 'invasion', 'combat', 'fighter jet', 'warship', 'terror', 'terrorist', 'bombing', 'explosion', 'artillery', 'rebels', 'militia'] },
  { id: 'health', label: '疫情卫生', color: '#199e70', zh: ['疫情', '病毒', '感染', '病例', '疫苗', '传染', '流感', '新冠', '霍乱', '登革', '猴痘', '埃博拉', '麻疹', '卫生', '世卫', '疾控', '暴发', '爆发', '大流行', '医院', '公共卫生', '禽流感', '疟疾', '结核'],
    en: ['outbreak', 'epidemic', 'pandemic', 'virus', 'viral', 'infection', 'infections', 'vaccine', 'vaccines', 'vaccination', 'influenza', 'flu', 'covid', 'cholera', 'dengue', 'mpox', 'ebola', 'measles', 'marburg', 'malaria', 'tuberculosis', 'polio', 'avian', 'h5n1', 'WHO', 'health', 'disease', 'diseases', 'pathogen', 'hospital', 'surveillance', 'antimicrobial', 'nipah', 'zika'] },
  { id: 'disaster', label: '灾害气候', color: '#d95926', zh: ['地震', '洪水', '洪灾', '台风', '飓风', '暴雨', '干旱', '山火', '野火', '火山', '海啸', '滑坡', '泥石流', '气候', '极端天气', '高温', '寒潮', '灾害', '救灾', '遇难'],
    en: ['earthquake', 'quake', 'magnitude', 'flood', 'floods', 'flooding', 'typhoon', 'hurricane', 'cyclone', 'storm', 'drought', 'wildfire', 'wildfires', 'volcano', 'eruption', 'tsunami', 'landslide', 'climate', 'heatwave', 'disaster', 'evacuate', 'evacuated', 'famine', 'cop30', 'emissions'] },
  { id: 'economy', label: '经济贸易', color: '#c98500', zh: ['经济', '贸易', '关税', '市场', '股市', '通胀', '利率', '央行', '投资', 'GDP', '出口', '进口', '制裁', '油价', '能源', '货币', '债务', '财政', '供应链', '企业', '银行'],
    en: ['economy', 'economic', 'trade', 'tariff', 'tariffs', 'market', 'markets', 'stocks', 'inflation', 'interest rate', 'central bank', 'Fed', 'investment', 'GDP', 'export', 'exports', 'imports', 'fertilizer', 'shipments', 'investors', 'sanctions', 'oil', 'energy', 'currency', 'debt', 'budget', 'supply chain', 'IMF', 'world bank', 'recession', 'opec', 'prices'] },
  { id: 'tech', label: '科技', color: '#3987e5', zh: ['科技', '人工智能', 'AI', '芯片', '半导体', '航天', '卫星', '火箭', '网络安全', '量子', '数字', '互联网'],
    en: ['technology', 'tech', 'AI', 'artificial intelligence', 'chip', 'chips', 'semiconductor', 'spacecraft', 'space station', 'satellite', 'rocket', 'cyber', 'cyberattack', 'quantum', 'digital', 'internet'] },
  { id: 'politics', label: '政治外交', color: '#9085e9', zh: ['总统', '总理', '首相', '政府', '选举', '大选', '议会', '国会', '外交', '外长', '会谈', '会晤', '峰会', '联合国', '安理会', '协议', '谈判', '抗议', '示威', '政党', '内阁', '访问', '双边', '制裁', '主席', '领导人', '政变', '难民', '移民', '人权', '论坛', '合作', '大使', '外交部', '会见'],
    en: ['president', 'prime minister', 'government', 'election', 'elections', 'vote', 'voters', 'parliament', 'congress', 'senate', 'diplomatic', 'diplomacy', 'minister', 'talks', 'summit', 'UN', 'security council', 'agreement', 'deal', 'negotiations', 'protest', 'protests', 'cabinet', 'visit', 'bilateral', 'leader', 'coup', 'refugees', 'migrants', 'human rights', 'sovereignty', 'forum', 'cooperation', 'ambassador', 'envoy', 'foreign ministry', 'kremlin', 'white house', 'EU', 'treaty'] },
];

// Display order (validated for adjacent-pair CVD separation on the dark surface).
export const DISPLAY_ORDER = ['politics', 'military', 'health', 'disaster', 'tech', 'economy', 'society'];

export const OTHER = { id: 'society', label: '社会综合', color: '#8b8d98' };

export const REGIONS = [
  { id: 'asia', label: '亚太', zh: ['中国', '日本', '韩国', '朝鲜', '印度', '巴基斯坦', '东南亚', '越南', '菲律宾', '泰国', '缅甸', '印尼', '马来西亚', '新加坡', '澳大利亚', '台湾', '香港', '阿富汗', '孟加拉', '柬埔寨', '新西兰', '蒙古', '尼泊尔', '斯里兰卡'],
    en: ['china', 'chinese', 'beijing', 'japan', 'japanese', 'korea', 'korean', 'pyongyang', 'india', 'indian', 'pakistan', 'asean', 'vietnam', 'philippines', 'thailand', 'myanmar', 'indonesia', 'malaysia', 'singapore', 'australia', 'taiwan', 'hong kong', 'afghanistan', 'bangladesh', 'cambodia', 'new zealand', 'asia', 'pacific'] },
  { id: 'europe', label: '欧洲', zh: ['俄罗斯', '乌克兰', '欧盟', '英国', '法国', '德国', '意大利', '西班牙', '波兰', '欧洲', '北约', '莫斯科', '基辅', '土耳其', '白俄罗斯', '匈牙利', '塞尔维亚', '普京', '泽连斯基', '希腊', '荷兰', '比利时', '瑞典', '芬兰', '挪威', '格鲁吉亚', '亚美尼亚', '阿塞拜疆'],
    en: ['russia', 'russian', 'ukraine', 'ukrainian', 'kyiv', 'moscow', 'kremlin', 'EU', 'europe', 'european', 'britain', 'UK', 'london', 'france', 'french', 'germany', 'german', 'italy', 'spain', 'poland', 'nato', 'turkey', 'turkiye', 'belarus', 'hungary', 'serbia', 'netherlands', 'sweden', 'finland', 'belgium', 'brussels', 'greece', 'romania', 'portugal', 'denmark', 'norway', 'austria', 'switzerland', 'czech', 'baltic', 'armenia', 'azerbaijan', 'putin', 'zelensky'] },
  { id: 'mideast', label: '中东', zh: ['以色列', '巴勒斯坦', '加沙', '伊朗', '伊拉克', '叙利亚', '黎巴嫩', '也门', '沙特', '约旦', '卡塔尔', '阿联酋', '中东', '约旦河西岸', '哈马斯', '胡塞'],
    en: ['israel', 'israeli', 'palestine', 'palestinian', 'gaza', 'west bank', 'iran', 'iranian', 'tehran', 'iraq', 'syria', 'syrian', 'lebanon', 'yemen', 'saudi', 'jordan', 'qatar', 'UAE', 'middle east', 'hamas', 'hezbollah', 'houthi'] },
  { id: 'americas', label: '美洲', zh: ['美国', '加拿大', '墨西哥', '巴西', '阿根廷', '委内瑞拉', '古巴', '哥伦比亚', '智利', '秘鲁', '海地', '华盛顿', '特朗普', '拉美', '巴拿马', '厄瓜多尔', '玻利维亚', '危地马拉', '阿拉斯加'],
    en: ['US', 'U.S.', 'united states', 'america', 'american', 'washington', 'trump', 'canada', 'mexico', 'brazil', 'argentina', 'venezuela', 'cuba', 'colombia', 'chile', 'peru', 'haiti', 'latin america', 'caribbean', 'panama', 'ecuador', 'bolivia', 'guatemala', 'honduras', 'nicaragua', 'el salvador', 'alaska', 'arctic'] },
  { id: 'africa', label: '非洲', zh: ['非洲', '苏丹', '埃及', '尼日利亚', '埃塞俄比亚', '刚果', '南非', '肯尼亚', '索马里', '马里', '利比亚', '萨赫勒', '布基纳法索', '尼日尔', '乍得', '多哥', '加纳', '塞内加尔', '喀麦隆', '安哥拉', '坦桑尼亚', '卢旺达', '津巴布韦', '阿尔及利亚', '摩洛哥', '突尼斯', '非盟'],
    en: ['africa', 'african', 'sudan', 'egypt', 'nigeria', 'ethiopia', 'congo', 'DRC', 'south africa', 'kenya', 'somalia', 'mali', 'libya', 'sahel', 'burkina faso', 'niger', 'chad', 'mozambique', 'uganda', 'togo', 'ghana', 'senegal', 'cameroon', 'angola', 'tanzania', 'rwanda', 'zimbabwe', 'algeria', 'morocco', 'tunisia', 'eritrea', 'south sudan'] },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(group) {
  // Latin terms (from either list) match as whole words; ones containing capitals (US, WHO, EU) are case-sensitive.
  const isLatin = (k) => [...k].every((ch) => ch.charCodeAt(0) < 128);
  const latin = [...group.en, ...group.zh].filter(isLatin);
  const zh = group.zh.filter((k) => !isLatin(k));
  const re = (list, flags) => (list.length ? new RegExp(`(?<![A-Za-z])(${list.map(esc).join('|')})(?![A-Za-z])`, flags) : null);
  return { ...group, zh, ciRe: re(latin.filter((k) => k === k.toLowerCase()), 'gi'), csRe: re(latin.filter((k) => k !== k.toLowerCase()), 'g') };
}

const C = CATEGORIES.map(compile);
const R = REGIONS.map(compile);

function score(group, title, body) {
  const count = (text) => {
    let n = 0;
    for (const re of [group.ciRe, group.csRe]) if (re) n += (text.match(re) || []).length;
    for (const k of group.zh) if (text.includes(k)) n++;
    return n;
  };
  return count(title) * 3 + count(body);
}

export function classify(item, hint) {
  const title = item.title || '';
  const body = (item.summary || '').slice(0, 600);
  const scored = C.map((c) => ({ id: c.id, s: score(c, title, body) + (c.id === hint ? 4 : 0) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s);
  const regions = R.map((r) => ({ id: r.id, s: score(r, title, body) })).filter((x) => x.s >= 2).sort((a, b) => b.s - a.s);
  return {
    category: scored[0]?.id || OTHER.id,
    tags: scored.slice(0, 3).map((x) => x.id),
    regions: regions.slice(0, 2).map((x) => x.id),
  };
}
