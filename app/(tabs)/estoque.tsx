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
import { styles } from "../../styles/estoqueStyles";

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

export default function Estoque() {
  const [tipoUsuario, setTipoUsuario] = useState("");

  const [alimentos, setAlimentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [modoEdicao, setModoEdicao] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");
  const [origem, setOrigem] = useState("Cadastro interno");

  const [modalVisivel, setModalVisivel] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [valorMovimentacao, setValorMovimentacao] = useState("");

  const ehCozinheiro = tipoUsuario === "cozinheiro";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) return;

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();
          setTipoUsuario(String(dados.tipoUsuario || "cozinheiro").toLowerCase());  
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

        setAlimentos(lista);
      },
      (error) => {
        console.log(error);
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

    const partes = data.split("/");
    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (!dia || !mes || !ano || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
      return null;
    }

    return new Date(ano, mes - 1, dia);
  };

  const calcularDiasRestantes = (dataValidade) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataConvertida = converterDataBrasileira(dataValidade);
    if (!dataConvertida) return null;

    dataConvertida.setHours(0, 0, 0, 0);

    const diferenca = dataConvertida - hoje;
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  };

  const calcularStatusVencimento = (dataValidade) => {
    const dias = calcularDiasRestantes(dataValidade);

    if (dias === null) return "Data inválida";
    if (dias < 0) return "Vencido";
    if (dias < 7) return "Próximo do vencimento";

    return "Dentro do prazo";
  };

  const limparEdicao = () => {
    setModoEdicao(false);
    setIdEditando(null);
    setNome("");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Cadastro interno");
  };

  const editarAlimento = (item) => {
    setModoEdicao(true);
    setIdEditando(item.id);
    setNome(item.nome);
    setCategoria(item.categoria || "Grãos e cereais");
    setQuantidade(String(item.quantidade));
    setTipoQuantidade(item.tipoQuantidade || "unidades");
    setValidade(item.validade);
    setOrigem(item.origem || "Cadastro interno");
  };

  const salvarEdicao = async () => {
    if (!idEditando) return;

    if (!nome || !quantidade || !validade) {
      Alert.alert("Atenção", "Preencha nome, quantidade e validade.");
      return;
    }

    try {
      await updateDoc(doc(db, "alimentos", idEditando), {
        nome,
        categoria,
        quantidade: Number(quantidade),
        tipoQuantidade,
        validade,
        origem,
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Alimento atualizado!");
      limparEdicao();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar.");
    }
  };

  const abrirModalMovimentacao = (item, tipo) => {
    if (!ehCozinheiro) {
      Alert.alert("Acesso negado", "Somente cozinheiros podem registrar entrada e saída.");
      return;
    }

    setItemSelecionado(item);
    setTipoMovimentacao(tipo);
    setValorMovimentacao("");
    setModalVisivel(true);
  };

  const fecharModalMovimentacao = () => {
    setModalVisivel(false);
    setItemSelecionado(null);
    setTipoMovimentacao("");
    setValorMovimentacao("");
  };

  const registrarMovimentacao = async () => {
    try {
      if (!ehCozinheiro) {
        Alert.alert("Acesso negado", "Somente cozinheiros podem registrar movimentações.");
        fecharModalMovimentacao();
        return;
      }

      if (!itemSelecionado) return;

      const quantidadeAtual = Number(itemSelecionado.quantidade || 0);
      const quantidadeMovimentada = Number(valorMovimentacao);

      if (isNaN(quantidadeMovimentada) || quantidadeMovimentada <= 0) {
        Alert.alert("Erro", "Digite uma quantidade válida.");
        return;
      }

      let novaQuantidade = quantidadeAtual;

      if (tipoMovimentacao === "entrada") {
        novaQuantidade += quantidadeMovimentada;
      } else {
        if (quantidadeMovimentada > quantidadeAtual) {
          Alert.alert("Erro", "A saída não pode ser maior que o estoque.");
          return;
        }

        novaQuantidade -= quantidadeMovimentada;
      }

      await updateDoc(doc(db, "alimentos", itemSelecionado.id), {
        quantidade: novaQuantidade,
        atualizadoEm: new Date(),
      });

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: itemSelecionado.id,
        nomeProduto: itemSelecionado.nome,
        tipo: tipoMovimentacao,
        quantidade: quantidadeMovimentada,
        quantidadeAnterior: quantidadeAtual,
        quantidadeAtual: novaQuantidade,
        tipoQuantidade: itemSelecionado.tipoQuantidade || "unidades",
        registradoPorTipo: tipoUsuario,
        data: new Date(),
      });

      Alert.alert("Sucesso", "Movimentação registrada!");
      fecharModalMovimentacao();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível registrar movimentação.");
    }
  };

  const excluirAlimento = async (id) => {
    try {
      await deleteDoc(doc(db, "alimentos", id));
      Alert.alert("Sucesso", "Alimento excluído!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível excluir.");
    }
  };

  const alimentosFiltrados = alimentos.filter((item) => {
    const status = calcularStatusVencimento(item.validade);
    const nomeItem = item.nome ? item.nome.toLowerCase() : "";
    const buscaDigitada = busca.toLowerCase();

    const passaBusca = nomeItem.includes(buscaDigitada);
    const passaCategoria =
      filtroCategoria === "Todas" || item.categoria === filtroCategoria;

    let passaStatus = true;

    if (filtroStatus === "proximos") {
      passaStatus = status === "Próximo do vencimento";
    }

    if (filtroStatus === "vencidos") {
      passaStatus = status === "Vencido";
    }

    if (filtroStatus === "validos") {
      passaStatus = status === "Dentro do prazo";
    }

    return passaBusca && passaCategoria && passaStatus;
  });

  const BotaoOpcao = ({ texto, selecionado, aoPressionar }) => (
    <Pressable
      onPress={aoPressionar}
      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
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

  const renderItem = ({ item }) => {
    const status = calcularStatusVencimento(item.validade);
    const dias = calcularDiasRestantes(item.validade);

    return (
      <View
        style={[
          styles.card,
          status === "Vencido" && styles.cardVencido,
          status === "Próximo do vencimento" && styles.cardProximo,
          status === "Dentro do prazo" && styles.cardNormal,
        ]}
      >
        <Text style={styles.nome}>{item.nome}</Text>

        <Text>Categoria: {item.categoria}</Text>

        <Text>
          Quantidade: {item.quantidade} {item.tipoQuantidade}
        </Text>

        <Text>Origem: {item.origem || "Cadastro interno"}</Text>

        <Text>Validade: {item.validade}</Text>

        {dias !== null && dias >= 0 && (
          <Text>Faltam {dias} dia(s) para vencer</Text>
        )}

        <Text
          style={[
            styles.status,
            status === "Vencido" && styles.statusVencido,
            status === "Próximo do vencimento" && styles.statusProximo,
            status === "Dentro do prazo" && styles.statusNormal,
          ]}
        >
          {status}
        </Text>

        <View style={styles.areaBotoes}>
          <Pressable
            style={styles.botaoEditar}
            onPress={() => editarAlimento(item)}
          >
            <Text style={styles.textoBotaoCard}>Editar</Text>
          </Pressable>

          <Pressable
            style={styles.botaoExcluir}
            onPress={() => excluirAlimento(item.id)}
          >
            <Text style={styles.textoBotaoCard}>Excluir</Text>
          </Pressable>
        </View>

        {ehCozinheiro && (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 10,
            }}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "#2e7d32",
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={() => abrirModalMovimentacao(item, "entrada")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Entrada
              </Text>
            </Pressable>

            <Pressable
              style={{
                flex: 1,
                backgroundColor: "#c62828",
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={() => abrirModalMovimentacao(item, "saida")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>Saída</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Estoque</Text>

      <Text style={styles.subtituloPrincipal}>
        Consulta e controle dos itens
      </Text>

      {modoEdicao && (
        <View style={styles.formulario}>
          <Text style={styles.subtitulo}>Editar alimento</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome do alimento"
            value={nome}
            onChangeText={setNome}
          />

          <TextInput
            style={styles.input}
            placeholder="Quantidade"
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Validade (DD/MM/AAAA)"
            value={validade}
            onChangeText={formatarData}
            keyboardType="numeric"
            maxLength={10}
          />

          <Pressable style={styles.botaoSalvar} onPress={salvarEdicao}>
            <Text style={styles.textoBotao}>Salvar alterações</Text>
          </Pressable>

          <Pressable style={styles.botaoCancelar} onPress={limparEdicao}>
            <Text style={styles.textoCancelar}>Cancelar edição</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.subtitulo}>Buscar alimento</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite o nome do alimento"
        value={busca}
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

      <Text style={styles.subtitulo}>Filtrar por vencimento</Text>

      <View style={styles.opcoes}>
        <BotaoOpcao
          texto="Todos"
          selecionado={filtroStatus === "todos"}
          aoPressionar={() => setFiltroStatus("todos")}
        />

        <BotaoOpcao
          texto="Próximos"
          selecionado={filtroStatus === "proximos"}
          aoPressionar={() => setFiltroStatus("proximos")}
        />

        <BotaoOpcao
          texto="Vencidos"
          selecionado={filtroStatus === "vencidos"}
          aoPressionar={() => setFiltroStatus("vencidos")}
        />

        <BotaoOpcao
          texto="Válidos"
          selecionado={filtroStatus === "validos"}
          aoPressionar={() => setFiltroStatus("validos")}
        />
      </View>

      <FlatList
        data={alimentosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhum alimento encontrado.</Text>
        }
      />

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
              backgroundColor: "white",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 10,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? "Entrada de estoque"
                : "Saída de estoque"}
            </Text>

            <Text style={{ marginBottom: 15 }}>
              Produto: {itemSelecionado?.nome}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Quantidade"
              keyboardType="numeric"
              value={valorMovimentacao}
              onChangeText={setValorMovimentacao}
            />

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "#1565c0",
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={registrarMovimentacao}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Confirmar
                </Text>
              </Pressable>

              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "#757575",
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={fecharModalMovimentacao}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
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