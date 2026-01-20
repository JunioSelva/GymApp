// ======================================================
// SUAS CHAVES JÁ ESTÃO AQUI (NÃO MEXA) 👇
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyAemGkdu011mIGOyXIxmTpkKxJODzhKQzk",
  authDomain: "gymapp-81117.firebaseapp.com",
  projectId: "gymapp-81117",
  storageBucket: "gymapp-81117.firebasestorage.app",
  messagingSenderId: "259299198468",
  appId: "1:259299198468:web:b7f022d2c652446509d751"
};

// Inicializa o Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- VARIÁVEIS GLOBAIS ---
let usuario = "";
let diaAtual = "segunda";
let rotinaCache = [];
let timerInterval = null;
let funcaoBotaoTimer = null;

// --- 1. SISTEMA DE LOGIN (COM DETECTOR DE ERRO) ---
function tentarLogin() {
    const nome = document.getElementById('nomeUsuario').value.trim().toLowerCase();
    const senha = document.getElementById('senhaUsuario').value.trim();

    if (!nome || senha.length !== 4) return alert("Digite um nome e uma senha de 4 números.");
    
    // Feedback visual
    const btn = document.querySelector('#telaLogin button');
    const textoOriginal = btn.innerText;
    btn.innerText = "Conectando...";

    // Tenta acessar o banco
    db.ref(`usuarios/${nome}/perfil`).once('value')
    .then(snapshot => {
        const dados = snapshot.val();
        
        if (!dados) {
            // Usuário não existe
            if(confirm(`Usuário "${nome}" não existe. Criar agora?`)) {
                return db.ref(`usuarios/${nome}/perfil`).set({ senha: senha })
                    .then(() => logar(nome));
            }
        } else {
            // Usuário existe
            if (dados.senha == senha) {
                logar(nome);
            } else {
                alert("SENHA ERRADA! 🚫");
            }
        }
        btn.innerText = textoOriginal;
    })
    .catch(erro => {
        // AQUI É ONDE VAMOS DESCOBRIR O ERRO
        console.error(erro);
        if(erro.code === 'PERMISSION_DENIED') {
            alert("ERRO: PERMISSÃO NEGADA! \nVocê precisa liberar o banco no site do Firebase em 'Regras'.");
        } else {
            alert("ERRO: " + erro.message);
        }
        btn.innerText = textoOriginal;
    });
}

function logar(nome) {
    usuario = nome;
    document.getElementById('olaUsuario').innerText = "Olá, " + nome.charAt(0).toUpperCase() + nome.slice(1);
    mudarTela('telaDash');
    carregarDia();
}

// --- 2. NAVEGAÇÃO ---
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

// --- 3. EDITOR DE TREINO ---
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
    renderizarListaEditor();
    mudarTela('telaEditor');
}

function renderizarListaEditor() {
    const div = document.getElementById('listaEditor');
    div.innerHTML = "";
    
    if(rotinaCache.length === 0) {
        div.innerHTML = "<p style='padding:20px; color:#666;'>Nenhum exercício.</p>";
        return;
    }

    rotinaCache.forEach((ex, idx) => {
        // BI-SET
        if(ex.tipo === 'biset') {
            div.innerHTML += `
                <div class="card biset-card flex-row">
                    <div style="flex:1;">
                        <span class="biset-label">⚡ BI-SET</span>
                        <div style="margin-top:5px;">
                            <strong>1. ${ex.ex1.nome}</strong> (${ex.ex1.reps} reps)<br>
                            <strong>2. ${ex.ex2.nome}</strong> (${ex.ex2.reps} reps)
                        </div>
                        <small style="color:#ce93d8">${ex.series} Séries</small>
                    </div>
                    <button class="btn-danger compact" onclick="removerItem(${idx})">🗑️</button>
                </div>`;
        } 
        // NORMAL
        else {
            let info = ex.tipo === 'timer' ? formatTime(ex.tempo) : `${ex.reps} Reps`;
            div.innerHTML += `
                <div class="card flex-row">
                    <div>
                        <strong style="color:#fff;">${ex.nome}</strong><br>
                        <small style="color:#aaa;">${ex.series} Séries x ${info}</small>
                    </div>
                    <button class="btn-danger compact" onclick="removerItem(${idx})">🗑️</button>
                </div>`;
        }
    });
}

