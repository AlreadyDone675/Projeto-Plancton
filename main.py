"""
Sistema de Monitoramento ICMP, Calculo de Jitter/TTL e Persistencia em SQLite.
Atende: RF01, RF02, RF03, RF04, RF05 e os requisitos de banco de dados e historico.
"""

import sqlite3
import time
import subprocess
import re
import os

DB_NAME = "rede_monitoramento.db"

# ==========================================================
# 1. INICIALIZACAO E ESTRUTURA DO BANCO DE DADOS (SQLite)
# ==========================================================
def inicializar_banco():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Tabela de Hosts Cadastrados (RF01)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL,
            criado_em TEXT NOT NULL
        )
    """)

    # Tabela de Historico de Medicoes (RF03, RF05)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            host_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            rtt_ms REAL NOT NULL,
            jitter_ms REAL NOT NULL,
            ttl INTEGER,
            perda_percent REAL NOT NULL,
            status_predito TEXT NOT NULL,
            alerta_mensagem TEXT,
            FOREIGN KEY (host_id) REFERENCES hosts (id)
        )
    """)

    # Hosts Iniciais (Topologia Packet Tracer)
    hosts_iniciais = [
        ("192.168.20.50", "Servidor Datacenter (WAN)", "Remoto"),
        ("10.0.0.2", "Roteador Borda Remoto (R2)", "Gateway WAN"),
        ("192.168.10.1", "Gateway Local (R1-SP)", "Local")
    ]

    for ip, nome, tipo in hosts_iniciais:
        cursor.execute("""
            INSERT OR IGNORE INTO hosts (ip, nome, tipo, criado_em)
            VALUES (?, ?, ?, datetime('now'))
        """, (ip, nome, tipo))

    conn.commit()
    conn.close()
    print("[BANCO] SQLite inicializado com sucesso: " + DB_NAME)

# ==========================================================
# 2. LOGICA DE MONITORAMENTO, JITTER E TTL
# ==========================================================
def executar_ping(ip, count=4):
    """
    Executa o comando ping nativo do sistema operacional e extrai:
    - RTT médio (ms)
    - Jitter médio (ms)
    - TTL capturado
    - Taxa de perda (%)
    """
    cmd = ["ping", "-n", str(count), ip] if os.name == "nt" else ["ping", "-c", str(count), ip]

    try:
        resultado = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        saida = resultado.stdout

        # Extracao de tempos de resposta individuais para calcular Jitter
        tempos = [float(t) for t in re.findall(r"tempo[=<](\d+)ms|time[=<](\d+)ms", saida, re.IGNORECASE) if t]

        # Extracao do TTL
        ttls = re.findall(r"TTL=(\d+)", saida, re.IGNORECASE)
        ttl_valor = int(ttls[0]) if ttls else None

        # Extracao de perda
        match_perda = re.search(r"(\d+)% perda|(\d+)% packet loss", saida, re.IGNORECASE)
        perda = float(match_perda.group(1) or match_perda.group(2)) if match_perda else 100.0

        if tempos:
            rtt_medio = sum(tempos) / len(tempos)
            # Calculo do Jitter medio entre pacotes sucessivos
            jitter = sum(abs(tempos[i] - tempos[i-1]) for i in range(1, len(tempos))) / (len(tempos) - 1) if len(tempos) > 1 else 0.0
        else:
            rtt_medio = -1.0
            jitter = -1.0

        return rtt_medio, jitter, ttl_valor, perda

    except Exception as e:
        return -1.0, -1.0, None, 100.0

# ==========================================================
# 3. CLASSIFICACAO E PREDICAO (RF04)
# ==========================================================
def classificar_status(perda, rtt, jitter):
    """
    Classifica a integridade da comunicacao:
    - OK: Perda 0%, RTT estavel e Jitter baixo.
    - RISCO: Perda entre 1% e 25% OU RTT > 35ms OU Jitter > 15ms (degradacao).
    - FALHA: Perda > 25% ou sem resposta (enlace rompido).
    """
    if perda >= 50.0 or rtt < 0:
        return "FALHA", "[CRITICO] Enlace indisponivel ou host inalcancavel!"
    elif perda > 0.0 or rtt > 35.0 or jitter > 15.0:
        return "RISCO", "[ALERTA] Degradação detectada: alta variância de jitter ou fila congestionada!"
    else:
        return "OK", "[NORMAL] Comunicacao saudavel e parâmetros dentro do SLA."

# ==========================================================
# 4. CICLO DE COLETA E PERSISTENCIA NO BANCO (RF02, RF03, RF05)
# ==========================================================
def ciclo_coleta(rodadas=3):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT id, ip, nome FROM hosts")
    hosts = cursor.fetchall()

    for rodada in range(1, rodadas + 1):
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        print("\n" + "=" * 70)
        print(">> CICLO DE COLETA #" + str(rodada) + " | Timestamp: " + ts)
        print("=" * 70)

        for host_id, ip, nome in hosts:
            rtt, jitter, ttl, perda = executar_ping(ip, count=4)
            status, alerta = classificar_status(perda, rtt, jitter)

            # Salvar no SQLite (RF03, RF05)
            cursor.execute("""
                INSERT INTO medicoes (host_id, timestamp, rtt_ms, jitter_ms, ttl, perda_percent, status_predito, alerta_mensagem)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (host_id, ts, rtt, jitter, ttl, perda, status, alerta))
            conn.commit()

            # Exibicao no terminal
            print("Host: " + nome + " (" + ip + ")")
            print("  -> RTT: " + str(round(rtt, 2)) + " ms | Jitter: " + str(round(jitter, 2)) + " ms | TTL: " + str(ttl) + " | Perda: " + str(perda) + "%")
            print("  -> Predição: [" + status + "] " + alerta)

        time.sleep(3)

    conn.close()
    print("\n[SUCESSO] Coleta finalizada e persistida no banco SQLite.")

if __name__ == "__main__":
    inicializar_banco()
    ciclo_coleta(rodadas=3)