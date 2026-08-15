const lessonContent = {
    starter: { name: '好奇起步', title: '和 AI 一起做一张“会讲故事”的角色卡', result: '一张角色卡 + 一段专属故事', steps: ['认识 AI|它能做什么，不能做什么', '学会提问|把一个想法说得更清楚', '完成作品|生成、修改并讲给家人听'] },
    maker: { name: '小小创作者', title: '把一个游戏点子，变成能玩的网页', result: '一个可玩的小游戏原型', steps: ['拆解想法|把玩法拆成小任务', '和 AI 协作|让它帮忙写第一版', '反复修改|自己测试、挑选和优化'] },
    explorer: { name: 'AI 探索者', title: '用 AI 做一次属于自己的小研究', result: '一份有观点的研究小报告', steps: ['提出问题|从好奇开始找方向', '验证资料|比较答案，识别不确定', '清楚表达|把发现讲给别人听'] }
};

document.querySelectorAll('.level-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        const content = lessonContent[tab.dataset.level];
        document.querySelectorAll('.level-tab').forEach((item) => {
            const active = item === tab;
            item.classList.toggle('is-active', active);
            item.setAttribute('aria-selected', String(active));
        });
        document.querySelector('#levelName').textContent = content.name;
        document.querySelector('#lessonTitle').textContent = content.title;
        document.querySelector('#lessonResult').textContent = content.result;
        document.querySelector('#lessonSteps').innerHTML = content.steps.map((step, index) => {
            const [label, description] = step.split('|');
            return `<span>0${index + 1} <b>${label}</b><small>${description}</small></span>`;
        }).join('');
    });
});

document.querySelector('#bookingForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const success = document.querySelector('#formSuccess');
    success.classList.add('is-visible');
    form.querySelector('button').textContent = '预约已提交 ✓';
    form.querySelector('button').disabled = true;
    success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
