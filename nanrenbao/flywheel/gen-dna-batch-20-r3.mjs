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
[758,'mulan','花木兰','木兰辞·替父从军','Mulan, the legendary woman warrior who took her father\'s place in the army and fought for a dozen years','黄河暮色·军帐寒灯·明光铠影','the yellow river at dusk, a cold lamplit military camp, the shadow of bright mirror armor','揽甲沉吟、思亲归思、代父从军（英毅非性化）','she clasps her armor with a faraway homesick gaze, the resolute bearing of a woman who took her father\'s place in the army, never sexualized','dudou','极小赭红 dudou（戎装纹刺绣，深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4','a tiny minimal russet-red dudou set (armor-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',20,'英毅·铁血柔情',''],
[759,'azhu','阿朱','天龙八部·听香水榭','A Zhu, the clever disguise mistress of the Listen to the Water Pavilion','听香水榭·莲塘易容·江南烟雨','the Listen to the Water Pavilion, a lotus pond, a disguise kit, the misty rain of the south','易容乔装、回眸慧黠、玲珑百变（灵秀非性化）','she turns with a clever knowing look, poised in one of her many disguises, quick-witted and never sexualized','dudou','极小藕荷 dudou（莲纹刺绣，深 V 显沟）+ 单条高透藕纱 at hip，opaque<1/4','a tiny minimal lotus-pink dudou set (lotus-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer lotus-pink silk scarf drifting loosely at the hip',20,'灵秀·慧黠玲珑',''],
[760,'azi','阿紫','天龙八部·星宿海','A Zi, the mischievous and cruel young disciple of the Xingxiu Sea','星宿海·碧磷幽光·毒菱星点','the Xingxiu Sea, eerie green phosphor light, a scattering of poison needles','拈毒菱、狡黠睨笑、邪而灵动（妖俏非性化）','she holds a poison steel dart between her fingers with a sly sidelong smile, mischievous and never sexualized','dudou','极小碧绿 dudou（毒菱纹刺绣，深 V 显沟）+ 单条高透碧纱 at hip，opaque<1/4','a tiny minimal emerald dudou set (poison-dart pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer emerald silk scarf drifting loosely at the hip',20,'妖俏·邪气灵动',''],
[761,'zhongling','钟灵','天龙八部·万劫谷','Zhong Ling, the sweet maiden of the Wanjie Valley with her swift marten','万劫谷·灵貂伴身·无量剑光','the Wanjie Valley, a small swift marten at her shoulder, the glint of an infinite sword','抱貂轻笑、齿颊留香、天真诡谠（甜美非性化）','she cradles her little marten and laughs sweetly over her shoulder, innocent yet mischievous, never sexualized','dudou','极小橘粉 dudou（貂纹刺绣，深 V 显沟）+ 单条高透粉纱 at hip，opaque<1/4','a tiny minimal tangerine-pink dudou set (marten-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',20,'甜美·天真诡谠',''],
[762,'yilin','仪琳','笑傲江湖·恒山出家人','Yilin, the gentle nun of the Hengshan sect','恒山白云庵·木鱼清磬·雾锁莲台','the White Cloud Nunnery of Mount Heng, a wooden fish and clear chime, mist veiling the lotus terrace','合十低眉、晨钟暮鼓、出尘恬静（恬静非性化）','she joins her palms with downcast eyes, serene as a morning bell, pure and never sexualized','gown','素白云气道袍长裙（全遮蔽 opaque proper coverage, plain nun\'s robe）','an elegant plain snow-white Taoist nun\'s robe and long skirt, fully covered with proper opaque fabric',95,'出尘·恬静慈悲',''],
[763,'qifang','戚芳','连城诀·荷香','Qi Fang, the simple and kind girl of the lotus pond in Lian Cheng Jue','连城荷塘·菱歌晚唱·柴门犬吠','the lotus ponds of Liancheng, an evening water-calley song, a rustic gate with a dog barking','采莲挽袖、回眸温软、质朴温厚（温厚非性化）','she picks lotus pods with rolled sleeves, looking back with a warm soft gaze, simple and never sexualized','dudou','极小藕粉 dudou（荷纹刺绣，深 V 显沟）+ 单条高透粉纱 at hip，opaque<1/4','a tiny minimal lotus-root-pink dudou set (lotus-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer pink silk scarf drifting loosely at the hip',20,'温厚·质朴温软',''],
[764,'lingshuanghua','凌霜华','连城诀·人淡如菊','Ling Shuanghua, the chrysanthemum-pure daughter of the governor in Lian Cheng Jue','菊圃东篱·霜华满袖·淡月黄昏','an eastern-fence chrysanthemum garden, frost on her sleeves, a pale moon at dusk','抚菊凝睇、淡极始知、清冷自持（清冷非性化）','she caresses a chrysanthemom bloom with a cool composed gaze, understated and never sexualized','dudou','极小淡黄 dudou（菊纹刺绣，深 V 显沟）+ 单条高透黄纱 at hip，opaque<1/4','a tiny minimal pale-yellow dudou set (chrysanthemum-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer yellow silk scarf drifting loosely at the hip',20,'清冷·人淡如菊',''],
[765,'liwenxiu','李文秀','白马啸西风','Li Wenxiu, the heroine of the White Horse Neighing in the West Wind','大漠黄沙·白马西风·孤烟直上','the yellow-sand desert, a white horse in the west wind, a lone pillar of smoke rising straight','立马回望、风沙扑簌、坚韧清绝（清绝非性化）','she reins in her horse and looks back across the desert, resilient and pure, never sexualized','dudou','极小灰蓝 dudou（沙纹刺绣，深 V 显沟）+ 单条高透蓝纱 at hip，opaque<1/4','a tiny minimal grey-blue dudou set (sand-dune pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer blue silk scarf drifting loosely at the hip',20,'清绝·大漠坚韧',''],
[766,'bixiao','碧霄','封神演义·三霄娘娘','Bixiao, the second of the Three Celestial Maidens of Fengshen Yanyi','三仙岛·琼岛霞绡·混沌剑气','the Three Celestial Island, rosy mist like silk, the aura of a chaos sword formation','剑指苍穹、布阵之意、仙威凛然（仙威非性化）','she points her sword at the vault of heaven with an awe-inspiring immortal bearing, never sexualized','dudou','极小月白 dudou（霞绡纹刺绣，深 V 显沟）+ 单条高透白纱 at hip，opaque<1/4','a tiny minimal moon-white dudou set (rosy-mist pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer white silk scarf drifting loosely at the hip',20,'仙威·凛然出尘',''],
[767,'wangguiren','王贵人','封神演义·玉石琵琶精','Wang Guiren, the jade pipa spirit of Fengshen Yanyi','轩辕坟·琵琶夜月·玉影妖娆','the Xuan Yuan tomb mounds, a moonlit pipa, a jade-green enchanting shadow','横抱琵琶、指尖勾挑、妖而绮丽（绮丽非性化）','she cradles a jade pipa and plucks its strings, enchanting yet self-possessed, never sexualized','dudou','极小玉青 dudou（琵琶纹刺绣，深 V 显沟）+ 单条高透青纱 at hip，opaque<1/4','a tiny minimal jade-cyan dudou set (pipa-lute pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer cyan silk scarf drifting loosely at the hip',20,'绮丽·妖韵风流',''],
[768,'zhizhujing','蜘蛛精','西游记·盘丝洞','the Spider Spirit of the Silk Cave in Journey to the West','盘丝洞·丝雨纷飞·濯垢泉雾','the Silk Cave, a rain of silk threads, the mist of the Washing-filth Spring','拨丝回眸、罗网轻张、妖娆缥缈（妖娆非性化）','she plucks a silk thread and glances back, bewitching yet ethereal, never sexualized','dudou','极小银灰 dudou（蛛丝纹刺绣，深 V 显沟）+ 单条高透灰纱 at hip，opaque<1/4','a tiny minimal silver-grey dudou set (silk-thread pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer grey silk scarf drifting loosely at the hip',20,'妖娆·缥缈罗网',''],
[769,'wanshenggongzhu','万圣公主','西游记·碧波潭','Princess Wansheng, the dragon princess of the Bibotan Pool in Journey to the West','碧波潭·水晶宫阙·驸马帐前','the Bibotan Pool, a crystal dragon palace, pearl curtains in the princess\'s hall','龙宫凌波、珠冠宝黛、贵而娇嗔（贵气非性化）','she glides through her dragon palace hall, pearl crown gleaming, imperious yet charming, never sexualized','bikini','水绿色比基尼（龙鳞纹，着衣非透视）','a minimal aquamarine bikini with dragon-scale texture, fully clothed non-transparent',40,'贵气·龙宫娇嗔',''],
[770,'menglijun','孟丽君','再生缘·女状元','Meng Lijun, the female top scholar of the Zaisheng Yuan ballad','翰林院·状元红袍·描金笔架','the Hanlin Academy, a top-scholar crimson robe, a gilded brush rack','执笔凝思、金榜题名、俊朗儒雅（儒雅非性化）','she holds a brush in thought, the grace of a female top scholar, refined and never sexualized','dudou','极小绯红 dudou（翰林纹刺绣，深 V 显沟）+ 单条高透红纱 at hip，opaque<1/4','a tiny minimal crimson dudou set (academy-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer red silk scarf drifting loosely at the hip',20,'儒雅·俊朗风流',''],
[771,'shisanmei','十三妹','儿女英雄传·何玉凤','Thirteenth Sister He Yufeng, the swordswoman of Ernü Yingxiong Zhuan','青云岭·客栈风尘·剑拔弩张','the Qingyun ridge, a dusty roadside inn, a sword half-drawn in a standoff','按剑横眉、侠肝义胆、飒爽凌厉（凌厉非性化）','she presses her sword with level brows, chivalrous and sharp, never sexualized','dudou','极小黛蓝 dudou（剑穗纹刺绣，深 V 显沟）+ 单条高透蓝纱 at hip，opaque<1/4','a tiny minimal dark-indigo dudou set (sword-tassel pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer indigo silk scarf drifting loosely at the hip',20,'凌厉·侠肝义胆',''],
[772,'hongfunv','红拂女','虬髯客传·夜奔','Hongfu, the maiden who eloped with Li Jing on a night journey from the Sui court','隋末夜·红拂灯火·李靖府门','the last night of the Sui dynasty, a red duster and lamplight, the gate of Li Jing\'s house','夜奔投奔、拂尘轻掸、慧眼豪情（豪情非性化）','she stands at the gate on her night elopement, a red duster in hand, bold and discerning, never sexualized','dudou','极小绯红 dudou（红拂纹刺绣，深 V 显沟）+ 单条高透绯纱 at hip，opaque<1/4','a tiny minimal crimson dudou set (red-duster pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer crimson silk scarf drifting loosely at the hip',20,'豪情·慧眼识英雄',''],
[773,'xunguan','荀灌','晋书·突围搬救兵','Xun Guan, the girl who broke a siege on horseback to fetch reinforcements for Xiangyang','襄阳城·突围夜骑·烽火连天','the siege of Xiangyang, a night ride through the lines, beacon fires stretching to the sky','单骑突围、回身挽弓、少年英风（英风非性化）','she breaks through the siege on horseback and looks back drawing her bow, youthful and heroic, never sexualized','dudou','极小素橙 dudou（烽火纹刺绣，深 V 显沟）+ 单条高透橙纱 at hip，opaque<1/4','a tiny minimal bright-orange dudou set (beacon-fire pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer orange silk scarf drifting loosely at the hip',20,'英风·少年突围',''],
[774,'nvying','女英','湘水·泪洒斑竹','Nüying, the consort of Emperor Shun whose tears stained the bamboo of the Xiang River','湘水斑竹·泪染檀痕·九嶷山云','the speckled bamboo of the Xiang River, tear-stains like cinnabar marks, the clouds of Jiuyi Mountain','斑竹凝泪、低眉婉转、哀婉清绝（婉约非性化）','she gazes at the tear-stained bamboo with downcast eyes, sorrowful and graceful, never sexualized','gown','湘妃绿素雅长裙（斑竹纹刺绣，全遮蔽 opaque proper coverage, elegant plain long dress）','an elegant plain emerald-green long dress with speckled-bamboo embroidery, fully covered with proper opaque fabric',95,'婉约·泪染斑竹',''],
[775,'yanshuinv','盐水女神','巴郡·廪君传奇','the Salt Water Goddess of the ancient Ba commandery','盐水清波·鱼盐之利·巫歌悠扬','the clear waves of the Salt Water, fish and salt, the haunting strains of a shaman song','临水照影、盐泉拂发、灵动神秘（神秘非性化）','she gazes at her reflection in the salt spring, mysterious and lively, never sexualized','dudou','极小月白 dudou（盐泉纹刺绣，深 V 显沟）+ 单条高透素纱 at hip，opaque<1/4','a tiny minimal moon-white dudou set (salt-spring pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer plain silk scarf drifting loosely at the hip',20,'神秘·盐水精灵',''],
[776,'xianfuren','冼夫人','岭南·圣母','Lady Xian, the saintly matriarch of the Lingnan peoples','岭南椰寨·百越图腾·铜鼓声威','a Lingnan coconut village, Baiyue totems, the mighty sound of bronze drums','执铜鼓杖、端严慈威、圣母风范（端严非性化）','she holds a bronze-drum staff with dignified benevolence, the bearing of a saintly matriarch, never sexualized','dudou','极小赭石 dudou（铜鼓纹刺绣，深 V 显沟）+ 单条高透赭纱 at hip，opaque<1/4','a tiny minimal ochre dudou set (bronze-drum pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer ochre silk scarf drifting loosely at the hip',20,'端严·百越慈威',''],
[777,'tangguichen','唐闺臣','镜花缘·女试','Tang Guichen, the female examinee of the Flower in the Mirror','女试殿·百花争艳·才情斐然','the women\'s examination hall, a hundred flowers in bloom, literary brilliance in the air','执卷凝思、名花解语、才情婉转（才情非性化）','she holds a scroll in quiet thought, talented and charming, never sexualized','dudou','极小藕荷 dudou（百花纹刺绣，深 V 显沟）+ 单条高透藕纱 at hip，opaque<1/4','a tiny minimal lotus-pink dudou set (hundred-flower pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer lotus-pink silk scarf drifting loosely at the hip',20,'才情·解语花娇',''],
];

