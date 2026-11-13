// Batch 25: 潘金莲主题（水浒传/金瓶梅经典文学人物）4 场景变体
// r807 帘下回眸(dudou) / r808 对镜理妆(gown) / r809 秋千架下(dudou) / r810 雪夜烹茶(gown)
// 合规基调与画廊既有文学人物线一致（女儿国国王/白流苏/聂小倩）：
//   原创虚构脸 · 非任何影视版本扮演者 · 着衣非性化 · 标注 AI 生成
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, 作品出处, EN身份短语, 场景CN, 场景EN, 动作CN, 动作EN, 标志意象CN, 标志意象EN, 服装类型, 服装CN, 服装EN, coverage, 情绪]
const S = [
  [807, 'lianxia', '潘金莲', '金瓶梅', 'Pan Jinlian, a fictional character from the classic Ming-dynasty novel The Plum in the Golden Vase (Jin Ping Mei)',
    '北宋市井茶坊·午后天光·珠帘半卷·人声渐远', 'a bustling Northern-Song-dynasty street teahouse in afternoon light, a bead curtain half-rolled up, the crowd softened into bokeh behind her',
    '掀帘回眸、指尖扣珠、市井明艳（明艳非性化）', 'she lifts the bead curtain with one finger and glances back over her shoulder, bright and alluring in a street-wise way, never sexualized',
    '半卷的珠帘 + 指尖拈起的一串琉璃珠', 'a half-rolled bead curtain of the teahouse, a string of glazed beads caught between her fingers',
    'dudou', '极小暖橘 dudou（联珠纹刺绣，深 V 显沟）+ 单条高透暖纱 at hip，opaque<1/4',
    'a tiny minimal warm-tangerine dudou set (linked-pearl-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer warm silk scarf drifting loosely at the hip',
    20, '明艳·帘下回眸'],
  [808, 'jingzhuo', '潘金莲', '金瓶梅', 'Pan Jinlian, a fictional character from the classic Ming-dynasty novel The Plum in the Golden Vase (Jin Ping Mei)',
    '闺阁妆台前·菱花铜镜·胭脂盒与金步摇·一炉沉香', 'the dressing table of a Northern-Song lady\'s chamber, an antique bronze mirror, rouge boxes and gold hairpins on lacquered wood, incense smoke curling from a brazier',
    '对镜理妆、回眸浅笑、从容自知（端庄非性化）', 'she sits before the mirror applying rouge, glancing back over her shoulder with a composed, knowing half-smile, dignified and never sexualized',
    '菱花铜镜 + 妆台上的胭脂盒与金步摇', 'an antique lobed bronze mirror on the dresser, rouge boxes and a gold hairpin beside it',
    'gown', '月白宋制抹胸长裙（淡青直领刺绣，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant Song-dynasty-inspired pale-moon-white ruqun gown with a straight-collar beizi-style overcoat and subtle aqua embroidery, fully covered with proper opaque fabric',
    85, '端庄·对镜理妆'],
  [809, 'qiuqian', '潘金莲', '金瓶梅', 'Pan Jinlian, a fictional character from the classic Ming-dynasty novel The Plum in the Golden Vase (Jin Ping Mei)',
    '后花园春深·秋千架下·香风拂柳·飞英缤纷', 'a private courtyard garden in deep spring, beneath an old wooden swing, willow fronds stirring, blossom petals drifting in the air',
    '荡罢回眸、裙角微扬、春园娇慵（娇慵非性化）', 'she slows the swing and glances back, skirt hem lifting slightly, languid spring garden charm, never sexualized',
    '一架旧木秋千 + 裙角扬起的一瞬', 'an old wooden garden swing, her skirt hem caught mid-sway',
    'dudou', '极小桃粉 dudou（花枝纹刺绣，深 V 显沟）+ 单条高透粉纱 at hip，opaque<1/4',
    'a tiny minimal peach-pink dudou set (flowering-branch embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',
    20, '娇慵·秋千架下'],
  [810, 'xueye', '潘金莲', '水浒传', 'Pan Jinlian, a fictional character from the classic novel Water Margin (Shui Hu Zhuan)',
    '冬夜闺阁·雪打窗纸·红泥小火炉·一盏清茶', 'a winter-night chamber, snow tapping the oil-paper window, a small red clay stove glowing, a single cup of warm tea steaming',
    '雪夜烹茶、回眸静立、清冷温存（清冷非性化）', 'she pours tea beside the red clay stove and glances back, still and quietly warm against the winter cold, never sexualized',
    '红泥小火炉 + 雪夜窗纸的一点暖光', 'a small red clay stove glowing warm, a paper window lit from within against falling snow',
    'gown', '暖绯宋制交领长裙（白梅刺绣，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant Song-dynasty-inspired warm-crimson cross-collar ruqun gown with white-plum embroidery, fully covered with proper opaque fabric',
    85, '清冷·雪夜烹茶'],
];

const manifest = [];
const MOOD_EN = {
  '明艳·帘下回眸': 'bright, alluring, street-wise',
  '端庄·对镜理妆': 'composed, dignified, self-assured',
  '娇慵·秋千架下': 'languid, charming, spring-fresh',
  '清冷·雪夜烹茶': 'quiet, clear, quietly warm',
};
for (const [id, py, cn, work, enId, sceneCN, sceneEN, actCN, actEN, propCN, propEN, wtype, wardCN, wardEN, cov, mood] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : NEG_DUDOU;
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure — specifically not resembling any actress who has portrayed this character in any screen adaptation. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Signature motif: ${propEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered Song-dynasty gown in keeping with her chamber setting, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    subject,
    scene: sceneCN,
    context: sceneEN + ' (background accents only, never wrapping the figure)',
    lighting: 'soft cinematic cool-toned key light with delicate rim light',
    composition: '85mm 中近景环境人像',
    action: actCN,
    motif: propCN,
    style: '电影感时尚大片·超写实',
    mood,
    wardrobe: wardCN,
    coverage_pct: cov,
    camera: '85mm',
    body_type: BODY,
    face: '原创虚构五官，避免任何真实演员/名人/公众人物可识别相似性（纯原创，非该角色任何影视版本的扮演者）',
    negative: neg,
    prompt_text: prompt,
  };
  const file = path.join(DIR, `dna-${id}-${py}.json`);
  fs.writeFileSync(file, JSON.stringify(dna, null, 1));
  manifest.push({ id, py, cn, work, cov, file });
}
console.log('written', manifest.length, 'DNA files:');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn}·${m.work} (cov=${m.cov})`);
