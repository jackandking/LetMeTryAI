import fs from 'fs';
import path from 'path';
const DIR = '/Users/jak/LetMeTryAI/nanrenbao/flywheel';

const NEG_BASE = 'nudity, explicit, exposed nipples, genitalia, see-through revealing skin, arousal, vulgar, resemblance to a real person, specific celebrity likeness, small bust, flat chest, a-cup, b-cup, petite chest, underdeveloped bust, deformed hands, extra fingers, watermark on face, text, lowres, plastic skin, oversaturated';
const NEG_DUDOU = 'gown, robe, drape, hanfu, kimono, long skirt, full-coverage, full-body suit, catsuit, body-suit, ' + NEG_BASE;
const NEG_GOWN = 'bikini, lingerie, dudou, exposed midriff, see-through revealing skin, nudity, ' + NEG_BASE;
const BODY = '极饱满丰硕巨乳 + 明显 G 罩杯以上 + 深 V 乳沟 + 丰盈腰臀曲线 + 修长腿部';

// [id, pinyin, CN名, 作品, EN身份短语, 场景CN, EN场景, 动作CN, EN动作, 异相CN, EN异相, 服装类型, 服装CN, EN服装, coverage, 情绪]
const S = [
[797,'yumin','羽民','山海经·羽民国','Yu Min, the feathered maiden of the Plumed Nation in the Classic of Mountains and seas','南海之外·羽落如雪·云涯之野','beyond the southern sea, feathers drifting like snow, a sea of clouds at dusk','展翼回眸、羽纷如雪、云涯天客（缥缈非性化）','she spreads her back wings and glances back, feathers falling around her, otherworldly and never sexualized','背生一对大羽翼','a pair of large feathered wings spread at her back','gown','羽民国羽纹仙衣（云翼纹，全遮蔽 opaque proper coverage, elegant gown）','an elegant flowing feathered celestial gown with wing-pattern brocade, fully covered with proper opaque fabric',95,'缥缈·云涯天客'],
[798,'jiaoren','鲛人','山海经·南海鲛人','Jiao Ren, the merfolk of the southern sea in the Classic of Mountains and seas','南海珊瑚渚·珠光沉碧·海女织绡','coral shoals of the southern sea, pearls glowing in the blue depths, drifting sea flowers','坐礁回眸、泪落成珠、南海水裔（幽寂非性化）','she sits on a reef and glances back, a pearl drop at her eye, lonely and never sexualized','鱼尾下身的鲛人身','a shimmering iridescent fish-tail lower body instead of legs','dudou','极小海蓝 dudou（珠波纹刺绣，深 V 显沟）+ 单条高透蓝纱 at hip，opaque<1/4','a tiny minimal sea-blue dudou set (pearl-and-wave embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer blue silk scarf drifting loosely at the hip',20,'幽寂·南海鲛珠'],
[799,'wenyaoyu','文鳐鱼','山海经·东山经','Wenyao Yu, the auspicious fish-bird of the eastern mountains in the Classic of Mountains and seas','东山湍流·祥光映水·夜飞之鱼','an eastern-mountain torrent, auspicious light at dusk, spray rising from the river','跃水回眸、翼展鱼跃、见则大穰（祥瑞非性化）','she leaps from the water and glances back, wings spread, herald of a bountiful harvest and never sexualized','鱼鳞下身 + 背生一对鸟翼','a sleek fish-scale lower body with a pair of feathered wings on her back','dudou','极小翠玉 dudou（鱼纹刺绣，深 V 显沟）+ 单条高透绿纱 at hip，opaque<1/4','a tiny minimal jade-green dudou set (fish-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer green silk scarf drifting loosely at the hip',20,'祥瑞·文鳐兆丰'],
[800,'biyiniao','比翼鸟','山海经·西山经','Bi Yi Niao, the paired-wing bird maiden of the western mountains in the Classic of Mountains and seas','西山绝壁·双鸟盘落日·幽谷长风','a western-mountain cliff, two birds wheeling at sunset, lone flight across the gorges','崖畔半转、回眸缱绻、比翼不离（缱绻非性化）','she half-turns on the cliff edge and glances back, one wing half-spread, devoted and never sexualized','背上一只大翼','a large wing folded at her back, its feathers tipped with sunset colors','gown','比翼鸟云纹襦裙（羽缘长裙 opaque proper coverage, elegant gown）','an elegant flowing cloud-pattern ruqun gown with feather-edge trim, a proper opaque long gown',85,'缱绻·比翼不离'],
[801,'quanfengnv','犬封女','山海经·犬封国','Quan Feng Nu, the maiden of the Dog-Enclosing Nation in the Classic of Mountains and seas','犬封国·青铜列俎·女子进杯','the Dog-Enclosing Nation, bronze vessels on woven mats, a maiden offering a ritual cup','跪献一杯、犬首回眸、虔恭好客（虔恭非性化）','she kneels offering a cup and glances back with gentle eyes, hospitable and never sexualized','犬首人身的异相','a graceful canine head with soft loyal eyes atop a maiden\'s body','dudou','极小铜红 dudou（兽纹刺绣，深 V 显沟）+ 单条高透铜纱 at hip，opaque<1/4','a tiny minimal bronze-red dudou set (beast-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer bronze silk scarf drifting loosely at the hip',20,'虔恭·犬封献杯'],
[802,'nvjiao','女娇','吴越春秋·涂山氏','Nu Jiao, the nine-tailed fox bride of the Tu Mountain in the Chronicle of Wu and Yue','涂山之麓·九尾曳雾·婚灯初上','Mount Tu at dawn, nine tails trailing through mist, a wedding lantern glowing','灯下回眸、九尾纷张、白狐之恋（缱绻非性化）','she turns beneath the lantern and glances back, tails fanning wide, devoted to her beloved and never sexualized','九条狐尾','nine large flowing fox tails fanning behind her','dudou','极小雪白 dudou（狐纹刺绣，深 V 显沟）+ 单条高透白纱 at hip，opaque<1/4','a tiny minimal snow-white dudou set (fox-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer white silk scarf drifting loosely at the hip',20,'缱绻·九尾白狐'],
[803,'shangui','山鬼','楚辞·九歌','Shan Gui, the mountain spirit of the Nine Songs in the Songs of Chu','楚山之阿·薜荔女萝·深林杳冥','a Chu mountain ravine, climbing figs and creeping vines, mist drifting through dark pines','藤中而出、回眸宜笑、若人山之阿（缥缈非性化）','she emerges from the vines and glances back with a smile, elusive and never sexualized','藤蔓为衣的异相','her garment woven entirely of trailing ivy, fig vines and hanging moss','gown','九歌山鬼薜萝裙（藤叶长裙 opaque proper coverage, elegant gown）','an elegant flowing gown woven of green ivy vines and fig leaves, a proper opaque long gown',85,'缥缈·楚山薜荔'],
[804,'luonv','螺女','搜神记·谢端','Luo Nu, the conch-shell maiden of the Search for the Spirits records','乡野茅舍·月照窗棂·巨螺栖案','a quiet country cottage, moonlight through the window, a great spiral conch resting on the sill','出螺回眸、含羞敛笑、螺女报恩（清恬非性化）','she steps from the conch and glances back with shy grace, the gratitude of a shell maiden and never sexualized','身侧一枚大螺壳 + 螺纹衣袖','a large spiral conch shell cradled beside her, spiral-shell patterns adorning her sleeves','gown','螺女螺光襦裙（珠贝纹长裙 opaque proper coverage, elegant gown）','an elegant flowing shell-patterned ruqun gown of pearly iridescence, a proper opaque long gown',85,'清恬·螺女报恩'],
[805,'lvyinv','绿衣女','聊斋志异·于生','Luyi Nu, the bee-spirit maiden of Strange Tales from a Chinese Studio','书生斋中·绿帘半卷·忍冬初暮','a scholar\'s quiet study, green drapes half-drawn, honeysuckle fragrance at dusk','卷帘回眸、蜂腰一握、绿衣甜笑（甜婉非性化）','she lifts a green curtain and glances back with a sweet smile, delicate and never sexualized','蜂腰一握的异相','a dramatically narrow wasp waist and translucent green bee-wing sleeves','dudou','极小翠绿 dudou（蜂巢纹刺绣，深 V 显沟）+ 单条高透绿纱 at hip，opaque<1/4','a tiny minimal emerald-green dudou set (honeycomb-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer green silk scarf drifting loosely at the hip',20,'甜婉·绿衣蜂腰'],
[806,'aying','阿英','聊斋志异·秦女','A Ying, the parrot-spirit maiden of Strange Tales from a Chinese Studio','秦氏书斋·金笼空垂·月落香炉','a Qin study, a golden cage hanging empty, moonlight over the incense burner','笼前回眸、翠羽凝情、鹦鹉情痴（娇痴非性化）','she turns from the cage and glances back with vivid eyes, a parrot\'s longing and never sexualized','背生鹦鹉翠羽双翼 + 翠羽袖','vivid parrot-feather wings folded at her back and emerald plumage at her sleeves','dudou','极小鹦鹉绿 dudou（羽纹刺绣，深 V 显沟）+ 单条高透翠纱 at hip，opaque<1/4','a tiny minimal parrot-green dudou set (feather-pattern embroidery, deep V neckline showing generous cleavage + small bottom) plus a single extremely sheer emerald silk scarf drifting loosely at the hip',20,'娇痴·鹦鹉情痴'],
];

