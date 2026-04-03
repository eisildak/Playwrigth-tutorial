Feature: Network Interception ile API mock
  Bir sayfada yapilan API cagrisini yakalayip donen veriyi degistirmek istiyorum.

  Scenario: API cevabini route ile mock edip ekranda gostermek
    Given I open a demo page that fetches a post from API
    And I mock the post API response title as "Mock Baslik - Playwright"
    When I trigger the API request from the page
    Then I should see mocked API title "Mock Baslik - Playwright" on the page

  Scenario: Gercek bpmyo alaninda belirgin route ile API mock
    Given I open the real bpmyo homepage
    And I set a clear bpmyo API route mock at "/api/mock/duyuru" with title "BPMYO Mock Duyuru"
    When I call the mocked bpmyo API route from the page
    Then I should see bpmyo mocked title "BPMYO Mock Duyuru" on the page

  Scenario: Gercek bpmyo alaninda ikinci duyuru mock senaryosu
    Given I open the real bpmyo homepage
    And I set a clear bpmyo API route mock at "/api/mock/duyuru" with title "BPMYO Mock Duyuru - Yeni Etkinlik"
    When I call the mocked bpmyo API route from the page
    Then I should see bpmyo mocked title "BPMYO Mock Duyuru - Yeni Etkinlik" on the page
    And I wait for 90 seconds
