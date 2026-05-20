import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
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

import { db } from "../services/firebaseConfig";
import { colors, styles } from "../styles/estoqueStyles";

const tiposQuantidade = ["unidades", "kg", "litros"];

type ItemNecessario = {
  id: string;
  nome: string;
  quantidade: number;
  tipoQuantidade: string;
  motivo: string;
  prioridadeNivel?: string | null;
};

function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarTelefone(valor: string) {
  const numeros = limparTelefone(valor).slice(0, 11);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(
      6
    )}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarData(texto: string) {
  const numeros = texto.replace(/\D/g, "").slice(0, 8);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }

  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function converterDataBrasileira(data: string) {
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
    mes > 12 ||
    ano < 2024
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
}

function gerarDataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function gerarProtocolo(contato: string) {
  const telefoneLimpo = limparTelefone(contato);
  return `${telefoneLimpo}_${gerarDataHoje()}`;
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type BotaoOpcaoProps = {
  texto: string;
  selecionado: boolean;
  carregando: boolean;
  aoPressionar: () => void;
};

function BotaoOpcao({
  texto,
  selecionado,
  carregando,
  aoPressionar,
}: BotaoOpcaoProps) {
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
      accessibilityHint="Toque duas vezes para selecionar."
      disabled={carregando}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.opcao,
        {
          minHeight: 46,
          justifyContent: "center",
          opacity: carregando || pressed ? 0.65 : 1,
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
}

type BlocoFormularioProps = {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
};

function BlocoFormulario({
  titulo,
  descricao,
  children,
}: BlocoFormularioProps) {
  return (
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
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {descricao}
        </Text>
      )}

      {children}
    </View>
  );
}

