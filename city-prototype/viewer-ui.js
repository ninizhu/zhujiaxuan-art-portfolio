export function createViewerUI(room, entry) {
  const artwork = document.createElement('section');
  artwork.className = 'lightbox3 viewer artwork-viewer';
  artwork.inert = true;
  artwork.setAttribute('role', 'dialog');
  artwork.setAttribute('aria-modal', 'true');
  artwork.setAttribute('aria-labelledby', 'artwork-title');
  artwork.innerHTML = `
    <header class="viewer-bar">
      <div><p class="viewer-brand">INNER CITY / ARTWORK VIEWER</p><h2 id="artwork-title"></h2></div>
      <button type="button" class="viewer-back">← Exhibition index</button>
    </header>
    <div class="artwork-stage"><img alt="" draggable="false"></div>
    <footer class="artwork-tools">
      <div class="artwork-pagination">
        <button type="button" data-step="-1" aria-label="Previous artwork">←</button>
        <output class="artwork-count" aria-live="polite"></output>
        <button type="button" data-step="1" aria-label="Next artwork">→</button>
      </div>
      <div class="artwork-zoom">
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-zoom="reset" aria-label="Reset zoom">100%</button>
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" class="artwork-fullscreen">Fullscreen</button>
      </div>
    </footer>`;
  document.body.append(artwork);
  const stage = artwork.querySelector('.artwork-stage');
  const image = stage.querySelector('img');
  const zoomReset = artwork.querySelector('[data-zoom="reset"]');
  room.tabIndex = -1;
  const background = [...document.body.children].filter(el => el !== room && el !== artwork && el.tagName !== 'SCRIPT');
  const inertBefore = new Map();
  let returnFocus, artworkFocus, items = [], index = 0, zoom = 1, x = 0, y = 0, gesture;
  let closeRoom, cinemaKeys;

  function open(mode) {
    if (!room.classList.contains('open')) {
      returnFocus = document.activeElement;
      for (const el of background) {
        inertBefore.set(el, el.inert);
        el.inert = true;
      }
    }
    closeArtwork(false);
    room.dataset.mode = mode;
    room.inert = false;
    room.classList.add('open');
    room.scrollTop = 0;
    room.focus({ preventScroll: true });
  }

  function close() {
    closeArtwork(false);
    room.classList.remove('open', 'viewer-expanded');
    notifyFullscreen(room);
    room.inert = true;
    for (const [el, inert] of inertBefore) el.inert = inert;
    inertBefore.clear();
    const target = returnFocus?.isConnected && returnFocus.getClientRects().length
      ? returnFocus : entry.querySelector('.enter');
    target?.focus({ preventScroll: true });
  }

  function draw() {
    const maxX = Math.max(0, (image.offsetWidth * zoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * zoom - stage.clientHeight) / 2);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
    stage.classList.toggle('zoomed', zoom > 1);
    zoomReset.textContent = `${Math.round(zoom * 100)}%`;
    artwork.querySelector('[data-zoom="out"]').disabled = zoom === 1;
    artwork.querySelector('[data-zoom="in"]').disabled = zoom >= 4;
  }

  function setZoom(value) {
    zoom = Math.max(1, Math.min(4, value));
    if (zoom === 1) x = y = 0;
    draw();
  }

  function showItem() {
    const item = items[index];
    image.src = item.src;
    image.alt = item.alt;
    artwork.querySelector('#artwork-title').textContent = item.caption;
    artwork.querySelector('.artwork-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    x = y = 0;
    setZoom(1);
  }

  function step(direction) {
    index = (index + direction + items.length) % items.length;
    showItem();
  }

  function openArtwork(works, start, trigger) {
    items = works;
    index = start;
    artworkFocus = trigger;
    showItem();
    room.inert = true;
    artwork.inert = false;
    artwork.classList.add('open');
    artwork.querySelector('.viewer-back').focus({ preventScroll: true });
  }

  function closeArtwork(restoreFocus = true) {
    if (!artwork.classList.contains('open')) return;
    artwork.classList.remove('open', 'viewer-expanded');
    notifyFullscreen(artwork);
    artwork.inert = true;
    room.inert = false;
    gesture = null;
    if (restoreFocus) artworkFocus?.focus({ preventScroll: true });
  }

  function notifyFullscreen(target) {
    target.dispatchEvent(new Event('innercity:fullscreen-change'));
  }

  async function fullscreen(target) {
    if (target.classList.contains('viewer-expanded')) {
      target.classList.remove('viewer-expanded');
      notifyFullscreen(target);
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled && target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.querySelector('video')?.webkitEnterFullscreen) {
        target.querySelector('video').webkitEnterFullscreen();
      } else {
        throw new Error('Fullscreen unavailable');
      }
    } catch {
      if (!target.classList.contains('open') || document.fullscreenElement) return;
      target.classList.add('viewer-expanded');
    }
    notifyFullscreen(target);
  }

  function fullscreenLabel(target) {
    if (document.fullscreenElement === target) return 'Exit fullscreen';
    if (target.classList.contains('viewer-expanded')) return 'Exit expanded view';
    return 'Fullscreen';
  }

  artwork.querySelector('.viewer-back').onclick = () => closeArtwork();
  artwork.querySelectorAll('[data-step]').forEach(button => button.onclick = () => step(Number(button.dataset.step)));
  artwork.querySelector('[data-zoom="out"]').onclick = () => setZoom(zoom - .5);
  zoomReset.onclick = () => setZoom(1);
  artwork.querySelector('[data-zoom="in"]').onclick = () => setZoom(zoom + .5);
  const artworkFs = artwork.querySelector('.artwork-fullscreen');
  artworkFs.onclick = () => fullscreen(artwork);
  const syncArtworkFullscreen = () => { artworkFs.textContent = fullscreenLabel(artwork); };
  artwork.addEventListener('innercity:fullscreen-change', syncArtworkFullscreen);
  document.addEventListener('fullscreenchange', syncArtworkFullscreen);
  image.addEventListener('load', draw);
  new ResizeObserver(draw).observe(stage);

  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, type: event.pointerType };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId || zoom === 1) return;
    x = gesture.x + event.clientX - gesture.startX;
    y = gesture.y + event.clientY - gesture.startY;
    draw();
  });
  stage.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.startX, dy = event.clientY - gesture.startY;
    if (zoom === 1 && gesture.type === 'touch' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    gesture = null;
  });
  stage.addEventListener('lostpointercapture', () => { gesture = null; });

  document.addEventListener('keydown', event => {
    if (!room.classList.contains('open') || event.defaultPrevented) return;
    const top = artwork.classList.contains('open') ? artwork : room;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (document.fullscreenElement || top.classList.contains('viewer-expanded')) fullscreen(top);
      else if (top === artwork) closeArtwork();
      else closeRoom();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...top.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
        .filter(el => el.getClientRects().length && getComputedStyle(el).visibility === 'visible');
      const first = focusable[0], last = focusable.at(-1);
      const active = document.activeElement;
      if ((event.shiftKey && (active === first || active === top)) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target.closest('input,textarea,select,[contenteditable]') || (event.key === ' ' && event.target.closest('button')))) return;
    if (top === artwork && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (top === room && room.dataset.mode === 'cinema') {
      cinemaKeys(event);
    }
  });

  return {
    open, close, openArtwork, fullscreen, fullscreenLabel,
    connect(onClose, onCinemaKeys) { closeRoom = onClose; cinemaKeys = onCinemaKeys; }
  };
}
