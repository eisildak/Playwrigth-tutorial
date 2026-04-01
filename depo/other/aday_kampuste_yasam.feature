Feature: Kampüste Yaşam Sayfası
  Kampüste Yaşam sayfasının sorunsuz yüklendiğini ve bağlantıların çalıştığını kontrol et

  Scenario: Kampüste Yaşam sayfası bağlantı kontrolü
    Given I open the Aday Öğrenciler "kampusteyasam" page
    Then page title should contain "NNYÜ Aday Öğrenci"
    And all links on the page should work correctly
