import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

export default function Alertas() {
  const [alimentos, setAlimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaSelecionada, setAbaSelecionada] = useState("todos");

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
        setCarregando(false);
      },
      (error) => {
        console.log(error);
        setCarregando(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const calcularDiasRestantes = (validade) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataValidade = converterDataBrasileira(validade);

    if (!dataValidade) {
      return null;
    }

    dataValidade.setHours(0, 0, 0, 0);

    const diferenca = dataValidade.getTime() - hoje.getTime();

    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  };

  const estoqueBaixo = (item) => {
    const quantidade = Number(item.quantidade || 0);
    const tipoQuantidade = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidade <= 0) return false;

    if (tipoQuantidade === "kg" || tipoQuantidade === "litros") {
      return quantidade <= 2;
    }

    return quantidade <= 5;
  };

  const itensComDados = alimentos.map((item) => {
    const diasRestantes = calcularDiasRestantes(item.validade);
    const quantidade = Number(item.quantidade || 0);

    return {
      ...item,
      diasRestantes,
      quantidade,
    };
  });

  const itensVencidos = itensComDados
    .filter((item) => item.diasRestantes !== null && item.diasRestantes < 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const itensVencendo = itensComDados
    .filter(
      (item) =>
        item.diasRestantes !== null &&
        item.diasRestantes >= 0 &&
        item.diasRestantes <= 7
    )
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const itensEstoqueBaixo = itensComDados
    .filter((item) => estoqueBaixo(item))
    .sort((a, b) => a.quantidade - b.quantidade);

  const itensZerados = itensComDados
    .filter((item) => item.quantidade <= 0)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)));

  const todosAlertas = [
    ...itensVencidos.map((item) => ({ ...item, tipoAlerta: "vencido" })),
    ...itensVencendo.map((item) => ({ ...item, tipoAlerta: "vencendo" })),
    ...itensZerados.map((item) => ({ ...item, tipoAlerta: "zerado" })),
    ...itensEstoqueBaixo.map((item) => ({ ...item, tipoAlerta: "baixo" })),
  ];

  const alertasUnicos = todosAlertas.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (alerta) =>
          alerta.id === item.id && alerta.tipoAlerta === item.tipoAlerta
      )
  );

  const definirListaAtual = () => {
    if (abaSelecionada === "vencidos") return itensVencidos;
    if (abaSelecionada === "vencendo") return itensVencendo;
    if (abaSelecionada === "baixo") return itensEstoqueBaixo;
    if (abaSelecionada === "zerados") return itensZerados;

    return alertasUnicos;
  };

  const listaAtual = definirListaAtual();

  const definirMensagemAlerta = (item) => {
    if (abaSelecionada === "vencidos" || item.tipoAlerta === "vencido") {
      const dias = Math.abs(Number(item.diasRestantes || 0));

      return dias === 1
        ? "Venceu há 1 dia."
        : `Venceu há ${dias} dias.`;
    }

    if (abaSelecionada === "vencendo" || item.tipoAlerta === "vencendo") {
      if (item.diasRestantes === 0) {
        return "Vence hoje.";
      }

      if (item.diasRestantes === 1) {
        return "Vence amanhã.";
      }

      return `Vence em ${item.diasRestantes} dias.`;
    }

    if (abaSelecionada === "zerados" || item.tipoAlerta === "zerado") {
      return "Item zerado no estoque.";
    }

    if (abaSelecionada === "baixo" || item.tipoAlerta === "baixo") {
      return "Estoque baixo.";
    }

    return "Item precisa de atenção.";
  };

  const definirCorAlerta = (item) => {
    const tipo = item.tipoAlerta || abaSelecionada;

    if (tipo === "vencido" || tipo === "vencidos") {
      return {
        fundo: colors.perigoFundo || "#FDECEC",
        borda: colors.perigo || "#D9534F",
        texto: colors.perigo || "#D9534F",
      };
    }

    if (tipo === "vencendo") {
      return {
        fundo: colors.alertaFundo || "#FFF8E1",
        borda: colors.alerta || "#F0A500",
        texto: colors.alerta || "#A66A00",
      };
    }

    if (tipo === "zerado" || tipo === "zerados") {
      return {
        fundo: colors.perigoFundo || "#FDECEC",
        borda: colors.perigo || "#D9534F",
        texto: colors.perigo || "#D9534F",
      };
    }

    if (tipo === "baixo") {
      return {
        fundo: colors.secundarioClaro || "#EAF7F0",
        borda: colors.secundario || "#4CAF50",
        texto: colors.secundario || "#2E7D32",
      };
    }

    return {
      fundo: colors.card || "#FFFFFF",
      borda: colors.borda || "#DDD",
      texto: colors.texto || "#222",
    };
  };

  const CardResumo = ({ titulo, valor, descricao, tipo }) => {
    const cores = definirCorAlerta({ tipoAlerta: tipo });

    return (
      <View
        style={{
          backgroundColor: cores.fundo,
          borderColor: cores.borda,
          borderWidth: 1,
          borderRadius: 18,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.textoSuave || "#666",
            fontSize: 15,
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

  const BotaoFiltro = ({ texto, valor }) => {
    const selecionado = abaSelecionada === valor;

    return (
      <Pressable
        onPress={() => setAbaSelecionada(valor)}
        style={[
          styles.opcao,
          selecionado && styles.opcaoSelecionada,
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
  };

  const CardAlerta = ({ item }) => {
    const cores = definirCorAlerta(item);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: cores.fundo,
            borderColor: cores.borda,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={styles.nome}>{item.nome || "Item sem nome"}</Text>

        <Text>Categoria: {item.categoria || "Não informada"}</Text>

        <Text>
          Quantidade atual: {Number(item.quantidade || 0)}{" "}
          {item.tipoQuantidade || "unidades"}
        </Text>

        <Text>Validade: {item.validade || "Não informada"}</Text>

        <Text
          style={{
            marginTop: 8,
            color: cores.texto,
            fontWeight: "bold",
          }}
        >
          {definirMensagemAlerta(item)}
        </Text>
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
        <ActivityIndicator size="large" color={colors.principal || "#2E7D32"} />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando alertas...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Alertas</Text>

      <Text style={styles.subtituloPrincipal}>
        Acompanhe os itens que precisam de atenção no estoque.
      </Text>

      <CardResumo
        titulo="Itens vencidos"
        valor={itensVencidos.length}
        descricao="Produtos que já passaram da data de validade."
        tipo="vencido"
      />

      <CardResumo
        titulo="Vencem em até 7 dias"
        valor={itensVencendo.length}
        descricao="Itens que precisam ser usados ou avaliados rapidamente."
        tipo="vencendo"
      />

      <CardResumo
        titulo="Estoque baixo"
        valor={itensEstoqueBaixo.length}
        descricao="Produtos que ainda existem, mas estão em pouca quantidade."
        tipo="baixo"
      />

      <CardResumo
        titulo="Itens zerados"
        valor={itensZerados.length}
        descricao="Produtos que não possuem quantidade disponível no estoque."
        tipo="zerado"
      />

      <Text style={styles.subtitulo}>Filtrar alertas</Text>

      <View style={styles.opcoes}>
        <BotaoFiltro texto="Todos" valor="todos" />
        <BotaoFiltro texto="Vencidos" valor="vencidos" />
        <BotaoFiltro texto="Vencendo" valor="vencendo" />
        <BotaoFiltro texto="Baixo" valor="baixo" />
        <BotaoFiltro texto="Zerados" valor="zerados" />
      </View>

      <Text style={styles.subtitulo}>Itens encontrados</Text>

      {listaAtual.length === 0 ? (
        <Text style={styles.listaVazia}>
          Nenhum alerta encontrado para esse filtro.
        </Text>
      ) : (
        listaAtual.map((item) => <CardAlerta key={`${item.id}-${item.tipoAlerta || abaSelecionada}`} item={item} />)
      )}
    </ScrollView>
  );
}