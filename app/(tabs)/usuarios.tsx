import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { db, secondaryAuth } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("cozinheiro");

  const [modoEdicao, setModoEdicao] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const lista = [];

      snapshot.forEach((documento) => {
        lista.push({
          id: documento.id,
          ...documento.data(),
        });
      });

      setUsuarios(lista);
    });

    return () => unsubscribe();
  }, []);

  const limparCampos = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setTipoUsuario("cozinheiro");
    setModoEdicao(false);
    setIdEditando(null);
  };

  const cadastrarUsuario = async () => {
    if (!nome || !email || !senha) {
      Alert.alert("Atenção", "Preencha nome, e-mail e senha.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const credencial = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        senha
      );

      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome,
        email: email.trim(),
        tipoUsuario,
        criadoEm: new Date(),
      });

      await signOut(secondaryAuth);

      Alert.alert("Sucesso", "Usuário cadastrado!");
      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível cadastrar o usuário.");
    }
  };

  const editarUsuario = (usuario) => {
    setModoEdicao(true);
    setIdEditando(usuario.id);
    setNome(usuario.nome || "");
    setEmail(usuario.email || "");
    setTipoUsuario(usuario.tipoUsuario || "cozinheiro");
    setSenha("");
  };

  const salvarEdicao = async () => {
    if (!idEditando) return;

    if (!nome || !email) {
      Alert.alert("Atenção", "Preencha nome e e-mail.");
      return;
    }

    try {
      await updateDoc(doc(db, "usuarios", idEditando), {
        nome,
        email: email.trim(),
        tipoUsuario,
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Usuário atualizado!");
      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar o usuário.");
    }
  };

  const excluirUsuario = async (id) => {
    try {
      await deleteDoc(doc(db, "usuarios", id));
      Alert.alert("Sucesso", "Usuário removido da lista!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível excluir o usuário.");
    }
  };

  const BotaoTipo = ({ texto, valor }) => (
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.nome}>{item.nome}</Text>
      <Text>E-mail: {item.email}</Text>
      <Text>Tipo: {item.tipoUsuario}</Text>

      <View style={styles.areaBotoes}>
        <Pressable style={styles.botaoEditar} onPress={() => editarUsuario(item)}>
          <Text style={styles.textoBotaoCard}>Editar</Text>
        </Pressable>

        <Pressable
          style={styles.botaoExcluir}
          onPress={() => excluirUsuario(item.id)}
        >
          <Text style={styles.textoBotaoCard}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Usuários</Text>

      <Text style={styles.subtituloPrincipal}>
        Cadastro e controle de contas do sistema
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>
          {modoEdicao ? "Editar usuário" : "Novo usuário"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={nome}
          onChangeText={setNome}
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {!modoEdicao && (
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />
        )}

        <Text style={styles.subtitulo}>Tipo de usuário</Text>

        <View style={styles.opcoes}>
          <BotaoTipo texto="Administrador" valor="administrador" />
          <BotaoTipo texto="Cozinheiro" valor="cozinheiro" />
          <BotaoTipo texto="Doador" valor="doador" />
        </View>

        <Pressable
          style={styles.botaoSalvar}
          onPress={modoEdicao ? salvarEdicao : cadastrarUsuario}
        >
          <Text style={styles.textoBotao}>
            {modoEdicao ? "Salvar alterações" : "Cadastrar usuário"}
          </Text>
        </Pressable>

        {modoEdicao && (
          <Pressable style={styles.botaoCancelar} onPress={limparCampos}>
            <Text style={styles.textoCancelar}>Cancelar edição</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitulo}>Usuários cadastrados</Text>

      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhum usuário cadastrado.</Text>
        }
      />
    </ScrollView>
  );
}