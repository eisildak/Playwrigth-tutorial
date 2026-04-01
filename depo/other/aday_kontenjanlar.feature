Feature: Kontenjanlar Sayfası
  2025 Kontenjanlar sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: 2025 Kontenjanlar sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "kontenjanlar" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
