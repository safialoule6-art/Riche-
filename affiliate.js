/* Sunami — Espace affilié (dashboard) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ============================================================
   PARAMÈTRES DU PROGRAMME D'AFFILIATION
   (basés sur les meilleures pratiques SaaS 2026 — modifie ici)
   ------------------------------------------------------------
   - COMMISSION_RATE 20–30% = "sweet spot" SaaS (récurrent > one-shot)
   - COOKIE_DAYS 60 = fenêtre d'attribution après le clic (30–90 courant)
   - REFUND_HOLD_DAYS 30 = période anti-remboursement avant déblocage
   - MIN_PAYOUT_EUR 25 = seuil de retrait (25–50 courant)
   ============================================================ */
const AFF = {
  PRICE_EUR: 5,           // Prix mensuel de l'abonnement de référence (Sigma)
  COMMISSION_RATE: 0.30,  // 30% de commission
  RECURRING_MONTHS: 12,   // Commission versée jusqu'à N mois par filleul
  COOKIE_DAYS: 60,        // Fenêtre d'attribution après un clic
  REFUND_HOLD_DAYS: 30,   // Anti-remboursement : jours avant déblocage
  MIN_PAYOUT_EUR: 25,     // Seuil minimum de retrait
  BASE_URL: 'https://sunami-rho.vercel.app',
};

const supabase = createClient(
  'https://cdtabuyomtkfasvugtck.supabase.co',
  'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo'
);

const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const $ = (id) => document.getElementById(id);

let referralCode = '';

// En-tetes authentifies (JWT Supabase) pour les appels /api/referral.
async function affAuthHeaders(){
  try{
    const { data } = await supabase.auth.getSession();
    const t = data && data.session && data.session.access_token;
    return t ? { 'Content-Type':'application/json', 'Authorization':'Bearer '+t }
             : { 'Content-Type':'application/json' };
  }catch(e){ return { 'Content-Type':'application/json' }; }
}

async function init() {
  const { data } = await supabase.auth.getSession();
  const session = data && data.session;

  if (!session) {
    $('affGate').style.display = 'block';
    $('affDash').style.display = 'none';
    return;
  }

  $('affGate').style.display = 'none';
  $('affDash').style.display = 'block';

  // Copie statique des paramètres dans l'UI
  $('affCookie').textContent = AFF.COOKIE_DAYS + ' jours';
  $('affRatePct').textContent = Math.round(AFF.COMMISSION_RATE * 100) + '%';
  $('affMin').textContent = eur(AFF.MIN_PAYOUT_EUR);
  $('affPerSale').textContent = eur(AFF.PRICE_EUR * AFF.COMMISSION_RATE);

  const userId = session.user.id;
  await loadCode(userId);
  await loadStats(userId);
}

async function loadCode(userId) {
  // Réutilise le cache si présent
  referralCode = localStorage.getItem('sunami_ref_code') || '';
  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: await affAuthHeaders(),
      body: JSON.stringify({ action: 'generate' }),
    });
    const d = await res.json();
    if (d.code) {
      referralCode = d.code;
      localStorage.setItem('sunami_ref_code', d.code);
    }
  } catch (e) { /* garde le cache */ }

  const link = referralCode ? `${AFF.BASE_URL}/?ref=${referralCode}` : `${AFF.BASE_URL}`;
  $('affLink').textContent = link;
  renderShare(link);
}

async function loadStats(userId) {
  let stats = { total: 0, converted: 0, clicks: 0, paid: 0, referrals: [] };
  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: await affAuthHeaders(),
      body: JSON.stringify({ action: 'stats' }),
    });
    stats = { ...stats, ...(await res.json()) };
  } catch (e) { /* affiche des zéros */ }

  const referrals = Array.isArray(stats.referrals) ? stats.referrals : [];
  const converted = referrals.filter(r => r.status === 'converted');
  const sales = converted.length || stats.converted || 0;
  const clicks = Number(stats.clicks) || 0;
  const perSale = AFF.PRICE_EUR * AFF.COMMISSION_RATE;

  // Commission totale gagnée (estimation : 1 mois par vente confirmée)
  const earned = sales * perSale;
  // Chiffre d'affaires généré pour Sunami
  const revenue = sales * AFF.PRICE_EUR;

  // Répartition anti-remboursement d'après la date de conversion
  const now = Date.now();
  const holdMs = AFF.REFUND_HOLD_DAYS * 86400000;
  let pending = 0, cleared = 0;
  converted.forEach(r => {
    const t = r.updated_at || r.created_at;
    const age = t ? now - new Date(t).getTime() : holdMs; // sans date → considéré débloqué
    if (age < holdMs) pending += perSale; else cleared += perSale;
  });
  if (converted.length === 0 && sales > 0) cleared = earned; // fallback si pas de détail

  const paid = Number(stats.paid) || 0;
  const ready = Math.max(0, cleared - paid);

  // Rendu
  $('affTotal').textContent = eur(earned);
  $('affRevenue').textContent = eur(revenue);
  $('affClicks').textContent = clicks;
  $('affSales').textContent = sales;
  $('affConv').textContent = (clicks > 0 ? (sales / clicks * 100) : 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '%';
  $('affRpc').textContent = eur(clicks > 0 ? earned / clicks : 0);
  $('affPending').textContent = eur(pending);
  $('affReady').textContent = eur(ready);
  $('affPaid').textContent = eur(paid);

  // Bouton de retrait
  const btn = $('affWithdraw');
  window.__affReady = ready;
  if (ready < AFF.MIN_PAYOUT_EUR) {
    btn.disabled = true;
    btn.textContent = `Retrait dès ${eur(AFF.MIN_PAYOUT_EUR)} (encore ${eur(Math.max(0, AFF.MIN_PAYOUT_EUR - ready))})`;
  } else {
    btn.disabled = false;
    btn.textContent = `Retirer ${eur(ready)}`;
  }
}

function renderShare(link) {
  const msg = encodeURIComponent("J'apprends une langue en vivant une histoire avec Sunami 🌊 Essaie gratuitement :");
  const url = encodeURIComponent(link);
  const items = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${msg}%20${url}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${url}&text=${msg}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${msg}&url=${url}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
  ];
  $('affShare').innerHTML = items
    .map(i => `<a class="aff-share-btn" href="${i.href}" target="_blank" rel="noopener">${i.label}</a>`)
    .join('');
}

window.affCopyLink = function () {
  const link = $('affLink').textContent;
  navigator.clipboard.writeText(link).then(() => {
    const b = $('affCopyBtn');
    if (b) { b.textContent = '✓ Copié !'; setTimeout(() => (b.textContent = '📋 Copier'), 2000); }
  });
};

window.affWithdraw = async function () {
  const ready = window.__affReady || 0;
  const msg = $('affMsg');
  if (ready < AFF.MIN_PAYOUT_EUR) {
    msg.textContent = `Il te faut au moins ${eur(AFF.MIN_PAYOUT_EUR)} pour retirer.`;
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data || !data.session) { msg.textContent = 'Reconnecte-toi pour retirer.'; return; }
  msg.textContent = 'Envoi de ta demande…';
  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: await affAuthHeaders(),
      body: JSON.stringify({ action: 'withdraw', amount: ready }),
    });
    const d = await res.json();
    msg.textContent = d && d.ok
      ? '✅ Demande de retrait enregistrée. Paiement sous quelques jours.'
      : (d && d.error) || 'Demande enregistrée. Le support te contactera.';
  } catch (e) {
    msg.textContent = 'Demande enregistrée. Le support te contactera.';
  }
};

init();
