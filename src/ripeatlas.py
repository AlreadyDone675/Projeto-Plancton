"""
src/ripeatlas.py
Coleta contínua e recursiva de dados de telemetria da rede pública RIPE Atlas.
Executa ciclos sucessivos indefinidamente até que o usuário interrompa (Ctrl+C).

Possui detecção de histórico pré-existente:
- Se 'measurements_history.csv' existir, coleta incrementalmente apenas as medições mais recentes.
- Se não existir, faz a carga inicial completa (padrão 365 dias) em lotes paralelos.
"""

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import pandas as pd
import requests

BASE = "https://atlas.ripe.net/api/v2"
MSM_ID = 1001                  # Medição ping pública global (K-root DNS)
DIAS_INICIAL_PADRAO = 365      # Histórico inicial caso o CSV não exista (1 ano)
N_PROBES_PADRAO = 15           # 15 probes ativas no Brasil
JANELA_DIAS_LOTE = 15          # Tamanho da janela para download paralelo inicial
MAX_WORKERS = 5                # Conexões paralelas simultâneas
INTERVALO_PADRAO_SEGUNDOS = 120  # Intervalo entre coletas sucessivas (2 minutos)
OUTPUT_FILE = "measurements_history.csv"

# Aumenta limite de recursão do Python para suporte a coletas prolongadas
sys.setrecursionlimit(200000)


def probes_br(n=N_PROBES_PADRAO):
    """Obtém as probes ativas no Brasil a partir da API pública do RIPE Atlas."""
    print(f"[*] Buscando {n} probes ativas no Brasil na API do RIPE Atlas...")
    try:
        r = requests.get(
            f"{BASE}/probes/",
            params={"country_code": "BR", "status": 1, "page_size": n},
            timeout=30,
        )
        r.raise_for_status()
        probes = r.json().get("results", [])
        print(f"    -> {len(probes)} probes ativas identificadas: {[p['id'] for p in probes]}")
        return probes
    except Exception as e:
        print(f"    [AVISO] Falha ao consultar catálogo de probes: {e}")
        return []


def _baixar_um_lote(idx, total_lotes, probe_ids_str, inicio, fim):
    """Baixa um lote específico de medições com até 3 tentativas."""
    for tentativa in range(3):
        try:
            r = requests.get(
                f"{BASE}/measurements/{MSM_ID}/results/",
                params={
                    "start": inicio,
                    "stop": fim,
                    "format": "json",
                    "probe_ids": probe_ids_str,
                },
                timeout=180,
            )
            r.raise_for_status()
            dados = r.json()
            linhas = []
            for x in dados:
                sent = x.get("sent", 0)
                if sent <= 0:
                    continue
                avg_val = x.get("avg")
                min_val = x.get("min")
                max_val = x.get("max")
                linhas.append({
                    "probe_id": x["prb_id"],
                    "ts_raw": x["timestamp"],
                    "avg": avg_val if (avg_val is not None and avg_val > 0) else None,
                    "min": min_val if (min_val is not None and min_val > 0) else None,
                    "max": max_val if (max_val is not None and max_val > 0) else None,
                    "sent": sent,
                    "rcvd": x.get("rcvd", 0),
                })
            if total_lotes > 1:
                print(f"    -> Lote {idx}/{total_lotes} concluído (+{len(dados)} medições).")
            return len(dados), linhas
        except Exception as e:
            if tentativa == 2:
                print(f"    [AVISO] Falha no lote {idx}/{total_lotes}: {e}")
                return 0, []
            time.sleep(2 * (tentativa + 1))
    return 0, []


def baixar_medicoes_janela(probe_ids, start_ts, stop_ts):
    """Baixa medições no intervalo [start_ts, stop_ts]. Se a janela for grande, divide em lotes."""
    passo = JANELA_DIAS_LOTE * 86400
    janelas = []
    atual = start_ts
    while atual < stop_ts:
        fim_janela = min(atual + passo, stop_ts)
        janelas.append((atual, fim_janela))
        atual = fim_janela

    total_lotes = len(janelas)
    probe_ids_str = ",".join(map(str, probe_ids))

    if total_lotes > 1:
        print(f"[*] Baixando medições divididas em {total_lotes} lotes paralelos...")

    total_brutos = 0
    todas_linhas = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futuros = [
            pool.submit(_baixar_um_lote, idx + 1, total_lotes, probe_ids_str, ini, fim)
            for idx, (ini, fim) in enumerate(janelas)
        ]
        for fut in as_completed(futuros):
            qtd, linhas = fut.result()
            total_brutos += qtd
            todas_linhas.extend(linhas)

    return total_brutos, todas_linhas


