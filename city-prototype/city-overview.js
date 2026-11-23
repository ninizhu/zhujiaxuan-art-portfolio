// The exterior camera plates share one coordinate system for artwork and labels.
const shots = {
  overview: { focus: [.55, .55], near: 'street', far: 'ridge' },
  mountains: {
    focus: [.65, .47], near: 'stairs', far: 'forest',
    poster: ['stone-is-the-root-of-cloud-v3-cover.png', 'STONE IS THE ROOT OF CLOUD', [.508, .328, .788, .583]]
  },
  bus: {
    file: 'bus-wide', posterRatio: '3120 / 1454', focus: [.60, .50], near: 'curb', far: 'traffic',
    poster: ['Xiao Nan-cover.jpg', 'XIAO NAN', [.555, .366, .769, .544]]
  },
  banquet: {
    focus: [.69, .47], near: 'table', far: 'arches',
    poster: ['The Flock-cover.png', 'THE FLOCK', [.574, .224, .852, .492]]
  },
  apartment: {
    focus: [.77, .50], near: 'sofa', far: 'window',
    poster: ['Me-cover.png', 'ME', [.658, .267, .946, .538]]
  },
  archive: {
    focus: [.64, .49], near: 'gallery-floor', far: 'gallery-ceiling',
    exhibits: [
      ['Photo1.jpg', 'PHOTO', [.381, .328, .501, .543]],
      ['Animation1.jpg', 'ANIMATION', [.615, .328, .844, .515]],
      [null, 'INSTALLATION ART', [.879, .427, .978, .705]]
    ]
  }
};

const locations = {
  mountains: [.85, .235],
  bus: [.89, .71],
  banquet: [.52, .51],
  apartment: [.62, .393],
  archive: [.85, .44]
};

const routes = {
  mountains: { duration: 2700, cutScale: 2.27, landing: [.666, .417], city: [.85, .205], detail: [.648, .456], entry: [1.075, .018, -.039], end: [1.19, -.035, .006], axis: 'vertical' },
  bus: { duration: 2600, cutScale: 2.80, landing: [.694, .47], city: [.89, .756], detail: [.662, .455], entry: [1.075, .031, .014], end: [1.19, -.028, -.01], axis: 'horizontal' },
  banquet: { duration: 2660, cutScale: 1.92, landing: [.698, .345], city: [.52, .545], detail: [.713, .358], entry: [1.065, -.015, -.012], end: [1.16, -.035, -.005], axis: 'vertical' },
  apartment: { duration: 2630, cutScale: 1.87, landing: [.81, .39], city: [.62, .42], detail: [.802, .403], entry: [1.06, .015, -.018], end: [1.13, -.047, -.002], axis: 'horizontal' },
  archive: { duration: 2650, cutScale: 2.21, landing: [.74, .403], city: [.85, .48], detail: [.73, .422], entry: [1.065, .016, -.019], end: [1.12, -.028, -.004], axis: 'horizontal' }
};
const mix = (a, b, t) => a + (b - a) * t;
const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const cut = .58;
const cutTravel = smooth(cut);
const cutZoomSpeed = .37;

// Both sides use the same log-scale velocity at the cut. The global clock
// handles acceleration at departure and braking at the final composition.
function bend(t, bias) {
  return t + bias * t * (1 - t);
}

