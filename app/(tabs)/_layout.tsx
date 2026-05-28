import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors } from "../../styles/globalStyles";

export default function DrawerLayout() {
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        router.replace("/login");
        setCarregando(false);
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (!usuarioSnap.exists()) {
          await signOut(auth);
          router.replace("/login");
          setCarregando(false);
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

          router.replace("/login");
          setCarregando(false);
          return;
        }

        setNomeUsuario(dados.nome || "Usuário");
        setEmailUsuario(dados.email || usuario.email || "");
        setTipoUsuario(String(dados.tipoUsuario || "cozinheiro").toLowerCase());
      } catch (error) {
        console.log(error);
        await signOut(auth);
        router.replace("/login");
      } finally {
        setCarregando(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const sair = async () => {
    if (saindo) return;

    try {
      setSaindo(true);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível sair da conta.");
    } finally {
      setSaindo(false);
    }
  };

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.fundo,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.principal}
          accessibilityLabel="Carregando sistema"
        />

        <Text
          style={{
            marginTop: 10,
            color: colors.textoSuave,
          }}
        >
          Carregando...
        </Text>
      </View>
    );
  }

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";
  const podeAcessarAreaInterna = ehAdministrador || ehCozinheiro;
  const perfilFormatado = ehAdministrador ? "Administrador" : "Cozinheiro";

  const ocultarDoMenu = {
    display: "none" as const,
  };

  const CustomDrawerContent = (props: any) => {
    return (
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: colors.fundo,
        }}
      >
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Usuário conectado: ${nomeUsuario}. Perfil: ${perfilFormatado}.`}
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            marginHorizontal: 12,
            marginTop: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.borda,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: colors.principalEscuro,
              marginBottom: 4,
            }}
          >
            {nomeUsuario || "Usuário"}
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: colors.textoSuave,
              lineHeight: 20,
            }}
          >
            {emailUsuario || "E-mail não informado"}
          </Text>

          <View
            style={{
              alignSelf: "flex-start",
              marginTop: 10,
              backgroundColor: colors.principalClaro,
              borderColor: colors.principal,
              borderWidth: 1,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: colors.principalEscuro,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              {perfilFormatado}
            </Text>
          </View>
        </View>

        <DrawerItemList {...props} />

        <View
          style={{
            marginTop: "auto",
            borderTopWidth: 1,
            borderTopColor: colors.borda,
            paddingTop: 10,
            marginHorizontal: 10,
            marginBottom: 10,
          }}
        >
          <DrawerItem
            label={saindo ? "Saindo..." : "Sair da conta"}
            accessibilityLabel="Sair da conta"
            accessibilityHint="Encerra sua sessão e volta para a tela de login."
            icon={({ color, size }) =>
              saindo ? (
                <ActivityIndicator size="small" color={colors.perigo} />
              ) : (
                <Ionicons name="log-out-outline" size={size} color={color} />
              )
            }
            labelStyle={{
              fontSize: 15,
              fontWeight: "900",
              color: colors.perigo,
            }}
            style={{
              borderRadius: 14,
            }}
            inactiveTintColor={colors.perigo}
            onPress={sair}
          />
        </View>
      </DrawerContentScrollView>
    );
  };

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,

        headerStyle: {
          backgroundColor: colors.card,
        },

        headerTintColor: colors.principalEscuro,

        headerTitleStyle: {
          fontWeight: "900",
          color: colors.principalEscuro,
        },

        drawerActiveTintColor: colors.textoClaro,
        drawerInactiveTintColor: colors.textoSuave,

        drawerActiveBackgroundColor: colors.principal,

        drawerStyle: {
          backgroundColor: colors.fundo,
          width: 290,
        },

        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "800",
        },

        drawerItemStyle: {
          borderRadius: 14,
          marginHorizontal: 10,
          marginVertical: 4,
          minHeight: 48,
          justifyContent: "center",
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Início",
          drawerLabel: "Início",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />


      <Drawer.Screen
        name="doacoes"
        options={{
          title: "Itens Prioritários",
          drawerLabel: "Itens Prioritários",
          href: podeAcessarAreaInterna ? undefined : null,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="solicitacoes_doacao"
        options={{
          href: null,
          drawerItemStyle: {
            display: "none",
          },
        }}
      />

      <Drawer.Screen
        name="cadastro"
        options={{
          title: "Cadastro",
          drawerLabel: "Cadastro",
          href: podeAcessarAreaInterna ? undefined : null,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="estoque"
        options={{
          title: "Estoque",
          drawerLabel: "Estoque",
          href: podeAcessarAreaInterna ? undefined : null,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="alertas"
        options={{
          title: "Alertas",
          drawerLabel: "Alertas",
          href: podeAcessarAreaInterna ? undefined : null,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="historico"
        options={{
          title: "Histórico",
          drawerLabel: "Histórico",
          href: ehAdministrador ? undefined : null,
          drawerItemStyle: ehAdministrador ? undefined : ocultarDoMenu,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="analise"
        options={{
          title: "Análise IA",
          drawerLabel: "Análise IA",
          href: ehAdministrador ? undefined : null,
          drawerItemStyle: ehAdministrador ? undefined : ocultarDoMenu,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="usuarios"
        options={{
          title: "Usuários",
          drawerLabel: "Usuários",
          href: ehAdministrador ? undefined : null,
          drawerItemStyle: ehAdministrador ? undefined : ocultarDoMenu,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="dados_simulados"
        options={{
          title: "Dados Simulados",
          drawerLabel: "Dados Simulados",
          href: ehAdministrador ? undefined : null,
          drawerItemStyle: ehAdministrador ? undefined : ocultarDoMenu,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="flask-outline" size={size} color={color} />
          ),
        }}
      />
</Drawer>
  );
}