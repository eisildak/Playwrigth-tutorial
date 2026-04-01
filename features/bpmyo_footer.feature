Feature: BPMYO footer ve iletisim kontrolu
  Footer linklerinin calisirliligini ve iletisim formu davranisini kontrol etmek istiyorum.

  Scenario: bpmyo.nny.edu.tr footer component kontrolu (404, 5xx, network)
    Given I run a footer components check on "https://bpmyo.nny.edu.tr/"
    Then I should not see any broken links in footer components

  Scenario: nny.edu.tr iletisim sayfasi mesaj gonderimi calisiyor olmali (known issue - fail expected)
    Given I open the contact page "https://www.nny.edu.tr/?p=contact"
    When I submit the contact form with valid data
    Then I should see a successful contact form submission message

  Scenario: footer linkleri 404 olmamali (ozel kontrol)
    Given I check footer link "http://www.nny.edu.tr/?p=content&id=70"
    Then the footer link should not return 404

  Scenario: footer rektor mesaji linkinde baslik uyumlu ve icerik dolu olmali
    Given I inspect rector message link "https://www.nny.edu.tr/?p=content&id=19"
    Then rector message page should have correct heading and non-empty content
