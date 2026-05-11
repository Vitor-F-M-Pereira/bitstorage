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

  const [idEditando, setIdEditando] = useState(null);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

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

  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [idProcessando, setIdProcessando] = useState(null);

  const ehCozinheiro = tipoUsuario === "cozinheiro";

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
    if (dias < 7) return "Usar em breve";

    return "Dentro do prazo";
  };

  const limparEdicao = () => {
    setIdEditando(null);
    setNome("");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Cadastro interno");
    setModalEdicaoVisivel(false);
  };

  const editarAlimento = (item) => {
    if (carregandoAcao) return;

    setIdEditando(item.id);
    setNome(item.nome || "");
    setCategoria(item.categoria || "Grãos e cereais");
    setQuantidade(String(item.quantidade || ""));
    setTipoQuantidade(item.tipoQuantidade || "unidades");
    setValidade(item.validade || "");
    setOrigem(item.origem || "Cadastro interno");

    setModalEdicaoVisivel(true);
  };

  const salvarEdicao = async () => {
    if (!idEditando || carregandoAcao) return;

    if (!nome || !quantidade || !validade) {
      Alert.alert("Atenção", "Preencha nome, quantidade e validade.");
      return;
    }

    if (isNaN(Number(quantidade)) || Number(quantidade) < 0) {
      Alert.alert("Atenção", "Digite uma quantidade válida.");
      return;
    }

    if (!converterDataBrasileira(validade)) {
      Alert.alert("Atenção", "Digite a validade no formato DD/MM/AAAA.");
      return;
    }

    try {
      setCarregandoAcao(true);
      setIdProcessando(idEditando);

      await updateDoc(doc(db, "alimentos", idEditando), {
        nome: nome.trim(),
        categoria,
        quantidade: Number(quantidade),
        tipoQuantidade,
        validade,
        origem,
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

    if (!ehCozinheiro) {
      Alert.alert(
        "Acesso negado",
        "Somente cozinheiros podem alterar a quantidade do estoque."
      );
      return;
    }

    setItemSelecionado(item);
    setTipoMovimentacao(tipo);
    setValorMovimentacao("");
    setModalVisivel(true);
  };

  const fecharModalMovimentacao = () => {
    if (carregandoAcao) return;

    setModalVisivel(false);
    setItemSelecionado(null);
    setTipoMovimentacao("");
    setValorMovimentacao("");
  };

  const registrarMovimentacao = async () => {
    try {
      if (carregandoAcao) return;

      if (!ehCozinheiro) {
        Alert.alert(
          "Acesso negado",
          "Somente cozinheiros podem registrar alterações no estoque."
        );
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
          Alert.alert(
            "Atenção",
            "Não é possível consumir mais do que existe no estoque."
          );
          return;
        }

        novaQuantidade -= quantidadeMovimentada;
      }

      setCarregandoAcao(true);
      setIdProcessando(itemSelecionado.id);

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
          onPress: () => excluirAlimento(item.id),
        },
      ]
    );
  };

  const excluirAlimento = async (id) => {
    try {
      if (carregandoAcao) return;

      setCarregandoAcao(true);
      setIdProcessando(id);

      await deleteDoc(doc(db, "alimentos", id));

      Alert.alert("Sucesso", "Item excluído do estoque!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível excluir o item.");
    } finally {
      setCarregandoAcao(false);
      setIdProcessando(null);
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
      passaStatus = status === "Usar em breve";
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

  const renderItem = ({ item }) => {
    const status = calcularStatusVencimento(item.validade);
    const dias = calcularDiasRestantes(item.validade);
    const processandoEsteItem = carregandoAcao && idProcessando === item.id;

    return (
      <View
        style={[
          styles.card,
          status === "Vencido" && styles.cardVencido,
          status === "Usar em breve" && styles.cardProximo,
          status === "Dentro do prazo" && styles.cardNormal,
        ]}
      >
        <Text style={styles.nome}>{item.nome}</Text>

        <Text>Categoria: {item.categoria}</Text>

        <Text>
          Quantidade disponível: {item.quantidade} {item.tipoQuantidade}
        </Text>

        <Text>Origem: {item.origem || "Cadastro interno"}</Text>

        <Text>Validade: {item.validade}</Text>

        {dias !== null && dias >= 0 && (
          <Text>
            {dias === 0
              ? "Este item vence hoje."
              : `Faltam ${dias} dia(s) para vencer.`}
          </Text>
        )}

        <Text
          style={[
            styles.status,
            status === "Vencido" && styles.statusVencido,
            status === "Usar em breve" && styles.statusProximo,
            status === "Dentro do prazo" && styles.statusNormal,
          ]}
        >
          {status}
        </Text>

        {processandoEsteItem && (
          <View style={{ marginTop: 10 }}>
            <ActivityIndicator size="small" color={colors.principal} />
            <Text style={{ textAlign: "center", marginTop: 5 }}>
              Salvando alteração...
            </Text>
          </View>
        )}

        <View style={styles.areaBotoes}>
          <Pressable
            disabled={carregandoAcao}
            style={[styles.botaoEditar, carregandoAcao && { opacity: 0.6 }]}
            onPress={() => editarAlimento(item)}
          >
            <Text style={styles.textoBotaoCard}>Editar item</Text>
          </Pressable>

          <Pressable
            disabled={carregandoAcao}
            style={[styles.botaoExcluir, carregandoAcao && { opacity: 0.6 }]}
            onPress={() => confirmarExclusao(item)}
          >
            <Text style={styles.textoBotaoCard}>
              {processandoEsteItem ? "Excluindo..." : "Excluir item"}
            </Text>
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
              disabled={carregandoAcao}
              style={{
                flex: 1,
                backgroundColor: colors.sucesso,
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
                opacity: carregandoAcao ? 0.6 : 1,
              }}
              onPress={() => abrirModalMovimentacao(item, "entrada")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Adicionar quantidade
              </Text>
            </Pressable>

            <Pressable
              disabled={carregandoAcao}
              style={{
                flex: 1,
                backgroundColor: colors.alerta,
                padding: 15,
                borderRadius: 12,
                alignItems: "center",
                opacity: carregandoAcao ? 0.6 : 1,
              }}
              onPress={() => abrirModalMovimentacao(item, "saida")}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Registrar consumo
              </Text>
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
        Consulte os alimentos cadastrados, veja a validade e acompanhe a
        quantidade disponível.
      </Text>

      <Text style={styles.subtitulo}>Buscar alimento</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite o nome do alimento"
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

      <Text style={styles.subtitulo}>Filtrar por validade</Text>

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
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
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
                    backgroundColor: colors.principal,
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
                    backgroundColor: colors.secundarioClaro,
                    padding: 15,
                    borderRadius: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.borda,
                    opacity: carregandoAcao ? 0.6 : 1,
                  }}
                  onPress={limparEdicao}
                >
                  <Text
                    style={{
                      color: colors.secundario,
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
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 10,
                color: colors.texto,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? "Adicionar quantidade"
                : "Registrar consumo"}
            </Text>

            <Text
              style={{
                marginBottom: 15,
                color: colors.textoSuave,
                lineHeight: 22,
              }}
            >
              {tipoMovimentacao === "entrada"
                ? `Informe a quantidade que chegou para o item "${itemSelecionado?.nome}".`
                : `Informe a quantidade consumida do item "${itemSelecionado?.nome}".`}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Digite a quantidade"
              keyboardType="numeric"
              value={valorMovimentacao}
              editable={!carregandoAcao}
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
                disabled={carregandoAcao}
                style={{
                  flex: 1,
                  backgroundColor: colors.principal,
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
                  backgroundColor: colors.secundarioClaro,
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.borda,
                  opacity: carregandoAcao ? 0.6 : 1,
                }}
                onPress={fecharModalMovimentacao}
              >
                <Text style={{ color: colors.secundario, fontWeight: "bold" }}>
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