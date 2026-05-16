import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { auth, db } from "../../services/firebaseConfig";
import { colors } from "../../styles/estoqueStyles";

export default function TabLayout() {
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregando, setCarregando] = useState(true);

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

        setTipoUsuario(
          String(dados.tipoUsuario || "cozinheiro").toLowerCase()
        );
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
        <ActivityIndicator size="large" color={colors.principal} />
      </View>
    );
  }

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";
  const podeAcessarAreaInterna = ehAdministrador || ehCozinheiro;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarActiveTintColor: colors.principal,
        tabBarInactiveTintColor: colors.textoSuave,

        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.borda,
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,

          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 6,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cadastro"
        options={{
          title: "Cadastro",
          href: podeAcessarAreaInterna ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="estoque"
        options={{
          title: "Estoque",
          href: podeAcessarAreaInterna ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="alertas"
        options={{
          title: "Alertas",
          href: podeAcessarAreaInterna ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          href: ehAdministrador ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="usuarios"
        options={{
          title: "Usuários",
          href: ehAdministrador ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
  name="analise"
  options={{
    title: "Análise",
    href: ehAdministrador ? undefined : null,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="analytics-outline" size={size} color={color} />
    ),
  }}
/>

      <Tabs.Screen
        name="dados-simulados"
        options={{
          title: "Simulados",
          href: ehAdministrador ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flask-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}