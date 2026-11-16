(function () {
  var corps = document.body, scene = document.getElementById('scene'), objet = document.getElementById('objet');
  var livre = document.getElementById('livre'), clos = document.getElementById('clos');
  var rapport = parseFloat(objet.dataset.rapport) || 0.667;
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portrait = false, enMouvement = false, largeurBloc = 0;

  // Le livre s'inscrit dans la scène ; en portrait une seule page, sinon la double page.
  function cadrer() {
    var l = scene.clientWidth, h = scene.clientHeight;
    portrait = l < 700 || l < h * rapport * 1.55;
    var marge = portrait ? 14 : 34;
    var haut = Math.min(h - marge, (l - marge * 2) / (rapport * (portrait ? 1 : 2)));
    var large = haut * rapport * (portrait ? 1 : 2);
    largeurBloc = Math.floor(large);
    objet.style.width = largeurBloc + 'px';
    objet.style.height = Math.floor(haut) + 'px';
    objet.classList.toggle('portrait', portrait);
    // le livre fermé occupe la place du plat de devant : la page de droite, ou toute la page en portrait
    var w = portrait ? large : large / 2;
    clos.style.width = Math.floor(w) + 'px';
    clos.style.height = Math.floor(haut) + 'px';
    clos.style.left = Math.floor((l - large) / 2 + (portrait ? 0 : large / 2)) + 'px';
    clos.style.top = Math.floor((h - haut) / 2) + 'px';
    // pose sur la table : ramené vers le centre, couché, tourné, réduit
    var versCentre = portrait ? 0 : -large / 4;
    clos.style.setProperty('--pose', 'translate3d(' + Math.round(versCentre) + 'px,' + Math.round(h * 0.13) + 'px,0) rotateX(57deg) rotateZ(-17deg) scale(' + (portrait ? 0.62 : 0.56) + ')');
  }
  cadrer();

  var flip = new St.PageFlip(livre, {
    width: Math.round(900 * rapport), height: 900, size: 'stretch',
    // page-flip passe en page seule quand le bloc est plus étroit que deux fois minWidth : on lui fait suivre cadrer()
    minWidth: portrait ? Math.round(largeurBloc * 0.75) : 60, maxWidth: 4000, minHeight: 90, maxHeight: 6000,
    showCover: true, maxShadowOpacity: 0.45, mobileScrollSupport: false, usePortrait: true, drawShadow: true
  });
  flip.loadFromHTML(document.querySelectorAll('.page'));
  livre.style.minWidth = '0'; livre.style.minHeight = '0';
  var largeurCreation = largeurBloc;

  var compteur = document.getElementById('compteur'), avant = document.getElementById('avant'), apres = document.getElementById('apres');
  function etat() {
    var i = flip.getCurrentPageIndex(), n = flip.getPageCount();
    compteur.textContent = (i + 1) + ' / ' + n;
    avant.disabled = false; apres.disabled = i >= n - 1;
    objet.dataset.etat = i <= 0 ? 'avant' : (i >= n - 1 && n % 2 === 0 ? 'arriere' : 'ouvert');
    var p = n > 1 ? i / (n - 1) : 0, max = portrait ? 7 : 14;
    objet.style.setProperty('--tg', (2 + p * max).toFixed(1) + 'px');
    objet.style.setProperty('--td', (2 + (1 - p) * max).toFixed(1) + 'px');
    if (!corps.classList.contains('sur-table')) history.replaceState(null, '', i > 0 ? '#' + (i + 1) : location.pathname);
  }
  flip.on('flip', etat);

  // Prendre le livre : il se lève de la table, vient face au lecteur, puis s'ouvre.
  function prendre(page) {
    if (enMouvement || !corps.classList.contains('sur-table')) return;
    enMouvement = true;
    function fin() {
      corps.classList.remove('sur-table');
      clos.classList.add('cache');
      enMouvement = false;
      etat();
      if (page > 0) flip.turnToPage(page), etat();
      else setTimeout(function () { flip.flipNext(); }, calme ? 0 : 160);
    }
    if (calme) { clos.classList.add('leve'); return fin(); }
    corps.classList.add('en-main');
    clos.classList.add('leve');
    setTimeout(function () { corps.classList.remove('en-main'); fin(); }, 1180);
  }
  // Reposer le livre : il se referme et retourne sur la table.
  function reposer() {
    if (enMouvement || corps.classList.contains('sur-table')) return;
    enMouvement = true;
    flip.turnToPage(0); etat();
    clos.classList.remove('cache');
    clos.classList.add('leve');
    corps.classList.add('sur-table');
    history.replaceState(null, '', location.pathname);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      clos.classList.remove('leve');
      setTimeout(function () { enMouvement = false; clos.focus({ preventScroll: true }); }, calme ? 0 : 1180);
    }); });
  }
  clos.addEventListener('click', function () { prendre(0); });
  clos.addEventListener('keydown', function (e) { if (e.key === 'Enter') prendre(0); });
  document.getElementById('reposer').onclick = reposer;
  avant.onclick = function () { flip.getCurrentPageIndex() <= 0 ? reposer() : flip.flipPrev(); };
  apres.onclick = function () { flip.flipNext(); };
  document.addEventListener('keydown', function (e) {
    var surTable = corps.classList.contains('sur-table');
    if (e.key === 'Escape' && !surTable) return reposer();
    if (surTable) { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); prendre(0); } return; }
    if (e.key === 'ArrowLeft') avant.onclick();
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); flip.flipNext(); }
  });
  window.addEventListener('resize', function () {
    var avantPortrait = portrait; cadrer();
    // le mode de page-flip (page seule ou double page) est fixé à sa création
    if (portrait !== avantPortrait || (portrait && Math.abs(largeurBloc - largeurCreation) > largeurCreation * 0.2)) return location.reload();
    flip.update(); etat();
  });

  etat();
  // un lien vers une page ouvre directement le livre à cette page
  var depart = parseInt(location.hash.slice(1), 10);
  if (depart > 1 && depart <= flip.getPageCount()) {
    corps.classList.remove('sur-table'); clos.classList.add('cache');
    flip.turnToPage(depart - 1); etat();
  }
})();
