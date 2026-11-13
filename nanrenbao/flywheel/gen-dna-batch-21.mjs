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
[738,'xiaolongnv','小龙女','神雕侠侣·古墓派','Xiao Longnu, the Dragon Girl of the Ancient Tomb, the ethereal sword-immortal of the Condor Heroes','终南山古墓·寒玉床·白绫飞雪','the ancient tomb of Zhongnan Mountain, a jade bed of cold, white silk drifting like snow','抚琴清啸、白衣胜雪、冷若冰霜（仙气非性化）','she plays the guqin with a clear distant bearing, white robes surpassing snow, cool as frost, ethereal and never sexualized','gown','终南雪白衣仙裙（玉蜂纲领，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing snow-white celestial gown of the ancient tomb sect, fully covered with proper opaque fabric',95,'清冷·古墓仙姿',''],
[739,'wangyuyan','王语嫣','天龙八部·琅嬛玉洞','Wang Yuyan, the Fairy Sister of the Mandarin Duck Cave, the ethereal beauty of Demi-Gods and Semi-Devils','琅嬛玉洞·画卷缥缃·白玉美人','the jade cave of the Mandarin Duck Cave, scroll paintings drifting, a jade-white beauty among books','展卷凝眸、笑语嫣然、神仙姐姐（仙雅非性化）','she unrolls a scroll with a gentle gaze and a sweet smile, the Fairy Sister, graceful and never sexualized','gown','白玉色广袖宫装（琅嬛锦绣，全遮蔽 opaque proper coverage, elegant palace gown）','an elegant flowing jade-white palace gown with brocade embroidery, fully covered with proper opaque fabric',95,'仙雅·书卷气',''],
[740,'muwanqing','木婉清','天龙八部·大理山涧','Mu Wanqing, the black-veiled maiden of Dali, the lone willow of Demi-Gods and Semi-Devils','大理山涧·黑纱拂水·落英缤纷','a mountain stream of Dali, black gauze brushing the water, falling petals','回眸冷嗔、黑纱半掩、桀骜柔情（冷艳非性化）','she glances back with a cold pout, black veil half-covering her face, proud yet tender, never sexualized','dudou','极小墨黑 dudou（大理山花纹刺绣，深 V 显沟）+ 单条高透黑纱 at hip，opaque<1/4','a tiny minimal ink-black dudou set (Dali mountain-flower pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer black silk scarf drifting loosely at the hip',20,'冷艳·黑纱柔情',''],
[741,'liqiushui','李秋水','天龙八部·西夏皇宫','Li Qiushui, the autumn-water beauty of the Western Xia palace, the rival immortal of Demi-Gods and Semi-Devils','西夏皇宫·秋水伊人·玉璧倒影','the Western Xia palace, an autumn-water beauty, her reflection in a jade mirror','临水照影、拂袖轻嗔、秋水为神（明艳非性化）','she gazes at her reflection in the water, sweeping her sleeves with a light pout, her spirit like autumn water, never sexualized','dudou','极小天水碧 dudou（秋水纹刺绣，深 V 显沟）+ 单条高透碧纱 at hip，opaque<1/4','a tiny minimal sky-cyan dudou set (autumn-water pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer cyan silk scarf drifting loosely at the hip',20,'明艳·秋水伊人',''],
[742,'daiqisi','黛绮丝','倚天屠龙记·灵蛇岛','Daiqisi, the Purple Shirt Dragon King, the Persian beauty of the Divine Snake Island in the Heaven Sword saga','灵蛇岛·碧眸金发·紫衫凌波','the Divine Snake Island, blue eyes and golden hair, a purple shirt over the waves','横琴击浪、碧眸凝睇、异域明艳（明艳非性化）','she holds a harp facing the waves, blue eyes gazing, a vivid foreign beauty, never sexualized','dudou','极小紫罗兰 dudou（金波纹刺绣，深 V 显沟）+ 单条高透紫纱 at hip，opaque<1/4','a tiny minimal violet dudou set (golden-wave pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer violet silk scarf drifting loosely at the hip',20,'明艳·异域风情',''],
[743,'yinsusu','殷素素','倚天屠龙记·紫微堂','Yin Susu, the amethyst-robed mistress of the Violet Palace Hall in the Heaven Sword saga','紫微堂·紫薇花影·湘帘半卷','the Violet Palace Hall, purple crape-myrtle shadows, a half-raised curtain','倚栏轻笑、纤指点唇、娇嗔入骨（娇艳非性化）','she leans on the rail with a light laugh, a fingertip to her lips, coquettishly charming, never sexualized','dudou','极小紫薇色 dudou（紫薇花纹刺绣，深 V 显沟）+ 单条高透紫纱 at hip，opaque<1/4','a tiny minimal crape-myrtle-purple dudou set (purple-flower pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer purple silk scarf drifting loosely at the hip',20,'娇艳·紫薇妖娆',''],
[744,'ningzhongze','宁中则','笑傲江湖·华山玉女峰','Ning Zhongze, the Jade Maiden Sword of Mount Hua, the graceful heroine of the Smiling Proud Wanderer','华山玉女峰·云海松涛·玉女剑鸣','the Jade Maiden Peak of Mount Hua, a sea of clouds and pines, the song of the Jade Maiden Sword','按剑行云、回眸温婉、女侠端庄（端庄非性化）','she walks with a hand on her sword among the clouds, looking back with tender grace, a dignified swordswoman, never sexualized','gown','华山玉女剑装（云纹锦，长裙 opaque proper coverage, elegant gown）','an elegant flowing jade-maiden sword gown with cloud-pattern brocade, a dignified long gown with proper opaque coverage',85,'端庄·玉女剑仙',''],
[745,'lanfenghuang','蓝凤凰','笑傲江湖·五仙教','Lan Fenghuang, the Five Venoms Cult mistress, the enchanting Miao heroine of the Smiling Proud Wanderer','五仙岭·蛊虫铃音·凤凰羽影','the Five Venoms ridges, the chime of gu-worm bells, the shadow of phoenix plumes','摇铃轻笑、凤羽轻扬、娇媚入骨（娇媚非性化）','she shakes her bells with a light laugh, phoenix plumes swaying, enchantingly charming, never sexualized','dudou','极小绯红 dudou（凤凰羽纹刺绣，深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4','a tiny minimal crimson dudou set (phoenix-plume pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',20,'娇媚·凤凰铃音',''],
[746,'munianci','穆念慈','射雕英雄传·荷塘月色','Mu Nianci, the lotus-pond beauty of the Legend of the Condor Heroes','荷塘月色·莲叶田田·素手分莲','a moonlit lotus pond, leaves spread wide, a white hand parting lotus blooms','采莲浅笑、低眉温柔、秀美清丽（清丽非性化）','she picks lotus flowers with a faint smile, looking down with gentleness, delicately beautiful, never sexualized','gown','荷塘月色素裙（莲纹刺绣，长裙 opaque proper coverage, elegant gown）','an elegant flowing moonlit-lotus gown with lotus-pattern embroidery, a proper opaque long gown',85,'清丽·荷塘秀美',''],
[747,'meichaofeng','梅超风','射雕英雄传·黑风寨','Mei Chaofeng, the Iron Corpse, the bewitching fallen heroine of the Legend of the Condor Heroes','黑风寨·月下白骨爪·铁练横空','the Black Wind stockade, the Nine Yin Skeleton Claw under the moon, iron chains across the sky','铁练轻扬、回眸妖异、狠戾痴情（妖异非性化）','she sweeps her iron chains lightly, looking back with a bewitching glare, fierce yet obsessive, never sexualized','dudou','极小玄青 dudou（白骨爪纹刺绣，深 V 显沟）+ 单条高透青纱 at hip，opaque<1/4','a tiny minimal dark-cyan dudou set (skeleton-claw pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer dark silk scarf drifting loosely at the hip',20,'妖异·铁练痴情',''],
[748,'hetieshou','何铁手','碧血剑·五毒教','He Tieshou, the Five Venoms mistress of the Sword Stained with Royal Blood','五毒岭·毒蚕金丝·碧蛇盘绕','the Five Venoms ridges, golden threads of poison silkworms, a green serpent coiled','金丝轻拂、碧蛇绕腕、邪而自重（邪艳非性化）','she brushes golden threads lightly with a green serpent coiling at her wrist, wicked yet self-possessed, never sexualized','bikini','极浅碧绿比基尼（毒蚕纹，着衣非透视）','a minimal pale-jade bikini with poison-silkworm pattern texture, fully clothed non-transparent',40,'邪艳·毒岭妖姬',''],
[749,'shuisheng','水笙','连城诀·大雪山','Shui Sheng, the bell-sword maiden of A Deadly Secret','大雪山·雪岭逐风·铃剑清鸣','the great snow mountains, chasing the wind across the ridges, the clear ring of bell and sword','横剑逐雪、回眸清怨、冰雪聪明（清怨非性化）','she chases the snow with her sword, looking back with quiet grievance, clever as ice and snow, never sexualized','gown','大雪山狐裘披风（雪豹纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing snow-mountain gown with a fur-lined cape, proper opaque coverage',85,'清怨·雪岭铃剑',''],
[750,'yuanziyi','袁紫衣','飞狐外传·红花会','Yuan Ziyi, the kasaya-robed swordswoman of the Young Flying Fox','天山缁衣·红花会旗·尼装飒爽','the Tianshan mountains in dark kasaya robes, the red-flower society banner','拂袖清立、缁衣飒爽、俏尼多情（飒爽非性化）','she stands with sleeves swept, bold in her kasaya robes, a nun guise with hidden passion, never sexualized','gown','天山缁衣芒鞋装（素纱，长裙 opaque proper coverage, elegant gown）','an elegant flowing dark kasaya robe with plain gauze, a proper opaque long gown',85,'飒爽·缁衣侠影',''],
[751,'miaoruolan','苗若兰','雪山飞狐·玉笔峰','Miao Ruolan, the jade-pen peak lady of the Flying Fox of Snowy Mountain','玉笔峰·金阁藏书·雪霁初晴','the Jade Pen Peak, a golden pavilion of books after the snow clears','执卷倚窗、浅笑温婉、大家闺秀（温婉非性化）','she holds a scroll by the window with a gentle smile, a refined lady of noble house, never sexualized','gown','玉笔峰才女宫装（书香锦绣，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing scholarly palace gown with refined brocade, fully covered with proper opaque fabric',95,'温婉·金阁书香',''],
[752,'baisuzhen','白素贞','白蛇传·断桥','Bai Suzhen, the White Snake Fairy of the Legend of the White Snake','断桥烟雨·西湖水韵·白蛇化形','the Broken Bridge in misty rain, the water of West Lake, a white snake taking human form','携伞回眸、烟雨朦胧、痴情仙雅（仙雅非性化）','she holds an umbrella and glances back in the misty rain, devoted and ethereal, never sexualized','gown','断桥烟雨白纱仙裙（西湖水纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing white-gauze fairy gown of the misty Broken Bridge, proper opaque coverage',85,'仙雅·断桥痴情',''],
[753,'yunxiao','云霄','封神演义·三霄娘娘','Yunxiao, the eldest of the Three Skies Fairy Maidens of the Investiture of the Gods','三仙岛·混元金斗·云海仙阙','the Three Immortals Island, the Primal Golden Cauldron, a celestial realm above the clouds','执斗行云、俯视尘寰、仙威自持（仙威非性化）','she holds the primal cauldron among the clouds, gazing down at the mortal world with immortal dignity, never sexualized','gown','三仙岛混元金斗仙裙（云纹锦，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing celestial gown of the Three Immortals Island with cloud brocade, fully covered with proper opaque fabric',95,'仙威·混元金斗',''],
[754,'lianxing','怜星','绝代双骄·移花宫','Lianxing, the second mistress of the Palace of the Flowers in the Peerless Gallants','移花宫·绣玉谷·寒梅绣帕','the Palace of the Flowers, the Jade Embroidery Valley, a plum-embroidered handkerchief','执帕浅笑、宫装清冷、二宫主威仪（清冷非性化）','she holds an embroidered handkerchief with a faint smile, cold dignity of a palace mistress, never sexualized','dudou','极小缟白 dudou（寒梅纹刺绣，深 V 显沟）+ 单条高透白纱 at hip，opaque<1/4','a tiny minimal snow-white dudou set (plum-blossom pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer white silk scarf drifting loosely at the hip',20,'清冷·移花宫主',''],
[755,'luxueqi','陆雪琪','诛仙·天琊神剑','Lu Xueqi, the Heavenly Jade Sword immortal of the Jade Sky in the Zhu Xian saga','青云山·天琊剑鸣·云海剑阵','the Jade Sky Mountains, the song of the Heavenly Jade Sword, a sword formation above the clouds','横剑清立、回眸如冰、剑仙孤高（孤高非性化）','she stands with her sword, looking back as cold as ice, the proud solitude of a sword immortal, never sexualized','gown','青云山天琊白衣剑装（云水纹，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing white sword gown of the Heavenly Jade Sword with cloud-water patterns, fully covered with proper opaque fabric',95,'孤高·天琊剑仙',''],
[756,'zixuan','紫萱','仙剑奇侠传三·女娲后人','Zi Xuan, the Nuwa descendant priestess of the Nanzhao kingdom in the Chinese Paladin saga','南诏圣山·女娲神殿·紫萱花海','the sacred mountain of Nanzhao, the temple of the goddess Nuwa, a sea of purple sage flowers','结界轻抚、回眸痴情、女娲慈威（慈威非性化）','she touches a light seal, looking back with devotion, the tender majesty of the goddess line, never sexualized','gown','南诏女娲巫女装（紫萱花纹，长裙 opaque proper coverage, elegant gown）','an elegant flowing Nanzhao priestess gown with purple-sage patterns, proper opaque coverage',85,'慈威·女娲后人',''],
[757,'liumengli','柳梦璃','仙剑奇侠传四·幻瞑界','Liu Mengli, the princess of the illusory dream realm in the Chinese Paladin 4 saga','幻瞑界·梦貘低语·琉璃妖月','the illusory dream realm, the whisper of dream tapirs, a glass-like demon moon','执梦凝睇、妖月清辉、幻瞑仙姿（仙姿非性化）','she holds a dream in her gaze under the demon moon clear glow, the ethereal bearing of the dream realm, never sexualized','gown','幻瞑界妖月仙裙（梦貘纹，全遮蔽 opaque proper coverage, elegant celestial gown）','an elegant flowing celestial gown of the dream realm with dream-tapir patterns, fully covered with proper opaque fabric',95,'仙姿·幻瞑妖月',''],
];

