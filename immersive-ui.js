/* Illustrated world layer for the existing Sunami app flow. */
const SUNNY_POSES = ['wave', 'celebrate', 'think', 'read', 'sleep', 'encourage'];

function sceneSeed(value) {
  let hash = 0;
  for (const char of String(value || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 1000000;
}

function sceneImage(prompt, width, height, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}

function bindImage(image) {
  if (!image || image.dataset.immersiveBound) return;
  image.dataset.immersiveBound = '1';
  image.addEventListener('load', () => image.classList.add('loaded'));
  image.addEventListener('error', () => image.classList.remove('loaded'));
  if (image.complete && image.naturalWidth) image.classList.add('loaded');
}

function setPose(target, pose) {
  if (!target) return;
  SUNNY_POSES.forEach(name => target.classList.remove(`pose-${name}`));
  if (pose) target.classList.add(`pose-${pose}`);
}

function updateHomeScene() {
  const bg = document.getElementById('homeSceneBg');
  if (!bg) return;
  bindImage(bg);
  const selected = document.querySelector('#themeGrid .pick-card.active')?.textContent?.trim();
  const custom = document.getElementById('customUniverse')?.value?.trim();
  const setting = custom || selected || 'a language learning adventure by the sea';
  const prompt = `whimsical storybook illustration, rich atmospheric setting for ${setting}, warm teal lime and coral palette, cinematic depth, inviting language learning adventure, no people, no characters, no text, no words`;
  const url = sceneImage(prompt, 768, 1024, sceneSeed(`home:${setting}`));
  if (bg.dataset.src !== url) { bg.dataset.src = url; bg.src = url; }
}

function updateStoryScene() {
  const bg = document.getElementById('storyBackdropBg');
  const setting = document.getElementById('sceneSetting')?.textContent?.trim();
  if (!bg || !setting || setting.includes("s'écrit") || setting.includes('s\u2019écrit')) return;
  bindImage(bg);
  const prompt = `whimsical storybook illustration, immersive vertical story world, ${setting}, warm teal lime and coral palette, layered atmospheric scenery, no people, no characters, no text, no words`;
  const url = sceneImage(prompt, 768, 1024, sceneSeed(`reader:${setting}`));
  if (bg.dataset.src !== url) { bg.dataset.src = url; bg.src = url; }
}

function updateSocialScene(id, prompt) {
  const bg = document.getElementById(id);
  if (!bg) return;
  bindImage(bg);
  const url = sceneImage(prompt, 768, 1024, sceneSeed(id));
  if (bg.dataset.src !== url) { bg.dataset.src = url; bg.src = url; }
}

function setImmersiveScreen(id) {
  ['pickScreen', 'chatScreen', 'sagasScreen', 'profileScreen', 'friendsScreen'].forEach(screenId => {
    const screen = document.getElementById(screenId);
    if (screen) screen.style.display = screenId === id ? 'flex' : 'none';
  });
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
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
