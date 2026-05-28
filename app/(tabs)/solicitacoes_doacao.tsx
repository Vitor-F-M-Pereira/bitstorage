import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CampoSelecao from "../../components/CampoSelecao";
import { db } from "../../services/firebaseConfig";
import { colors, shadows } from "../../styles/globalStyles";

type StatusDoacao =
  | "pendente"
  | "em_contato"
  | "confirmado"
  | "recebido"
  | "cancelado";

type IntencaoDoacao = {
  id: string;
  protocolo?: string;

  nomeDoador: string;
  contato: string;
  contatoOriginal?: string;

  item: string;
  produto?: string;
  nomeProduto?: string;

  categoria?: string;
  categoriaGeral?: string;

  quantidade: number | string;
  quantidadeTexto?: string;
  tipoQuantidade?: string;

  validade?: string | null;
  validadeData?: any;

  observacao?: string | null;

  status: StatusDoacao;
  origem?: string;

  criadoEm?: any;
  atualizadoEm?: any;
  recebidoEm?: any;

  estoqueRegistrado?: boolean;
};

const statusConfig: Record<
  StatusDoacao,
  {
    label: string;
    descricao: string;
  }
> = {
  pendente: {
    label: "Pendente",
    descricao: "Aguardando análise do administrador",
  },
  em_contato: {
    label: "Em contato",
    descricao: "A ONG já iniciou contato com o doador",
  },
  confirmado: {
    label: "Confirmado",
    descricao: "A doação foi combinada, mas ainda não recebida",
  },
  recebido: {
    label: "Recebido",
    descricao: "A doação já entrou no estoque",
  },
  cancelado: {
    label: "Cancelado",
    descricao: "A intenção foi recusada ou não aconteceu",
  },
};

const filtros = [
  { id: "todos", label: "Todos" },
  { id: "pendente", label: "Pendentes" },
  { id: "em_contato", label: "Em contato" },
  { id: "confirmado", label: "Confirmados" },
  { id: "recebido", label: "Recebidos" },
  { id: "cancelado", label: "Cancelados" },
];

const categoriasPorGrupo = {
  Alimentos: [
    "Grãos e cereais",
    "Massas",
    "Enlatados e conservas",
    "Leites e derivados",
    "Carnes e proteínas",
    "Hortifruti",
    "Bebidas",
  ],
  Limpeza: ["Produtos de limpeza"],
  Higiene: ["Higiene pessoal"],
  Outros: ["Outros"],
};

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarTelefone(valor?: string) {
  if (!valor) return "Não informado";

  const somenteNumeros = String(valor).replace(/\D/g, "");

  if (somenteNumeros.length === 11) {
    return `(${somenteNumeros.slice(0, 2)}) ${somenteNumeros.slice(
      2,
      7,
    )}-${somenteNumeros.slice(7)}`;
  }

  if (somenteNumeros.length === 10) {
    return `(${somenteNumeros.slice(0, 2)}) ${somenteNumeros.slice(
      2,
      6,
    )}-${somenteNumeros.slice(6)}`;
  }

  return valor;
}

function formatarDataFirestore(data: any) {
  if (!data) return "Data não informada";

  try {
    const dataConvertida =
      typeof data.toDate === "function" ? data.toDate() : new Date(data);

    return dataConvertida.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Data não informada";
  }
}

function converterDataBrasileira(data: string) {
  if (!data) return null;

  const partes = String(data).split("/");
  if (partes.length !== 3) return null;

  const dia = Number(partes[0]);
  const mes = Number(partes[1]);
  const ano = Number(partes[2]);

  if (
    !dia ||
    !mes ||
    !ano ||
    dia < 1 ||
    dia > 31 ||
    mes < 1 ||
    mes > 12 ||
    ano < 2024
  ) {
    return null;
  }

  const dataConvertida = new Date(ano, mes - 1, dia);

  if (
    dataConvertida.getDate() !== dia ||
    dataConvertida.getMonth() !== mes - 1 ||
    dataConvertida.getFullYear() !== ano
  ) {
    return null;
  }

  return dataConvertida;
}

