import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
  prioridadeDoacao?: boolean;
  nivelPrioridadeDoacao?: "baixa" | "media" | "alta" | string;
  motivoPrioridadeDoacao?: string;
  [key: string]: any;
};

type ItemManual = {
  id: string;
  nome?: string;
  motivo?: string;
  tipoQuantidade?: string;
  criadoEm?: any;
  manual?: boolean;
  [key: string]: any;
};

type Filtro = "todos" | "alta" | "baixa" | "zerados" | "manual";

const opcoesFiltro: { id: Filtro; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "alta", texto: "Alta prioridade" },
  { id: "baixa", texto: "Estoque baixo" },
  { id: "zerados", texto: "Em falta" },
  { id: "manual", texto: "Campanha" },
];

export default function Doacoes() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [itensManuais, setItensManuais] = useState<ItemManual[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [novoItem, setNovoItem] = useState("");
  const [motivoNovoItem, setMotivoNovoItem] = useState("");
  const [salvandoItem, setSalvandoItem] = useState(false);

  useEffect(() => {
    const consulta = query(collection(db, "alimentos"), orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: Alimento[] = [];

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
        Alert.alert("Erro", "Não foi possível carregar os itens necessários.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(
      collection(db, "itensPrioritarios"),
      orderBy("criadoEm", "desc")
    );

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: ItemManual[] = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
            manual: true,
          });
        });

        setItensManuais(lista);
      },
      (error) => {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar os itens manuais.");
      }
    );

    return () => unsubscribe();
  }, []);

  const LIMITE_ESTOQUE_BAIXO = 10;

  const estoqueBaixo = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const tipoQuantidade = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidade <= 0) return false;

    if (
      tipoQuantidade === "kg" ||
      tipoQuantidade === "litros" ||
      tipoQuantidade === "unidades"
    ) {
      return quantidade < LIMITE_ESTOQUE_BAIXO;
    }

    return quantidade < LIMITE_ESTOQUE_BAIXO;
  };

  const obterPrioridade = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const nivelManual = String(item.nivelPrioridadeDoacao || "").toLowerCase();

    if (quantidade <= 0) {
      return {
        nivel: "alta",
        titulo: "Alta prioridade",
        motivo: "Este item está em falta no estoque.",
        cor: colors.perigo,
        fundo: colors.perigoFundo,
      };
    }

    if (item.prioridadeDoacao || nivelManual === "alta") {
      return {
        nivel: "alta",
        titulo: "Alta prioridade",
        motivo:
          item.motivoPrioridadeDoacao ||
          "Este item foi marcado como prioridade para campanha de doação.",
        cor: colors.perigo,
        fundo: colors.perigoFundo,
      };
    }

    if (nivelManual === "media") {
      return {
        nivel: "media",
        titulo: "Prioridade média",
        motivo:
          item.motivoPrioridadeDoacao ||
          "Este item ajuda a manter a despensa preparada.",
        cor: colors.alerta,
        fundo: colors.alertaFundo,
      };
    }

    if (estoqueBaixo(item)) {
      return {
        nivel: "media",
        titulo: "Estoque baixo",
        motivo: "A quantidade atual está baixa e merece reposição.",
        cor: colors.alerta,
        fundo: colors.alertaFundo,
      };
    }

    return {
      nivel: "baixa",
      titulo: "Pode doar",
      motivo: "Item útil para manter a despensa abastecida.",
      cor: colors.sucesso,
      fundo: colors.sucessoFundo,
    };
  };

  const cadastrarItemManual = async () => {
    if (salvandoItem) return;

    const nomeTratado = novoItem.trim();

    if (nomeTratado.length < 2) {
      Alert.alert("Atenção", "Informe o nome do item necessário.");
      return;
    }

    try {
      setSalvandoItem(true);

      await addDoc(collection(db, "itensPrioritarios"), {
        nome: nomeTratado,
        motivo:
          motivoNovoItem.trim() ||
          "Item solicitado manualmente pela equipe da cozinha.",
        tipoQuantidade: "unidades",
        prioridadeDoacao: true,
        nivelPrioridadeDoacao: "alta",
        criadoEm: serverTimestamp(),
      });

      setNovoItem("");
      setMotivoNovoItem("");
      Alert.alert("Sucesso", "Item adicionado à lista de doações.");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível adicionar o item.");
    } finally {
      setSalvandoItem(false);
    }
  };

  const removerItemManual = async (id: string) => {
    try {
      await deleteDoc(doc(db, "itensPrioritarios", id));
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível remover o item.");
    }
  };

  const itensNecessarios = useMemo(() => {
    const automaticos = alimentos
      .map((item) => ({ ...item, prioridadeCalculada: obterPrioridade(item) }))
      .filter((item) => {
        const quantidade = Number(item.quantidade || 0);
        const manual = item.prioridadeDoacao === true;
        const baixo = estoqueBaixo(item);
        const nivel = item.prioridadeCalculada.nivel;

        if (filtro === "alta") return nivel === "alta";
        if (filtro === "baixa") return baixo;
        if (filtro === "zerados") return quantidade <= 0;
        if (filtro === "manual") return manual;

        return quantidade <= 0 || baixo || manual || nivel === "media";
      });

    const manuais = itensManuais
      .map((item) => ({
        ...item,
        categoriaGeral: "Solicitado",
        categoria: "Lista manual",
        quantidade: 0,
        tipoQuantidade: item.tipoQuantidade || "unidades",
        prioridadeDoacao: true,
        prioridadeCalculada: {
          nivel: "alta",
          titulo: "Pedido da cozinha",
          motivo:
            item.motivo ||
            "Item solicitado manualmente pela equipe da cozinha.",
          cor: colors.perigo,
          fundo: colors.perigoFundo,
        },
      }))
      .filter(() => filtro === "todos" || filtro === "alta" || filtro === "manual");

    return [...manuais, ...automaticos].sort((a, b) => {
      const peso: Record<string, number> = { alta: 1, media: 2, baixa: 3 };
      const prioridadeA = peso[a.prioridadeCalculada.nivel] || 4;
      const prioridadeB = peso[b.prioridadeCalculada.nivel] || 4;

      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

      return String(a.nome || "").localeCompare(String(b.nome || ""));
    });
  }, [alimentos, itensManuais, filtro]);

  const totalAlta =
    alimentos.filter((item) => obterPrioridade(item).nivel === "alta").length +
    itensManuais.length;
  const totalBaixo = alimentos.filter((item) => estoqueBaixo(item)).length;
  const totalZerados = alimentos.filter(
    (item) => Number(item.quantidade || 0) <= 0
  ).length;

  const formatarQuantidade = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const tipo = item.tipoQuantidade || "unidades";

    if (item.manual) return "Solicitado pela equipe";

    return `${quantidade} ${tipo}`;
  };

  const BotaoFiltro = ({ id, texto }: { id: Filtro; texto: string }) => {
    const selecionado = filtro === id;

    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
        accessibilityHint="Filtra a lista de itens necessários para doação."
        onPress={() => setFiltro(id)}
        style={({ pressed }) => [
          styles.opcao,
          {
            minHeight: 46,
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
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

  const CardResumo = ({
    titulo,
    valor,
    descricao,
    tipo,
  }: {
    titulo: string;
    valor: number;
    descricao: string;
    tipo: "perigo" | "alerta" | "sucesso";
  }) => {
    const cor =
      tipo === "perigo"
        ? colors.perigo
        : tipo === "alerta"
        ? colors.alerta
        : colors.sucesso;

    const fundo =
      tipo === "perigo"
        ? colors.perigoFundo
        : tipo === "alerta"
        ? colors.alertaFundo
        : colors.sucessoFundo;

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${titulo}. Total: ${valor}. ${descricao}`}
        style={{
          backgroundColor: fundo,
          borderColor: cor,
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: colors.texto, fontWeight: "900", fontSize: 16 }}>
          {titulo}
        </Text>
        <Text style={{ color: cor, fontWeight: "900", fontSize: 30, marginTop: 4 }}>
          {valor}
        </Text>
        <Text style={{ color: colors.textoSuave, lineHeight: 20, marginTop: 2 }}>
          {descricao}
        </Text>
      </View>
    );
  };

  const CardItem = ({ item }: { item: Alimento & { prioridadeCalculada: any } }) => {
    const prioridade = item.prioridadeCalculada;

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${item.nome || "Item"}. ${prioridade.titulo}. Quantidade atual: ${formatarQuantidade(item)}.`}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.borda,
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.texto,
                fontSize: 19,
                fontWeight: "900",
                marginBottom: 4,
              }}
            >
              {item.nome || "Item sem nome"}
            </Text>

            <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
              {item.categoriaGeral || "Categoria"} • {item.categoria || "Sem categoria"}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: prioridade.fundo,
              borderColor: prioridade.cor,
              borderWidth: 1,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: prioridade.cor, fontWeight: "900", fontSize: 13 }}>
              {prioridade.titulo}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            backgroundColor: colors.fundo,
            borderColor: colors.borda,
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Ionicons name="cube-outline" size={20} color={colors.principalEscuro} />
          <Text style={{ color: colors.texto, fontWeight: "800", flex: 1 }}>
            Estoque atual: {formatarQuantidade(item)}
          </Text>
        </View>

        <Text style={{ color: colors.textoSuave, lineHeight: 21, marginTop: 10 }}>
          {prioridade.motivo}
        </Text>

        {item.manual && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.nome || "item"} da lista manual`}
            onPress={() => removerItemManual(item.id)}
            style={({ pressed }) => ({
              marginTop: 12,
              minHeight: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.perigo,
              backgroundColor: colors.perigoFundo,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.perigo, fontWeight: "900" }}>
              Remover da lista
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.fundo,
        }}
      >
        <ActivityIndicator size="large" color={colors.principal} />
        <Text style={{ color: colors.textoSuave, marginTop: 10 }}>
          Carregando itens necessários...
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
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
      <Text accessibilityRole="header" style={styles.titulo}>
        Itens para doação
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Veja quais produtos a ONG mais precisa receber no momento.
      </Text>

      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.borda,
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={styles.subtitulo}>Resumo das necessidades</Text>
        <CardResumo
          titulo="Alta prioridade"
          valor={totalAlta}
          descricao="Itens em falta ou marcados para campanha."
          tipo="perigo"
        />
        <CardResumo
          titulo="Estoque baixo"
          valor={totalBaixo}
          descricao="Itens que ainda existem, mas precisam de reposição."
          tipo="alerta"
        />
        <CardResumo
          titulo="Em falta"
          valor={totalZerados}
          descricao="Itens com quantidade zerada no estoque."
          tipo="perigo"
        />
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.borda,
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={styles.subtitulo}>Adicionar pedido manual</Text>
        <Text style={{ color: colors.textoSuave, lineHeight: 20, marginBottom: 12 }}>
          Escreva um item que a cozinha ou administração precisa receber. Ele aparece também na lista pública do “Quero doar”.
        </Text>

        <Text style={styles.label}>Item necessário</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Feijão, leite, sabonete..."
          value={novoItem}
          onChangeText={setNovoItem}
          editable={!salvandoItem}
        />

        <Text style={styles.label}>Motivo ou observação</Text>
        <TextInput
          style={[styles.input, { minHeight: 88, textAlignVertical: "top" }]}
          placeholder="Ex: usado nas refeições da semana"
          value={motivoNovoItem}
          onChangeText={setMotivoNovoItem}
          editable={!salvandoItem}
          multiline
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar item à lista de doações"
          disabled={salvandoItem}
          onPress={cadastrarItemManual}
          style={({ pressed }) => [
            styles.botaoSalvar,
            { minHeight: 52, opacity: salvandoItem || pressed ? 0.65 : 1 },
          ]}
        >
          {salvandoItem ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBotao}>Adicionar à lista</Text>
          )}
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.borda,
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={styles.subtitulo}>Filtrar lista</Text>
        <View style={styles.opcoes}>
          {opcoesFiltro.map((opcao) => (
            <BotaoFiltro key={opcao.id} id={opcao.id} texto={opcao.texto} />
          ))}
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.subtitulo}>
        Produtos necessários
      </Text>

      <FlatList
        data={itensNecessarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CardItem item={item} />}
        scrollEnabled={false}
        ListEmptyComponent={
          <View
            style={{
              backgroundColor: colors.sucessoFundo,
              borderColor: colors.sucesso,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ color: colors.sucesso, fontWeight: "900", fontSize: 17 }}>
              Nenhum item crítico no momento
            </Text>
            <Text style={{ color: colors.textoSuave, lineHeight: 21, marginTop: 4 }}>
              A despensa não possui itens em falta ou com estoque baixo dentro deste filtro.
            </Text>
          </View>
        }
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
