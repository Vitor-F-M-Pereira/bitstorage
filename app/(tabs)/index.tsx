import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { db } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

export default function Inicio() {
  const [alimentos, setAlimentos] = useState([]);

  const buscarAlimentos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "alimentos"));
      const lista = [];

      snapshot.forEach((doc) => {
        lista.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setAlimentos(lista);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    }
  };

  useEffect(() => {
    buscarAlimentos();
  }, []);

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

  const proximos = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias >= 0 && dias < 7;
  });

  const vencidos = alimentos.filter((item) => {
    const dias = diasRestantes(item.validade);
    return dias !== null && dias < 0;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>BitStorage</Text>

      <Text style={styles.subtituloPrincipal}>
        Gerenciador de despensa da Casa da Criança
      </Text>

      <View style={styles.resumo}>
        <Text style={styles.subtitulo}>Resumo do estoque</Text>

        <Text>Total de alimentos: {alimentos.length}</Text>
        <Text>Próximos do vencimento: {proximos.length}</Text>
        <Text>Vencidos: {vencidos.length}</Text>
      </View>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>Sobre o sistema</Text>

        <Text>
          Este aplicativo ajuda a ONG a controlar os alimentos da despensa,
          evitando desperdícios e organizando melhor o consumo.
        </Text>
      </View>
    </ScrollView>
  );
}