def processar_linhas_em_dataframe(linhas, meta):
    """Agrega pings brutos em intervalos horários com métricas e metadados."""
    if not linhas:
        return pd.DataFrame()

    df = pd.DataFrame(linhas)
    df["ts"] = pd.to_datetime(df["ts_raw"], unit="s", utc=True)
    df["hora_slot"] = df["ts"].dt.floor("h")

    g = (
        df.groupby(["probe_id", "hora_slot"])
        .agg(
            avg_rtt_ms=("avg", "mean"),
            min_rtt_ms=("min", "min"),
            max_rtt_ms=("max", "max"),
            std_rtt_ms=("avg", "std"),
            sent=("sent", "sum"),
            rcvd=("rcvd", "sum"),
            amostras=("avg", "count"),
        )
        .reset_index()
    )

    g = g.dropna(subset=["avg_rtt_ms"]).copy()
    g["std_rtt_ms"] = g["std_rtt_ms"].fillna(0.0)
    g["packet_loss_pct"] = ((1.0 - g["rcvd"] / g["sent"]).clip(lower=0.0, upper=1.0)) * 100.0
    g["hour"] = g["hora_slot"].dt.hour
    g["day_of_week"] = g["hora_slot"].dt.dayofweek
    g["measurement_id"] = MSM_ID
    g["country_code"] = "BR"
    g["asn_v4"] = g["probe_id"].map(lambda i: meta.get(i, {}).get("asn_v4"))
    g["asn_v6"] = g["probe_id"].map(lambda i: meta.get(i, {}).get("asn_v6"))
    g["longitude"] = g["probe_id"].map(
        lambda i: (meta.get(i, {}).get("geometry") or {}).get("coordinates", [None, None])[0]
    )
    g["latitude"] = g["probe_id"].map(
        lambda i: (meta.get(i, {}).get("geometry") or {}).get("coordinates", [None, None])[1]
    )

    g = g.rename(columns={"hora_slot": "timestamp"}).drop(columns=["sent", "rcvd"])
    g = g.sort_values(["probe_id", "timestamp"]).reset_index(drop=True)
    return g


def obter_ultimo_timestamp_salvo(arquivo_csv=OUTPUT_FILE):
    """Retorna o timestamp mais recente registrado no CSV em segundos (Unix epoch)."""
    if not os.path.exists(arquivo_csv):
        return None
    try:
        df = pd.read_csv(arquivo_csv, usecols=["timestamp"])
        if df.empty:
            return None
        ts_max = pd.to_datetime(df["timestamp"], utc=True).max()
        return int(ts_max.timestamp())
    except Exception:
        return None


def salvar_ou_mesclar_historico(df_novo, arquivo_csv=OUTPUT_FILE):
    """
    Mescla os novos registros horários com o histórico existente sem duplicidades.
    Substitui a hora em andamento pelas estatísticas consolidadas mais recentes.
    """
    if df_novo is None or df_novo.empty:
        return 0, 0

    if os.path.exists(arquivo_csv):
        try:
            df_antigo = pd.read_csv(arquivo_csv)
            df_antigo["timestamp"] = pd.to_datetime(df_antigo["timestamp"], utc=True)
            df_novo["timestamp"] = pd.to_datetime(df_novo["timestamp"], utc=True)

            linhas_antigas = len(df_antigo)
            df_combinado = pd.concat([df_antigo, df_novo], ignore_index=True)
            # Remove duplicatas mantendo a medição mais recente ('last') para atualizar a hora corrente
            df_combinado = df_combinado.drop_duplicates(subset=["probe_id", "timestamp"], keep="last")
            df_combinado = df_combinado.sort_values(["probe_id", "timestamp"]).reset_index(drop=True)

            df_combinado.to_csv(arquivo_csv, index=False, float_format="%.3f")
            linhas_adicionadas = len(df_combinado) - linhas_antigas
            return len(df_combinado), linhas_adicionadas
        except Exception as e:
            print(f"    [AVISO] Erro ao mesclar com CSV existente ({e}). Salvando novo arquivo.")

    df_novo.to_csv(arquivo_csv, index=False, float_format="%.3f")
    return len(df_novo), len(df_novo)


