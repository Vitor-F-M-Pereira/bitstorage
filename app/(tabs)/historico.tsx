import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

const meses = [
  { nome: "Janeiro", valor: "01" },
  { nome: "Fevereiro", valor: "02" },
  { nome: "Março", valor: "03" },
  { nome: "Abril", valor: "04" },
  { nome: "Maio", valor: "05" },
  { nome: "Junho", valor: "06" },
  { nome: "Julho", valor: "07" },
  { nome: "Agosto", valor: "08" },
  { nome: "Setembro", valor: "09" },
  { nome: "Outubro", valor: "10" },
  { nome: "Novembro", valor: "11" },
  { nome: "Dezembro", valor: "12" },
];

export default function Historico() {
  const dataAtual = new Date();

  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [carregandoMovimentacoes, setCarregandoMovimentacoes] = useState(true);

  const [movimentacoes, setMovimentacoes] = useState([]);

  const [mesSelecionado, setMesSelecionado] = useState(
    String(dataAtual.getMonth() + 1).padStart(2, "0")
  );

  const [anoSelecionado, setAnoSelecionado] = useState(
    String(dataAtual.getFullYear())
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setTipoUsuario("");
        setCarregandoUsuario(false);
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();
          setTipoUsuario(String(dados.tipoUsuario || "").toLowerCase());
        } else {
          setTipoUsuario("");
        }
      } catch (error) {
        console.log(error);
        setTipoUsuario("");
      } finally {
        setCarregandoUsuario(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(
      collection(db, "movimentacoes"),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          });
        });

        setMovimentacoes(lista);
        setCarregandoMovimentacoes(false);
      },
      (error) => {
        console.log(error);
        setCarregandoMovimentacoes(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const converterData = (data) => {
    if (!data) return null;

    if (data.toDate) {
      return data.toDate();
    }

    return new Date(data);
  };

  const formatarData = (data) => {
    const dataConvertida = converterData(data);

    if (!dataConvertida) {
      return "Data não informada";
    }

    return dataConvertida.toLocaleDateString("pt-BR");
  };

  const movimentacoesFiltradas = movimentacoes.filter((item) => {
    const data = converterData(item.data);

    if (!data) return false;

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesSelecionado && ano === anoSelecionado;
  });

  const totalEntradas = movimentacoesFiltradas.filter(
    (item) => item.tipo === "entrada"
  ).length;

  const totalSaidas = movimentacoesFiltradas.filter(
    (item) => item.tipo === "saida"
  ).length;

  const quantidadeEntrada = movimentacoesFiltradas.reduce((total, item) => {
    if (item.tipo === "entrada") {
      return total + Number(item.quantidade || 0);
    }

    return total;
  }, 0);

  const quantidadeSaida = movimentacoesFiltradas.reduce((total, item) => {
    if (item.tipo === "saida") {
      return total + Number(item.quantidade || 0);
    }

    return total;
  }, 0);

  const saldoMovimentado = quantidadeEntrada - quantidadeSaida;

  const carregandoTela = carregandoUsuario || carregandoMovimentacoes;

  const BotaoMes = ({ item }) => (
    <Pressable
      disabled={carregandoTela}
      onPress={() => setMesSelecionado(item.valor)}
      style={[
        styles.opcao,
        mesSelecionado === item.valor && styles.opcaoSelecionada,
        carregandoTela && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          mesSelecionado === item.valor && styles.textoOpcaoSelecionada,
        ]}
      >
        {item.nome}
      </Text>
    </Pressable>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.nome}>{item.nomeProduto}</Text>

      <Text>Tipo: {item.tipo === "entrada" ? "Entrada" : "Saída"}</Text>

      <Text>
        Quantidade: {item.quantidade} {item.tipoQuantidade || ""}
      </Text>

      <Text>Quantidade anterior: {item.quantidadeAnterior}</Text>
      <Text>Quantidade atual: {item.quantidadeAtual}</Text>

      <Text>Registrado por: {item.registradoPorTipo || "Não informado"}</Text>

      <Text>Data: {formatarData(item.data)}</Text>
    </View>
  );

  if (carregandoTela) {
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
        <ActivityIndicator size="large" />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando relatório...
        </Text>
      </View>
    );
  }

  if (tipoUsuario !== "administrador") {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Acesso restrito</Text>
        <Text>Somente administradores podem acessar o histórico.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Histórico</Text>

      <Text style={styles.subtituloPrincipal}>
        Relatório mensal de movimentações do estoque
      </Text>

      <Text style={styles.subtitulo}>Ano do relatório</Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: 2026"
        value={anoSelecionado}
        onChangeText={setAnoSelecionado}
        keyboardType="numeric"
        maxLength={4}
      />

      <Text style={styles.subtitulo}>Mês do relatório</Text>

      <View style={styles.opcoes}>
        {meses.map((item) => (
          <BotaoMes key={item.valor} item={item} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.nome}>Resumo do mês</Text>

        <Text>Total de movimentações: {movimentacoesFiltradas.length}</Text>
        <Text>Entradas registradas: {totalEntradas}</Text>
        <Text>Saídas registradas: {totalSaidas}</Text>
        <Text>Quantidade total de entrada: {quantidadeEntrada}</Text>
        <Text>Quantidade total de saída: {quantidadeSaida}</Text>
        <Text>Saldo movimentado: {saldoMovimentado}</Text>
      </View>

      <Text style={styles.subtitulo}>Movimentações do período</Text>

      <FlatList
        data={movimentacoesFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            Nenhuma movimentação encontrada para este período.
          </Text>
        }
      />
    </ScrollView>
  );
}