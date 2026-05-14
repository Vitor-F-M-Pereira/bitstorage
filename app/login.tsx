import { router } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

import { auth, db } from "../services/firebaseConfig";
import { styles } from "../styles/estoqueStyles";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setVerificandoSessao(false);
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (!usuarioSnap.exists()) {
          await signOut(auth);
          setVerificandoSessao(false);
          return;
        }

        const dados = usuarioSnap.data();
        const estaAtivo = dados.ativo !== false;

        if (!estaAtivo) {
          await signOut(auth);
          Alert.alert(
            "Acesso bloqueado",
            "Seu usuário está desativado. Procure um administrador."
          );
          setVerificandoSessao(false);
          return;
        }

        router.replace("/(tabs)");
      } catch (error) {
        console.log(error);
        await signOut(auth);
        setVerificandoSessao(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const entrar = async () => {
    if (carregando) return;

    if (!email.trim() || !senha.trim()) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);

      const credencial = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );

      const usuarioRef = doc(db, "usuarios", credencial.user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) {
        await signOut(auth);

        Alert.alert(
          "Acesso não autorizado",
          "Este usuário não possui cadastro no sistema."
        );

        return;
      }

      const dados = usuarioSnap.data();
      const estaAtivo = dados.ativo !== false;

      if (!estaAtivo) {
        await signOut(auth);

        Alert.alert(
          "Acesso bloqueado",
          "Seu usuário está desativado. Procure um administrador."
        );

        return;
      }

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
          style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
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