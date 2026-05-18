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

type Alimento = {
  id: string;
  nome?: string;
  categoria?: string;
  categoriaGeral?: string;
  quantidade?: number;
  tipoQuantidade?: string;
  validade?: string;
  origem?: string;
  [key: string]: any;
};

type ItemComAlerta = Alimento & {
  diasRestantes: number | null;
  quantidadeAtual: number;
  tipoAlerta?: string;
};

export default function Alertas() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState("todos");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "alimentos"),
      (snapshot) => {
        const lista: Alimento[] = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          } as Alimento);
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

  const converterDataBrasileira = (data: string | undefined) => {
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

  const calcularDiasRestantes = (validade: string | undefined) => {
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

  const estoqueBaixo = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const tipoQuantidade = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidade <= 0) return false;

    if (tipoQuantidade === "kg" || tipoQuantidade === "litros") {
      return quantidade <= 2;
    }

    return quantidade <= 5;
  };

  const itensComDados: ItemComAlerta[] = alimentos.map((item) => {
    const diasRestantes = calcularDiasRestantes(item.validade);
    const quantidadeAtual = Number(item.quantidade || 0);

    return {
      ...item,
      diasRestantes,
      quantidadeAtual,
    };
  });

  const itensVencidos = itensComDados
    .filter((item) => item.diasRestantes !== null && item.diasRestantes < 0)
    .sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes));

  const itensVencendo = itensComDados
    .filter(
      (item) =>
        item.diasRestantes !== null &&
        item.diasRestantes >= 0 &&
        item.diasRestantes <= 7
    )
    .sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes));

  const itensEstoqueBaixo = itensComDados
    .filter((item) => estoqueBaixo(item))
    .sort((a, b) => a.quantidadeAtual - b.quantidadeAtual);

  const itensZerados = itensComDados
    .filter((item) => item.quantidadeAtual <= 0)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));

  const todosAlertas: ItemComAlerta[] = [
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

  const totalAlertas = alertasUnicos.length;

  const definirListaAtual = () => {
    if (filtroSelecionado === "vencidos") return itensVencidos;
    if (filtroSelecionado === "vencendo") return itensVencendo;
    if (filtroSelecionado === "baixo") return itensEstoqueBaixo;
    if (filtroSelecionado === "zerados") return itensZerados;

    return alertasUnicos;
  };

  const listaAtual = definirListaAtual();

  const definirTipoAlerta = (item: ItemComAlerta) => {
    if (filtroSelecionado === "vencidos" || item.tipoAlerta === "vencido") {
      return "vencido";
    }

    if (filtroSelecionado === "vencendo" || item.tipoAlerta === "vencendo") {
      return "vencendo";
    }

    if (filtroSelecionado === "zerados" || item.tipoAlerta === "zerado") {
      return "zerado";
    }

    if (filtroSelecionado === "baixo" || item.tipoAlerta === "baixo") {
      return "baixo";
    }

    return item.tipoAlerta || "geral";
  };

  const definirMensagemAlerta = (item: ItemComAlerta) => {
    const tipo = definirTipoAlerta(item);

    if (tipo === "vencido") {
      const dias = Math.abs(Number(item.diasRestantes || 0));

      return dias === 1
        ? "Produto vencido há 1 dia."
        : `Produto vencido há ${dias} dias.`;
    }

    if (tipo === "vencendo") {
      if (item.diasRestantes === 0) {
        return "Produto vence hoje.";
      }

      if (item.diasRestantes === 1) {
        return "Produto vence amanhã.";
      }

      return `Produto vence em ${item.diasRestantes} dias.`;
    }

    if (tipo === "zerado") {
      return "Produto sem quantidade disponível.";
    }

    if (tipo === "baixo") {
      return "Produto com pouca quantidade em estoque.";
    }

    return "Produto precisa de atenção.";
  };

  const definirCores = (tipo: string) => {
    if (tipo === "vencido" || tipo === "zerado") {
      return {
        fundo: colors.perigoFundo,
        borda: colors.perigo,
        texto: colors.perigo,
      };
    }

    if (tipo === "vencendo" || tipo === "baixo") {
      return {
        fundo: colors.alertaFundo,
        borda: colors.alerta,
        texto: colors.alerta,
      };
    }

    return {
      fundo: colors.card,
      borda: colors.borda,
      texto: colors.texto,
    };
  };

  const situacaoGeral =
    totalAlertas === 0
      ? "Nenhum alerta no momento"
      : "Existem itens que precisam de atenção";

  const descricaoSituacao =
    totalAlertas === 0
      ? "O estoque não possui produtos vencidos, próximos do vencimento, baixos ou zerados."
      : "Confira os itens listados para evitar desperdício, falta de produtos ou uso de itens vencidos.";

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

  const CardSituacao = () => {
    const estaTudoBem = totalAlertas === 0;

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${situacaoGeral}. ${descricaoSituacao}`}
        style={{
          backgroundColor: estaTudoBem ? colors.sucessoFundo : colors.alertaFundo,
          borderWidth: 1,
          borderColor: estaTudoBem ? colors.sucesso : colors.alerta,
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
          Situação geral
        </Text>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: colors.texto,
            marginBottom: 6,
          }}
        >
          {situacaoGeral}
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

  const BotaoFiltro = ({
    texto,
    valor,
  }: {
    texto: string;
    valor: string;
  }) => {
    const selecionado = filtroSelecionado === valor;

    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
        accessibilityHint="Toque duas vezes para filtrar os alertas."
        onPress={() => setFiltroSelecionado(valor)}
        style={({ pressed }) => [
          styles.opcao,
          {
            minHeight: 46,
            justifyContent: "center",
            opacity: pressed ? 0.65 : 1,
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
  };

  const CardAlerta = ({ item }: { item: ItemComAlerta }) => {
    const tipo = definirTipoAlerta(item);
    const cores = definirCores(tipo);

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Alerta do item ${
          item.nome || "sem nome"
        }. ${definirMensagemAlerta(item)} Quantidade atual: ${
          item.quantidadeAtual
        } ${item.tipoQuantidade || "unidades"}. Validade: ${
          item.validade || "não informada"
        }.`}
        style={{
          backgroundColor: cores.fundo,
          borderColor: cores.borda,
          borderWidth: 1,
          borderRadius: 18,
          padding: 15,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: colors.texto,
            marginBottom: 6,
          }}
        >
          {item.nome || "Item sem nome"}
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
          {item.categoriaGeral || "Categoria geral não informada"} •{" "}
          {item.categoria || "Categoria não informada"}
        </Text>

        <Text
          style={{
            color: colors.texto,
            fontWeight: "800",
            marginTop: 8,
          }}
        >
          Quantidade: {item.quantidadeAtual}{" "}
          {item.tipoQuantidade || "unidades"}
        </Text>

        <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
          Validade: {item.validade || "Não informada"}
        </Text>

        {item.origem && (
          <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
            Origem: {item.origem}
          </Text>
        )}

        <Text
          style={{
            marginTop: 10,
            color: cores.texto,
            fontWeight: "900",
            lineHeight: 21,
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
        <ActivityIndicator
          size="large"
          color={colors.principal}
          accessibilityLabel="Carregando alertas do estoque"
        />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando alertas...
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
        Alertas
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Veja os itens que precisam de atenção no estoque.
      </Text>

      <CardSituacao />

      <Bloco
        titulo="Resumo dos alertas"
        descricao="Acompanhe rapidamente os principais problemas encontrados no estoque."
      >
        <LinhaResumo
          titulo="Total de alertas"
          valor={totalAlertas}
          descricao="Todos os pontos de atenção encontrados"
          tipo={totalAlertas > 0 ? "alerta" : "sucesso"}
        />

        <LinhaResumo
          titulo="Vencidos"
          valor={itensVencidos.length}
          descricao="Produtos fora da validade"
          tipo={itensVencidos.length > 0 ? "perigo" : "sucesso"}
        />

        <LinhaResumo
          titulo="Vencem em até 7 dias"
          valor={itensVencendo.length}
          descricao="Produtos para usar primeiro"
          tipo={itensVencendo.length > 0 ? "alerta" : "sucesso"}
        />

        <LinhaResumo
          titulo="Estoque baixo"
          valor={itensEstoqueBaixo.length}
          descricao="Produtos com pouca quantidade"
          tipo={itensEstoqueBaixo.length > 0 ? "alerta" : "sucesso"}
        />

        <LinhaResumo
          titulo="Itens zerados"
          valor={itensZerados.length}
          descricao="Produtos sem quantidade disponível"
          tipo={itensZerados.length > 0 ? "perigo" : "sucesso"}
        />
      </Bloco>

      <Bloco
        titulo="Filtrar alertas"
        descricao="Escolha qual tipo de alerta deseja visualizar."
      >
        <View style={styles.opcoes}>
          <BotaoFiltro texto="Todos" valor="todos" />
          <BotaoFiltro texto="Vencidos" valor="vencidos" />
          <BotaoFiltro texto="Vencem logo" valor="vencendo" />
          <BotaoFiltro texto="Estoque baixo" valor="baixo" />
          <BotaoFiltro texto="Zerados" valor="zerados" />
        </View>
      </Bloco>

      <Text accessibilityRole="header" style={styles.subtitulo}>
        Itens com alerta
      </Text>

      {listaAtual.length === 0 ? (
        <Text style={styles.listaVazia}>
          Nenhum alerta encontrado para esse filtro.
        </Text>
      ) : (
        listaAtual.map((item) => (
          <CardAlerta
            key={`${item.id}-${item.tipoAlerta || filtroSelecionado}`}
            item={item}
          />
        ))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}