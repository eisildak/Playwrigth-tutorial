Feature: NNY API smoke test
  NNY aday ogrenci web endpointi icin temel API kontrolleri.

  Scenario: Aday homepage endpoint should be healthy
    Given I set NNY API base url to "https://adayogrenciler.nny.edu.tr"
    When I send a GET request to "/"
    Then API response status should be 200
    And API response status text should be "OK"
    And API response should be successful
    And API response header "content-type" should contain "text/html"
    And API response body should contain "NNY"
    And API response time should be less than 10000 milliseconds
