package com.nershield;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point of the NER-SHIELD operational backend.
 *
 * <p>{@link ConfigurationPropertiesScan} registers every {@code @ConfigurationProperties}
 * type under {@code com.nershield}, so feature packages can own their own configuration
 * without a central registration class.
 *
 * <p>{@code UserDetailsServiceAutoConfiguration} is excluded so Spring Boot does not
 * create a default user with a generated password. Real principals arrive with the user
 * and authentication phases.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class NERShieldApplication {

    public static void main(String[] args) {
        SpringApplication.run(NERShieldApplication.class, args);
    }
}
