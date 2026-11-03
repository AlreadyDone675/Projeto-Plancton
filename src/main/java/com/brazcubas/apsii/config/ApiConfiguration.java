package com.brazcubas.apsii.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class ApiConfiguration implements WebMvcConfigurer {
    private final List<String> allowedOrigins;

    public ApiConfiguration(@Value("${api.allowed-origins:*}") String origins) {
        List<String> configuredOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        this.allowedOrigins = configuredOrigins.isEmpty() ? List.of("*") : configuredOrigins;
    }

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI().info(new Info()
                .title("Internet Quality API")
                .version("0.2.0")
                .description("Educational API starter. Complete this OpenAPI documentation as part of the course work."));
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var mapping = registry.addMapping("/api/v1/**")
                .allowedMethods("*")
                .allowedHeaders("*");
        if (allowedOrigins.size() == 1 && allowedOrigins.get(0).equals("*")) {
            mapping.allowedOriginPatterns("*").allowCredentials(false);
        } else {
            mapping.allowedOrigins(allowedOrigins.toArray(String[]::new)).allowCredentials(true);
        }
    }
}
