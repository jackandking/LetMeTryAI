// Batch 29: 画面故事感实验批（story-feel exp, 2026-10-27）
// 延续 batch28 单变量实验设计——prompt 系统化加入「故事感工具包」：
//   ① 决定性叙事瞬间 ② 情绪微表情 ③ 动机单光源 ④ 叙事道具
//   ⑤ 动态元素（画框外） ⑥ 前景景深层 ⑦ 色彩故事线
// 对照基线：batch27 及之前通用写法。
// 选角：prompt-log 中 0 命中、命名 IP + 自带名场面（秦淮八艳，历史人物，快手标题可用真名）：
//   柳如是(扁舟儒装访钱) / 顾横波(眉楼执盏) / 卞玉京(乱后空庭抚断琴)
//   马湘兰(画舫写兰) / 寇白门(夜色勒马闯营救夫)
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, gore, blood, horror mask on face, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, py, CN名, subject后缀作品, EN身份, 场景CN, 场景EN, 名场面CN, 名场面EN, 动作CN, 动作EN,
//  情绪CN, 情绪EN, 道具CN, 道具EN, 服装CN, 服装EN, coverage, moodCN, moodEN, 光源CN, 光源EN, 色彩CN, 前景EN]
const S = [
  [843, 'liuruoshi', '柳如是', '秦淮八艳',
    'Liu Rushi, the gifted courtesan-poet of the Qinhuai pleasure quarter in late-Ming Nanjing, later wife of the scholar Qian Qianyi',
    '寒江扁舟·风雪半野堂·暮色苍茫',
    'a small skiff on the cold river at dusk, snow-laden reeds, the distant half-lit hall of the scholars villa across the water',
    '扁舟初访·儒装回眸定情的一瞬',
    'standing in a scholar robe aboard the small skiff, turning to look back over the bow as the cold river wind lifts her hair — the frozen instant she decides to give her heart, a story of a proud talented woman who chose her own fate told in a single frame',
    '扁舟上儒装而立、半身回转向镜头、风雪中回眸',
    'standing in a man scholar robe on the skiff, body half-turned toward the viewer, looking back through the snow',
    '清傲·决然·将托付未托付',
    'a proud resolute micro-expression — chin lifted, eyes bright with unspoken devotion, lips pressed in a quiet smile of resolve',
    '一袭男装儒衫 + 手中一卷诗稿',
    'a man scholar robe worn with quiet defiance and a rolled poem manuscript in her hand',
    '极小雪青 dudou（深 V 显沟）+ 单条高透雪青纱 at hip，opaque<1/4',
    'a tiny minimal snow-cyan dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer snow-cyan silk scarf drifting loosely at the hip',
    20, '清傲·寒江扁舟', 'proud, resolute, cold-river romance, quietly defiant',
    '暮色江天·冷青天光',
    'a single motivated cold dusk light from the overcast river sky with a soft rim, deep blue-grey shadows, wintry color grading',
    '雪青+寒江墨青',
    'the skiffs wet gunwale and drooping reed tassels as foreground framing elements creating cinematic depth layers'],
  [844, 'guhengbo', '顾横波', '秦淮八艳',
    'Gu Hengbo, the famed courtesan-hostess of the Meilou (Brows Pavilion) in late-Ming Nanjing, later lady of Gong Dingzi',
    '朱楼灯火·眉楼夜宴·烛影摇红',
    'the lantern-lit upper chamber of the Meilou pavilion at night, red candles guttering, wine cups and a lacquer zither on the low table',
    '眉楼执盏回眸·乱世红颜的一瞬',
    'holding a wine cup, she turns back over her shoulder with a languid smile — the frozen instant the music pauses and the whole revel holds breath, a story of a dazzling hostess who ruled her own world told in a single frame',
    '朱楼中执盏而立、回眸浅笑、衣袖垂落',
    'standing with a wine cup in hand, turning her head back over her shoulder with a languid smile, sleeve slipping from her shoulder',
    '明艳·慵懒·掌控',
    'a luminous languid micro-expression — half-lidded eyes, a knowing smile, utterly in command of the room',
    '一盏红灯影里的酒盏 + 案上焦尾琴',
    'a wine cup glowing in the candlelight and a lacquer zither on the low table',
    '极小胭脂红 dudou（深 V 显沟）+ 单条高透绯红纱 at hip，opaque<1/4',
    'a tiny minimal rouge-red dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',
    20, '明艳·眉楼夜宴', 'radiant, languid, in-command, candlelit splendor',
    '烛火动机光源·暖红',
    'a single motivated candlelight source — warm red glow flickering on her skin, deep crimson shadows, candlelit color grading',
    '胭脂红+烛火金',
    'the bronze candlestick and the rim of a wine cup as foreground framing elements creating cinematic depth layers'],
  [845, 'biyujing', '卞玉京', '秦淮八艳',
    'Bian Yujing, the qin-playing courtesan of late-Ming Nanjing who later took vows amid the turmoil',
    '乱后空庭·残烛古琴·苔痕满阶',
    'a deserted courtyard after the war, a broken ancient qin on the stone table, a single guttering candle, moss creeping over the steps',
    '空庭抚断琴·指尖将落未落的一瞬',
    'before the broken qin, her fingertips hover a breath above the strings — the frozen instant before the first note of a song for a broken world, a story of a musician who outlived her era told in a single frame',
    '空庭中临琴而立、指尖悬于弦上、垂眸',
    'standing at the qin, fingertips suspended just above the strings, eyes lowered',
    '沉静·哀而不伤·清绝',
    'a serene sorrowful micro-expression — long lashes lowered, a faint melancholy smile, composure untouched by ruin',
    '一张断弦古琴 + 案上一截残烛',
    'a broken-string ancient qin and a single stub of candle on the stone table',
    '极小月白 dudou（深 V 显沟）+ 单条高透月白纱 at hip，opaque<1/4',
    'a tiny minimal moon-white dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer moon-white silk scarf drifting loosely at the hip',
    20, '沉静·乱后空庭', 'serene, elegiac, pure and unbroken, quietly tragic',
    '残烛单光源·冷白',
    'a single motivated candle source — cold white glow on her skin, deep blue-grey shadows, mournful color grading',
    '月白+残烛冷金',
    'the broken qin and a stone step with moss as foreground framing elements creating cinematic depth layers'],
  [846, 'maxianglan', '马湘兰', '秦淮八艳',
    'Ma Xianglan, the orchid-painting courtesan-artist of late-Ming Nanjing, famed for a lifetime of painting orchids',
    '画舫兰香·窗竹影疏·砚墨初研',
    'a painting studio aboard a moored pleasure boat, bamboo shadows on paper-screen windows, an inkstone freshly ground, a spray of living orchid by the desk',
    '画案落墨·一笔兰叶将成的一瞬',
    'at the painting desk, brush dipped and poised above the silk — the frozen instant the first orchid leaf is about to bloom from her wrist, a story of a woman who painted her own freedom told in a single frame',
    '画案前蘸墨欲落、半侧身回眸、笔尖悬停',
    'at the painting desk, brush dipped and hovering, body half-turned in a glance back over her shoulder',
    '专注·清雅·自得',
    'a focused serene micro-expression — a faint smile of quiet self-possession, eyes soft on the unseen leaf',
    '一支蘸墨的毛笔 + 案上半成的兰叶',
    'an ink-dipped brush and a half-painted orchid leaf on the silk',
    '极小藕荷 dudou（深 V 显沟）+ 单条高透藕荷纱 at hip，opaque<1/4',
    'a tiny minimal lotus-lilac dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer lilac silk scarf drifting loosely at the hip',
    20, '清雅·画舫写兰', 'elegant, focused, self-possessed, scholarly calm',
    '窗纸漫射柔光·暖白',
    'soft daylight filtering through paper-screen windows — a single motivated window-light source, warm and diffuse, gentle bloom',
    '藕荷+竹影青',
    'bamboo shadows on the window and the inkstone as foreground framing elements creating cinematic depth layers'],
  [847, 'koubaimen', '寇白门', '秦淮八艳',
    'Kou Baimen, the chivalrous courtesan of late-Ming Nanjing who rode out alone to ransom her husband from rebels',
    '夜色骏马·披风猎猎·城门将启',
    'a moonless night before the city gate, a tall horse stamping, her cloak snapping in the wind, lantern-light dying on the wall',
    '勒马回望·决意闯营救夫的一瞬',
    'reining in the horse, she looks back over her shoulder at the dark gate — the frozen instant before she rides alone into the rebel camp to ransom her lord, a story of a courtesan with a warriors heart told in a single frame',
    '夜色中勒马回望、披风扬起、身姿挺拔',
    'reining in the horse, turning back over her shoulder toward the gate, cloak flying, posture proud and straight',
    '英气·决绝·柔中带刚',
    'a brave resolute micro-expression — jaw set, eyes blazing with quiet defiance, no fear',
    '一匹骏马 + 猎猎披风',
    'a tall horse and a cloak snapping in the night wind',
    '极小玄青 dudou（深 V 显沟）+ 单条高透玄青纱 at hip，opaque<1/4',
    'a tiny minimal ink-black dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer ink-black silk scarf drifting loosely at the hip',
    20, '英气·夜色闯营', 'valiant, resolute, tender-strength, night-borne',
    '城门残灯·冷月微光',
    'a single motivated dying-lantern source — cold amber glint on her skin, deep blue-black shadows, nocturnal color grading',
    '玄青+残灯暖金',
    'the horses mane and the city gates iron studs as foreground framing elements creating cinematic depth layers'],
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
      batch: 29,
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
console.log('written', manifest.length, 'DNA files (story-feel exp batch29):');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn}（${m.work}） cov=${m.cov}`);
console.log('subjects:');
for (const m of manifest) console.log('  ', JSON.parse(fs.readFileSync(m.file, 'utf8')).subject);
fs.writeFileSync(path.join(DIR, 'story-exp-batch29-manifest.json'), JSON.stringify({
  exp: 'story-feel-2026-10-27', batch: 29, created: new Date().toISOString(),
  chars: manifest.map(m => ({ logical_id: m.id, py: m.py, cn: m.cn, work: m.work, subject: m.subject, db_id: null, image_url: null })),
}, null, 1));
console.log('manifest: story-exp-batch29-manifest.json');
