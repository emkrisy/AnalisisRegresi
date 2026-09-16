/* =========================================================
   NLR app.js — merangkai semua modul (stats/models/data/charts)
   menjadi UI yang interaktif. File ini yang paling sering
   Anda ubah untuk menambah perilaku UI baru.
   ========================================================= */
document.addEventListener("DOMContentLoaded", function(){
"use strict";

var Stat = NLR.stats;
var Mdl  = NLR.models;
var Dat  = NLR.data;
var Chr  = NLR.chartsHelper;

/* ---------------------------------------------------------------- */
/* NAVIGATION                                                          */
/* ---------------------------------------------------------------- */
var navBtns=document.querySelectorAll(".nav-btn");
navBtns.forEach(function(b){
  b.addEventListener("click", function(){
    navBtns.forEach(function(x){x.classList.remove("active");});
    b.classList.add("active");
    document.querySelectorAll(".stage").forEach(function(s){s.classList.remove("active");});
    document.getElementById("stage"+b.dataset.stage).classList.add("active");
  });
});

/* ---------------------------------------------------------------- */
/* STATE                                                              */
/* ---------------------------------------------------------------- */
var State = { xs:null, ys:null, labelX:"X", labelY:"Y", fitted:[], charts:{} };
function destroyChart(id){ if(State.charts[id]){ State.charts[id].destroy(); delete State.charts[id]; } }
function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]; }); }

function updateStatus(){
  var el=document.getElementById("statusLine");
  var n = State.xs ? State.xs.length : 0;
  el.innerHTML="Data: <span>"+(n? n+" observasi":"belum dimuat")+"</span> · Model tercocok: <span>"+State.fitted.length+"</span>";
}

/* ---------------------------------------------------------------- */
/* LOADING DATA (contoh atau CSV)                                      */
/* ---------------------------------------------------------------- */
function loadIntoState(xs, ys, labelX, labelY){
  var pairs=[]; for(var i=0;i<xs.length;i++){ if(isFinite(xs[i])&&isFinite(ys[i])) pairs.push([xs[i],ys[i]]); }
  pairs.sort(function(a,b){ return a[0]-b[0]; });
  State.xs=pairs.map(function(p){return p[0];});
  State.ys=pairs.map(function(p){return p[1];});
  State.labelX=labelX||"X"; State.labelY=labelY||"Y";
  State.fitted=[];
  renderEDA();
  renderModelOptions();
  document.getElementById("fitBtn").disabled=false;
  document.getElementById("diagPanel").style.display="none";
  document.getElementById("diagCharts").style.display="none";
  updateStatus();
  resetStage3();
}

document.getElementById("sampleSelect").addEventListener("change", function(e){
  var v=e.target.value;
  if(!v) return;
  document.getElementById("colPickWrap").style.display="none";
  document.getElementById("csvFile").value="";
  var d=Dat.buildSample(v);
  loadIntoState(d.xs, d.ys, d.labelX, d.labelY);
  document.getElementById("dataNote").textContent="Dataset contoh dimuat: "+d.labelY+" terhadap "+d.labelX+" (n="+d.xs.length+").";
});

var pendingParsed=null;
document.getElementById("csvFile").addEventListener("change", function(e){
  var file=e.target.files[0];
  if(!file) return;
  document.getElementById("sampleSelect").value="";
  var reader=new FileReader();
  reader.onload=function(ev){
    var parsed=Dat.parseCSV(String(ev.target.result));
    if(!parsed || parsed.header.length<2){
      document.getElementById("dataNote").innerHTML='<span class="warn">Gagal membaca CSV. Pastikan berisi minimal dua kolom numerik.</span>';
      return;
    }
    pendingParsed=parsed;
    if(parsed.header.length===2){
      applyCSVColumns(0,1);
      document.getElementById("colPickWrap").style.display="none";
    } else {
      var selX=document.getElementById("colX"), selY=document.getElementById("colY");
      selX.innerHTML=""; selY.innerHTML="";
      parsed.header.forEach(function(h,i){
        selX.innerHTML+='<option value="'+i+'">'+h+"</option>";
        selY.innerHTML+='<option value="'+i+'">'+h+"</option>";
      });
      selX.value=0; selY.value=1;
      document.getElementById("colPickWrap").style.display="flex";
      applyCSVColumns(0,1);
    }
  };
  reader.readAsText(file);
});
function applyCSVColumns(ix,iy){
  if(!pendingParsed) return;
  var xs=pendingParsed.rows.map(function(r){ return Number(r[ix]); });
  var ys=pendingParsed.rows.map(function(r){ return Number(r[iy]); });
  var ok=xs.filter(function(v,i){ return isFinite(v)&&isFinite(ys[i]); }).length;
  if(ok<3){
    document.getElementById("dataNote").innerHTML='<span class="warn">Kolom terpilih tidak memiliki cukup pasangan numerik.</span>';
    return;
  }
  loadIntoState(xs, ys, pendingParsed.header[ix], pendingParsed.header[iy]);
  document.getElementById("dataNote").textContent="CSV dimuat: "+pendingParsed.header[iy]+" terhadap "+pendingParsed.header[ix]+" (n="+ok+" baris valid).";
}
document.getElementById("colX").addEventListener("change", function(){
  applyCSVColumns(Number(document.getElementById("colX").value), Number(document.getElementById("colY").value));
});
document.getElementById("colY").addEventListener("change", function(){
  applyCSVColumns(Number(document.getElementById("colX").value), Number(document.getElementById("colY").value));
});

