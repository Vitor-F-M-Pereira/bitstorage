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
  ActivityIndicator,
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

  const [carregando, setCarregando] = useState(false);
  const [idProcessando, setIdProcessando] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => {
        const lista = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          });
        });

        setUsuarios(lista);
      },
      (error) => {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar os usuários.");
      }
    );

    return () => unsubscribe();
  }, []);

  const limparCampos = () => {
    if (carregando) return;

    setNome("");
    setEmail("");
    setSenha("");
    setTipoUsuario("cozinheiro");
    setModoEdicao(false);
    setIdEditando(null);
  };

  const validarCadastro = () => {
    if (!nome || !email || !senha) {
      Alert.alert("Atenção", "Preencha nome, e-mail e senha.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Atenção", "Digite um e-mail válido.");
      return false;
    }

    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }

    return true;
  };

  const validarEdicao = () => {
    if (!nome || !email) {
      Alert.alert("Atenção", "Preencha nome e e-mail.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Atenção", "Digite um e-mail válido.");
      return false;
    }

    return true;
  };

  const cadastrarUsuario = async () => {
    if (carregando) return;

    if (!validarCadastro()) return;

    try {
      setCarregando(true);

      const credencial = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        senha
      );

      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome: nome.trim(),
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
    } finally {
      setCarregando(false);
    }
  };

  const editarUsuario = (usuario) => {
    if (carregando) return;

    setModoEdicao(true);
    setIdEditando(usuario.id);
    setNome(usuario.nome || "");
    setEmail(usuario.email || "");
    setTipoUsuario(usuario.tipoUsuario || "cozinheiro");
    setSenha("");
  };

  const salvarEdicao = async () => {
    if (carregando || !idEditando) return;

    if (!validarEdicao()) return;

    try {
      setCarregando(true);
      setIdProcessando(idEditando);

      await updateDoc(doc(db, "usuarios", idEditando), {
        nome: nome.trim(),
        email: email.trim(),
        tipoUsuario,
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Usuário atualizado!");
      setNome("");
      setEmail("");
      setSenha("");
      setTipoUsuario("cozinheiro");
      setModoEdicao(false);
      setIdEditando(null);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar o usuário.");
    } finally {
      setCarregando(false);
      setIdProcessando(null);
    }
  };

  const confirmarExclusao = (usuario) => {
    if (carregando) return;

    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja remover "${usuario.nome}" da lista de usuários?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => excluirUsuario(usuario.id),
        },
      ]
    );
  };

  const excluirUsuario = async (id) => {
    if (carregando) return;

    try {
      setCarregando(true);
      setIdProcessando(id);

      await deleteDoc(doc(db, "usuarios", id));

      Alert.alert("Sucesso", "Usuário removido da lista!");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível excluir o usuário.");
    } finally {
      setCarregando(false);
      setIdProcessando(null);
    }
  };

  const BotaoTipo = ({ texto, valor }) => (
    <Pressable
      disabled={carregando}
      onPress={() => setTipoUsuario(valor)}
      style={[
        styles.opcao,
        tipoUsuario === valor && styles.opcaoSelecionada,
        carregando && { opacity: 0.6 },
      ]}
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

  const renderItem = ({ item }) => {
    const processandoEsteItem = carregando && idProcessando === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.nome}>{item.nome}</Text>

        <Text>E-mail: {item.email}</Text>
        <Text>Tipo: {item.tipoUsuario}</Text>

        {processandoEsteItem && (
          <View style={{ marginTop: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ textAlign: "center", marginTop: 5 }}>
              Processando...
            </Text>
          </View>
        )}

        <View style={styles.areaBotoes}>
          <Pressable
            disabled={carregando}
            style={[
              styles.botaoEditar,
              carregando && { opacity: 0.6 },
            ]}
            onPress={() => editarUsuario(item)}
          >
            <Text style={styles.textoBotaoCard}>Editar</Text>
          </Pressable>

          <Pressable
            disabled={carregando}
            style={[
              styles.botaoExcluir,
              carregando && { opacity: 0.6 },
            ]}
            onPress={() => confirmarExclusao(item)}
          >
            <Text style={styles.textoBotaoCard}>
              {processandoEsteItem ? "Excluindo..." : "Excluir"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

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
          editable={!carregando}
          onChangeText={setNome}
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          editable={!carregando}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {!modoEdicao && (
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={senha}
            editable={!carregando}
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
          disabled={carregando}
          style={[
            styles.botaoSalvar,
            carregando && { opacity: 0.6 },
          ]}
          onPress={modoEdicao ? salvarEdicao : cadastrarUsuario}
        >
          {carregando && !idProcessando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>
              {modoEdicao ? "Salvar alterações" : "Cadastrar usuário"}
            </Text>
          )}
        </Pressable>

        {carregando && !idProcessando && (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            {modoEdicao ? "Salvando alterações..." : "Cadastrando usuário..."}
          </Text>
        )}

        {modoEdicao && (
          <Pressable
            disabled={carregando}
            style={[
              styles.botaoCancelar,
              carregando && { opacity: 0.6 },
            ]}
            onPress={limparCampos}
          >
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