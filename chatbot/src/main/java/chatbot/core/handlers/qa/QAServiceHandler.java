package chatbot.core.handlers.qa;

import chatbot.core.handlers.Handler;
import chatbot.io.incomingrequest.IncomingRequest;
import chatbot.io.response.ResponseList;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.apache.log4j.Logger;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriTemplate;

import java.io.IOException;
import java.net.URI;

/**
 * @author sajjad
 */
public class QAServiceHandler extends Handler {

    private static final Logger log = Logger.getLogger(QAServiceHandler.class);

    private static final String URL = "http://localhost:8088/qa?query="; // TODO: 11/07/2018 read from application.yml later

    private final RestTemplate restTemplate;

    public QAServiceHandler(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder.build();
    }

    @Override
    public ResponseList search(IncomingRequest request) throws JsonProcessingException, IOException {

        //TODO:create responseList from string response returned by QAservice
        return null;
    }

    private String askQAService(IncomingRequest request) {
        log.info("Requesting an answer from QA service with following query: " + request.toString());
        String query = request.getRequestContent().get(0).getText();
        URI uri = new UriTemplate(URL).expand(query);
        return exchange(uri, String.class);
    }


    // TODO: 11/07/2018 This implementation should be moved to some common package,
    // TODO: since this will be used by every component to make rest call

    /**
     * Generic method to return response from a RestCall endpoint
     *
     * @param uri
     * @param response
     * @param <T>
     * @return
     */
    private <T> T exchange(URI uri, Class<T> response) {
        RequestEntity<?> requestEntity = RequestEntity.get(uri).accept(MediaType.APPLICATION_JSON).build();
        ResponseEntity<T> responseEntity = this.restTemplate.exchange(requestEntity, response);
        return responseEntity.getBody();
    }
}