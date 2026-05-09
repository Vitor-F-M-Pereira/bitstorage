import { Tabs, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { auth, db } from "../../services/firebaseConfig";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        router.replace("/login");
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();
          setTipoUsuario(String(dados.tipoUsuario || "cozinheiro").toLowerCase());
        } else {
          setTipoUsuario("cozinheiro");
        }
      } catch (error) {
        console.log(error);
        setTipoUsuario("cozinheiro");
      } finally {
        setCarregando(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const ehAdministrador = tipoUsuario === "administrador";
  const ehCozinheiro = tipoUsuario === "cozinheiro";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cadastro"
        options={{
          title: "Cadastro",
          href: ehAdministrador || ehCozinheiro ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="estoque"
        options={{
          title: "Estoque",
          href: ehAdministrador || ehCozinheiro ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="archivebox.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="alertas"
        options={{
          title: "Alertas",
          href: ehAdministrador || ehCozinheiro ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          href: ehAdministrador ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
  name="usuarios"
  options={{
    title: "Usuários",
    href: ehAdministrador ? undefined : null,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="person.2.fill" color={color} />
    ),
  }}
/>
    </Tabs>
  );
}