import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { colors, metrics, shadows, styles } from "../styles/globalStyles";

type OpcaoSelecao = {
  label: string;
  value: string;
};

type CampoSelecaoProps = {
  label: string;
  value: string;
  options: OpcaoSelecao[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accessibilityHint?: string;
};

export default function CampoSelecao({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione uma opção",
  disabled = false,
  accessibilityHint = "Toque duas vezes para abrir a lista de opções.",
}: CampoSelecaoProps) {
  const [visivel, setVisivel] = useState(false);

  const opcaoAtual = useMemo(
    () => options.find((opcao) => opcao.value === value),
    [options, value]
  );

  const textoAtual = opcaoAtual?.label || placeholder;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${textoAtual}`}
        accessibilityHint={accessibilityHint}
        disabled={disabled}
        onPress={() => setVisivel(true)}
        style={({ pressed }) => [
          styles.input,
          {
            marginBottom: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: opcaoAtual ? colors.texto : colors.textoSuave,
            fontSize: 16,
            fontWeight: "700",
            flex: 1,
            paddingRight: 12,
          }}
          numberOfLines={1}
        >
          {textoAtual}
        </Text>

        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ color: colors.principalEscuro, fontSize: 18, fontWeight: "900" }}
        >
          ▾
        </Text>
      </Pressable>

      <Modal
        transparent
        visible={visivel}
        animationType="fade"
        onRequestClose={() => setVisivel(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(32, 49, 42, 0.35)",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setVisivel(false)}
        >
          <Pressable
            accessible
            accessibilityRole="menu"
            accessibilityLabel={`Lista de opções para ${label}`}
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: metrics.radiusLg,
              borderWidth: 1,
              borderColor: colors.borda,
              maxHeight: "72%",
              overflow: "hidden",
              ...shadows.card,
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.borda,
                backgroundColor: colors.principalMuitoClaro,
              }}
            >
              <Text
                style={{
                  color: colors.principalEscuro,
                  fontSize: 18,
                  fontWeight: "900",
                }}
              >
                {label}
              </Text>

              <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
                Escolha uma opção da lista.
              </Text>
            </View>

            <ScrollView>
              {options.map((opcao) => {
                const selecionada = opcao.value === value;

                return (
                  <Pressable
                    key={opcao.value}
                    accessible
                    accessibilityRole="menuitem"
                    accessibilityLabel={`${opcao.label}${selecionada ? ", selecionado" : ""}`}
                    onPress={() => {
                      onChange(opcao.value);
                      setVisivel(false);
                    }}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borda,
                      backgroundColor: selecionada
                        ? colors.principalClaro
                        : pressed
                          ? colors.fundoAlternativo
                          : colors.card,
                      justifyContent: "center",
                    })}
                  >
                    <Text
                      style={{
                        color: selecionada ? colors.principalEscuro : colors.texto,
                        fontSize: 16,
                        fontWeight: selecionada ? "900" : "700",
                      }}
                    >
                      {opcao.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
