import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

export default function DadosSimulados() {
  const [carregando, setCarregando] = useState(false);

  const doadoresSimulados = [
    {
      id: "mercado-solidario",
      nome: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
    },
    {
      id: "limpeza-amiga",
      nome: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
    },
    {
      id: "comunidade-esperanca",
      nome: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
    },
    {
      id: "farmacia-popular",
      nome: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
    },
  ];

  const doacoesSimuladas = [
    {
      id: "doacao-simulada-001",
      doadorId: "mercado-solidario",
      nomeDoador: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
      produto: "Arroz",
      categoriaGeral: "Alimentos",
      categoria: "Grãos e cereais",
      quantidade: 25,
      tipoQuantidade: "kg",
      data: new Date(2025, 2, 10),
    },
    {
      id: "doacao-simulada-002",
      doadorId: "mercado-solidario",
      nomeDoador: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
      produto: "Feijão",
      categoriaGeral: "Alimentos",
      categoria: "Grãos e cereais",
      quantidade: 20,
      tipoQuantidade: "kg",
      data: new Date(2025, 5, 18),
    },
    {
      id: "doacao-simulada-003",
      doadorId: "mercado-solidario",
      nomeDoador: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
      produto: "Óleo",
      categoriaGeral: "Alimentos",
      categoria: "Outros",
      quantidade: 18,
      tipoQuantidade: "unidades",
      data: new Date(2025, 9, 22),
    },
    {
      id: "doacao-simulada-004",
      doadorId: "mercado-solidario",
      nomeDoador: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
      produto: "Carne",
      categoriaGeral: "Alimentos",
      categoria: "Carnes e proteínas",
      quantidade: 15,
      tipoQuantidade: "kg",
      data: new Date(2026, 1, 14),
    },
    {
      id: "doacao-simulada-005",
      doadorId: "mercado-solidario",
      nomeDoador: "Mercado Solidário",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "mercado@email.com",
      produto: "Macarrão",
      categoriaGeral: "Alimentos",
      categoria: "Massas",
      quantidade: 30,
      tipoQuantidade: "unidades",
      data: new Date(2026, 4, 5),
    },

    {
      id: "doacao-simulada-006",
      doadorId: "limpeza-amiga",
      nomeDoador: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
      produto: "Detergente",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 40,
      tipoQuantidade: "unidades",
      data: new Date(2025, 3, 12),
    },
    {
      id: "doacao-simulada-007",
      doadorId: "limpeza-amiga",
      nomeDoador: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
      produto: "Sabão em pó",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 22,
      tipoQuantidade: "kg",
      data: new Date(2025, 6, 18),
    },
    {
      id: "doacao-simulada-008",
      doadorId: "limpeza-amiga",
      nomeDoador: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
      produto: "Desinfetante",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 25,
      tipoQuantidade: "litros",
      data: new Date(2025, 10, 9),
    },
    {
      id: "doacao-simulada-009",
      doadorId: "limpeza-amiga",
      nomeDoador: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
      produto: "Sabão em barra",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 45,
      tipoQuantidade: "unidades",
      data: new Date(2026, 2, 12),
    },
    {
      id: "doacao-simulada-010",
      doadorId: "limpeza-amiga",
      nomeDoador: "Limpeza Amiga",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "limpeza@email.com",
      produto: "Água sanitária",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 20,
      tipoQuantidade: "litros",
      data: new Date(2026, 4, 8),
    },

    {
      id: "doacao-simulada-011",
      doadorId: "comunidade-esperanca",
      nomeDoador: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
      produto: "Arroz",
      categoriaGeral: "Alimentos",
      categoria: "Grãos e cereais",
      quantidade: 12,
      tipoQuantidade: "kg",
      data: new Date(2025, 1, 20),
    },
    {
      id: "doacao-simulada-012",
      doadorId: "comunidade-esperanca",
      nomeDoador: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
      produto: "Sabonete",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 18,
      tipoQuantidade: "unidades",
      data: new Date(2025, 4, 11),
    },
    {
      id: "doacao-simulada-013",
      doadorId: "comunidade-esperanca",
      nomeDoador: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
      produto: "Detergente",
      categoriaGeral: "Limpeza",
      categoria: "Produtos de limpeza",
      quantidade: 15,
      tipoQuantidade: "unidades",
      data: new Date(2025, 8, 3),
    },
    {
      id: "doacao-simulada-014",
      doadorId: "comunidade-esperanca",
      nomeDoador: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
      produto: "Leite",
      categoriaGeral: "Alimentos",
      categoria: "Leites e derivados",
      quantidade: 20,
      tipoQuantidade: "litros",
      data: new Date(2026, 0, 19),
    },
    {
      id: "doacao-simulada-015",
      doadorId: "comunidade-esperanca",
      nomeDoador: "Comunidade Esperança",
      tipoDoador: "Grupo comunitário",
      cidade: "Itapira",
      contato: "comunidade@email.com",
      produto: "Pasta de dente",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 16,
      tipoQuantidade: "unidades",
      data: new Date(2026, 3, 25),
    },

    {
      id: "doacao-simulada-016",
      doadorId: "farmacia-popular",
      nomeDoador: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
      produto: "Sabonete",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 50,
      tipoQuantidade: "unidades",
      data: new Date(2025, 2, 28),
    },
    {
      id: "doacao-simulada-017",
      doadorId: "farmacia-popular",
      nomeDoador: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
      produto: "Pasta de dente",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 42,
      tipoQuantidade: "unidades",
      data: new Date(2025, 7, 6),
    },
    {
      id: "doacao-simulada-018",
      doadorId: "farmacia-popular",
      nomeDoador: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
      produto: "Escova de dente",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 38,
      tipoQuantidade: "unidades",
      data: new Date(2025, 11, 13),
    },
    {
      id: "doacao-simulada-019",
      doadorId: "farmacia-popular",
      nomeDoador: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
      produto: "Absorvente",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 60,
      tipoQuantidade: "unidades",
      data: new Date(2026, 2, 15),
    },
    {
      id: "doacao-simulada-020",
      doadorId: "farmacia-popular",
      nomeDoador: "Farmácia Popular",
      tipoDoador: "Empresa",
      cidade: "Itapira",
      contato: "farmacia@email.com",
      produto: "Lenço umedecido",
      categoriaGeral: "Higiene",
      categoria: "Higiene pessoal",
      quantidade: 45,
      tipoQuantidade: "unidades",
      data: new Date(2026, 5, 4),
    },
  ];

  const inserirDadosSimulados = async () => {
    if (carregando) return;

    Alert.alert(
      "Inserir dados simulados",
      "Essa ação vai adicionar dados fictícios distribuídos entre 2025 e 2026 para testar a clusterização de perfis de doação.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Inserir",
          onPress: salvarDadosSimulados,
        },
      ]
    );
  };

  const salvarDadosSimulados = async () => {
    try {
      setCarregando(true);

      const batch = writeBatch(db);
      const agora = new Date();

      doadoresSimulados.forEach((doador) => {
        const doadorRef = doc(db, "doadores", doador.id);

        batch.set(
          doadorRef,
          {
            ...doador,
            criadoEm: agora,
            atualizadoEm: agora,
            dadoSimulado: true,
          },
          { merge: true }
        );
      });

      doacoesSimuladas.forEach((doacao) => {
        const doacaoRef = doc(db, "doacoes", doacao.id);
        const mes = String(doacao.data.getMonth() + 1).padStart(2, "0");
        const ano = String(doacao.data.getFullYear());

        batch.set(
          doacaoRef,
          {
            ...doacao,
            origem: "Doação",
            mes,
            ano,
            criadoEm: agora,
            atualizadoEm: agora,
            dadoSimulado: true,
          },
          { merge: true }
        );
      });

      await batch.commit();

      Alert.alert("Sucesso", "Dados simulados inseridos com sucesso!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível inserir os dados simulados.");
    } finally {
      setCarregando(false);
    }
  };

  const apagarDadosSimulados = async () => {
    if (carregando) return;

    Alert.alert(
      "Apagar dados simulados",
      "Essa ação vai excluir apenas documentos marcados como dadoSimulado: true nas coleções doadores e doacoes.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Apagar",
          style: "destructive",
          onPress: excluirDadosSimulados,
        },
      ]
    );
  };

  const excluirDadosSimulados = async () => {
    try {
      setCarregando(true);

      const consultaDoadores = query(
        collection(db, "doadores"),
        where("dadoSimulado", "==", true)
      );

      const consultaDoacoes = query(
        collection(db, "doacoes"),
        where("dadoSimulado", "==", true)
      );

      const [snapshotDoadores, snapshotDoacoes] = await Promise.all([
        getDocs(consultaDoadores),
        getDocs(consultaDoacoes),
      ]);

      const exclusoes: Promise<void>[] = [];

      snapshotDoadores.forEach((documento) => {
        exclusoes.push(deleteDoc(doc(db, "doadores", documento.id)));
      });

      snapshotDoacoes.forEach((documento) => {
        exclusoes.push(deleteDoc(doc(db, "doacoes", documento.id)));
      });

      await Promise.all(exclusoes);

      Alert.alert("Sucesso", "Dados simulados apagados com sucesso!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível apagar os dados simulados.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Dados Simulados</Text>

      <Text style={styles.subtituloPrincipal}>
        Área temporária para inserir e remover dados fictícios usados no teste da
        clusterização de perfis de doação.
      </Text>

      <View style={styles.card}>
        <Text style={styles.nome}>Base de teste da IA</Text>

        <Text
          style={{
            color: colors.textoSuave,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          Esta tela insere dados fictícios distribuídos entre 2025 e 2026. A
          intenção é demonstrar que a clusterização consegue separar perfis
          diferentes de doadores.
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          Perfil 1: doador focado em alimentos essenciais, como arroz, feijão,
          carne, óleo e macarrão.
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          Perfil 2: doador focado em produtos de limpeza, como detergente, sabão
          e desinfetante.
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          Perfil 3: doador com contribuições variadas, misturando alimentos,
          higiene e limpeza.
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          Perfil 4: doador focado em higiene pessoal, como sabonete, pasta de
          dente, escova e absorvente.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.nome}>O que será criado</Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          • {doadoresSimulados.length} doadores fictícios
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          • {doacoesSimuladas.length} doações fictícias
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          • Dados marcados com dadoSimulado: true
        </Text>

        <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
          • Período: de 2025 até 2026
        </Text>
      </View>

      <Pressable
        disabled={carregando}
        style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
        onPress={inserirDadosSimulados}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.textoBotao}>Inserir dados simulados</Text>
        )}
      </Pressable>

      <Pressable
        disabled={carregando}
        style={[
          styles.botaoCancelar,
          {
            borderColor: colors.perigo,
            marginTop: 14,
          },
          carregando && { opacity: 0.6 },
        ]}
        onPress={apagarDadosSimulados}
      >
        <Text
          style={[
            styles.textoCancelar,
            {
              color: colors.perigo,
            },
          ]}
        >
          Apagar dados simulados
        </Text>
      </Pressable>

      {carregando && (
        <Text style={{ textAlign: "center", marginTop: 12 }}>
          Processando dados...
        </Text>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}