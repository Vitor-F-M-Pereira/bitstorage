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
import { colors, styles } from "../../styles/estoqueStyles";

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

const filtrosTipo = [
  { nome: "Todos", valor: "todos" },
  { nome: "Entradas", valor: "entrada" },
  { nome: "Saídas", valor: "saida" },
];

const filtrosOrigem = [
  { nome: "Todas", valor: "todas" },
  { nome: "Doações", valor: "Doação" },
  { nome: "Compras", valor: "Compra" },
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

  const [tipoSelecionado, setTipoSelecionado] = useState("todos");
  const [origemSelecionada, setOrigemSelecionada] = useState("todas");

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

    const dataConvertida = new Date(data);

    if (isNaN(dataConvertida.getTime())) {
      return null;
    }

    return dataConvertida;
  };

  const formatarData = (data) => {
    const dataConvertida = converterData(data);

    if (!dataConvertida) {
      return "Data não informada";
    }

    return dataConvertida.toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor) => {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const movimentacoesDoMes = movimentacoes.filter((item) => {
    const data = converterData(item.data);

    if (!data) return false;

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesSelecionado && ano === anoSelecionado;
  });

  const movimentacoesFiltradas = movimentacoesDoMes.filter((item) => {
    const tipoOk =
      tipoSelecionado === "todos" || item.tipo === tipoSelecionado;

    const origemOk =
      origemSelecionada === "todas" ||
      String(item.origem || "") === origemSelecionada;

    return tipoOk && origemOk;
  });

  const totalEntradas = movimentacoesDoMes.filter(
    (item) => item.tipo === "entrada"
  ).length;

  const totalSaidas = movimentacoesDoMes.filter(
    (item) => item.tipo === "saida"
  ).length;

  const totalCompras = movimentacoesDoMes.filter(
    (item) => item.tipo === "entrada" && item.origem === "Compra"
  ).length;

  const totalDoacoes = movimentacoesDoMes.filter(
    (item) => item.tipo === "entrada" && item.origem === "Doação"
  ).length;

  const quantidadeEntrada = movimentacoesDoMes.reduce((total, item) => {
    if (item.tipo === "entrada") {
      return total + Number(item.quantidade || 0);
    }

    return total;
  }, 0);

  const quantidadeSaida = movimentacoesDoMes.reduce((total, item) => {
    if (item.tipo === "saida") {
      return total + Number(item.quantidade || 0);
    }

    return total;
  }, 0);

  const valorTotalCompras = movimentacoesDoMes.reduce((total, item) => {
    if (item.tipo === "entrada" && item.origem === "Compra") {
      return total + Number(item.precoCompra || 0);
    }

    return total;
  }, 0);

  const saldoMovimentado = quantidadeEntrada - quantidadeSaida;

  const categoriasMovimentadas = movimentacoesDoMes.reduce((resultado, item) => {
    const categoria = item.categoria || "Sem categoria";

    if (!resultado[categoria]) {
      resultado[categoria] = {
        categoria,
        quantidade: 0,
        movimentacoes: 0,
      };
    }

    resultado[categoria].quantidade += Number(item.quantidade || 0);
    resultado[categoria].movimentacoes += 1;

    return resultado;
  }, {});

  const rankingCategorias = Object.values(categoriasMovimentadas)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 3);

  const carregandoTela = carregandoUsuario || carregandoMovimentacoes;

  const BotaoFiltro = ({ texto, selecionado, aoPressionar }) => (
    <Pressable
      disabled={carregandoTela}
      onPress={aoPressionar}
      style={[
        styles.opcao,
        selecionado && styles.opcaoSelecionada,
        carregandoTela && { opacity: 0.6 },
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

  const CardResumo = ({ titulo, valor, descricao }) => (
    <View style={styles.card}>
      <Text style={styles.nome}>{titulo}</Text>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: colors?.principal || "#2E7D32",
          marginTop: 4,
        }}
      >
        {valor}
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: colors?.textoSuave || "#666",
          lineHeight: 20,
        }}
      >
        {descricao}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const tipoFormatado = item.tipo === "entrada" ? "Entrada" : "Saída";

    return (
      <View style={styles.card}>
        <Text style={styles.nome}>
          {item.nomeProduto || "Produto não informado"}
        </Text>

        <Text>Tipo: {tipoFormatado}</Text>

        <Text>
          Quantidade: {item.quantidade || 0} {item.tipoQuantidade || ""}
        </Text>

        <Text>Quantidade anterior: {item.quantidadeAnterior ?? "Não informada"}</Text>
        <Text>Quantidade atual: {item.quantidadeAtual ?? "Não informada"}</Text>

        {item.categoria && <Text>Categoria: {item.categoria}</Text>}

        {item.origem && <Text>Origem: {item.origem}</Text>}

        {item.origem === "Compra" && (
          <Text>Valor da compra: {formatarMoeda(item.precoCompra)}</Text>
        )}

        {item.origem === "Doação" && (
          <Text>
            Origem da doação:{" "}
            {item.origemDoacao || item.detalheOrigem || "Não informada"}
          </Text>
        )}

        {item.observacao && <Text>Observação: {item.observacao}</Text>}

        <Text>Registrado por: {item.registradoPorTipo || "Não informado"}</Text>

        <Text>Data: {formatarData(item.data)}</Text>
      </View>
    );
  };

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
        <ActivityIndicator size="large" color={colors?.principal || "#2E7D32"} />

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

        <Text>
          Somente administradores podem acessar o histórico e os relatórios.
        </Text>
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
          <BotaoFiltro
            key={item.valor}
            texto={item.nome}
            selecionado={mesSelecionado === item.valor}
            aoPressionar={() => setMesSelecionado(item.valor)}
          />
        ))}
      </View>

      <Text style={styles.subtitulo}>Filtrar por tipo</Text>

      <View style={styles.opcoes}>
        {filtrosTipo.map((item) => (
          <BotaoFiltro
            key={item.valor}
            texto={item.nome}
            selecionado={tipoSelecionado === item.valor}
            aoPressionar={() => setTipoSelecionado(item.valor)}
          />
        ))}
      </View>

      <Text style={styles.subtitulo}>Filtrar por origem</Text>

      <View style={styles.opcoes}>
        {filtrosOrigem.map((item) => (
          <BotaoFiltro
            key={item.valor}
            texto={item.nome}
            selecionado={origemSelecionada === item.valor}
            aoPressionar={() => setOrigemSelecionada(item.valor)}
          />
        ))}
      </View>

      <Text style={styles.subtitulo}>Resumo do mês</Text>

      <CardResumo
        titulo="Movimentações"
        valor={movimentacoesDoMes.length}
        descricao="Quantidade total de registros encontrados no mês selecionado."
      />

      <CardResumo
        titulo="Entradas"
        valor={totalEntradas}
        descricao={`Foram adicionados ${quantidadeEntrada} item(ns) ao estoque no período.`}
      />

      <CardResumo
        titulo="Saídas"
        valor={totalSaidas}
        descricao={`Foram retirados ${quantidadeSaida} item(ns) do estoque no período.`}
      />

      <CardResumo
        titulo="Saldo movimentado"
        valor={saldoMovimentado}
        descricao="Diferença entre a quantidade total de entradas e saídas."
      />

      <CardResumo
        titulo="Compras"
        valor={totalCompras}
        descricao={`Total gasto em compras: ${formatarMoeda(valorTotalCompras)}.`}
      />

      <CardResumo
        titulo="Doações"
        valor={totalDoacoes}
        descricao="Entradas registradas como doação no mês selecionado."
      />

      <Text style={styles.subtitulo}>Categorias mais movimentadas</Text>

      {rankingCategorias.length === 0 ? (
        <Text style={styles.listaVazia}>
          Nenhuma categoria movimentada neste período.
        </Text>
      ) : (
        rankingCategorias.map((item) => (
          <View key={item.categoria} style={styles.card}>
            <Text style={styles.nome}>{item.categoria}</Text>

            <Text>Quantidade movimentada: {item.quantidade}</Text>
            <Text>Total de registros: {item.movimentacoes}</Text>
          </View>
        ))
      )}

      <Text style={styles.subtitulo}>Movimentações do período</Text>

      <FlatList
        data={movimentacoesFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            Nenhuma movimentação encontrada para os filtros selecionados.
          </Text>
        }
      />
    </ScrollView>
  );
}