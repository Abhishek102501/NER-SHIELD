package com.nershield.rainfall;

/** Raised when the Python AI service's rainfall endpoints are unreachable or error out. */
public class RainfallServiceException extends RuntimeException {

    public RainfallServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
