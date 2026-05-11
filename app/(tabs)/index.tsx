import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

export default function Inicio() {
  const [alimentos, setAlimentos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        router.replace("/login");
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();

          setNomeUsuario(dados.nome || "Usuário");
          setTipoUsuario(String(dados.tipoUsuario || "").toLowerCase());
        }
      } catch (error) {
        console.log(error);
      }
    });

    return () => unsubscribeAuth();
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
        setCarregandoDados(false);
      },
      (error) => {
        console.log(error);
        setCarregandoDados(false);
        Alert.alert("Erro", "Não foi possível carregar os dados.");
      }
    );

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
      },
      (error) => {
        console.log(error);
      }
    );

    return () => unsubscribe();
  }, []);

  const sair = async () => {
    if (saindo) return;

    try {
      setSaindo(true);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível sair da conta.");
    } finally {
      setSaindo(false);
    }
  };

  const converterData = (data) => {
    if (!data) return null;

    const partes = data.split("/");
    if (partes.length !== 3) return null;

    const [dia, mes, ano] = partes.map(Number);

    if (!dia || !mes || !ano) return null;

    return new Date(ano, mes - 1, dia);
  };

  const diasRestantes = (validade) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const data = converterData(validade);
    if (!data) return null;

    data.setHours(0, 0, 0, 0);

    const diff = data - hoje;

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const dataAtual = new Date();
  const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, "0");
  const anoAtual = String(dataAtual.getFullYear());

  const proximos = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias >= 0 && dias < 7;
  });

  const vencidos = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias < 0;
  });

  const movimentacoesMes = movimentacoes.filter((item) => {
    if (!item.data) return false;

    const data = item.data.toDate ? item.data.toDate() : new Date(item.data);

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesAtual && ano === anoAtual;
  });

  const entradasMes = movimentacoesMes.filter(
    (item) => item.tipo === "entrada"
  ).length;

  const saidasMes = movimentacoesMes.filter(
    (item) => item.tipo === "saida"
  ).length;

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";

  const CardResumo = ({ titulo, valor, descricao, tipo }) => {
    let corFundo = colors.card;
    let corBorda = colors.borda;

    if (tipo === "ok") {
      corFundo = colors.sucessoFundo;
      corBorda = colors.sucesso;
    }

    if (tipo === "alerta") {
      corFundo = colors.alertaFundo;
      corBorda = colors.alerta;
    }

    if (tipo === "perigo") {
      corFundo = colors.perigoFundo;
      corBorda = colors.perigo;
    }

    if (tipo === "info") {
      corFundo = colors.secundarioClaro;
      corBorda = colors.secundario;
    }

    return (
      <View
        style={{
          backgroundColor: corFundo,
          borderRadius: 18,
          padding: 18,
          marginBottom: 12,
          borderLeftWidth: 6,
          borderLeftColor: corBorda,
          borderWidth: 1,
          borderColor: colors.borda,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: colors.textoSuave,
            marginBottom: 6,
          }}
        >
          {titulo}
        </Text>

        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: colors.texto,
            marginBottom: 4,
          }}
        >
          {valor}
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: colors.textoSuave,
            lineHeight: 20,
          }}
        >
          {descricao}
        </Text>
      </View>
    );
  };

  const BotaoAcao = ({ texto, descricao, rota }) => (
    <Pressable
      onPress={() => router.push(rota)}
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borda,
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "bold",
          color: colors.principalEscuro,
          marginBottom: 4,
        }}
      >
        {texto}
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: colors.textoSuave,
          lineHeight: 20,
        }}
      >
        {descricao}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Olá, {nomeUsuario || "bem-vindo"}!</Text>

      <Text style={styles.subtituloPrincipal}>
        Aqui está um resumo simples da despensa da Casa da Criança.
      </Text>

      {carregandoDados ? (
        <View style={styles.formulario}>
          <ActivityIndicator size="large" />

          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Carregando dados do estoque...
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitulo}>Resumo rápido</Text>

          <CardResumo
            titulo="Produtos cadastrados"
            valor={alimentos.length}
            descricao="Total de itens registrados na despensa."
            tipo="info"
          />

          <CardResumo
            titulo="Próximos do vencimento"
            valor={proximos.length}
            descricao="Itens que vencem em menos de 7 dias."
            tipo="alerta"
          />

          <CardResumo
            titulo="Produtos vencidos"
            valor={vencidos.length}
            descricao="Itens que precisam de atenção imediata."
            tipo={vencidos.length > 0 ? "perigo" : "ok"}
          />

          {(ehAdministrador || ehCozinheiro) && (
            <>
              <Text style={styles.subtitulo}>Movimentações do mês</Text>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.sucessoFundo,
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.borda,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textoSuave,
                      fontSize: 14,
                      marginBottom: 6,
                    }}
                  >
                    Entradas
                  </Text>

                  <Text
                    style={{
                      color: colors.sucesso,
                      fontSize: 28,
                      fontWeight: "bold",
                    }}
                  >
                    {entradasMes}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.perigoFundo,
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.borda,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textoSuave,
                      fontSize: 14,
                      marginBottom: 6,
                    }}
                  >
                    Saídas
                  </Text>

                  <Text
                    style={{
                      color: colors.perigo,
                      fontSize: 28,
                      fontWeight: "bold",
                    }}
                  >
                    {saidasMes}
                  </Text>
                </View>
              </View>
            </>
          )}

          <Text style={styles.subtitulo}>Ações principais</Text>

          {(ehAdministrador || ehCozinheiro) && (
            <>
              <BotaoAcao
                texto="Cadastrar alimento"
                descricao="Registrar um novo item na despensa."
                rota="/cadastro"
              />

              <BotaoAcao
                texto="Consultar estoque"
                descricao="Ver, editar e acompanhar os alimentos cadastrados."
                rota="/estoque"
              />

              <BotaoAcao
                texto="Ver alertas"
                descricao="Conferir produtos vencidos ou próximos do vencimento."
                rota="/alertas"
              />
            </>
          )}

          {ehAdministrador && (
            <>
              <BotaoAcao
                texto="Histórico mensal"
                descricao="Acompanhar entradas, saídas e movimentações do estoque."
                rota="/historico"
              />

              <BotaoAcao
                texto="Gerenciar usuários"
                descricao="Cadastrar, editar ou remover usuários do sistema."
                rota="/usuarios"
              />
            </>
          )}

          {!ehAdministrador && !ehCozinheiro && (
            <View style={styles.formulario}>
              <Text style={styles.subtitulo}>Área do doador</Text>

              <Text
                style={{
                  color: colors.textoSuave,
                  lineHeight: 22,
                  fontSize: 15,
                }}
              >
                Em breve, esta área poderá mostrar os itens que a ONG mais
                precisa receber como doação.
              </Text>
            </View>
          )}
        </>
      )}

      <Pressable
        disabled={saindo}
        style={[styles.botaoCancelar, saindo && { opacity: 0.6 }]}
        onPress={sair}
      >
        {saindo ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.textoCancelar}>Sair da conta</Text>
        )}
      </Pressable>

      {saindo && (
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          Saindo da conta...
        </Text>
      )}

      <View style={{ height: 25 }} />
    </ScrollView>
  );
}