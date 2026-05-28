import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { colors, shadows } from "../styles/globalStyles";

type ProdutoEscaneado = {
  codigo?: string;
  nome?: string;
  marca?: string;
  categoria?: string;
  validade?: string;
  origem?: "doacao" | "compra";
};

type ScannerProdutoProps = {
  onProdutoEncontrado: (produto: ProdutoEscaneado) => void;
  onFechar: () => void;
};

export default function ScannerProduto({
  onProdutoEncontrado,
  onFechar,
}: ScannerProdutoProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function buscarProdutoPorCodigo(codigo: string) {
    try {
      setCarregando(true);

      const resposta = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${codigo}.json`
      );

      const dados = await resposta.json();

      if (dados.status === 1 && dados.product) {
        const produto = dados.product;

        onProdutoEncontrado({
          codigo,
          nome: produto.product_name_pt || produto.product_name || "",
          marca: produto.brands || "",
          categoria:
            produto.categories_tags?.[0]?.replace("en:", "") ||
            produto.categories_tags?.[0]?.replace("pt:", "") ||
            "",
        });

        onFechar();
        return;
      }

      onProdutoEncontrado({
        codigo,
      });

      Alert.alert(
        "Produto não encontrado",
        "O código foi lido, mas o produto não foi encontrado na base. Você pode preencher os dados manualmente."
      );

      onFechar();
    } catch (error) {
      Alert.alert(
        "Erro ao buscar produto",
        "Não foi possível consultar os dados do produto. Verifique a internet e tente novamente."
      );

      setEscaneado(false);
    } finally {
      setCarregando(false);
    }
  }

  function tentarLerQRCodeInterno(conteudo: string): ProdutoEscaneado | null {
    try {
      const dados = JSON.parse(conteudo);

      if (dados.nome || dados.validade || dados.categoria) {
        return {
          codigo: dados.codigo || "",
          nome: dados.nome || "",
          marca: dados.marca || "",
          categoria: dados.categoria || "",
          validade: dados.validade || "",
          origem: dados.origem || undefined,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  async function aoEscanear({ data }: { data: string }) {
    if (escaneado || carregando) return;

    setEscaneado(true);

    const qrInterno = tentarLerQRCodeInterno(data);

    if (qrInterno) {
      onProdutoEncontrado(qrInterno);
      onFechar();
      return;
    }

    await buscarProdutoPorCodigo(data);
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.texto}>Verificando permissão da câmera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Permissão da câmera necessária</Text>

        <Text style={styles.texto}>
          Para ler código de barras ou QR Code, o BitStorage precisa acessar a
          câmera do celular.
        </Text>

        <TouchableOpacity
          style={styles.botaoPrincipal}
          onPress={requestPermission}
        >
          <Text style={styles.textoBotao}>Permitir câmera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoSecundario} onPress={onFechar}>
          <Text style={styles.textoBotaoSecundario}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "datamatrix",
          ],
        }}
        onBarcodeScanned={aoEscanear}
      />

      <View style={styles.overlay}>
        <Text style={styles.tituloScanner}>Aponte para o código</Text>

        <Text style={styles.textoScanner}>
          Leia o código de barras da embalagem ou um QR Code do BitStorage.
        </Text>

        <View style={styles.moldura} />

        {carregando && (
          <View style={styles.carregandoBox}>
            <ActivityIndicator size="small" />
            <Text style={styles.carregandoTexto}>Buscando produto...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.botaoFechar} onPress={onFechar}>
          <Text style={styles.textoBotao}>Cancelar leitura</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fundo,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.texto,
    marginBottom: 12,
    textAlign: "center",
  },
  texto: {
    fontSize: 16,
    color: colors.textoSuave,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  botaoPrincipal: {
    backgroundColor: colors.principal,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    marginTop: 8,
    ...shadows.soft,
  },
  botaoSecundario: {
    marginTop: 14,
  },
  textoBotao: {
    color: colors.textoClaro,
    fontSize: 16,
    fontWeight: "700",
  },
  textoBotaoSecundario: {
    color: colors.principalEscuro,
    fontSize: 16,
    fontWeight: "700",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  tituloScanner: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textoClaro,
    marginBottom: 8,
    textAlign: "center",
  },
  textoScanner: {
    fontSize: 16,
    color: colors.textoClaro,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  moldura: {
    width: 260,
    height: 260,
    borderWidth: 4,
    borderColor: colors.textoClaro,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  carregandoBox: {
    marginTop: 24,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  carregandoTexto: {
    fontSize: 15,
    color: colors.texto,
    fontWeight: "600",
  },
  botaoFechar: {
    position: "absolute",
    bottom: 36,
    backgroundColor: colors.principal,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
});