import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

type Doacao = {
  id: string;
  doadorId?: string;
  nomeDoador?: string;
  tipoDoador?: string;
  categoriaGeral?: string;
  categoria?: string;
  produto?: string;
  quantidade?: number;
  tipoQuantidade?: string;
  data?: any;
  mes?: string;
  ano?: string;
  dadoSimulado?: boolean;
};

type PerfilDoador = {
  doadorId: string;
  nomeDoador: string;
  tipoDoador: string;

  totalAlimentos: number;
  totalLimpeza: number;
  totalHigiene: number;
  totalOutros: number;

  quantidadeTotal: number;
  numeroDoacoes: number;
  variedadeCategorias: number;

  mesesComAlimentos: number;
  mesesComLimpeza: number;
  mesesComHigiene: number;
  mesesAtivos: string[];

  produtos: string[];
  categorias: string[];

  perfilPredominante: string;
  vetor: number[];
  cluster?: number;
};

const categoriasAlimentos = [
  "Grãos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Hortifruti",
  "Bebidas",
];

const nomesMeses: Record<string, string> = {
  "01": "janeiro",
  "02": "fevereiro",
  "03": "março",
  "04": "abril",
  "05": "maio",
  "06": "junho",
  "07": "julho",
  "08": "agosto",
  "09": "setembro",
  "10": "outubro",
  "11": "novembro",
  "12": "dezembro",
};

