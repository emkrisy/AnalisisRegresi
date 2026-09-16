/* =========================================================
   Theme toggle (Otomatis / Terang / Gelap).
   Preferensi disimpan di localStorage per-browser (bukan
   dikirim kemana pun) — aman dihapus/diabaikan.
   ========================================================= */
(function(){
  "use strict";

  function applyThemePref(pref){
    if(pref==="light"||pref==="dark") document.documentElement.setAttribute("data-theme",pref);
    else document.documentElement.removeAttribute("data-theme");
  }

  document.addEventListener("DOMContentLoaded", function(){
    var saved=null;
    try{ saved=localStorage.getItem("nlr-theme"); }catch(e){}
    applyThemePref(saved);

    var btn=document.getElementById("themeToggle");
    if(!btn) return;
    var order=[null,"light","dark"];
    var labels={ "null":"Tema: Otomatis", "light":"Tema: Terang", "dark":"Tema: Gelap" };
    var idx=order.indexOf(saved||null); if(idx<0) idx=0;
    btn.textContent=labels[String(order[idx])];

    btn.addEventListener("click", function(){
      idx=(idx+1)%order.length;
      var val=order[idx];
      applyThemePref(val);
      btn.textContent=labels[String(val)];
      try{ if(val) localStorage.setItem("nlr-theme",val); else localStorage.removeItem("nlr-theme"); }catch(e){}
    });
  });
})();
