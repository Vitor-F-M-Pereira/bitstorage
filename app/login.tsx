import { router } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        router.replace("/(tabs)");
      } else {
        setVerificandoSessao(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const entrar = async () => {
    if (carregando) return;

    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);

      await signInWithEmailAndPassword(auth, email.trim(), senha);

      router.replace("/(tabs)");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  };

  if (verificandoSessao) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Verificando sessão...</Text>
      </View>
    );
  }

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
          editable={!carregando}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={senha}
          editable={!carregando}
          onChangeText={setSenha}
          secureTextEntry
        />

        <Pressable
          disabled={carregando}
          style={[
            styles.botaoSalvar,
            carregando && { opacity: 0.6 },
          ]}
          onPress={entrar}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Entrar</Text>
          )}
        </Pressable>

        {carregando && (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Entrando no sistema...
          </Text>
        )}
      </View>
    </ScrollView>
  );
}