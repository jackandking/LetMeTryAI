// e2e-test-1775518804987 - Voting App
const OPTIONS = [{"value":"basketball-shoes","label":"篮球鞋"},{"value":"running-shoes","label":"跑鞋"},{"value":"gym-gloves","label":"健身手套"}];

function initApp() {
  const form = document.getElementById('voteForm');
  const voteInput = document.getElementById('voteInput');
  const submitBtn = document.querySelector('.submit-btn');
  const optionCards = document.querySelectorAll('.option-card');

  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      optionCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      voteInput.value = card.dataset.value;
      submitBtn.disabled = false;
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vote = voteInput.value;
    if (!vote) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
      await submitVote(vote);
      showResults();
    } catch (error) {
      console.error('Vote failed:', error);
      alert('投票失败，请重试');
      submitBtn.disabled = false;
      submitBtn.textContent = '投票';
    }
  });
}

async function submitVote(vote: string) {
  console.log('Vote submitted:', vote);
  await new Promise(resolve => setTimeout(resolve, 500));
  localStorage.setItem('voted_e2e-test-1775518804987', vote);
}

function showResults() {
  const results = document.getElementById('results');
  results?.classList.remove('hidden');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { initApp };
