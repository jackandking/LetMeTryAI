document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('questionnaire');
    const result = document.getElementById('result');

    form.addEventListener('change', function(e) {
        if (e.target && e.target.name === 'vote') {
            const value = e.target.value;
            // Simple local result display for demo; real projects POST to API_ENDPOINTS
            result.innerHTML = '<p>感谢投票，你选择了：' + (e.target.nextElementSibling ? e.target.nextElementSibling.textContent : value) + '</p>';
            // store local count (for demo only)
            try {
                const counts = JSON.parse(localStorage.getItem('drone_delivery_vote') || '{}');
                counts[value] = (counts[value] || 0) + 1;
                localStorage.setItem('drone_delivery_vote', JSON.stringify(counts));
            } catch (err) {
                console.warn('localStorage error', err);
            }
        }
    });
});