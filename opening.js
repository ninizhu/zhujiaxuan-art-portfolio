const city = document.querySelector('#city');
const opening = document.querySelector('.opening');
const enter = document.querySelector('#opening-enter');
const retry = document.querySelector('#opening-retry');
const status = document.querySelector('.opening-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const titleCue = performance.now() + 700;
let attempt = 1;
let loadingTimer, failureTimer;

function clearTimers() {
  clearTimeout(loadingTimer);
  clearTimeout(failureTimer);
}

function fail() {
  clearTimers();
  document.body.dataset.opening = 'failed';
  status.textContent = 'The city could not load.';
  retry.hidden = false;
}

function waitForCity() {
  clearTimers();
  document.body.dataset.opening = 'waiting';
  enter.hidden = retry.hidden = true;
  status.textContent = '';
  loadingTimer = setTimeout(() => { status.textContent = 'LOADING'; }, 1000);
  failureTimer = setTimeout(fail, 10000);
}

function receiveCityState(type, reportedAttempt) {
  if (reportedAttempt !== String(attempt) || !['waiting', 'failed'].includes(document.body.dataset.opening)) return;
  if (type === 'inner-city:failed') {
    fail();
  } else if (type === 'inner-city:ready') {
    clearTimers();
    status.textContent = '';
    const focusEnter = document.activeElement === document.body || document.activeElement === retry;
    retry.hidden = true;
    document.body.style.setProperty('--city-lead', `${Math.max(0, titleCue - performance.now())}ms`);
    document.body.dataset.opening = 'ready';
    enter.hidden = false;
    if (focusEnter) enter.focus({ preventScroll: true });
  }
}

window.addEventListener('message', event => {
  if (event.source !== city.contentWindow || event.origin !== location.origin) return;
  receiveCityState(event.data?.type, event.data?.attempt);
});

function checkFrameState() {
  const frame = city.contentDocument;
  if (!frame?.documentElement?.dataset.cityOpeningState) return;
  receiveCityState(frame.documentElement.dataset.cityOpeningState, new URL(frame.URL).searchParams.get('opening'));
}

city.addEventListener('load', checkFrameState);

retry.addEventListener('click', () => {
  if (document.body.dataset.opening !== 'failed') return;
  attempt++;
  waitForCity();
  const url = new URL(city.src);
  url.searchParams.set('opening', String(attempt));
  city.src = url.href;
});

enter.addEventListener('click', event => {
  if (document.body.dataset.opening !== 'ready') return;
  document.body.dataset.opening = 'entering';
  enter.disabled = true;
  city.contentDocument.documentElement.classList.remove('opening-pending');

  const finish = () => {
    if (document.body.dataset.opening !== 'entering') return;
    document.body.dataset.opening = 'entered';
    opening.remove();
    city.inert = false;
    if (event.detail === 0) city.contentDocument.querySelector('#viewAllWorks')?.focus({ preventScroll: true });
  };
  if (reducedMotion.matches) {
    finish();
  } else {
    opening.addEventListener('transitionend', event => {
      if (event.target === opening && event.propertyName === 'opacity') finish();
    });
    setTimeout(finish, 800);
  }
});

waitForCity();
checkFrameState();
