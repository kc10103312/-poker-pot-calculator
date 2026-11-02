"use strict";
(() => {
  const MAX_PLAYERS = 10;
  const MAX_CHIPS = 1000000000;
  const $ = (id) => document.getElementById(id);
  let players = [
    {name:"プレイヤー1", amount:100, folded:false},
    {name:"プレイヤー2", amount:300, folded:false},
    {name:"プレイヤー3", amount:300, folded:false},
    {name:"プレイヤー4", amount:500, folded:false}
  ];

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function safeAmount(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > MAX_CHIPS) return null;
    return Math.floor(n);
  }
  function render() {
    $("count").textContent = `${players.length}人`;
    const root = $("players");
    root.replaceChildren();
    players.forEach((p, i) => {
      const row = make("div", "player");
      const nameWrap = make("div");
      const name = make("input");
      name.type = "text"; name.maxLength = 18; name.autocomplete = "off";
      name.setAttribute("aria-label", `プレイヤー${i+1}の名前`);
      name.value = p.name;
      name.addEventListener("input", () => { players[i].name = name.value; calculate(); });
      const foldLabel = make("label", "fold");
      const fold = make("input"); fold.type = "checkbox"; fold.checked = p.folded;
      fold.addEventListener("change", () => { players[i].folded = fold.checked; calculate(); });
      foldLabel.append(fold, document.createTextNode(" フォールド"));
      nameWrap.append(name, foldLabel);

      const amount = make("input");
      amount.type = "number"; amount.min = "0"; amount.max = String(MAX_CHIPS);
      amount.step = "1"; amount.inputMode = "numeric";
      amount.setAttribute("aria-label", `プレイヤー${i+1}の投入チップ数`);
      amount.value = String(p.amount);
      amount.addEventListener("input", () => {
        const parsed = safeAmount(amount.value);
        if (parsed === null) {
          amount.setCustomValidity(`0〜${MAX_CHIPS.toLocaleString()}の整数を入力してください。`);
        } else {
          amount.setCustomValidity("");
          players[i].amount = parsed;
          calculate();
        }
      });
      const remove = make("button", "remove", "×");
      remove.type = "button"; remove.setAttribute("aria-label", `プレイヤー${i+1}を削除`);
      remove.disabled = players.length <= 2;
      remove.addEventListener("click", () => {
        if (players.length > 2) { players.splice(i, 1); render(); calculate(); }
      });
      row.append(nameWrap, amount, remove);
      root.append(row);
    });
    $("add").disabled = players.length >= MAX_PLAYERS;
  }
  function calculate() {
    const values = players.map((p, i) => ({
      index:i, name:(p.name.trim().slice(0,18) || `プレイヤー${i+1}`),
      amount:safeAmount(p.amount) ?? 0, folded:Boolean(p.folded)
    }));
    const total = values.reduce((sum,p) => sum + p.amount, 0);
    const adjusted = values.map(p => ({...p}));
    const ranked = [...adjusted].sort((a,b) => b.amount-a.amount);
    let refund = 0, refundName = "";
    if (ranked.length >= 2 && ranked[0].amount > ranked[1].amount && ranked[0].amount > 0) {
      refund = ranked[0].amount - ranked[1].amount;
      refundName = ranked[0].name;
      const target = adjusted.find(p => p.index === ranked[0].index);
      target.amount -= refund;
    }
    const levels = [...new Set(adjusted.map(p=>p.amount).filter(n=>n>0))].sort((a,b)=>a-b);
    let previous = 0;
    const pots = [];
    for (const level of levels) {
      const contributors = adjusted.filter(p=>p.amount>=level);
      const eligible = contributors.filter(p=>!p.folded);
      const amount = (level-previous)*contributors.length;
      if (amount > 0) pots.push({amount, eligible, from:previous, to:level});
      previous = level;
    }
    $("total").textContent = total.toLocaleString("ja-JP");
    $("potTotal").textContent = pots.reduce((s,p)=>s+p.amount,0).toLocaleString("ja-JP");
    const output = $("results");
    output.replaceChildren();
    if (refund > 0) output.append(make("div","warn",`未コール分：${refundName} に ${refund.toLocaleString("ja-JP")} チップを返却（要確認）`));
    if (pots.length === 0) output.append(make("p","note","投入額を入力してください。"));
    pots.forEach((pot,i) => {
      const box = make("div","pot");
      box.append(make("h3","",i===0?"MAIN POT":`SIDE POT ${i}`));
      box.append(make("div","amount",`${pot.amount.toLocaleString("ja-JP")} チップ`));
      box.append(make("div","note",`この層の投入額：${pot.from.toLocaleString("ja-JP")} ～ ${pot.to.toLocaleString("ja-JP")}`));
      const names = pot.eligible.map(p=>p.name);
      box.append(make("div","eligible",names.length?`獲得対象：${names.join("・")}`:"獲得対象者なし（要確認）"));
      output.append(box);
    });
  }
  $("add").addEventListener("click", () => {
    if (players.length < MAX_PLAYERS) {
      players.push({name:`プレイヤー${players.length+1}`,amount:0,folded:false});
      render(); calculate();
    }
  });
  $("calc").addEventListener("click", calculate);
  $("reset").addEventListener("click", () => {
    players = players.map(p=>({...p,amount:0,folded:false}));
    render(); calculate();
  });
  $("example").addEventListener("click", () => {
    players = [
      {name:"A",amount:100,folded:false},{name:"B",amount:300,folded:false},
      {name:"C",amount:300,folded:false},{name:"D",amount:500,folded:false}
    ];
    render(); calculate();
  });
  render(); calculate();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", {scope:"./"}).catch(()=>{});
    });
  }
})();