import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, resemblance to a real person, specific celebrity likeness, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_BIKINI = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, 作品, EN身份短语, 场景CN, EN场景, 动作CN, EN动作, 服装类型, 服装CN, EN服装, coverage, 情绪, 特殊说明]
const S = [
[758,'change','嫦娥','西游记·广寒宫','Chang\'e, the moon goddess of the Moon Palace in the Journey to the West','广寒宫·月华如水·玉树琼枝','the Moon Palace of Guanghan, moonlight like water, jade trees and jade branches','抱兔临风、广袖凌月、清冷孤高（仙气非性化）','she cradles the jade rabbit in the moonlight breeze, wide sleeves brushing the moon, cold and aloof, ethereal and never sexualized','gown','广寒月宫仙裙（月华锦，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing moon-palace celestial gown with moonlight brocade, fully covered with proper opaque fabric',95,'清冷·月宫仙姿',''],
[759,'linzhaojing','林朝英','神雕侠侣·古墓派','Lin Chaoying, the founder of the Ancient Tomb sect in the Return of the Condor Heroes','终南古墓·寒玉床畔·玉蜂铃音','the ancient tomb of Zhongnan Mountain, beside the cold jade bed, the chime of jade bees','抚剑静立、回眸如霜、祖师威仪（清冷非性化）','she stands with her sword, glancing back like frost, the cold dignity of a sect founder, never sexualized','gown','古墓玉女仙裙（素纱，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing jade-maiden celestial gown of the ancient tomb with plain gauze, fully covered with proper opaque fabric',95,'清冷·古墓祖师',''],
[760,'huangshannvzi','黄衫女子','倚天屠龙记·古墓传人','the Yellow-Gowned Maiden, the descendant of the Ancient Tomb in the Heaven Sword saga','少林山道·黄衫飘举·古墓传人','a mountain path of Shaolin, yellow gauze flowing in the wind, the Ancient Tomb descendant','负手而立、黄衫凌风、仙姿出尘（出尘非性化）','she stands with hands behind her back, yellow gauze catching the wind, otherworldly and never sexualized','gown','黄衫流云仙裙（云水纹，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing yellow celestial gown with cloud-water patterns, fully covered with proper opaque fabric',95,'出尘·黄衫仙子',''],
[761,'xiaozhao','小昭','倚天屠龙记·波斯明教','Xiao Zhao, the Persian maiden of the Ming Cult in the Heaven Sword saga','光明顶·波斯帐幕·异域星河','the Summit of Light, a Persian tent, an exotic starry sky','合掌轻语、回眸温婉、异域灵慧（灵慧非性化）','she presses her palms with a soft murmur, glancing back with gentle grace, an exotic and clever maiden, never sexualized','dudou','极小宝蓝 dudou（星纹刺绣，深 V 显沟）+ 单条高透蓝纱 at hip，opaque<1/4','a tiny minimal sapphire dudou set (star-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer blue silk scarf drifting loosely at the hip',20,'灵慧·波斯圣女',''],
[762,'suying','苏樱','绝代双骄·移花宫','Su Ying, the clever maiden of the Palace of the Flowers in the Peerless Gallants','绣玉谷·药香缭绕·移花宫春深','the Jade Embroidery Valley, wisps of herbal fragrance, deep spring in the Palace of the Flowers','拈花轻笑、眼波灵动、俏慧过人（俏慧非性化）','she picks a flower with a bright laugh, her eyes lively and clever, charming and never sexualized','dudou','极小藕荷 dudou（药草纹刺绣，深 V 显沟）+ 单条高透荷纱 at hip，opaque<1/4','a tiny minimal lotus-root-pink dudou set (herbal-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',20,'俏慧·移花苏樱',''],
[763,'linshiyin','林诗音','小李飞刀·兴云庄','Lin Shiyin, the lady of the Xingyun Manor in the Little Li Flying Dagger saga','兴云庄·梅林雪夜·诗书灯影','the Xingyun Manor, a snowy plum grove at night, lamplight falling over books','临窗执卷、回眸忧悒、才女风韵（忧悒非性化）','she holds a scroll by the window, glancing back with quiet melancholy, the grace of a talented lady, never sexualized','gown','兴云庄才女宫装（梅纹锦绣，长裙 opaque proper coverage, elegant gown）','an elegant flowing scholarly palace gown with plum-pattern brocade, a proper opaque long gown',85,'忧悒·惊鸿才女',''],
[764,'liannichang','练霓裳','白发魔女传·天山','Lian Nishang, the White-Haired Demoness of Mount Tian in the White-Haired Demoness saga','天山绝顶·风刃如霜·白发飞扬','the summit of Mount Tian, wind sharp as frost, long white hair flying in the gale','回眸凌厉、白发凌风、桀骜痴情（凌厉非性化）','she glances back with a fierce gaze, white hair streaming in the wind, proud yet devoted, never sexualized','dudou','极小霜白 dudou（狼纹刺绣，深 V 显沟）+ 单条高透白纱 at hip，opaque<1/4','a tiny minimal frost-white dudou set (wolf-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer white silk scarf drifting loosely at the hip',20,'凌厉·白发侠姬','白发'],
[765,'bingchuantiannv','冰川天女','冰川天女传·冰宫','the Glacier Heavenly Maiden of the ice palace in the Glacier Maiden saga','冰川天女宫·冰峰玉阙·雪月交辉','the palace of the Glacier Maiden, an ice peak and jade halls under snow and moon','拂冰而立、俯视尘寰、冰魄仙姿（冰魄非性化）','she stands brushing the ice, gazing down at the mortal world with an ice-soul immortal bearing, never sexualized','gown','冰川天女冰绡仙裙（冰纹，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing ice-silk celestial gown of the Glacier Maiden with frost patterns, fully covered with proper opaque fabric',95,'冰魄·冰川仙子',''],
[766,'cuiyingying','崔莺莺','西厢记·普救寺','Cui Yingying, the maiden of the Universal Salvation Temple in the Romance of the West Chamber','普救寺·西厢月下·梨花深院','the Universal Salvation Temple, moonlight at the west chamber, a deep courtyard of pear blossoms','临栏听琴、回眸含羞、闺秀风韵（含羞非性化）','she listens to the qin by the rail, glancing back with shy grace, the charm of a gentle lady, never sexualized','gown','西厢闺秀襦裙（梨花纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing ladies ruqun gown with pear-blossom patterns, a proper opaque long gown',85,'娇羞·西厢莺莺',''],
[767,'liyingqiong','李英琼','蜀山剑侠传·峨眉','Li Yingqiong, the sword maiden of Mount Emei in the Legend of the Swordsmen of Mount Shu','峨眉金顶·紫郢剑鸣·云海仙阵','the golden summit of Mount Emei, the song of the Ziying sword, a sword formation above the clouds','横剑临云、英气出尘、蜀山仙苗（英气非性化）','she holds her sword among the clouds, valiant and otherworldly, the young immortal of Mount Shu, never sexualized','gown','峨眉剑仙装（云水纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing sword-immortal gown of Mount Emei with cloud-water patterns, a proper opaque long gown',85,'英气·蜀山剑仙',''],
];

const manifest = [];
const MOOD_EN = {
  '清冷·月宫仙姿': 'ethereal, cold, otherworldly',
  '清冷·古墓祖师': 'ethereal, cold, dignified',
  '出尘·黄衫仙子': 'otherworldly, aloof, transcendent',
  '灵慧·波斯圣女': 'lively, gentle, exotic',
  '俏慧·移花苏樱': 'clever, charming, playful',
  '忧悒·惊鸿才女': 'melancholic, refined, graceful',
  '凌厉·白发侠姬': 'fierce, proud, devoted',
  '冰魄·冰川仙子': 'icy, pure, otherworldly',
  '娇羞·西厢莺莺': 'shy, gentle, charming',
  '英气·蜀山剑仙': 'valiant, otherworldly, spirited',
};
for (const [id, py, cn, work, enId, sceneCN, sceneEN, actCN, actEN, wtype, wardCN, wardEN, cov, mood, note] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : (wtype === 'bikini' ? NEG_BIKINI : NEG_DUDOU);
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs.${note.includes('白发') ? ' Her most striking feature is long flowing white hair.' : ''} Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered celestial palace gown in keeping with her divine station, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    subject,
    scene: `${sceneCN}${note ? '·' + note : ''}`,
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
