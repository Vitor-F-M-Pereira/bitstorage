import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import CampoSelecao from "../../components/CampoSelecao";
import LeitorValidade from "../../components/LeitorValidade";
import ScannerProduto from "../../components/ScannerProduto";
import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/globalStyles";

const categoriasPorGrupo = {
  Alimentos: [
    "Grãos e cereais",
    "Massas",
    "Óleos",
    "Enlatados e conservas",
    "Leites e derivados",
    "Carnes e proteínas",
    "Hortifruti",
    "Bebidas",
  ],
  Limpeza: ["Produtos de limpeza"],
  Higiene: ["Higiene pessoal"],
  Outros: ["Outros"],
};

const tiposQuantidade = ["unidades", "kg", "litros"];

const tiposDoador = [
  "Pessoa física",
  "Empresa",
  "Instituição",
  "Grupo comunitário",
];

const opcoesOrigem = [
  { label: "Doação", value: "Doação" },
  { label: "Compra", value: "Compra" },
];

const opcoesCategoriaGeral = Object.keys(categoriasPorGrupo).map((item) => ({
  label: item,
  value: item,
}));

const opcoesTiposQuantidade = tiposQuantidade.map((item) => ({
  label: item,
  value: item,
}));

const opcoesTiposDoador = tiposDoador.map((item) => ({
  label: item,
  value: item,
}));

const opcoesPrioridade = [
  { label: "Não marcar", value: "nao" },
  { label: "Marcar como prioridade", value: "sim" },
];

const opcoesNivelPrioridade = [
  { label: "Média", value: "media" },
  { label: "Alta", value: "alta" },
];

type BlocoFormularioProps = {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
};

function BlocoFormulario({
  titulo,
  descricao,
  children,
}: BlocoFormularioProps) {
  return (
    <View
      accessible={false}
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
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {descricao}
        </Text>
      )}

      {children}
    </View>
  );
}

type DoadorCadastrado = {
  id: string;
  nome?: string;
  tipoDoador?: string;
  cidade?: string;
  contato?: string;
};

