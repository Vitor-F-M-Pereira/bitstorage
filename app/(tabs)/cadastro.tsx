import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

const categorias = [
  "Grãos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Hortifruti",
  "Bebidas",
  "Produtos de limpeza",
  "Higiene pessoal",
  "Outros",
];

const tiposQuantidade = ["unidades", "kg", "litros"];

const tiposDoador = [
  "Pessoa física",
  "Empresa",
  "Instituição",
  "Grupo comunitário",
];

export default function Cadastro() {
  const [origem, setOrigem] = useState("Doação");

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");

  const [valorCompra, setValorCompra] = useState("");

  const [nomeDoador, setNomeDoador] = useState("");
  const [tipoDoador, setTipoDoador] = useState("Pessoa física");
  const [cidadeDoador, setCidadeDoador] = useState("Itapira");
  const [contatoDoador, setContatoDoador] = useState("");

  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const definirCategoriaGeral = (categoriaSelecionada: string) => {
    if (categoriaSelecionada === "Produtos de limpeza") {
      return "Limpeza";
    }

    if (categoriaSelecionada === "Higiene pessoal") {
      return "Higiene";
    }

    if (categoriaSelecionada === "Outros") {
      return "Outros";
    }

    return "Alimentos";
  };

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

  const limparCampos = () => {
    setOrigem("Doação");

    setNome("");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");

    setValorCompra("");

    setNomeDoador("");
    setTipoDoador("Pessoa física");
    setCidadeDoador("Itapira");
    setContatoDoador("");

    setObservacao("");
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
      const categoriaGeral = definirCategoriaGeral(categoria);

      const precoCompra =
        origem === "Compra" ? converterValorMonetario(valorCompra) : 0;

      const doadorId =
        origem === "Doação" ? gerarIdDoador(nomeDoador) : "";

      const detalheOrigem =
        origem === "Compra"
          ? "Compra realizada pela instituição"
          : nomeDoador.trim();

      const observacaoFinal = observacao.trim()
        ? observacao.trim()
        : origem === "Compra"
        ? "Entrada por compra"
        : "Entrada por doação";

      const novoAlimento = await addDoc(collection(db, "alimentos"), {
        nome: nome.trim(),
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
        criadoEm: dataRegistro,
        atualizadoEm: dataRegistro,
      });

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: novoAlimento.id,
        nomeProduto: nome.trim(),

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

  const BotaoOpcao = ({
    texto,
    selecionado,
    aoPressionar,
  }: {
    texto: string;
    selecionado: boolean;
    aoPressionar: () => void;
  }) => (
    <Pressable
      disabled={carregando}
      onPress={aoPressionar}
      style={[
        styles.opcao,
        selecionado && styles.opcaoSelecionada,
        carregando && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Cadastro</Text>

      <Text style={styles.subtituloPrincipal}>
        Registre compras ou doações recebidas pela despensa.
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>Origem do item</Text>

        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Doação"
            selecionado={origem === "Doação"}
            aoPressionar={() => {
              setOrigem("Doação");
              setValorCompra("");
            }}
          />

          <BotaoOpcao
            texto="Compra"
            selecionado={origem === "Compra"}
            aoPressionar={() => {
              setOrigem("Compra");
              setNomeDoador("");
              setTipoDoador("Pessoa física");
              setCidadeDoador("Itapira");
              setContatoDoador("");
            }}
          />
        </View>

        <Text style={styles.subtitulo}>Dados do item</Text>

        <Text style={styles.label}>Nome do alimento/produto</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: Arroz, sabonete, detergente..."
          value={nome}
          editable={!carregando}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Categoria</Text>

        <View style={styles.opcoes}>
          {categorias.map((item) => (
            <BotaoOpcao
              key={item}
              texto={item}
              selecionado={categoria === item}
              aoPressionar={() => setCategoria(item)}
            />
          ))}
        </View>

        <Text style={styles.label}>Quantidade</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 10"
          value={quantidade}
          editable={!carregando}
          onChangeText={setQuantidade}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Tipo de quantidade</Text>

        <View style={styles.opcoes}>
          {tiposQuantidade.map((item) => (
            <BotaoOpcao
              key={item}
              texto={item}
              selecionado={tipoQuantidade === item}
              aoPressionar={() => setTipoQuantidade(item)}
            />
          ))}
        </View>

        <Text style={styles.label}>Validade</Text>

        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={validade}
          editable={!carregando}
          onChangeText={formatarData}
          keyboardType="numeric"
          maxLength={10}
        />

        {origem === "Compra" && (
          <>
            <Text style={styles.subtitulo}>Dados da compra</Text>

            <Text style={styles.label}>Valor da compra</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: 25,90"
              value={valorCompra}
              editable={!carregando}
              onChangeText={setValorCompra}
              keyboardType="numeric"
            />
          </>
        )}

        {origem === "Doação" && (
          <>
            <Text style={styles.subtitulo}>Dados do doador</Text>

            <Text style={styles.label}>Nome do doador</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: Mercado Bom Preço, Família Silva..."
              value={nomeDoador}
              editable={!carregando}
              onChangeText={setNomeDoador}
            />

            <Text style={styles.label}>Tipo do doador</Text>

            <View style={styles.opcoes}>
              {tiposDoador.map((item) => (
                <BotaoOpcao
                  key={item}
                  texto={item}
                  selecionado={tipoDoador === item}
                  aoPressionar={() => setTipoDoador(item)}
                />
              ))}
            </View>

            <Text style={styles.label}>Cidade</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: Itapira"
              value={cidadeDoador}
              editable={!carregando}
              onChangeText={setCidadeDoador}
            />

            <Text style={styles.label}>Contato</Text>

            <TextInput
              style={styles.input}
              placeholder="Telefone, e-mail ou observação"
              value={contatoDoador}
              editable={!carregando}
              onChangeText={setContatoDoador}
            />
          </>
        )}

        <Text style={styles.label}>Observação</Text>

        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          placeholder="Observação opcional"
          value={observacao}
          editable={!carregando}
          onChangeText={setObservacao}
          multiline
        />

        <Pressable
          disabled={carregando}
          style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
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
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Salvando cadastro...
          </Text>
        )}
      </View>

      <View style={{ height: 25 }} />
    </ScrollView>
  );
}