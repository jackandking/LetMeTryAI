import { version, navigateToPage } from '../../utils/app.js';

function bindNavigation(container) {
  container.addEventListener('click', (e) => {
    const targetAttr = e.target?.dataset?.target;
    if (targetAttr) {
      navigateToPage(targetAttr);
    }
  });
}

function init() {
  const versionEl = document.getElementById('version');
  if (versionEl) {
    versionEl.textContent = `Version: ${version}`;
    versionEl.addEventListener('click', () => navigateToPage('/pages/abtest/abtest'));
  }

  document.querySelectorAll('.navigation-container, .footer').forEach(bindNavigation);
}

init();