/* ---------------------------------------------------------------- */
/* STAGE 1: EDA                                                       */
/* ---------------------------------------------------------------- */
function renderEDA(){
  var xs=State.xs, ys=State.ys, n=xs.length;
  document.getElementById("edaPanel").style.display="block";
  document.getElementById("edaCharts").style.display="grid";
  var stats=[
    ["n", n],
    ["Rerata X", Stat.fmt(Stat.mean(xs))], ["Rerata Y", Stat.fmt(Stat.mean(ys))],
    ["Median X", Stat.fmt(Stat.median(xs))], ["Median Y", Stat.fmt(Stat.median(ys))],
    ["SD X", Stat.fmt(Stat.sd(xs))], ["SD Y", Stat.fmt(Stat.sd(ys))],
    ["Min / Maks X", Stat.fmt(Math.min.apply(null,xs),2)+" / "+Stat.fmt(Math.max.apply(null,xs),2)],
    ["Min / Maks Y", Stat.fmt(Math.min.apply(null,ys),2)+" / "+Stat.fmt(Math.max.apply(null,ys),2)],
    ["Korelasi Pearson (r)", Stat.fmt(Stat.pearson(xs,ys))],
    ["Korelasi Spearman (s)", Stat.fmt(Stat.spearman(xs,ys))]
  ];
  document.getElementById("statGrid").innerHTML=stats.map(function(s){
    return '<div class="cell"><span class="k">'+s[0]+'</span><span class="v">'+s[1]+"</span></div>";
  }).join("");

  var tbl=document.getElementById("previewTable");
  var rowsHtml='<tr><th>#</th><th>'+esc(State.labelX)+'</th><th>'+esc(State.labelY)+'</th></tr>';
  for(var i=0;i<Math.min(10,n);i++){ rowsHtml+="<tr><td>"+(i+1)+"</td><td>"+Stat.fmt(xs[i],3)+"</td><td>"+Stat.fmt(ys[i],3)+"</td></tr>"; }
  tbl.innerHTML=rowsHtml;

  destroyChart("scatter");
  var c=Chr.chartColors();
  var opts=Chr.baseGridOptions();
  opts.scales.x.title.text=State.labelX; opts.scales.y.title.text=State.labelY;
  opts.plugins.legend.display=false;
  State.charts.scatter=new Chart(document.getElementById("chartScatter"), {
    type:"scatter",
    data:{ datasets:[{ label:"Data", data:xs.map(function(x,i){return {x:x,y:ys[i]};}), backgroundColor:c.teal, pointRadius:3.5 }] },
    options:Object.assign({responsive:true, maintainAspectRatio:false}, opts)
  });
}

/* ---------------------------------------------------------------- */
/* STAGE 2: PEMILIHAN & PENCOCOKAN MODEL                               */
/* ---------------------------------------------------------------- */
function renderModelOptions(){
  var xs=State.xs;
  var hasNonPositiveX = xs.some(function(x){ return x<=0; });
  var order=["poly","exp","logistic","power","log","gaussian"];
  var html="";
  order.forEach(function(key){
    var def=Mdl.MODEL_DEFS[key];
    if(!def) return; // aman jika model dihapus/diganti nama di models.js
    var disabled = def.needsPositiveX && hasNonPositiveX;
    var extra="";
    if(key==="poly"){
      extra=' <select id="polyDegree" style="margin-left:6px; padding:3px 6px; font-size:.78rem;">'+
        [2,3,4,5].map(function(d){ return '<option value="'+d+'"'+(d===2?" selected":"")+">derajat "+d+"</option>"; }).join("")+"</select>";
    }
    html+='<label class="opt'+(disabled?" disabled":"")+'"><input type="checkbox" value="'+key+'" '+(disabled?"disabled":"")+(key==="poly"?" checked":"")+'>'+
      '<span><span class="name">'+def.label+extra+'</span><span class="formula">'+def.formulaTpl+
      (disabled?"  — membutuhkan X > 0":"")+"</span></span></label>";
  });
  document.getElementById("modelOptions").innerHTML=html;
}