function adicionarAoTreino(modo) {
    let novoEx = { id: Date.now() };

    if(modo === 'biset') {
        const nome1 = document.getElementById('biNome1').value;
        const reps1 = document.getElementById('biReps1').value;
        const nome2 = document.getElementById('biNome2').value;
        const reps2 = document.getElementById('biReps2').value;
        const series = document.getElementById('biSeries').value;

        if(!nome1 || !nome2 || !series) return alert("Preencha tudo do Bi-Set.");

        novoEx.tipo = 'biset';
        novoEx.series = parseInt(series);
        novoEx.ex1 = { nome: nome1, reps: reps1 };
        novoEx.ex2 = { nome: nome2, reps: reps2 };
        
        document.getElementById('biNome1').value = ""; document.getElementById('biReps1').value = "";
        document.getElementById('biNome2').value = ""; document.getElementById('biReps2').value = "";

    } else {
        const nome = document.getElementById('inputNome').value;
        const series = document.getElementById('inputSeries').value;
        const isTempo = document.getElementById('checkTipoTempo').checked;
        
        novoEx.nome = nome;
        novoEx.series = parseInt(series);

        if(isTempo) {
            const min = document.getElementById('inputMin').value || 0;
            const sec = document.getElementById('inputSec').value || 0;
            if(!nome || !series || (min==0 && sec==0)) return alert("Preencha o tempo!");
            novoEx.tipo = 'timer';
            novoEx.tempo = (parseInt(min)*60) + parseInt(sec);
        } else {
            const reps = document.getElementById('inputReps').value;
            if(!nome || !series || !reps) return alert("Preencha nome, séries e reps!");
            novoEx.tipo = 'reps';
            novoEx.reps = parseInt(reps);
        }
        document.getElementById('inputNome').value = "";
        document.getElementById('inputReps').value = "";
    }

    rotinaCache.push(novoEx);
    renderizarListaEditor();
}

function removerItem(idx) {
    if(confirm("Remover?")) {
        rotinaCache.splice(idx, 1);
        renderizarListaEditor();
    }
}

function salvarEVoltar() {
    db.ref(`usuarios/${usuario}/rotina/${diaAtual}`).set(rotinaCache)
      .then(() => { alert("Salvo! ✅"); mudarTela('telaDash'); });
}
function voltarDash() { mudarTela('telaDash'); }

// --- 4. EXECUÇÃO ---
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
        div.innerHTML = "<h1>TREINO FINALIZADO 🎉</h1><br><button class='btn-warning big-btn' onclick='resetarTreino()'>Reiniciar</button><br><br><button class='btn-primary' onclick='voltarDash()'>Sair</button>";
        return;
    }

    const serieDisplay = `Série <strong>${seriesFeitas + 1}</strong> de ${exAtual.series}`;

    // BI-SET
    if(exAtual.tipo === 'biset') {
        const c1 = progresso[exAtual.id]?.carga1 || "";
        const c2 = progresso[exAtual.id]?.carga2 || "";
        div.innerHTML = `
            <div class="card-exec-biset">
                <span class="biset-label">⚡ BI-SET</span>
                <div style="margin:10px 0; color:#aaa;">${serieDisplay}</div>
                <h2>${exAtual.ex1.nome}</h2>
                <h1 style="margin:0; font-size:2.5em; color:#ce93d8">${exAtual.ex1.reps} <small>REPS</small></h1>
                <input type="number" id="inputCarga1" value="${c1}" placeholder="kg Ex 1" style="text-align:center; padding:10px; width:100px;">
                <div class="divisor"></div>
                <h2>${exAtual.ex2.nome}</h2>
                <h1 style="margin:0; font-size:2.5em; color:#ce93d8">${exAtual.ex2.reps} <small>REPS</small></h1>
                <input type="number" id="inputCarga2" value="${c2}" placeholder="kg Ex 2" style="text-align:center; padding:10px; width:100px;">
                <br><br><button class="btn-success big-btn" onclick="concluirBiset('${exAtual.id}', ${seriesFeitas})">✅ CONCLUIR AMBOS</button>
            </div>`;
    } 
    // CARDIO
    else if (exAtual.tipo === 'timer') {
        div.innerHTML = `
            <div class="card" style="text-align:center; padding: 30px;">
                <small class="subtitle">CARDIO</small><h2>${exAtual.nome}</h2>
                <div style="background:#333; display:inline-block; padding:5px 15px; border-radius:20px; margin:10px 0;">${serieDisplay}</div>
                <h1 style="font-size:3.5em; color:#007bff; margin:15px 0;">${formatTime(exAtual.tempo)}</h1>
                <input type="number" id="inputTempoExec" value="${exAtual.tempo}" style="display:none">
                <button class="btn-primary big-btn" onclick="iniciarExecucaoCardio('${exAtual.id}', ${seriesFeitas})">⏱️ INICIAR</button>
            </div>`;
    } 
    // FORÇA
    else {
        const c = progresso[exAtual.id]?.carga || "";
        div.innerHTML = `
            <div class="card" style="text-align:center; padding: 30px;">
                <small class="subtitle">FORÇA</small><h2>${exAtual.nome}</h2>
                <div style="background:#333; display:inline-block; padding:5px 15px; border-radius:20px; margin:10px 0;">${serieDisplay}</div>
                <h1 style="font-size:4em; color:#28a745; margin:0;">${exAtual.reps} <small>REPS</small></h1>
                <hr><input type="number" id="inputCarga" value="${c}" placeholder="kg" style="text-align:center; font-size:2em; width:120px; display:block; margin: 0 auto;">
                <br><button class="btn-success big-btn" onclick="concluirSerieForca('${exAtual.id}', ${seriesFeitas})">✅ FEITO</button>
            </div>`;
    }
}

