// Robot Dogs Data
const robotDogs = [
    {
        id: 'boston-dynamics-spot',
        name: 'Boston Dynamics Spot',
        country: '🇺🇸 美国',
        emoji: '🐕',
        description: '全球最著名的商用机器狗，具备出色的平衡能力和环境适应能力，可搭载多种任务模块。',
        specs: ['续航90分钟', '负重14kg', '360°避障', 'IP54防护'],
        votes: 0
    },
    {
        id: 'ghost-robotics-vision',
        name: 'Ghost Robotics Vision',
        country: '🇺🇸 美国',
        emoji: '🦮',
        description: '美国军方青睐的战术机器狗，配备狙击步枪，专为军事任务设计，适应复杂地形。',
        specs: ['战术级', '武器搭载', '全地形', ' silent运行'],
        votes: 0
    },
    {
        id: 'unitree-go2',
        name: 'Unitree Go2',
        country: '🇨🇳 中国',
        emoji: '🐩',
        description: '宇树科技新一代机器狗，采用GPT技术，具备强大的AI交互能力，性价比极高。',
        specs: ['GPT智能', '续航2小时', '价格亲民', '开源SDK'],
        votes: 0
    },
    {
        id: 'unitree-b2',
        name: 'Unitree B2',
        country: '🇨🇳 中国',
        emoji: '🦘',
        description: '宇树工业级机器狗，负重能力最强，可承载40kg，适合物流运输和工业巡检。',
        specs: ['负重40kg', '工业级', '4-6小时续航', 'IP66防护'],
        votes: 0
    },
    {
        id: 'anymal-c',
        name: 'ANYmal C',
        country: '🇨🇭 瑞士',
        emoji: '🐺',
        description: '苏黎世联邦理工开发，专注于工业检测，具备自主导航和恶劣环境作业能力。',
        specs: ['自主导航', '工业检测', '防水防尘', '终身学习'],
        votes: 0
    },
    {
        id: 'mi-cyberdog',
        name: '小米 CyberDog 2',
        country: '🇨🇳 中国',
        emoji: '🐕‍🦺',
        description: '小米第二代机器狗，面向开发者，具备强大的运动控制能力，支持开源开发。',
        specs: ['开源', '运动控制', 'AI芯片', '低成本'],
        votes: 0
    }
];

// State
let currentVote = null;
let votes = JSON.parse(localStorage.getItem('robotDogsVotes') || '{}');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCandidates();
    renderResults();
    initModal();
});

// Render Candidates
function renderCandidates() {
    const container = document.getElementById('candidates-container');
    container.innerHTML = robotDogs.map(dog => `
        <div class="candidate-card" onclick="openVoteModal('${dog.id}')">
            <div class="candidate-image">${dog.emoji}</div>
            <div class="candidate-info">
                <div class="candidate-name">${dog.name}</div>
                <span class="candidate-country">${dog.country}</span>
                <p class="candidate-desc">${dog.description}</p>
                <div class="candidate-specs">
                    ${dog.specs.map(spec => `<span class="spec-tag">${spec}</span>`).join('')}
                </div>
                <button class="vote-btn" onclick="event.stopPropagation(); openVoteModal('${dog.id}')">
                    🗳️ 投一票
                </button>
            </div>
        </div>
    `).join('');
}

// Modal Functions
function initModal() {
    const modal = document.getElementById('vote-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
    
    // Vote option buttons
    document.querySelectorAll('.vote-option').forEach(btn => {
        btn.addEventListener('click', () => submitVote(btn.dataset.reason));
    });
}

function openVoteModal(dogId) {
    const dog = robotDogs.find(d => d.id === dogId);
    if (!dog) return;
    
    currentVote = dogId;
    document.getElementById('selected-candidate').textContent = dog.name;
    document.getElementById('vote-modal').style.display = 'block';
}

function submitVote(reason) {
    if (!currentVote) return;
    
    // Record vote
    if (!votes[currentVote]) votes[currentVote] = { count: 0, reasons: {} };
    votes[currentVote].count++;
    votes[currentVote].reasons[reason] = (votes[currentVote].reasons[reason] || 0) + 1;
    
    // Save to localStorage
    localStorage.setItem('robotDogsVotes', JSON.stringify(votes));
    
    // Track with utility
    if (typeof trackVote === 'function') {
        trackVote('robot-dogs', currentVote, reason);
    }
    
    // Close modal and refresh
    document.getElementById('vote-modal').style.display = 'none';
    renderResults();
    
    // Show thanks
    alert(`🎉 投票成功！你支持的是：${robotDogs.find(d => d.id === currentVote).name}\n理由：${reason}`);
    currentVote = null;
}

// Render Results
function renderResults() {
    const container = document.getElementById('results-container');
    
    // Calculate totals
    const totalVotes = Object.values(votes).reduce((sum, v) => sum + (v.count || 0), 0);
    
    if (totalVotes === 0) {
        container.innerHTML = '<p style="text-align:center;opacity:0.7;">暂无投票数据，快来投下第一票吧！</p>';
        return;
    }
    
    // Sort by votes
    const sortedDogs = [...robotDogs].sort((a, b) => {
        const votesA = votes[a.id]?.count || 0;
        const votesB = votes[b.id]?.count || 0;
        return votesB - votesA;
    });
    
    container.innerHTML = sortedDogs.map((dog, index) => {
        const dogVotes = votes[dog.id]?.count || 0;
        const percentage = totalVotes > 0 ? ((dogVotes / totalVotes) * 100).toFixed(1) : 0;
        
        return `
            <div class="result-item">
                <div class="result-header">
                    <span>${index + 1}. ${dog.emoji} ${dog.name}</span>
                    <span>${dogVotes} 票 (${percentage}%)</span>
                </div>
                <div class="result-bar">
                    <div class="result-fill" style="width: ${percentage}%">
                        ${percentage > 10 ? percentage + '%' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add total
    container.innerHTML += `<p style="text-align:center;margin-top:20px;opacity:0.8;">总投票数：${totalVotes}</p>`;
}

// Initialize visit tracking
if (typeof trackVisit === 'function') {
    trackVisit('robot-dogs');
}
