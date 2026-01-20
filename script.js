const firebaseConfig = {
    apiKey: "AIzaSyAemGkdu011mIGOyXIxmTpkKxJODzhKQzk",
    authDomain: "gymapp-81117.firebaseapp.com",
    projectId: "gymapp-81117",
    storageBucket: "gymapp-81117.firebasestorage.app",
    messagingSenderId: "259299198468",
    appId: "1:259299198468:web:b7f022d2c652446509d751"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// VARIÁVEIS GLOBAIS
let usuario = "";
let diaAtual = "segunda";
let rotinaCache = [];
let timerInterval = null;
let funcaoBotaoTimer = null;
let indiceEdicao = null; // Controla se estamos editando ou criando

// --- SISTEMA DE LOGIN ---
function toggleSenha() {
    const input = document.getElementById('senhaUsuario');
    input.type = input.type === "password" ? "text" : "password";
}

function tentarLogin() {
    const nome = document.getElementById('nomeUsuario').value.trim().toLowerCase();
    const senha = document.getElementById('senhaUsuario').value.trim();

    if (!nome || senha.length !== 4) return alert("Digite nome e senha de 4 números.");
    
    const btn = document.querySelector('#telaLogin button');
    btn.innerText = "Conectando...";

    db.ref(`usuarios/${nome}/perfil`).once('value')
    .then(snapshot => {
        const dados = snapshot.val();
        if (!dados) {
            if(confirm(`Criar usuário "${nome}" com essa senha?`)) {
                return db.ref(`usuarios/${nome}/perfil`).set({ senha: senha }).then(() => logar(nome));
            }
        } else {
            if (dados.senha == senha) logar(nome); else alert("PIN INCORRETO 🚫");
        }
        btn.innerText = "Entrar";
    })
    .catch(erro => { console.error(erro); alert("Erro de conexão"); btn.innerText = "Entrar"; });
}

function logar(nome) {
    usuario = nome;
    document.getElementById('olaUsuario').innerText = "Olá, " + nome.charAt(0).toUpperCase() + nome.slice(1);
    mudarTela('telaDash');
    carregarDia();
}

// --- NAVEGAÇÃO ---
function mudarTela(telaId) {
    document.querySelectorAll('body > div').forEach(div => {
        if(div.id !== 'painelDescanso') div.classList.add('hidden');
    });
    document.getElementById(telaId).classList.remove('hidden');
}

function carregarDia() {
    diaAtual = document.getElementById('selectDia').value;
    db.ref(`usuarios/${usuario}/rotina/${diaAtual}`).once('value', snap => {
        rotinaCache = snap.val() || [];
    });
}

// --- EDITOR & EDIÇÃO ---
function mudarAbaEditor(modo) {
    document.getElementById('tabNormal').className = modo === 'normal' ? 'tab active' : 'tab';
    document.getElementById('tabBiset').className = modo === 'biset' ? 'tab active' : 'tab';
    
    if(modo === 'normal') {
        document.getElementById('formNormal').classList.remove('hidden');
        document.getElementById('formBiset').classList.add('hidden');
    } else {
        document.getElementById('formNormal').classList.add('hidden');
        document.getElementById('formBiset').classList.remove('hidden');
    }
}

function toggleTipoInputs() {
    const isTempo = document.getElementById('checkTipoTempo').checked;
    if(isTempo) {
        document.getElementById('inputReps').classList.add('hidden');
        document.getElementById('grupoTempo').classList.remove('hidden');
    } else {
        document.getElementById('inputReps').classList.remove('hidden');
        document.getElementById('grupoTempo').classList.add('hidden');
    }
}

function abrirEditor() {
    document.getElementById('diaEditandoTexto').innerText = diaAtual.toUpperCase();
    resetarFormulario();
    renderizarListaEditor();
    mudarTela('telaEditor');
}

function resetarFormulario() {
    indiceEdicao = null;
    document.getElementById('btnAddNormal').innerText = "Adicionar";
    document.getElementById('btnAddBiset').innerText = "Adicionar Bi-Set";
    
    // Limpa campos
    document.getElementById('inputNome').value = "";
    document.getElementById('inputSeries').value = "";
    document.getElementById('inputReps').value = "";
    document.getElementById('inputMin').value = "";
    document.getElementById('inputSec').value = "";
    document.getElementById('checkTipoTempo').checked = false;
    toggleTipoInputs();

    document.getElementById('biNome1').value = "";
    document.getElementById('biReps1').value = "";
    document.getElementById('biNome2').value = "";
    document.getElementById('biReps2').value = "";
    document.getElementById('biSeries').value = "";
}

function renderizarListaEditor() {
    const div = document.getElementById('listaEditor');
    div.innerHTML = "";
    if(rotinaCache.length === 0) { div.innerHTML = "<p style='padding:20px; color:#666;'>Lista vazia.</p>"; return; }

    const iconEdit = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const iconTrash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    rotinaCache.forEach((ex, idx) => {
        if(ex.tipo === 'biset') {
            div.innerHTML += `
                <div class="card biset-card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1">
                        <span class="biset-tag">BI-SET</span>
                        <div style="color:#fff;">1. ${ex.ex1.nome} (${ex.ex1.reps})</div>
                        <div style="color:#fff;">2. ${ex.ex2.nome} (${ex.ex2.reps})</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-action edit" onclick="editarItem(${idx})">${iconEdit}</button>
                        <button class="btn-action delete" onclick="removerItem(${idx})">${iconTrash}</button>
                    </div>
                </div>`;
        } else {
            let info = ex.tipo === 'timer' ? formatTime(ex.tempo) : `${ex.reps} Reps`;
            div.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1">
                        <strong style="color:#fff;">${ex.nome}</strong><br>
                        <small style="color:#666;">${ex.series} x ${info}</small>
                    </div>
                    <div class="card-actions">
                        <button class="btn-action edit" onclick="editarItem(${idx})">${iconEdit}</button>
                        <button class="btn-action delete" onclick="removerItem(${idx})">${iconTrash}</button>
                    </div>
                </div>`;
        }
    });
}

function editarItem(idx) {
    const item = rotinaCache[idx];
    indiceEdicao = idx;
    document.getElementById('telaEditor').scrollIntoView({ behavior: 'smooth' });

    if (item.tipo === 'biset') {
        mudarAbaEditor('biset');
        document.getElementById('biNome1').value = item.ex1.nome;
        document.getElementById('biReps1').value = item.ex1.reps;
        document.getElementById('biNome2').value = item.ex2.nome;
        document.getElementById('biReps2').value = item.ex2.reps;
        document.getElementById('biSeries').value = item.series;
        document.getElementById('btnAddBiset').innerText = "Salvar Alteração";
    } else {
        mudarAbaEditor('normal');
        document.getElementById('inputNome').value = item.nome;
        document.getElementById('inputSeries').value = item.series;
        
        const check = document.getElementById('checkTipoTempo');
        if (item.tipo === 'timer') {
            check.checked = true;
            toggleTipoInputs();
            const m = Math.floor(item.tempo / 60);
            const s = item.tempo % 60;
            document.getElementById('inputMin').value = m;
            document.getElementById('inputSec').value = s;
        } else {
            check.checked = false;
            toggleTipoInputs();
            document.getElementById('inputReps').value = item.reps;
        }
        document.getElementById('btnAddNormal').innerText = "Salvar Alteração";
    }
}

function adicionarAoTreino(modo) {
    let novoEx = { id: Date.now() };
    if (indiceEdicao !== null) novoEx.id = rotinaCache[indiceEdicao].id;

    if(modo === 'biset') {
        const n1=document.getElementById('biNome1').value; const r1=document.getElementById('biReps1').value;
        const n2=document.getElementById('biNome2').value; const r2=document.getElementById('biReps2').value;
        const s=document.getElementById('biSeries').value;
        if(!n1 || !n2 || !s) return alert("Preencha tudo.");
        
        novoEx.tipo='biset'; novoEx.series=parseInt(s);
        novoEx.ex1={nome:n1,reps:r1}; novoEx.ex2={nome:n2,reps:r2};
        
    } else {
        const n=document.getElementById('inputNome').value; const s=document.getElementById('inputSeries').value;
        const t=document.getElementById('checkTipoTempo').checked;
        if(!n || !s) return alert("Preencha nome e séries.");
        
        novoEx.nome=n; novoEx.series=parseInt(s);
        if(t) {
            const min=document.getElementById('inputMin').value||0; const sec=document.getElementById('inputSec').value||0;
            novoEx.tipo='timer'; novoEx.tempo=(parseInt(min)*60)+parseInt(sec);
        } else {
            const r=document.getElementById('inputReps').value;
            if(!r) return alert("Preencha repetições.");
            novoEx.tipo='reps'; novoEx.reps=parseInt(r);
        }
    }
    
    if (indiceEdicao !== null) rotinaCache[indiceEdicao] = novoEx;
    else rotinaCache.push(novoEx);

    resetarFormulario();
    renderizarListaEditor();
}

function removerItem(idx) {
    if(confirm("Remover?")) {
        if (indiceEdicao === idx) resetarFormulario();
        rotinaCache.splice(idx,1);
        renderizarListaEditor();
    }
}

function salvarEVoltar() { db.ref(`usuarios/${usuario}/rotina/${diaAtual}`).set(rotinaCache).then(() => { alert("Salvo."); mudarTela('telaDash'); }); }
function voltarDash() { mudarTela('telaDash'); }

// --- EXECUÇÃO (DESIGN MODERNO) ---
function iniciarTreino() {
    if(rotinaCache.length === 0) return alert("Dia vazio!");
    mudarTela('telaTreino');
    db.ref(`usuarios/${usuario}/progresso/${diaAtual}`).on('value', snap => {
        atualizarCardTreino(snap.val() || {});
    });
}

function atualizarCardTreino(progresso) {
    const div = document.getElementById('areaTreino');
    let exAtual = null; let seriesFeitas = 0;

    for(let ex of rotinaCache) {
        const p = progresso[ex.id] || {};
        const concluidas = p.concluidas || 0;
        if(concluidas < ex.series) { exAtual = ex; seriesFeitas = concluidas; break; }
    }

    if(!exAtual) {
        div.innerHTML = "<div style='text-align:center; padding-top:50px;'><h1>FIM DO TREINO</h1><p style='color:#666'>Tudo concluído por hoje.</p><br><button class='btn-neon' onclick='voltarDash()'>Voltar</button><br><br><button class='btn-text' onclick='resetarTreino()'>Resetar Dia</button></div>";
        return;
    }

    const serieInfo = `SÉRIE ${seriesFeitas + 1} / ${exAtual.series}`;

    if(exAtual.tipo === 'biset') {
        const c1 = progresso[exAtual.id]?.carga1 || "";
        const c2 = progresso[exAtual.id]?.carga2 || "";
        div.innerHTML = `
            <div class="exec-card">
                <span class="biset-tag">⚡ BI-SET</span>
                <span class="exec-badge">${serieInfo}</span>
                <div class="biset-container" style="margin-top:20px;">
                    <h2 class="exec-title">${exAtual.ex1.nome}</h2>
                    <span class="stat-big" style="font-size:3em; color:#ce93d8">${exAtual.ex1.reps}</span>
                    <span class="stat-label">REPS</span>
                    <div class="input-group" style="margin-top:10px;">
                        <input type="number" id="inputCarga1" class="input-giant" value="${c1}" placeholder="0">
                        <span class="input-label">KG</span>
                    </div>
                    <div class="biset-divider"></div>
                    <h2 class="exec-title">${exAtual.ex2.nome}</h2>
                    <span class="stat-big" style="font-size:3em; color:#ce93d8">${exAtual.ex2.reps}</span>
                    <span class="stat-label">REPS</span>
                    <div class="input-group" style="margin-top:10px; margin-bottom:0;">
                        <input type="number" id="inputCarga2" class="input-giant" value="${c2}" placeholder="0">
                        <span class="input-label">KG</span>
                    </div>
                </div>
                <button class="btn-neon purple full" onclick="concluirBiset('${exAtual.id}', ${seriesFeitas})">Concluir Série</button>
            </div>`;
    } else if (exAtual.tipo === 'timer') {
        div.innerHTML = `
            <div class="exec-card">
                <div class="exec-header"><span class="exec-badge">${serieInfo}</span><h2 class="exec-title" style="margin-top:15px; color:#00aaff;">${exAtual.nome}</h2></div>
                <div class="stat-box"><span class="stat-big" style="color:#00aaff">${formatTime(exAtual.tempo)}</span><span class="stat-label">TEMPO ALVO</span></div>
                <input type="number" id="inputTempoExec" value="${exAtual.tempo}" style="display:none">
                <button class="btn-neon full" style="background:#00aaff; border-color:#00aaff; color:#000;" onclick="iniciarExecucaoCardio('${exAtual.id}', ${seriesFeitas})">Iniciar Timer</button>
            </div>`;
    } else {
        const c = progresso[exAtual.id]?.carga || "";
        div.innerHTML = `
            <div class="exec-card">
                <div class="exec-header"><span class="exec-badge">${serieInfo}</span><h2 class="exec-title" style="margin-top:15px;">${exAtual.nome}</h2></div>
                <div class="stat-box"><span class="stat-big">${exAtual.reps}</span><span class="stat-label">REPETIÇÕES</span></div>
                <div class="input-group"><input type="number" id="inputCarga" class="input-giant" value="${c}" placeholder="0"><span class="input-label">CARGA (KG)</span></div>
                <button class="btn-neon full" onclick="concluirSerieForca('${exAtual.id}', ${seriesFeitas})">Concluir Série</button>
            </div>`;
    }
}

// --- TIMER & CONCLUSÃO ---
function concluirBiset(id, feitas) {
    const c1=document.getElementById('inputCarga1').value; const c2=document.getElementById('inputCarga2').value;
    iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${id}`).update({concluidas:feitas+1, carga1:c1, carga2:c2}));
}
function concluirSerieForca(id, feitas) {
    const c=document.getElementById('inputCarga').value;
    iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${id}`).update({concluidas:feitas+1, carga:c}));
}
function iniciarExecucaoCardio(id, feitas) {
    const t=parseInt(document.getElementById('inputTempoExec').value);
    const p=document.getElementById('painelDescanso');
    p.className="mode-cardio"; p.style.display='flex';
    document.getElementById('tituloTimer').innerText="EXECUTANDO";
    document.getElementById('btnPularTimer').innerText="Parar";
    executarTimer(t, () => iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${id}`).update({concluidas:feitas+1})));
    funcaoBotaoTimer = () => { clearInterval(timerInterval); iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${id}`).update({concluidas:feitas+1})); };
}
function iniciarDescanso(cb) {
    const p=document.getElementById('painelDescanso');
    p.className="mode-rest"; p.style.display='flex';
    document.getElementById('tituloTimer').innerText="DESCANSO";
    document.getElementById('btnPularTimer').innerText="Pular";
    executarTimer(60, () => { p.style.display='none'; cb(); });
    funcaoBotaoTimer = () => { clearInterval(timerInterval); p.style.display='none'; cb(); };
}
function executarTimer(t, cb) {
    const d=document.getElementById('timerDisplay'); d.innerText=formatTime(t);
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => { t--; d.innerText=formatTime(t); if(t<=0){ clearInterval(timerInterval); cb(); } }, 1000);
}
function acaoBotaoTimer() { if(funcaoBotaoTimer) funcaoBotaoTimer(); }
function formatTime(s) { const m=Math.floor(s/60); const sec=s%60; return `${m}:${sec<10?'0'+sec:sec}`; }
function resetarTreino() { if(confirm("Zerar?")) db.ref(`usuarios/${usuario}/progresso/${diaAtual}`).remove(); }
