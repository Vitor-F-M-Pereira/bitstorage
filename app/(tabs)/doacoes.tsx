import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

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

const opcoesPrioridade = [
  { id: "alta", texto: "Alta" },
  { id: "media", texto: "Média" },
  { id: "baixa", texto: "Baixa" },
];

const opcoesFiltro = [
  { id: "todos", texto: "Todos" },
  { id: "alta", texto: "Alta prioridade" },
  { id: "baixa", texto: "Estoque baixo" },
  { id: "zerados", texto: "Em falta" },
  { id: "campanha", texto: "Campanhas" },
] as const;

type Filtro = (typeof opcoesFiltro)[number]["id"];

type Alimento = {
  id: string;
  nome?: string;
  categoria?: string;
  categoriaGeral?: string;
  quantidade?: number;
  tipoQuantidade?: string;
  prioridadeDoacao?: boolean;
  nivelPrioridadeDoacao?: string;
  motivoPrioridadeDoacao?: string;
  [key: string]: any;
};

type ItemPrioritario = {
  id: string;
  nome?: string;
  categoria?: string;
  categoriaGeral?: string;
  motivo?: string;
  tipoQuantidade?: string;
  prioridadeDoacao?: boolean;
  nivelPrioridadeDoacao?: string;
  campanha?: boolean;
  manual?: boolean;
  criadoEm?: any;
  [key: string]: any;
};

type Doacao = {
  id: string;
  doadorId?: string;
  nomeDoador?: string;
  tipoDoador?: string;
  cidade?: string;
  contato?: string;
  categoria?: string;
  categoriaGeral?: string;
  produto?: string;
  quantidade?: number;
  tipoQuantidade?: string;
  data?: any;
  mes?: string;
  ano?: string;
  [key: string]: any;
};

type ItemNecessario = {
  id: string;
  nome: string;
  categoria: string;
  categoriaGeral: string;
  quantidade: number;
  tipoQuantidade: string;
  motivo: string;
  prioridadeNivel: string;
  prioridadeTitulo: string;
  campanha: boolean;
  manual: boolean;
  origemLista: "estoque" | "manual";
};

type DoadorRecomendado = {
  chave: string;
  nome: string;
  cidade: string;
  contato: string;
  tipoDoador: string;
  categorias: string[];
  produtos: string[];
  frequencia: number;
  ultimaDoacaoTexto: string;
  meses: string[];
  score: number;
};

const LIMITE_ESTOQUE_BAIXO = 10;

const normalizarTexto = (texto: string) =>
  String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const obterData = (valor: any) => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor?.toDate === "function") return valor.toDate();
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
};

const formatarData = (valor: any) => {
  const data = obterData(valor);
  if (!data) return "Data não informada";
  return data.toLocaleDateString("pt-BR");
};