def executar_rodada(ciclo, meta, dias_inicial=DIAS_INICIAL_PADRAO):
    """Executa uma rodada única de coleta e atualização de dados."""
    agora = int(time.time())
    ultimo_ts = obter_ultimo_timestamp_salvo(OUTPUT_FILE)
    hora_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    print("=" * 68)
    print(f"[Ciclo #{ciclo} - {hora_str}]")

    if ultimo_ts is None:
        inicio = agora - dias_inicial * 86400
        print(f"[*] Histórico não encontrado. Iniciando carga inicial de {dias_inicial} dias...")
    else:
        # Sobreposição de 1 hora para recalcular e atualizar a hora em andamento
        inicio = max(agora - (dias_inicial * 86400), ultimo_ts - 3600)
        dt_inicio = datetime.fromtimestamp(inicio, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        print(f"[*] Coleta incremental a partir de {dt_inicio} UTC...")

    probe_ids = list(meta.keys())
    total_brutos, linhas = baixar_medicoes_janela(probe_ids, inicio, agora)
    print(f"    -> {total_brutos} medições de ping brutas recebidas.")

    if not linhas:
        print("    -> Nenhuma nova medição no período.")
        return 0

    df_novo = processar_linhas_em_dataframe(linhas, meta)
    if df_novo.empty:
        print("    -> Nenhuma medição válida para agregação horária.")
        return 0

    total_registros, novos = salvar_ou_mesclar_historico(df_novo, OUTPUT_FILE)
    print(f"[SUCESSO] Histórico atualizado em '{OUTPUT_FILE}':")
    print(f"          Total acumulado: {total_registros} registros horários (+{novos} novos/atualizados).")
    return novos


def coletar_recursivo(ciclo=1, meta=None, intervalo=INTERVALO_PADRAO_SEGUNDOS, dias_inicial=DIAS_INICIAL_PADRAO):
    """
    Função recursiva principal: executa sucessivas rodadas de coleta indefinidamente
    até que o usuário interrompa via teclado (Ctrl+C).
    """
    try:
        if meta is None or not meta:
            probes = probes_br(N_PROBES_PADRAO)
            meta = {p["id"]: p for p in probes}
            if not meta:
                print("[ERRO] Nenhuma probe disponível para monitoramento. Tentando novamente em 30s...")
                time.sleep(30)
                return coletar_recursivo(ciclo, None, intervalo, dias_inicial)

        executar_rodada(ciclo, meta, dias_inicial=dias_inicial)

        print(f"\n[Aguardando] Próxima coleta (ciclo #{ciclo + 1}) em {intervalo}s...")
        print("             (Pressione Ctrl+C a qualquer momento para cancelar)\n")
        time.sleep(intervalo)

        # Chamada recursiva para o próximo ciclo
        return coletar_recursivo(ciclo + 1, meta, intervalo, dias_inicial)

    except KeyboardInterrupt:
        print("\n" + "=" * 68)
        print(f"[ENCERRADO] Coleta recursiva cancelada pelo usuário após {ciclo} ciclo(s).")
        total = obter_ultimo_timestamp_salvo(OUTPUT_FILE)
        if total:
            print(f"Os dados históricos foram preservados com segurança em '{OUTPUT_FILE}'.")
        print("=" * 68)
    except RecursionError:
        # Reinicia o quadro de recursão de forma limpa sem perder o loop contínuo
        return coletar_recursivo(ciclo + 1, meta, intervalo, dias_inicial)
    except Exception as e:
        print(f"\n[AVISO NO CICLO #{ciclo}] Erro temporário na execução: {e}")
        print(f"Tentando novamente em {intervalo} segundos...")
        try:
            time.sleep(intervalo)
            return coletar_recursivo(ciclo + 1, meta, intervalo, dias_inicial)
        except KeyboardInterrupt:
            print("\n[ENCERRADO] Coleta recursiva cancelada pelo usuário.")


def main():
    parser = argparse.ArgumentParser(
        description="Coleta contínua e recursiva de medições do RIPE Atlas para histórico horário."
    )
    parser.add_argument(
        "--intervalo",
        type=int,
        default=INTERVALO_PADRAO_SEGUNDOS,
        help=f"Intervalo em segundos entre ciclos sucessivos (padrão: {INTERVALO_PADRAO_SEGUNDOS}s)",
    )
    parser.add_argument(
        "--dias-inicial",
        type=int,
        default=DIAS_INICIAL_PADRAO,
        help=f"Dias de histórico inicial se {OUTPUT_FILE} não existir (padrão: {DIAS_INICIAL_PADRAO})",
    )
    parser.add_argument(
        "--probes",
        type=int,
        default=N_PROBES_PADRAO,
        help=f"Quantidade de probes brasileiras a monitorar (padrão: {N_PROBES_PADRAO})",
    )
    parser.add_argument(
        "--uma-vez",
        action="store_true",
        help="Executa apenas uma rodada de coleta e encerra (sem recursão contínua)",
    )

    args = parser.parse_args()

    probes = probes_br(args.probes)
    meta = {p["id"]: p for p in probes}

    if args.uma_vez:
        executar_rodada(1, meta, dias_inicial=args.dias_inicial)
    else:
        coletar_recursivo(1, meta, intervalo=args.intervalo, dias_inicial=args.dias_inicial)


if __name__ == "__main__":
    main()