// --- 5. TIMERS ---
function concluirBiset(idEx, feitas) {
    const c1 = document.getElementById('inputCarga1').value;
    const c2 = document.getElementById('inputCarga2').value;
    iniciarDescanso(() => {
        db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${idEx}`).update({ concluidas: feitas+1, carga1: c1, carga2: c2 });
    });
}
function concluirSerieForca(idEx, feitas) {
    const c = document.getElementById('inputCarga').value;
    iniciarDescanso(() => {
        db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${idEx}`).update({ concluidas: feitas+1, carga: c });
    });
}
function iniciarExecucaoCardio(idEx, feitas) {
    const tempo = parseInt(document.getElementById('inputTempoExec').value);
    const painel = document.getElementById('painelDescanso');
    painel.className = "mode-cardio"; painel.style.display = 'flex';
    document.getElementById('tituloTimer').innerText = "EXECUTANDO";
    document.getElementById('btnPularTimer').innerText = "Parar";
    
    executarTimer(tempo, () => {
        iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${idEx}`).update({ concluidas: feitas+1 }));
    });
    funcaoBotaoTimer = () => {
        clearInterval(timerInterval);
        iniciarDescanso(() => db.ref(`usuarios/${usuario}/progresso/${diaAtual}/${idEx}`).update({ concluidas: feitas+1 }));
    };
}
function iniciarDescanso(callback) {
    const painel = document.getElementById('painelDescanso');
    painel.className = "mode-rest"; painel.style.display = 'flex';
    document.getElementById('tituloTimer').innerText = "DESCANSO";
    document.getElementById('btnPularTimer').innerText = "Pular ⏩";
    
    executarTimer(60, () => { painel.style.display = 'none'; callback(); });
    funcaoBotaoTimer = () => { clearInterval(timerInterval); painel.style.display = 'none'; callback(); };
}
function executingTimer(t,cb){} 
function executarTimer(t, cb) {
    const disp = document.getElementById('timerDisplay');
    disp.innerText = formatTime(t);
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        t--; disp.innerText = formatTime(t);
        if(t <= 0) { clearInterval(timerInterval); cb(); }
    }, 1000);
}
function acaoBotaoTimer() { if(funcaoBotaoTimer) funcaoBotaoTimer(); }
function formatTime(s) { const m=Math.floor(s/60); const sec=s%60; return `${m}:${sec<10?'0'+sec:sec}`; }
function resetarTreino() { if(confirm("Zerar?")) db.ref(`usuarios/${usuario}/progresso/${diaAtual}`).remove(); }