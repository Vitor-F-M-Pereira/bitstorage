import { router } from "expo-router";
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
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/globalStyles";

export default function Inicio() {
  const [alimentos, setAlimentos] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");

  const [carregandoDados, setCarregandoDados] = useState(true);

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
        const lista: any[] = [];

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
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(
      collection(db, "movimentacoes"),
      orderBy("data", "desc"),
    );

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: any[] = [];

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
      },
    );

    return () => unsubscribe();
  }, []);

  const converterData = (data: any) => {
    if (!data) return null;

    if (data?.toDate) {
      return data.toDate();
    }

    if (data instanceof Date) {
      return data;
    }

    if (typeof data === "string" && data.includes("/")) {
      const partes = data.split("/");
      if (partes.length !== 3) return null;

      const [dia, mes, ano] = partes.map(Number);

      if (!dia || !mes || !ano) return null;

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

    const dataConvertida = new Date(data);

    if (isNaN(dataConvertida.getTime())) {
      return null;
    }

    return dataConvertida;
  };

  const diasRestantes = (validade: any) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const data = converterData(validade);
    if (!data) return null;

    data.setHours(0, 0, 0, 0);

    const diff = data.getTime() - hoje.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const estoqueBaixo = (item: any) => {
    const quantidade = Number(item.quantidade || 0);
    const tipoQuantidade = String(item.tipoQuantidade || "").toLowerCase();

    if (quantidade <= 0) return false;

    if (tipoQuantidade === "kg" || tipoQuantidade === "litros") {
      return quantidade <= 2;
    }

    return quantidade <= 5;
  };

  const formatarData = (data: any) => {
    const dataConvertida = converterData(data);

    if (!dataConvertida) {
      return "Data não informada";
    }

    return dataConvertida.toLocaleDateString("pt-BR");
  };

  const dataAtual = new Date();
  const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, "0");
  const anoAtual = String(dataAtual.getFullYear());

  const itensVencendo = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias >= 0 && dias <= 7;
  });

  const itensVencidos = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias < 0;
  });

  const itensEstoqueBaixo = alimentos.filter((item) => estoqueBaixo(item));

  const itensZerados = alimentos.filter(
    (item) => Number(item.quantidade || 0) <= 0,
  );

  const movimentacoesMes = movimentacoes.filter((item) => {
    const data = converterData(item.data);

    if (!data) return false;

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesAtual && ano === anoAtual;
  });

  const entradasMes = movimentacoesMes.filter(
    (item) => item.tipo === "entrada",
  ).length;

  const saidasMes = movimentacoesMes.filter(
    (item) => item.tipo === "saida",
  ).length;

  const ultimasMovimentacoes = movimentacoes.slice(0, 3);

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";

  const totalAlertas =
    itensVencidos.length +
    itensVencendo.length +
    itensEstoqueBaixo.length +
    itensZerados.length;

  const situacaoEstoque =
    totalAlertas === 0
      ? "Tudo certo no momento"
      : "Alguns itens precisam de atenção";

  const descricaoSituacao =
    totalAlertas === 0
      ? "Não há itens vencidos, zerados ou próximos do vencimento."
      : "Confira os alertas para evitar desperdício ou falta de produtos.";

  const LinhaResumo = ({
    titulo,
    valor,
    descricao,
    tipo = "neutro",
    rota,
  }: {
    titulo: string;
    valor: number | string;
    descricao: string;
    tipo?: "neutro" | "sucesso" | "alerta" | "perigo" | "info";
    rota?: string;
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

    const conteudo = (
      <>
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
            fontSize: 30,
            fontWeight: "900",
            color: corNumero,
            minWidth: 44,
            textAlign: "right",
          }}
        >
          {valor}
        </Text>
      </>
    );

    if (rota) {
      return (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${titulo}. Valor: ${valor}. ${descricao}`}
          accessibilityHint="Toque duas vezes para abrir a tela relacionada."
          onPress={() => router.push(rota)}
          style={({ pressed }) => ({
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
            minHeight: 74,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          {conteudo}
        </Pressable>
      );
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
          minHeight: 74,
        }}
      >
        {conteudo}
      </View>
    );
  };

  const CardSituacao = () => {
    const estaTudoBem = totalAlertas === 0;

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${situacaoEstoque}. ${descricaoSituacao}`}
        style={{
          backgroundColor: estaTudoBem
            ? colors.sucessoFundo
            : colors.alertaFundo,
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
          {situacaoEstoque}
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

  const CardMovimentacao = ({ item }: { item: any }) => {
    const ehEntrada = item.tipo === "entrada";

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Movimentação de ${
          item.nomeProduto || "produto não informado"
        }. Tipo: ${ehEntrada ? "entrada" : "saída"}. Quantidade: ${
          item.quantidade || 0
        }. Data: ${formatarData(item.data)}.`}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.borda,
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
            <Text
              style={{
                fontSize: 17,
                fontWeight: "900",
                color: colors.texto,
              }}
            >
              {item.nomeProduto || "Produto não informado"}
            </Text>

            <Text
              style={{
                color: colors.textoSuave,
                marginTop: 4,
                fontSize: 14,
              }}
            >
              {formatarData(item.data)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: ehEntrada
                ? colors.sucessoFundo
                : colors.perigoFundo,
              borderColor: ehEntrada ? colors.sucesso : colors.perigo,
              borderWidth: 1,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: ehEntrada ? colors.sucesso : colors.perigo,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              {ehEntrada ? "Entrada" : "Saída"}
            </Text>
          </View>
        </View>

        <Text
          style={{
            marginTop: 8,
            color: colors.texto,
            fontSize: 15,
          }}
        >
          Quantidade: {item.quantidade || 0} {item.tipoQuantidade || "unidades"}
        </Text>

        {item.origem && (
          <Text
            style={{
              color: colors.textoSuave,
              marginTop: 4,
              fontSize: 14,
            }}
          >
            Origem: {item.origem}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 34,
      }}
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        Olá, {nomeUsuario || "bem-vindo"}!
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Veja rapidamente o estado da despensa.
      </Text>

      {carregandoDados ? (
        <View style={styles.formulario}>
          <ActivityIndicator
            size="large"
            color={colors.principal}
            accessibilityLabel="Carregando dados do estoque"
          />

          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Carregando dados do estoque...
          </Text>
        </View>
      ) : (
        <>
          <CardSituacao />

          <Text accessibilityRole="header" style={styles.subtitulo}>
            Resumo do estoque
          </Text>

          <LinhaResumo
            titulo="Produtos cadastrados"
            valor={alimentos.length}
            descricao="Total de itens registrados"
            tipo="info"
            rota="/estoque"
          />

          <LinhaResumo
            titulo="Pontos de atenção"
            valor={totalAlertas}
            descricao="Itens vencidos, baixos ou zerados"
            tipo={totalAlertas > 0 ? "alerta" : "sucesso"}
            rota="/alertas"
          />

          <Text accessibilityRole="header" style={styles.subtitulo}>
            Atenção necessária
          </Text>

          <LinhaResumo
            titulo="Vencidos"
            valor={itensVencidos.length}
            descricao="Produtos fora da validade"
            tipo={itensVencidos.length > 0 ? "perigo" : "sucesso"}
            rota="/alertas"
          />

          <LinhaResumo
            titulo="Vencem em até 7 dias"
            valor={itensVencendo.length}
            descricao="Produtos para usar primeiro"
            tipo={itensVencendo.length > 0 ? "alerta" : "sucesso"}
            rota="/alertas"
          />

          <LinhaResumo
            titulo="Estoque baixo"
            valor={itensEstoqueBaixo.length}
            descricao="Produtos com pouca quantidade"
            tipo={itensEstoqueBaixo.length > 0 ? "alerta" : "sucesso"}
            rota="/alertas"
          />

          <LinhaResumo
            titulo="Itens zerados"
            valor={itensZerados.length}
            descricao="Produtos sem quantidade disponível"
            tipo={itensZerados.length > 0 ? "perigo" : "sucesso"}
            rota="/alertas"
          />

          {(ehAdministrador || ehCozinheiro) && (
            <>
              <Text accessibilityRole="header" style={styles.subtitulo}>
                Movimento do mês
              </Text>

              <LinhaResumo
                titulo="Entradas"
                valor={entradasMes}
                descricao="Itens recebidos no mês"
                tipo="sucesso"
              />

              <LinhaResumo
                titulo="Saídas"
                valor={saidasMes}
                descricao="Itens consumidos no mês"
                tipo={saidasMes > 0 ? "alerta" : "info"}
              />
            </>
          )}

          <Text accessibilityRole="header" style={styles.subtitulo}>
            Últimas movimentações
          </Text>

          {ultimasMovimentacoes.length === 0 ? (
            <Text style={styles.listaVazia}>
              Nenhuma movimentação registrada ainda.
            </Text>
          ) : (
            ultimasMovimentacoes.map((item) => (
              <CardMovimentacao key={item.id} item={item} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
