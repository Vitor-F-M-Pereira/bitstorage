import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { db } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

export default function Alertas() {
  const [alimentos, setAlimentos] = useState([]);

  const buscarAlimentos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "alimentos"));
      const lista = [];

      snapshot.forEach((documento) => {
        lista.push({
          id: documento.id,
          ...documento.data(),
        });
      });

      setAlimentos(lista);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar os alertas.");
    }
  };

  useEffect(() => {
    buscarAlimentos();
  }, []);

  const converterDataBrasileira = (data) => {
    if (!data) return null;

    const partes = data.split("/");
    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (!dia || !mes || !ano || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
      return null;
    }

    return new Date(ano, mes - 1, dia);
  };

  const calcularDiasRestantes = (dataValidade) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataConvertida = converterDataBrasileira(dataValidade);
    if (!dataConvertida) return null;

    dataConvertida.setHours(0, 0, 0, 0);

    const diferenca = dataConvertida - hoje;
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  };

  const proximos = alimentos.filter((item) => {
    const dias = calcularDiasRestantes(item.validade);
    return dias !== null && dias >= 0 && dias < 7;
  });

  const vencidos = alimentos.filter((item) => {
    const dias = calcularDiasRestantes(item.validade);
    return dias !== null && dias < 0;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Alertas</Text>
      <Text style={styles.subtituloPrincipal}>
        Produtos vencidos ou próximos do vencimento
      </Text>

      <Text style={styles.subtitulo}>Próximos do vencimento</Text>

      {proximos.length === 0 ? (
        <Text style={styles.listaVazia}>
          Nenhum produto com menos de 7 dias para vencer.
        </Text>
      ) : (
        proximos.map((item) => {
          const dias = calcularDiasRestantes(item.validade);

          return (
            <View key={item.id} style={[styles.card, styles.cardProximo]}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text>
                Vence em {dias} dia(s) - {item.validade}
              </Text>
              <Text>
                Quantidade: {item.quantidade} {item.tipoQuantidade}
              </Text>
              <Text>Categoria: {item.categoria}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.subtitulo}>Vencidos</Text>

      {vencidos.length === 0 ? (
        <Text style={styles.listaVazia}>Nenhum produto vencido.</Text>
      ) : (
        vencidos.map((item) => (
          <View key={item.id} style={[styles.card, styles.cardVencido]}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text>Validade: {item.validade}</Text>
            <Text>
              Quantidade: {item.quantidade} {item.tipoQuantidade}
            </Text>
            <Text>Categoria: {item.categoria}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}