$ErrorActionPreference = 'Stop'

function Replace-OrThrow {
  param(
    [string]$Content,
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  if (-not $Content.Contains($Old)) {
    throw "Target block not found: $Label"
  }

  return $Content.Replace($Old, $New)
}

$path = 'C:\Users\range\Material Weakness\material-weakness-v2.html'
$backupPath = 'C:\Users\range\Material Weakness\material-weakness-v2.html.bak'

Copy-Item -LiteralPath $path -Destination $backupPath -Force

$content = ((Get-Content -Raw $path) -replace "`r`n", "`n")

$oldHelpers = @'
function injectError(diff,tb){
  const pool=ERRORS[diff];
  const def=pool[Math.floor(Math.random()*pool.length)];
  const err=def.generate(tb);
  return {def,err};
}
'@

$newHelpers = @'
function injectError(diff,tb){
  const pool=ERRORS[diff];
  const def=pool[Math.floor(Math.random()*pool.length)];
  const err=def.generate(tb);
  return {def,err};
}

function computeMateriality(tb,diff){
  let benchmarkName='Revenue';
  let benchmarkValue=Math.abs(safeNum(tb._netSales||tb._grossRev||tb._totalRev||0));
  let pct=0.01;

  const pretax=Math.abs(safeNum(tb._incomeBeforeTax||0));
  if(pretax>0){
    benchmarkName='Income Before Tax';
    benchmarkValue=pretax;
    pct=0.05;
  }else if(diff==='hard' || diff==='pro'){
    benchmarkName='Total Assets';
    benchmarkValue=Math.abs(safeNum(tb._totalAssets||0));
    pct=0.005;
  }

  const planning=Math.max(25000,r(benchmarkValue*pct));
  const performance=Math.max(15000,r(planning*0.75));
  const trivial=Math.max(5000,r(planning*0.05));

  return { benchmarkName, benchmarkValue, planning, performance, trivial };
}

function isMaterialError(candidate,materiality){
  if(!candidate)return false;
  const err=candidate.err||{};
  const def=candidate.def||{};
  if(err.isFraud||err.isClass||def.stmt==='cashflow') return true;
  const magnitude=Math.abs(safeNum(err.diff||err.adjAmt||0));
  return magnitude >= safeNum(materiality?.performance);
}
'@

$content = Replace-OrThrow $content $oldHelpers $newHelpers 'materiality helpers'

$oldGenerate = @'
function generateMonth(){
  const diff=G.diff;
  const evtPool=EVENTS[dataDiff(diff)];
  const event=evtPool[Math.floor(Math.random()*evtPool.length)];
  const hasError=diff==='pro'&&G.fraudMonth>0?true:Math.random()<0.72;

  const tb=generateTB(diff,G.month,event);
  let errorObj=null;
  if(hasError){
    const pool=ERRORS[dataDiff(diff)];
    let def;
    if(dataDiff(diff)==='pro'&&G.fraudType){
      def=pool.find(p=>p.id===G.fraudType)||pool[Math.floor(Math.random()*pool.length)];
    }else{
      def=pool[Math.floor(Math.random()*pool.length)];
    }
    const err=def.generate(tb);
    errorObj={def,err};
    if(diff==='pro'&&!G.fraudType){G.fraudType=def.id;G.fraudMonth=G.month;}
  }

  G.currentData={tb,event,errorObj};
  G.flags=[];
  G.adjustments=[];
  G.hintsUsed=0;

  document.getElementById('audit-notes').value='';
  document.getElementById('misstatement-type').value='';
  document.getElementById('je-context').textContent='Flag a line item on the statements to build an adjusting entry here.';
'@

$newGenerate = @'
function generateMonth(){
  const diff=G.diff;
  const evtPool=EVENTS[dataDiff(diff)];
  const event=evtPool[Math.floor(Math.random()*evtPool.length)];
  const hasError=diff==='pro'&&G.fraudMonth>0?true:Math.random()<0.72;

  const tb=generateTB(diff,G.month,event);
  const materiality=computeMateriality(tb,diff);
  let errorObj=null;
  if(hasError){
    const pool=ERRORS[dataDiff(diff)];
    let fallback=null;
    for(let attempt=0;attempt<24;attempt++){
      let def;
      if(dataDiff(diff)==='pro'&&G.fraudType){
        def=pool.find(p=>p.id===G.fraudType)||pool[Math.floor(Math.random()*pool.length)];
      }else{
        def=pool[Math.floor(Math.random()*pool.length)];
      }
      const err=def.generate(tb);
      const candidate={def,err};
      fallback=candidate;
      if(isMaterialError(candidate,materiality)){
        errorObj=candidate;
        break;
      }
    }
    errorObj=errorObj||fallback;
    if(diff==='pro'&&!G.fraudType&&errorObj){G.fraudType=errorObj.def.id;G.fraudMonth=G.month;}
  }

  G.currentData={tb,event,errorObj,materiality};
  G.flags=[];
  G.adjustments=[];
  G.hintsUsed=0;

  document.getElementById('audit-notes').value='';
  document.getElementById('misstatement-type').value='';
  document.getElementById('je-context').textContent='Flag a line item on the statements to build an adjusting entry here.';
'@

$content = Replace-OrThrow $content $oldGenerate $newGenerate 'generateMonth'
$content = Replace-OrThrow $content '  const {tb,event,errorObj}=G.currentData;' '  const {tb,event,errorObj,materiality}=G.currentData;' 'renderCaseFile destructuring'

$oldWorkflow = @'
    <div class="divider"></div>
    <div class="lbl">Workflow</div>
    <div style="font-size:9px;color:var(--text-dim);line-height:1.8">
'@

$newWorkflow = @'
    <div class="divider"></div>
    <div class="lbl">Materiality</div>
    <div class="evt-box"><div class="evt-lbl">Planning Benchmark</div><div class="evt-text">Benchmark: ${materiality.benchmarkName} of ${fmtD(materiality.benchmarkValue)}<br>Planning Materiality: ${fmtD(materiality.planning)}<br>Performance Materiality: ${fmtD(materiality.performance)}<br>Clearly Trivial Threshold: ${fmtD(materiality.trivial)}</div></div>
    <div class="divider"></div>
    <div class="lbl">Workflow</div>
    <div style="font-size:9px;color:var(--text-dim);line-height:1.8">
'@

$content = Replace-OrThrow $content $oldWorkflow $newWorkflow 'case file materiality'

$postAnchor = "  const adjNum=G.adjustments.length+1;"
$postInsert = @'
  const expectedErr=G.currentData?.errorObj?.err;
  if(expectedErr?.adjAmt){
    const expectedAccounts=[expectedErr.adjDr,expectedErr.adjCr].filter(Boolean).sort();
    const postedAccounts=jeLines.filter(l=>l.acct&&(l.dr>0||l.cr>0)).map(l=>l.acct).sort();
    const amountOk=Math.abs(totDr-expectedErr.adjAmt) <= Math.max(1,expectedErr.adjAmt*0.05);
    const accountsOk=expectedAccounts.length===postedAccounts.length && expectedAccounts.every((acct,idx)=>acct===postedAccounts[idx]);
    if(!amountOk || !accountsOk){
      const coa=COA[dataDiff(G.diff)];
      const expDr=coa.find(a=>a.id===expectedErr.adjDr)?.name||expectedErr.adjDr;
      const expCr=coa.find(a=>a.id===expectedErr.adjCr)?.name||expectedErr.adjCr;
      feedback.innerHTML=`<div class="je-err-msg">This entry balances, but it does not resolve the identified misstatement. Expected correction: Dr ${expDr} / Cr ${expCr} for approximately ${fmtD(expectedErr.adjAmt)}.<div class="gaap-explain">Audit accuracy matters as much as arithmetic. A balanced entry posted to the wrong accounts can create a second misstatement instead of correcting the first.</div></div>`;
      return;
    }
  }

  const adjNum=G.adjustments.length+1;
'@

$content = Replace-OrThrow $content $postAnchor $postInsert 'postJE validation'

$content = $content -replace "`n", "`r`n"
Set-Content -LiteralPath $path -Value $content -Encoding UTF8
Write-Host "Patched $path"