const manifest = [];
const MOOD_EN = {
  '缥缈·云涯天客': 'ethereal, otherworldly, transcendent',
  '幽寂·南海鲛珠': 'lonely, limpid, otherworldly',
  '祥瑞·文鳐兆丰': 'auspicious, lively, otherworldly',
  '缱绻·比翼不离': 'devoted, tender, otherworldly',
  '虔恭·犬封献杯': 'gentle, loyal, hospitable',
  '缱绻·九尾白狐': 'devoted, enchanting, otherworldly',
  '缥缈·楚山薜荔': 'elusive, ethereal, wild',
  '清恬·螺女报恩': 'shy, gentle, sweet',
  '甜婉·绿衣蜂腰': 'sweet, delicate, charming',
  '娇痴·鹦鹉情痴': 'vivid, devoted, charming',
};
for (const [id, py, cn, work, enId, sceneCN, sceneEN, actCN, actEN, traitCN, traitEN, wtype, wardCN, wardEN, cov, mood] of S) {
  const subject = `${cn}（${work}）reinterpret，非真人仿冒`;
  const neg = wtype === 'gown' ? NEG_GOWN : NEG_DUDOU;
  const prompt = `Cinematic medium-close-up artistic portrait of a fictional ${enId}, reimagined as an entirely original, fictional person that does NOT resemble any real actress, celebrity, or public figure. She has an extremely voluptuous, amply curved figure with a very large, full, prominent bust and generous deep cleavage (clearly oversized, G-cup or larger), lush hip-and-waist curves and long slender legs. Scene & context: ${sceneEN}, as background accents only, never wrapping the figure. Pose & action: ${actEN}. Distinguishing feature: ${traitEN}. Wardrobe: ${wardEN}. The human figure is the unmistakable focal point: her bare shoulders, torso, arms and long legs are softly lit; the clothing is minimal and strategic, never a covering gown, robe, drape or long skirt.${wtype === 'gown' ? ' For this character the wardrobe is an elegant fully-covered celestial palace gown in keeping with her divine station, opaque proper coverage, the figure still the clear focal point.' : ''} Lighting: soft cinematic cool-toned key light with delicate rim light, ultra-realistic skin texture. Camera: 85mm lens, medium close-up environmental portrait. Mood: ${MOOD_EN[mood] || mood}, artistic and non-sexual. Style: cinematic fashion editorial, ultra-realistic, high-end, AI-generated. Watermark text at bottom-right corner: AI生成.`;
  const dna = {
    subject,
    scene: sceneCN,
    context: sceneEN + ' (background accents only, never wrapping the figure)',
    lighting: 'soft cinematic cool-toned key light with delicate rim light',
    composition: '85mm 中近景环境人像',
    action: actCN,
    trait: traitCN,
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
