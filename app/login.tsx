import { router } from "expo-router";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth, db } from "../services/firebaseConfig";
import { colors, styles } from "../styles/estoqueStyles";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const validarCampos = () => {
    if (!email.trim()) {
      Alert.alert("Atenção", "Informe o e-mail de acesso.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Atenção", "Digite um e-mail válido.");
      return false;
    }

    if (!senha.trim()) {
      Alert.alert("Atenção", "Informe a senha.");
      return false;
    }

    return true;
  };

  const entrar = async () => {
    if (carregando) return;

    if (!validarCampos()) return;

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
          "Acesso não encontrado",
          "Este usuário não possui cadastro no sistema. Procure um administrador."
        );

        return;
      }

      const dados = usuarioSnap.data();
      const usuarioAtivo = dados.ativo !== false;

      if (!usuarioAtivo) {
        await signOut(auth);

        Alert.alert(
          "Acesso bloqueado",
          "Seu usuário está desativado. Procure um administrador."
        );

        return;
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      console.log(error);

      let mensagem =
        "Não foi possível entrar. Verifique o e-mail e a senha e tente novamente.";

      if (error?.code === "auth/invalid-credential") {
        mensagem = "E-mail ou senha incorretos. Confira os dados e tente novamente.";
      }

      if (error?.code === "auth/user-not-found") {
        mensagem = "Usuário não encontrado.";
      }

      if (error?.code === "auth/wrong-password") {
        mensagem = "Senha incorreta.";
      }

      if (error?.code === "auth/too-many-requests") {
        mensagem =
          "Muitas tentativas seguidas. Aguarde um pouco antes de tentar novamente.";
      }

      Alert.alert("Erro ao entrar", mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.fundo,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel="Tela de acesso ao sistema da despensa."
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 22,
            borderWidth: 1,
            borderColor: colors.borda,

            shadowColor: colors.sombra,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 30,
              fontWeight: "900",
              color: colors.principalEscuro,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Casa da Criança
          </Text>

          <Text
            style={{
              fontSize: 17,
              fontWeight: "800",
              color: colors.texto,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Controle da despensa
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: colors.textoSuave,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 22,
            }}
          >
            Acesse com o e-mail e a senha cadastrados pelo administrador.
          </Text>

          <View
            style={{
              backgroundColor: colors.principalClaro,
              borderColor: colors.principal,
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                color: colors.principalEscuro,
                fontSize: 15,
                fontWeight: "800",
                lineHeight: 21,
              }}
            >
              Acesso interno
            </Text>

            <Text
              style={{
                color: colors.textoSuave,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 4,
              }}
            >
              Esta área é usada pela equipe responsável pela cozinha e pelo
              estoque.
            </Text>
          </View>

          <Text style={styles.label}>E-mail</Text>

          <TextInput
            accessible
            accessibilityLabel="E-mail de acesso"
            accessibilityHint="Digite o e-mail cadastrado pelo administrador."
            style={[
              styles.input,
              {
                minHeight: 54,
                fontSize: 16,
              },
            ]}
            placeholder="Digite seu e-mail"
            value={email}
            editable={!carregando}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Senha</Text>

          <TextInput
            accessible
            accessibilityLabel="Senha de acesso"
            accessibilityHint="Digite sua senha."
            style={[
              styles.input,
              {
                minHeight: 54,
                fontSize: 16,
              },
            ]}
            placeholder="Digite sua senha"
            value={senha}
            editable={!carregando}
            onChangeText={setSenha}
            secureTextEntry
          />

          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Entrar no sistema"
            accessibilityHint="Valida seu acesso e abre o aplicativo."
            disabled={carregando}
            style={({ pressed }) => [
              styles.botaoSalvar,
              {
                minHeight: 56,
                marginTop: 10,
                opacity: carregando || pressed ? 0.65 : 1,
              },
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
            <Text
              accessibilityLiveRegion="polite"
              style={{
                textAlign: "center",
                marginTop: 12,
                color: colors.textoSuave,
              }}
            >
              Entrando no sistema...
            </Text>
          )}

          <Text
            style={{
              textAlign: "center",
              color: colors.textoSuave,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 18,
            }}
          >
            Se não conseguir acessar, peça ajuda para um administrador.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}