function gerarIdDoador(nomeInformado: string) {
  return (
    String(nomeInformado || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "doador-nao-informado"
  );
}

function obterProduto(solicitacao: IntencaoDoacao) {
  return (
    String(
      solicitacao.produto || solicitacao.nomeProduto || solicitacao.item || "",
    ).trim() || "Produto não informado"
  );
}

function obterQuantidadeNumerica(solicitacao: IntencaoDoacao) {
  const valor = String(
    solicitacao.quantidade || solicitacao.quantidadeTexto || "0",
  )
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return 1;
  }

  return numero;
}

function formatarQuantidade(solicitacao: IntencaoDoacao) {
  const quantidade =
    solicitacao.quantidadeTexto ||
    String(solicitacao.quantidade || "Quantidade não informada");

  const tipoQuantidade = solicitacao.tipoQuantidade || "";

  return `${quantidade}${tipoQuantidade ? ` ${tipoQuantidade}` : ""}`;
}

function getStatusStyle(status: StatusDoacao) {
  switch (status) {
    case "pendente":
      return {
        fundo: colors.alertaFundo,
        texto: colors.alerta,
        borda: colors.alerta,
      };

    case "em_contato":
      return {
        fundo: colors.informacaoFundo,
        texto: colors.informacao,
        borda: colors.informacao,
      };

    case "confirmado":
      return {
        fundo: colors.sucessoFundo,
        texto: colors.sucesso,
        borda: colors.bordaForte,
      };

    case "recebido":
      return {
        fundo: colors.informacaoFundo,
        texto: colors.informacao,
        borda: colors.bordaForte,
      };

    case "cancelado":
      return {
        fundo: colors.perigoFundo,
        texto: colors.perigo,
        borda: colors.perigo,
      };

    default:
      return {
        fundo: colors.cinza,
        texto: colors.textoMedio,
        borda: colors.borda,
      };
  }
}

