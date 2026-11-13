// Batch 26: 红楼梦金钗补全（除妙玉已有、巧姐因未成年角色红线跳过外，其余 8 位各 1 张）
// 811 薛宝钗(蘅芜苑·扑蝶) / 812 贾元春(省亲盛装) / 813 贾探春(秋爽斋) / 814 史湘云(芍药圃·dudou)
// 815 贾迎春(紫菱洲) / 816 贾惜春(藕香榭) / 817 李纨(稻香村) / 818 秦可卿(太虚幻境·仙化)
// 清代旗装 gown 风（白流苏旗袍线先例）；湘云唯一 dudou（娇憨气质）
import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, resemblance to a real person, specific celebrity likeness, face resembling any screen actress of this character, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, EN身份, 场景CN, 场景EN, 动作CN, 动作EN, 标志意象CN, 标志意象EN, 服装类型, 服装CN, 服装EN, coverage, 情绪]
const S = [
  [811, 'baochai', '薛宝钗', 'Xue Baochai, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '蘅芜苑·苔翠藤深·香风扑蝶·唐摹院本', 'the Hengwu courtyard, moss-green vines trailing deep, a jade butterfly drifting through fragrant air, dappled shade under old pines',
    '扑蝶回眸、执扇凝香、端庄丰美（端庄非性化）', 'she reaches toward a jade butterfly and glances back over her shoulder, folding fan in hand, composed and voluptuous, never sexualized',
    '一只玉色蝴蝶 + 掌中折扇', 'a jade-green butterfly circling near her hand, a folding fan held loosely',
    'gown', '雪青绣牡丹旗装长袍（石青滚边，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant Qing-dynasty-inspired snow-lilac sleeved gown with peony brocade and indigo trim, fully covered with proper opaque fabric',
    85, '端庄·蘅芜扑蝶'],
  [812, 'yuanchun', '贾元春', 'Jia Yuanchun, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '大观园正殿·省亲盛装·宫灯煌煌·御辇华盖', 'the grand hall of the Grand View Garden at a royal visitation, imperial lanterns glowing, a palace canopy overhead',
    '殿前徐行、抬手受礼、华贵威仪（华贵非性化）', 'she walks slowly before the hall and glances back with a queenly gesture of receiving homage, radiant and regal, never sexualized',
    '煌煌宫灯 + 御辇华盖的一角', 'rows of glowing imperial lanterns, the edge of a royal canopy above',
    'gown', '明黄万字纹旗装盛装（正红滚边，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant imperial-yellow sleeved gown with endless-knot brocade and vermilion trim, fully covered with proper opaque fabric',
    85, '华贵·元春省亲'],
  [813, 'tanchun', '贾探春', 'Jia Tanchun, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '秋爽斋·书房朗阔·理家挥毫·晓妆临案', 'the Qiushuang studio, a bright spacious study, a brush poised over an account scroll, morning light across the desk',
    '执笔回眸、爽朗明快、玫瑰花姿（爽朗非性化）', 'she sets down her brush and glances back with a bright, decisive air, the candour of a rose in full bloom, never sexualized',
    '案上账册与一支狼毫 + 窗外梧桐', 'an account scroll and a wolf-hair brush on the desk, a plane tree outside the window',
    'gown', '秋香色缂丝旗装（墨竹纹，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant autumn-olive silk gown with ink-bamboo embroidery, fully covered with proper opaque fabric',
    85, '爽朗·秋爽理家'],
  [814, 'xiangyun', '史湘云', 'Shi Xiangyun, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '芍药圃·花雨缤纷·醉卧石磴·红香散乱', 'a peony garden in full summer bloom, petals drifting like rain, a stone bench beneath the flowers',
    '醉卧花茵、回眸娇笑、娇憨烂漫（娇憨非性化）', 'she reclines among fallen petals and glances back with a tipsy, hearty laugh, bright and boyish-charming, never sexualized',
    '满襟芍药花瓣 + 一支石磴', 'peony petals scattered across her lap, a weathered stone bench beneath',
    'dudou', '极小藕荷 dudou（芍药纹刺绣，深 V 显沟）+ 单条高透藕纱 at hip，opaque<1/4',
    'a tiny minimal lotus-lilac dudou set (peony-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer lilac silk scarf drifting loosely at the hip',
    20, '娇憨·醉卧芍药'],
  [815, 'yingchun', '贾迎春', 'Jia Yingchun, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '紫菱洲·秋江瑟瑟·菱花水冷·蓼花沙屿', 'the Ziling sandbar by an autumn river, water-chestnut flowers cooling on the water, knotweed blooms along a sandbar',
    '临水回眸、温婉柔弱、二木头之恬（温婉非性化）', 'she stands by the water and glances back with a gentle, yielding softness, quiet as still water, never sexualized',
    '几支菱花浮水 + 一叶渔舟远处', 'a few water-chestnut blossoms floating, a distant fishing boat',
    'gown', '藕荷暗纹旗装（菱花刺绣，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant pale-lotus-grey gown with water-chestnut-flower embroidery, fully covered with proper opaque fabric',
    85, '温婉·紫菱秋水'],
  [816, 'xichun', '贾惜春', 'Jia Xichun, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '藕香榭·画斋冷砚·丹青未干·竹影摇窗', 'the Ouxiang waterside pavilion turned painting studio, cold inkstone, an unfinished scroll, bamboo shadows on the window',
    '执笔凝思、冷砚回眸、孤僻丹青（冷僻非性化）', 'she holds her brush in thought and glances back with a cool, distant composure, the solitude of a painter, never sexualized',
    '一幅未干的水墨立轴 + 冷砚', 'an unfinished ink painting on the scroll stand, a cold inkstone',
    'gown', '月灰青竹纹旗装（全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant moon-grey gown with bamboo-pattern embroidery, fully covered with proper opaque fabric',
    85, '冷僻·藕香冷砚'],
  [817, 'liwan', '李纨', 'Li Wan, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '稻香村·稻浪翻金·田园茅舍·槁木清居', 'the Daoxiang village, golden rice fields rippling in wind, a plain thatched homestead among paddies',
    '田埂回眸、素净清槁、古井无波之恬（素净非性化）', 'she turns on the paddy path and glances back with a plain, quiet serenity, the stillness of a widow keeping her flame low, never sexualized',
    '一片金黄稻浪 + 竹篱茅舍', 'a stretch of golden rice paddies, a bamboo-fenced homestead behind',
    'gown', '米色粗纹棉布旗装（稻穗刺绣，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant undyed rice-coloured cotton gown with rice-ear embroidery, fully covered with proper opaque fabric',
    85, '素净·稻香清居'],
  [818, 'keqing', '秦可卿', 'Qin Keqing, a fictional character from the classic Qing-dynasty novel Dream of the Red Chamber (Hong Lou Meng)',
    '太虚幻境·仙云缭绕·薄命司·绛珠仙草', 'the Land of Illusion in the clouds, celestial mist drifting, the Register of the Ill-Fated, an crimson-pearl immortal herb glowing',
    '云中回眸、仙姿袅娜、警幻之缥缈（仙化非性化）', 'she turns within the celestial mist and glances back, her bearing transcendent and swaying-graceful, an immortal vision, never sexualized',
    '缭绕仙云 + 一株绛珠仙草', 'swirling celestial mist, a crimson-pearl immortal herb at her feet',
    'gown', '云霞色仙纹长裙（薄命司仙气，全遮蔽 opaque proper coverage, elegant gown）',
    'an elegant cloud-rose celestial gown with immortal-mist brocade, fully covered with proper opaque fabric',
    85, '缥缈·太虚幻境'],
];

const manifest = [];
const MOOD_EN = {
  '端庄·蘅芜扑蝶': 'composed, fragrant, voluptuous',
  '华贵·元春省亲': 'radiant, regal, grand',
  '爽朗·秋爽理家': 'bright, decisive, crisp',
  '娇憨·醉卧芍药': 'tipsy, hearty, bright',
  '温婉·紫菱秋水': 'gentle, yielding, quiet',
  '冷僻·藕香冷砚': 'cool, distant, solitary',
  '素净·稻香清居': 'plain, quiet, serene',
  '缥缈·太虚幻境': 'ethereal, transcendent, swaying-graceful',
};
for (const [id, py, cn, enId, sceneCN, sceneEN, actCN, actEN, motifCN, motifEN, wtype, wardCN, wardEN, cov, mood] of S) {
  const subject = `${cn}（红楼梦）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : NEG_DUDOU;
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure — specifically not resembling any actress who has portrayed this character in any screen adaptation. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Signature motif: ${motifEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered Qing-dynasty gown in keeping with her setting, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
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
