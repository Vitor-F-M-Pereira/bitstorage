import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
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

  const [filtroStatus, setFiltroStatus] = useState("ativos");

  const [carregando, setCarregando] = useState(false);
  const [idProcessando, setIdProcessando] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => {
        const lista = [];

        snapshot.forEach((documento) => {
          const dados = documento.data();

          lista.push({
            id: documento.id,
            ativo: dados.ativo !== false,
            ...dados,
          });
        });

        lista.sort((a, b) => {
          const nomeA = String(a.nome || "").toLowerCase();
          const nomeB = String(b.nome || "").toLowerCase();

          return nomeA.localeCompare(nomeB);
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
    if (!nome.trim() || !email.trim() || !senha.trim()) {
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
    if (!nome.trim()) {
      Alert.alert("Atenção", "Preencha o nome do usuário.");
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
        ativo: true,
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
        tipoUsuario,
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Usuário atualizado!");
      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar o usuário.");
    } finally {
      setCarregando(false);
      setIdProcessando(null);
    }
  };

  const confirmarAlteracaoStatus = (usuario) => {
    if (carregando) return;

    const estaAtivo = usuario.ativo !== false;

    Alert.alert(
      estaAtivo ? "Desativar usuário" : "Reativar usuário",
      estaAtivo
        ? `Deseja desativar "${usuario.nome}"? O usuário não deve mais acessar o sistema.`
        : `Deseja reativar "${usuario.nome}"? O usuário voltará a aparecer como ativo.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: estaAtivo ? "Desativar" : "Reativar",
          style: estaAtivo ? "destructive" : "default",
          onPress: () => alterarStatusUsuario(usuario.id, !estaAtivo),
        },
      ]
    );
  };

  const alterarStatusUsuario = async (id, novoStatus) => {
    if (carregando) return;

    try {
      setCarregando(true);
      setIdProcessando(id);

      await updateDoc(doc(db, "usuarios", id), {
        ativo: novoStatus,
        atualizadoEm: new Date(),
      });

      Alert.alert(
        "Sucesso",
        novoStatus ? "Usuário reativado!" : "Usuário desativado!"
      );
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível alterar o status do usuário.");
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

  const BotaoFiltroStatus = ({ texto, valor }) => (
    <Pressable
      disabled={carregando}
      onPress={() => setFiltroStatus(valor)}
      style={[
        styles.opcao,
        filtroStatus === valor && styles.opcaoSelecionada,
        carregando && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          filtroStatus === valor && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const estaAtivo = usuario.ativo !== false;

    if (filtroStatus === "ativos") return estaAtivo;
    if (filtroStatus === "inativos") return !estaAtivo;

    return true;
  });

  const renderItem = ({ item }) => {
    const processandoEsteItem = carregando && idProcessando === item.id;
    const estaAtivo = item.ativo !== false;

    return (
      <View style={styles.card}>
        <Text style={styles.nome}>{item.nome}</Text>

        <Text>E-mail: {item.email}</Text>
        <Text>Tipo: {item.tipoUsuario}</Text>
        <Text>Status: {estaAtivo ? "Ativo" : "Inativo"}</Text>

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
            style={[styles.botaoEditar, carregando && { opacity: 0.6 }]}
            onPress={() => editarUsuario(item)}
          >
            <Text style={styles.textoBotaoCard}>Editar</Text>
          </Pressable>

          <Pressable
            disabled={carregando}
            style={[styles.botaoExcluir, carregando && { opacity: 0.6 }]}
            onPress={() => confirmarAlteracaoStatus(item)}
          >
            <Text style={styles.textoBotaoCard}>
              {processandoEsteItem
                ? "Processando..."
                : estaAtivo
                ? "Desativar"
                : "Reativar"}
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
        Cadastro e controle de contas internas do sistema
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
          style={[styles.input, modoEdicao && { opacity: 0.6 }]}
          placeholder="E-mail"
          value={email}
          editable={!carregando && !modoEdicao}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {modoEdicao && (
          <Text
            style={{
              marginTop: -6,
              marginBottom: 10,
              color: "#777",
              fontSize: 13,
            }}
          >
            O e-mail não é alterado nesta tela para evitar conflito com o
            Firebase Authentication.
          </Text>
        )}

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
        </View>

        <Pressable
          disabled={carregando}
          style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
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
            style={[styles.botaoCancelar, carregando && { opacity: 0.6 }]}
            onPress={limparCampos}
          >
            <Text style={styles.textoCancelar}>Cancelar edição</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitulo}>Filtrar usuários</Text>

      <View style={styles.opcoes}>
        <BotaoFiltroStatus texto="Ativos" valor="ativos" />
        <BotaoFiltroStatus texto="Inativos" valor="inativos" />
        <BotaoFiltroStatus texto="Todos" valor="todos" />
      </View>

      <Text style={styles.subtitulo}>Usuários cadastrados</Text>

      <FlatList
        data={usuariosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhum usuário encontrado.</Text>
        }
      />
    </ScrollView>
  );
}