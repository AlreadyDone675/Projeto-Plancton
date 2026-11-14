"""
src/gerar_previsoes.py
Treina os 4 modelos de Machine Learning (Linear Regression, Random Forest, Decision Tree, Gradient Boosting)
sobre o historico real de 365 dias coletado do RIPE Atlas (measurements_history.csv) e gera 48 horas (2 dias)
de previsoes no formato exato de 15 colunas exigido pelo Backend Java (data/predictions.csv).
"""

import os
from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor

INPUT_CSV = "measurements_history.csv"
OUTPUT_CSV = os.path.join("data", "predictions.csv")
HORAS_PREVISAO = 48  # 2 dias completos (48 horas)
BRT_TZ = timezone(timedelta(hours=-3))


def extrair_features(df_horas):
    """Cria features ciclicas de hora do dia (fuso Brasil UTC-3) e dia da semana para os modelos de ML."""
    h = df_horas["hour"].to_numpy(dtype=float)
    dow = df_horas["day_of_week"].to_numpy(dtype=float)
    is_weekend = (dow >= 5).astype(float)

    return np.column_stack([
        h,
        np.sin(2 * np.pi * h / 24.0),
        np.cos(2 * np.pi * h / 24.0),
        np.sin(4 * np.pi * h / 24.0),
        np.cos(4 * np.pi * h / 24.0),
        dow,
        is_weekend,
        np.sin(2 * np.pi * dow / 7.0),
        np.cos(2 * np.pi * dow / 7.0),
    ])


def instanciar_modelos():
    """Retorna os 4 modelos correspondentes ao catalogo data/models.json do Java."""
    return {
        "model-a": (
            LinearRegression(),
            LinearRegression(),
            0.85,
        ),
        "model-b": (
            RandomForestRegressor(n_estimators=60, max_depth=6, min_samples_leaf=5, random_state=42),
            RandomForestRegressor(n_estimators=60, max_depth=6, min_samples_leaf=5, random_state=42),
            0.91,
        ),
        "model-c": (
            DecisionTreeRegressor(max_depth=5, min_samples_leaf=8, random_state=42),
            DecisionTreeRegressor(max_depth=5, min_samples_leaf=8, random_state=42),
            0.82,
        ),
        "model-d": (
            GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.08, random_state=42),
            GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.08, random_state=42),
            0.93,
        ),
    }


def formatar_inteiro_opcional(val):
    if pd.isna(val) or val is None or str(val).strip() == "":
        return ""
    try:
        return str(int(float(val)))
    except (ValueError, TypeError):
        return ""


def main():
    if not os.path.exists(INPUT_CSV):
        raise FileNotFoundError(f"Arquivo {INPUT_CSV} nao encontrado. Execute src/ripeatlas.py primeiro.")

    print(f"[1/3] Carregando historico real de {INPUT_CSV}...")
    df = pd.read_csv(INPUT_CSV)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # Converte o horario de treinamento para o fuso do Brasil (UTC-3)
    ts_brt = df["timestamp"].dt.tz_convert(BRT_TZ)
    df["hour"] = ts_brt.dt.hour
    df["day_of_week"] = ts_brt.dt.dayofweek

    # Janela de previsao de 48h alinhada as 00h..23h locais
    agora_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    inicio_previsao = agora_utc.replace(hour=0)
    generated_at_str = agora_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    datas_futuras = [inicio_previsao + timedelta(hours=i) for i in range(HORAS_PREVISAO)]
    df_futuro = pd.DataFrame({
        "prediction_for_dt": datas_futuras,
        "hour": [d.hour for d in datas_futuras],
        "day_of_week": [d.weekday() for d in datas_futuras],
    })
    X_futuro = extrair_features(df_futuro)

    probes = sorted(df["probe_id"].unique())
    print(f"[2/3] Treinando 4 modelos de ML com 365 dias para {len(probes)} probes (horizonte de {HORAS_PREVISAO}h / 2 dias)...")

    linhas_saida = []

    for probe_id in probes:
        sub = df[df["probe_id"] == probe_id].sort_values("timestamp").copy()
        if sub.empty:
            continue

        # Metadados fixos da probe
        primeira = sub.iloc[-1]
        msm_id = int(primeira["measurement_id"])
        country = str(primeira["country_code"] or "BR")
        asn_v4 = formatar_inteiro_opcional(primeira.get("asn_v4"))
        asn_v6 = formatar_inteiro_opcional(primeira.get("asn_v6"))
        lat = round(float(primeira["latitude"]), 4)
        lon = round(float(primeira["longitude"]), 4)

        # Remove mudancas estruturais antigas de rota (BGP) preservando a variacao horaria/semanal dos 365 dias
        # ancorada no patamar operacional recente (ultimos 7 dias = 168 horas)
        janela_recente = sub.tail(168)
        base_atual_rtt = float(janela_recente["avg_rtt_ms"].median())
        media_movel_rtt = sub["avg_rtt_ms"].rolling(window=72, min_periods=1, center=True).median()
        variacao_horaria_rtt = (sub["avg_rtt_ms"] - media_movel_rtt).clip(
            lower=-0.25 * base_atual_rtt,
            upper=0.35 * base_atual_rtt,
        )
        y_rtt = (base_atual_rtt + variacao_horaria_rtt).clip(lower=0.5).to_numpy(dtype=float)

        y_loss = sub["packet_loss_pct"].clip(upper=15.0).to_numpy(dtype=float)
        X_train = extrair_features(sub)

        # Pesos maiores para as semanas mais recentes ao longo dos 365 dias
        pesos = np.linspace(0.3, 1.0, len(sub))

        cv_rtt = float(np.std(y_rtt) / max(1.0, np.mean(y_rtt)))
        penalidade_variancia = min(0.12, cv_rtt * 0.15)

        modelos = instanciar_modelos()

        for model_id, (reg_rtt, reg_loss, base_conf) in modelos.items():
            reg_rtt.fit(X_train, y_rtt, sample_weight=pesos)
            reg_loss.fit(X_train, y_loss, sample_weight=pesos)

            pred_rtt = reg_rtt.predict(X_futuro)
            pred_loss = reg_loss.predict(X_futuro)

            confianca = round(max(0.70, min(0.98, base_conf - penalidade_variancia)), 2)

            for idx_h in range(HORAS_PREVISAO):
                dt_alvo = datas_futuras[idx_h]
                rtt_val = round(max(0.5, float(pred_rtt[idx_h])), 1)
                loss_val = round(min(100.0, max(0.0, float(pred_loss[idx_h]))), 2)

                linhas_saida.append({
                    "prediction_id": f"atlas-{model_id}-{int(probe_id)}-{idx_h:02d}",
                    "model_id": model_id,
                    "model_version": "1.0",
                    "probe_id": int(probe_id),
                    "measurement_id": msm_id,
                    "country_code": country,
                    "asn_v4": asn_v4,
                    "asn_v6": asn_v6,
                    "latitude": lat,
                    "longitude": lon,
                    "prediction_generated_at": generated_at_str,
                    "prediction_for": dt_alvo.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "predicted_avg_rtt_ms": rtt_val,
                    "predicted_packet_loss_pct": loss_val,
                    "model_confidence": confianca,
                })

    df_out = pd.DataFrame(linhas_saida)
    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
    df_out.to_csv(OUTPUT_CSV, index=False)
    print(f"[3/3] [SUCESSO] {len(df_out)} previsoes geradas e salvas em {OUTPUT_CSV}!")


if __name__ == "__main__":
    main()
