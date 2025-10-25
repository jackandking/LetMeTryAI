export const version = '1.0.0';

const targetMap = {
  '/pages/stream/stream': '../stream/index.html',
  '/pages/latest/latest': '../latest/index.html',
  '/pages/mytop10/mytop10': '../mytop10/index.html',
  '/pages/wwtop10/wwtop10': '../wwtop10/index.html',
  '/pages/abtest/abtest': '../abtest/index.html',
  '/pages/index/index': '../index/index.html',
  '/pages/upload/upload': '../upload/index.html'
};

export function navigateToPage(target) {
  const dest = targetMap[target];
  if (dest) {
    window.location.href = dest;
  } else {
    console.warn('Unknown target:', target);
  }
}
