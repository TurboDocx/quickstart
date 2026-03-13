package com.example.app.config;

import com.turbodocx.TurboDocxClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for the TurboDocx/TurboSign client.
 * Reads API key and base URL from application properties.
 */
@Configuration
public class TurboSignConfig {

    @Value("${turbosign.api-key}")
    private String apiKey;

    @Value("${turbosign.base-url}")
    private String baseUrl;

    @Bean
    public TurboDocxClient turboDocxClient() {
        return new TurboDocxClient.Builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .build();
    }
}
