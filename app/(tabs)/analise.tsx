import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/globalStyles";

type Doacao = {
  id: string;
  nomeDoador?: string;
  categoriaGeral?: string;
  categoria?: string;
  produto?: string;
  nome?: string;
  quantidade?: number | string;
  tipoQuantidade?: string;
  unidade?: string;
  origem?: string;
  data?: any;
  mes?: string;
  ano?: string;
  dadoSimulado?: boolean;
};

type ItemParaApi = {
  nome: string;
  categoria: string;
  categoriaGeral: string;
  quantidade: number;
  unidade: string;
  origem: string;
  doadorId: string;
  nomeDoador: string;
  cidade: string;
  contato: string;
  mes: string;
  ano: string;
  dataEntrada: string;
};

type ClusterApi = {
  grupo: number;
  perfil: string;
  categorias: string[];
  quantidade_total: number;
  quantidade_media: number;
  frequencia: number;
  recomendacao: string;
};

type ResultadoApi = {
  total_registros: number;
  total_grupos: number;
  clusters: ClusterApi[];
};

const API_KMEANS_URL =
  "https://bitstorage-kmeans-api-axhrcdfahne6ebae.eastus-01.azurewebsites.net/api/analisar-doacoes";

const categoriasAlimentos = [
  "Grãos e cereais",
  "Graos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Carnes e proteinas",
  "Hortifruti",
  "Bebidas",
];

const normalizarQuantidade = (valor: number | string | undefined) => {
  if (valor === undefined || valor === null || valor === "") return 0;

  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  const valorConvertido = Number(String(valor).replace(",", "."));

  return Number.isFinite(valorConvertido) ? valorConvertido : 0;
};

const definirCategoriaGeral = (categoriaInformada?: string) => {
  const categoria = String(categoriaInformada || "").trim();

  if (categoriasAlimentos.includes(categoria)) return "Alimentos";
  if (categoria === "Produtos de limpeza") return "Limpeza";
  if (categoria === "Higiene pessoal") return "Higiene";

  return "Outros";
};