export default function Cadastro() {
  const [origem, setOrigem] = useState("Doação");

  const [nome, setNome] = useState("");
  const [categoriaGeral, setCategoriaGeral] = useState("Alimentos");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");

  const [codigoBarras, setCodigoBarras] = useState("");
  const [marca, setMarca] = useState("");

  const [scannerAberto, setScannerAberto] = useState(false);
  const [leitorValidadeAberto, setLeitorValidadeAberto] = useState(false);

  const [valorCompra, setValorCompra] = useState("");

  const [nomeDoador, setNomeDoador] = useState("");
  const [tipoDoador, setTipoDoador] = useState("Pessoa física");
  const [cidadeDoador, setCidadeDoador] = useState("Itapira");
  const [contatoDoador, setContatoDoador] = useState("");

  const [modalDoadoresVisivel, setModalDoadoresVisivel] = useState(false);
  const [doadoresCadastrados, setDoadoresCadastrados] = useState<
    DoadorCadastrado[]
  >([]);
  const [carregandoDoadores, setCarregandoDoadores] = useState(false);

  const [prioridadeDoacao, setPrioridadeDoacao] = useState(false);
  const [nivelPrioridadeDoacao, setNivelPrioridadeDoacao] = useState("media");
  const [motivoPrioridadeDoacao, setMotivoPrioridadeDoacao] = useState("");

  const [carregando, setCarregando] = useState(false);

  const gerarIdDoador = (nomeInformado: string) => {
    return String(nomeInformado || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const formatarData = (texto: string) => {
    const numeros = texto.replace(/\D/g, "");
    let dataFormatada = numeros;

    if (numeros.length > 2) {
      dataFormatada = numeros.slice(0, 2) + "/" + numeros.slice(2);
    }

    if (numeros.length > 4) {
      dataFormatada =
        numeros.slice(0, 2) +
        "/" +
        numeros.slice(2, 4) +
        "/" +
        numeros.slice(4, 8);
    }

    setValidade(dataFormatada);
  };

  const converterDataBrasileira = (data: string) => {
    if (!data) return null;

    const partes = String(data).split("/");
    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (
      !dia ||
      !mes ||
      !ano ||
      dia < 1 ||
      dia > 31 ||
      mes < 1 ||
      mes > 12 ||
      ano < 2024
    ) {
      return null;
    }

    const dataConvertida = new Date(ano, mes - 1, dia);

    if (
      dataConvertida.getDate() !== dia ||
      dataConvertida.getMonth() !== mes - 1 ||
      dataConvertida.getFullYear() !== ano
    ) {
      return null;
    }

    return dataConvertida;
  };

  const converterValorMonetario = (valor: string) => {
    if (!valor) return 0;

    const valorLimpo = String(valor)
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const valorNumerico = Number(valorLimpo);

    if (isNaN(valorNumerico)) return 0;

    return valorNumerico;
  };

  const selecionarCategoriaGeral = (grupo: string) => {
    const primeiraCategoria =
      categoriasPorGrupo[grupo as keyof typeof categoriasPorGrupo][0];

    setCategoriaGeral(grupo);
    setCategoria(primeiraCategoria);
  };

  const aplicarProdutoEscaneado = (produto: {
    codigo?: string;
    nome?: string;
    marca?: string;
    categoria?: string;
    validade?: string;
    origem?: "Doação" | "Compra";
  }) => {
    if (produto.codigo) {
      setCodigoBarras(produto.codigo);
    }

    if (produto.nome) {
      setNome(produto.nome);
    }

    if (produto.marca) {
      setMarca(produto.marca);
    }

    if (produto.validade) {
      setValidade(produto.validade);
    }

    if (produto.origem === "Doação" || produto.origem === "Compra") {
      setOrigem(produto.origem);
    }

    if (produto.categoria) {
      const categoriaRecebida = produto.categoria.toLowerCase();

      if (
        categoriaRecebida.includes("óleo") ||
        categoriaRecebida.includes("oleo") ||
        categoriaRecebida.includes("oil")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Óleos");
        return;
      }

      if (
        categoriaRecebida.includes("higiene") ||
        categoriaRecebida.includes("personal care")
      ) {
        setCategoriaGeral("Higiene");
        setCategoria("Higiene pessoal");
        return;
      }

      if (
        categoriaRecebida.includes("limpeza") ||
        categoriaRecebida.includes("cleaning")
      ) {
        setCategoriaGeral("Limpeza");
        setCategoria("Produtos de limpeza");
        return;
      }

      if (
        categoriaRecebida.includes("bebida") ||
        categoriaRecebida.includes("beverage") ||
        categoriaRecebida.includes("drink")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Bebidas");
        return;
      }

      if (
        categoriaRecebida.includes("massa") ||
        categoriaRecebida.includes("pasta")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Massas");
        return;
      }

      if (
        categoriaRecebida.includes("leite") ||
        categoriaRecebida.includes("dairy") ||
        categoriaRecebida.includes("milk")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Leites e derivados");
        return;
      }

      if (
        categoriaRecebida.includes("carne") ||
        categoriaRecebida.includes("protein") ||
        categoriaRecebida.includes("meat")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Carnes e proteínas");
        return;
      }

      if (
        categoriaRecebida.includes("fruit") ||
        categoriaRecebida.includes("vegetable") ||
        categoriaRecebida.includes("fruta") ||
        categoriaRecebida.includes("verdura")
      ) {
        setCategoriaGeral("Alimentos");
        setCategoria("Hortifruti");
        return;
      }

      setCategoriaGeral("Alimentos");
      setCategoria("Grãos e cereais");
    }
  };

  const carregarDoadores = async () => {
    try {
      setCarregandoDoadores(true);

      const consulta = query(collection(db, "doadores"), orderBy("nome", "asc"));
      const resultado = await getDocs(consulta);

      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      })) as DoadorCadastrado[];

      setDoadoresCadastrados(lista);
      setModalDoadoresVisivel(true);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar a lista de doadores.");
    } finally {
      setCarregandoDoadores(false);
    }
  };

  const selecionarDoador = (doador: DoadorCadastrado) => {
    setNomeDoador(doador.nome || "");
    setTipoDoador(doador.tipoDoador || "Pessoa física");
    setCidadeDoador(doador.cidade || "Itapira");
    setContatoDoador(doador.contato || "");
    setModalDoadoresVisivel(false);
  };

  const limparCampos = () => {
    setOrigem("Doação");

    setNome("");
    setCategoriaGeral("Alimentos");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");

    setCodigoBarras("");
    setMarca("");

    setValorCompra("");

    setNomeDoador("");
    setTipoDoador("Pessoa física");
    setCidadeDoador("Itapira");
    setContatoDoador("");

    setPrioridadeDoacao(false);
    setNivelPrioridadeDoacao("media");
    setMotivoPrioridadeDoacao("");
  };

  const validarCampos = () => {
    if (!nome.trim()) {
      Alert.alert("Atenção", "Informe o nome do alimento ou produto.");
      return false;
    }

    if (
      !quantidade.trim() ||
      isNaN(Number(quantidade)) ||
      Number(quantidade) <= 0
    ) {
      Alert.alert("Atenção", "Informe uma quantidade válida.");
      return false;
    }

    if (!validade.trim() || !converterDataBrasileira(validade)) {
      Alert.alert(
        "Atenção",
        "Digite uma validade válida no formato DD/MM/AAAA."
      );
      return false;
    }

    if (origem === "Compra") {
      const valorConvertido = converterValorMonetario(valorCompra);

      if (!valorCompra.trim() || valorConvertido <= 0) {
        Alert.alert("Atenção", "Informe um valor válido para a compra.");
        return false;
      }
    }

    if (origem === "Doação") {
      if (!nomeDoador.trim()) {
        Alert.alert("Atenção", "Informe o nome do doador.");
        return false;
      }

      if (!gerarIdDoador(nomeDoador)) {
        Alert.alert("Atenção", "Informe um nome de doador válido.");
        return false;
      }
    }

    return true;
  };

  const cadastrarAlimento = async () => {
    if (carregando) return;

    if (!validarCampos()) return;

    try {
      setCarregando(true);

      const dataRegistro = new Date();
      const dataValidade = converterDataBrasileira(validade);

      const quantidadeConvertida = Number(quantidade);

      const precoCompra =
        origem === "Compra" ? converterValorMonetario(valorCompra) : 0;

      const doadorId = origem === "Doação" ? gerarIdDoador(nomeDoador) : "";

      const detalheOrigem =
        origem === "Compra"
          ? "Compra realizada pela instituição"
          : nomeDoador.trim();

      const observacaoFinal =
        origem === "Compra" ? "Entrada por compra" : "Entrada por doação";

      const novoAlimento = await addDoc(collection(db, "alimentos"), {
        nome: nome.trim(),
        marca: marca.trim(),
        codigoBarras: codigoBarras.trim(),

        categoria,
        categoriaGeral,

        quantidade: quantidadeConvertida,
        tipoQuantidade,

        validade,
        validadeData: dataValidade,

        origem,
        detalheOrigem,
        precoCompra,

        doadorId,
        nomeDoador: origem === "Doação" ? nomeDoador.trim() : "",
        tipoDoador: origem === "Doação" ? tipoDoador : "",
        cidadeDoador:
          origem === "Doação"
            ? cidadeDoador.trim() || "Não informada"
            : "",
        contatoDoador:
          origem === "Doação"
            ? contatoDoador.trim() || "Não informado"
            : "",

        observacao: observacaoFinal,

        prioridadeDoacao,
        nivelPrioridadeDoacao: prioridadeDoacao ? nivelPrioridadeDoacao : "",
        motivoPrioridadeDoacao: prioridadeDoacao
          ? motivoPrioridadeDoacao.trim() ||
            "Item marcado como prioridade para doação."
          : "",

        criadoEm: dataRegistro,
        atualizadoEm: dataRegistro,
      });

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: novoAlimento.id,
        nomeProduto: nome.trim(),
        marca: marca.trim(),
        codigoBarras: codigoBarras.trim(),

        categoria,
        categoriaGeral,

        tipo: "entrada",
        origem,
        detalheOrigem,

        quantidade: quantidadeConvertida,
        quantidadeAnterior: 0,
        quantidadeAtual: quantidadeConvertida,
        tipoQuantidade,

        precoCompra,

        doadorId,
        nomeDoador: origem === "Doação" ? nomeDoador.trim() : "",
        tipoDoador: origem === "Doação" ? tipoDoador : "",

        observacao: observacaoFinal,

        data: dataRegistro,
        mes: String(dataRegistro.getMonth() + 1).padStart(2, "0"),
        ano: String(dataRegistro.getFullYear()),
      });

      if (origem === "Doação") {
        await setDoc(
          doc(db, "doadores", doadorId),
          {
            nome: nomeDoador.trim(),
            tipoDoador,
            cidade: cidadeDoador.trim() || "Não informada",
            contato: contatoDoador.trim() || "Não informado",
            atualizadoEm: dataRegistro,
            criadoEm: dataRegistro,
          },
          { merge: true }
        );

        await addDoc(collection(db, "doacoes"), {
          doadorId,
          nomeDoador: nomeDoador.trim(),
          tipoDoador,
          cidade: cidadeDoador.trim() || "Não informada",
          contato: contatoDoador.trim() || "Não informado",

          produto: nome.trim(),
          marca: marca.trim(),
          codigoBarras: codigoBarras.trim(),

          categoriaGeral,
          categoria,

          quantidade: quantidadeConvertida,
          tipoQuantidade,

          alimentoId: novoAlimento.id,
          origem: "Doação",

          data: dataRegistro,
          mes: String(dataRegistro.getMonth() + 1).padStart(2, "0"),
          ano: String(dataRegistro.getFullYear()),

          criadoEm: dataRegistro,
          dadoSimulado: false,
        });
      }

      Alert.alert(
        "Sucesso",
        origem === "Compra"
          ? "Compra cadastrada no estoque!"
          : "Doação cadastrada no estoque e na base da IA!"
      );

      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar o cadastro.");
    } finally {
      setCarregando(false);
    }
  };

  if (scannerAberto) {
    return (
      <ScannerProduto
        onFechar={() => setScannerAberto(false)}
        onProdutoEncontrado={aplicarProdutoEscaneado}
      />
    );
  }

  if (leitorValidadeAberto) {
    return (
      <LeitorValidade
        onFechar={() => setLeitorValidadeAberto(false)}
        onValidadeEncontrada={(validadeEncontrada) => {
          setValidade(validadeEncontrada);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Modal
        visible={modalDoadoresVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalDoadoresVisivel(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 22,
              padding: 18,
              maxHeight: "80%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: colors.texto,
                marginBottom: 6,
              }}
            >
              Doadores cadastrados
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: colors.textoSuave,
                marginBottom: 14,
                lineHeight: 20,
              }}
            >
              Selecione um doador para preencher os dados automaticamente.
            </Text>

            <ScrollView style={{ marginBottom: 10 }}>
              {doadoresCadastrados.length === 0 ? (
                <Text style={{ color: colors.textoSuave, marginBottom: 16 }}>
                  Nenhum doador cadastrado ainda.
                </Text>
              ) : (
                doadoresCadastrados.map((doador) => (
                  <Pressable
                    key={doador.id}
                    onPress={() => selecionarDoador(doador)}
                    style={({ pressed }) => [
                      {
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.borda,
                        backgroundColor: pressed ? colors.principalMuitoClaro : colors.card,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.texto,
                      }}
                    >
                      {doador.nome || "Doador sem nome"}
                    </Text>

                    <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
                      {doador.tipoDoador || "Tipo não informado"} •{" "}
                      {doador.cidade || "Cidade não informada"}
                    </Text>

                    <Text style={{ color: colors.textoSuave, marginTop: 2 }}>
                      {doador.contato || "Contato não informado"}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <Pressable
              onPress={() => setModalDoadoresVisivel(false)}
              style={{
                backgroundColor: colors.principal,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color: colors.textoClaro,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Fechar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.titulo}>
          Cadastro
        </Text>

        <Text style={styles.subtituloPrincipal}>
          Registre uma compra ou uma doação recebida pela despensa.
        </Text>

        <BlocoFormulario
          titulo="1. Origem do item"
          descricao="Escolha se o item entrou por compra da instituição ou por doação."
        >
          <CampoSelecao
            label="Origem"
            value={origem}
            options={opcoesOrigem}
            disabled={carregando}
            onChange={(valor) => {
              if (valor === "Doação") {
                setOrigem("Doação");
                setValorCompra("");
                return;
              }

              setOrigem("Compra");
              setNomeDoador("");
              setTipoDoador("Pessoa física");
              setCidadeDoador("Itapira");
              setContatoDoador("");
            }}
          />
        </BlocoFormulario>

        <BlocoFormulario
          titulo="2. Dados do item"
          descricao="Informe o produto, a quantidade e a validade."
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Ler código de barras ou QR Code"
            accessibilityHint="Abre a câmera para preencher dados do produto automaticamente."
            disabled={carregando}
            onPress={() => setScannerAberto(true)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.principal,
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderRadius: 14,
                marginBottom: 16,
                alignItems: "center",
                opacity: carregando || pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textoClaro,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Ler código de barras / QR Code
            </Text>
          </Pressable>

          {(codigoBarras || marca) && (
            <View
              style={{
                backgroundColor: colors.principalMuitoClaro,
                borderRadius: 14,
                padding: 12,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.borda,
              }}
            >
              <Text
                style={{
                  color: colors.texto,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Dados lidos pela câmera
              </Text>

              {codigoBarras ? (
                <Text style={{ color: colors.textoSuave }}>
                  Código: {codigoBarras}
                </Text>
              ) : null}

              {marca ? (
                <Text style={{ color: colors.textoSuave }}>
                  Marca: {marca}
                </Text>
              ) : null}
            </View>
          )}

          <Text style={styles.label}>Nome do alimento ou produto</Text>

          <TextInput
            accessible
            accessibilityLabel="Nome do alimento ou produto"
            accessibilityHint="Digite o nome do item que será cadastrado."
            style={styles.input}
            placeholder="Ex: Arroz, sabonete, detergente..."
            value={nome}
            editable={!carregando}
            onChangeText={setNome}
          />

          <Text style={styles.label}>Marca</Text>

          <TextInput
            accessible
            accessibilityLabel="Marca do produto"
            accessibilityHint="Digite a marca do produto, se houver."
            style={styles.input}
            placeholder="Ex: Camil, Ypê, Nestlé..."
            value={marca}
            editable={!carregando}
            onChangeText={setMarca}
          />

          <Text style={styles.label}>Código de barras</Text>

          <TextInput
            accessible
            accessibilityLabel="Código de barras"
            accessibilityHint="Digite ou leia o código de barras do produto."
            style={styles.input}
            placeholder="Código lido pela câmera"
            value={codigoBarras}
            editable={!carregando}
            onChangeText={setCodigoBarras}
            keyboardType="numeric"
          />

          <CampoSelecao
            label="Tipo do produto"
            value={categoriaGeral}
            options={opcoesCategoriaGeral}
            disabled={carregando}
            onChange={selecionarCategoriaGeral}
          />

          <CampoSelecao
            label="Categoria específica"
            value={categoria}
            options={categoriasPorGrupo[
              categoriaGeral as keyof typeof categoriasPorGrupo
            ].map((item) => ({ label: item, value: item }))}
            disabled={carregando}
            onChange={setCategoria}
          />

          <Text style={styles.label}>Quantidade</Text>

          <TextInput
            accessible
            accessibilityLabel="Quantidade do item"
            accessibilityHint="Digite a quantidade recebida."
            style={styles.input}
            placeholder="Ex: 10"
            value={quantidade}
            editable={!carregando}
            onChangeText={setQuantidade}
            keyboardType="numeric"
          />

          <CampoSelecao
            label="Medida"
            value={tipoQuantidade}
            options={opcoesTiposQuantidade}
            disabled={carregando}
            onChange={setTipoQuantidade}
          />

          <Text style={styles.label}>Validade</Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <TextInput
              accessible
              accessibilityLabel="Data de validade"
              accessibilityHint="Digite a validade no formato dia, mês e ano."
              style={[styles.input, { flex: 1 }]}
              placeholder="DD/MM/AAAA"
              value={validade}
              editable={!carregando}
              onChangeText={formatarData}
              keyboardType="numeric"
              maxLength={10}
            />

            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Ler validade pela câmera"
              accessibilityHint="Abre a câmera para tentar reconhecer a validade da embalagem."
              disabled={carregando}
              onPress={() => setLeitorValidadeAberto(true)}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.principal,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  marginBottom: 12,
                  opacity: carregando || pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textoClaro,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                Foto
              </Text>
            </Pressable>
          </View>

          <CampoSelecao
            label="Prioridade para doação"
            value={prioridadeDoacao ? "sim" : "nao"}
            options={opcoesPrioridade}
            disabled={carregando}
            onChange={(valor) => {
              if (valor === "sim") {
                setPrioridadeDoacao(true);
                return;
              }

              setPrioridadeDoacao(false);
              setMotivoPrioridadeDoacao("");
            }}
          />

          {prioridadeDoacao && (
            <>
              <CampoSelecao
                label="Nível da prioridade"
                value={nivelPrioridadeDoacao}
                options={opcoesNivelPrioridade}
                disabled={carregando}
                onChange={setNivelPrioridadeDoacao}
              />

              <Text style={styles.label}>Motivo da prioridade</Text>

              <TextInput
                accessible
                accessibilityLabel="Motivo da prioridade para doação"
                accessibilityHint="Explique por que este item deve aparecer como prioridade para doação."
                style={[styles.input, { minHeight: 92, textAlignVertical: "top" }]}
                placeholder="Ex: item muito usado nas refeições da semana"
                value={motivoPrioridadeDoacao}
                editable={!carregando}
                onChangeText={setMotivoPrioridadeDoacao}
                multiline
              />
            </>
          )}
        </BlocoFormulario>

        {origem === "Compra" && (
          <BlocoFormulario
            titulo="3. Dados da compra"
            descricao="Informe o valor pago pela instituição."
          >
            <Text style={styles.label}>Valor da compra</Text>

            <TextInput
              accessible
              accessibilityLabel="Valor da compra"
              accessibilityHint="Digite o valor pago pela compra."
              style={styles.input}
              placeholder="Ex: 25,90"
              value={valorCompra}
              editable={!carregando}
              onChangeText={setValorCompra}
              keyboardType="numeric"
            />
          </BlocoFormulario>
        )}

        {origem === "Doação" && (
          <BlocoFormulario
            titulo="3. Dados do doador"
            descricao="Esses dados ajudam o sistema a montar o perfil de doações para a análise IA."
          >
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Ver doadores cadastrados"
              accessibilityHint="Abre uma lista com os doadores já cadastrados."
              disabled={carregando || carregandoDoadores}
              onPress={carregarDoadores}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.principal,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  marginBottom: 16,
                  alignItems: "center",
                  opacity:
                    carregando || carregandoDoadores || pressed ? 0.65 : 1,
                },
              ]}
            >
              {carregandoDoadores ? (
                <ActivityIndicator color={colors.textoClaro} />
              ) : (
                <Text
                  style={{
                    color: colors.textoClaro,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Ver doadores cadastrados
                </Text>
              )}
            </Pressable>

            <Text style={styles.label}>Nome do doador</Text>

            <TextInput
              accessible
              accessibilityLabel="Nome do doador"
              accessibilityHint="Digite o nome da pessoa, empresa ou instituição que fez a doação."
              style={styles.input}
              placeholder="Ex: Mercado Bom Preço, Família Silva..."
              value={nomeDoador}
              editable={!carregando}
              onChangeText={setNomeDoador}
            />

            <CampoSelecao
              label="Tipo do doador"
              value={tipoDoador}
              options={opcoesTiposDoador}
              disabled={carregando}
              onChange={setTipoDoador}
            />

            <Text style={styles.label}>Cidade</Text>

            <TextInput
              accessible
              accessibilityLabel="Cidade do doador"
              accessibilityHint="Digite a cidade do doador."
              style={styles.input}
              placeholder="Ex: Itapira"
              value={cidadeDoador}
              editable={!carregando}
              onChangeText={setCidadeDoador}
            />

            <Text style={styles.label}>Contato</Text>

            <TextInput
              accessible
              accessibilityLabel="Contato do doador"
              accessibilityHint="Digite telefone, e-mail ou outra forma de contato."
              style={styles.input}
              placeholder="Telefone, e-mail ou contato"
              value={contatoDoador}
              editable={!carregando}
              onChangeText={setContatoDoador}
            />
          </BlocoFormulario>
        )}

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            origem === "Compra" ? "Cadastrar compra" : "Cadastrar doação"
          }
          accessibilityHint="Salva o item no estoque."
          disabled={carregando}
          style={({ pressed }) => [
            styles.botaoSalvar,
            {
              minHeight: 54,
              opacity: carregando || pressed ? 0.65 : 1,
            },
          ]}
          onPress={cadastrarAlimento}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>
              {origem === "Compra" ? "Cadastrar compra" : "Cadastrar doação"}
            </Text>
          )}
        </Pressable>

        {carregando && (
          <Text
            accessibilityLiveRegion="polite"
            style={{ textAlign: "center", marginTop: 10 }}
          >
            Salvando cadastro...
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}