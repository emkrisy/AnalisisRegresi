/* =========================================================
   NLR.chartsHelper — util kecil untuk styling Chart.js
   supaya warna grafik ikut mengikuti tema terang/gelap
   yang didefinisikan di css/styles.css.
   ========================================================= */
window.NLR = window.NLR || {};

NLR.chartsHelper = (function(){
  "use strict";

  function chartColors(){
    var css=getComputedStyle(document.documentElement);
    return {
      ink: css.getPropertyValue("--ink").trim(), soft: css.getPropertyValue("--ink-soft").trim(),
      line: css.getPropertyValue("--line").trim(), teal: css.getPropertyValue("--teal").trim(),
      panel: css.getPropertyValue("--panel").trim()
    };
  }

  function baseGridOptions(){
    var c=chartColors();
    return {
      scales:{
        x:{ grid:{color:c.line}, ticks:{color:c.soft, font:{family:"IBM Plex Mono",size:10}}, title:{color:c.soft, font:{family:"IBM Plex Sans",size:11}} },
        y:{ grid:{color:c.line}, ticks:{color:c.soft, font:{family:"IBM Plex Mono",size:10}}, title:{color:c.soft, font:{family:"IBM Plex Sans",size:11}} }
      },
      plugins:{ legend:{ labels:{ color:c.ink, font:{family:"IBM Plex Sans",size:11} } } }
    };
  }

  return { chartColors:chartColors, baseGridOptions:baseGridOptions };
})();
