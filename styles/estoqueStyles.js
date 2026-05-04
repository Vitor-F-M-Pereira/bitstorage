import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F4F6F8",
    padding: 20,
  },
  titulo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F3A5F",
    marginTop: 45,
    textAlign: "center",
  },
  subtituloPrincipal: {
    textAlign: "center",
    color: "#5E6C7B",
    marginBottom: 20,
  },
  resumo: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 18,
  },
  formulario: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  subtitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F3A5F",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#EEF1F4",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 15,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  opcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  opcao: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  opcaoSelecionada: {
    backgroundColor: "#2E7D32",
  },
  textoOpcao: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  textoOpcaoSelecionada: {
    color: "#FFFFFF",
  },
  botaoSalvar: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  botaoCancelar: {
    padding: 12,
    alignItems: "center",
  },
  textoCancelar: {
    color: "#C62828",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 6,
  },
  cardNormal: {
    borderLeftColor: "#2E7D32",
  },
  cardProximo: {
    borderLeftColor: "#EF6C00",
  },
  cardVencido: {
    borderLeftColor: "#C62828",
  },
  nome: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#1F3A5F",
  },
  status: {
    marginTop: 8,
    fontWeight: "bold",
  },
  statusNormal: {
    color: "#2E7D32",
  },
  statusProximo: {
    color: "#EF6C00",
  },
  statusVencido: {
    color: "#C62828",
  },
  areaBotoes: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  botaoEditar: {
    backgroundColor: "#1565C0",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  botaoExcluir: {
    backgroundColor: "#C62828",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  textoBotaoCard: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  listaVazia: {
    textAlign: "center",
    color: "#777777",
    marginBottom: 40,
  },
});