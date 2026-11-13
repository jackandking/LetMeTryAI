import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, resemblance to a real person, specific celebrity likeness, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, 作品, EN身份短语, 场景CN, EN场景, 动作CN, EN动作, 服装类型, 服装CN, EN服装, coverage, 情绪]
const S = [
[787,'miaoyu','妙玉','红楼梦·栊翠庵','Miaoyu, the reclusive nun of the Green Lattice Nunnery in the Dream of the Red Chamber','栊翠庵·茶烟轻扬·寒梅映雪','the Green Lattice Nunnery, wisps of tea smoke, winter plum against snow','烹茶待客、回眸清冷、槛内超尘（清冷非性化）','she brews tea for a guest, glancing back with cold aloofness, transcendent and never sexualized','gown','栊翠庵茶仙素袍（梅纹，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing plain nun-robe gown with plum patterns, fully covered with proper opaque fabric',95,'清冷·槛内茶仙'],
[788,'qingfeng','青凤','聊斋志异·狐仙报恩','Qing Feng, the fox-fairy maiden of the Qing Feng tale in Strange Tales from a Chinese Studio','荒园月下·狐火点点·古柏森森','a derelict garden under moonlight, flickers of foxfire, ancient cypress trees','倚树回眸、眼波灵动、人狐知音（灵动非性化）','she leans against an ancient tree, glancing back with lively eyes, the bond between human and fox, never sexualized','dudou','极小黛紫 dudou（狐纹刺绣，深 V 显沟）+ 单条高透紫纱 at hip，opaque<1/4','a tiny minimal violet-purple dudou set (fox-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer purple silk scarf drifting loosely at the hip',20,'灵动·青丘狐韵'],
[789,'tiexinlan','铁心兰','绝代双骄·知音之花','Tie Xinlan, the devoted flower of the Peerless Gallants','移花宫外·竹林深深·知音一曲','outside the Palace of the Flowers, a deep bamboo grove, a melody of soulmates','抚琴不语、回眸温婉、为爱坚贞（温婉非性化）','she plays the qin in silence, glancing back with gentle devotion, steadfast in love, never sexualized','dudou','极小绯紫 dudou（竹纹刺绣，深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4','a tiny minimal crimson-purple dudou set (bamboo-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',20,'温婉·绝代名花'],
[790,'shuilingguang','水灵光','大旗英雄传·清水潭','Shui Lingguang, the maiden of the Clear Water Pool in the Banner Hero saga','清水潭·烟波渺渺·水榭倒影','the Clear Water Pool, misty waves, reflections of a waterside pavilion','临水照影、回眸清澈、灵慧出尘（清澈非性化）','she gazes at her reflection by the water, glancing back with limpid clarity, pure and otherworldly, never sexualized','gown','清水潭灵姝碧裙（水波纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing aqua gown with water-ripple patterns, a proper opaque long gown',85,'清澈·碧水灵姝'],
[791,'fengsanniang','风四娘','萧十一郎·风情万种','Feng Sanniang, the flamboyant heroine of the Eleventh Brother saga','荒野客栈·篝火映酒·风尘巾帼','a wilderness inn, bonfire glowing over wine, a gallant woman of the rivers and lakes','举杯回眸、笑浪如火、风情入骨（风情非性化）','she raises a cup and glances back with a blazing smile, charm in every gesture, never sexualized','dudou','极小绛红 dudou（火焰纹刺绣，深 V 显沟）+ 单条高透红纱 at hip，opaque<1/4','a tiny minimal crimson-red dudou set (flame-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer red silk scarf drifting loosely at the hip',20,'风情·江湖妖姬'],
[792,'zhuqiqi','朱七七','武林外史·活剥猫儿','Zhu Qiqi, the vivacious maiden of the history of the Wulin saga','沈家花园·牡丹盛放·少女笑语','the Shen family garden, peonies in full bloom, a maiden\'s laughter','追蝶回眸、娇憨灵动、活色生香（娇憨非性化）','she chases a butterfly and glances back with charming playfulness, vivid and charming, never sexualized','dudou','极小粉橙 dudou（牡丹纹刺绣，深 V 显沟）+ 单条高透粉纱 at hip，opaque<1/4','a tiny minimal peach-pink dudou set (peony-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',20,'娇憨·古炉精灵'],
[793,'surongrong','苏蓉蓉','楚留香传奇·温柔解语','Su Rongrong, the gentle understanding maiden of the Chu Liuxiang saga','画舫夜宴·纱灯摇曳·琴箫和鸣','a painted pleasure-boat at night, gauze lanterns swaying, qin and xiao in harmony','揭帘回眸、温柔解语、兰心蕙质（温柔非性化）','she lifts the curtain and glances back with gentle understanding, orchid heart and kind nature, never sexualized','gown','画舫解语襦裙（兰花纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing ruqun gown with orchid patterns, a proper opaque long gown',85,'温柔·香帅解语'],
[794,'qiongxiao','琼霄','封神演义·三霄娘娘','Qiong Xiao, the second of the Three Celestial Maidens of the Investiture of the Gods','三仙岛·云涛出没·琼霄仙阙','the Three Immortals Island, clouds surging, the celestial palace of Qiong Xiao','驾云回眸、仙姿翩然、三霄之尊（仙姿非性化）','she rides the clouds and glances back with a transcendent bearing, the majesty of the Three Celestial Maidens, never sexualized','gown','三仙岛琼霄仙裙（霞绡纹，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing celestial gown of Qiong Xiao with rosy-cloud patterns, fully covered with proper opaque fabric',95,'仙姿·三霄仙子'],
[795,'lianjinfeng','廉锦枫','镜花缘·孝女采参','Lian Jinfeng, the filial sea-diving maiden of the Flowers in the Mirror saga','东海珊瑚屿·碧海渔歌·孝女采参','a coral islet of the Eastern Sea, a fisherman\'s song, the filial maiden diving for ginseng','潜水回眸、清丽坚毅、镜花水仙（清丽非性化）','she surfaces from a dive and glances back with clear resilience, a fairy of the flowery mirror, never sexualized','dudou','极小湖蓝 dudou（珊瑚纹刺绣，深 V 显沟）+ 单条高透蓝纱 at hip，opaque<1/4','a tiny minimal lake-blue dudou set (coral-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer blue silk scarf drifting loosely at the hip',20,'清丽·镜花水仙'],
[796,'zhouqingyun','周轻云','蜀山剑侠传·紫青双剑','Zhou Qingyun, the sword maiden of the Purple-Green Twin Swords in the Legend of the Swordsmen of Mount Shu','峨眉后山·紫青双剑·云海松涛','the back mountain of Mount Emei, the Purple-Green Twin Swords, clouds and roaring pines','仗剑回眸、英气逼人、蜀山女侠（英气非性化）','she wields her twin swords and glances back with valiant spirit, a sword heroine of Mount Shu, never sexualized','gown','峨眉女侠劲装（云水纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing sword-heroine gown of Mount Emei with cloud-water patterns, a proper opaque long gown',85,'英气·蜀山女侠'],
];

