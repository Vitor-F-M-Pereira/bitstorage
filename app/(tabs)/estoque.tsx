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
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

const categorias = [
  "Todas",
  "Grãos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Hortifruti",
  "Bebidas",
  "Produtos de limpeza",
  "Higiene pessoal",
  "Outros",
];

const categoriasEdicao = [
  "Grãos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Hortifruti",
  "Bebidas",
  "Produtos de limpeza",
  "Higiene pessoal",
  "Outros",
];

export default function Estoque() {
  const [tipoUsuario, setTipoUsuario] = useState("");

  const [alimentos, setAlimentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("Todas");

  const [idEditando, setIdEditando] = useState(null);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");
  const [origem, setOrigem] = useState("Doação");
  const [origemDoacao, setOrigemDoacao] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");
  const [observacao, setObservacao] = useState("");

  const [modalVisivel, setModalVisivel] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [valorMovimentacao, setValorMovimentacao] = useState("");
  const [observacaoMovimentacao, setObservacaoMovimentacao] = useState("");

  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [idProcessando, setIdProcessando] = useState(null);
  const [carregandoLista, setCarregandoLista] = useState(true);

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
        const lista = [];

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

  const formatarData = (texto) => {
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

  const converterDataBrasileira = (data) => {
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

  const calcularDiasRestantes = (dataValidade) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataConvertida = converterDataBrasileira(dataValidade);
    if (!dataConvertida) return null;

    dataConvertida.setHours(0, 0, 0, 0);

    const diferenca = dataConvertida.getTime() - hoje.getTime();

    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  };

  const calcularStatusVencimento = (dataValidade) => {
    const dias = calcularDiasRestantes(dataValidade);

    if (dias === null) return "Data inválida";
    if (dias < 0) return "Vencido";
    if (dias <= 7) return "Usar em breve";

    return "Dentro do prazo";
  };

  const verificarEstoqueBaixo = (item) => {
    const quantidadeAtual = Number(item.quantidade || 0);
    const tipo = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidadeAtual <= 0) return false;

    if (tipo === "kg" || tipo === "litros") {
      return quantidadeAtual <= 2;
    }

    return quantidadeAtual <= 5;
  };

  const converterValorMonetario = (valor) => {
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

  const formatarMoeda = (valor) => {
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
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Doação");
    setOrigemDoacao("");
    setPrecoCompra("");
    setObservacao("");
    setModalEdicaoVisivel(false);
  };

  const editarAlimento = (item) => {
    if (carregandoAcao) return;

    if (!podeEditar) {
      Alert.alert(
        "Acesso negado",
        "Você não possui permissão para editar itens."
      );
      return;
    }

    setIdEditando(item.id);
    setNome(item.nome || "");
    setCategoria(item.categoria || "Grãos e cereais");
    setQuantidade(String(item.quantidade || ""));
    setTipoQuantidade(item.tipoQuantidade || "unidades");
    setValidade(item.validade || "");
    setOrigem(item.origem || "Doação");
    setOrigemDoacao(item.origemDoacao || item.detalheOrigem || "");
    setPrecoCompra(
      item.precoCompra ? String(item.precoCompra).replace(".", ",") : ""
    );
    setObservacao(item.observacao || "");

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
        quantidade: Number(quantidade),
        tipoQuantidade,
        validade,
        validadeData: dataValidade,
        origem,
        detalheOrigem,
        origemDoacao: origem === "Doação" ? detalheOrigem : "",
        precoCompra: precoCompraConvertido,
        observacao: observacao.trim(),
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

  const abrirModalMovimentacao = (item, tipo) => {
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

      if (!podeMovimentar) {
        Alert.alert(
          "Acesso negado",
          "Você não possui permissão para registrar alterações no estoque."
        );
        fecharModalMovimentacao();
        return;
      }

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
          : "Consumo registrado com sucesso!"
      );

      setModalVisivel(false);
      setItemSelecionado(null);
      setTipoMovimentacao("");
      setValorMovimentacao("");
      setObservacaoMovimentacao("");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar esta alteração.");
    } finally {
      setCarregandoAcao(false);
      setIdProcessando(null);
    }
  };

  const confirmarExclusao = (item) => {
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
      `Tem certeza que deseja excluir "${item.nome}" do estoque? Essa ação remove o item cadastrado.`,
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

  const excluirAlimento = async (item) => {
    try {
      if (carregandoAcao) return;

      setCarregandoAcao(true);
      setIdProcessando(item.id);

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: item.id,
        nomeProduto: item.nome,
        categoria: item.categoria || "Não informada",
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
    const status = calcularStatusVencimento(item.validade);
    const dias = calcularDiasRestantes(item.validade);
    const quantidadeAtual = Number(item.quantidade || 0);
    const estoqueBaixo = verificarEstoqueBaixo(item);

    return {
      ...item,
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

    return passaBusca && passaCategoria && passaOrigem && passaStatus;
  });

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

  const BotaoOpcao = ({ texto, selecionado, aoPressionar }) => (
    <Pressable
      disabled={carregandoAcao}
      onPress={aoPressionar}
      style={[
        styles.opcao,
        selecionado && styles.opcaoSelecionada,
        carregandoAcao && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  const CardResumo = ({ titulo, valor, descricao, tipo }) => {
    let corFundo = colors.card || "#FFFFFF";
    let corBorda = colors.borda || "#DDD";

    if (tipo === "info") {
      corFundo = colors.secundarioClaro || "#EAF3FF";
      corBorda = colors.secundario || "#4B7BEC";
    }

    if (tipo === "alerta") {
      corFundo = colors.alertaFundo || "#FFF8E1";
      corBorda = colors.alerta || "#F0A500";
    }

    if (tipo === "perigo") {
      corFundo = colors.perigoFundo || "#FDECEC";
      corBorda = colors.perigo || "#D9534F";
    }

    if (tipo === "ok") {
      corFundo = colors.sucessoFundo || "#EAF7F0";
      corBorda = colors.sucesso || "#2E7D32";
    }

    return (
      <View
        style={{
          backgroundColor: corFundo,
          borderRadius: 18,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: corBorda,
        }}
      >
        <Text
          style={{
            color: colors.textoSuave || "#666",
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          {titulo}
        </Text>

        <Text
          style={{
            color: colors.texto || "#222",
            fontSize: 28,
            fontWeight: "bold",
          }}
        >
          {valor}
        </Text>

        <Text
          style={{
            color: colors.textoSuave || "#666",
            marginTop: 4,
            lineHeight: 20,
          }}
        >
          {descricao}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const processandoEsteItem = carregandoAcao && idProcessando === item.id;

    return (
      <View
        style={[
          styles.card,
          item.status === "Vencido" && styles.cardVencido,
          item.status === "Usar em breve" && styles.cardProximo,
          item.status === "Dentro do prazo" && styles.cardNormal,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.nome}>{item.nome}</Text>

            <Text>Categoria: {item.categoria || "Não informada"}</Text>

            <Text>
              Quantidade disponível: {item.quantidadeAtual}{" "}
              {item.tipoQuantidade || "unidades"}
            </Text>

            <Text>Origem: {item.origem || "Não informada"}</Text>

            {item.origem === "Doação" && (
              <Text>
                Origem da doação:{" "}
                {item.origemDoacao || item.detalheOrigem || "Não informada"}
              </Text>
            )}

            {item.origem === "Compra" && (
              <Text>Valor da compra: {formatarMoeda(item.precoCompra)}</Text>
            )}

            <Text>Validade: {item.validade || "Não informada"}</Text>
          </View>

          <View
            style={{
              backgroundColor:
                item.status === "Vencido"
                  ? colors.perigoFundo || "#FDECEC"
                  : item.status === "Usar em breve"
                  ? colors.alertaFundo || "#FFF8E1"
                  : colors.sucessoFundo || "#EAF7F0",
              borderColor:
                item.status === "Vencido"
                  ? colors.perigo || "#D9534F"
                  : item.status === "Usar em breve"
                  ? colors.alerta || "#F0A500"
                  : colors.sucesso || "#2E7D32",
              borderWidth: 1,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color:
                  item.status === "Vencido"
                    ? colors.perigo || "#D9534F"
                    : item.status === "Usar em breve"
                    ? colors.alerta || "#A66A00"
                    : colors.sucesso || "#2E7D32",
                fontWeight: "bold",
                fontSize: 12,
              }}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {item.dias !== null && item.dias >= 0 && (
          <Text style={{ marginTop: 8 }}>
            {item.dias === 0
              ? "Este item vence hoje."
              : `Faltam ${item.dias} dia(s) para vencer.`}
          </Text>
        )}

        {item.dias !== null && item.dias < 0 && (
          <Text
            style={{
              marginTop: 8,
              color: colors.perigo || "#D9534F",
              fontWeight: "bold",
            }}
          >
            Venceu há {Math.abs(item.dias)} dia(s).
          </Text>
        )}

        {item.zerado && (
          <Text
            style={{
              marginTop: 8,
              color: colors.perigo || "#D9534F",
              fontWeight: "bold",
            }}
          >
            Item zerado no estoque.
          </Text>
        )}

        {item.estoqueBaixo && (
          <Text
            style={{
              marginTop: 8,
              color: colors.alerta || "#A66A00",
              fontWeight: "bold",
            }}
          >
            Estoque baixo.
          </Text>
        )}

        {item.observacao && (
          <Text
            style={{
              marginTop: 8,
              color: colors.textoSuave || "#666",
            }}
          >
            Observação: {item.observacao}
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
              disabled={carregandoAcao}
              style={[styles.botaoEditar, carregandoAcao && { opacity: 0.6 }]}
              onPress={() => editarAlimento(item)}
            >
              <Text style={styles.textoBotaoCard}>Editar item</Text>
            </Pressable>
          )}

          {podeExcluir && (
            <Pressable
              disabled={carregandoAcao}
              style={[styles.botaoExcluir, carregandoAcao && { opacity: 0.6 }]}
              onPress={() => confirmarExclusao(item)}
            >
              <Text style={styles.textoBotaoCard}>
                {processandoEsteItem ? "Excluindo..." : "Excluir item"}
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
              disabled={carregandoAcao}
              style={{
                flex: 1,
                backgroundColor: colors.sucesso || "#2E7D32",
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
                opacity: carregandoAcao ? 0.6 : 1,
              }}
              onPress={() => abrirModalMovimentacao(item, "entrada")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Entrada
              </Text>
            </Pressable>

            <Pressable
              disabled={carregandoAcao}
              style={{
                flex: 1,
                backgroundColor: colors.alerta || "#F0A500",
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
                opacity: carregandoAcao ? 0.6 : 1,
              }}
              onPress={() => abrirModalMovimentacao(item, "saida")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Saída
              </Text>
            </Pressable>
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
        <ActivityIndicator size="large" color={colors.principal || "#2E7D32"} />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando estoque...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Estoque</Text>

      <Text style={styles.subtituloPrincipal}>
        Consulte os alimentos cadastrados, acompanhe a validade e registre
        entradas ou saídas do estoque.
      </Text>

      <Text style={styles.subtitulo}>Resumo do estoque</Text>

      <CardResumo
        titulo="Produtos cadastrados"
        valor={alimentos.length}
        descricao="Total de itens registrados na despensa."
        tipo="info"
      />

      <CardResumo
        titulo="Vencidos"
        valor={totalVencidos}
        descricao="Itens que já passaram da validade."
        tipo={totalVencidos > 0 ? "perigo" : "ok"}
      />

      <CardResumo
        titulo="Vencem em breve"
        valor={totalProximos}
        descricao="Produtos que vencem em até 7 dias."
        tipo={totalProximos > 0 ? "alerta" : "ok"}
      />

      <CardResumo
        titulo="Estoque baixo"
        valor={totalEstoqueBaixo}
        descricao="Itens com pouca quantidade disponível."
        tipo={totalEstoqueBaixo > 0 ? "alerta" : "ok"}
      />

      <CardResumo
        titulo="Zerados"
        valor={totalZerados}
        descricao="Produtos sem quantidade disponível."
        tipo={totalZerados > 0 ? "perigo" : "ok"}
      />

      <Text style={styles.subtitulo}>Buscar alimento</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite nome, categoria ou origem"
        value={busca}
        editable={!carregandoAcao}
        onChangeText={setBusca}
      />

      <Text style={styles.subtitulo}>Filtrar por categoria</Text>

      <View style={styles.opcoes}>
        {categorias.map((item) => (
          <BotaoOpcao
            key={item}
            texto={item}
            selecionado={filtroCategoria === item}
            aoPressionar={() => setFiltroCategoria(item)}
          />
        ))}
      </View>

      <Text style={styles.subtitulo}>Filtrar por origem</Text>

      <View style={styles.opcoes}>
        <BotaoOpcao
          texto="Todas"
          selecionado={filtroOrigem === "Todas"}
          aoPressionar={() => setFiltroOrigem("Todas")}
        />

        <BotaoOpcao
          texto="Doação"
          selecionado={filtroOrigem === "Doação"}
          aoPressionar={() => setFiltroOrigem("Doação")}
        />

        <BotaoOpcao
          texto="Compra"
          selecionado={filtroOrigem === "Compra"}
          aoPressionar={() => setFiltroOrigem("Compra")}
        />
      </View>

      <Text style={styles.subtitulo}>Filtrar por situação</Text>

      <View style={styles.opcoes}>
        <BotaoOpcao
          texto="Todos"
          selecionado={filtroStatus === "todos"}
          aoPressionar={() => setFiltroStatus("todos")}
        />

        <BotaoOpcao
          texto="Usar em breve"
          selecionado={filtroStatus === "proximos"}
          aoPressionar={() => setFiltroStatus("proximos")}
        />

        <BotaoOpcao
          texto="Vencidos"
          selecionado={filtroStatus === "vencidos"}
          aoPressionar={() => setFiltroStatus("vencidos")}
        />

        <BotaoOpcao
          texto="Dentro do prazo"
          selecionado={filtroStatus === "validos"}
          aoPressionar={() => setFiltroStatus("validos")}
        />

        <BotaoOpcao
          texto="Estoque baixo"
          selecionado={filtroStatus === "baixo"}
          aoPressionar={() => setFiltroStatus("baixo")}
        />

        <BotaoOpcao
          texto="Zerados"
          selecionado={filtroStatus === "zerados"}
          aoPressionar={() => setFiltroStatus("zerados")}
        />
      </View>

      <Text style={styles.subtitulo}>Itens encontrados</Text>

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
              backgroundColor: colors.card || "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <ScrollView>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: colors.texto || "#222",
                }}
              >
                Editar item
              </Text>

              <Text
                style={{
                  color: colors.textoSuave || "#666",
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                Altere as informações necessárias e salve para atualizar o
                estoque.
              </Text>

              <Text style={styles.label}>Nome do alimento</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do alimento"
                value={nome}
                editable={!carregandoAcao}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Categoria</Text>

              <View style={styles.opcoes}>
                {categoriasEdicao.map((item) => (
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

              <Text style={styles.label}>Tipo de quantidade</Text>

              <View style={styles.opcoes}>
                <BotaoOpcao
                  texto="unidades"
                  selecionado={tipoQuantidade === "unidades"}
                  aoPressionar={() => setTipoQuantidade("unidades")}
                />

                <BotaoOpcao
                  texto="kg"
                  selecionado={tipoQuantidade === "kg"}
                  aoPressionar={() => setTipoQuantidade("kg")}
                />

                <BotaoOpcao
                  texto="litros"
                  selecionado={tipoQuantidade === "litros"}
                  aoPressionar={() => setTipoQuantidade("litros")}
                />
              </View>

              <Text style={styles.label}>Validade</Text>

              <TextInput
                style={styles.input}
                placeholder="Validade (DD/MM/AAAA)"
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
                    placeholder="Ex: mercado parceiro, campanha, pessoa física..."
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

              <Text style={styles.label}>Observação</Text>

              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
                placeholder="Observação opcional"
                value={observacao}
                editable={!carregandoAcao}
                onChangeText={setObservacao}
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
                  disabled={carregandoAcao}
                  style={{
                    flex: 1,
                    backgroundColor: colors.principal || "#2E7D32",
                    padding: 15,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: carregandoAcao ? 0.6 : 1,
                  }}
                  onPress={salvarEdicao}
                >
                  {carregandoAcao ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Salvar
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={carregandoAcao}
                  style={{
                    flex: 1,
                    backgroundColor: colors.secundarioClaro || "#EAF3FF",
                    padding: 15,
                    borderRadius: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.borda || "#DDD",
                    opacity: carregandoAcao ? 0.6 : 1,
                  }}
                  onPress={limparEdicao}
                >
                  <Text
                    style={{
                      color: colors.secundario || "#4B7BEC",
                      fontWeight: "bold",
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
              backgroundColor: colors.card || "#FFFFFF",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 10,
                color: colors.texto || "#222",
              }}
            >
              {tipoMovimentacao === "entrada"
                ? "Adicionar quantidade"
                : "Registrar saída"}
            </Text>

            <Text
              style={{
                marginBottom: 15,
                color: colors.textoSuave || "#666",
                lineHeight: 22,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? `Informe a quantidade que chegou para o item "${itemSelecionado?.nome}".`
                : `Informe a quantidade retirada ou consumida do item "${itemSelecionado?.nome}".`}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Digite a quantidade"
              keyboardType="numeric"
              value={valorMovimentacao}
              editable={!carregandoAcao}
              onChangeText={setValorMovimentacao}
            />

            <TextInput
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
                disabled={carregandoAcao}
                style={{
                  flex: 1,
                  backgroundColor: colors.principal || "#2E7D32",
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: carregandoAcao ? 0.6 : 1,
                }}
                onPress={registrarMovimentacao}
              >
                {carregandoAcao ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Confirmar
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={carregandoAcao}
                style={{
                  flex: 1,
                  backgroundColor: colors.secundarioClaro || "#EAF3FF",
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.borda || "#DDD",
                  opacity: carregandoAcao ? 0.6 : 1,
                }}
                onPress={fecharModalMovimentacao}
              >
                <Text
                  style={{
                    color: colors.secundario || "#4B7BEC",
                    fontWeight: "bold",
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
  );
}