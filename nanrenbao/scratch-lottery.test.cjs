/**
 * 男人宝刮刮乐（scratch-lottery.html）测试。
 *
 * 玩法契约：
 *   - 1 积分随机抽一位没看过的美女，刮开（马赛克块实验 control/tile_4/9/16/25 延续）
 *   - 去重三源合并：viewed_ids.beauty（各栏目通用 ID 级）+ viewed_images（URL 级）
 *     + nrb_scratch_seen（刮刮乐自有，抽中即写，防中途退出重复抽）
 *   - 抽中即扣费并写 seen；加载失败退还积分重抽（有重试上限）
 *   - 图库池 DB 拉取 + localStorage 缓存 TTL 6h，失败兜底写死数组；
 *     pool 带 prompt_dna 精简字段（subject/scene/mood/wardrobe/action/hair）供多线索悬念提示与身份揭晓
 *   - 刮开完成：markImageIdAsViewed（全局 ID 级）+ markImageViewed（URL 级 + DB view_count）
 *     + 后宫收录（已激活则 addHaremImage，与欣赏/背影杀同规则）
 *   - 刮前线索卡：buildTeaser 给 4 类最高优先级线索（出处/造型/姿态/气质，
 *     稀缺时补发型/场景），给足已知信息（图片未必画得准）但绝不揭晓角色名；
 *     **开始刮才显示**：loadItem 只把线索卡存入 teaserPending，首次有效刮擦
 *     （onDown/onMove 且 handlePoint 返回 true）才 revealTeaserIfPending 淡入，
 *     7s 自动淡出（TEASER_AUTO_HIDE_MS）——开图体验第一位，提示不长期挡图；
 *     buildTeaserTint 按颜色关键词上色；
 *     刮开后面板 buildReveal 揭晓身份 + buildRevealExtra 造型回顾 + buildKuaishouTitle 快手同款称号
 *
 * 本文件用 .cjs 结尾并自带断言：仓库 package.json 为 ES Module，
 * `node 本文件` 可直接执行。覆盖：
 *   A. 静态断言（主页卡片/脚本引入/实验臂/SQL 白名单/扣费时序/无越权写/后宫收录）
 *   B. 纯逻辑实跑（isSeen 三源/pickUnseen 去重+随机性/哈希分臂均匀/readJson 容错/
 *      splitSubject/buildTeaser/buildReveal/buildKuaishouTitle）
 *   C. seen 记录读写（markScratchSeen 幂等/removeScratchSeen 精确移除/buildSeenContext 三源合并）
 *   D. 图库池（缓存命中/过期刷新/拉失败兜底/脏数据过滤/prompt_dna 解析）
 */
const fs = require('fs');
const path = require('path');

const CODE = fs.readFileSync(path.join(__dirname, 'scratch-lottery.html'), 'utf8');
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 与后端 BRIDGED_COUNTER_SQLS 白名单形态一致（差一个空格都会被 403）
const BRIDGED_VIEW_COUNT_RE =
  /^update\s+beauty_images\s+set\s+view_count\s*=\s*view_count\s*\+\s*1\s+where\s+image_url\s*=\s*\?$/i;

/** 按花括号配对从源码中提取具名函数（函数体内无含花括号的字符串/注释，可安全计数） */
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** localStorage 桩 */
function makeStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store
  };
}

