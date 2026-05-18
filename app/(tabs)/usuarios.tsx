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
import { colors, styles } from "../../styles/estoqueStyles";

type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  tipoUsuario?: string;
  ativo?: boolean;
  [key: string]: any;
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("cozinheiro");

  const [modoEdicao, setModoEdicao] = useState(false);
  const [idEditando, setIdEditando] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState("ativos");

  const [carregando, setCarregando] = useState(false);
  const [idProcessando, setIdProcessando] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => {
        const lista: Usuario[] = [];

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
        setCarregandoLista(false);
      },
      (error) => {
        console.log(error);
        setCarregandoLista(false);
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
        atualizadoEm: new Date(),
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

  const editarUsuario = (usuario: Usuario) => {
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

  const confirmarAlteracaoStatus = (usuario: Usuario) => {
    if (carregando) return;

    const estaAtivo = usuario.ativo !== false;

    Alert.alert(
      estaAtivo ? "Desativar usuário" : "Reativar usuário",
      estaAtivo
        ? `Deseja desativar "${usuario.nome}"? O usuário não deverá mais acessar o sistema.`
        : `Deseja reativar "${usuario.nome}"? O usuário voltará a acessar o sistema.`,
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

  const alterarStatusUsuario = async (id: string, novoStatus: boolean) => {
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

  const totalUsuarios = usuarios.length;
  const totalAtivos = usuarios.filter((usuario) => usuario.ativo !== false).length;
  const totalInativos = usuarios.filter((usuario) => usuario.ativo === false).length;

  const totalAdministradores = usuarios.filter(
    (usuario) => usuario.tipoUsuario === "administrador"
  ).length;

  const totalCozinheiros = usuarios.filter(
    (usuario) => usuario.tipoUsuario === "cozinheiro"
  ).length;

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const estaAtivo = usuario.ativo !== false;

    if (filtroStatus === "ativos") return estaAtivo;
    if (filtroStatus === "inativos") return !estaAtivo;
    if (filtroStatus === "administradores") {
      return usuario.tipoUsuario === "administrador";
    }
    if (filtroStatus === "cozinheiros") {
      return usuario.tipoUsuario === "cozinheiro";
    }

    return true;
  });

  const BotaoOpcao = ({
    texto,
    selecionado,
    aoPressionar,
    accessibilityHint,
  }: {
    texto: string;
    selecionado: boolean;
    aoPressionar: () => void;
    accessibilityHint?: string;
  }) => (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
      accessibilityHint={accessibilityHint || "Toque duas vezes para selecionar."}
      disabled={carregando}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.opcao,
        {
          minHeight: 46,
          justifyContent: "center",
          opacity: carregando || pressed ? 0.65 : 1,
        },
        selecionado && styles.opcaoSelecionada,
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          { fontSize: 15 },
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  const LinhaResumo = ({
    titulo,
    valor,
    descricao,
    tipo = "neutro",
  }: {
    titulo: string;
    valor: number | string;
    descricao: string;
    tipo?: "neutro" | "sucesso" | "alerta" | "perigo" | "info";
  }) => {
    let corFundo = colors.card;
    let corBorda = colors.borda;
    let corNumero = colors.texto;

    if (tipo === "sucesso") {
      corFundo = colors.sucessoFundo;
      corBorda = colors.sucesso;
      corNumero = colors.sucesso;
    }

    if (tipo === "alerta") {
      corFundo = colors.alertaFundo;
      corBorda = colors.alerta;
      corNumero = colors.alerta;
    }

    if (tipo === "perigo") {
      corFundo = colors.perigoFundo;
      corBorda = colors.perigo;
      corNumero = colors.perigo;
    }

    if (tipo === "info") {
      corFundo = colors.secundarioClaro;
      corBorda = colors.secundario;
      corNumero = colors.secundario;
    }

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${titulo}. Valor: ${valor}. ${descricao}`}
        style={{
          backgroundColor: corFundo,
          borderWidth: 1,
          borderColor: corBorda,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 72,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              color: colors.texto,
              marginBottom: 2,
            }}
          >
            {titulo}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.textoSuave,
              lineHeight: 18,
            }}
          >
            {descricao}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            color: corNumero,
            minWidth: 70,
            textAlign: "right",
          }}
        >
          {valor}
        </Text>
      </View>
    );
  };

  const Bloco = ({
    titulo,
    descricao,
    children,
  }: {
    titulo: string;
    descricao?: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borda,
        marginBottom: 16,
      }}
    >
      <Text accessibilityRole="header" style={styles.subtitulo}>
        {titulo}
      </Text>

      {descricao && (
        <Text
          style={{
            color: colors.textoSuave,
            lineHeight: 20,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          {descricao}
        </Text>
      )}

      {children}
    </View>
  );

  const CardUsuario = ({ item }: { item: Usuario }) => {
    const estaAtivo = item.ativo !== false;
    const processandoEsteItem = carregando && idProcessando === item.id;
    const ehAdmin = item.tipoUsuario === "administrador";

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Usuário ${item.nome || "sem nome"}. E-mail ${
          item.email || "não informado"
        }. Tipo ${ehAdmin ? "administrador" : "cozinheiro"}. Status ${
          estaAtivo ? "ativo" : "inativo"
        }.`}
        style={{
          backgroundColor: estaAtivo ? colors.card : colors.perigoFundo,
          borderColor: estaAtivo ? colors.borda : colors.perigo,
          borderWidth: 1,
          borderRadius: 18,
          padding: 15,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: colors.texto,
                marginBottom: 4,
              }}
            >
              {item.nome || "Usuário sem nome"}
            </Text>

            <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
              {item.email || "E-mail não informado"}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: estaAtivo
                ? colors.sucessoFundo
                : colors.perigoFundo,
              borderColor: estaAtivo ? colors.sucesso : colors.perigo,
              borderWidth: 1,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: estaAtivo ? colors.sucesso : colors.perigo,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              {estaAtivo ? "Ativo" : "Inativo"}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: colors.texto,
            fontWeight: "800",
            marginTop: 10,
          }}
        >
          Perfil: {ehAdmin ? "Administrador" : "Cozinheiro"}
        </Text>

        <Text style={{ color: colors.textoSuave, marginTop: 4, lineHeight: 20 }}>
          {ehAdmin
            ? "Pode gerenciar usuários, histórico, análise e estoque."
            : "Pode cadastrar itens, consultar estoque e registrar movimentações."}
        </Text>

        {processandoEsteItem && (
          <View style={{ marginTop: 10 }}>
            <ActivityIndicator size="small" color={colors.principal} />

            <Text style={{ textAlign: "center", marginTop: 5 }}>
              Processando alteração...
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Editar usuário ${item.nome || ""}`}
            accessibilityHint="Abre o formulário para editar nome e perfil do usuário."
            disabled={carregando}
            style={({ pressed }) => [
              styles.botaoEditar,
              {
                flex: 1,
                minHeight: 50,
                justifyContent: "center",
                opacity: carregando || pressed ? 0.65 : 1,
              },
            ]}
            onPress={() => editarUsuario(item)}
          >
            <Text style={styles.textoBotaoCard}>Editar</Text>
          </Pressable>

          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              estaAtivo
                ? `Desativar usuário ${item.nome || ""}`
                : `Reativar usuário ${item.nome || ""}`
            }
            accessibilityHint={
              estaAtivo
                ? "Impede que o usuário acesse o sistema."
                : "Permite que o usuário volte a acessar o sistema."
            }
            disabled={carregando}
            style={({ pressed }) => [
              styles.botaoExcluir,
              {
                flex: 1,
                minHeight: 50,
                justifyContent: "center",
                opacity: carregando || pressed ? 0.65 : 1,
                backgroundColor: estaAtivo ? colors.perigo : colors.sucesso,
              },
            ]}
            onPress={() => confirmarAlteracaoStatus(item)}
          >
            <Text style={styles.textoBotaoCard}>
              {processandoEsteItem
                ? "Aguarde..."
                : estaAtivo
                ? "Desativar"
                : "Reativar"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (carregandoLista) {
    return (
      <View
        style={[
          styles.container,
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.principal}
          accessibilityLabel="Carregando usuários"
        />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando usuários...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 32,
      }}
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        Usuários
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Cadastre e controle as contas internas do sistema.
      </Text>

      <Bloco
        titulo="Resumo dos usuários"
        descricao="Visão geral das contas cadastradas no aplicativo."
      >
        <LinhaResumo
          titulo="Total de usuários"
          valor={totalUsuarios}
          descricao="Todas as contas cadastradas"
          tipo="info"
        />

        <LinhaResumo
          titulo="Usuários ativos"
          valor={totalAtivos}
          descricao="Contas com acesso liberado"
          tipo="sucesso"
        />

        <LinhaResumo
          titulo="Usuários inativos"
          valor={totalInativos}
          descricao="Contas bloqueadas no sistema"
          tipo={totalInativos > 0 ? "perigo" : "info"}
        />

        <LinhaResumo
          titulo="Administradores"
          valor={totalAdministradores}
          descricao="Usuários com acesso completo"
          tipo="alerta"
        />

        <LinhaResumo
          titulo="Cozinheiros"
          valor={totalCozinheiros}
          descricao="Usuários de operação da despensa"
          tipo="neutro"
        />
      </Bloco>

      <Bloco
        titulo={modoEdicao ? "Editar usuário" : "Novo usuário"}
        descricao={
          modoEdicao
            ? "Altere o nome ou o perfil de acesso. O e-mail não é editado por segurança."
            : "Cadastre uma nova conta para acessar o sistema."
        }
      >
        <Text style={styles.label}>Nome</Text>

        <TextInput
          accessible
          accessibilityLabel="Nome do usuário"
          accessibilityHint="Digite o nome da pessoa que usará o sistema."
          style={styles.input}
          placeholder="Nome"
          value={nome}
          editable={!carregando}
          onChangeText={setNome}
        />

        <Text style={styles.label}>E-mail</Text>

        <TextInput
          accessible
          accessibilityLabel="E-mail do usuário"
          accessibilityHint={
            modoEdicao
              ? "O e-mail não pode ser alterado nesta tela."
              : "Digite o e-mail usado para login."
          }
          style={[styles.input, modoEdicao && { opacity: 0.65 }]}
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
              marginBottom: 12,
              color: colors.textoSuave,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            O e-mail não é alterado aqui para evitar conflito com o Firebase
            Authentication.
          </Text>
        )}

        {!modoEdicao && (
          <>
            <Text style={styles.label}>Senha</Text>

            <TextInput
              accessible
              accessibilityLabel="Senha do usuário"
              accessibilityHint="Digite uma senha com pelo menos seis caracteres."
              style={styles.input}
              placeholder="Senha"
              value={senha}
              editable={!carregando}
              onChangeText={setSenha}
              secureTextEntry
            />
          </>
        )}

        <Text style={styles.label}>Perfil de acesso</Text>

        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Administrador"
            selecionado={tipoUsuario === "administrador"}
            accessibilityHint="Seleciona acesso completo ao sistema."
            aoPressionar={() => setTipoUsuario("administrador")}
          />

          <BotaoOpcao
            texto="Cozinheiro"
            selecionado={tipoUsuario === "cozinheiro"}
            accessibilityHint="Seleciona acesso para operação da despensa."
            aoPressionar={() => setTipoUsuario("cozinheiro")}
          />
        </View>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            modoEdicao ? "Salvar alterações do usuário" : "Cadastrar usuário"
          }
          accessibilityHint="Salva os dados da conta."
          disabled={carregando}
          style={({ pressed }) => [
            styles.botaoSalvar,
            {
              minHeight: 54,
              opacity: carregando || pressed ? 0.65 : 1,
            },
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
          <Text
            accessibilityLiveRegion="polite"
            style={{ textAlign: "center", marginTop: 10 }}
          >
            {modoEdicao ? "Salvando alterações..." : "Cadastrando usuário..."}
          </Text>
        )}

        {modoEdicao && (
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Cancelar edição de usuário"
            disabled={carregando}
            style={({ pressed }) => [
              styles.botaoCancelar,
              {
                minHeight: 52,
                opacity: carregando || pressed ? 0.65 : 1,
              },
            ]}
            onPress={limparCampos}
          >
            <Text style={styles.textoCancelar}>Cancelar edição</Text>
          </Pressable>
        )}
      </Bloco>

      <Bloco
        titulo="Filtrar usuários"
        descricao="Escolha quais contas deseja visualizar na lista."
      >
        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Ativos"
            selecionado={filtroStatus === "ativos"}
            aoPressionar={() => setFiltroStatus("ativos")}
          />

          <BotaoOpcao
            texto="Inativos"
            selecionado={filtroStatus === "inativos"}
            aoPressionar={() => setFiltroStatus("inativos")}
          />

          <BotaoOpcao
            texto="Administradores"
            selecionado={filtroStatus === "administradores"}
            aoPressionar={() => setFiltroStatus("administradores")}
          />

          <BotaoOpcao
            texto="Cozinheiros"
            selecionado={filtroStatus === "cozinheiros"}
            aoPressionar={() => setFiltroStatus("cozinheiros")}
          />

          <BotaoOpcao
            texto="Todos"
            selecionado={filtroStatus === "todos"}
            aoPressionar={() => setFiltroStatus("todos")}
          />
        </View>
      </Bloco>

      <Text accessibilityRole="header" style={styles.subtitulo}>
        Usuários encontrados
      </Text>

      <FlatList
        data={usuariosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CardUsuario item={item} />}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhum usuário encontrado.</Text>
        }
      />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}