const manifest = [];
const MOOD_EN = {
  '英毅·铁血柔情': 'valiant, resolute, tender-hearted',
  '灵秀·慧黠玲珑': 'clever, lively, quick-witted',
  '妖俏·邪气灵动': 'mischievous, cunning, lively',
  '甜美·天真诡谠': 'sweet, innocent, playful',
  '出尘·恬静慈悲': 'serene, pure, compassionate',
  '温厚·质朴温软': 'warm, simple, gentle',
  '清冷·人淡如菊': 'cool, reserved, chrysanthemum-pure',
  '清绝·大漠坚韧': 'aloof, resilient, pure',
  '仙威·凛然出尘': 'celestial, awe-inspiring, otherworldly',
  '绮丽·妖韵风流': 'enchanting, alluring, self-possessed',
  '妖娆·缥缈罗网': 'alluring, ethereal, bewitching',
  '贵气·龙宫娇嗔': 'noble, imperious, charming',
  '儒雅·俊朗风流': 'refined, scholarly, graceful',
  '凌厉·侠肝义胆': 'fierce, chivalrous, resolute',
  '豪情·慧眼识英雄': 'bold, passionate, discerning',
  '英风·少年突围': 'valiant, youthful, heroic',
  '婉约·泪染斑竹': 'gentle, sorrowful, graceful',
  '神秘·盐水精灵': 'mysterious, ethereal, lively',
  '端严·百越慈威': 'dignified, majestic, benevolent',
  '才情·解语花娇': 'talented, charming, graceful',
};
for (const [id, py, cn, work, enId, sceneCN, sceneEN, actCN, actEN, wtype, wardCN, wardEN, cov, mood, note] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : (wtype === 'bikini' ? NEG_BIKINI : NEG_DUDOU);
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs.${note.includes('白发') ? ' Her most striking feature is long flowing white hair.' : ''} Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered robe or long dress in keeping with her station, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
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
