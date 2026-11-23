const attempt = new URLSearchParams(location.search).get('opening');
const embeddedOpening = window.parent !== window && attempt !== null;

function report(type) {
  document.documentElement.dataset.cityOpeningState = type;
  window.parent.postMessage({ type, attempt }, location.origin);
}

try {
  await import('./main.js');
  await import('./portfolio-layer.js');
  if (embeddedOpening) {
    const plate = document.querySelector('[data-shot="overview"].active .cinema-plate');
    await plate.decode();
    report('inner-city:ready');
  }
} catch (error) {
  if (embeddedOpening) report('inner-city:failed');
  else throw error;
}