export default function QueroDoarScreen() {
  const [nomeDoador, setNomeDoador] = useState("");
  const [contatoDoador, setContatoDoador] = useState("");

  const [nomeItem, setNomeItem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const [site, setSite] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [modalItensAberto, setModalItensAberto] = useState(false);
  const [buscaItem, setBuscaItem] = useState("");
  const [itensAutomaticos, setItensAutomaticos] = useState<ItemNecessario[]>([]);
  const [itensManuais, setItensManuais] = useState<ItemNecessario[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "alimentos"),
      (snapshot) => {
        const lista = snapshot.docs
          .map((documento) => {
            const dados = documento.data() as any;

            const nome =
              String(
                dados.nome ||
                  dados.nomeProduto ||
                  dados.produto ||
                  dados.item ||
                  ""
              ).trim() || "Item sem nome";

            const quantidadeAtual = Number(dados.quantidade || 0);
            const tipo = dados.tipoQuantidade || "unidades";

            const prioridadeDoacao =
              dados.prioridadeDoacao === true ||
              dados.prioridade === true ||
              dados.itemPrioritario === true;

            const prioridadeNivel =
              dados.prioridadeNivel || dados.nivelPrioridade || null;

            const quantidadeMinima = 10;

            let motivo = "";

            if (quantidadeAtual <= 0) {
              motivo = "Em falta";
            } else if (quantidadeAtual < quantidadeMinima) {
              motivo = "Estoque baixo";
            } else if (prioridadeDoacao) {
              motivo = prioridadeNivel
                ? `Prioridade ${String(prioridadeNivel).toLowerCase()}`
                : "Prioridade de doação";
            }

            return {
              id: documento.id,
              nome,
              quantidade: quantidadeAtual,
              tipoQuantidade: tipo,
              motivo,
              prioridadeNivel,
            };
          })
          .filter((item) => item.motivo)
          .sort((a, b) => {
            const peso = (motivo: string) => {
              if (motivo === "Em falta") return 1;
              if (motivo === "Estoque baixo") return 2;
              return 3;
            };

            return peso(a.motivo) - peso(b.motivo);
          });

        setItensAutomaticos(lista);
        setCarregandoItens(false);
      },
      (error) => {
        console.log(error);
        setCarregandoItens(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "itensPrioritarios"),
      (snapshot) => {
        const lista = snapshot.docs
          .map((documento) => {
            const dados = documento.data() as any;

            const nome = String(dados.nome || "").trim() || "Item solicitado";
            const motivo =
              String(dados.motivo || "").trim() ||
              "Pedido da cozinha";

            return {
              id: `manual_${documento.id}`,
              nome,
              quantidade: 0,
              tipoQuantidade: dados.tipoQuantidade || "unidades",
              motivo,
              prioridadeNivel: "alta",
            };
          })
          .sort((a, b) => a.nome.localeCompare(b.nome));

        setItensManuais(lista);
      },
      (error) => {
        console.log(error);
      }
    );

    return () => unsubscribe();
  }, []);

  const itensNecessarios = useMemo(() => {
    return [...itensManuais, ...itensAutomaticos];
  }, [itensManuais, itensAutomaticos]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaItem);

    if (!termo) return itensNecessarios;

    return itensNecessarios.filter((item) =>
      normalizarTexto(`${item.nome} ${item.motivo}`).includes(termo)
    );
  }, [buscaItem, itensNecessarios]);

  const limparCampos = () => {
    setNomeDoador("");
    setContatoDoador("");
    setNomeItem("");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setObservacao("");
    setSite("");
  };

  const selecionarItemNecessario = (item: ItemNecessario) => {
    setNomeItem(item.nome);
    setTipoQuantidade(item.tipoQuantidade || "unidades");
    setModalItensAberto(false);
  };

  const validarCampos = () => {
    const telefoneLimpo = limparTelefone(contatoDoador);

    if (site.trim() !== "") {
      Alert.alert("Atenção", "Não foi possível enviar este formulário.");
      return false;
    }

    if (!nomeDoador.trim() || nomeDoador.trim().length < 3) {
      Alert.alert("Atenção", "Informe seu nome com pelo menos 3 caracteres.");
      return false;
    }

    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      Alert.alert("Atenção", "Informe um telefone ou WhatsApp válido.");
      return false;
    }

    if (!nomeItem.trim() || nomeItem.trim().length < 2) {
      Alert.alert("Atenção", "Informe o item que deseja doar.");
      return false;
    }

    const quantidadeNumerica = Number(quantidade.replace(",", "."));

    if (
      !quantidade.trim() ||
      isNaN(quantidadeNumerica) ||
      quantidadeNumerica <= 0
    ) {
      Alert.alert("Atenção", "Informe uma quantidade válida.");
      return false;
    }

    if (validade.trim() && !converterDataBrasileira(validade)) {
      Alert.alert(
        "Atenção",
        "Digite uma validade válida no formato DD/MM/AAAA."
      );
      return false;
    }

    if (observacao.length > 300) {
      Alert.alert("Atenção", "A observação deve ter no máximo 300 caracteres.");
      return false;
    }

    return true;
  };

  const enviarFormulario = async () => {
    if (carregando) return;
    if (!validarCampos()) return;

    try {
      setCarregando(true);

      const telefoneLimpo = limparTelefone(contatoDoador);
      const protocolo = gerarProtocolo(contatoDoador);
      const referencia = doc(db, "intencoes_doacao", protocolo);
      const jaExiste = await getDoc(referencia);

      if (jaExiste.exists()) {
        Alert.alert(
          "Solicitação já enviada",
          "Já existe uma intenção de doação registrada com este contato hoje. A ONG analisará sua solicitação em breve."
        );
        return;
      }

      await setDoc(referencia, {
        protocolo,

        nomeDoador: nomeDoador.trim(),
        contato: telefoneLimpo,
        contatoOriginal: contatoDoador.trim(),

        produto: nomeItem.trim(),
        nomeProduto: nomeItem.trim(),
        item: nomeItem.trim(),

        quantidade: Number(quantidade.replace(",", ".")),
        quantidadeTexto: quantidade.trim(),
        tipoQuantidade,

        validade: validade.trim() || "",
        validadeData: validade.trim()
          ? converterDataBrasileira(validade.trim())
          : null,

        observacao: observacao.trim() || "",

        status: "pendente",
        origem: "formulario_publico",

        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      Alert.alert(
        "Solicitação enviada",
        "Obrigada pelo interesse em ajudar! A equipe da ONG poderá entrar em contato para confirmar a doação.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );

      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Erro",
        "Não foi possível enviar sua solicitação agora. Tente novamente em alguns instantes."
      );
    } finally {
      setCarregando(false);
    }
  };

  const renderItemNecessario = ({ item }: { item: ItemNecessario }) => (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: colors.texto,
            }}
          >
            {item.nome}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.textoSuave,
              marginTop: 2,
            }}
          >
            Atual: {item.quantidade} {item.tipoQuantidade}
          </Text>
        </View>

        <View
          style={{
            backgroundColor:
              item.motivo === "Em falta" ? "#FDECEC" : "#FFF7D6",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignSelf: "flex-start",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: item.motivo === "Em falta" ? "#9A2D2D" : "#755A00",
            }}
          >
            {item.motivo}
          </Text>
        </View>
      </View>

      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Selecionar ${item.nome}`}
        onPress={() => selecionarItemNecessario(item)}
        style={({ pressed }) => [
          {
            minHeight: 44,
            borderRadius: 14,
            backgroundColor: colors.primaria,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>
          Quero doar este item
        </Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.titulo}>
          Quero doar
        </Text>

        <Text style={styles.subtituloPrincipal}>
          Informe o item que você tem interesse em doar. A ONG analisará a
          solicitação antes de registrar a entrada no estoque.
        </Text>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ver itens necessários"
          accessibilityHint="Abre a lista de itens que a ONG está precisando."
          onPress={() => setModalItensAberto(true)}
          style={({ pressed }) => [
            {
              minHeight: 54,
              borderRadius: 16,
              backgroundColor: "#EEF6EC",
              borderWidth: 1,
              borderColor: "#BDD7B8",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.primaria,
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            Ver itens que a ONG precisa
          </Text>
        </Pressable>

        <TextInput
          style={{
            position: "absolute",
            left: -9999,
            width: 0,
            height: 0,
            opacity: 0,
          }}
          value={site}
          onChangeText={setSite}
          placeholder="Site"
          autoComplete="off"
          importantForAutofill="no"
        />

        <BlocoFormulario
          titulo="1. Dados do doador"
          descricao="Essas informações serão usadas apenas para a ONG confirmar a doação."
        >
          <Text style={styles.label}>Nome do doador</Text>

          <TextInput
            accessible
            accessibilityLabel="Nome do doador"
            accessibilityHint="Digite seu nome."
            style={styles.input}
            placeholder="Ex: Maria Silva"
            value={nomeDoador}
            editable={!carregando}
            onChangeText={setNomeDoador}
            maxLength={80}
          />

          <Text style={styles.label}>Telefone ou WhatsApp</Text>

          <TextInput
            accessible
            accessibilityLabel="Telefone ou WhatsApp"
            accessibilityHint="Digite seu telefone ou WhatsApp."
            style={styles.input}
            placeholder="Ex: (19) 99999-9999"
            value={contatoDoador}
            editable={!carregando}
            onChangeText={(texto) => setContatoDoador(formatarTelefone(texto))}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </BlocoFormulario>

        <BlocoFormulario
          titulo="2. Dados da doação"
          descricao="Você pode digitar o item manualmente ou selecionar um item da lista de necessidades."
        >
          <Text style={styles.label}>Nome do alimento ou produto</Text>

          <TextInput
            accessible
            accessibilityLabel="Nome do alimento ou produto"
            accessibilityHint="Digite o nome do item que deseja doar."
            style={styles.input}
            placeholder="Ex: Arroz, feijão, leite, sabonete..."
            value={nomeItem}
            editable={!carregando}
            onChangeText={setNomeItem}
            maxLength={80}
          />

          <Text style={styles.label}>Quantidade</Text>

          <TextInput
            accessible
            accessibilityLabel="Quantidade do item"
            accessibilityHint="Digite a quantidade que deseja doar."
            style={styles.input}
            placeholder="Ex: 10"
            value={quantidade}
            editable={!carregando}
            onChangeText={setQuantidade}
            keyboardType="numeric"
            maxLength={8}
          />

          <Text style={styles.label}>Medida</Text>

          <View style={styles.opcoes}>
            {tiposQuantidade.map((item) => (
              <BotaoOpcao
                key={item}
                texto={item}
                selecionado={tipoQuantidade === item}
                carregando={carregando}
                aoPressionar={() => setTipoQuantidade(item)}
              />
            ))}
          </View>

          <Text style={styles.label}>Validade</Text>

          <TextInput
            accessible
            accessibilityLabel="Data de validade"
            accessibilityHint="Digite a validade no formato dia, mês e ano."
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={validade}
            editable={!carregando}
            onChangeText={(texto) => setValidade(formatarData(texto))}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>Observação</Text>

          <TextInput
            accessible
            accessibilityLabel="Observação"
            accessibilityHint="Digite uma observação sobre a doação, se necessário."
            style={[
              styles.input,
              {
                minHeight: 92,
                textAlignVertical: "top",
                paddingTop: 12,
              },
            ]}
            placeholder="Ex: posso entregar no sábado pela manhã"
            value={observacao}
            editable={!carregando}
            onChangeText={setObservacao}
            multiline
            maxLength={300}
          />
        </BlocoFormulario>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Enviar intenção de doação"
          accessibilityHint="Envia o formulário para análise da ONG."
          disabled={carregando}
          style={({ pressed }) => [
            styles.botaoSalvar,
            {
              minHeight: 54,
              opacity: carregando || pressed ? 0.65 : 1,
            },
          ]}
          onPress={enviarFormulario}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Enviar intenção de doação</Text>
          )}
        </Pressable>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voltar para o login"
          disabled={carregando}
          onPress={() => router.replace("/login")}
          style={({ pressed }) => [
            {
              minHeight: 54,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.primaria,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
              opacity: carregando || pressed ? 0.65 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.primaria,
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            Voltar para o login
          </Text>
        </Pressable>

        <Text
          style={{
            color: colors.textoSuave,
            fontSize: 13,
            lineHeight: 19,
            marginTop: 14,
            textAlign: "center",
          }}
        >
          O envio do formulário não confirma automaticamente a doação. A ONG
          poderá entrar em contato antes do recebimento.
        </Text>
      </ScrollView>

      <Modal
        visible={modalItensAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalItensAberto(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: colors.fundo,
              borderRadius: 24,
              padding: 16,
              maxHeight: "86%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "900",
                    color: colors.texto,
                  }}
                >
                  Itens necessários
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textoSuave,
                    lineHeight: 20,
                    marginTop: 4,
                  }}
                >
                  Selecione um item para preencher o formulário automaticamente.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar lista de itens necessários"
                onPress={() => setModalItensAberto(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: colors.borda,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    lineHeight: 26,
                    color: colors.texto,
                    fontWeight: "800",
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  marginBottom: 12,
                  backgroundColor: "#FFFFFF",
                },
              ]}
              placeholder="Buscar item..."
              value={buscaItem}
              onChangeText={setBuscaItem}
            />

            {carregandoItens ? (
              <View
                style={{
                  paddingVertical: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator color={colors.primaria} />
                <Text
                  style={{
                    marginTop: 10,
                    color: colors.textoSuave,
                    fontWeight: "700",
                  }}
                >
                  Carregando itens...
                </Text>
              </View>
            ) : (
              <FlatList
                data={itensFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderItemNecessario}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View
                    style={{
                      paddingVertical: 34,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "900",
                        color: colors.texto,
                        textAlign: "center",
                      }}
                    >
                      Nenhum item necessário encontrado
                    </Text>

                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textoSuave,
                        lineHeight: 20,
                        textAlign: "center",
                        marginTop: 6,
                      }}
                    >
                      Você ainda pode preencher o formulário manualmente.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}