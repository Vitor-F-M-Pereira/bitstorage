import { router } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { auth, db } from "../services/firebaseConfig";
import { styles } from "../styles/estoqueStyles";

export default function Login() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("responsavel");
  const [modoCadastro, setModoCadastro] = useState(false);

  const BotaoOpcao = ({ texto, valor }) => (
    <Pressable
      onPress={() => setTipoUsuario(valor)}
      style={[styles.opcao, tipoUsuario === valor && styles.opcaoSelecionada]}
    >
      <Text
        style={[
          styles.textoOpcao,
          tipoUsuario === valor && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  const entrar = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Erro", "E-mail ou senha inválidos.");
    }
  };

  const cadastrar = async () => {
    if (!nome || !email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);

      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome,
        email,
        tipoUsuario,
        criadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Usuário cadastrado!");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível cadastrar o usuário.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>BitStorage</Text>
      <Text style={styles.subtituloPrincipal}>
        Acesso ao sistema da Casa da Criança
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>
          {modoCadastro ? "Criar conta" : "Entrar"}
        </Text>

        {modoCadastro && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={nome}
              onChangeText={setNome}
            />

            <Text style={styles.label}>Tipo de usuário</Text>

            <View style={styles.opcoes}>
                <BotaoOpcao texto="Administrador" valor="administrador" />
                <BotaoOpcao texto="Operador" valor="operador" />
                <BotaoOpcao texto="Doador" valor="doador" />
            </View>
          </>
        )}

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

        <Pressable
          style={styles.botaoSalvar}
          onPress={modoCadastro ? cadastrar : entrar}
        >
          <Text style={styles.textoBotao}>
            {modoCadastro ? "Cadastrar" : "Entrar"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.botaoCancelar}
          onPress={() => setModoCadastro(!modoCadastro)}
        >
          <Text style={styles.textoCancelar}>
            {modoCadastro
              ? "Já tenho conta"
              : "Criar nova conta"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}