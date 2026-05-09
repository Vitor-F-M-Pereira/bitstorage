import { router } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth } from "../services/firebaseConfig";
import { styles } from "../styles/estoqueStyles";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        router.replace("/(tabs)");
      }
    });

    return () => unsubscribe();
  }, []);

  const entrar = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace("/(tabs)");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "E-mail ou senha inválidos.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>BitStorage</Text>

      <Text style={styles.subtituloPrincipal}>
        Acesso ao sistema da Casa da Criança
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>Entrar</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <Pressable style={styles.botaoSalvar} onPress={entrar}>
          <Text style={styles.textoBotao}>Entrar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}