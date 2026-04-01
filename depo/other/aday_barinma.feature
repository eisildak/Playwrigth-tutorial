Feature: Barınma Sayfası
  Barınma sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: Barınma sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "barinma" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
