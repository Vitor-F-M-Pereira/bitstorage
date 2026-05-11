import { StyleSheet } from "react-native";

export const colors = {
  fundo: "#F4F8F5",
  card: "#FFFFFF",

  principal: "#5B8C6A",
  principalEscuro: "#3F6F50",
  principalClaro: "#E6F1EA",

  secundario: "#6B8FA3",
  secundarioClaro: "#E8F1F5",

  texto: "#263238",
  textoSuave: "#607D8B",
  borda: "#DCE7E0",

  sucesso: "#5B8C6A",
  sucessoFundo: "#E7F4EA",

  alerta: "#B78B2D",
  alertaFundo: "#FFF4D8",

  perigo: "#B85C5C",
  perigoFundo: "#FCE8E8",

  cinza: "#ECEFF1",
  cinzaEscuro: "#757575",
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.fundo,
    padding: 20,
  },

  titulo: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.principalEscuro,
    marginBottom: 6,
  },

  subtituloPrincipal: {
    fontSize: 16,
    color: colors.textoSuave,
    marginBottom: 22,
    lineHeight: 22,
  },

  subtitulo: {
    fontSize: 19,
    fontWeight: "bold",
    color: colors.texto,
    marginTop: 18,
    marginBottom: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.texto,
    marginTop: 12,
    marginBottom: 8,
  },

  formulario: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borda,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  resumo: {
    backgroundColor: colors.principalClaro,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borda,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.texto,
    marginBottom: 12,
  },

  opcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  opcao: {
    backgroundColor: colors.cinza,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borda,
  },

  opcaoSelecionada: {
    backgroundColor: colors.principal,
    borderColor: colors.principal,
  },

  textoOpcao: {
    fontSize: 14,
    color: colors.texto,
    fontWeight: "500",
  },

  textoOpcaoSelecionada: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  botaoSalvar: {
    backgroundColor: colors.principal,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  botaoCancelar: {
    backgroundColor: colors.secundarioClaro,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D2E1E8",
  },

  textoCancelar: {
    color: colors.secundario,
    fontSize: 16,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borda,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },

  cardNormal: {
    borderLeftWidth: 6,
    borderLeftColor: colors.sucesso,
  },

  cardProximo: {
    backgroundColor: colors.alertaFundo,
    borderLeftWidth: 6,
    borderLeftColor: colors.alerta,
  },

  cardVencido: {
    backgroundColor: colors.perigoFundo,
    borderLeftWidth: 6,
    borderLeftColor: colors.perigo,
  },

  nome: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.texto,
    marginBottom: 8,
  },

  status: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    fontWeight: "bold",
    overflow: "hidden",
  },

  statusNormal: {
    backgroundColor: colors.sucessoFundo,
    color: colors.sucesso,
  },

  statusProximo: {
    backgroundColor: colors.alertaFundo,
    color: colors.alerta,
  },

  statusVencido: {
    backgroundColor: colors.perigoFundo,
    color: colors.perigo,
  },

  areaBotoes: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  botaoEditar: {
    flex: 1,
    backgroundColor: colors.secundario,
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  botaoExcluir: {
    flex: 1,
    backgroundColor: colors.perigo,
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  textoBotaoCard: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  listaVazia: {
    textAlign: "center",
    color: colors.textoSuave,
    marginTop: 18,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
  },
});