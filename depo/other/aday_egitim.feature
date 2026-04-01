Feature: Eğitim Sayfası
  Eğitim sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: Eğitim sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "egitim" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