document.getElementById("fitBtn").addEventListener("click", function(){
  var checked=Array.prototype.slice.call(document.querySelectorAll("#modelOptions input[type=checkbox]:checked"));
  if(checked.length===0){
    document.getElementById("fitStatus").innerHTML='<span class="warn">Pilih minimal satu model.</span>';
    return;
  }
  var results=[]; var failures=[];
  checked.forEach(function(chk, idx){
    var key=chk.value;
    var opts={};
    if(key==="poly") opts.degree=Number(document.getElementById("polyDegree").value);
    var out=Mdl.MODEL_DEFS[key].fit(State.xs, State.ys, opts);
    var label = key==="poly" ? Mdl.MODEL_DEFS[key].label+" (derajat "+opts.degree+")" : Mdl.MODEL_DEFS[key].label;
    if(!out.ok){ failures.push(label+": "+out.message); return; }
    var yhat=State.xs.map(function(x){ return out.predict(x); });
    var validIdx=yhat.map(function(v,i){return isFinite(v)?i:-1;}).filter(function(i){return i>=0;});
    var ysUsed=validIdx.map(function(i){return State.ys[i];});
    var yhatUsed=validIdx.map(function(i){return yhat[i];});
    var k=out.params.length;
    var metrics=Stat.computeMetrics(ysUsed, yhatUsed, k);
    var residuals=validIdx.map(function(i,j){ return State.ys[i]-yhatUsed[j]; });
    results.push({
      id:key+"_"+idx, type:key, label:label, formula:out.formula,
      paramNames:out.paramNames, params:out.params, predict:out.predict,
      metrics:metrics, residuals:residuals, color:Mdl.PALETTE[results.length % Mdl.PALETTE.length]
    });
  });
  State.fitted=results;
  var statusEl=document.getElementById("fitStatus");
  statusEl.innerHTML = results.length
    ? '<span style="color:var(--teal)">'+results.length+" model berhasil dicocokkan.</span>"+(failures.length? '<br><span class="warn">'+esc(failures.join(" · "))+"</span>":"")
    : '<span class="warn">Semua model gagal: '+esc(failures.join(" · "))+"</span>";
  updateStatus();
  renderDiagnosticsUI();
  renderBenchmark();
  renderPrediction();
});

/* ---------------------------------------------------------------- */
/* DIAGNOSTIK                                                          */
/* ---------------------------------------------------------------- */
function renderDiagnosticsUI(){
  if(State.fitted.length===0){
    document.getElementById("diagPanel").style.display="none";
    document.getElementById("diagCharts").style.display="none";
    return;
  }
  document.getElementById("diagPanel").style.display="block";
  document.getElementById("diagCharts").style.display="block";
  var sel=document.getElementById("diagSelect");
  sel.innerHTML=State.fitted.map(function(m){ return '<option value="'+m.id+'">'+m.label+"</option>"; }).join("");
  sel.onchange=function(){ renderDiagnosticsFor(sel.value); };
  renderDiagnosticsFor(State.fitted[0].id);
}

