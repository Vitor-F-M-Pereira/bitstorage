import json
import azure.functions as func
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


def gerar_recomendacao(categoria, quantidade_media, frequencia):
    if quantidade_media < 10:
        return f"Priorizar campanha de doação para {categoria}, pois a quantidade média está baixa."

    if frequencia >= 3:
        return f"{categoria} possui boa frequência de entrada, mas deve continuar sendo monitorado."

    return f"Acompanhar {categoria}, pois há pouca frequência de entrada nos registros."


@app.route(route="analisar-doacoes", methods=["POST"])
def analisar_doacoes(req: func.HttpRequest) -> func.HttpResponse:
    try:
        dados = req.get_json()

        if not isinstance(dados, list) or len(dados) == 0:
            return func.HttpResponse(
                json.dumps({
                    "erro": "Envie uma lista de itens para análise."
                }, ensure_ascii=False),
                status_code=400,
                mimetype="application/json"
            )

        df = pd.DataFrame(dados)

        colunas_obrigatorias = ["nome", "categoria", "quantidade", "unidade", "origem"]
        for coluna in colunas_obrigatorias:
            if coluna not in df.columns:
                return func.HttpResponse(
                    json.dumps({
                        "erro": f"Campo obrigatório ausente: {coluna}"
                    }, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json"
                )

        df["quantidade"] = pd.to_numeric(df["quantidade"], errors="coerce").fillna(0)

        resumo = (
            df.groupby("categoria")
            .agg(
                quantidade_total=("quantidade", "sum"),
                quantidade_media=("quantidade", "mean"),
                frequencia=("nome", "count")
            )
            .reset_index()
        )

        if len(resumo) == 1:
            categoria = resumo.iloc[0]["categoria"]
            quantidade_media = float(resumo.iloc[0]["quantidade_media"])
            frequencia = int(resumo.iloc[0]["frequencia"])

            resposta = {
                "total_registros": len(df),
                "total_grupos": 1,
                "clusters": [
                    {
                        "grupo": 1,
                        "perfil": f"Perfil de doações relacionado a {categoria}",
                        "categorias": [categoria],
                        "quantidade_total": float(resumo.iloc[0]["quantidade_total"]),
                        "quantidade_media": quantidade_media,
                        "frequencia": frequencia,
                        "recomendacao": gerar_recomendacao(
                            categoria,
                            quantidade_media,
                            frequencia
                        )
                    }
                ]
            }

            return func.HttpResponse(
                json.dumps(resposta, ensure_ascii=False),
                status_code=200,
                mimetype="application/json"
            )

        quantidade_clusters = min(3, len(resumo))

        features = resumo[["quantidade_total", "quantidade_media", "frequencia"]]

        scaler = StandardScaler()
        features_normalizadas = scaler.fit_transform(features)

        modelo = KMeans(
            n_clusters=quantidade_clusters,
            random_state=42,
            n_init=10
        )

        resumo["cluster"] = modelo.fit_predict(features_normalizadas)

        clusters = []

        for cluster_id in sorted(resumo["cluster"].unique()):
            grupo = resumo[resumo["cluster"] == cluster_id]

            categorias = grupo["categoria"].tolist()
            quantidade_total = float(grupo["quantidade_total"].sum())
            quantidade_media = float(grupo["quantidade_media"].mean())
            frequencia = int(grupo["frequencia"].sum())

            categoria_principal = categorias[0]

            if quantidade_media < 10:
                perfil = "Itens com baixa quantidade média"
            elif frequencia >= 3:
                perfil = "Itens com maior frequência de entrada"
            else:
                perfil = "Itens com entrada menos frequente"

            clusters.append({
                "grupo": int(cluster_id) + 1,
                "perfil": perfil,
                "categorias": categorias,
                "quantidade_total": quantidade_total,
                "quantidade_media": round(quantidade_media, 2),
                "frequencia": frequencia,
                "recomendacao": gerar_recomendacao(
                    categoria_principal,
                    quantidade_media,
                    frequencia
                )
            })

        resposta = {
            "total_registros": len(df),
            "total_grupos": quantidade_clusters,
            "clusters": clusters
        }

        return func.HttpResponse(
            json.dumps(resposta, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as erro:
        return func.HttpResponse(
            json.dumps({
                "erro": "Erro ao processar análise.",
                "detalhes": str(erro)
            }, ensure_ascii=False),
            status_code=500,
            mimetype="application/json"
        )