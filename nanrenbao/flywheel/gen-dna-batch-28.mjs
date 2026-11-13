// Batch 28: 画面故事感实验批（story-feel exp, 2026-10-25）
// 实验设计：单变量——prompt 中系统化加入「故事感工具包」：
//   ① 决定性叙事瞬间（decisive moment，故事前一帧/后一帧）
//   ② 情绪微表情（未落泪/将笑未笑的睫毛与唇线）
//   ③ 动机单光源（烛火/月光/炉火/窗光驱动画面，非通用柔光）
//   ④ 叙事道具（断钗/合欢铃/伤心花/崩石/小鸟，承载故事）
//   ⑤ 动态元素（发丝纱幔火星花瓣在动，暗示画框外动作）
//   ⑥ 前景景深层（井沿/花枝/烛台作前景，浅景深）
//   ⑦ 色彩故事线（青绿月华/湖蓝vs炉火橙/绯红vs月蓝/粉春/石榴红烛橙）
// 对照基线：batch27 及之前的通用写法（场景+姿态+柔光，无明确叙事时刻）
// 选角：239 个已用角色外全新；全部命名 IP + 自带名场面（转化 3x 结论）；
//   碧瑶(满月井)/龙葵(剑炉)/林月如(锁妖塔)/阿宝(离魂化鸟)/霍小玉(夜宴断钗)
// 注意：龙葵/林月如为游戏 IP——画廊无限制；若日后发快手需按 §5 用纯特征描述标题。
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, gore, blood, horror mask on face, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, py, CN名, subject后缀作品, EN身份, 场景CN, 场景EN, 名场面CN, 名场面EN, 动作CN, 动作EN,
//  情绪CN, 情绪EN, 道具CN, 道具EN, 服装CN, 服装EN, coverage, moodCN, moodEN, 光源CN, 光源EN, 色彩CN, 前景EN]
const S = [
  [829, 'biyao', '碧瑶', '诛仙',
    'Biyao, the devoted ghost-realm maiden from the Chinese fantasy novel Zhu Xian (Jade Dynasty)',
    '午夜古井·月华如霜·苔痕斑驳',
    'the mossy Moon-Reflection Well at midnight, the full moon mirrored in still dark water, withered vines trailing over the stone rim',
    '满月井前闭目许愿——故事最甜也最悲的一帧',
    'kneeling at the ancient well, hands gently folded over her chest, making a silent wish at the frozen instant the full moon touches the water — just before she opens her eyes, a story of devotion and doomed love told in a single frame',
    '跪于井沿、半身回转向镜头、垂眸许愿',
    'kneeling at the well edge, body half-turned toward the viewer, eyes lowered mid-wish',
    '痴情·凄婉·将泪未泪',
    'a bittersweet micro-expression — lashes wet as if holding back tears, lips curved in a faint hopeful sorrowful smile',
    '耳边一朵伤心花 + 腕上一枚合欢银铃',
    'a tiny heartbreak-blue flower tucked at her ear and a small silver bell (Huanhuan bell) at her wrist',
    '极小水绿 dudou（深 V 显沟）+ 单条高透翠绿纱 at hip，opaque<1/4',
    'a tiny minimal emerald-green dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer jade-green silk scarf drifting loosely at the hip',
    20, '痴情·满月井', 'devoted, bittersweet, doomed romance, ethereal and quietly heartbreaking',
    '冷月单光源·青银月色',
    'a single motivated moonlight source — cool silver-teal key light from the full moon with a soft rim light, deep teal shadows, moonlit color grading',
    '青绿月华·银蓝夜色',
    'the mossy well rim and a drooping vine as foreground framing elements creating cinematic depth layers'],
  [830, 'longkui', '龙葵', '仙剑奇侠传三',
    'Longkui, the Jiang-state princess who cast herself into the sword furnace in the video-game tale Chinese Paladin 3 (Xian Jian Qi Xia Zhuan San)',
    '姜国铸剑炉前·烈焰腾空·火星飞舞',
    'the royal sword-casting furnace of the lost Jiang state, furnace fire soaring, embers drifting like fireflies in the dark hall',
    '投炉前一瞬——火光映脸的诀别之帧',
    'standing before the glowing furnace, arms slightly opening toward the flames, head turning back over her shoulder — the frozen instant just before the sacrifice, a story of a sister\'s devotion to her brother told in a single frame',
    '临炉回眸、决绝而平静、赴火之姿',
    'standing before the furnace, turning her head back over her shoulder toward the viewer',
    '凄艳·决绝·含泪微笑',
    'a serene resolute micro-expression — tears long dried, a small sad smile of farewell, eyes reflecting the fire',
    '炽燃的铸剑炉 + 炉台上一柄未成的剑',
    'the blazing casting furnace and an unfinished sword on the anvil before her',
    '极小湖蓝 dudou（深 V 显沟）+ 单条高透湖蓝纱 at hip，opaque<1/4',
    'a tiny minimal lake-blue dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer sky-blue silk scarf drifting loosely at the hip',
    20, '凄艳·剑炉诀别', 'poignant, resolute, sacrificial, tender and heartbreaking',
    '炉火动机光源·暖橙',
    'a single motivated firelight source — warm orange glow from the furnace casting on her face and skin, cool blue shadows at the edges, strong warm-cool contrast',
    '湖蓝人影 vs 炉火橙光',
    'the dark furnace grate and anvil silhouette as foreground framing elements creating cinematic depth layers'],
  [831, 'linyueru', '林月如', '仙剑奇侠传',
    'Lin Yueru, the fiery heiress of the Lin Mansion in the video-game tale Chinese Paladin (Xian Jian Qi Xia Zhuan)',
    '锁妖塔崩·月冷石危·尘雾弥漫',
    'the Suoyao Pagoda collapsing under moonlight, gigantic stones crashing loose, dust and mist swirling through broken iron chains',
    '崩塔回眸——"吃到老玩到老"的诀别一帧',
    'caught in the frozen instant as the pagoda crumbles behind her, she looks back over her shoulder with a gentle smile — the story of a stubborn girl who finally found her home, told in a single frame',
    '回眸浅笑、衣发被气浪掀动、诀别之姿',
    'turning her head back over her shoulder toward the viewer, hair and scarf whipped by the shockwave',
    '坚毅·凄艳·温柔诀别',
    'a gentle fearless micro-expression — a soft forgiving smile with misty eyes, no fear, only tenderness',
    '崩落的巨塔石块 + 断裂的锁链',
    'crashing pagoda stones and broken iron chains swinging in the dust',
    '极小绯红 dudou（深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4',
    'a tiny minimal crimson dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',
    20, '坚毅·锁妖塔', 'fearless, tender, heartbreaking farewell, quietly heroic',
    '冷月为主·火把暖点双源张力',
    'cold moonlight as the primary source with a warm distant torch glow — dual-source tension between cool blue night and warm amber embers, cinematic color grading',
    '绯红 vs 冷蓝夜色',
    'swinging broken chains and tumbling rubble as foreground framing elements creating cinematic depth layers'],
  [832, 'abao', '阿宝', '聊斋志异',
    'Abao, the young mistress in the tale Abao in Strange Tales from a Chinese Studio (Liaozhai Zhiyi)',
    '春日闺阁·绣架窗光·海棠压枝',
    'a spring boudoir, an embroidery frame by the lattice window, crabapple branches heavy with blossom pressing against the window paper',
    '离魂化鸟栖钗——人狐（人鸟）情根的第一帧',
    'a small bird perches quietly on her jade hairpin while she lowers her eyes with a tender, startled, secretly joyful smile — the surreal story of a soul that crossed death to be near her, told in a single frame',
    '垂眸浅笑、小鸟栖钗、绣针停在半空',
    'lowering her eyes in a tender smile, the embroidery needle frozen mid-stitch as the little bird rests on her hairpin',
    '娇羞·温柔·宿命心动',
    'a tender startled micro-expression — cheeks faintly flushed, a secret joyful smile she cannot hide, eyes soft as still water',
    '发钗上一只小鸟 + 绣架上半成的并蒂莲',
    'a small bird perched on her jade hairpin and a half-finished twin-lotus embroidery on the hoop',
    '极小藕粉 dudou（深 V 显沟）+ 单条高透粉纱 at hip，opaque<1/4',
    'a tiny minimal lotus-pink dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',
    20, '娇羞·离魂化鸟', 'tender, shy, fated heartbeat, spring-bright and quietly magical',
    '春日窗光·柔和暖白',
    'soft spring daylight filtering through the window paper — a single motivated window-light source, warm and diffuse, gentle bloom, poetic color grading',
    '藕粉+海棠胭脂色',
    'crabapple branches outside the window and the embroidery hoop as foreground framing elements creating cinematic depth layers'],
  [833, 'huoxiaoyu', '霍小玉', '唐传奇',
    'Huo Xiaoyu, the ill-fated songstress from the Tang-dynasty legend The Tale of Huo Xiaoyu (Huo Xiaoyu Zhuan)',
    '唐式夜宴·烛影摇红·酒盏生凉',
    'a Tang-dynasty night banquet, candle flames guttering and shadows swaying across the lacquered table, a bronze wine cup going cold',
    '夜宴断钗——负心人面前的碎心一帧',
    'holding a broken golden hairpin at the farewell banquet, she looks back over her shoulder with tears and reproach — the frozen instant the hairpin snaps, a story of betrayal and a proud heart breaking, told in a single frame',
    '执钗回眸、泪眼含恨、酒盏倾覆之姿',
    'turning her head back over her shoulder, the broken hairpin held between her fingers, wine rippling in the tilted cup',
    '凄艳·含恨·傲骨碎裂',
    'a heartbroken yet proud micro-expression — tears unshed, jaw set, eyes blazing with reproach and wounded dignity',
    '两截断开的金钗 + 一只倾覆的酒盏',
    'a golden hairpin snapped in two between her fingers and an overturned bronze wine cup on the table',
    '极小石榴红 dudou（深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4',
    'a tiny minimal pomegranate-red dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',
    20, '凄艳·夜宴断钗', 'heartbroken, proud, reproachful, crimson-candlelit sorrow',
    '烛火动机光源·暖橙单点',
    'a single motivated candlelight source — warm orange candle glow flickering on her skin and the broken hairpin, deep crimson shadows, candlelit color grading',
    '石榴红+烛火金橙',
    'a bronze candlestick and the tilted wine cup as foreground framing elements creating cinematic depth layers'],
];

