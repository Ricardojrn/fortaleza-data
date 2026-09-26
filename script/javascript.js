
let dadosTime = null;

// Carrega os dados do arquivo JSON
let anoSelecionado = "todos";
let adversarioSelecionado = "todos";
let competicaoSelecionada = "todas";
let ordemCrescente = false;


document.addEventListener("DOMContentLoaded", async () => {
  try {
    const respostaTemporadas = await fetch("dados/temporadas.json");

    if (!respostaTemporadas.ok) {
      throw new Error("Erro ao carregar temporadas.json");
    }

    const temporadas = await respostaTemporadas.json();

    inicializarFiltroAnos(temporadas);
    inicializarFiltroCompeticoes();

    const selectAdversario = document.getElementById("select-adversario");

    selectAdversario.addEventListener("change", (e) => {
      adversarioSelecionado = e.target.value;
      atualizarVisualizacao();
    });

    const btnOrdem = document.getElementById("btn-ordem");

    btnOrdem.addEventListener("click", () => {
      ordemCrescente = !ordemCrescente;

      btnOrdem.textContent = ordemCrescente
        ? "↓ Recentes primeiro"
        : "↑ Antigas primeiro";

      atualizarVisualizacao();
    });

    anoSelecionado = Math.max(...temporadas);

    document.getElementById("select-ano").value = anoSelecionado;

    await carregarTemporada(anoSelecionado);

  } catch (erro) {
    console.error("Erro ao carregar os dados:", erro);
  }
});

async function carregarTemporada(ano) {
  try {
    const resposta = await fetch(`dados/dados${ano}.json`);

    if (!resposta.ok) {
      throw new Error(`Erro ao carregar dados/dados${ano}.json`);
    }

    dadosTime = await resposta.json();

    inicializarFiltroAdversarios(dadosTime.partidas);

    atualizarVisualizacao();

  } catch (erro) {
    console.error("Erro ao carregar a temporada:", erro);
  }
}

async function carregarTodasTemporadas(anosDisponiveis) {
  try {
    dadosTime = {
      nomeTimePrincipal: "FORTALEZA",
      partidas: []
    };

    for (const ano of anosDisponiveis) {
      const resposta = await fetch(`dados/dados${ano}.json`);

      if (!resposta.ok) {
        throw new Error(`Erro ao carregar dados/dados${ano}.json`);
      }

      const dadosAno = await resposta.json();

      dadosTime.partidas.push(
        ...dadosAno.partidas.map(partida => ({
          ...partida,
          ano: ano
        }))
      );
    }

    inicializarFiltroAdversarios(dadosTime.partidas);

    atualizarVisualizacao();

  } catch (erro) {
    console.error("Erro ao carregar todas as temporadas:", erro);
  }
}

// Preenche o select dinamicamente com base nos anos que existem no dados.js
function inicializarFiltroAnos(anosDisponiveis) {
  const selectAno = document.getElementById("select-ano");

  anosDisponiveis.forEach(ano => {
    const option = document.createElement("option");
    option.value = ano;
    option.textContent = ano;
    selectAno.appendChild(option);
  });

  selectAno.addEventListener("change", async (e) => {
    anoSelecionado = e.target.value;
    competicaoSelecionada = "todas";

    document.getElementById("select-adversario").value = "todos";

    if (anoSelecionado === "todos") {
      carregarTodasTemporadas(anosDisponiveis);
    } else {
      carregarTemporada(anoSelecionado);
    }
  });
}

function inicializarFiltroAdversarios(partidas) {
  const selectAdversario = document.getElementById("select-adversario");

  const adversarioAnterior = adversarioSelecionado;

  selectAdversario.innerHTML = `
    <option value="todos">Todos</option>
  `;

  const timePrincipal = dadosTime.nomeTimePrincipal.toUpperCase();

  // Cria uma lista apenas com os adversários
  const adversarios = new Set();

  partidas.forEach(partida => {

    if (partida.timeCasa.toUpperCase() === timePrincipal) {
      adversarios.add(partida.timeFora);
    } else {
      adversarios.add(partida.timeCasa);
    }

  });

  // Ordena os adversários em ordem alfabética
  const adversariosOrdenados = [...adversarios].sort();

  adversariosOrdenados.forEach(adversario => {
    const option = document.createElement("option");

    option.value = adversario;
    option.textContent = adversario;

    selectAdversario.appendChild(option);
  });

  if (adversariosOrdenados.includes(adversarioAnterior)) {
    selectAdversario.value = adversarioAnterior;
  } else {
    adversarioSelecionado = "todos";
    selectAdversario.value = "todos";
  }
}