function renderDiagnosticsFor(id){
  var m=State.fitted.filter(function(x){ return x.id===id; })[0];
  if(!m) return;
  var stats=[
    ["R²", Stat.fmt(m.metrics.r2,4)], ["R² Adjusted", Stat.fmt(m.metrics.adjR2,4)],
    ["RMSE", Stat.fmt(m.metrics.rmse,3)], ["MAE", Stat.fmt(m.metrics.mae,3)], ["AIC", Stat.fmt(m.metrics.aic,2)]
  ];
  document.getElementById("diagStats").innerHTML=stats.map(function(s){
    return '<div class="cell"><span class="k">'+s[0]+'</span><span class="v">'+s[1]+"</span></div>";
  }).join("");
  document.getElementById("diagParams").innerHTML="Persamaan terpasang: <b style='color:var(--ink)'>"+esc(m.formula)+"</b>";

  var c=Chr.chartColors();
  var xs=State.xs, ys=State.ys;
  var xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
  var curveX=[]; for(var i=0;i<=200;i++) curveX.push(xmin+(xmax-xmin)*i/200);
  var curveY=curveX.map(function(x){ return m.predict(x); });

  destroyChart("fit");
  var optsFit=Chr.baseGridOptions();
  optsFit.scales.x.title.text=State.labelX; optsFit.scales.y.title.text=State.labelY;
  State.charts.fit=new Chart(document.getElementById("chartFit"), {
    type:"scatter",
    data:{ datasets:[
      { type:"scatter", label:"Data", data:xs.map(function(x,i){return{x:x,y:ys[i]};}), backgroundColor:c.soft, pointRadius:3 },
      { type:"line", label:m.label, data:curveX.map(function(x,i){return{x:x,y:curveY[i]};}), borderColor:m.color, backgroundColor:"transparent", borderWidth:2.5, pointRadius:0, tension:0.15 }
    ]},
    options:Object.assign({responsive:true, maintainAspectRatio:false}, optsFit)
  });

  var yhatAll=xs.map(function(x){ return m.predict(x); });
  var residAll=ys.map(function(y,i){ return y-yhatAll[i]; }).filter(function(v,i){ return isFinite(yhatAll[i]); });
  var fittedValid=yhatAll.filter(function(v){ return isFinite(v); });

  destroyChart("residual");
  var optsR=Chr.baseGridOptions();
  optsR.scales.x.title.text="Nilai terpasang (ŷ)"; optsR.scales.y.title.text="Residual (y − ŷ)";
  optsR.plugins.legend.display=false;
  State.charts.residual=new Chart(document.getElementById("chartResidual"), {
    type:"scatter",
    data:{ datasets:[
      { label:"Residual", data:fittedValid.map(function(f,i){return{x:f,y:residAll[i]};}), backgroundColor:m.color, pointRadius:3.5 },
      { type:"line", label:"Nol", data:[{x:Math.min.apply(null,fittedValid),y:0},{x:Math.max.apply(null,fittedValid),y:0}], borderColor:c.line, borderDash:[5,4], pointRadius:0, borderWidth:1.5 }
    ]},
    options:Object.assign({responsive:true, maintainAspectRatio:false}, optsR)
  });

  destroyChart("residualHist");
  var k=Math.max(4, Math.ceil(Math.log2(residAll.length)+1));
  var rmin=Math.min.apply(null,residAll), rmax=Math.max.apply(null,residAll);
  var width=(rmax-rmin)/k || 1;
  var bins=new Array(k).fill(0), labels=[];
  for(var bi=0;bi<k;bi++) labels.push(Stat.fmt(rmin+bi*width,1)+" – "+Stat.fmt(rmin+(bi+1)*width,1));
  residAll.forEach(function(v){ var bIdx=Math.min(k-1, Math.floor((v-rmin)/width)); bins[bIdx]++; });
  var optsH=Chr.baseGridOptions();
  optsH.scales.x.title.text="Rentang residual"; optsH.scales.y.title.text="Frekuensi";
  optsH.plugins.legend.display=false;
  State.charts.residualHist=new Chart(document.getElementById("chartResidualHist"), {
    type:"bar",
    data:{ labels:labels, datasets:[{ label:"Frekuensi", data:bins, backgroundColor:m.color+"cc" }] },
    options:Object.assign({responsive:true, maintainAspectRatio:false}, optsH)
  });
}

/* ---------------------------------------------------------------- */
/* STAGE 3: BENCHMARK & PREDIKSI                                       */
/* ---------------------------------------------------------------- */
function resetStage3(){
  document.getElementById("benchPanel").style.display="none";
  document.getElementById("benchChartPanel").style.display="none";
  document.getElementById("predictPanel").style.display="none";
  document.getElementById("overlayChartPanel").style.display="none";
  document.getElementById("stage3Empty").style.display="block";
}