export default function AnaliseIA() {
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);
  const [resultadoApi, setResultadoApi] = useState<ResultadoApi | null>(null);
  const [erroApi, setErroApi] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setTipoUsuario("");
        setCarregandoPerfil(false);
        return;
      }

      try {
        const usuarioSnap = await getDoc(doc(db, "usuarios", usuario.uid));
        const dados = usuarioSnap.exists() ? usuarioSnap.data() : null;
        setTipoUsuario(String(dados?.tipoUsuario || "").toLowerCase());
      } catch (error) {
        console.log(error);
        setTipoUsuario("");
      } finally {
        setCarregandoPerfil(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (carregandoPerfil) return;

    if (tipoUsuario !== "administrador") {
      setCarregandoBase(false);
      return;
    }

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
        setCarregandoBase(false);
      },
      (error) => {
        console.log(error);
        setErroApi("Não foi possível carregar os dados de doações.");
        setCarregandoBase(false);
      }
    );

    return () => unsubscribe();
  }, [carregandoPerfil, tipoUsuario]);

  const itensParaApi = useMemo<ItemParaApi[]>(() => {
    return doacoes
      .map((doacao) => {
        const categoria = doacao.categoria || "Categoria não informada";
        const dataBruta = doacao.data;
        const dataConvertida =
          typeof dataBruta?.toDate === "function"
            ? dataBruta.toDate()
            : dataBruta
              ? new Date(dataBruta)
              : null;

        return {
          nome: doacao.produto || doacao.nome || "Item não informado",
          categoria,
          categoriaGeral: doacao.categoriaGeral || definirCategoriaGeral(categoria),
          quantidade: normalizarQuantidade(doacao.quantidade),
          unidade: doacao.tipoQuantidade || doacao.unidade || "unidades",
          origem: doacao.origem || "doacao",
          doadorId: doacao.doadorId || "",
          nomeDoador: doacao.nomeDoador || "Doador não informado",
          cidade: doacao.cidade || "Cidade não informada",
          contato: doacao.contato || "Contato não informado",
          mes:
            doacao.mes ||
            (dataConvertida && !Number.isNaN(dataConvertida.getTime())
              ? String(dataConvertida.getMonth() + 1).padStart(2, "0")
              : ""),
          ano:
            doacao.ano ||
            (dataConvertida && !Number.isNaN(dataConvertida.getTime())
              ? String(dataConvertida.getFullYear())
              : ""),
          dataEntrada:
            dataConvertida && !Number.isNaN(dataConvertida.getTime())
              ? dataConvertida.toISOString()
              : "",
        };
      })
      .filter((item) => item.quantidade > 0);
  }, [doacoes]);

  const totalSimulados = doacoes.filter(
    (item) => item.dadoSimulado === true
  ).length;

  const totalAlimentos = itensParaApi
    .filter((item) => definirCategoriaGeral(item.categoria) === "Alimentos")
    .reduce((total, item) => total + item.quantidade, 0);

  const totalLimpeza = itensParaApi
    .filter((item) => definirCategoriaGeral(item.categoria) === "Limpeza")
    .reduce((total, item) => total + item.quantidade, 0);

  const totalHigiene = itensParaApi
    .filter((item) => definirCategoriaGeral(item.categoria) === "Higiene")
    .reduce((total, item) => total + item.quantidade, 0);

  const executarAnalise = async () => {
    if (itensParaApi.length === 0) {
      setResultadoApi(null);
      setErroApi(
        "Ainda não há dados suficientes para enviar à API. Insira dados simulados ou registre doações."
      );
      return;
    }

    try {
      setCarregandoAnalise(true);
      setErroApi("");

      const resposta = await fetch(API_KMEANS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itensParaApi),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.erro || dados?.detalhes || "Erro ao executar a análise."
        );
      }

      setResultadoApi(dados as ResultadoApi);
    } catch (error: any) {
      console.log(error);
      setResultadoApi(null);
      setErroApi(
        error?.message ||
          "Não foi possível conectar com a API de K-Means no Azure."
      );
    } finally {
      setCarregandoAnalise(false);
    }
  };

  useEffect(() => {
    if (!carregandoBase && itensParaApi.length > 0) {
      executarAnalise();
    }
  }, [carregandoBase, itensParaApi.length]);

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
    const temResultado = !!resultadoApi && resultadoApi.clusters.length > 0;
    const estaComErro = !!erroApi;

    let titulo = "API em nuvem pronta para análise";
    let descricao =
      "Os dados cadastrados no aplicativo são enviados para uma API em Python hospedada no Microsoft Azure.";
    let fundo = colors.secundarioClaro;
    let borda = colors.secundario;

    if (carregandoAnalise) {
      titulo = "Analisando dados no Azure";
      descricao = "A API está processando os dados com o algoritmo K-Means.";
      fundo = colors.alertaFundo;
      borda = colors.alerta;
    } else if (temResultado) {
      titulo = "Clusterização gerada no Azure";
      descricao =
        "A API retornou os grupos de doações e recomendações para apoio à decisão.";
      fundo = colors.sucessoFundo;
      borda = colors.sucesso;
    } else if (estaComErro) {
      titulo = "Análise indisponível no momento";
      descricao = erroApi;
      fundo = colors.perigoFundo;
      borda = colors.perigo;
    }

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${titulo}. ${descricao}`}
        style={{
          backgroundColor: fundo,
          borderWidth: 1,
          borderColor: borda,
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
          {titulo}
        </Text>

        <Text
          style={{
            color: colors.textoSuave,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {descricao}
        </Text>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Atualizar análise de inteligência artificial"
          onPress={executarAnalise}
          disabled={carregandoAnalise}
          style={{
            marginTop: 14,
            backgroundColor: carregandoAnalise
              ? colors.textoSuave
              : colors.principal,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.textoClaro,
              fontWeight: "900",
              fontSize: 15,
            }}
          >
            {carregandoAnalise ? "Analisando..." : "Atualizar análise"}
          </Text>
        </Pressable>
      </View>
    );
  };

  const CardCluster = ({ cluster }: { cluster: ClusterApi }) => (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Grupo ${cluster.grupo}. ${cluster.perfil}. ${cluster.recomendacao}`}
      style={{
        backgroundColor:
          cluster.quantidade_media < 10
            ? colors.alertaFundo
            : colors.sucessoFundo,
        borderColor:
          cluster.quantidade_media < 10 ? colors.alerta : colors.sucesso,
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
        Grupo {cluster.grupo} — {cluster.perfil}
      </Text>

      <Text
        style={{
          color: colors.textoSuave,
          lineHeight: 22,
          marginBottom: 8,
        }}
      >
        Categorias agrupadas: {cluster.categorias.join(", ")}
      </Text>

      <Text style={{ color: colors.textoSuave, marginBottom: 4 }}>
        Quantidade total: {cluster.quantidade_total}
      </Text>

      <Text style={{ color: colors.textoSuave, marginBottom: 4 }}>
        Quantidade média: {cluster.quantidade_media}
      </Text>

      <Text style={{ color: colors.textoSuave, marginBottom: 10 }}>
        Frequência de registros: {cluster.frequencia}
      </Text>

      <Text
        style={{
          color: colors.texto,
          fontWeight: "800",
          lineHeight: 22,
        }}
      >
        Recomendação: {cluster.recomendacao}
      </Text>
    </View>
  );

  if (carregandoPerfil || carregandoBase) {
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
          accessibilityLabel="Carregando dados para análise"
        />

        <Text style={{ marginTop: 10 }}>Carregando dados...</Text>
      </View>
    );
  }

  if (tipoUsuario !== "administrador") {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Acesso restrito
        </Text>

        <Text style={styles.subtituloPrincipal}>
          Somente administradores podem acessar a Análise IA.
        </Text>
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
        Agrupamento de doações usando K-Means em uma API hospedada no Azure.
      </Text>

      <CardSituacao />

      {itensParaApi.length === 0 ? (
        <Text style={styles.listaVazia}>
          Ainda não há dados suficientes para gerar a análise. Insira dados
          simulados ou cadastre novas doações.
        </Text>
      ) : (
        <>
          <Bloco
            titulo="Resumo da base enviada"
            descricao="Dados do aplicativo enviados para a API de Machine Learning."
          >
            <LinhaResumo
              titulo="Registros enviados"
              valor={itensParaApi.length}
              descricao="Itens considerados na análise"
              tipo="info"
            />

            <LinhaResumo
              titulo="Grupos retornados"
              valor={resultadoApi?.total_grupos || 0}
              descricao="Clusters calculados pela API"
              tipo={resultadoApi ? "sucesso" : "info"}
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
          </Bloco>

          <Bloco
            titulo="Grupos encontrados"
            descricao="Resultado retornado pela API em Python publicada no Microsoft Azure."
          >
            {carregandoAnalise && (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <ActivityIndicator size="large" color={colors.principal} />
                <Text style={{ marginTop: 10, color: colors.textoSuave }}>
                  Processando K-Means na nuvem...
                </Text>
              </View>
            )}

            {!carregandoAnalise && resultadoApi?.clusters?.length ? (
              resultadoApi.clusters.map((cluster) => (
                <CardCluster key={cluster.grupo} cluster={cluster} />
              ))
            ) : null}

            {!carregandoAnalise && !resultadoApi && erroApi ? (
              <Text style={styles.listaVazia}>{erroApi}</Text>
            ) : null}
          </Bloco>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
