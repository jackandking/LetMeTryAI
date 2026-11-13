// Batch 31: 画面故事感实验批（story-feel exp, 2026-10-27）
// 延续 batch28-30 单变量实验设计——prompt 系统化加入「故事感工具包」：
//   ① 决定性叙事瞬间 ② 情绪微表情 ③ 动机单光源 ④ 叙事道具
//   ⑤ 动态元素（画框外） ⑥ 前景景深层 ⑦ 色彩故事线
// 选角：prompt-log 中 0 命中、命名 IP + 自带名场面（才女/名姝线，历史人物，快手标题可用真名）：
//   朱淑真(灯下断肠词) / 管道升(墨竹我侬词) / 冯小怜(戎装冬猎)
//   赵合德(初入未央) / 娥皇(湘水泣竹)
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, gore, blood, horror mask on face, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, py, CN名, work后缀, EN身份, 场景CN, 场景EN, 名场面CN, 名场面EN, 动作CN, 动作EN,
//  情绪CN, 情绪EN, 道具CN, 道具EN, 服装CN, 服装EN, coverage, moodCN, moodEN, 光源CN, 光源EN, 色彩CN, 前景EN]
const S = [
  [857, 'zhushuzhen', '朱淑真', '南宋断肠词人',
    'Zhu Shuzhen, the heartbroken poetess of the Southern Song whose verses were gathered as the Broken-Innards poems',
    '书斋灯下·残笺墨迹·夜雨敲窗',
    'a lamp-lit studio at night, rain tapping the paper window, finished verse sheets strewn across the desk',
    '灯下搁笔·一句断肠词将成的一瞬',
    'laying down the brush, she gazes past the rainy window — the frozen instant a line of heartbreak verse completes itself, a story of a poetess who wrote her sorrow into legend told in a single frame',
    '书斋中搁笔而坐、侧首望向雨窗',
    'seated at the desk, brush just laid down, turning her gaze toward the rainy window',
    '幽怨·清醒·才情藏不住',
    'a wistful lucid micro-expression — eyes soft with unshed sorrow, a faint self-aware smile at the corner of the lips',
    '一支搁下的毛笔 + 满案残笺',
    'a just-laid-down brush and verse sheets strewn across the desk',
    '极小黛蓝 dudou（深 V 显沟）+ 单条高透黛蓝纱 at hip，opaque<1/4',
    'a tiny minimal ink-blue dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer ink-blue silk scarf drifting loosely at the hip',
    20, '幽怨·灯下词成', 'wistful, lucid, literate sorrow, lamp-lit',
    '灯焰单光源·暖橙',
    'a single motivated lamp-flame source — warm orange glow on the verse sheets, deep blue shadows, nocturne color grading',
    '黛蓝+灯焰暖橙',
    'the rainy window lattice and strewn verse sheets as foreground framing elements creating cinematic depth layers'],
  [858, 'guandaosheng', '管道升', '元代书画大家',
    'Guan Daosheng, the calligrapher-painter wife of the master Zhao Mengfu of the Yuan dynasty, famed for ink bamboo and the poem Wo Nong Ci',
    '湖州书舫·墨竹影里·砚池新磨',
    'a studio boat moored at Huzhou, fresh-grinding inkstone, finished ink-bamboo scrolls on the lattice wall',
    '笔落墨竹·一竿将成的一瞬',
    'brush touching silk, the first stalk of an ink bamboo half-born — the frozen instant the leaf turns, a story of a woman who painted her marriage into a poem told in a single frame',
    '画案前悬腕运笔、侧首浅笑',
    'at the desk, wrist suspended mid-stroke, head turned with a faint smile',
    '笃定·风雅·相知相惜',
    'a confident graceful micro-expression — eyes crinkled with quiet wit, lips curved in a knowing smile',
    '一支长锋狼毫 + 半成墨竹图',
    'a long wolf-hair brush and a half-born ink-bamboo painting on the silk',
    '极小竹青 dudou（深 V 显沟）+ 单条高透竹青纱 at hip，opaque<1/4',
    'a tiny minimal bamboo-green dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer bamboo-green silk scarf drifting loosely at the hip',
    20, '风雅·墨竹初成', 'confident, graceful, wedded wit, ink-fresh',
    '舫窗漫射晨光·暖白',
    'soft morning light through the boat lattice — a single motivated window source, warm and even, fresh color grading',
    '竹青+墨韵',
    'the hanging bamboo scroll and the inkstone as foreground framing elements creating cinematic depth layers'],
  [859, 'fengxiaolian', '冯小怜', '北齐淑妃',
    'Feng Xiaolian, the favored consort of Emperor Houzhu of Northern Qi who rode in war dress at the winter hunt',
    '冬猎围场·戎装骏马·朔风卷雪',
    'a winter hunting ground under a pale sun, snow whirling in the north wind, distant huntsmen and banners',
    '戎装勒马·回望围场的一瞬',
    'reining her horse at the field edge, she looks back over her shoulder at the hunt — the frozen instant she joins the men at their own game, a story of a consort who out-rode the court told in a single frame',
    '马上勒缰、侧身回望、英姿飒爽',
    'reining the horse, body turned in the saddle, looking back over her shoulder with soldier ease',
    '飒爽·张扬·目下无尘',
    'a bright fearless micro-expression — brows raised in delight, a wide challenging smile, wind-flushed cheeks',
    '一张小弓 + 鞍上猎旗',
    'a short bow slung at her saddle and a hunting pennant snapping in the wind',
    '极小貂灰 dudou（深 V 显沟）+ 单条高透雪灰纱 at hip，opaque<1/4',
    'a tiny minimal sable-grey dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer snow-grey silk scarf drifting loosely at the hip',
    20, '飒爽·冬猎围场', 'bright, fearless, wind-borne, wintry',
    '雪原冷阳·苍白',
    'a single motivated pale winter sun — cold white key light, blue-grey shadows, crisp color grading',
    '貂灰+雪白',
    'the horse mane, the snapping pennant and whirling snow as foreground framing elements creating cinematic depth layers'],
  [860, 'zhaohede', '赵合德', '汉成帝昭仪',
    'Zhao Hede, the younger Zhao sister and consort of Emperor Cheng of Han, famed as the gentle kingdom that toppled a throne',
    '未央椒房·殿烛初燃·金砖映影',
    'the Jiaofang chamber of the Weiyang palace at night, great candles newly lit, gilded floor bricks mirroring the flames',
    '初入椒房·回望殿门的一瞬',
    'stepping across the threshold of the Jiaofang chamber, she glances back through the doors — the frozen instant her new life opens, a story of a sister pair who reached the palace summit told in a single frame',
    '殿门回望、裙裾初曳、仪态万方',
    'pausing at the threshold, glancing back through the open doors, posture poised and unhurried',
    '从容·矜贵·藏锋于柔',
    'a composed regal micro-expression — eyes level and unhurried, a faint smile of quiet ambition',
    '一对新燃的殿烛 + 殿门金钉',
    'a pair of newly-lit palace candles and the gilt-studded doors behind her',
    '极小绛红 dudou（深 V 显沟）+ 单条高透绛红纱 at hip，opaque<1/4',
    'a tiny minimal crimson dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',
    20, '矜贵·椒房初入', 'composed, regal, quietly ambitious, candlelit',
    '殿烛双燃·暖金',
    'a single motivated palace-candle source — warm gold light swelling on gilded bricks, deep crimson shadows, imperial color grading',
    '绛红+殿烛暖金',
    'the gilt-studded door edge and a candle stand as foreground framing elements creating cinematic depth layers'],
  [861, 'ehuang', '娥皇', '舜帝之妃',
    'E Huang, the elder consort of Emperor Shun whose tears speckled the bamboo of the Xiang river',
    '湘水之畔·斑竹含烟·江雾未散',
    'the banks of the Xiang river in morning mist, bamboo groves with tear-speckled stems, still water beyond',
    '临江而立·泪凝睫上的一瞬',
    'standing at the riverbank, a tear poised on her lashes — the frozen instant grief becomes legend, a story of a consort whose tears marked the bamboo forever told in a single frame',
    '湘畔而立、抬手拂竹、泪凝睫上',
    'standing among the bamboo, one hand brushing a stem, a tear poised on her lashes',
    '哀婉·深情·泪光中的坚忍',
    'a tender grieving micro-expression — lashes wet, lips gently pressed, sorrow held with dignity',
    '一竿斑竹 + 襟前一滴泪光',
    'a tear-speckled bamboo stem at her hand and a single tear glinting',
    '极小湘青 dudou（深 V 显沟）+ 单条高透湘青纱 at hip，opaque<1/4',
    'a tiny minimal xiang-green dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pale-green silk scarf drifting loosely at the hip',
    20, '哀婉·湘水泣竹', 'tender, grieving, dignified sorrow, mist-laden',
    '江雾晨光·冷青',
    'a single motivated mist-morning light — cool diffuse glow through the bamboo, soft green shadows, aqueous color grading',
    '湘青+雾白',
    'the tear-speckled bamboo stems and drifting mist as foreground framing elements creating cinematic depth layers'],
];

