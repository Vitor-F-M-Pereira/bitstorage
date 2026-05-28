import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import CampoSelecao from "../../components/CampoSelecao";
import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/globalStyles";

const gruposCategoria = ["Todos", "Alimentos", "Limpeza", "Higiene", "Outros"];

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

const tiposQuantidade = ["unidades", "kg", "litros"];

export default function Estoque() {
  const [tipoUsuario, setTipoUsuario] = useState("");

  const [alimentos, setAlimentos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("Todas");

  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

  const [nome, setNome] = useState("");
  const [categoriaGeral, setCategoriaGeral] = useState("Alimentos");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");
  const [origem, setOrigem] = useState("Doação");
  const [origemDoacao, setOrigemDoacao] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");

  const [modalVisivel, setModalVisivel] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState<any | null>(null);
  const [valorMovimentacao, setValorMovimentacao] = useState("");
  const [observacaoMovimentacao, setObservacaoMovimentacao] = useState("");

  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [idProcessando, setIdProcessando] = useState<string | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState<Record<string, boolean>>({});

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";
  const podeMovimentar = ehAdministrador || ehCozinheiro;
  const podeExcluir = ehAdministrador;
  const podeEditar = ehAdministrador || ehCozinheiro;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) return;

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();

          setTipoUsuario(
            String(dados.tipoUsuario || "cozinheiro").toLowerCase()
          );
        } else {
          setTipoUsuario("cozinheiro");
        }
      } catch (error) {
        console.log(error);
        setTipoUsuario("cozinheiro");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "alimentos"),
      (snapshot) => {
        const lista: any[] = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          });
        });

        lista.sort((a, b) => {
          const nomeA = String(a.nome || "").toLowerCase();
          const nomeB = String(b.nome || "").toLowerCase();

          return nomeA.localeCompare(nomeB);
        });

        setAlimentos(lista);
        setCarregandoLista(false);
      },
      (error) => {
        console.log(error);
        setCarregandoLista(false);
        Alert.alert("Erro", "Não foi possível atualizar os alimentos.");
      }
    );

    return () => unsubscribe();
  }, []);

  const definirCategoriaGeral = (categoriaSelecionada: string) => {
    if (
      [
        "Grãos e cereais",
        "Massas",
        "Enlatados e conservas",
        "Leites e derivados",
        "Carnes e proteínas",
        "Hortifruti",
        "Bebidas",
      ].includes(categoriaSelecionada)
    ) {
      return "Alimentos";
    }

    if (categoriaSelecionada === "Produtos de limpeza") {
      return "Limpeza";
    }

    if (categoriaSelecionada === "Higiene pessoal") {
      return "Higiene";
    }

    return "Outros";
  };

  const selecionarGrupoEdicao = (grupo: string) => {
    const categorias =
      categoriasPorGrupo[grupo as keyof typeof categoriasPorGrupo] || ["Outros"];

    setCategoriaGeral(grupo);
    setCategoria(categorias[0]);
  };

  const formatarData = (texto: string) => {
    const numeros = texto.replace(/\D/g, "");
    let dataFormatada = numeros;

    if (numeros.length > 2) {
      dataFormatada = numeros.slice(0, 2) + "/" + numeros.slice(2);
    }

    if (numeros.length > 4) {
      dataFormatada =
        numeros.slice(0, 2) +
        "/" +
        numeros.slice(2, 4) +
        "/" +
        numeros.slice(4, 8);
    }

    setValidade(dataFormatada);
  };

  const converterDataBrasileira = (data: string) => {
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
      mes > 12
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
  };

  const calcularDiasRestantes = (dataValidade: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataConvertida = converterDataBrasileira(dataValidade);
    if (!dataConvertida) return null;

    dataConvertida.setHours(0, 0, 0, 0);

    const diferenca = dataConvertida.getTime() - hoje.getTime();

    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  };

  const calcularStatusVencimento = (dataValidade: string) => {
    const dias = calcularDiasRestantes(dataValidade);

    if (dias === null) return "Data inválida";
    if (dias < 0) return "Vencido";
    if (dias <= 7) return "Usar em breve";

    return "Dentro do prazo";
  };

  const verificarEstoqueBaixo = (item: any) => {
    const quantidadeAtual = Number(item.quantidade || 0);
    const tipo = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidadeAtual <= 0) return false;

    if (tipo === "kg" || tipo === "litros") {
      return quantidadeAtual <= 2;
    }

    return quantidadeAtual <= 5;
  };

  const converterValorMonetario = (valor: string) => {
    if (!valor) return 0;

    const valorLimpo = String(valor)
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const valorNumerico = Number(valorLimpo);

    if (isNaN(valorNumerico)) return 0;

    return valorNumerico;
  };

  const formatarMoeda = (valor: any) => {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const limparEdicao = () => {
    if (carregandoAcao) return;

    setIdEditando(null);
    setNome("");
    setCategoriaGeral("Alimentos");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Doação");
    setOrigemDoacao("");
    setPrecoCompra("");
    setModalEdicaoVisivel(false);
  };

  const editarAlimento = (item: any) => {
    if (carregandoAcao) return;

    if (!podeEditar) {
      Alert.alert(
        "Acesso negado",
        "Você não possui permissão para editar itens."
      );
      return;
    }

    const grupo = item.categoriaGeral || definirCategoriaGeral(item.categoria);

    setIdEditando(item.id);
    setNome(item.nome || "");
    setCategoriaGeral(grupo);
    setCategoria(item.categoria || "Grãos e cereais");
    setQuantidade(String(item.quantidade || ""));
    setTipoQuantidade(item.tipoQuantidade || "unidades");
    setValidade(item.validade || "");
    setOrigem(item.origem || "Doação");
    setOrigemDoacao(item.origemDoacao || item.detalheOrigem || "");
    setPrecoCompra(
      item.precoCompra ? String(item.precoCompra).replace(".", ",") : ""
    );

    setModalEdicaoVisivel(true);
  };

  const salvarEdicao = async () => {
    if (!idEditando || carregandoAcao) return;

    if (!nome.trim() || !quantidade.trim() || !validade.trim()) {
      Alert.alert("Atenção", "Preencha nome, quantidade e validade.");
      return;
    }

    if (isNaN(Number(quantidade)) || Number(quantidade) < 0) {
      Alert.alert("Atenção", "Digite uma quantidade válida.");
      return;
    }

    const dataValidade = converterDataBrasileira(validade);

    if (!dataValidade) {
      Alert.alert("Atenção", "Digite a validade no formato DD/MM/AAAA.");
      return;
    }

    const precoCompraConvertido =
      origem === "Compra" ? converterValorMonetario(precoCompra) : 0;

    if (origem === "Compra" && precoCompra.trim() && precoCompraConvertido <= 0) {
      Alert.alert("Atenção", "Digite um valor de compra válido.");
      return;
    }

    const detalheOrigem =
      origem === "Compra"
        ? "Compra realizada pela instituição"
        : origemDoacao.trim()
        ? origemDoacao.trim()
        : "Doação sem origem informada";

    try {
      setCarregandoAcao(true);
      setIdProcessando(idEditando);

      await updateDoc(doc(db, "alimentos", idEditando), {
        nome: nome.trim(),
        categoria,
        categoriaGeral,
        quantidade: Number(quantidade),
        tipoQuantidade,
        validade,
        validadeData: dataValidade,
        origem,
        detalheOrigem,
        origemDoacao: origem === "Doação" ? detalheOrigem : "",
        precoCompra: precoCompraConvertido,
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Item atualizado com sucesso!");
      limparEdicao();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar o item.");
    } finally {
      setCarregandoAcao(false);
      setIdProcessando(null);
    }
  };

  const abrirModalMovimentacao = (item: any, tipo: string) => {
    if (carregandoAcao) return;

    if (!podeMovimentar) {
      Alert.alert(
        "Acesso negado",
        "Você não possui permissão para alterar a quantidade do estoque."
      );
      return;
    }

    setItemSelecionado(item);
    setTipoMovimentacao(tipo);
    setValorMovimentacao("");
    setObservacaoMovimentacao("");
    setModalVisivel(true);
  };

  const fecharModalMovimentacao = () => {
    if (carregandoAcao) return;

    setModalVisivel(false);
    setItemSelecionado(null);
    setTipoMovimentacao("");
    setValorMovimentacao("");
    setObservacaoMovimentacao("");
  };

  const registrarMovimentacao = async () => {
    try {
      if (carregandoAcao) return;

      if (!itemSelecionado) return;

      const quantidadeAtual = Number(itemSelecionado.quantidade || 0);
      const quantidadeMovimentada = Number(valorMovimentacao);

      if (isNaN(quantidadeMovimentada) || quantidadeMovimentada <= 0) {
        Alert.alert("Atenção", "Digite uma quantidade válida.");
        return;
      }

      let novaQuantidade = quantidadeAtual;

      if (tipoMovimentacao === "entrada") {
        novaQuantidade += quantidadeMovimentada;
      } else {
        if (quantidadeMovimentada > quantidadeAtual) {
          Alert.alert(
            "Atenção",
            "Não é possível consumir mais do que existe no estoque."
          );
          return;
        }

        novaQuantidade -= quantidadeMovimentada;
      }

      const observacaoFinal = observacaoMovimentacao.trim()
        ? observacaoMovimentacao.trim()
        : tipoMovimentacao === "entrada"
        ? "Entrada de estoque"
        : "Saída de estoque";

      setCarregandoAcao(true);
      setIdProcessando(itemSelecionado.id);

      await updateDoc(doc(db, "alimentos", itemSelecionado.id), {
        quantidade: novaQuantidade,
        atualizadoEm: new Date(),
      });

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: itemSelecionado.id,
        nomeProduto: itemSelecionado.nome,
        categoria: itemSelecionado.categoria || "Não informada",
        categoriaGeral:
          itemSelecionado.categoriaGeral ||
          definirCategoriaGeral(itemSelecionado.categoria),
        tipo: tipoMovimentacao,
        quantidade: quantidadeMovimentada,
        quantidadeAnterior: quantidadeAtual,
        quantidadeAtual: novaQuantidade,
        tipoQuantidade: itemSelecionado.tipoQuantidade || "unidades",
        origem: itemSelecionado.origem || "Não informada",
        detalheOrigem: itemSelecionado.detalheOrigem || "",
        origemDoacao: itemSelecionado.origemDoacao || "",
        precoCompra: itemSelecionado.precoCompra || 0,
        observacao: observacaoFinal,
        registradoPorTipo: tipoUsuario,
        data: new Date(),
        mes: String(new Date().getMonth() + 1).padStart(2, "0"),
        ano: String(new Date().getFullYear()),
      });

      Alert.alert(
        "Sucesso",
        tipoMovimentacao === "entrada"
          ? "Quantidade adicionada ao estoque!"
          : "Saída registrada com sucesso!"
      );

      fecharModalMovimentacao();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar esta alteração.");
    } finally {
      setCarregandoAcao(false);
      setIdProcessando(null);
    }
  };

  const confirmarExclusao = (item: any) => {
    if (carregandoAcao) return;

    if (!podeExcluir) {
      Alert.alert(
        "Acesso negado",
        "Somente administradores podem excluir itens do estoque."
      );
      return;
    }

    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja excluir "${item.nome}" do estoque?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir item",
          style: "destructive",
          onPress: () => excluirAlimento(item),
        },
      ]
    );
  };

  const excluirAlimento = async (item: any) => {
    try {
      if (carregandoAcao) return;

      setCarregandoAcao(true);
      setIdProcessando(item.id);

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: item.id,
        nomeProduto: item.nome,
        categoria: item.categoria || "Não informada",
        categoriaGeral: item.categoriaGeral || definirCategoriaGeral(item.categoria),
        tipo: "exclusao",
        quantidade: Number(item.quantidade || 0),
        quantidadeAnterior: Number(item.quantidade || 0),
        quantidadeAtual: 0,
        tipoQuantidade: item.tipoQuantidade || "unidades",
        origem: item.origem || "Não informada",
        detalheOrigem: item.detalheOrigem || "",
        origemDoacao: item.origemDoacao || "",
        precoCompra: item.precoCompra || 0,
        observacao: "Item excluído do estoque",
        registradoPorTipo: tipoUsuario,
        data: new Date(),
        mes: String(new Date().getMonth() + 1).padStart(2, "0"),
        ano: String(new Date().getFullYear()),
      });

      await deleteDoc(doc(db, "alimentos", item.id));

      Alert.alert("Sucesso", "Item excluído do estoque!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível excluir o item.");
    } finally {
      setCarregandoAcao(false);
      setIdProcessando(null);
    }
  };

  const alimentosComStatus = alimentos.map((item) => {
    const grupo = item.categoriaGeral || definirCategoriaGeral(item.categoria);
    const status = calcularStatusVencimento(item.validade);
    const dias = calcularDiasRestantes(item.validade);
    const quantidadeAtual = Number(item.quantidade || 0);
    const estoqueBaixo = verificarEstoqueBaixo(item);

    return {
      ...item,
      categoriaGeral: grupo,
      status,
      dias,
      quantidadeAtual,
      estoqueBaixo,
      zerado: quantidadeAtual <= 0,
    };
  });

  const alimentosFiltrados = alimentosComStatus.filter((item) => {
    const nomeItem = String(item.nome || "").toLowerCase();
    const categoriaItem = String(item.categoria || "").toLowerCase();
    const origemItem = String(item.origem || "").toLowerCase();
    const buscaDigitada = busca.toLowerCase();

    const passaBusca =
      nomeItem.includes(buscaDigitada) ||
      categoriaItem.includes(buscaDigitada) ||
      origemItem.includes(buscaDigitada);

    const passaGrupo =
      filtroGrupo === "Todos" || item.categoriaGeral === filtroGrupo;

    const passaCategoria =
      filtroCategoria === "Todas" || item.categoria === filtroCategoria;

    const passaOrigem =
      filtroOrigem === "Todas" || String(item.origem || "") === filtroOrigem;

    let passaStatus = true;

    if (filtroStatus === "proximos") {
      passaStatus = item.status === "Usar em breve";
    }

    if (filtroStatus === "vencidos") {
      passaStatus = item.status === "Vencido";
    }

    if (filtroStatus === "validos") {
      passaStatus = item.status === "Dentro do prazo";
    }

    if (filtroStatus === "baixo") {
      passaStatus = item.estoqueBaixo;
    }

    if (filtroStatus === "zerados") {
      passaStatus = item.zerado;
    }

    return (
      passaBusca &&
      passaGrupo &&
      passaCategoria &&
      passaOrigem &&
      passaStatus
    );
  }).sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    })
  );

  const totalVencidos = alimentosComStatus.filter(
    (item) => item.status === "Vencido"
  ).length;

  const totalProximos = alimentosComStatus.filter(
    (item) => item.status === "Usar em breve"
  ).length;

  const totalEstoqueBaixo = alimentosComStatus.filter(
    (item) => item.estoqueBaixo
  ).length;

  const totalZerados = alimentosComStatus.filter((item) => item.zerado).length;

  const totalAlertas =
    totalVencidos + totalProximos + totalEstoqueBaixo + totalZerados;

  const categoriasDisponiveis =
    filtroGrupo === "Todos"
      ? ["Todas"]
      : [
          "Todas",
          ...(categoriasPorGrupo[
            filtroGrupo as keyof typeof categoriasPorGrupo
          ] || []),
        ];

  const BotaoOpcao = ({
    texto,
    selecionado,
    aoPressionar,
  }: {
    texto: string;
    selecionado: boolean;
    aoPressionar: () => void;
  }) => (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
      accessibilityHint="Toque duas vezes para selecionar esta opção."
      disabled={carregandoAcao}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.opcao,
        {
          minHeight: 46,
          justifyContent: "center",
          opacity: carregandoAcao || pressed ? 0.65 : 1,
        },
        selecionado && styles.opcaoSelecionada,
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          { fontSize: 15 },
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

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
            fontSize: 28,
            fontWeight: "900",
            color: corNumero,
            minWidth: 44,
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

  const StatusTexto = ({ item }: { item: any }) => {
    if (item.status === "Vencido") {
      return (
        <Text style={{ color: colors.perigo, fontWeight: "900", marginTop: 6 }}>
          Vencido há {Math.abs(item.dias)} dia(s).
        </Text>
      );
    }

    if (item.status === "Usar em breve") {
      return (
        <Text style={{ color: colors.alerta, fontWeight: "900", marginTop: 6 }}>
          {item.dias === 0
            ? "Vence hoje."
            : `Vence em ${item.dias} dia(s).`}
        </Text>
      );
    }

    return (
      <Text style={{ color: colors.sucesso, fontWeight: "900", marginTop: 6 }}>
        Dentro do prazo.
      </Text>
    );
  };

  const alternarItemExpandido = (id: string) => {
    setItensExpandidos((estadoAtual) => ({
      ...estadoAtual,
      [id]: !estadoAtual[id],
    }));
  };

  const renderItem = ({ item }: { item: any }) => {
    const processandoEsteItem = carregandoAcao && idProcessando === item.id;
    const expandido = !!itensExpandidos[item.id];

    const corSituacao =
      item.status === "Vencido"
        ? colors.perigo
        : item.status === "Usar em breve" || item.estoqueBaixo || item.zerado
        ? colors.alerta
        : colors.sucesso;

    const textoSituacao = item.zerado
      ? "Zerado"
      : item.status === "Vencido"
      ? "Vencido"
      : item.status === "Usar em breve"
      ? "Vence logo"
      : item.estoqueBaixo
      ? "Estoque baixo"
      : "Dentro do prazo";

    return (
      <View
        style={[
          styles.card,
          item.status === "Vencido" && styles.cardVencido,
          item.status === "Usar em breve" && styles.cardProximo,
          item.status === "Dentro do prazo" && styles.cardNormal,
          {
            marginBottom: 10,
            padding: 0,
            overflow: "hidden",
          },
        ]}
      >
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Item ${item.nome}. Quantidade ${item.quantidadeAtual} ${item.tipoQuantidade}. Situação ${textoSituacao}. ${expandido ? "Recolher detalhes" : "Expandir detalhes"}.`}
          accessibilityHint="Toque duas vezes para abrir ou fechar os detalhes deste item."
          onPress={() => alternarItemExpandido(item.id)}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "900",
                  color: colors.texto,
                  marginBottom: 4,
                }}
              >
                {item.nome}
              </Text>

              <Text
                style={{
                  color: colors.textoSuave,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {item.categoria} • Validade: {item.validade || "Não informada"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", minWidth: 92 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "900",
                  color: colors.texto,
                  textAlign: "right",
                }}
              >
                {item.quantidadeAtual} {item.tipoQuantidade || "un."}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: corSituacao,
                  fontWeight: "900",
                  fontSize: 12,
                  textAlign: "right",
                }}
              >
                {textoSituacao}
              </Text>
            </View>
          </View>

          <Text
            style={{
              marginTop: 8,
              color: colors.secundario,
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            {expandido ? "Ocultar detalhes" : "Ver detalhes"}
          </Text>
        </Pressable>

        {expandido && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borda,
              padding: 16,
              paddingTop: 14,
            }}
          >
            <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
              {item.categoriaGeral} • {item.categoria}
            </Text>

            <Text
              style={{
                marginTop: 6,
                color: colors.texto,
                fontWeight: "800",
              }}
            >
              Quantidade: {item.quantidadeAtual} {item.tipoQuantidade || "unidades"}
            </Text>

            <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
              Origem: {item.origem || "Não informada"}
            </Text>

            <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
              Validade: {item.validade || "Não informada"}
            </Text>

            <StatusTexto item={item} />

            {item.zerado && (
              <Text
                style={{
                  marginTop: 6,
                  color: colors.perigo,
                  fontWeight: "900",
                }}
              >
                Item zerado no estoque.
              </Text>
            )}

            {item.estoqueBaixo && (
              <Text
                style={{
                  marginTop: 6,
                  color: colors.alerta,
                  fontWeight: "900",
                }}
              >
                Estoque baixo.
              </Text>
            )}

            {item.origem === "Doação" && (
              <Text style={{ color: colors.textoSuave, marginTop: 8 }}>
                Doador: {item.nomeDoador || item.detalheOrigem || "Não informado"}
              </Text>
            )}

            {item.origem === "Compra" && (
              <Text style={{ color: colors.textoSuave, marginTop: 8 }}>
                Valor da compra: {formatarMoeda(item.precoCompra)}
              </Text>
            )}

            {processandoEsteItem && (
              <View style={{ marginTop: 10 }}>
                <ActivityIndicator size="small" color={colors.principal} />

                <Text style={{ textAlign: "center", marginTop: 5 }}>
                  Salvando alteração...
                </Text>
              </View>
            )}

            <View style={styles.areaBotoes}>
              {podeEditar && (
                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${item.nome}`}
                  accessibilityHint="Abre a janela de edição do item."
                  disabled={carregandoAcao}
                  style={({ pressed }) => [
                    styles.botaoEditar,
                    {
                      minHeight: 48,
                      justifyContent: "center",
                      opacity: carregandoAcao || pressed ? 0.65 : 1,
                    },
                  ]}
                  onPress={() => editarAlimento(item)}
                >
                  <Text style={styles.textoBotaoCard}>Editar</Text>
                </Pressable>
              )}

              {podeExcluir && (
                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${item.nome}`}
                  accessibilityHint="Exclui o item do estoque após confirmação."
                  disabled={carregandoAcao}
                  style={({ pressed }) => [
                    styles.botaoExcluir,
                    {
                      minHeight: 48,
                      justifyContent: "center",
                      opacity: carregandoAcao || pressed ? 0.65 : 1,
                    },
                  ]}
                  onPress={() => confirmarExclusao(item)}
                >
                  <Text style={styles.textoBotaoCard}>
                    {processandoEsteItem ? "Excluindo..." : "Excluir"}
                  </Text>
                </Pressable>
              )}
            </View>

            {podeMovimentar && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Registrar entrada para ${item.nome}`}
                  accessibilityHint="Adiciona quantidade ao estoque deste item."
                  disabled={carregandoAcao}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.sucesso,
                    padding: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    minHeight: 48,
                    justifyContent: "center",
                    opacity: carregandoAcao || pressed ? 0.65 : 1,
                  })}
                  onPress={() => abrirModalMovimentacao(item, "entrada")}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Entrada
                  </Text>
                </Pressable>

                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Registrar saída para ${item.nome}`}
                  accessibilityHint="Registra consumo ou retirada do estoque deste item."
                  disabled={carregandoAcao}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.alerta,
                    padding: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    minHeight: 48,
                    justifyContent: "center",
                    opacity: carregandoAcao || pressed ? 0.65 : 1,
                  })}
                  onPress={() => abrirModalMovimentacao(item, "saida")}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Saída</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (carregandoLista) {
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
        <ActivityIndicator size="large" color={colors.principal} />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando estoque...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 120,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        Estoque
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Consulte os itens cadastrados e registre entradas ou saídas.
      </Text>

      <Bloco
        titulo="Situação geral"
        descricao="Resumo rápido para entender se o estoque precisa de atenção."
      >
        <LinhaResumo
          titulo="Produtos cadastrados"
          valor={alimentos.length}
          descricao="Total de itens na despensa"
          tipo="info"
        />

        <LinhaResumo
          titulo="Pontos de atenção"
          valor={totalAlertas}
          descricao="Vencidos, vencendo, baixos ou zerados"
          tipo={totalAlertas > 0 ? "alerta" : "sucesso"}
        />

        <LinhaResumo
          titulo="Itens encontrados"
          valor={alimentosFiltrados.length}
          descricao="Resultado após busca e filtros"
          tipo="neutro"
        />
      </Bloco>

      <Bloco
        titulo="Busca e filtros"
        descricao="Use os filtros para encontrar o item mais rápido."
      >
        <Text style={styles.label}>Buscar</Text>

        <TextInput
          accessible
          accessibilityLabel="Buscar item no estoque"
          accessibilityHint="Digite o nome, categoria ou origem do item."
          style={styles.input}
          placeholder="Digite nome, categoria ou origem"
          value={busca}
          editable={!carregandoAcao}
          onChangeText={setBusca}
        />

        <CampoSelecao
          label="Tipo do produto"
          value={filtroGrupo}
          onChange={(valor) => {
            setFiltroGrupo(valor);
            setFiltroCategoria("Todas");
          }}
          options={gruposCategoria.map((item) => ({ label: item, value: item }))}
        />

        {filtroGrupo !== "Todos" && (
          <CampoSelecao
            label="Categoria específica"
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            options={categoriasDisponiveis.map((item) => ({
              label: item,
              value: item,
            }))}
          />
        )}

        <CampoSelecao
          label="Origem"
          value={filtroOrigem}
          onChange={setFiltroOrigem}
          options={[
            { label: "Todas", value: "Todas" },
            { label: "Doação", value: "Doação" },
            { label: "Compra", value: "Compra" },
          ]}
        />

        <CampoSelecao
          label="Situação"
          value={filtroStatus}
          onChange={setFiltroStatus}
          options={[
            { label: "Todos", value: "todos" },
            { label: "Vencem logo", value: "proximos" },
            { label: "Vencidos", value: "vencidos" },
            { label: "Dentro do prazo", value: "validos" },
            { label: "Baixo estoque", value: "baixo" },
            { label: "Zerados", value: "zerados" },
          ]}
        />
      </Bloco>

      <Text accessibilityRole="header" style={styles.subtitulo}>
        Itens do estoque
      </Text>

      <FlatList
        data={alimentosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhum alimento encontrado.</Text>
        }
      />

      <Modal visible={modalEdicaoVisivel} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <ScrollView>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  marginBottom: 8,
                  color: colors.texto,
                }}
              >
                Editar item
              </Text>

              <Text
                style={{
                  color: colors.textoSuave,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                Altere apenas as informações necessárias.
              </Text>

              <Text style={styles.label}>Nome do item</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do item"
                value={nome}
                editable={!carregandoAcao}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Tipo do produto</Text>

              <View style={styles.opcoes}>
                {["Alimentos", "Limpeza", "Higiene", "Outros"].map((item) => (
                  <BotaoOpcao
                    key={item}
                    texto={item}
                    selecionado={categoriaGeral === item}
                    aoPressionar={() => selecionarGrupoEdicao(item)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Categoria específica</Text>

              <View style={styles.opcoes}>
                {(
                  categoriasPorGrupo[
                    categoriaGeral as keyof typeof categoriasPorGrupo
                  ] || ["Outros"]
                ).map((item) => (
                  <BotaoOpcao
                    key={item}
                    texto={item}
                    selecionado={categoria === item}
                    aoPressionar={() => setCategoria(item)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Quantidade disponível</Text>

              <TextInput
                style={styles.input}
                placeholder="Quantidade disponível"
                value={quantidade}
                editable={!carregandoAcao}
                onChangeText={setQuantidade}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Medida</Text>

              <View style={styles.opcoes}>
                {tiposQuantidade.map((item) => (
                  <BotaoOpcao
                    key={item}
                    texto={item}
                    selecionado={tipoQuantidade === item}
                    aoPressionar={() => setTipoQuantidade(item)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Validade</Text>

              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={validade}
                editable={!carregandoAcao}
                onChangeText={formatarData}
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={styles.label}>Origem</Text>

              <View style={styles.opcoes}>
                <BotaoOpcao
                  texto="Doação"
                  selecionado={origem === "Doação"}
                  aoPressionar={() => {
                    setOrigem("Doação");
                    setPrecoCompra("");
                  }}
                />

                <BotaoOpcao
                  texto="Compra"
                  selecionado={origem === "Compra"}
                  aoPressionar={() => {
                    setOrigem("Compra");
                    setOrigemDoacao("");
                  }}
                />
              </View>

              {origem === "Doação" && (
                <>
                  <Text style={styles.label}>Origem da doação</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Ex: mercado parceiro, campanha..."
                    value={origemDoacao}
                    editable={!carregandoAcao}
                    onChangeText={setOrigemDoacao}
                  />
                </>
              )}

              {origem === "Compra" && (
                <>
                  <Text style={styles.label}>Valor da compra</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 25,90"
                    value={precoCompra}
                    editable={!carregandoAcao}
                    onChangeText={setPrecoCompra}
                    keyboardType="numeric"
                  />
                </>
              )}

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Salvar edição"
                  disabled={carregandoAcao}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.principal,
                    padding: 15,
                    borderRadius: 12,
                    alignItems: "center",
                    minHeight: 50,
                    justifyContent: "center",
                    opacity: carregandoAcao || pressed ? 0.65 : 1,
                  })}
                  onPress={salvarEdicao}
                >
                  {carregandoAcao ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "900" }}>
                      Salvar
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar edição"
                  disabled={carregandoAcao}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.secundarioClaro,
                    padding: 15,
                    borderRadius: 12,
                    alignItems: "center",
                    minHeight: 50,
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.borda,
                    opacity: carregandoAcao || pressed ? 0.65 : 1,
                  })}
                  onPress={limparEdicao}
                >
                  <Text
                    style={{
                      color: colors.secundario,
                      fontWeight: "900",
                    }}
                  >
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisivel} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 22,
                fontWeight: "900",
                marginBottom: 10,
                color: colors.texto,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? "Adicionar quantidade"
                : "Registrar saída"}
            </Text>

            <Text
              style={{
                marginBottom: 15,
                color: colors.textoSuave,
                lineHeight: 22,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? `Informe a quantidade que chegou para "${itemSelecionado?.nome}".`
                : `Informe a quantidade retirada ou consumida de "${itemSelecionado?.nome}".`}
            </Text>

            <TextInput
              accessibilityLabel="Quantidade da movimentação"
              style={styles.input}
              placeholder="Digite a quantidade"
              keyboardType="numeric"
              value={valorMovimentacao}
              editable={!carregandoAcao}
              onChangeText={setValorMovimentacao}
            />

            <TextInput
              accessibilityLabel="Observação da movimentação"
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              placeholder="Observação opcional"
              value={observacaoMovimentacao}
              editable={!carregandoAcao}
              onChangeText={setObservacaoMovimentacao}
              multiline
            />

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Confirmar movimentação"
                disabled={carregandoAcao}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.principal,
                  padding: 15,
                  borderRadius: 12,
                  alignItems: "center",
                  minHeight: 50,
                  justifyContent: "center",
                  opacity: carregandoAcao || pressed ? 0.65 : 1,
                })}
                onPress={registrarMovimentacao}
              >
                {carregandoAcao ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Confirmar
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cancelar movimentação"
                disabled={carregandoAcao}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.secundarioClaro,
                  padding: 15,
                  borderRadius: 12,
                  alignItems: "center",
                  minHeight: 50,
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.borda,
                  opacity: carregandoAcao || pressed ? 0.65 : 1,
                })}
                onPress={fecharModalMovimentacao}
              >
                <Text
                  style={{
                    color: colors.secundario,
                    fontWeight: "900",
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}