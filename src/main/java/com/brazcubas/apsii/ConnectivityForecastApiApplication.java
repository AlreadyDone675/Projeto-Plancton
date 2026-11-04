package com.brazcubas.apsii;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Ponto de entrada da API de previsão de qualidade de conexão.
 */
@SpringBootApplication
@EnableScheduling
public class ConnectivityForecastApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConnectivityForecastApiApplication.class, args);
    }
}
