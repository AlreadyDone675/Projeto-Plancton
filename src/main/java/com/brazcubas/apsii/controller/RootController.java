package com.brazcubas.apsii.controller;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

@RestController
public class RootController {
    @Hidden
    @GetMapping("/")
    public RedirectView root() {
        return new RedirectView("/swagger-ui.html", false);
    }
}
