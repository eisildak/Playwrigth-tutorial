Feature: Sosyal Medya İkonları
  Aday öğrenciler sayfasında sosyal medya ikonlarının çalıştığını kontrol et

  Scenario: Aday Öğrenciler ana sayfasında sosyal medya ikonlarının varlığı ve link bağlantıları
    Given I open the Aday Öğrenciler "ana sayfa" page
    Then social media icons should be visible and working
    And all links on the page should work correctly
