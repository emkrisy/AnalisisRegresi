/* =========================================================
   NLR.stats — utilitas matematika & statistik
   Tidak menyentuh DOM sama sekali, jadi bisa diuji atau
   dipakai ulang di proyek lain secara independen.
   ========================================================= */
window.NLR = window.NLR || {};

NLR.stats = (function(){
  "use strict";

  function mean(a){ return a.reduce(function(s,v){return s+v;},0)/a.length; }
  function variance(a){ var m=mean(a); return a.reduce(function(s,v){return s+(v-m)*(v-m);},0)/(a.length-1); }
  function sd(a){ return Math.sqrt(variance(a)); }
  function median(a){
    var s=a.slice().sort(function(x,y){return x-y;});
    var n=s.length;
    return n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2;
  }
  function pearson(x,y){
    var mx=mean(x), my=mean(y), sxy=0, sxx=0, syy=0;
    for(var i=0;i<x.length;i++){ sxy+=(x[i]-mx)*(y[i]-my); sxx+=(x[i]-mx)*(x[i]-mx); syy+=(y[i]-my)*(y[i]-my); }
    return sxy/Math.sqrt(sxx*syy);
  }
  function covariance(x,y){
    var mx=mean(x), my=mean(y), s=0;
    for(var i=0;i<x.length;i++) s+=(x[i]-mx)*(y[i]-my);
    return s/(x.length-1);
  }

  /* --- TAMBAHKAN DUA FUNGSI INI --- */
  function getRanks(arr){
    // Petakan nilai ke objek bersama index aslinya, lalu urutkan
    var sorted = arr.map(function(v, i){ return {v:v, i:i}; })
                    .sort(function(a, b){ return a.v - b.v; });
    var ranks = new Array(arr.length);
    var i = 0;
    while(i < sorted.length) {
      var j = i;
      // Cari jika ada nilai yang sama (ties)
      while(j < sorted.length && sorted[j].v === sorted[i].v) j++;
      // Hitung rata-rata peringkat untuk nilai yang sama
      var avgRank = (i + j + 1) / 2; 
      for(var k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
      i = j;
    }
    return ranks;
  }

  function spearman(x, y){
    // Spearman adalah Pearson dari nilai yang sudah di-rank
    return pearson(getRanks(x), getRanks(y));
  }

  /** Eliminasi Gauss-Jordan dengan pivot parsial. Mengembalikan null jika singular. */
  function solveLinear(A,b){
    var n=b.length;
    var M=A.map(function(row,i){ return row.concat([b[i]]); });
    for(var col=0; col<n; col++){
      var maxRow=col, maxVal=Math.abs(M[col][col]);
      for(var r=col+1;r<n;r++){ if(Math.abs(M[r][col])>maxVal){ maxVal=Math.abs(M[r][col]); maxRow=r; } }
      if(maxVal<1e-13) return null;
      if(maxRow!==col){ var tmp=M[col]; M[col]=M[maxRow]; M[maxRow]=tmp; }
      var pivot=M[col][col];
      for(var c=col;c<=n;c++) M[col][c]/=pivot;
      for(var rr=0;rr<n;rr++){
        if(rr===col) continue;
        var factor=M[rr][col];
        if(factor===0) continue;
        for(var cc=col;cc<=n;cc++) M[rr][cc]-=factor*M[col][cc];
      }
    }
    return M.map(function(row){ return row[n]; });
  }

  /** Regresi linear sederhana y = intercept + slope*x (dipakai untuk model power & log via transformasi). */
  function simpleLinReg(xt,yt){
    var xbar=mean(xt), ybar=mean(yt), sxy=0, sxx=0;
    for(var i=0;i<xt.length;i++){ sxy+=(xt[i]-xbar)*(yt[i]-ybar); sxx+=(xt[i]-xbar)*(xt[i]-xbar); }
    var slope=sxy/sxx, intercept=ybar-slope*xbar;
    return {slope:slope, intercept:intercept};
  }

  /* ==========================================================
     TAMBAHAN FUNGSI UJI STATISTIK & ASUMSI
     ========================================================== */

  /** Invers Matriks dengan Eliminasi Gauss-Jordan (untuk Covariance Matrix) */
  function invertMatrix(M) {
    var n = M.length;
    var inv = [];
    for(var i=0; i<n; i++) inv.push(new Array(n).fill(0));
    for(var i=0; i<n; i++) {
      var e = new Array(n).fill(0);
      e[i] = 1;
      var col = solveLinear(M, e);
      if(!col) return null; // Matriks singular (tidak bisa di-invers)
      for(var j=0; j<n; j++) inv[j][i] = col[j];
    }
    return inv;
  }

  /** Aproksimasi Normal CDF (untuk menghitung p-value dari t-stat jika N lumayan besar) */
  function pValueNorm(t) {
    var x = -Math.abs(t);
    var k = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989423 * Math.exp(-x * x / 2);
    var prob = d * k * (0.3193815 + k * (-0.3565638 + k * (1.781478 + k * (-1.821256 + k * 1.330274))));
    return 2 * prob; // 2-tailed
  }

  /** Menghitung Standard Error, t-stat, dan p-value menggunakan Jacobian Numerik */
  function computeParameterStats(modelFn, params, xs, sse) {
    var n = xs.length, p = params.length;
    var df = Math.max(1, n - p);
    var mse = sse / df;

    // 1. Hitung Jacobian J (Central Difference)
    var J = [];
    for (var i = 0; i < n; i++) J.push(new Array(p).fill(0));
    for (var j = 0; j < p; j++) {
      var h = Math.abs(params[j]) > 1e-5 ? params[j] * 1e-5 : 1e-5;
      var pj1 = params.slice(), pj2 = params.slice();
      pj1[j] += h; pj2[j] -= h;
      for (var i = 0; i < n; i++) {
        var y1 = modelFn(pj1, xs[i]);
        var y2 = modelFn(pj2, xs[i]);
        J[i][j] = (y1 - y2) / (2 * h); 
      }
    }

    // 2. Hitung (J^T J)
    var JTJ = [];
    for (var a = 0; a < p; a++) {
      JTJ.push(new Array(p).fill(0));
      for (var b = 0; b < p; b++) {
        for (var i = 0; i < n; i++) JTJ[a][b] += J[i][a] * J[i][b];
      }
    }

    // 3. Hitung Invers(JTJ) untuk mendapatkan Covariance Matrix
    var cov = invertMatrix(JTJ);
    var se = new Array(p).fill(NaN), tStats = new Array(p).fill(NaN), pVals = new Array(p).fill(NaN);

    if (cov) {
      for (var j = 0; j < p; j++) {
        se[j] = Math.sqrt(Math.max(0, cov[j][j] * mse));
        tStats[j] = params[j] / (se[j] || 1e-9);
        pVals[j] = pValueNorm(tStats[j]);
      }
    }
    return { se: se, t: tStats, p: pVals };
  }

  /** Uji Durbin-Watson (Autokorelasi Residual) */
  function durbinWatson(resid) {
    var num = 0, den = 0;
    for(var i = 1; i < resid.length; i++) num += Math.pow(resid[i] - resid[i-1], 2);
    for(var i = 0; i < resid.length; i++) den += resid[i] * resid[i];
    return den === 0 ? NaN : num / den;
  }

  /** Uji Jarque-Bera (Normalitas Residual) -> p-value via Chi-Square df=2 */
  function jarqueBera(resid) {
    var n = resid.length, m = mean(resid), m2 = 0, m3 = 0, m4 = 0;
    for(var i=0; i<n; i++) {
      var d = resid[i] - m;
      m2 += d*d; m3 += d*d*d; m4 += Math.pow(d, 4);
    }
    m2 /= n; m3 /= n; m4 /= n;
    var skew = m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
    var kurt = m2 === 0 ? 0 : m4 / (m2*m2);
    var jb = (n / 6) * (skew*skew + 0.25 * Math.pow(kurt - 3, 2));
    var pval = Math.exp(-jb / 2); // Pendekatan Chi-Square
    return { jb: jb, p: pval, skew: skew, kurt: kurt };
  }

  function getSigStars(p) {
    if(p < 0.001) return "***"; if(p < 0.01) return "**"; if(p < 0.05) return "*"; if(p < 0.1) return "."; return "";
  }

  /** Uji Breusch-Pagan (Heteroskedastisitas) - Koenker-Bassett version */
  function breuschPagan(xs, resid) {
    var n = xs.length;
    // 1. Kuadratkan residual (e^2)
    var sqResid = resid.map(function(e){ return e * e; });
    
    // 2. Regresikan e^2 terhadap X
    var auxReg = simpleLinReg(xs, sqResid);
    var srMean = mean(sqResid);
    var sse = 0, sst = 0;
    
    for(var i=0; i<n; i++) {
      var fit = auxReg.intercept + auxReg.slope * xs[i];
      sse += Math.pow(sqResid[i] - fit, 2);
      sst += Math.pow(sqResid[i] - srMean, 2);
    }
    
    // 3. Hitung R^2 dari regresi aux
    var r2_aux = sst === 0 ? 0 : 1 - (sse / sst);
    
    // 4. Statistik Lagrange Multiplier (LM) = n * R^2
    var lm_stat = n * r2_aux;
    
    // 5. p-value dari Chi-Square df=1 sama dengan probabilitas Normal dari akar LM
    var pval = pValueNorm(Math.sqrt(lm_stat));
    return { lm: lm_stat, p: pval };
  }

  /**
   * Levenberg-Marquardt generik untuk kuadrat-terkecil non-linear.
   * modelFunc(params, x) -> prediksi y
   * Jacobian dihitung numerik (beda maju), cukup untuk model 2-3 parameter.
   */
  function fitLM(modelFunc, initialParams, xs, ys, maxIter){
    maxIter = maxIter || 300;
    var params=initialParams.slice();
    var n=xs.length, p=params.length;
    function residuals(pr){ var r=new Array(n); for(var i=0;i<n;i++) r[i]=ys[i]-modelFunc(pr,xs[i]); return r; }
    function sse(pr){ var r=residuals(pr), s=0; for(var i=0;i<r.length;i++) s+=r[i]*r[i]; return s; }
    var currentSSE=sse(params);
    if(!isFinite(currentSSE)) return {ok:false};
    var lambda=1e-3;
    for(var iter=0; iter<maxIter; iter++){
      var r0=residuals(params);
      var J=[]; for(var i=0;i<n;i++) J.push(new Array(p).fill(0));
      for(var j=0;j<p;j++){
        var h=Math.abs(params[j])>1e-6 ? params[j]*1e-6 : 1e-6;
        var pj=params.slice(); pj[j]+=h;
        var rj=residuals(pj);
        for(var ii=0;ii<n;ii++) J[ii][j]=(rj[ii]-r0[ii])/h;
      }
      var JTJ=[]; for(var a=0;a<p;a++) JTJ.push(new Array(p).fill(0));
      var JTr=new Array(p).fill(0);
      for(var i2=0;i2<n;i2++){
        for(var a2=0;a2<p;a2++){
          JTr[a2]+=J[i2][a2]*r0[i2];
          for(var b2=0;b2<p;b2++) JTJ[a2][b2]+=J[i2][a2]*J[i2][b2];
        }
      }
      var improved=false;
      for(var attempt=0; attempt<12; attempt++){
        var Amat=JTJ.map(function(row,ri){ return row.map(function(v,ci){ return ri===ci? v+lambda*(Math.abs(v)>1e-12?Math.abs(v):1) : v; }); });
        var delta=solveLinear(Amat, JTr);
        if(!delta){ lambda*=10; continue; }
        var newParams=params.map(function(v,idx){ return v+delta[idx]; });
        var newSSE=sse(newParams);
        if(isFinite(newSSE) && newSSE < currentSSE - 1e-12){
          params=newParams; currentSSE=newSSE; lambda=Math.max(lambda/10,1e-14); improved=true; break;
        } else { lambda*=10; }
      }
      if(!improved || lambda>1e13) break;
    }
    return {ok:true, params:params, sse:currentSSE};
  }

  /** Metrik kecocokan model: R², R² adjusted, RMSE, MAE, AIC. k = jumlah parameter model. */
  function computeMetrics(ys, yhat, k){
    var n=ys.length, ybar=mean(ys), sse=0, sst=0;
    for(var i=0;i<n;i++){ sse+=(ys[i]-yhat[i])*(ys[i]-yhat[i]); sst+=(ys[i]-ybar)*(ys[i]-ybar); }
    var r2=1-sse/sst;
    var adjR2 = n-k-1>0 ? 1-(1-r2)*(n-1)/(n-k-1) : NaN;
    var rmse=Math.sqrt(sse/n);
    var mae=mean(ys.map(function(v,i){ return Math.abs(v-yhat[i]); }));
    var aic = sse>0 ? n*Math.log(sse/n)+2*k : -Infinity;
    return {r2:r2, adjR2:adjR2, rmse:rmse, mae:mae, aic:aic, sse:sse};
  }

  function fmt(v,d){
    if(v===undefined||v===null||!isFinite(v)) return "—";
    d=(d===undefined)?3:d;
    return Number(v).toFixed(d);
  }

  return {
    mean:mean, variance:variance, sd:sd, median:median, pearson:pearson, covariance:covariance, spearman:spearman,
    solveLinear:solveLinear, simpleLinReg:simpleLinReg, fitLM:fitLM, computeMetrics:computeMetrics, fmt:fmt,
    computeParameterStats:computeParameterStats, durbinWatson:durbinWatson, jarqueBera:jarqueBera, breuschPagan:breuschPagan, getSigStars:getSigStars
  };
})();
