// Batch 27: 妖鬼名场面·万圣节令线（10-31 万圣夜前 7 天，蹭变装/cosplay 内容潮）
// 选角原则（数据复盘结论）：高认知度 IP + 可演名场面（转化 3x 于纯颜值）；194 个已用角色外全新；
// 全部聊斋/西游/封神/山海经/民间传说妖鬼仙魔——万圣变装相关；非真人仿冒；无水印文字。
// 819 梅三娘(画皮夜照) / 820 老鼠精(无底洞) / 821 杏仙(荆棘岭) / 822 辛十四娘 / 823 小翠 /
// 824 婴宁 / 825 姑获鸟(夜行游女) / 826 九尾狐(青丘) / 827 石矶娘娘(白骨洞) / 828 侠女(月夜拔剑)
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, gore, blood, horror mask on face, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, EN身份, 场景CN, 场景EN, 动作CN, 动作EN, 标志意象CN, 标志意象EN, 服装类型, 服装CN, 服装EN, coverage, 情绪]
const S = [
  [819, 'meisanniang', '梅三娘', 'Mei Sanniang, a fictional ghost bride from the classic Chinese ghost tale Painted Skin (Hua Pi) in Strange Tales from a Chinese Studio (Liaozhai)',
    '深宅古庙·深夜铜镜·红烛摇曳·裂开的半脸面具', 'a deserted old mansion at midnight, an antique bronze mirror, red candles flickering, a cracked half-mask resting nearby',
    '对镜梳妆、回眸凄艳、鬼新娘之凄绝（凄艳非性化）', 'she combs her hair before the bronze mirror and glances back with a haunting, mournful beauty, never sexualized',
    '一面古旧铜镜 + 一张裂开的半脸面具', 'an antique bronze mirror, a cracked half-mask lying beside it',
    'gown', '大红嫁衣式长袍（金线刺绣，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant bridal crimson gown with gold embroidery, fully covered with proper opaque fabric',
    85, '凄艳·画皮夜照'],
  [820, 'laoshujing', '金鼻白毛老鼠精', 'the Golden-Nosed White-Haired Rat Spirit, a famous demoness and mistress of the Bottomless Cave from Journey to the West (Xi You Ji)',
    '无底洞府·花烛高烧·供着一幅年轻僧人画像', 'the Bottomless Cave bridal chamber, red candles burning high, a hanging scroll portrait of a young monk on the wall',
    '倚榻回眸、妖娆多情、妖妃之媚（妖娆非性化）', 'she leans on the couch and glances back with a coquettish demoness charm, never sexualized',
    '一对毛绒鼠耳 + 花烛与僧人画像', 'a pair of fuzzy rat ears, red candles and the hanging portrait of the young monk',
    'dudou', '金红肚兜（鼠耳绒饰，深 V 显沟）+ 单条高透红纱 at hip，opaque<1/4',
    'a gold-red dudou with fuzzy rat-ear accents and deep V neckline showing generous cleavage plus small bottom, plus a single extremely sheer red silk scarf drifting loosely at the hip',
    45, '妖娆·无底洞'],
  [821, 'xingxian', '杏仙', 'Xingxian, the apricot-blossom tree spirit from the Bramble Ridge (Jingjiling) episode of Journey to the West (Xi You Ji)',
    '荆棘岭木仙庵·古杏花开·石上诗笺', 'the Wood Immortal Hermitage on Bramble Ridge, an ancient apricot tree in full bloom, poem slips scattered on a stone table',
    '拈花回眸、低吟浅笑、树精之清雅（清雅非性化）', 'she holds an apricot blossom and glances back with a refined, poetic smile, never sexualized',
    '满枝杏花 + 石案上的诗笺', 'a branch of apricot blossoms in full bloom, poem slips on a stone table',
    'gown', '杏粉绣花长袍（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant apricot-pink embroidered gown, fully covered with proper opaque fabric',
    85, '清雅·杏仙吟诗'],
  [822, 'xinshisiniang', '辛十四娘', 'Xin Shisiniang, a faithful fox spirit from the tale Xin Shisiniang in Strange Tales from a Chinese Studio (Liaozhai)',
    '绣楼·红袖添香·窗外狐影', 'an embroidered boudoir, red sleeves and incense smoke, a faint fox shadow outside the window',
    '临窗回眸、娇艳坚贞、狐仙之贞静（娇艳非性化）', 'she turns at the window and glances back, tender and faithful, never sexualized',
    '一抹狐尾虚影 + 绣架上的红袖', 'the translucent ghost of a fox tail, red sleeves resting on an embroidery frame',
    'gown', '正红织金长袍（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant vermilion gold-threaded gown, fully covered with proper opaque fabric',
    85, '娇艳·辛十四娘'],
  [823, 'xiaocui', '小翠', 'Xiaocui, the playful fox spirit from the tale Xiaocui in Strange Tales from a Chinese Studio (Liaozhai)',
    '庭院秋千·蹴鞠戏球·落叶纷飞', 'a courtyard swing, an embroidered cuju ball in play, autumn leaves drifting in the air',
    '抛球回眸、娇憨顽皮、少女之嬉笑（娇憨非性化）', 'she tosses the cuju ball and glances back with a mischievous, hearty laugh, never sexualized',
    '一只彩绣蹴鞠 + 一座秋千架', 'an embroidered cuju ball, a swing frame behind her',
    'dudou', '鹅黄绣球纹肚兜（深 V 显沟）+ 单条高透黄纱 at hip，opaque<1/4',
    'a goose-yellow dudou with ball-pattern embroidery and deep V neckline showing generous cleavage plus small bottom, plus a single extremely sheer yellow silk scarf drifting loosely at the hip',
    45, '顽皮·小翠戏球'],
  [824, 'yingning', '婴宁', 'Yingning, the flower-loving laughing maiden from the tale Yingning in Strange Tales from a Chinese Studio (Liaozhai)',
    '花开满树·拈花而笑·蝶乱蜂喧', 'a tree in full blossom, she holds a flower and laughs, butterflies and bees in playful chaos',
    '拈花回眸、笑靥如花、烂漫天真（烂漫非性化）', 'she fingers a blossom and glances back with a radiant, delighted laugh, never sexualized',
    '满树繁花 + 指间一朵杏花', 'a tree crowded with spring blossoms, a single apricot flower between her fingers',
    'gown', '花粉色薄纱长袍（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant flower-pink gauze gown, fully covered with proper opaque fabric',
    85, '烂漫·婴宁一笑'],
  [825, 'guhuoniao', '姑获鸟', 'Guhuoniao, the mysterious night-wandering bird spirit (Yexing Younv) from Chinese folklore and the ancient text Xu Zhong Ji',
    '月夜密林·墨羽纷飞·夜枭啼鸣', 'a moonlit dense forest, ink-black feathers drifting down, a night owl calling in the dark',
    '林间回眸、幽诡凄迷、夜行游女之诡艳（幽诡非性化）', 'she turns among the trees and glances back with an eerie, haunting beauty, never sexualized',
    '一双墨翼 + 纷飞黑羽', 'a pair of ink-black wings, drifting black feathers in the air',
    'dudou', '玄黑羽纹肚兜（深 V 显沟）+ 单条高透墨纱 at hip，opaque<1/4',
    'an ink-black dudou with feather-pattern embroidery and deep V neckline showing generous cleavage plus small bottom, plus a single extremely sheer black silk scarf drifting loosely at the hip',
    45, '幽诡·姑获夜行'],
  [826, 'jiuweihu', '九尾狐', 'the Nine-Tailed Fox, the legendary fox spirit of Qingqiu from the Classic of Mountains and Seas (Shan Hai Jing)',
    '青丘月下·九尾如焰·狐火幽幽', 'the moonlit Qingqiu hills, nine fox tails fanning like flames, pale fox-fire glowing in the dark',
    '月下回眸、妖异华美、九尾狐之诡魅（妖异非性化）', 'she turns under the moon and glances back with a bewitching, uncanny beauty, never sexualized',
    '九条蓬松狐尾如焰展开', 'nine lush fox tails fanning out like flames behind her',
    'gown', '月白狐火纹长袍（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant moon-white gown with fox-fire patterns, fully covered with proper opaque fabric',
    85, '妖异·青丘九尾'],
  [827, 'shiji', '石矶娘娘', 'Shiji Niangniang, the stone demoness of White Bone Cave on Skeleton Mountain from Investiture of the Gods (Fengshen Yanyi)',
    '骷髅山白骨洞·八卦云光帕·石榻生寒', 'White Bone Cave on Skeleton Mountain, an eight-trigram glowing shawl, a chilling stone couch in the shadows',
    '洞中回眸、冷峻凌厉、妖道之肃杀（冷峻非性化）', 'she turns within the cave and glances back with a cold, severe austerity, never sexualized',
    '一面八卦云光帕 + 石壁上斑驳石纹', 'an eight-trigram glowing shawl, mottled stone patterns on the cave wall',
    'gown', '石青道袍式长裙（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant slate-blue Taoist-robe-style gown, fully covered with proper opaque fabric',
    85, '冷峻·石矶白骨洞'],
  [828, 'xianv', '侠女', 'Xianv, the swordswoman avenger from the tale Xiaren (The Knight-Errant Woman) in Strange Tales from a Chinese Studio (Liaozhai)',
    '月夜庭院·拔剑复仇·白练横空', 'a moonlit courtyard, a long sword half-drawn, white silk ribbons stirring in the night air',
    '拔剑回眸、冷冽决绝、侠女之孤勇（冷冽非性化）', 'she draws her sword and glances back with icy resolve and solitary courage, never sexualized',
    '一柄长剑 + 腕上白练', 'a long sword in her hand, white silk bound at her wrist',
    'gown', '月白束袖劲装长袍（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant moon-white sleeved swordswoman garb with proper opaque coverage, fully covered',
    85, '冷冽·侠女拔剑'],
];