const formatarMesAno = (valor: any) => {
  const data = obterData(valor);
  if (!data) return "mês não informado";
  return data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const obterCategoriaGeral = (categoria: string) => {
  for (const [grupo, categorias] of Object.entries(categoriasPorGrupo)) {
    if (categorias.some((item) => normalizarTexto(item) === normalizarTexto(categoria))) {
      return grupo;
    }
  }

  return "Outros";
};

const gerarMensagem = (item: ItemNecessario, doador: DoadorRecomendado) => {
  const complemento = item.campanha
    ? "Estamos organizando uma campanha de arrecadação"
    : "Estamos atualizando a lista de itens prioritários";

  return `Olá, ${doador.nome}! Aqui é da Casa da Criança. ${complemento} e estamos precisando de ${item.nome}. Como você já contribuiu com itens da categoria ${item.categoria}, gostaríamos de saber se poderia ajudar novamente. Muito obrigado!`;
};

function BotaoOpcao({
  texto,
  selecionado,
  onPress,
  disabled = false,
}: {
  texto: string;
  selecionado: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opcao,
        {
          minHeight: 44,
          justifyContent: "center",
          opacity: disabled || pressed ? 0.65 : 1,
        },
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
}

export default function Doacoes() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [itensManuais, setItensManuais] = useState<ItemPrioritario[]>([]);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [novoItem, setNovoItem] = useState("");
  const [categoriaGeral, setCategoriaGeral] = useState("Alimentos");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [nivelPrioridade, setNivelPrioridade] = useState("alta");
  const [campanha, setCampanha] = useState(true);
  const [motivoNovoItem, setMotivoNovoItem] = useState("");
  const [salvandoItem, setSalvandoItem] = useState(false);

  useEffect(() => {
    const consulta = query(collection(db, "alimentos"), orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: Alimento[] = [];

        snapshot.forEach((documento) => {
          lista.push({ id: documento.id, ...documento.data() });
        });

        setAlimentos(lista);
        setCarregando(false);
      },
      (error) => {
        console.log(error);
        setCarregando(false);
        Alert.alert("Erro", "Não foi possível carregar os itens do estoque.");
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
        const lista: ItemPrioritario[] = [];

        snapshot.forEach((documento) => {
          lista.push({ id: documento.id, ...documento.data(), manual: true });
        });

        setItensManuais(lista);
      },
      (error) => {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar os pedidos manuais.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(collection(db, "doacoes"), orderBy("data", "desc"));

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: Doacao[] = [];

        snapshot.forEach((documento) => {
          lista.push({ id: documento.id, ...documento.data() } as Doacao);
        });

        setDoacoes(lista);
      },
      (error) => {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar o histórico de doadores.");
      }
    );

    return () => unsubscribe();
  }, []);

  const selecionarCategoriaGeral = (grupo: string) => {
    const primeiraCategoria =
      categoriasPorGrupo[grupo as keyof typeof categoriasPorGrupo][0];

    setCategoriaGeral(grupo);
    setCategoria(primeiraCategoria);
  };

  const estoqueBaixo = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const tipoQuantidade = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidade <= 0) return false;

    if (["kg", "litros", "unidades"].includes(tipoQuantidade)) {
      return quantidade < LIMITE_ESTOQUE_BAIXO;
    }

    return quantidade < LIMITE_ESTOQUE_BAIXO;
  };

  const obterPrioridade = (item: Alimento) => {
    const quantidade = Number(item.quantidade || 0);
    const nivelManual = String(item.nivelPrioridadeDoacao || "").toLowerCase();

    if (quantidade <= 0 || item.prioridadeDoacao || nivelManual === "alta") {
      return {
        nivel: "alta",
        titulo: "Alta prioridade",
        motivo:
          item.motivoPrioridadeDoacao ||
          (quantidade <= 0
            ? "Este item está em falta no estoque."
            : "Este item foi marcado como prioridade para doação."),
      };
    }

    if (estoqueBaixo(item) || nivelManual === "media") {
      return {
        nivel: "media",
        titulo: estoqueBaixo(item) ? "Estoque baixo" : "Prioridade média",
        motivo:
          item.motivoPrioridadeDoacao ||
          "A quantidade atual está baixa e merece reposição.",
      };
    }

    return {
      nivel: "baixa",
      titulo: "Pode doar",
      motivo:
        item.motivoPrioridadeDoacao ||
        "Item útil para manter a despensa abastecida.",
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
        categoria,
        categoriaGeral,
        motivo:
          motivoNovoItem.trim() ||
          "Item solicitado manualmente pela equipe da cozinha.",
        tipoQuantidade: "unidades",
        prioridadeDoacao: true,
        nivelPrioridadeDoacao: nivelPrioridade,
        campanha,
        criadoEm: serverTimestamp(),
      });

      setNovoItem("");
      setMotivoNovoItem("");
      setNivelPrioridade("alta");
      setCampanha(true);
      Alert.alert("Sucesso", "Item prioritário cadastrado.");
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

  const itensNecessarios = useMemo<ItemNecessario[]>(() => {
    const automaticos = alimentos
      .map((item) => {
        const prioridade = obterPrioridade(item);
        const quantidade = Number(item.quantidade || 0);
        const categoriaItem = item.categoria || "Outros";

        return {
          id: item.id,
          nome: item.nome || "Item sem nome",
          categoria: categoriaItem,
          categoriaGeral: item.categoriaGeral || obterCategoriaGeral(categoriaItem),
          quantidade,
          tipoQuantidade: item.tipoQuantidade || "unidades",
          motivo: prioridade.motivo,
          prioridadeNivel: prioridade.nivel,
          prioridadeTitulo: prioridade.titulo,
          campanha: Boolean(item.prioridadeDoacao),
          manual: false,
          origemLista: "estoque" as const,
        };
      })
      .filter((item) => {
        const baixo = item.quantidade > 0 && item.quantidade < LIMITE_ESTOQUE_BAIXO;
        const zerado = item.quantidade <= 0;
        const campanhaItem = item.campanha;

        if (filtro === "alta") return item.prioridadeNivel === "alta";
        if (filtro === "baixa") return baixo;
        if (filtro === "zerados") return zerado;
        if (filtro === "campanha") return campanhaItem;

        return zerado || baixo || campanhaItem || item.prioridadeNivel === "media";
      });

    const manuais = itensManuais
      .map((item) => ({
        id: item.id,
        nome: item.nome || "Item necessário",
        categoria: item.categoria || "Outros",
        categoriaGeral: item.categoriaGeral || obterCategoriaGeral(item.categoria || "Outros"),
        quantidade: 0,
        tipoQuantidade: item.tipoQuantidade || "unidades",
        motivo:
          item.motivo ||
          item.motivoPrioridadeDoacao ||
          "Item solicitado manualmente pela equipe.",
        prioridadeNivel: item.nivelPrioridadeDoacao || "alta",
        prioridadeTitulo:
          item.nivelPrioridadeDoacao === "media"
            ? "Prioridade média"
            : item.nivelPrioridadeDoacao === "baixa"
              ? "Baixa prioridade"
              : "Alta prioridade",
        campanha: item.campanha === true,
        manual: true,
        origemLista: "manual" as const,
      }))
      .filter((item) => {
        if (filtro === "alta") return item.prioridadeNivel === "alta";
        if (filtro === "baixa") return false;
        if (filtro === "zerados") return false;
        if (filtro === "campanha") return item.campanha;
        return true;
      });

    return [...manuais, ...automaticos].sort((a, b) => {
      const peso = { alta: 3, media: 2, baixa: 1 } as Record<string, number>;
      return (peso[b.prioridadeNivel] || 0) - (peso[a.prioridadeNivel] || 0);
    });
  }, [alimentos, itensManuais, filtro]);

  const recomendarDoadores = (item: ItemNecessario) => {
    const agrupados = new Map<string, DoadorRecomendado & { ultimaData?: Date }>();

    doacoes.forEach((doacao) => {
      const nome = String(doacao.nomeDoador || "").trim();
      const contato = String(doacao.contato || "").trim();

      if (!nome && !contato) return;

      const chave = doacao.doadorId || normalizarTexto(`${nome}-${contato}`);
      const categoriaDoada = doacao.categoria || "Categoria não informada";
      const categoriaGeralDoada =
        doacao.categoriaGeral || obterCategoriaGeral(categoriaDoada);
      const produtoDoado = doacao.produto || "Item não informado";
      const data = obterData(doacao.data);

      const registroAtual = agrupados.get(chave) || {
        chave,
        nome: nome || "Doador sem nome",
        cidade: doacao.cidade || "Cidade não informada",
        contato: contato || "Contato não informado",
        tipoDoador: doacao.tipoDoador || "Doador",
        categorias: [],
        produtos: [],
        frequencia: 0,
        ultimaDoacaoTexto: "Data não informada",
        meses: [],
        score: 0,
        ultimaData: undefined,
      };

      registroAtual.frequencia += 1;

      if (!registroAtual.categorias.includes(categoriaDoada)) {
        registroAtual.categorias.push(categoriaDoada);
      }

      if (!registroAtual.produtos.includes(produtoDoado)) {
        registroAtual.produtos.push(produtoDoado);
      }

      const mesAno = formatarMesAno(doacao.data);
      if (!registroAtual.meses.includes(mesAno)) {
        registroAtual.meses.push(mesAno);
      }

      const mesmaCategoria =
        normalizarTexto(categoriaDoada) === normalizarTexto(item.categoria);
      const mesmoGrupo =
        normalizarTexto(categoriaGeralDoada) === normalizarTexto(item.categoriaGeral);
      const mesmoProduto =
        normalizarTexto(produtoDoado).includes(normalizarTexto(item.nome)) ||
        normalizarTexto(item.nome).includes(normalizarTexto(produtoDoado));

      if (mesmaCategoria) registroAtual.score += 5;
      if (mesmoGrupo) registroAtual.score += 2;
      if (mesmoProduto) registroAtual.score += 3;
      registroAtual.score += 0.25;

      if (data) {
        const diasDesdeDoacao =
          (Date.now() - data.getTime()) / (1000 * 60 * 60 * 24);

        if (diasDesdeDoacao <= 180) registroAtual.score += 1;

        if (!registroAtual.ultimaData || data > registroAtual.ultimaData) {
          registroAtual.ultimaData = data;
          registroAtual.ultimaDoacaoTexto = formatarData(doacao.data);
        }
      }

      agrupados.set(chave, registroAtual);
    });

    return Array.from(agrupados.values())
      .filter((doador) => doador.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const abrirContato = async (item: ItemNecessario, doador: DoadorRecomendado) => {
    const mensagem = gerarMensagem(item, doador);
    const contato = String(doador.contato || "").trim();
    const somenteNumeros = contato.replace(/\D/g, "");

    try {
      if (somenteNumeros.length >= 10) {
        const numero = somenteNumeros.startsWith("55")
          ? somenteNumeros
          : `55${somenteNumeros}`;
        const urlApp = `whatsapp://send?phone=${numero}&text=${encodeURIComponent(mensagem)}`;
        const urlWeb = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

        const podeAbrirApp = await Linking.canOpenURL(urlApp);
        await Linking.openURL(podeAbrirApp ? urlApp : urlWeb);
        return;
      }

      if (contato.includes("@")) {
        await Linking.openURL(
          `mailto:${contato}?subject=${encodeURIComponent("Pedido de doação - Casa da Criança")}&body=${encodeURIComponent(mensagem)}`
        );
        return;
      }

      Alert.alert("Contato do doador", `${doador.nome}\n${contato}\n\n${mensagem}`);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível abrir o contato do doador.");
    }
  };

  const totalAlta = itensNecessarios.filter(
    (item) => item.prioridadeNivel === "alta"
  ).length;
  const totalBaixo = alimentos.filter((item) => estoqueBaixo(item)).length;
  const totalCampanhas = itensNecessarios.filter((item) => item.campanha).length;

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
        style={{
          backgroundColor: fundo,
          borderWidth: 1,
          borderColor: cor,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: cor, fontWeight: "900", fontSize: 26 }}>{valor}</Text>
        <Text style={{ color: colors.texto, fontWeight: "900", fontSize: 15 }}>
          {titulo}
        </Text>
        <Text style={{ color: colors.textoSuave, marginTop: 3, lineHeight: 19 }}>
          {descricao}
        </Text>
      </View>
    );
  };

  const CardItem = ({ item }: { item: ItemNecessario }) => {
    const doadoresRecomendados = recomendarDoadores(item);
    const corPrioridade =
      item.prioridadeNivel === "alta"
        ? colors.perigo
        : item.prioridadeNivel === "media"
          ? colors.alerta
          : colors.sucesso;
    const fundoPrioridade =
      item.prioridadeNivel === "alta"
        ? colors.perigoFundo
        : item.prioridadeNivel === "media"
          ? colors.alertaFundo
          : colors.sucessoFundo;

    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borda,
          borderRadius: 20,
          padding: 16,
          marginBottom: 14,
        }}
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
            <Text style={{ color: colors.texto, fontSize: 19, fontWeight: "900" }}>
              {item.nome}
            </Text>
            <Text style={{ color: colors.textoSuave, marginTop: 3 }}>
              {item.categoria} • {item.categoriaGeral}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: fundoPrioridade,
              borderColor: corPrioridade,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: corPrioridade, fontWeight: "900", fontSize: 12 }}>
              {item.prioridadeTitulo}
            </Text>
          </View>
        </View>

        {item.origemLista === "estoque" && (
          <Text style={{ color: colors.texto, marginTop: 10, lineHeight: 20 }}>
            Quantidade atual: {item.quantidade} {item.tipoQuantidade}
          </Text>
        )}

        {item.campanha && (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              backgroundColor: colors.principalClaro,
              borderColor: colors.principal,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Ionicons name="megaphone-outline" color={colors.principalEscuro} size={16} />
            <Text style={{ color: colors.principalEscuro, fontWeight: "900" }}>
              Campanha ativa
            </Text>
          </View>
        )}

        <Text style={{ color: colors.textoSuave, marginTop: 10, lineHeight: 20 }}>
          {item.motivo}
        </Text>

        <View
          style={{
            marginTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.borda,
            paddingTop: 12,
          }}
        >
          <Text style={{ color: colors.texto, fontWeight: "900", marginBottom: 8 }}>
            Doadores recomendados
          </Text>

          {doadoresRecomendados.length === 0 ? (
            <Text style={{ color: colors.textoSuave, lineHeight: 20 }}>
              Ainda não há histórico suficiente de doadores para esta categoria.
            </Text>
          ) : (
            doadoresRecomendados.map((doador) => (
              <View
                key={doador.chave}
                style={{
                  backgroundColor: colors.fundo,
                  borderWidth: 1,
                  borderColor: colors.borda,
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: colors.texto, fontWeight: "900", fontSize: 16 }}>
                  {doador.nome}
                </Text>
                <Text style={{ color: colors.textoSuave, marginTop: 3, lineHeight: 19 }}>
                  {doador.cidade} • {doador.tipoDoador}
                </Text>
                <Text style={{ color: colors.textoSuave, marginTop: 3, lineHeight: 19 }}>
                  Costuma doar: {doador.categorias.slice(0, 3).join(", ")}
                </Text>
                <Text style={{ color: colors.textoSuave, marginTop: 3, lineHeight: 19 }}>
                  Frequência: {doador.frequencia} doação(ões) • Última: {doador.ultimaDoacaoTexto}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Entrar em contato com ${doador.nome}`}
                  onPress={() => abrirContato(item, doador)}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    minHeight: 46,
                    borderRadius: 14,
                    backgroundColor: colors.principal,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.75 : 1,
                    flexDirection: "row",
                    gap: 8,
                  })}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>
                    Gerar mensagem
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {item.manual && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.nome} da lista`}
            onPress={() => removerItemManual(item.id)}
            style={({ pressed }) => ({
              marginTop: 4,
              minHeight: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.perigo,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.perigo, fontWeight: "900" }}>
              Remover pedido manual
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
          Carregando itens prioritários...
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
          Itens prioritários
        </Text>

        <Text style={styles.subtituloPrincipal}>
          Cadastre necessidades da cozinha e veja doadores recomendados pelo histórico de doações.
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
            descricao="Itens em falta ou marcados como urgentes."
            tipo="perigo"
          />
          <CardResumo
            titulo="Estoque baixo"
            valor={totalBaixo}
            descricao="Itens abaixo de 10 kg, 10 litros ou 10 unidades."
            tipo="alerta"
          />
          <CardResumo
            titulo="Campanhas"
            valor={totalCampanhas}
            descricao="Pedidos manuais marcados como campanha."
            tipo="sucesso"
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
          <Text style={styles.subtitulo}>Cadastrar item prioritário</Text>
          <Text style={{ color: colors.textoSuave, lineHeight: 20, marginBottom: 12 }}>
            A equipe informa o que está precisando. O app cruza a categoria com o histórico dos doadores e sugere contatos.
          </Text>

          <Text style={styles.label}>Item necessário</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Feijão, leite, sabonete..."
            value={novoItem}
            onChangeText={setNovoItem}
            editable={!salvandoItem}
          />

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.grupoOpcoes}>
            {Object.keys(categoriasPorGrupo).map((grupo) => (
              <BotaoOpcao
                key={grupo}
                texto={grupo}
                selecionado={categoriaGeral === grupo}
                disabled={salvandoItem}
                onPress={() => selecionarCategoriaGeral(grupo)}
              />
            ))}
          </View>

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.grupoOpcoes}>
            {categoriasPorGrupo[categoriaGeral as keyof typeof categoriasPorGrupo].map(
              (opcao) => (
                <BotaoOpcao
                  key={opcao}
                  texto={opcao}
                  selecionado={categoria === opcao}
                  disabled={salvandoItem}
                  onPress={() => setCategoria(opcao)}
                />
              )
            )}
          </View>

          <Text style={styles.label}>Nível de prioridade</Text>
          <View style={styles.grupoOpcoes}>
            {opcoesPrioridade.map((opcao) => (
              <BotaoOpcao
                key={opcao.id}
                texto={opcao.texto}
                selecionado={nivelPrioridade === opcao.id}
                disabled={salvandoItem}
                onPress={() => setNivelPrioridade(opcao.id)}
              />
            ))}
          </View>

          <Text style={styles.label}>É campanha?</Text>
          <View style={styles.grupoOpcoes}>
            <BotaoOpcao
              texto="Sim"
              selecionado={campanha}
              disabled={salvandoItem}
              onPress={() => setCampanha(true)}
            />
            <BotaoOpcao
              texto="Não"
              selecionado={!campanha}
              disabled={salvandoItem}
              onPress={() => setCampanha(false)}
            />
          </View>

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
            accessibilityLabel="Adicionar item prioritário"
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
              <Text style={styles.textoBotao}>Adicionar item prioritário</Text>
            )}
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.borda,
            borderRadius: 20,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={[styles.subtitulo, { marginHorizontal: 4 }]}>Filtrar lista</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 4 }}
          >
            {opcoesFiltro.map((opcao) => (
              <Pressable
                key={opcao.id}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${opcao.texto}`}
                onPress={() => setFiltro(opcao.id)}
                style={({ pressed }) => ({
                  minHeight: 42,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: filtro === opcao.id ? colors.principal : colors.borda,
                  backgroundColor:
                    filtro === opcao.id ? colors.principalClaro : colors.card,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color:
                      filtro === opcao.id ? colors.principalEscuro : colors.textoSuave,
                    fontWeight: "900",
                  }}
                >
                  {opcao.texto}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {itensNecessarios.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.borda,
              borderRadius: 20,
              padding: 18,
            }}
          >
            <Text style={{ color: colors.texto, fontWeight: "900", fontSize: 17 }}>
              Nenhum item prioritário encontrado
            </Text>
            <Text style={{ color: colors.textoSuave, lineHeight: 20, marginTop: 6 }}>
              Cadastre uma necessidade manual ou registre itens no estoque com baixa quantidade.
            </Text>
          </View>
        ) : (
          itensNecessarios.map((item) => <CardItem key={`${item.origemLista}-${item.id}`} item={item} />)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
