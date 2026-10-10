/* Higgsfield visual layer for the existing Sunami app flow. */
const SUNNY_POSES = ['wave', 'celebrate', 'think', 'read', 'sleep', 'encourage'];
const HIGGSFIELD_ASSETS = Object.freeze({
  sunny: '/assets/sunny-higgsfield.webp',
  lagoon: '/assets/sunami-lagoon-higgsfield.webp',
  world: '/assets/sunami-world-higgsfield.webp'
});

function bindImage(image) {
  if (!image || image.dataset.immersiveBound) return;
  image.dataset.immersiveBound = '1';
  image.addEventListener('load', () => image.classList.add('loaded'));
  image.addEventListener('error', () => image.classList.remove('loaded'));
  if (image.complete && image.naturalWidth) image.classList.add('loaded');
}

function setLocalImage(image, url) {
  if (!image || image.dataset.src === url) return;
  bindImage(image);
  image.dataset.src = url;
  image.src = url;
}

function setPose(target, pose) {
  if (!target) return;
  SUNNY_POSES.forEach(name => target.classList.remove(`pose-${name}`));
  if (pose) target.classList.add(`pose-${pose}`);
}

function updateHomeScene() {
  const bg = document.getElementById('homeSceneBg');
  if (!bg) return;
  setLocalImage(bg, HIGGSFIELD_ASSETS.lagoon);
}

function updateStoryScene() {
  const bg = document.getElementById('storyBackdropBg');
  const setting = document.getElementById('sceneSetting')?.textContent?.trim();
  if (!bg || !setting || setting.includes("s'écrit") || setting.includes('s\u2019écrit')) return;
  setLocalImage(bg, HIGGSFIELD_ASSETS.lagoon);
}

function updateSocialScene(id, prompt) {
  const bg = document.getElementById(id);
  if (!bg) return;
  setLocalImage(bg, HIGGSFIELD_ASSETS.lagoon);
}