const manifest = [];
const MOOD_EN = {
  '凄艳·画皮夜照': 'haunting, mournful, crimson-dreamlike',
  '妖娆·无底洞': 'coquettish, demonic, candlelit',
  '清雅·杏仙吟诗': 'refined, poetic, blossom-soft',
  '娇艳·辛十四娘': 'tender, faithful, silken-red',
  '顽皮·小翠戏球': 'mischievous, hearty, autumn-bright',
  '烂漫·婴宁一笑': 'radiant, delighted, blossom-loud',
  '幽诡·姑获夜行': 'eerie, haunting, moonlit-feather-dark',
  '妖异·青丘九尾': 'bewitching, uncanny, fox-fire-glow',
  '冷峻·石矶白骨洞': 'cold, severe, stone-cave-austere',
  '冷冽·侠女拔剑': 'icy, resolute, moonlit-steel',
};
for (const [id, py, cn, enId, sceneCN, sceneEN, actCN, actEN, motifCN, motifEN, wtype, wardCN, wardEN, cov, mood] of S) {
  const subject = `${cn}（${enId.includes('Journey to the West') ? '西游记' : enId.includes('Investiture') ? '封神演义' : enId.includes('Shan Hai Jing') ? '山海经' : enId.includes('folklore') ? '中国传说' : '聊斋志异'}${cn === '杏仙' ? '·荆棘岭' : cn === '金鼻白毛老鼠精' ? '·无底洞' : cn === '石矶娘娘' ? '·骷髅山' : cn === '九尾狐' ? '·青丘' : cn === '姑获鸟' ? '·夜行游女' : ''}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : NEG_DUDOU;
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure — specifically not resembling any actress who has portrayed this character in any screen adaptation. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Signature motif: ${motifEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered gown in keeping with her setting, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    subject,
    scene: sceneCN,
    context: sceneEN + ' (background accents only, never wrapping the figure)',
    lighting: 'soft cinematic cool-toned key light with delicate rim light',
    composition: '85mm 中近景环境人像',
    action: actCN,
    motif: motifCN,
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
  manifest.push({ id, py, cn, cov, file });
}
console.log('written', manifest.length, 'DNA files:');
for (const m of manifest) console.log(`  r${m.id}-${m.py}  ${m.cn} (cov=${m.cov})`);
console.log('subjects:');
for (const m of manifest) console.log('  ', JSON.parse(fs.readFileSync(m.file, 'utf8')).subject);
