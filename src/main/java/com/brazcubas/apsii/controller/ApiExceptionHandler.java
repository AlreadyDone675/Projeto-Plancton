package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.model.ApiDtos;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleApiException(ApiException exception) {
        List<ApiDtos.ErrorDetail> details = exception.details().entrySet().stream()
                .map(entry -> new ApiDtos.ErrorDetail(entry.getKey(), entry.getValue()))
                .toList();
        return response(exception.statusCode(), exception.code(), exception.getMessage(), details);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleInvalidBody(MethodArgumentNotValidException exception) {
        List<ApiDtos.ErrorDetail> details = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ApiDtos.ErrorDetail(error.getField(), error.getDefaultMessage()))
                .toList();
        return response(422, "VALIDATION_ERROR", "Invalid request parameters.", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleConstraintViolation(ConstraintViolationException exception) {
        List<ApiDtos.ErrorDetail> details = exception.getConstraintViolations().stream()
                .map(violation -> new ApiDtos.ErrorDetail(
                        violation.getPropertyPath().toString().replaceAll("^.*\\.", ""),
                        violation.getMessage()))
                .toList();
        return response(422, "VALIDATION_ERROR", "Invalid request parameters.", details);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleMissingParameter(MissingServletRequestParameterException exception) {
        return response(422, "VALIDATION_ERROR", "Invalid request parameters.",
                List.of(new ApiDtos.ErrorDetail(exception.getParameterName(), "Field required")));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return response(422, "VALIDATION_ERROR", "Invalid request parameters.",
                List.of(new ApiDtos.ErrorDetail(exception.getName(), "Input should be a valid value")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return response(422, "VALIDATION_ERROR", "Invalid request parameters.",
                List.of(new ApiDtos.ErrorDetail("body", "Malformed or invalid request body")));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleNotFound(NoResourceFoundException exception) {
        return response(404, "HTTP_ERROR", "Not found.", List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException exception) {
        return response(405, "HTTP_ERROR", "Method not allowed.", List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiDtos.ErrorResponse> handleUnexpected(Exception exception) {
        logger.error("Unhandled server error", exception);
        return response(500, "INTERNAL_ERROR", "An unexpected error occurred.", List.of());
    }

    private static ResponseEntity<ApiDtos.ErrorResponse> response(
            int status, String code, String message, List<ApiDtos.ErrorDetail> details) {
        ApiDtos.ErrorBody error = new ApiDtos.ErrorBody(code, message, details.isEmpty() ? null : details);
        return ResponseEntity.status(HttpStatusCode.valueOf(status)).body(new ApiDtos.ErrorResponse(error));
    }
}