function inicializarFiltroCompeticoes() {
  const caixas = document.querySelectorAll(".comp-box");

  caixas.forEach(caixa => {
    caixa.addEventListener("click", () => {

      const competicoes = [
        "cearense",
        "nordeste",
        "brasil",
        "libertadores",
        "sulamericana",
        "brasileiro-A",
        "brasileiro-B"
      ];

      const competicao = competicoes.find(classe =>
        caixa.classList.contains(classe)
      );

      if (!competicao) return;

      // Se clicar novamente na mesma competição,
      // volta para todas
      if (competicaoSelecionada === competicao) {
        competicaoSelecionada = "todas";
      } else {
        competicaoSelecionada = competicao;
      }

      caixas.forEach(c => c.classList.remove("selecionada"));

      if (competicaoSelecionada !== "todas") {
        caixa.classList.add("selecionada");
      }

      atualizarVisualizacao();
    });
  });
}

// Filtra as partidas e re-renderiza tanto a lista quanto os gráficos/contadores
function atualizarVisualizacao() {

  let partidasFiltradas = dadosTime.partidas;

  // Filtro por competição
  if (competicaoSelecionada !== "todas") {
    partidasFiltradas = partidasFiltradas.filter(
      p => p.competicao === competicaoSelecionada
    );
  }

  // Filtro por adversário
  if (adversarioSelecionado !== "todos") {
    partidasFiltradas = partidasFiltradas.filter(p => {
      const timePrincipal = dadosTime.nomeTimePrincipal.toUpperCase();

      if (p.timeCasa.toUpperCase() === timePrincipal) {
        return p.timeFora === adversarioSelecionado;
      } else {
        return p.timeCasa === adversarioSelecionado;
      }
    });
  }

  const dadosFiltrados = {
    nomeTimePrincipal: dadosTime.nomeTimePrincipal,
    partidas: partidasFiltradas
  };

  atualizarBarraCompeticoes(dadosTime.partidas);

  renderizarPartidas(dadosFiltrados);
  calcularEstatisticas(dadosFiltrados);
}


function atualizarBarraCompeticoes(partidas) {

  const competicoesBar = document.querySelector(".competicoes-bar");

  // Lista das competições que existem nas partidas filtradas
  const competicoesDoAno = new Set(
    partidas.map(p => p.competicao)
  );

  // Todas as caixas da barra
  const caixas = competicoesBar.querySelectorAll(".comp-box");

  caixas.forEach(caixa => {

    // Procura a classe da competição
    const classeCompeticao = [...caixa.classList]
      .find(classe =>
        ["cearense", "nordeste", "brasil", "libertadores", "sulamericana", "brasileiro-A", "brasileiro-B"]
          .includes(classe)
      );

    if (!classeCompeticao) return;

    // Mostra somente se existir partida dessa competição
    if (competicoesDoAno.has(classeCompeticao)) {
      caixa.style.display = "flex";
    } else {
      caixa.style.display = "none";
    }

  });
}

