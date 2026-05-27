import * as ImagePicker from "expo-image-picker";
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type LeitorValidadeProps = {
  onValidadeEncontrada: (validade: string) => void;
  onFechar: () => void;
};

export default function LeitorValidade({
  onValidadeEncontrada,
  onFechar,
}: LeitorValidadeProps) {
  const [carregando, setCarregando] = useState(false);
  const [textoLido, setTextoLido] = useState("");

  function normalizarData(data: string) {
    const apenasNumeros = data.replace(/\D/g, "");

    if (apenasNumeros.length === 8) {
      const dia = apenasNumeros.slice(0, 2);
      const mes = apenasNumeros.slice(2, 4);
      const ano = apenasNumeros.slice(4, 8);

      return `${dia}/${mes}/${ano}`;
    }

    if (apenasNumeros.length === 6) {
      const dia = apenasNumeros.slice(0, 2);
      const mes = apenasNumeros.slice(2, 4);
      const anoCurto = apenasNumeros.slice(4, 6);
      const ano = Number(anoCurto) < 50 ? `20${anoCurto}` : `19${anoCurto}`;

      return `${dia}/${mes}/${ano}`;
    }

    return "";
  }

  function dataEhValida(data: string) {
    const partes = data.split("/");

    if (partes.length !== 3) return false;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (!dia || !mes || !ano) return false;
    if (dia < 1 || dia > 31) return false;
    if (mes < 1 || mes > 12) return false;
    if (ano < 2024 || ano > 2100) return false;

    const dataTeste = new Date(ano, mes - 1, dia);

    return (
      dataTeste.getDate() === dia &&
      dataTeste.getMonth() === mes - 1 &&
      dataTeste.getFullYear() === ano
    );
  }

  function encontrarValidade(texto: string) {
    const textoTratado = texto
      .replace(/[|]/g, "/")
      .replace(/[O]/gi, "0")
      .replace(/[lI]/g, "1");

    const padroes = [
      /\b\d{2}[\/\-.]\d{2}[\/\-.]\d{4}\b/g,
      /\b\d{2}[\/\-.]\d{2}[\/\-.]\d{2}\b/g,
      /\b\d{8}\b/g,
      /\b\d{6}\b/g,
    ];

    const datasEncontradas: string[] = [];

    for (const padrao of padroes) {
      const resultados = textoTratado.match(padrao);

      if (resultados) {
        resultados.forEach((resultado) => {
          const dataNormalizada = normalizarData(resultado);

          if (dataNormalizada && dataEhValida(dataNormalizada)) {
            datasEncontradas.push(dataNormalizada);
          }
        });
      }
    }

    if (datasEncontradas.length === 0) {
      return "";
    }

    return datasEncontradas[0];
  }

  async function tirarFotoELerValidade() {
    try {
      if (!isSupported) {
        Alert.alert(
          "Recurso indisponível",
          "Este aparelho não oferece suporte para leitura de texto por imagem."
        );
        return;
      }

      const permissao = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          "Permissão necessária",
          "Para ler a validade, o BitStorage precisa acessar a câmera."
        );
        return;
      }

      setCarregando(true);
      setTextoLido("");

      const foto = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (foto.canceled) {
        setCarregando(false);
        return;
      }

      const uri = foto.assets[0].uri;

      const textosExtraidos = await extractTextFromImage(uri);
      const textoCompleto = textosExtraidos.join(" ");

      setTextoLido(textoCompleto);

      const validade = encontrarValidade(textoCompleto);

      if (!validade) {
        Alert.alert(
          "Validade não encontrada",
          "Não consegui identificar uma data na imagem. Tente tirar uma foto mais próxima e bem iluminada."
        );
        return;
      }

      Alert.alert(
        "Validade encontrada",
        `Encontrei a validade ${validade}. Confira se está correta antes de salvar.`,
        [
          {
            text: "Tentar novamente",
            style: "cancel",
          },
          {
            text: "Usar validade",
            onPress: () => {
              onValidadeEncontrada(validade);
              onFechar();
            },
          },
        ]
      );
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Erro na leitura",
        "Não foi possível ler a validade pela imagem."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Ler validade pela câmera</Text>

      <Text style={styles.descricao}>
        Tire uma foto próxima da parte da embalagem onde aparece VAL, VENC ou
        VALIDADE. Depois confira se a data foi preenchida corretamente.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.botaoPrincipal,
          pressed && { opacity: 0.7 },
        ]}
        disabled={carregando}
        onPress={tirarFotoELerValidade}
      >
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.textoBotao}>Tirar foto da validade</Text>
        )}
      </Pressable>

      {textoLido ? (
        <View style={styles.caixaTexto}>
          <Text style={styles.subtitulo}>Texto encontrado:</Text>
          <Text style={styles.textoLido}>{textoLido}</Text>
        </View>
      ) : null}

      <Pressable style={styles.botaoVoltar} onPress={onFechar}>
        <Text style={styles.textoVoltar}>Voltar ao cadastro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F8FAF7",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#26382B",
    textAlign: "center",
    marginBottom: 12,
  },
  descricao: {
    fontSize: 16,
    color: "#4F5F52",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  botaoPrincipal: {
    backgroundColor: "#527853",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  botaoVoltar: {
    alignItems: "center",
    paddingVertical: 12,
  },
  textoVoltar: {
    color: "#527853",
    fontSize: 16,
    fontWeight: "700",
  },
  caixaTexto: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D9E4D4",
  },
  subtitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#26382B",
    marginBottom: 6,
  },
  textoLido: {
    fontSize: 14,
    color: "#4F5F52",
    lineHeight: 20,
  },
});