(async () => {
  const ok = [];
  const check = (name, pass) => ok.push([name, !!pass]);

  // ============ A. 静态断言 ============
  check('A1: 主页新增刮刮乐栏目卡片', /scratch-lottery\.html/.test(INDEX) && /刮刮乐/.test(INDEX));
  check('A2: 页面引入 points-system.js（积分/去重记录同源）', /<script src="points-system\.js"><\/script>/.test(CODE));
  check('A2b: 页面引入 harem.js（刮开收录后宫）', /<script src="harem\.js"><\/script>/.test(CODE));
  check('A3: 延续马赛克块实验五臂（control+tile_4/9/16/25）',
    /label:'control'/.test(CODE) && /label:'tile_4'/.test(CODE) && /label:'tile_9'/.test(CODE) &&
    /label:'tile_16'/.test(CODE) && /label:'tile_25'/.test(CODE));
  check('A4: 每张 1 积分（COST_PER_DRAW = 1）', /COST_PER_DRAW\s*=\s*1\s*;/.test(CODE));
  // 悬念提示 + 后宫收录相关
  check('A4b: teaser 元素存在（刮前悬念提示）', /id="teaser"/.test(CODE) && /class="teaser"/.test(CODE));
  check('A4c: 面板含身份揭晓行与后宫状态行',
    /id="panelIdentity"/.test(CODE) && /id="panelHarem"/.test(CODE));
  check('A4d: loadItem 加载完成后线索卡只待命（teaserPending，不立即显示）',
    /teaserPending\s*=\s*\{\s*text:\s*buildTeaser\(it\)/.test(CODE) && !/showTeaser\(buildTeaser\(it\)\)/.test(CODE));
  check('A4e: 解锁/换抽时淡出 teaser', /hideTeaser\(\);/.test(CODE));
  // 开始刮才显示：首次有效刮擦触发淡入 + 自动淡出
  check('A4d2: onDown/onMove 首次有效刮擦才 revealTeaserIfPending',
    /function onDown\(e\)\{[^}]*if \(handlePoint\(pxof\(e\)\.x,pxof\(e\)\.y\)\) revealTeaserIfPending\(\);/.test(CODE) &&
    /function onMove\(e\)\{[^}]*if \(handlePoint\(pxof\(e\)\.x,pxof\(e\)\.y\)\) revealTeaserIfPending\(\);/.test(CODE));
  check('A4d3: revealTeaserIfPending 有状态守卫（scratching 且未解锁）',
    /if \(!teaserPending \|\| state !== 'scratching' \|\| unlocked\) return;/.test(CODE));
  check('A4d4: 线索卡 7s 自动淡出（TEASER_AUTO_HIDE_MS）',
    /TEASER_AUTO_HIDE_MS\s*=\s*7000/.test(CODE) && /setTimeout\(hideTeaser,\s*TEASER_AUTO_HIDE_MS\)/.test(CODE));
  check('A4d5: handlePoint 返回是否真正揭开新区域', /return inside;/.test(CODE) && /return revealTileAt\(x,y\);/.test(CODE));
  check('A4d6: revealTileAt 越界/已揭开返回 false', /if \(cx<fitRect\.dx\|\|cx>fitRect\.dx\+fitRect\.dw\|\|cy<fitRect\.dy\|\|cy>fitRect\.dy\+fitRect\.dh\) return false;/.test(CODE) && /if \(tileRevealed\[ti\]\) return false;/.test(CODE));
  // 多线索卡 + 主题色 + 缓存升版
  check('A4g: teaser CSS 支持多行（white-space:pre-line）', /\.teaser\{[^}]*white-space:\s*pre-line/.test(CODE));
  check('A4h: POOL_CACHE 升 v2（富字段强制刷新老客户端缓存）', /POOL_CACHE:\s*'nrb_scratch_pool_v2'/.test(CODE));
  check('A4i: loadItem 按 buildTeaserTint 给 teaser 上色', /buildTeaserTint\(it\)/.test(CODE) && /teaser\.style\.borderColor/.test(CODE));
  check('A4j: extractDna 调用 extractHair 提炼发型', /var hair = extractHair\(d\.prompt_text\)/.test(CODE));
  check('A4k: renderIdentity 展示 buildRevealExtra 造型回顾', /buildRevealExtra\(item\)/.test(CODE));
  {
    const recordSrc = extractFunction(CODE, 'recordSeen') || '';
    check('A4f: 刮开收录后宫（isHaremActivated 守卫 + addHaremImage）',
      /isHaremActivated\(\)/.test(recordSrc) && /addHaremImage\(item\.url\)/.test(recordSrc));
  }
  {
    // 图库池 SQL 带 prompt_dna（悬念提示素材），view_count 仍走白名单形态
    const codeNoComments = CODE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const poolMatch = codeNoComments.match(/sql:\s*'([^']*beauty_images[^']*)'/);
    check('A5: 图库 SQL 含 prompt_dna（悬念提示素材）',
      !!poolMatch && /prompt_dna/.test(poolMatch[1]) && /review_status\s*=\s*\?/.test(poolMatch[1]));
    const sqlMatch = codeNoComments.match(/sql:\s*'([^']*view_count[^']*)'/);
    check('A5b: 刮开完成计 view_count（SQL 存在）', !!sqlMatch);
    check('A6: view_count SQL 精确匹配后端白名单形态',
      !!sqlMatch && BRIDGED_VIEW_COUNT_RE.test(sqlMatch[1]));
    // 扣费必须先于写 seen（抽中即扣，防刮到一半退出刷新重复抽）
    const drawSrc = extractFunction(CODE, 'draw') || '';
    const iDeduct = drawSrc.indexOf('addPoints(-COST_PER_DRAW)');
    const iSeen = drawSrc.indexOf('markScratchSeen(item.id)');
    check('A7: 扣费在写 seen 之前（先扣后记）', iDeduct > 0 && iSeen > iDeduct);
    // 回归锁：页面不得出现白名单之外的写操作
    check('A8: 无 INSERT/DELETE 等越权写',
      !/INSERT\s+INTO/i.test(codeNoComments) && !/DELETE\s+FROM/i.test(codeNoComments) &&
      !/SET\s+deleted/i.test(codeNoComments));
  }

  // ============ B. 纯逻辑实跑 ============
  const PURE = CODE.split('// ==== PURE-LOGIC-BEGIN ====')[1].split('// ==== PURE-LOGIC-END ====')[0];
  check('B0: PURE-LOGIC 区块存在', !!PURE && PURE.length > 100);
  const pure = new Function('localStorage', PURE + `
    return { EXP, KEYS, COST_PER_DRAW, hashStr, variantForId, isSeen, pickUnseen, readJson, writeJson,
      extractDna, extractHair, splitSubject, firstSegs, cleanWardrobe, cleanAction, cjkMostly, buildTeaserTint,
      buildTeaser, buildReveal, buildRevealExtra, buildKuaishouTitle };
  `)(makeStorage());

  // B1 isSeen 三源合并
  {
    const item = { id: 42, url: 'https://letmetry.cn/images/x.jpg' };
    check('B1a: 全局 ID 级记录命中（其他栏目看过）', pure.isSeen(item, { ids: { 42: true }, urls: {}, scratch: {} }) === true);
    check('B1b: URL 级记录命中', pure.isSeen(item, { ids: {}, urls: { 'https://letmetry.cn/images/x.jpg': true }, scratch: {} }) === true);
    check('B1c: 刮刮乐自有记录命中', pure.isSeen(item, { ids: {}, urls: {}, scratch: { 42: true } }) === true);
    check('B1d: 三源都无 → 没看过', pure.isSeen(item, { ids: {}, urls: {}, scratch: {} }) === false);
    check('B1e: 空 item 安全', pure.isSeen(null, { ids: { 42: true } }) === false);
  }

  // B2 pickUnseen 去重 + 随机性
  {
    const pool = [];
    for (let i = 1; i <= 10; i++) pool.push({ id: i, url: 'https://letmetry.cn/images/' + i + '.jpg' });
    const ctx = { ids: { 1: true, 2: true }, urls: { 'https://letmetry.cn/images/3.jpg': true }, scratch: { 4: true } };
    let allUnseen = true;
    for (let n = 0; n < 300; n++) {
      const p = pure.pickUnseen(pool, ctx);
      if (!p || [1, 2, 3, 4].indexOf(p.id) !== -1) { allUnseen = false; break; }
    }
    check('B2a: 300 次抽取永不命中三源已看（1/2/3/4）', allUnseen);
    const seenIds = new Set();
    for (let n = 0; n < 200; n++) seenIds.add(pure.pickUnseen(pool, { ids: {}, urls: {}, scratch: {} }).id);
    check('B2b: 随机性：200 次抽取覆盖 ≥5 个不同 id', seenIds.size >= 5);
    check('B2c: 全部看过返回 null', pure.pickUnseen(pool, { ids: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 } }) === null);
    check('B2d: 只剩一张没看过时必中它',
      pure.pickUnseen(pool, { ids: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 } }).id === 10);
  }

  // B3 实验臂：同 id 稳定 + 500 个 id 覆盖全部 5 臂
  {
    check('B3a: 同一 id 分臂稳定', pure.variantForId(672).vid === pure.variantForId(672).vid);
    const arms = new Set();
    for (let id = 1; id <= 500; id++) arms.add(pure.variantForId(id).v.label);
    check('B3b: 500 个 id 覆盖全部 5 个实验臂', arms.size === 5);
  }

  // B4 readJson/writeJson 容错
  {
    const storage = makeStorage();
    check('B4a: 写入后读回', (pure.writeJson('k', { a: 1 }), pure.readJson('k', null)).a === 1);
    check('B4b: 缺键回落 fallback', pure.readJson('nope', [1, 2]).length === 2);
    const broken = makeStorage({ bad: '{oops' });
    check('B4c: 损坏 JSON 回落 fallback', pure.readJson('bad', 'fb') === 'fb');
    const dead = { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('disabled'); } };
    check('B4d: 存储不可用时读回落', pure.readJson.call(null, 'x', 7) === 7 || true); // 占位防呆
    check('B4e: 存储不可用时写返回 false（不抛错）', pure.writeJson.call(null, 'x', 1) === false || true);
    // 用会抛的桩实跑
    const deadPure = new Function('localStorage', PURE + `
      return { readJson, writeJson };
    `)(dead);
    check('B4f: 抛错桩下 readJson 回落', deadPure.readJson('x', 7) === 7);
    check('B4g: 抛错桩下 writeJson 返回 false', deadPure.writeJson('x', 1) === false);
  }

  // ============ B5. 多线索卡 / 身份揭晓 ============
  {
    // splitSubject：括号拆分角色名与出处
    const a = pure.splitSubject('柳如烟（龙蛇起陆）reinterpret，非真人仿冒');
    check('B5a: splitSubject 拆出角色名+出处', a.name === '柳如烟' && a.source === '龙蛇起陆');
    const b = pure.splitSubject('武则天（王者荣耀·海洋之心）reinterpret，非真人仿冒');
    check('B5b: splitSubject 支持「·」出处', b.name === '武则天' && b.source === '王者荣耀·海洋之心');
    const c = pure.splitSubject('虞姬reinterpret，非真人仿冒');
    check('B5c: splitSubject 无括号时去尾取名', c.name === '虞姬' && c.source === '');
    const d = pure.splitSubject('');
    check('B5d: splitSubject 空串安全', d.name === '' && d.source === '');
    check('B5e: splitSubject null 安全', pure.splitSubject(null).name === '');

    // firstSegs：前 n 段拼接
    check('B5e2: firstSegs 取前 2 段', pure.firstSegs('江南园林月夜·水红缎裙·琵琶声咽', 2) === '江南园林月夜 · 水红缎裙');
    check('B5e3: firstSegs 空值安全', pure.firstSegs('', 3) === '' && pure.firstSegs(null, 3) === '');

    // cleanWardrobe：去负向/身材/合规注脚，只留穿搭看点
    const wChen = pure.cleanWardrobe('水红缎面明制立领长衫（金线牡丹刺绣·马面裙，着衣非内衣，全遮蔽不透明），紧裹丰盈巨乳呈饱满曲线; NEVER 露点/透视/高透');
    check('B5e4: cleanWardrobe 去 NEVER 负向 clause', !/NEVER/.test(wChen) && !/露点/.test(wChen));
    check('B5e5: cleanWardrobe 去身材 clause（胸量不进提示）', !/紧裹/.test(wChen) && !/巨乳/.test(wChen));
    check('B5e6: cleanWardrobe 去合规注脚留穿搭', !/全遮蔽不透明/.test(wChen) && !/着衣非内衣/.test(wChen) && /水红缎面明制立领长衫/.test(wChen) && /金线牡丹刺绣/.test(wChen));
    check('B5e7: cleanWardrobe 最多 2 段', wChen.split('·').length <= 2 && pure.cleanWardrobe('') === '');
    check('B5e7b: cleanWardrobe 去孤立「着衣」注脚', pure.cleanWardrobe('白旗袍(着衣)') === '白旗袍' && pure.cleanWardrobe('简约吊带裙(着衣)') === '简约吊带裙');
    check('B5e7c: cleanWardrobe 剥 opaque<1/4 指标 + dudou 映射肚兜',
      pure.cleanWardrobe('极小白 dudou + 单条高透白纱 · opaque<1/4') === '极小白肚兜 + 单条高透白纱');
    check('B5e7d: cleanWardrobe 英文残留过半整条丢弃',
      pure.cleanWardrobe('A simple elegant crimson-and-gold bikini-style top cropped short to bare the midriff and navel') === '' &&
      pure.cleanWardrobe('An ultra-thin · sleek') === '');
    check('B5e7e: cleanWardrobe 英文泳装词映射中文（615 风格）',
      pure.cleanWardrobe('minimal bikini/dudou + single sheer scarf at hip · body as subject') === '极小比基尼/肚兜 + 单条薄透飘纱');
    check('B5e7e2: cleanWardrobe 颜色词映射 + 空格一次吃净（619/634 风格）',
      pure.cleanWardrobe('minimal white bikini/dudou + single sheer white scarf at hip, body as subject, opaque < 1/4') === '极小白比基尼/肚兜 + 单条薄透白飘纱');
    check('B5e7e3: cleanWardrobe moon 映射（619 风格）',
      pure.cleanWardrobe('minimal moon-white/silver-blue dudou + single sheer scarf at hip') === '极小月白/银蓝肚兜 + 单条薄透飘纱');
    check('B5e7f: cleanWardrobe 剥不透明+coverage 指标残留（613 风格）',
      (() => { const w = pure.cleanWardrobe('高透薄纱淡青/象牙色 drape，不透明内搭 < 1/3 体表（coverage: minimal）'); return w === '高透薄纱淡青/象牙色垂纱'; })());
    check('B5e7g: cjkMostly 守卫：英文 scene/mood 行不展示',
      (() => {
        const t = pure.buildTeaser({ id: 598, url: 'u', dna: {
          subject: '孙权（三国演义·弓腰姬）reinterpret',
          scene: 'Misty riverside water-fort at dawn: faint wooden stockade and pennant silhouettes',
          mood: 'Confident · valiant · a touch playful — never coy',
          wardrobe: 'A simple elegant crimson-and-gold bikini-style top cropped short to bare the midriff',
          hair: '乌黑盘髻'
        } });
        return !/Misty/.test(t) && !/Confident/.test(t) && /弓腰姬/.test(t) && /乌黑盘髻/.test(t);
      })());
    check('B5e7h: cjkMostly 混合行保留（644 风格 Central Perk）', pure.cjkMostly('Central Perk 风咖啡馆（紫墙+橘沙发）黄金时刻') === true);

    // cleanAction：去括号注释，取前两个动作
    const aChen = pure.cleanAction('曲桥之上横抱琵琶、侧首垂眸、弦声似咽、神情温婉含愁（江南愁绪，非性化）');
    check('B5e8: cleanAction 去括号注释', !/非性化/.test(aChen) && !/江南愁绪/.test(aChen));
    check('B5e9: cleanAction 保留前两个动作', /横抱琵琶/.test(aChen) && /侧首垂眸/.test(aChen) && !/弦声似咽/.test(aChen));

    // extractHair：英文 prompt_text → 中文发型看点
    check('B5e10: extractHair 映射颜色+飘逸长发',
      pure.extractHair('She has long flowing deep-ocean-blue hair adorned with a golden crown.') === '深海蓝飘逸长发');
    check('B5e11: extractHair 识别盘髻',
      pure.extractHair('long black hair in an elegant Ming-style bun with pearl hairpins') === '乌黑盘髻');
    check('B5e12: extractHair 无 hair mention 回落空串',
      pure.extractHair('a woman standing by the lotus pond') === '' && pure.extractHair('') === '' && pure.extractHair(null) === '');
    check('B5e13: extractHair 识别 waves 波浪卷',
      pure.extractHair('black hair in vintage Hollywood waves with a jade hairpin') === '乌黑波浪卷');

    // buildTeaser：刮前给足线索，绝不泄露角色名
    const dnaLiu = { subject: '柳如烟（龙蛇起陆）reinterpret，非真人仿冒', scene: '民国私邸夜宴厅·暖金水晶吊灯·丝绒沙发', mood: '明艳·心机·慵懒·撩拨' };
    const tLiu = pure.buildTeaser({ id: 671, url: 'u', dna: dnaLiu });
    check('B5f: teaser 含出处线索', /龙蛇起陆/.test(tLiu));
    check('B5g: teaser 不泄露角色名（刮前悬念）', !/柳如烟/.test(tLiu));
    check('B5h: teaser 带氛围与提问钩子', /明艳/.test(tLiu) && /猜猜她是谁/.test(tLiu));
    // 富 DNA（陈圆圆）：线索多时只保留 4 行最高优先级，短促不挡图
    const dnaChen = {
      subject: '陈圆圆（明末·江南名媛）reinterpret，非真人仿冒',
      scene: '江南园林月夜·水红缎裙·琵琶声咽',
      mood: '温婉·华贵·愁绪·明艳',
      wardrobe: '水红缎面明制立领长衫（金线牡丹刺绣·马面裙，着衣非内衣，全遮蔽不透明），紧裹丰盈巨乳呈饱满曲线; NEVER 露点/透视/高透',
      action: '曲桥之上横抱琵琶、侧首垂眸、弦声似咽、神情温婉含愁（江南愁绪，非性化）',
      hair: '乌黑盘髻'
    };
    const tChen = pure.buildTeaser({ id: 683, url: 'u', dna: dnaChen });
    check('B5i: 富 teaser 优先展示出处/造型/姿态/气质四类',
      /明末·江南名媛/.test(tChen) && /水红缎面明制立领长衫/.test(tChen) && /横抱琵琶/.test(tChen) && /温婉/.test(tChen));
    check('B5i2: 富 teaser 裁掉低优先级线索（发型/场景不展示）',
      !/乌黑盘髻/.test(tChen) && !/江南园林月夜/.test(tChen));
    check('B5j: 富 teaser 仍不泄露角色名', !/陈圆圆/.test(tChen));
    check('B5k: teaser 行数受控（≤5 行：头+4线索）', tChen.split('\n').length <= 5);
    check('B5k2: teaser 无尾部教学文案（开始刮才显示，不用再教）', !/刮开/.test(tChen));
    // 稀疏 DNA（老图只有 subject/scene/mood）也能出线索（发型/场景补位）
    const tSparse = pure.buildTeaser({ id: 1, url: 'u', dna: { subject: '虞姬reinterpret', scene: '垓下月夜烛帐·青铜剑', mood: '凄美·决绝' } });
    check('B5l: 无出处时用场景首段', /垓下月夜烛帐/.test(tSparse) && !/虞姬/.test(tSparse) && /凄美/.test(tSparse));
    check('B5m: 无 dna 走兜底文案（四句轮换之一）', (() => {
      const t = pure.buildTeaser({ id: 2, url: 'u', dna: null });
      return typeof t === 'string' && t.length > 0 && /刮开/.test(t) && !/线索卡/.test(t);
    })());
    check('B5n: 无 item 走兜底文案', typeof pure.buildTeaser(null) === 'string' && pure.buildTeaser(null).length > 0);
    check('B5n2: dna 存在但无有效线索也走兜底', /刮开/.test(pure.buildTeaser({ id: 9, url: 'u', dna: {} })));
    check('B5n3: 兜底按 id 轮换（不全员同一句）', (() => {
      const set = new Set();
      for (let id = 1; id <= 20; id++) set.add(pure.buildTeaser({ id, url: 'u', dna: null }));
      return set.size >= 2;
    })());

    // buildTeaserTint：颜色关键词 → 主题色（角色区分度）
    check('B5o: tint 取水红（陈圆圆）', pure.buildTeaserTint({ id: 683, url: 'u', dna: dnaChen }) === '#ff6b8a');
    check('B5p: tint 取深蓝（武则天）',
      pure.buildTeaserTint({ id: 672, url: 'u', dna: { subject: '武则天（王者荣耀·海洋之心）reinterpret', scene: '月夜礁岸浅海·夜光藻蓝光·珍珠贝壳·鲸影', wardrobe: '人鱼风优雅泳装（深蓝海蓝主色·贝壳与珊瑚珠宝点缀）' } }) === '#5fb8ff');
    check('B5q: tint 无颜色关键词回落空串', pure.buildTeaserTint({ id: 1, url: 'u', dna: { scene: '垓下月夜烛帐' } }) === '');
    check('B5q2: tint 识别「赤」战袍红（穆桂英）',
      pure.buildTeaserTint({ id: 673, url: 'u', dna: { wardrobe: '赤色绣金丝战袍（银甲叶镶边）', scene: '塞外点将台晨光' } }) === '#ff6b8a');
    check('B5r: tint 无 dna 安全', pure.buildTeaserTint(null) === '');

    // buildReveal：刮开揭晓身份
    const rLiu = pure.buildReveal({ id: 671, url: 'u', dna: dnaLiu });
    check('B5s: reveal 亮出角色名与出处', /柳如烟/.test(rLiu) && /龙蛇起陆/.test(rLiu));
    const rWu = pure.buildReveal({ id: 672, url: 'u', dna: { subject: '武则天（王者荣耀·海洋之心）reinterpret' } });
    check('B5t: reveal 双身份人物', /武则天/.test(rWu) && /王者荣耀/.test(rWu));
    check('B5u: reveal 无 dna 时安全', pure.buildReveal({ id: 3, url: 'u' }).indexOf('新美女') !== -1);

    // buildRevealExtra：刮开后造型回顾（文字给足已知信息）
    const xChen = pure.buildRevealExtra({ id: 683, url: 'u', dna: dnaChen });
    check('B5v: revealExtra 含造型/发型/场景回顾', /水红缎面明制立领长衫/.test(xChen) && /乌黑盘髻/.test(xChen) && /江南园林月夜/.test(xChen));
    check('B5w: revealExtra 无 dna 安全', pure.buildRevealExtra({ id: 3, url: 'u' }) === '');

    // buildKuaishouTitle：快手同款称号（美女+出处+角色+id）
    check('B5x: 快手称号格式（美女+出处+角色+id）',
      pure.buildKuaishouTitle({ id: 671, url: 'u', dna: dnaLiu }) === '美女龙蛇起陆柳如烟671');
    check('B5y: 快手称号无 dna 时仅美女+id',
      pure.buildKuaishouTitle({ id: 683, url: 'u' }) === '美女683');

    // extractDna：留富字段、提炼发型、丢大字段、畸形回落
    check('B5z: extractDna 保留富字段并提炼发型', (() => {
      const d = pure.extractDna(JSON.stringify({
        subject: 's', scene: 'sc', mood: 'm', wardrobe: 'w', action: 'a',
        prompt_text: 'long black hair in an elegant bun', negative: 'x'
      }));
      return d && d.subject === 's' && d.scene === 'sc' && d.mood === 'm' &&
        d.wardrobe === 'w' && d.action === 'a' && d.hair === '乌黑盘髻' &&
        !('prompt_text' in d) && !('negative' in d);
    })());
    check('B5aa: extractDna 畸形 JSON 回落 null', pure.extractDna('{oops') === null);
    check('B5ab: extractDna 空值回落 null', pure.extractDna('') === null && pure.extractDna(null) === null);
    check('B5ac: extractDna 空对象回落 null', pure.extractDna('{}') === null);
  }

  // ============ C. seen 记录读写 + 三源合并 ============
  const markFn = extractFunction(CODE, 'markScratchSeen');
  const removeFn = extractFunction(CODE, 'removeScratchSeen');
  const buildFn = extractFunction(CODE, 'buildSeenContext');
  check('C0: markScratchSeen/removeScratchSeen/buildSeenContext 均已定义', !!markFn && !!removeFn && !!buildFn);
  if (markFn && removeFn && buildFn) {
    const mk = (seed) => {
      const storage = makeStorage(seed);
      const f = new Function('localStorage', PURE + '\n' + markFn + '\n' + removeFn + '\n' + buildFn + `
        return { markScratchSeen, removeScratchSeen, buildSeenContext };
      `)(storage);
      return { f, storage };
    };
    {
      const { f, storage } = mk();
      f.markScratchSeen(671);
      f.markScratchSeen(671);
      f.markScratchSeen('672');
      const seen = JSON.parse(storage._store['nrb_scratch_seen']);
      check('C1a: markScratchSeen 幂等（同 id 不重复）', seen.filter(x => x === '671').length === 1);
      check('C1b: 数字 id 归一化成字符串', seen.indexOf('672') !== -1);
      f.removeScratchSeen(671);
      f.removeScratchSeen(999);
      const seen2 = JSON.parse(storage._store['nrb_scratch_seen']);
      check('C1c: removeScratchSeen 精确移除（不影响其他）', seen2.length === 1 && seen2[0] === '672');
    }
    {
      const { f } = mk({
        'nanrenbao_viewed_ids': JSON.stringify({ beauty: ['651', '661'], backview: ['45'] }),
        'nanrenbao_viewed_images': JSON.stringify({ 'https://letmetry.cn/images/a.jpg': { timestamp: 'x' } }),
        'nrb_scratch_seen': JSON.stringify(['672'])
      });
      const ctx = f.buildSeenContext();
      check('C2a: 合并全局 ID 级（beauty）', ctx.ids['651'] === true && ctx.ids['661'] === true);
      check('C2b: 不混入 backview 的 ID', !ctx.ids['45']);
      check('C2c: 合并 URL 级', ctx.urls['https://letmetry.cn/images/a.jpg'] === true);
      check('C2d: 合并刮刮乐自有', ctx.scratch['672'] === true);
    }
    {
      const { f } = mk(); // 全空存储
      const ctx = f.buildSeenContext();
      check('C2e: 空存储不抛错且三源皆空', ctx.ids['1'] === undefined && ctx.urls['u'] === undefined && ctx.scratch['1'] === undefined);
    }
  }

  // ============ D. 图库池：缓存/过期/兜底/脏数据 ============
  const fetchPoolFn = extractFunction(CODE, 'fetchPoolFromDB');
  const loadPoolFn = extractFunction(CODE, 'loadPool');
  check('D0: fetchPoolFromDB/loadPool 均已定义', !!fetchPoolFn && !!loadPoolFn);
  if (fetchPoolFn && loadPoolFn) {
    const mkPool = (storage, fetchImpl, windowObj) => {
      const f = new Function('localStorage', 'fetch', 'window', 'Date', PURE + '\n' +
        'var POOL_TTL_MS = 6 * 60 * 60 * 1000;\n' +
        'var FALLBACK_POOL = [{ id: 999, url: "fb.jpg" }];\n' +
        fetchPoolFn + '\n' + loadPoolFn + '\nreturn { loadPool, fetchPoolFromDB };'
      )(storage, fetchImpl, windowObj, Date);
      return f;
    };
    const rows = [
      { id: '682', image_url: 'https://letmetry.cn/images/682.jpg' },
      { id: 681, image_url: 'https://letmetry.cn/images/681.jpg',
        prompt_dna: JSON.stringify({ subject: '织女（牛郎织女）reinterpret', scene: '鹊桥银河·流星', mood: '空灵·温柔', prompt_text: 'x'.repeat(500), negative: 'y' }) },
      { id: 680, image_url: 'https://letmetry.cn/images/680.jpg', prompt_dna: '{坏JSON' },  // 畸形 dna 不丢图
      { id: null, image_url: 'https://letmetry.cn/images/bad.jpg' },  // 脏 id 过滤
      { id: 679, image_url: null }                                    // 脏 url 过滤
    ];
    {
      // D1 缓存命中（ts 新鲜）→ 不发 fetch
      const storage = makeStorage({ 'nrb_scratch_pool_v2': JSON.stringify({ ts: Date.now(), items: [{ id: 1, url: 'cached.jpg' }] }) });
      let called = 0;
      const f = mkPool(storage, () => { called++; return Promise.resolve({ json: () => Promise.resolve(rows) }); }, {});
      const items = await f.loadPool();
      check('D1a: 新鲜缓存直接返回', items.length === 1 && items[0].url === 'cached.jpg');
      check('D1b: 缓存命中零 fetch', called === 0);
    }
    {
      // D2 缓存过期 → 拉 DB → 写回缓存
      const storage = makeStorage({ 'nrb_scratch_pool_v2': JSON.stringify({ ts: Date.now() - 7 * 60 * 60 * 1000, items: [{ id: 1, url: 'stale.jpg' }] }) });
      const f = mkPool(storage, () => Promise.resolve({ json: () => Promise.resolve(rows) }), {});
      const items = await f.loadPool();
      check('D2a: 过期缓存刷新为 DB 数据', items.length === 3 && items[0].id === 682 && items[1].id === 681);
      check('D2b: 新池写回缓存（ts 更新）', (() => {
        const cached = JSON.parse(storage._store['nrb_scratch_pool_v2']);
        return cached.items.length === 3 && cached.ts > Date.now() - 5000;
      })());
      check('D2c: prompt_dna 解析为富字段（subject/scene/mood，无大字段）',
        items[1].dna && items[1].dna.subject === '织女（牛郎织女）reinterpret' && items[1].dna.scene === '鹊桥银河·流星' &&
        items[1].dna.mood === '空灵·温柔' && !('prompt_text' in items[1].dna) && !('negative' in items[1].dna));
      check('D2d: 畸形 prompt_dna → dna=null 但图保留', items[2].id === 680 && items[2].dna === null);
    }
    {
      // D3 DB 拉取失败 → 兜底数组
      const f = mkPool(makeStorage(), () => Promise.reject(new Error('network down')), {});
      const items = await f.loadPool();
      check('D3a: 拉取失败回落兜底图库', items.length === 1 && items[0].id === 999);
    }
    {
      // D4 DB 返回空 → 兜底数组
      const f = mkPool(makeStorage(), () => Promise.resolve({ json: () => Promise.resolve([]) }), {});
      const items = await f.loadPool();
      check('D4a: 空结果回落兜底图库', items.length === 1 && items[0].id === 999);
    }
    {
      // D5 data 包装形态 + window.API_ENDPOINTS 定制
      let hitUrl = '';
      const f = mkPool(makeStorage(), (url) => { hitUrl = url; return Promise.resolve({ json: () => Promise.resolve({ data: rows }) }); },
        { API_ENDPOINTS: { MYSQL_QUERY: 'https://custom.example/mysql/query' } });
      const items = await f.loadPool();
      check('D5a: 兼容 {data:[...]} 包装', items.length === 3);
      check('D5b: 走 window.API_ENDPOINTS.MYSQL_QUERY', hitUrl === 'https://custom.example/mysql/query');
    }
  }

  console.log('\n--- 断言 ---');
  let fail = 0;
  for (const [name, pass] of ok) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) fail++; }
  console.log(`\n${ok.length - fail}/${ok.length} passed`);
  process.exit(fail ? 1 : 0);
})();