function renderizarPartidas(dados) {
  const container = document.getElementById("lista-partidas");
  const timePrincipal = dados.nomeTimePrincipal;
  let html = "";
  let anoAnterior = null;

  dados.partidas
    .slice()
    .sort((a, b) => ordemCrescente ? a.id - b.id : b.id - a.id)
    .forEach(p => {

      // Adiciona separador quando muda de temporada
      if (anoSelecionado === "todos" && p.ano !== anoAnterior) {
        html += `
        <div class="temporada-separador">
          <span>${p.ano}</span>
        </div>
      `;

        anoAnterior = p.ano;
      }
      const [dia, mes] = p.data.split("/");
      const isPrincipalEmCasa = p.timeCasa.toUpperCase() === timePrincipal.toUpperCase();

      // Cálculo do status: Vitória (Verde), Derrota (Vermelho), Empate (Cinza)
      const saldo = isPrincipalEmCasa ? (p.golsCasa - p.golsFora) : (p.golsFora - p.golsCasa);

      let statusClass = "status-pill";
      if (saldo < 0) {
        statusClass += " status-derrota";
      } else if (saldo === 0) {
        statusClass += " status-empate";
      } else if (saldo > 0) {
        statusClass += " status-vitoria";
      }

      const formatarGol = (gol) => {
        if (gol.includes("(GC)")) {
          return `<div class="gol-contra">${gol}</div>`;
        }

        return `<div>${gol}</div>`;
      };

      const htmlGolsCasa = p.autoresGolsCasa ? p.autoresGolsCasa.map(formatarGol).join("")
        : "";

      const htmlGolsFora = p.autoresGolsFora ? p.autoresGolsFora.map(formatarGol).join("")
        : "";

      let htmlPenaltis = "";

      if (p.decisaoPenaltis) {

        const criarBolinhasPenaltis = (penaltis) => {
          return penaltis.map(resultado => {
            const classe = resultado === "o"
              ? "pen-gol"
              : "pen-erro";

            return `<span class="pen-bolinha ${classe}"></span>`;
          }).join("");
        };

        const penaltisCasa = criarBolinhasPenaltis(
          p.decisaoPenaltis.penaltisCasa
        );

        const penaltisFora = criarBolinhasPenaltis(
          p.decisaoPenaltis.penaltisFora
        );

        htmlPenaltis = `
    <div class="penaltis-result">

      <div class="penaltis-cobrancas">
        ${penaltisCasa}
      </div>

      <div class="pen-info">
        <span class="pen-label">PEN</span>
        <span class="pen-score">
          ${p.decisaoPenaltis.golsCasa} × ${p.decisaoPenaltis.golsFora}
        </span>
      </div>

      <div class="penaltis-cobrancas">
        ${penaltisFora}
      </div>

    </div>
  `;
      }

      html += `
      <div class="match-card comp-${p.competicao}">
        <div class="${statusClass}"></div>

        <div class="card-frame">
          
          <div class="card-header-bar">${p.fase}</div>

          <div class="card-date-box">
            <span class="date-day">${dia}</span>
            <span class="date-month">${mes}</span>
          </div>

          <div class="card-content">            
            <div class="venue-box">
              <span class="venue-name">${p.estadio}</span>
              <span class="venue-city">${p.cidade}</span>
            </div>
            <img src="${p.escudoCasa}" class="crest-casa" alt="${p.timeCasa}">
            <div class="matchup-center">
              <div class="teams-and-scores">
                <div class="team-block home">
                  <span class="t-name">${p.timeCasa}</span>
                  <span class="t-score">${p.golsCasa}</span>
                </div>
                
                <div class="center-ball-divider">⚽</div>

                <div class="team-block away">
                  <span class="t-score">${p.golsFora}</span>
                  <span class="t-name">${p.timeFora}</span>
                </div>
              </div>

              <div class="lines-container">
                <div class="score-line"></div>
                <div class="score-line"></div>
              </div>

              <div class="goals-container">
                <div class="goals-home">${htmlGolsCasa}</div>
                <div class="goals-away">${htmlGolsFora}</div>
              </div>

              ${htmlPenaltis}
            </div>

            <img src="${p.escudoFora}" class="crest-fora" alt="${p.timeFora}">

          </div>
        </div>
      </div>
    `;
    });

  container.innerHTML = html;
}