export default function SolicitacoesDoacaoScreen() {
  const [solicitacoes, setSolicitacoes] = useState<IntencaoDoacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [filtroAtual, setFiltroAtual] = useState("todos");
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] =
    useState<IntencaoDoacao | null>(null);

  const [modalRecebimentoAberto, setModalRecebimentoAberto] = useState(false);
  const [solicitacaoRecebimento, setSolicitacaoRecebimento] =
    useState<IntencaoDoacao | null>(null);
  const [categoriaGeralRecebimento, setCategoriaGeralRecebimento] =
    useState("Alimentos");
  const [categoriaRecebimento, setCategoriaRecebimento] =
    useState("Grãos e cereais");

  useEffect(() => {
    const referencia = query(
      collection(db, "intencoes_doacao"),
      orderBy("criadoEm", "desc"),
    );

    const unsubscribe = onSnapshot(
      referencia,
      (snapshot) => {
        const lista = snapshot.docs.map((documento) => {
          const dados = documento.data() as any;

          const produto =
            dados.produto ||
            dados.nomeProduto ||
            dados.item ||
            "Produto não informado";

          return {
            id: documento.id,
            protocolo: dados.protocolo,

            nomeDoador: dados.nomeDoador || "Doador não informado",
            contato: dados.contato || "",
            contatoOriginal: dados.contatoOriginal || "",

            item: produto,
            produto,
            nomeProduto: produto,

            categoria: dados.categoria || "Outros",
            categoriaGeral: dados.categoriaGeral || "Alimentos",

            quantidade:
              dados.quantidade ||
              dados.quantidadeTexto ||
              "Quantidade não informada",
            quantidadeTexto:
              dados.quantidadeTexto || String(dados.quantidade || ""),
            tipoQuantidade: dados.tipoQuantidade || "unidades",

            validade: dados.validade || null,
            validadeData: dados.validadeData || null,

            observacao: dados.observacao || null,

            status: dados.status || "pendente",
            origem: dados.origem,

            criadoEm: dados.criadoEm,
            atualizadoEm: dados.atualizadoEm,
            recebidoEm: dados.recebidoEm,

            estoqueRegistrado: dados.estoqueRegistrado || false,
          };
        });

        setSolicitacoes(lista);
        setCarregando(false);
      },
      (error) => {
        console.error("Erro ao carregar solicitações de doação:", error);

        Alert.alert(
          "Erro",
          "Não foi possível carregar as solicitações de doação.",
        );

        setCarregando(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const solicitacoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return solicitacoes.filter((solicitacao) => {
      const passaFiltro =
        filtroAtual === "todos" || solicitacao.status === filtroAtual;

      const textoBusca = normalizarTexto(
        `${solicitacao.nomeDoador} ${obterProduto(solicitacao)} ${
          solicitacao.categoria
        } ${solicitacao.contato}`,
      );

      const passaBusca = termo.length === 0 || textoBusca.includes(termo);

      return passaFiltro && passaBusca;
    });
  }, [solicitacoes, filtroAtual, busca]);

  const resumo = useMemo(() => {
    return {
      total: solicitacoes.length,
      pendentes: solicitacoes.filter((item) => item.status === "pendente")
        .length,
      confirmadas: solicitacoes.filter((item) => item.status === "confirmado")
        .length,
      recebidas: solicitacoes.filter((item) => item.status === "recebido")
        .length,
    };
  }, [solicitacoes]);

  const abrirDetalhes = (solicitacao: IntencaoDoacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setModalAberto(true);
  };

  const fecharDetalhes = () => {
    setModalAberto(false);
    setSolicitacaoSelecionada(null);
  };

  const selecionarCategoriaGeralRecebimento = (grupo: string) => {
    const categorias = categoriasPorGrupo[
      grupo as keyof typeof categoriasPorGrupo
    ] || ["Outros"];

    setCategoriaGeralRecebimento(grupo);
    setCategoriaRecebimento(categorias[0]);
  };

  const fecharModalRecebimento = () => {
    setModalRecebimentoAberto(false);
    setSolicitacaoRecebimento(null);
    setCategoriaGeralRecebimento("Alimentos");
    setCategoriaRecebimento("Grãos e cereais");
  };

  const alterarStatus = async (
    solicitacao: IntencaoDoacao,
    novoStatus: StatusDoacao,
  ) => {
    if (solicitacao.status === "recebido") {
      Alert.alert(
        "Atenção",
        "Esta doação já foi recebida e registrada no estoque.",
      );
      return;
    }

    if (novoStatus === "recebido") {
      confirmarRecebimento(solicitacao);
      return;
    }

    try {
      setProcessandoId(solicitacao.id);

      await updateDoc(doc(db, "intencoes_doacao", solicitacao.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });

      if (solicitacaoSelecionada?.id === solicitacao.id) {
        setSolicitacaoSelecionada({
          ...solicitacao,
          status: novoStatus,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      Alert.alert(
        "Erro",
        "Não foi possível atualizar o status da solicitação.",
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const confirmarRecebimento = (solicitacao: IntencaoDoacao) => {
    if (solicitacao.estoqueRegistrado) {
      Alert.alert(
        "Doação já registrada",
        "Esta doação já foi marcada como recebida anteriormente.",
      );
      return;
    }

    const categoriaGeralSugerida =
      solicitacao.categoriaGeral &&
      categoriasPorGrupo[
        solicitacao.categoriaGeral as keyof typeof categoriasPorGrupo
      ]
        ? solicitacao.categoriaGeral
        : "Alimentos";

    const categoriasSugeridas =
      categoriasPorGrupo[
        categoriaGeralSugerida as keyof typeof categoriasPorGrupo
      ] || categoriasPorGrupo.Alimentos;

    const categoriaSugerida = categoriasSugeridas.includes(
      String(solicitacao.categoria || ""),
    )
      ? String(solicitacao.categoria)
      : categoriasSugeridas[0];

    setSolicitacaoRecebimento(solicitacao);
    setCategoriaGeralRecebimento(categoriaGeralSugerida);
    setCategoriaRecebimento(categoriaSugerida);
    setModalRecebimentoAberto(true);
  };

  const receberDoacao = async (
    solicitacao: IntencaoDoacao,
    categoriaGeralSelecionada: string,
    categoriaSelecionada: string,
  ) => {
    try {
      setProcessandoId(solicitacao.id);

      const dataRegistro = new Date();

      const produto = obterProduto(solicitacao);
      const quantidadeFinal = obterQuantidadeNumerica(solicitacao);
      const tipoQuantidade = solicitacao.tipoQuantidade || "unidades";

      const validade = String(solicitacao.validade || "").trim();
      const validadeData = validade ? converterDataBrasileira(validade) : null;

      const categoriaGeral = categoriaGeralSelecionada || "Alimentos";
      const categoria = categoriaSelecionada || "Outros";

      const nomeDoador =
        String(solicitacao.nomeDoador || "").trim() || "Doador não informado";

      const contatoDoador =
        String(
          solicitacao.contatoOriginal || solicitacao.contato || "",
        ).trim() || "Não informado";

      const doadorId = gerarIdDoador(nomeDoador || contatoDoador);

      const observacaoFinal =
        String(solicitacao.observacao || "").trim() ||
        "Doação recebida pelo formulário público.";

      const batch = writeBatch(db);

      const alimentoRef = doc(collection(db, "alimentos"));

      batch.set(alimentoRef, {
        nome: produto,
        categoria,
        categoriaGeral,

        quantidade: quantidadeFinal,
        tipoQuantidade,

        validade,
        validadeData,

        origem: "Doação",
        detalheOrigem: nomeDoador,
        precoCompra: 0,

        doadorId,
        nomeDoador,
        tipoDoador: "Pessoa física",
        cidadeDoador: "Não informada",
        contatoDoador,

        observacao: observacaoFinal,

        criadoEm: dataRegistro,
        atualizadoEm: dataRegistro,
      });

      const movimentacaoRef = doc(collection(db, "movimentacoes"));

      batch.set(movimentacaoRef, {
        produtoId: alimentoRef.id,
        nomeProduto: produto,

        categoria,
        categoriaGeral,

        tipo: "entrada",
        origem: "Doação",
        detalheOrigem: nomeDoador,

        quantidade: quantidadeFinal,
        quantidadeAnterior: 0,
        quantidadeAtual: quantidadeFinal,
        tipoQuantidade,

        precoCompra: 0,

        doadorId,
        nomeDoador,
        tipoDoador: "Pessoa física",

        observacao: observacaoFinal,

        data: dataRegistro,
        mes: String(dataRegistro.getMonth() + 1).padStart(2, "0"),
        ano: String(dataRegistro.getFullYear()),
      });

      const doacaoRef = doc(collection(db, "doacoes"));

      batch.set(doacaoRef, {
        doadorId,
        nomeDoador,
        tipoDoador: "Pessoa física",
        cidade: "Não informada",
        contato: contatoDoador,

        produto,
        categoriaGeral,
        categoria,

        quantidade: quantidadeFinal,
        tipoQuantidade,

        alimentoId: alimentoRef.id,
        origem: "Doação",

        data: dataRegistro,
        mes: String(dataRegistro.getMonth() + 1).padStart(2, "0"),
        ano: String(dataRegistro.getFullYear()),

        criadoEm: dataRegistro,
        dadoSimulado: false,
        intencaoDoacaoId: solicitacao.id,
      });

      const doadorRef = doc(db, "doadores", doadorId);

      batch.set(
        doadorRef,
        {
          nome: nomeDoador,
          tipoDoador: "Pessoa física",
          cidade: "Não informada",
          contato: contatoDoador,
          atualizadoEm: dataRegistro,
          criadoEm: dataRegistro,
        },
        { merge: true },
      );

      const intencaoRef = doc(db, "intencoes_doacao", solicitacao.id);

      batch.update(intencaoRef, {
        status: "recebido",
        estoqueRegistrado: true,
        recebidoEm: dataRegistro,
        atualizadoEm: dataRegistro,
        alimentoId: alimentoRef.id,
        doacaoId: doacaoRef.id,
        movimentacaoId: movimentacaoRef.id,
      });

      await batch.commit();

      Alert.alert(
        "Doação recebida",
        "A doação foi registrada no estoque, no histórico e na base da Análise IA.",
      );

      fecharDetalhes();
      fecharModalRecebimento();
    } catch (error) {
      console.error("Erro ao receber doação:", error);

      Alert.alert(
        "Erro",
        "Não foi possível registrar esta doação no estoque. Verifique as regras do Firebase e tente novamente.",
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const abrirWhatsApp = (contato: string) => {
    const telefone = String(contato || "").replace(/\D/g, "");

    if (!telefone) {
      Alert.alert("Contato indisponível", "Este doador não informou telefone.");
      return;
    }

    const mensagem = encodeURIComponent(
      "Olá! Somos da ONG Casa da Criança. Recebemos sua intenção de doação pelo BitStorage e gostaríamos de confirmar algumas informações.",
    );

    const url = `https://wa.me/55${telefone}?text=${mensagem}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Erro",
        "Não foi possível abrir o WhatsApp neste dispositivo.",
      );
    });
  };

  const renderSolicitacao = ({ item }: { item: IntencaoDoacao }) => {
    const statusStyle = getStatusStyle(item.status);
    const processando = processandoId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => abrirDetalhes(item)}
      >
        <View style={styles.cardTopo}>
          <View style={styles.cardTituloArea}>
            <Text style={styles.itemNome}>{obterProduto(item)}</Text>
            <Text style={styles.doadorNome}>{item.nomeDoador}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.fundo,
                borderColor: statusStyle.borda,
              },
            ]}
          >
            <Text style={[styles.statusTexto, { color: statusStyle.texto }]}>
              {statusConfig[item.status].label}
            </Text>
          </View>
        </View>

        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Quantidade</Text>
          <Text style={styles.infoValor}>{formatarQuantidade(item)}</Text>
        </View>

        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Contato</Text>
          <Text style={styles.infoValor}>
            {formatarTelefone(item.contatoOriginal || item.contato)}
          </Text>
        </View>

        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Enviado em</Text>
          <Text style={styles.infoValor}>
            {formatarDataFirestore(item.criadoEm)}
          </Text>
        </View>

        <View style={styles.acoesRapidas}>
          {item.status === "pendente" && (
            <TouchableOpacity
              style={styles.botaoSecundario}
              disabled={processando}
              onPress={() => alterarStatus(item, "em_contato")}
            >
              <Text style={styles.botaoSecundarioTexto}>
                {processando ? "Aguarde..." : "Em contato"}
              </Text>
            </TouchableOpacity>
          )}

          {item.status === "em_contato" && (
            <TouchableOpacity
              style={styles.botaoSecundario}
              disabled={processando}
              onPress={() => alterarStatus(item, "confirmado")}
            >
              <Text style={styles.botaoSecundarioTexto}>
                {processando ? "Aguarde..." : "Confirmar"}
              </Text>
            </TouchableOpacity>
          )}

          {item.status === "confirmado" && (
            <TouchableOpacity
              style={styles.botaoPrincipal}
              disabled={processando}
              onPress={() => confirmarRecebimento(item)}
            >
              <Text style={styles.botaoPrincipalTexto}>
                {processando ? "Registrando..." : "Receber"}
              </Text>
            </TouchableOpacity>
          )}

          {item.status !== "recebido" && item.status !== "cancelado" && (
            <TouchableOpacity
              style={styles.botaoPerigo}
              disabled={processando}
              onPress={() => alterarStatus(item, "cancelado")}
            >
              <Text style={styles.botaoPerigoTexto}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderVazio = () => {
    if (carregando) {
      return (
        <View style={styles.estadoContainer}>
          <ActivityIndicator size="large" color={colors.principal} />
          <Text style={styles.estadoTexto}>Carregando solicitações...</Text>
        </View>
      );
    }

    return (
      <View style={styles.estadoContainer}>
        <Text style={styles.estadoTitulo}>Nenhuma solicitação encontrada</Text>
        <Text style={styles.estadoTexto}>
          Quando um doador preencher o formulário público, a solicitação
          aparecerá aqui.
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Solicitações de Doação</Text>
        <Text style={styles.subtitulo}>
          Acompanhe as intenções enviadas pelos doadores e registre no estoque
          apenas quando a doação for realmente recebida.
        </Text>
      </View>

      <View style={styles.resumoContainer}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>{resumo.total}</Text>
          <Text style={styles.resumoLabel}>Total</Text>
        </View>

        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>{resumo.pendentes}</Text>
          <Text style={styles.resumoLabel}>Pendentes</Text>
        </View>

        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>{resumo.confirmadas}</Text>
          <Text style={styles.resumoLabel}>Confirmadas</Text>
        </View>

        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>{resumo.recebidas}</Text>
          <Text style={styles.resumoLabel}>Recebidas</Text>
        </View>
      </View>

      <TextInput
        style={styles.campoBusca}
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar por doador, item ou contato..."
        placeholderTextColor={colors.textoSuave}
      />

      <View style={styles.filtrosArea}>
        <CampoSelecao
          label="Filtrar solicitações"
          value={filtroAtual}
          onChange={setFiltroAtual}
          options={filtros.map((filtro) => ({
            label: filtro.label,
            value: filtro.id,
          }))}
        />
      </View>

      <FlatList
        data={solicitacoesFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderSolicitacao}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={renderVazio}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={modalAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharDetalhes}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {solicitacaoSelecionada && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>
                    {obterProduto(solicitacaoSelecionada)}
                  </Text>

                  <TouchableOpacity
                    style={styles.modalFechar}
                    onPress={fecharDetalhes}
                  >
                    <Text style={styles.modalFecharTexto}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalDescricao}>
                    {statusConfig[solicitacaoSelecionada.status].descricao}
                  </Text>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Doador</Text>
                    <Text style={styles.detalheValor}>
                      {solicitacaoSelecionada.nomeDoador}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Contato</Text>
                    <Text style={styles.detalheValor}>
                      {formatarTelefone(
                        solicitacaoSelecionada.contatoOriginal ||
                          solicitacaoSelecionada.contato,
                      )}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Quantidade</Text>
                    <Text style={styles.detalheValor}>
                      {formatarQuantidade(solicitacaoSelecionada)}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Validade</Text>
                    <Text style={styles.detalheValor}>
                      {solicitacaoSelecionada.validade ||
                        "Não informada pelo doador"}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Observação</Text>
                    <Text style={styles.detalheValor}>
                      {solicitacaoSelecionada.observacao ||
                        "Nenhuma observação informada"}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Data de envio</Text>
                    <Text style={styles.detalheValor}>
                      {formatarDataFirestore(solicitacaoSelecionada.criadoEm)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.botaoWhatsApp}
                    onPress={() =>
                      abrirWhatsApp(
                        solicitacaoSelecionada.contatoOriginal ||
                          solicitacaoSelecionada.contato,
                      )
                    }
                  >
                    <Text style={styles.botaoWhatsAppTexto}>
                      Entrar em contato pelo WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.modalAcoes}>
                    {solicitacaoSelecionada.status === "pendente" && (
                      <TouchableOpacity
                        style={styles.botaoSecundarioGrande}
                        disabled={processandoId === solicitacaoSelecionada.id}
                        onPress={() =>
                          alterarStatus(solicitacaoSelecionada, "em_contato")
                        }
                      >
                        <Text style={styles.botaoSecundarioTexto}>
                          Marcar como em contato
                        </Text>
                      </TouchableOpacity>
                    )}

                    {solicitacaoSelecionada.status === "em_contato" && (
                      <TouchableOpacity
                        style={styles.botaoSecundarioGrande}
                        disabled={processandoId === solicitacaoSelecionada.id}
                        onPress={() =>
                          alterarStatus(solicitacaoSelecionada, "confirmado")
                        }
                      >
                        <Text style={styles.botaoSecundarioTexto}>
                          Marcar como confirmado
                        </Text>
                      </TouchableOpacity>
                    )}

                    {solicitacaoSelecionada.status === "confirmado" && (
                      <TouchableOpacity
                        style={styles.botaoPrincipalGrande}
                        disabled={processandoId === solicitacaoSelecionada.id}
                        onPress={() =>
                          confirmarRecebimento(solicitacaoSelecionada)
                        }
                      >
                        <Text style={styles.botaoPrincipalTexto}>
                          Registrar recebimento no estoque
                        </Text>
                      </TouchableOpacity>
                    )}

                    {solicitacaoSelecionada.status !== "recebido" &&
                      solicitacaoSelecionada.status !== "cancelado" && (
                        <TouchableOpacity
                          style={styles.botaoPerigoGrande}
                          disabled={processandoId === solicitacaoSelecionada.id}
                          onPress={() =>
                            alterarStatus(solicitacaoSelecionada, "cancelado")
                          }
                        >
                          <Text style={styles.botaoPerigoTexto}>
                            Cancelar solicitação
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalRecebimentoAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharModalRecebimento}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {solicitacaoRecebimento && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>Confirmar doação</Text>

                  <TouchableOpacity
                    style={styles.modalFechar}
                    onPress={fecharModalRecebimento}
                  >
                    <Text style={styles.modalFecharTexto}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescricao}>
                  Antes de registrar no estoque, selecione a categoria correta
                  da doação de {obterProduto(solicitacaoRecebimento)}.
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.secaoTitulo}>Tipo da doação</Text>

                  <View style={styles.opcoesContainer}>
                    {Object.keys(categoriasPorGrupo).map((grupo) => {
                      const ativo = categoriaGeralRecebimento === grupo;

                      return (
                        <TouchableOpacity
                          key={grupo}
                          style={[
                            styles.opcaoBotao,
                            ativo && styles.opcaoBotaoAtivo,
                          ]}
                          onPress={() =>
                            selecionarCategoriaGeralRecebimento(grupo)
                          }
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.opcaoTexto,
                              ativo && styles.opcaoTextoAtivo,
                            ]}
                          >
                            {grupo}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.secaoTitulo}>Categoria</Text>

                  <View style={styles.opcoesContainer}>
                    {categoriasPorGrupo[
                      categoriaGeralRecebimento as keyof typeof categoriasPorGrupo
                    ].map((item) => {
                      const ativo = categoriaRecebimento === item;

                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.opcaoBotao,
                            ativo && styles.opcaoBotaoAtivo,
                          ]}
                          onPress={() => setCategoriaRecebimento(item)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.opcaoTexto,
                              ativo && styles.opcaoTextoAtivo,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.resumoRecebimento}>
                    <Text style={styles.resumoRecebimentoLabel}>
                      Vai entrar como
                    </Text>
                    <Text style={styles.resumoRecebimentoValor}>
                      {categoriaGeralRecebimento} • {categoriaRecebimento}
                    </Text>
                  </View>

                  <View style={styles.modalAcoes}>
                    <TouchableOpacity
                      style={styles.botaoPrincipalGrande}
                      disabled={processandoId === solicitacaoRecebimento.id}
                      onPress={() =>
                        receberDoacao(
                          solicitacaoRecebimento,
                          categoriaGeralRecebimento,
                          categoriaRecebimento,
                        )
                      }
                    >
                      <Text style={styles.botaoPrincipalTexto}>
                        {processandoId === solicitacaoRecebimento.id
                          ? "Registrando..."
                          : "Registrar no estoque"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.botaoSecundarioGrande}
                      disabled={processandoId === solicitacaoRecebimento.id}
                      onPress={fecharModalRecebimento}
                    >
                      <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.fundo,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    marginBottom: 14,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.texto,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textoSuave,
  },
  resumoContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borda,
    ...shadows.soft,
  },
  resumoNumero: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.principal,
  },
  resumoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textoSuave,
    marginTop: 2,
    textAlign: "center",
  },
  campoBusca: {
    minHeight: 48,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borda,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.texto,
    marginBottom: 12,
  },
  filtrosArea: {
    height: 48,
    marginBottom: 12,
  },
  filtrosScroll: {
    flexGrow: 0,
  },
  filtrosContainer: {
    gap: 8,
    alignItems: "center",
    paddingRight: 18,
  },
  filtroBotao: {
    minHeight: 40,
    minWidth: 74,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borda,
    alignItems: "center",
    justifyContent: "center",
  },
  filtroBotaoAtivo: {
    backgroundColor: colors.principal,
    borderColor: colors.principal,
  },
  filtroTexto: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textoSuave,
  },
  filtroTextoAtivo: {
    color: colors.card,
  },
  lista: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borda,
  },
  cardTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  cardTituloArea: {
    flex: 1,
  },
  itemNome: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.texto,
    marginBottom: 3,
  },
  doadorNome: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textoSuave,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusTexto: {
    fontSize: 12,
    fontWeight: "900",
  },
  infoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textoSuave,
  },
  infoValor: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: colors.texto,
    textAlign: "right",
  },
  acoesRapidas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  botaoPrincipal: {
    backgroundColor: colors.principal,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoPrincipalTexto: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  botaoSecundario: {
    backgroundColor: colors.principalClaro,
    borderWidth: 1,
    borderColor: colors.bordaForte,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoSecundarioTexto: {
    color: colors.principal,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  botaoPerigo: {
    backgroundColor: colors.perigoFundo,
    borderWidth: 1,
    borderColor: colors.perigo,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoPerigoTexto: {
    color: colors.perigo,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  estadoContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  estadoTitulo: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.texto,
    marginBottom: 8,
    textAlign: "center",
  },
  estadoTexto: {
    fontSize: 14,
    color: colors.textoSuave,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    maxHeight: "88%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  modalTitulo: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: colors.texto,
  },
  modalFechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.fundoAlternativo,
    alignItems: "center",
    justifyContent: "center",
  },
  modalFecharTexto: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.textoMedio,
  },
  modalDescricao: {
    fontSize: 14,
    color: colors.textoSuave,
    lineHeight: 21,
    marginBottom: 14,
  },
  detalheBloco: {
    backgroundColor: colors.fundo,
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  detalheLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.textoSuave,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detalheValor: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.texto,
    lineHeight: 21,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.texto,
    marginTop: 10,
    marginBottom: 8,
  },
  opcoesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  opcaoBotao: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  opcaoBotaoAtivo: {
    backgroundColor: colors.principal,
    borderColor: colors.principal,
  },
  opcaoTexto: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textoSuave,
  },
  opcaoTextoAtivo: {
    color: colors.card,
  },
  resumoRecebimento: {
    backgroundColor: colors.fundo,
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: 16,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  resumoRecebimentoLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.textoSuave,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  resumoRecebimentoValor: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.texto,
  },
  botaoWhatsApp: {
    backgroundColor: colors.informacaoFundo,
    borderWidth: 1,
    borderColor: colors.bordaForte,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  botaoWhatsAppTexto: {
    color: colors.informacao,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  modalAcoes: {
    gap: 10,
    marginTop: 4,
    paddingBottom: 8,
  },
  botaoPrincipalGrande: {
    backgroundColor: colors.principal,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  botaoSecundarioGrande: {
    backgroundColor: colors.principalClaro,
    borderWidth: 1,
    borderColor: colors.bordaForte,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  botaoPerigoGrande: {
    backgroundColor: colors.perigoFundo,
    borderWidth: 1,
    borderColor: colors.perigo,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
});