const manifest = [];
for (const [id, py, cn, work, enId, sceneCN, sceneEN, momentCN, momentEN,
  actCN, actEN, emoCN, emoEN, propCN, propEN, wardCN, wardEN, cov, moodCN, moodEN,
  lightCN, lightEN, colorCN, fgEN] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const prompt = `Cinematic medium-close-up artistic portrait with strong narrative storytelling of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure — specifically not resembling any actress who has portrayed this character in any screen or game adaptation. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. The decisive narrative moment: ${momentEN}. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Emotional micro-expression: ${emoEN}. Story props: ${propEN}. Motion beyond the frame: her long dark hair and the single sheer silk scarf drifting in the air, fabric and small details frozen in motion. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt. Lighting: ${lightEN}. Camera: 85mm lens, medium close-up environmental portrait, shallow depth of field — ${fgEN}. Color story: ${'palette locked to the emotional beat: ' + colorCN}. Mood: ${moodEN}, artistic and non-sexual. Style: cinematic fashion editorial with narrative storytelling, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    exp: {
      name: 'story-feel',
      batch: 31,
      date: '2026-10-27',
      vars: ['decisive-moment', 'emotional-micro-expression', 'motivated-single-light', 'story-props', 'motion-beyond-frame', 'foreground-depth', 'color-story'],
      baseline: 'batch<=27 通用场景写法（无明确叙事时刻/通用柔光）',
    },
    subject,
    story_moment: momentCN,
    scene: sceneCN,
    context: sceneEN + ' (background accents only, never wrapping the figure)',
    lighting: lightCN,
    composition: '85mm 中近景环境人像·前景景深层',
    action: actCN,
    emotion: emoCN,
    motif: propCN,
    motion: '发丝与纱幔随画框外气流扬起（动态瞬间）',
    style: '电影感时尚大片·叙事感·超写实',
    mood: moodCN,
    wardrobe: wardCN,
    coverage_pct: cov,
    camera: '85mm',
    body_type: BODY,
    face: '原创虚构五官，避免任何真实演员/名人/公众人物可识别相似性（纯原创，非该角色任何影视/游戏版本的扮演者）',
    negative: NEG_DUDOU,
    prompt_text: prompt,
  };
  const file = path.join(DIR, `dna-${id}-${py}.json`);
  fs.writeFileSync(file, JSON.stringify(dna, null, 1));
  manifest.push({ id, py, cn, work, cov, file, subject });
}
console.log('written', manifest.length, 'DNA files (story-feel exp batch31):');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn}（${m.work}） cov=${m.cov}`);
console.log('subjects:');
for (const m of manifest) console.log('  ', JSON.parse(fs.readFileSync(m.file, 'utf8')).subject);
fs.writeFileSync(path.join(DIR, 'story-exp-batch31-manifest.json'), JSON.stringify({
  exp: 'story-feel-2026-10-27', batch: 31, created: new Date().toISOString(),
  chars: manifest.map(m => ({ logical_id: m.id, py: m.py, cn: m.cn, work: m.work, subject: m.subject, db_id: null, image_url: null })),
}, null, 1));
console.log('manifest: story-exp-batch31-manifest.json');