function renderBenchmark(){
  if(State.fitted.length===0){ resetStage3(); return; }
  document.getElementById("stage3Empty").style.display="none";
  document.getElementById("benchPanel").style.display="block";
  document.getElementById("benchChartPanel").style.display="block";

  var sorted=State.fitted.slice().sort(function(a,b){ return b.metrics.r2-a.metrics.r2; });
  var bestId=sorted.length? sorted[0].id : null;
  var head="<tr><th>Model</th><th>R²</th><th>R² Adj.</th><th>RMSE</th><th>MAE</th><th>AIC</th></tr>";
  var body=sorted.map(function(m){
    var isBest=m.id===bestId;
    return "<tr"+(isBest?' class="best"':"")+"><td>"+(isBest?"★ ":"")+esc(m.label)+"</td><td>"+Stat.fmt(m.metrics.r2,4)+
      "</td><td>"+Stat.fmt(m.metrics.adjR2,4)+"</td><td>"+Stat.fmt(m.metrics.rmse,3)+"</td><td>"+Stat.fmt(m.metrics.mae,3)+"</td><td>"+Stat.fmt(m.metrics.aic,2)+"</td></tr>";
  }).join("");
  document.getElementById("benchTable").innerHTML=head+body;

  destroyChart("benchBar");
  var optsB=Chr.baseGridOptions();
  optsB.scales.y.title.text="R²"; optsB.plugins.legend.display=false;
  State.charts.benchBar=new Chart(document.getElementById("chartBenchBar"), {
    type:"bar",
    data:{ labels:sorted.map(function(m){return m.label;}), datasets:[{ label:"R²", data:sorted.map(function(m){return m.metrics.r2;}), backgroundColor:sorted.map(function(m){return m.color;}) }] },
    options:Object.assign({responsive:true, maintainAspectRatio:false}, optsB)
  });
}

function renderPrediction(){
  if(State.fitted.length===0) return;
  document.getElementById("predictPanel").style.display="block";
  document.getElementById("overlayChartPanel").style.display="block";
  var xs=State.xs, xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
  var slider=document.getElementById("predictSlider"), num=document.getElementById("predictNum");
  var step=(xmax-xmin)/500 || 0.01;
  [slider,num].forEach(function(el){ el.min=xmin; el.max=xmax; el.step=step; });
  var mid=(xmin+xmax)/2;
  slider.value=mid; num.value=Stat.fmt(mid,2);

  function updatePrediction(){
    var xval=Number(slider.value);
    var head="<tr><th>Model</th><th>Prediksi Ŷ pada X = "+Stat.fmt(xval,3)+"</th></tr>";
    var body=State.fitted.map(function(m){
      var yv=m.predict(xval);
      return "<tr><td>"+esc(m.label)+"</td><td>"+(isFinite(yv)?Stat.fmt(yv,3):"— (di luar domain valid)")+"</td></tr>";
    }).join("");
    document.getElementById("predictTable").innerHTML=head+body;
    renderOverlay(xval);
  }
  slider.oninput=function(){ num.value=Stat.fmt(Number(slider.value),2); updatePrediction(); };
  num.oninput=function(){ var v=Number(num.value); if(isFinite(v)){ slider.value=Math.min(xmax,Math.max(xmin,v)); } updatePrediction(); };
  updatePrediction();
}

function renderOverlay(xval){
  var xs=State.xs, ys=State.ys, xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
  var curveXs=[]; for(var i=0;i<=150;i++) curveXs.push(xmin+(xmax-xmin)*i/150);
  var c=Chr.chartColors();
  var allYVals=ys.slice();
  var datasets=[{ type:"scatter", label:"Data", data:xs.map(function(x,i){return{x:x,y:ys[i]};}), backgroundColor:c.soft, pointRadius:2.5 }];
  State.fitted.forEach(function(m){
    var cy=curveXs.map(function(x){ return m.predict(x); });
    cy.forEach(function(v){ if(isFinite(v)) allYVals.push(v); });
    datasets.push({ type:"line", label:m.label, data:curveXs.map(function(x,i){return{x:x,y:cy[i]};}), borderColor:m.color, backgroundColor:"transparent", borderWidth:2, pointRadius:0, tension:0.15 });
  });
  var yLo=Math.min.apply(null,allYVals), yHi=Math.max.apply(null,allYVals);
  var pad=(yHi-yLo)*0.05 || 1;
  datasets.push({ type:"line", label:"X terpilih", data:[{x:xval,y:yLo-pad},{x:xval,y:yHi+pad}], borderColor:c.ink, borderDash:[4,4], borderWidth:1.5, pointRadius:0 });

  destroyChart("overlay");
  var optsO=Chr.baseGridOptions();
  optsO.scales.x.title.text=State.labelX; optsO.scales.y.title.text=State.labelY;
  State.charts.overlay=new Chart(document.getElementById("chartOverlay"), {
    type:"scatter",
    data:{ datasets:datasets },
    options:Object.assign({responsive:true, maintainAspectRatio:false}, optsO)
  });
}

}); /* end DOMContentLoaded */