function setImmersiveScreen(id) {
  ['pickScreen', 'chatScreen', 'sagasScreen', 'profileScreen', 'friendsScreen'].forEach(screenId => {
    const screen = document.getElementById(screenId);
    if (screen) screen.style.display = screenId === id ? 'flex' : 'none';
  });
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

function bindMotionLayer() {
  const roots = [...document.querySelectorAll('#pickScreen, #chatScreen, .social-screen')];
  if (!roots.length) return;
  roots.forEach(root => {
    root.addEventListener('pointermove', event => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      root.style.setProperty('--pointer-x', (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
      root.style.setProperty('--pointer-y', (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
    });
    root.addEventListener('pointerleave', () => {
      root.style.setProperty('--pointer-x', '0');
      root.style.setProperty('--pointer-y', '0');
    });
  });
  const updateScrollMotion = () => {
    const lift = `${Math.max(-28, Math.min(0, -window.scrollY * 0.04))}px`;
    roots.forEach(root => root.style.setProperty('--scroll-lift', lift));
  };
  window.addEventListener('scroll', updateScrollMotion, { passive: true });
  updateScrollMotion();
}

window.openProfilePanel = function() {
  setImmersiveScreen('profileScreen');
  updateSocialScene('profileSceneBg', 'editorial storybook illustration of a calm seaside reading nook at golden hour, teal lime and coral palette, no people, no text, no words');
  const value = id => document.getElementById(id)?.textContent?.trim() || '0';
  const user = document.getElementById('userLabel')?.textContent?.trim();
  const name = document.getElementById('profileName');
  if (name && user) name.textContent = user.replace(/^@/, '');
  const pairs = [['profileLevel', 'lvlNum'], ['profileXpLabel', 'xpCount'], ['profileStreak', 'streakCount'], ['profileWords', 'wordsCount'], ['profileChapters', 'statChapters']];
  pairs.forEach(([target, source]) => { const el = document.getElementById(target); if (el) el.textContent = value(source) + (target === 'profileXpLabel' ? ' XP' : ''); });
  const xp = parseInt(value('xpCount'), 10) || 0;
  const fill = document.getElementById('profileXpFill');
  if (fill) fill.style.width = `${Math.min(100, Math.max(8, xp % 100))}%`;
};

window.openFriendsPanel = function() {
  setImmersiveScreen('friendsScreen');
  updateSocialScene('friendsSceneBg', 'warm illustrated rooftop community garden at sunset, language learning friends gathering, teal lime and coral palette, no readable text, no logos');
};

window.closeImmersivePanel = function() {
  setImmersiveScreen('chatScreen');
  document.getElementById('chatLog')?.scrollIntoView({ block: 'end' });
};

function restoreReaderPoses() {
  const avatar = document.getElementById('sceneAvatar');
  const banner = document.getElementById('sceneBanner');
  if (avatar && !avatar.classList.contains('pose-celebrate') && !avatar.classList.contains('pose-encourage')) {
    const desired = banner?.classList.contains('thinking') ? 'think' : 'wave';
    if (!avatar.classList.contains(`pose-${desired}`)) setPose(avatar, desired);
  }
  document.querySelectorAll('#chatLog .narrator-avatar svg').forEach(svg => setPose(svg, 'read'));
}

function bindImmersiveLayer() {
  bindImage(document.getElementById('homeSceneBg'));
  bindImage(document.getElementById('storyBackdropBg'));
  bindImage(document.getElementById('sceneBannerBg'));
  bindImage(document.getElementById('profileSceneBg'));
  bindImage(document.getElementById('friendsSceneBg'));
  setLocalImage(document.getElementById('sceneBannerBg'), HIGGSFIELD_ASSETS.lagoon);
  bindMotionLayer();
  updateHomeScene();
  restoreReaderPoses();

  const pickScreen = document.getElementById('pickScreen');
  pickScreen?.addEventListener('click', event => {
    if (event.target.closest('.pick-card')) setTimeout(updateHomeScene, 280);
  });
  document.getElementById('customUniverse')?.addEventListener('input', updateHomeScene);

  document.querySelectorAll('.friends-tabs button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.friends-tabs button').forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
    });
  });
  document.getElementById('inviteFriendBtn')?.addEventListener('click', async () => {
    const text = 'Rejoins-moi sur Sunami : on apprend une langue en vivant une histoire.';
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    const button = document.getElementById('inviteFriendBtn');
    if (button) { button.textContent = 'Lien prêt à partager ✓'; setTimeout(() => { button.textContent = '＋ Inviter un ami'; }, 1800); }
  });

  const sceneBanner = document.getElementById('sceneBanner');
  const sceneObserver = new MutationObserver(() => {
    updateStoryScene();
    restoreReaderPoses();
  });
  if (sceneBanner) sceneObserver.observe(sceneBanner, { childList: true, characterData: true, subtree: true });

  const chatLog = document.getElementById('chatLog');
  const chatObserver = new MutationObserver(records => {
    let celebrate = false;
    let encourage = false;
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches('.msg.user') || node.querySelector('.msg.user')) celebrate = true;
      if (node.matches('.feedback.wrong,.grammar-feedback') || node.querySelector('.feedback.wrong,.grammar-feedback')) encourage = true;
    }));
    restoreReaderPoses();
    const avatar = document.getElementById('sceneAvatar');
    if (!avatar) return;
    if (encourage) setPose(avatar, 'encourage');
    else if (celebrate) {
      setPose(avatar, 'celebrate');
      setTimeout(() => setPose(avatar, 'wave'), 1100);
    }
  });
  if (chatLog) chatObserver.observe(chatLog, { childList: true, subtree: true });

  const screenObserver = new MutationObserver(() => {
    updateHomeScene();
    updateStoryScene();
    restoreReaderPoses();
  });
  const app = document.getElementById('appScreen');
  if (app) screenObserver.observe(app, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindImmersiveLayer, { once: true });
else bindImmersiveLayer();