export function createCityOverview(stage, openArtwork) {
  const root = document.createElement('div');
  root.className = 'cinema-stage';
  stage.append(root);
  const sets = new Map();

  for (const [key, shot] of Object.entries(shots)) {
    const layer = document.createElement('div');
    layer.className = 'cinema-shot';
    layer.dataset.shot = key;
    layer.inert = true;
    const frame = document.createElement('div');
    frame.className = 'cinema-frame';
    const plate = new Image();
    plate.className = 'cinema-plate';
    plate.alt = '';
    plate.fetchPriority = key === 'overview' ? 'high' : 'low';
    plate.src = new URL(`../assets/cinema/${shot.file || key}.jpg`, import.meta.url).href;
    frame.append(plate);

    const addDepth = region => {
      const layer = document.createElement('div');
      layer.className = 'cinema-depth';
      layer.dataset.region = region;
      layer.style.backgroundImage = `url("${plate.src}")`;
      frame.append(layer);
      return layer;
    };
    const far = addDepth(shot.far);
    const near = addDepth(shot.near);

    const artworks = [];
    const items = shot.exhibits || (shot.poster ? [shot.poster] : []);
    for (const [file, title, bounds] of items) {
      const [left, top, right, bottom] = bounds;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cinema-artwork';
      button.setAttribute('aria-label', title);
      Object.assign(button.style, {
        left: `${left * 100}%`, top: `${top * 100}%`, width: `${(right - left) * 100}%`,
        ...(shot.posterRatio ? { aspectRatio: shot.posterRatio } : { height: `${(bottom - top) * 100}%` })
      });
      if (file) {
        const cover = new Image();
        cover.alt = '';
        cover.src = new URL(`../assets/${shot.exhibits ? 'images' : 'covers'}/${file}`, import.meta.url).href;
        button.append(cover);
      } else {
        button.classList.add('cinema-exhibit-marker');
      }
      if (shot.exhibits) {
        button.dataset.exhibit = title;
        button.title = title;
      }
      button.addEventListener('click', () => openArtwork(key, shot.exhibits ? title : null));
      frame.append(button);
      artworks.push(button);
      if (shot.exhibits) {
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'cinema-exhibit-label';
        label.textContent = title;
        label.style.left = `${(left + right) * 50}%`;
        label.style.top = `${bottom * 100}%`;
        label.addEventListener('click', () => openArtwork(key, title));
        frame.append(label);
        artworks.push(label);
      }
    }

    layer.append(frame);
    root.append(layer);
    sets.set(key, { layer, frame, plate, shot, near, far, artworks });
    plate.addEventListener('load', fit);
  }

  const atmosphere = document.createElement('div');
  atmosphere.className = 'cinema-atmosphere';
  atmosphere.hidden = true;
  for (const className of ['cinema-mist', 'cinema-vapor', 'cinema-scatter']) {
    const layer = document.createElement('div');
    layer.className = className;
    atmosphere.append(layer);
  }
  root.append(atmosphere);
  let overviewRect, overviewPoseTransform;
  let viewportWidth, viewportHeight;
  let visibleKey, visibleInteractive;
  let exploration;
  let explorationWeight = 0;

  function pan(dx, dy) {
    if (!visibleInteractive || !sets.has(visibleKey)) return false;
    if (exploration?.key !== visibleKey) exploration = { key: visibleKey, x: 0, y: 0 };
    const { rect, pose } = sets.get(visibleKey);
    const width = rect.w * pose.scale;
    const height = rect.h * pose.scale;
    const left = rect.x + pose.x;
    const top = rect.y + pose.y;
    // Traverse the cropped plate faster in portrait, while keeping the
    // original framing and ensuring the plate always covers the viewport.
    const horizontalGain = Math.min(1.65, Math.sqrt(width / viewportWidth));
    exploration.x = Math.max(viewportWidth - width - left,
      Math.min(-left, exploration.x + dx * horizontalGain));
    // Use a little extra travel to create room on a tightly fitted axis.
    const verticalRoom = viewportHeight * .075;
    exploration.y = Math.max(viewportHeight - height - top - verticalRoom,
      Math.min(-top + verticalRoom, exploration.y + dy * .65));
    return true;
  }

  function drawExploration() {
    if (!visibleInteractive || !sets.has(visibleKey)) return;
    explorationWeight = exploration ? 1 : 0;
    if (visibleKey === 'overview') {
      position('overview', 1, 0, 0, { x: 0, y: 0, amount: 0 });
      placeLabels(true);
    } else {
      detailPose(visibleKey, routes[visibleKey], 1);
    }
  }

  function resetExploration() {
    if (!exploration) return;
    exploration = undefined;
    drawExploration();
  }
  function fit() {
    const width = viewportWidth = stage.clientWidth;
    const height = viewportHeight = stage.clientHeight;
    for (const [key, { frame, plate, shot }] of sets) {
      const ratio = plate.naturalWidth / plate.naturalHeight || 16 / 9;
      const w = Math.max(width, height * ratio), h = w / ratio;
      const [fx, fy] = shot.focus;
      let x = (width - w) * fx;
      const y = (height - h) * fy;
      if (key === 'overview' && width > 700) {
        const anchors = Object.values(locations).map(([u]) => u * w);
        const leftLimit = 52 - Math.min(...anchors), rightLimit = width - 52 - Math.max(...anchors);
        x = Math.max(width - w, Math.min(0, Math.max(leftLimit, Math.min(rightLimit, x))));
      }
      Object.assign(frame.style, { width: `${w}px`, height: `${h}px`, left: `${x}px`, top: `${y}px` });
      sets.get(key).rect = { x, y, w, h };
      if (key === 'overview') overviewRect = { x, y, w, h };
    }
    const overview = sets.get('overview');
    if (visibleInteractive && document.documentElement.classList.contains('mobile-explore')) drawExploration();
    else placeLabels(visibleKey === 'overview' && !overview.layer.inert);
  }

  function show(key, interactive = true) {
    if (visibleKey === key && visibleInteractive === interactive) return;
    for (const [name, { layer, artworks }] of sets) {
      const active = name === key;
      if (visibleKey !== key) {
        layer.classList.toggle('active', active);
        layer.inert = !active;
      }
      const disabled = !active || !interactive;
      for (const artwork of artworks) {
        if (artwork.disabled !== disabled) artwork.disabled = disabled;
      }
    }
    if (visibleKey !== key) document.body.dataset.exterior = sets.has(key) ? key : '';
    visibleKey = key;
    visibleInteractive = interactive;
  }

  function position(key, scale, x, y, depth) {
    const set = sets.get(key);
    const { frame, near, far, rect } = set;
    set.pose = { x, y, scale };
    if (exploration?.key === key && explorationWeight > 0) {
      const { x: left, y: top, w, h } = rect;
      const dx = exploration.x * explorationWeight;
      const dy = exploration.y * explorationWeight;
      // Create a small amount of vertical room around the viewport center.
      const zoom = Math.min(.1, Math.abs(dy) * 2 / viewportHeight);
      const plateLeft = left + x;
      const width = w * scale;
      const panX = Math.max(viewportWidth - width - plateLeft, Math.min(-plateLeft, dx));
      const crop = Math.max(0, width - viewportWidth);
      const zoomAnchor = crop ? clamp(-(plateLeft + panX) / crop) * w : w / 2;
      x += panX - zoomAnchor * zoom;
      y += dy - (viewportHeight / 2 - top) * zoom;
      scale += zoom;
      x = Math.max(viewportWidth - left - w * scale, Math.min(-left, x));
      y = Math.max(viewportHeight - top - h * scale, Math.min(-top, y));
    }
    if (key === 'overview') overviewPoseTransform = { x, y, scale };
    frame.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
    near.style.transform = `translate3d(${depth.x}px,${depth.y}px,0) scale(${1 + depth.amount * .15})`;
    far.style.transform = `translate3d(${-depth.x * .32}px,${-depth.y * .4}px,0) scale(${1 + depth.amount * .035})`;
    near.style.opacity = far.style.opacity = Math.min(1, depth.amount * 5);
  }

  function overviewPose(route, progress) {
    const { x, y, w, h } = overviewRect;
    sets.get('overview').near.dataset.axis = route.axis;
    const [u, v] = route.city;
    const width = viewportWidth, height = viewportHeight;
    const logCityScale = Math.log(route.cutScale);
    const t = bend(progress, 1 - cutZoomSpeed * cutTravel / logCityScale);
    const scale = Math.exp(logCityScale * t);
    const ax = x + u * w, ay = y + v * h;
    // Map the photographed landmark toward center, then constrain the plate
    // against the viewport so a resized or portrait window cannot show edges.
    const tx = Math.max(width - x - w * scale, Math.min(-x, mix(ax, width * route.landing[0], t) - x - u * w * scale));
    const ty = Math.max(height - y - h * scale, Math.min(-y, mix(ay, height * route.landing[1], t) - y - v * h * scale));
    position('overview', scale, tx, ty, { x: width * -.055 * t, y: height * (route.axis === 'vertical' ? .063 : -.045) * t, amount: t });
  }

  function detailPose(key, route, progress) {
    const { x, y, w, h } = sets.get(key).rect;
    const width = viewportWidth, height = viewportHeight;
    const logStart = Math.log(route.entry[0]);
    const logSpan = Math.log(route.end[0]) - logStart;
    const t = bend(progress, cutZoomSpeed * (1 - cutTravel) / logSpan - 1);
    const scale = Math.exp(logStart + logSpan * t);
    const dx = mix(route.entry[1], route.end[1], t), dy = mix(route.entry[2], route.end[2], t);
    const [u, v] = route.detail;
    const tx = Math.max(width - x - w * scale, Math.min(-x, -u * w * (scale - 1) + dx * width));
    const ty = Math.max(height - y - h * scale, Math.min(-y, -v * h * (scale - 1) + dy * height));
    // Converge the cutouts onto the photographed composition at rest.
    const parallax = Math.sin(Math.PI * t);
    const shift = route.axis === 'vertical' ? { x: 0, y: 29 * parallax } : { x: -35 * parallax, y: 8 * parallax };
    position(key, scale, tx, ty, { ...shift, amount: parallax });
  }

  function play(key, progress, weight) {
    explorationWeight = weight;
    const route = routes[key];
    const travel = smooth(progress);
    if (progress < cut) {
      overviewPose(route, travel / cutTravel);
      show('overview', false);
    } else {
      detailPose(key, route, (travel - cutTravel) / (1 - cutTravel));
      show(key, false);
    }

    // Local wisps lead the broad veil; its density peaks over the one-frame
    // plate cut. All three fields follow the same reversible route clock.
    const veil = smooth((progress - .36) / (cut - .36)) * (1 - smooth((progress - cut) / (.83 - cut)));
    const leading = smooth((progress - .31) / .20) * (1 - smooth((progress - .60) / .26));
    atmosphere.hidden = leading === 0 && veil === 0;
    if (!atmosphere.hidden) {
      atmosphere.dataset.route = key;
      atmosphere.style.setProperty('--mist', veil);
      atmosphere.style.setProperty('--wisps', leading);
      atmosphere.style.setProperty('--drift', `${(progress - cut) * 112}%`);
    }
  }

  function settle(key) {
    exploration = undefined;
    explorationWeight = 0;
    atmosphere.hidden = true;
    if (routes[key]) detailPose(key, routes[key], 1);
    if (key === 'overview') position(key, 1, 0, 0, { x: 0, y: 0, amount: 0 });
    show(key);
    placeLabels(key === 'overview');
  }

  function placeLabels(active) {
    if (!overviewRect) return;
    const { x, y, w, h } = overviewRect;
    const { x: tx, y: ty, scale } = exploration?.key === 'overview' && explorationWeight
      ? overviewPoseTransform
      : { x: 0, y: 0, scale: 1 };
    for (const [key, [u, v]] of Object.entries(locations)) {
      const element = document.querySelector(`#label-${key}`);
      const left = x + tx + u * w * scale;
      const top = y + ty + v * h * scale;
      element.hidden = !active || left < 48 || left > innerWidth - 48 || top < 85 || top > innerHeight - 20;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }
  }

  fit();
  return { fit, settle, play, placeLabels, pan, drawExploration, resetExploration, duration: key => routes[key]?.duration, has: key => sets.has(key) };
}