const manifest = [];
for (const [id, py, cn, work, enId, sceneCN, sceneEN, momentCN, momentEN,
  actCN, actEN, emoCN, emoEN, propCN, propEN, wardCN, wardEN, cov, moodCN, moodEN,
  lightCN, lightEN, colorCN, fgEN] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const prompt = `Cinematic medium-close-up artistic portrait with strong narrative storytelling of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure — specifically not resembling any actress who has portrayed this character in any screen or game adaptation. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. The decisive narrative moment: ${momentEN}. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actCN === actCN ? actEN : actEN}. Emotional micro-expression: ${emoEN}. Story props: ${propEN}. Motion beyond the frame: her long dark hair and the single sheer silk scarf drifting in the air, fabric and small details frozen in motion. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt. Lighting: ${lightEN}. Camera: 85mm lens, medium close-up environmental portrait, shallow depth of field — ${fgEN}. Color story: ${colorCN === colorCN ? '' : ''}${'palette locked to the emotional beat: ' + colorCN}. Mood: ${moodEN}, artistic and non-sexual. Style: cinematic fashion editorial with narrative storytelling, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    exp: {
      name: 'story-feel',
      batch: 28,
      date: '2026-10-25',
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
console.log('written', manifest.length, 'DNA files (story-feel exp batch28):');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn}（${m.work}） cov=${m.cov}`);
console.log('subjects:');
for (const m of manifest) console.log('  ', JSON.parse(fs.readFileSync(m.file, 'utf8')).subject);
fs.writeFileSync(path.join(DIR, 'story-exp-batch28-manifest.json'), JSON.stringify({
  exp: 'story-feel-2026-10-25', batch: 28, created: new Date().toISOString(),
  chars: manifest.map(m => ({ logical_id: m.id, py: m.py, cn: m.cn, work: m.work, subject: m.subject, db_id: null, image_url: null })),
}, null, 1));
console.log('manifest: story-exp-batch28-manifest.json');
