/* Sunami — thème clair/sombre (partagé landing + app) */
(function(){
  var saved = localStorage.getItem('sunami-theme');
  var theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.addEventListener('DOMContentLoaded', function(){
    var t = document.getElementById('themeToggle');
    if(t) t.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
})();
window.toggleTheme = function(){
  var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sunami-theme', next);
  var t = document.getElementById('themeToggle');
  if(t) t.textContent = next === 'dark' ? '☀️' : '🌙';
};