const manifest = [];
const MOOD_EN = {
  '清冷·槛内茶仙': 'ethereal, cold, transcendent',
  '灵动·青丘狐韵': 'lively, clever, enchanting',
  '温婉·绝代名花': 'gentle, devoted, graceful',
  '清澈·碧水灵姝': 'limpid, pure, otherworldly',
  '风情·江湖妖姬': 'flamboyant, charming, fiery',
  '娇憨·古炉精灵': 'playful, charming, vivid',
  '温柔·香帅解语': 'gentle, warm, orchid-like',
  '仙姿·三霄仙子': 'transcendent, majestic, otherworldly',
  '清丽·镜花水仙': 'clear, resilient, fairy-like',
  '英气·蜀山女侠': 'valiant, spirited, otherworldly',
};
for (const [id, py, cn, work, enId, sceneCN, sceneEN, actCN, actEN, wtype, wardCN, wardEN, cov, mood] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : NEG_DUDOU;
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered celestial palace gown in keeping with her divine station, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    subject,
    scene: sceneCN,
    context: sceneEN + ' (background accents only, never wrapping the figure)',
    lighting: 'soft cinematic cool-toned key light with delicate rim light',
    composition: '85mm 中近景环境人像',
    action: actCN,
    style: '电影感时尚大片·超写实',
    mood,
    wardrobe: wardCN,
    coverage_pct: cov,
    camera: '85mm',
    body_type: BODY,
    face: '原创虚构五官，避免任何真实演员/名人/公众人物可识别相似性（纯原创，非真人仿冒）',
    negative: neg,
    prompt_text: prompt,
  };
  const file = path.join(DIR, `dna-${id}-${py}.json`);
  fs.writeFileSync(file, JSON.stringify(dna, null, 1));
  manifest.push({ id, py, cn, work, cov, file });
}
console.log('written', manifest.length, 'DNA files:');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn} (cov=${m.cov})`);
