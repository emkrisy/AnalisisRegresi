/* =========================================================
   NLR.data — dataset contoh & parser CSV

   >>> TAMBAHKAN DATASET CONTOH BARU DI buildSample() <<<
   Tambahkan juga <option> yang sesuai di index.html
   (elemen <select id="sampleSelect">).
   ========================================================= */
window.NLR = window.NLR || {};

NLR.data = (function(){
  "use strict";

  /** PRNG sederhana & deterministik supaya dataset contoh selalu sama tiap dimuat. */
  function mulberry32(seed){
    return function(){
      seed|=0; seed=seed+0x6D2B79F5|0;
      var t=Math.imul(seed^seed>>>15,1|seed);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }
  function gaussianNoise(rand,sdv){
    var u1=Math.max(rand(),1e-9), u2=rand();
    return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)*sdv;
  }

  function buildSample(kind){
    var rand=mulberry32(kind.length*97+42);
    var xs=[], ys=[], labelX="X", labelY="Y";
    if(kind==="logistic"){
      labelX="Minggu ke-"; labelY="Jumlah Kasus Kumulatif";
      for(var w=0; w<=40; w++){ xs.push(w); ys.push(Math.max(0, 500/(1+Math.exp(-0.3*(w-20))) + gaussianNoise(rand,14))); }
    } else if(kind==="expdecay"){
      labelX="Usia Aset (tahun)"; labelY="Nilai Buku (juta Rp)";
      for(var t=0; t<=15; t+=0.5){ xs.push(t); ys.push(Math.max(5, 1000*Math.exp(-0.28*t)+45+gaussianNoise(rand,25))); }
    } else if(kind==="claims"){
      labelX="Usia Tertanggung (tahun)"; labelY="Rata-rata Klaim (juta Rp)";
      for(var u=18; u<=75; u+=1.5){ xs.push(u); ys.push(Math.max(0.5, 0.9*Math.pow(u-15,1.55)/12 + gaussianNoise(rand,4))); }
    } else if(kind==="rainfall"){
      labelX="Bulan"; labelY="Curah Hujan (mm)";
      for(var m=1; m<=12; m+=0.5){ xs.push(m); ys.push(Math.max(10, 320*Math.exp(-Math.pow(m-6.3,2)/(2*3.1*3.1))+40+gaussianNoise(rand,18))); }
    }
    /* Contoh menambah dataset baru:
    else if(kind==="myDataset"){
      labelX="..."; labelY="...";
      for(var i=0;i<=50;i++){ xs.push(i); ys.push( ... + gaussianNoise(rand, 10) ); }
    }
    */
    return {xs:xs, ys:ys, labelX:labelX, labelY:labelY};
  }

  /** Parser CSV ringan: mendeteksi delimiter (, ; atau tab) dan header opsional. */
  function parseCSV(text){
    var lines=text.split(/\r\n|\n|\r/).map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
    if(lines.length<2) return null;
    var delim = lines[0].indexOf(";")>-1 && lines[0].indexOf(",")===-1 ? ";" : (lines[0].indexOf("\t")>-1 ? "\t" : ",");
    var rows=lines.map(function(l){ return l.split(delim).map(function(c){ return c.trim().replace(/^"|"$/g,""); }); });
    var header=null;
    var firstRowNumeric=rows[0].every(function(c){ return c!=="" && !isNaN(Number(c)); });
    if(!firstRowNumeric){ header=rows[0]; rows=rows.slice(1); }
    else { header=rows[0].map(function(_,i){ return "Kolom "+(i+1); }); }
    return {header:header, rows:rows};
  }

  return { mulberry32:mulberry32, gaussianNoise:gaussianNoise, buildSample:buildSample, parseCSV:parseCSV };
})();
