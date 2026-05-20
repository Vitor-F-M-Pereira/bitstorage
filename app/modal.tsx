import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Tela auxiliar</Text>
      <Text style={styles.texto}>Esta tela não faz parte do fluxo principal do BitStorage.</Text>
      <Pressable style={styles.botao} onPress={() => router.replace("/")}>
        <Text style={styles.textoBotao}>Voltar ao início</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F3EA",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "900",
    color: "#3D4A2F",
    marginBottom: 8,
  },
  texto: {
    color: "#5F6658",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },
  botao: {
    backgroundColor: "#5E7C45",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
