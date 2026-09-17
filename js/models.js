/* =========================================================
   NLR.models — definisi bentuk model regresi non-linear

   >>> TAMBAHKAN MODEL BARU DI SINI <<<
   Setiap entri di MODEL_DEFS butuh:
     label          - nama tampilan
     formulaTpl     - string persamaan untuk ditampilkan di UI
     needsPositiveX - true jika model butuh X > 0 (mis. power/log)
     fit(xs, ys, opts) - mengembalikan:
         { ok:true, params:[...], paramNames:[...], predict:fn(x), formula:"..." }
       atau
         { ok:false, message:"alasan gagal" }
   ========================================================= */
window.NLR = window.NLR || {};

NLR.models = (function(){
  "use strict";
  var S = NLR.stats; // modul statistik (lihat js/stats.js)

  var MODEL_DEFS = {
    linear: {
    label:"Linear", formulaTpl:"y = a + bx", needsPositiveX:false,
    fit:function(xs,ys){
      var lr=S.simpleLinReg(xs,ys);
      var a=lr.intercept, b=lr.slope;
      return {ok:true, params:[a,b], paramNames:["a","b"], predict:function(x){ return a+b*x; },
        formula:"y = "+S.fmt(a,3)+" "+(b>=0?"+ ":"− ")+S.fmt(Math.abs(b),4)+"x"};
    }
  },
    poly: {
      label:"Polinomial", formulaTpl:"y = β₀ + β₁x + β₂x² + …",
      needsPositiveX:false,
      fit:function(xs,ys,opts){
        var degree=opts.degree||2, p=degree+1, n=xs.length;
        var X=xs.map(function(x){ var row=[]; for(var j=0;j<p;j++) row.push(Math.pow(x,j)); return row; });
        var XTX=[]; for(var a=0;a<p;a++) XTX.push(new Array(p).fill(0));
        var XTy=new Array(p).fill(0);
        for(var i=0;i<n;i++){ for(var aa=0;aa<p;aa++){ XTy[aa]+=X[i][aa]*ys[i]; for(var bb=0;bb<p;bb++) XTX[aa][bb]+=X[i][aa]*X[i][bb]; } }
        var beta=S.solveLinear(XTX,XTy);
        if(!beta) return {ok:false,message:"Sistem persamaan singular — coba derajat lebih rendah."};
        var paramNames=beta.map(function(_,j){ return "β"+j; });
        return {ok:true, params:beta, paramNames:paramNames,
          predict:function(x){ var s=0; for(var j=0;j<p;j++) s+=beta[j]*Math.pow(x,j); return s; },
          formula:"y = "+beta.map(function(b,j){ return (j===0? S.fmt(b,3) : (b>=0?"+ ":"− ")+S.fmt(Math.abs(b),4)+"x"+(j>1?("^"+j):"")); }).join(" ") };
      }
    },
    exp: {
      label:"Eksponensial", formulaTpl:"y = a·e^(bx) + c", needsPositiveX:false,
      fit:function(xs,ys){
        var f=function(p,x){ return p[0]*Math.exp(p[1]*x)+p[2]; };
        var range=Math.max.apply(null,ys)-Math.min.apply(null,ys) || 1;
        var cov=S.covariance(xs,ys);
        var init=[range*(cov>=0?1:-1)||1, cov>=0?0.05:-0.05, Math.min.apply(null,ys)];
        var res=S.fitLM(f, init, xs, ys);
        if(!res.ok) return {ok:false,message:"Iterasi gagal konvergen untuk data ini."};
        var p=res.params;
        return {ok:true, params:p, paramNames:["a","b","c"], predict:function(x){ return f(p,x); },
          formula:"y = "+S.fmt(p[0],3)+"·e^("+S.fmt(p[1],4)+"x) "+(p[2]>=0?"+ ":"− ")+S.fmt(Math.abs(p[2]),3)};
      }
    },
    logistic: {
      label:"Logistik", formulaTpl:"y = L / (1 + e^(−k(x−x₀)))", needsPositiveX:false,
      fit:function(xs,ys){
        var f=function(p,x){ return p[0]/(1+Math.exp(-p[1]*(x-p[2]))); };
        var ymax=Math.max.apply(null,ys);
        var cov=S.covariance(xs,ys);
        var xrange=Math.max.apply(null,xs)-Math.min.apply(null,xs) || 1;
        var init=[ymax*1.05 || 1, (4/xrange)*(cov>=0?1:-1), S.median(xs)];
        var res=S.fitLM(f, init, xs, ys);
        if(!res.ok) return {ok:false,message:"Iterasi gagal konvergen untuk data ini."};
        var p=res.params;
        return {ok:true, params:p, paramNames:["L","k","x0"], predict:function(x){ return f(p,x); },
          formula:"y = "+S.fmt(p[0],3)+" / (1+e^(−"+S.fmt(p[1],4)+"(x−"+S.fmt(p[2],3)+"))"+")"};
      }
    },
    power: {
      label:"Power", formulaTpl:"y = a·xᵇ", needsPositiveX:true,
      fit:function(xs,ys){
        var pairs=xs.map(function(x,i){ return [x,ys[i]]; }).filter(function(pr){ return pr[0]>0 && pr[1]>0; });
        if(pairs.length<3) return {ok:false,message:"Membutuhkan X dan Y positif; data tidak cukup."};
        var lx=pairs.map(function(pr){ return Math.log(pr[0]); });
        var ly=pairs.map(function(pr){ return Math.log(pr[1]); });
        var lr=S.simpleLinReg(lx,ly);
        var a=Math.exp(lr.intercept), b=lr.slope;
        return {ok:true, params:[a,b], paramNames:["a","b"], predict:function(x){ return x>0? a*Math.pow(x,b) : NaN; },
          formula:"y = "+S.fmt(a,3)+"·x^"+S.fmt(b,4)};
      }
    },
    log: {
      label:"Logaritmik", formulaTpl:"y = a + b·ln(x)", needsPositiveX:true,
      fit:function(xs,ys){
        var pairs=xs.map(function(x,i){ return [x,ys[i]]; }).filter(function(pr){ return pr[0]>0; });
        if(pairs.length<3) return {ok:false,message:"Membutuhkan X positif; data tidak cukup."};
        var lx=pairs.map(function(pr){ return Math.log(pr[0]); });
        var y2=pairs.map(function(pr){ return pr[1]; });
        var lr=S.simpleLinReg(lx,y2);
        var a=lr.intercept, b=lr.slope;
        return {ok:true, params:[a,b], paramNames:["a","b"], predict:function(x){ return x>0? a+b*Math.log(x) : NaN; },
          formula:"y = "+S.fmt(a,3)+" "+(b>=0?"+ ":"− ")+S.fmt(Math.abs(b),4)+"·ln(x)"};
      }
    },
    gaussian: {
      label:"Gaussian", formulaTpl:"y = a·e^(−(x−b)²/2c²)", needsPositiveX:false,
      fit:function(xs,ys){
        var f=function(p,x){ return p[0]*Math.exp(-((x-p[1])*(x-p[1]))/(2*p[2]*p[2])); };
        var ymax=Math.max.apply(null,ys);
        var idx=ys.indexOf(ymax);
        var init=[ymax||1, xs[idx], (S.sd(xs)/2)||1];
        var res=S.fitLM(f, init, xs, ys);
        if(!res.ok) return {ok:false,message:"Iterasi gagal konvergen untuk data ini."};
        var p=res.params;
        return {ok:true, params:p, paramNames:["a","b","c"], predict:function(x){ return f(p,x); },
          formula:"y = "+S.fmt(p[0],3)+"·e^(−(x−"+S.fmt(p[1],3)+")²/"+S.fmt(2*p[2]*p[2],3)+")"};
      }
    }

    /* Contoh menambah model Michaelis-Menten:
    michaelis: {
      label:"Michaelis-Menten", formulaTpl:"y = Vmax·x / (Km + x)", needsPositiveX:true,
      fit:function(xs,ys){
        var f=function(p,x){ return (p[0]*x)/(p[1]+x); };
        var init=[Math.max.apply(null,ys)*1.2, S.median(xs)];
        var res=S.fitLM(f, init, xs, ys);
        if(!res.ok) return {ok:false, message:"Iterasi gagal konvergen."};
        var p=res.params;
        return {ok:true, params:p, paramNames:["Vmax","Km"], predict:function(x){ return f(p,x); },
          formula:"y = "+S.fmt(p[0],3)+"·x / ("+S.fmt(p[1],3)+" + x)"};
      }
    }
    */
  };

  /* Urutan & warna tampilan tiap model di grafik/legenda. Tambah warna jika model bertambah. */
  var PALETTE=["#1B7F79","#C97A2B","#2B3A67","#8E44AD","#B3432B","#4C6444"];

  return { MODEL_DEFS:MODEL_DEFS, PALETTE:PALETTE };
})();
