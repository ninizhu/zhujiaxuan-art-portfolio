const phoneScreen = '(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 600px)';
const sceneTargets = '#stage, .world-label';
const placeButtons = '.actions [data-location]';
const blocked = '.viewer.open, .work-index.open';
const dragThreshold = 9;

export function enableMobileExplore(cinema, canExplore) {
  const ownSetting = new URLSearchParams(location.search).get('explore');
  const frame = window.frameElement;
  const parentSetting = frame && new URL(frame.ownerDocument.URL).searchParams.get('explore');
  if ((ownSetting ?? parentSetting) === '0') return;

  const phone = matchMedia(phoneScreen);
  let gesture;
  let suppressClickUntil = 0;
  let pendingFrame = 0;

  function finish(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.dragging) suppressClickUntil = performance.now() + 450;
    gesture = undefined;
  }

  function refresh() {
    document.documentElement.classList.toggle('mobile-explore', phone.matches);
    if (!phone.matches) {
      gesture = undefined;
      cinema.resetExploration();
    }
  }

  document.addEventListener('pointerdown', event => {
    if (!phone.matches || event.pointerType !== 'touch' || !event.isPrimary) return;
    gesture = undefined;
    suppressClickUntil = 0;
    if (!canExplore() || document.querySelector(blocked)) return;
    const pan = !!event.target.closest(sceneTargets);
    if (!pan && !event.target.closest(placeButtons)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, pan, dragging: false };
  }, true);

  document.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    if (!canExplore() || document.querySelector(blocked)) {
      finish(event);
      return;
    }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging && Math.hypot(dx, dy) < dragThreshold) return;
    if (gesture.pan) {
      // Discard the threshold-crossing delta so the scene stays under the finger.
      if (gesture.dragging && cinema.pan(dx, dy) && !pendingFrame) {
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = 0;
          if (canExplore()) cinema.drawExploration();
        });
      }
      gesture.x = event.clientX;
      gesture.y = event.clientY;
    }
    gesture.dragging = true;
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', finish, true);
  document.addEventListener('pointercancel', finish, true);
  document.addEventListener('click', event => {
    if (!phone.matches || event.detail === 0 || (event.pointerType && event.pointerType !== 'touch') ||
        performance.now() > suppressClickUntil ||
        !event.target.closest(`${sceneTargets}, ${placeButtons}`)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  phone.addEventListener('change', refresh);
  refresh();
}
