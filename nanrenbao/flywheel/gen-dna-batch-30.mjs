// Batch 30: 画面故事感实验批（story-feel exp, 2026-10-27）
// 延续 batch28/29 单变量实验设计——prompt 系统化加入「故事感工具包」：
//   ① 决定性叙事瞬间 ② 情绪微表情 ③ 动机单光源 ④ 叙事道具
//   ⑤ 动态元素（画框外） ⑥ 前景景深层 ⑦ 色彩故事线
// 选角：prompt-log 中 0 命中、命名 IP + 自带名场面（汉唐皇后/国母线，历史人物，快手标题可用真名）：
//   卫子夫(平阳歌舞) / 窦漪房(深宫失明) / 阴丽华(新野初见) / 独孤伽罗(二圣临朝) / 长孙皇后(朝服进谏)
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, gore, blood, horror mask on face, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, py, CN名, work后缀, EN身份, 场景CN, 场景EN, 名场面CN, 名场面EN, 动作CN, 动作EN,
//  情绪CN, 情绪EN, 道具CN, 道具EN, 服装CN, 服装EN, coverage, moodCN, moodEN, 光源CN, 光源EN, 色彩CN, 前景EN]
const S = [
  [852, 'weiziwu', '卫子夫', '汉武帝皇后',
    'Wei Zifu, the singer-dancer from the Pingyang Princess estate who rose to become Empress of Han under Emperor Wu',
    '平阳侯府·歌舞初歇·日影穿帘',
    'the hall of the Pingyang marquisate at golden afternoon, silk curtains stirring in the breeze, a lute resting on the low dais',
    '平阳歌舞·回身一盼定终身的一瞬',
    'spinning to a halt from the court dance, she turns back with a glance over her shoulder — the frozen instant Emperor Wu first sees her, a story of a singing girl who would become an empress told in a single frame',
    '舞步初歇、回身侧盼、水袖半扬',
    'halting mid-dance, body half-turned, glancing back over her shoulder with a sleeve half-raised',
    '惊怯·娇羞·惊鸿一瞥',
    'a startled demure micro-expression — lashes lowered then a quick shy glance up, lips parted in a breathless smile',
    '一柄未歇的团扇 + 阶前琵琶',
    'a stilled silk fan in her hand and a pipa lute on the step beside her',
    '极小茜红 dudou（深 V 显沟）+ 单条高透茜红纱 at hip，opaque<1/4',
    'a tiny minimal crimson-dye dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',
    20, '惊鸿·平阳初舞', 'startled, demure, fated glance, golden-afternoon grace',
    '日影穿帘·暖金',
    'a single motivated sun-through-curtain light — warm golden beams filtering past silk curtains, soft rim, honey color grading',
    '茜红+日影暖金',
    'the stirring silk curtain and a resting pipa on the step as foreground framing elements creating cinematic depth layers'],
  [853, 'douyifang', '窦漪房', '汉文帝皇后',
    'Dou Yifang, the palace maid who rose to become Empress Dowager of Han under Emperor Wen',
    '未央深宫·暮年倚窗·阶前海棠',
    'the deep inner palace at dusk, a single pear-blossom branch pressing the lattice, a jade screen half-drawn',
    '失明前的最后一盼·深宫独坐的一瞬',
    'seated by the lattice window, she turns her face toward the last light — the frozen instant before her sight fades, a story of a maid who ruled the harem for half a century told in a single frame',
    '深宫倚窗、侧首迎光、指尖抚过窗棂',
    'seated by the window, turning her head toward the light, fingertips tracing the lattice',
    '沉静·苍凉·不怒自威',
    'a serene commanding micro-expression — eyes calm though unseeing, a faint regal smile, dignity untouched by age',
    '一扇半开的玉屏 + 阶上海棠',
    'a half-drawn jade screen and a pear-blossom branch at the sill',
    '极小黛紫 dudou（深 V 显沟）+ 单条高透黛紫纱 at hip，opaque<1/4',
    'a tiny minimal violet-dye dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer violet silk scarf drifting loosely at the hip',
    20, '沉静·深宫暮年', 'serene, commanding, elegiac majesty, dusk-lit',
    '暮色窗光·冷紫',
    'a single motivated dusk window-light — cool violet glow through the lattice, deep purple shadows, twilight color grading',
    '黛紫+暮色冷紫',
    'the jade screen edge and a pear-blossom branch at the sill as foreground framing elements creating cinematic depth layers'],
  [854, 'yinlihua', '阴丽华', '光武帝皇后',
    'Yin Lihua, the beauty of Xinye who became Empress of Han under Emperor Guangwu, famed for the vow "to wed none but Yin Lihua"',
    '新野春园·桃花夹道·日间暖光',
    'a spring garden in Xinye, peach blossoms lining the path, warm daylight through new leaves',
    '新野初见·回眸一笑的一瞬',
    'strolling among the peach blooms, she turns back with a shy smile — the frozen instant the young Liu Xiu first vows to wed none but her, a story of a village beauty who became an empress told in a single frame',
    '园中漫步、回眸浅笑、披帛轻扬',
    'strolling among the blossoms, turning back with a shy smile, a silk shawl drifting',
    '娇羞·温婉·少女清甜',
    'a sweet shy micro-expression — cheeks faintly flushed, eyes downcast then a quick glance, lips curved in a bashful smile',
    '一枝将落的桃花 + 垂落的披帛',
    'a peach blossom branch slipping from her hand and a drifting silk shawl',
    '极小桃粉 dudou（深 V 显沟）+ 单条高透桃粉纱 at hip，opaque<1/4',
    'a tiny minimal peach-pink dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer peach-pink silk scarf drifting loosely at the hip',
    20, '温婉·新野春园', 'sweet, shy, spring-fresh, tender grace',
    '日间暖阳·桃粉',
    'a single motivated soft daylight — warm spring sun through new leaves, gentle bloom, rosy color grading',
    '桃粉+春阳暖白',
    'peach blossoms framing the path and the drifting shawl as foreground framing elements creating cinematic depth layers'],
  [855, 'dugujiaruo', '独孤伽罗', '隋文帝皇后',
    'Dugu Jialuo, the empress who ruled beside Emperor Wen of Sui as co-sovereign, famed for her vow of monogamy',
    '大兴宫阙·朝晖列仗·阶前铜鹤',
    'the dawn court of the Daxing palace, ranks of imperial guards in silhouette, a bronze crane censer smoking',
    '二圣临朝·并立阶前的一瞬',
    'standing shoulder to shoulder at the palace step, she turns her head toward the rising sun — the frozen instant the realm bows to two sovereigns, a story of an empress who reigned as one with her lord told in a single frame',
    '宫阶并立、侧首迎晖、凤仪端凝',
    'standing at the palace step, head turning toward the rising sun, posture regal and composed',
    '端凝·威仪·暗藏柔情',
    'a regal composed micro-expression — chin lifted, eyes steady with quiet authority, a barely-there softness at the lips',
    '一对并立的宫灯 + 阶前铜鹤',
    'a pair of standing palace lanterns and a bronze crane censer on the step',
    '极小鎏金 dudou（深 V 显沟）+ 单条高透金纱 at hip，opaque<1/4',
    'a tiny minimal gilt-gold dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer gold silk scarf drifting loosely at the hip',
    20, '威仪·二圣临朝', 'regal, composed, co-sovereign majesty, dawn-lit',
    '朝晖金光·宫阙',
    'a single motivated dawn light — gilded sunbeams over the palace roof, warm gold rim, imperial color grading',
    '鎏金+朝晖暖金',
    'the paired palace lanterns and the bronze crane censer as foreground framing elements creating cinematic depth layers'],
  [856, 'zhangsunhuanghou', '长孙皇后', '唐太宗皇后',
    'Zhangsun, the empress of Emperor Taizong of Tang, famed for admonishing the throne in full court robes',
    '立政殿·朝服垂旒·烛影礼器',
    'the Lizheng hall by candlelight, ritual bronze vessels on the dais, a tall court screen behind',
    '朝服进谏·捧笏垂眸的一瞬',
    'standing in full court regalia, she lifts her gaze from the memorial tablet — the frozen instant she dares to counsel the emperor, a story of the wisest empress of the Tang told in a single frame',
    '殿中垂旒而立、捧笏微抬、抬眸进言',
    'standing in court regalia, a tablet in her hands, lifting her gaze to speak',
    '恭肃·睿智·温毅',
    'a grave wise micro-expression — eyes lowered then lifted with calm resolve, lips set in gentle firmness',
    '一柄朝笏 + 殿中礼器',
    'a court tablet in her hands and ritual bronze vessels on the dais',
    '极小绛紫 dudou（深 V 显沟）+ 单条高透绛紫纱 at hip，opaque<1/4',
    'a tiny minimal deep-violet dudou/bikini set (small triangle top with deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer violet silk scarf drifting loosely at the hip',
    20, '恭肃·朝服进谏', 'grave, wise, gentle-firm, candlelit dignity',
    '殿中烛光·暖绛',
    'a single motivated candlelight source — warm crimson glow on the ritual vessels, deep violet shadows, reverent color grading',
    '绛紫+烛火暖金',
    'the ritual bronze vessel and the edge of the court screen as foreground framing elements creating cinematic depth layers'],
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
      batch: 30,
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
console.log('written', manifest.length, 'DNA files (story-feel exp batch30):');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn}（${m.work}） cov=${m.cov}`);
console.log('subjects:');
for (const m of manifest) console.log('  ', JSON.parse(fs.readFileSync(m.file, 'utf8')).subject);
fs.writeFileSync(path.join(DIR, 'story-exp-batch30-manifest.json'), JSON.stringify({
  exp: 'story-feel-2026-10-27', batch: 30, created: new Date().toISOString(),
  chars: manifest.map(m => ({ logical_id: m.id, py: m.py, cn: m.cn, work: m.work, subject: m.subject, db_id: null, image_url: null })),
}, null, 1));
console.log('manifest: story-exp-batch30-manifest.json');