export default function AnaliseIA() {
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "doacoes"),
      (snapshot) => {
        const lista: Doacao[] = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          } as Doacao);
        });

        setDoacoes(lista);
        setCarregando(false);
      },
      (error) => {
        console.log(error);
        setCarregando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const converterData = (data: any) => {
    if (!data) return null;

    if (data?.toDate) {
      return data.toDate();
    }

    if (data instanceof Date) {
      return data;
    }

    const dataConvertida = new Date(data);

    if (isNaN(dataConvertida.getTime())) {
      return null;
    }

    return dataConvertida;
  };

  const obterMesAno = (doacao: Doacao) => {
    if (doacao.mes && doacao.ano) {
      return `${doacao.ano}-${String(doacao.mes).padStart(2, "0")}`;
    }

    const data = converterData(doacao.data);

    if (!data) {
      return "sem-data";
    }

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return `${ano}-${mes}`;
  };

  const formatarMesAno = (mesAno: string) => {
    if (!mesAno || mesAno === "sem-data") {
      return "Data não informada";
    }

    const [ano, mes] = mesAno.split("-");

    if (!ano || !mes || !nomesMeses[mes]) {
      return mesAno;
    }

    return `${nomesMeses[mes]} de ${ano}`;
  };

  const definirCategoriaGeral = (categoriaInformada?: string) => {
    const categoria = String(categoriaInformada || "").trim();

    if (categoriasAlimentos.includes(categoria)) {
      return "Alimentos";
    }

    if (categoria === "Produtos de limpeza") {
      return "Limpeza";
    }

    if (categoria === "Higiene pessoal") {
      return "Higiene";
    }

    return "Outros";
  };

  const definirPerfilPredominante = (perfil: {
    totalAlimentos: number;
    totalLimpeza: number;
    totalHigiene: number;
    totalOutros: number;
    variedadeCategorias: number;
  }) => {
    const possuiAlimentos = perfil.totalAlimentos > 0;
    const possuiLimpeza = perfil.totalLimpeza > 0;
    const possuiHigiene = perfil.totalHigiene > 0;

    const quantidadeTipos =
      Number(possuiAlimentos) + Number(possuiLimpeza) + Number(possuiHigiene);

    if (quantidadeTipos >= 3 || perfil.variedadeCategorias >= 3) {
      return "Variado";
    }

    if (
      perfil.totalAlimentos >= perfil.totalLimpeza &&
      perfil.totalAlimentos >= perfil.totalHigiene &&
      perfil.totalAlimentos >= perfil.totalOutros
    ) {
      return "Alimentos";
    }

    if (
      perfil.totalLimpeza >= perfil.totalAlimentos &&
      perfil.totalLimpeza >= perfil.totalHigiene &&
      perfil.totalLimpeza >= perfil.totalOutros
    ) {
      return "Limpeza";
    }

    if (
      perfil.totalHigiene >= perfil.totalAlimentos &&
      perfil.totalHigiene >= perfil.totalLimpeza &&
      perfil.totalHigiene >= perfil.totalOutros
    ) {
      return "Higiene";
    }

    return "Outros";
  };

  const montarPerfisDoadores = () => {
    const perfis: Record<string, PerfilDoador> = {};
    const mesesPorDoador: Record<
      string,
      {
        alimentos: Set<string>;
        limpeza: Set<string>;
        higiene: Set<string>;
        ativos: Set<string>;
      }
    > = {};

    doacoes.forEach((doacao) => {
      const doadorId = doacao.doadorId || "sem-doador";
      const nomeDoador = doacao.nomeDoador || "Doador não informado";
      const tipoDoador = doacao.tipoDoador || "Não informado";

      const categoria = doacao.categoria || "Categoria não informada";
      const categoriaGeral = definirCategoriaGeral(categoria);

      const produto = doacao.produto || "Produto não informado";
      const quantidade = Number(doacao.quantidade || 0);
      const mesAno = obterMesAno(doacao);

      if (!perfis[doadorId]) {
        perfis[doadorId] = {
          doadorId,
          nomeDoador,
          tipoDoador,

          totalAlimentos: 0,
          totalLimpeza: 0,
          totalHigiene: 0,
          totalOutros: 0,

          quantidadeTotal: 0,
          numeroDoacoes: 0,
          variedadeCategorias: 0,

          mesesComAlimentos: 0,
          mesesComLimpeza: 0,
          mesesComHigiene: 0,
          mesesAtivos: [],

          produtos: [],
          categorias: [],

          perfilPredominante: "Outros",
          vetor: [],
        };

        mesesPorDoador[doadorId] = {
          alimentos: new Set(),
          limpeza: new Set(),
          higiene: new Set(),
          ativos: new Set(),
        };
      }

      perfis[doadorId].quantidadeTotal += quantidade;
      perfis[doadorId].numeroDoacoes += 1;

      if (!perfis[doadorId].produtos.includes(produto)) {
        perfis[doadorId].produtos.push(produto);
      }

      if (!perfis[doadorId].categorias.includes(categoria)) {
        perfis[doadorId].categorias.push(categoria);
      }

      mesesPorDoador[doadorId].ativos.add(mesAno);

      if (categoriaGeral === "Alimentos") {
        perfis[doadorId].totalAlimentos += quantidade;
        mesesPorDoador[doadorId].alimentos.add(mesAno);
      } else if (categoriaGeral === "Limpeza") {
        perfis[doadorId].totalLimpeza += quantidade;
        mesesPorDoador[doadorId].limpeza.add(mesAno);
      } else if (categoriaGeral === "Higiene") {
        perfis[doadorId].totalHigiene += quantidade;
        mesesPorDoador[doadorId].higiene.add(mesAno);
      } else {
        perfis[doadorId].totalOutros += quantidade;
      }
    });

    return Object.values(perfis).map((perfil) => {
      const variedadeCategorias = perfil.categorias.length;

      const mesesComAlimentos =
        mesesPorDoador[perfil.doadorId]?.alimentos.size || 0;

      const mesesComLimpeza =
        mesesPorDoador[perfil.doadorId]?.limpeza.size || 0;

      const mesesComHigiene =
        mesesPorDoador[perfil.doadorId]?.higiene.size || 0;

      const mesesAtivos = Array.from(
        mesesPorDoador[perfil.doadorId]?.ativos || []
      ).sort();

      const perfilPredominante = definirPerfilPredominante({
        totalAlimentos: perfil.totalAlimentos,
        totalLimpeza: perfil.totalLimpeza,
        totalHigiene: perfil.totalHigiene,
        totalOutros: perfil.totalOutros,
        variedadeCategorias,
      });

      return {
        ...perfil,
        variedadeCategorias,
        mesesComAlimentos,
        mesesComLimpeza,
        mesesComHigiene,
        mesesAtivos,
        perfilPredominante,
        vetor: [
          perfil.totalAlimentos,
          perfil.totalLimpeza,
          perfil.totalHigiene,
          perfil.totalOutros,
          perfil.quantidadeTotal,
          perfil.numeroDoacoes,
          variedadeCategorias,
          mesesComAlimentos,
          mesesComLimpeza,
          mesesComHigiene,
          mesesAtivos.length,
        ],
      };
    });
  };

  const normalizarVetores = (dados: PerfilDoador[]) => {
    if (dados.length === 0) return [];

    const tamanhoVetor = dados[0].vetor.length;
    const maximos = Array(tamanhoVetor).fill(0);

    dados.forEach((item) => {
      item.vetor.forEach((valor, index) => {
        if (valor > maximos[index]) {
          maximos[index] = valor;
        }
      });
    });

    return dados.map((item) => ({
      ...item,
      vetor: item.vetor.map((valor, index) => {
        if (maximos[index] === 0) return 0;
        return valor / maximos[index];
      }),
    }));
  };

  const calcularDistancia = (vetorA: number[], vetorB: number[]) => {
    const soma = vetorA.reduce((total, valor, index) => {
      const diferenca = valor - vetorB[index];
      return total + diferenca * diferenca;
    }, 0);

    return Math.sqrt(soma);
  };

  const calcularMedia = (itens: PerfilDoador[]) => {
    if (itens.length === 0) return [];

    const tamanhoVetor = itens[0].vetor.length;
    const soma = Array(tamanhoVetor).fill(0);

    itens.forEach((item) => {
      item.vetor.forEach((valor, index) => {
        soma[index] += valor;
      });
    });

    return soma.map((valor) => valor / itens.length);
  };

  const aplicarKMeans = (dadosOriginais: PerfilDoador[]) => {
    if (dadosOriginais.length === 0) return [];

    if (dadosOriginais.length === 1) {
      return dadosOriginais.map((item) => ({
        ...item,
        cluster: 0,
      }));
    }

    const dados = normalizarVetores(dadosOriginais);
    const quantidadeClusters = Math.min(4, dados.length);

    const dadosOrdenadosParaCentroides = [...dados].sort((a, b) => {
      const prioridade = (item: PerfilDoador) => {
        if (item.perfilPredominante === "Alimentos") return 1;
        if (item.perfilPredominante === "Limpeza") return 2;
        if (item.perfilPredominante === "Higiene") return 3;
        if (item.perfilPredominante === "Variado") return 4;
        return 5;
      };

      return prioridade(a) - prioridade(b);
    });

    let centroides = dadosOrdenadosParaCentroides
      .slice(0, quantidadeClusters)
      .map((item) => item.vetor);

    let dadosComCluster = dados.map((item) => ({
      ...item,
      cluster: 0,
    }));

    for (let repeticao = 0; repeticao < 15; repeticao++) {
      dadosComCluster = dados.map((item) => {
        let clusterMaisProximo = 0;
        let menorDistancia = calcularDistancia(item.vetor, centroides[0]);

        centroides.forEach((centroide, index) => {
          const distancia = calcularDistancia(item.vetor, centroide);

          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            clusterMaisProximo = index;
          }
        });

        return {
          ...item,
          cluster: clusterMaisProximo,
        };
      });

      centroides = centroides.map((centroide, index) => {
        const itensDoCluster = dadosComCluster.filter(
          (item) => item.cluster === index
        );

        if (itensDoCluster.length === 0) {
          return centroide;
        }

        return calcularMedia(itensDoCluster);
      });
    }

    return dadosOriginais.map((itemOriginal) => {
      const itemNormalizado = dadosComCluster.find(
        (item) => item.doadorId === itemOriginal.doadorId
      );

      return {
        ...itemOriginal,
        cluster: itemNormalizado?.cluster ?? 0,
      };
    });
  };

  const perfisDoadores = useMemo(() => montarPerfisDoadores(), [doacoes]);

  const resultadoKMeans = useMemo(
    () => aplicarKMeans(perfisDoadores),
    [perfisDoadores]
  );

  const grupos = useMemo(() => {
    const agrupamento: Record<number, PerfilDoador[]> = {};

    resultadoKMeans.forEach((perfil) => {
      const cluster = perfil.cluster ?? 0;

      if (!agrupamento[cluster]) {
        agrupamento[cluster] = [];
      }

      agrupamento[cluster].push(perfil);
    });

    return Object.entries(agrupamento).map(([cluster, itens]) => ({
      cluster: Number(cluster),
      itens,
    }));
  }, [resultadoKMeans]);

  const totalDoadores = perfisDoadores.length;
  const totalDoacoes = doacoes.length;

  const totalSimulados = doacoes.filter(
    (item) => item.dadoSimulado === true
  ).length;

  const totalAlimentos = perfisDoadores.reduce(
    (total, item) => total + item.totalAlimentos,
    0
  );

  const totalLimpeza = perfisDoadores.reduce(
    (total, item) => total + item.totalLimpeza,
    0
  );

  const totalHigiene = perfisDoadores.reduce(
    (total, item) => total + item.totalHigiene,
    0
  );

  const doadorMaisFrequente = [...perfisDoadores].sort(
    (a, b) => b.numeroDoacoes - a.numeroDoacoes
  )[0];

  const identificarPerfilGrupo = (itens: PerfilDoador[]) => {
    const alimentos = itens.reduce(
      (total, item) => total + item.totalAlimentos,
      0
    );

    const limpeza = itens.reduce(
      (total, item) => total + item.totalLimpeza,
      0
    );

    const higiene = itens.reduce(
      (total, item) => total + item.totalHigiene,
      0
    );

    const perfisVariados = itens.filter(
      (item) => item.perfilPredominante === "Variado"
    ).length;

    if (perfisVariados === itens.length) {
      return {
        titulo: "Doadores variados",
        descricao:
          "Grupo com doadores que contribuem com diferentes tipos de itens ao longo dos meses.",
        recomendacao:
          "Pode ser usado em campanhas gerais, quando a ONG precisa de vários tipos de produtos.",
        cor: colors.alerta,
        fundo: colors.alertaFundo,
      };
    }

    if (alimentos >= limpeza && alimentos >= higiene) {
      return {
        titulo: "Doadores de alimentos",
        descricao:
          "Grupo com maior concentração de doações de alimentos essenciais.",
        recomendacao:
          "Indicado para pedidos de arroz, feijão, óleo, leite, carne e massas.",
        cor: colors.sucesso,
        fundo: colors.sucessoFundo,
      };
    }

    if (limpeza >= alimentos && limpeza >= higiene) {
      return {
        titulo: "Doadores de limpeza",
        descricao:
          "Grupo com maior concentração de produtos de limpeza.",
        recomendacao:
          "Indicado para pedidos de detergente, sabão, desinfetante e água sanitária.",
        cor: colors.secundario,
        fundo: colors.secundarioClaro,
      };
    }

    return {
      titulo: "Doadores de higiene",
      descricao:
        "Grupo com maior concentração de itens de higiene pessoal.",
      recomendacao:
        "Indicado para pedidos de sabonete, pasta de dente, escova, absorvente e lenço umedecido.",
      cor: colors.principal,
      fundo: colors.principalClaro,
    };
  };

  const situacaoAnalise =
    perfisDoadores.length < 2
      ? "Dados insuficientes para clusterização"
      : "Clusterização disponível";

  const descricaoSituacao =
    perfisDoadores.length < 2
      ? "Cadastre ou insira pelo menos dois doadores com doações registradas."
      : "O sistema agrupou os doadores com base nos padrões das doações.";

  const LinhaResumo = ({
    titulo,
    valor,
    descricao,
    tipo = "neutro",
  }: {
    titulo: string;
    valor: number | string;
    descricao: string;
    tipo?: "neutro" | "sucesso" | "alerta" | "perigo" | "info";
  }) => {
    let corFundo = colors.card;
    let corBorda = colors.borda;
    let corNumero = colors.texto;

    if (tipo === "sucesso") {
      corFundo = colors.sucessoFundo;
      corBorda = colors.sucesso;
      corNumero = colors.sucesso;
    }

    if (tipo === "alerta") {
      corFundo = colors.alertaFundo;
      corBorda = colors.alerta;
      corNumero = colors.alerta;
    }

    if (tipo === "perigo") {
      corFundo = colors.perigoFundo;
      corBorda = colors.perigo;
      corNumero = colors.perigo;
    }

    if (tipo === "info") {
      corFundo = colors.secundarioClaro;
      corBorda = colors.secundario;
      corNumero = colors.secundario;
    }

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${titulo}. Valor: ${valor}. ${descricao}`}
        style={{
          backgroundColor: corFundo,
          borderWidth: 1,
          borderColor: corBorda,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 72,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              color: colors.texto,
              marginBottom: 2,
            }}
          >
            {titulo}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.textoSuave,
              lineHeight: 18,
            }}
          >
            {descricao}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            color: corNumero,
            minWidth: 70,
            textAlign: "right",
          }}
        >
          {valor}
        </Text>
      </View>
    );
  };

  const Bloco = ({
    titulo,
    descricao,
    children,
  }: {
    titulo: string;
    descricao?: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borda,
        marginBottom: 16,
      }}
    >
      <Text accessibilityRole="header" style={styles.subtitulo}>
        {titulo}
      </Text>

      {descricao && (
        <Text
          style={{
            color: colors.textoSuave,
            lineHeight: 20,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          {descricao}
        </Text>
      )}

      {children}
    </View>
  );

  const CardSituacao = () => {
    const temDados = perfisDoadores.length >= 2;

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${situacaoAnalise}. ${descricaoSituacao}`}
        style={{
          backgroundColor: temDados ? colors.sucessoFundo : colors.alertaFundo,
          borderWidth: 1,
          borderColor: temDados ? colors.sucesso : colors.alerta,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: colors.textoSuave,
            marginBottom: 6,
            fontWeight: "800",
          }}
        >
          Situação da análise
        </Text>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: colors.texto,
            marginBottom: 6,
          }}
        >
          {situacaoAnalise}
        </Text>

        <Text
          style={{
            color: colors.textoSuave,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {descricaoSituacao}
        </Text>
      </View>
    );
  };

  const CardDoador = ({ perfil }: { perfil: PerfilDoador }) => (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Doador ${perfil.nomeDoador}. Perfil predominante ${perfil.perfilPredominante}. Total de doações ${perfil.numeroDoacoes}. Quantidade total ${perfil.quantidadeTotal}.`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.borda,
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "900",
          color: colors.texto,
          marginBottom: 4,
        }}
      >
        {perfil.nomeDoador}
      </Text>

      <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
        Tipo: {perfil.tipoDoador}
      </Text>

      <Text
        style={{
          color: colors.texto,
          fontWeight: "800",
          marginTop: 8,
        }}
      >
        Perfil predominante: {perfil.perfilPredominante}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Doações registradas: {perfil.numeroDoacoes}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Quantidade total: {perfil.quantidadeTotal}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Alimentos: {perfil.totalAlimentos} • Limpeza: {perfil.totalLimpeza} •
        Higiene: {perfil.totalHigiene}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Variedade de categorias: {perfil.variedadeCategorias}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Meses com alimentos: {perfil.mesesComAlimentos}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Meses com limpeza: {perfil.mesesComLimpeza}
      </Text>

      <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
        Meses com higiene: {perfil.mesesComHigiene}
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: colors.textoSuave,
          lineHeight: 20,
        }}
      >
        Produtos doados: {perfil.produtos.join(", ")}
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: colors.textoSuave,
          lineHeight: 20,
        }}
      >
        Meses ativos:{" "}
        {perfil.mesesAtivos.length > 0
          ? perfil.mesesAtivos.map(formatarMesAno).join(", ")
          : "Sem data informada"}
      </Text>
    </View>
  );

  const CardGrupo = ({
    grupo,
  }: {
    grupo: {
      cluster: number;
      itens: PerfilDoador[];
    };
  }) => {
    const perfilGrupo = identificarPerfilGrupo(grupo.itens);

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${perfilGrupo.titulo}. ${perfilGrupo.descricao}. ${perfilGrupo.recomendacao}`}
        style={{
          backgroundColor: perfilGrupo.fundo,
          borderColor: perfilGrupo.cor,
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontSize: 19,
            fontWeight: "900",
            color: colors.texto,
            marginBottom: 6,
          }}
        >
          {perfilGrupo.titulo}
        </Text>

        <Text
          style={{
            color: colors.textoSuave,
            lineHeight: 22,
            marginBottom: 8,
          }}
        >
          {perfilGrupo.descricao}
        </Text>

        <Text
          style={{
            color: colors.texto,
            fontWeight: "800",
            lineHeight: 22,
            marginBottom: 10,
          }}
        >
          Recomendação: {perfilGrupo.recomendacao}
        </Text>

        <Text
          style={{
            color: colors.texto,
            fontWeight: "900",
            marginBottom: 4,
          }}
        >
          Doadores neste grupo:
        </Text>

        {grupo.itens.map((perfil) => (
          <CardDoador key={perfil.doadorId} perfil={perfil} />
        ))}
      </View>
    );
  };

  if (carregando) {
    return (
      <View
        style={[
          styles.container,
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.principal}
          accessibilityLabel="Carregando análise de inteligência artificial"
        />

        <Text style={{ marginTop: 10 }}>Carregando análise...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 32,
      }}
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        Análise IA
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Agrupamento de perfis de doadores usando K-Means.
      </Text>

      <CardSituacao />

      {perfisDoadores.length < 2 ? (
        <Text style={styles.listaVazia}>
          Ainda não há doadores suficientes para gerar a clusterização. Insira
          dados simulados ou cadastre novas doações.
        </Text>
      ) : (
        <>
          <Bloco
            titulo="Resumo da base analisada"
            descricao="Dados usados para formar os grupos de perfis de doação."
          >
            <LinhaResumo
              titulo="Doadores analisados"
              valor={totalDoadores}
              descricao="Doadores com registros na base"
              tipo="info"
            />

            <LinhaResumo
              titulo="Doações registradas"
              valor={totalDoacoes}
              descricao="Total de doações consideradas"
              tipo="info"
            />

            <LinhaResumo
              titulo="Dados fictícios"
              valor={totalSimulados}
              descricao="Registros simulados usados para teste"
              tipo={totalSimulados > 0 ? "alerta" : "info"}
            />

            <LinhaResumo
              titulo="Total em alimentos"
              valor={totalAlimentos}
              descricao="Itens classificados como alimentos"
              tipo={totalAlimentos > 0 ? "sucesso" : "info"}
            />

            <LinhaResumo
              titulo="Total em limpeza"
              valor={totalLimpeza}
              descricao="Itens classificados como limpeza"
              tipo={totalLimpeza > 0 ? "alerta" : "info"}
            />

            <LinhaResumo
              titulo="Total em higiene"
              valor={totalHigiene}
              descricao="Itens classificados como higiene pessoal"
              tipo={totalHigiene > 0 ? "sucesso" : "info"}
            />

            {doadorMaisFrequente && (
              <LinhaResumo
                titulo="Doador mais frequente"
                valor={doadorMaisFrequente.nomeDoador}
                descricao={`${doadorMaisFrequente.numeroDoacoes} doação(ões) registradas`}
                tipo="neutro"
              />
            )}
          </Bloco>

          <Bloco
            titulo="Grupos encontrados"
            descricao="O K-Means agrupou doadores com comportamentos parecidos."
          >
            {grupos.map((grupo) => (
              <CardGrupo key={grupo.cluster} grupo={grupo} />
            ))}
          </Bloco>

          <Bloco
            titulo="Como interpretar"
            descricao="Tradução prática do resultado para a rotina da ONG."
          >
            <Text
              style={{
                color: colors.textoSuave,
                lineHeight: 22,
                fontSize: 15,
              }}
            >
              A clusterização mostra quais doadores possuem padrões parecidos.
              Com isso, a ONG pode direcionar melhor seus pedidos: alimentos
              para quem costuma doar alimentos, limpeza para quem doa produtos
              de limpeza e higiene para quem tem histórico de doações desse
              tipo.
            </Text>
          </Bloco>

          <Bloco
            titulo="Técnica utilizada"
            descricao="Explicação resumida para apresentação e relatório."
          >
            <Text
              style={{
                color: colors.textoSuave,
                lineHeight: 22,
                fontSize: 15,
              }}
            >
              Foi utilizado o algoritmo K-Means, uma técnica de aprendizagem não
              supervisionada. Antes da clusterização, o sistema classifica cada
              item em Alimentos, Limpeza ou Higiene com base na categoria
              cadastrada. Depois, cada doador é transformado em um vetor numérico
              com quantidade por tipo, frequência, variedade e meses de doação.
              Por fim, o K-Means agrupa doadores com comportamento semelhante.
            </Text>
          </Bloco>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}