const manifest = [];
const MOOD_EN = {
  '清冷·古墓仙姿': 'ethereal, cold, otherworldly',
  '仙雅·书卷气': 'ethereal, elegant, scholarly',
  '冷艳·黑纱柔情': 'cold, aloof, tender',
  '明艳·秋水伊人': 'bright, alluring, luminous',
  '明艳·异域风情': 'vivid, exotic, alluring',
  '娇艳·紫薇妖娆': 'charming, alluring, coquettish',
  '端庄·玉女剑仙': 'dignified, graceful, ethereal',
  '娇媚·凤凰铃音': 'enchanting, charming, lively',
  '清丽·荷塘秀美': 'delicate, gentle, luminous',
  '妖异·铁练痴情': 'bewitching, fierce, obsessive',
  '邪艳·毒岭妖姬': 'wicked, alluring, self-possessed',
  '清怨·雪岭铃剑': 'quiet, sorrowful, pure',
  '飒爽·缁衣侠影': 'bold, valiant, hidden passion',
  '温婉·金阁书香': 'gentle, refined, scholarly',
  '仙雅·断桥痴情': 'ethereal, devoted, graceful',
  '仙威·混元金斗': 'majestic, celestial, dignified',
  '清冷·移花宫主': 'cold, dignified, aloof',
  '孤高·天琊剑仙': 'proud, cold, otherworldly',
  '慈威·女娲后人': 'tender, majestic, devoted',
  '仙姿·幻瞑妖月': 'ethereal, mysterious, otherworldly',
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
