Feature: Ana Sayfa Mesajı
  Aday öğrenciler ana sayfasında beklenen mesajın göründüğünü kontrol et

  Scenario: Aday Öğrenciler ana sayfası kapsamlı kullanıcı deneyimi testi
    Given I open the Aday Öğrenciler "ana sayfa" page
    When I verify all social media popups on the main page
    And I fill out and submit the information request form on the main page
    Then I should see the form success message on the main page
    When I interact with the main page slider and promotion cards
    And I verify the video modals on the main page
    And I verify the scholarship and testimonials section on the main page
    Then I should see the footer statistics and menus on the main page
    When I search for "ücretler" using the main page search bar
    Then I should see search results related to "ücretler"

  Scenario: Aday Öğrenciler ana sayfasında Chatbot entegrasyonu testi
    Given I open the Aday Öğrenciler "ana sayfa" page
    When I open the chatbot widget
    And I fill out and submit the chatbot contact form
    Then I should see the chatbot success message
    When I submit a second message in the chatbot
    Then I should see the chatbot success message within 3 seconds
    And I can navigate through the chatbot message history

