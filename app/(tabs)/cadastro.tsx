import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

const categoriasPorGrupo = {
  Alimentos: [
    "Grãos e cereais",
    "Massas",
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

type BotaoOpcaoProps = {
  texto: string;
  selecionado: boolean;
  carregando: boolean;
  aoPressionar: () => void;
  accessibilityHint?: string;
};

function BotaoOpcao({
  texto,
  selecionado,
  carregando,
  aoPressionar,
  accessibilityHint,
}: BotaoOpcaoProps) {
  return (
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
}

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

export default function Cadastro() {
  const [origem, setOrigem] = useState("Doação");

  const [nome, setNome] = useState("");
  const [categoriaGeral, setCategoriaGeral] = useState("Alimentos");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");

  const [valorCompra, setValorCompra] = useState("");

  const [nomeDoador, setNomeDoador] = useState("");
  const [tipoDoador, setTipoDoador] = useState("Pessoa física");
  const [cidadeDoador, setCidadeDoador] = useState("Itapira");
  const [contatoDoador, setContatoDoador] = useState("");

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

  const limparCampos = () => {
    setOrigem("Doação");

    setNome("");
    setCategoriaGeral("Alimentos");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");

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

      const doadorId =
        origem === "Doação" ? gerarIdDoador(nomeDoador) : "";

      const detalheOrigem =
        origem === "Compra"
          ? "Compra realizada pela instituição"
          : nomeDoador.trim();

      const observacaoFinal =
        origem === "Compra" ? "Entrada por compra" : "Entrada por doação";

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

        prioridadeDoacao,
        nivelPrioridadeDoacao: prioridadeDoacao ? nivelPrioridadeDoacao : "",
        motivoPrioridadeDoacao: prioridadeDoacao
          ? motivoPrioridadeDoacao.trim() || "Item marcado como prioridade para doação."
          : "",

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        <View style={styles.opcoes}>
          <BotaoOpcao
            carregando={carregando}
            texto="Doação"
            selecionado={origem === "Doação"}
            accessibilityHint="Seleciona cadastro de doação e mostra os dados do doador."
            aoPressionar={() => {
              setOrigem("Doação");
              setValorCompra("");
            }}
          />

          <BotaoOpcao
            carregando={carregando}
            texto="Compra"
            selecionado={origem === "Compra"}
            accessibilityHint="Seleciona cadastro de compra e mostra o campo de valor."
            aoPressionar={() => {
              setOrigem("Compra");
              setNomeDoador("");
              setTipoDoador("Pessoa física");
              setCidadeDoador("Itapira");
              setContatoDoador("");
            }}
          />
        </View>
      </BlocoFormulario>

      <BlocoFormulario
        titulo="2. Dados do item"
        descricao="Informe o produto, a quantidade e a validade."
      >
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

        <Text style={styles.label}>Tipo do produto</Text>

        <View style={styles.opcoes}>
          <BotaoOpcao
            carregando={carregando}
            texto="Alimentos"
            selecionado={categoriaGeral === "Alimentos"}
            aoPressionar={() => selecionarCategoriaGeral("Alimentos")}
          />

          <BotaoOpcao
            carregando={carregando}
            texto="Limpeza"
            selecionado={categoriaGeral === "Limpeza"}
            aoPressionar={() => selecionarCategoriaGeral("Limpeza")}
          />

          <BotaoOpcao
            carregando={carregando}
            texto="Higiene"
            selecionado={categoriaGeral === "Higiene"}
            aoPressionar={() => selecionarCategoriaGeral("Higiene")}
          />

          <BotaoOpcao
            carregando={carregando}
            texto="Outros"
            selecionado={categoriaGeral === "Outros"}
            aoPressionar={() => selecionarCategoriaGeral("Outros")}
          />
        </View>

        <Text style={styles.label}>Categoria específica</Text>

        <View style={styles.opcoes}>
          {categoriasPorGrupo[
            categoriaGeral as keyof typeof categoriasPorGrupo
          ].map((item) => (
            <BotaoOpcao
            carregando={carregando}
              key={item}
              texto={item}
              selecionado={categoria === item}
              aoPressionar={() => setCategoria(item)}
            />
          ))}
        </View>

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

        <Text style={styles.label}>Medida</Text>

        <View style={styles.opcoes}>
          {tiposQuantidade.map((item) => (
            <BotaoOpcao
            carregando={carregando}
              key={item}
              texto={item}
              selecionado={tipoQuantidade === item}
              aoPressionar={() => setTipoQuantidade(item)}
            />
          ))}
        </View>

        <Text style={styles.label}>Validade</Text>

        <TextInput
          accessible
          accessibilityLabel="Data de validade"
          accessibilityHint="Digite a validade no formato dia, mês e ano."
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={validade}
          editable={!carregando}
          onChangeText={formatarData}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.label}>Prioridade para doação</Text>

        <View style={styles.opcoes}>
          <BotaoOpcao
            carregando={carregando}
            texto="Não marcar"
            selecionado={!prioridadeDoacao}
            accessibilityHint="Mantém o item sem destaque manual para doação."
            aoPressionar={() => {
              setPrioridadeDoacao(false);
              setMotivoPrioridadeDoacao("");
            }}
          />

          <BotaoOpcao
            carregando={carregando}
            texto="Marcar como prioridade"
            selecionado={prioridadeDoacao}
            accessibilityHint="Marca o item para aparecer na área de itens necessários para doação."
            aoPressionar={() => setPrioridadeDoacao(true)}
          />
        </View>

        {prioridadeDoacao && (
          <>
            <Text style={styles.label}>Nível da prioridade</Text>

            <View style={styles.opcoes}>
              <BotaoOpcao
            carregando={carregando}
                texto="Média"
                selecionado={nivelPrioridadeDoacao === "media"}
                aoPressionar={() => setNivelPrioridadeDoacao("media")}
              />

              <BotaoOpcao
            carregando={carregando}
                texto="Alta"
                selecionado={nivelPrioridadeDoacao === "alta"}
                aoPressionar={() => setNivelPrioridadeDoacao("alta")}
              />
            </View>

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

          <Text style={styles.label}>Tipo do doador</Text>

          <View style={styles.opcoes}>
            {tiposDoador.map((item) => (
              <BotaoOpcao
            carregando={carregando}
                key={item}
                texto={item}
                selecionado={tipoDoador === item}
                aoPressionar={() => setTipoDoador(item)}
              />
            ))}
          </View>

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
