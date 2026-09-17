package com.nershield.landslide;

/** Raised when the Python AI service's Landslide4Sense endpoints are unreachable or error out. */
public class LandslideServiceException extends RuntimeException {

    public LandslideServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