function calcularEstatisticas(dados) {
  const timePrincipal = dados.nomeTimePrincipal;
  let vitorias = 0;
  let derrotas = 0;
  let empates = 0;
  let golsMarcados = 0;
  let golsSofridos = 0;
  let saldoGols = 0;
  const artilheirosMap = {};

  dados.partidas.forEach(p => {
    const isPrincipalEmCasa = p.timeCasa.toUpperCase() === timePrincipal.toUpperCase();
    const gTime = isPrincipalEmCasa ? p.golsCasa : p.golsFora;
    const gAdv = isPrincipalEmCasa ? p.golsFora : p.golsCasa;

    golsMarcados += gTime;
    golsSofridos += gAdv;
    saldoGols = golsMarcados - golsSofridos;

    if (gTime > gAdv) {
      vitorias++;
    } else if (gTime < gAdv) {
      derrotas++;
    } else {
      empates++;
    }

    // Contabiliza apenas os gols feitos pelos jogadores do seu time
    const listaGols = isPrincipalEmCasa ? p.autoresGolsCasa : p.autoresGolsFora;

    listaGols.forEach(item => {

      // Ignora gols contra na artilharia
      if (item.includes("(GC)")) {
        return;
      }

      const qtdGols = item.split(",").length;
      const nomeJogador = item.replace(/\s+\d+.*$/, "").replace(/\(GC\)\s*-\s*/, "").trim();

      artilheirosMap[nomeJogador] =
        (artilheirosMap[nomeJogador] || 0) + qtdGols;
    });
  });

  // Atualiza os totais e círculos
  document.getElementById("total-jogos").textContent = `${dados.partidas.length} Partidas`;
  document.getElementById("count-vitorias").textContent = vitorias;
  document.getElementById("count-derrotas").textContent = derrotas;
  document.getElementById("count-empates").textContent = empates;
  document.getElementById("total-gols-marcados").textContent = golsMarcados;
  document.getElementById("total-gols-sofridos").textContent = golsSofridos;
  document.getElementById("total-saldo-gols").textContent = saldoGols;

  // Define o tamanho proporcional dos círculos
  const maiorResultado = Math.max(vitorias, empates, derrotas, 1);

  const tamanhoMinimo = 70;
  const tamanhoMaximo = 120;

  const calcularTamanhoCirculo = (quantidade) => {
    return tamanhoMinimo +
      (quantidade / maiorResultado) * (tamanhoMaximo - tamanhoMinimo);
  };

  document.querySelector(".circle-vitorias")
    .style.setProperty(
      "--tamanho-circulo",
      `${calcularTamanhoCirculo(vitorias)}px`
    );

  document.querySelector(".circle-empates")
    .style.setProperty(
      "--tamanho-circulo",
      `${calcularTamanhoCirculo(empates)}px`
    );

  document.querySelector(".circle-derrotas")
    .style.setProperty(
      "--tamanho-circulo",
      `${calcularTamanhoCirculo(derrotas)}px`
    );

  // Ordena os artilheiros por total de gols
  const artilheirosArray = Object.keys(artilheirosMap)
    .map(nome => ({ nome, gols: artilheirosMap[nome] }))
    .sort((a, b) => b.gols - a.gols);

  // 1. Define o valor máximo do gráfico baseado no artilheiro atual
  const maxArtilheiro = artilheirosArray.length > 0 ? artilheirosArray[0].gols : 0;

  // Garante que o teto seja um número par e tenha no mínimo 4 para manter a estética
  const escalaBase = Math.max(Math.ceil(maxArtilheiro / 2) * 2, 4);

  // 2. Renderiza as barras com largura proporcional à escala calculada
  const chartContainer = document.getElementById("chart-artilharia");

  let htmlArtilharia = "";

  artilheirosArray.forEach((jogador, index) => {

    const porcentagem = (jogador.gols / escalaBase) * 100;

    htmlArtilharia += `
    <div class="chart-row ${index >= 15 ? "artilheiro-extra" : ""}">
      <span class="player-name">${jogador.nome}</span>

      <div class="chart-bar-area">
        <div class="chart-bar-fill" style="width: ${porcentagem}%;">
          ${jogador.gols}
        </div>
      </div>
    </div>
  `;
  });

  chartContainer.innerHTML = htmlArtilharia;

  const btnArtilharia = document.getElementById("btn-artilharia");

  if (artilheirosArray.length > 15) {
    btnArtilharia.style.display = "block";
    btnArtilharia.textContent = "Mostrar mais";

    btnArtilharia.onclick = () => {
      const extras = document.querySelectorAll(".artilheiro-extra");

      const mostrandoTodos = extras[0]?.style.display === "flex";

      extras.forEach(item => {
        item.style.display = mostrandoTodos ? "none" : "flex";
      });

      btnArtilharia.textContent = mostrandoTodos
        ? "Mostrar mais"
        : "Mostrar menos";
    };

  } else {
    btnArtilharia.style.display = "none";
  }
}

