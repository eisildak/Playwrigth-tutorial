Feature: Ücretler ve Taksit Sayfası
  2025 Ücretler ve Taksit sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: 2025 Ücretler sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "ucretlertaksit" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
