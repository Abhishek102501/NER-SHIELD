package com.nershield.ai;

/** Raised when the Python AI service is unreachable or answers with an error. */
public class AIServiceException extends RuntimeException {

    public AIServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
