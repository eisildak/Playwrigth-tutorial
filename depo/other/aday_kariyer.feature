Feature: Kariyer Sayfası
  Kariyer sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: Kariyer sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "kariyer" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
